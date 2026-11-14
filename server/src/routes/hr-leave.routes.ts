import { Router, Response } from "express";
import { rawPrisma } from "../prisma";
import { requireAuth, requirePermission, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { parsePaginationParams, formatPaginatedResponse } from "../lib/pagination";
import { LeaveService } from "../services/leave.service";
import { AuditService } from "../services/audit.service";
import { OutboxService } from "../services/outbox.service";

export const hrLeaveRouter = Router();

hrLeaveRouter.use(requireAuth, resolveTenantContext);

// =========================================================================
// 1. LEAVE APPLICATIONS (List, Matrix, Submit, Action, Cancel, Dry-Run)
// =========================================================================

// GET /api/v1/hr/leave/applications
hrLeaveRouter.get("/applications", requirePermission("hrm.leave.view"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const pagination = parsePaginationParams(req, "createdAt", 50);
    const { status, employeeId, leaveTypeId } = req.query;

    const userRoles = req.user?.roles || [];
    const isElevatedHR =
      userRoles.includes("admin") ||
      userRoles.includes("hr_admin") ||
      userRoles.includes("Workspace Admin") ||
      userRoles.includes("HR Manager");

    const where: any = { tenantId };

    // Manager / Manage Own vs Manage All Scope Enforcement
    if (!isElevatedHR) {
      const callerEmp = await rawPrisma.employee.findFirst({
        where: { tenantId, userId: req.user!.userId },
        select: { id: true },
      });
      if (callerEmp) {
        where.OR = [
          { employeeId: callerEmp.id },
          { employee: { managerId: callerEmp.id } },
        ];
      }
    }

    if (status && status !== "all") where.status = String(status);
    if (employeeId && employeeId !== "all") where.employeeId = String(employeeId);
    if (leaveTypeId && leaveTypeId !== "all") where.leaveTypeId = String(leaveTypeId);

    if (pagination.search) {
      where.OR = [
        { employee: { firstName: { contains: pagination.search, mode: "insensitive" } } },
        { employee: { lastName: { contains: pagination.search, mode: "insensitive" } } },
        { employee: { employeeCode: { contains: pagination.search, mode: "insensitive" } } },
      ];
    }

    const [total, records] = await Promise.all([
      rawPrisma.leaveRequest.count({ where }),
      rawPrisma.leaveRequest.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              position: true,
              branch: { select: { id: true, name: true } },
              department: { select: { id: true, name: true } },
              user: { select: { profile: { select: { avatarUrl: true } } } },
            },
          },
          leaveType: true,
        },
        orderBy: { createdAt: pagination.sortType },
        skip: pagination.skip,
        take: pagination.limit,
      }),
    ]);

    return res.json(formatPaginatedResponse(records, total, pagination));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/hr/leave/applications/matrix (Calendar Matrix Grid by Month)
hrLeaveRouter.get("/applications/matrix", requirePermission("hrm.leave.view"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const now = new Date();
    const year = parseInt(String(req.query.year || now.getUTCFullYear()), 10);
    const month = parseInt(String(req.query.month || now.getUTCMonth() + 1), 10); // 1-12
    const targetEmployeeId = req.query.employeeId ? String(req.query.employeeId) : undefined;

    const userRoles = req.user?.roles || [];
    const isElevatedHR =
      userRoles.includes("admin") ||
      userRoles.includes("hr_admin") ||
      userRoles.includes("Workspace Admin") ||
      userRoles.includes("HR Manager");

    // Calculate month boundary
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59));
    const daysInMonth = endOfMonth.getUTCDate();

    // 1. Fetch holidays for the month
    const holidays = await rawPrisma.holiday.findMany({
      where: {
        tenantId,
        date: { gte: startOfMonth, lte: endOfMonth },
        status: "active",
      },
      select: { date: true, name: true },
    });
    const holidayMap = new Map<string, string>();
    holidays.forEach((h) => {
      holidayMap.set(h.date.toISOString().slice(0, 10), h.name);
    });

    // 2. Build days descriptor array
    const days = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(Date.UTC(year, month - 1, d));
      const dateStr = dayDate.toISOString().slice(0, 10);
      const dayOfWeek = dayDate.getUTCDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidayMap.has(dateStr);
      days.push({
        dayNumber: d,
        date: dateStr,
        dayName: dayNames[dayOfWeek],
        isWeekend,
        isHoliday,
        holidayName: holidayMap.get(dateStr) || null,
      });
    }

    // 3. Fetch active employees (with manager reporting scope for non-elevated callers)
    const empWhere: any = { tenantId, status: "active" };
    if (!isElevatedHR) {
      const callerEmp = await rawPrisma.employee.findFirst({
        where: { tenantId, userId: req.user!.userId },
        select: { id: true },
      });
      if (callerEmp) {
        empWhere.OR = [
          { id: callerEmp.id },
          { managerId: callerEmp.id },
        ];
      }
    }
    if (targetEmployeeId && targetEmployeeId !== "all") {
      empWhere.id = targetEmployeeId;
    }

    const employees = await rawPrisma.employee.findMany({
      where: empWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeCode: true,
        position: true,
        department: { select: { name: true } },
        branch: { select: { name: true } },
        user: { select: { profile: { select: { avatarUrl: true } } } },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    // 4. Fetch all active leave types for legend
    const leaveTypes = await rawPrisma.leaveType.findMany({
      where: { tenantId, status: "active" },
      orderBy: { name: "asc" },
    });

    // 5. Fetch leave requests overlapping this month
    const statusParam = req.query.status ? String(req.query.status) : "all";
    const statusFilter: any = statusParam === "all" ? { in: ["approved", "pending"] } : statusParam;

    const leavesWhere: any = {
      tenantId,
      status: statusFilter,
      startDate: { lte: endOfMonth },
      endDate: { gte: startOfMonth },
    };
    if (targetEmployeeId && targetEmployeeId !== "all") {
      leavesWhere.employeeId = targetEmployeeId;
    }

    const leaves = await rawPrisma.leaveRequest.findMany({
      where: leavesWhere,
      include: {
        leaveType: true,
      },
    });

    // Map leaves to employees
    const leavesByEmp = new Map<string, any[]>();
    leaves.forEach((l) => {
      if (!leavesByEmp.has(l.employeeId)) leavesByEmp.set(l.employeeId, []);
      leavesByEmp.get(l.employeeId)!.push({
        id: l.id,
        leaveTypeId: l.leaveTypeId,
        leaveTypeName: l.leaveType?.name || "Leave",
        color: l.leaveType?.color || "#3b82f6",
        isPaid: l.leaveType?.isPaid ?? true,
        startDate: l.startDate.toISOString().slice(0, 10),
        endDate: l.endDate.toISOString().slice(0, 10),
        days: Number(l.days),
        halfDay: l.halfDay,
        halfDaySession: l.halfDaySession,
        status: l.status,
        reason: l.reason,
      });
    });

    const matrixEmployees = employees.map((emp) => ({
      ...emp,
      leaves: leavesByEmp.get(emp.id) || [],
    }));

    return res.json({
      year,
      month,
      daysInMonth,
      days,
      employees: matrixEmployees,
      leaveTypes,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/hr/leave/applications/dry-run
hrLeaveRouter.post("/applications/dry-run", requirePermission("hrm.leave.view"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { employeeId, leaveTypeId, startDate, endDate, halfDay, halfDaySession, reason } = req.body;

    if (!employeeId || !leaveTypeId || !startDate || !endDate) {
      return res.status(400).json({ error: "employeeId, leaveTypeId, startDate, and endDate are required" });
    }

    const preview = await LeaveService.validateDryRun({
      tenantId,
      employeeId,
      leaveTypeId,
      startDate,
      endDate,
      halfDay,
      halfDaySession,
      reason,
    });

    return res.json(preview);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/hr/leave/applications (HR submits on behalf of an employee)
hrLeaveRouter.post("/applications", requirePermission("hrm.leave.create"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { employeeId, leaveTypeId, startDate, endDate, halfDay, halfDaySession, reason, attachmentUrl } = req.body;

    if (!employeeId || !leaveTypeId || !startDate || !endDate || !reason) {
      return res.status(400).json({ error: "employeeId, leaveTypeId, startDate, endDate, and reason are required" });
    }

    const application = await LeaveService.submitApplication(
      tenantId,
      employeeId,
      {
        leaveTypeId,
        startDate,
        endDate,
        halfDay,
        halfDaySession,
        reason,
        attachmentUrl,
      },
      req.user!.userId
    );

    return res.status(201).json(application);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/hr/leave/applications/:id/action (Approve / Reject, alias: /decide)
hrLeaveRouter.post(["/applications/:id/action", "/applications/:id/decide"], requirePermission("hrm.leave.approve"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const action = req.body.action || req.body.decision;
    const comments = req.body.comments || req.body.rejectionReason;

    if (!action || !["approve", "reject"].includes(action)) {
      return res.status(400).json({ error: "Action must be 'approve' or 'reject'" });
    }

    const result = await LeaveService.decideApplication(tenantId, id, action, req.user!.userId, comments);
    return res.json(result);
  } catch (err: any) {
    if (err.code === "PERIOD_LOCKED") return res.status(423).json({ error: err.message });
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/hr/leave/applications/:id/cancel
hrLeaveRouter.post("/applications/:id/cancel", requirePermission("hrm.leave.delete"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { reason } = req.body;

    const result = await LeaveService.cancelApplication(tenantId, id, req.user!.userId, reason);
    return res.json(result);
  } catch (err: any) {
    if (err.code === "PERIOD_LOCKED") return res.status(423).json({ error: err.message });
    return res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 2. LEAVE BALANCES & SYNCHRONIZATION (Detailed Cards, Ledger, Sync)
// =========================================================================

// GET /api/v1/hr/leave/balances (Detailed balance cards matching UI Reference 2)
hrLeaveRouter.get("/balances", requirePermission("hrm.leave.view"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const year = req.query.year ? parseInt(String(req.query.year), 10) : new Date().getFullYear();
    const search = req.query.search ? String(req.query.search).trim().toLowerCase() : "";
    const targetEmployeeId = req.query.employeeId ? String(req.query.employeeId) : undefined;

    const userRoles = req.user?.roles || [];
    const isElevatedHR =
      userRoles.includes("admin") ||
      userRoles.includes("hr_admin") ||
      userRoles.includes("Workspace Admin") ||
      userRoles.includes("HR Manager");

    const empWhere: any = { tenantId, status: "active" };

    // Manager / Manage Own vs Manage All Scope Enforcement
    if (!isElevatedHR) {
      const callerEmp = await rawPrisma.employee.findFirst({
        where: { tenantId, userId: req.user!.userId },
        select: { id: true },
      });
      if (callerEmp) {
        empWhere.OR = [
          { id: callerEmp.id },
          { managerId: callerEmp.id },
        ];
      }
    }

    if (targetEmployeeId && targetEmployeeId !== "all") {
      empWhere.id = targetEmployeeId;
    }
    if (search) {
      empWhere.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { employeeCode: { contains: search, mode: "insensitive" } },
      ];
    }

    const employees = await rawPrisma.employee.findMany({
      where: empWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeCode: true,
        position: true,
        department: { select: { name: true } },
        user: { select: { profile: { select: { avatarUrl: true } } } },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    const activeLeaveTypes = await rawPrisma.leaveType.findMany({
      where: { tenantId, status: "active" },
      orderBy: { name: "asc" },
    });

    const balances = await Promise.all(
      employees.map(async (emp) => {
        const empBalances = await LeaveService.getEmployeeDetailedBalances(tenantId, emp.id, year);
        return {
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`.trim(),
          employeeCode: emp.employeeCode,
          position: emp.position || "Team Member",
          department: emp.department?.name || "General",
          avatarUrl: emp.user?.profile?.avatarUrl || null,
          balances: empBalances,
        };
      })
    );

    return res.json({
      year,
      leaveTypes: activeLeaveTypes,
      data: balances,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/hr/leave/balances/sync (Safe, Idempotent Entitlement Synchronization)
hrLeaveRouter.post("/balances/sync", requirePermission("hrm.leave.edit"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await LeaveService.syncTenantBalances(tenantId, req.user!.userId);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/hr/leave/balances/:employeeId/ledger (Immutable Ledger History)
hrLeaveRouter.get("/balances/:employeeId/ledger", requirePermission("hrm.leave.view"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { employeeId } = req.params;
    const ledger = await LeaveService.getEmployeeLedger(tenantId, employeeId);
    return res.json(ledger);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/hr/leave/balances/adjust (Manual Ledger Adjustment)
hrLeaveRouter.post("/balances/adjust", requirePermission("hrm.leave.edit"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { employeeId, leaveTypeId, entryType, days, notes } = req.body;

    if (!employeeId || !leaveTypeId || !entryType || !days || !notes) {
      return res.status(400).json({ error: "employeeId, leaveTypeId, entryType, days, and notes are required." });
    }

    const currentBal = await LeaveService.getEmployeeBalance(tenantId, employeeId, leaveTypeId);
    const numDays = Number(days);
    const newBal = entryType === "CREDIT" || entryType === "ACCRUAL" ? currentBal + numDays : Math.max(0, currentBal - numDays);

    const entry = await rawPrisma.$transaction(async (tx) => {
      const rec = await tx.leaveLedgerEntry.create({
        data: {
          tenantId,
          employeeId,
          leaveTypeId,
          entryType,
          days: numDays,
          balance: newBal,
          notes,
          effectiveAt: new Date(),
        },
      });

      await AuditService.logAudit(
        {
          tenantId,
          userId: req.user!.userId,
          action: "LEAVE_BALANCE_MANUAL_ADJUSTMENT",
          entityType: "LeaveLedgerEntry",
          entityId: rec.id,
          afterState: { employeeId, leaveTypeId, entryType, days: numDays, notes },
        },
        tx
      );

      return rec;
    });

    return res.status(201).json(entry);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 3. LEAVE TYPES CRUD (Matching UI Reference 3: Two-Column Layout)
// =========================================================================

// GET /api/v1/hr/leave/types
hrLeaveRouter.get("/types", requirePermission("hrm.leave.view"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { status, search } = req.query;

    const where: any = { tenantId };
    if (status && status !== "all") {
      where.status = String(status);
    }
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: "insensitive" } },
        { code: { contains: String(search), mode: "insensitive" } },
      ];
    }

    const types = await rawPrisma.leaveType.findMany({
      where,
      include: {
        _count: {
          select: {
            leaveRequests: true,
            leavePolicies: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    });

    return res.json(types);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/hr/leave/types/:id
hrLeaveRouter.get("/types/:id", requirePermission("hrm.leave.view"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const leaveType = await rawPrisma.leaveType.findFirst({
      where: { id, tenantId },
    });
    if (!leaveType) return res.status(404).json({ error: "Leave type not found" });
    return res.json(leaveType);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/hr/leave/types
hrLeaveRouter.post("/types", requirePermission("hrm.leave.create"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { name, code, description, daysPerYear, color, isPaid, sandwichRule, halfDayAllowed, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Leave type name is required" });
    }

    const duplicate = await rawPrisma.leaveType.findFirst({
      where: {
        tenantId,
        name: { equals: name.trim(), mode: "insensitive" },
      },
    });
    if (duplicate) {
      return res.status(400).json({ error: `A leave type named "${name.trim()}" already exists for this organization.` });
    }

    const leaveType = await rawPrisma.leaveType.create({
      data: {
        tenantId,
        name: name.trim(),
        code: code?.trim() || name.slice(0, 3).toUpperCase(),
        description: description?.trim() || null,
        daysPerYear: Number(daysPerYear) || 12,
        color: color || "#3b82f6",
        isPaid: isPaid !== false,
        sandwichRule: !!sandwichRule,
        halfDayAllowed: halfDayAllowed !== false,
        status: status === "inactive" ? "inactive" : "active",
      },
    });

    await AuditService.logAudit({
      tenantId,
      userId: req.user!.userId,
      action: "LEAVE_TYPE_CREATED",
      entityType: "LeaveType",
      entityId: leaveType.id,
      afterState: leaveType,
    });

    return res.status(201).json(leaveType);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/hr/leave/types/:id
hrLeaveRouter.put("/types/:id", requirePermission("hrm.leave.edit"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { name, code, description, daysPerYear, color, isPaid, sandwichRule, halfDayAllowed, status } = req.body;

    const existing = await rawPrisma.leaveType.findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Leave type not found" });

    if (name && name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await rawPrisma.leaveType.findFirst({
        where: {
          tenantId,
          id: { not: id },
          name: { equals: name.trim(), mode: "insensitive" },
        },
      });
      if (duplicate) {
        return res.status(400).json({ error: `A leave type named "${name.trim()}" already exists for this organization.` });
      }
    }

    const updated = await rawPrisma.leaveType.update({
      where: { id },
      data: {
        name: name ? name.trim() : existing.name,
        code: code !== undefined ? code?.trim() : existing.code,
        description: description !== undefined ? description?.trim() : existing.description,
        daysPerYear: daysPerYear !== undefined ? Number(daysPerYear) : existing.daysPerYear,
        color: color !== undefined ? color : existing.color,
        isPaid: isPaid !== undefined ? !!isPaid : existing.isPaid,
        sandwichRule: sandwichRule !== undefined ? !!sandwichRule : existing.sandwichRule,
        halfDayAllowed: halfDayAllowed !== undefined ? !!halfDayAllowed : existing.halfDayAllowed,
        status: status !== undefined ? status : existing.status,
      },
    });

    await AuditService.logAudit({
      tenantId,
      userId: req.user!.userId,
      action: "LEAVE_TYPE_UPDATED",
      entityType: "LeaveType",
      entityId: id,
      afterState: updated,
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/hr/leave/types/:id/status
hrLeaveRouter.patch("/types/:id/status", requirePermission("hrm.leave.edit"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["active", "inactive"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'active' or 'inactive'" });
    }

    const updated = await rawPrisma.leaveType.updateMany({
      where: { id, tenantId },
      data: { status },
    });

    if (updated.count === 0) return res.status(404).json({ error: "Leave type not found" });

    return res.json({ success: true, id, status });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v1/hr/leave/types/:id (Safe Deletion)
hrLeaveRouter.delete("/types/:id", requirePermission("hrm.leave.delete"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    // Check references
    const [requestCount, ledgerCount, policyCount] = await Promise.all([
      rawPrisma.leaveRequest.count({ where: { tenantId, leaveTypeId: id } }),
      rawPrisma.leaveLedgerEntry.count({ where: { tenantId, leaveTypeId: id } }),
      rawPrisma.leavePolicy.count({ where: { tenantId, leaveTypeId: id } }),
    ]);

    if (requestCount > 0 || ledgerCount > 0 || policyCount > 0) {
      return res.status(400).json({
        error: `Cannot delete leave type: It is referenced by ${requestCount} leave requests, ${ledgerCount} ledger transactions, and ${policyCount} leave policies. Please deactivate it instead.`,
      });
    }

    await rawPrisma.leaveType.delete({ where: { id } });

    await AuditService.logAudit({
      tenantId,
      userId: req.user!.userId,
      action: "LEAVE_TYPE_DELETED",
      entityType: "LeaveType",
      entityId: id,
    });

    return res.json({ success: true, message: "Leave type deleted successfully." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 4. LEAVE POLICIES CRUD (Matching UI Reference 4: Table with Filters)
// =========================================================================

// GET /api/v1/hr/leave/policies
hrLeaveRouter.get("/policies", requirePermission("hrm.leave.view"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { status, leaveTypeId, search } = req.query;

    const where: any = { tenantId };
    if (status && status !== "all") {
      where.status = String(status);
    }
    if (leaveTypeId && leaveTypeId !== "all") {
      where.leaveTypeId = String(leaveTypeId);
    }
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: "insensitive" } },
        { code: { contains: String(search), mode: "insensitive" } },
        { description: { contains: String(search), mode: "insensitive" } },
      ];
    }

    const policies = await rawPrisma.leavePolicy.findMany({
      where,
      include: {
        leaveType: true,
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return res.json(policies);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/hr/leave/policies/:id
hrLeaveRouter.get("/policies/:id", requirePermission("hrm.leave.view"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const policy = await rawPrisma.leavePolicy.findFirst({
      where: { id, tenantId },
      include: { leaveType: true },
    });
    if (!policy) return res.status(404).json({ error: "Leave policy not found" });
    return res.json(policy);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/hr/leave/policies
hrLeaveRouter.post("/policies", requirePermission("hrm.leave.create"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const {
      name,
      code,
      description,
      leaveTypeId,
      noticeDays,
      sandwichRule,
      maxConsecutiveDays,
      carryForwardEnabled,
      maxCarryForwardDays,
      requiresApproval,
      status,
      accrualFrequency,
      probationAllowed,
      isDefault,
      effectiveFrom,
      effectiveTo,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Policy name is required" });
    }

    const duplicate = await rawPrisma.leavePolicy.findFirst({
      where: {
        tenantId,
        name: { equals: name.trim(), mode: "insensitive" },
      },
    });
    if (duplicate) {
      return res.status(400).json({ error: `A leave policy named "${name.trim()}" already exists for this organization.` });
    }

    // If marked default, unset existing default
    if (isDefault) {
      await rawPrisma.leavePolicy.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const policy = await rawPrisma.leavePolicy.create({
      data: {
        tenantId,
        name: name.trim(),
        code: code?.trim() || `LPOL-${Date.now()}`,
        description: description?.trim() || null,
        leaveTypeId: leaveTypeId && leaveTypeId !== "all" ? leaveTypeId : null,
        noticeDays: Number(noticeDays) || 2,
        sandwichRule: !!sandwichRule,
        maxConsecutiveDays: Number(maxConsecutiveDays) || 14,
        carryForwardEnabled: !!carryForwardEnabled,
        maxCarryForwardDays: Number(maxCarryForwardDays) || 0,
        requiresApproval: requiresApproval !== false,
        status: status === "inactive" ? "inactive" : "active",
        accrualFrequency: accrualFrequency || "yearly",
        probationAllowed: probationAllowed !== false,
        isDefault: !!isDefault,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      },
      include: { leaveType: true },
    });

    await AuditService.logAudit({
      tenantId,
      userId: req.user!.userId,
      action: "LEAVE_POLICY_CREATED",
      entityType: "LeavePolicy",
      entityId: policy.id,
      afterState: policy,
    });

    return res.status(201).json(policy);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/hr/leave/policies/:id
hrLeaveRouter.put("/policies/:id", requirePermission("hrm.leave.edit"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const {
      name,
      code,
      description,
      leaveTypeId,
      noticeDays,
      sandwichRule,
      maxConsecutiveDays,
      carryForwardEnabled,
      maxCarryForwardDays,
      requiresApproval,
      status,
      accrualFrequency,
      probationAllowed,
      isDefault,
      effectiveFrom,
      effectiveTo,
    } = req.body;

    const existing = await rawPrisma.leavePolicy.findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Leave policy not found" });

    if (name && name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await rawPrisma.leavePolicy.findFirst({
        where: {
          tenantId,
          id: { not: id },
          name: { equals: name.trim(), mode: "insensitive" },
        },
      });
      if (duplicate) {
        return res.status(400).json({ error: `A leave policy named "${name.trim()}" already exists for this organization.` });
      }
    }

    if (isDefault && !existing.isDefault) {
      await rawPrisma.leavePolicy.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await rawPrisma.leavePolicy.update({
      where: { id },
      data: {
        name: name ? name.trim() : existing.name,
        code: code !== undefined ? code?.trim() : existing.code,
        description: description !== undefined ? description?.trim() : existing.description,
        leaveTypeId: leaveTypeId !== undefined ? (leaveTypeId === "all" ? null : leaveTypeId) : existing.leaveTypeId,
        noticeDays: noticeDays !== undefined ? Number(noticeDays) : existing.noticeDays,
        sandwichRule: sandwichRule !== undefined ? !!sandwichRule : existing.sandwichRule,
        maxConsecutiveDays: maxConsecutiveDays !== undefined ? Number(maxConsecutiveDays) : existing.maxConsecutiveDays,
        carryForwardEnabled: carryForwardEnabled !== undefined ? !!carryForwardEnabled : existing.carryForwardEnabled,
        maxCarryForwardDays: maxCarryForwardDays !== undefined ? Number(maxCarryForwardDays) : existing.maxCarryForwardDays,
        requiresApproval: requiresApproval !== undefined ? !!requiresApproval : existing.requiresApproval,
        status: status !== undefined ? status : existing.status,
        accrualFrequency: accrualFrequency !== undefined ? accrualFrequency : existing.accrualFrequency,
        probationAllowed: probationAllowed !== undefined ? !!probationAllowed : existing.probationAllowed,
        isDefault: isDefault !== undefined ? !!isDefault : existing.isDefault,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : existing.effectiveFrom,
        effectiveTo: effectiveTo !== undefined ? (effectiveTo ? new Date(effectiveTo) : null) : existing.effectiveTo,
      },
      include: { leaveType: true },
    });

    await AuditService.logAudit({
      tenantId,
      userId: req.user!.userId,
      action: "LEAVE_POLICY_UPDATED",
      entityType: "LeavePolicy",
      entityId: id,
      afterState: updated,
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/hr/leave/policies/:id/status
hrLeaveRouter.patch("/policies/:id/status", requirePermission("hrm.leave.edit"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["active", "inactive"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'active' or 'inactive'" });
    }

    const updated = await rawPrisma.leavePolicy.updateMany({
      where: { id, tenantId },
      data: { status },
    });

    if (updated.count === 0) return res.status(404).json({ error: "Leave policy not found" });

    return res.json({ success: true, id, status });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v1/hr/leave/policies/:id
hrLeaveRouter.delete("/policies/:id", requirePermission("hrm.leave.delete"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const existing = await rawPrisma.leavePolicy.findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Leave policy not found" });

    if (existing.isDefault) {
      return res.status(400).json({ error: "Cannot delete the default organization leave policy." });
    }

    if (existing.leaveTypeId) {
      const activeRequests = await rawPrisma.leaveRequest.count({
        where: { tenantId, leaveTypeId: existing.leaveTypeId },
      });
      if (activeRequests > 0) {
        return res.status(400).json({
          error: `Cannot delete leave policy: It is referenced by ${activeRequests} leave requests. Please deactivate it instead.`,
        });
      }
    }

    await rawPrisma.leavePolicy.delete({ where: { id } });

    await AuditService.logAudit({
      tenantId,
      userId: req.user!.userId,
      action: "LEAVE_POLICY_DELETED",
      entityType: "LeavePolicy",
      entityId: id,
    });

    return res.json({ success: true, message: "Leave policy deleted successfully." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 5. CALENDAR (Preserved endpoint for backward compatibility)
// =========================================================================

// GET /api/v1/hr/leave/calendar
hrLeaveRouter.get("/calendar", requirePermission("hrm.leave.view"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const now = new Date();
    const month = parseInt(String(req.query.month || now.getUTCMonth() + 1), 10);
    const year = parseInt(String(req.query.year || now.getUTCFullYear()), 10);

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    const leaves = await rawPrisma.leaveRequest.findMany({
      where: {
        tenantId,
        status: "approved",
        startDate: { lte: end },
        endDate: { gte: start },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            branch: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
        leaveType: true,
      },
    });

    return res.json(leaves);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 6. ENCASHMENT & COMP-OFF
// =========================================================================

// GET /api/v1/hr/leave/encashment-compoff
hrLeaveRouter.get("/encashment-compoff", requirePermission("hrm.leave.view"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const requests = await rawPrisma.leaveEncashmentRequest.findMany({
      where: { tenantId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } } },
        leaveType: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(requests);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/hr/leave/encashment-compoff/:id/action
hrLeaveRouter.post("/encashment-compoff/:id/action", requirePermission("hrm.leave.approve"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { action, comments } = req.body;

    const enc = await rawPrisma.leaveEncashmentRequest.findUnique({ where: { id } });
    if (!enc || enc.tenantId !== tenantId) {
      return res.status(404).json({ error: "Encashment request not found" });
    }

    const updated = await rawPrisma.$transaction(async (tx) => {
      const rec = await tx.leaveEncashmentRequest.update({
        where: { id },
        data: {
          status: action === "approve" ? "APPROVED" : "REJECTED",
          approverId: req.user!.userId,
          approvedAt: new Date(),
        },
      });

      if (action === "approve") {
        const currentBal = await LeaveService.getEmployeeBalance(tenantId, enc.employeeId, enc.leaveTypeId);
        await tx.leaveLedgerEntry.create({
          data: {
            tenantId,
            employeeId: enc.employeeId,
            leaveTypeId: enc.leaveTypeId,
            entryType: "ENCASHMENT",
            days: Number(enc.days),
            balance: Math.max(0, currentBal - Number(enc.days)),
            notes: `Encashment approval for request ${id}. ${comments || ""}`.trim(),
            effectiveAt: new Date(),
          },
        });
      }

      return rec;
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
