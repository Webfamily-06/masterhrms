"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestManagementRouter = void 0;
const express_1 = require("express");
const request_management_service_1 = require("../services/request-management.service");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const prisma_1 = require("../prisma");
exports.requestManagementRouter = (0, express_1.Router)();
exports.requestManagementRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
/**
 * GET /api/service-requests
 * List service requests
 */
exports.requestManagementRouter.get("/", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { employeeId, status, category } = req.query;
        const requests = await request_management_service_1.RequestManagementService.listRequests(tenantId, {
            employeeId: employeeId ? String(employeeId) : undefined,
            status: status,
            category: category,
        });
        return res.json({ requests, total: requests.length });
    }
    catch (err) {
        console.error("[service-requests:list] error:", err);
        return res.status(500).json({ error: err.message || "Failed to load service requests." });
    }
});
/**
 * POST /api/service-requests
 * Submit service request
 */
exports.requestManagementRouter.post("/", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        let employeeId = req.body.employeeId || req.user?.employeeId;
        let employeeName = req.body.employeeName;
        if (!employeeId && req.user?.userId) {
            const emp = await prisma_1.prisma.employee.findFirst({
                where: { tenantId, userId: req.user.userId },
                select: { id: true, firstName: true, lastName: true },
            });
            if (emp) {
                employeeId = emp.id;
                employeeName = `${emp.firstName} ${emp.lastName}`.trim();
            }
        }
        if (!employeeId) {
            return res.status(400).json({ error: "Employee ID is required." });
        }
        const { category, title, details, priority } = req.body;
        if (!category || !title || !details) {
            return res.status(400).json({ error: "Missing required fields: category, title, details." });
        }
        const request = await request_management_service_1.RequestManagementService.createRequest(tenantId, {
            employeeId,
            employeeName: employeeName || "Employee Requester",
            category,
            title,
            details,
            priority,
        });
        return res.status(201).json({ request });
    }
    catch (err) {
        console.error("[service-requests:create] error:", err);
        return res.status(500).json({ error: err.message || "Failed to create service request." });
    }
});
/**
 * PUT /api/service-requests/:id/review
 * Review / approve / fulfill service request
 */
exports.requestManagementRouter.put("/:id/review", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const reviewer = req.user?.email || "Reviewer Lead";
        const { status, reviewNotes } = req.body;
        if (!status) {
            return res.status(400).json({ error: "Status is required for review." });
        }
        const request = await request_management_service_1.RequestManagementService.reviewRequest(tenantId, req.params.id, status, reviewer, reviewNotes);
        return res.json({ request });
    }
    catch (err) {
        console.error("[service-requests:review] error:", err);
        return res.status(500).json({ error: err.message || "Failed to review service request." });
    }
});
/**
 * DELETE /api/service-requests/:id
 * Delete service request
 */
exports.requestManagementRouter.delete("/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        await request_management_service_1.RequestManagementService.deleteRequest(tenantId, req.params.id);
        return res.json({ success: true, message: "Service request deleted." });
    }
    catch (err) {
        console.error("[service-requests:delete] error:", err);
        return res.status(500).json({ error: err.message || "Failed to delete service request." });
    }
});
