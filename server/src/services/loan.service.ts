import { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";
import { getTenantDb } from "../context/tenant-context";
import { AuditService } from "./audit.service";
import { OutboxService } from "./outbox.service";

export interface CreateLoanParams {
  employeeId: string;
  loanType?: string;
  principal: number;
  interestRate?: number;
  tenureMonths: number;
  deductionStartMonth: string; // e.g. "2026-10"
  reason?: string;
  approverId?: string;
}

export class LoanService {
  /**
   * Calculate EMI using standard amortization or simple interest
   */
  static calculateEmi(principal: number, interestRateAnnual: number, tenureMonths: number): number {
    if (interestRateAnnual <= 0) {
      return Math.round((principal / tenureMonths) * 100) / 100;
    }
    const monthlyRate = interestRateAnnual / (12 * 100);
    const factor = Math.pow(1 + monthlyRate, tenureMonths);
    const emi = (principal * monthlyRate * factor) / (factor - 1);
    return Math.round(emi * 100) / 100;
  }

  /**
   * Create an employee loan with scheduled monthly installments
   */
  static async createLoan(tenantId: string, params: CreateLoanParams, actorId: string) {
    const db = getTenantDb();
    const principal = new Decimal(params.principal);
    const interestRate = new Decimal(params.interestRate || 0);
    const tenureMonths = params.tenureMonths;
    const monthlyEmi = new Decimal(this.calculateEmi(principal.toNumber(), interestRate.toNumber(), tenureMonths));

    const [startYearStr, startMonthStr] = params.deductionStartMonth.split("-");
    let currentYear = parseInt(startYearStr, 10);
    let currentMonth = parseInt(startMonthStr, 10);

    const loan = await db.$transaction(async (tx: any) => {
      const createdLoan = await tx.employeeLoan.create({
        data: {
          tenantId,
          employeeId: params.employeeId,
          loanType: params.loanType || "personal",
          principal,
          interestRate,
          tenureMonths,
          monthlyEmi,
          disbursedAmount: principal,
          outstandingBalance: principal,
          status: "active",
          disbursementDate: new Date(),
          deductionStartMonth: params.deductionStartMonth,
          reason: params.reason,
          approverId: params.approverId || actorId,
          approvedAt: new Date(),
        },
      });

      // Generate Installments
      const installmentsData = [];
      const monthlyPrincipal = principal.dividedBy(tenureMonths).toDecimalPlaces(2);
      const monthlyInterest = monthlyEmi.minus(monthlyPrincipal).greaterThan(0)
        ? monthlyEmi.minus(monthlyPrincipal).toDecimalPlaces(2)
        : new Decimal(0);

      for (let i = 1; i <= tenureMonths; i++) {
        installmentsData.push({
          loanId: createdLoan.id,
          tenantId,
          installmentNumber: i,
          periodMonth: currentMonth,
          periodYear: currentYear,
          emiAmount: monthlyEmi,
          principalComponent: monthlyPrincipal,
          interestComponent: monthlyInterest,
          status: "pending",
        });

        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      }

      await tx.loanInstallment.createMany({
        data: installmentsData,
      });

      return createdLoan;
    });

    await AuditService.log({
      tenantId,
      actorId,
      action: "LOAN_CREATED",
      resourceType: "EmployeeLoan",
      resourceId: loan.id,
      details: {
        employeeId: params.employeeId,
        principal: principal.toString(),
        tenureMonths,
        monthlyEmi: monthlyEmi.toString(),
      },
    });

    await OutboxService.createEvent(tenantId, "loan.created", "EmployeeLoan", loan.id, {
      employeeId: params.employeeId,
      principal: principal.toString(),
      monthlyEmi: monthlyEmi.toString(),
    });

    return loan;
  }

  /**
   * List employee loans with installments
   */
  static async listLoans(tenantId: string, employeeId?: string, status?: string) {
    const db = getTenantDb();
    const where: any = { tenantId };
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    return db.employeeLoan.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
          },
        },
        installments: {
          orderBy: { installmentNumber: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Process monthly loan recovery for an active payroll run
   */
  static async recoverInstallmentForPeriod(
    tx: any,
    tenantId: string,
    employeeId: string,
    periodMonth: number,
    periodYear: number,
    payrollRunId: string
  ): Promise<Decimal> {
    const pendingInstallment = await tx.loanInstallment.findFirst({
      where: {
        tenantId,
        periodMonth,
        periodYear,
        status: "pending",
        loan: {
          employeeId,
          status: "active",
        },
      },
      include: {
        loan: true,
      },
    });

    if (!pendingInstallment) {
      return new Decimal(0);
    }

    const emiAmount = new Decimal(pendingInstallment.emiAmount);

    // Mark installment as deducted
    await tx.loanInstallment.update({
      where: { id: pendingInstallment.id },
      data: {
        status: "deducted",
        payrollRunId,
        deductedAt: new Date(),
      },
    });

    // Update loan balance
    const updatedBalance = Decimal.max(0, new Decimal(pendingInstallment.loan.outstandingBalance).minus(pendingInstallment.principalComponent));
    const isCompleted = updatedBalance.isZero();

    await tx.employeeLoan.update({
      where: { id: pendingInstallment.loanId },
      data: {
        outstandingBalance: updatedBalance,
        status: isCompleted ? "completed" : "active",
      },
    });

    return emiAmount;
  }
}
