import { PrismaClient } from '@prisma/client';
import { FormulaDefinition } from './types';

export const SECTION_9A_STANDARD_FORMULAS: FormulaDefinition[] = [
  {
    code: 'BASIC_EARNED',
    name: 'Basic Earned (Prorated)',
    expression: 'BASIC_RATE * (PAYABLE_DAYS / MONTH_DAYS)',
    category: 'earning',
    scope: 'global',
    roundingDecimals: 2,
    roundingMode: 'HALF_UP',
  },
  {
    code: 'HRA_EARNED',
    name: 'House Rent Allowance Earned (Prorated)',
    expression: 'HRA_RATE * (PAYABLE_DAYS / MONTH_DAYS)',
    category: 'earning',
    scope: 'global',
    roundingDecimals: 2,
    roundingMode: 'HALF_UP',
  },
  {
    code: 'CONVEYANCE_EARNED',
    name: 'Conveyance Allowance Earned',
    expression: 'CONVEYANCE_RATE * (PAYABLE_DAYS / MONTH_DAYS)',
    category: 'earning',
    scope: 'global',
    roundingDecimals: 2,
    roundingMode: 'HALF_UP',
  },
  {
    code: 'MEDICAL_EARNED',
    name: 'Medical Allowance Earned',
    expression: 'MEDICAL_RATE * (PAYABLE_DAYS / MONTH_DAYS)',
    category: 'earning',
    scope: 'global',
    roundingDecimals: 2,
    roundingMode: 'HALF_UP',
  },
  {
    code: 'SPECIAL_EARNED',
    name: 'Special Allowance Earned',
    expression: 'SPECIAL_RATE * (PAYABLE_DAYS / MONTH_DAYS)',
    category: 'earning',
    scope: 'global',
    roundingDecimals: 2,
    roundingMode: 'HALF_UP',
  },
  {
    code: 'OTHER_EARNED',
    name: 'Other Allowances Earned',
    expression: 'OTHER_ALLOWANCES * (PAYABLE_DAYS / MONTH_DAYS)',
    category: 'earning',
    scope: 'global',
    roundingDecimals: 2,
    roundingMode: 'HALF_UP',
  },
  {
    code: 'GROSS',
    name: 'Gross Earned Wages',
    expression: 'BASIC_EARNED + HRA_EARNED + CONVEYANCE_EARNED + MEDICAL_EARNED + SPECIAL_EARNED + OTHER_EARNED',
    category: 'earning',
    scope: 'global',
    roundingDecimals: 2,
    roundingMode: 'HALF_UP',
  },
  {
    code: 'PF_WAGE',
    name: 'Provident Fund Qualifying Wage',
    expression: 'IF(PF_OVERRIDE_WAGE > 0, PF_OVERRIDE_WAGE, IF(PF_METHOD == "ACTUAL", BASIC_EARNED, MIN(BASIC_EARNED, PF_STATUTORY_CEILING)))',
    category: 'statutory',
    scope: 'global',
    roundingDecimals: 2,
    roundingMode: 'HALF_UP',
  },
  {
    code: 'EPF_EE',
    name: 'Employee Provident Fund (12%)',
    expression: 'IF(PF_ELIGIBLE, ROUND(PF_WAGE * EPF_EE_RATE, 0), 0)',
    category: 'deduction',
    scope: 'global',
    roundingDecimals: 0,
    roundingMode: 'HALF_UP',
  },
  {
    code: 'EPF_ER',
    name: 'Employer Provident Fund (3.67%)',
    expression: 'IF(PF_ELIGIBLE, ROUND(PF_WAGE * EPF_ER_RATE, 0), 0)',
    category: 'employer_contribution',
    scope: 'global',
    roundingDecimals: 0,
    roundingMode: 'HALF_UP',
  },
  {
    code: 'EPS_ER',
    name: 'Employer Pension Scheme (8.33% capped at Rs 1,250)',
    expression: 'IF(PF_ELIGIBLE, ROUND(MIN(PF_WAGE, EPS_CEILING) * EPS_RATE, 0), 0)',
    category: 'employer_contribution',
    scope: 'global',
    roundingDecimals: 0,
    roundingMode: 'HALF_UP',
  },
  {
    code: 'EDLI',
    name: 'Employees Deposit Linked Insurance (0.50%)',
    expression: 'IF(PF_ELIGIBLE, ROUND(MIN(PF_WAGE, EDLI_CEILING) * EDLI_RATE, 2), 0)',
    category: 'employer_contribution',
    scope: 'global',
    roundingDecimals: 2,
    roundingMode: 'HALF_UP',
  },
  {
    code: 'PF_ADMIN',
    name: 'EPF Admin Charges (0.50%)',
    expression: 'IF(PF_ELIGIBLE, ROUND(PF_WAGE * PF_ADMIN_RATE, 2), 0)',
    category: 'employer_contribution',
    scope: 'global',
    roundingDecimals: 2,
    roundingMode: 'HALF_UP',
  },
  {
    code: 'ESIC_WAGE',
    name: 'ESIC Qualifying Wage',
    expression: 'GROSS',
    category: 'statutory',
    scope: 'global',
    roundingDecimals: 2,
    roundingMode: 'HALF_UP',
  },
  {
    code: 'ESIC_EE',
    name: 'Employee ESIC (0.75% Ceil)',
    expression: 'IF(ESI_ELIGIBLE AND (GROSS <= ESIC_CEILING), CEIL(GROSS * ESIC_EE_RATE), 0)',
    category: 'deduction',
    scope: 'global',
    roundingDecimals: 0,
    roundingMode: 'CEIL',
  },
  {
    code: 'ESIC_ER',
    name: 'Employer ESIC (3.25% Ceil)',
    expression: 'IF(ESI_ELIGIBLE AND (GROSS <= ESIC_CEILING), CEIL(GROSS * ESIC_ER_RATE), 0)',
    category: 'employer_contribution',
    scope: 'global',
    roundingDecimals: 0,
    roundingMode: 'CEIL',
  },
  {
    code: 'PT',
    name: 'State Professional Tax',
    expression: 'IF(PT_ELIGIBLE, SLAB(PT_SLABS, GROSS), 0)',
    category: 'deduction',
    scope: 'global',
    roundingDecimals: 2,
    roundingMode: 'HALF_UP',
  },
  {
    code: 'LWF_EE',
    name: 'Employee Labour Welfare Fund',
    expression: 'IF(LWF_ELIGIBLE, LWF_EE_RATE, 0)',
    category: 'deduction',
    scope: 'global',
    roundingDecimals: 2,
    roundingMode: 'HALF_UP',
  },
  {
    code: 'LWF_ER',
    name: 'Employer Labour Welfare Fund',
    expression: 'IF(LWF_ELIGIBLE, LWF_ER_RATE, 0)',
    category: 'employer_contribution',
    scope: 'global',
    roundingDecimals: 2,
    roundingMode: 'HALF_UP',
  },
  {
    code: 'TOTAL_DEDUCTIONS',
    name: 'Total Employee Deductions',
    expression: 'EPF_EE + ESIC_EE + PT + LWF_EE + TDS + OTHER_DEDUCTIONS',
    category: 'deduction',
    scope: 'global',
    roundingDecimals: 2,
    roundingMode: 'HALF_UP',
  },
  {
    code: 'NET_PAY',
    name: 'Net Salary Payable',
    expression: 'GROSS - TOTAL_DEDUCTIONS',
    category: 'earning',
    scope: 'global',
    roundingDecimals: 2,
    roundingMode: 'HALF_UP',
  },
  {
    code: 'SERVICE_CHARGE',
    name: 'Staffing Client Service Charge',
    expression: 'ROUND(GROSS * SERVICE_CHARGE_RATE, 2)',
    category: 'billing',
    scope: 'global',
    roundingDecimals: 2,
    roundingMode: 'HALF_UP',
  },
  {
    code: 'BILLING_BASE',
    name: 'Staffing Client Billing Base (Reimbursement + Service Charge)',
    expression: 'GROSS + EPF_ER + EPS_ER + EDLI + PF_ADMIN + ESIC_ER + LWF_ER + SERVICE_CHARGE',
    category: 'billing',
    scope: 'global',
    roundingDecimals: 2,
    roundingMode: 'HALF_UP',
  },
  {
    code: 'GST',
    name: 'Goods & Services Tax (18% on Billing Base)',
    expression: 'ROUND(BILLING_BASE * GST_RATE, 2)',
    category: 'billing',
    scope: 'global',
    roundingDecimals: 2,
    roundingMode: 'HALF_UP',
  },
  {
    code: 'TOTAL_BILLING',
    name: 'Total Client Invoice Amount',
    expression: 'BILLING_BASE + GST',
    category: 'billing',
    scope: 'global',
    roundingDecimals: 2,
    roundingMode: 'HALF_UP',
  },
];

export async function seedPayrollFormulas(prisma: PrismaClient, tenantId: string): Promise<void> {
  for (const f of SECTION_9A_STANDARD_FORMULAS) {
    const existing = await prisma.payrollFormula.findFirst({
      where: {
        tenantId,
        componentCode: f.code,
        scope: f.scope,
      },
    });

    const roundingStr =
      f.roundingMode === 'CEIL'
        ? 'round_up'
        : f.roundingMode === 'FLOOR'
        ? 'round_down'
        : f.roundingDecimals === 0
        ? 'round_nearest'
        : 'exact_2dec';

    if (existing) {
      await prisma.payrollFormula.update({
        where: { id: existing.id },
        data: {
          name: f.name,
          expression: f.expression,
          type: f.category || 'earning',
          rounding: roundingStr,
          isActive: true,
        },
      });
    } else {
      await prisma.payrollFormula.create({
        data: {
          tenantId,
          componentCode: f.code,
          name: f.name,
          expression: f.expression,
          type: f.category || 'earning',
          scope: f.scope,
          rounding: roundingStr,
          isActive: true,
          version: 1,
        },
      });
    }
  }
}
