import assert from "node:assert";
import {
  computeEmployeePayrollBreakdown,
  calculateStatutoryEPF,
  calculateStatutoryESI,
  calculateProfessionalTax,
  calculateLabourWelfareFund,
} from "../services/payroll-engine.service";
import { PayrollExportService } from "../services/payroll-export.service";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ✗ [FAIL] ${name}: ${err.message}`);
    failedTests++;
  }
}

async function runTestSuite() {
  console.log("================================================================================");
  console.log("MASTERHRMS — WORKSTREAM A DYNAMIC PAYROLL ENGINE COMPREHENSIVE ACCEPTANCE SUITE");
  console.log("================================================================================\n");

  // ---------------------------------------------------------------------------
  // SECTION 1: DYNAMIC PRORATION & ATTENDANCE INTEGRATION
  // ---------------------------------------------------------------------------
  console.log("--- Section 1: Dynamic Proration & Working Days Integration ---");

  await runTest("Proration: Full month attendance (31/31 days) yields 1.0 factor", () => {
    const res = computeEmployeePayrollBreakdown(
      { id: "EMP-01", baseMonthlyCtc: 31000, state: "TN" },
      { totalWorkingDays: 31, payableDays: 31, prorationFactor: 1.0 }
    );
    assert.strictEqual(res.earnings.basicSalary, 15500); // 50%
    assert.strictEqual(res.prorationFactor, 1.0);
  });

  await runTest("Proration: Half-day LOP proration (30.5 / 31 days)", () => {
    const proration = 30.5 / 31;
    const res = computeEmployeePayrollBreakdown(
      { id: "EMP-02", baseMonthlyCtc: 31000, state: "TN" },
      { totalWorkingDays: 31, payableDays: 30.5, lossOfPayDays: 0.5, prorationFactor: proration }
    );
    // 31000 * (30.5 / 31) = 30500 total gross
    assert.strictEqual(res.earnings.totalGross, 30500);
    assert.strictEqual(res.earnings.basicSalary, 15250); // 50% of 30500
  });

  await runTest("Proration: 5 Days LOP (26 / 31 payable days)", () => {
    const proration = 26 / 31;
    const res = computeEmployeePayrollBreakdown(
      { id: "EMP-03", baseMonthlyCtc: 31000, state: "TN" },
      { totalWorkingDays: 31, payableDays: 26, lossOfPayDays: 5, prorationFactor: proration }
    );
    assert.strictEqual(res.earnings.totalGross, 26000);
    assert.strictEqual(res.earnings.basicSalary, 13000);
  });

  // ---------------------------------------------------------------------------
  // SECTION 2: DYNAMIC SALARY STRUCTURE & FALLBACK REMOVAL
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 2: Dynamic Salary Structure & Fallback Removal ---");

  await runTest("Structure: Dynamic components override 50-20-15-5-5-5 splits (Zero Conveyance/Medical)", () => {
    // Structure with Basic 70%, Special 20%, Bonus 10%, ZERO conveyance, ZERO medical
    const res = computeEmployeePayrollBreakdown(
      { id: "EMP-04", baseMonthlyCtc: 30000, state: "TN" },
      { totalWorkingDays: 30, payableDays: 30, prorationFactor: 1.0 },
      {
        structureComponents: [
          { code: "BASIC", name: "Basic", type: "earning", calculationType: "percentage_of_ctc", value: 70 },
          { code: "SPECIAL", name: "Special Allowance", type: "earning", calculationType: "percentage_of_ctc", value: 20 },
          { code: "BONUS", name: "Statutory Bonus", type: "earning", calculationType: "percentage_of_ctc", value: 10 },
        ],
      }
    );

    assert.strictEqual(res.earnings.basicSalary, 21000);
    assert.strictEqual(res.earnings.specialAllowance, 6000);
    assert.strictEqual(res.earnings.statutoryBonus, 3000);
    assert.strictEqual(res.earnings.conveyance, 0); // No fabricated 5% conveyance!
    assert.strictEqual(res.earnings.medical, 0);    // No fabricated 5% medical!
    assert.strictEqual(res.earnings.hra, 0);
    assert.strictEqual(res.earnings.totalGross, 30000);
  });

  await runTest("Structure: Custom fixed allowances with proration", () => {
    const res = computeEmployeePayrollBreakdown(
      { id: "EMP-05", state: "TN" },
      { totalWorkingDays: 31, payableDays: 31, prorationFactor: 1.0 },
      {
        customAllowances: {
          basic: 21100,
          special: 2100,
          bonus: 0,
        },
      }
    );
    assert.strictEqual(res.earnings.basicSalary, 21100);
    assert.strictEqual(res.earnings.specialAllowance, 2100);
    assert.strictEqual(res.earnings.totalGross, 23200);
  });

  // ---------------------------------------------------------------------------
  // SECTION 3: DUAL-MODE EPF STATUTORY CALCULATIONS
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 3: Dual-Mode EPF Statutory Calculations ---");

  await runTest("EPF Default: Statutory Standard Capped at ₹15,000 ceiling", () => {
    // Basic = 25,000 -> must cap at 15,000
    const epf = calculateStatutoryEPF(25000, true);
    assert.strictEqual(epf.pfWage, 15000);
    assert.strictEqual(epf.employeePf, 1800); // 15,000 * 12%
    assert.strictEqual(epf.eps, 1250);       // Capped at 1,250
    assert.strictEqual(epf.epfEmployer, 550); // 1,800 - 1,250
    assert.strictEqual(epf.edli, 75);         // Max 75 (15,000 * 0.5%)
    assert.strictEqual(epf.adminCharges, 75); // 15,000 * 0.5%
    assert.strictEqual(epf.isContractGross, false);
  });

  await runTest("EPF Standard: Basic below ceiling (₹12,000) uncapped", () => {
    const epf = calculateStatutoryEPF(12000, true);
    assert.strictEqual(epf.pfWage, 12000);
    assert.strictEqual(epf.employeePf, 1440); // 12,000 * 12%
    assert.strictEqual(epf.eps, 1000);       // 12,000 * 8.333%
    assert.strictEqual(epf.epfEmployer, 440);
    assert.strictEqual(epf.edli, 60);         // 12,000 * 0.5%
    assert.strictEqual(epf.adminCharges, 60);
  });

  await runTest("EPF Contract Gross Mode: Enabled only with policy authorization", () => {
    // Gross = 23,200 -> 12% of Gross = 2,784
    const epf = calculateStatutoryEPF(21100, false, undefined, {
      pfWageBasis: "CONTRACT_GROSS",
      grossWages: 23200,
      allowContractGross: true,
    });
    assert.strictEqual(epf.isContractGross, true);
    assert.strictEqual(epf.pfWage, 23200);
    assert.strictEqual(epf.employeePf, 2784); // 23,200 * 12%
    assert.strictEqual(epf.eps, 1250);       // Capped at 1,250
    assert.strictEqual(epf.epfEmployer, 1534); // 2,784 - 1,250
    assert.strictEqual(epf.edli, 116);        // 23,200 * 0.5%
    assert.strictEqual(epf.adminCharges, 116);
  });

  await runTest("EPF Contract Gross Mode: Rejected when authorization is missing", () => {
    // allowContractGross is false -> must fallback to statutory capped!
    const epf = calculateStatutoryEPF(21100, true, undefined, {
      pfWageBasis: "CONTRACT_GROSS",
      grossWages: 23200,
      allowContractGross: false,
    });
    assert.strictEqual(epf.isContractGross, false);
    assert.strictEqual(epf.pfWage, 15000);
    assert.strictEqual(epf.employeePf, 1800);
  });

  // ---------------------------------------------------------------------------
  // SECTION 4: AMENDED ESI & REGULATION 52 ROUNDING
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 4: Amended ESI & Regulation 52 Rounding ---");

  await runTest("ESI Wage Ceiling: Exemption at gross > ₹21,000", () => {
    const esi = calculateStatutoryESI(23200);
    assert.strictEqual(esi.isEligible, false);
    assert.strictEqual(esi.employeeEsi, 0);
    assert.strictEqual(esi.employerEsi, 0);
  });

  await runTest("ESI Regulation 52: Rounding up to Next Higher Rupee", () => {
    // Gross = 18,550 -> Employee = 18,550 * 0.0075 = 139.125 -> Must round UP to 140
    const esi = calculateStatutoryESI(18550);
    assert.strictEqual(esi.isEligible, true);
    assert.strictEqual(esi.employeeEsi, 140);
    // Employer = 18,550 * 0.0325 = 602.875 -> nearest integer = 603
    assert.strictEqual(esi.employerEsi, 603);
  });

  await runTest("ESI Regulation 52: Exact integer result remains unchanged", () => {
    // Gross = 20,000 -> 20,000 * 0.0075 = 150.00 -> 150
    const esi = calculateStatutoryESI(20000);
    assert.strictEqual(esi.employeeEsi, 150);
    assert.strictEqual(esi.employerEsi, 650); // 20,000 * 0.0325 = 650
  });

  // ---------------------------------------------------------------------------
  // SECTION 5: TAMIL NADU PROFESSIONAL TAX & LWF SLABS
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 5: Tamil Nadu Professional Tax & LWF Slabs ---");

  await runTest("TN PT: Gross <= 21,000 half-yearly (3,500/mo) -> Nil", () => {
    assert.strictEqual(calculateProfessionalTax(3500, "TN", 10), 0);
  });

  await runTest("TN PT: Slabs 21,001 to 30,000 half-yearly (4,500/mo) -> ₹16.67/mo", () => {
    assert.strictEqual(calculateProfessionalTax(4500, "TN", 10), 16.67);
  });

  await runTest("TN PT: Slabs 30,001 to 45,000 half-yearly (6,000/mo) -> ₹39.17/mo", () => {
    assert.strictEqual(calculateProfessionalTax(6000, "TN", 10), 39.17);
  });

  await runTest("TN PT: Slabs 45,001 to 60,000 half-yearly (9,000/mo) -> ₹85.00/mo", () => {
    assert.strictEqual(calculateProfessionalTax(9000, "TN", 10), 85);
  });

  await runTest("TN PT: Slabs 60,001 to 75,000 half-yearly (11,000/mo) -> ₹126.67/mo", () => {
    assert.strictEqual(calculateProfessionalTax(11000, "TN", 10), 126.67);
  });

  await runTest("TN PT: Above 75,000 half-yearly (25,000/mo) -> ₹208.33/mo (Ceiling compliant)", () => {
    assert.strictEqual(calculateProfessionalTax(25000, "TN", 10), 208.33);
  });

  await runTest("PT Fallback: Unmapped states return 0 (no fallback ₹200)", () => {
    assert.strictEqual(calculateProfessionalTax(25000, "UNKNOWN_STATE", 10), 0);
  });

  await runTest("LWF: October (Non-December) month yields ₹0", () => {
    const lwf = calculateLabourWelfareFund(25000, "TN", 10);
    assert.strictEqual(lwf.isDeductionMonth, false);
    assert.strictEqual(lwf.employeeLwf, 0);
    assert.strictEqual(lwf.employerLwf, 0);
  });

  await runTest("LWF: December deduction applies statutory ₹20 employee / ₹40 employer", () => {
    const lwf = calculateLabourWelfareFund(25000, "TN", 12);
    assert.strictEqual(lwf.isDeductionMonth, true);
    assert.strictEqual(lwf.employeeLwf, 20);
    assert.strictEqual(lwf.employerLwf, 40);
  });

  // ---------------------------------------------------------------------------
  // SECTION 6: PAYROLL EXPORT SERVICE DYNAMIC CONVEYANCE/MEDICAL REMOVAL
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 6: Export Service Dynamic Conveyance/Medical Removal ---");

  await runTest("Export: Does NOT inject fabricated 1600 conveyance or 1250 medical", async () => {
    const mockRun = {
      id: "run-01",
      periodMonth: 10,
      periodYear: 2026,
      tenant: { name: "Enable Engineering" },
      payslips: [
        {
          id: "SLIP-01",
          grossSalary: 23200,
          deductions: 2784,
          netSalary: 20416,
          employee: {
            employeeCode: "ENBL1024",
            firstName: "ESTHER NIRMALA",
            lastName: "P",
            position: "GET",
            department: { name: "Engineering" },
            salaryAssignments: [{ ctcMonthly: 23200 }],
          },
          breakdown: {
            earnings: {
              basicSalary: 21100,
              specialAllowance: 2100,
              statutoryBonus: 0,
              conveyance: 0,
              medical: 0,
              itemized: [
                { code: "BASIC", amount: 21100 },
                { code: "SPECIAL", amount: 2100 },
              ],
            },
            calculatedValues: {
              BASIC_EARNED: 21100,
              SPECIAL_EARNED: 2100,
              BONUS_EARNED: 0,
              CONVEYANCE_EARNED: 0,
              MEDICAL_EARNED: 0,
              EPF_EE: 2784,
              TOTAL_DEDUCTIONS: 2784,
            },
            attendance: {
              totalMonthDays: 31,
              payableDays: 31,
              prorationFactor: 1.0,
            },
          },
        },
      ],
    };

    const mockPrisma = {
      payrollRun: {
        findUnique: async () => mockRun,
      },
    };

    const exporter = new PayrollExportService(mockPrisma as any);
    const result = await exporter.buildCanonicalRows("tenant-1", "run-01");
    assert.strictEqual(result.rows.length, 1);
    const r = result.rows[0];
    assert.strictEqual(r.earnBasic, 21100);
    assert.strictEqual(r.earnSpecial, 2100);
    assert.strictEqual(r.earnConveyance, 0, "Earned conveyance must be 0, not fabricated!");
    assert.strictEqual(r.earnMedical, 0, "Earned medical must be 0, not fabricated!");
    assert.strictEqual(r.fixConveyance, 0, "Fixed conveyance must be 0, not 1600!");
    assert.strictEqual(r.fixMedical, 0, "Fixed medical must be 0, not 1250!");
    assert.strictEqual(r.fixBasic, 21100);
    assert.strictEqual(r.fixSpecial, 2100);
  });

  // ---------------------------------------------------------------------------
  // SECTION 7: GOLDEN COHORT PARITY BENCHMARK (11 REFERENCE PERSONAS)
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 7: Golden Cohort Parity Benchmark (11 Reference Personas) ---");

  const goldenCohort = [
    { id: "ENBL1024", role: "GET", fixedBasic: 21100, fixedSpecial: 2100, monthDays: 31, payableDays: 31, lopDays: 0, expectedGross: 23200 },
    { id: "ENBL1025", role: "GET", fixedBasic: 21100, fixedSpecial: 2100, monthDays: 31, payableDays: 31, lopDays: 0, expectedGross: 23200 },
    { id: "ENBL1026", role: "GET", fixedBasic: 21100, fixedSpecial: 2100, monthDays: 31, payableDays: 31, lopDays: 0, expectedGross: 23200 },
    { id: "ENBL1027", role: "Jr. Engineer", fixedBasic: 21100, fixedSpecial: 2100, monthDays: 31, payableDays: 31, lopDays: 0, expectedGross: 23200 },
    { id: "ENBL1028", role: "Trainee", fixedBasic: 21100, fixedSpecial: 2100, monthDays: 31, payableDays: 31, lopDays: 0, expectedGross: 23200 },
    { id: "ENBL1029", role: "Trainee", fixedBasic: 21100, fixedSpecial: 2100, monthDays: 31, payableDays: 31, lopDays: 0, expectedGross: 23200 },
    { id: "ENBL1030", role: "Engineer", fixedBasic: 22500, fixedSpecial: 2500, monthDays: 31, payableDays: 31, lopDays: 0, expectedGross: 25000 },
    { id: "ENBL1031", role: "Engineer", fixedBasic: 22500, fixedSpecial: 2500, monthDays: 31, payableDays: 31, lopDays: 0, expectedGross: 25000 },
    { id: "ENBL1032", role: "Sr. Engineer", fixedBasic: 25000, fixedSpecial: 3000, monthDays: 31, payableDays: 31, lopDays: 0, expectedGross: 28000 },
    { id: "ENBL1033", role: "Sr. Engineer", fixedBasic: 25000, fixedSpecial: 3000, monthDays: 31, payableDays: 31, lopDays: 0, expectedGross: 28000 },
    { id: "ENBL1034", role: "Lead Engineer", fixedBasic: 27000, fixedSpecial: 3500, monthDays: 31, payableDays: 31, lopDays: 0, expectedGross: 30500 },
  ];

  for (const emp of goldenCohort) {
    await runTest(`Golden Cohort: ${emp.id} (${emp.role}) - Gross: ₹${emp.expectedGross}`, () => {
      const proration = emp.payableDays / emp.monthDays;
      const res = computeEmployeePayrollBreakdown(
        { id: emp.id, employeeCode: emp.id, state: "TN" },
        { totalWorkingDays: emp.monthDays, payableDays: emp.payableDays, prorationFactor: proration },
        {
          structureComponents: [
            { code: "BASIC", name: "Basic", type: "earning", calculationType: "fixed", value: emp.fixedBasic },
            { code: "SPECIAL", name: "Special Allowance", type: "earning", calculationType: "fixed", value: emp.fixedSpecial },
          ],
          periodMonth: 10,
          periodYear: 2026,
        }
      );

      assert.strictEqual(res.earnings.basicSalary, emp.fixedBasic, `Basic mismatch for ${emp.id}`);
      assert.strictEqual(res.earnings.specialAllowance, emp.fixedSpecial, `Special mismatch for ${emp.id}`);
      assert.strictEqual(res.earnings.totalGross, emp.expectedGross, `Gross mismatch for ${emp.id}`);
      assert.strictEqual(res.earnings.conveyance, 0, `Conveyance must be 0 for ${emp.id}`);
      assert.strictEqual(res.earnings.medical, 0, `Medical must be 0 for ${emp.id}`);

      // Statutory Verification:
      // In statutory standard mode, ESI is exempt because Gross > 21,000:
      assert.strictEqual(res.deductions.esi, 0, `ESI must be exempt (Gross > 21k) for ${emp.id}`);
      // In statutory standard mode, EPF is capped at 15,000 ceiling -> 1,800:
      assert.strictEqual(res.deductions.providentFund, 1800, `Statutory EPF must be capped at 1,800 for ${emp.id}`);
    });
  }

  // ---------------------------------------------------------------------------
  // SECTION 8: MISSING CONFIGURATION & INVALID INPUT DEFENSIVE TESTS
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 8: Missing Configuration & Invalid Input Defensive Tests ---");

  await runTest("Defensive: Zero/null baseMonthlyCtc logs warning without crash", () => {
    const res = computeEmployeePayrollBreakdown(
      { id: "EMP-MISSING", state: "TN" },
      { totalWorkingDays: 31, payableDays: 31, prorationFactor: 1.0 }
    );
    assert.strictEqual(res.earnings.totalGross, 0);
    assert.strictEqual(res.netPay, 0);
  });

  await runTest("Defensive: Empty structure components handles safely", () => {
    const res = computeEmployeePayrollBreakdown(
      { id: "EMP-EMPTY", baseMonthlyCtc: 20000, state: "TN" },
      { totalWorkingDays: 31, payableDays: 31, prorationFactor: 1.0 },
      { structureComponents: [] }
    );
    assert.strictEqual(res.earnings.totalGross, 20000);
    assert.strictEqual(res.earnings.basicSalary, 10000);
  });

  console.log("\n================================================================================");
  console.log(`WORKSTREAM A TEST SUITE COMPLETED: ${passedTests}/${totalTests} TESTS PASSED (${Math.round(passedTests/totalTests*100)}%)`);
  console.log("================================================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
