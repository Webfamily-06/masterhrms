import { prisma } from "../prisma";

export type ValidationSeverity = "BLOCKER" | "WARNING" | "INFO";
export type ValidationCategory = "COMPENSATION" | "MASTER_DATA" | "CALCULATION";

export interface ValidationFinding {
  code: string;
  severity: ValidationSeverity;
  category: ValidationCategory;
  message: string;
  employeeId?: string;
  employeeCode?: string;
  employeeName?: string;
  field?: string;
  actionableRemediation: string;
}

export interface EmployeeValidationSummary {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  hasBlockers: boolean;
  blockerCount: number;
  warningCount: number;
  infoCount: number;
  findings: ValidationFinding[];
}

export interface ApprovedException {
  code: string;
  employeeId?: string;
  approvedBy: string;
  approvedAt: string;
  justification: string;
}

export interface BatchValidationResult {
  runId: string;
  period: string;
  totalEmployees: number;
  isValid: boolean;
  canFinalize: boolean;
  blockerCount: number;
  warningCount: number;
  infoCount: number;
  validatedAt: string;
  employeeSummaries: EmployeeValidationSummary[];
  batchSummary: {
    blockers: ValidationFinding[];
    warnings: ValidationFinding[];
    infos: ValidationFinding[];
  };
  approvedExceptions: ApprovedException[];
}

// In-memory finalization lock to prevent concurrent race conditions
const activeFinalizationLocks = new Set<string>();

export class PayrollValidationService {
  /**
   * Acquire a concurrency lock for a payroll run finalization
   */
  static acquireLock(runId: string): boolean {
    if (activeFinalizationLocks.has(runId)) {
      return false;
    }
    activeFinalizationLocks.add(runId);
    return true;
  }

  /**
   * Release the concurrency lock
   */
  static releaseLock(runId: string): void {
    activeFinalizationLocks.delete(runId);
  }

  /**
   * Helper to mask sensitive values (Aadhaar, PAN, Bank Account)
   */
  static maskSensitive(value?: string | null): string {
    if (!value || typeof value !== "string") return "N/A";
    const trimmed = value.trim();
    if (trimmed.length <= 4) return "****";
    return "*".repeat(trimmed.length - 4) + trimmed.slice(-4);
  }

  /**
   * Validate Indian IFSC code format (4 letters, 0, 6 letters/digits)
   */
  static isValidIfsc(ifsc?: string | null): boolean {
    if (!ifsc) return false;
    return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.trim().toUpperCase());
  }

  /**
   * Perform comprehensive pre-flight validation on a payroll run
   */
  static async validatePayrollRun(
    tenantId: string,
    runId: string,
    options?: {
      approvedExceptions?: ApprovedException[];
      prismaClient?: any;
    }
  ): Promise<BatchValidationResult> {
    const db = options?.prismaClient || prisma;

    const run = await db.payrollRun.findUnique({
      where: { id: runId },
      include: {
        payslips: {
          include: {
            employee: {
              include: {
                department: { select: { name: true } },
                salaryAssignments: {
                  orderBy: { effectiveFrom: "desc" },
                },
              },
            },
          },
        },
      },
    });

    if (!run || run.tenantId !== tenantId) {
      throw new Error("Payroll run not found for the specified tenant.");
    }

    const periodStr = `${String(run.periodMonth).padStart(2, "0")}/${run.periodYear}`;
    const periodStartDate = new Date(Date.UTC(run.periodYear, run.periodMonth - 1, 1));
    const periodEndDate = new Date(Date.UTC(run.periodYear, run.periodMonth, 0, 23, 59, 59));

    const allFindings: ValidationFinding[] = [];
    const employeeSummaries: EmployeeValidationSummary[] = [];

    const approvedExceptions = options?.approvedExceptions || [];
    const isExceptionApproved = (code: string, empId?: string) => {
      return approvedExceptions.some(
        (ex) => ex.code === code && (!ex.employeeId || ex.employeeId === empId)
      );
    };

    for (const slip of run.payslips) {
      const emp = slip.employee;
      const empFindings: ValidationFinding[] = [];
      const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.employeeCode;

      // -------------------------------------------------------------
      // 1. EMPLOYEE COMPENSATION CHECKS
      // -------------------------------------------------------------
      const activeAssignments = emp.salaryAssignments.filter((a: any) => a.isCurrent);

      // Overlapping current assignments
      if (activeAssignments.length > 1) {
        empFindings.push({
          code: "COMP_OVERLAPPING_ASSIGNMENT",
          severity: "BLOCKER",
          category: "COMPENSATION",
          message: `Employee ${emp.employeeCode} has ${activeAssignments.length} concurrent assignments marked current.`,
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          employeeName: fullName,
          field: "salaryAssignments",
          actionableRemediation: "Resolve duplicate current salary assignments so exactly one active assignment governs this period.",
        });
      }

      const currentAssignment = activeAssignments[0] || null;

      if (!currentAssignment) {
        const fallbackSalary = Number(emp.salary ?? 0);
        if (fallbackSalary <= 0) {
          empFindings.push({
            code: "COMP_MISSING_ASSIGNMENT",
            severity: "BLOCKER",
            category: "COMPENSATION",
            message: `Employee ${emp.employeeCode} has no active salary assignment and base salary is ₹0.00.`,
            employeeId: emp.id,
            employeeCode: emp.employeeCode,
            employeeName: fullName,
            field: "salaryAssignments",
            actionableRemediation: "Create and activate an effective-dated salary assignment before processing payroll.",
          });
        } else {
          empFindings.push({
            code: "COMP_UNVERSIONED_SALARY",
            severity: "WARNING",
            category: "COMPENSATION",
            message: `Employee ${emp.employeeCode} relies on unversioned base salary (₹${fallbackSalary.toLocaleString("en-IN")}) without a structured assignment.`,
            employeeId: emp.id,
            employeeCode: emp.employeeCode,
            employeeName: fullName,
            field: "salaryAssignments",
            actionableRemediation: "Migrate employee to an effective-dated salary assignment with formal structure components.",
          });
        }
      } else {
        const ctcMonthly = Number(currentAssignment.ctcMonthly);
        if (ctcMonthly < 0) {
          empFindings.push({
            code: "COMP_NEGATIVE_CTC",
            severity: "BLOCKER",
            category: "COMPENSATION",
            message: `Employee ${emp.employeeCode} has negative monthly CTC (₹${ctcMonthly.toLocaleString("en-IN")}).`,
            employeeId: emp.id,
            employeeCode: emp.employeeCode,
            employeeName: fullName,
            field: "ctcMonthly",
            actionableRemediation: "Correct salary assignment CTC to a positive monetary amount.",
          });
        } else if (ctcMonthly === 0) {
          // If 0, must be an explicitly approved sabbatical/unpaid hold
          const isApprovedHold = isExceptionApproved("COMP_ZERO_CTC_HOLD", emp.id);
          if (!isApprovedHold) {
            empFindings.push({
              code: "COMP_ZERO_CTC",
              severity: "BLOCKER",
              category: "COMPENSATION",
              message: `Employee ${emp.employeeCode} has ₹0.00 CTC assignment without authorized Zero-Salary exception.`,
              employeeId: emp.id,
              employeeCode: emp.employeeCode,
              employeeName: fullName,
              field: "ctcMonthly",
              actionableRemediation: "Assign a valid salary structure or authorize an auditable Zero-Salary exception for unpaid leave.",
            });
          } else {
            empFindings.push({
              code: "COMP_ZERO_CTC_APPROVED",
              severity: "INFO",
              category: "COMPENSATION",
              message: `Employee ${emp.employeeCode} has authorized ₹0.00 CTC exception.`,
              employeeId: emp.id,
              employeeCode: emp.employeeCode,
              employeeName: fullName,
              actionableRemediation: "Audited exception active.",
            });
          }
        }

        // Effective Date Validation
        const effFrom = new Date(currentAssignment.effectiveFrom);
        if (effFrom > periodEndDate) {
          empFindings.push({
            code: "COMP_FUTURE_EFFECTIVE_DATE",
            severity: "BLOCKER",
            category: "COMPENSATION",
            message: `Salary assignment effective date (${effFrom.toISOString().slice(0, 10)}) is in the future beyond this payroll cycle.`,
            employeeId: emp.id,
            employeeCode: emp.employeeCode,
            employeeName: fullName,
            field: "effectiveFrom",
            actionableRemediation: "Adjust assignment effective date to on or before the current payroll cycle.",
          });
        }

        if (currentAssignment.effectiveTo) {
          const effTo = new Date(currentAssignment.effectiveTo);
          if (effTo < periodStartDate) {
            empFindings.push({
              code: "COMP_EXPIRED_ASSIGNMENT",
              severity: "BLOCKER",
              category: "COMPENSATION",
              message: `Salary assignment expired on ${effTo.toISOString().slice(0, 10)} prior to this cycle.`,
              employeeId: emp.id,
              employeeCode: emp.employeeCode,
              employeeName: fullName,
              field: "effectiveTo",
              actionableRemediation: "Extend or create a new active salary assignment for this cycle.",
            });
          }
        }

        // Structure Reference
        if (!currentAssignment.structureId) {
          empFindings.push({
            code: "COMP_MISSING_STRUCTURE",
            severity: "BLOCKER",
            category: "COMPENSATION",
            message: `Salary assignment is missing a linked salary structure template.`,
            employeeId: emp.id,
            employeeCode: emp.employeeCode,
            employeeName: fullName,
            field: "structureId",
            actionableRemediation: "Link an approved salary structure template to the employee's assignment.",
          });
        }
      }

      // -------------------------------------------------------------
      // 2. EMPLOYEE MASTER DATA CHECKS
      // -------------------------------------------------------------
      if (!emp.employeeCode || emp.employeeCode.trim().length === 0) {
        empFindings.push({
          code: "DATA_MISSING_EMP_CODE",
          severity: "BLOCKER",
          category: "MASTER_DATA",
          message: `Employee ID ${emp.id} is missing a unique employee code identifier.`,
          employeeId: emp.id,
          actionableRemediation: "Assign a standard employee code in the Employee Master.",
        });
      }

      if (emp.status !== "active") {
        empFindings.push({
          code: "DATA_INACTIVE_EMPLOYEE",
          severity: "BLOCKER",
          category: "MASTER_DATA",
          message: `Employee ${emp.employeeCode} has status '${emp.status}' but is included in active payroll batch.`,
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          employeeName: fullName,
          field: "status",
          actionableRemediation: "Remove inactive/relieved employee from regular payroll batch or process via Full & Final Settlement.",
        });
      }

      // Banking Details
      const paymentMethod = (emp as any).paymentMethod || "bank";
      if (paymentMethod === "bank") {
        if (!emp.bankAccount || emp.bankAccount.trim().length === 0) {
          empFindings.push({
            code: "DATA_MISSING_BANK_ACCOUNT",
            severity: "BLOCKER",
            category: "MASTER_DATA",
            message: `Employee ${emp.employeeCode} has no bank account number configured for direct bank transfer.`,
            employeeId: emp.id,
            employeeCode: emp.employeeCode,
            employeeName: fullName,
            field: "bankAccount",
            actionableRemediation: "Enter employee bank account details or switch payment method to Cheque/Cash.",
          });
        }

        if (!emp.bankIfsc || !this.isValidIfsc(emp.bankIfsc)) {
          empFindings.push({
            code: "DATA_INVALID_IFSC",
            severity: "BLOCKER",
            category: "MASTER_DATA",
            message: `Employee ${emp.employeeCode} has invalid IFSC format (${emp.bankIfsc || "Empty"}). Must match 11-digit pattern (e.g. HDFC0001234).`,
            employeeId: emp.id,
            employeeCode: emp.employeeCode,
            employeeName: fullName,
            field: "bankIfsc",
            actionableRemediation: "Update IFSC to a valid 11-character Indian Financial System Code.",
          });
        }
      }

      // Statutory Configuration Warnings
      if (emp.pfEligible && (!emp.uan || emp.uan.trim().length === 0)) {
        empFindings.push({
          code: "DATA_MISSING_UAN",
          severity: "WARNING",
          category: "MASTER_DATA",
          message: `Employee ${emp.employeeCode} is PF-eligible but missing UAN. EPFO monthly ECR will require manual reconciliation.`,
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          employeeName: fullName,
          field: "uan",
          actionableRemediation: "Record 12-digit Universal Account Number (UAN) in employee statutory profile.",
        });
      }

      if (emp.esiEligible && Number(slip.grossSalary) <= 21000 && (!emp.esiNumber || emp.esiNumber.trim().length === 0)) {
        empFindings.push({
          code: "DATA_MISSING_ESI_IP",
          severity: "WARNING",
          category: "MASTER_DATA",
          message: `Employee ${emp.employeeCode} is ESI-eligible (Gross <= ₹21,000) but missing ESIC Insurance Number.`,
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          employeeName: fullName,
          field: "esiNumber",
          actionableRemediation: "Record 17-digit ESIC Insurance Person (IP) number.",
        });
      }

      // -------------------------------------------------------------
      // 3. PAYROLL CALCULATION CHECKS
      // -------------------------------------------------------------
      const grossSalary = Number(slip.grossSalary);
      const deductions = Number(slip.deductions);
      const netSalary = Number(slip.netSalary);

      if (netSalary < 0) {
        empFindings.push({
          code: "CALC_NEGATIVE_NET_PAY",
          severity: "BLOCKER",
          category: "CALCULATION",
          message: `Employee ${emp.employeeCode} has negative net pay: ₹${netSalary.toLocaleString("en-IN")}.`,
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          employeeName: fullName,
          field: "netSalary",
          actionableRemediation: "Adjust excessive voluntary deductions, recovery, or LOP proration so net pay is non-negative.",
        });
      }

      if (deductions > grossSalary && grossSalary > 0) {
        empFindings.push({
          code: "CALC_DEDUCTIONS_EXCEED_GROSS",
          severity: "BLOCKER",
          category: "CALCULATION",
          message: `Total deductions (₹${deductions.toLocaleString("en-IN")}) exceed gross salary (₹${grossSalary.toLocaleString("en-IN")}).`,
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          employeeName: fullName,
          field: "deductions",
          actionableRemediation: "Review tax withholding, salary advances, or PF calculations to avoid over-deduction.",
        });
      }

      // Breakdown Diagnostics
      const breakdown = slip.breakdown as any;
      if (breakdown?.validationErrors && Array.isArray(breakdown.validationErrors)) {
        for (const err of breakdown.validationErrors) {
          empFindings.push({
            code: "CALC_ENGINE_ANOMALY",
            severity: "BLOCKER",
            category: "CALCULATION",
            message: `Engine calculation anomaly for ${emp.employeeCode}: ${err}`,
            employeeId: emp.id,
            employeeCode: emp.employeeCode,
            employeeName: fullName,
            actionableRemediation: "Verify salary inputs and component formulas.",
          });
        }
      }

      // Check Attendance consistency
      const payableDays = Number(breakdown?.attendance?.payableDays ?? 26);
      if (payableDays === 0 && grossSalary > 0) {
        empFindings.push({
          code: "CALC_ZERO_DAYS_WITH_GROSS",
          severity: "BLOCKER",
          category: "CALCULATION",
          message: `Employee ${emp.employeeCode} has 0 payable days but earned gross of ₹${grossSalary.toLocaleString("en-IN")}.`,
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          employeeName: fullName,
          actionableRemediation: "Correct attendance days or recalculate proration.",
        });
      }

      // Compile employee summary
      const bCount = empFindings.filter((f) => f.severity === "BLOCKER").length;
      const wCount = empFindings.filter((f) => f.severity === "WARNING").length;
      const iCount = empFindings.filter((f) => f.severity === "INFO").length;

      employeeSummaries.push({
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: fullName,
        hasBlockers: bCount > 0,
        blockerCount: bCount,
        warningCount: wCount,
        infoCount: iCount,
        findings: empFindings,
      });

      allFindings.push(...empFindings);
    }

    const totalBlockers = allFindings.filter((f) => f.severity === "BLOCKER").length;
    const totalWarnings = allFindings.filter((f) => f.severity === "WARNING").length;
    const totalInfos = allFindings.filter((f) => f.severity === "INFO").length;

    const isValid = totalBlockers === 0;
    const canFinalize = isValid;

    return {
      runId,
      period: periodStr,
      totalEmployees: run.payslips.length,
      isValid,
      canFinalize,
      blockerCount: totalBlockers,
      warningCount: totalWarnings,
      infoCount: totalInfos,
      validatedAt: new Date().toISOString(),
      employeeSummaries,
      batchSummary: {
        blockers: allFindings.filter((f) => f.severity === "BLOCKER"),
        warnings: allFindings.filter((f) => f.severity === "WARNING"),
        infos: allFindings.filter((f) => f.severity === "INFO"),
      },
      approvedExceptions,
    };
  }

  /**
   * Finalize payroll run with mandatory re-validation gate and concurrency lock
   */
  static async finalizePayrollRunWithGate(
    tenantId: string,
    runId: string,
    user: { id: string; email: string; role: string },
    options?: {
      approvedExceptions?: ApprovedException[];
      prismaClient?: any;
    }
  ): Promise<{ success: boolean; payrollRun: any; validationResult: BatchValidationResult }> {
    const db = options?.prismaClient || prisma;

    // Check immutability
    const existingRun = await db.payrollRun.findUnique({
      where: { id: runId },
      include: { payslips: true },
    });

    if (!existingRun || existingRun.tenantId !== tenantId) {
      throw new Error("Payroll run not found.");
    }

    if (existingRun.approvalStatus === "finalized" || existingRun.status === "paid") {
      throw new Error("Cannot modify or re-finalize a payroll run that is already finalized or paid. Records are immutable.");
    }

    // Concurrency Lock: Atomic distributed check in AUD-CONC-002
    if (db.payrollRun?.updateMany) {
      const claim = await db.payrollRun.updateMany({
        where: {
          id: runId,
          tenantId,
          status: { notIn: ["completed", "paid"] },
          approvalStatus: { notIn: ["finalized", "FINALIZING", "CLOSED"] },
        },
        data: {
          approvalStatus: "FINALIZING",
        },
      });

      if (claim.count === 0) {
        if (existingRun.approvalStatus === "finalized" || existingRun.status === "paid") {
          throw new Error("Cannot modify or re-finalize a payroll run that is already finalized or paid. Records are immutable.");
        }
        const err: any = new Error("Payroll run finalization is already in progress for this batch. Concurrent execution prevented.");
        err.status = 409;
        throw err;
      }
    } else {
      // Mock fallback for mock-based unit tests
      const locked = this.acquireLock(runId);
      if (!locked) {
        const err: any = new Error("Payroll run finalization is already in progress for this batch. Concurrent execution prevented.");
        err.status = 409;
        throw err;
      }
    }

    try {
      // Re-validate immediately before finalization to avoid stale state
      const validation = await this.validatePayrollRun(tenantId, runId, {
        approvedExceptions: options?.approvedExceptions,
        prismaClient: db,
      });

      if (validation.blockerCount > 0) {
        const error = new Error(`Payroll finalization blocked. ${validation.blockerCount} blocking validation errors detected.`);
        (error as any).status = 422;
        (error as any).validationResult = validation;
        throw error;
      }

      // Execute atomic transaction to finalize and snapshot
      const updatedRun = await db.$transaction(async (tx: any) => {
        // Create immutable snapshots if not already created
        const existingSnapshots = await tx.payrollSnapshot.count({
          where: { payrollRunId: runId },
        });

        if (existingSnapshots === 0) {
          for (const slip of existingRun.payslips) {
            const breakdown = slip.breakdown as any;
            await tx.payrollSnapshot.create({
              data: {
                tenantId,
                payrollRunId: runId,
                employeeId: slip.employeeId,
                periodMonth: existingRun.periodMonth,
                periodYear: existingRun.periodYear,
                snapshotData: breakdown || {},
                statutoryManifest: breakdown?.statutoryManifest || null,
                ctcAnnual: Number(breakdown?.baseMonthlyCtc || slip.grossSalary) * 12,
                grossEarned: Number(slip.grossSalary),
                totalDeductions: Number(slip.deductions),
                netPay: Number(slip.netSalary),
                lopDays: Number(breakdown?.lossOfPayDays || 0),
                payableDays: Number(breakdown?.payableDays || 26),
                isLocked: true,
              },
            });
          }
        }

        const runRecord = await tx.payrollRun.update({
          where: { id: runId },
          data: {
            status: "completed",
            approvalStatus: "finalized",
            approvedBy: user.email,
            approvedAt: new Date(),
            auditLog: {
              finalizedBy: user.email,
              finalizedAt: new Date().toISOString(),
              validationScorecard: {
                blockers: validation.blockerCount,
                warnings: validation.warningCount,
                infos: validation.infoCount,
                totalEmployees: validation.totalEmployees,
              },
              approvedExceptions: validation.approvedExceptions,
            },
          },
          include: {
            _count: { select: { payslips: true, snapshots: true } },
          },
        });

        return runRecord;
      });

      return {
        success: true,
        payrollRun: updatedRun,
        validationResult: validation,
      };
    } finally {
      this.releaseLock(runId);
    }
  }
}

