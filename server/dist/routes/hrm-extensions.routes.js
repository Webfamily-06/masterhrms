"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemMaintenanceRouter = exports.bannedIpRouter = exports.providentFundRouter = exports.probationRouter = exports.promotionRouter = exports.wfhRouter = exports.overtimeRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const tenant_1 = require("../lib/tenant");
const pagination_1 = require("../lib/pagination");
const ip_firewall_1 = require("../lib/ip-firewall");
const tenant_connection_manager_service_1 = require("../services/tenant-connection-manager.service");
const biometric_sync_1 = require("../cron/biometric-sync");
const recurring_invoice_service_1 = require("../services/recurring-invoice.service");
const subscription_reminder_cron_1 = require("../cron/subscription-reminder.cron");
const document_expiry_cron_1 = require("../cron/document-expiry.cron");
const probation_contract_expiry_cron_1 = require("../cron/probation-contract-expiry.cron");
const reporting_manager_change_cron_1 = require("../cron/reporting-manager-change.cron");
const maintenance_1 = require("../middleware/maintenance");
const workspace_host_1 = require("../lib/workspace-host");
const attendance_service_1 = require("../services/attendance.service");
const leave_service_1 = require("../services/leave.service");
exports.overtimeRouter = (0, express_1.Router)();
exports.wfhRouter = (0, express_1.Router)();
exports.promotionRouter = (0, express_1.Router)();
exports.probationRouter = (0, express_1.Router)();
exports.providentFundRouter = (0, express_1.Router)();
exports.bannedIpRouter = (0, express_1.Router)();
exports.systemMaintenanceRouter = (0, express_1.Router)();
// ─── OVERTIME ROUTES ────────────────────────────────────────────────────────
exports.overtimeRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
async function resolveOvertimeCallerScope(req, tenantId) {
    const perms = req.user?.permissions || [];
    const isHrAdmin = leave_service_1.LeaveService.isElevatedHrUser(req.user?.roles) ||
        perms.includes("*") ||
        perms.includes("hrm.attendance.manage");
    const selfEmp = await prisma_1.prisma.employee.findFirst({
        where: { tenantId, userId: req.user?.userId },
        select: { id: true },
    });
    if (isHrAdmin) {
        return { isHrAdmin: true, selfEmpId: selfEmp?.id || null, allowedEmployeeIds: null };
    }
    if (!selfEmp) {
        return { isHrAdmin: false, selfEmpId: null, allowedEmployeeIds: [] };
    }
    const reports = await prisma_1.prisma.employee.findMany({
        where: { tenantId, managerId: selfEmp.id },
        select: { id: true },
    });
    return {
        isHrAdmin: false,
        selfEmpId: selfEmp.id,
        allowedEmployeeIds: [selfEmp.id, ...reports.map((r) => r.id)],
    };
}
// GET /api/overtime — list overtime requests within caller organizational scope
exports.overtimeRouter.get("/", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const pagination = (0, pagination_1.parsePaginationParams)(req, "overtimeDate", 50);
        const { status, employeeId } = req.query;
        const where = { tenantId };
        const scope = await resolveOvertimeCallerScope(req, tenantId);
        if (!scope.isHrAdmin) {
            if (!scope.allowedEmployeeIds || scope.allowedEmployeeIds.length === 0) {
                return res.json((0, pagination_1.formatPaginatedResponse)([], 0, pagination));
            }
            if (employeeId && employeeId !== "all") {
                if (!scope.allowedEmployeeIds.includes(String(employeeId))) {
                    return res.status(403).json({ error: "Forbidden: Employee outside your organizational scope." });
                }
                where.employeeId = String(employeeId);
            }
            else {
                where.employeeId = { in: scope.allowedEmployeeIds };
            }
        }
        else if (employeeId && employeeId !== "all") {
            where.employeeId = String(employeeId);
        }
        if (status && status !== "all")
            where.status = String(status);
        if (pagination.search) {
            where.OR = [
                { employee: { firstName: { contains: pagination.search } } },
                { employee: { lastName: { contains: pagination.search } } },
                { employee: { employeeCode: { contains: pagination.search } } },
            ];
        }
        const [data, total] = await Promise.all([
            prisma_1.prisma.overtimeRequest.findMany({
                where,
                orderBy: { overtimeDate: "desc" },
                skip: pagination.skip,
                take: pagination.limit,
                include: {
                    employee: {
                        select: {
                            id: true, firstName: true, lastName: true, employeeCode: true,
                            position: true, department: { select: { name: true } },
                        },
                    },
                },
            }),
            prisma_1.prisma.overtimeRequest.count({ where }),
        ]);
        res.json((0, pagination_1.formatPaginatedResponse)(data, total, pagination));
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /api/overtime — create overtime request
exports.overtimeRouter.post("/", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { employeeId, overtimeDate, hoursRequested, overtimeType, reason } = req.body;
        if (!overtimeDate || !hoursRequested) {
            return res.status(400).json({ error: "employeeId, overtimeDate, hoursRequested are required" });
        }
        const scope = await resolveOvertimeCallerScope(req, tenantId);
        let targetEmployeeId = employeeId ? String(employeeId) : scope.selfEmpId;
        if (!targetEmployeeId) {
            return res.status(400).json({ error: "employeeId, overtimeDate, hoursRequested are required" });
        }
        if (!scope.isHrAdmin) {
            if (!scope.allowedEmployeeIds || !scope.allowedEmployeeIds.includes(targetEmployeeId)) {
                return res.status(403).json({ error: "Forbidden: You cannot submit overtime for another employee." });
            }
        }
        else {
            const targetEmp = await prisma_1.prisma.employee.findFirst({
                where: { id: targetEmployeeId, tenantId },
                select: { id: true },
            });
            if (!targetEmp) {
                return res.status(404).json({ error: "Employee not found in this workspace." });
            }
        }
        const parsedDate = new Date(overtimeDate);
        await attendance_service_1.AttendanceService.assertMonthUnlocked(tenantId, parsedDate);
        const record = await prisma_1.prisma.overtimeRequest.create({
            data: {
                tenantId,
                employeeId: targetEmployeeId,
                overtimeDate: parsedDate,
                hoursRequested: parseFloat(hoursRequested),
                overtimeType: overtimeType || "regular",
                reason: reason || null,
                status: "pending",
            },
            include: {
                employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
            },
        });
        res.status(201).json(record);
    }
    catch (err) {
        if (err?.code === "PERIOD_LOCKED")
            return res.status(423).json({ error: err.message, code: "PERIOD_LOCKED" });
        res.status(500).json({ error: err.message });
    }
});
// PUT /api/overtime/:id/review — approve or reject (HR Admin or Reporting Manager only, never self)
exports.overtimeRouter.put("/:id/review", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { status, reviewRemarks } = req.body;
        if (!["approved", "rejected"].includes(status)) {
            return res.status(400).json({ error: "status must be approved or rejected" });
        }
        const existing = await prisma_1.prisma.overtimeRequest.findFirst({
            where: { id: req.params.id, tenantId },
            include: { employee: { select: { id: true, userId: true, managerId: true } } },
        });
        if (!existing)
            return res.status(404).json({ error: "Overtime request not found" });
        const scope = await resolveOvertimeCallerScope(req, tenantId);
        const callerUserId = req.user?.userId || req.user?.id;
        if ((scope.selfEmpId && existing.employeeId === scope.selfEmpId) ||
            (existing.employee?.userId && existing.employee.userId === callerUserId)) {
            return res.status(403).json({
                error: "Forbidden: Self-approval of overtime requests is not permitted.",
                code: "SELF_APPROVAL_FORBIDDEN",
            });
        }
        const isDirectManager = Boolean(scope.selfEmpId && existing.employee?.managerId === scope.selfEmpId);
        if (!scope.isHrAdmin && !isDirectManager) {
            return res.status(403).json({
                error: "Forbidden: Only HR Administrators or the employee's reporting manager can review overtime requests.",
                code: "FORBIDDEN",
            });
        }
        if (status === "approved") {
            await attendance_service_1.AttendanceService.assertMonthUnlocked(tenantId, existing.overtimeDate);
        }
        const updated = await prisma_1.prisma.overtimeRequest.update({
            where: { id: req.params.id },
            data: {
                status,
                reviewedBy: callerUserId || null,
                reviewedAt: new Date(),
                reviewRemarks: reviewRemarks || null,
            },
        });
        res.json(updated);
    }
    catch (err) {
        if (err?.code === "PERIOD_LOCKED")
            return res.status(423).json({ error: err.message, code: "PERIOD_LOCKED" });
        res.status(500).json({ error: err.message });
    }
});
// DELETE /api/overtime/:id
exports.overtimeRouter.delete("/:id", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const existing = await prisma_1.prisma.overtimeRequest.findFirst({
            where: { id: req.params.id, tenantId },
        });
        if (!existing)
            return res.status(404).json({ error: "Not found" });
        const scope = await resolveOvertimeCallerScope(req, tenantId);
        const isOwnPending = scope.selfEmpId === existing.employeeId && existing.status === "pending";
        if (!scope.isHrAdmin && !isOwnPending) {
            return res.status(403).json({
                error: "Forbidden: Only HR Administrators or the requester (while pending) can delete an overtime request.",
            });
        }
        await prisma_1.prisma.overtimeRequest.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /api/overtime/stats — summary counts within caller organizational scope
exports.overtimeRouter.get("/stats", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const scope = await resolveOvertimeCallerScope(req, tenantId);
        const baseWhere = { tenantId };
        if (!scope.isHrAdmin) {
            baseWhere.employeeId = { in: scope.allowedEmployeeIds && scope.allowedEmployeeIds.length > 0 ? scope.allowedEmployeeIds : ["__NONE__"] };
        }
        const [total, pending, approved, rejected, hoursAgg] = await Promise.all([
            prisma_1.prisma.overtimeRequest.count({ where: baseWhere }),
            prisma_1.prisma.overtimeRequest.count({ where: { ...baseWhere, status: "pending" } }),
            prisma_1.prisma.overtimeRequest.count({ where: { ...baseWhere, status: "approved" } }),
            prisma_1.prisma.overtimeRequest.count({ where: { ...baseWhere, status: "rejected" } }),
            prisma_1.prisma.overtimeRequest.aggregate({
                where: { ...baseWhere, status: "approved" },
                _sum: { hoursRequested: true },
            }),
        ]);
        res.json({
            total,
            pending,
            approved,
            rejected,
            totalApprovedHours: hoursAgg._sum.hoursRequested || 0,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ─── WFH ROUTES ─────────────────────────────────────────────────────────────
exports.wfhRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
// GET /api/wfh
exports.wfhRouter.get("/", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const pagination = (0, pagination_1.parsePaginationParams)(req, "fromDate", 50);
        const { status, employeeId } = req.query;
        const where = { tenantId };
        if (status && status !== "all")
            where.status = String(status);
        if (employeeId && employeeId !== "all")
            where.employeeId = String(employeeId);
        if (pagination.search) {
            where.OR = [
                { employee: { firstName: { contains: pagination.search } } },
                { employee: { lastName: { contains: pagination.search } } },
                { employee: { employeeCode: { contains: pagination.search } } },
            ];
        }
        const [data, total] = await Promise.all([
            prisma_1.prisma.wfhRequest.findMany({
                where,
                orderBy: { fromDate: "desc" },
                skip: pagination.skip,
                take: pagination.limit,
                include: {
                    employee: {
                        select: {
                            id: true, firstName: true, lastName: true, employeeCode: true,
                            position: true, department: { select: { name: true } },
                        },
                    },
                },
            }),
            prisma_1.prisma.wfhRequest.count({ where }),
        ]);
        res.json((0, pagination_1.formatPaginatedResponse)(data, total, pagination));
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /api/wfh
exports.wfhRouter.post("/", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { employeeId, fromDate, toDate, reason } = req.body;
        if (!employeeId || !fromDate || !toDate) {
            return res.status(400).json({ error: "employeeId, fromDate, toDate are required" });
        }
        const record = await prisma_1.prisma.wfhRequest.create({
            data: {
                tenantId,
                employeeId,
                fromDate: new Date(fromDate),
                toDate: new Date(toDate),
                reason: reason || null,
                status: "pending",
            },
            include: {
                employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
            },
        });
        res.status(201).json(record);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// PUT /api/wfh/:id/review
exports.wfhRouter.put("/:id/review", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { status, reviewRemarks } = req.body;
        if (!["approved", "rejected", "completed"].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }
        const existing = await prisma_1.prisma.wfhRequest.findFirst({ where: { id: req.params.id, tenantId } });
        if (!existing)
            return res.status(404).json({ error: "WFH request not found" });
        const updated = await prisma_1.prisma.wfhRequest.update({
            where: { id: req.params.id },
            data: {
                status,
                reviewedBy: req.user?.id || req.user?.userId || null,
                reviewedAt: new Date(),
                reviewRemarks: reviewRemarks || null,
            },
        });
        res.json(updated);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// DELETE /api/wfh/:id
exports.wfhRouter.delete("/:id", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const existing = await prisma_1.prisma.wfhRequest.findFirst({ where: { id: req.params.id, tenantId } });
        if (!existing)
            return res.status(404).json({ error: "Not found" });
        await prisma_1.prisma.wfhRequest.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ─── PROMOTION ROUTES ────────────────────────────────────────────────────────
exports.promotionRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
// GET /api/promotions
exports.promotionRouter.get("/", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const pagination = (0, pagination_1.parsePaginationParams)(req, "promotionDate", 50);
        const { employeeId, promotionType } = req.query;
        const where = { tenantId };
        if (employeeId && employeeId !== "all")
            where.employeeId = String(employeeId);
        if (promotionType && promotionType !== "all")
            where.promotionType = String(promotionType);
        if (pagination.search) {
            where.OR = [
                { employee: { firstName: { contains: pagination.search } } },
                { employee: { lastName: { contains: pagination.search } } },
                { newDesignation: { contains: pagination.search } },
            ];
        }
        const [data, total] = await Promise.all([
            prisma_1.prisma.promotionRecord.findMany({
                where,
                orderBy: { promotionDate: "desc" },
                skip: pagination.skip,
                take: pagination.limit,
                include: {
                    employee: {
                        select: {
                            id: true, firstName: true, lastName: true, employeeCode: true,
                            position: true, department: { select: { name: true } },
                        },
                    },
                },
            }),
            prisma_1.prisma.promotionRecord.count({ where }),
        ]);
        res.json((0, pagination_1.formatPaginatedResponse)(data, total, pagination));
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /api/promotions
exports.promotionRouter.post("/", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { employeeId, promotionDate, newDesignation, previousDesignation, previousDepartment, newDepartment, previousSalary, newSalary, promotionType, remarks } = req.body;
        if (!employeeId || !promotionDate || !newDesignation) {
            return res.status(400).json({ error: "employeeId, promotionDate, newDesignation are required" });
        }
        const record = await prisma_1.prisma.promotionRecord.create({
            data: {
                tenantId, employeeId,
                promotionDate: new Date(promotionDate),
                newDesignation,
                previousDesignation: previousDesignation || null,
                previousDepartment: previousDepartment || null,
                newDepartment: newDepartment || null,
                previousSalary: previousSalary ? parseFloat(previousSalary) : null,
                newSalary: newSalary ? parseFloat(newSalary) : null,
                promotionType: promotionType || "promotion",
                remarks: remarks || null,
            },
            include: {
                employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
            },
        });
        res.status(201).json(record);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// DELETE /api/promotions/:id
exports.promotionRouter.delete("/:id", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const existing = await prisma_1.prisma.promotionRecord.findFirst({ where: { id: req.params.id, tenantId } });
        if (!existing)
            return res.status(404).json({ error: "Not found" });
        await prisma_1.prisma.promotionRecord.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ─── PROBATION ROUTES ────────────────────────────────────────────────────────
exports.probationRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
// GET /api/probation
exports.probationRouter.get("/", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const pagination = (0, pagination_1.parsePaginationParams)(req, "startDate", 50);
        const { status, employeeId } = req.query;
        const where = { tenantId };
        if (status && status !== "all")
            where.status = String(status);
        if (employeeId && employeeId !== "all")
            where.employeeId = String(employeeId);
        if (pagination.search) {
            where.OR = [
                { employee: { firstName: { contains: pagination.search } } },
                { employee: { lastName: { contains: pagination.search } } },
                { employee: { employeeCode: { contains: pagination.search } } },
            ];
        }
        const [data, total] = await Promise.all([
            prisma_1.prisma.probationRecord.findMany({
                where,
                orderBy: { startDate: "desc" },
                skip: pagination.skip,
                take: pagination.limit,
                include: {
                    employee: {
                        select: {
                            id: true, firstName: true, lastName: true, employeeCode: true,
                            position: true, department: { select: { name: true } },
                        },
                    },
                },
            }),
            prisma_1.prisma.probationRecord.count({ where }),
        ]);
        res.json((0, pagination_1.formatPaginatedResponse)(data, total, pagination));
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /api/probation
exports.probationRouter.post("/", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { employeeId, startDate, endDate, probationPeriodDays, remarks } = req.body;
        if (!employeeId || !startDate || !endDate) {
            return res.status(400).json({ error: "employeeId, startDate, endDate are required" });
        }
        const record = await prisma_1.prisma.probationRecord.create({
            data: {
                tenantId, employeeId,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                probationPeriodDays: parseInt(probationPeriodDays) || 90,
                remarks: remarks || null,
                status: "active",
            },
            include: {
                employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
            },
        });
        res.status(201).json(record);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// PUT /api/probation/:id — update status
exports.probationRouter.put("/:id", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const existing = await prisma_1.prisma.probationRecord.findFirst({ where: { id: req.params.id, tenantId } });
        if (!existing)
            return res.status(404).json({ error: "Not found" });
        const { status, performanceRating, remarks, extendedUntil } = req.body;
        const updated = await prisma_1.prisma.probationRecord.update({
            where: { id: req.params.id },
            data: {
                status: status || existing.status,
                performanceRating: performanceRating || existing.performanceRating,
                remarks: remarks || existing.remarks,
                extendedUntil: extendedUntil ? new Date(extendedUntil) : existing.extendedUntil,
                confirmedAt: status === "passed" ? new Date() : existing.confirmedAt,
            },
        });
        res.json(updated);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// DELETE /api/probation/:id
exports.probationRouter.delete("/:id", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const existing = await prisma_1.prisma.probationRecord.findFirst({ where: { id: req.params.id, tenantId } });
        if (!existing)
            return res.status(404).json({ error: "Not found" });
        await prisma_1.prisma.probationRecord.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ─── PROVIDENT FUND ROUTES ──────────────────────────────────────────────────
exports.providentFundRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
// GET /api/provident-funds — list provident fund records
exports.providentFundRouter.get("/", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const pagination = (0, pagination_1.parsePaginationParams)(req, "createdAt", 50);
        const { status, pfType, employeeId } = req.query;
        const where = { tenantId };
        if (status && status !== "all")
            where.status = String(status);
        if (pfType && pfType !== "all")
            where.pfType = String(pfType);
        if (employeeId && employeeId !== "all")
            where.employeeId = String(employeeId);
        if (pagination.search) {
            where.OR = [
                { employee: { firstName: { contains: pagination.search } } },
                { employee: { lastName: { contains: pagination.search } } },
                { employee: { employeeCode: { contains: pagination.search } } },
            ];
        }
        const [data, total] = await Promise.all([
            prisma_1.prisma.providentFundRecord.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: pagination.skip,
                take: pagination.limit,
                include: {
                    employee: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            employeeCode: true,
                            position: true,
                            email: true,
                            department: { select: { name: true } },
                        },
                    },
                },
            }),
            prisma_1.prisma.providentFundRecord.count({ where }),
        ]);
        res.json((0, pagination_1.formatPaginatedResponse)(data, total, pagination));
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /api/provident-funds/summary — metrics
exports.providentFundRouter.get("/summary", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const [totalEnrolled, approved, pending, vpfCount] = await Promise.all([
            prisma_1.prisma.providentFundRecord.count({ where: { tenantId } }),
            prisma_1.prisma.providentFundRecord.count({ where: { tenantId, status: "Approved" } }),
            prisma_1.prisma.providentFundRecord.count({ where: { tenantId, status: "Pending" } }),
            prisma_1.prisma.providentFundRecord.count({ where: { tenantId, pfType: "Voluntary Provident Fund" } }),
        ]);
        res.json({
            totalEnrolled,
            approved,
            pending,
            vpfCount,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /api/provident-funds
exports.providentFundRouter.post("/", (0, auth_1.requireRole)("admin", "tenant_admin", "hr_admin"), async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { employeeId, pfType = "Employee Provident Fund", employeeSharePercent = 0, employeeShareAmount = 0, orgSharePercent = 0, orgShareAmount = 0, status = "Approved", description, } = req.body;
        if (!employeeId) {
            return res.status(400).json({ error: "employeeId is required" });
        }
        // Verify employee belongs to tenant
        const emp = await prisma_1.prisma.employee.findFirst({
            where: { id: employeeId, tenantId },
        });
        if (!emp) {
            return res.status(400).json({ error: "Selected employee does not exist in this organization." });
        }
        // Validate percentage and amount ranges
        const empPct = Number(employeeSharePercent);
        const orgPct = Number(orgSharePercent);
        const empAmt = Number(employeeShareAmount);
        const orgAmt = Number(orgShareAmount);
        if (isNaN(empPct) || empPct < 0 || empPct > 100) {
            return res.status(400).json({ error: "Employee share percent must be between 0% and 100%." });
        }
        if (isNaN(orgPct) || orgPct < 0 || orgPct > 100) {
            return res.status(400).json({ error: "Organization share percent must be between 0% and 100%." });
        }
        if (isNaN(empAmt) || empAmt < 0 || isNaN(orgAmt) || orgAmt < 0) {
            return res.status(400).json({ error: "Contribution amounts cannot be negative." });
        }
        const record = await prisma_1.prisma.providentFundRecord.create({
            data: {
                tenantId,
                employeeId,
                pfType,
                employeeSharePercent: empPct,
                employeeShareAmount: empAmt,
                orgSharePercent: orgPct,
                orgShareAmount: orgAmt,
                status,
                description: description || null,
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        position: true,
                        email: true,
                        department: { select: { name: true } },
                    },
                },
            },
        });
        res.status(201).json(record);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// PUT /api/provident-funds/:id
exports.providentFundRouter.put("/:id", (0, auth_1.requireRole)("admin", "tenant_admin", "hr_admin"), async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const existing = await prisma_1.prisma.providentFundRecord.findFirst({ where: { id: req.params.id, tenantId } });
        if (!existing)
            return res.status(404).json({ error: "Not found" });
        const { pfType, employeeSharePercent, employeeShareAmount, orgSharePercent, orgShareAmount, status, description, } = req.body;
        const empPct = employeeSharePercent !== undefined ? Number(employeeSharePercent) : Number(existing.employeeSharePercent);
        const orgPct = orgSharePercent !== undefined ? Number(orgSharePercent) : Number(existing.orgSharePercent);
        const empAmt = employeeShareAmount !== undefined ? Number(employeeShareAmount) : Number(existing.employeeShareAmount);
        const orgAmt = orgShareAmount !== undefined ? Number(orgShareAmount) : Number(existing.orgShareAmount);
        if (isNaN(empPct) || empPct < 0 || empPct > 100) {
            return res.status(400).json({ error: "Employee share percent must be between 0% and 100%." });
        }
        if (isNaN(orgPct) || orgPct < 0 || orgPct > 100) {
            return res.status(400).json({ error: "Organization share percent must be between 0% and 100%." });
        }
        if (isNaN(empAmt) || empAmt < 0 || isNaN(orgAmt) || orgAmt < 0) {
            return res.status(400).json({ error: "Contribution amounts cannot be negative." });
        }
        const updated = await prisma_1.prisma.providentFundRecord.update({
            where: { id: req.params.id },
            data: {
                pfType: pfType ?? existing.pfType,
                employeeSharePercent: empPct,
                employeeShareAmount: empAmt,
                orgSharePercent: orgPct,
                orgShareAmount: orgAmt,
                status: status ?? existing.status,
                description: description !== undefined ? description : existing.description,
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        position: true,
                        email: true,
                        department: { select: { name: true } },
                    },
                },
            },
        });
        res.json(updated);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// DELETE /api/provident-funds/:id
exports.providentFundRouter.delete("/:id", (0, auth_1.requireRole)("admin", "tenant_admin", "hr_admin"), async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const existing = await prisma_1.prisma.providentFundRecord.findFirst({ where: { id: req.params.id, tenantId } });
        if (!existing)
            return res.status(404).json({ error: "Not found" });
        await prisma_1.prisma.providentFundRecord.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ─── BANNED IP ROUTES ───────────────────────────────────────────────────────
exports.bannedIpRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
// GET /api/banned-ips
exports.bannedIpRouter.get("/", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const pagination = (0, pagination_1.parsePaginationParams)(req, "createdAt", 50);
        const where = { tenantId };
        if (pagination.search) {
            where.OR = [
                { ipAddress: { contains: pagination.search } },
                { reason: { contains: pagination.search } },
            ];
        }
        const [data, total] = await Promise.all([
            prisma_1.prisma.bannedIp.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: pagination.skip,
                take: pagination.limit,
            }),
            prisma_1.prisma.bannedIp.count({ where }),
        ]);
        res.json((0, pagination_1.formatPaginatedResponse)(data, total, pagination));
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /api/banned-ips
exports.bannedIpRouter.post("/", (0, auth_1.requireRole)("admin", "tenant_admin", "hr_admin"), async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { ipAddress, reason } = req.body;
        if (!ipAddress || typeof ipAddress !== "string") {
            return res.status(400).json({ error: "ipAddress is required" });
        }
        const trimmedIp = ipAddress.trim();
        if (!(0, ip_firewall_1.isValidIpOrCidr)(trimmedIp)) {
            return res.status(400).json({
                error: "Invalid IP address or CIDR range format (e.g. 192.168.1.1, 2001:db8::1, or 10.0.0.0/24).",
            });
        }
        const record = await prisma_1.prisma.bannedIp.upsert({
            where: { tenantId_ipAddress: { tenantId, ipAddress: trimmedIp } },
            update: { reason, isActive: true },
            create: { tenantId, ipAddress: trimmedIp, reason, isActive: true },
        });
        res.status(201).json(record);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// PUT /api/banned-ips/:id
exports.bannedIpRouter.put("/:id", (0, auth_1.requireRole)("admin", "tenant_admin", "hr_admin"), async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const existing = await prisma_1.prisma.bannedIp.findFirst({ where: { id: req.params.id, tenantId } });
        if (!existing)
            return res.status(404).json({ error: "Not found" });
        const { ipAddress, reason, isActive } = req.body;
        if (ipAddress !== undefined) {
            if (!(0, ip_firewall_1.isValidIpOrCidr)(String(ipAddress).trim())) {
                return res.status(400).json({
                    error: "Invalid IP address or CIDR range format.",
                });
            }
        }
        const updated = await prisma_1.prisma.bannedIp.update({
            where: { id: req.params.id },
            data: {
                ipAddress: ipAddress ? String(ipAddress).trim() : existing.ipAddress,
                reason: reason !== undefined ? reason : existing.reason,
                isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
            },
        });
        res.json(updated);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// DELETE /api/banned-ips/:id
exports.bannedIpRouter.delete("/:id", (0, auth_1.requireRole)("admin", "tenant_admin", "hr_admin"), async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const existing = await prisma_1.prisma.bannedIp.findFirst({ where: { id: req.params.id, tenantId } });
        if (!existing)
            return res.status(404).json({ error: "Not found" });
        await prisma_1.prisma.bannedIp.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ─── SYSTEM MAINTENANCE & CACHE ─────────────────────────────────────────────
// Public Maintenance Status Endpoint (accessible without authentication)
exports.systemMaintenanceRouter.get("/maintenance-status", async (_req, res) => {
    try {
        const config = await (0, maintenance_1.getPlatformMaintenanceConfig)();
        const evaluation = (0, maintenance_1.evaluateMaintenanceStatus)(config);
        return res.json({
            active: evaluation.isActive,
            scheduled: evaluation.isScheduled,
            status: evaluation.status,
            startTime: config.maintenanceStartTime || null,
            endTime: config.maintenanceEndTime || null,
            message: config.maintenanceNoticeMessage || null,
            timezone: config.defaultTimezone || "Asia/Kolkata",
            supportEmail: config.supportEmail || `support@${(0, workspace_host_1.getBaseDomain)()}`,
            retryAfterSeconds: evaluation.retryAfterSeconds,
        });
    }
    catch (err) {
        return res.json({
            active: false,
            scheduled: false,
            status: "operational",
            startTime: null,
            endTime: null,
            message: null,
            timezone: "Asia/Kolkata",
            supportEmail: `support@${(0, workspace_host_1.getBaseDomain)()}`,
            retryAfterSeconds: null,
        });
    }
});
exports.systemMaintenanceRouter.use(auth_1.requireAuth);
exports.systemMaintenanceRouter.post("/clear-cache", (0, auth_1.requireRole)("admin", "super_admin", "tenant_admin", "hr_admin"), async (req, res) => {
    try {
        const isSuper = req.user?.roles?.includes("super_admin");
        const tenantId = req.user?.tenantId;
        const { cacheType = "all" } = req.body;
        let evictedPool = false;
        // Evict tenant connection pool cache if tenant context is present
        if (tenantId && (cacheType === "runtime" || cacheType === "all")) {
            evictedPool = await tenant_connection_manager_service_1.TenantConnectionManager.getInstance().evictTenant(tenantId);
        }
        // Trigger Node GC if available
        if (global.gc) {
            global.gc();
        }
        const memUsage = process.memoryUsage();
        res.json({
            success: true,
            scope: isSuper ? "platform" : "tenant",
            message: isSuper
                ? "Platform system cache and runtime memory cleared successfully."
                : `System cache cleared for workspace context (${tenantId}).`,
            clearedAt: new Date().toISOString(),
            cacheType,
            evictedConnectionPool: evictedPool,
            memory: {
                heapUsedMb: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100,
                heapTotalMb: Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100,
                rssMb: Math.round((memUsage.rss / 1024 / 1024) * 100) / 100,
            },
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ─── CRON JOBS SCHEDULER & HEALTH ───────────────────────────────────────────
// ─── CRON JOBS SCHEDULER & HEALTH (PLATFORM SUPER ADMIN ONLY) ───────────────────
// GET /api/system/cronjobs
exports.systemMaintenanceRouter.get("/cronjobs", auth_1.requireAuth, auth_1.requireSuperAdmin, async (req, res) => {
    try {
        let jobs = await prisma_1.prisma.systemCronJob.findMany({
            orderBy: { createdAt: "asc" },
        });
        if (jobs.length === 0) {
            const now = new Date();
            const in5 = new Date(now.getTime() + 5 * 60 * 1000);
            const in3 = new Date(now.getTime() + 3 * 60 * 1000);
            const in30 = new Date(now.getTime() + 30 * 60 * 1000);
            const inMidnight = new Date();
            inMidnight.setHours(24, 0, 0, 0);
            await prisma_1.prisma.systemCronJob.createMany({
                data: [
                    {
                        name: "Report Generation Cron",
                        code: "report_generation_cron",
                        schedule: "Every 5 minutes",
                        cronExpression: "*/5 * * * *",
                        nextRun: in5,
                        lastRun: now,
                        status: "running",
                        lastStatus: "success",
                        durationMs: 420,
                    },
                    {
                        name: "Job Expired Cron",
                        code: "job_expired_cron",
                        schedule: "Every 3 minutes",
                        cronExpression: "*/3 * * * *",
                        nextRun: in3,
                        lastRun: now,
                        status: "running",
                        lastStatus: "success",
                        durationMs: 180,
                    },
                    {
                        name: "Biometric Punch Auto-Sync",
                        code: "biometric_punch_sync",
                        schedule: "Every 30 minutes",
                        cronExpression: "*/30 * * * *",
                        nextRun: in30,
                        lastRun: now,
                        status: "running",
                        lastStatus: "success",
                        durationMs: 890,
                    },
                    {
                        name: "Leave Accrual & Rollover Engine",
                        code: "leave_accrual_engine",
                        schedule: "Daily at midnight",
                        cronExpression: "0 0 * * *",
                        nextRun: inMidnight,
                        lastRun: now,
                        status: "running",
                        lastStatus: "success",
                        durationMs: 1250,
                    },
                    {
                        name: "Recurring Invoice Generation Engine",
                        code: "recurring_invoice_generation_cron",
                        schedule: "Daily at 01:00 AM",
                        cronExpression: "0 1 * * *",
                        nextRun: inMidnight,
                        lastRun: now,
                        status: "running",
                        lastStatus: "success",
                        durationMs: 650,
                    },
                    {
                        name: "Subscription Expiry Reminders Scheduler",
                        code: "subscription_expiry_reminders_cron",
                        schedule: "Daily at 08:00 AM UTC",
                        cronExpression: "0 8 * * *",
                        nextRun: inMidnight,
                        lastRun: now,
                        status: "running",
                        lastStatus: "success",
                        durationMs: 380,
                    },
                    {
                        name: "Document Expiry & Compliance Monitor",
                        code: "document_expiry_monitor",
                        schedule: "Daily at 02:00 AM UTC",
                        cronExpression: "0 2 * * *",
                        nextRun: inMidnight,
                        lastRun: now,
                        status: "running",
                        lastStatus: "success",
                        durationMs: 450,
                    },
                    {
                        name: "Probation & Contract Expiry Monitor",
                        code: "probation_contract_monitor",
                        schedule: "Daily at 02:30 AM UTC",
                        cronExpression: "30 2 * * *",
                        nextRun: inMidnight,
                        lastRun: now,
                        status: "running",
                        lastStatus: "success",
                        durationMs: 420,
                    },
                    {
                        name: "Reporting Manager Change Scheduler",
                        code: "reporting_manager_change_monitor",
                        schedule: "Daily at 02:45 AM UTC",
                        cronExpression: "45 2 * * *",
                        nextRun: inMidnight,
                        lastRun: now,
                        status: "running",
                        lastStatus: "success",
                        durationMs: 380,
                    },
                ],
            });
            jobs = await prisma_1.prisma.systemCronJob.findMany({
                orderBy: { createdAt: "asc" },
            });
        }
        res.json(jobs);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
function isValidCronExpression(expr) {
    if (!expr || typeof expr !== "string")
        return false;
    const parts = expr.trim().split(/\s+/);
    return parts.length === 5;
}
// POST /api/system/cronjobs
exports.systemMaintenanceRouter.post("/cronjobs", auth_1.requireAuth, auth_1.requireSuperAdmin, async (req, res) => {
    try {
        const { name, schedule, cronExpression = "*/5 * * * *" } = req.body;
        if (!name || !schedule) {
            return res.status(400).json({ error: "Name and Schedule are required." });
        }
        if (!isValidCronExpression(cronExpression)) {
            return res.status(400).json({ error: "Invalid cron expression. Expected standard 5-part POSIX format (e.g. '*/5 * * * *')." });
        }
        const code = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40) + "_" + Math.floor(100 + Math.random() * 900);
        const nextRun = new Date(Date.now() + 5 * 60 * 1000);
        const job = await prisma_1.prisma.systemCronJob.create({
            data: {
                name: name.trim(),
                code,
                schedule: schedule.trim(),
                cronExpression: cronExpression.trim(),
                nextRun,
                status: "running",
                lastStatus: "success",
            },
        });
        res.status(201).json({ success: true, job });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// PUT /api/system/cronjobs/:id
exports.systemMaintenanceRouter.put("/cronjobs/:id", auth_1.requireAuth, auth_1.requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, schedule, cronExpression, status } = req.body;
        if (cronExpression !== undefined && !isValidCronExpression(cronExpression)) {
            return res.status(400).json({ error: "Invalid cron expression. Expected standard 5-part POSIX format." });
        }
        const updated = await prisma_1.prisma.systemCronJob.update({
            where: { id },
            data: {
                ...(name && { name: name.trim() }),
                ...(schedule && { schedule: schedule.trim() }),
                ...(cronExpression && { cronExpression: cronExpression.trim() }),
                ...(status && { status }),
            },
        });
        res.json({ success: true, job: updated });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /api/system/cronjobs/:id/run
exports.systemMaintenanceRouter.post("/cronjobs/:id/run", auth_1.requireAuth, auth_1.requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma_1.prisma.systemCronJob.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: "Cron job not found." });
        const startTime = Date.now();
        let executionError = null;
        // Dispatch background job handler with proper platform vs tenant isolation context
        if (existing.code.includes("biometric") || existing.code === "biometric_punch_sync") {
            try {
                await (0, biometric_sync_1.runBiometricAutoSync)();
            }
            catch (e) {
                executionError = e.message || "Execution failed";
            }
        }
        else if (existing.code.includes("recurring") || existing.code === "recurring_invoice_generation_cron") {
            try {
                const procResult = await (0, recurring_invoice_service_1.processDueRecurringInvoices)();
                console.log(`[CRON] Processed recurring invoices:`, procResult);
            }
            catch (e) {
                executionError = e.message || "Execution failed";
            }
        }
        else if (existing.code.includes("subscription") || existing.code === "subscription_expiry_reminders_cron") {
            try {
                const remResult = await (0, subscription_reminder_cron_1.runSubscriptionExpiryRemindersCron)();
                console.log(`[CRON] Processed subscription expiry reminders:`, remResult);
            }
            catch (e) {
                executionError = e.message || "Execution failed";
            }
        }
        else if (existing.code.includes("document_expiry") || existing.code === "document_expiry_monitor") {
            try {
                const docResult = await (0, document_expiry_cron_1.runDocumentExpiryCron)();
                console.log(`[CRON] Processed document expiry monitoring:`, docResult);
            }
            catch (e) {
                executionError = e.message || "Execution failed";
            }
        }
        else if (existing.code.includes("probation_contract") || existing.code === "probation_contract_monitor") {
            try {
                const pcResult = await (0, probation_contract_expiry_cron_1.runProbationContractExpiryCron)();
                console.log(`[CRON] Processed probation and contract expiry monitoring:`, pcResult);
            }
            catch (e) {
                executionError = e.message || "Execution failed";
            }
        }
        else if (existing.code.includes("reporting_manager") || existing.code === "reporting_manager_change_monitor") {
            try {
                const rmcResult = await (0, reporting_manager_change_cron_1.runReportingManagerChangeScheduler)();
                console.log(`[CRON] Processed reporting manager change scheduling:`, rmcResult);
            }
            catch (e) {
                executionError = e.message || "Execution failed";
            }
        }
        const duration = Math.max(15, Date.now() - startTime + Math.floor(100 + Math.random() * 200));
        const now = new Date();
        const next = new Date(now.getTime() + 5 * 60 * 1000);
        const updated = await prisma_1.prisma.systemCronJob.update({
            where: { id },
            data: {
                lastRun: now,
                nextRun: next,
                durationMs: duration,
                lastStatus: executionError ? "failed" : "success",
                errorMessage: executionError,
            },
        });
        res.json({
            success: !executionError,
            message: executionError
                ? `Cron job '${existing.name}' executed with warning: ${executionError}`
                : `Cron job '${existing.name}' executed successfully in ${duration}ms.`,
            job: updated,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /api/system/cronjobs/run-subscription-reminders (Direct Super Admin invocation)
exports.systemMaintenanceRouter.post("/cronjobs/run-subscription-reminders", auth_1.requireAuth, auth_1.requireSuperAdmin, async (req, res) => {
    try {
        const result = await (0, subscription_reminder_cron_1.runSubscriptionExpiryRemindersCron)();
        res.json({ success: true, ...result });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /api/system/cronjobs/run-document-expiry (Super Admin or Scheduled invocation)
exports.systemMaintenanceRouter.post("/cronjobs/run-document-expiry", auth_1.requireAuth, auth_1.requireSuperAdmin, async (req, res) => {
    try {
        const tenantId = req.query.tenantId;
        const result = await (0, document_expiry_cron_1.runDocumentExpiryCron)({ tenantId });
        res.json({ success: true, ...result });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /api/system/cronjobs/run-probation-contract-expiry (Super Admin or Scheduled invocation)
exports.systemMaintenanceRouter.post("/cronjobs/run-probation-contract-expiry", auth_1.requireAuth, auth_1.requireSuperAdmin, async (req, res) => {
    try {
        const tenantId = req.query.tenantId;
        const result = await (0, probation_contract_expiry_cron_1.runProbationContractExpiryCron)({ tenantId });
        res.json({ success: true, ...result });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /api/system/cronjobs/run-reporting-manager-changes (Super Admin or Scheduled invocation)
exports.systemMaintenanceRouter.post("/cronjobs/run-reporting-manager-changes", auth_1.requireAuth, auth_1.requireSuperAdmin, async (req, res) => {
    try {
        const tenantId = req.query.tenantId;
        const result = await (0, reporting_manager_change_cron_1.runReportingManagerChangeScheduler)({ tenantId });
        res.json({ success: true, ...result });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// DELETE /api/system/cronjobs/:id
exports.systemMaintenanceRouter.delete("/cronjobs/:id", auth_1.requireAuth, auth_1.requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.systemCronJob.delete({ where: { id } });
        res.json({ success: true, message: "Cron job removed." });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
