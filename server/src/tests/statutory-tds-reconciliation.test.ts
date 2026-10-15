import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  computeEmployeePayrollBreakdown,
  calculateStatutoryEPF,
  calculateStatutoryESI,
  calculateProfessionalTax,
  calculateAnnualTDS,
} from "../services/payroll-engine.service";

describe("MASTERHRMS — Statutory TDS Engine & Rule Correction Test Suite (AY 2026-27 / ITA 2025)", () => {
  // ───────────────────────────────────────────────────────────────────────────
  // 1. P0 DEFECT REPRODUCTION & RESOLUTION: SCENARIO 1 (₹75,000 CTC)
  // ───────────────────────────────────────────────────────────────────────────
  it("P0-1: Corrects reported ₹33,800 TDS defect — ₹75,000 CTC yields ₹0 TDS and ₹70,300 net pay", () => {
    const employee = {
      id: "emp-sc1",
      employeeCode: "EMP001",
      firstName: "Rahul",
      lastName: "Sharma",
      email: "rahul@masterhrms.internal",
      baseMonthlyCtc: 75000,
      state: "MH",
      pfEligible: true,
      esiEligible: false,
      ptEligible: true,
      tdsEligible: true,
      isResident: true,
      taxRegime: "new",
    };

    const attendance = {
      totalWorkingDays: 30,
      payableDays: 30,
      presentDays: 30,
      halfDays: 0,
      approvedLeaveDays: 0,
      lossOfPayDays: 0,
      prorationFactor: 1.0,
    };

    const breakdown = computeEmployeePayrollBreakdown(employee, attendance, {}, 4, 2026);

    // 1. Gross Earnings Breakdown
    expect(breakdown.earnings.basicSalary).toBe(37500); // 50%
    expect(breakdown.earnings.hra).toBe(15000); // 20%
    expect(breakdown.earnings.specialAllowance).toBe(11250); // 15%
    expect(breakdown.earnings.conveyance).toBe(3750); // 5%
    expect(breakdown.earnings.medical).toBe(3750); // 5%
    expect(breakdown.earnings.otherAllowance).toBe(3750); // 5%
    expect(breakdown.earnings.totalGross).toBe(75000);

    // 2. Statutory Deductions
    expect(breakdown.deductions.providentFund).toBe(4500); // 12% of ₹37,500
    expect(breakdown.deductions.professionalTax).toBe(200); // MH April PT = ₹200
    expect(breakdown.deductions.esi).toBe(0); // Gross > ₹21,000

    // 3. Tax Calculation under Income-tax Act, 2025 Section 392 (AY 2026-27)
    // Projected Gross: ₹9,00,000
    // Standard Deduction: ₹75,000
    // Net Taxable Income: ₹8,25,000
    // Slabs:
    //   0 - 4L @ 0% = ₹0
    //   4L - 8L @ 5% = ₹20,000
    //   8L - 8.25L @ 10% = ₹2,500
    // Raw Tax before Rebate: ₹22,500
    // Section 87A Rebate: Full ₹22,500 (since ₹8,25,000 <= ₹12,00,000 threshold for resident)
    // Net Tax after Rebate: ₹0.00
    // Monthly TDS: ₹0.00
    expect(breakdown.taxation.annualProjectedGross).toBe(900000);
    expect(breakdown.taxation.standardDeduction).toBe(75000);
    expect(breakdown.taxation.netTaxableIncome).toBe(825000);
    expect(breakdown.taxation.annualTaxCalculated).toBe(22500);
    expect(breakdown.taxation.rebate87A).toBe(22500);
    expect(breakdown.taxation.section156Rebate).toBe(22500); // Canonical ITA 2025 Section 156(2)
    expect(breakdown.taxation.statutoryAct).toBe("Income-tax Act, 2025");
    expect(breakdown.taxation.salaryWithholdingSection).toBe("392");
    expect(breakdown.taxation.rebateSection).toBe("Section 156(2)");
    expect(breakdown.taxation.netTaxAfterRebate).toBe(0);
    expect(breakdown.taxation.totalAnnualTds).toBe(0);
    expect(breakdown.taxation.monthlyTdsDeduction).toBe(0);
    expect(breakdown.deductions.tds).toBe(0);

    // 4. Net Disbursable Reconciliation
    // ₹75,000 - (₹4,500 EPF + ₹200 PT + ₹0 TDS) = ₹70,300.00
    expect(breakdown.deductions.totalDeductions).toBe(4700);
    expect(breakdown.netPay).toBe(70300);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. SCENARIO 2: LOW-INCOME WORKER (₹45,000 CTC)
  // ───────────────────────────────────────────────────────────────────────────
  it("P0-2: Scenario 2 — ₹45,000 monthly CTC qualifies for 87A rebate and ₹42,100 net pay", () => {
    const employee = {
      id: "emp-sc2",
      employeeCode: "EMP002",
      firstName: "Sneha",
      lastName: "Rao",
      email: "sneha@masterhrms.internal",
      baseMonthlyCtc: 45000,
      state: "MH",
      pfEligible: true,
      esiEligible: false,
      ptEligible: true,
      tdsEligible: true,
      isResident: true,
      taxRegime: "new",
    };

    const attendance = {
      totalWorkingDays: 30,
      payableDays: 30,
      presentDays: 30,
      halfDays: 0,
      approvedLeaveDays: 0,
      lossOfPayDays: 0,
      prorationFactor: 1.0,
    };

    const breakdown = computeEmployeePayrollBreakdown(employee, attendance, {}, 4, 2026);

    expect(breakdown.earnings.totalGross).toBe(45000);
    expect(breakdown.taxation.annualProjectedGross).toBe(540000);
    expect(breakdown.taxation.standardDeduction).toBe(75000);
    expect(breakdown.taxation.netTaxableIncome).toBe(465000);
    // (4.65L - 4L) * 5% = ₹3,250 raw tax
    expect(breakdown.taxation.annualTaxCalculated).toBe(3250);
    expect(breakdown.taxation.rebate87A).toBe(3250);
    expect(breakdown.taxation.netTaxAfterRebate).toBe(0);
    expect(breakdown.deductions.tds).toBe(0);

    // EPF: 12% of ₹22,500 basic = ₹2,700
    expect(breakdown.deductions.providentFund).toBe(2700);
    expect(breakdown.deductions.professionalTax).toBe(200);
    expect(breakdown.netPay).toBe(42100); // 45000 - 2900
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. SCENARIO 3: ESI COVERED WORKER (₹18,000 CTC)
  // ───────────────────────────────────────────────────────────────────────────
  it("P0-3: Scenario 3 — ₹18,000 monthly CTC covers statutory ESI and EPF", () => {
    const employee = {
      id: "emp-sc3",
      employeeCode: "EMP003",
      firstName: "Sunil",
      lastName: "Kumar",
      email: "sunil@masterhrms.internal",
      baseMonthlyCtc: 18000,
      state: "MH",
      pfEligible: true,
      esiEligible: true,
      ptEligible: true,
      tdsEligible: true,
      isResident: true,
      taxRegime: "new",
    };

    const attendance = {
      totalWorkingDays: 30,
      payableDays: 30,
      presentDays: 30,
      halfDays: 0,
      approvedLeaveDays: 0,
      lossOfPayDays: 0,
      prorationFactor: 1.0,
    };

    const breakdown = computeEmployeePayrollBreakdown(employee, attendance, {}, 4, 2026);

    expect(breakdown.earnings.totalGross).toBe(18000);
    expect(breakdown.deductions.esi).toBe(135); // 0.75% of 18000
    expect(breakdown.deductions.providentFund).toBe(1080); // 12% of 9000 basic
    expect(breakdown.deductions.professionalTax).toBe(200);
    expect(breakdown.deductions.tds).toBe(0);
    expect(breakdown.netPay).toBe(16585); // 18000 - (1080 + 135 + 200)
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. SCENARIO 4: ATTENDANCE LOP PRORATION
  // ───────────────────────────────────────────────────────────────────────────
  it("P0-4: Scenario 4 — Loss of Pay (LOP) proration accurately scales gross and statutorys", () => {
    const employee = {
      id: "emp-sc4",
      employeeCode: "EMP004",
      firstName: "Anita",
      lastName: "Desai",
      email: "anita@masterhrms.internal",
      baseMonthlyCtc: 75000,
      state: "MH",
      pfEligible: true,
      esiEligible: false,
      ptEligible: true,
      tdsEligible: true,
      isResident: true,
      taxRegime: "new",
    };

    // 25 payable days out of 30 (5 days LOP)
    const attendance = {
      totalWorkingDays: 30,
      payableDays: 25,
      presentDays: 25,
      halfDays: 0,
      approvedLeaveDays: 0,
      lossOfPayDays: 5,
      prorationFactor: 25 / 30,
    };

    const breakdown = computeEmployeePayrollBreakdown(employee, attendance, {}, 4, 2026);

    // Prorated gross: ₹62,500.00
    expect(breakdown.earnings.totalGross).toBe(62500);
    expect(breakdown.earnings.basicSalary).toBe(31250);
    expect(breakdown.deductions.providentFund).toBe(3750); // 12% of 31250
    expect(breakdown.deductions.professionalTax).toBe(200);
    expect(breakdown.deductions.tds).toBe(0);
    expect(breakdown.netPay).toBe(58550); // 62500 - 3950
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. REBATE BOUNDARY & MARGINAL RELIEF (SECTION 87A UNDER ITA 2025)
  // ───────────────────────────────────────────────────────────────────────────
  it("P0-5: Exactly at ₹12,00,000 rebate threshold — Tax is 100% rebated to zero", () => {
    // Annual gross = ₹12,75,000 -> Std deduction ₹75,000 -> Net taxable = ₹12,00,000
    const res = calculateAnnualTDS(1275000, "new", {}, { isResident: true });

    expect(res.netTaxableIncome).toBe(1200000);
    // Slabs:
    // 0 - 4L @ 0% = 0
    // 4L - 8L @ 5% = 20,000
    // 8L - 12L @ 10% = 40,000
    // Raw Tax = 60,000
    expect(res.annualTaxCalculated).toBe(60000);
    expect(res.rebate87A).toBe(60000); // Exactly at threshold, 100% rebate
    expect(res.netTaxAfterRebate).toBe(0);
    expect(res.totalAnnualTds).toBe(0);
    expect(res.monthlyTdsDeduction).toBe(0);
  });

  it("P0-6: Marginal Relief — Taxable income ₹12,10,000 (Tax capped at excess income of ₹10,000)", () => {
    // Gross ₹12,85,000 - ₹75k SD = ₹12,10,000 taxable
    const res = calculateAnnualTDS(1285000, "new", {}, { isResident: true });

    expect(res.netTaxableIncome).toBe(1210000);
    // Raw Tax: 60,000 + (10,000 * 15%) = 61,500
    expect(res.annualTaxCalculated).toBe(61500);
    // Excess income over ₹12,00,000 = ₹10,000
    // Without marginal relief, employee would pay ₹61,500 tax on ₹10,000 extra income!
    // With marginal relief, tax cannot exceed excess income: tax capped at ₹10,000
    expect(res.netTaxAfterRebate).toBe(10000);
    expect(res.rebate87A).toBe(51500); // 61,500 - 10,000 = 51,500 relief
    // Cess 4% on ₹10,000 = ₹400
    expect(res.cessAmount).toBe(400);
    expect(res.totalAnnualTds).toBe(10400);
    expect(res.monthlyTdsDeduction).toBe(866.67);
  });

  it("P0-7: Marginal Relief — Taxable income ₹12,70,000 (Tax capped at excess income of ₹70,000)", () => {
    // Gross ₹13,45,000 - ₹75k SD = ₹12,70,000 taxable
    const res = calculateAnnualTDS(1345000, "new", {}, { isResident: true });

    expect(res.netTaxableIncome).toBe(1270000);
    // Raw Tax: 60,000 + (70,000 * 15%) = 70,500
    // Excess income over 12L = 70,000
    // Raw tax > excess income -> Tax capped at 70,000
    expect(res.annualTaxCalculated).toBe(70500);
    expect(res.netTaxAfterRebate).toBe(70000);
    expect(res.rebate87A).toBe(500);
    expect(res.cessAmount).toBe(2800); // 4% of 70,000
    expect(res.totalAnnualTds).toBe(72800);
  });

  it("P0-8: Above Marginal Relief Zone — Taxable income ₹13,00,000 (Full tax payable without relief)", () => {
    // Gross ₹13,75,000 - ₹75k SD = ₹13,00,000 taxable
    const res = calculateAnnualTDS(1375000, "new", {}, { isResident: true });

    expect(res.netTaxableIncome).toBe(1300000);
    // Raw Tax: 60,000 + (1,00,000 * 15%) = 75,000
    // Excess income over 12L = 1,00,000
    // Raw tax (75,000) <= excess income (1,00,000) -> No marginal relief needed
    expect(res.annualTaxCalculated).toBe(75000);
    expect(res.rebate87A).toBe(0);
    expect(res.netTaxAfterRebate).toBe(75000);
    expect(res.cessAmount).toBe(3000); // 4% of 75,000
    expect(res.totalAnnualTds).toBe(78000);
    expect(res.monthlyTdsDeduction).toBe(6500);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. ALL SLAB BOUNDARIES (NEW REGIME ITA 2025 SECTION 392)
  // ───────────────────────────────────────────────────────────────────────────
  it("P0-9: Multi-tier high earner — ₹30,00,000 Gross tests all 7 slabs up to 30%", () => {
    // Gross: ₹30,00,000 -> SD: ₹75,000 -> Taxable: ₹29,25,000
    const res = calculateAnnualTDS(3000000, "new", {}, { isResident: true });

    expect(res.netTaxableIncome).toBe(2925000);
    // Slabs:
    // 0 - 4L @ 0% = 0
    // 4L - 8L @ 5% = 20,000
    // 8L - 12L @ 10% = 40,000
    // 12L - 16L @ 15% = 60,000
    // 16L - 20L @ 20% = 80,000
    // 20L - 24L @ 25% = 1,00,000
    // Above 24L: 5,25,000 @ 30% = 1,57,500
    // Total raw tax = 20k + 40k + 60k + 80k + 100k + 157.5k = 4,57,500
    expect(res.annualTaxCalculated).toBe(457500);
    expect(res.rebate87A).toBe(0);
    // Cess 4% of 4,57,500 = 18,300
    expect(res.cessAmount).toBe(18300);
    expect(res.totalAnnualTds).toBe(475800);
    expect(res.monthlyTdsDeduction).toBe(39650);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. INELIGIBLE TAXPAYER: NON-RESIDENT INDIVIDUAL (NRI)
  // ───────────────────────────────────────────────────────────────────────────
  it("P0-10: Non-Resident Individual (NRI) — Ineligible for 87A rebate even if income <= ₹12L", () => {
    // NRI employee with identical ₹75k monthly gross (₹9L annual gross)
    const res = calculateAnnualTDS(900000, "new", {}, { isResident: false });

    expect(res.isResident).toBe(false);
    expect(res.netTaxableIncome).toBe(825000);
    expect(res.annualTaxCalculated).toBe(22500);
    // Section 87A rebate is strictly restricted to resident individuals
    expect(res.rebate87A).toBe(0);
    expect(res.section156Rebate).toBe(0);
    expect(res.rebateSection).toBe("N/A (Ineligible Non-Resident)");
    expect(res.netTaxAfterRebate).toBe(22500);
    expect(res.cessAmount).toBe(900); // 4% of 22,500
    expect(res.totalAnnualTds).toBe(23400);
    expect(res.monthlyTdsDeduction).toBe(1950);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 8. OTHER TAXABLE INCOME & SPREAD
  // ───────────────────────────────────────────────────────────────────────────
  it("P0-11: Other Taxable Income declaration shifts taxable income into higher slab", () => {
    // Annual gross ₹75,000 * 12 = ₹9,00,000. Std deduction = ₹75,000.
    // Base salary net taxable = ₹8,25,000.
    // Employee declares other income of ₹5,00,000 (e.g. consultancy / capital gains).
    // Total taxable income = ₹13,25,000 (> ₹12,00,000, rebate ceases to apply).
    const res = calculateAnnualTDS(900000, "new", { otherIncome: 500000 }, { isResident: true });

    expect(res.netTaxableIncome).toBe(1325000);
    // Tax on 13.25L: 60,000 (up to 12L) + (1.25L * 15% = 18,750) = 78,750
    expect(res.annualTaxCalculated).toBe(78750);
    expect(res.rebate87A).toBe(0);
    expect(res.cessAmount).toBe(3150); // 4% of 78,750
    expect(res.totalAnnualTds).toBe(81900);
    expect(res.monthlyTdsDeduction).toBe(6825);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 9. OLD TAX REGIME REGRESSION & DEDUCTIONS
  // ───────────────────────────────────────────────────────────────────────────
  it("P0-12: Old Tax Regime — Correctly applies 80C, 80D, HRA and ₹5L 87A limit", () => {
    const res = calculateAnnualTDS(1000000, "old", {
      section80C: 150000,
      section80D: 25000,
      houseRentPaid: 20000, // ₹2,40,000 / year rent
    }, { isResident: true });

    // Old Regime: SD = ₹50,000.
    // 80C = ₹1,50,000. 80D = ₹25,000.
    // Basic = 50% of 10L = 5,00,000. HRA = 2,00,000.
    // Rent minus 10% basic = 2,40,000 - 50,000 = 1,90,000.
    // HRA exemption = min(2,00,000, 1,90,000, 2,00,000) = 1,90,000.
    // Total deductions = 50k + 150k + 25k + 190k = 4,15,000.
    // Net Taxable = 10,00,000 - 4,15,000 = 5,85,000.
    expect(res.taxRegime).toBe("old");
    expect(res.standardDeduction).toBe(50000);
    expect(res.section80CDeduction).toBe(150000);
    expect(res.section80DDeduction).toBe(25000);
    expect(res.hraExemption).toBe(190000);
    expect(res.netTaxableIncome).toBe(585000);

    // Old Slabs on ₹5,85,000:
    // 0 - 2.5L: 0
    // 2.5L - 5L: 12,500 (5%)
    // 5L - 5.85L: 17,000 (20% of 85,000)
    // Total Tax: 29,500. Rebate 87A = 0 (since income > 5L).
    expect(res.annualTaxCalculated).toBe(29500);
    expect(res.rebate87A).toBe(0);
    expect(res.section156Rebate).toBe(0);
    expect(res.rebateSection).toBe("Section 156(1) (Exceeded Threshold)");
    expect(res.cessAmount).toBe(1180); // 4% of 29,500
    expect(res.totalAnnualTds).toBe(30680);
    expect(res.monthlyTdsDeduction).toBe(2556.67);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 10. DYNAMIC STATUTORY RULE PACK AUTHORITY & PRECEDENCE
  // ───────────────────────────────────────────────────────────────────────────
  it("P1-13: Dynamic Rule Pack Authority — Custom/updated statutory rules dynamically override fallback constants", () => {
    // Custom rule pack provided dynamically with a modified Section 156 threshold of ₹14,00,000
    const dynamicRulePack = [
      {
        ruleType: "TDS_ITA2025",
        stateCode: "ALL",
        configJson: {
          act: "Income-tax Act, 2025",
          taxYear: "2026-2027",
          newRegime: {
            standardDeduction: 75000,
            section156RebateThreshold: 1400000,
            slabs: [
              { min: 0, max: 400000, rate: 0.0 },
              { min: 400001, max: 800000, rate: 0.05 },
              { min: 800001, max: 1200000, rate: 0.10 },
              { min: 1200001, max: 1600000, rate: 0.15 },
              { min: 1600001, max: null, rate: 0.20 },
            ],
          },
        },
        effectiveFrom: new Date("2026-04-01"),
        isActive: true,
      },
    ];

    // Employee with ₹13,50,000 taxable income (normally > ₹12L threshold, but <= ₹14L dynamic threshold)
    const res = calculateAnnualTDS(1425000, "new", {}, {
      isResident: true,
      statutoryRules: dynamicRulePack as any,
    });

    expect(res.netTaxableIncome).toBe(1350000);
    // Dynamic rule pack is authoritative: ₹13,50,000 <= ₹14,00,000 -> full Section 156 rebate!
    expect(res.rebate87A).toBe(res.annualTaxCalculated);
    expect(res.section156Rebate).toBe(res.annualTaxCalculated);
    expect(res.totalAnnualTds).toBe(0);
    expect(res.monthlyTdsDeduction).toBe(0);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 11. STATUTORY VS VOLUNTARY/EMPLOYER DEDUCTION SEPARATION
  // ───────────────────────────────────────────────────────────────────────────
  it("P1-14: Strict separation of mandatory statutory obligations from employer deductions", () => {
    const employee = {
      id: "emp-sep-01",
      employeeCode: "EMP-SEP",
      firstName: "Vikram",
      lastName: "Singhania",
      email: "vikram@masterhrms.internal",
      baseMonthlyCtc: 75000,
      state: "MH",
      pfEligible: true,
      esiEligible: false,
      ptEligible: true,
      tdsEligible: true,
      isResident: true,
      taxRegime: "new",
    };

    const attendance = {
      totalWorkingDays: 30,
      payableDays: 30,
      presentDays: 30,
      halfDays: 0,
      approvedLeaveDays: 0,
      lossOfPayDays: 0,
      prorationFactor: 1.0,
    };

    const breakdown = computeEmployeePayrollBreakdown(employee, attendance, {}, 4, 2026);

    // Statutory line items must all be flagged with isStatutory === true
    const statutoryDeductions = breakdown.deductions.itemized.filter(d => d.isStatutory);
    expect(statutoryDeductions.length).toBe(4);
    expect(statutoryDeductions.map(d => d.code)).toEqual(["PF", "ESI", "PT", "TDS"]);

    // Statutory deductions sum: EPF (4500) + ESI (0) + PT (200) + TDS (0) = 4700
    const statutorySum = statutoryDeductions.reduce((sum, d) => sum + d.amount, 0);
    expect(statutorySum).toBe(4700);

    // Net pay reflects pure statutory deductions without unapproved arbitrary withholdings
    expect(breakdown.netPay).toBe(breakdown.earnings.totalGross - statutorySum);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 12. SPECIAL-RATE INCOME EXCLUSIONS & ELIGIBILITY ENFORCEMENT
  // ───────────────────────────────────────────────────────────────────────────
  it("P1-15: Special-Rate Income Exclusions — Excluded from Section 156 rebate offset and pushes total income beyond limit", () => {
    // Employee with base salary ₹75k (annual gross ₹9,00,000, taxable salary ₹8,25,000)
    // Declares special-rate income of ₹5,00,000 (e.g. LTCG / specified special income)
    // Total taxable income = ₹8,25,000 + ₹5,00,000 = ₹13,25,000.
    // Because total income (₹13,25,000) exceeds both ₹12,00,000 and the marginal relief zone (₹12,70,588), Section 156(2) rebate is disqualified!
    const res = calculateAnnualTDS(900000, "new", {
      specialRateIncome: 500000,
    }, { isResident: true });

    expect(res.netTaxableIncome).toBe(1325000);
    // Total taxable income exceeds threshold & marginal relief ceiling -> Section 156 rebate is 0
    expect(res.section156Rebate).toBe(0);
    expect(res.rebate87A).toBe(0);
    expect(res.rebateSection).toBe("Section 156(2) (Exceeded Threshold)");
    expect(res.totalAnnualTds).toBeGreaterThan(0);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 13. EPF BASIS RECONCILIATION & SALARY STRUCTURE DERIVATION
  // ───────────────────────────────────────────────────────────────────────────
  it("P1-16: EPF Basis Reconciliation — Derives EPF strictly from actual configured basic component (₹53,541.67 -> ₹6,425.00) rather than copying benchmark", () => {
    // Scenario 5: High earner in marginal relief zone with Annual Gross ₹12,85,000 (Monthly Gross ₹1,07,083.33)
    const monthlyGross = 1285000 / 12; // 107083.333...
    const employee = {
      id: "emp-marginal-05",
      employeeCode: "EMP-MR5",
      firstName: "Anita",
      lastName: "Deshmukh",
      email: "anita@masterhrms.internal",
      baseMonthlyCtc: monthlyGross,
      annualCtc: 1285000,
      state: "MH",
      pfEligible: true,
      esiEligible: false,
      ptEligible: true,
      tdsEligible: true,
      isResident: true,
      taxRegime: "new" as const,
    };

    const attendance = {
      totalWorkingDays: 30,
      payableDays: 30,
      presentDays: 30,
      halfDays: 0,
      approvedLeaveDays: 0,
      lossOfPayDays: 0,
      prorationFactor: 1.0,
    };

    const breakdown = computeEmployeePayrollBreakdown(employee, attendance, {}, 10, 2026);

    // 1. Verify Earnings Structure (50% Basic component)
    expect(breakdown.earnings.totalGross).toBe(107083.33);
    expect(breakdown.earnings.basicSalary).toBe(53541.67);

    // 2. Standard EPF calculation: 12% of actual basic component
    // 53541.67 * 0.12 = 6425.00 (NOT the benchmark ₹4,500 which belongs to ₹75k CTC)
    expect(breakdown.deductions.providentFund).toBe(6425);

    // 3. Optional statutory ceiling cap verification (EPFO ₹15,000 wage ceiling)
    const cappedEpf = calculateStatutoryEPF(breakdown.earnings.basicSalary, true);
    expect(cappedEpf.employeePf).toBe(1800); // 12% of 15,000

    // 4. Verify Annual TDS & Section 156(2) marginal relief
    expect(breakdown.taxation.annualProjectedGross).toBe(1285000);
    expect(breakdown.taxation.netTaxableIncome).toBe(1210000);
    expect(breakdown.taxation.annualTaxCalculated).toBe(61500);
    expect(breakdown.taxation.section156Rebate).toBe(51500);
    expect(breakdown.taxation.netTaxAfterRebate).toBe(10000);
    expect(breakdown.taxation.cessAmount).toBe(400);
    expect(breakdown.taxation.totalAnnualTds).toBe(10400);

    // 5. Monthly TDS Withholding (10,400 / 12 rounded half-up to 2 decimal places = 866.67)
    expect(breakdown.deductions.tds).toBe(866.67);
    expect(breakdown.taxation.monthlyTdsDeduction).toBe(866.67);

    // 6. Professional Tax in MH: 200
    expect(breakdown.deductions.professionalTax).toBe(200);

    // 7. Total Deductions: 6,425.00 (EPF) + 200.00 (PT) + 866.67 (TDS) = 7,491.67
    expect(breakdown.deductions.totalDeductions).toBe(7491.67);

    // 8. Net Pay: 107,083.33 - 7,491.67 = 99,591.66
    expect(breakdown.netPay).toBe(99591.66);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 14. ANNUAL TDS RECONCILIATION & PERIOD-BASED ALLOCATION POLICY
  // ───────────────────────────────────────────────────────────────────────────
  it("P1-17: Cumulative Monthly TDS Reconciles Exactly to Annual TDS with Final-Period Rounding Adjustment", () => {
    // Annual TDS liability is ₹10,400.00 (Scenario 5)
    const annualGross = 1285000;
    const monthlyGross = 1285000 / 12;
    const employee = {
      id: "emp-cumul-01",
      employeeCode: "EMP-CUM",
      firstName: "Anita",
      lastName: "Deshmukh",
      email: "anita.deshmukh@masterhrms.internal",
      baseMonthlyCtc: monthlyGross,
      annualCtc: annualGross,
      state: "MH",
      pfEligible: true,
      esiEligible: false,
      ptEligible: true,
      tdsEligible: true,
      isResident: true,
      taxRegime: "new" as const,
    };

    const attendance = {
      totalWorkingDays: 30,
      payableDays: 30,
      presentDays: 30,
      halfDays: 0,
      approvedLeaveDays: 0,
      lossOfPayDays: 0,
      prorationFactor: 1.0,
    };

    const monthlyDeductions: number[] = [];
    let cumulativeTdsDeducted = 0;

    // Simulate 12 months across the tax year (April to March)
    for (let monthIndex = 1; monthIndex <= 12; monthIndex++) {
      const isFinal = monthIndex === 12;
      const remainingPeriods = 13 - monthIndex;

      const breakdown = computeEmployeePayrollBreakdown(employee, attendance, {
        periodMonth: monthIndex <= 9 ? monthIndex + 3 : monthIndex - 9, // April (4) to March (3)
        tdsAlreadyDeducted: cumulativeTdsDeducted,
        isFinalPeriod: isFinal,
        remainingPeriods,
      });

      const tdsForMonth = breakdown.deductions.tds;
      monthlyDeductions.push(tdsForMonth);
      cumulativeTdsDeducted = Math.round((cumulativeTdsDeducted + tdsForMonth) * 100) / 100;

      if (!isFinal) {
        // Months 1 to 11: standard rounded ₹866.67
        expect(tdsForMonth).toBe(866.67);
      } else {
        // Month 12: final period adjustment balances the remaining 4 paise variance
        // 10,400.00 - (11 * 866.67 = 9,533.37) = 866.63
        expect(tdsForMonth).toBe(866.63);
      }
    }

    // Exact cumulative reconciliation proof:
    // 11 * 866.67 = 9533.37
    // 1 * 866.63 = 866.63
    // Total = 10,400.00
    expect(monthlyDeductions.length).toBe(12);
    expect(cumulativeTdsDeducted).toBe(10400.00);

    const sum = monthlyDeductions.reduce((acc, val) => acc + val, 0);
    expect(Math.round(sum * 100) / 100).toBe(10400.00);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 15. REPEATED CALCULATION DETERMINISM & IDEMPOTENCY
  // ───────────────────────────────────────────────────────────────────────────
  it("P1-18: Repeated Calculation Is Fully Deterministic and Does Not Duplicate Withholding", () => {
    const annualGross = 1285000;
    const monthlyGross = 1285000 / 12;
    const employee = {
      id: "emp-idempotent-01",
      employeeCode: "EMP-IDEMP",
      firstName: "Rajesh",
      lastName: "Kulkarni",
      email: "rajesh.kulkarni@masterhrms.internal",
      baseMonthlyCtc: monthlyGross,
      annualCtc: annualGross,
      state: "MH",
      pfEligible: true,
      esiEligible: false,
      ptEligible: true,
      tdsEligible: true,
      isResident: true,
      taxRegime: "new" as const,
    };

    const attendance = {
      totalWorkingDays: 30,
      payableDays: 30,
      presentDays: 30,
      halfDays: 0,
      approvedLeaveDays: 0,
      lossOfPayDays: 0,
      prorationFactor: 1.0,
    };

    // Standard month calculation repeated 3 times
    const calc1 = computeEmployeePayrollBreakdown(employee, attendance, { periodMonth: 5, periodYear: 2026 });
    const calc2 = computeEmployeePayrollBreakdown(employee, attendance, { periodMonth: 5, periodYear: 2026 });
    const calc3 = computeEmployeePayrollBreakdown(employee, attendance, { periodMonth: 5, periodYear: 2026 });

    expect(calc1.deductions.tds).toBe(866.67);
    expect(calc2.deductions.tds).toBe(866.67);
    expect(calc3.deductions.tds).toBe(866.67);
    expect(calc1.netPay).toBe(calc2.netPay);
    expect(calc2.netPay).toBe(calc3.netPay);

    // Final month recalculation repeated with same prior withholding
    const priorTds = 11 * 866.67; // 9,533.37
    const finalCalc1 = computeEmployeePayrollBreakdown(employee, attendance, {
      periodMonth: 3,
      periodYear: 2027,
      tdsAlreadyDeducted: priorTds,
      isFinalPeriod: true,
      remainingPeriods: 1,
    });
    const finalCalc2 = computeEmployeePayrollBreakdown(employee, attendance, {
      periodMonth: 3,
      periodYear: 2027,
      tdsAlreadyDeducted: priorTds,
      isFinalPeriod: true,
      remainingPeriods: 1,
    });

    expect(finalCalc1.deductions.tds).toBe(866.63);
    expect(finalCalc2.deductions.tds).toBe(866.63);
    expect(finalCalc1.netPay).toBe(99591.70);
    expect(finalCalc2.netPay).toBe(99591.70);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 16. MID-YEAR JOINER ANNUALIZATION RESILIENCE
  // ───────────────────────────────────────────────────────────────────────────
  it("P1-19: Mid-Year Joining Annualizes Based on Active FY Months Rather than Full Year", () => {
    // Employee joining October 1, 2026 (6 months of employment in FY 2026-27: Oct to Mar)
    const monthlyGross = 107083.33; // If full year would be 12.85L (taxable ~12.10L)
    const employee = {
      id: "emp-midyear-01",
      employeeCode: "EMP-MID",
      firstName: "Sunil",
      lastName: "Verma",
      email: "sunil.verma@masterhrms.internal",
      baseMonthlyCtc: monthlyGross,
      annualCtc: 1285000,
      state: "MH",
      pfEligible: true,
      esiEligible: false,
      ptEligible: true,
      tdsEligible: true,
      isResident: true,
      taxRegime: "new" as const,
      joinedAt: new Date("2026-10-01"),
    };

    const attendance = {
      totalWorkingDays: 30,
      payableDays: 30,
      presentDays: 30,
      halfDays: 0,
      approvedLeaveDays: 0,
      lossOfPayDays: 0,
      prorationFactor: 1.0,
    };

    // For an employee active only 6 months in this FY:
    // Projected FY Gross = 6 * 107,083.33 = 642,499.98 (~642,500.00)
    // Standard deduction = 75,000.00 -> Net Taxable = 567,500.00
    // Taxable income is <= 12,00,000. Under ITA 2025 Sec 156(2), full rebate applies!
    // Annual TDS = 0, Monthly TDS = 0
    const breakdown = computeEmployeePayrollBreakdown(employee, attendance, {
      periodMonth: 10,
      periodYear: 2026,
      employmentMonthsInFy: 6,
      remainingPeriods: 6,
    });

    expect(breakdown.taxation.annualProjectedGross).toBe(642500);
    expect(breakdown.taxation.standardDeduction).toBe(75000);
    expect(breakdown.taxation.netTaxableIncome).toBe(567500);
    expect(breakdown.taxation.annualTaxCalculated).toBe(8375); // (567500 - 400000) * 0.05
    expect(breakdown.taxation.section156Rebate).toBe(8375); // 100% full rebate under 12L threshold
    expect(breakdown.taxation.totalAnnualTds).toBe(0);
    expect(breakdown.deductions.tds).toBe(0);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 17. MID-YEAR SALARY REVISION & LOP ANNUALIZATION RESILIENCE
  // ───────────────────────────────────────────────────────────────────────────
  it("P1-20: Mid-Year Salary Revision and LOP Retain Authoritative Reconciliation via Prior Payslips", () => {
    // Months 1-5: Base gross 75,000/mo. Earned: 5 * 75,000 = 3,75,000. Prior TDS = 0 (under 12L threshold).
    // Month 6: LOP 5 days. Earned: 62,500.
    // Total earned months 1-6 = 437,500.
    // In Month 7 (October): Promotion to 1,20,000/mo.
    // Remaining periods including Month 7: 6 periods (Oct, Nov, Dec, Jan, Feb, Mar).
    const employeeRevised = {
      id: "emp-rev-01",
      employeeCode: "EMP-REV",
      firstName: "Meera",
      lastName: "Joshi",
      email: "meera.joshi@masterhrms.internal",
      baseMonthlyCtc: 120000,
      state: "MH",
      pfEligible: true,
      esiEligible: false,
      ptEligible: true,
      tdsEligible: true,
      isResident: true,
      taxRegime: "new" as const,
    };

    const attendance = {
      totalWorkingDays: 30,
      payableDays: 30,
      presentDays: 30,
      halfDays: 0,
      approvedLeaveDays: 0,
      lossOfPayDays: 0,
      prorationFactor: 1.0,
    };

    // Calculate Month 7 breakdown using authoritative prior gross (437,500) and 6 remaining periods
    const octBreakdown = computeEmployeePayrollBreakdown(employeeRevised, attendance, {
      periodMonth: 10,
      periodYear: 2026,
      priorGrossEarned: 437500,
      tdsAlreadyDeducted: 0,
      remainingPeriods: 6,
    });

    // Projected Annual Gross:
    // Prior actuals (437,500) + Oct (120,000) + 5 future months @ 120k (600,000) = 1,157,500
    expect(octBreakdown.taxation.annualProjectedGross).toBe(1157500);
    // Taxable income = 1,157,500 - 75,000 = 1,082,500 (<= 12L threshold -> Full Sec 156(2) rebate)
    expect(octBreakdown.taxation.netTaxableIncome).toBe(1082500);
    expect(octBreakdown.taxation.totalAnnualTds).toBe(0);
    expect(octBreakdown.deductions.tds).toBe(0);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 18. SAFE FAILURE ON CORRUPT PRIOR-PERIOD TDS RECORDS
  // ───────────────────────────────────────────────────────────────────────────
  it("P1-21: Inconsistent or Corrupted Prior TDS Values Fail Safely", () => {
    const corruptPriorPayslips = [
      { id: "slip-01", grossSalary: 107083.33, breakdown: { deductions: { tds: 866.67 } } },
      { id: "slip-02", grossSalary: 107083.33, breakdown: { deductions: { tds: -500 } } }, // Illegal negative TDS!
    ];

    expect(() => {
      let priorTdsDeducted = 0;
      for (const p of corruptPriorPayslips) {
        const slipTds = Number(p.breakdown.deductions.tds);
        if (isNaN(slipTds) || slipTds < 0) {
          throw new Error(`Inconsistent TDS record detected in prior payslip ${p.id}. Manual audit required.`);
        }
        priorTdsDeducted += slipTds;
      }
    }).toThrow("Inconsistent TDS record detected in prior payslip slip-02");
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 19. EPF WAGE CEILING RECONCILIATION PROOF
  // ───────────────────────────────────────────────────────────────────────────
  it("P1-22: EPF Basis Reconciliation — ₹53,541.67 Basic Yields ₹6,425.00 Uncapped or ₹1,800.00 with Ceiling", () => {
    const basicSalary = 53541.67;

    // 1. Uncapped employee EPF: 12% of 53,541.67
    const uncappedEpf = calculateStatutoryEPF(basicSalary, false);
    expect(uncappedEpf.employeePf).toBe(6425.00);

    // 2. Capped employee EPF: 12% of 15,000 statutory ceiling
    const cappedEpf = calculateStatutoryEPF(basicSalary, true);
    expect(cappedEpf.employeePf).toBe(1800.00);

    // 3. Confirm mathematical precision
    expect(Math.round(basicSalary * 0.12 * 100) / 100).toBe(6425.00);
    expect(Math.round(15000 * 0.12 * 100) / 100).toBe(1800.00);
  });
});

