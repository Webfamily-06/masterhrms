"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaveRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const tenant_1 = require("../lib/tenant");
const pagination_1 = require("../lib/pagination");
const leave_service_1 = require("../services/leave.service");
exports.leaveRouter = (0, express_1.Router)();
exports.leaveRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
function sendLegacyLeaveError(res, err, defaultStatus = 500) {
    if (err instanceof leave_service_1.LeaveHttpError) {
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
exports.leaveRouter.get("/types", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const status = req.query.status ? String(req.query.status) : undefined;
        const types = await prisma_1.rawPrisma.leaveType.findMany({
            where: {
                tenantId,
                ...(status && status !== "all" ? { status } : {}),
            },
            orderBy: { name: "asc" },
        });
        return res.json(types);
    }
    catch (err) {
        return sendLegacyLeaveError(res, err, 500);
    }
});
// GET /api/leave/balances
exports.leaveRouter.get("/balances", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const isElevated = leave_service_1.LeaveService.isElevatedHrUser(req.user?.roles);
        const callerEmp = await prisma_1.rawPrisma.employee.findFirst({
            where: { tenantId, userId: req.user.userId },
            select: { id: true },
        });
        let targetEmployeeId = req.query.employeeId;
        if (!targetEmployeeId) {
            targetEmployeeId = callerEmp?.id;
        }
        if (!targetEmployeeId) {
            return res.status(400).json({ error: "Employee context required to compute leave balances." });
        }
        if (!isElevated && targetEmployeeId !== callerEmp?.id) {
            const targetEmp = await prisma_1.rawPrisma.employee.findFirst({
                where: { id: targetEmployeeId, tenantId },
                select: { managerId: true },
            });
            if (!targetEmp || targetEmp.managerId !== callerEmp?.id) {
                return res.status(403).json({ error: "Forbidden: Not authorized to view this employee's balances." });
            }
        }
        const year = req.query.year ? parseInt(String(req.query.year), 10) : new Date().getUTCFullYear();
        const detailed = await leave_service_1.LeaveService.getEmployeeDetailedBalances(tenantId, targetEmployeeId, year);
        const balances = detailed.map((b) => ({
            ...b,
            allocatedDays: b.total,
            approvedDays: b.used,
            pendingDays: b.pending,
            remainingDays: b.available,
        }));
        return res.json(balances);
    }
    catch (err) {
        return sendLegacyLeaveError(res, err, 500);
    }
});
// GET /api/leave/requests and /api/leave
const handleGetLeaveRequests = async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const pagination = (0, pagination_1.parsePaginationParams)(req, "createdAt", 25);
        const { employeeId, status, leaveTypeId } = req.query;
        const isElevated = leave_service_1.LeaveService.isElevatedHrUser(req.user?.roles);
        const andConditions = [{ tenantId }];
        if (!isElevated) {
            const selfEmp = await prisma_1.rawPrisma.employee.findFirst({
                where: { tenantId, userId: req.user?.userId },
                select: { id: true },
            });
            if (!selfEmp) {
                return res.json(pagination.isPaginated ? (0, pagination_1.formatPaginatedResponse)([], 0, pagination) : []);
            }
            if (req.user?.roles?.includes("manager")) {
                andConditions.push({
                    OR: [{ employeeId: selfEmp.id }, { employee: { managerId: selfEmp.id } }],
                });
            }
            else {
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
            prisma_1.rawPrisma.leaveRequest.count({ where }),
            prisma_1.rawPrisma.leaveRequest.findMany({
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
            return res.json((0, pagination_1.formatPaginatedResponse)(requests, total, pagination));
        }
        res.setHeader("X-Total-Count", String(total));
        return res.json(requests);
    }
    catch (err) {
        return sendLegacyLeaveError(res, err, 500);
    }
};
exports.leaveRouter.get("/requests", auth_1.requireAuth, handleGetLeaveRequests);
exports.leaveRouter.get("/", auth_1.requireAuth, handleGetLeaveRequests);
// POST /api/leave/requests and /api/leave (routed through authoritative LeaveService)
const handleCreateLeaveRequest = async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { employeeId, leaveTypeId, startDate, endDate, halfDay, halfDaySession, reason, attachmentUrl } = req.body;
        const isLeaveAdmin = leave_service_1.LeaveService.isElevatedHrUser(req.user?.roles);
        let targetEmployeeId = employeeId;
        if (!isLeaveAdmin) {
            const ownEmp = await prisma_1.rawPrisma.employee.findFirst({
                where: { tenantId, userId: req.user.userId },
            });
            if (!ownEmp || (employeeId && employeeId !== ownEmp.id)) {
                return res
                    .status(403)
                    .json({ error: "Forbidden: You may only apply for leave for yourself." });
            }
            targetEmployeeId = ownEmp.id;
        }
        else if (!targetEmployeeId) {
            const emp = await prisma_1.rawPrisma.employee.findFirst({
                where: { tenantId, userId: req.user.userId },
            });
            if (!emp) {
                return res.status(400).json({ error: "Employee record not found for current user." });
            }
            targetEmployeeId = emp.id;
        }
        if (!leaveTypeId || !startDate || !endDate) {
            return res.status(400).json({ error: "leaveTypeId, startDate, and endDate are required." });
        }
        const request = await leave_service_1.LeaveService.submitApplication(tenantId, targetEmployeeId, {
            leaveTypeId,
            startDate,
            endDate,
            halfDay: Boolean(halfDay),
            halfDaySession,
            reason: String(reason || "Leave request").trim(),
            attachmentUrl,
        }, req.user.userId, { bypassNoticePeriod: isLeaveAdmin });
        return res.status(201).json(request);
    }
    catch (err) {
        return sendLegacyLeaveError(res, err, 400);
    }
};
exports.leaveRouter.post("/requests", auth_1.requireAuth, handleCreateLeaveRequest);
exports.leaveRouter.post("/", auth_1.requireAuth, handleCreateLeaveRequest);
// PATCH/PUT /api/leave/requests/:id(/status) (routed through authoritative LeaveService)
async function handleLeaveStatusUpdate(req, res) {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const { status, rejectReason, comments, reason } = req.body;
        if (!["approved", "rejected", "cancelled"].includes(status)) {
            return res
                .status(400)
                .json({ error: "Invalid status. Must be approved, rejected, or cancelled." });
        }
        if (status === "cancelled") {
            const existing = await prisma_1.rawPrisma.leaveRequest.findFirst({
                where: { id, tenantId },
                include: { employee: true },
            });
            if (!existing) {
                return res.status(404).json({ error: "Leave request not found." });
            }
            const isAdmin = leave_service_1.LeaveService.isElevatedHrUser(req.user?.roles);
            const selfEmp = await prisma_1.rawPrisma.employee.findFirst({
                where: { tenantId, userId: req.user?.userId },
                select: { id: true },
            });
            const isOwner = selfEmp && existing.employeeId === selfEmp.id;
            const isDirectManager = selfEmp && existing.employee.managerId === selfEmp.id;
            if (!isOwner && !isAdmin && !isDirectManager) {
                return res.status(403).json({ error: "Forbidden: Not authorized to cancel this request." });
            }
            const cancelled = await leave_service_1.LeaveService.cancelApplication(tenantId, id, req.user.userId, reason || rejectReason || comments || "Cancelled");
            return res.json(cancelled);
        }
        const action = status === "approved" ? "approve" : "reject";
        const updated = await leave_service_1.LeaveService.decideApplication(tenantId, id, action, req.user.userId, comments || rejectReason || reason, req.user?.roles);
        return res.json(updated);
    }
    catch (err) {
        return sendLegacyLeaveError(res, err, 400);
    }
}
exports.leaveRouter.patch("/requests/:id/status", auth_1.requireAuth, handleLeaveStatusUpdate);
exports.leaveRouter.patch("/requests/:id", auth_1.requireAuth, handleLeaveStatusUpdate);
exports.leaveRouter.put("/requests/:id", auth_1.requireAuth, handleLeaveStatusUpdate);
// POST & PUT /api/leave/requests/:id/cancel
const handleLeaveCancellation = async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const existing = await prisma_1.rawPrisma.leaveRequest.findFirst({
            where: { id, tenantId },
            include: { employee: true },
        });
        if (!existing) {
            return res.status(404).json({ error: "Leave request not found." });
        }
        const isAdmin = leave_service_1.LeaveService.isElevatedHrUser(req.user?.roles);
        const selfEmp = await prisma_1.rawPrisma.employee.findFirst({
            where: { tenantId, userId: req.user?.userId },
            select: { id: true },
        });
        const isOwner = selfEmp && existing.employeeId === selfEmp.id;
        const isDirectManager = selfEmp && existing.employee.managerId === selfEmp.id;
        if (!isOwner && !isAdmin && !isDirectManager) {
            return res.status(403).json({ error: "Forbidden: You can only cancel your own leave requests." });
        }
        const request = await leave_service_1.LeaveService.cancelApplication(tenantId, id, req.user.userId, req.body?.reason || "Cancelled");
        return res.json(request);
    }
    catch (err) {
        return sendLegacyLeaveError(res, err, 400);
    }
};
exports.leaveRouter.post("/requests/:id/cancel", auth_1.requireAuth, handleLeaveCancellation);
exports.leaveRouter.put("/requests/:id/cancel", auth_1.requireAuth, handleLeaveCancellation);
exports.leaveRouter.post("/:id/cancel", auth_1.requireAuth, handleLeaveCancellation);
exports.leaveRouter.put("/:id/cancel", auth_1.requireAuth, handleLeaveCancellation);
// POST /api/leave/types (Restricted to HR Admin)
exports.leaveRouter.post("/types", auth_1.requireAuth, async (req, res) => {
    try {
        if (!leave_service_1.LeaveService.isElevatedHrUser(req.user?.roles)) {
            return res.status(403).json({ error: "Forbidden: HR Administrator role required." });
        }
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { name, code, daysPerYear, days_per_year, color, isPaid, halfDayAllowed, sandwichRule } = req.body;
        if (!name || !String(name).trim()) {
            return res.status(400).json({ error: "Leave type name is required." });
        }
        const duplicate = await prisma_1.rawPrisma.leaveType.findFirst({
            where: { tenantId, name: { equals: String(name).trim(), mode: "insensitive" } },
        });
        if (duplicate) {
            return res.status(409).json({ error: `Leave type "${name.trim()}" already exists.` });
        }
        const parsedDays = daysPerYear !== undefined || days_per_year !== undefined
            ? Number(daysPerYear ?? days_per_year)
            : 12;
        const leaveType = await prisma_1.rawPrisma.leaveType.create({
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
    }
    catch (err) {
        return sendLegacyLeaveError(res, err, 500);
    }
});
// PUT /api/leave/types/:id (Restricted to HR Admin)
exports.leaveRouter.put("/types/:id", auth_1.requireAuth, async (req, res) => {
    try {
        if (!leave_service_1.LeaveService.isElevatedHrUser(req.user?.roles)) {
            return res.status(403).json({ error: "Forbidden: HR Administrator role required." });
        }
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const { name, code, daysPerYear, days_per_year, color, status, isPaid, halfDayAllowed, sandwichRule } = req.body;
        const existing = await prisma_1.rawPrisma.leaveType.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return res.status(404).json({ error: "Leave type not found." });
        }
        const updated = await prisma_1.rawPrisma.leaveType.update({
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
    }
    catch (err) {
        return sendLegacyLeaveError(res, err, 500);
    }
});
// DELETE /api/leave/types/:id (Restricted to HR Admin + Referential Integrity Check)
exports.leaveRouter.delete("/types/:id", auth_1.requireAuth, async (req, res) => {
    try {
        if (!leave_service_1.LeaveService.isElevatedHrUser(req.user?.roles)) {
            return res.status(403).json({ error: "Forbidden: HR Administrator role required." });
        }
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const existing = await prisma_1.rawPrisma.leaveType.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return res.status(404).json({ error: "Leave type not found." });
        }
        const [requestCount, ledgerCount, policyCount, encashmentConfigCount, compOffConfigCount, encashmentRequestCount] = await Promise.all([
            prisma_1.rawPrisma.leaveRequest.count({ where: { tenantId, leaveTypeId: id } }),
            prisma_1.rawPrisma.leaveLedgerEntry.count({ where: { tenantId, leaveTypeId: id } }),
            prisma_1.rawPrisma.leavePolicy.count({ where: { tenantId, leaveTypeId: id } }),
            prisma_1.rawPrisma.leaveEncashmentConfig.count({ where: { tenantId, leaveTypeId: id } }),
            prisma_1.rawPrisma.compOffConfig.count({ where: { tenantId, compOffLeaveTypeId: id } }),
            prisma_1.rawPrisma.leaveEncashmentRequest.count({ where: { tenantId, leaveTypeId: id } }),
        ]);
        if (requestCount > 0 ||
            ledgerCount > 0 ||
            policyCount > 0 ||
            encashmentConfigCount > 0 ||
            compOffConfigCount > 0 ||
            encashmentRequestCount > 0) {
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
        await prisma_1.rawPrisma.leaveType.delete({ where: { id } });
        return res.json({ success: true, message: "Leave type deleted" });
    }
    catch (err) {
        return sendLegacyLeaveError(res, err, 500);
    }
});
