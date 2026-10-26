"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activityLogsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const tenant_context_middleware_1 = require("../../middleware/tenant-context.middleware");
const entitlements_1 = require("../../middleware/entitlements");
const activity_logs_service_1 = require("./activity-logs.service");
exports.activityLogsRouter = (0, express_1.Router)();
// Middleware: auth -> tenant resolution -> entitlement check
exports.activityLogsRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, (0, entitlements_1.requireEntitlement)("activity-logs"));
/**
 * GET /api/activity-logs
 * List paginated, filtered activity logs for the current tenant.
 */
exports.activityLogsRouter.get("/", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;
        const query = {
            actorId: req.query.actorId ? String(req.query.actorId) : undefined,
            actorEmail: req.query.actorEmail ? String(req.query.actorEmail) : undefined,
            action: req.query.action ? String(req.query.action) : undefined,
            entityType: req.query.entityType ? String(req.query.entityType) : undefined,
            dateFrom: req.query.dateFrom ? String(req.query.dateFrom) : undefined,
            dateTo: req.query.dateTo ? String(req.query.dateTo) : undefined,
            search: req.query.search ? String(req.query.search) : undefined,
            page: req.query.page ? Number(req.query.page) : undefined,
            limit: req.query.limit ? Number(req.query.limit) : undefined,
        };
        const results = await activity_logs_service_1.ActivityLogsService.listActivityLogs(tenantId, query);
        return res.json({
            ...results,
            logs: results.items,
            pagination: results.pagination,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to retrieve activity logs." });
    }
});
/**
 * GET /api/activity-logs/export & GET /api/activity-logs/export/csv
 * Downloads activity logs as an RFC 4180 CSV file with secrets redacted.
 */
const handleExportCsv = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;
        const query = {
            actorId: req.query.actorId ? String(req.query.actorId) : undefined,
            actorEmail: req.query.actorEmail ? String(req.query.actorEmail) : undefined,
            action: req.query.action ? String(req.query.action) : undefined,
            entityType: req.query.entityType ? String(req.query.entityType) : undefined,
            dateFrom: req.query.dateFrom ? String(req.query.dateFrom) : undefined,
            dateTo: req.query.dateTo ? String(req.query.dateTo) : undefined,
            search: req.query.search ? String(req.query.search) : undefined,
        };
        const csvContent = await activity_logs_service_1.ActivityLogsService.exportActivityLogsCsv(tenantId, query);
        const filename = `activity_logs_${new Date().toISOString().slice(0, 10)}.csv`;
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        return res.send(csvContent);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to export activity logs." });
    }
};
exports.activityLogsRouter.get("/export", handleExportCsv);
exports.activityLogsRouter.get("/export/csv", handleExportCsv);
/**
 * GET /api/activity-logs/:id
 * Retrieve details of a specific activity log entry.
 */
exports.activityLogsRouter.get("/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;
        const { id } = req.params;
        const log = await activity_logs_service_1.ActivityLogsService.getActivityLog(tenantId, id);
        if (!log) {
            return res.status(404).json({ error: "Activity log entry not found." });
        }
        return res.json(log);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to retrieve activity log entry." });
    }
});
