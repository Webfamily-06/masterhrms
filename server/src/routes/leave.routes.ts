import { Router, Response } from "express";
import { prisma, rawPrisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { resolveTenantId } from "../lib/tenant";
import { parsePaginationParams, formatPaginatedResponse } from "../lib/pagination";
import { LeaveService, LeaveHttpError } from "../services/leave.service";

export const leaveRouter = Router();

leaveRouter.use(requireAuth, resolveTenantContext);

function sendLegacyLeaveError(res: Response, err: any, defaultStatus: number = 500) {
  if (err instanceof LeaveHttpError) {
    return res.status(err.status).json({
      error: err.message,
      ...(err.code ? { code: err.code } : {}),
      ...(err.details ? { details: err.details } : {}),
    });
  }
  if (err?.code === "PERIOD_LOCKED") {
    return res.status(423).json({ error: err.message, code: "PERIOD_LOCKED" });
  }
  return res.status(defaultStatus).json({ error: err?.message || "Internal server error" });
}

// GET /api/leave/types (Read-only, zero side-effect auto-seeding)
leaveRouter.get("/types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const status = req.query.status ? String(req.query.status) : undefined;
    const types = await rawPrisma.leaveType.findMany({
      where: {
        tenantId,
        ...(status && status !== "all" ? { status } : {}),
      },
      orderBy: { name: "asc" },
    });

    return res.json(types);
  } catch (err: any) {
    return sendLegacyLeaveError(res, err, 500);
  }
});

// GET /api/leave/balances
leaveRouter.get("/balances", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const isElevated = LeaveService.isElevatedHrUser(req.user?.roles);
    const callerEmp = await rawPrisma.employee.findFirst({
      where: { tenantId, userId: req.user!.userId },
      select: { id: true },
    });

    let targetEmployeeId = req.query.employeeId as string | undefined;
    if (!targetEmployeeId) {
      targetEmployeeId = callerEmp?.id;
    }

    if (!targetEmployeeId) {
      return res.status(400).json({ error: "Employee context required to compute leave balances." });
    }

    if (!isElevated && targetEmployeeId !== callerEmp?.id) {
      const targetEmp = await rawPrisma.employee.findFirst({
        where: { id: targetEmployeeId, tenantId },
        select: { managerId: true },
      });
      if (!targetEmp || targetEmp.managerId !== callerEmp?.id) {
        return res.status(403).json({ error: "Forbidden: Not authorized to view this employee's balances." });
      }
    }

    const year = req.query.year ? parseInt(String(req.query.year), 10) : new Date().getUTCFullYear();
    const detailed = await LeaveService.getEmployeeDetailedBalances(tenantId, targetEmployeeId, year);

    const balances = detailed.map((b) => ({
      ...b,
      allocatedDays: b.total,
      approvedDays: b.used,
      pendingDays: b.pending,
      remainingDays: b.available,
    }));

    return res.json(balances);
  } catch (err: any) {
    return sendLegacyLeaveError(res, err, 500);
  }
});

// GET /api/leave/requests and /api/leave
const handleGetLeaveRequests = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const pagination = parsePaginationParams(req, "createdAt", 25);
    const { employeeId, status, leaveTypeId } = req.query;
    const isElevated = LeaveService.isElevatedHrUser(req.user?.roles);
    const andConditions: any[] = [{ tenantId }];

    if (!isElevated) {
      const selfEmp = await rawPrisma.employee.findFirst({
        where: { tenantId, userId: req.user?.userId },
        select: { id: true },
      });
      if (!selfEmp) {
        return res.json(pagination.isPaginated ? formatPaginatedResponse([], 0, pagination) : []);
      }
      if (req.user?.roles?.includes("manager")) {
        andConditions.push({
          OR: [{ employeeId: selfEmp.id }, { employee: { managerId: selfEmp.id } }],
        });
      } else {
        andConditions.push({ employeeId: selfEmp.id });
      }
    }

    if (employeeId && employeeId !== "all") {
      andConditions.push({ employeeId: String(employeeId) });
    }
    if (status && status !== "all") {
      andConditions.push({ status: String(status) });
    }
    if (leaveTypeId && leaveTypeId !== "all") {
      andConditions.push({ leaveTypeId: String(leaveTypeId) });
    }
    if (pagination.search) {
      andConditions.push({
        OR: [
          { reason: { contains: pagination.search, mode: "insensitive" } },
          { employee: { firstName: { contains: pagination.search, mode: "insensitive" } } },
          { employee: { lastName: { contains: pagination.search, mode: "insensitive" } } },
          { employee: { employeeCode: { contains: pagination.search, mode: "insensitive" } } },
        ],
      });
    }

    const where = { AND: andConditions };
    const sortField = ["createdAt", "startDate", "endDate", "days", "status"].includes(pagination.sortField)
      ? pagination.sortField
      : "createdAt";

    const [total, requests] = await Promise.all([
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
              department: { select: { name: true } },
            },
          },
          leaveType: true,
        },
        orderBy: { [sortField]: pagination.sortType },
        ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
      }),
    ]);

    if (pagination.isPaginated) {
      return res.json(formatPaginatedResponse(requests, total, pagination));
    }

    res.setHeader("X-Total-Count", String(total));
    return res.json(requests);
  } catch (err: any) {
    return sendLegacyLeaveError(res, err, 500);
  }
};

leaveRouter.get("/requests", requireAuth, handleGetLeaveRequests);
leaveRouter.get("/", requireAuth, handleGetLeaveRequests);

// POST /api/leave/requests and /api/leave (routed through authoritative LeaveService)
const handleCreateLeaveRequest = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { employeeId, leaveTypeId, startDate, endDate, halfDay, halfDaySession, reason, attachmentUrl } =
      req.body;
    const isLeaveAdmin = LeaveService.isElevatedHrUser(req.user?.roles);

    let targetEmployeeId = employeeId;
    if (!isLeaveAdmin) {
      const ownEmp = await rawPrisma.employee.findFirst({
        where: { tenantId, userId: req.user!.userId },
      });
      if (!ownEmp || (employeeId && employeeId !== ownEmp.id)) {
        return res
          .status(403)
          .json({ error: "Forbidden: You may only apply for leave for yourself." });
      }
      targetEmployeeId = ownEmp.id;
    } else if (!targetEmployeeId) {
      const emp = await rawPrisma.employee.findFirst({
        where: { tenantId, userId: req.user!.userId },
      });
      if (!emp) {
        return res.status(400).json({ error: "Employee record not found for current user." });
      }
      targetEmployeeId = emp.id;
    }

    if (!leaveTypeId || !startDate || !endDate) {
      return res.status(400).json({ error: "leaveTypeId, startDate, and endDate are required." });
    }

    const request = await LeaveService.submitApplication(
      tenantId,
      targetEmployeeId,
      {
        leaveTypeId,
        startDate,
        endDate,
        halfDay: Boolean(halfDay),
        halfDaySession,
        reason: String(reason || "Leave request").trim(),
        attachmentUrl,
      },
      req.user!.userId,
      { bypassNoticePeriod: isLeaveAdmin }
    );

    return res.status(201).json(request);
  } catch (err: any) {
    return sendLegacyLeaveError(res, err, 400);
  }
};

leaveRouter.post("/requests", requireAuth, handleCreateLeaveRequest);
leaveRouter.post("/", requireAuth, handleCreateLeaveRequest);

// PATCH/PUT /api/leave/requests/:id(/status) (routed through authoritative LeaveService)
async function handleLeaveStatusUpdate(req: AuthRequest, res: Response) {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { id } = req.params;
    const { status, rejectReason, comments, reason } = req.body;

    if (!["approved", "rejected", "cancelled"].includes(status)) {
      return res
        .status(400)
        .json({ error: "Invalid status. Must be approved, rejected, or cancelled." });
    }

    if (status === "cancelled") {
      const existing = await rawPrisma.leaveRequest.findFirst({
        where: { id, tenantId },
        include: { employee: true },
      });
      if (!existing) {
        return res.status(404).json({ error: "Leave request not found." });
      }
      const isAdmin = LeaveService.isElevatedHrUser(req.user?.roles);
      const selfEmp = await rawPrisma.employee.findFirst({
        where: { tenantId, userId: req.user?.userId },
        select: { id: true },
      });
      const isOwner = selfEmp && existing.employeeId === selfEmp.id;
      const isDirectManager = selfEmp && existing.employee.managerId === selfEmp.id;
      if (!isOwner && !isAdmin && !isDirectManager) {
        return res.status(403).json({ error: "Forbidden: Not authorized to cancel this request." });
      }

      const cancelled = await LeaveService.cancelApplication(
        tenantId,
        id,
        req.user!.userId,
        reason || rejectReason || comments || "Cancelled"
      );
      return res.json(cancelled);
    }

    const action = status === "approved" ? "approve" : "reject";
    const updated = await LeaveService.decideApplication(
      tenantId,
      id,
      action,
      req.user!.userId,
      comments || rejectReason || reason,
      req.user?.roles
    );
    return res.json(updated);
  } catch (err: any) {
    return sendLegacyLeaveError(res, err, 400);
  }
}

leaveRouter.patch("/requests/:id/status", requireAuth, handleLeaveStatusUpdate);
leaveRouter.patch("/requests/:id", requireAuth, handleLeaveStatusUpdate);
leaveRouter.put("/requests/:id", requireAuth, handleLeaveStatusUpdate);

// PUT & POST /api/leave/requests/:id/approve (FN-013 Canonical Route Alias)
leaveRouter.put("/requests/:id/approve", requireAuth, async (req: AuthRequest, res: Response) => {
  req.body = { ...req.body, status: "approved" };
  return handleLeaveStatusUpdate(req, res);
});
leaveRouter.post("/requests/:id/approve", requireAuth, async (req: AuthRequest, res: Response) => {
  req.body = { ...req.body, status: "approved" };
  return handleLeaveStatusUpdate(req, res);
});

// PUT & POST /api/leave/requests/:id/reject (Canonical Rejection Route Alias)
leaveRouter.put("/requests/:id/reject", requireAuth, async (req: AuthRequest, res: Response) => {
  req.body = { ...req.body, status: "rejected" };
  return handleLeaveStatusUpdate(req, res);
});
leaveRouter.post("/requests/:id/reject", requireAuth, async (req: AuthRequest, res: Response) => {
  req.body = { ...req.body, status: "rejected" };
  return handleLeaveStatusUpdate(req, res);
});

// POST & PUT /api/leave/requests/:id/cancel
const handleLeaveCancellation = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { id } = req.params;
    const existing = await rawPrisma.leaveRequest.findFirst({
      where: { id, tenantId },
      include: { employee: true },
    });
    if (!existing) {
      return res.status(404).json({ error: "Leave request not found." });
    }

    const isAdmin = LeaveService.isElevatedHrUser(req.user?.roles);
    const selfEmp = await rawPrisma.employee.findFirst({
      where: { tenantId, userId: req.user?.userId },
      select: { id: true },
    });
    const isOwner = selfEmp && existing.employeeId === selfEmp.id;
    const isDirectManager = selfEmp && existing.employee.managerId === selfEmp.id;

    if (!isOwner && !isAdmin && !isDirectManager) {
      return res.status(403).json({ error: "Forbidden: You can only cancel your own leave requests." });
    }

    const request = await LeaveService.cancelApplication(
      tenantId,
      id,
      req.user!.userId,
      req.body?.reason || "Cancelled"
    );
    return res.json(request);
  } catch (err: any) {
    return sendLegacyLeaveError(res, err, 400);
  }
};

leaveRouter.post("/requests/:id/cancel", requireAuth, handleLeaveCancellation);
leaveRouter.put("/requests/:id/cancel", requireAuth, handleLeaveCancellation);
leaveRouter.post("/:id/cancel", requireAuth, handleLeaveCancellation);
leaveRouter.put("/:id/cancel", requireAuth, handleLeaveCancellation);

// POST /api/leave/types (Restricted to HR Admin)
leaveRouter.post("/types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!LeaveService.isElevatedHrUser(req.user?.roles)) {
      return res.status(403).json({ error: "Forbidden: HR Administrator role required." });
    }
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { name, code, daysPerYear, days_per_year, color, isPaid, halfDayAllowed, sandwichRule } =
      req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Leave type name is required." });
    }

    const duplicate = await rawPrisma.leaveType.findFirst({
      where: { tenantId, name: { equals: String(name).trim(), mode: "insensitive" } },
    });
    if (duplicate) {
      return res.status(409).json({ error: `Leave type "${name.trim()}" already exists.` });
    }

    const parsedDays =
      daysPerYear !== undefined || days_per_year !== undefined
        ? Number(daysPerYear ?? days_per_year)
        : 12;

    const leaveType = await rawPrisma.leaveType.create({
      data: {
        tenantId,
        name: String(name).trim(),
        code: code ? String(code).trim().toUpperCase() : null,
        daysPerYear: parsedDays,
        color: color || "#3B82F6",
        isPaid: isPaid !== undefined ? Boolean(isPaid) : true,
        halfDayAllowed: halfDayAllowed !== undefined ? Boolean(halfDayAllowed) : true,
        sandwichRule: sandwichRule !== undefined ? Boolean(sandwichRule) : false,
        status: "active",
      },
    });
    return res.status(201).json(leaveType);
  } catch (err: any) {
    return sendLegacyLeaveError(res, err, 500);
  }
});

// PUT /api/leave/types/:id (Restricted to HR Admin)
leaveRouter.put("/types/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!LeaveService.isElevatedHrUser(req.user?.roles)) {
      return res.status(403).json({ error: "Forbidden: HR Administrator role required." });
    }
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { id } = req.params;
    const { name, code, daysPerYear, days_per_year, color, status, isPaid, halfDayAllowed, sandwichRule } =
      req.body;

    const existing = await rawPrisma.leaveType.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return res.status(404).json({ error: "Leave type not found." });
    }

    const updated = await rawPrisma.leaveType.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(code !== undefined && { code: code ? String(code).trim().toUpperCase() : null }),
        ...((daysPerYear !== undefined || days_per_year !== undefined) && {
          daysPerYear: Number(daysPerYear ?? days_per_year),
        }),
        ...(color !== undefined && { color }),
        ...(status !== undefined && { status }),
        ...(isPaid !== undefined && { isPaid: Boolean(isPaid) }),
        ...(halfDayAllowed !== undefined && { halfDayAllowed: Boolean(halfDayAllowed) }),
        ...(sandwichRule !== undefined && { sandwichRule: Boolean(sandwichRule) }),
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return sendLegacyLeaveError(res, err, 500);
  }
});

// DELETE /api/leave/types/:id (Restricted to HR Admin + Referential Integrity Check)
leaveRouter.delete("/types/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!LeaveService.isElevatedHrUser(req.user?.roles)) {
      return res.status(403).json({ error: "Forbidden: HR Administrator role required." });
    }
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { id } = req.params;
    const existing = await rawPrisma.leaveType.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return res.status(404).json({ error: "Leave type not found." });
    }

    const [requestCount, ledgerCount, policyCount, encashmentConfigCount, compOffConfigCount, encashmentRequestCount] =
      await Promise.all([
        rawPrisma.leaveRequest.count({ where: { tenantId, leaveTypeId: id } }),
        rawPrisma.leaveLedgerEntry.count({ where: { tenantId, leaveTypeId: id } }),
        rawPrisma.leavePolicy.count({ where: { tenantId, leaveTypeId: id } }),
        rawPrisma.leaveEncashmentConfig.count({ where: { tenantId, leaveTypeId: id } }),
        rawPrisma.compOffConfig.count({ where: { tenantId, compOffLeaveTypeId: id } }),
        rawPrisma.leaveEncashmentRequest.count({ where: { tenantId, leaveTypeId: id } }),
      ]);

    if (
      requestCount > 0 ||
      ledgerCount > 0 ||
      policyCount > 0 ||
      encashmentConfigCount > 0 ||
      compOffConfigCount > 0 ||
      encashmentRequestCount > 0
    ) {
      return res.status(400).json({
        error: `Cannot delete "${existing.name}" because it has linked leave records. Deactivate it instead.`,
        code: "LEAVE_TYPE_IN_USE",
        canDeactivate: existing.status !== "inactive",
        references: {
          requestCount,
          ledgerCount,
          policyCount,
          encashmentConfigCount,
          compOffConfigCount,
          encashmentRequestCount,
        },
      });
    }

    await rawPrisma.leaveType.delete({ where: { id } });
    return res.json({ success: true, message: "Leave type deleted" });
  } catch (err: any) {
    return sendLegacyLeaveError(res, err, 500);
  }
});
