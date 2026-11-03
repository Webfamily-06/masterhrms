/**
 * MASTERHRMS — WORKSTREAM A BLOCKER REMEDIATION ACCEPTANCE TEST SUITE
 * 
 * Verifies resolution of:
 * - BLK-03: Elimination of legacy hardcoded ₹35,000 salary fallback
 * - BLK-04: Mandatory Pre-Flight Validation Gate & Concurrency/Immutability
 * - BLK-06: CMS Salary Structure Template Builder & Simulation Engine
 */

import assert from "node:assert";
import {
  computeEmployeePayrollBreakdown,
  calculateStatutoryEPF,
  calculateStatutoryESI,
  resolveEffectiveSalaryAssignment,
} from "../services/payroll-engine.service";
import {
  PayrollValidationService,
  ValidationFinding,
} from "../services/payroll-validation.service";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err: any) {
    failedTests++;
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

async function runTestSuite() {
  console.log("================================================================================");
  console.log("MASTERHRMS — WORKSTREAM A BLOCKER REMEDIATION ACCEPTANCE SUITE (BLK-03, 04, 06)");
  console.log("================================================================================\n");

  // ---------------------------------------------------------------------------
  // SECTION 1: BLK-03 — SALARY FALLBACK REMOVAL & DEFENSIVE RESOLUTION
  // ---------------------------------------------------------------------------
  console.log("--- Section 1: BLK-03 Salary Fallback Removal & Defensive Resolution ---");

  await runTest("BLK-03.1: Missing salary does NOT fabricate ₹35,000 (Evaluates to ₹0.00)", () => {
    const res = computeEmployeePayrollBreakdown(
      { id: "EMP-NO-SALARY", employeeCode: "E001", state: "TN" },
      { totalWorkingDays: 30, payableDays: 30, prorationFactor: 1.0 }
    );
    assert.strictEqual(res.earnings.totalGross, 0, "Earned gross must be 0, never 35,000!");
    assert.strictEqual(res.netPay, 0, "Net pay must be 0!");
    assert.ok(res.validationErrors, "Must attach validationErrors");
    assert.ok(
      res.validationErrors.includes("Zero or missing base monthly CTC"),
      "Must flag zero/missing CTC"
    );
  });

  await runTest("BLK-03.2: Explicit null/undefined baseMonthlyCtc evaluates to ₹0.00", () => {
    const res = computeEmployeePayrollBreakdown(
      { id: "EMP-NULL", employeeCode: "E002", baseMonthlyCtc: undefined as any, state: "TN" },
      { totalWorkingDays: 30, payableDays: 30, prorationFactor: 1.0 }
    );
    assert.strictEqual(res.earnings.totalGross, 0);
    assert.strictEqual(res.earnings.basicSalary, 0);
  });

  await runTest("BLK-03.3: Explicit zero salary (₹0.00) evaluates to ₹0.00 without fallback", () => {
    const res = computeEmployeePayrollBreakdown(
      { id: "EMP-ZERO", employeeCode: "E003", baseMonthlyCtc: 0, state: "TN" },
      { totalWorkingDays: 30, payableDays: 30, prorationFactor: 1.0 }
    );
    assert.strictEqual(res.earnings.totalGross, 0);
    assert.strictEqual(res.netPay, 0);
    assert.ok(res.validationErrors?.includes("Zero or missing base monthly CTC"));
  });

  await runTest("BLK-03.4: Negative salary flags validation error", () => {
    const res = computeEmployeePayrollBreakdown(
      { id: "EMP-NEG", employeeCode: "E004", baseMonthlyCtc: -10000, state: "TN" },
      { totalWorkingDays: 30, payableDays: 30, prorationFactor: 1.0 }
    );
    assert.ok(res.validationErrors?.includes("Negative base monthly CTC"));
  });

  await runTest("BLK-03.5: Valid salary assignment (₹45,000) calculates dynamically with 100% precision", () => {
    const res = computeEmployeePayrollBreakdown(
      { id: "EMP-VALID", employeeCode: "E005", baseMonthlyCtc: 45000, state: "TN" },
      { totalWorkingDays: 30, payableDays: 30, prorationFactor: 1.0 }
    );
    assert.strictEqual(res.earnings.totalGross, 45000);
    assert.strictEqual(res.earnings.basicSalary, 22500); // 50%
    assert.strictEqual(res.earnings.specialAllowance, 6750); // 15%
    assert.strictEqual(res.deductions.providentFund, 1800); // Capped at ₹15,000 ceiling
    assert.strictEqual(res.deductions.esi, 0); // Exempt (> ₹21,000)
    assert.strictEqual(res.validationErrors, undefined);
  });

  // ---------------------------------------------------------------------------
  // SECTION 2: BLK-04 — MANDATORY PRE-FLIGHT VALIDATION GATE
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 2: BLK-04 Mandatory Pre-Flight Validation Gate ---");

  await runTest("BLK-04.1: Pre-flight validation flags missing salary and zero CTC as BLOCKER", async () => {
    const mockPrisma = {
      payrollRun: {
        findUnique: async () => ({
          id: "RUN-01",
          tenantId: "TENANT-1",
          periodMonth: 10,
          periodYear: 2026,
          payslips: [
            {
              id: "SLIP-01",
              grossSalary: 0,
              deductions: 0,
              netSalary: 0,
              employee: {
                id: "EMP-01",
                employeeCode: "ENBL9999",
                firstName: "Unassigned",
                lastName: "User",
                status: "active",
                bankAccount: "123456789012",
                bankIfsc: "HDFC0001234",
                salary: 0,
                salaryAssignments: [],
              },
              breakdown: {
                validationErrors: ["Zero or missing base monthly CTC"],
              },
            },
          ],
        }),
      },
    };

    const result = await PayrollValidationService.validatePayrollRun("TENANT-1", "RUN-01", {
      prismaClient: mockPrisma,
    });

    assert.strictEqual(result.isValid, false, "Run with zero CTC must NOT be valid");
    assert.strictEqual(result.canFinalize, false, "Run with zero CTC must NOT be finalizable");
    assert.ok(result.blockerCount > 0, "Must have at least 1 blocker");

    const blocker = result.batchSummary.blockers.find((b) => b.code === "COMP_MISSING_ASSIGNMENT" || b.code === "CALC_ENGINE_ANOMALY");
    assert.ok(blocker, "Must contain COMP_MISSING_ASSIGNMENT or CALC_ENGINE_ANOMALY blocker");
  });

  await runTest("BLK-04.2: Pre-flight validation flags negative net pay as BLOCKER", async () => {
    const mockPrisma = {
      payrollRun: {
        findUnique: async () => ({
          id: "RUN-02",
          tenantId: "TENANT-1",
          periodMonth: 10,
          periodYear: 2026,
          payslips: [
            {
              id: "SLIP-02",
              grossSalary: 20000,
              deductions: 25000,
              netSalary: -5000,
              employee: {
                id: "EMP-02",
                employeeCode: "ENBL8888",
                firstName: "Over",
                lastName: "Deducted",
                status: "active",
                bankAccount: "123456789012",
                bankIfsc: "HDFC0001234",
                salary: 20000,
                salaryAssignments: [
                  {
                    id: "ASSIGN-01",
                    isCurrent: true,
                    ctcMonthly: 20000,
                    structureId: "STRUCT-01",
                    effectiveFrom: new Date("2026-01-01"),
                  },
                ],
              },
              breakdown: {},
            },
          ],
        }),
      },
    };

    const result = await PayrollValidationService.validatePayrollRun("TENANT-1", "RUN-02", {
      prismaClient: mockPrisma,
    });

    assert.strictEqual(result.isValid, false);
    const netBlocker = result.batchSummary.blockers.find((b) => b.code === "CALC_NEGATIVE_NET_PAY");
    assert.ok(netBlocker, "Must block on CALC_NEGATIVE_NET_PAY");
    const dedBlocker = result.batchSummary.blockers.find((b) => b.code === "CALC_DEDUCTIONS_EXCEED_GROSS");
    assert.ok(dedBlocker, "Must block on CALC_DEDUCTIONS_EXCEED_GROSS");
  });

  await runTest("BLK-04.3: Pre-flight validation flags invalid IFSC and missing bank account as BLOCKER", async () => {
    const mockPrisma = {
      payrollRun: {
        findUnique: async () => ({
          id: "RUN-03",
          tenantId: "TENANT-1",
          periodMonth: 10,
          periodYear: 2026,
          payslips: [
            {
              id: "SLIP-03",
              grossSalary: 30000,
              deductions: 2000,
              netSalary: 28000,
              employee: {
                id: "EMP-03",
                employeeCode: "ENBL7777",
                firstName: "Bad",
                lastName: "Bank",
                status: "active",
                paymentMethod: "bank",
                bankAccount: "", // Empty bank account!
                bankIfsc: "INVALID_IFSC_123", // Malformed IFSC!
                salaryAssignments: [
                  {
                    id: "ASSIGN-02",
                    isCurrent: true,
                    ctcMonthly: 30000,
                    structureId: "STRUCT-01",
                    effectiveFrom: new Date("2026-01-01"),
                  },
                ],
              },
              breakdown: {},
            },
          ],
        }),
      },
    };

    const result = await PayrollValidationService.validatePayrollRun("TENANT-1", "RUN-03", {
      prismaClient: mockPrisma,
    });

    assert.strictEqual(result.isValid, false);
    const bankBlocker = result.batchSummary.blockers.find((b) => b.code === "DATA_MISSING_BANK_ACCOUNT");
    assert.ok(bankBlocker, "Must block on DATA_MISSING_BANK_ACCOUNT");
    const ifscBlocker = result.batchSummary.blockers.find((b) => b.code === "DATA_INVALID_IFSC");
    assert.ok(ifscBlocker, "Must block on DATA_INVALID_IFSC");
  });

  await runTest("BLK-04.4: Finalization Gate blocks execution with status 422 when blockers exist", async () => {
    const mockPrisma = {
      payrollRun: {
        findUnique: async () => ({
          id: "RUN-04",
          tenantId: "TENANT-1",
          periodMonth: 10,
          periodYear: 2026,
          approvalStatus: "calculated",
          status: "completed",
          payslips: [
            {
              id: "SLIP-04",
              grossSalary: -5000,
              deductions: 0,
              netSalary: -5000,
              employee: {
                id: "EMP-04",
                employeeCode: "ENBL6666",
                status: "active",
                salary: 0,
                salaryAssignments: [],
              },
              breakdown: {},
            },
          ],
        }),
      },
    };

    try {
      await PayrollValidationService.finalizePayrollRunWithGate(
        "TENANT-1",
        "RUN-04",
        { id: "U1", email: "admin@enable.com", role: "hr_admin" },
        { prismaClient: mockPrisma }
      );
      assert.fail("Should have thrown 422 error!");
    } catch (err: any) {
      assert.strictEqual(err.status, 422, "Must throw 422 HTTP status");
      assert.ok(err.validationResult.blockerCount > 0, "Must report blockers in validation result");
    }
  });

  await runTest("BLK-04.5: Finalization Gate preserves immutability on finalized or paid runs", async () => {
    const mockPrisma = {
      payrollRun: {
        findUnique: async () => ({
          id: "RUN-FINALIZED",
          tenantId: "TENANT-1",
          approvalStatus: "finalized", // Already finalized!
          status: "completed",
          payslips: [],
        }),
      },
    };

    try {
      await PayrollValidationService.finalizePayrollRunWithGate(
        "TENANT-1",
        "RUN-FINALIZED",
        { id: "U1", email: "admin@enable.com", role: "hr_admin" },
        { prismaClient: mockPrisma }
      );
      assert.fail("Should have rejected already finalized run!");
    } catch (err: any) {
      assert.ok(err.message.includes("immutable"), "Must reject with immutability error");
    }
  });

  await runTest("BLK-04.6: Concurrency lock prevents concurrent finalizations on the same run ID", async () => {
    const runId = "RUN-CONCURRENT";
    const lock1 = PayrollValidationService.acquireLock(runId);
    assert.strictEqual(lock1, true, "First lock acquisition must succeed");

    const lock2 = PayrollValidationService.acquireLock(runId);
    assert.strictEqual(lock2, false, "Second concurrent lock acquisition must be rejected!");

    PayrollValidationService.releaseLock(runId);
    const lock3 = PayrollValidationService.acquireLock(runId);
    assert.strictEqual(lock3, true, "Lock re-acquisition after release must succeed");
    PayrollValidationService.releaseLock(runId);
  });

  await runTest("BLK-04.7: Sensitive PII values (PAN, Aadhaar, Bank) are strictly masked", () => {
    assert.strictEqual(PayrollValidationService.maskSensitive("ABCDE1234F"), "******234F");
    assert.strictEqual(PayrollValidationService.maskSensitive("123456789012"), "********9012");
    assert.strictEqual(PayrollValidationService.maskSensitive("987654321012345"), "***********2345");
  });

  // ---------------------------------------------------------------------------
  // SECTION 3: BLK-06 — SALARY STRUCTURE TEMPLATE BUILDER & PREVIEW SIMULATION
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 3: BLK-06 Salary Structure Template Builder & Preview ---");

  await runTest("BLK-06.1: Dynamic salary structure simulation with custom Basic + Bonus contract", () => {
    const customComponents = [
      { code: "BASIC", name: "Basic Salary", type: "earning", calculationType: "fixed", value: 21100 },
      { code: "BONUS", name: "Statutory Bonus", type: "earning", calculationType: "fixed", value: 2100 },
    ];

    const res = computeEmployeePayrollBreakdown(
      { id: "EMP-CUSTOM", employeeCode: "ENBL1024", state: "TN", baseMonthlyCtc: 23200 },
      { totalWorkingDays: 31, payableDays: 31, prorationFactor: 1.0 },
      { structureComponents: customComponents }
    );

    assert.strictEqual(res.earnings.basicSalary, 21100, "Basic salary must match fixed 21,100");
    assert.strictEqual(res.earnings.statutoryBonus, 2100, "Bonus must match fixed 2,100");
    assert.strictEqual(res.earnings.totalGross, 23200, "Total gross must be 23,200");
    assert.strictEqual(res.earnings.conveyance, 0, "No fabricated conveyance");
    assert.strictEqual(res.earnings.medical, 0, "No fabricated medical");
    assert.strictEqual(res.deductions.esi, 0, "ESI exempt (Gross > 21k)");
    assert.strictEqual(res.deductions.providentFund, 1800, "Statutory EPF capped at 1,800");
  });

  await runTest("BLK-06.2: Dynamic percentage splits override rigid 50-20-15-5-5-5 splits", () => {
    const percentageComponents = [
      { code: "BASIC", name: "Basic Salary", type: "earning", calculationType: "percentage_of_ctc", value: 60 },
      { code: "HRA", name: "House Rent", type: "earning", calculationType: "percentage_of_ctc", value: 30 },
      { code: "SPECIAL", name: "Special Allowance", type: "earning", calculationType: "percentage_of_ctc", value: 10 },
    ];

    const res = computeEmployeePayrollBreakdown(
      { id: "EMP-PCT", employeeCode: "PCT01", state: "TN", baseMonthlyCtc: 50000 },
      { totalWorkingDays: 30, payableDays: 30, prorationFactor: 1.0 },
      { structureComponents: percentageComponents }
    );

    assert.strictEqual(res.earnings.basicSalary, 30000, "Basic must be 60% of 50k = 30k");
    assert.strictEqual(res.earnings.hra, 15000, "HRA must be 30% of 50k = 15k");
    assert.strictEqual(res.earnings.specialAllowance, 5000, "Special must be 10% of 50k = 5k");
    assert.strictEqual(res.earnings.totalGross, 50000);
    assert.strictEqual(res.earnings.conveyance, 0);
    assert.strictEqual(res.earnings.medical, 0);
  });

  await runTest("BLK-06.3: Structure preview with Tamil Nadu Professional Tax calculation", () => {
    const res = computeEmployeePayrollBreakdown(
      { id: "EMP-PREVIEW", employeeCode: "PREVIEW", state: "TN", baseMonthlyCtc: 40000 },
      { totalWorkingDays: 30, payableDays: 30, prorationFactor: 1.0 },
      {
        structureComponents: [
          { code: "BASIC", name: "Basic", type: "earning", calculationType: "percentage_of_ctc", value: 50 },
          { code: "SPECIAL", name: "Special", type: "earning", calculationType: "percentage_of_ctc", value: 50 },
        ],
      }
    );

    // Gross = 40,000 -> Half yearly = 240,000 (> 75,000) -> PT = 1,250 / 6 = 208.33
    assert.strictEqual(res.deductions.professionalTax, 208.33);
    assert.strictEqual(res.deductions.providentFund, 1800); // 12% on min(15000, 20000)
    assert.strictEqual(res.deductions.esi, 0); // Gross > 21k
    const expectedNet = Math.round((40000 - 1800 - 208.33) * 100) / 100;
    assert.strictEqual(res.netPay, expectedNet);
  });

  console.log("\n================================================================================");
  console.log(`BLOCKER REMEDIATION SUITE: ${passedTests}/${totalTests} TESTS PASSED (${Math.round(passedTests/totalTests*100)}%)`);
  console.log("================================================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
