"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meLeaveRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const leave_service_1 = require("../services/leave.service");
exports.meLeaveRouter = (0, express_1.Router)();
exports.meLeaveRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
async function getSelfEmployee(req) {
    const tenantId = req.tenantId;
    const employee = await prisma_1.rawPrisma.employee.findFirst({
        where: { tenantId, userId: req.user.userId },
        include: { branch: true, department: true },
    });
    if (!employee)
        throw new Error("Employee profile not found for user");
    return employee;
}
// GET /api/v1/me/leave/applications
exports.meLeaveRouter.get("/applications", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const employee = await getSelfEmployee(req);
        const applications = await prisma_1.rawPrisma.leaveRequest.findMany({
            where: { tenantId, employeeId: employee.id },
            include: { leaveType: true },
            orderBy: { createdAt: "desc" },
        });
        return res.json(applications);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/v1/me/leave/applications/dry-run (Validation & day breakdown)
exports.meLeaveRouter.post("/applications/dry-run", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const employee = await getSelfEmployee(req);
        const { leaveTypeId, startDate, endDate, halfDay, reason } = req.body;
        if (!leaveTypeId || !startDate || !endDate) {
            return res.status(400).json({ error: "leaveTypeId, startDate, and endDate are required" });
        }
        const preview = await leave_service_1.LeaveService.validateDryRun({
            tenantId,
            employeeId: employee.id,
            leaveTypeId,
            startDate,
            endDate,
            halfDay,
            reason,
        });
        return res.json(preview);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// POST /api/v1/me/leave/applications (Submit leave request)
exports.meLeaveRouter.post("/applications", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const employee = await getSelfEmployee(req);
        const { leaveTypeId, startDate, endDate, halfDay, reason } = req.body;
        if (!leaveTypeId || !startDate || !endDate || !reason) {
            return res.status(400).json({ error: "leaveTypeId, startDate, endDate, and reason are required" });
        }
        const application = await leave_service_1.LeaveService.submitApplication(tenantId, employee.id, {
            leaveTypeId,
            startDate,
            endDate,
            halfDay,
            reason,
        });
        return res.status(201).json(application);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// POST /api/v1/me/leave/applications/:id/cancel
exports.meLeaveRouter.post("/applications/:id/cancel", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const employee = await getSelfEmployee(req);
        const { id } = req.params;
        const { reason } = req.body;
        const reqItem = await prisma_1.rawPrisma.leaveRequest.findUnique({ where: { id } });
        if (!reqItem || reqItem.employeeId !== employee.id || reqItem.tenantId !== tenantId) {
            return res.status(403).json({ error: "Forbidden: Cannot cancel another employee's request" });
        }
        const result = await leave_service_1.LeaveService.cancelApplication(tenantId, id, req.user.userId, reason);
        return res.json(result);
    }
    catch (err) {
        if (err.code === "PERIOD_LOCKED")
            return res.status(423).json({ error: err.message });
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/v1/me/leave/balance (Authoritative ledger balances)
exports.meLeaveRouter.get("/balance", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const employee = await getSelfEmployee(req);
        const leaveTypes = await prisma_1.rawPrisma.leaveType.findMany({ where: { tenantId } });
        const balances = await Promise.all(leaveTypes.map(async (lt) => {
            const bal = await leave_service_1.LeaveService.getEmployeeBalance(tenantId, employee.id, lt.id);
            const entries = await prisma_1.rawPrisma.leaveLedgerEntry.findMany({
                where: { tenantId, employeeId: employee.id, leaveTypeId: lt.id },
                orderBy: { effectiveAt: "desc" },
            });
            return {
                leaveTypeId: lt.id,
                leaveTypeName: lt.name,
                quota: lt.daysPerYear,
                isPaid: lt.isPaid,
                available: bal,
                ledger: entries,
            };
        }));
        return res.json(balances);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/v1/me/leave/policies
exports.meLeaveRouter.get("/policies", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const policy = await prisma_1.rawPrisma.leavePolicy.findFirst({
            where: { tenantId, isDefault: true },
        });
        return res.json(policy || { name: "Standard Leave Policy", noticeDays: 2, maxConsecutiveDays: 14, sandwichRule: false });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/v1/me/leave/team-calendar (Peer absence grid with privacy filter)
exports.meLeaveRouter.get("/team-calendar", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const employee = await getSelfEmployee(req);
        const now = new Date();
        const month = parseInt(String(req.query.month || now.getUTCMonth() + 1), 10);
        const year = parseInt(String(req.query.year || now.getUTCFullYear()), 10);
        const start = new Date(Date.UTC(year, month - 1, 1));
        const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));
        // Team calendar: find colleagues in the same department
        const teamLeaves = await prisma_1.rawPrisma.leaveRequest.findMany({
            where: {
                tenantId,
                status: "approved",
                startDate: { lte: end },
                endDate: { gte: start },
                employee: { departmentId: employee.departmentId },
            },
            select: {
                id: true,
                startDate: true,
                endDate: true,
                days: true,
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        department: { select: { name: true } },
                    },
                },
                leaveType: {
                    select: { name: true, color: true },
                },
            },
        });
        return res.json(teamLeaves);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
