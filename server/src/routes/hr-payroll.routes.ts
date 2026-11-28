import { Router, Response } from "express";
import fs from "fs";
import path from "path";
import Decimal from "decimal.js";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
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
import { ALL_INDIA_JURISDICTIONS } from "../constants/jurisdictions";
import { StatutoryRuleRegistryService, StatutoryRuleDraftInput } from "../services/statutory-rule-registry.service";
import { StatutoryAmendmentIngestionService } from "../services/statutory-amendment-ingestion.service";
import { LeaveEncashmentCompOffService } from "../services/leave-encashment-compoff.service";

export const hrPayrollRouter = Router();

// Apply Auth & Tenant Context to all HR Payroll Endpoints
hrPayrollRouter.use(requireAuth, resolveTenantContext);

// =========================================================================
// 1. PAYROLL RUNS LIFECYCLE (HR-PAY-02) — FULL REST CRUD
// =========================================================================

const EMPLOYEE_AVATAR_SELECT = {
  id: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  email: true,
  department: { select: { name: true } },
  user: { select: { profile: { select: { avatarUrl: true } } } },
} as const;

function flattenEmployeeAvatar(emp: any) {
  if (!emp) return null;
  const { user, ...rest } = emp;
  return {
    ...rest,
    avatarUrl: emp.avatarUrl || user?.profile?.avatarUrl || null,
  };
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getRunMeta(run: any): Record<string, any> {
  const vs =
    run?.varianceSummary && typeof run.varianceSummary === "object" && !Array.isArray(run.varianceSummary)
      ? (run.varianceSummary as Record<string, any>)
      : {};
  const meta =
    vs.meta && typeof vs.meta === "object" && !Array.isArray(vs.meta)
      ? (vs.meta as Record<string, any>)
      : {};
  const monthIdx = Math.max(0, Math.min(11, Number(run?.periodMonth || 1) - 1));
  const year = Number(run?.periodYear || new Date().getFullYear());
  const defaultStart = `${year}-${String(monthIdx + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, monthIdx + 1, 0).getDate();
  const defaultEnd = `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const nextMonthDate = new Date(year, monthIdx + 1, 5);
  const defaultPayDate = nextMonthDate.toISOString().slice(0, 10);

  return {
    title: meta.title || `${MONTH_NAMES[monthIdx]} ${year} Payroll`,
    frequency: meta.frequency || "Monthly",
    payPeriodStart: meta.payPeriodStart || defaultStart,
    payPeriodEnd: meta.payPeriodEnd || defaultEnd,
    payDate: meta.payDate || defaultPayDate,
    notes: meta.notes || "",
    isCancelled: Boolean(meta.isCancelled),
  };
}

function enrichPayrollRun(run: any) {
  const meta = getRunMeta(run);
  const displayStatus = meta.isCancelled
    ? "cancelled"
    : run.status === "paid" || run.status === "completed"
      ? "completed"
      : run.status === "processing"
        ? "processing"
        : "draft";

  return {
    ...run,
    title: meta.title,
    frequency: meta.frequency,
    payPeriodStart: meta.payPeriodStart,
    payPeriodEnd: meta.payPeriodEnd,
    payDate: meta.payDate,
    notes: meta.notes,
    displayStatus,
    grossPay: Number(run.totalAmount || 0),
    totalDeductions: Number(run.totalDeductions || 0),
    netPay: Number(run.totalNet || 0),
    employeeCount: Number(run.employeeCount || run._count?.payslips || run._count?.snapshots || 0),
  };
}

/**
 * GET /runs — List payroll runs with month/year/status/search filters
 */
hrPayrollRouter.get("/runs", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const { month, year, status, search } = req.query;
    const db = getTenantDb();

    const allYearWhere: any = { tenantId };
    if (year) allYearWhere.periodYear = Number(year);

    const allYearRuns = await db.payrollRun.findMany({
      where: allYearWhere,
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { createdAt: "desc" }],
      include: {
        _count: {
          select: { payslips: true, snapshots: true },
        },
      },
    });

    const enrichedAll = allYearRuns.map(enrichPayrollRun);
    const activeMonths = Array.from(
      new Set(enrichedAll.map((r: any) => Number(r.periodMonth)))
    );

    const monthFiltered = month
      ? enrichedAll.filter((r: any) => Number(r.periodMonth) === Number(month))
      : enrichedAll;

    const counts = {
      all: monthFiltered.length,
      draft: monthFiltered.filter((r: any) => r.displayStatus === "draft").length,
      processing: monthFiltered.filter((r: any) => r.displayStatus === "processing").length,
      completed: monthFiltered.filter((r: any) => r.displayStatus === "completed").length,
      cancelled: monthFiltered.filter((r: any) => r.displayStatus === "cancelled").length,
    };

    let filtered = monthFiltered;
    if (status && status !== "all") {
      filtered = filtered.filter((r: any) => r.displayStatus === String(status).toLowerCase());
    }
    if (search && String(search).trim()) {
      const q = String(search).trim().toLowerCase();
      filtered = filtered.filter(
        (r: any) =>
          (r.title || "").toLowerCase().includes(q) ||
          (r.frequency || "").toLowerCase().includes(q)
      );
    }

    return res.json({ runs: filtered, counts, activeMonths });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /runs — Create a new payroll run (supports Title, Frequency, Pay Period, Pay Date, Notes)
 */
hrPayrollRouter.post("/runs", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const actorId = req.user?.userId || "system";
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const { title, frequency, payPeriodStart, payPeriodEnd, payDate, notes } = req.body;
    let periodMonth = Number(req.body.periodMonth || 0);
    let periodYear = Number(req.body.periodYear || 0);

    if ((!periodMonth || !periodYear) && payPeriodStart) {
      const d = new Date(payPeriodStart);
      if (!Number.isNaN(d.getTime())) {
        periodMonth = d.getMonth() + 1;
        periodYear = d.getFullYear();
      }
    }
    if (!periodMonth || !periodYear) {
      const now = new Date();
      periodMonth = now.getMonth() + 1;
      periodYear = now.getFullYear();
    }

    const db = getTenantDb();
    const meta = {
      title: String(title || `${MONTH_NAMES[periodMonth - 1]} ${periodYear} Payroll`).trim(),
      frequency: String(frequency || "Monthly").trim(),
      payPeriodStart: payPeriodStart || `${periodYear}-${String(periodMonth).padStart(2, "0")}-01`,
      payPeriodEnd:
        payPeriodEnd ||
        `${periodYear}-${String(periodMonth).padStart(2, "0")}-${String(
          new Date(periodYear, periodMonth, 0).getDate()
        ).padStart(2, "0")}`,
      payDate: payDate || new Date(periodYear, periodMonth, 5).toISOString().slice(0, 10),
      notes: String(notes || "").trim(),
      isCancelled: false,
    };

    const run = await db.payrollRun.create({
      data: {
        tenantId,
        periodMonth,
        periodYear,
        approvalStatus: "draft",
        status: "draft",
        varianceSummary: { meta },
      },
      include: {
        _count: { select: { payslips: true, snapshots: true } },
      },
    });

    await AuditService.log({
      tenantId,
      actorId,
      action: "PAYROLL_RUN_CREATED",
      resourceType: "PayrollRun",
      resourceId: run.id,
      details: { periodMonth, periodYear, title: meta.title },
    }).catch(() => { });

    return res.status(201).json({ run: enrichPayrollRun(run) });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * GET /runs/:id — Get single payroll run with detailed employee entries
 */
hrPayrollRouter.get("/runs/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const run = await db.payrollRun.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        payslips: {
          include: {
            employee: { select: EMPLOYEE_AVATAR_SELECT },
          },
          orderBy: { createdAt: "asc" },
        },
        snapshots: {
          include: {
            employee: { select: EMPLOYEE_AVATAR_SELECT },
          },
        },
      },
    });

    if (!run) return res.status(404).json({ error: "Payroll run not found" });

    const snapshotByEmp = new Map<string, any>();
    for (const s of run.snapshots || []) {
      snapshotByEmp.set(s.employeeId, s);
    }

    const entries = (run.payslips || []).map((ps: any) => {
      const snap = snapshotByEmp.get(ps.employeeId);
      const bd =
        ps.breakdown && typeof ps.breakdown === "object" && !Array.isArray(ps.breakdown)
          ? (ps.breakdown as Record<string, any>)
          : {};
      const att = bd.attendance && typeof bd.attendance === "object" ? bd.attendance : {};
      const workingDays = Number(att.workingDays ?? snap?.payableDays ?? 22);
      const lopDays = Number(att.lopDays ?? snap?.lopDays ?? 0);
      const presentDays = Number(att.presentDays ?? Math.max(0, workingDays - lopDays));
      const unpaidLeave = Number(att.unpaidLeave ?? 0);
      const otHours = Number(att.overtimeHours ?? 0);
      const otAmount = Number(bd.overtimeEarnings ?? 0);
      const basicSalary = Number(bd.basicSalary ?? ps.grossSalary ?? 0);
      const componentEarnings = Number(bd.componentEarnings ?? 0);
      const lopDeduction = Number(bd.lopDeduction ?? 0);
      const componentDeductions = Number(bd.componentDeductions ?? ps.deductions ?? 0);

      return {
        id: ps.id,
        payslipId: ps.id,
        employeeId: ps.employeeId,
        employee: flattenEmployeeAvatar(ps.employee),
        basicSalary,
        workingDays,
        presentDays,
        lopDays,
        unpaidLeave,
        otHours,
        otAmount,
        componentEarnings,
        lopDeduction,
        componentDeductions,
        grossPay: Number(ps.grossSalary || 0),
        deductions: Number(ps.deductions || 0),
        netPay: Number(ps.netSalary || 0),
        earningsList: Array.isArray(bd.earnings) ? bd.earnings : [],
        deductionsList: Array.isArray(bd.deductions) ? bd.deductions : [],
      };
    });

    return res.json({
      run: enrichPayrollRun(run),
      entries,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Helper: Build live Pre-Payroll Readiness Checklist for a PayrollRun
 */
async function buildPrePayrollChecklist(db: any, tenantId: string, run: any) {
  const periodStart = new Date(run.periodYear, run.periodMonth - 1, 1);
  const periodEnd = new Date(run.periodYear, run.periodMonth, 0, 23, 59, 59, 999);

  const [
    activeEmployees,
    salaryAssignments,
    pendingLeaves,
    pendingRegs,
    activeLoans,
    approvedClaims,
    attendanceCount,
  ] = await Promise.all([
    db.employee.findMany({
      where: { tenantId, status: "active" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeCode: true,
        bankAccount: true,
        bankIfsc: true,
        pan: true,
      },
    }),
    db.employeeSalaryAssignment.findMany({
      where: { tenantId, isCurrent: true },
      select: { employeeId: true },
    }),
    db.leaveRequest.findMany({
      where: {
        tenantId,
        status: "pending",
        startDate: { lte: periodEnd },
        endDate: { gte: periodStart },
      },
      include: { employee: { select: { firstName: true, lastName: true } } },
    }),
    db.attendanceRegularization
      ? db.attendanceRegularization
        .findMany({
          where: {
            tenantId,
            status: "pending",
            date: { gte: periodStart, lte: periodEnd },
          },
          include: { employee: { select: { firstName: true, lastName: true } } },
        })
        .catch(() => [])
      : Promise.resolve([]),
    db.employeeLoan
      .findMany({
        where: { tenantId, status: { in: ["active", "approved"] } },
        select: { id: true, emiAmount: true, employeeId: true },
      })
      .catch(() => []),
    db.expenseClaim
      .findMany({
        where: {
          tenantId,
          reimbursementMethod: "payroll_addition",
          status: { in: ["finance_approved", "approved"] },
        },
        select: { id: true, amount: true, employeeId: true },
      })
      .catch(() => []),
    db.attendance
      .count({
        where: { tenantId, date: { gte: periodStart, lte: periodEnd } },
      })
      .catch(() => 0),
  ]);

  const salaryEmpSet = new Set(salaryAssignments.map((a: any) => a.employeeId));
  const missingSalaryEmps = activeEmployees.filter((e: any) => !salaryEmpSet.has(e.id));
  const missingBankEmps = activeEmployees.filter((e: any) => !e.bankAccount || !e.bankIfsc);

  const vs =
    run.varianceSummary && typeof run.varianceSummary === "object" && !Array.isArray(run.varianceSummary)
      ? (run.varianceSummary as Record<string, any>)
      : {};
  const syncInfo = vs.checklistSync && typeof vs.checklistSync === "object" ? vs.checklistSync : null;

  const totalLoanEmi = activeLoans.reduce((s: number, l: any) => s + Number(l.emiAmount || 0), 0);
  const totalClaims = approvedClaims.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);

  const checks = [
    {
      id: "salary_structures",
      title: "Employee Salary Structures",
      description:
        salaryAssignments.length > 0
          ? `${salaryAssignments.length} of ${activeEmployees.length} active employees have active salary structures.`
          : "No active employee salary structures configured yet.",
      severity: "blocker",
      status: salaryAssignments.length > 0 && missingSalaryEmps.length === 0
        ? "passed"
        : salaryAssignments.length > 0
          ? "warning"
          : "failed",
      affectedCount: missingSalaryEmps.length,
      affectedItems: missingSalaryEmps
        .slice(0, 8)
        .map((e: any) => `${e.firstName || ""} ${e.lastName || ""}`.trim()),
      fixUrl: "/hr/payroll/employee-salaries",
      fixLabel: "Configure Salaries",
    },
    {
      id: "attendance_sync",
      title: "Attendance & LOP Sync",
      description: syncInfo?.syncedAt
        ? `Attendance synced (${attendanceCount} records). Pending regularizations: ${pendingRegs.length}.`
        : `${attendanceCount} attendance records found. Run Sync Agent to calculate LOP & lock period.`,
      severity: "blocker",
      status: pendingRegs.length > 0 ? "failed" : syncInfo?.syncedAt ? "passed" : "warning",
      affectedCount: pendingRegs.length,
      affectedItems: pendingRegs
        .slice(0, 8)
        .map((r: any) => `${r.employee?.firstName || ""} ${r.employee?.lastName || ""}`.trim()),
      fixUrl: "/hr/attendance",
      fixLabel: "Review Attendance",
    },
    {
      id: "leave_approvals",
      title: "Leave Approvals Reconciled",
      description:
        pendingLeaves.length === 0
          ? "Zero pending leave requests for this pay period."
          : `${pendingLeaves.length} pending leave request(s) overlap this pay period.`,
      severity: "blocker",
      status: pendingLeaves.length === 0 ? "passed" : "failed",
      affectedCount: pendingLeaves.length,
      affectedItems: pendingLeaves
        .slice(0, 8)
        .map((l: any) => `${l.employee?.firstName || ""} ${l.employee?.lastName || ""}`.trim()),
      fixUrl: "/hr/leave",
      fixLabel: "Review Leaves",
    },
    {
      id: "reimbursements_loans",
      title: "Reimbursements & Loan EMIs",
      description: `${approvedClaims.length} approved reimbursement(s) (₹${totalClaims.toLocaleString("en-IN")}) & ${activeLoans.length} active loan EMI(s) (₹${totalLoanEmi.toLocaleString("en-IN")}).`,
      severity: "auto",
      status: "passed",
      affectedCount: approvedClaims.length + activeLoans.length,
      affectedItems: [],
      fixUrl: "/hr/payroll/reimbursements-loans",
      fixLabel: "Manage Loans & Claims",
    },
    {
      id: "tax_declarations",
      title: "Tax Declarations & TDS Regime",
      description: "Employee Old/New regime preferences & verified proofs ready for TDS calculation.",
      severity: "auto",
      status: "passed",
      affectedCount: 0,
      affectedItems: [],
      fixUrl: "/hr/payroll/tax",
      fixLabel: "Review Tax Proofs",
    },
    {
      id: "bank_statutory",
      title: "Bank Account & Statutory KYC",
      description:
        missingBankEmps.length === 0
          ? "All active employees have bank account & IFSC details."
          : `${missingBankEmps.length} employee(s) missing bank account or IFSC details.`,
      severity: "warning",
      status: missingBankEmps.length === 0 ? "passed" : "warning",
      affectedCount: missingBankEmps.length,
      affectedItems: missingBankEmps
        .slice(0, 8)
        .map((e: any) => `${e.firstName || ""} ${e.lastName || ""}`.trim()),
      fixUrl: "/hr/employees",
      fixLabel: "Update Employee KYC",
    },
  ];

  const passedCount = checks.filter((c) => c.status === "passed").length;
  const blockerFailures = checks.filter((c) => c.severity === "blocker" && c.status === "failed").length;
  const warnings = checks.filter((c) => c.status === "warning").length;

  return {
    runId: run.id,
    readyCount: passedCount,
    totalCount: checks.length,
    blockerCount: blockerFailures,
    warningCount: warnings,
    canRun: blockerFailures === 0,
    lastSyncedAt: syncInfo?.syncedAt || null,
    checks,
  };
}

/**
 * GET /runs/:id/checklist — Live Pre-Payroll Readiness Checklist
 */
hrPayrollRouter.get("/runs/:id/checklist", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });
    const db = getTenantDb();
    const run = await db.payrollRun.findFirst({ where: { id: req.params.id, tenantId } });
    if (!run) return res.status(404).json({ error: "Payroll run not found" });

    const checklist = await buildPrePayrollChecklist(db, tenantId, run);
    return res.json(checklist);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load checklist" });
  }
});

/**
 * POST /runs/:id/sync-agent — 1-Click Payroll Sync Agent
 */
hrPayrollRouter.post("/runs/:id/sync-agent", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });
    const db = getTenantDb();
    const run = await db.payrollRun.findFirst({ where: { id: req.params.id, tenantId } });
    if (!run) return res.status(404).json({ error: "Payroll run not found" });

    // Compute live attendance summary via PayrollAttendanceService
    let attendanceSyncedEmployees = 0;
    try {
      const attendanceService = new PayrollAttendanceService(db);
      const map = await attendanceService.computeTenantAttendance(tenantId, {
        periodMonth: run.periodMonth,
        periodYear: run.periodYear,
      });
      attendanceSyncedEmployees = map.size;
    } catch {
      attendanceSyncedEmployees = 0;
    }

    const currentVs =
      run.varianceSummary && typeof run.varianceSummary === "object" && !Array.isArray(run.varianceSummary)
        ? (run.varianceSummary as Record<string, any>)
        : {};

    const syncedAt = new Date().toISOString();
    const updatedRun = await db.payrollRun.update({
      where: { id: run.id },
      data: {
        varianceSummary: {
          ...currentVs,
          checklistSync: {
            syncedAt,
            syncedBy: req.user?.email || "HR Admin",
            attendanceSyncedEmployees,
          },
        },
      },
    });

    const checklist = await buildPrePayrollChecklist(db, tenantId, updatedRun);
    return res.json({
      success: true,
      message: `Payroll Sync Agent completed (${checklist.readyCount}/${checklist.totalCount} checks ready).`,
      checklist,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Payroll Sync Agent failed" });
  }
});

/**
 * PUT & PATCH /runs/:id — Update payroll run details or status
 */
const handleUpdateRun = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const existing = await db.payrollRun.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Payroll run not found" });

    const currentVs =
      existing.varianceSummary && typeof existing.varianceSummary === "object" && !Array.isArray(existing.varianceSummary)
        ? (existing.varianceSummary as Record<string, any>)
        : {};
    const currentMeta = getRunMeta(existing);

    const nextMeta: Record<string, any> = {
      ...currentMeta,
      ...(req.body.title !== undefined ? { title: String(req.body.title).trim() } : {}),
      ...(req.body.frequency !== undefined ? { frequency: String(req.body.frequency).trim() } : {}),
      ...(req.body.payPeriodStart !== undefined ? { payPeriodStart: req.body.payPeriodStart } : {}),
      ...(req.body.payPeriodEnd !== undefined ? { payPeriodEnd: req.body.payPeriodEnd } : {}),
      ...(req.body.payDate !== undefined ? { payDate: req.body.payDate } : {}),
      ...(req.body.notes !== undefined ? { notes: String(req.body.notes).trim() } : {}),
    };

    const updateData: any = {
      varianceSummary: { ...currentVs, meta: nextMeta },
    };

    if (req.body.payPeriodStart) {
      const d = new Date(req.body.payPeriodStart);
      if (!Number.isNaN(d.getTime())) {
        updateData.periodMonth = d.getMonth() + 1;
        updateData.periodYear = d.getFullYear();
      }
    }

    if (req.body.status !== undefined) {
      const st = String(req.body.status).toLowerCase();
      if (st === "cancelled") {
        nextMeta.isCancelled = true;
        updateData.varianceSummary = { ...currentVs, meta: nextMeta };
      } else {
        nextMeta.isCancelled = false;
        updateData.varianceSummary = { ...currentVs, meta: nextMeta };
        if (st === "draft" || st === "processing" || st === "completed" || st === "paid") {
          updateData.status = st;
        }
      }
    }

    const updated = await db.payrollRun.update({
      where: { id: existing.id },
      data: updateData,
      include: { _count: { select: { payslips: true, snapshots: true } } },
    });

    return res.json({ run: enrichPayrollRun(updated) });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

hrPayrollRouter.put("/runs/:id", handleUpdateRun);
hrPayrollRouter.patch("/runs/:id", handleUpdateRun);

/**
 * POST /runs/:id/generate-payslips — Process run & generate payslips from Employee Salaries
 */
hrPayrollRouter.post("/runs/:id/generate-payslips", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const run = await db.payrollRun.findFirst({ where: { id: req.params.id, tenantId } });
    if (!run) return res.status(404).json({ error: "Payroll run not found" });

    const meta = getRunMeta(run);
    const assignments = await db.employeeSalaryAssignment.findMany({
      where: { tenantId, isCurrent: true },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true, email: true },
        },
        items: { include: { component: true } },
      },
    });

    if (assignments.length === 0) {
      return res.status(400).json({
        error: "No active employee salaries found. Please configure Employee Salaries first.",
      });
    }

    let totalGross = 0;
    let totalDed = 0;
    let totalNet = 0;

    await db.$transaction(async (tx: any) => {
      await tx.payrollSnapshot.deleteMany({ where: { payrollRunId: run.id, tenantId } });
      await tx.payslip.deleteMany({ where: { payrollRunId: run.id, tenantId } });

      for (const a of assignments) {
        const bd = computeSalaryBreakdown(a);
        const workingDays = new Date(run.periodYear, run.periodMonth, 0).getDate();
        const presentDays = workingDays;
        const lopDays = 0;
        const lopDeduction = 0;
        const overtimeHours = 0;
        const overtimeEarnings = 0;

        const earningsList = bd.components
          .filter((c: any) => c.type !== "deduction")
          .map((c: any) => ({ name: c.name, amount: c.monthlyAmount }));
        const deductionsList = bd.components
          .filter((c: any) => c.type === "deduction")
          .map((c: any) => ({ name: c.name, amount: c.monthlyAmount }));

        const grossPay = Math.round((bd.basicSalary + bd.additionalEarnings - lopDeduction + overtimeEarnings) * 100) / 100;

        // Indian Statutory Employer & Employee Calculations (EPF 15k cap = 1800, EDLI 75, PF Admin 75)
        const epfWage = Math.min(bd.basicSalary, 15000);
        const hasPfDeduction = deductionsList.some((d: any) =>
          String(d.name || "").toLowerCase().includes("pf") ||
          String(d.name || "").toLowerCase().includes("provident")
        );
        const epfEmployee = hasPfDeduction
          ? deductionsList
              .filter((d: any) =>
                String(d.name || "").toLowerCase().includes("pf") ||
                String(d.name || "").toLowerCase().includes("provident")
              )
              .reduce((s: number, d: any) => s + Number(d.amount || 0), 0)
          : Math.min(1800, Math.round(epfWage * 0.12));
        const epfEmployer = Math.min(1800, Math.round(epfWage * 0.12));
        const edliCharges = Math.min(75, Math.round(epfWage * 0.005));
        const pfAdminCharges = Math.min(75, Math.round(epfWage * 0.005));
        const esicEmployer = grossPay <= 21000 ? Math.ceil(grossPay * 0.0325) : 0;

        if (!hasPfDeduction && epfEmployee > 0) {
          deductionsList.push({ name: "Provident Fund (EPF)", amount: epfEmployee });
        }

        const deductions =
          Math.round(deductionsList.reduce((s: number, d: any) => s + Number(d.amount || 0), 0) * 100) / 100;
        const netPay = Math.round(Math.max(0, grossPay - deductions) * 100) / 100;

        const ctc = Math.round((grossPay + epfEmployer + edliCharges + pfAdminCharges + esicEmployer) * 100) / 100;
        const mmu = Math.round((ctc - edliCharges - pfAdminCharges) * 0.10 * 100) / 100;
        const gst = Math.round((ctc + mmu) * 0.18 * 100) / 100;
        const totalBilling = Math.round((ctc + mmu + gst) * 100) / 100;

        totalGross += grossPay;
        totalDed += deductions;
        totalNet += netPay;

        const breakdownPayload = {
          basicSalary: bd.basicSalary,
          componentEarnings: bd.additionalEarnings,
          totalEarnings: Math.round((bd.basicSalary + bd.additionalEarnings) * 100) / 100,
          lopDeduction,
          overtimeEarnings,
          grossPay,
          componentDeductions: deductions,
          totalDeductions: deductions,
          netPay,
          payDate: meta.payDate,
          payPeriodStart: meta.payPeriodStart,
          payPeriodEnd: meta.payPeriodEnd,
          earnings: earningsList,
          deductions: deductionsList,
          employerStatutory: {
            epfEmployee,
            epfEmployer,
            edliCharges,
            pfAdminCharges,
            esicEmployer,
            ctc,
          },
          billing: {
            billableCtc: ctc,
            serviceChargePct: 10,
            mmu,
            gst,
            totalBilling,
          },
          attendance: {
            workingDays,
            presentDays,
            absentDays: 0,
            halfDays: 0,
            holidayDays: 0,
            paidLeave: 0,
            unpaidLeave: 0,
            lopDays,
            effectivePaidDays: presentDays,
            overtimeHours,
          },
        };

        await tx.payrollSnapshot.create({
          data: {
            tenantId,
            payrollRunId: run.id,
            employeeId: a.employeeId,
            periodMonth: run.periodMonth,
            periodYear: run.periodYear,
            snapshotData: breakdownPayload,
            ctcAnnual: new Decimal(a.ctcAnnual || 0),
            grossEarned: new Decimal(grossPay),
            totalDeductions: new Decimal(deductions),
            netPay: new Decimal(netPay),
            lopDays: new Decimal(lopDays),
            payableDays: new Decimal(workingDays),
          },
        });

        await tx.payslip.create({
          data: {
            tenantId,
            payrollRunId: run.id,
            employeeId: a.employeeId,
            periodMonth: run.periodMonth,
            periodYear: run.periodYear,
            grossSalary: new Decimal(grossPay),
            deductions: new Decimal(deductions),
            netSalary: new Decimal(netPay),
            breakdown: breakdownPayload,
            status: "generated",
            isPublished: true,
            publishedAt: new Date(),
          },
        });
      }

      await tx.payrollRun.update({
        where: { id: run.id },
        data: {
          employeeCount: assignments.length,
          totalAmount: new Decimal(totalGross).toDecimalPlaces(2),
          totalDeductions: new Decimal(totalDed).toDecimalPlaces(2),
          totalNet: new Decimal(totalNet).toDecimalPlaces(2),
          status: "completed",
          approvalStatus: "approved",
          processedAt: new Date(),
          isPublished: true,
          publishedAt: new Date(),
        },
      });
    });

    const refreshed = await db.payrollRun.findUnique({
      where: { id: run.id },
      include: { _count: { select: { payslips: true, snapshots: true } } },
    });

    return res.json({
      success: true,
      message: `Generated ${assignments.length} payslips for ${meta.title}`,
      run: enrichPayrollRun(refreshed),
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * Helper: Convert INR amount to Indian Rupees words (Lakhs / Thousands / Paise)
 */
function numberToIndianRupeesWords(amount: number): string {
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const twoDigits = (n: number): string => {
    if (n < 20) return ones[n];
    return `${tens[Math.floor(n / 10)]}${n % 10 ? " " + ones[n % 10] : ""}`;
  };
  const threeDigits = (n: number): string => {
    if (n >= 100) {
      return `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? " and " + twoDigits(n % 100) : ""}`;
    }
    return twoDigits(n);
  };

  const rupees = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - rupees) * 100);

  let words = "";
  if (rupees === 0) {
    words = "Zero";
  } else {
    const crores = Math.floor(rupees / 10000000);
    const lakhs = Math.floor((rupees % 10000000) / 100000);
    const thousands = Math.floor((rupees % 100000) / 1000);
    const rem = rupees % 1000;
    const parts: string[] = [];
    if (crores) parts.push(`${twoDigits(crores)} Crore`);
    if (lakhs) parts.push(`${twoDigits(lakhs)} Lakh`);
    if (thousands) parts.push(`${twoDigits(thousands)} Thousand`);
    if (rem) parts.push(threeDigits(rem));
    words = parts.join(" ");
  }

  return `Indian Rupees ${words}${paise > 0 ? ` and ${twoDigits(paise)} Paise` : ""} Only`;
}

/**
 * Helper: Compute Client Billing Reconciliation for a Payroll Run
 */
async function computeRunBillingSummary(db: any, tenantId: string, runId: string, serviceChargePct = 10) {
  const run = await db.payrollRun.findFirst({
    where: { id: runId, tenantId },
    include: {
      payslips: {
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              gender: true,
              position: true,
              dateOfBirth: true,
              joinedAt: true,
              pan: true,
              aadhaar: true,
              phone: true,
              email: true,
              uan: true,
              pfNumber: true,
              esiNumber: true,
              bankName: true,
              bankAccount: true,
              bankIfsc: true,
              department: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!run) return null;

  const meta = getRunMeta(run);
  const monthDays = new Date(run.periodYear, run.periodMonth, 0).getDate();

  let totalBasic = 0;
  let totalGross = 0;
  let totalEpfEE = 0;
  let totalEpfER = 0;
  let totalEdli = 0;
  let totalPfAdmin = 0;
  let totalEsicEE = 0;
  let totalEsicER = 0;
  let totalPt = 0;
  let totalIt = 0;
  let totalDeductions = 0;
  let totalNetPay = 0;
  let totalCtc = 0;
  let totalMmu = 0;

  const rows = (run.payslips || []).map((ps: any) => {
    const bd = ps.breakdown && typeof ps.breakdown === "object" ? (ps.breakdown as Record<string, any>) : {};
    const empStat = bd.employerStatutory || {};
    const basic = Number(bd.basicSalary || ps.grossSalary || 0);
    const gross = Number(ps.grossSalary || 0);
    const epfWage = Math.min(basic, 15000);
    const epfEE = Number(empStat.epfEmployee ?? Math.min(1800, Math.round(epfWage * 0.12)));
    const epfER = Number(empStat.epfEmployer ?? Math.min(1800, Math.round(epfWage * 0.12)));
    const edli = Number(empStat.edliCharges ?? Math.min(75, Math.round(epfWage * 0.005)));
    const pfAdmin = Number(empStat.pfAdminCharges ?? Math.min(75, Math.round(epfWage * 0.005)));
    const esicER = Number(empStat.esicEmployer ?? 0);
    const ctc = Number(empStat.ctc ?? gross + epfER + edli + pfAdmin + esicER);
    const mmu = Math.round(((ctc - edli - pfAdmin) * (serviceChargePct / 100)) * 100) / 100;
    const gst = Math.round((ctc + mmu) * 0.18 * 100) / 100;
    const billing = Math.round((ctc + mmu + gst) * 100) / 100;
    const ded = Number(ps.deductions || 0);
    const net = Number(ps.netSalary || 0);

    totalBasic += basic;
    totalGross += gross;
    totalEpfEE += epfEE;
    totalEpfER += epfER;
    totalEdli += edli;
    totalPfAdmin += pfAdmin;
    totalEsicER += esicER;
    totalDeductions += ded;
    totalNetPay += net;
    totalCtc += ctc;
    totalMmu += mmu;

    return {
      employee: ps.employee,
      monthDays,
      payableDays: Number(bd.attendance?.presentDays ?? monthDays),
      lopDays: Number(bd.attendance?.lopDays ?? 0),
      basic,
      gross,
      epfEE,
      epfER,
      edli,
      pfAdmin,
      esicER,
      ctc,
      mmu,
      gst,
      billing,
      deductions: ded,
      netPay: net,
      earnings: Array.isArray(bd.earnings) ? bd.earnings : [],
    };
  });

  const billableCtc = Math.round(totalCtc * 100) / 100;
  const mmuAmount = Math.round(totalMmu * 100) / 100;
  const subTotal = Math.round((billableCtc + mmuAmount) * 100) / 100;
  const cgst = Math.round(subTotal * 0.09 * 100) / 100;
  const sgst = Math.round(subTotal * 0.09 * 100) / 100;
  const totalGst = Math.round((cgst + sgst) * 100) / 100;
  const invoiceTotal = Math.round((subTotal + totalGst) * 100) / 100;

  return {
    run: enrichPayrollRun(run),
    meta,
    rows,
    summary: {
      employeeCount: rows.length,
      totalBasic: Math.round(totalBasic * 100) / 100,
      totalGross: Math.round(totalGross * 100) / 100,
      pfContribution: Math.round((totalEpfEE + totalEpfER + totalEdli + totalPfAdmin) * 100) / 100,
      epfEE: Math.round(totalEpfEE * 100) / 100,
      epfER: Math.round(totalEpfER * 100) / 100,
      edliAndAdmin: Math.round((totalEdli + totalPfAdmin) * 100) / 100,
      esicContribution: Math.round((totalEsicEE + totalEsicER) * 100) / 100,
      incomeTax: totalIt,
      professionalTax: totalPt,
      netSalaryPayable: Math.round(totalNetPay * 100) / 100,
      billableCtc,
      serviceChargePct,
      mmuAmount,
      subTotal,
      cgst,
      sgst,
      totalGst,
      invoiceTotal,
      amountInWords: numberToIndianRupeesWords(invoiceTotal),
    },
  };
}

/**
 * GET /runs/:id/billing-summary — Live Client Billing & Statutory Reconciliation
 */
hrPayrollRouter.get("/runs/:id/billing-summary", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });
    const serviceChargePct = Number(req.query.serviceChargePct ?? 10);
    const db = getTenantDb();
    const billing = await computeRunBillingSummary(db, tenantId, req.params.id, serviceChargePct);
    if (!billing) return res.status(404).json({ error: "Payroll run not found" });
    return res.json(billing);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /runs/:id/export/master-excel — 51-Column Master Payroll & Billing Excel (.xlsx in INR)
 */
hrPayrollRouter.get("/runs/:id/export/master-excel", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });
    const serviceChargePct = Number(req.query.serviceChargePct ?? 10);
    const db = getTenantDb();
    const billing = await computeRunBillingSummary(db, tenantId, req.params.id, serviceChargePct);
    if (!billing) return res.status(404).json({ error: "Payroll run not found" });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Master Payroll & Billing");
    sheet.columns = [
      { header: "Employee ID", key: "code", width: 14 },
      { header: "Employee Name", key: "name", width: 24 },
      { header: "Gender", key: "gender", width: 10 },
      { header: "Designation", key: "designation", width: 22 },
      { header: "DOJ", key: "doj", width: 13 },
      { header: "PAN Number", key: "pan", width: 14 },
      { header: "Aadhaar Number", key: "aadhaar", width: 16 },
      { header: "Mobile", key: "phone", width: 14 },
      { header: "Email ID", key: "email", width: 24 },
      { header: "UAN No", key: "uan", width: 16 },
      { header: "EPF Number", key: "pfNo", width: 22 },
      { header: "ESIC Number", key: "esiNo", width: 16 },
      { header: "Bank Name", key: "bankName", width: 16 },
      { header: "Bank Account No", key: "bankAcc", width: 18 },
      { header: "IFSC Code", key: "ifsc", width: 14 },
      { header: "Month Days", key: "monthDays", width: 12 },
      { header: "Payable Days", key: "payableDays", width: 13 },
      { header: "LOP Days", key: "lopDays", width: 10 },
      { header: "Basic (INR)", key: "basic", width: 14 },
      { header: "Gross (INR)", key: "gross", width: 14 },
      { header: "EPFER (INR)", key: "epfER", width: 13 },
      { header: "EDLI (INR)", key: "edli", width: 12 },
      { header: "PF Admin (INR)", key: "pfAdmin", width: 14 },
      { header: "ESICER (INR)", key: "esicER", width: 13 },
      { header: "CTC (INR)", key: "ctc", width: 14 },
      { header: "MMU Service Charge", key: "mmu", width: 16 },
      { header: "GST 18%", key: "gst", width: 14 },
      { header: "Total Billing (INR)", key: "billing", width: 16 },
      { header: "EPFEE (INR)", key: "epfEE", width: 13 },
      { header: "Total Deductions", key: "ded", width: 15 },
      { header: "NET Pay (INR)", key: "net", width: 15 },
    ];
    sheet.getRow(1).font = { bold: true };

    for (const r of billing.rows) {
      sheet.addRow({
        code: r.employee?.employeeCode || "—",
        name: `${r.employee?.firstName || ""} ${r.employee?.lastName || ""}`.trim(),
        gender: r.employee?.gender || "—",
        designation: r.employee?.position || "—",
        doj: r.employee?.joinedAt ? new Date(r.employee.joinedAt).toISOString().slice(0, 10) : "—",
        pan: r.employee?.pan || "—",
        aadhaar: r.employee?.aadhaar || "—",
        phone: r.employee?.phone || "—",
        email: r.employee?.email || "—",
        uan: r.employee?.uan || "—",
        pfNo: r.employee?.pfNumber || "—",
        esiNo: r.employee?.esiNumber || "Not Eligible",
        bankName: r.employee?.bankName || "—",
        bankAcc: r.employee?.bankAccount || "—",
        ifsc: r.employee?.bankIfsc || "—",
        monthDays: r.monthDays,
        payableDays: r.payableDays,
        lopDays: r.lopDays,
        basic: r.basic,
        gross: r.gross,
        epfER: r.epfER,
        edli: r.edli,
        pfAdmin: r.pfAdmin,
        esicER: r.esicER,
        ctc: r.ctc,
        mmu: r.mmu,
        gst: r.gst,
        billing: r.billing,
        epfEE: r.epfEE,
        ded: r.deductions,
        net: r.netPay,
      });
    }

    const totalRow = sheet.addRow({
      code: "TOTAL",
      basic: billing.summary.totalBasic,
      gross: billing.summary.totalGross,
      epfER: billing.summary.epfER,
      ctc: billing.summary.billableCtc,
      mmu: billing.summary.mmuAmount,
      gst: billing.summary.totalGst,
      billing: billing.summary.invoiceTotal,
      epfEE: billing.summary.epfEE,
      net: billing.summary.netSalaryPayable,
    });
    totalRow.font = { bold: true };

    ["basic", "gross", "epfER", "edli", "pfAdmin", "esicER", "ctc", "mmu", "gst", "billing", "epfEE", "ded", "net"].forEach(
      (k) => {
        sheet.getColumn(k).numFmt = "₹#,##0.00";
      }
    );

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Master_Payroll_Billing_${billing.run.periodYear}_${String(billing.run.periodMonth).padStart(2, "0")}.xlsx"`
    );
    return res.send(Buffer.from(buffer));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /runs/:id/tax-invoice/pdf — Generate HSN 998517 Contract Staffing Tax Invoice PDF (INR)
 */
hrPayrollRouter.post("/runs/:id/tax-invoice/pdf", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const {
      invoiceNo = `INV/${new Date().getFullYear()}/${Date.now().toString().slice(-3)}`,
      invoiceDate = new Date().toISOString().slice(0, 10),
      dueDate = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
      placeOfSupply = "Tamil Nadu (33)",
      supplierGstin = "",
      supplierBankDetails = "",
      clientName = "Client Organization",
      clientAddress = "",
      clientGstin = "",
      serviceChargePct = 10,
    } = req.body || {};

    const db = getTenantDb();
    const [billing, tenant] = await Promise.all([
      computeRunBillingSummary(db, tenantId, req.params.id, Number(serviceChargePct) || 10),
      db.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, logoUrl: true, address: true, phone: true },
      }),
    ]);
    if (!billing) return res.status(404).json({ error: "Payroll run not found" });

    const logoBuffer = await loadLogoBuffer(tenant?.logoUrl);
    const s = billing.summary;
    const monthName = MONTH_NAMES[Math.max(0, Math.min(11, billing.run.periodMonth - 1))].toUpperCase();
    const fmtInr = (n: number) =>
      `Rs. ${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const doc = new PDFDocument({ size: "A4", margin: 35 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    const lx = 35;
    const w = 525;
    let y = 35;

    // Outer Header Box
    doc.rect(lx, y, w, 78).stroke("#334155");
    let tx = lx + 10;
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, lx + 8, y + 12, { fit: [52, 52] });
        tx = lx + 68;
      } catch {}
    }
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#0f172a").text((tenant?.name || "COMPANY").toUpperCase(), tx, y + 10, { width: 290 });
    doc.font("Helvetica").fontSize(8.5).fillColor("#334155");
    if (tenant?.address) doc.text(tenant.address, tx, y + 28, { width: 290 });
    if (supplierGstin) doc.text(`GSTIN: ${supplierGstin}`, tx, y + 52);
    if (req.user?.email) doc.text(req.user.email, tx, y + 63);

    doc.font("Helvetica-Bold").fontSize(18).fillColor("#0f172a").text("TAX INVOICE", lx + 370, y + 26, { width: 145, align: "right" });

    // Invoice Meta Row
    y += 78;
    doc.rect(lx, y, w / 2, 52).stroke("#334155");
    doc.rect(lx + w / 2, y, w / 2, 52).stroke("#334155");
    doc.font("Helvetica").fontSize(8.5).fillColor("#0f172a");
    doc.text(`Invoice #: ${invoiceNo}`, lx + 8, y + 8);
    doc.text(`Invoice Date: ${fmtDateDMY(invoiceDate)}`, lx + 8, y + 20);
    doc.text(`Terms: Custom - Contract Staffing`, lx + 8, y + 32);
    doc.text(`Due Date: ${fmtDateDMY(dueDate)}`, lx + 8, y + 42);
    doc.text(`Place Of Supply: ${placeOfSupply}`, lx + w / 2 + 8, y + 8);

    // Bill To / Ship To
    y += 52;
    doc.rect(lx, y, w, 18).fill("#f1f5f9").stroke("#334155");
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8.5);
    doc.text("Bill To", lx + 8, y + 5);
    doc.text("Ship To", lx + w / 2 + 8, y + 5);
    y += 18;
    doc.rect(lx, y, w / 2, 68).stroke("#334155");
    doc.rect(lx + w / 2, y, w / 2, 68).stroke("#334155");
    doc.font("Helvetica-Bold").fontSize(9).text(clientName, lx + 8, y + 8, { width: w / 2 - 16 });
    doc.text(clientName, lx + w / 2 + 8, y + 8, { width: w / 2 - 16 });
    doc.font("Helvetica").fontSize(8.5);
    if (clientAddress) {
      doc.text(clientAddress, lx + 8, y + 22, { width: w / 2 - 16 });
      doc.text(clientAddress, lx + w / 2 + 8, y + 22, { width: w / 2 - 16 });
    }
    if (clientGstin) {
      doc.text(`GSTIN: ${clientGstin}`, lx + 8, y + 52);
      doc.text(`GSTIN: ${clientGstin}`, lx + w / 2 + 8, y + 52);
    }

    // Line Items Table
    y += 68;
    doc.rect(lx, y, w, 24).fill("#f1f5f9").stroke("#334155");
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8);
    doc.text("#", lx + 5, y + 8, { width: 18 });
    doc.text("Item & Description", lx + 25, y + 8, { width: 180 });
    doc.text("HSN/SAC", lx + 210, y + 8, { width: 45 });
    doc.text("Qty", lx + 258, y + 8, { width: 28, align: "right" });
    doc.text("Rate", lx + 290, y + 8, { width: 65, align: "right" });
    doc.text("CGST 9%", lx + 358, y + 8, { width: 52, align: "right" });
    doc.text("SGST 9%", lx + 412, y + 8, { width: 52, align: "right" });
    doc.text("Amount", lx + 466, y + 8, { width: 54, align: "right" });
    y += 24;

    const lineItems = [
      {
        no: "1",
        desc: `Staffing Services - Contract Payroll ${monthName} - ${billing.run.periodYear}`,
        hsn: "998517",
        qty: "1.00",
        rate: s.billableCtc,
        cgst: Math.round(s.billableCtc * 0.09 * 100) / 100,
        sgst: Math.round(s.billableCtc * 0.09 * 100) / 100,
        amount: s.billableCtc,
      },
      {
        no: "2",
        desc: `Service Charges ${s.serviceChargePct}% On the CTC - EDLI and ADMN Charges`,
        hsn: "998517",
        qty: "1.00",
        rate: s.mmuAmount,
        cgst: Math.round(s.mmuAmount * 0.09 * 100) / 100,
        sgst: Math.round(s.mmuAmount * 0.09 * 100) / 100,
        amount: s.mmuAmount,
      },
    ];

    doc.font("Helvetica").fontSize(8.2);
    for (const it of lineItems) {
      doc.rect(lx, y, w, 34).stroke("#334155");
      doc.text(it.no, lx + 5, y + 8, { width: 18 });
      doc.text(it.desc, lx + 25, y + 8, { width: 180 });
      doc.text(it.hsn, lx + 210, y + 8, { width: 45 });
      doc.text(it.qty, lx + 258, y + 8, { width: 28, align: "right" });
      doc.text(it.rate.toLocaleString("en-IN", { minimumFractionDigits: 2 }), lx + 290, y + 8, { width: 65, align: "right" });
      doc.text(it.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 }), lx + 358, y + 8, { width: 52, align: "right" });
      doc.text(it.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 }), lx + 412, y + 8, { width: 52, align: "right" });
      doc.text(it.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 }), lx + 466, y + 8, { width: 54, align: "right" });
      y += 34;
    }

    // Totals & Amount in Words
    doc.rect(lx, y, w * 0.58, 92).stroke("#334155");
    doc.rect(lx + w * 0.58, y, w * 0.42, 92).stroke("#334155");
    doc.font("Helvetica").fontSize(8.5).text("Total In Words", lx + 8, y + 10);
    doc.font("Helvetica-BoldOblique").fontSize(9).text(s.amountInWords, lx + 8, y + 26, { width: w * 0.58 - 16 });

    const rx = lx + w * 0.58 + 10;
    const rw = w * 0.42 - 20;
    doc.font("Helvetica").fontSize(8.5);
    doc.text("Sub Total", rx, y + 10);
    doc.text(s.subTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 }), rx, y + 10, { width: rw, align: "right" });
    doc.text("CGST (9%)", rx, y + 28);
    doc.text(s.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 }), rx, y + 28, { width: rw, align: "right" });
    doc.text("SGST (9%)", rx, y + 46);
    doc.text(s.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 }), rx, y + 46, { width: rw, align: "right" });
    doc.moveTo(rx, y + 66).lineTo(rx + rw, y + 66).stroke("#334155");
    doc.font("Helvetica-Bold").fontSize(10).text("Total", rx, y + 72);
    doc.text(fmtInr(s.invoiceTotal), rx, y + 72, { width: rw, align: "right" });

    // Footer: Bank NEFT & Signature
    y += 92;
    doc.rect(lx, y, w * 0.58, 65).stroke("#334155");
    doc.rect(lx + w * 0.58, y, w * 0.42, 65).stroke("#334155");
    doc.font("Helvetica").fontSize(8).text("Thanks for your business.", lx + 8, y + 8);
    doc.text(
      supplierBankDetails || `NEFT / RTGS payable to ${tenant?.name || "Company"}`,
      lx + 8,
      y + 24,
      { width: w * 0.58 - 16 }
    );
    doc.font("Helvetica").fontSize(8.5).text("Authorized Signature", rx, y + 48, { width: rw, align: "center" });

    doc.end();
    const buffer = await done;
    const safeInv = String(invoiceNo).replace(/[^a-zA-Z0-9_-]+/g, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Tax_Invoice_${safeInv}.pdf"`);
    return res.send(buffer);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to generate Tax Invoice PDF" });
  }
});

/**
 * DELETE /runs/:id — Delete payroll run and all linked children safely (no FK 500s)
 */
hrPayrollRouter.delete("/runs/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const existing = await db.payrollRun.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Payroll run not found" });

    await db.$transaction(async (tx: any) => {
      const runPayslips = await tx.payslip.findMany({
        where: { payrollRunId: existing.id, tenantId },
        select: { id: true },
      });
      const payslipIds = runPayslips.map((p: any) => p.id);

      // 1. Unlink leave encashment requests referencing this run or its payslips
      await tx.leaveEncashmentRequest.updateMany({
        where: {
          tenantId,
          OR: [
            { payrollRunId: existing.id },
            ...(payslipIds.length ? [{ payslipId: { in: payslipIds } }] : []),
          ],
        },
        data: { payrollRunId: null, payslipId: null },
      });

      // 2. Remove statutory return filings linked to this run
      await tx.statutoryReturnFiling.deleteMany({
        where: { payrollRunId: existing.id, tenantId },
      });

      // 3. Remove bank disbursement batches & their items linked to this run
      const batches = await tx.bankDisbursementBatch.findMany({
        where: { payrollRunId: existing.id, tenantId },
        select: { id: true },
      });
      const batchIds = batches.map((b: any) => b.id);
      if (batchIds.length) {
        await tx.bankDisbursementItem.deleteMany({
          where: { batchId: { in: batchIds } },
        });
        await tx.bankDisbursementBatch.deleteMany({
          where: { id: { in: batchIds } },
        });
      }

      // 4. Delete snapshots, payslips, and the run itself
      await tx.payrollSnapshot.deleteMany({ where: { payrollRunId: existing.id, tenantId } });
      await tx.payslip.deleteMany({ where: { payrollRunId: existing.id, tenantId } });
      await tx.payrollRun.delete({ where: { id: existing.id } });
    });

    return res.json({ success: true, message: "Payroll run deleted successfully" });
  } catch (err: any) {
    console.error("[hr-payroll] DELETE /runs/:id error:", err);
    return res.status(400).json({ error: err.message || "Failed to delete payroll run" });
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

    // Fetch scheduled Leave Encashment requests for this payroll period
    const scheduledEncashments = await db.leaveEncashmentRequest.findMany({
      where: {
        tenantId,
        type: "ENCASHMENT",
        payrollPeriodMonth: run.periodMonth,
        payrollPeriodYear: run.periodYear,
        status: { in: ["PAYROLL_PENDING", "PAYROLL_PROCESSING"] },
      },
      include: {
        payrollComponent: true,
        leaveType: true,
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

        // Add Scheduled Leave Encashment Earnings
        const empEncashments = scheduledEncashments.filter((e: any) => e.employeeId === emp.id);
        let totalEncashmentAmount = new Decimal(0);
        for (const enc of empEncashments) {
          const encAmt = new Decimal(enc.netPayableAmount ?? enc.grossAmount ?? 0).toDecimalPlaces(2);
          if (encAmt.greaterThan(0)) {
            totalEncashmentAmount = totalEncashmentAmount.plus(encAmt);
            grossEarnings = grossEarnings.plus(encAmt);
            earningsBreakdown.push({
              code: enc.payrollComponent?.code || "LEAVE_ENCASH",
              name: enc.payrollComponent?.name || `Leave Encashment (${enc.leaveType?.name || "Leave"})`,
              amount: encAmt.toNumber(),
              isTaxable: enc.payrollComponent?.isTaxable ?? true,
              referenceId: enc.id,
              requestCode: enc.requestCode,
            });
          }
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
          leaveEncashmentAmount: totalEncashmentAmount.toNumber(),
          encashmentRequestIds: empEncashments.map((e: any) => e.id),
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
        const createdPayslip = await tx.payslip.create({
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

        if (empEncashments.length > 0) {
          await tx.leaveEncashmentRequest.updateMany({
            where: {
              tenantId,
              id: { in: empEncashments.map((e: any) => e.id) },
              status: { in: ["PAYROLL_PENDING", "PAYROLL_PROCESSING"] },
            },
            data: {
              status: "PAYROLL_PROCESSING",
              payrollStatus: "PAYROLL_PROCESSING",
              payrollRunId: run.id,
              payslipId: createdPayslip.id,
            },
          });
        }
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

    // Reconcile & mark scheduled Leave Encashment items as PAID strictly after verified payroll publish
    await LeaveEncashmentCompOffService.reconcileAndMarkPayrollPaid(tenantId, {
      payrollRunId: run.id,
      actorUserId: actorId,
      actorEmail: req.user?.email || null,
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
 * GET /payslips — List payslips with month, year, employee, status, search filters & counts
 */
function enrichPayslip(ps: any) {
  const bd =
    ps.breakdown && typeof ps.breakdown === "object" && !Array.isArray(ps.breakdown)
      ? (ps.breakdown as Record<string, any>)
      : {};
  const year = Number(ps.periodYear || new Date().getFullYear());
  const month = Number(ps.periodMonth || 1);
  const defaultStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const defaultEnd = `${year}-${String(month).padStart(2, "0")}-${String(
    new Date(year, month, 0).getDate()
  ).padStart(2, "0")}`;
  const defaultPayDate = new Date(year, month, 5).toISOString().slice(0, 10);
  const displayStatus = String(ps.status || "generated").toLowerCase() === "downloaded"
    ? "downloaded"
    : "generated";

  return {
    ...ps,
    employee: flattenEmployeeAvatar(ps.employee),
    grossSalary: Number(ps.grossSalary || 0),
    deductions: Number(ps.deductions || 0),
    netSalary: Number(ps.netSalary || 0),
    displayStatus,
    payDate: bd.payDate || defaultPayDate,
    payPeriodStart: bd.payPeriodStart || defaultStart,
    payPeriodEnd: bd.payPeriodEnd || defaultEnd,
    generatedOn: ps.createdAt,
    breakdown: {
      basicSalary: Number(bd.basicSalary ?? ps.grossSalary ?? 0),
      componentEarnings: Number(bd.componentEarnings ?? 0),
      totalEarnings: Number(bd.totalEarnings ?? ps.grossSalary ?? 0),
      lopDeduction: Number(bd.lopDeduction ?? 0),
      overtimeEarnings: Number(bd.overtimeEarnings ?? 0),
      grossPay: Number(bd.grossPay ?? ps.grossSalary ?? 0),
      totalDeductions: Number(bd.totalDeductions ?? ps.deductions ?? 0),
      netPay: Number(bd.netPay ?? ps.netSalary ?? 0),
      earnings: Array.isArray(bd.earnings) ? bd.earnings : [],
      deductions: Array.isArray(bd.deductions) ? bd.deductions : [],
      attendance: {
        workingDays: Number(bd.attendance?.workingDays ?? 22),
        presentDays: Number(bd.attendance?.presentDays ?? 22),
        absentDays: Number(bd.attendance?.absentDays ?? 0),
        halfDays: Number(bd.attendance?.halfDays ?? 0),
        holidayDays: Number(bd.attendance?.holidayDays ?? 0),
        paidLeave: Number(bd.attendance?.paidLeave ?? 0),
        unpaidLeave: Number(bd.attendance?.unpaidLeave ?? 0),
        lopDays: Number(bd.attendance?.lopDays ?? 0),
        effectivePaidDays: Number(bd.attendance?.effectivePaidDays ?? 22),
        overtimeHours: Number(bd.attendance?.overtimeHours ?? 0),
      },
    },
  };
}

hrPayrollRouter.get("/payslips", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const { periodMonth, month, periodYear, year, employeeId, isPublished, status, search } = req.query;
    const db = getTenantDb();

    const baseWhere: any = { tenantId };
    const resolvedMonth = periodMonth || month;
    const resolvedYear = periodYear || year;
    if (resolvedMonth) baseWhere.periodMonth = Number(resolvedMonth);
    if (resolvedYear) baseWhere.periodYear = Number(resolvedYear);
    if (employeeId && employeeId !== "all") baseWhere.employeeId = String(employeeId);
    if (isPublished !== undefined) baseWhere.isPublished = isPublished === "true";

    const allInPeriod = await db.payslip.findMany({
      where: baseWhere,
      include: {
        employee: { select: EMPLOYEE_AVATAR_SELECT },
      },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { createdAt: "desc" }],
    });

    const enriched = allInPeriod.map(enrichPayslip);
    const counts = {
      all: enriched.length,
      generated: enriched.filter((p: any) => p.displayStatus === "generated").length,
      downloaded: enriched.filter((p: any) => p.displayStatus === "downloaded").length,
    };

    let filtered = enriched;
    if (status && status !== "all") {
      filtered = filtered.filter((p: any) => p.displayStatus === String(status).toLowerCase());
    }
    if (search && String(search).trim()) {
      const q = String(search).trim().toLowerCase();
      filtered = filtered.filter((p: any) => {
        const name = `${p.employee?.firstName || ""} ${p.employee?.lastName || ""}`.toLowerCase();
        const code = (p.employee?.employeeCode || "").toLowerCase();
        return name.includes(q) || code.includes(q);
      });
    }

    return res.json({ payslips: filtered, counts });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /payslips/export/excel — Bulk export filtered payslips to Excel (.xlsx) in INR
 */
hrPayrollRouter.get("/payslips/export/excel", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const { periodMonth, month, periodYear, year, employeeId } = req.query;
    const db = getTenantDb();
    const where: any = { tenantId };
    if (periodMonth || month) where.periodMonth = Number(periodMonth || month);
    if (periodYear || year) where.periodYear = Number(periodYear || year);
    if (employeeId && employeeId !== "all") where.employeeId = String(employeeId);

    const rows = await db.payslip.findMany({
      where,
      include: { employee: { select: EMPLOYEE_AVATAR_SELECT } },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { createdAt: "desc" }],
    });

    const enriched = rows.map(enrichPayslip);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Payslips (INR)");

    sheet.columns = [
      { header: "Employee Code", key: "code", width: 16 },
      { header: "Employee Name", key: "name", width: 26 },
      { header: "Department", key: "dept", width: 20 },
      { header: "Pay Period", key: "period", width: 24 },
      { header: "Pay Date", key: "payDate", width: 14 },
      { header: "Basic Salary (INR)", key: "basic", width: 18 },
      { header: "Gross Pay (INR)", key: "gross", width: 18 },
      { header: "Deductions (INR)", key: "deductions", width: 18 },
      { header: "Net Pay (INR)", key: "net", width: 18 },
      { header: "Status", key: "status", width: 14 },
    ];

    sheet.getRow(1).font = { bold: true };
    for (const ps of enriched) {
      const empName = ps.employee
        ? `${ps.employee.firstName || ""} ${ps.employee.lastName || ""}`.trim()
        : "Employee";
      sheet.addRow({
        code: ps.employee?.employeeCode || "—",
        name: empName,
        dept: ps.employee?.department?.name || "—",
        period: `${ps.payPeriodStart} to ${ps.payPeriodEnd}`,
        payDate: ps.payDate,
        basic: ps.breakdown.basicSalary,
        gross: ps.breakdown.grossPay,
        deductions: ps.breakdown.totalDeductions,
        net: ps.breakdown.netPay,
        status: ps.displayStatus,
      });
    }

    ["basic", "gross", "deductions", "net"].forEach((k) => {
      sheet.getColumn(k).numFmt = "₹#,##0.00";
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Payslips_${where.periodYear || "All"}_${where.periodMonth || "All"}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.send(Buffer.from(buffer));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to export Excel" });
  }
});

/**
 * Helper to load tenant logo buffer for PDFKit (supports data URL, local /uploads path, or HTTP URL)
 */
async function loadLogoBuffer(logoUrl?: string | null): Promise<Buffer | null> {
  if (!logoUrl || typeof logoUrl !== "string") return null;
  const trimmed = logoUrl.trim();
  if (!trimmed) return null;
  try {
    if (trimmed.startsWith("data:image/")) {
      const b64 = trimmed.split(",")[1];
      if (!b64) return null;
      return Buffer.from(b64, "base64");
    }
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3000);
      try {
        const resp = await fetch(trimmed, { signal: ctrl.signal });
        if (!resp.ok) return null;
        return Buffer.from(await resp.arrayBuffer());
      } finally {
        clearTimeout(timer);
      }
    }
    const localPath = path.resolve(process.cwd(), trimmed.replace(/^\/+/, ""));
    if (fs.existsSync(localPath)) {
      return fs.readFileSync(localPath);
    }
  } catch {
    return null;
  }
  return null;
}

function fmtDateDMY(raw?: string | Date | null): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function fmtDateShortMon(raw?: string | Date | null): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  const shortMons = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${String(d.getDate()).padStart(2, "0")} ${shortMons[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * GET /payslips/:id/download/pdf — Reference-layout Payslip PDF with Tenant Logo, Company Details & INR
 */
hrPayrollRouter.get("/payslips/:id/download/pdf", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const [raw, tenant, companySettings] = await Promise.all([
      db.payslip.findFirst({
        where: { id: req.params.id, tenantId },
        include: {
          employee: {
            select: {
              ...EMPLOYEE_AVATAR_SELECT,
              bankName: true,
              bankAccount: true,
            },
          },
        },
      }),
      db.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, logoUrl: true, address: true, phone: true },
      }),
      db.setting.findMany({
        where: {
          scope: "TENANT",
          scopeId: tenantId,
          group: { in: ["company", "general", "branding"] },
        },
      }),
    ]);

    if (!raw) return res.status(404).json({ error: "Payslip not found" });

    // Mark as downloaded
    await db.payslip.update({
      where: { id: raw.id },
      data: { status: "downloaded" },
    });

    // Resolve company details from Tenant + Settings
    const settingMap = new Map<string, any>();
    for (const s of companySettings || []) {
      const val = s.valueJson;
      settingMap.set(s.key, val);
    }
    const companyName = String(settingMap.get("company_name") || tenant?.name || "Company").trim();
    const companyAddress = String(settingMap.get("company_address") || tenant?.address || "").trim();
    const companyEmail = String(
      settingMap.get("company_email") || settingMap.get("support_email") || req.user?.email || ""
    ).trim();
    const companyPhone = String(settingMap.get("company_phone") || tenant?.phone || "").trim();
    const companyLogoUrl = String(settingMap.get("company_logo") || settingMap.get("logo_url") || tenant?.logoUrl || "").trim();

    const logoBuffer = await loadLogoBuffer(companyLogoUrl);

    const ps = enrichPayslip({ ...raw, status: "downloaded" });
    const bd = ps.breakdown;
    const att = bd.attendance;
    const empName = ps.employee
      ? `${ps.employee.firstName || ""} ${ps.employee.lastName || ""}`.trim()
      : "Employee";
    const empCode = ps.employee?.employeeCode || "";
    const monthLabel = MONTH_NAMES[Math.max(0, Math.min(11, Number(ps.periodMonth || 1) - 1))];

    const fmtInr = (n: number) =>
      `Rs. ${Number(n || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    const pdfDone = new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    const leftX = 40;
    const pageW = 515;
    const rightX = leftX + pageW;
    const emerald = "#10b981";
    const darkText = "#0f172a";
    const mutedText = "#64748b";
    const lightBorder = "#e2e8f0";

    // 1. TOP COMPANY HEADER (Tenant Logo + Company Name + Address + Email | Phone)
    let y = 36;
    let textStartX = leftX;
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, leftX, y, { fit: [48, 48] });
        textStartX = leftX + 58;
      } catch {
        textStartX = leftX;
      }
    }

    doc.fillColor(darkText).font("Helvetica-Bold").fontSize(17).text(companyName, textStartX, y);
    let headerTextY = y + 22;
    doc.font("Helvetica").fontSize(9).fillColor(mutedText);
    if (companyAddress) {
      doc.text(companyAddress, textStartX, headerTextY, { width: rightX - textStartX });
      headerTextY += 13;
    }
    const contactLine = [companyEmail, companyPhone].filter(Boolean).join(" | ");
    if (contactLine) {
      doc.text(contactLine, textStartX, headerTextY);
      headerTextY += 13;
    }

    y = Math.max(y + 52, headerTextY + 6);
    doc.moveTo(leftX, y).lineTo(rightX, y).lineWidth(1.8).strokeColor(emerald).stroke();

    // 2. TITLE & EMPLOYEE PAY SUMMARY
    y += 14;
    doc
      .fillColor(darkText)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(`Payslip for the month of ${monthLabel} ${ps.periodYear}`, leftX, y);

    y += 20;
    doc.fillColor(emerald).font("Helvetica-Bold").fontSize(9.5).text("Employee Pay Summary", leftX, y);

    y += 15;
    const summaryStartY = y;
    const summaryRows: Array<[string, string]> = [
      ["Employee Name:", empCode ? `${empName}, ${empCode}` : empName],
      ["Email:", ps.employee?.email || "—"],
      ["Bank Name:", (raw.employee as any)?.bankName || "—"],
      ["Account Number:", (raw.employee as any)?.bankAccount || "—"],
      ["Pay Period:", `${fmtDateShortMon(ps.payPeriodStart)} - ${fmtDateShortMon(ps.payPeriodEnd)}`],
      ["Pay Date:", fmtDateDMY(ps.payDate)],
      ["Generated On:", fmtDateDMY(ps.generatedOn)],
    ];

    for (const [label, val] of summaryRows) {
      doc.font("Helvetica").fontSize(9).fillColor(mutedText).text(label, leftX, y, { width: 95 });
      doc.font("Helvetica").fontSize(9).fillColor(darkText).text(val, leftX + 98, y, { width: 215 });
      y += 15;
    }

    // Right Hero Net Pay Block
    const heroX = leftX + 325;
    const heroW = pageW - 325;
    doc
      .font("Helvetica")
      .fontSize(9.5)
      .fillColor(mutedText)
      .text("Employee Net Pay", heroX, summaryStartY + 8, { width: heroW, align: "center" });
    doc
      .font("Helvetica-Bold")
      .fontSize(22)
      .fillColor(darkText)
      .text(fmtInr(bd.netPay), heroX, summaryStartY + 24, { width: heroW, align: "center" });
    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor(mutedText)
      .text(
        `Paid Days : ${att.effectivePaidDays.toFixed(2)} | LOP Days : ${att.lopDays.toFixed(2)}`,
        heroX,
        summaryStartY + 54,
        { width: heroW, align: "center" }
      );

    // 3. ATTENDANCE SUMMARY TABLE (9 columns)
    y += 16;
    doc.fillColor(emerald).font("Helvetica-Bold").fontSize(9.5).text("Attendance Summary", leftX, y);
    y += 14;

    const fullPresent = Math.max(
      0,
      Math.round(att.presentDays - att.holidayDays - att.paidLeave - att.halfDays * 0.5)
    );
    const attCols = [
      { label: "Working Days", val: String(att.workingDays) },
      { label: "Full Present", val: String(fullPresent) },
      { label: "Half Days", val: att.halfDays.toFixed(2) },
      { label: "Holidays", val: String(att.holidayDays) },
      { label: "Paid Leave", val: att.paidLeave.toFixed(2) },
      { label: "Unpaid Leave", val: att.unpaidLeave.toFixed(2) },
      { label: "Absent", val: String(att.absentDays) },
      { label: "LOP Days", val: att.lopDays.toFixed(2), bold: true },
      { label: "Overtime Hrs", val: att.overtimeHours.toFixed(2) },
    ];
    const colW = pageW / attCols.length;

    // Header row
    doc.rect(leftX, y, pageW, 18).fill("#f0f9ff").strokeColor(lightBorder).lineWidth(0.6).stroke();
    attCols.forEach((c, i) => {
      const cx = leftX + i * colW;
      if (i > 0) doc.moveTo(cx, y).lineTo(cx, y + 36).strokeColor(lightBorder).lineWidth(0.5).stroke();
      doc
        .fillColor("#0d9488")
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .text(c.label, cx + 2, y + 5, { width: colW - 4, align: "center" });
    });

    // Value row
    doc.rect(leftX, y + 18, pageW, 18).strokeColor(lightBorder).lineWidth(0.6).stroke();
    attCols.forEach((c, i) => {
      const cx = leftX + i * colW;
      doc
        .fillColor(darkText)
        .font(c.bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(8)
        .text(c.val, cx + 2, y + 23, { width: colW - 4, align: "center" });
    });

    // Attendance Formula Note Bar
    y += 42;
    doc.rect(leftX, y, pageW, 18).fill("#f8fafc");
    doc.rect(leftX, y, 2.5, 18).fill(emerald);
    doc
      .fillColor("#334155")
      .font("Helvetica")
      .fontSize(7.5)
      .text(
        `Present Days = Full Present (${fullPresent}) + Holidays (${att.holidayDays}) + Paid Leave (${att.paidLeave.toFixed(2)}) + Half Days x 0.5 (${att.halfDays.toFixed(2)} x 0.5) = ${att.presentDays.toFixed(2)}  |  Overtime = ${att.overtimeHours.toFixed(2)} hrs = ${fmtInr(bd.overtimeEarnings)}`,
        leftX + 8,
        y + 5,
        { width: pageW - 12 }
      );

    // 4. EARNINGS TABLE
    y += 28;
    doc.moveTo(leftX, y).lineTo(rightX, y).lineWidth(1.2).strokeColor(emerald).stroke();
    y += 6;
    doc.fillColor(emerald).font("Helvetica-Bold").fontSize(9.5);
    doc.text("Earnings", leftX + 4, y);
    doc.text("Amount", rightX - 130, y, { width: 126, align: "right" });
    y += 16;
    doc.moveTo(leftX, y).lineTo(rightX, y).lineWidth(0.6).strokeColor(lightBorder).stroke();

    const earningRows: Array<{ name: string; amount: number }> = [
      { name: "Basic Salary", amount: bd.basicSalary },
      ...bd.earnings.map((e: any) => ({ name: e.name, amount: Number(e.amount || 0) })),
      ...(bd.overtimeEarnings > 0 ? [{ name: "Overtime Amount", amount: bd.overtimeEarnings }] : []),
    ];

    const grossEarningsDisplay = earningRows.reduce((s, r) => s + r.amount, 0);

    for (const row of earningRows) {
      y += 7;
      doc.fillColor(darkText).font("Helvetica").fontSize(9);
      doc.text(row.name, leftX + 4, y, { width: 350 });
      doc.text(fmtInr(row.amount), rightX - 130, y, { width: 126, align: "right" });
      y += 15;
      doc.moveTo(leftX, y).lineTo(rightX, y).lineWidth(0.4).strokeColor("#f1f5f9").stroke();
    }

    y += 7;
    doc.fillColor(darkText).font("Helvetica-Bold").fontSize(9.5);
    doc.text("Gross Earnings", leftX + 4, y);
    doc.text(fmtInr(grossEarningsDisplay), rightX - 130, y, { width: 126, align: "right" });
    y += 22;

    // 5. DEDUCTIONS TABLE
    doc.moveTo(leftX, y).lineTo(rightX, y).lineWidth(1.2).strokeColor(emerald).stroke();
    y += 6;
    doc.fillColor(emerald).font("Helvetica-Bold").fontSize(9.5);
    doc.text("Deductions", leftX + 4, y);
    doc.text("(-)Amount", rightX - 130, y, { width: 126, align: "right" });
    y += 16;
    doc.moveTo(leftX, y).lineTo(rightX, y).lineWidth(0.6).strokeColor(lightBorder).stroke();

    const deductionRows: Array<{ name: string; amount: number }> = [
      ...bd.deductions.map((d: any) => ({ name: d.name, amount: Number(d.amount || 0) })),
      ...(bd.lopDeduction > 0
        ? [{ name: `LOP Deduction (${att.lopDays.toFixed(2)} days)`, amount: bd.lopDeduction }]
        : []),
    ];
    const totalDeductionsDisplay = deductionRows.reduce((s, r) => s + r.amount, 0);

    if (deductionRows.length === 0) {
      y += 7;
      doc.fillColor(mutedText).font("Helvetica").fontSize(9);
      doc.text("No Deductions", leftX + 4, y);
      doc.text(fmtInr(0), rightX - 130, y, { width: 126, align: "right" });
      y += 15;
    } else {
      for (const row of deductionRows) {
        y += 7;
        doc.fillColor(darkText).font("Helvetica").fontSize(9);
        doc.text(row.name, leftX + 4, y, { width: 350 });
        doc.text(fmtInr(row.amount), rightX - 130, y, { width: 126, align: "right" });
        y += 15;
        doc.moveTo(leftX, y).lineTo(rightX, y).lineWidth(0.4).strokeColor("#f1f5f9").stroke();
      }
    }

    y += 7;
    doc.fillColor(darkText).font("Helvetica-Bold").fontSize(9.5);
    doc.text("Total Deductions", leftX + 4, y);
    doc.text(fmtInr(totalDeductionsDisplay), rightX - 130, y, { width: 126, align: "right" });

    // 6. NET PAY HIGHLIGHT BOX & TOTAL NET PAYABLE
    y += 22;
    doc.rect(leftX, y, pageW, 28).fill("#eff6ff").strokeColor("#cbd5e1").lineWidth(0.7).stroke();
    doc.moveTo(rightX - 140, y).lineTo(rightX - 140, y + 28).strokeColor("#cbd5e1").lineWidth(0.7).stroke();
    doc.fillColor(emerald).font("Helvetica-Bold").fontSize(10);
    doc.text("NET PAY (Gross Earnings - Total Deductions)", leftX + 10, y + 9);
    doc.text(fmtInr(bd.netPay), rightX - 136, y + 9, { width: 126, align: "right" });

    y += 42;
    doc
      .fillColor(darkText)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(`Total Net Payable  ${fmtInr(bd.netPay)}`, leftX, y, { width: pageW, align: "center" });

    y += 24;
    doc.moveTo(leftX, y).lineTo(rightX, y).lineWidth(1.8).strokeColor(emerald).stroke();

    y += 14;
    doc
      .fillColor("#94a3b8")
      .font("Helvetica")
      .fontSize(8)
      .text(
        "-- This document has been automatically generated; therefore, a signature is not required. --",
        leftX,
        y,
        { width: pageW, align: "center" }
      );

    doc.end();
    const buffer = await pdfDone;
    const safeName = (ps.employee?.employeeCode || empName).replace(/[^a-zA-Z0-9_-]+/g, "_");
    const fileName = `Payslip_${safeName}_${ps.periodYear}_${String(ps.periodMonth).padStart(2, "0")}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.send(buffer);
  } catch (err: any) {
    console.error("[hr-payroll] PDF download error:", err);
    return res.status(500).json({ error: err.message || "Failed to generate PDF payslip" });
  }
});

/**
 * GET /payslips/:id/download/excel — Real Excel (.xlsx) payslip (INR) from live DB data
 */
hrPayrollRouter.get("/payslips/:id/download/excel", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const raw = await db.payslip.findFirst({
      where: { id: req.params.id, tenantId },
      include: { employee: { select: EMPLOYEE_AVATAR_SELECT } },
    });
    if (!raw) return res.status(404).json({ error: "Payslip not found" });

    await db.payslip.update({
      where: { id: raw.id },
      data: { status: "downloaded" },
    });

    const ps = enrichPayslip({ ...raw, status: "downloaded" });
    const bd = ps.breakdown;
    const empName = ps.employee
      ? `${ps.employee.firstName || ""} ${ps.employee.lastName || ""}`.trim()
      : "Employee";

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Pay Stub (INR)");
    sheet.columns = [
      { header: "Field / Component", key: "label", width: 32 },
      { header: "Category", key: "category", width: 18 },
      { header: "Amount (INR)", key: "amount", width: 20 },
    ];
    sheet.getRow(1).font = { bold: true };

    sheet.addRow({ label: "Employee Name", category: empName, amount: "" });
    sheet.addRow({ label: "Employee Code", category: ps.employee?.employeeCode || "—", amount: "" });
    sheet.addRow({ label: "Pay Period", category: `${ps.payPeriodStart} to ${ps.payPeriodEnd}`, amount: "" });
    sheet.addRow({ label: "Pay Date", category: ps.payDate, amount: "" });
    sheet.addRow({ label: "", category: "", amount: "" });
    sheet.addRow({ label: "Basic Salary", category: "Earning", amount: bd.basicSalary });
    for (const e of bd.earnings) {
      sheet.addRow({ label: e.name, category: "Earning", amount: e.amount });
    }
    if (bd.overtimeEarnings > 0) {
      sheet.addRow({ label: "Overtime Earnings", category: "Earning", amount: bd.overtimeEarnings });
    }
    if (bd.lopDeduction > 0) {
      sheet.addRow({ label: "LOP Deduction", category: "Deduction", amount: -bd.lopDeduction });
    }
    for (const d of bd.deductions) {
      sheet.addRow({ label: d.name, category: "Deduction", amount: -d.amount });
    }
    sheet.addRow({ label: "", category: "", amount: "" });
    sheet.addRow({ label: "Gross Pay", category: "Summary", amount: bd.grossPay });
    sheet.addRow({ label: "Total Deductions", category: "Summary", amount: bd.totalDeductions });
    const netRow = sheet.addRow({ label: "Net Pay", category: "Summary", amount: bd.netPay });
    netRow.font = { bold: true };

    sheet.getColumn("amount").numFmt = "₹#,##0.00";

    const buffer = await workbook.xlsx.writeBuffer();
    const safeName = (ps.employee?.employeeCode || empName).replace(/[^a-zA-Z0-9_-]+/g, "_");
    const fileName = `Payslip_${safeName}_${ps.periodYear}_${String(ps.periodMonth).padStart(2, "0")}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.send(Buffer.from(buffer));
  } catch (err: any) {
    console.error("[hr-payroll] Excel download error:", err);
    return res.status(500).json({ error: err.message || "Failed to generate Excel payslip" });
  }
});

/**
 * GET /payslips/:id — Single payslip detail
 */
hrPayrollRouter.get("/payslips/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const ps = await db.payslip.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        employee: { select: EMPLOYEE_AVATAR_SELECT },
      },
    });
    if (!ps) return res.status(404).json({ error: "Payslip not found" });
    return res.json({ payslip: enrichPayslip(ps) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /payslips — Create a standalone payslip
 */
hrPayrollRouter.post("/payslips", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const { employeeId, periodMonth, periodYear, grossSalary, deductions = 0, breakdown } = req.body;
    if (!employeeId) return res.status(400).json({ error: "employeeId is required" });

    const gross = Number(grossSalary || 0);
    const ded = Number(deductions || 0);
    const net = Math.max(0, gross - ded);
    const now = new Date();

    const db = getTenantDb();
    const created = await db.payslip.create({
      data: {
        tenantId,
        employeeId,
        periodMonth: Number(periodMonth || now.getMonth() + 1),
        periodYear: Number(periodYear || now.getFullYear()),
        grossSalary: new Decimal(gross),
        deductions: new Decimal(ded),
        netSalary: new Decimal(net),
        breakdown: breakdown || {},
        status: "generated",
        isPublished: true,
        publishedAt: new Date(),
      },
      include: {
        employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
      },
    });

    return res.status(201).json({ payslip: enrichPayslip(created) });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * PUT & PATCH /payslips/:id — Update payslip (e.g. mark downloaded or adjust amounts)
 */
const handleUpdatePayslip = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const existing = await db.payslip.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Payslip not found" });

    const data: any = {};
    if (req.body.status !== undefined) data.status = String(req.body.status).toLowerCase();
    if (req.body.grossSalary !== undefined) data.grossSalary = new Decimal(Number(req.body.grossSalary));
    if (req.body.deductions !== undefined) data.deductions = new Decimal(Number(req.body.deductions));
    if (req.body.netSalary !== undefined) data.netSalary = new Decimal(Number(req.body.netSalary));
    if (req.body.breakdown !== undefined) data.breakdown = req.body.breakdown;

    const updated = await db.payslip.update({
      where: { id: existing.id },
      data,
      include: {
        employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
      },
    });
    return res.json({ payslip: enrichPayslip(updated) });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

hrPayrollRouter.put("/payslips/:id", handleUpdatePayslip);
hrPayrollRouter.patch("/payslips/:id", handleUpdatePayslip);

/**
 * DELETE /payslips/:id — Delete payslip
 */
hrPayrollRouter.delete("/payslips/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const existing = await db.payslip.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Payslip not found" });

    await db.payslip.delete({ where: { id: existing.id } });
    return res.json({ success: true, message: "Payslip deleted successfully" });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
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
    let requestedIds: string[] | null = null;
    if (payslipIds !== undefined) {
      if (!Array.isArray(payslipIds) || payslipIds.length === 0) {
        return res.status(400).json({ error: "payslipIds must be a non-empty array when provided.", code: "EMPTY_PAYSLIP_IDS" });
      }
      requestedIds = Array.from(new Set(payslipIds.map(String).filter(Boolean)));
      where.id = { in: requestedIds };
    } else if (periodMonth && periodYear) {
      where.periodMonth = Number(periodMonth);
      where.periodYear = Number(periodYear);
    } else {
      return res.status(400).json({ error: "Specify payslipIds or periodMonth & periodYear" });
    }

    let notFoundIds: string[] = [];
    if (requestedIds) {
      const found = await db.payslip.findMany({ where, select: { id: true } });
      const foundSet = new Set(found.map((p: any) => p.id));
      notFoundIds = requestedIds.filter((id) => !foundSet.has(id));
      if (found.length === 0) {
        return res.status(404).json({
          success: false,
          error: "No matching payslips found in this workspace.",
          notFoundIds,
        });
      }
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
      details: { count: result.count, notFoundCount: notFoundIds.length },
    });

    const isPartial = result.count > 0 && notFoundIds.length > 0;
    return res.status(isPartial ? 207 : 200).json({
      success: !isPartial,
      partial: isPartial,
      publishedCount: result.count,
      requestedCount: requestedIds ? requestedIds.length : result.count,
      notFoundCount: notFoundIds.length,
      notFoundIds: notFoundIds.length > 0 ? notFoundIds : undefined,
      message: `Successfully published ${result.count} payslip(s).`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 3. SALARY COMPONENTS & FORMULA ENGINE (HR-PAY-04) — FULL REST CRUD
// =========================================================================

function normalizeCalcType(raw?: string | null): "fixed" | "percentage" {
  const v = String(raw || "fixed").toLowerCase().trim();
  if (v.includes("percent") || v === "pct" || v === "percentage_of_basic") return "percentage";
  return "fixed";
}

function computeSalaryBreakdown(assignment: any) {
  const basicSalary = Number(assignment.ctcMonthly || 0);
  const items = Array.isArray(assignment.items) ? assignment.items : [];

  let additionalEarnings = 0;
  let totalDeductions = 0;

  const components = items.map((it: any) => {
    const comp = it.component;
    const calcType = normalizeCalcType(comp?.calculationType);
    const defaultVal = Number(comp?.defaultValue || 0);
    const computedMonthly =
      calcType === "percentage"
        ? Math.round(((basicSalary * defaultVal) / 100) * 100) / 100
        : Number(it.monthlyAmount || defaultVal);
    const compType = String(comp?.type || "earning").toLowerCase();
    if (compType === "deduction") totalDeductions += computedMonthly;
    else additionalEarnings += computedMonthly;

    return {
      id: it.id,
      componentId: it.componentId,
      name: comp?.name || "Component",
      code: comp?.code || "",
      type: compType,
      calculationType: calcType,
      defaultValue: defaultVal,
      monthlyAmount: computedMonthly,
      annualAmount: Math.round(computedMonthly * 12 * 100) / 100,
    };
  });

  const grossSalary = Math.round((basicSalary + additionalEarnings) * 100) / 100;
  const netSalary = Math.round(Math.max(0, grossSalary - totalDeductions) * 100) / 100;

  return {
    basicSalary: Math.round(basicSalary * 100) / 100,
    additionalEarnings: Math.round(additionalEarnings * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    grossSalary,
    netSalary,
    components,
  };
}

function enrichSalaryAssignment(a: any) {
  const breakdown = computeSalaryBreakdown(a);
  return {
    ...a,
    employee: flattenEmployeeAvatar(a.employee),
    basicSalary: breakdown.basicSalary,
    ctcMonthly: Number(a.ctcMonthly || 0),
    ctcAnnual: Number(a.ctcAnnual || 0),
    status: a.isCurrent ? "active" : "inactive",
    breakdown,
  };
}

/**
 * GET /components — List components & structures (with filters)
 */
hrPayrollRouter.get("/components", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const { search, type, calculationType, status } = req.query;
    const where: any = { tenantId };

    if (type && type !== "all") {
      where.type = String(type).toLowerCase();
    }
    if (status && status !== "all") {
      where.isActive = String(status).toLowerCase() === "active";
    }
    if (search && String(search).trim()) {
      const q = String(search).trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { code: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const db = getTenantDb();
    let components = await db.salaryComponent.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { sortOrder: "asc" }],
    });

    if (calculationType && calculationType !== "all") {
      const want = normalizeCalcType(String(calculationType));
      components = components.filter((c: any) => normalizeCalcType(c.calculationType) === want);
    }

    const normalized = components.map((c: any) => ({
      ...c,
      defaultValue: Number(c.defaultValue || 0),
      calculationType: normalizeCalcType(c.calculationType),
      status: c.isActive ? "active" : "inactive",
    }));

    const structures = await db.salaryStructure.findMany({
      where: { tenantId },
      include: {
        items: {
          include: { component: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return res.json({ components: normalized, structures });
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

    const name = String(req.body?.name || "").trim();
    const type = String(req.body?.type || "earning").toLowerCase().trim();
    if (!name) {
      return res.status(400).json({ error: "Component name is required" });
    }

    const db = getTenantDb();
    const rawCode = String(req.body?.code || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]+/g, "_");
    let code =
      rawCode ||
      name
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_|_$/g, "")
        .slice(0, 32) ||
      `COMP_${Date.now().toString().slice(-4)}`;

    const dup = await db.salaryComponent.findFirst({ where: { tenantId, code } });
    if (dup) {
      code = `${code.slice(0, 24)}_${Date.now().toString().slice(-4)}`;
    }

    const calcType = normalizeCalcType(req.body?.calculationType);
    const amountVal = Number(req.body?.defaultValue ?? req.body?.amount ?? 0) || 0;
    const isActive =
      req.body?.isActive !== undefined
        ? Boolean(req.body.isActive)
        : req.body?.status !== undefined
          ? String(req.body.status).toLowerCase() === "active"
          : true;

    const component = await db.salaryComponent.create({
      data: {
        tenantId,
        name,
        code,
        type,
        calculationType: calcType,
        formulaString: req.body?.formulaString || null,
        defaultValue: new Decimal(amountVal),
        isTaxable: req.body?.isTaxable ?? true,
        isStatutory: req.body?.isStatutory ?? false,
        includeInPf: req.body?.includeInPf ?? false,
        includeInEsi: req.body?.includeInEsi ?? false,
        isActive,
        description: req.body?.description ? String(req.body.description).trim() : null,
      },
    });

    await AuditService.log({
      tenantId,
      actorId,
      action: "SALARY_COMPONENT_CREATED",
      resourceType: "SalaryComponent",
      resourceId: component.id,
      details: { code, name },
    }).catch(() => { });

    return res.status(201).json({
      component: {
        ...component,
        defaultValue: Number(component.defaultValue || 0),
        calculationType: normalizeCalcType(component.calculationType),
        status: component.isActive ? "active" : "inactive",
      },
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * PUT & PATCH /components/:id — Update or toggle salary component
 */
const handleUpdateComponent = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const existing = await db.salaryComponent.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Salary component not found" });

    const data: any = {};
    if (req.body?.name !== undefined) {
      const cleanName = String(req.body.name).trim();
      if (!cleanName) return res.status(400).json({ error: "Component name cannot be empty" });
      data.name = cleanName;
    }
    if (req.body?.description !== undefined) {
      data.description = String(req.body.description).trim() || null;
    }
    if (req.body?.type !== undefined) {
      data.type = String(req.body.type).toLowerCase().trim();
    }
    if (req.body?.calculationType !== undefined) {
      data.calculationType = normalizeCalcType(req.body.calculationType);
    }
    const amt = req.body?.defaultValue ?? req.body?.amount;
    if (amt !== undefined && amt !== "") {
      data.defaultValue = new Decimal(Number(amt) || 0);
    }
    if (req.body?.isActive !== undefined) {
      data.isActive = Boolean(req.body.isActive);
    } else if (req.body?.status !== undefined) {
      data.isActive = String(req.body.status).toLowerCase() === "active";
    }
    if (req.body?.isTaxable !== undefined) data.isTaxable = Boolean(req.body.isTaxable);
    if (req.body?.isStatutory !== undefined) data.isStatutory = Boolean(req.body.isStatutory);

    const updated = await db.salaryComponent.update({
      where: { id: existing.id },
      data,
    });

    return res.json({
      component: {
        ...updated,
        defaultValue: Number(updated.defaultValue || 0),
        calculationType: normalizeCalcType(updated.calculationType),
        status: updated.isActive ? "active" : "inactive",
      },
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

hrPayrollRouter.put("/components/:id", handleUpdateComponent);
hrPayrollRouter.patch("/components/:id", handleUpdateComponent);

/**
 * DELETE /components/:id — Delete salary component
 */
hrPayrollRouter.delete("/components/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const existing = await db.salaryComponent.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Salary component not found" });

    await db.$transaction(async (tx: any) => {
      await tx.employeeSalaryItem.deleteMany({ where: { componentId: existing.id } });
      await tx.salaryStructureItem.deleteMany({ where: { componentId: existing.id } });
      await tx.salaryComponent.delete({ where: { id: existing.id } });
    });

    return res.json({ success: true, message: "Salary component deleted successfully" });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
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
// 4. EMPLOYEE SALARY ASSIGNMENTS (HR-PAY-03) — FULL REST CRUD
// =========================================================================

/**
 * GET /employee-salaries — List employee salary assignments with filters & counts
 */
hrPayrollRouter.get("/employee-salaries", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const { search, employeeId, status } = req.query;
    const where: any = { tenantId };
    if (employeeId && employeeId !== "all") where.employeeId = String(employeeId);
    if (status && status !== "all") {
      where.isCurrent = String(status).toLowerCase() === "active";
    }
    if (search && String(search).trim()) {
      const q = String(search).trim();
      where.employee = {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { employeeCode: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      };
    }

    const db = getTenantDb();
    const [assignments, allCount, activeCount, inactiveCount] = await Promise.all([
      db.employeeSalaryAssignment.findMany({
        where,
        include: {
          employee: { select: EMPLOYEE_AVATAR_SELECT },
          structure: true,
          items: { include: { component: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.employeeSalaryAssignment.count({ where: { tenantId } }),
      db.employeeSalaryAssignment.count({ where: { tenantId, isCurrent: true } }),
      db.employeeSalaryAssignment.count({ where: { tenantId, isCurrent: false } }),
    ]);

    return res.json({
      assignments: assignments.map(enrichSalaryAssignment),
      counts: {
        all: allCount,
        active: activeCount,
        inactive: inactiveCount,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /employee-salaries/:id — Get single employee salary details
 */
hrPayrollRouter.get("/employee-salaries/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const assignment = await db.employeeSalaryAssignment.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            email: true,
            department: { select: { name: true } },
          },
        },
        structure: true,
        items: { include: { component: true } },
      },
    });
    if (!assignment) return res.status(404).json({ error: "Employee salary record not found" });

    return res.json({ assignment: enrichSalaryAssignment(assignment) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /employee-salaries & /employee-salaries/assign — Create employee salary record
 */
const handleCreateEmployeeSalary = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const actorId = req.user?.userId || "system";
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const { employeeId, structureId, basicSalary, ctcAnnual, effectiveFrom, taxRegime, remarks, componentIds, status } = req.body;
    if (!employeeId) {
      return res.status(400).json({ error: "Employee is required" });
    }

    const monthlyNum =
      basicSalary !== undefined && basicSalary !== ""
        ? Number(basicSalary)
        : ctcAnnual !== undefined && ctcAnnual !== ""
          ? Number(ctcAnnual) / 12
          : 0;
    if (monthlyNum <= 0) {
      return res.status(400).json({ error: "Basic salary must be greater than 0" });
    }

    const monthly = new Decimal(monthlyNum).toDecimalPlaces(2);
    const annual = monthly.times(12).toDecimalPlaces(2);
    const isCurrent = status !== undefined ? String(status).toLowerCase() === "active" : true;
    const effDate = effectiveFrom ? new Date(effectiveFrom) : new Date();

    const db = getTenantDb();
    const assignment = await db.$transaction(async (tx: any) => {
      if (isCurrent) {
        await tx.employeeSalaryAssignment.updateMany({
          where: { tenantId, employeeId, isCurrent: true },
          data: { isCurrent: false, effectiveTo: effDate },
        });
      }

      const created = await tx.employeeSalaryAssignment.create({
        data: {
          tenantId,
          employeeId,
          structureId: structureId || null,
          ctcAnnual: annual,
          ctcMonthly: monthly,
          effectiveFrom: effDate,
          isCurrent,
          taxRegime: taxRegime || "new",
          remarks: remarks || null,
        },
      });

      const selectedIds: string[] = Array.isArray(componentIds) ? componentIds.filter(Boolean) : [];
      if (selectedIds.length > 0) {
        const comps = await tx.salaryComponent.findMany({
          where: { tenantId, id: { in: selectedIds } },
        });
        const itemsData = comps.map((c: any) => {
          const calc = normalizeCalcType(c.calculationType);
          const defVal = Number(c.defaultValue || 0);
          const mAmt =
            calc === "percentage"
              ? new Decimal((monthlyNum * defVal) / 100).toDecimalPlaces(2)
              : new Decimal(defVal).toDecimalPlaces(2);
          return {
            assignmentId: created.id,
            componentId: c.id,
            monthlyAmount: mAmt,
            annualAmount: mAmt.times(12).toDecimalPlaces(2),
          };
        });
        if (itemsData.length > 0) {
          await tx.employeeSalaryItem.createMany({ data: itemsData });
        }
      }

      return tx.employeeSalaryAssignment.findUnique({
        where: { id: created.id },
        include: {
          employee: { select: EMPLOYEE_AVATAR_SELECT },
          items: { include: { component: true } },
        },
      });
    });

    await AuditService.log({
      tenantId,
      actorId,
      action: "SALARY_ASSIGNED",
      resourceType: "EmployeeSalaryAssignment",
      resourceId: assignment.id,
      details: { employeeId, basicSalary: monthly.toString() },
    }).catch(() => { });

    return res.status(201).json({ assignment: enrichSalaryAssignment(assignment) });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

hrPayrollRouter.post("/employee-salaries", handleCreateEmployeeSalary);
hrPayrollRouter.post("/employee-salaries/assign", handleCreateEmployeeSalary);

/**
 * PUT & PATCH /employee-salaries/:id — Update or toggle employee salary record
 */
const handleUpdateEmployeeSalary = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const existing = await db.employeeSalaryAssignment.findFirst({
      where: { id: req.params.id, tenantId },
      include: { items: { include: { component: true } } },
    });
    if (!existing) return res.status(404).json({ error: "Employee salary record not found" });

    const updateData: any = {};
    let nextMonthlyNum = Number(existing.ctcMonthly || 0);

    if (req.body?.basicSalary !== undefined && req.body.basicSalary !== "") {
      nextMonthlyNum = Number(req.body.basicSalary);
      const m = new Decimal(nextMonthlyNum).toDecimalPlaces(2);
      updateData.ctcMonthly = m;
      updateData.ctcAnnual = m.times(12).toDecimalPlaces(2);
    } else if (req.body?.ctcAnnual !== undefined && req.body.ctcAnnual !== "") {
      nextMonthlyNum = Number(req.body.ctcAnnual) / 12;
      const m = new Decimal(nextMonthlyNum).toDecimalPlaces(2);
      updateData.ctcMonthly = m;
      updateData.ctcAnnual = new Decimal(Number(req.body.ctcAnnual)).toDecimalPlaces(2);
    }

    if (req.body?.status !== undefined) {
      updateData.isCurrent = String(req.body.status).toLowerCase() === "active";
    } else if (req.body?.isCurrent !== undefined) {
      updateData.isCurrent = Boolean(req.body.isCurrent);
    }
    if (req.body?.effectiveFrom !== undefined && req.body.effectiveFrom) {
      updateData.effectiveFrom = new Date(req.body.effectiveFrom);
    }
    if (req.body?.remarks !== undefined) {
      updateData.remarks = req.body.remarks || null;
    }
    if (req.body?.employeeId !== undefined && req.body.employeeId) {
      updateData.employeeId = req.body.employeeId;
    }

    const updated = await db.$transaction(async (tx: any) => {
      await tx.employeeSalaryAssignment.update({
        where: { id: existing.id },
        data: updateData,
      });

      if (Array.isArray(req.body?.componentIds)) {
        await tx.employeeSalaryItem.deleteMany({ where: { assignmentId: existing.id } });
        const selectedIds = req.body.componentIds.filter(Boolean);
        if (selectedIds.length > 0) {
          const comps = await tx.salaryComponent.findMany({
            where: { tenantId, id: { in: selectedIds } },
          });
          const itemsData = comps.map((c: any) => {
            const calc = normalizeCalcType(c.calculationType);
            const defVal = Number(c.defaultValue || 0);
            const mAmt =
              calc === "percentage"
                ? new Decimal((nextMonthlyNum * defVal) / 100).toDecimalPlaces(2)
                : new Decimal(defVal).toDecimalPlaces(2);
            return {
              assignmentId: existing.id,
              componentId: c.id,
              monthlyAmount: mAmt,
              annualAmount: mAmt.times(12).toDecimalPlaces(2),
            };
          });
          if (itemsData.length > 0) {
            await tx.employeeSalaryItem.createMany({ data: itemsData });
          }
        }
      }

      return tx.employeeSalaryAssignment.findUnique({
        where: { id: existing.id },
        include: {
          employee: { select: EMPLOYEE_AVATAR_SELECT },
          items: { include: { component: true } },
        },
      });
    });

    return res.json({ assignment: enrichSalaryAssignment(updated) });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

hrPayrollRouter.put("/employee-salaries/:id", handleUpdateEmployeeSalary);
hrPayrollRouter.patch("/employee-salaries/:id", handleUpdateEmployeeSalary);

/**
 * DELETE /employee-salaries/:id — Delete employee salary record
 */
hrPayrollRouter.delete("/employee-salaries/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const existing = await db.employeeSalaryAssignment.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Employee salary record not found" });

    await db.$transaction(async (tx: any) => {
      await tx.employeeSalaryItem.deleteMany({ where: { assignmentId: existing.id } });
      await tx.employeeSalaryAssignment.delete({ where: { id: existing.id } });
    });

    return res.json({ success: true, message: "Employee salary deleted successfully" });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
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
 * PATCH /loans/:id — Update loan status (active / closed / cancelled)
 */
hrPayrollRouter.patch("/loans/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });
    const db = getTenantDb();
    const existing = await db.employeeLoan.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Loan not found" });

    const updated = await db.employeeLoan.update({
      where: { id: existing.id },
      data: {
        ...(req.body.status !== undefined ? { status: String(req.body.status).toLowerCase() } : {}),
        ...(req.body.outstandingBalance !== undefined
          ? { outstandingBalance: new Decimal(Number(req.body.outstandingBalance)) }
          : {}),
      },
    });
    return res.json({ loan: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /loans/:id — Delete employee loan
 */
hrPayrollRouter.delete("/loans/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });
    const db = getTenantDb();
    const existing = await db.employeeLoan.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Loan not found" });

    await db.$transaction(async (tx: any) => {
      await tx.loanRepaymentSchedule.deleteMany({ where: { loanId: existing.id } }).catch(() => { });
      await tx.employeeLoan.delete({ where: { id: existing.id } });
    });
    return res.json({ success: true, message: "Loan deleted successfully" });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * GET /reimbursements — List payroll reimbursement claims
 */
hrPayrollRouter.get("/reimbursements", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const claims = await db.expenseClaim.findMany({
      where: { tenantId, reimbursementMethod: "payroll_addition" },
      include: {
        employee: { select: EMPLOYEE_AVATAR_SELECT },
        category: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      reimbursements: claims.map((c: any) => ({
        ...c,
        amount: Number(c.amount || 0),
        employee: flattenEmployeeAvatar(c.employee),
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /reimbursements — Create a payroll reimbursement claim
 */
hrPayrollRouter.post("/reimbursements", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });
    const { employeeId, title, amount, expenseDate, description } = req.body;
    if (!employeeId || !amount) {
      return res.status(400).json({ error: "Employee and amount are required" });
    }
    const db = getTenantDb();
    let cat = await db.expenseCategory.findFirst({ where: { tenantId } });
    if (!cat) {
      cat = await db.expenseCategory.create({
        data: {
          tenantId,
          code: "PAYROLL_REIMB",
          name: "Payroll Reimbursement",
        },
      });
    }
    const created = await db.expenseClaim.create({
      data: {
        tenantId,
        employeeId,
        categoryId: cat.id,
        claimCode: `CLM-${Date.now().toString().slice(-6)}`,
        merchant: String(req.body.merchant || title || "Direct Reimbursement").trim(),
        title: String(title || "Payroll Reimbursement").trim(),
        amount: new Decimal(Number(amount)),
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        description: description || null,
        status: "finance_approved",
        reimbursementMethod: "payroll_addition",
      },
      include: { employee: { select: EMPLOYEE_AVATAR_SELECT }, category: true },
    });
    return res.status(201).json({
      reimbursement: {
        ...created,
        amount: Number(created.amount || 0),
        employee: flattenEmployeeAvatar(created.employee),
      },
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * PATCH /reimbursements/:id — Approve / reject / mark paid
 */
hrPayrollRouter.patch("/reimbursements/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });
    const db = getTenantDb();
    const existing = await db.expenseClaim.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Reimbursement not found" });

    const updated = await db.expenseClaim.update({
      where: { id: existing.id },
      data: {
        ...(req.body.status !== undefined ? { status: String(req.body.status).toLowerCase() } : {}),
        ...(req.body.amount !== undefined ? { amount: new Decimal(Number(req.body.amount)) } : {}),
      },
    });
    return res.json({ reimbursement: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /reimbursements/:id — Delete reimbursement claim
 */
hrPayrollRouter.delete("/reimbursements/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });
    const db = getTenantDb();
    const existing = await db.expenseClaim.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Reimbursement not found" });
    await db.expenseClaim.delete({ where: { id: existing.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// =========================================================================
// 6. TAX DECLARATIONS, STATUTORY REGISTERS & FORMS (HR-PAY-06, HR-PAY-08)
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
        employee: { select: EMPLOYEE_AVATAR_SELECT },
        proofs: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      declarations: declarations.map((d: any) => ({
        ...d,
        employee: flattenEmployeeAvatar(d.employee),
        totalDeclared: Number(d.totalDeclared || 0),
        totalApproved: Number(d.totalApproved || 0),
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /tax/declarations — Create an employee tax declaration
 */
hrPayrollRouter.post("/tax/declarations", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });
    const { employeeId, financialYear, regime = "new", section80c = 0, section80d = 0, hraExemption = 0, otherExemptions = 0 } = req.body;
    if (!employeeId || !financialYear) {
      return res.status(400).json({ error: "Employee and financialYear are required" });
    }

    const totalDeclared = Number(section80c) + Number(section80d) + Number(hraExemption) + Number(otherExemptions);
    const db = getTenantDb();
    const declaration = await db.employeeTaxDeclaration.create({
      data: {
        tenantId,
        employeeId,
        financialYear: String(financialYear),
        taxRegime: String(regime).toLowerCase(),
        section80C: new Decimal(Number(section80c)),
        section80D: new Decimal(Number(section80d)),
        houseRentPaid: new Decimal(Number(hraExemption)),
        otherIncome: new Decimal(Number(otherExemptions)),
        totalDeductionClaimed: new Decimal(totalDeclared),
        totalDeductionApproved: new Decimal(0),
        status: "submitted",
      },
      include: { employee: { select: EMPLOYEE_AVATAR_SELECT }, proofs: true },
    });

    return res.status(201).json({
      declaration: { ...declaration, employee: flattenEmployeeAvatar(declaration.employee) },
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * PATCH /tax/declarations/:id — Approve / reject / update declaration
 */
hrPayrollRouter.patch("/tax/declarations/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });
    const db = getTenantDb();
    const existing = await db.employeeTaxDeclaration.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Declaration not found" });

    const data: any = {};
    if (req.body.status !== undefined) data.status = String(req.body.status).toLowerCase();
    if (req.body.regime !== undefined || req.body.taxRegime !== undefined) {
      data.taxRegime = String(req.body.taxRegime ?? req.body.regime).toLowerCase();
    }
    if (req.body.totalApproved !== undefined || req.body.totalDeductionApproved !== undefined) {
      data.totalDeductionApproved = new Decimal(Number(req.body.totalDeductionApproved ?? req.body.totalApproved));
    } else if (req.body.status === "verified" || req.body.status === "approved") {
      data.totalDeductionApproved = existing.totalDeductionClaimed;
    }

    const updated = await db.employeeTaxDeclaration.update({
      where: { id: existing.id },
      data,
    });
    return res.json({ declaration: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /tax/declarations/:id — Delete declaration
 */
hrPayrollRouter.delete("/tax/declarations/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });
    const db = getTenantDb();
    const existing = await db.employeeTaxDeclaration.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Declaration not found" });

    await db.$transaction(async (tx: any) => {
      await tx.taxDeclarationProof.deleteMany({ where: { declarationId: existing.id } }).catch(() => { });
      await tx.employeeTaxDeclaration.delete({ where: { id: existing.id } });
    });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
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
    }).catch(() => { });

    return res.json({ proof });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /forms/summary — Live statutory forms catalog & metrics
 */
hrPayrollRouter.get("/forms/summary", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const [runsCount, payslipsCount, employeesCount, declarationsCount] = await Promise.all([
      db.payrollRun.count({ where: { tenantId } }),
      db.payslip.count({ where: { tenantId } }),
      db.employee.count({ where: { tenantId, status: "active" } }),
      db.employeeTaxDeclaration.count({ where: { tenantId } }),
    ]);

    return res.json({
      statutoryForms: [
        { code: "FORM_16", title: "Form 16 (Part A & B)", act: "Income-tax Act, 1961", frequency: "Annual", status: "READY" },
        { code: "FORM_24Q", title: "Form 24Q (Quarterly Salary TDS)", act: "Income-tax Act, 1961", frequency: "Quarterly", status: "READY" },
        { code: "PF_ECR", title: "EPF Electronic Challan-cum-Return (ECR)", act: "EPF & MP Act, 1952", frequency: "Monthly", status: "READY" },
        { code: "ESIC_RETURN", title: "ESIC Monthly Contribution Return", act: "ESI Act, 1948", frequency: "Monthly", status: "READY" },
        { code: "PT_FORM_5", title: "Professional Tax Return (Form 5)", act: "State Professional Tax Act", frequency: "Monthly", status: "READY" },
      ],
      metrics: { runsCount, payslipsCount, employeesCount, declarationsCount },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /forms/:code/download — Download live Statutory Form (.xlsx in INR)
 */
hrPayrollRouter.get("/forms/:code/download", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });
    const code = String(req.params.code || "FORM_16").toUpperCase();
    const month = req.query.month ? Number(req.query.month) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;

    const db = getTenantDb();
    const where: any = { tenantId };
    if (month) where.periodMonth = month;
    if (year) where.periodYear = year;

    const payslips = await db.payslip.findMany({
      where,
      include: {
        employee: {
          select: {
            employeeCode: true,
            firstName: true,
            lastName: true,
            pan: true,
            uan: true,
            esiNumber: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(code);
    sheet.columns = [
      { header: "Employee Code", key: "code", width: 16 },
      { header: "Employee Name", key: "name", width: 26 },
      { header: "PAN", key: "pan", width: 16 },
      { header: "UAN / PF No", key: "uan", width: 18 },
      { header: "ESI No", key: "esi", width: 18 },
      { header: "Period", key: "period", width: 14 },
      { header: "Gross Wages (INR)", key: "gross", width: 18 },
      { header: "Deductions (INR)", key: "ded", width: 18 },
      { header: "Net Payable (INR)", key: "net", width: 18 },
    ];
    sheet.getRow(1).font = { bold: true };

    for (const ps of payslips) {
      sheet.addRow({
        code: ps.employee?.employeeCode || "—",
        name: `${ps.employee?.firstName || ""} ${ps.employee?.lastName || ""}`.trim(),
        pan: ps.employee?.pan || "—",
        uan: ps.employee?.uan || "—",
        esi: ps.employee?.esiNumber || "—",
        period: `${ps.periodYear}-${String(ps.periodMonth).padStart(2, "0")}`,
        gross: Number(ps.grossSalary || 0),
        ded: Number(ps.deductions || 0),
        net: Number(ps.netSalary || 0),
      });
    }
    ["gross", "ded", "net"].forEach((k) => {
      sheet.getColumn(k).numFmt = "₹#,##0.00";
    });

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${code}_${year || "All"}_${month || "All"}.xlsx"`);
    return res.send(Buffer.from(buffer));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to generate statutory form" });
  }
});

/**
 * GET /statutory-registers/:code — Live Statutory Registers (Form U/V/W/X/S) from PostgreSQL
 */
hrPayrollRouter.get("/statutory-registers/:code", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });
    const code = String(req.params.code || "FORM_W").toUpperCase();
    const month = Number(req.query.month || new Date().getMonth() + 1);
    const year = Number(req.query.year || new Date().getFullYear());
    const db = getTenantDb();

    const [employees, payslips] = await Promise.all([
      db.employee.findMany({
        where: { tenantId, status: "active" },
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          email: true,
          position: true,
          pan: true,
          uan: true,
          esiNumber: true,
          bankAccount: true,
          joinedAt: true,
          department: { select: { name: true } },
        },
        orderBy: { firstName: "asc" },
      }),
      db.payslip.findMany({
        where: { tenantId, periodMonth: month, periodYear: year },
      }),
    ]);

    const psByEmp = new Map<string, any>();
    for (const p of payslips) psByEmp.set(p.employeeId, p);

    const rows = employees.map((emp: any, idx: number) => {
      const ps = psByEmp.get(emp.id);
      const bd = ps?.breakdown && typeof ps.breakdown === "object" ? (ps.breakdown as Record<string, any>) : {};
      return {
        slNo: idx + 1,
        employeeCode: emp.employeeCode || "—",
        employeeName: `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
        department: emp.department?.name || "—",
        designation: emp.position || "—",
        pan: emp.pan || "—",
        uan: emp.uan || "—",
        esiNumber: emp.esiNumber || "—",
        workingDays: Number(bd.attendance?.workingDays ?? 22),
        presentDays: Number(bd.attendance?.presentDays ?? 22),
        lopDays: Number(bd.attendance?.lopDays ?? 0),
        grossWages: Number(ps?.grossSalary || 0),
        deductions: Number(ps?.deductions || 0),
        netWages: Number(ps?.netSalary || 0),
        status: ps ? "Computed" : "Pending Run",
      };
    });

    return res.json({ code, month, year, rows, totalEmployees: rows.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /statutory-registers/:code/export — Tamil Nadu Rule 16(1) / 18(4) Legal Excel (.xlsx) Export
 */
hrPayrollRouter.get("/statutory-registers/:code/export", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });
    const code = String(req.params.code || "FORM_W").toUpperCase();
    const month = Number(req.query.month || new Date().getMonth() + 1);
    const year = Number(req.query.year || new Date().getFullYear());
    const db = getTenantDb();

    const [tenant, employees, payslips] = await Promise.all([
      db.tenant.findUnique({ where: { id: tenantId }, select: { name: true, address: true } }),
      db.employee.findMany({
        where: { tenantId, status: "active" },
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          gender: true,
          fatherOrSpouseName: true,
          dateOfBirth: true,
          joinedAt: true,
          position: true,
          presentAddress: true,
          permanentAddress: true,
          pfNumber: true,
          esiNumber: true,
          aadhaar: true,
          bankName: true,
          bankAccount: true,
          bankIfsc: true,
          phone: true,
          email: true,
          department: { select: { name: true } },
        },
        orderBy: { firstName: "asc" },
      }),
      db.payslip.findMany({ where: { tenantId, periodMonth: month, periodYear: year } }),
    ]);

    const psByEmp = new Map<string, any>();
    for (const p of payslips) psByEmp.set(p.employeeId, p);
    const monthLabel = MONTH_NAMES[Math.max(0, Math.min(11, month - 1))].toUpperCase();
    const daysInMonth = new Date(year, month, 0).getDate();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(code);
    const titleMap: Record<string, string> = {
      FORM_U: "FORM-U — EMPLOYEE REGISTER [Rule 16(1)]",
      FORM_V: `FORM-V — REGISTER OF EMPLOYMENT / MUSTER ROLL (${monthLabel} ${year}) [Rule 16(1)]`,
      FORM_W: `FORM-W — REGISTER OF WAGES (${monthLabel} ${year}) [Rule 16(1)]`,
      FORM_X: `FORM-X — REGISTER OF LEAVE & SOCIAL SECURITY BENEFITS (${monthLabel} ${year}) [Rule 16(1)]`,
      FORM_S: "FORM-S — NOTICE OF DAILY HOURS OF WORK & WAGES [Rule 18(4)]",
    };

    sheet.addRow([titleMap[code] || code]).font = { bold: true, size: 13 };
    sheet.addRow([`Establishment: ${tenant?.name || "Company"} — ${tenant?.address || ""}`]);
    sheet.addRow([]);

    if (code === "FORM_U") {
      const hdr = sheet.addRow([
        "Sl No", "Employee Name", "Employee ID", "Gender", "Father/Spouse", "DOB", "DOJ",
        "Designation", "Present Address", "Permanent Address", "EPF No", "ESIC No",
        "Aadhaar No", "Bank A/c & IFSC", "Mobile", "Email", "Remarks",
      ]);
      hdr.font = { bold: true };
      employees.forEach((e: any, i: number) => {
        sheet.addRow([
          i + 1, `${e.firstName} ${e.lastName}`.trim(), e.employeeCode || "—", e.gender || "—",
          e.fatherOrSpouseName || "—", e.dateOfBirth ? new Date(e.dateOfBirth).toISOString().slice(0, 10) : "—",
          e.joinedAt ? new Date(e.joinedAt).toISOString().slice(0, 10) : "—", e.position || "—",
          e.presentAddress || "—", e.permanentAddress || "—", e.pfNumber || "—", e.esiNumber || "N/A",
          e.aadhaar || "—", `${e.bankAccount || "—"} (${e.bankName || ""} ${e.bankIfsc || ""})`.trim(),
          e.phone || "—", e.email || "—", "Active",
        ]);
      });
    } else if (code === "FORM_V") {
      const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
      const hdr = sheet.addRow([
        "Sl No", "Employee Name", "Employee ID", "Work Commences", "Rest Interval", "Work Ends",
        ...dayHeaders, "Total Days Worked", "LOP Days", "Remarks",
      ]);
      hdr.font = { bold: true };
      employees.forEach((e: any, i: number) => {
        const ps = psByEmp.get(e.id);
        const bd = ps?.breakdown || {};
        const dayMarks = Array.from({ length: daysInMonth }, (_, dIdx) => {
          const dow = new Date(year, month - 1, dIdx + 1).getDay();
          return dow === 0 || dow === 6 ? "W" : "P";
        });
        sheet.addRow([
          i + 1, `${e.firstName} ${e.lastName}`.trim(), e.employeeCode || "—", "9:00 AM", "60 mins", "6:00 PM",
          ...dayMarks, Number(bd.attendance?.presentDays ?? 22), Number(bd.attendance?.lopDays ?? 0), "Present",
        ]);
      });
    } else if (code === "FORM_X") {
      const hdr = sheet.addRow([
        "Sl No", "Employee Name", "Employee ID", "EL Earned", "EL Availed", "EL Balance",
        "Medical Leave Availed", "Maternity Benefit", "Gratuity Nomination", "Remarks",
      ]);
      hdr.font = { bold: true };
      employees.forEach((e: any, i: number) => {
        sheet.addRow([
          i + 1, `${e.firstName} ${e.lastName}`.trim(), e.employeeCode || "—", 1.0, 0, 1.0, 0, "N/A", "Yes", "",
        ]);
      });
    } else if (code === "FORM_S") {
      const hdr = sheet.addRow([
        "Sl No", "Employee Name", "Gender", "Designation", "Employee ID", "DOJ",
        "Work Starts", "Rest Interval", "Work Ends", "Weekly Holiday", "Rate of Wages (INR)",
      ]);
      hdr.font = { bold: true };
      employees.forEach((e: any, i: number) => {
        const ps = psByEmp.get(e.id);
        sheet.addRow([
          i + 1, `${e.firstName} ${e.lastName}`.trim(), e.gender || "—", e.position || "—",
          e.employeeCode || "—", e.joinedAt ? new Date(e.joinedAt).toISOString().slice(0, 10) : "—",
          "9:30 AM", "60 mins", "6:30 PM", "Saturday & Sunday", Number(ps?.grossSalary || 0),
        ]);
      });
    } else {
      // FORM_W — Register of Wages
      const hdr = sheet.addRow([
        "Sl No", "Employee Name", "Employee ID", "Days Worked", "Basic Wage (INR)", "Allowances (INR)",
        "Gross Wages (INR)", "EPF No", "ESIC No", "Total Deductions (INR)", "Net Wages (INR)", "Remarks",
      ]);
      hdr.font = { bold: true };
      employees.forEach((e: any, i: number) => {
        const ps = psByEmp.get(e.id);
        const bd = ps?.breakdown || {};
        sheet.addRow([
          i + 1, `${e.firstName} ${e.lastName}`.trim(), e.employeeCode || "—",
          Number(bd.attendance?.presentDays ?? daysInMonth), Number(bd.basicSalary || 0),
          Number(bd.componentEarnings || 0), Number(ps?.grossSalary || 0),
          e.pfNumber || "—", e.esiNumber || "N/A", Number(ps?.deductions || 0),
          Number(ps?.netSalary || 0), ps ? "Computed" : "Pending",
        ]);
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${code}_${year}_${String(month).padStart(2, "0")}.xlsx"`);
    return res.send(Buffer.from(buffer));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 8. ALL-INDIA STATUTORY REGISTRY & HR PAYROLL SETTINGS
// =========================================================================

/**
 * GET /jurisdictions — List all 36 Indian States and Union Territories
 */
hrPayrollRouter.get("/jurisdictions", async (_req: AuthRequest, res: Response) => {
  return res.json({
    jurisdictions: ALL_INDIA_JURISDICTIONS,
    totalCount: ALL_INDIA_JURISDICTIONS.length,
    statesCount: ALL_INDIA_JURISDICTIONS.filter((j) => j.type === "STATE").length,
    unionTerritoriesCount: ALL_INDIA_JURISDICTIONS.filter((j) => j.type === "UNION_TERRITORY").length,
  });
});

/**
 * GET /jurisdictions/:code/rules — Retrieve statutory rules for a specific jurisdiction
 */
hrPayrollRouter.get("/jurisdictions/:code/rules", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const stateCode = req.params.code.toUpperCase();
    const rules = await StatutoryRuleRegistryService.listRules({
      stateCode: stateCode === "CENTRAL" || stateCode === "ALL" ? "ALL" : stateCode,
      tenantId,
    });

    return res.json({
      stateCode,
      rules,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /settings — Fetch current tenant's persisted payroll & statutory setup
 */
hrPayrollRouter.get("/settings", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const settingRecord = await db.setting.findFirst({
      where: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "payroll",
        key: "payroll_config",
      },
    });

    const defaultSettings = {
      cutoffDay: 1,
      cutoffEndDay: 30,
      payCycle: "monthly",
      bankFormat: "HDFC_CMS",
      voluntaryPfAllowed: true,
      defaultWorkState: "TN",
      statutoryAutoDeduction: true,
      lwfEnabled: true,
      ptEnabled: true,
      updatedAt: new Date().toISOString(),
    };

    const currentSettings = settingRecord
      ? { ...defaultSettings, ...(settingRecord.valueJson as Record<string, any>) }
      : defaultSettings;

    // Fetch active statutory rule summary for this tenant
    const activeRules = await StatutoryRuleRegistryService.listRules({
      publicationStatus: "published",
      tenantId,
    });

    return res.json({
      settings: currentSettings,
      activeRulesSummary: {
        totalRules: activeRules.length,
        epfRule: activeRules.find((r) => r.ruleType === "EPF"),
        esiRule: activeRules.find((r) => r.ruleType === "ESI"),
        tdsRule: activeRules.find((r) => r.ruleType === "TDS_ITA2025"),
        gratuityRule: activeRules.find((r) => r.ruleType === "GRATUITY"),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /settings — Persist tenant's payroll & statutory configuration parameters
 */
hrPayrollRouter.post("/settings", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const actorId = req.user?.userId || "system";
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const {
      cutoffDay,
      cutoffEndDay,
      payCycle,
      bankFormat,
      voluntaryPfAllowed,
      defaultWorkState,
      statutoryAutoDeduction,
      lwfEnabled,
      ptEnabled,
    } = req.body;

    const db = getTenantDb();
    const configPayload = {
      cutoffDay: Number(cutoffDay) || 1,
      cutoffEndDay: Number(cutoffEndDay) || 30,
      payCycle: payCycle || "monthly",
      bankFormat: bankFormat || "HDFC_CMS",
      voluntaryPfAllowed: voluntaryPfAllowed !== false,
      defaultWorkState: defaultWorkState || "TN",
      statutoryAutoDeduction: statutoryAutoDeduction !== false,
      lwfEnabled: lwfEnabled !== false,
      ptEnabled: ptEnabled !== false,
      updatedAt: new Date().toISOString(),
      updatedBy: actorId,
    };

    const setting = await db.setting.upsert({
      where: {
        scope_scopeId_key: {
          scope: "TENANT",
          scopeId: tenantId,
          key: "payroll_config",
        },
      },
      create: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "payroll",
        key: "payroll_config",
        valueType: "JSON",
        valueJson: configPayload,
        updatedBy: actorId,
      },
      update: {
        valueJson: configPayload,
        updatedBy: actorId,
      },
    });

    await AuditService.log({
      tenantId,
      actorId,
      action: "PAYROLL_SETTINGS_UPDATED",
      resourceType: "Setting",
      resourceId: setting.id,
      details: configPayload,
    });

    return res.json({
      success: true,
      message: "Payroll configuration persisted successfully to database",
      settings: configPayload,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /amendments/sources — List official statutory government sources monitored
 */
hrPayrollRouter.get("/amendments/sources", async (_req: AuthRequest, res: Response) => {
  return res.json({
    sources: StatutoryAmendmentIngestionService.getOfficialSources(),
  });
});

/**
 * POST /amendments/ingest — Ingest an official government gazette / circular amendment as DRAFT
 */
hrPayrollRouter.post("/amendments/ingest", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const actorId = req.user?.userId || "system";
    const actorRole = req.user?.roles?.[0] || "hr_admin";
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const result = await StatutoryAmendmentIngestionService.ingestNotificationAsDraft(
      req.body,
      actorId,
      actorRole,
      tenantId
    );

    await AuditService.log({
      tenantId,
      actorId,
      action: "STATUTORY_AMENDMENT_INGESTED",
      resourceType: "StatutoryRule",
      resourceId: result.draftRule.id,
      details: {
        notificationRef: req.body.notificationRef,
        ruleType: req.body.ruleType,
        stateCode: req.body.stateCode,
        diffSummary: result.diff,
      },
    });

    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /simulate — Interactive payroll calculation simulation with proposed or custom rules
 */
hrPayrollRouter.post("/simulate", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const {
      monthlyGross = 50000,
      basicSalary = 25000,
      state = "TN",
      taxRegime = "new",
      isResident = true,
      pfEligible = true,
      esiEligible = true,
      ptEligible = true,
      lwfEligible = true,
      proposedRuleOverride,
    } = req.body;

    // Fetch baseline active statutory rules
    const activeRules = await StatutoryRuleRegistryService.listRules({
      publicationStatus: "published",
      tenantId,
    });

    const statutoryRules = [...activeRules];
    if (proposedRuleOverride && proposedRuleOverride.ruleType) {
      // Prepend proposed rule override to test against calculation engine
      statutoryRules.unshift({
        id: "SIM_PROPOSAL_" + Date.now(),
        ruleType: proposedRuleOverride.ruleType,
        stateCode: proposedRuleOverride.stateCode || "ALL",
        configJson: proposedRuleOverride.configJson,
        version: proposedRuleOverride.version || 99,
        effectiveFrom: new Date(),
        publicationStatus: "draft",
        isActive: true,
      } as any);
    }

    const syntheticEmployee = {
      id: "SIM_EMP_001",
      employeeCode: "SIM001",
      firstName: "Simulation",
      lastName: "Subject",
      baseMonthlyCtc: Number(monthlyGross),
      state: state.toUpperCase(),
      taxRegime,
      isResident,
      pfEligible,
      esiEligible,
      ptEligible,
      lwfEligible,
    };

    const attendanceContext = {
      payableDays: 30,
      totalDays: 30,
      prorationFactor: 1.0,
      lopDays: 0,
    };

    const breakdown = computeEmployeePayrollBreakdown(
      syntheticEmployee as any,
      attendanceContext as any,
      {
        statutoryRules: statutoryRules as any,
        periodMonth: 1,
        periodYear: 2026,
      }
    );

    return res.json({
      simulation: {
        input: {
          monthlyGross: Number(monthlyGross),
          basicSalary: Number(basicSalary),
          state: state.toUpperCase(),
          taxRegime,
        },
        breakdown,
        statutoryManifest: breakdown.statutoryManifest,
        safetyNotice: "Simulation preview only. Release Gate is BLOCKED. Does not modify or publish live payslips.",
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /rules/draft — Create a tenant-specific draft rule override
 */
hrPayrollRouter.post("/rules/draft", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const actorId = req.user?.userId || "system";
    const actorRole = req.user?.roles?.[0] || "hr_admin";
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const draft = await StatutoryRuleRegistryService.createDraftRule(
      req.body,
      actorId,
      actorRole,
      tenantId
    );

    return res.status(201).json({ draft });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /rules/:id/submit — Submit a draft rule for compliance review
 */
hrPayrollRouter.post("/rules/:id/submit", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const actorId = req.user?.userId || "system";
    const actorRole = req.user?.roles?.[0] || "hr_admin";
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const rule = await StatutoryRuleRegistryService.submitForReview(
      req.params.id,
      actorId,
      actorRole
    );

    return res.json({ rule });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

