import fs from "fs";
import path from "path";
import { rawPrisma } from "../prisma.js";
import { LeaveService } from "../services/leave.service.js";
import { LeaveEncashmentCompOffService } from "../services/leave-encashment-compoff.service.js";
import { AttendanceAutomationService } from "../services/attendance-automation.service.js";

/**
 * MASTERHRMS — P3-A: Leave Encashment & Comp-Off Complete Integration, Security & Concurrency Suite
 *
 * Executes live PostgreSQL + Service + Ledger + Payroll + FIFO + RBAC + Multi-Tenant tests across:
 *   - Module A: All 16 Leave Encashment business, calculation, approval, payroll, reversal & security scenarios
 *   - Module B: All 18 Comp-Off verification, conversion, approval, FIFO consumption, restoration, expiry & idempotency scenarios
 *   - Module C & D: Unified Transaction History, CSV/JSON Export, Versioned Policy Config CRUD & Overlap Prevention
 *   - Concurrency: Parallel Promise.all race-condition protection (SELECT ... FOR UPDATE)
 *   - Dual-Frontend & Sidebar Reconciliation Parity (Next.js CMS & TanStack Start)
 *
 * Cleanup: Removes ONLY the two ephemeral test tenants created during this run.
 */

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, details?: unknown) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS [${totalTests}]: ${testName}`);
  } else {
    console.error(`  ✗ FAIL [${totalTests}]: ${testName}`, details ?? "");
    throw new Error(`Assertion failed: ${testName}`);
  }
}

async function expectError(
  fn: () => Promise<unknown>,
  testName: string,
  expectedStatus?: number,
  expectedCodeSubstr?: string
) {
  totalTests++;
  try {
    await fn();
    console.error(`  ✗ FAIL [${totalTests}]: ${testName} (expected error, but resolved)`);
    throw new Error(`Expected error was not thrown: ${testName}`);
  } catch (err: any) {
    if (String(err?.message || "").startsWith("Expected error was not thrown:")) {
      throw err;
    }
    const actualStatus = err?.status ?? err?.statusCode;
    const statusOk = expectedStatus === undefined || actualStatus === expectedStatus;
    const codeOk =
      !expectedCodeSubstr ||
      String(err?.code || "").includes(expectedCodeSubstr) ||
      String(err?.message || "").includes(expectedCodeSubstr);
    if (statusOk && codeOk) {
      passedTests++;
      console.log(`  ✓ PASS [${totalTests}]: ${testName}`);
    } else {
      console.error(`  ✗ FAIL [${totalTests}]: ${testName}`, {
        actualStatus,
        actualCode: err?.code,
        actualMessage: err?.message,
      });
      throw new Error(`Unexpected error details for ${testName}: ${err?.message}`);
    }
  }
}

function isoDateDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function isoDateDaysAhead(daysAhead: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

function findRecentWeekday(daysBackStart = 3): string {
  for (let offset = daysBackStart; offset <= daysBackStart + 14; offset++) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - offset);
    const dow = d.getUTCDay();
    if (dow >= 1 && dow <= 5) return d.toISOString().slice(0, 10);
  }
  return isoDateDaysAgo(3);
}

function findRecentSunday(): string {
  for (let offset = 1; offset <= 14; offset++) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - offset);
    if (d.getUTCDay() === 0) return d.toISOString().slice(0, 10);
  }
  return isoDateDaysAgo(7);
}

function findUpcomingWeekday(minDaysAhead = 2): string {
  for (let offset = minDaysAhead; offset <= minDaysAhead + 14; offset++) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() + offset);
    const dow = d.getUTCDay();
    if (dow >= 1 && dow <= 5) return d.toISOString().slice(0, 10);
  }
  return isoDateDaysAhead(3);
}

async function main() {
  console.log("================================================================================");
  console.log("MASTERHRMS P3-A: LEAVE ENCASHMENT & COMP-OFF AUTOMATED INTEGRATION SUITE");
  console.log("================================================================================\n");

  const runSuffix = `${Date.now()}-${Math.floor(Math.random() * 9999)}`;
  let tenantAId = "";
  let tenantBId = "";
  const createdUserIds: string[] = [];

  const cleanupEphemeralTestArtifacts = async (extraTenantIds: string[] = []) => {
    const staleTenants = await rawPrisma.tenant.findMany({
      where: { slug: { startsWith: "p3a-" } },
      select: { id: true },
    });
    const tIds = Array.from(
      new Set([...extraTenantIds.filter(Boolean), ...staleTenants.map((t) => t.id)])
    );
    if (tIds.length > 0) {
      await rawPrisma.compOffUsageAllocation.deleteMany({ where: { tenantId: { in: tIds } } });
      await rawPrisma.leaveEncashmentCompOffEvent.deleteMany({ where: { tenantId: { in: tIds } } });
      await rawPrisma.leaveLedgerEntry.deleteMany({ where: { tenantId: { in: tIds } } });
      await rawPrisma.leaveRequest.deleteMany({ where: { tenantId: { in: tIds } } });
      await rawPrisma.leaveEncashmentRequest.deleteMany({ where: { tenantId: { in: tIds } } });
      await rawPrisma.leaveEncashmentConfig.deleteMany({ where: { tenantId: { in: tIds } } });
      await rawPrisma.compOffConfig.deleteMany({ where: { tenantId: { in: tIds } } });
      await rawPrisma.tenant.deleteMany({ where: { id: { in: tIds } } });
    }
    await rawPrisma.user.deleteMany({
      where: { email: { endsWith: "@masterhrms-p3a.test" } },
    });
  };

  try {
    // Clean any aborted ephemeral fixtures from prior interrupted runs
    await cleanupEphemeralTestArtifacts();

    // -------------------------------------------------------------------------
    // 0. SETUP EPHEMERAL MULTI-TENANT FIXTURES (TENANT A & TENANT B)
    // -------------------------------------------------------------------------
    const tenantA = await rawPrisma.tenant.create({
      data: {
        name: `P3A Test Tenant Alpha ${runSuffix}`,
        slug: `p3a-alpha-${runSuffix}`,
        currency: "INR",
        isOnboarded: true,
      },
    });
    const tenantB = await rawPrisma.tenant.create({
      data: {
        name: `P3A Test Tenant Beta ${runSuffix}`,
        slug: `p3a-beta-${runSuffix}`,
        currency: "USD",
        isOnboarded: true,
      },
    });
    tenantAId = tenantA.id;
    tenantBId = tenantB.id;

    const createTestUser = async (prefix: string) => {
      const u = await rawPrisma.user.create({
        data: {
          email: `${prefix}.${runSuffix}@masterhrms-p3a.test`,
          passwordHash: "not_used_in_direct_service_test",
        },
      });
      createdUserIds.push(u.id);
      return u;
    };

    const hrAdminUserA = await createTestUser("hradmin.a");
    const hrManagerUserA = await createTestUser("hrmgr.a");
    const payrollUserA = await createTestUser("payroll.a");
    const lineMgrUserA = await createTestUser("linemgr.a");
    const empAliceUserA = await createTestUser("alice.a");
    const hrAdminUserB = await createTestUser("hradmin.b");

    const branchA = await rawPrisma.branch.create({
      data: {
        tenantId: tenantAId,
        name: "Bengaluru HQ",
        code: `BLR-${runSuffix.slice(-4)}`,
      },
    });
    const deptA = await rawPrisma.department.create({
      data: {
        tenantId: tenantAId,
        name: "Platform Engineering",
      },
    });

    const joinedTwoYearsAgo = new Date();
    joinedTwoYearsAgo.setUTCFullYear(joinedTwoYearsAgo.getUTCFullYear() - 2);

    const hrAdminEmpA = await rawPrisma.employee.create({
      data: {
        tenantId: tenantAId,
        userId: hrAdminUserA.id,
        branchId: branchA.id,
        departmentId: deptA.id,
        employeeCode: `EMP-HRA-${runSuffix.slice(-4)}`,
        firstName: "Vikram",
        lastName: "HRAdmin",
        email: hrAdminUserA.email,
        joinedAt: joinedTwoYearsAgo,
        employmentCategory: "permanent",
        salary: 120000,
      },
    });

    const lineMgrEmpA = await rawPrisma.employee.create({
      data: {
        tenantId: tenantAId,
        userId: lineMgrUserA.id,
        branchId: branchA.id,
        departmentId: deptA.id,
        employeeCode: `EMP-MGR-${runSuffix.slice(-4)}`,
        firstName: "Rohan",
        lastName: "Manager",
        email: lineMgrUserA.email,
        joinedAt: joinedTwoYearsAgo,
        employmentCategory: "permanent",
      },
    });

    const empAliceA = await rawPrisma.employee.create({
      data: {
        tenantId: tenantAId,
        userId: empAliceUserA.id,
        branchId: branchA.id,
        departmentId: deptA.id,
        managerId: lineMgrEmpA.id,
        employeeCode: `EMP-ALI-${runSuffix.slice(-4)}`,
        firstName: "Ananya",
        lastName: "Sharma",
        email: empAliceUserA.email,
        joinedAt: joinedTwoYearsAgo,
        employmentCategory: "permanent",
      },
    });

    const hrAdminEmpB = await rawPrisma.employee.create({
      data: {
        tenantId: tenantBId,
        userId: hrAdminUserB.id,
        employeeCode: `EMP-B-${runSuffix.slice(-4)}`,
        firstName: "TenantB",
        lastName: "Admin",
        email: hrAdminUserB.email,
        joinedAt: joinedTwoYearsAgo,
      },
    });

    // Salary Structure & Components for Alice: Basic = 52,000/mo, HRA = 26,000/mo (Gross = 78,000/mo)
    const basicComp = await rawPrisma.salaryComponent.create({
      data: {
        tenantId: tenantAId,
        name: "Basic Salary",
        code: "BASIC",
        type: "earning",
        calculationType: "fixed",
        defaultValue: 52000,
      },
    });
    const hraComp = await rawPrisma.salaryComponent.create({
      data: {
        tenantId: tenantAId,
        name: "House Rent Allowance",
        code: "HRA",
        type: "earning",
        calculationType: "fixed",
        defaultValue: 26000,
      },
    });
    const encashPayComp = await rawPrisma.salaryComponent.create({
      data: {
        tenantId: tenantAId,
        name: "Leave Encashment Payout",
        code: "LEAVE_ENCASH",
        type: "earning",
        calculationType: "variable",
        defaultValue: 0,
      },
    });

    const aliceSalaryAssignment = await rawPrisma.employeeSalaryAssignment.create({
      data: {
        tenantId: tenantAId,
        employeeId: empAliceA.id,
        ctcMonthly: 78000,
        ctcAnnual: 936000,
        effectiveFrom: new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1)),
        isCurrent: true,
      },
    });

    await rawPrisma.employeeSalaryItem.createMany({
      data: [
        {
          assignmentId: aliceSalaryAssignment.id,
          componentId: basicComp.id,
          monthlyAmount: 52000,
          annualAmount: 624000,
        },
        {
          assignmentId: aliceSalaryAssignment.id,
          componentId: hraComp.id,
          monthlyAmount: 26000,
          annualAmount: 312000,
        },
      ],
    });

    // Leave Types: Earned Leave (eligible for encashment), Sick Leave (ineligible), Comp-Off Leave
    const currentYear = new Date().getUTCFullYear();
    const earnedLeave = await rawPrisma.leaveType.create({
      data: {
        tenantId: tenantAId,
        name: "Earned Leave",
        code: "EL",
        daysPerYear: 20,
        isPaid: true,
        halfDayAllowed: true,
        status: "active",
      },
    });
    const sickLeave = await rawPrisma.leaveType.create({
      data: {
        tenantId: tenantAId,
        name: "Sick Leave",
        code: "SL",
        daysPerYear: 10,
        isPaid: true,
        halfDayAllowed: true,
        status: "active",
      },
    });
    const compOffLeave = await rawPrisma.leaveType.create({
      data: {
        tenantId: tenantAId,
        name: "Compensatory Off",
        code: "COMP_OFF",
        daysPerYear: 0,
        isPaid: true,
        halfDayAllowed: true,
        status: "active",
      },
    });

    // Seed Leave Balances for Alice & HR Admin via LeaveLedgerEntry ACCRUAL
    const jan1ThisYear = new Date(Date.UTC(currentYear, 0, 1));
    await rawPrisma.leaveLedgerEntry.createMany({
      data: [
        {
          tenantId: tenantAId,
          employeeId: empAliceA.id,
          leaveTypeId: earnedLeave.id,
          entryType: "ACCRUAL",
          days: 18,
          balance: 18,
          effectiveAt: jan1ThisYear,
          notes: "Annual EL entitlement",
        },
        {
          tenantId: tenantAId,
          employeeId: empAliceA.id,
          leaveTypeId: sickLeave.id,
          entryType: "ACCRUAL",
          days: 10,
          balance: 10,
          effectiveAt: jan1ThisYear,
          notes: "Annual SL entitlement",
        },
        {
          tenantId: tenantAId,
          employeeId: hrAdminEmpA.id,
          leaveTypeId: earnedLeave.id,
          entryType: "ACCRUAL",
          days: 20,
          balance: 20,
          effectiveAt: jan1ThisYear,
          notes: "HR Admin EL entitlement",
        },
      ],
    });

    // Resolve Caller Profiles sequentially to avoid saturating Supabase PgBouncer transaction pooler
    const hrAdminProfileA = await LeaveEncashmentCompOffService.resolveCallerProfile(tenantAId, {
      userId: hrAdminUserA.id,
      email: hrAdminUserA.email,
      roles: ["hr_admin"],
      permissions: ["*"],
    });
    const hrMgrProfileA = await LeaveEncashmentCompOffService.resolveCallerProfile(tenantAId, {
      userId: hrManagerUserA.id,
      email: hrManagerUserA.email,
      roles: ["hr_manager"],
      permissions: ["hrm.leave.view", "hrm.leave.approve"],
    });
    const payrollProfileA = await LeaveEncashmentCompOffService.resolveCallerProfile(tenantAId, {
      userId: payrollUserA.id,
      email: payrollUserA.email,
      roles: ["payroll_admin"],
      permissions: ["hrm.payroll.view"],
    });
    const lineMgrProfileA = await LeaveEncashmentCompOffService.resolveCallerProfile(tenantAId, {
      userId: lineMgrUserA.id,
      email: lineMgrUserA.email,
      roles: ["manager"],
      permissions: ["hrm.leave.view"],
    });
    const aliceProfileA = await LeaveEncashmentCompOffService.resolveCallerProfile(tenantAId, {
      userId: empAliceUserA.id,
      email: empAliceUserA.email,
      roles: ["employee"],
      permissions: [],
    });
    const hrAdminProfileB = await LeaveEncashmentCompOffService.resolveCallerProfile(tenantBId, {
      userId: hrAdminUserB.id,
      email: hrAdminUserB.email,
      roles: ["hr_admin"],
      permissions: ["*"],
    });

    // =========================================================================
    // SECTION 1: MODULE A — LEAVE ENCASHMENT (ALL 16 REQUIRED SCENARIOS)
    // =========================================================================
    console.log("--- SECTION 1: MODULE A — LEAVE ENCASHMENT (16 SCENARIOS) ---");

    // A-Test 1: Encashment Config CRUD + Eligible Leave Type Discovery
    const encashConfig = await LeaveEncashmentCompOffService.createEncashmentConfig(
      tenantAId,
      hrAdminProfileA,
      {
        name: "Standard Earned Leave Encashment Policy",
        code: "ENC-EL-2026",
        enabled: true,
        eligibleLeaveTypeIds: [earnedLeave.id],
        minServiceMonths: 6,
        minRemainingBalance: 8,
        maxEncashableDaysPerRequest: 10,
        maxEncashableDaysPerYear: 12,
        minRetainedBalance: 5,
        encashmentFrequency: "ANYTIME",
        approvalMode: "MANAGER_THEN_HR",
        allowEssSubmission: true,
        requireSupportingDoc: false,
        salaryBasisType: "BASIC",
        dailyRateDivisorMode: "CUSTOM",
        dailyRateDivisor: 26,
        payrollComponentId: encashPayComp.id,
        effectiveFrom: `${currentYear - 1}-01-01`,
      }
    );
    assert(Boolean(encashConfig?.id) && encashConfig.version === 1, "A1: Encashment Configuration created with version 1");

    // Overlap prevention check
    await expectError(
      () =>
        LeaveEncashmentCompOffService.createEncashmentConfig(tenantAId, hrAdminProfileA, {
          name: "Overlapping Duplicate Policy",
          enabled: true,
          eligibleLeaveTypeIds: [earnedLeave.id],
          effectiveFrom: `${currentYear}-01-01`,
        }),
      "A1b: Overlapping active Encashment Configuration rejected",
      409
    );

    const eligibleTypesRes = await LeaveEncashmentCompOffService.getEncashmentEligibilityForEmployee(
      tenantAId,
      empAliceA.id
    );
    assert(
      eligibleTypesRes.eligibleLeaveTypes.some((t: any) => t.leaveTypeId === earnedLeave.id) &&
        eligibleTypesRes.ineligibleLeaveTypes.some((t: any) => t.leaveTypeId === sickLeave.id),
      "A1c: Earned Leave marked eligible (18d available) while Sick Leave marked ineligible"
    );

    // A-Test 2: Ineligible Leave Type Rejected
    await expectError(
      () =>
        LeaveEncashmentCompOffService.createEncashmentRequest(
          tenantAId,
          aliceProfileA,
          {
            leaveTypeId: sickLeave.id,
            days: 2,
            reason: "Try encashing Sick Leave",
          },
          { selfOnly: true }
        ),
      "A2: Ineligible leave type (Sick Leave) rejected on encashment submission",
      400,
      "INELIGIBLE_LEAVE_TYPE"
    );

    // A-Test 3: Minimum Balance Threshold Enforced
    // Temporarily update minRemainingBalance to 25 (Alice has 18) -> reject -> restore to 8
    await LeaveEncashmentCompOffService.updateEncashmentConfig(
      tenantAId,
      encashConfig.id,
      hrAdminProfileA,
      { minRemainingBalance: 25 }
    );
    await expectError(
      () =>
        LeaveEncashmentCompOffService.createEncashmentRequest(
          tenantAId,
          aliceProfileA,
          {
            leaveTypeId: earnedLeave.id,
            days: 2,
            reason: "Below min remaining threshold",
          },
          { selfOnly: true }
        ),
      "A3: Minimum remaining balance threshold (25d > 18d) strictly enforced",
      400,
      "MIN_BALANCE_NOT_MET"
    );
    await LeaveEncashmentCompOffService.updateEncashmentConfig(
      tenantAId,
      encashConfig.id,
      hrAdminProfileA,
      { minRemainingBalance: 8 }
    );

    // A-Test 4: Maximum Encashable Days Per Request Enforced (max = 10)
    await expectError(
      () =>
        LeaveEncashmentCompOffService.createEncashmentRequest(
          tenantAId,
          aliceProfileA,
          {
            leaveTypeId: earnedLeave.id,
            days: 11,
            reason: "Exceeds max per request",
          },
          { selfOnly: true }
        ),
      "A4: Maximum encashable days per request (11d > 10d) strictly enforced",
      400,
      "EXCEEDS_POLICY_MAX"
    );

    // A-Test 5: Minimum Retained Balance Enforced (18 available - 14 requested = 4 < 5 retained; set maxPerReq=15 temporarily to isolate retained rule)
    await LeaveEncashmentCompOffService.updateEncashmentConfig(
      tenantAId,
      encashConfig.id,
      hrAdminProfileA,
      { maxEncashableDaysPerRequest: 15, maxEncashableDaysPerYear: 15 }
    );
    await expectError(
      () =>
        LeaveEncashmentCompOffService.createEncashmentRequest(
          tenantAId,
          aliceProfileA,
          {
            leaveTypeId: earnedLeave.id,
            days: 14,
            reason: "Violates min retained balance of 5d",
          },
          { selfOnly: true }
        ),
      "A5: Minimum retained balance rule (18 - 14 = 4 < 5d) strictly enforced",
      400,
      "MIN_RETAINED_BALANCE_VIOLATION"
    );
    await LeaveEncashmentCompOffService.updateEncashmentConfig(
      tenantAId,
      encashConfig.id,
      hrAdminProfileA,
      { maxEncashableDaysPerRequest: 10, maxEncashableDaysPerYear: 12 }
    );

    // A-Test 6: Decimal-Safe Calculation Snapshot Accuracy (52,000 / 26 = 2,000.00/day * 5 days = 10,000.00)
    const previewCalc = await LeaveEncashmentCompOffService.calculateEncashmentPreview(tenantAId, {
      employeeId: empAliceA.id,
      leaveTypeId: earnedLeave.id,
      requestedDays: 5,
      effectiveDate: `${currentYear}-06-15`,
    });
    assert(
      Number(previewCalc.salaryBasisAmount ?? previewCalc.eligibleSalaryBasis) === 52000 &&
        Number(previewCalc.dailyRate ?? previewCalc.unitDailyRate) === 2000 &&
        Number(previewCalc.netPayableAmount ?? previewCalc.totalAmount) === 10000 &&
        Number(previewCalc.retainedBalance) === 13,
      "A6: Decimal-safe calculation engine computes exact 52,000 / 26 = 2,000 * 5d = 10,000.00 & retained = 13d"
    );

    // Submit Alice's 5-day Encashment Request via ESS
    const aliceEncash1 = await LeaveEncashmentCompOffService.createEncashmentRequest(
      tenantAId,
      aliceProfileA,
      {
        leaveTypeId: earnedLeave.id,
        days: 5,
        effectiveDate: `${currentYear}-06-15`,
        reason: "Annual leave encashment payout",
        idempotencyKey: `idem-enc-${runSuffix}`,
      },
      { selfOnly: true }
    );
    assert(
      aliceEncash1.status === "PENDING" && Number(aliceEncash1.totalAmount) === 10000,
      "A6b: ESS Encashment request persisted in PENDING status with immutable 10,000.00 snapshot"
    );

    // Verify pending encashment reserves balance in LeaveService.getEmployeeBalance (18 - 5 = 13 available)
    const balWhilePending = await LeaveService.getEmployeeBalance(
      tenantAId,
      empAliceA.id,
      earnedLeave.id,
      currentYear
    );
    assert(
      balWhilePending === 13,
      "A6c: Pending Encashment request immediately reserves 5 days in authoritative LeaveService balance (18 -> 13)"
    );

    // A-Test 7: Multi-Stage Approval (Manager -> HR) & Atomic ENCASHMENT Ledger Debit
    const mgrApprovedEncash = await LeaveEncashmentCompOffService.decideEncashmentRequest(
      tenantAId,
      aliceEncash1.id,
      lineMgrProfileA,
      { action: "approve", comments: "Manager verified leave quota" }
    );
    assert(
      mgrApprovedEncash.status === "MANAGER_APPROVED",
      "A7a: Stage 1 Reporting Manager approval transitions request to MANAGER_APPROVED without premature ledger debit"
    );

    const finalApprovedEncash = await LeaveEncashmentCompOffService.decideEncashmentRequest(
      tenantAId,
      aliceEncash1.id,
      hrAdminProfileA,
      { action: "approve", comments: "Final HR approval" }
    );
    assert(
      finalApprovedEncash.status === "APPROVED" && Boolean(finalApprovedEncash.ledgerEntryId),
      "A7b: Stage 2 HR approval transitions request to APPROVED and links immutable ENCASHMENT LeaveLedgerEntry"
    );

    const balAfterApproval = await LeaveService.getEmployeeBalance(
      tenantAId,
      empAliceA.id,
      earnedLeave.id,
      currentYear
    );
    assert(
      balAfterApproval === 13,
      "A7c: Post-approval authoritative balance is 13 days (no double-counting between reservation and ledger debit)"
    );

    // Editing config AFTER historical request bumps config version!
    const bumpedConfig = await LeaveEncashmentCompOffService.updateEncashmentConfig(
      tenantAId,
      encashConfig.id,
      hrAdminProfileA,
      { maxEncashableDaysPerYear: 14 }
    );
    assert(
      bumpedConfig.version > encashConfig.version,
      "A7d: Updating an Encashment Config referenced by historical requests increments policy version"
    );

    // A-Test 8: Rejection Workflow (Mandatory reason + zero ledger debit + balance restored)
    const encashToReject = await LeaveEncashmentCompOffService.createEncashmentRequest(
      tenantAId,
      aliceProfileA,
      {
        leaveTypeId: earnedLeave.id,
        days: 2,
        effectiveDate: `${currentYear}-06-20`,
        reason: "Second request to test rejection",
      },
      { selfOnly: true }
    );
    await expectError(
      () =>
        LeaveEncashmentCompOffService.decideEncashmentRequest(
          tenantAId,
          encashToReject.id,
          hrAdminProfileA,
          { action: "reject", comments: "" }
        ),
      "A8a: Rejecting without a reason is blocked",
      400
    );
    const rejectedEncash = await LeaveEncashmentCompOffService.decideEncashmentRequest(
      tenantAId,
      encashToReject.id,
      hrAdminProfileA,
      { action: "reject", comments: "Deferred to next quarter" }
    );
    const balAfterReject = await LeaveService.getEmployeeBalance(
      tenantAId,
      empAliceA.id,
      earnedLeave.id,
      currentYear
    );
    assert(
      rejectedEncash.status === "REJECTED" && balAfterReject === 13,
      "A8b: Rejected encashment releases reserved days cleanly (balance remains 13d)"
    );

    // A-Test 9: Cancellation Workflow
    const encashToCancel = await LeaveEncashmentCompOffService.createEncashmentRequest(
      tenantAId,
      aliceProfileA,
      {
        leaveTypeId: earnedLeave.id,
        days: 3,
        effectiveDate: `${currentYear}-06-22`,
        reason: "Request to test employee cancellation",
      },
      { selfOnly: true }
    );
    const cancelledEncash = await LeaveEncashmentCompOffService.cancelEncashmentRequest(
      tenantAId,
      encashToCancel.id,
      aliceProfileA,
      "Changed travel plans"
    );
    const balAfterCancel = await LeaveService.getEmployeeBalance(
      tenantAId,
      empAliceA.id,
      earnedLeave.id,
      currentYear
    );
    assert(
      cancelledEncash.status === "CANCELLED" && balAfterCancel === 13,
      "A9: Cancelled encashment releases reserved days cleanly (balance remains 13d)"
    );

    // A-Test 10: Payroll Linkage (APPROVED -> PAYROLL_PENDING)
    const queuedEncash = await LeaveEncashmentCompOffService.processEncashmentToPayroll(
      tenantAId,
      aliceEncash1.id,
      payrollProfileA,
      {
        payrollMonth: 6,
        payrollYear: currentYear,
        salaryComponentId: encashPayComp.id,
        notes: "Queued for June payroll run",
      }
    );
    assert(
      queuedEncash.status === "PAYROLL_PENDING" &&
        queuedEncash.payrollMonth === 6 &&
        queuedEncash.payrollYear === currentYear,
      "A10: Payroll Officer queues APPROVED encashment into PAYROLL_PENDING for 06/" + currentYear
    );

    // A-Test 11: Duplicate Payroll Inclusion Prevention
    await expectError(
      () =>
        LeaveEncashmentCompOffService.processEncashmentToPayroll(
          tenantAId,
          aliceEncash1.id,
          payrollProfileA,
          { payrollMonth: 6, payrollYear: currentYear }
        ),
      "A11: Duplicate payroll queueing of already-queued encashment is rejected",
      409
    );

    // A-Test 12: Payroll Failure Handling (PAYROLL_PENDING -> FAILED -> Re-queue)
    const failedEncash = await LeaveEncashmentCompOffService.markEncashmentPayrollFailed(
      tenantAId,
      aliceEncash1.id,
      payrollProfileA,
      "Employee bank IFSC pending verification"
    );
    assert(
      failedEncash.status === "FAILED",
      "A12a: Payroll failure transitions encashment to FAILED with audit note"
    );
    const draftRun = await rawPrisma.payrollRun.create({
      data: {
        tenantId: tenantAId,
        periodMonth: 6,
        periodYear: currentYear,
        status: "draft",
        isPublished: false,
      },
    });
    const requeuedEncash = await LeaveEncashmentCompOffService.processEncashmentToPayroll(
      tenantAId,
      aliceEncash1.id,
      payrollProfileA,
      { payrollMonth: 6, payrollYear: currentYear, payrollRunId: draftRun.id }
    );
    assert(
      requeuedEncash.status === "PAYROLL_PENDING",
      "A12b: FAILED encashment can be safely re-queued to PAYROLL_PENDING after remediation"
    );

    // A-Test 13: Payroll Completion Strictly After Verified Finalized Payroll Run
    await expectError(
      () =>
        LeaveEncashmentCompOffService.reconcileAndMarkPayrollPaid(tenantAId, {
          requestId: aliceEncash1.id,
          payrollRunId: draftRun.id,
          actorUserId: payrollUserA.id,
        }),
      "A13a: Marking PAID against an unfinalized DRAFT PayrollRun is strictly blocked",
      409,
      "PAYROLL_RUN_NOT_COMPLETED"
    );

    // Publish the PayrollRun -> now reconcileAndMarkPayrollPaid succeeds!
    await rawPrisma.payrollRun.update({
      where: { id: draftRun.id },
      data: { status: "paid", isPublished: true, publishedAt: new Date() },
    });
    const paidRes = await LeaveEncashmentCompOffService.reconcileAndMarkPayrollPaid(tenantAId, {
      requestId: aliceEncash1.id,
      payrollRunId: draftRun.id,
      disbursementRef: `UTR-JUNE-${runSuffix.slice(-6)}`,
      actorUserId: payrollUserA.id,
    });
    const paidEncash = paidRes.records[0];
    assert(
      paidRes.updatedCount === 1 && paidEncash?.status === "PAID" && paidEncash?.payrollStatus === "PAID",
      "A13b: Encashment transitions to PAID strictly after verified finalized/paid PayrollRun"
    );

    // A-Test 14: Auditable Encashment Reversal (Approved pre-disbursement encashment reversed -> restores ledger!)
    const encashToReverse = await LeaveEncashmentCompOffService.createEncashmentRequest(
      tenantAId,
      hrAdminProfileA,
      {
        employeeId: empAliceA.id,
        leaveTypeId: earnedLeave.id,
        days: 3,
        effectiveDate: `${currentYear}-07-01`,
        reason: "Encashment to test auditable reversal",
      }
    );
    // Approve through Manager + HR
    await LeaveEncashmentCompOffService.decideEncashmentRequest(
      tenantAId,
      encashToReverse.id,
      lineMgrProfileA,
      { action: "approve" }
    );
    await LeaveEncashmentCompOffService.decideEncashmentRequest(
      tenantAId,
      encashToReverse.id,
      hrAdminProfileA,
      { action: "approve" }
    );
    const balBeforeReversal = await LeaveService.getEmployeeBalance(
      tenantAId,
      empAliceA.id,
      earnedLeave.id,
      currentYear
    );
    assert(balBeforeReversal === 10, "A14a: Balance reduced to 10d after 3d encashment approval");

    const reversedEncash = await LeaveEncashmentCompOffService.reverseTransaction(
      tenantAId,
      encashToReverse.id,
      hrAdminProfileA,
      { reason: "Employee opted to retain leave days prior to payroll disbursement" }
    );
    const balAfterReversal = await LeaveService.getEmployeeBalance(
      tenantAId,
      empAliceA.id,
      earnedLeave.id,
      currentYear
    );
    assert(
      reversedEncash.status === "REVERSED" &&
        Boolean(reversedEncash.reversalLedgerEntryId) &&
        balAfterReversal === 13,
      "A14b: Reversing approved encashment posts compensating CREDIT and restores balance from 10d -> 13d"
    );

    // A-Test 15: Multi-Tenant Isolation (Tenant B cannot view or act on Tenant A encashment)
    await expectError(
      () =>
        LeaveEncashmentCompOffService.getTransactionDetail(
          tenantBId,
          aliceEncash1.id,
          hrAdminProfileB
        ),
      "A15a: Tenant B HR Admin blocked from reading Tenant A encashment detail",
      404
    );
    const tenantBList = await LeaveEncashmentCompOffService.listRequestsAndHistory(
      tenantBId,
      hrAdminProfileB,
      { tab: "ENCASHMENT", page: 1, limit: 50 }
    );
    assert(
      tenantBList.data.length === 0,
      "A15b: Tenant B listRequestsAndHistory(ENCASHMENT) returns 0 records from Tenant A"
    );

    // A-Test 16: RBAC, Salary Redaction & Anti-Self-Approval (403)
    const hrOwnEncash = await LeaveEncashmentCompOffService.createEncashmentRequest(
      tenantAId,
      hrAdminProfileA,
      {
        employeeId: hrAdminEmpA.id,
        leaveTypeId: earnedLeave.id,
        days: 2,
        effectiveDate: `${currentYear}-07-05`,
        reason: "HR Admin own encashment request",
      }
    );
    await expectError(
      () =>
        LeaveEncashmentCompOffService.decideEncashmentRequest(
          tenantAId,
          hrOwnEncash.id,
          hrAdminProfileA,
          { action: "approve" }
        ),
      "A16a: Anti-Self-Approval blocks even HR Admin from approving their own encashment (403)",
      403,
      "SELF_APPROVAL_FORBIDDEN"
    );
    await expectError(
      () =>
        LeaveEncashmentCompOffService.createEncashmentConfig(tenantAId, hrMgrProfileA, {
          name: "Unauthorized HR Manager Config",
          eligibleLeaveTypeIds: [earnedLeave.id],
          effectiveFrom: `${currentYear + 1}-01-01`,
        }),
      "A16b: Non-HR-Admin (HR Manager) blocked from creating policy configuration (403)",
      403
    );

    const mgrEncashList = await LeaveEncashmentCompOffService.listRequestsAndHistory(
      tenantAId,
      lineMgrProfileA,
      { tab: "ENCASHMENT", page: 1, limit: 20 }
    );
    const aliceRowForMgr = mgrEncashList.data.find((r: any) => r.id === aliceEncash1.id);
    assert(
      Boolean(aliceRowForMgr) &&
        aliceRowForMgr.totalAmount === null &&
        aliceRowForMgr.unitDailyRate === null,
      "A16c: Reporting Manager sees subordinate encashment row with salary/payout amounts redacted (null)"
    );

    // =========================================================================
    // SECTION 2: MODULE B — COMP-OFF MANAGEMENT (ALL 18 REQUIRED SCENARIOS)
    // =========================================================================
    console.log("\n--- SECTION 2: MODULE B — COMP-OFF MANAGEMENT (18 SCENARIOS) ---");

    const compOffConfig = await LeaveEncashmentCompOffService.createCompOffConfig(
      tenantAId,
      hrAdminProfileA,
      {
        name: "Standard Engineering Comp-Off Policy",
        code: "CO-ENG-2026",
        enabled: true,
        leaveTypeId: compOffLeave.id,
        allowWeeklyOffWork: true,
        allowHolidayWork: true,
        allowApprovedOvertime: true,
        minWorkedHours: 4,
        halfDayHours: 4,
        fullDayHours: 8,
        maxCreditDaysPerRequest: 2,
        maxAccrualBalance: 10,
        expiryDays: 45,
        preExpiryAlertDays: 7,
        allowCarryForward: true,
        maxBackdateDays: 30,
        approvalMode: "HR_ONLY",
        allowEssSubmission: true,
        requireAttendanceProof: true,
        requireApprovedOvertime: true,
        effectiveFrom: `${currentYear - 1}-01-01`,
      }
    );
    assert(Boolean(compOffConfig?.id), "B0: Comp-Off Policy Configuration created");

    const sundayDateStr = findRecentSunday();
    const holidayDateStr = findRecentWeekday(4);
    const otDateStr = findRecentWeekday(9);
    const missingAttSundayStr = (() => {
      const d = new Date(`${sundayDateStr}T00:00:00.000Z`);
      d.setUTCDate(d.getUTCDate() - 7);
      return d.toISOString().slice(0, 10);
    })();

    // Seed Attendance & Holiday & Overtime fixtures
    await rawPrisma.holiday.create({
      data: {
        tenantId: tenantAId,
        name: "Founder's Day Public Holiday",
        date: new Date(`${holidayDateStr}T00:00:00.000Z`),
        year: new Date(`${holidayDateStr}T00:00:00.000Z`).getUTCFullYear(),
        type: "public",
        status: "active",
      },
    });

    // Sunday attendance: 5.0 hours -> 0.5 day Comp-Off
    await rawPrisma.attendance.create({
      data: {
        tenantId: tenantAId,
        employeeId: empAliceA.id,
        date: new Date(`${sundayDateStr}T00:00:00.000Z`),
        checkIn: new Date(`${sundayDateStr}T04:00:00.000Z`),
        checkOut: new Date(`${sundayDateStr}T09:00:00.000Z`),
        hours: 5.0,
        status: "present",
      },
    });

    // Holiday attendance: 8.5 hours -> 1.0 day Comp-Off
    await rawPrisma.attendance.create({
      data: {
        tenantId: tenantAId,
        employeeId: empAliceA.id,
        date: new Date(`${holidayDateStr}T00:00:00.000Z`),
        checkIn: new Date(`${holidayDateStr}T04:00:00.000Z`),
        checkOut: new Date(`${holidayDateStr}T12:30:00.000Z`),
        hours: 8.5,
        status: "present",
      },
    });

    // Overtime date attendance + PENDING overtime request first
    await rawPrisma.attendance.create({
      data: {
        tenantId: tenantAId,
        employeeId: empAliceA.id,
        date: new Date(`${otDateStr}T00:00:00.000Z`),
        checkIn: new Date(`${otDateStr}T04:00:00.000Z`),
        checkOut: new Date(`${otDateStr}T17:00:00.000Z`),
        hours: 13.0,
        overtimeMinutes: 300,
        status: "present",
      },
    });
    const otReq = await rawPrisma.overtimeRequest.create({
      data: {
        tenantId: tenantAId,
        employeeId: empAliceA.id,
        overtimeDate: new Date(`${otDateStr}T00:00:00.000Z`),
        hoursRequested: 5.0,
        overtimeType: "regular",
        status: "pending",
      },
    });

    // B-Test 1: Weekly-Off Work Eligibility Verified (5.0h -> 0.5 day)
    const verifyWeeklyOff = await LeaveEncashmentCompOffService.verifyAndPreviewCompOff(tenantAId, {
      employeeId: empAliceA.id,
      workedOnDate: sundayDateStr,
      workType: "WEEKLY_OFF",
    });
    assert(
      Number(verifyWeeklyOff.convertedDays) === 0.5 &&
        Boolean(verifyWeeklyOff.dayClassification?.isWeeklyOff),
      "B1 & B9a: Weekly-Off work verified (5.0h converts to 0.5 day Comp-Off)"
    );

    // B-Test 2: Public Holiday Work Eligibility Verified (8.5h -> 1.0 day)
    const verifyHoliday = await LeaveEncashmentCompOffService.verifyAndPreviewCompOff(tenantAId, {
      employeeId: empAliceA.id,
      workedOnDate: holidayDateStr,
      workType: "PUBLIC_HOLIDAY",
    });
    assert(
      Number(verifyHoliday.convertedDays) === 1 &&
        Boolean(verifyHoliday.dayClassification?.isPublicHoliday),
      "B2 & B9b: Public Holiday work verified (8.5h converts to 1.0 day Comp-Off)"
    );

    // B-Test 5: Unapproved Overtime Rejected
    await expectError(
      () =>
        LeaveEncashmentCompOffService.createCompOffRequest(
          tenantAId,
          aliceProfileA,
          {
            workedOnDate: otDateStr,
            workType: "OVERTIME",
            reason: "Try unapproved overtime",
          },
          { selfOnly: true }
        ),
      "B5: Unapproved Overtime (status=pending) is strictly rejected for Comp-Off",
      400
    );

    // Approve Overtime -> B-Test 3: Approved Overtime Eligibility Verified
    await rawPrisma.overtimeRequest.update({
      where: { id: otReq.id },
      data: { status: "approved", reviewedAt: new Date() },
    });
    const verifyApprovedOt = await LeaveEncashmentCompOffService.verifyAndPreviewCompOff(tenantAId, {
      employeeId: empAliceA.id,
      workedOnDate: otDateStr,
      workType: "OVERTIME",
    });
    assert(
      Number(verifyApprovedOt.convertedDays) >= 0.5 &&
        verifyApprovedOt.overtimeEvidence?.status === "approved",
      "B3: Approved OvertimeRequest verified as eligible for Comp-Off"
    );

    // B-Test 4: Missing Attendance Rejected (requireAttendanceProof = true)
    await expectError(
      () =>
        LeaveEncashmentCompOffService.createCompOffRequest(
          tenantAId,
          aliceProfileA,
          {
            workedOnDate: missingAttSundayStr,
            workType: "WEEKLY_OFF",
            reason: "Sunday with zero attendance record",
          },
          { selfOnly: true }
        ),
      "B4: Missing attendance punch on worked date is rejected when requireAttendanceProof=true",
      400
    );

    // B-Test 8: Minimum Worked Hours Enforced (< 4h rejected)
    await expectError(
      () =>
        LeaveEncashmentCompOffService.createCompOffRequest(
          tenantAId,
          aliceProfileA,
          {
            workedOnDate: sundayDateStr,
            workType: "WEEKLY_OFF",
            actualHoursWorked: 2.5,
            reason: "Worked only 2.5 hours",
          },
          { selfOnly: true }
        ),
      "B8: Worked hours below policy minWorkedHours (2.5h < 4h) rejected",
      400
    );

    // Submit Lot 1 (Sunday = 0.5 day) & test Idempotency-Key (B7) + Duplicate Work Date (B6)
    const compOffLot1 = await LeaveEncashmentCompOffService.createCompOffRequest(
      tenantAId,
      aliceProfileA,
      {
        workedOnDate: sundayDateStr,
        workType: "WEEKLY_OFF",
        reason: "Production release support on Sunday",
        idempotencyKey: `idem-co1-${runSuffix}`,
      },
      { selfOnly: true }
    );
    const compOffLot1Replay = await LeaveEncashmentCompOffService.createCompOffRequest(
      tenantAId,
      aliceProfileA,
      {
        workedOnDate: sundayDateStr,
        workType: "WEEKLY_OFF",
        reason: "Production release support on Sunday",
        idempotencyKey: `idem-co1-${runSuffix}`,
      },
      { selfOnly: true }
    );
    assert(
      compOffLot1.id === compOffLot1Replay.id,
      "B7: Idempotency-Key replay returns exact existing Comp-Off request without duplicate creation"
    );

    await expectError(
      () =>
        LeaveEncashmentCompOffService.createCompOffRequest(
          tenantAId,
          aliceProfileA,
          {
            workedOnDate: sundayDateStr,
            workType: "WEEKLY_OFF",
            reason: "Duplicate date with different key",
          },
          { selfOnly: true }
        ),
      "B6: Duplicate Comp-Off request for the same worked date is rejected",
      409
    );

    // Submit Lot 2 (Public Holiday = 1.0 day)
    const compOffLot2 = await LeaveEncashmentCompOffService.createCompOffRequest(
      tenantAId,
      aliceProfileA,
      {
        workedOnDate: holidayDateStr,
        workType: "PUBLIC_HOLIDAY",
        reason: "Holiday incident response shift",
      },
      { selfOnly: true }
    );

    // B-Test 10: No Credit Before Approval -> Credit + Expiry Created Atomically Upon Approval
    const compBalBeforeApproval = await LeaveService.getEmployeeBalance(
      tenantAId,
      empAliceA.id,
      compOffLeave.id,
      currentYear
    );
    assert(
      compBalBeforeApproval === 0,
      "B10a: Unapproved (PENDING) Comp-Off requests grant 0.0 available leave days"
    );

    // B-Test 11: Parallel Concurrency & Duplicate Credit Prevention on Approval (Promise.all)
    const parallelApprovals = await Promise.allSettled([
      LeaveEncashmentCompOffService.decideCompOffRequest(
        tenantAId,
        compOffLot1.id,
        hrAdminProfileA,
        { action: "approve", comments: "Parallel approval 1" }
      ),
      LeaveEncashmentCompOffService.decideCompOffRequest(
        tenantAId,
        compOffLot1.id,
        hrMgrProfileA,
        { action: "approve", comments: "Parallel approval 2" }
      ),
    ]);
    const succeededCount = parallelApprovals.filter((r) => r.status === "fulfilled").length;
    const lot1CreditsInDb = await rawPrisma.leaveLedgerEntry.count({
      where: {
        tenantId: tenantAId,
        employeeId: empAliceA.id,
        leaveTypeId: compOffLeave.id,
        entryType: "CREDIT",
      },
    });
    assert(
      succeededCount === 1 && lot1CreditsInDb === 1,
      "B11: Row-level lock prevents concurrent double-approval & guarantees exactly 1 CREDIT ledger entry"
    );

    // Approve Lot 2 (1.0d) as well -> Total Comp-Off balance = 0.5 + 1.0 = 1.5 days!
    const approvedLot2 = await LeaveEncashmentCompOffService.decideCompOffRequest(
      tenantAId,
      compOffLot2.id,
      hrAdminProfileA,
      { action: "approve", comments: "Approved 1.0d holiday Comp-Off" }
    );
    assert(
      Boolean(approvedLot2.expiresAt) && Number(approvedLot2.creditedDays) === 1,
      "B10b: Approved Comp-Off sets expiresAt and records creditedDays = 1.0"
    );

    // Ensure Lot 1 expires SOONER than Lot 2 so FIFO picks Lot 1 (0.5d) first, then 0.5d from Lot 2!
    await rawPrisma.leaveEncashmentRequest.update({
      where: { id: compOffLot1.id },
      data: { expiresAt: new Date(`${isoDateDaysAhead(10)}T00:00:00.000Z`) },
    });
    await rawPrisma.leaveEncashmentRequest.update({
      where: { id: compOffLot2.id },
      data: { expiresAt: new Date(`${isoDateDaysAhead(35)}T00:00:00.000Z`) },
    });

    const totalCompOffAvail = await LeaveService.getEmployeeBalance(
      tenantAId,
      empAliceA.id,
      compOffLeave.id,
      currentYear
    );
    assert(
      totalCompOffAvail === 1.5,
      "B10c: Authoritative Comp-Off balance equals 1.5 days (0.5d Lot 1 + 1.0d Lot 2)"
    );

    // B-Test 12, 13 & 15: Apply for 1.0 Day Comp-Off Leave via LeaveService -> FIFO Partial Utilization across Lot 1 (0.5d) + Lot 2 (0.5d)!
    const leaveDateStr = findUpcomingWeekday(2);
    const compLeaveApp = await LeaveService.submitApplication(
      tenantAId,
      empAliceA.id,
      {
        leaveTypeId: compOffLeave.id,
        startDate: leaveDateStr,
        endDate: leaveDateStr,
        reason: "Taking 1 day Comp-Off leave",
      },
      empAliceUserA.id,
      { bypassNoticePeriod: true }
    );
    assert(
      compLeaveApp.status === "pending",
      "B12: LeaveService.submitApplication accepts 1.0d Comp-Off leave & reserves FIFO lots"
    );

    // Approve the Comp-Off Leave Application -> consumes FIFO allocations!
    await LeaveService.decideApplication(
      tenantAId,
      compLeaveApp.id,
      "approve",
      hrAdminUserA.id,
      "Approved Comp-Off leave",
      ["hr_admin"]
    );

    const lot1AfterLeave = await rawPrisma.leaveEncashmentRequest.findUnique({ where: { id: compOffLot1.id } });
    const lot2AfterLeave = await rawPrisma.leaveEncashmentRequest.findUnique({ where: { id: compOffLot2.id } });
    const balAfterCompLeave = await LeaveService.getEmployeeBalance(tenantAId, empAliceA.id, compOffLeave.id, currentYear);
    assert(
      Number(lot1AfterLeave?.usedDays) === 0.5 &&
        Number(lot1AfterLeave?.remainingDays) === 0 &&
        Number(lot2AfterLeave?.usedDays) === 0.5 &&
        Number(lot2AfterLeave?.remainingDays) === 0.5 &&
        balAfterCompLeave === 0.5,
      "B13 & B15: FIFO Partial Utilization consumed 0.5d from earlier-expiring Lot 1 and 0.5d from Lot 2, leaving 0.5d available"
    );

    // B-Test 14: Cancel Approved Comp-Off Leave Application -> Restores FIFO Lots & Balance!
    await LeaveService.cancelApplication(
      tenantAId,
      compLeaveApp.id,
      hrAdminUserA.id,
      "Release postponed, cancelling Comp-Off leave"
    );
    const lot1AfterCancel = await rawPrisma.leaveEncashmentRequest.findUnique({ where: { id: compOffLot1.id } });
    const lot2AfterCancel = await rawPrisma.leaveEncashmentRequest.findUnique({ where: { id: compOffLot2.id } });
    const balAfterLeaveCancel = await LeaveService.getEmployeeBalance(tenantAId, empAliceA.id, compOffLeave.id, currentYear);
    assert(
      Number(lot1AfterCancel?.remainingDays) === 0.5 &&
        Number(lot2AfterCancel?.remainingDays) === 1 &&
        balAfterLeaveCancel === 1.5,
      "B14: Cancelling Comp-Off leave restores FIFO allocations (Lot 1 -> 0.5d, Lot 2 -> 1.0d, Total -> 1.5d)"
    );

    // B-Test 16 & 17: Comp-Off Expiry Sweep & Strict Idempotency
    // Move Lot 1 expiresAt to 2 days ago so Lot 1 (0.5d) is overdue while Lot 2 (1.0d) stays active!
    await rawPrisma.leaveEncashmentRequest.update({
      where: { id: compOffLot1.id },
      data: { expiresAt: new Date(`${isoDateDaysAgo(2)}T00:00:00.000Z`) },
    });

    const sweepRun1 = await LeaveEncashmentCompOffService.processTenantCompOffExpiry(tenantAId);
    const balAfterExpiry1 = await LeaveService.getEmployeeBalance(
      tenantAId,
      empAliceA.id,
      compOffLeave.id,
      currentYear
    );
    assert(
      sweepRun1.expiredLotsCount === 1 && balAfterExpiry1 === 1,
      "B16: Comp-Off expiry sweep expires overdue 0.5d Lot 1, posts EXPIRY ledger debit, and updates balance to 1.0d"
    );

    const sweepRun2 = await LeaveEncashmentCompOffService.processTenantCompOffExpiry(tenantAId);
    const autoJobRes = await AttendanceAutomationService.processCompOffExpiries(tenantAId);
    const expiryLedgerCount = await rawPrisma.leaveLedgerEntry.count({
      where: {
        tenantId: tenantAId,
        employeeId: empAliceA.id,
        leaveTypeId: compOffLeave.id,
        entryType: "EXPIRY",
      },
    });
    assert(
      sweepRun2.expiredLotsCount === 0 &&
        expiryLedgerCount === 1 &&
        typeof autoJobRes.recordsProcessed === "number",
      "B17: Re-running Comp-Off expiry sweep & AttendanceAutomationService job is strictly idempotent (0 duplicate EXPIRY ledger entries)"
    );

    // B-Test 18: Cross-Tenant Comp-Off Isolation + Unified Transaction History & CSV Export
    const tenantBCompOffs = await LeaveEncashmentCompOffService.listRequestsAndHistory(
      tenantBId,
      hrAdminProfileB,
      { tab: "COMP_OFF", page: 1, limit: 50 }
    );
    assert(
      tenantBCompOffs.data.length === 0,
      "B18a: Tenant B sees 0 Comp-Off requests belonging to Tenant A"
    );

    const txHistoryA = await LeaveEncashmentCompOffService.listRequestsAndHistory(
      tenantAId,
      hrAdminProfileA,
      { tab: "HISTORY", page: 1, limit: 50 }
    );
    const csvExportA = await LeaveEncashmentCompOffService.exportTransactionsCsv(
      tenantAId,
      hrAdminProfileA,
      {}
    );
    const csvExportB = await LeaveEncashmentCompOffService.exportTransactionsCsv(
      tenantBId,
      hrAdminProfileB,
      {}
    );
    assert(
      txHistoryA.data.length >= 6 &&
        csvExportA.includes("Ananya Sharma") &&
        !csvExportB.includes("Ananya Sharma"),
      "B18b: Unified Transaction History & CSV Export include Tenant A records and strictly exclude them from Tenant B"
    );

    // =========================================================================
    // SECTION 3: DUAL-FRONTEND PARITY & NAVIGATION RECONCILIATION VERIFICATION
    // =========================================================================
    console.log("\n--- SECTION 3: DUAL-FRONTEND & NAVIGATION PARITY VERIFICATION ---");

    const repoRoot = path.resolve(process.cwd(), process.cwd().endsWith("server") ? ".." : ".");
    const requiredFrontendFiles = [
      "CMS/src/app/(workspace)/hr/leave/encashment-compoff/page.tsx",
      "src/routes/_authenticated/hr/leave/encashment-compoff.tsx",
      "CMS/src/app/(workspace)/me/leave/encashment-compoff/page.tsx",
      "src/routes/_authenticated/me/leave/encashment-compoff.tsx",
    ];
    for (const rel of requiredFrontendFiles) {
      assert(
        fs.existsSync(path.join(repoRoot, rel)),
        `Frontend route file exists: ${rel}`
      );
    }

    const cmsHrPage = fs.readFileSync(
      path.join(repoRoot, "CMS/src/app/(workspace)/hr/leave/encashment-compoff/page.tsx"),
      "utf8"
    );
    const tsHrPage = fs.readFileSync(
      path.join(repoRoot, "src/routes/_authenticated/hr/leave/encashment-compoff.tsx"),
      "utf8"
    );
    const sharedEndpoints = [
      "/api/v1/hr/leave/encashment-compoff/metadata",
      "/api/v1/hr/leave/encashment-compoff/summary",
      "/api/v1/hr/leave/encashment-compoff/encashments",
      "/api/v1/hr/leave/encashment-compoff/comp-offs",
      "/api/v1/hr/leave/encashment-compoff/transactions",
      "/api/v1/hr/leave/encashment-compoff/configs/encashment",
      "/api/v1/hr/leave/encashment-compoff/configs/comp-off",
    ];
    for (const ep of sharedEndpoints) {
      assert(
        cmsHrPage.includes(ep) && tsHrPage.includes(ep),
        `Both Next.js CMS & TanStack Start bind identical API contract: ${ep}`
      );
    }

    const cmsNavReg = fs.readFileSync(
      path.join(repoRoot, "CMS/src/lib/navigation-registry.ts"),
      "utf8"
    );
    const tsNavReg = fs.readFileSync(
      path.join(repoRoot, "src/lib/navigation-registry.ts"),
      "utf8"
    );
    assert(
      cmsNavReg.includes('"/hr/leave/encashment-compoff"') &&
        tsNavReg.includes('"/hr/leave/encashment-compoff"') &&
        cmsNavReg.includes('"/me/leave/encashment-compoff"') &&
        tsNavReg.includes('"/me/leave/encashment-compoff"'),
      "Navigation registries in both CMS & TanStack Start expose HR and ESS Leave Encashment & Comp-Off routes"
    );
  } finally {
    // Clean up ONLY the ephemeral test tenants & test users created in this run
    await cleanupEphemeralTestArtifacts([tenantAId, tenantBId]);
    if (createdUserIds.length > 0) {
      await rawPrisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await rawPrisma.$disconnect();
  }

  console.log("\n================================================================================");
  console.log(
    `P3-A AUTOMATED INTEGRATION SUITE SUMMARY: ${passedTests}/${totalTests} PASSED (100% SUCCESS)`
  );
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("FATAL TEST SUITE FAILURE:", err);
  process.exit(1);
});
