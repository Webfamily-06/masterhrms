import { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";

export interface TaxCalculationInput {
  annualGrossSalary: number;
  basicSalaryAnnual: number;
  hraReceivedAnnual: number;
  regime: "new" | "old";
  isMetro?: boolean;
  houseRentPaidAnnual?: number;
  landlordPan?: string | null;
  section80C?: number;
  section80D?: number;
  section80G?: number;
  homeLoanInterest?: number;
  otherIncome?: number;
}

export interface TaxBreakdownResult {
  regime: "new" | "old";
  grossSalary: number;
  standardDeduction: number;
  hraExemption: number;
  chapterVIA_Deductions: number;
  homeLoanDeduction: number;
  totalDeductions: number;
  netTaxableIncome: number;
  taxBeforeRebate: number;
  rebate87A: number;
  taxAfterRebate: number;
  cess: number; // 4% Health & Education Cess
  totalAnnualTax: number;
  monthlyTds: number;
  slabBreakdown: Array<{ slab: string; rate: string; taxableAmount: number; tax: number }>;
  landlordPanWarning?: string;
}

export interface DualRegimeComparisonResult {
  newRegime: TaxBreakdownResult;
  oldRegime: TaxBreakdownResult;
  recommendedRegime: "new" | "old";
  annualTaxSavings: number;
}

export class TdsCalculatorService {
  private prisma: PrismaClient;

  // New Regime constants (Finance Act FY 2024-25 / FY 2025-26 / FY 2026-27)
  public static readonly NEW_STANDARD_DEDUCTION = 75000;
  public static readonly NEW_REBATE_87A_THRESHOLD = 700000;

  // Old Regime constants
  public static readonly OLD_STANDARD_DEDUCTION = 50000;
  public static readonly OLD_REBATE_87A_THRESHOLD = 500000;
  public static readonly MAX_80C_LIMIT = 150000;
  public static readonly MAX_80D_LIMIT = 75000;
  public static readonly MAX_HOME_LOAN_INTEREST_LIMIT = 200000;
  public static readonly RENT_PAN_THRESHOLD = 100000;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Load active, versioned statutory rule pack for TDS / Section 115BAC
   * Sourced directly from `statutory_rules` database table with legal provenance
   */
  async getEffectiveStatutoryRule(tenantId: string, financialYear?: string) {
    const rule = await this.prisma.statutoryRule.findFirst({
      where: {
        tenantId,
        ruleType: { in: ["TDS_ITA2025", "TDS_115BAC"] },
        isActive: true,
      },
      orderBy: { version: "desc" },
    });

    if (rule) {
      return {
        ruleId: rule.id,
        ruleType: rule.ruleType,
        version: rule.version,
        sourceAuthority: rule.sourceAuthority,
        notificationRef: rule.notificationRef,
        effectiveFrom: rule.effectiveFrom,
        effectiveTo: rule.effectiveTo,
        isVerified: rule.isVerified,
        config: rule.configJson as any,
      };
    }

    // Default verified statutory fallback
    return {
      ruleId: "DEFAULT_ITA_RULE",
      ruleType: "TDS_ITA2025",
      version: 1,
      sourceAuthority: "Central Board of Direct Taxes (CBDT) / Ministry of Finance",
      notificationRef: "Finance Act 2024 / Finance Act 2025 / Section 115BAC",
      effectiveFrom: new Date("2024-04-01"),
      effectiveTo: null,
      isVerified: true,
      config: {
        financialYear: financialYear || "2026-2027",
        cessRate: 0.04,
        newRegime: {
          standardDeduction: TdsCalculatorService.NEW_STANDARD_DEDUCTION,
          section87ARebateThreshold: TdsCalculatorService.NEW_REBATE_87A_THRESHOLD,
        },
        oldRegime: {
          standardDeduction: TdsCalculatorService.OLD_STANDARD_DEDUCTION,
          section87ARebateThreshold: TdsCalculatorService.OLD_REBATE_87A_THRESHOLD,
          section80CLimit: TdsCalculatorService.MAX_80C_LIMIT,
          section80DLimit: TdsCalculatorService.MAX_80D_LIMIT,
          section24bLimit: TdsCalculatorService.MAX_HOME_LOAN_INTEREST_LIMIT,
        },
      },
    };
  }

  /**
   * Compute HRA Exemption under Section 10(13A) of Income Tax Act
   * Least of:
   * 1. Actual HRA received
   * 2. Rent paid minus 10% of Basic salary
   * 3. 50% of Basic salary (if Metro: Delhi, Mumbai, Kolkata, Chennai) or 40% (Non-Metro)
   */
  static calculateHraExemption(
    actualHra: number,
    basicSalary: number,
    rentPaid: number,
    isMetro: boolean = false
  ): number {
    if (rentPaid <= 0 || actualHra <= 0 || basicSalary <= 0) return 0;

    const excessRentOver10Pct = Math.max(0, rentPaid - basicSalary * 0.10);
    const basicLimit = isMetro ? basicSalary * 0.50 : basicSalary * 0.40;

    return Math.max(0, Math.min(actualHra, excessRentOver10Pct, basicLimit));
  }

  /**
   * Calculate Tax under Section 115BAC (New Tax Regime)
   */
  static computeNewRegime(input: TaxCalculationInput): TaxBreakdownResult {
    const gross = input.annualGrossSalary + (input.otherIncome || 0);
    const stdDeduction = TdsCalculatorService.NEW_STANDARD_DEDUCTION;
    const netTaxableIncome = Math.max(0, gross - stdDeduction);

    let tax = 0;
    const slabs: TaxBreakdownResult["slabBreakdown"] = [];

    // Slabs:
    // 0 - 3,00,000: Nil
    // 3,00,001 - 6,00,000: 5%
    // 6,00,001 - 9,00,000: 10%
    // 9,00,001 - 12,00,000: 15%
    // 12,00,001 - 15,00,000: 20%
    // Above 15,00,000: 30%

    let rem = netTaxableIncome;

    // Slab 1: Up to 3,00,000 (Nil)
    const s1 = Math.min(rem, 300000);
    slabs.push({ slab: "₹0 – ₹3,00,000", rate: "0%", taxableAmount: s1, tax: 0 });
    rem = Math.max(0, rem - 300000);

    // Slab 2: 3,00,001 - 6,00,000 (5%)
    const s2 = Math.min(rem, 300000);
    const tax2 = s2 * 0.05;
    slabs.push({ slab: "₹3,00,001 – ₹6,00,000", rate: "5%", taxableAmount: s2, tax: tax2 });
    tax += tax2;
    rem = Math.max(0, rem - 300000);

    // Slab 3: 6,00,001 - 9,00,000 (10%)
    const s3 = Math.min(rem, 300000);
    const tax3 = s3 * 0.10;
    slabs.push({ slab: "₹6,00,001 – ₹9,00,000", rate: "10%", taxableAmount: s3, tax: tax3 });
    tax += tax3;
    rem = Math.max(0, rem - 300000);

    // Slab 4: 9,00,001 - 12,00,000 (15%)
    const s4 = Math.min(rem, 300000);
    const tax4 = s4 * 0.15;
    slabs.push({ slab: "₹9,00,001 – ₹12,00,000", rate: "15%", taxableAmount: s4, tax: tax4 });
    tax += tax4;
    rem = Math.max(0, rem - 300000);

    // Slab 5: 12,00,001 - 15,00,000 (20%)
    const s5 = Math.min(rem, 300000);
    const tax5 = s5 * 0.20;
    slabs.push({ slab: "₹12,00,001 – ₹15,00,000", rate: "20%", taxableAmount: s5, tax: tax5 });
    tax += tax5;
    rem = Math.max(0, rem - 300000);

    // Slab 6: Above 15,00,000 (30%)
    if (rem > 0) {
      const tax6 = rem * 0.30;
      slabs.push({ slab: "Above ₹15,00,000", rate: "30%", taxableAmount: rem, tax: tax6 });
      tax += tax6;
    }

    // Section 87A Rebate: Full tax rebate if taxable income <= ₹7,00,000
    let rebate = 0;
    if (netTaxableIncome <= TdsCalculatorService.NEW_REBATE_87A_THRESHOLD) {
      rebate = tax;
    }
    const taxAfterRebate = Math.max(0, tax - rebate);
    const cess = Math.round(taxAfterRebate * 0.04);
    const totalTax = taxAfterRebate + cess;

    return {
      regime: "new",
      grossSalary: gross,
      standardDeduction: stdDeduction,
      hraExemption: 0, // Not allowed under New Regime
      chapterVIA_Deductions: 0, // Not allowed under New Regime
      homeLoanDeduction: 0,
      totalDeductions: stdDeduction,
      netTaxableIncome,
      taxBeforeRebate: Math.round(tax),
      rebate87A: Math.round(rebate),
      taxAfterRebate: Math.round(taxAfterRebate),
      cess,
      totalAnnualTax: Math.round(totalTax),
      monthlyTds: Math.round(totalTax / 12),
      slabBreakdown: slabs,
    };
  }

  /**
   * Calculate Tax under Old Tax Regime with itemized Chapter VI-A deductions & HRA exemption
   */
  static computeOldRegime(input: TaxCalculationInput): TaxBreakdownResult {
    const gross = input.annualGrossSalary + (input.otherIncome || 0);
    const stdDeduction = TdsCalculatorService.OLD_STANDARD_DEDUCTION;

    // HRA Exemption
    const rentPaid = input.houseRentPaidAnnual || 0;
    let hraExemption = 0;
    let landlordPanWarning: string | undefined;

    if (rentPaid > 0) {
      if (rentPaid > TdsCalculatorService.RENT_PAN_THRESHOLD && !input.landlordPan) {
        landlordPanWarning = "Annual rent exceeds ₹1,00,000. Landlord PAN is required under CBDT rules.";
      }
      hraExemption = TdsCalculatorService.calculateHraExemption(
        input.hraReceivedAnnual,
        input.basicSalaryAnnual,
        rentPaid,
        input.isMetro || false
      );
    }

    // Chapter VI-A Deductions
    const c80C = Math.min(input.section80C || 0, TdsCalculatorService.MAX_80C_LIMIT);
    const c80D = Math.min(input.section80D || 0, TdsCalculatorService.MAX_80D_LIMIT);
    const c80G = Math.max(0, input.section80G || 0);
    const homeLoan = Math.min(input.homeLoanInterest || 0, TdsCalculatorService.MAX_HOME_LOAN_INTEREST_LIMIT);

    const chapterVIA = c80C + c80D + c80G;
    const totalDeductions = stdDeduction + hraExemption + chapterVIA + homeLoan;
    const netTaxableIncome = Math.max(0, gross - totalDeductions);

    let tax = 0;
    const slabs: TaxBreakdownResult["slabBreakdown"] = [];

    // Old Slabs:
    // 0 - 2,50,000: Nil
    // 2,50,001 - 5,00,000: 5%
    // 5,00,001 - 10,00,000: 20%
    // Above 10,00,000: 30%

    let rem = netTaxableIncome;

    // Slab 1: Up to 2,50,000
    const s1 = Math.min(rem, 250000);
    slabs.push({ slab: "₹0 – ₹2,50,000", rate: "0%", taxableAmount: s1, tax: 0 });
    rem = Math.max(0, rem - 250000);

    // Slab 2: 2,50,001 - 5,00,000 (5%)
    const s2 = Math.min(rem, 250000);
    const tax2 = s2 * 0.05;
    slabs.push({ slab: "₹2,50,001 – ₹5,00,000", rate: "5%", taxableAmount: s2, tax: tax2 });
    tax += tax2;
    rem = Math.max(0, rem - 250000);

    // Slab 3: 5,00,001 - 10,00,000 (20%)
    const s3 = Math.min(rem, 500000);
    const tax3 = s3 * 0.20;
    slabs.push({ slab: "₹5,00,001 – ₹10,00,000", rate: "20%", taxableAmount: s3, tax: tax3 });
    tax += tax3;
    rem = Math.max(0, rem - 500000);

    // Slab 4: Above 10,00,000 (30%)
    if (rem > 0) {
      const tax4 = rem * 0.30;
      slabs.push({ slab: "Above ₹10,00,000", rate: "30%", taxableAmount: rem, tax: tax4 });
      tax += tax4;
    }

    // Section 87A Rebate: Up to ₹12,500 if taxable income <= ₹5,00,000
    let rebate = 0;
    if (netTaxableIncome <= TdsCalculatorService.OLD_REBATE_87A_THRESHOLD) {
      rebate = Math.min(tax, 12500);
    }
    const taxAfterRebate = Math.max(0, tax - rebate);
    const cess = Math.round(taxAfterRebate * 0.04);
    const totalTax = taxAfterRebate + cess;

    return {
      regime: "old",
      grossSalary: gross,
      standardDeduction: stdDeduction,
      hraExemption: Math.round(hraExemption),
      chapterVIA_Deductions: Math.round(chapterVIA),
      homeLoanDeduction: Math.round(homeLoan),
      totalDeductions: Math.round(totalDeductions),
      netTaxableIncome: Math.round(netTaxableIncome),
      taxBeforeRebate: Math.round(tax),
      rebate87A: Math.round(rebate),
      taxAfterRebate: Math.round(taxAfterRebate),
      cess,
      totalAnnualTax: Math.round(totalTax),
      monthlyTds: Math.round(totalTax / 12),
      slabBreakdown: slabs,
      landlordPanWarning,
    };
  }

  /**
   * Compare Old vs New Regime side-by-side
   */
  static compareRegimes(input: TaxCalculationInput): DualRegimeComparisonResult {
    const newRes = TdsCalculatorService.computeNewRegime(input);
    const oldRes = TdsCalculatorService.computeOldRegime(input);

    const recommended = newRes.totalAnnualTax <= oldRes.totalAnnualTax ? "new" : "old";
    const savings = Math.abs(oldRes.totalAnnualTax - newRes.totalAnnualTax);

    return {
      newRegime: newRes,
      oldRegime: oldRes,
      recommendedRegime: recommended,
      annualTaxSavings: savings,
    };
  }

  /**
   * Calculate employee's active monthly TDS for a payroll run
   */
  async calculateMonthlyTdsForEmployee(
    tenantId: string,
    employeeId: string,
    financialYear: string,
    periodMonth: number
  ): Promise<{
    monthlyTds: number;
    regime: string;
    isLocked: boolean;
    annualProjectedTax: number;
    ruleVersion?: number;
    sourceAuthority?: string | null;
    notificationRef?: string | null;
    effectiveFrom?: Date | null;
  }> {
    const declaration = await this.prisma.employeeTaxDeclaration.findUnique({
      where: {
        tenantId_employeeId_financialYear: {
          tenantId,
          employeeId,
          financialYear,
        },
      },
    });

    const emp = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      include: {
        salaryAssignments: {
          where: { isCurrent: true },
          take: 1,
        },
      },
    });

    const monthlySalary = emp?.salaryAssignments[0]?.ctcMonthly
      ? Number(emp.salaryAssignments[0].ctcMonthly)
      : Number(emp?.salary || 35000);

    const annualGross = monthlySalary * 12;
    const basicAnnual = annualGross * 0.50; // standard 50%
    const hraAnnual = annualGross * 0.20;   // standard 20%

    // PO-DEC-05: Default to New Regime if not elected
    const regime = declaration ? (declaration.taxRegime === "old" ? "old" : "new") : "new";

    const calcInput: TaxCalculationInput = {
      annualGrossSalary: annualGross,
      basicSalaryAnnual: basicAnnual,
      hraReceivedAnnual: hraAnnual,
      regime,
      houseRentPaidAnnual: declaration ? Number(declaration.houseRentPaid) : 0,
      landlordPan: declaration?.landlordPan,
      section80C: declaration ? Number(declaration.section80C) : 0,
      section80D: declaration ? Number(declaration.section80D) : 0,
      section80G: declaration ? Number(declaration.section80G) : 0,
      homeLoanInterest: declaration ? Number(declaration.homeLoanInterest) : 0,
      otherIncome: declaration ? Number(declaration.otherIncome) : 0,
    };

    const result = regime === "old"
      ? TdsCalculatorService.computeOldRegime(calcInput)
      : TdsCalculatorService.computeNewRegime(calcInput);

    // Remaining months calculation (Indian Fiscal Year starts in April = Month 4)
    // Month 4 (April) has 12 remaining months; Month 3 (March) has 1 remaining month
    let remainingMonths = 12;
    if (periodMonth >= 4 && periodMonth <= 12) {
      remainingMonths = 12 - (periodMonth - 4);
    } else if (periodMonth >= 1 && periodMonth <= 3) {
      remainingMonths = 3 - (periodMonth - 1);
    }
    remainingMonths = Math.max(1, remainingMonths);

    const monthlyTds = Math.round(result.totalAnnualTax / 12);

    const statRule = await this.getEffectiveStatutoryRule(tenantId, financialYear);

    return {
      monthlyTds,
      regime,
      isLocked: declaration ? declaration.isRegimeLocked : false,
      annualProjectedTax: result.totalAnnualTax,
      ruleVersion: statRule.version,
      sourceAuthority: statRule.sourceAuthority,
      notificationRef: statRule.notificationRef,
      effectiveFrom: statRule.effectiveFrom,
    };
  }

  /**
   * Lock Tax Regime upon execution of employee's first payroll run in the financial year (PO-DEC-05)
   */
  async lockRegimeOnFirstPayrollRun(
    tenantId: string,
    employeeId: string,
    financialYear: string,
    txClient?: any
  ): Promise<boolean> {
    const db = txClient || this.prisma;
    const declaration = await db.employeeTaxDeclaration.findUnique({
      where: {
        tenantId_employeeId_financialYear: {
          tenantId,
          employeeId,
          financialYear,
        },
      },
    });

    if (declaration && !declaration.isRegimeLocked) {
      await db.employeeTaxDeclaration.update({
        where: { id: declaration.id },
        data: {
          isRegimeLocked: true,
          regimeLockedAt: new Date(),
          regimeLockReason: "FIRST_PAYROLL_RUN_EXECUTED",
          updatedAt: new Date(),
        },
      });
      return true;
    }
    return false;
  }
}
