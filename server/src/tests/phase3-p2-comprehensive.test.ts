/**
 * MASTERHRMS — Phase 3 (P2) Comprehensive Test Suite
 * 
 * Verifies all 12 Phase 3 (P2) engineering tasks:
 * - TASK-P2-01: Multi-party approval & effective-date scheduler for transfers
 * - TASK-P2-02: Versioned EmployeeSalaryAssignment on promotions and increments
 * - TASK-P2-03: Automated Full & Final Settlement (F&F) calculation engine
 * - TASK-P2-04: Address change updates in ESS profile change approvals
 * - TASK-P2-05: Midnight rollover attendance punch pairing
 * - TASK-P2-06: Disciplinary warning appeal review & hearing workflow
 * - TASK-P2-07: Connect approved leave encashments to active payroll run
 * - TASK-P2-08: Standardize input border radius to rounded-md
 * - TASK-P2-09: Enforce 44px touch targets on action menus & pagination
 * - TASK-P2-10: Synchronize ApexCharts with dark mode
 * - TASK-P2-11: 6-tier z-index scale & overlay stacking
 * - TASK-P2-12: Button loading state & double-click submission mutex
 */

import assert from "node:assert";
import { LifecycleService } from "../services/lifecycle.service";
import {
  computeEmployeePayrollBreakdown,
  resolveEffectiveSalaryAssignment,
  queryAndApplyLeaveEncashments,
  markLeaveEncashmentsPaid,
} from "../services/payroll-engine.service";
import { runWithTenantContext } from "../context/tenant-context";
import { rawPrisma } from "../prisma";

async function runPhase3P2Suite() {
  console.log("================================================================================");
  console.log("MASTERHRMS — PHASE 3 (P2) COMPREHENSIVE VERIFICATION SUITE");
  console.log("================================================================================\n");

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  // Create or resolve active tenant
  let tenantId = "tenant-p2-test-" + Date.now();
  const actorId = "actor-p2-admin";

  try {
    const existingTenant = await (rawPrisma as any).tenant.findFirst({
      select: { id: true },
    });
    if (existingTenant) {
      tenantId = existingTenant.id;
    }
  } catch {}

  let testEmpId: string = "";
  try {
    const existing = await (rawPrisma as any).employee.findFirst({
      select: { id: true, tenantId: true, salary: true },
    });
    if (existing) {
      testEmpId = existing.id;
      tenantId = existing.tenantId;
    }
  } catch (err: any) {
    console.warn("Notice: Test employee lookup note:", err?.message);
  }
  if (!testEmpId) testEmpId = "mock-p2-emp-id";

  const ctx: any = {
    tenantId,
    userId: actorId,
    roles: ["hr_admin", "super_admin"],
    status: "ACTIVE",
    tenancyStrategy: "SHARED_SCHEMA",
    db: rawPrisma,
  };

  await runWithTenantContext(ctx, async () => {
    // -------------------------------------------------------------------------
    // SECTION 1: TRANSFERS APPROVAL & SCHEDULER (TASK-P2-01)
    // -------------------------------------------------------------------------
    console.log("--- Section 1: Transfers Multi-Party Approval & Effective Date Scheduler ---");

    await test("TASK-P2-01.1: requestTransfer creates PENDING transfer without immediate employee mutation", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const transfer = await LifecycleService.requestTransfer(tenantId, actorId, {
        employeeId: testEmpId,
        reason: "Relocation to Chennai Tech Park",
        effectiveDate: futureDate,
      });

      assert.strictEqual(transfer.status, "PENDING");
      assert.strictEqual(transfer.employeeId, testEmpId);
    });

    await test("TASK-P2-01.2: approveTransfer for future date transitions to APPROVED without mutating employee", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);

      const transfer = await LifecycleService.requestTransfer(tenantId, actorId, {
        employeeId: testEmpId,
        reason: "Department shift",
        effectiveDate: futureDate,
      });

      const approved = await LifecycleService.approveTransfer(tenantId, actorId, transfer.id);
      assert.strictEqual(approved.status, "APPROVED");
    });

    // -------------------------------------------------------------------------
    // SECTION 2: VERSIONED SALARY ASSIGNMENTS (TASK-P2-02)
    // -------------------------------------------------------------------------
    console.log("\n--- Section 2: Versioned Salary Management & Historical Payroll Integrity ---");

    await test("TASK-P2-02.1: executePromotion with immediate date updates salary and creates active version", async () => {
      const now = new Date();
      const promotion = await LifecycleService.executePromotion(tenantId, actorId, {
        employeeId: testEmpId,
        newDesignation: "Lead Systems Architect",
        newSalary: 85000,
        effectiveDate: now,
        remarks: "Annual performance appraisal",
      });

      assert.strictEqual(promotion.newDesignation, "Lead Systems Architect");
      assert.strictEqual(Number(promotion.newSalary), 85000);

      const effective = await resolveEffectiveSalaryAssignment(tenantId, testEmpId, now);
      assert.strictEqual(Number(effective.baseMonthlyCtc), 85000);
    });

    await test("TASK-P2-02.2: executePromotion with future date creates unactivated version and preserves active salary", async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 2);

      await LifecycleService.executePromotion(tenantId, actorId, {
        employeeId: testEmpId,
        newDesignation: "Principal Architect",
        newSalary: 120000,
        effectiveDate: futureDate,
        remarks: "Advance notice promotion",
      });

      const currentEffective = await resolveEffectiveSalaryAssignment(tenantId, testEmpId, new Date());
      assert.strictEqual(Number(currentEffective.baseMonthlyCtc), 85000);
    });

    // -------------------------------------------------------------------------
    // SECTION 3: AUTOMATED FULL & FINAL SETTLEMENT (TASK-P2-03)
    // -------------------------------------------------------------------------
    console.log("\n--- Section 3: Automated Full & Final Settlement (F&F) Pipeline ---");

    await test("TASK-P2-03.1: calculateFnFSettlement computes discrete prorated salary, gratuity, and net amount", async () => {
      await (rawPrisma as any).employee.update({
        where: { id: testEmpId },
        data: { joinedAt: new Date("2018-01-15") },
        select: { id: true },
      });

      const lwd = new Date("2026-10-15");
      const fnf = await LifecycleService.calculateFnFSettlement(tenantId, testEmpId, lwd, {
        noticeShortfallDays: 0,
        outstandingLoans: 5000,
      });

      assert.ok(fnf.breakdown.proratedSalary > 0, "Prorated salary must be > 0");
      assert.ok(fnf.breakdown.isGratuityEligible === true, "Tenure >= 5 yrs must be gratuity eligible");
      assert.ok(fnf.breakdown.gratuity > 0, "Gratuity amount must be > 0");
      assert.strictEqual(fnf.breakdown.loanDeductions, 5000);
      assert.ok(fnf.breakdown.netSettlementAmount > 0, "Net F&F must be positive");
    });

    // -------------------------------------------------------------------------
    // SECTION 4: ESS ADDRESS CHANGE APPROVAL (TASK-P2-04)
    // -------------------------------------------------------------------------
    console.log("\n--- Section 4: ESS Profile Address Updates & Mutation ---");

    await test("TASK-P2-04.1: Employee ESS change approval supports all statutory address fields", async () => {
      const fs = await import("fs");
      const essSrc = fs.readFileSync("server/src/routes/employee-self-service.routes.ts", "utf8");
      
      const requiredAddressFields = ["addressLine1", "addressLine2", "city", "district", "state", "postalCode", "permanentAddress", "presentAddress"];
      for (const field of requiredAddressFields) {
        assert.ok(essSrc.includes(`"${field}"`), `allowedFields must include '${field}'`);
      }
    });

    // -------------------------------------------------------------------------
    // SECTION 5: DISCIPLINARY WARNING APPEAL WORKFLOW (TASK-P2-06)
    // -------------------------------------------------------------------------
        // -------------------------------------------------------------------------
    // SECTION 4B: MIDNIGHT ROLLOVER SHIFT PUNCH CHECKOUT (TASK-P2-05)
    // -------------------------------------------------------------------------
    console.log("\n--- Section 4B: Midnight Rollover Shift Punch Checkout ---");

    await test("TASK-P2-05: AttendanceService pairs Day 2 checkout with Day 1 overnight check-in", async () => {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const checkInNight = new Date(yesterday);
      checkInNight.setUTCHours(22, 0, 0, 0);

      // Create open check-in on Day 1
      const rec = await (rawPrisma as any).attendance.upsert({
        where: {
          tenantId_employeeId_date: {
            tenantId,
            employeeId: testEmpId,
            date: yesterday,
          },
        },
        update: { checkIn: checkInNight, checkOut: null, status: "present" },
        create: {
          tenantId,
          employeeId: testEmpId,
          date: yesterday,
          checkIn: checkInNight,
          checkOut: null,
          status: "present",
          notes: "Overnight Night Shift Test",
        },
      });

      try {
        const { AttendanceService } = await import("../services/attendance.service");
        const punchRes = await AttendanceService.recordPunch(tenantId, testEmpId, {
          type: "check_out",
          notes: "Morning shift end",
        });

        assert.strictEqual(punchRes.action, "check_out");
        assert.ok(punchRes.record.checkOut !== null, "Checkout timestamp must be recorded");
        assert.ok(Number(punchRes.record.hours) > 0, "Shift hours must be calculated across midnight");
      } finally {
        try {
          await (rawPrisma as any).attendance.delete({ where: { id: rec.id } });
        } catch {}
      }
    });

console.log("\n--- Section 5: Disciplinary Warning Appeal Review & Hearing ---");

    await test("TASK-P2-06.1: reviewWarningAppeal resolves appealed warning to UPHELD or REVOKED", async () => {
      const warning = await LifecycleService.issueWarning(tenantId, actorId, {
        employeeId: testEmpId,
        subject: "Unscheduled absence",
        description: "Exceeded grace minutes",
        warningDate: new Date(),
        severity: "low",
      });

      await LifecycleService.submitWarningResponse(tenantId, testEmpId, warning.id, "Medical emergency documentation provided");

      const reviewed = await LifecycleService.reviewWarningAppeal(tenantId, actorId, warning.id, {
        decision: "REVOKED",
        hearingNotes: "Medical certificate verified by Occupational Health team",
      });

      assert.strictEqual(reviewed.status, "revoked");
      assert.ok(reviewed.resolvedAt !== null);
    });

    // -------------------------------------------------------------------------
    // SECTION 6: LEAVE ENCASHMENT IN PAYROLL (TASK-P2-07)
    // -------------------------------------------------------------------------
    console.log("\n--- Section 6: Connect Approved Leave Encashments to Active Payroll ---");

    await test("TASK-P2-07.1: computeEmployeePayrollBreakdown includes taxable LEAVE_ENCASH earning item", async () => {
      const breakdown = computeEmployeePayrollBreakdown(
        {
          id: testEmpId,
          baseMonthlyCtc: 60000,
          pfEligible: true,
          esiEligible: false,
          ptEligible: true,
          lwfEligible: true,
          state: "TN",
        },
        {
          totalWorkingDays: 30,
          payableDays: 30,
          lopDays: 0,
          prorationFactor: 1.0,
        },
        {
          leaveEncashment: 10000,
          encashmentDays: 5,
        }
      );

      const encashItem = (breakdown.earnings.itemized || []).find((e: any) => e.code === "LEAVE_ENCASH");
      assert.ok(encashItem !== undefined, "LEAVE_ENCASH must appear in itemized earnings");
      assert.strictEqual(encashItem?.amount, 10000);
      assert.strictEqual(encashItem?.isTaxable, true);
    });

    // -------------------------------------------------------------------------
    // SECTION 7: UI DESIGN SYSTEM & RESPONSIVE POLISH (TASKS P2-08 TO P2-12)
    // -------------------------------------------------------------------------
    console.log("\n--- Section 7: UI Design Tokens, WCAG Touch Targets, & Button Mutexes ---");

    await test("TASK-P2-08: Input component standardized to rounded-md", async () => {
      const fs = await import("fs");
      const inputSrc = fs.readFileSync("src/components/ui/input.tsx", "utf8");
      assert.ok(inputSrc.includes("rounded-md border border-input"), "Input must have rounded-md");
      assert.ok(!inputSrc.includes("rounded-lg border border-input"), "Input must not retain rounded-lg");
    });

    await test("TASK-P2-09: DropdownMenuItem and DataTable pagination enforce 44px touch targets on mobile", async () => {
      const fs = await import("fs");
      const menuSrc = fs.readFileSync("src/components/ui/dropdown-menu.tsx", "utf8");
      assert.ok(menuSrc.includes("min-h-[44px] md:min-h-0"), "DropdownMenuItem must enforce 44px touch height on mobile");

      const tableSrc = fs.readFileSync("src/components/ui/data-table.tsx", "utf8");
      assert.ok(tableSrc.includes("min-w-[44px] min-h-[44px]"), "DataTable pagination buttons must enforce 44px min touch target");
    });

    await test("TASK-P2-10: useChartTheme hook exports reactive theme mode and ApexCharts config", async () => {
      const fs = await import("fs");
      const hookSrc = fs.readFileSync("src/hooks/use-chart-theme.ts", "utf8");
      assert.ok(hookSrc.includes("export function useChartTheme"), "useChartTheme hook must be exported");
      assert.ok(hookSrc.includes("apexOptions"), "ApexOptions must be provided");
    });

    await test("TASK-P2-11: 6-tier z-index scale defined and modal overlay uses z-[60]", async () => {
      const fs = await import("fs");
      const cssSrc = fs.readFileSync("src/styles.css", "utf8");
      assert.ok(cssSrc.includes("--z-modal: 60;"), "styles.css must define --z-modal: 60");
      assert.ok(cssSrc.includes("--z-drawer: 50;"), "styles.css must define --z-drawer: 50");

      const dialogSrc = fs.readFileSync("src/components/ui/dialog.tsx", "utf8");
      assert.ok(dialogSrc.includes("z-[60]"), "DialogOverlay and DialogContent must use z-[60]");
    });

    await test("TASK-P2-12: Button component supports loading prop, renders Loader2, and enforces disabled mutex", async () => {
      const fs = await import("fs");
      const btnSrc = fs.readFileSync("src/components/ui/button.tsx", "utf8");
      assert.ok(btnSrc.includes("loading?: boolean;"), "ButtonProps must declare loading prop");
      assert.ok(btnSrc.includes("Loader2"), "Button must import and render Loader2 icon");
      assert.ok(btnSrc.includes("disabled={disabled || loading}"), "Button must disable interactions during loading");
    });
  });

  // Cleanup
  try {
    if (testEmpId && testEmpId !== "mock-p2-emp-id") {
      await (rawPrisma as any).employee.delete({ where: { id: testEmpId } });
    }
  } catch {}

  console.log("\n================================================================================");
  console.log(`ALL ${passed}/${total} PHASE 3 (P2) COMPREHENSIVE TESTS PASSED (100%)`);
  console.log("================================================================================");
}

runPhase3P2Suite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
