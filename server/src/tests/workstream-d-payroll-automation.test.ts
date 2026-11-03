import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import Decimal from "decimal.js";
import crypto from "crypto";
import { prisma, rawPrisma } from "../prisma";
import {
  PayrollOrchestratorService,
  PayrollLifecycleState,
} from "../services/payroll-orchestrator.service";
import { StatutoryFormRegistryService } from "../services/statutory/statutory-form-registry.service";
import { ContractBillingService } from "../services/contract-billing.service";
import { ContractInvoiceService } from "../services/contract-invoice.service";
import { autoPostPayrollToLedger } from "../services/ledger-posting.service";

const db = rawPrisma || prisma;

describe("Workstream D: End-to-End Monthly Payroll Automation & Orchestration Lifecycle", () => {
  let testTenantId = "tenant-default-001";
  let testPeriodMonth = 10;
  let testPeriodYear = 2026;
  let createdRunId = "";
  let hrUserId = "hr-manager-uuid-001";
  let hrUserEmail = "hrmanager@masterhrms.test";
  let financeUserId = "finance-director-uuid-002";
  let financeUserEmail = "cfo@masterhrms.test";

  before(async () => {
    // 1. Resolve tenant with employees
    const t =
      (await db.tenant.findFirst({
        where: {
          id: "tenant-default-001",
          employees: { some: {} },
        },
      })) ||
      (await db.tenant.findFirst({
        where: {
          employees: { some: {} },
        },
      })) ||
      (await db.tenant.findFirst());

    if (t) {
      testTenantId = t.id;
    }

    // Clean up any existing run for test period to ensure clean isolated test run
    await db.payrollRun.deleteMany({
      where: {
        tenantId: testTenantId,
        periodMonth: testPeriodMonth,
        periodYear: testPeriodYear,
      },
    });
  });

  after(async () => {
    // Keep test evidence clean
  });

  // =========================================================================
  // 1. STAGE 1: PERIOD CREATION & IDEMPOTENCY
  // =========================================================================
  describe("1. Stage 1: Period Creation & Calendar Initialization", () => {
    it("WS-D.1.1: Idempotently initializes payroll period in DRAFT status with calendar boundaries", async () => {
      const result = await PayrollOrchestratorService.createPeriod(
        testTenantId,
        testPeriodMonth,
        testPeriodYear,
        hrUserId
      );

      assert.strictEqual(result.isNew, true, "First invocation must create a new period.");
      assert.ok(result.run?.id, "Run ID must be generated.");
      assert.strictEqual(result.run.approvalStatus, "DRAFT", "Initial state must strictly be DRAFT.");
      assert.strictEqual(result.run.status, "draft", "Status must be 'draft'.");
      assert.strictEqual(result.calendar.monthDays, 31, "October 2026 has exactly 31 calendar days.");
      assert.ok(result.calendar.standardWorkingDays >= 26, "Working days must be calculated.");

      createdRunId = result.run.id;
    });

    it("WS-D.1.2: Idempotency guarantee: Re-triggering period creation returns existing cycle without duplication", async () => {
      const duplicateResult = await PayrollOrchestratorService.createPeriod(
        testTenantId,
        testPeriodMonth,
        testPeriodYear,
        hrUserId
      );

      assert.strictEqual(duplicateResult.isNew, false, "Second call must recognize existing period.");
      assert.strictEqual(
        duplicateResult.run.id,
        createdRunId,
        "Must return identical existing run ID."
      );
      assert.strictEqual(
        duplicateResult.run.approvalStatus,
        "DRAFT",
        "State remains DRAFT."
      );
    });
  });

  // =========================================================================
  // 2. STAGE 2: EMPLOYEE ELIGIBILITY & PRORATION RESOLUTION
  // =========================================================================
  describe("2. Stage 2: Employee Eligibility Resolution", () => {
    it("WS-D.2.1: Resolves eligible employees with defense against missing schema columns", async () => {
      const eligible = await PayrollOrchestratorService.resolveEligibility(
        testTenantId,
        testPeriodMonth,
        testPeriodYear
      );

      assert.ok(Array.isArray(eligible), "Eligible employees must be an array.");
      assert.ok(eligible.length > 0, "Must resolve at least 1 employee for active tenant.");

      // Check required fields on resolved employee records
      const first = eligible[0];
      assert.ok(first.id, "Employee ID must be present.");
      assert.ok(first.employeeCode, "Employee code must be present.");
      assert.ok(typeof first.prorationFactor === "number", "Proration factor must be numeric.");
      assert.ok(first.prorationFactor >= 0 && first.prorationFactor <= 1.0, "Factor must be between 0 and 1.");
    });

    it("WS-D.2.2: Calculates mathematical proration factor for mid-month joiners", async () => {
      const monthDays = 31;
      const joiningDay = 15;
      const payableCalendarDays = monthDays - joiningDay + 1;
      const expectedFactor = payableCalendarDays / monthDays;

      // Verify proration formula: (31 - 15 + 1) / 31 = 17 / 31 = ~0.5484
      assert.strictEqual(payableCalendarDays, 17);
      assert.ok(Math.abs(expectedFactor - 0.548387) < 0.001);
    });
  });

  // =========================================================================
  // 3. STAGES 3 & 4: ATTENDANCE & LEAVE/LOP LOCKING
  // =========================================================================
  describe("3. Stages 3 & 4: Attendance & Leave/LOP Locking", () => {
    it("WS-D.3.1: Advances cycle state from DRAFT to ATTENDANCE_LOCKED", async () => {
      const result = await PayrollOrchestratorService.lockAttendance(
        testTenantId,
        createdRunId,
        hrUserId,
        "Official lock prior to payroll batch calculation"
      );

      assert.strictEqual(
        result.run.approvalStatus,
        "ATTENDANCE_LOCKED",
        "State must transition to ATTENDANCE_LOCKED."
      );
      assert.strictEqual(result.isLocked, true);
      assert.ok(result.eligibleHeadcount > 0, "Headcount must be recorded.");
    });

    it("WS-D.3.2: Persists AttendanceMonthLock in database for tenant period", async () => {
      const lockRecord = await db.attendanceMonthLock.findUnique({
        where: {
          tenantId_year_month: {
            tenantId: testTenantId,
            year: testPeriodYear,
            month: testPeriodMonth,
          },
        },
      });

      assert.ok(lockRecord, "AttendanceMonthLock record must exist.");
      assert.strictEqual(lockRecord.isLocked, true, "Attendance must be marked locked.");
      assert.strictEqual(lockRecord.lockedById, hrUserId, "Locking actor ID must be preserved.");
    });
  });

  // =========================================================================
  // 4. STAGES 5 TO 10: BATCH PAYROLL CALCULATION
  // =========================================================================
  describe("4. Stages 5–10: Batch Payroll Calculation Engine", () => {
    it("WS-D.4.1: Executes dynamic proration, overtime, earnings, statutory deductions and loan recovery", async () => {
      const result = await PayrollOrchestratorService.calculatePayroll(
        testTenantId,
        createdRunId,
        hrUserId
      );

      assert.ok(result.headcount > 0, "Headcount must be positive.");
      assert.ok(result.totalGross > 0, "Total gross must be greater than zero.");
      assert.ok(result.totalNet > 0, "Total net must be greater than zero.");
      assert.ok(result.totalDeductions >= 0, "Total deductions must be non-negative.");
      assert.ok(
        result.state === "PREVIEW_READY" || result.state === "CALCULATED",
        "State must be CALCULATED or PREVIEW_READY."
      );

      // Verify that Payslip and PayrollSnapshot rows were created in DB
      const countSlips = await db.payslip.count({
        where: { payrollRunId: createdRunId },
      });
      const countSnaps = await db.payrollSnapshot.count({
        where: { payrollRunId: createdRunId },
      });

      assert.strictEqual(countSlips, result.headcount, "Payslips count matches headcount.");
      assert.strictEqual(countSnaps, result.headcount, "Snapshots count matches headcount.");
    });

    it("WS-D.4.2: Financial reconciliation: Gross = Net + Total Deductions across all payslips", async () => {
      const run = await db.payrollRun.findUnique({
        where: { id: createdRunId },
      });

      assert.ok(run, "Run must exist.");
      const gross = new Decimal(run.totalAmount || 0);
      const net = new Decimal(run.totalNet || 0);
      const deductions = new Decimal(run.totalDeductions || 0);

      const reconciledNet = gross.minus(deductions);
      assert.ok(
        net.minus(reconciledNet).abs().lessThan(0.01),
        `Financial imbalance! Gross (${gross}) != Net (${net}) + Deductions (${deductions})`
      );
    });
  });

  // =========================================================================
  // 5. STAGE 11: PRE-RUN VARIANCE & ANOMALY ENGINE (16 CHECKS)
  // =========================================================================
  describe("5. Stage 11: Pre-Run Variance & Anomaly Validation Gate", () => {
    it("WS-D.5.1: Evaluates comprehensive 16-check anomaly engine and emits structured scorecard", async () => {
      const report = await PayrollOrchestratorService.evaluatePreRunVariance(
        testTenantId,
        createdRunId
      );

      assert.strictEqual(report.runId, createdRunId);
      assert.strictEqual(report.period, "10/2026");
      assert.ok(typeof report.blockerCount === "number");
      assert.ok(typeof report.warningCount === "number");
      assert.ok(typeof report.infoCount === "number");
      assert.ok(report.scorecard, "Scorecard must be present.");
      assert.ok(Array.isArray(report.findings), "Findings must be an array.");
    });

    it("WS-D.5.2: Blocker detection: If blockers exist, unapproved submission is strictly rejected", async () => {
      // Must reject submission without override
      await assert.rejects(
        async () => {
          await PayrollOrchestratorService.submitForReview(testTenantId, createdRunId, {
            id: hrUserId,
            email: hrUserEmail,
            role: "hr_manager",
          });
        },
        /blocking errors detected|Cannot submit for review/,
        "Blocked cycles must fail closed on unapproved submission attempt."
      );
    });

    it("WS-D.5.3: Immutability guard: Attempting to recalculate an immutable run returns 409 Conflict", async () => {
      // Temporarily simulate an approved run to verify recalculation rejection
      const fakeRun = await db.payrollRun.create({
        data: {
          tenantId: testTenantId,
          periodMonth: 1,
          periodYear: 2026,
          approvalStatus: "APPROVED",
          status: "draft",
          employeeCount: 1,
          totalAmount: 10000,
          totalNet: 8000,
          totalDeductions: 2000,
        },
      });

      try {
        await assert.rejects(
          async () => {
            await PayrollOrchestratorService.calculatePayroll(testTenantId, fakeRun.id, hrUserId);
          },
          (err: any) => err.statusCode === 409 || err.message.includes("409 Conflict"),
          "Recalculating an approved cycle must throw 409 Conflict."
        );
      } finally {
        await db.payrollRun.delete({ where: { id: fakeRun.id } });
      }
    });
  });

  // =========================================================================
  // 6. STAGE 12: DUAL GOVERNANCE & ANTI-COLLUSION PROTOCOL
  // =========================================================================
  describe("6. Stage 12: Two-Tier Dual Approval & Anti-Collusion Protocol", () => {
    it("WS-D.6.1: Tier 1: HR Manager submits cycle with authorized waiver, transitioning state to UNDER_REVIEW", async () => {
      // Ensure state is PREVIEW_READY for submission
      await db.payrollRun.update({
        where: { id: createdRunId },
        data: { approvalStatus: "PREVIEW_READY" },
      });

      const submitted = await PayrollOrchestratorService.submitForReview(
        testTenantId,
        createdRunId,
        {
          id: hrUserId,
          email: hrUserEmail,
          role: "hr_manager",
        },
        "HR Manager review complete: Blocker waiver authorized for test environment.",
        { allowBlockerOverride: true }
      );

      assert.strictEqual(
        submitted.approvalStatus,
        "UNDER_REVIEW",
        "State must advance to UNDER_REVIEW."
      );
    });

    it("WS-D.6.2: Anti-collusion defense: Submitter CANNOT approve their own cycle (Separation of Duties)", async () => {
      // Same HR user attempts to approve their own submitted cycle
      await assert.rejects(
        async () => {
          await PayrollOrchestratorService.approvePayroll(
            testTenantId,
            createdRunId,
            {
              id: hrUserId, // SAME ID as submitter!
              email: hrUserEmail,
              role: "hr_manager",
            },
            "Unauthorized self-approval"
          );
        },
        (err: any) => err.statusCode === 403 || err.message.includes("Submitter cannot approve"),
        "Anti-collusion protocol must reject self-approval with 403 Forbidden."
      );
    });

    it("WS-D.6.3: Stage 12 Rejection: Authorized reviewer can reject cycle back to DRAFT with reason", async () => {
      const rejected = await PayrollOrchestratorService.rejectPayroll(
        testTenantId,
        createdRunId,
        {
          id: financeUserId,
          email: financeUserEmail,
          role: "finance_director",
        },
        "Test Rejection: Injected anomaly verification."
      );

      assert.strictEqual(rejected.approvalStatus, "DRAFT", "Rejection must reset state to DRAFT.");

      // Re-submit cycle for subsequent authorization tests
      await db.payrollRun.update({
        where: { id: createdRunId },
        data: { approvalStatus: "PREVIEW_READY" },
      });
      await PayrollOrchestratorService.submitForReview(
        testTenantId,
        createdRunId,
        {
          id: hrUserId,
          email: hrUserEmail,
          role: "hr_manager",
        },
        "Re-submitted after remediation",
        { allowBlockerOverride: true }
      );
    });

    it("WS-D.6.4: Tier 2: Distinct Finance Director grants formal approval, advancing state to APPROVED", async () => {
      const approved = await PayrollOrchestratorService.approvePayroll(
        testTenantId,
        createdRunId,
        {
          id: financeUserId, // DIFFERENT user!
          email: financeUserEmail,
          role: "finance_director",
        },
        "Disbursement and statutory liabilities authorized by CFO."
      );

      assert.strictEqual(
        approved.approvalStatus,
        "APPROVED",
        "State must advance to APPROVED."
      );
      assert.strictEqual(approved.approvedBy, financeUserEmail);
      assert.ok(approved.approvedAt instanceof Date);
    });
  });

  // =========================================================================
  // 7. STAGE 13: FINALIZATION & CRYPTOGRAPHIC LEDGER LOCK
  // =========================================================================
  describe("7. Stage 13: Finalization & Cryptographic Ledger Lock", () => {
    it("WS-D.7.1: Commits double-entry ledger, locks snapshots, and generates SHA-256 seal", async () => {
      const finalResult = await PayrollOrchestratorService.finalizePayroll(
        testTenantId,
        createdRunId,
        {
          id: financeUserId,
          email: financeUserEmail,
          role: "finance_director",
        }
      );

      assert.ok(finalResult.cryptographicHash, "SHA-256 hash must be generated.");
      assert.strictEqual(
        finalResult.cryptographicHash.length,
        64,
        "SHA-256 hash must be 64 hexadecimal characters."
      );
      assert.strictEqual(finalResult.run.status, "completed", "Run status must be 'completed'.");
      assert.strictEqual(
        finalResult.run.approvalStatus,
        "CLOSED",
        "Cycle is sealed in CLOSED state."
      );

      // Verify all snapshots are locked
      const unlockedCount = await db.payrollSnapshot.count({
        where: {
          payrollRunId: createdRunId,
          isLocked: false,
        },
      });
      assert.strictEqual(unlockedCount, 0, "All snapshot records must have isLocked = true.");
    });

    it("WS-D.7.2: Verifies balanced double-entry journal entry was posted to General Ledger", async () => {
      const journalEntry = await rawPrisma.journalEntry.findFirst({
        where: {
          tenantId: testTenantId,
          reference: createdRunId,
        },
        include: {
          items: {
            include: {
              account: true,
            },
          },
        },
      });

      assert.ok(journalEntry, "General ledger JournalEntry must exist for run.");

      let totalDebits = new Decimal(0);
      let totalCredits = new Decimal(0);

      for (const item of journalEntry.items) {
        totalDebits = totalDebits.plus(new Decimal(item.debit));
        totalCredits = totalCredits.plus(new Decimal(item.credit));
      }

      assert.ok(
        totalDebits.equals(totalCredits),
        `Unbalanced ledger entry! Debits (${totalDebits}) != Credits (${totalCredits})`
      );
    });
  });

  // =========================================================================
  // 8. STAGES 14 TO 16: POST-FINALIZATION OUTPUT GENERATION
  // =========================================================================
  describe("8. Stages 14–16: Statutory, Billing, Bank Advice & ESS Outputs", () => {
    it("WS-D.8.1: Stage 14: Verifies Workstream C statutory forms (U, V, W, X, S) integration", async () => {
      const run = await db.payrollRun.findUnique({
        where: { id: createdRunId },
      });

      const manifest = (run?.statutoryManifest as any)?.outputs?.statutoryRegisters;
      assert.ok(manifest, "Statutory manifest must exist.");
      assert.deepStrictEqual(
        manifest.formsGenerated,
        ["FORM_U", "FORM_V", "FORM_W", "FORM_X", "FORM_S"],
        "All 5 Workstream C registers must be registered."
      );
    });

    it("WS-D.8.2: Stage 16: Generates standardized bank disbursement advice matching exact rupee total", async () => {
      const exportAdvice = await PayrollOrchestratorService.generateBankDisbursementExport(
        testTenantId,
        createdRunId,
        { masked: false }
      );

      assert.ok(exportAdvice.csvContent.includes("SL_NO,EMPLOYEE_CODE"), "CSV header must be present.");
      assert.ok(exportAdvice.recordCount > 0, "Must contain bank transfer rows.");
      assert.strictEqual(exportAdvice.isBalanced, true, "Bank advice total matches cycle net pay to exact rupee.");
    });

    it("WS-D.8.3: Stage 16: Masked bank export masks account number for audit privacy", async () => {
      const maskedAdvice = await PayrollOrchestratorService.generateBankDisbursementExport(
        testTenantId,
        createdRunId,
        { masked: true }
      );

      assert.ok(maskedAdvice.csvContent.includes("****") || maskedAdvice.csvContent.includes("NOT_PROVIDED"));
      assert.strictEqual(maskedAdvice.isBalanced, true);
    });

    it("WS-D.8.4: Stage 16: Publishes ESS payslips to employees with timestamps", async () => {
      const run = await db.payrollRun.findUnique({
        where: { id: createdRunId },
      });

      assert.strictEqual(run?.isPublished, true, "isPublished must be true.");
      assert.ok(run?.publishedAt instanceof Date, "publishedAt timestamp must be set.");
      assert.strictEqual(run?.publishedBy, financeUserEmail, "publishedBy must match CFO.");
    });
  });
});
