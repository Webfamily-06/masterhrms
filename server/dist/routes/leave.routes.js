"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaveRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const socket_1 = require("../socket");
const tenant_1 = require("../lib/tenant");
const pagination_1 = require("../lib/pagination");
exports.leaveRouter = (0, express_1.Router)();
// Enforce Request-Scoped Tenant Context on all leave endpoints
exports.leaveRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
// GET /api/leave/types
exports.leaveRouter.get("/types", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        let types = await prisma_1.prisma.leaveType.findMany({
            where: { tenantId },
            orderBy: { name: "asc" },
        });
        // Auto-seed default leave types if empty
        if (types.length === 0) {
            const defaults = [
                { name: "Casual Leave", daysPerYear: 12, color: "#3B82F6" },
                { name: "Sick Leave", daysPerYear: 10, color: "#EF4444" },
                { name: "Earned / Annual Leave", daysPerYear: 15, color: "#10B981" },
                { name: "Maternity / Paternity", daysPerYear: 90, color: "#8B5CF6" },
            ];
            await Promise.all(defaults.map((d) => prisma_1.prisma.leaveType.create({
                data: {
                    tenantId,
                    name: d.name,
                    daysPerYear: d.daysPerYear,
                    color: d.color,
                },
            })));
            types = await prisma_1.prisma.leaveType.findMany({
                where: { tenantId },
                orderBy: { name: "asc" },
            });
        }
        return res.json(types);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
});
// GET /api/leave/balances
exports.leaveRouter.get("/balances", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        let targetEmployeeId = req.query.employeeId;
        if (!targetEmployeeId) {
            const emp = await prisma_1.prisma.employee.findFirst({
                where: { tenantId, userId: req.user.userId },
            });
            if (emp) {
                targetEmployeeId = emp.id;
            }
        }
        if (!targetEmployeeId) {
            return res.status(400).json({ error: "Employee context required to compute leave balances." });
        }
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1);
        const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);
        const [types, requests] = await Promise.all([
            prisma_1.prisma.leaveType.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
            prisma_1.prisma.leaveRequest.findMany({
                where: {
                    tenantId,
                    employeeId: targetEmployeeId,
                    startDate: { gte: startOfYear, lte: endOfYear },
                },
            }),
        ]);
        const balances = types.map((t) => {
            const typeRequests = requests.filter((r) => r.leaveTypeId === t.id);
            const approvedDays = typeRequests
                .filter((r) => r.status === "approved")
                .reduce((sum, r) => sum + r.days, 0);
            const pendingDays = typeRequests
                .filter((r) => r.status === "pending")
                .reduce((sum, r) => sum + r.days, 0);
            const totalAllocated = t.daysPerYear;
            const remainingDays = Math.max(0, totalAllocated - (approvedDays + pendingDays));
            return {
                leaveTypeId: t.id,
                leaveTypeName: t.name,
                color: t.color,
                allocatedDays: totalAllocated,
                approvedDays,
                pendingDays,
                remainingDays,
            };
        });
        return res.json(balances);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to calculate leave balances" });
    }
});
// GET /api/leave/requests and /api/leave (Stocky Rule 0: Universal Query Contract)
const handleGetLeaveRequests = async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const pagination = (0, pagination_1.parsePaginationParams)(req, "createdAt", 25);
        const { employeeId, status, leaveTypeId } = req.query;
        const where = { tenantId };
        const isEmployeeRoleOnly = req.user?.roles?.includes("employee") && !req.user?.roles?.some((r) => ["super_admin", "admin", "hr_admin", "manager", "Workspace Admin"].includes(r));
        if (isEmployeeRoleOnly) {
            const selfEmp = await prisma_1.prisma.employee.findFirst({
                where: { tenantId, userId: req.user?.userId },
            });
            if (selfEmp) {
                where.employeeId = selfEmp.id;
            }
            else {
                return res.json(pagination.isPaginated ? (0, pagination_1.formatPaginatedResponse)([], 0, pagination) : []);
            }
        }
        else if (employeeId && employeeId !== "all") {
            where.employeeId = String(employeeId);
        }
        if (status && status !== "all")
            where.status = String(status);
        if (leaveTypeId && leaveTypeId !== "all")
            where.leaveTypeId = String(leaveTypeId);
        if (pagination.search) {
            where.OR = [
                { reason: { contains: pagination.search } },
                { employee: { firstName: { contains: pagination.search } } },
                { employee: { lastName: { contains: pagination.search } } },
                { employee: { employeeCode: { contains: pagination.search } } },
            ];
        }
        const sortField = ["createdAt", "startDate", "endDate", "days", "status"].includes(pagination.sortField)
            ? pagination.sortField
            : "createdAt";
        const [total, requests] = await Promise.all([
            prisma_1.prisma.leaveRequest.count({ where }),
            prisma_1.prisma.leaveRequest.findMany({
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
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
};
exports.leaveRouter.get("/requests", auth_1.requireAuth, handleGetLeaveRequests);
exports.leaveRouter.get("/", auth_1.requireAuth, handleGetLeaveRequests);
// POST /api/leave/requests and /api/leave (with strict quota enforcement)
const handleCreateLeaveRequest = async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { employeeId, leaveTypeId, startDate, endDate, reason } = req.body;
        let targetEmployeeId = employeeId;
        if (!targetEmployeeId) {
            const emp = await prisma_1.prisma.employee.findFirst({
                where: { tenantId, userId: req.user.userId },
            });
            if (!emp) {
                return res.status(400).json({ error: "Employee record not found for current user." });
            }
            targetEmployeeId = emp.id;
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ error: "Valid start and end dates are required." });
        }
        if (end < start) {
            return res.status(400).json({ error: "End date cannot be earlier than start date." });
        }
        const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        // Enforce Leave Quota Allocation Check
        if (leaveTypeId) {
            const leaveType = await prisma_1.prisma.leaveType.findFirst({
                where: { id: leaveTypeId, tenantId },
            });
            if (!leaveType) {
                return res.status(404).json({ error: "Selected leave type does not exist." });
            }
            const currentYear = start.getFullYear();
            const startOfYear = new Date(currentYear, 0, 1);
            const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);
            const existingRequests = await prisma_1.prisma.leaveRequest.findMany({
                where: {
                    tenantId,
                    employeeId: targetEmployeeId,
                    leaveTypeId,
                    status: { in: ["approved", "pending"] },
                    startDate: { gte: startOfYear, lte: endOfYear },
                },
            });
            const alreadyUsed = existingRequests.reduce((sum, r) => sum + r.days, 0);
            const remainingQuota = Math.max(0, leaveType.daysPerYear - alreadyUsed);
            if (diffDays > remainingQuota) {
                return res.status(400).json({
                    error: `Insufficient leave balance for ${leaveType.name}. Remaining quota: ${remainingQuota} days (Allocated: ${leaveType.daysPerYear}, Used/Pending: ${alreadyUsed}), Requested: ${diffDays} days.`,
                });
            }
        }
        const request = await prisma_1.prisma.leaveRequest.create({
            data: {
                tenantId,
                employeeId: targetEmployeeId,
                leaveTypeId: leaveTypeId || null,
                startDate: start,
                endDate: end,
                days: diffDays,
                reason,
                status: "pending",
            },
            include: {
                employee: true,
                leaveType: true,
            },
        });
        (0, socket_1.broadcastToTenant)(tenantId, "leave:updated", request);
        (0, socket_1.broadcastToTenant)(tenantId, "notification:new", {
            title: "New Leave Application",
            description: `${request.employee?.firstName || ""} applied for ${request.days} day(s) ${request.leaveType?.name || "Leave"}`,
            type: "leave",
            timestamp: new Date().toISOString(),
        });
        return res.status(201).json(request);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
};
exports.leaveRouter.post("/requests", auth_1.requireAuth, handleCreateLeaveRequest);
exports.leaveRouter.post("/", auth_1.requireAuth, handleCreateLeaveRequest);
// Handler function for updating leave request status & attendance synchronization
async function handleLeaveStatusUpdate(req, res) {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const { status, rejectReason } = req.body;
        if (!["approved", "rejected", "pending", "cancelled"].includes(status)) {
            return res.status(400).json({ error: "Invalid status. Must be approved, rejected, pending, or cancelled." });
        }
        const existing = await prisma_1.prisma.leaveRequest.findFirst({
            where: { id, tenantId },
            include: { employee: true, leaveType: true },
        });
        if (!existing) {
            return res.status(404).json({ error: "Leave request not found." });
        }
        const userRoles = req.user?.roles || [];
        const isManagerOrAdmin = userRoles.some((r) => ["super_admin", "admin", "hr_admin", "manager", "Workspace Admin"].includes(r));
        if (["approved", "rejected"].includes(status) && !isManagerOrAdmin) {
            return res.status(403).json({ error: "Forbidden: Only managers and administrators can approve or reject leave requests." });
        }
        if (status === "cancelled") {
            const selfEmp = await prisma_1.prisma.employee.findFirst({
                where: { tenantId, userId: req.user?.userId },
            });
            const isOwner = selfEmp && existing.employeeId === selfEmp.id;
            if (!isOwner && !isManagerOrAdmin) {
                return res.status(403).json({ error: "Forbidden: You can only cancel your own leave requests." });
            }
        }
        const request = await prisma_1.prisma.leaveRequest.update({
            where: { id },
            data: {
                status,
                approverId: req.user?.userId,
                approvedAt: status === "approved" ? new Date() : null,
            },
            include: {
                employee: true,
                leaveType: true,
            },
        });
        // Auto-mark Attendance as on_leave for all days of the approved leave period
        if (status === "approved") {
            const cur = new Date(request.startDate);
            const end = new Date(request.endDate);
            while (cur <= end) {
                const dayDate = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate());
                await prisma_1.prisma.attendance.upsert({
                    where: {
                        tenantId_employeeId_date: {
                            tenantId,
                            employeeId: request.employeeId,
                            date: dayDate,
                        },
                    },
                    update: {
                        status: "on_leave",
                        notes: `Approved Leave: ${request.leaveType?.name || "Leave"} (${request.reason || "Scheduled"})`,
                    },
                    create: {
                        tenantId,
                        employeeId: request.employeeId,
                        date: dayDate,
                        status: "on_leave",
                        notes: `Approved Leave: ${request.leaveType?.name || "Leave"} (${request.reason || "Scheduled"})`,
                    },
                });
                cur.setDate(cur.getDate() + 1);
            }
        }
        else if (status === "cancelled" && existing.status === "approved") {
            // Revert attendance records previously set to on_leave
            const cur = new Date(existing.startDate);
            const end = new Date(existing.endDate);
            while (cur <= end) {
                const dayDate = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate());
                await prisma_1.prisma.attendance.deleteMany({
                    where: {
                        tenantId,
                        employeeId: existing.employeeId,
                        date: dayDate,
                        status: "on_leave",
                    },
                });
                cur.setDate(cur.getDate() + 1);
            }
        }
        (0, socket_1.broadcastToTenant)(tenantId, "leave:updated", request);
        (0, socket_1.broadcastToTenant)(tenantId, "notification:new", {
            title: `Leave Request ${status.toUpperCase()}`,
            description: `Leave request for ${request.employee?.firstName || "Employee"} was ${status}.`,
            type: "leave",
            timestamp: new Date().toISOString(),
        });
        return res.json(request);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
}
// PATCH /api/leave/requests/:id/status
exports.leaveRouter.patch("/requests/:id/status", auth_1.requireAuth, handleLeaveStatusUpdate);
// PATCH & PUT /api/leave/requests/:id
exports.leaveRouter.patch("/requests/:id", auth_1.requireAuth, handleLeaveStatusUpdate);
exports.leaveRouter.put("/requests/:id", auth_1.requireAuth, handleLeaveStatusUpdate);
// POST & PUT /api/leave/requests/:id/cancel (Self-service cancellation for employees or HR)
const handleLeaveCancellation = async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const existing = await prisma_1.prisma.leaveRequest.findFirst({
            where: { id, tenantId },
            include: { employee: true, leaveType: true },
        });
        if (!existing) {
            return res.status(404).json({ error: "Leave request not found." });
        }
        const userRoles = req.user?.roles || [];
        const isManagerOrAdmin = userRoles.some((r) => ["super_admin", "admin", "hr_admin", "manager", "Workspace Admin"].includes(r));
        const selfEmp = await prisma_1.prisma.employee.findFirst({
            where: { tenantId, userId: req.user?.userId },
        });
        const isOwner = selfEmp && existing.employeeId === selfEmp.id;
        if (!isOwner && !isManagerOrAdmin) {
            return res.status(403).json({ error: "Forbidden: You can only cancel your own leave requests." });
        }
        if (existing.status === "cancelled") {
            return res.status(400).json({ error: "Leave request is already cancelled." });
        }
        const request = await prisma_1.prisma.leaveRequest.update({
            where: { id },
            data: {
                status: "cancelled",
            },
            include: {
                employee: true,
                leaveType: true,
            },
        });
        if (existing.status === "approved") {
            const cur = new Date(existing.startDate);
            const end = new Date(existing.endDate);
            while (cur <= end) {
                const dayDate = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate());
                await prisma_1.prisma.attendance.deleteMany({
                    where: {
                        tenantId,
                        employeeId: existing.employeeId,
                        date: dayDate,
                        status: "on_leave",
                    },
                });
                cur.setDate(cur.getDate() + 1);
            }
        }
        (0, socket_1.broadcastToTenant)(tenantId, "leave:updated", request);
        (0, socket_1.broadcastToTenant)(tenantId, "notification:new", {
            title: "Leave Request Cancelled",
            description: `Leave request for ${request.employee?.firstName || "Employee"} was cancelled.`,
            type: "leave",
            timestamp: new Date().toISOString(),
        });
        return res.json(request);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to cancel leave request." });
    }
};
exports.leaveRouter.post("/requests/:id/cancel", auth_1.requireAuth, handleLeaveCancellation);
exports.leaveRouter.put("/requests/:id/cancel", auth_1.requireAuth, handleLeaveCancellation);
exports.leaveRouter.post("/:id/cancel", auth_1.requireAuth, handleLeaveCancellation);
exports.leaveRouter.put("/:id/cancel", auth_1.requireAuth, handleLeaveCancellation);
// POST /api/leave/types
exports.leaveRouter.post("/types", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { name, daysPerYear, days_per_year, color } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: "Leave type name is required." });
        }
        const leaveType = await prisma_1.prisma.leaveType.create({
            data: {
                tenantId,
                name: name.trim(),
                daysPerYear: Number(daysPerYear || days_per_year || 12),
                color: color || "#3B82F6",
            },
        });
        return res.status(201).json(leaveType);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
});
// PUT /api/leave/types/:id
exports.leaveRouter.put("/types/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const { name, daysPerYear, days_per_year, color } = req.body;
        const existing = await prisma_1.prisma.leaveType.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return res.status(404).json({ error: "Leave type not found." });
        }
        const updated = await prisma_1.prisma.leaveType.update({
            where: { id },
            data: {
                ...(name && { name: String(name).trim() }),
                ...((daysPerYear !== undefined || days_per_year !== undefined) && {
                    daysPerYear: Number(daysPerYear ?? days_per_year),
                }),
                ...(color && { color }),
            },
        });
        return res.json(updated);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
});
// DELETE /api/leave/types/:id
exports.leaveRouter.delete("/types/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        await prisma_1.prisma.leaveType.deleteMany({ where: { id, tenantId } });
        return res.json({ success: true, message: "Leave type deleted" });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
});
