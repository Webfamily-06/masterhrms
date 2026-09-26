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
  baseMonthlyCtc: number;
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
    rebate87A: number;
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

// -------------------------------------------------------------
// 3. INCOME-TAX ACT, 2025 SECTION 392 WITHHOLDING TAX (TDS) ENGINE
// -------------------------------------------------------------
export function calculateAnnualTDS(
  projectedAnnualGross: number,
  regime: "new" | "old" = "new",
  declarations?: Partial<TaxDeclarationContext>
) {
  let standardDeduction = 0;
  let section80C = 0;
  let section80D = 0;
  let section24b = 0;
  let hraExemption = 0;
  let otherIncome = declarations?.otherIncome || 0;

  let totalTaxableIncome = projectedAnnualGross + otherIncome;

  if (regime === "new") {
    // Under Income-tax Act, 2025 / Budget 2025-26: Standard deduction is ₹75,000
    standardDeduction = 75000;
    totalTaxableIncome = Math.max(0, totalTaxableIncome - standardDeduction);

    // New Tax Slabs (FY 2025-26 & 2026-27 under ITA 2025 Sec 392):
    // 0 - 3,00,000 : 0%
    // 3,00,001 - 7,00,000 : 5%
    // 7,00,001 - 10,00,000 : 10%
    // 10,00,001 - 12,00,000 : 15%
    // 12,00,001 - 15,00,000 : 20%
    // > 15,00,000 : 30%

    let rawTax = 0;
    if (totalTaxableIncome > 1500000) {
      rawTax += (totalTaxableIncome - 1500000) * 0.30;
      rawTax += 300000 * 0.20; // 12L-15L = 60,000
      rawTax += 200000 * 0.15; // 10L-12L = 30,000
      rawTax += 300000 * 0.10; // 7L-10L = 30,000
      rawTax += 400000 * 0.05; // 3L-7L = 20,000
    } else if (totalTaxableIncome > 1200000) {
      rawTax += (totalTaxableIncome - 1200000) * 0.20;
      rawTax += 200000 * 0.15;
      rawTax += 300000 * 0.10;
      rawTax += 400000 * 0.05;
    } else if (totalTaxableIncome > 1000000) {
      rawTax += (totalTaxableIncome - 1000000) * 0.15;
      rawTax += 300000 * 0.10;
      rawTax += 400000 * 0.05;
    } else if (totalTaxableIncome > 700000) {
      rawTax += (totalTaxableIncome - 700000) * 0.10;
      rawTax += 400000 * 0.05;
    } else if (totalTaxableIncome > 300000) {
      rawTax += (totalTaxableIncome - 300000) * 0.05;
    }

    // Section 87A Rebate: Under New Regime, full tax rebate up to ₹7,00,000 taxable income
    let rebate87A = 0;
    if (totalTaxableIncome <= 700000) {
      rebate87A = rawTax;
      rawTax = 0;
    }

    const cess = Math.round(rawTax * 0.04 * 100) / 100;
    const totalAnnualTds = Math.round((rawTax + cess) * 100) / 100;
    const monthlyTds = Math.round((totalAnnualTds / 12) * 100) / 100;

    return {
      annualProjectedGross: projectedAnnualGross,
      taxRegime: "new" as const,
      standardDeduction,
      section80CDeduction: 0,
      section80DDeduction: 0,
      section24bDeduction: 0,
      hraExemption: 0,
      netTaxableIncome: totalTaxableIncome,
      annualTaxCalculated: Math.round(rawTax * 100) / 100,
      rebate87A,
      netTaxAfterRebate: rawTax,
      cessAmount: cess,
      totalAnnualTds,
      monthlyTdsDeduction: monthlyTds,
    };
  } else {
    // Old Tax Regime
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
    totalTaxableIncome = Math.max(0, totalTaxableIncome - totalOldDeductions);

    // Old Slabs:
    // 0 - 2.5L: 0%
    // 2.5L - 5L: 5%
    // 5L - 10L: 20%
    // > 10L: 30%
    let rawTax = 0;
    if (totalTaxableIncome > 1000000) {
      rawTax += (totalTaxableIncome - 1000000) * 0.30;
      rawTax += 500000 * 0.20; // 1,00,000
      rawTax += 250000 * 0.05; // 12,500
    } else if (totalTaxableIncome > 500000) {
      rawTax += (totalTaxableIncome - 500000) * 0.20;
      rawTax += 250000 * 0.05;
    } else if (totalTaxableIncome > 250000) {
      rawTax += (totalTaxableIncome - 250000) * 0.05;
    }

    let rebate87A = 0;
    if (totalTaxableIncome <= 500000) {
      rebate87A = rawTax;
      rawTax = 0;
    }

    const cess = Math.round(rawTax * 0.04 * 100) / 100;
    const totalAnnualTds = Math.round((rawTax + cess) * 100) / 100;
    const monthlyTds = Math.round((totalAnnualTds / 12) * 100) / 100;

    return {
      annualProjectedGross: projectedAnnualGross,
      taxRegime: "old" as const,
      standardDeduction,
      section80CDeduction: section80C,
      section80DDeduction: section80D,
      section24bDeduction: section24b,
      hraExemption,
      netTaxableIncome: totalTaxableIncome,
      annualTaxCalculated: Math.round(rawTax * 100) / 100,
      rebate87A,
      netTaxAfterRebate: rawTax,
      cessAmount: cess,
      totalAnnualTds,
      monthlyTdsDeduction: monthlyTds,
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
  const annualProjectedGross = totalEarnedGross * 12;
  const taxResult = employee.tdsEligible !== false
    ? calculateAnnualTDS(annualProjectedGross, (employee.taxRegime as any) || "new", options?.declarations)
    : calculateAnnualTDS(annualProjectedGross, "new");

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
