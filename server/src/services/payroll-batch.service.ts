import { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';
import { FormulaDAG, FormulaDefinition } from './formula-engine';
import { PayrollAttendanceService, AttendanceWindowOptions } from './payroll-attendance.service';
import { TdsCalculatorService } from './tds-calculator.service';

export interface PreflightIssue {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  field: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface PreflightReport {
  passed: boolean;
  totalEmployees: number;
  errorCount: number;
  warningCount: number;
  issues: PreflightIssue[];
}

export interface BatchCalculationOptions extends AttendanceWindowOptions {
  tenantId: string;
  payrollRunId?: string;
  employeeIds?: string[];
  clientId?: string;
  establishmentId?: string;
  lopOverrides?: Record<string, { lopDays: number; reason: string }>;
  chunkSize?: number;
}

export interface BatchEmployeeResult {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  payableDays: number;
  lopDays: number;
  monthDays: number;
  calculatedValues: Record<string, string>;
  grossEarned: Decimal;
  totalDeductions: Decimal;
  netPay: Decimal;
  employerTotal: Decimal;
  billingBase?: Decimal;
  gst?: Decimal;
  totalBilling?: Decimal;
  traceCount: number;
}

export interface BatchCalculationResult {
  payrollRunId: string;
  periodMonth: number;
  periodYear: number;
  processedCount: number;
  totalGross: Decimal;
  totalNet: Decimal;
  totalDeductions: Decimal;
  totalEmployerContributions: Decimal;
  totalBillingBase: Decimal;
  totalGst: Decimal;
  totalClientBilling: Decimal;
  employeeResults: BatchEmployeeResult[];
  preflightReport: PreflightReport;
}

export class PayrollBatchService {
  private prisma: PrismaClient;
  private attendanceService: PayrollAttendanceService;
  private tdsCalculatorService: TdsCalculatorService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.attendanceService = new PayrollAttendanceService(prisma);
    this.tdsCalculatorService = new TdsCalculatorService(prisma);
  }

  /**
   * Pre-flight diagnostic check prior to running or finalizing payroll
   */
  async runPreflight(tenantId: string, employeeIds?: string[]): Promise<PreflightReport> {
    const issues: PreflightIssue[] = [];

    const whereClause: any = { tenantId, status: 'active' };
    if (employeeIds && employeeIds.length > 0) {
      whereClause.id = { in: employeeIds };
    }

    const employees = await this.prisma.employee.findMany({
      where: whereClause,
      include: {
        salaryAssignments: {
          where: { isCurrent: true },
          include: {
            structure: {
              include: { items: { include: { component: true } } },
            },
          },
        },
      },
    });

    for (const emp of employees) {
      const name = `${emp.firstName} ${emp.lastName || ''}`.trim();

      // Check 1: Active Salary Structure Assignment
      if (!emp.salaryAssignments || emp.salaryAssignments.length === 0) {
        issues.push({
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          employeeName: name,
          field: 'salaryStructure',
          severity: 'error',
          message: 'Missing active salary structure assignment.',
        });
      }

      // Check 2: Bank details
      if (!emp.bankAccount || !emp.bankIfsc) {
        issues.push({
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          employeeName: name,
          field: 'bankDetails',
          severity: 'warning',
          message: 'Missing bank account number or IFSC code.',
        });
      }

      // Check 3: PF eligible but missing UAN
      if (emp.pfEligible && !emp.uan) {
        issues.push({
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          employeeName: name,
          field: 'uan',
          severity: 'warning',
          message: 'Employee is marked PF eligible but UAN is missing.',
        });
      }

      // Check 4: ESI eligible but missing ESI number
      if (emp.esiEligible && !emp.esiNumber) {
        issues.push({
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          employeeName: name,
          field: 'esiNumber',
          severity: 'warning',
          message: 'Employee is marked ESI eligible but ESIC number is missing.',
        });
      }

      // Check 5: PAN missing (TDS 20% higher rate warning under Section 206AA)
      if (!emp.pan) {
        issues.push({
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          employeeName: name,
          field: 'pan',
          severity: 'warning',
          message: 'Missing PAN card (Higher 20% TDS withholding applicable under Sec 206AA).',
        });
      }
    }

    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;

    return {
      passed: errorCount === 0,
      totalEmployees: employees.length,
      errorCount,
      warningCount,
      issues,
    };
  }

  /**
   * Run full batch calculation using safe Formula DAG engine with Decimal arithmetic
   */
  async processBatch(options: BatchCalculationOptions): Promise<BatchCalculationResult> {
    const {
      tenantId,
      periodMonth,
      periodYear,
      cutoffStartDay = 1,
      cutoffEndDay = 0,
      lopOverrides,
      chunkSize = 50,
    } = options;

    // 1. Run Pre-flight Checks
    const preflightReport = await this.runPreflight(tenantId, options.employeeIds);
    if (!preflightReport.passed) {
      const errorMsg = preflightReport.issues
        .filter((i) => i.severity === 'error')
        .map((i) => `${i.employeeCode}: ${i.message}`)
        .join('; ');
      throw new Error(`Payroll preflight validation failed: ${errorMsg}`);
    }

    // 2. Fetch or Create PayrollRun
    let payrollRun: any;
    if (options.payrollRunId) {
      payrollRun = await this.prisma.payrollRun.findUnique({
        where: { id: options.payrollRunId },
      });
      if (!payrollRun) throw new Error(`PayrollRun ${options.payrollRunId} not found`);
      if (payrollRun.approvalStatus === 'finalized' || payrollRun.status === 'paid') {
        throw new Error('Cannot recalculate a finalized or paid payroll run.');
      }
    } else {
      payrollRun = await this.prisma.payrollRun.findFirst({
        where: { tenantId, periodMonth, periodYear },
      });

      if (payrollRun) {
        if (payrollRun.approvalStatus === 'finalized' || payrollRun.status === 'paid') {
          throw new Error('Cannot recalculate a finalized or paid payroll run.');
        }
        await this.prisma.$transaction([
          this.prisma.payslip.deleteMany({ where: { payrollRunId: payrollRun.id } }),
          this.prisma.payrollSnapshot.deleteMany({ where: { payrollRunId: payrollRun.id } }),
          this.prisma.payrollExecutionTrace.deleteMany({ where: { payrollRunId: payrollRun.id } }),
          this.prisma.expenseClaim.updateMany({
            where: { payrollRunId: payrollRun.id },
            data: {
              status: "finance_approved",
              payrollRunId: null,
              reimbursedAt: null,
              payrollMonth: null,
            },
          }),
        ]);
      } else {
        payrollRun = await this.prisma.payrollRun.create({
          data: {
            tenantId,
            periodMonth,
            periodYear,
            status: 'processing',
            approvalStatus: 'calculated',
          },
        });
      }
    }

    // 3. Compute Attendance & LOP for Tenant
    const attendanceMap = await this.attendanceService.computeTenantAttendance(
      tenantId,
      { periodMonth, periodYear, cutoffStartDay, cutoffEndDay },
      lopOverrides
    );

    // 4. Fetch all active Statutory Rules for Tenant
    const statutoryRules = await this.prisma.statutoryRule.findMany({
      where: { tenantId, isActive: true },
    });

    // 5. Fetch all Section 9A Payroll Formulas for Tenant
    const dbFormulas = await this.prisma.payrollFormula.findMany({
      where: { tenantId, isActive: true },
    });

    const formulaDefinitions: FormulaDefinition[] = dbFormulas.map((f) => ({
      id: f.id,
      code: f.componentCode,
      name: f.name,
      expression: f.expression,
      category: f.type as any,
      scope: f.scope as any,
      scopeId: f.clientId || f.structureId || f.stateCode || null,
      stateCode: f.stateCode,
      clientId: f.clientId,
      structureId: f.structureId,
      version: f.version,
      rounding: f.rounding as any,
      roundingDecimals: f.rounding === 'exact_2dec' ? 2 : 0,
      roundingMode: f.rounding === 'round_up' ? 'CEIL' : f.rounding === 'round_down' ? 'FLOOR' : 'HALF_UP',
    }));

    // 6. Fetch Employees to calculate
    const employeeWhere: any = { tenantId, status: 'active' };
    if (options.employeeIds && options.employeeIds.length > 0) {
      employeeWhere.id = { in: options.employeeIds };
    }
    if (options.clientId) {
      employeeWhere.clientId = options.clientId;
    }

    const employees = await this.prisma.employee.findMany({
      where: employeeWhere,
      include: {
        salaryAssignments: {
          where: { isCurrent: true },
          include: {
            structure: {
              include: { items: { include: { component: true } } },
            },
          },
          take: 1,
        },
        client: true,
      },
    });

    let totalGross = new Decimal(0);
    let totalNet = new Decimal(0);
    let totalDeductions = new Decimal(0);
    let totalEmployerContributions = new Decimal(0);
    let totalBillingBase = new Decimal(0);
    let totalGst = new Decimal(0);
    let totalClientBilling = new Decimal(0);

    const employeeResults: BatchEmployeeResult[] = [];

    // Helper to extract rule value
    const getRuleParam = (ruleType: string, stateCode?: string | null): any => {
      // First check state-specific rule
      if (stateCode) {
        const stateRule = statutoryRules.find((r) => r.ruleType.toLowerCase() === ruleType.toLowerCase() && r.stateCode === stateCode);
        if (stateRule) return stateRule.configJson;
      }
      // Fallback to central/all-state rule
      const centralRule = statutoryRules.find((r) => r.ruleType.toLowerCase() === ruleType.toLowerCase() && (!r.stateCode || r.stateCode === 'ALL'));
      return centralRule ? centralRule.configJson : null;
    };

    // Financial Year for statutory calculations
    const currentFY = periodMonth >= 4
      ? `${periodYear}-${periodYear + 1}`
      : `${periodYear - 1}-${periodYear}`;

    // 7. Process in Chunks
    const touchedClaimIds: string[] = [];
    try {
      for (let i = 0; i < employees.length; i += chunkSize) {
        const chunk = employees.slice(i, i + chunkSize);

        for (const emp of chunk) {
        const att = attendanceMap.get(emp.id) || {
          totalMonthDays: new Date(periodYear, periodMonth, 0).getDate(),
          totalWorkingDays: new Date(periodYear, periodMonth, 0).getDate(),
          presentDays: new Date(periodYear, periodMonth, 0).getDate(),
          halfDays: 0,
          approvedPaidLeaveDays: 0,
          approvedUnpaidLeaveDays: 0,
          calculatedLopDays: 0,
          manualLopAdjustment: 0,
          finalLopDays: 0,
          payableDays: new Date(periodYear, periodMonth, 0).getDate(),
          prorationFactor: new Decimal(1),
        };

        const assignment = emp.salaryAssignments[0];
        const structure = assignment?.structure;

        // Base monthly CTC
        const baseMonthlyCtc = assignment?.ctcMonthly
          ? new Decimal(assignment.ctcMonthly.toString())
          : new Decimal(emp.salary ? emp.salary.toString() : 35000);

        // Map component rates from salary structure
        const rateMap: Record<string, Decimal> = {};
        if (structure && structure.items) {
          for (const item of structure.items) {
            const code = item.component.code.toUpperCase();
            if (item.calculationType === 'percentage_of_ctc') {
              const pct = new Decimal(item.value ? item.value.toString() : '0').dividedBy(100);
              rateMap[`${code}_RATE`] = baseMonthlyCtc.times(pct).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
            } else if (item.calculationType === 'fixed') {
              rateMap[`${code}_RATE`] = new Decimal(item.value ? item.value.toString() : '0');
            } else if (item.formula && !isNaN(Number(item.formula))) {
              rateMap[`${code}_RATE`] = new Decimal(item.formula);
            }
          }
        }

        // Default component rates if not explicitly itemized
        const basicRate = rateMap['BASIC_RATE'] || baseMonthlyCtc.times(0.5); // 50% default
        const hraRate = rateMap['HRA_RATE'] || baseMonthlyCtc.times(0.2);     // 20% default
        const convRate = rateMap['CONVEYANCE_RATE'] || new Decimal(1600);
        const medRate = rateMap['MEDICAL_RATE'] || new Decimal(1250);
        const specialRate = rateMap['SPECIAL_RATE'] || Decimal.max(new Decimal(0), baseMonthlyCtc.minus(basicRate.plus(hraRate).plus(convRate).plus(medRate)));

        // State code
        const stateCode = emp.workStateCode || emp.state || 'MH';

        // Statutory rule parameters
        const epfParams: any = getRuleParam('epf') || {};
        const esicParams: any = getRuleParam('esi') || getRuleParam('esic') || {};
        const ptParams: any = getRuleParam('pt', stateCode) || {};
        const lwfParams: any = getRuleParam('lwf', stateCode) || {};

        // Resolve scope cascade for formulas
        const activeFormulas = FormulaDAG.resolveCascade(formulaDefinitions, {
          employeeId: emp.id,
          salaryStructureId: structure?.id,
          clientId: emp.clientId || undefined,
          tenantId,
          stateCode,
        });

        // Build Formula DAG
        const dag = new FormulaDAG();
        for (const f of activeFormulas) {
          dag.addFormula(f);
        }

        // Staffing Client Parameters
        const serviceChargeRate = emp.client
          ? new Decimal(emp.client.serviceChargePct.toString()).dividedBy(100)
          : new Decimal(0.10); // 10% default
        const gstRate = new Decimal(0.18); // 18% standard GST

        // Build initial context variables for DAG evaluation
        const initialVars: Record<string, any> = {
          // Attendance variables
          MONTH_DAYS: att.totalMonthDays,
          PAYABLE_DAYS: att.payableDays,
          LOP_DAYS: att.finalLopDays,

          // Employee Rates
          BASIC_RATE: basicRate,
          HRA_RATE: hraRate,
          CONVEYANCE_RATE: convRate,
          MEDICAL_RATE: medRate,
          SPECIAL_RATE: specialRate,
          OTHER_ALLOWANCES: rateMap['OTHER_ALLOWANCES_RATE'] || rateMap['OTHER_ALLOW_RATE'] || new Decimal(0),

          // Eligibility & Overrides
          PF_ELIGIBLE: emp.pfEligible !== false,
          ESI_ELIGIBLE: emp.esiEligible !== false,
          PT_ELIGIBLE: emp.ptEligible !== false,
          LWF_ELIGIBLE: true,
          PF_METHOD: (emp.pfCalculationMethod || 'STATUTORY_CAP').toUpperCase(),
          PF_OVERRIDE_WAGE: emp.pfCustomCap ? new Decimal(emp.pfCustomCap.toString()) : new Decimal(0),

          // Statutory Rule Parameters (EPF)
          PF_STATUTORY_CEILING: new Decimal(epfParams.statutoryCeiling ?? epfParams.statutory_ceiling ?? 15000),
          EPF_EE_RATE: new Decimal(epfParams.employeeRate ?? epfParams.epf_employee_rate ?? 0.12),
          EPF_ER_RATE: new Decimal(epfParams.employerEpfRate ?? epfParams.epf_employer_rate ?? 0.0367),
          EPS_RATE: new Decimal(epfParams.employerEpsRate ?? epfParams.eps_employer_rate ?? 0.0833),
          EPS_CEILING: new Decimal(epfParams.epsWageCeiling ?? epfParams.eps_ceiling ?? epfParams.eps_wage_ceiling ?? 15000),
          EDLI_RATE: new Decimal(epfParams.edliRate ?? epfParams.edli_rate ?? 0.005),
          EDLI_CEILING: new Decimal(epfParams.edliWageCeiling ?? epfParams.edli_ceiling ?? epfParams.edli_wage_ceiling ?? 15000),
          PF_ADMIN_RATE: new Decimal(epfParams.pfAdminRate ?? epfParams.admin_charges_rate ?? 0.005),

          // Statutory Rule Parameters (ESIC)
          ESIC_CEILING: new Decimal(esicParams.wageCeiling ?? esicParams.wage_ceiling ?? 21000),
          ESIC_EE_RATE: new Decimal(esicParams.employeeRate ?? esicParams.employee_rate ?? 0.0075),
          ESIC_ER_RATE: new Decimal(esicParams.employerRate ?? esicParams.employer_rate ?? 0.0325),

          // Professional Tax Slabs
          PT_SLABS: ptParams.slabs || [],

          // Labour Welfare Fund Rates
          LWF_EE_RATE: new Decimal(lwfParams.employeeShare ?? lwfParams.employee_share ?? 0),
          LWF_ER_RATE: new Decimal(lwfParams.employerShare ?? lwfParams.employer_share ?? 0),

          // Tax & Other deductions (Dynamic Section 115BAC / Old Regime TDS)
          TDS: new Decimal(0),
          OTHER_DEDUCTIONS: new Decimal(0),

          // Client Billing
          SERVICE_CHARGE_RATE: serviceChargeRate,
          GST_RATE: gstRate,
        };

        // Fetch authorized reimbursement claims for this employee (PO-DEC-03)
        const authorizedClaims = await this.prisma.expenseClaim.findMany({
          where: {
            tenantId,
            employeeId: emp.id,
            status: "finance_approved",
            reimbursementMethod: "payroll_addition",
            payrollRunId: null,
          },
        });
        const empReimbursement = authorizedClaims.reduce((sum, c) => sum + Number(c.amount), 0);
        const reimbursementDecimal = new Decimal(empReimbursement);

        // Calculate dynamic TDS based on employee's active tax declaration & regime (PO-DEC-05)
        const tdsResult = await this.tdsCalculatorService.calculateMonthlyTdsForEmployee(
          tenantId,
          emp.id,
          currentFY,
          periodMonth
        );
        const calculatedMonthlyTds = new Decimal(tdsResult.monthlyTds);
        initialVars.TDS = calculatedMonthlyTds;

        // Execute DAG
        const execution = dag.execute(initialVars);

        const empGross = execution.results['GROSS'] || new Decimal(0);
        const empDeductions = execution.results['TOTAL_DEDUCTIONS'] || new Decimal(0);
        const empNet = execution.results['NET_PAY'] || new Decimal(0);
        const empEpfEr = execution.results['EPF_ER'] || new Decimal(0);
        const empEpsEr = execution.results['EPS_ER'] || new Decimal(0);
        const empEdli = execution.results['EDLI'] || new Decimal(0);
        const empPfAdmin = execution.results['PF_ADMIN'] || new Decimal(0);
        const empEsicEr = execution.results['ESIC_ER'] || new Decimal(0);
        const empLwfEr = execution.results['LWF_ER'] || new Decimal(0);
        const empEmployerTotal = empEpfEr.plus(empEpsEr).plus(empEdli).plus(empPfAdmin).plus(empEsicEr).plus(empLwfEr);

        const empBillingBase = execution.results['BILLING_BASE'] || new Decimal(0);
        const empGst = execution.results['GST'] || new Decimal(0);
        const empTotalBilling = execution.results['TOTAL_BILLING'] || new Decimal(0);

        // Net pay including non-taxable reimbursement payout
        const empNetWithReimbursement = empNet.plus(reimbursementDecimal);

        totalGross = totalGross.plus(empGross);
        totalDeductions = totalDeductions.plus(empDeductions);
        totalNet = totalNet.plus(empNetWithReimbursement);
        totalEmployerContributions = totalEmployerContributions.plus(empEmployerTotal);
        totalBillingBase = totalBillingBase.plus(empBillingBase);
        totalGst = totalGst.plus(empGst);
        totalClientBilling = totalClientBilling.plus(empTotalBilling);

        const name = `${emp.firstName} ${emp.lastName || ''}`.trim();

        // Atomic persistence: Payslip, snapshot, execution traces, reimbursed claims, and regime lock
        await this.prisma.$transaction(async (tx) => {
          // Save Payslip
          await tx.payslip.create({
            data: {
              tenantId,
              payrollRunId: payrollRun.id,
              employeeId: emp.id,
              periodMonth,
              periodYear,
              grossSalary: empGross.toNumber(),
              deductions: empDeductions.toNumber(),
              netSalary: empNetWithReimbursement.toNumber(),
              breakdown: {
                attendance: att,
                calculatedValues: {
                  ...execution.formattedResults,
                  REIMBURSEMENTS: empReimbursement > 0 ? empReimbursement.toFixed(2) : "0.00",
                  TDS: calculatedMonthlyTds.toFixed(2),
                },
                earnings: {
                  basic: execution.formattedResults['BASIC_EARNED'],
                  hra: execution.formattedResults['HRA_EARNED'],
                  conveyance: execution.formattedResults['CONVEYANCE_EARNED'],
                  medical: execution.formattedResults['MEDICAL_EARNED'],
                  special: execution.formattedResults['SPECIAL_EARNED'],
                  other: execution.formattedResults['OTHER_EARNED'],
                  reimbursements: empReimbursement,
                  totalGross: empGross.toNumber(),
                },
                deductions: {
                  epfEmployee: execution.formattedResults['EPF_EE'],
                  esicEmployee: execution.formattedResults['ESIC_EE'],
                  professionalTax: execution.formattedResults['PT'],
                  lwfEmployee: execution.formattedResults['LWF_EE'],
                  tds: calculatedMonthlyTds.toFixed(2),
                  totalDeductions: empDeductions.toNumber(),
                },
                contributions: {
                  epfEmployer: execution.formattedResults['EPF_ER'],
                  epsEmployer: execution.formattedResults['EPS_ER'],
                  edli: execution.formattedResults['EDLI'],
                  pfAdmin: execution.formattedResults['PF_ADMIN'],
                  esicEmployer: execution.formattedResults['ESIC_ER'],
                  lwfEmployer: execution.formattedResults['LWF_ER'],
                  totalEmployerCost: empEmployerTotal.toNumber(),
                },
                billing: {
                  serviceCharge: execution.formattedResults['SERVICE_CHARGE'],
                  billingBase: empBillingBase.toNumber(),
                  gst: empGst.toNumber(),
                  totalBilling: empTotalBilling.toNumber(),
                },
              } as any,
            },
          });

          // Save PayrollSnapshot
          await tx.payrollSnapshot.create({
            data: {
              tenantId,
              payrollRunId: payrollRun.id,
              employeeId: emp.id,
              periodMonth,
              periodYear,
              ctcAnnual: baseMonthlyCtc.times(12).toNumber(),
              grossEarned: empGross.toNumber(),
              totalDeductions: empDeductions.toNumber(),
              netPay: empNet.toNumber(),
              lopDays: att.finalLopDays,
              payableDays: att.payableDays,
              isLocked: true,
              snapshotData: {
                employeeCode: emp.employeeCode,
                employeeName: name,
                calculatedValues: execution.formattedResults,
              } as any,
            },
          });

          // Save Cell-level Execution Traces
          for (const trace of execution.traces) {
            await tx.payrollExecutionTrace.create({
              data: {
                tenantId,
                payrollRunId: payrollRun.id,
                employeeId: emp.id,
                componentCode: trace.formulaCode,
                inputOperands: trace.resolvedInputs as any,
                resolvedExpression: trace.formulaExpression,
                resultValue: trace.finalDecimal.toNumber(),
                scopeWinner: trace.scope,
                explanation: `Resolved via scope '${trace.scope}'. Final: ${trace.finalValue}`,
              },
            });
          }

          // Link reimbursed claims to this payroll run
          if (authorizedClaims.length > 0) {
            const claimIds = authorizedClaims.map((c) => c.id);
            await tx.expenseClaim.updateMany({
              where: { id: { in: claimIds } },
              data: {
                status: "reimbursed",
                payrollRunId: payrollRun.id,
                payrollMonth: `${periodYear}-${String(periodMonth).padStart(2, "0")}`,
                reimbursedAt: new Date(),
              },
            });
          }

          // PO-DEC-05: Lock tax regime on employee's first payroll run of the financial year
          await this.tdsCalculatorService.lockRegimeOnFirstPayrollRun(tenantId, emp.id, currentFY, tx);
        });

        if (authorizedClaims.length > 0) {
          touchedClaimIds.push(...authorizedClaims.map((c) => c.id));
        }

        employeeResults.push({
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          employeeName: name,
          payableDays: att.payableDays,
          lopDays: att.finalLopDays,
          monthDays: att.totalMonthDays,
          calculatedValues: execution.formattedResults,
          grossEarned: empGross,
          totalDeductions: empDeductions,
          netPay: empNet,
          employerTotal: empEmployerTotal,
          billingBase: empBillingBase,
          gst: empGst,
          totalBilling: empTotalBilling,
          traceCount: execution.traces.length,
        });
      }
    }
  } catch (batchError) {
    // If batch calculation fails midway, roll back all claims touched during this run
    if (touchedClaimIds.length > 0) {
      await this.prisma.expenseClaim.updateMany({
        where: { id: { in: touchedClaimIds } },
        data: {
          status: "finance_approved",
          payrollRunId: null,
          reimbursedAt: null,
          payrollMonth: null,
        },
      });
    }
    await this.prisma.payrollRun.update({
      where: { id: payrollRun.id },
      data: { status: "draft" },
    });
    throw batchError;
  }

    // 8. Update PayrollRun with Totals
    await this.prisma.payrollRun.update({
      where: { id: payrollRun.id },
      data: {
        totalAmount: totalGross.toNumber(),
        totalNet: totalNet.toNumber(),
        totalDeductions: totalDeductions.toNumber(),
        employeeCount: employees.length,
        status: 'completed',
        approvalStatus: 'calculated',
        processedAt: new Date(),
      },
    });

    return {
      payrollRunId: payrollRun.id,
      periodMonth,
      periodYear,
      processedCount: employees.length,
      totalGross,
      totalNet,
      totalDeductions,
      totalEmployerContributions,
      totalBillingBase,
      totalGst,
      totalClientBilling,
      employeeResults,
      preflightReport,
    };
  }
}
