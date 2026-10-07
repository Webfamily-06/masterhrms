import { Router, Response } from "express";
import Decimal from "decimal.js";
import { getTenantDb } from "../context/tenant-context";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { AuditService } from "../services/audit.service";
import { OutboxService } from "../services/outbox.service";
import { broadcastToTenant } from "../socket";
import { LoanService } from "../services/loan.service";
import { PayrollAttendanceService } from "../services/payroll-attendance.service";
import {
  computeEmployeePayrollBreakdown,
  calculateAnnualTDS,
  calculateProfessionalTax,
  calculateStatutoryEPF,
  calculateStatutoryESI,
} from "../services/payroll-engine.service";
import { TdsCalculatorService } from "../services/tds-calculator.service";
import { evaluateFormula } from "../services/formula-engine/evaluator";

export const hrPayrollRouter = Router();

// Apply Auth & Tenant Context to all HR Payroll Endpoints
hrPayrollRouter.use(requireAuth, resolveTenantContext);

// =========================================================================
// 1. PAYROLL RUNS LIFECYCLE (HR-PAY-02)
// =========================================================================

/**
 * GET /runs — List payroll runs
 */
hrPayrollRouter.get("/runs", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const runs = await db.payrollRun.findMany({
      where: { tenantId },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      include: {
        _count: {
          select: { payslips: true, snapshots: true },
        },
      },
    });

    return res.json({ runs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /runs — Initialize a new payroll run for a period
 */
hrPayrollRouter.post("/runs", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const actorId = req.user?.userId || "system";
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const { periodMonth, periodYear } = req.body;
    if (!periodMonth || !periodYear) {
      return res.status(400).json({ error: "periodMonth and periodYear are required" });
    }

    const db = getTenantDb();

    // Check if run already exists for period
    const existing = await db.payrollRun.findFirst({
      where: { tenantId, periodMonth: Number(periodMonth), periodYear: Number(periodYear) },
    });
    if (existing) {
      return res.status(409).json({ error: `Payroll run already exists for ${periodMonth}/${periodYear}`, run: existing });
    }

    const run = await db.payrollRun.create({
      data: {
        tenantId,
        periodMonth: Number(periodMonth),
        periodYear: Number(periodYear),
        approvalStatus: "draft",
        status: "draft",
      },
    });

    await AuditService.log({
      tenantId,
      actorId,
      action: "PAYROLL_RUN_CREATED",
      resourceType: "PayrollRun",
      resourceId: run.id,
      details: { periodMonth, periodYear },
    });

    return res.status(201).json({ run });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /runs/:id/calculate — Execute batch payroll calculation
 */
hrPayrollRouter.post("/runs/:id/calculate", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const actorId = req.user?.userId || "system";
    const runId = req.params.id;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const run = await db.payrollRun.findFirst({
      where: { id: runId, tenantId },
    });
    if (!run) return res.status(404).json({ error: "Payroll run not found" });

    if (run.approvalStatus === "approved" || run.approvalStatus === "finalized" || run.isPublished) {
      return res.status(400).json({ error: "Cannot recalculate an approved or published payroll run." });
    }

    const attendanceService = new PayrollAttendanceService(db);
    const attendanceMap = await attendanceService.computeTenantAttendance(tenantId, {
      periodMonth: run.periodMonth,
      periodYear: run.periodYear,
    });

    // Fetch active employees with current salary assignments
    const employees = await db.employee.findMany({
      where: { tenantId, status: "active" },
      include: {
        salaryAssignments: {
          where: { isCurrent: true },
          include: {
            items: { include: { component: true } },
          },
          take: 1,
        },
        department: true,
      },
    });

    // Fetch active expense claims to be reimbursed via payroll
    const approvedClaims = await db.expenseClaim.findMany({
      where: {
        tenantId,
        status: "finance_approved",
        reimbursementMethod: "payroll_addition",
      },
    });

    let totalGrossAmount = new Decimal(0);
    let totalDeductionsAmount = new Decimal(0);
    let totalNetAmount = new Decimal(0);
    let processedEmployeeCount = 0;

    // Execute in transaction
    await db.$transaction(async (tx: any) => {
      // Clear previous draft snapshots and payslips for this run
      await tx.payrollSnapshot.deleteMany({ where: { payrollRunId: run.id, tenantId } });
      await tx.payslip.deleteMany({ where: { payrollRunId: run.id, tenantId } });

      for (const emp of employees) {
        const assignment = emp.salaryAssignments[0];
        if (!assignment) continue; // Skip employees without salary assignment

        const att = attendanceMap.get(emp.id) || {
          totalMonthDays: 30,
          totalWorkingDays: 30,
          presentDays: 30,
          halfDays: 0,
          approvedPaidLeaveDays: 0,
          approvedUnpaidLeaveDays: 0,
          calculatedLopDays: 0,
          manualLopAdjustment: 0,
          finalLopDays: 0,
          payableDays: 30,
          prorationFactor: new Decimal(1),
          overtimeHours: 0,
          isAttendanceLocked: false,
        };

        const monthlyCtc = new Decimal(assignment.ctcMonthly || 0);
        const proration = new Decimal(att.prorationFactor);

        // Earnings from components
        let grossEarnings = new Decimal(0);
        const earningsBreakdown: any[] = [];
        const deductionsBreakdown: any[] = [];

        // Check assigned items
        for (const item of assignment.items) {
          const comp = item.component;
          if (comp.type === "earning") {
            const baseAmt = new Decimal(item.monthlyAmount);
            const proratedAmt = baseAmt.times(proration).toDecimalPlaces(2);
            grossEarnings = grossEarnings.plus(proratedAmt);
            earningsBreakdown.push({
              code: comp.code,
              name: comp.name,
              amount: proratedAmt.toNumber(),
              isTaxable: comp.isTaxable,
            });
          }
        }

        // Add Overtime if eligible
        if (att.overtimeHours > 0) {
          const hourlyRate = monthlyCtc.dividedBy(240).toDecimalPlaces(2); // standard 30*8
          const otAmount = hourlyRate.times(att.overtimeHours).times(1.5).toDecimalPlaces(2); // 1.5x multiplier
          grossEarnings = grossEarnings.plus(otAmount);
          earningsBreakdown.push({
            code: "OVERTIME",
            name: `Overtime (${att.overtimeHours} hrs)`,
            amount: otAmount.toNumber(),
            isTaxable: true,
          });
        }

        // Add Approved Expense Reimbursements
        const empClaims = approvedClaims.filter((c: any) => c.employeeId === emp.id);
        let totalClaimAmount = new Decimal(0);
        for (const claim of empClaims) {
          totalClaimAmount = totalClaimAmount.plus(new Decimal(claim.amount));
        }
        if (totalClaimAmount.greaterThan(0)) {
          grossEarnings = grossEarnings.plus(totalClaimAmount);
          earningsBreakdown.push({
            code: "REIMBURSEMENT",
            name: "Approved Expense Reimbursements",
            amount: totalClaimAmount.toNumber(),
            isTaxable: false,
          });
        }

        // Deductions from assigned components
        let totalDeductions = new Decimal(0);
        for (const item of assignment.items) {
          const comp = item.component;
          if (comp.type === "deduction") {
            const amt = new Decimal(item.monthlyAmount).times(proration).toDecimalPlaces(2);
            totalDeductions = totalDeductions.plus(amt);
            deductionsBreakdown.push({
              code: comp.code,
              name: comp.name,
              amount: amt.toNumber(),
              isStatutory: comp.isStatutory,
            });
          }
        }

        // Recover Loan Installments
        const recoveredEmi = await LoanService.recoverInstallmentForPeriod(
          tx,
          tenantId,
          emp.id,
          run.periodMonth,
          run.periodYear,
          run.id
        );
        if (recoveredEmi.greaterThan(0)) {
          totalDeductions = totalDeductions.plus(recoveredEmi);
          deductionsBreakdown.push({
            code: "LOAN_EMI",
            name: "Loan Installment Deduction",
            amount: recoveredEmi.toNumber(),
            isStatutory: false,
          });
        }

        // Calculate standard EPF & PT if not explicit
        const basicItem = earningsBreakdown.find((e) => e.code === "BASIC");
        const basicAmt = basicItem ? basicItem.amount : grossEarnings.times(0.5).toNumber();
        const epfDeduction = Math.min(1800, Math.round(basicAmt * 0.12));
        if (!deductionsBreakdown.some((d) => d.code === "EPF" || d.code === "PF")) {
          totalDeductions = totalDeductions.plus(epfDeduction);
          deductionsBreakdown.push({
            code: "EPF",
            name: "Employee Provident Fund",
            amount: epfDeduction,
            isStatutory: true,
          });
        }

        const netPay = Decimal.max(0, grossEarnings.minus(totalDeductions));

        totalGrossAmount = totalGrossAmount.plus(grossEarnings);
        totalDeductionsAmount = totalDeductionsAmount.plus(totalDeductions);
        totalNetAmount = totalNetAmount.plus(netPay);
        processedEmployeeCount++;

        const snapshotData = {
          employee: {
            id: emp.id,
            code: emp.employeeCode,
            name: `${emp.firstName} ${emp.lastName}`,
            department: emp.department?.name,
          },
          attendance: att,
          earnings: earningsBreakdown,
          deductions: deductionsBreakdown,
          grossSalary: grossEarnings.toNumber(),
          totalDeductions: totalDeductions.toNumber(),
          netPay: netPay.toNumber(),
        };

        // Create frozen Snapshot
        await tx.payrollSnapshot.create({
          data: {
            tenantId,
            payrollRunId: run.id,
            employeeId: emp.id,
            periodMonth: run.periodMonth,
            periodYear: run.periodYear,
            snapshotData,
            ctcAnnual: assignment.ctcAnnual,
            grossEarned: grossEarnings,
            totalDeductions,
            netPay,
            lopDays: new Decimal(att.finalLopDays),
            payableDays: new Decimal(att.payableDays),
            isLocked: true,
          },
        });

        // Create Draft Payslip
        await tx.payslip.create({
          data: {
            tenantId,
            payrollRunId: run.id,
            employeeId: emp.id,
            periodMonth: run.periodMonth,
            periodYear: run.periodYear,
            grossSalary: grossEarnings,
            deductions: totalDeductions,
            netSalary: netPay,
            status: "draft",
            isPublished: false,
            breakdown: snapshotData,
          },
        });
      }

      // Compute variance against previous month
      const prevMonth = run.periodMonth === 1 ? 12 : run.periodMonth - 1;
      const prevYear = run.periodMonth === 1 ? run.periodYear - 1 : run.periodYear;
      const prevRun = await tx.payrollRun.findFirst({
        where: { tenantId, periodMonth: prevMonth, periodYear: prevYear },
      });

      let varianceSummary: any = null;
      if (prevRun && prevRun.totalAmount) {
        const grossDelta = totalGrossAmount.minus(new Decimal(prevRun.totalAmount));
        const netDelta = totalNetAmount.minus(new Decimal(prevRun.totalNet || 0));
        const headcountDelta = processedEmployeeCount - (prevRun.employeeCount || 0);

        varianceSummary = {
          previousPeriod: `${prevMonth}/${prevYear}`,
          previousGross: prevRun.totalAmount,
          currentGross: totalGrossAmount,
          grossDelta: grossDelta.toNumber(),
          grossDeltaPct: prevRun.totalAmount.isZero()
            ? 0
            : grossDelta.dividedBy(new Decimal(prevRun.totalAmount)).times(100).toDecimalPlaces(2).toNumber(),
          netDelta: netDelta.toNumber(),
          headcountDelta,
        };
      }

      // Update Run Status
      await tx.payrollRun.update({
        where: { id: run.id },
        data: {
          totalAmount: totalGrossAmount,
          totalNet: totalNetAmount,
          totalDeductions: totalDeductionsAmount,
          employeeCount: processedEmployeeCount,
          approvalStatus: "calculated",
          status: "completed",
          processedAt: new Date(),
          varianceSummary,
        },
      });
    });

    await AuditService.log({
      tenantId,
      actorId,
      action: "PAYROLL_CALCULATED",
      resourceType: "PayrollRun",
      resourceId: run.id,
      details: {
        employeeCount: processedEmployeeCount,
        totalNet: totalNetAmount.toString(),
      },
    });

    await OutboxService.createEvent(tenantId, "payroll.calculated", "PayrollRun", run.id, {
      periodMonth: run.periodMonth,
      periodYear: run.periodYear,
      employeeCount: processedEmployeeCount,
    });

    broadcastToTenant(tenantId, "payroll.calculated", { runId: run.id });

    return res.json({
      message: "Payroll calculated successfully",
      employeeCount: processedEmployeeCount,
      totalNet: totalNetAmount.toNumber(),
      totalGross: totalGrossAmount.toNumber(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /runs/:id/variance — Comparative audit against previous period
 */
hrPayrollRouter.get("/runs/:id/variance", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const runId = req.params.id;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const currentRun = await db.payrollRun.findFirst({
      where: { id: runId, tenantId },
      include: { snapshots: true },
    });
    if (!currentRun) return res.status(404).json({ error: "Run not found" });

    const prevMonth = currentRun.periodMonth === 1 ? 12 : currentRun.periodMonth - 1;
    const prevYear = currentRun.periodMonth === 1 ? currentRun.periodYear - 1 : currentRun.periodYear;

    const previousRun = await db.payrollRun.findFirst({
      where: { tenantId, periodMonth: prevMonth, periodYear: prevYear },
      include: { snapshots: true },
    });

    return res.json({
      currentRun: {
        period: `${currentRun.periodMonth}/${currentRun.periodYear}`,
        gross: currentRun.totalAmount,
        net: currentRun.totalNet,
        headcount: currentRun.employeeCount,
      },
      previousRun: previousRun
        ? {
            period: `${previousRun.periodMonth}/${previousRun.periodYear}`,
            gross: previousRun.totalAmount,
            net: previousRun.totalNet,
            headcount: previousRun.employeeCount,
          }
        : null,
      varianceSummary: currentRun.varianceSummary,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /runs/:id/approve — Maker-checker approval
 */
hrPayrollRouter.post("/runs/:id/approve", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const actorId = req.user?.userId || "hr_admin";
    const runId = req.params.id;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const run = await db.payrollRun.findFirst({
      where: { id: runId, tenantId },
    });
    if (!run) return res.status(404).json({ error: "Payroll run not found" });

    if (run.approvalStatus !== "calculated" && run.approvalStatus !== "under_review") {
      return res.status(400).json({ error: `Cannot approve payroll in status: ${run.approvalStatus}` });
    }

    const updated = await db.payrollRun.update({
      where: { id: run.id },
      data: {
        approvalStatus: "approved",
        approvedBy: actorId,
        approvedAt: new Date(),
      },
    });

    await AuditService.log({
      tenantId,
      actorId,
      action: "PAYROLL_APPROVED",
      resourceType: "PayrollRun",
      resourceId: run.id,
      details: { approvedBy: actorId },
    });

    await OutboxService.createEvent(tenantId, "payroll.approved", "PayrollRun", run.id, {
      approvedBy: actorId,
    });

    return res.json({ message: "Payroll run approved successfully", run: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /runs/:id/publish — Publish payslips to employee portal & freeze
 */
hrPayrollRouter.post("/runs/:id/publish", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const actorId = req.user?.userId || "hr_admin";
    const runId = req.params.id;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const run = await db.payrollRun.findFirst({
      where: { id: runId, tenantId },
    });
    if (!run) return res.status(404).json({ error: "Payroll run not found" });

    if (run.approvalStatus !== "approved") {
      return res.status(400).json({ error: "Only approved payroll runs can be published." });
    }

    await db.$transaction(async (tx: any) => {
      // Mark all payslips for this run as published
      await tx.payslip.updateMany({
        where: { payrollRunId: run.id, tenantId },
        data: {
          status: "published",
          isPublished: true,
          publishedAt: new Date(),
        },
      });

      // Update run publish flags
      await tx.payrollRun.update({
        where: { id: run.id },
        data: {
          isPublished: true,
          publishedAt: new Date(),
          publishedBy: actorId,
          approvalStatus: "finalized",
        },
      });
    });

    await AuditService.log({
      tenantId,
      actorId,
      action: "PAYROLL_PUBLISHED",
      resourceType: "PayrollRun",
      resourceId: run.id,
      details: { publishedBy: actorId },
    });

    await OutboxService.createEvent(tenantId, "payroll.published", "PayrollRun", run.id, {
      publishedBy: actorId,
    });

    broadcastToTenant(tenantId, "payslip.published", {
      periodMonth: run.periodMonth,
      periodYear: run.periodYear,
    });

    return res.json({ message: "Payroll published and payslips released successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 2. PAYSLIPS MANAGEMENT (HR-PAY-01)
// =========================================================================

/**
 * GET /payslips — List payslips across tenant
 */
hrPayrollRouter.get("/payslips", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const { periodMonth, periodYear, employeeId, isPublished } = req.query;
    const db = getTenantDb();

    const where: any = { tenantId };
    if (periodMonth) where.periodMonth = Number(periodMonth);
    if (periodYear) where.periodYear = Number(periodYear);
    if (employeeId) where.employeeId = String(employeeId);
    if (isPublished !== undefined) where.isPublished = isPublished === "true";

    const payslips = await db.payslip.findMany({
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
      },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    });

    return res.json({ payslips });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /payslips/bulk-publish — Bulk publish payslips
 */
hrPayrollRouter.post("/payslips/bulk-publish", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const actorId = req.user?.userId || "hr_admin";
    const { payslipIds, periodMonth, periodYear } = req.body;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const where: any = { tenantId };
    if (payslipIds && Array.isArray(payslipIds)) {
      where.id = { in: payslipIds };
    } else if (periodMonth && periodYear) {
      where.periodMonth = Number(periodMonth);
      where.periodYear = Number(periodYear);
    } else {
      return res.status(400).json({ error: "Specify payslipIds or periodMonth & periodYear" });
    }

    const result = await db.payslip.updateMany({
      where,
      data: {
        status: "published",
        isPublished: true,
        publishedAt: new Date(),
      },
    });

    await AuditService.log({
      tenantId,
      actorId,
      action: "PAYSLIPS_BULK_PUBLISHED",
      resourceType: "Payslip",
      resourceId: "bulk",
      details: { count: result.count },
    });

    return res.json({ message: `Successfully published ${result.count} payslips.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 3. SALARY COMPONENTS & FORMULA ENGINE (HR-PAY-04)
// =========================================================================

/**
 * GET /components — List components & structures
 */
hrPayrollRouter.get("/components", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const components = await db.salaryComponent.findMany({
      where: { tenantId },
      orderBy: { sortOrder: "asc" },
    });

    const structures = await db.salaryStructure.findMany({
      where: { tenantId },
      include: {
        items: {
          include: { component: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return res.json({ components, structures });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /components — Create salary component
 */
hrPayrollRouter.post("/components", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const actorId = req.user?.userId || "system";
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const { name, code, type, calculationType, formulaString, defaultValue, isTaxable, isStatutory, includeInPf, includeInEsi, description } = req.body;
    if (!name || !code || !type) {
      return res.status(400).json({ error: "name, code, and type are required" });
    }

    const db = getTenantDb();
    const component = await db.salaryComponent.create({
      data: {
        tenantId,
        name,
        code: code.toUpperCase(),
        type,
        calculationType: calculationType || "flat",
        formulaString,
        defaultValue: new Decimal(defaultValue || 0),
        isTaxable: isTaxable ?? true,
        isStatutory: isStatutory ?? false,
        includeInPf: includeInPf ?? false,
        includeInEsi: includeInEsi ?? false,
        description,
      },
    });

    await AuditService.log({
      tenantId,
      actorId,
      action: "SALARY_COMPONENT_CREATED",
      resourceType: "SalaryComponent",
      resourceId: component.id,
      details: { code, name },
    });

    return res.status(201).json({ component });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /components/test-formula — Evaluate formula expression with DAG
 */
hrPayrollRouter.post("/components/test-formula", async (req: AuthRequest, res: Response) => {
  try {
    const { formula, context } = req.body;
    if (!formula) return res.status(400).json({ error: "formula is required" });

    const sampleContext = context || {
      BASIC: 25000,
      HRA: 10000,
      CTC: 50000,
      SPECIAL: 10000,
      WORKING_DAYS: 30,
      PAYABLE_DAYS: 30,
    };

    const result = evaluateFormula(formula, sampleContext);
    return res.json({ formula, context: sampleContext, result, isValid: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message, isValid: false });
  }
});

// =========================================================================
// 4. EMPLOYEE SALARY ASSIGNMENTS (HR-PAY-03)
// =========================================================================

/**
 * GET /employee-salaries — List assignments
 */
hrPayrollRouter.get("/employee-salaries", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const assignments = await db.employeeSalaryAssignment.findMany({
      where: { tenantId },
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
        structure: true,
        items: { include: { component: true } },
      },
      orderBy: { effectiveFrom: "desc" },
    });

    return res.json({ assignments });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /employee-salaries/assign — Assign salary structure
 */
hrPayrollRouter.post("/employee-salaries/assign", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const actorId = req.user?.userId || "system";
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const { employeeId, structureId, ctcAnnual, effectiveFrom, taxRegime, remarks } = req.body;
    if (!employeeId || !ctcAnnual || !effectiveFrom) {
      return res.status(400).json({ error: "employeeId, ctcAnnual, and effectiveFrom are required" });
    }

    const db = getTenantDb();
    const annual = new Decimal(ctcAnnual);
    const monthly = annual.dividedBy(12).toDecimalPlaces(2);

    const assignment = await db.$transaction(async (tx: any) => {
      // Mark current assignment as not current
      await tx.employeeSalaryAssignment.updateMany({
        where: { tenantId, employeeId, isCurrent: true },
        data: { isCurrent: false, effectiveTo: new Date(effectiveFrom) },
      });

      // Create new assignment
      const created = await tx.employeeSalaryAssignment.create({
        data: {
          tenantId,
          employeeId,
          structureId,
          ctcAnnual: annual,
          ctcMonthly: monthly,
          effectiveFrom: new Date(effectiveFrom),
          isCurrent: true,
          taxRegime: taxRegime || "new",
          remarks,
        },
      });

      // Default breakdown: 50% Basic, 20% HRA, 30% Special Allowance
      const components = await tx.salaryComponent.findMany({ where: { tenantId } });
      const basicComp = components.find((c: any) => c.code === "BASIC");
      const hraComp = components.find((c: any) => c.code === "HRA");
      const specialComp = components.find((c: any) => c.code === "SPECIAL" || c.code === "SPECIAL_ALLOW");

      const itemsData = [];
      if (basicComp) {
        const bMonthly = monthly.times(0.5).toDecimalPlaces(2);
        itemsData.push({
          assignmentId: created.id,
          componentId: basicComp.id,
          monthlyAmount: bMonthly,
          annualAmount: bMonthly.times(12),
        });
      }
      if (hraComp) {
        const hMonthly = monthly.times(0.2).toDecimalPlaces(2);
        itemsData.push({
          assignmentId: created.id,
          componentId: hraComp.id,
          monthlyAmount: hMonthly,
          annualAmount: hMonthly.times(12),
        });
      }
      if (specialComp) {
        const sMonthly = monthly.times(0.3).toDecimalPlaces(2);
        itemsData.push({
          assignmentId: created.id,
          componentId: specialComp.id,
          monthlyAmount: sMonthly,
          annualAmount: sMonthly.times(12),
        });
      }

      if (itemsData.length > 0) {
        await tx.employeeSalaryItem.createMany({ data: itemsData });
      }

      return created;
    });

    await AuditService.log({
      tenantId,
      actorId,
      action: "SALARY_ASSIGNED",
      resourceType: "EmployeeSalaryAssignment",
      resourceId: assignment.id,
      details: { employeeId, ctcAnnual: annual.toString() },
    });

    return res.status(201).json({ assignment });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 5. EMPLOYEE LOANS & REIMBURSEMENTS (HR-PAY-07)
// =========================================================================

/**
 * GET /loans — List employee loans
 */
hrPayrollRouter.get("/loans", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const loans = await LoanService.listLoans(tenantId);
    return res.json({ loans });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /loans — Create / approve a loan
 */
hrPayrollRouter.post("/loans", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const actorId = req.user?.userId || "system";
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const { employeeId, loanType, principal, interestRate, tenureMonths, deductionStartMonth, reason } = req.body;
    if (!employeeId || !principal || !tenureMonths || !deductionStartMonth) {
      return res.status(400).json({ error: "employeeId, principal, tenureMonths, deductionStartMonth required" });
    }

    const loan = await LoanService.createLoan(
      tenantId,
      {
        employeeId,
        loanType,
        principal: Number(principal),
        interestRate: Number(interestRate || 0),
        tenureMonths: Number(tenureMonths),
        deductionStartMonth,
        reason,
      },
      actorId
    );

    return res.status(201).json({ loan });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /reimbursements — List approved claims ready for payroll
 */
hrPayrollRouter.get("/reimbursements", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const claims = await db.expenseClaim.findMany({
      where: { tenantId, reimbursementMethod: "payroll_addition" },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
          },
        },
        category: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ reimbursements: claims });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 6. TAX DECLARATIONS & STATUTORY FORMS (HR-PAY-06, HR-PAY-08)
// =========================================================================

/**
 * GET /tax/declarations — List declarations
 */
hrPayrollRouter.get("/tax/declarations", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const { financialYear } = req.query;
    const db = getTenantDb();
    const where: any = { tenantId };
    if (financialYear) where.financialYear = String(financialYear);

    const declarations = await db.employeeTaxDeclaration.findMany({
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
        proofs: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ declarations });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /tax/proofs/:id — Review and verify / reject proof
 */
hrPayrollRouter.patch("/tax/proofs/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const actorId = req.user?.userId || "system";
    const proofId = req.params.id;
    const { status, approvedAmount, rejectionReason } = req.body;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const proof = await db.taxDeclarationProof.update({
      where: { id: proofId },
      data: {
        status,
        approvedAmount: approvedAmount !== undefined ? new Decimal(approvedAmount) : undefined,
        rejectionReason,
      },
    });

    await AuditService.log({
      tenantId,
      actorId,
      action: "TAX_PROOF_VERIFIED",
      resourceType: "TaxDeclarationProof",
      resourceId: proof.id,
      details: { status, approvedAmount },
    });

    return res.json({ proof });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /forms/summary — Statutory compliance summary
 */
hrPayrollRouter.get("/forms/summary", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const runsCount = await db.payrollRun.count({ where: { tenantId } });
    const employeesCount = await db.employee.count({ where: { tenantId, status: "active" } });
    const declarationsCount = await db.employeeTaxDeclaration.count({ where: { tenantId } });

    return res.json({
      statutoryForms: [
        { code: "FORM_16", title: "Form 16 (Part A & B)", act: "Income-tax Act, 2025", status: "READY" },
        { code: "PF_FORM_11", title: "EPF Form 11 (Declaration)", act: "Employees' Provident Funds Act, 1952", status: "READY" },
        { code: "PF_FORM_19", title: "EPF Form 19 (Final Settlement)", act: "EPF Act, 1952", status: "READY" },
        { code: "ESI_FORM_1", title: "ESIC Form 1 (Declaration)", act: "Employees' State Insurance Act, 1948", status: "READY" },
        { code: "PT_FORM_5", title: "Professional Tax Return (Monthly)", act: "State PT Act", status: "READY" },
      ],
      metrics: { runsCount, employeesCount, declarationsCount },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
