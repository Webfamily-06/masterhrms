"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hrProfileChangesRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const employee_change_request_service_1 = require("../services/employee-change-request.service");
const prisma_1 = require("../prisma");
exports.hrProfileChangesRouter = (0, express_1.Router)();
// Apply auth and tenant resolution to all HR change request routes
exports.hrProfileChangesRouter.use(auth_1.requireAuth);
exports.hrProfileChangesRouter.use(tenant_context_middleware_1.resolveTenantContext);
// Guard: Must have HR employee view permissions or HR admin role
const requireHrAccess = (req, res, next) => {
    const isHr = Boolean(req.user?.roles?.includes("hr_admin") ||
        req.user?.roles?.includes("super_admin") ||
        req.user?.roles?.includes("admin") ||
        req.user?.permissions?.includes("hrm.employees.view") ||
        req.user?.permissions?.includes("hrm.employees.manage"));
    if (!isHr) {
        return res.status(403).json({ error: "Access denied. HR employee view permissions required." });
    }
    next();
};
exports.hrProfileChangesRouter.use(requireHrAccess);
/**
 * GET /api/v1/hr/requests/profile-changes/summary
 * Returns KPI counters for requests queue (pending, approved, rejected, etc.)
 */
exports.hrProfileChangesRouter.get("/summary", async (req, res) => {
    const tenantId = req.user.tenantId;
    try {
        const summary = await employee_change_request_service_1.EmployeeChangeRequestService.getHrSummary(tenantId);
        return res.json({ success: true, data: summary });
    }
    catch (err) {
        console.error("[GET /hr/requests/profile-changes/summary] Error:", err?.message || err);
        return res.status(500).json({ error: "Failed to fetch profile requests summary" });
    }
});
/**
 * GET /api/v1/hr/requests/profile-changes
 * Lists tenant-wide profile change requests with search, filtering, and pagination.
 */
exports.hrProfileChangesRouter.get("/", async (req, res) => {
    const tenantId = req.user.tenantId;
    const { status, category, departmentId, search, page, limit } = req.query;
    // Determine if caller has permission to view unmasked sensitive statutory/banking details
    const canViewSensitive = Boolean(req.user?.roles?.includes("super_admin") ||
        req.user?.permissions?.includes("hrm.sensitive.view") ||
        req.user?.permissions?.includes("hr:employee:sensitive:read"));
    try {
        const result = await employee_change_request_service_1.EmployeeChangeRequestService.listHrRequests(tenantId, {
            status: typeof status === "string" ? status : undefined,
            category: typeof category === "string" ? category : undefined,
            departmentId: typeof departmentId === "string" ? departmentId : undefined,
            search: typeof search === "string" ? search : undefined,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            canViewSensitive,
        });
        return res.json({
            success: true,
            data: result.items,
            pagination: {
                total: result.total,
                page: result.page,
                pageSize: result.pageSize,
                totalPages: Math.ceil(result.total / result.pageSize),
            },
        });
    }
    catch (err) {
        console.error("[GET /hr/requests/profile-changes] Error:", err?.message || err);
        return res.status(500).json({ error: "Failed to fetch change requests queue" });
    }
});
/**
 * GET /api/v1/hr/requests/profile-changes/:id
 * Fetches single request detail with employee profile, diff, proof media, and approval history.
 */
exports.hrProfileChangesRouter.get("/:id", async (req, res) => {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const canViewSensitive = Boolean(req.user?.roles?.includes("super_admin") ||
        req.user?.permissions?.includes("hrm.sensitive.view") ||
        req.user?.permissions?.includes("hr:employee:sensitive:read"));
    try {
        const details = await employee_change_request_service_1.EmployeeChangeRequestService.getRequestDetails(tenantId, id, {
            isHrAdmin: true,
            canViewSensitive,
        });
        return res.json({ success: true, data: details });
    }
    catch (err) {
        console.error("[GET /hr/requests/profile-changes/:id] Error:", err?.message || err);
        return res.status(404).json({ error: err?.message || "Change request not found" });
    }
});
/**
 * POST /api/v1/hr/requests/profile-changes/:id/action
 * Approves, rejects, or requests correction on a profile change request.
 */
exports.hrProfileChangesRouter.post("/:id/action", async (req, res) => {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const { id } = req.params;
    const { action, reviewComments, comments } = req.body;
    // Verify caller has HR write/edit permissions
    const hasEditPermission = Boolean(req.user?.roles?.includes("hr_admin") ||
        req.user?.roles?.includes("super_admin") ||
        req.user?.roles?.includes("admin") ||
        req.user?.permissions?.includes("hrm.employees.edit") ||
        req.user?.permissions?.includes("hrm.employees.manage"));
    if (!hasEditPermission) {
        return res.status(403).json({ error: "Permission denied. HR employee edit permissions required to review requests." });
    }
    // Resolve reviewer employee ID if available
    const db = prisma_1.rawPrisma || prisma_1.prisma;
    const reviewerEmployee = await db.employee.findFirst({
        where: { tenantId, userId },
        select: { id: true },
    });
    const canViewSensitive = Boolean(req.user?.roles?.includes("super_admin") ||
        req.user?.permissions?.includes("hrm.sensitive.view") ||
        req.user?.permissions?.includes("hr:employee:sensitive:read"));
    try {
        const result = await employee_change_request_service_1.EmployeeChangeRequestService.processReviewDecision({
            tenantId,
            reviewerUserId: userId,
            reviewerEmployeeId: reviewerEmployee?.id || null,
            isHrAdmin: true,
            requestId: id,
            action,
            reviewComments: reviewComments || comments,
            canViewSensitive,
        });
        return res.json(result);
    }
    catch (err) {
        console.error("[POST /hr/requests/profile-changes/:id/action] Error:", err?.message || err);
        return res.status(400).json({ error: err?.message || "Failed to process review decision" });
    }
});
