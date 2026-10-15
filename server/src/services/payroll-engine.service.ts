import Decimal from "decimal.js";

/**
 * Master ERP HRMS — Global Statutory & Payroll Calculation Engine
 * 
 * Compliant with:
 * 1. Income-tax Act, 2025 Section 392 Salary Withholding TDS Rules (FY 2025-26 & TY 2026-27+)
 * 2. Labour Codes & EPF (Employees' Provident Fund Act, 1952)
 * 3. ESI Act, 1948 (₹21,000 Wage Ceiling Rule)
 * 4. State Professional Tax (PT) Matrices (MH, KA, TN, TS, WB, GJ, DL, etc.)
 * 5. Payment of Gratuity Act, 1972
 */

export interface EmployeePayrollContext {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  pan?: string | null;
  aadhaar?: string | null;
  uan?: string | null;
  esiNumber?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  bankIfsc?: string | null;
  bankBranch?: string | null;
  dateOfBirth?: Date | string | null;
  gender?: string | null;
  taxRegime?: "new" | "old" | string;
  state?: string | null;
  pfEligible?: boolean;
  esiEligible?: boolean;
  ptEligible?: boolean;
  tdsEligible?: boolean;
  isResident?: boolean;
  baseMonthlyCtc: number;
  annualCtc?: number;
  joinedAt?: Date | string | null;
  relievedAt?: Date | string | null;
}

export interface AttendanceContext {
  totalWorkingDays: number;
  payableDays: number;
  presentDays: number;
  halfDays: number;
  approvedLeaveDays: number;
  lossOfPayDays: number;
  prorationFactor: number;
}

export interface TaxDeclarationContext {
  taxRegime?: "new" | "old" | string;
  houseRentPaid?: number | any;
  landlordPan?: string | null;
  landlordName?: string | null;
  section80C?: number | any;
  section80D?: number | any;
  section80G?: number | any;
  homeLoanInterest?: number | any;
  otherIncome?: number | any;
  specialRateIncome?: number | any; // Special-rate income (capital gains, winnings) excluded from Sec 156 rebate
  totalDeductionApproved?: number | any;
}

export interface SalaryBreakdownResult {
  baseMonthlyCtc: number;
  prorationFactor: number;
  totalWorkingDays: number;
  payableDays: number;
  lossOfPayDays: number;
  presentDays: number;
  halfDays: number;
  approvedLeaveDays: number;
  
  earnings: {
    basicSalary: number;
    hra: number;
    specialAllowance: number;
    conveyance: number;
    medical: number;
    otherAllowance: number;
    reimbursements: number;
    totalGross: number;
    itemized: Array<{ code: string; name: string; amount: number; isTaxable: boolean }>;
  };

  deductions: {
    providentFund: number;
    pfEmployerMatch: number;
    esi: number;
    esiEmployerMatch: number;
    professionalTax: number;
    tds: number;
    otherDeductions: number;
    totalDeductions: number;
    itemized: Array<{ code: string; name: string; amount: number; isStatutory: boolean }>;
  };

  employerContributions: {
    epf: number;
    eps: number;
    edli: number;
    esiEmployer: number;
    gratuityAccrual: number;
    totalEmployerCost: number;
  };

  taxation: {
    annualProjectedGross: number;
    taxRegime: "new" | "old";
    standardDeduction: number;
    section80CDeduction: number;
    section80DDeduction: number;
    section24bDeduction: number;
    hraExemption: number;
    netTaxableIncome: number;
    annualTaxCalculated: number;
    rebate87A: number; // Retained for backwards-compatibility
    section156Rebate?: number; // Canonical Income-tax Act, 2025 citation
    statutoryAct?: string;
    salaryWithholdingSection?: string;
    rebateSection?: string;
    taxYear?: string;
    ruleVersion?: number;
    netTaxAfterRebate: number;
    cessAmount: number;
    totalAnnualTds: number;
    monthlyTdsDeduction: number;
  };

  netPay: number;
  currency: string;
  currencySymbol: string;
}

// -------------------------------------------------------------
// 1. STATE PROFESSIONAL TAX (PT) MATRICES (DB-Driven with Fallback)
// -------------------------------------------------------------
export interface StatutoryRuleRecord {
  id?: string;
  ruleType: string; // EPF, ESI, PT, GRATUITY, TDS_ITA2025
  stateCode?: string | null;
  configJson: any;
  effectiveFrom: Date | string;
  isActive?: boolean;
}

export function calculateProfessionalTax(
  monthlyEarnedGross: number,
  state: string = "MH",
  periodMonth: number = 1,
  customRules?: StatutoryRuleRecord[]
): number {
  const normState = (state || "MH").trim().toUpperCase();

  // If a matching active versioned DB rule exists for this state, use its slabs
  if (customRules && Array.isArray(customRules)) {
    const dbPtRule = customRules.find(
      (r) =>
        r.ruleType === "PT" &&
        (r.stateCode?.toUpperCase() === normState || r.stateCode === "ALL") &&
        (r.isActive !== false)
    );

    if (dbPtRule && dbPtRule.configJson?.slabs && Array.isArray(dbPtRule.configJson.slabs)) {
      const slabs = dbPtRule.configJson.slabs;
      for (const slab of slabs) {
        const min = Number(slab.min || 0);
        const max = slab.max !== null && slab.max !== undefined ? Number(slab.max) : Infinity;
        if (monthlyEarnedGross >= min && monthlyEarnedGross <= max) {
          if (periodMonth === 2 && slab.februarySpecialTax !== undefined) {
            return Number(slab.februarySpecialTax);
          }
          return Number(slab.tax || 0);
        }
      }
    }
  }

  // Fallback to official statutory state matrix
  switch (normState) {
    case "MAHARASHTRA":
    case "MH":
      if (monthlyEarnedGross <= 7500) return 0;
      if (monthlyEarnedGross <= 10000) return 175;
      // In Maharashtra, Feb is 300, other months 200
      return periodMonth === 2 ? 300 : 200;

    case "KARNATAKA":
    case "KA":
      if (monthlyEarnedGross < 15000) return 0;
      return 200;

    case "TELANGANA":
    case "TS":
    case "TG":
    case "ANDHRA PRADESH":
    case "AP":
      if (monthlyEarnedGross <= 15000) return 0;
      if (monthlyEarnedGross <= 20000) return 150;
      return 200;

    case "TAMIL NADU":
    case "TN":
      if (monthlyEarnedGross <= 21000) return 0;
      if (monthlyEarnedGross <= 30000) return 100;
      if (monthlyEarnedGross <= 45000) return 235;
      if (monthlyEarnedGross <= 60000) return 510;
      if (monthlyEarnedGross <= 75000) return 760;
      return 1095 / 6; // Half yearly averaged to ~182/mo

    case "WEST BENGAL":
    case "WB":
      if (monthlyEarnedGross <= 10000) return 0;
      if (monthlyEarnedGross <= 15000) return 110;
      if (monthlyEarnedGross <= 25000) return 130;
      if (monthlyEarnedGross <= 40000) return 150;
      return 200;

    case "GUJARAT":
    case "GJ":
      if (monthlyEarnedGross <= 12000) return 0;
      return 200;

    case "DELHI":
    case "DL":
    case "HARYANA":
    case "HR":
    case "RAJASTHAN":
    case "RJ":
    case "UTTAR PRADESH":
    case "UP":
      // No professional tax levied
      return 0;

    default:
      // Default standard cap
      return monthlyEarnedGross > 10000 ? 200 : 0;
  }
}

// -------------------------------------------------------------
// 2. STATUTORY EPF & ESI CALCULATIONS
// -------------------------------------------------------------
export function calculateStatutoryEPF(basicSalary: number, capAtCeiling: boolean = false) {
  // Statutory wage ceiling is ₹15,000 / month
  const pfWage = capAtCeiling ? Math.min(15000, basicSalary) : basicSalary;
  const employeePf = Math.round(pfWage * 0.12 * 100) / 100;
  
  // Employer portion: 3.67% EPF + 8.33% EPS (capped at ₹1,250) + 0.5% EDLI + 0.5% Admin
  const eps = Math.min(1250, Math.round(pfWage * (8.33333333 / 100)));
  const epfEmployer = Math.max(0, employeePf - eps);
  const edli = Math.round(pfWage * 0.005 * 100) / 100;
  const adminCharges = Math.round(pfWage * 0.005 * 100) / 100;

  return {
    employeePf,
    epfEmployer,
    eps,
    edli,
    adminCharges,
    totalEmployerCost: Math.round((epfEmployer + eps + edli + adminCharges) * 100) / 100,
  };
}

export function calculateStatutoryESI(monthlyEarnedGross: number) {
  const ESI_WAGE_CEILING = 21000;
  if (monthlyEarnedGross > ESI_WAGE_CEILING) {
    return {
      isEligible: false,
      employeeEsi: 0,
      employerEsi: 0,
      totalCost: 0,
    };
  }

  const employeeEsi = Math.round(monthlyEarnedGross * 0.0075 * 100) / 100; // 0.75%
  const employerEsi = Math.round(monthlyEarnedGross * 0.0325 * 100) / 100; // 3.25%

  return {
    isEligible: true,
    employeeEsi,
    employerEsi,
    totalCost: Math.round((employeeEsi + employerEsi) * 100) / 100,
  };
}

export interface TaxCalculationOptions {
  isResident?: boolean;
  statutoryRules?: StatutoryRuleRecord[];
  periodMonth?: number;
  periodYear?: number;
  financialYear?: string;
  tdsAlreadyDeducted?: number; // Prior cumulative TDS deducted across earlier periods in tax year
  isFinalPeriod?: boolean; // Flag to indicate final reconciliation period (e.g. Month 12 / March)
  remainingPeriods?: number; // Remaining periods in tax year over which to distribute remaining liability
  redistributeRemaining?: boolean; // Whether to dynamically redistribute remaining liability across remaining periods
}

// -------------------------------------------------------------
// 3. INCOME-TAX ACT, 2025 SECTION 392 WITHHOLDING TAX (TDS) ENGINE
// -------------------------------------------------------------
export function calculateAnnualTDS(
  projectedAnnualGross: number,
  regime: "new" | "old" = "new",
  declarations?: Partial<TaxDeclarationContext>,
  options?: TaxCalculationOptions
) {
  let standardDeduction = 0;
  let section80C = 0;
  let section80D = 0;
  let section24b = 0;
  let hraExemption = 0;
  const otherIncome = Number(declarations?.otherIncome || 0);
  const specialRateIncome = Number(declarations?.specialRateIncome || 0);

  const isResident = options?.isResident !== false; // Resident individual by default

  // Check if custom or versioned statutory rule exists in database rule pack
  const tdsRule = options?.statutoryRules?.find(
    (r) => r.ruleType === "TDS_ITA2025" || r.ruleType === "TDS_115BAC"
  );
  const newRuleConfig = tdsRule?.configJson?.newRegime;
  const oldRuleConfig = tdsRule?.configJson?.oldRegime;

  if (regime === "new") {
    // Standard deduction under Income-tax Act, 2025 / Budget 2025-26: ₹75,000
    standardDeduction = newRuleConfig?.standardDeduction || 75000;
    const stdDeductDec = new Decimal(standardDeduction);
    const taxableSalaryDec = Decimal.max(0, new Decimal(projectedAnnualGross).minus(stdDeductDec));
    const totalTaxableDec = taxableSalaryDec.plus(otherIncome).plus(specialRateIncome);
    const totalTaxableIncome = totalTaxableDec.toNumber();

    // Slabs (AY 2026-27 / TY 2026-27 under Income-tax Act, 2025 Section 392 withholding):
    // Slab 1: ₹0 – ₹4,00,000 : 0%
    // Slab 2: ₹4,00,001 – ₹8,00,000 : 5%
    // Slab 3: ₹8,00,001 – ₹12,00,000 : 10%
    // Slab 4: ₹12,00,001 – ₹16,00,000 : 15%
    // Slab 5: ₹16,00,001 – ₹20,00,000 : 20%
    // Slab 6: ₹20,00,001 – ₹24,00,000 : 25%
    // Slab 7: Above ₹24,00,000 : 30%

    const customSlabs = newRuleConfig?.slabs;
    let rawTaxDec = new Decimal(0);

    if (Array.isArray(customSlabs) && customSlabs.length > 0) {
      let rem = totalTaxableDec;
      for (const slab of customSlabs) {
        if (rem.lessThanOrEqualTo(0)) break;
        const slabSpan = slab.max !== null && slab.max !== undefined
          ? new Decimal(slab.max).minus(slab.min)
          : new Decimal(Infinity);
        const taxableInSlab = Decimal.min(rem, slabSpan);
        if (taxableInSlab.greaterThan(0) && slab.rate > 0) {
          rawTaxDec = rawTaxDec.plus(taxableInSlab.times(slab.rate));
        }
        rem = Decimal.max(0, rem.minus(taxableInSlab));
      }
    } else {
      // Default official Income-tax Act, 2025 Section 392 slabs (AY 2026-27)
      if (totalTaxableDec.greaterThan(2400000)) {
        rawTaxDec = rawTaxDec.plus(totalTaxableDec.minus(2400000).times(0.30))
          .plus(new Decimal(400000).times(0.25)) // 20L-24L = 100,000
          .plus(new Decimal(400000).times(0.20)) // 16L-20L = 80,000
          .plus(new Decimal(400000).times(0.15)) // 12L-16L = 60,000
          .plus(new Decimal(400000).times(0.10)) // 8L-12L = 40,000
          .plus(new Decimal(400000).times(0.05)); // 4L-8L = 20,000
      } else if (totalTaxableDec.greaterThan(2000000)) {
        rawTaxDec = rawTaxDec.plus(totalTaxableDec.minus(2000000).times(0.25))
          .plus(new Decimal(400000).times(0.20))
          .plus(new Decimal(400000).times(0.15))
          .plus(new Decimal(400000).times(0.10))
          .plus(new Decimal(400000).times(0.05));
      } else if (totalTaxableDec.greaterThan(1600000)) {
        rawTaxDec = rawTaxDec.plus(totalTaxableDec.minus(1600000).times(0.20))
          .plus(new Decimal(400000).times(0.15))
          .plus(new Decimal(400000).times(0.10))
          .plus(new Decimal(400000).times(0.05));
      } else if (totalTaxableDec.greaterThan(1200000)) {
        rawTaxDec = rawTaxDec.plus(totalTaxableDec.minus(1200000).times(0.15))
          .plus(new Decimal(400000).times(0.10))
          .plus(new Decimal(400000).times(0.05));
      } else if (totalTaxableDec.greaterThan(800000)) {
        rawTaxDec = rawTaxDec.plus(totalTaxableDec.minus(800000).times(0.10))
          .plus(new Decimal(400000).times(0.05));
      } else if (totalTaxableDec.greaterThan(400000)) {
        rawTaxDec = rawTaxDec.plus(totalTaxableDec.minus(400000).times(0.05));
      }
    }

    rawTaxDec = rawTaxDec.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const rawTax = rawTaxDec.toNumber();

    // Section 156(2) Rebate (formerly Section 87A of Income-tax Act, 1961):
    // Available exclusively to Resident Individuals.
    // Under Income-tax Act, 2025 Section 156(2) (AY 2026-27 / TY 2026-27):
    // Full rebate of tax payable up to ₹60,000 for taxable income up to ₹12,00,000.
    const rebateThreshold =
      newRuleConfig?.section156RebateThreshold ||
      newRuleConfig?.section87ARebateThreshold ||
      1200000;
    const rebateThresholdDec = new Decimal(rebateThreshold);
    let rebateDec = new Decimal(0);
    let taxAfterRebateDec = rawTaxDec;

    if (isResident) {
      if (totalTaxableDec.lessThanOrEqualTo(rebateThresholdDec)) {
        // Full rebate under Section 156(2)
        rebateDec = rawTaxDec;
        taxAfterRebateDec = new Decimal(0);
      } else {
        // Marginal Relief: Tax payable cannot exceed excess taxable income over the rebate threshold
        const excessIncomeDec = totalTaxableDec.minus(rebateThresholdDec);
        if (rawTaxDec.greaterThan(excessIncomeDec)) {
          rebateDec = rawTaxDec.minus(excessIncomeDec).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
          taxAfterRebateDec = excessIncomeDec.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
        } else {
          rebateDec = new Decimal(0);
          taxAfterRebateDec = rawTaxDec;
        }
      }
    } else {
      // Non-resident / NRI: Ineligible for Section 156 / 87A rebate
      rebateDec = new Decimal(0);
      taxAfterRebateDec = rawTaxDec;
    }

    const cessRateDec = new Decimal(tdsRule?.configJson?.cessRate || 0.04);
    const cessDec = taxAfterRebateDec.times(cessRateDec).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const totalAnnualTdsDec = taxAfterRebateDec.plus(cessDec).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const totalAnnualTds = totalAnnualTdsDec.toNumber();

    let monthlyTdsDec: Decimal;
    const isFinal = Boolean(options?.isFinalPeriod || (options?.remainingPeriods !== undefined && options.remainingPeriods === 1));

    // Period-based cumulative withholding adjustment policy (Section 392):
    // Standard periods (Months 1–11) withhold rounded monthly average;
    // Final reconciliation period (isFinalPeriod === true) absorbs rounding variance so cumulative sum equals annual liability exactly.
    if (options?.tdsAlreadyDeducted !== undefined && isFinal) {
      monthlyTdsDec = Decimal.max(0, totalAnnualTdsDec.minus(new Decimal(options.tdsAlreadyDeducted)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP));
    } else if (options?.redistributeRemaining && options?.tdsAlreadyDeducted !== undefined && options?.remainingPeriods && options.remainingPeriods > 1) {
      // In-year dynamic redistribution for salary revisions, LOPs, or mid-year adjustments
      const remainingLiability = Decimal.max(0, totalAnnualTdsDec.minus(new Decimal(options.tdsAlreadyDeducted)));
      monthlyTdsDec = remainingLiability.dividedBy(options.remainingPeriods).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    } else {
      monthlyTdsDec = totalAnnualTdsDec.dividedBy(12).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    }

    let rebateSection = "Section 156(2)";
    if (!isResident) {
      rebateSection = "N/A (Ineligible Non-Resident)";
    } else if (rebateDec.isZero() && totalTaxableDec.greaterThan(rebateThresholdDec)) {
      rebateSection = "Section 156(2) (Exceeded Threshold)";
    }

    return {
      annualProjectedGross: projectedAnnualGross,
      taxRegime: "new" as const,
      isResident,
      standardDeduction,
      section80CDeduction: 0,
      section80DDeduction: 0,
      section24bDeduction: 0,
      hraExemption: 0,
      netTaxableIncome: totalTaxableIncome,
      annualTaxCalculated: rawTax,
      rebate87A: rebateDec.toNumber(), // Legacy alias for backward compatibility
      section156Rebate: rebateDec.toNumber(), // Canonical ITA 2025 provision
      statutoryAct: "Income-tax Act, 2025",
      salaryWithholdingSection: "392",
      rebateSection,
      taxYear: tdsRule?.configJson?.taxYear || "2026-2027",
      ruleVersion: (tdsRule as any)?.version || 1,
      netTaxAfterRebate: taxAfterRebateDec.toNumber(),
      cessAmount: cessDec.toNumber(),
      totalAnnualTds,
      monthlyTdsDeduction: monthlyTdsDec.toNumber(),
    };
  } else {
    // Old Tax Regime with Decimal precision
    standardDeduction = 50000;
    section80C = Math.min(150000, Number(declarations?.section80C || 0));
    section80D = Math.min(50000, Number(declarations?.section80D || 0));
    section24b = Math.min(200000, Number(declarations?.homeLoanInterest || 0));

    // HRA calculation approximation (least of actual rent paid - 10% basic, 40% basic, HRA)
    const annualBasic = projectedAnnualGross * 0.5;
    const annualHra = projectedAnnualGross * 0.2;
    const annualRentPaid = (declarations?.houseRentPaid || 0) * 12;
    if (annualRentPaid > 0) {
      const rentMinusBasic = Math.max(0, annualRentPaid - annualBasic * 0.1);
      hraExemption = Math.min(annualHra, rentMinusBasic, annualBasic * 0.4);
    }

    const totalOldDeductions = standardDeduction + section80C + section80D + section24b + hraExemption;
    const totalTaxableDec = Decimal.max(0, new Decimal(projectedAnnualGross).plus(otherIncome).plus(specialRateIncome).minus(totalOldDeductions));
    const totalTaxableIncome = totalTaxableDec.toNumber();

    // Old Slabs:
    // 0 - 2.5L: 0%
    // 2.5L - 5L: 5%
    // 5L - 10L: 20%
    // > 10L: 30%
    let rawTaxDec = new Decimal(0);
    if (totalTaxableDec.greaterThan(1000000)) {
      rawTaxDec = rawTaxDec.plus(totalTaxableDec.minus(1000000).times(0.30))
        .plus(new Decimal(500000).times(0.20)) // 1,00,000
        .plus(new Decimal(250000).times(0.05)); // 12,500
    } else if (totalTaxableDec.greaterThan(500000)) {
      rawTaxDec = rawTaxDec.plus(totalTaxableDec.minus(500000).times(0.20))
        .plus(new Decimal(250000).times(0.05));
    } else if (totalTaxableDec.greaterThan(250000)) {
      rawTaxDec = rawTaxDec.plus(totalTaxableDec.minus(250000).times(0.05));
    }

    rawTaxDec = rawTaxDec.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const rawTax = rawTaxDec.toNumber();
    let rebateDec = new Decimal(0);
    let taxAfterRebateDec = rawTaxDec;

    const oldRebateThreshold =
      oldRuleConfig?.section156RebateThreshold ||
      oldRuleConfig?.section87ARebateThreshold ||
      500000;
    const oldRebateThresholdDec = new Decimal(oldRebateThreshold);

    if (isResident) {
      if (totalTaxableDec.lessThanOrEqualTo(oldRebateThresholdDec)) {
        rebateDec = Decimal.min(12500, rawTaxDec);
        taxAfterRebateDec = Decimal.max(0, rawTaxDec.minus(rebateDec));
      }
    }

    const cessDec = taxAfterRebateDec.times(0.04).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const totalAnnualTdsDec = taxAfterRebateDec.plus(cessDec).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const totalAnnualTds = totalAnnualTdsDec.toNumber();

    let monthlyTdsDec: Decimal;
    const isFinal = Boolean(options?.isFinalPeriod || (options?.remainingPeriods !== undefined && options.remainingPeriods === 1));

    if (options?.tdsAlreadyDeducted !== undefined && isFinal) {
      monthlyTdsDec = Decimal.max(0, totalAnnualTdsDec.minus(new Decimal(options.tdsAlreadyDeducted)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP));
    } else if (options?.redistributeRemaining && options?.tdsAlreadyDeducted !== undefined && options?.remainingPeriods && options.remainingPeriods > 1) {
      const remainingLiability = Decimal.max(0, totalAnnualTdsDec.minus(new Decimal(options.tdsAlreadyDeducted)));
      monthlyTdsDec = remainingLiability.dividedBy(options.remainingPeriods).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    } else {
      monthlyTdsDec = totalAnnualTdsDec.dividedBy(12).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    }

    let rebateSection = "Section 156(1)";
    if (!isResident) {
      rebateSection = "N/A (Ineligible Non-Resident)";
    } else if (rebateDec.isZero() && totalTaxableDec.greaterThan(oldRebateThresholdDec)) {
      rebateSection = "Section 156(1) (Exceeded Threshold)";
    }

    return {
      annualProjectedGross: projectedAnnualGross,
      taxRegime: "old" as const,
      isResident,
      standardDeduction,
      section80CDeduction: section80C,
      section80DDeduction: section80D,
      section24bDeduction: section24b,
      hraExemption,
      netTaxableIncome: totalTaxableIncome,
      annualTaxCalculated: rawTax,
      rebate87A: rebateDec.toNumber(),
      section156Rebate: rebateDec.toNumber(),
      statutoryAct: "Income-tax Act, 2025 (Transitional) / Income-tax Act, 1961",
      salaryWithholdingSection: "392 (192)",
      rebateSection,
      taxYear: "2026-2027",
      ruleVersion: 1,
      netTaxAfterRebate: taxAfterRebateDec.toNumber(),
      cessAmount: cessDec.toNumber(),
      totalAnnualTds,
      monthlyTdsDeduction: monthlyTdsDec.toNumber(),
    };
  }
}

// -------------------------------------------------------------
// 4. FULL COMPREHENSIVE PAYROLL CALCULATOR
// -------------------------------------------------------------
export function computeEmployeePayrollBreakdown(
  employee: EmployeePayrollContext,
  attendance: AttendanceContext,
  options?: {
    structureComponents?: Array<{
      code: string;
      name: string;
      type: "earning" | "deduction" | "reimbursement";
      calculationType: string;
      value: number;
      formula?: string;
      isTaxable?: boolean;
      isStatutory?: boolean;
    }>;
    reimbursements?: number;
    declarations?: Partial<TaxDeclarationContext>;
    statutoryRules?: StatutoryRuleRecord[];
    periodMonth?: number;
    periodYear?: number;
    currency?: string;
    currencySymbol?: string;
    tdsAlreadyDeducted?: number;
    priorGrossEarned?: number;
    isFinalPeriod?: boolean;
    remainingPeriods?: number;
    redistributeRemaining?: boolean;
    employmentMonthsInFy?: number;
  }
): SalaryBreakdownResult {
  const proration = attendance.prorationFactor;
  const baseMonthlyCtc = Number(employee.baseMonthlyCtc) || 35000;
  const reimbursements = Number(options?.reimbursements || 0);
  const periodMonth = options?.periodMonth || new Date().getMonth() + 1;
  const currency = options?.currency || "INR";
  const currencySymbol = options?.currencySymbol || "₹";

  // Standard or Structure Component Breakdown
  const salaryGrossProrated = Math.round(baseMonthlyCtc * proration * 100) / 100;
  const totalEarnedGross = Math.round((salaryGrossProrated + reimbursements) * 100) / 100;

  // Earnings standard default allocation (50-20-15-5-5-5)
  const basicSalary = Math.round(salaryGrossProrated * 0.50 * 100) / 100;
  const hra = Math.round(salaryGrossProrated * 0.20 * 100) / 100;
  const specialAllowance = Math.round(salaryGrossProrated * 0.15 * 100) / 100;
  const conveyance = Math.round(salaryGrossProrated * 0.05 * 100) / 100;
  const medical = Math.round(salaryGrossProrated * 0.05 * 100) / 100;
  const otherAllowance = Math.max(0, Math.round((salaryGrossProrated - (basicSalary + hra + specialAllowance + conveyance + medical)) * 100) / 100);

  const earningsItemized = [
    { code: "BASIC", name: "Basic Salary", amount: basicSalary, isTaxable: true },
    { code: "HRA", name: "House Rent Allowance", amount: hra, isTaxable: true },
    { code: "SPECIAL", name: "Special Allowance", amount: specialAllowance, isTaxable: true },
    { code: "CONVEYANCE", name: "Conveyance Allowance", amount: conveyance, isTaxable: false },
    { code: "MEDICAL", name: "Medical Allowance", amount: medical, isTaxable: false },
    { code: "OTHER_ALLOW", name: "Supplementary Perks", amount: otherAllowance, isTaxable: true },
    ...(reimbursements > 0 ? [{ code: "REIMBURSEMENT", name: "Approved Expense Reimbursements", amount: reimbursements, isTaxable: false }] : []),
  ];

  // Statutory Calculations
  const pfCalc = employee.pfEligible !== false
    ? calculateStatutoryEPF(basicSalary, false)
    : { employeePf: 0, epfEmployer: 0, eps: 0, edli: 0, adminCharges: 0, totalEmployerCost: 0 };

  const esiCalc = employee.esiEligible !== false
    ? calculateStatutoryESI(totalEarnedGross)
    : { isEligible: false, employeeEsi: 0, employerEsi: 0, totalCost: 0 };

  const ptAmount = employee.ptEligible !== false && attendance.payableDays > 0
    ? calculateProfessionalTax(totalEarnedGross, employee.state || "MH", periodMonth, options?.statutoryRules)
    : 0;

  // Tax Withholding (TDS) Calculation
  // Annualization logic:
  // 1. If priorGrossEarned is provided (authoritative YTD gross from prior completed payslips):
  //    annualProjectedGross = priorGrossEarned + totalEarnedGross + (baseMonthlyCtc * futurePeriods)
  // 2. If employmentMonthsInFy is provided (mid-year joiner or exit):
  //    annualProjectedGross = (annualCtc * activeMonths / 12) or (baseMonthlyCtc * activeMonths)
  // 3. If exact annualCtc is specified on the employee profile:
  //    annualProjectedGross = Number(employee.annualCtc)
  // 4. Otherwise project 12 months from earned gross
  let annualProjectedGross: number;
  if (options?.priorGrossEarned !== undefined) {
    const futurePeriods = Math.max(0, (options.remainingPeriods ?? 1) - 1);
    annualProjectedGross = new Decimal(options.priorGrossEarned)
      .plus(totalEarnedGross)
      .plus(new Decimal(baseMonthlyCtc).times(futurePeriods))
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
      .toNumber();
  } else if (options?.employmentMonthsInFy !== undefined) {
    const activeMonths = Math.max(1, Math.min(12, options.employmentMonthsInFy));
    if (employee.annualCtc) {
      annualProjectedGross = new Decimal(employee.annualCtc).times(activeMonths).dividedBy(12).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
    } else {
      annualProjectedGross = new Decimal(baseMonthlyCtc).times(activeMonths).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
    }
  } else if (employee.annualCtc) {
    annualProjectedGross = Number(employee.annualCtc);
  } else {
    annualProjectedGross = new Decimal(totalEarnedGross).times(12).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  }

  const taxResult = employee.tdsEligible !== false
    ? calculateAnnualTDS(
        annualProjectedGross,
        (employee.taxRegime as any) || "new",
        options?.declarations,
        {
          isResident: employee.isResident !== false,
          statutoryRules: options?.statutoryRules,
          periodMonth,
          periodYear: options?.periodYear,
          tdsAlreadyDeducted: options?.tdsAlreadyDeducted,
          isFinalPeriod: options?.isFinalPeriod,
          remainingPeriods: options?.remainingPeriods,
          redistributeRemaining: options?.redistributeRemaining,
        }
      )
    : calculateAnnualTDS(annualProjectedGross, "new", undefined, { isResident: true });

  const monthlyTds = employee.tdsEligible !== false ? taxResult.monthlyTdsDeduction : 0;

  const totalDeductions = Math.round((pfCalc.employeePf + esiCalc.employeeEsi + ptAmount + monthlyTds) * 100) / 100;
  const netPay = Math.max(0, Math.round((totalEarnedGross - totalDeductions) * 100) / 100);

  const deductionsItemized = [
    { code: "PF", name: "Provident Fund (Employee 12%)", amount: pfCalc.employeePf, isStatutory: true },
    { code: "ESI", name: "Employee State Insurance (0.75%)", amount: esiCalc.employeeEsi, isStatutory: true },
    { code: "PT", name: "Professional Tax", amount: ptAmount, isStatutory: true },
    { code: "TDS", name: "Income Tax (Section 392 TDS)", amount: monthlyTds, isStatutory: true },
  ];

  // Gratuity Accrual (15/26 days per annum)
  const gratuityMonthlyAccrual = Math.round(((15 * basicSalary) / 26 / 12) * 100) / 100;

  return {
    baseMonthlyCtc,
    prorationFactor: Math.round(proration * 100) / 100,
    totalWorkingDays: attendance.totalWorkingDays,
    payableDays: attendance.payableDays,
    lossOfPayDays: attendance.lossOfPayDays,
    presentDays: attendance.presentDays,
    halfDays: attendance.halfDays,
    approvedLeaveDays: attendance.approvedLeaveDays,
    earnings: {
      basicSalary,
      hra,
      specialAllowance,
      conveyance,
      medical,
      otherAllowance,
      reimbursements,
      totalGross: totalEarnedGross,
      itemized: earningsItemized,
    },
    deductions: {
      providentFund: pfCalc.employeePf,
      pfEmployerMatch: pfCalc.epfEmployer,
      esi: esiCalc.employeeEsi,
      esiEmployerMatch: esiCalc.employerEsi,
      professionalTax: ptAmount,
      tds: monthlyTds,
      otherDeductions: 0,
      totalDeductions,
      itemized: deductionsItemized,
    },
    employerContributions: {
      epf: pfCalc.epfEmployer,
      eps: pfCalc.eps,
      edli: pfCalc.edli,
      esiEmployer: esiCalc.employerEsi,
      gratuityAccrual: gratuityMonthlyAccrual,
      totalEmployerCost: Math.round((pfCalc.totalEmployerCost + esiCalc.employerEsi + gratuityMonthlyAccrual) * 100) / 100,
    },
    taxation: taxResult,
    netPay,
    currency,
    currencySymbol,
  };
}
