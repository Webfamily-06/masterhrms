import { Router, Response } from "express";
import { rawPrisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { parsePaginationParams, formatPaginatedResponse } from "../lib/pagination";
import { LeaveService } from "../services/leave.service";
import { AuditService } from "../services/audit.service";
import { OutboxService } from "../services/outbox.service";

export const hrLeaveRouter = Router();

hrLeaveRouter.use(requireAuth, resolveTenantContext);

// GET /api/v1/hr/leave/applications
hrLeaveRouter.get("/applications", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const pagination = parsePaginationParams(req, "createdAt", 50);
    const { status, employeeId, leaveTypeId } = req.query;

    const where: any = { tenantId };
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
              branch: { select: { name: true } },
              department: { select: { name: true } },
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

// POST /api/v1/hr/leave/applications/:id/action (Approve / Reject)
hrLeaveRouter.post("/applications/:id/action", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { action, comments } = req.body;

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
hrLeaveRouter.post("/applications/:id/cancel", async (req: AuthRequest, res: Response) => {
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

// GET /api/v1/hr/leave/balances (Authoritative ledger balances)
hrLeaveRouter.get("/balances", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const employees = await rawPrisma.employee.findMany({
      where: { tenantId, status: "active" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeCode: true,
        department: { select: { name: true } },
      },
    });

    const leaveTypes = await rawPrisma.leaveType.findMany({ where: { tenantId } });

    // Derive balances per employee per type
    const balances = await Promise.all(
      employees.map(async (emp) => {
        const typeBalances = await Promise.all(
          leaveTypes.map(async (lt) => {
            const bal = await LeaveService.getEmployeeBalance(tenantId, emp.id, lt.id);
            return { leaveTypeId: lt.id, leaveTypeName: lt.name, balance: bal };
          })
        );
        return {
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`.trim(),
          employeeCode: emp.employeeCode,
          department: emp.department?.name || "General",
          balances: typeBalances,
        };
      })
    );

    return res.json(balances);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/hr/leave/balances/adjust (Manual Ledger Adjustment)
hrLeaveRouter.post("/balances/adjust", async (req: AuthRequest, res: Response) => {
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

// GET /api/v1/hr/leave/types
hrLeaveRouter.get("/types", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const types = await rawPrisma.leaveType.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    });
    return res.json(types);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/hr/leave/types
hrLeaveRouter.post("/types", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { name, code, daysPerYear, color, isPaid, sandwichRule, halfDayAllowed } = req.body;

    const leaveType = await rawPrisma.leaveType.create({
      data: {
        tenantId,
        name,
        code: code || name.slice(0, 3).toUpperCase(),
        daysPerYear: Number(daysPerYear) || 12,
        color: color || "blue",
        isPaid: isPaid !== false,
        sandwichRule: !!sandwichRule,
        halfDayAllowed: halfDayAllowed !== false,
      },
    });
    return res.status(201).json(leaveType);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/hr/leave/calendar
hrLeaveRouter.get("/calendar", async (req: AuthRequest, res: Response) => {
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

// GET /api/v1/hr/leave/policies
hrLeaveRouter.get("/policies", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const policies = await rawPrisma.leavePolicy.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    return res.json(policies);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/hr/leave/policies
hrLeaveRouter.post("/policies", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { name, code, isDefault, noticeDays, maxConsecutiveDays, sandwichRule, allowHalfDay, accrualFrequency } = req.body;

    const policy = await rawPrisma.leavePolicy.create({
      data: {
        tenantId,
        name,
        code: code || `LPOL-${Date.now()}`,
        isDefault: !!isDefault,
        noticeDays: Number(noticeDays) || 2,
        maxConsecutiveDays: Number(maxConsecutiveDays) || 14,
        sandwichRule: !!sandwichRule,
      },
    });
    return res.status(201).json(policy);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/hr/leave/encashment-compoff
hrLeaveRouter.get("/encashment-compoff", async (req: AuthRequest, res: Response) => {
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
hrLeaveRouter.post("/encashment-compoff/:id/action", async (req: AuthRequest, res: Response) => {
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
        // Debit ledger entry for encashment
        const currentBal = await LeaveService.getEmployeeBalance(tenantId, enc.employeeId, enc.leaveTypeId);
        await tx.leaveLedgerEntry.create({
          data: {
            tenantId,
            employeeId: enc.employeeId,
            leaveTypeId: enc.leaveTypeId,
            entryType: "ENCASHMENT",
            days: Number(enc.days),
            balance: Math.max(0, currentBal - Number(enc.days)),
            notes: `Encashment approval for request ${id}`,
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
