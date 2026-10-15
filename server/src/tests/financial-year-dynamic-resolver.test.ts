import { describe, it, expect } from "vitest";
import {
  normalizeFinancialYear,
  isValidFinancialYear,
  getFinancialYearFromDate,
  getFinancialYearFromPeriod,
  getCurrentFinancialYear,
  getAssessmentYear,
  toShortFY,
  getGoverningTaxAct,
  getFinancialYearMeta,
  getSelectableFinancialYears,
} from "../utils/financial-year";
import { TdsCalculatorService } from "../services/tds-calculator.service";
import { computeEmployeePayrollBreakdown, calculateAnnualTDS } from "../services/payroll-engine.service";

describe("MASTERHRMS — Financial Year Dynamic Resolver & Period Boundary Regression Suite", () => {
  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1: FY BOUNDARY: 31 MARCH VERSUS 1 APRIL
  // ─────────────────────────────────────────────────────────────────────────
  it("Requirement 1: Resolves exact 31 March vs 1 April Indian FY boundaries", () => {
    // 31 March 2025 -> Must belong to FY 2024-2025
    const mar31_2025 = new Date(2025, 2, 31, 23, 59, 59);
    expect(getFinancialYearFromDate(mar31_2025)).toBe("2024-2025");

    // 1 April 2025 -> Must belong to FY 2025-2026
    const apr01_2025 = new Date(2025, 3, 1, 0, 0, 0);
    expect(getFinancialYearFromDate(apr01_2025)).toBe("2025-2026");

    // 31 March 2026 -> Must belong to FY 2025-2026
    const mar31_2026 = new Date(2026, 2, 31, 23, 59, 59);
    expect(getFinancialYearFromDate(mar31_2026)).toBe("2025-2026");

    // 1 April 2026 -> Must belong to FY 2026-2027
    const apr01_2026 = new Date(2026, 3, 1, 0, 0, 0);
    expect(getFinancialYearFromDate(apr01_2026)).toBe("2026-2027");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2: PAYROLL RUN PERIOD TO FY RESOLUTION (JAN-MAR vs APR-DEC)
  // ─────────────────────────────────────────────────────────────────────────
  it("Requirement 2: January, February, March payroll periods correctly resolve to previous calendar year start", () => {
    // January 2026 (Month 1) -> FY 2025-2026
    expect(getFinancialYearFromPeriod(1, 2026)).toBe("2025-2026");
    // February 2026 (Month 2) -> FY 2025-2026
    expect(getFinancialYearFromPeriod(2, 2026)).toBe("2025-2026");
    // March 2026 (Month 3) -> FY 2025-2026
    expect(getFinancialYearFromPeriod(3, 2026)).toBe("2025-2026");

    // April 2026 (Month 4) -> FY 2026-2027
    expect(getFinancialYearFromPeriod(4, 2026)).toBe("2026-2027");
    // December 2026 (Month 12) -> FY 2026-2027
    expect(getFinancialYearFromPeriod(12, 2026)).toBe("2026-2027");

    // March 2027 (Month 3) -> FY 2026-2027
    expect(getFinancialYearFromPeriod(3, 2027)).toBe("2026-2027");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3: NORMALIZATION & STATUTORY FORMAT ACCEPTANCE
  // ─────────────────────────────────────────────────────────────────────────
  it("Requirement 3: Normalizes and accepts diverse canonical and short FY formats", () => {
    expect(normalizeFinancialYear("2025-2026")).toBe("2025-2026");
    expect(normalizeFinancialYear("2025-26")).toBe("2025-2026");
    expect(normalizeFinancialYear("FY 2025-26")).toBe("2025-2026");
    expect(normalizeFinancialYear("FY2026-2027")).toBe("2026-2027");
    expect(normalizeFinancialYear("2024-25")).toBe("2024-2025");

    expect(isValidFinancialYear("2025-2026")).toBe(true);
    expect(isValidFinancialYear("2025-26")).toBe(true);
    expect(isValidFinancialYear("2025-2027")).toBe(false); // Invalid multi-year span
    expect(isValidFinancialYear("invalid-string")).toBe(false);
    expect(isValidFinancialYear(null)).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 4: ASSESSMENT YEAR & SHORT CODES ARE STATUTORILY DISTINCT
  // ─────────────────────────────────────────────────────────────────────────
  it("Requirement 4: Distinctly separates Financial Year, Assessment Year and Tax Year", () => {
    const meta24 = getFinancialYearMeta("2024-2025");
    expect(meta24.financialYear).toBe("2024-2025");
    expect(meta24.shortCode).toBe("2024-25");
    expect(meta24.assessmentYear).toBe("2025-2026");
    expect(meta24.governingAct).toBe("Income-tax Act, 1961");

    const meta25 = getFinancialYearMeta("2025-2026");
    expect(meta25.financialYear).toBe("2025-2026");
    expect(meta25.shortCode).toBe("2025-26");
    expect(meta25.assessmentYear).toBe("2026-2027");
    expect(meta25.governingAct).toBe("Income-tax Act, 1961");

    const meta26 = getFinancialYearMeta("2026-2027");
    expect(meta26.financialYear).toBe("2026-2027");
    expect(meta26.shortCode).toBe("2026-27");
    expect(meta26.assessmentYear).toBe("2027-2028");
    expect(meta26.taxYear).toBe("2026-27");
    expect(meta26.governingAct).toBe("Income-tax Act, 2025");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 5: DYNAMIC SELECTABLE OPTIONS LIST GENERATION
  // ─────────────────────────────────────────────────────────────────────────
  it("Requirement 5: Generates dynamic selectable options list with historical and planning boundaries", () => {
    const refDate = new Date(2025, 5, 15); // June 2025 -> FY 2025-2026 is current
    const options = getSelectableFinancialYears({
      pastYears: 2,
      futureYears: 1,
      referenceDate: refDate,
    });

    // Should include: 2026-2027 (future/planning), 2025-2026 (current), 2024-2025, 2023-2024 (historical)
    expect(options.length).toBe(4);
    expect(options[0].value).toBe("2026-2027");
    expect(options[0].isPlanning).toBe(true);
    expect(options[1].value).toBe("2025-2026");
    expect(options[1].isCurrent).toBe(true);
    expect(options[2].value).toBe("2024-2025");
    expect(options[2].isHistorical).toBe(true);
    expect(options[3].value).toBe("2023-2024");
    expect(options[3].isHistorical).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 6: GOVERNING ACT MAPPING & REBATE ENGINE SOURCING
  // ─────────────────────────────────────────────────────────────────────────
  it("Requirement 6: Maps each FY to the correct statutory Act, rule pack and rebate thresholds", async () => {
    // Mock prisma for TdsCalculatorService
    const mockPrisma = {
      statutoryRule: {
        findFirst: async () => null, // Will use default statutory fallback
      },
    } as any;

    const tdsService = new TdsCalculatorService(mockPrisma);

    // FY 2024-25 Fallback Rule
    const rule24 = await tdsService.getEffectiveStatutoryRule("tenant-1", "2024-2025");
    expect(rule24.ruleType).toBe("TDS_115BAC_FY2425");
    expect(rule24.config.newRegime.section87ARebateThreshold).toBe(700000);
    expect(rule24.config.newRegime.maxRebateAmount).toBe(25000);

    // FY 2025-26 Fallback Rule (Finance Act, 2025 / Section 115BAC)
    const rule25 = await tdsService.getEffectiveStatutoryRule("tenant-1", "2025-2026");
    expect(rule25.ruleType).toBe("TDS_115BAC");
    expect(rule25.config.newRegime.standardDeduction).toBe(75000);
    expect(rule25.config.newRegime.section87ARebateThreshold).toBe(1200000);
    expect(rule25.config.newRegime.maxRebateAmount).toBe(60000);

    // FY 2026-27 Fallback Rule (Income-tax Act, 2025 / Section 392)
    const rule26 = await tdsService.getEffectiveStatutoryRule("tenant-1", "2026-2027");
    expect(rule26.ruleType).toBe("TDS_ITA2025");
    expect(rule26.config.newRegime.section156RebateThreshold).toBe(1200000);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 7: HISTORICAL PAYROLL REPLAY INTEGRITY
  // ─────────────────────────────────────────────────────────────────────────
  it("Requirement 7: Finalized historical payroll preserves historical parameters without recalculation leakage", () => {
    const historicalEmployee = {
      id: "emp-hist-1",
      employeeCode: "HIST01",
      firstName: "Anita",
      lastName: "Desai",
      baseMonthlyCtc: 60000,
      state: "KA",
      pfEligible: true,
      esiEligible: false,
      ptEligible: true,
      tdsEligible: true,
      isResident: true,
      taxRegime: "new",
      email: "anita.desai@example.com",
    };

    const attendance = {
      totalWorkingDays: 31,
      payableDays: 31,
      presentDays: 31,
      halfDays: 0,
      approvedLeaveDays: 0,
      lossOfPayDays: 0,
      prorationFactor: 1.0,
    };

    // March 2025 payroll run (FY 2024-2025)
    const march2025Run = computeEmployeePayrollBreakdown(
      historicalEmployee,
      attendance,
      { periodMonth: 3, periodYear: 2025 }
    );
    expect(march2025Run.taxation.taxYear).toBe("2024-2025");
    expect(march2025Run.taxation.statutoryAct).toBe("Income-tax Act, 1961");
    expect(march2025Run.statutoryManifest.tds.taxYear).toBe("2024-2025");

    // April 2026 payroll run (FY 2026-2027)
    const april2026Run = computeEmployeePayrollBreakdown(
      historicalEmployee,
      attendance,
      { periodMonth: 4, periodYear: 2026 }
    );
    expect(april2026Run.taxation.taxYear).toBe("2026-2027");
    expect(april2026Run.taxation.statutoryAct).toBe("Income-tax Act, 2025");
    expect(april2026Run.statutoryManifest.tds.taxYear).toBe("2026-2027");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 8: DEFECT REGRESSION: ₹12L GROSS SALARY YIELDS ₹0 TDS IN BOTH FY25 & FY26
  // ─────────────────────────────────────────────────────────────────────────
  it("Requirement 8: Reconfirms zero TDS on ₹12,00,000 gross salary across both enacted statutory periods", () => {
    const mockPrisma = { statutoryRule: { findFirst: async () => null } } as any;
    const tdsService = new TdsCalculatorService(mockPrisma);

    // Under FY 2025-26: ₹12L Gross - ₹75k Standard Deduction = ₹11.25L Taxable -> ₹52.5k Tax - ₹52.5k Rebate 87A = ₹0 TDS
    const calcFY25 = TdsCalculatorService.computeNewRegime({
      annualGrossSalary: 1200000,
      basicSalaryAnnual: 600000,
      hraReceivedAnnual: 240000,
      regime: "new",
      financialYear: "2025-2026",
    });
    expect(calcFY25.netTaxableIncome).toBe(1125000);
    expect(calcFY25.rebate87A).toBe(52500);
    expect(calcFY25.totalAnnualTax).toBe(0);
    expect(calcFY25.monthlyTds).toBe(0);

    // Under FY 2026-27: ₹12L Gross - ₹75k Standard Deduction = ₹11.25L Taxable -> ₹52.5k Tax - ₹52.5k Section 156 Rebate = ₹0 TDS
    const calcFY26 = TdsCalculatorService.computeNewRegime({
      annualGrossSalary: 1200000,
      basicSalaryAnnual: 600000,
      hraReceivedAnnual: 240000,
      regime: "new",
      financialYear: "2026-2027",
    });
    expect(calcFY26.netTaxableIncome).toBe(1125000);
    expect(calcFY26.rebate87A).toBe(52500);
    expect(calcFY26.totalAnnualTax).toBe(0);
    expect(calcFY26.monthlyTds).toBe(0);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 9: CURRENT APPLICATION DATE (15 OCTOBER 2026) STATUS LABEL INTEGRITY
  // ─────────────────────────────────────────────────────────────────────────
  it("Requirement 9: In October 2026, FY 2026-27 is labeled '(Current)', FY 2025-26 is Historical, and FY 2027-28 is '(Planning)'", () => {
    // Current runtime date: 15 October 2026
    const oct15_2026 = new Date(2026, 9, 15, 14, 30, 0); // Month is 0-indexed: 9 = October

    // Resolves FY 2026-2027 as current
    expect(getFinancialYearFromDate(oct15_2026)).toBe("2026-2027");

    // Metadata classification on 15 October 2026
    const meta2026 = getFinancialYearMeta("2026-2027", oct15_2026);
    expect(meta2026.isCurrent).toBe(true);
    expect(meta2026.isHistorical).toBe(false);
    expect(meta2026.isPlanning).toBe(false);
    expect(meta2026.governingAct).toBe("Income-tax Act, 2025");
    expect(meta2026.assessmentYear).toBe("2027-2028");

    const meta2025 = getFinancialYearMeta("2025-2026", oct15_2026);
    expect(meta2025.isCurrent).toBe(false);
    expect(meta2025.isHistorical).toBe(true);
    expect(meta2025.isPlanning).toBe(false);
    expect(meta2025.governingAct).toBe("Income-tax Act, 1961");
    expect(meta2025.assessmentYear).toBe("2026-2027");

    const meta2027 = getFinancialYearMeta("2027-2028", oct15_2026);
    expect(meta2027.isCurrent).toBe(false);
    expect(meta2027.isHistorical).toBe(false);
    expect(meta2027.isPlanning).toBe(true);
    expect(meta2027.assessmentYear).toBe("2028-2029");

    // Dropdown options generated on 15 October 2026
    const options = getSelectableFinancialYears({
      pastYears: 2,
      futureYears: 1,
      referenceDate: oct15_2026,
    });

    expect(options.length).toBe(4);
    // FY 2027-28 must be (Planning)
    expect(options[0].value).toBe("2027-2028");
    expect(options[0].label).toContain("(Planning)");
    expect(options[0].isPlanning).toBe(true);

    // FY 2026-27 must be (Current)
    expect(options[1].value).toBe("2026-2027");
    expect(options[1].label).toContain("(Current)");
    expect(options[1].isCurrent).toBe(true);

    // FY 2025-26 must be historical (no Current, no Planning)
    expect(options[2].value).toBe("2025-2026");
    expect(options[2].label).not.toContain("(Current)");
    expect(options[2].label).not.toContain("(Planning)");
    expect(options[2].isHistorical).toBe(true);

    // FY 2024-25 must be historical
    expect(options[3].value).toBe("2024-2025");
    expect(options[3].isHistorical).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 10: 31 MARCH / 1 APRIL MULTI-YEAR BOUNDARY CROSSING
  // ─────────────────────────────────────────────────────────────────────────
  it("Requirement 10: Verifies exact boundary transitions across multiple financial years", () => {
    // 31 March 2026 23:59:59.999 -> FY 2025-2026
    const endFY25 = new Date(2026, 2, 31, 23, 59, 59, 999);
    expect(getFinancialYearFromDate(endFY25)).toBe("2025-2026");
    expect(getFinancialYearMeta("2025-2026", endFY25).isCurrent).toBe(true);

    // 1 April 2026 00:00:00.000 -> FY 2026-2027
    const startFY26 = new Date(2026, 3, 1, 0, 0, 0, 0);
    expect(getFinancialYearFromDate(startFY26)).toBe("2026-2027");
    expect(getFinancialYearMeta("2026-2027", startFY26).isCurrent).toBe(true);
    expect(getFinancialYearMeta("2025-2026", startFY26).isHistorical).toBe(true);

    // 31 March 2027 23:59:59.999 -> FY 2026-2027
    const endFY26 = new Date(2027, 2, 31, 23, 59, 59, 999);
    expect(getFinancialYearFromDate(endFY26)).toBe("2026-2027");
    expect(getFinancialYearMeta("2026-2027", endFY26).isCurrent).toBe(true);

    // 1 April 2027 00:00:00.000 -> FY 2027-2028
    const startFY27 = new Date(2027, 3, 1, 0, 0, 0, 0);
    expect(getFinancialYearFromDate(startFY27)).toBe("2027-2028");
    expect(getFinancialYearMeta("2027-2028", startFY27).isCurrent).toBe(true);
    expect(getFinancialYearMeta("2026-2027", startFY27).isHistorical).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 11: DISTINCT STATUTORY CONCEPTS: FY vs AY vs TAX YEAR
  // ─────────────────────────────────────────────────────────────────────────
  it("Requirement 11: Ensures Financial Year, Assessment Year, and Tax Year remain distinct statutory concepts", () => {
    // Under ITA 1961: Earning year is FY 2025-26, filing year is AY 2026-27
    const meta1961 = getFinancialYearMeta("2025-2026");
    expect(meta1961.financialYear).toBe("2025-2026");
    expect(meta1961.assessmentYear).toBe("2026-2027");
    expect(meta1961.taxYear).toBe("2025-26");
    expect(meta1961.financialYear).not.toBe(meta1961.assessmentYear);

    // Under ITA 2025: Earning year is FY 2026-27 (Tax Year 2026-27), filing year is AY 2027-28
    const meta2025 = getFinancialYearMeta("2026-2027");
    expect(meta2025.financialYear).toBe("2026-2027");
    expect(meta2025.assessmentYear).toBe("2027-2028");
    expect(meta2025.taxYear).toBe("2026-27");
    expect(meta2025.financialYear).not.toBe(meta2025.assessmentYear);
  });
});
