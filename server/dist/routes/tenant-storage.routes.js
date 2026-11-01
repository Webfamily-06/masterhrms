"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantStorageRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const storage_admin_service_1 = require("../services/files/storage-admin.service");
const storage_reconciliation_service_1 = require("../services/files/storage-reconciliation.service");
const storage_usage_engine_1 = require("../services/files/storage-usage.engine");
const quota_governance_service_1 = require("../services/files/quota-governance.service");
const storage_forecast_service_1 = require("../services/files/storage-forecast.service");
const storage_retention_service_1 = require("../services/files/storage-retention.service");
const prisma_1 = require("../prisma");
const prisma = prisma_1.rawPrisma || prisma_1.prisma;
exports.tenantStorageRouter = (0, express_1.Router)();
function getTenantContext(req) {
    const isSuper = req.user?.roles?.includes("super_admin") || false;
    let tenantId = null;
    if (isSuper && req.query.tenantId) {
        tenantId = String(req.query.tenantId);
    }
    else {
        tenantId = req.user?.tenantId || null;
    }
    const userId = req.user?.userId || req.user?.id;
    const userRoles = req.user?.roles || (req.user?.workspaceRole ? [req.user.workspaceRole] : []);
    const isAdmin = isSuper ||
        userRoles.some((r) => ["admin", "tenantadmin", "tenant_admin", "workspaceadmin", "owner", "super_admin", "hr_admin"].includes(r.toLowerCase()));
    return { isSuper, isAdmin, tenantId, userId, userRoles };
}
/**
 * GET /api/v1/tenant/storage/summary
 * Multi-dimensional tenant storage summary against plan quota.
 */
exports.tenantStorageRouter.get("/summary", auth_1.requireAuth, async (req, res) => {
    try {
        const { tenantId, isAdmin } = getTenantContext(req);
        if (!tenantId) {
            return res.status(400).json({ error: "Tenant context is required." });
        }
        if (!isAdmin) {
            return res.status(403).json({ error: "Storage administration requires administrator privileges." });
        }
        const summary = await storage_admin_service_1.StorageAdminService.getTenantStorageSummary(tenantId);
        return res.json(summary);
    }
    catch (err) {
        console.error("[Tenant Storage Summary Error]:", err);
        return res.status(500).json({ error: err.message || "Failed to retrieve tenant storage summary." });
    }
});
/**
 * GET /api/v1/tenant/storage/breakdown
 * File category, MIME type, and format distribution.
 */
exports.tenantStorageRouter.get("/breakdown", auth_1.requireAuth, async (req, res) => {
    try {
        const { tenantId, isAdmin } = getTenantContext(req);
        if (!tenantId) {
            return res.status(400).json({ error: "Tenant context is required." });
        }
        if (!isAdmin) {
            return res.status(403).json({ error: "Storage administration requires administrator privileges." });
        }
        const summary = await storage_admin_service_1.StorageAdminService.getTenantStorageSummary(tenantId);
        return res.json({
            categories: summary.categories,
            activeBytes: summary.usage.activeBytes,
            fileCount: summary.usage.fileCount,
        });
    }
    catch (err) {
        console.error("[Tenant Storage Breakdown Error]:", err);
        return res.status(500).json({ error: err.message || "Failed to retrieve storage breakdown." });
    }
});
/**
 * GET /api/v1/tenant/storage/analytics
 * Real growth snapshots and forward runway forecasting.
 */
exports.tenantStorageRouter.get("/analytics", auth_1.requireAuth, async (req, res) => {
    try {
        const { tenantId, isAdmin } = getTenantContext(req);
        if (!tenantId) {
            return res.status(400).json({ error: "Tenant context is required." });
        }
        if (!isAdmin) {
            return res.status(403).json({ error: "Storage administration requires administrator privileges." });
        }
        const lookbackDays = req.query.lookbackDays ? Number(req.query.lookbackDays) : 30;
        const growth = await storage_forecast_service_1.StorageForecastService.getTenantGrowthHistory(tenantId, { lookbackDays });
        const forecast = growth.forecast;
        return res.json({ growth, forecast });
    }
    catch (err) {
        console.error("[Tenant Storage Analytics Error]:", err);
        return res.status(500).json({ error: err.message || "Failed to retrieve growth analytics." });
    }
});
/**
 * GET /api/v1/tenant/storage/users
 * User consumption leaderboard within tenant.
 */
exports.tenantStorageRouter.get("/users", auth_1.requireAuth, async (req, res) => {
    try {
        const { tenantId, isAdmin } = getTenantContext(req);
        if (!tenantId) {
            return res.status(400).json({ error: "Tenant context is required." });
        }
        if (!isAdmin) {
            return res.status(403).json({ error: "Storage administration requires administrator privileges." });
        }
        const summary = await storage_admin_service_1.StorageAdminService.getTenantStorageSummary(tenantId);
        return res.json({ users: summary.topUsers });
    }
    catch (err) {
        console.error("[Tenant Storage Users Error]:", err);
        return res.status(500).json({ error: err.message || "Failed to retrieve user storage leaderboard." });
    }
});
/**
 * GET /api/v1/tenant/storage/teams
 * Team shared folders storage distribution.
 */
exports.tenantStorageRouter.get("/teams", auth_1.requireAuth, async (req, res) => {
    try {
        const { tenantId, isAdmin } = getTenantContext(req);
        if (!tenantId) {
            return res.status(400).json({ error: "Tenant context is required." });
        }
        if (!isAdmin) {
            return res.status(403).json({ error: "Storage administration requires administrator privileges." });
        }
        const summary = await storage_admin_service_1.StorageAdminService.getTenantStorageSummary(tenantId);
        return res.json({ teams: summary.teams });
    }
    catch (err) {
        console.error("[Tenant Storage Teams Error]:", err);
        return res.status(500).json({ error: err.message || "Failed to retrieve team storage distribution." });
    }
});
/**
 * GET /api/v1/tenant/storage/departments
 * Department storage breakdown calculated by Storage Usage Calculation Engine (SUCE).
 */
exports.tenantStorageRouter.get("/departments", auth_1.requireAuth, async (req, res) => {
    try {
        const { tenantId, isAdmin } = getTenantContext(req);
        if (!tenantId) {
            return res.status(400).json({ error: "Tenant context is required." });
        }
        if (!isAdmin) {
            return res.status(403).json({ error: "Storage administration requires administrator privileges." });
        }
        const breakdown = await storage_usage_engine_1.StorageUsageEngine.calculateDepartmentBreakdown(tenantId);
        return res.json(breakdown);
    }
    catch (err) {
        console.error("[Tenant Storage Departments Error]:", err);
        return res.status(500).json({ error: err.message || "Failed to retrieve department storage breakdown." });
    }
});
/**
 * GET /api/v1/tenant/storage/maintenance/status
 * Read-only storage audit and drift report.
 */
exports.tenantStorageRouter.get("/maintenance/status", auth_1.requireAuth, async (req, res) => {
    try {
        const { tenantId, isAdmin } = getTenantContext(req);
        if (!tenantId) {
            return res.status(400).json({ error: "Tenant context is required." });
        }
        if (!isAdmin) {
            return res.status(403).json({ error: "Storage administration requires administrator privileges." });
        }
        const report = await storage_reconciliation_service_1.StorageReconciliationService.auditTenantStorage(tenantId);
        return res.json(report);
    }
    catch (err) {
        console.error("[Tenant Storage Maintenance Status Error]:", err);
        return res.status(500).json({ error: err.message || "Failed to retrieve maintenance status." });
    }
});
/**
 * POST /api/v1/tenant/storage/maintenance/reconcile
 * Trigger tenant storage audit and safe transactional self-healing.
 */
exports.tenantStorageRouter.post(["/maintenance/reconcile", "/reconcile"], auth_1.requireAuth, async (req, res) => {
    try {
        const { tenantId, isAdmin, userId } = getTenantContext(req);
        if (!tenantId) {
            return res.status(400).json({ error: "Tenant context is required." });
        }
        if (!isAdmin) {
            return res.status(403).json({ error: "Storage administration requires administrator privileges." });
        }
        const { dryRun } = req.body;
        const result = await storage_reconciliation_service_1.StorageReconciliationService.repairTenantStorage(tenantId, {
            dryRun: dryRun === undefined ? true : !!dryRun,
            actorId: userId,
        });
        return res.json(result);
    }
    catch (err) {
        console.error("[Tenant Storage Reconcile Error]:", err);
        return res.status(500).json({ error: err.message || "Failed to execute storage reconciliation." });
    }
});
/**
 * GET /api/v1/tenant/storage/quotas
 * Comprehensive quota governance summary (Tenant, Departments, Teams, Users, Alerts).
 */
exports.tenantStorageRouter.get("/quotas", auth_1.requireAuth, async (req, res) => {
    try {
        const { tenantId, isAdmin } = getTenantContext(req);
        if (!tenantId) {
            return res.status(400).json({ error: "Tenant context is required." });
        }
        if (!isAdmin) {
            return res.status(403).json({ error: "Storage administration requires administrator privileges." });
        }
        const summary = await quota_governance_service_1.QuotaGovernanceService.getTenantQuotaGovernanceSummary(tenantId);
        return res.json(summary);
    }
    catch (err) {
        console.error("[Tenant Quota Governance Summary Error]:", err);
        return res.status(500).json({ error: err.message || "Failed to retrieve quota governance summary." });
    }
});
/**
 * PUT /api/v1/tenant/storage/quotas/teams/:teamId
 * Set team folder quota allocation with oversubscription validation.
 */
exports.tenantStorageRouter.put("/quotas/teams/:teamId", auth_1.requireAuth, async (req, res) => {
    try {
        const { tenantId, isAdmin } = getTenantContext(req);
        if (!tenantId) {
            return res.status(400).json({ error: "Tenant context is required." });
        }
        if (!isAdmin) {
            return res.status(403).json({ error: "Storage administration requires administrator privileges." });
        }
        const { teamId } = req.params;
        const { quotaBytes } = req.body;
        if (quotaBytes === undefined || Number(quotaBytes) < 0) {
            return res.status(400).json({ error: "Valid quotaBytes required." });
        }
        const result = await quota_governance_service_1.QuotaGovernanceService.setTeamQuota(tenantId, teamId, BigInt(quotaBytes));
        return res.json({ success: true, ...result });
    }
    catch (err) {
        console.error("[Tenant Team Quota Allocation Error]:", err);
        const status = err.message && err.message.includes("exceed") ? 400 : 500;
        return res.status(status).json({ error: err.message || "Failed to set team quota." });
    }
});
/**
 * PUT /api/v1/tenant/storage/quotas/departments/:departmentId
 * Set department quota allocation with oversubscription validation.
 */
exports.tenantStorageRouter.put("/quotas/departments/:departmentId", auth_1.requireAuth, async (req, res) => {
    try {
        const { tenantId, isAdmin } = getTenantContext(req);
        if (!tenantId) {
            return res.status(400).json({ error: "Tenant context is required." });
        }
        if (!isAdmin) {
            return res.status(403).json({ error: "Storage administration requires administrator privileges." });
        }
        const { departmentId } = req.params;
        const { quotaBytes } = req.body;
        if (quotaBytes === undefined || Number(quotaBytes) < 0) {
            return res.status(400).json({ error: "Valid quotaBytes required." });
        }
        const result = await quota_governance_service_1.QuotaGovernanceService.setDepartmentQuota(tenantId, departmentId, BigInt(quotaBytes));
        return res.json({ success: true, ...result });
    }
    catch (err) {
        console.error("[Tenant Department Quota Allocation Error]:", err);
        const status = err.message && err.message.includes("exceed") ? 400 : 500;
        return res.status(status).json({ error: err.message || "Failed to set department quota." });
    }
});
/**
 * PUT /api/v1/tenant/storage/quotas/users/:targetUserId
 * Custom user quota override with validation against tenant quota limit.
 */
exports.tenantStorageRouter.put("/quotas/users/:targetUserId", auth_1.requireAuth, async (req, res) => {
    try {
        const { tenantId, isAdmin, userId } = getTenantContext(req);
        if (!tenantId) {
            return res.status(400).json({ error: "Tenant context is required." });
        }
        if (!isAdmin) {
            return res.status(403).json({ error: "Storage administration requires administrator privileges." });
        }
        const { targetUserId } = req.params;
        const { quotaBytes } = req.body;
        if (!quotaBytes || Number(quotaBytes) <= 0) {
            return res.status(400).json({ error: "Valid quotaBytes required." });
        }
        const updated = await quota_governance_service_1.QuotaGovernanceService.setUserQuota(tenantId, targetUserId, BigInt(quotaBytes), userId);
        return res.json({
            success: true,
            quota: {
                userId: updated.userId,
                quotaBytes: Number(updated.quotaBytes),
                formattedQuota: updated.formattedQuota,
                source: updated.source,
            },
        });
    }
    catch (err) {
        console.error("[Tenant Storage Quota Override Error]:", err);
        const status = err.message && err.message.includes("exceed") ? 400 : 500;
        return res.status(status).json({ error: err.message || "Failed to update user quota." });
    }
});
/**
 * GET /api/v1/tenant/storage/activity
 * Real-time storage audit events and file activity timeline.
 */
exports.tenantStorageRouter.get("/activity", auth_1.requireAuth, async (req, res) => {
    try {
        const { tenantId, isAdmin } = getTenantContext(req);
        if (!tenantId) {
            return res.status(400).json({ error: "Tenant context is required." });
        }
        if (!isAdmin) {
            return res.status(403).json({ error: "Storage administration requires administrator privileges." });
        }
        const limit = req.query.limit ? Number(req.query.limit) : 25;
        const activities = await storage_admin_service_1.StorageAdminService.getStorageActivity(tenantId, limit);
        return res.json({ activities, data: activities });
    }
    catch (err) {
        console.error("[Tenant Storage Activity Error]:", err);
        return res.status(500).json({ error: err.message || "Failed to retrieve storage activity." });
    }
});
/**
 * GET /api/v1/tenant/storage/dashboard
 * Aggregated tenant dashboard endpoint returning summary, quotas, departments, teams, and activity in one call.
 */
exports.tenantStorageRouter.get("/dashboard", auth_1.requireAuth, async (req, res) => {
    try {
        const { tenantId, isAdmin } = getTenantContext(req);
        if (!tenantId) {
            return res.status(400).json({ error: "Tenant context is required." });
        }
        if (!isAdmin) {
            return res.status(403).json({ error: "Storage administration requires administrator privileges." });
        }
        const [summary, departments, activities] = await Promise.all([
            storage_admin_service_1.StorageAdminService.getTenantStorageSummary(tenantId),
            storage_usage_engine_1.StorageUsageEngine.calculateDepartmentBreakdown(tenantId),
            storage_admin_service_1.StorageAdminService.getStorageActivity(tenantId, 15),
        ]);
        return res.json({
            summary,
            departments,
            activities,
        });
    }
    catch (err) {
        console.error("[Tenant Storage Dashboard Error]:", err);
        return res.status(500).json({ error: err.message || "Failed to retrieve storage dashboard." });
    }
});
/**
 * GET /api/v1/tenant/storage/retention/policy
 * Get active retention policy for tenant
 */
exports.tenantStorageRouter.get("/retention/policy", auth_1.requireAuth, async (req, res) => {
    try {
        const { tenantId, isAdmin } = getTenantContext(req);
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        if (!isAdmin)
            return res.status(403).json({ error: "Storage administration requires administrator privileges." });
        const policy = await storage_retention_service_1.StorageRetentionService.getTenantPolicy(tenantId);
        return res.json(policy);
    }
    catch (err) {
        console.error("[Tenant Retention Policy Error]:", err);
        return res.status(500).json({ error: err.message || "Failed to retrieve retention policy." });
    }
});
/**
 * PUT /api/v1/tenant/storage/retention/policy
 * Update or configure tenant retention policy
 */
exports.tenantStorageRouter.put("/retention/policy", auth_1.requireAuth, async (req, res) => {
    try {
        const { tenantId, isAdmin, userId } = getTenantContext(req);
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        if (!isAdmin)
            return res.status(403).json({ error: "Storage administration requires administrator privileges." });
        const policy = await storage_retention_service_1.StorageRetentionService.upsertTenantPolicy(tenantId, req.body, userId);
        return res.json({ success: true, policy });
    }
    catch (err) {
        console.error("[Tenant Update Retention Policy Error]:", err);
        return res.status(400).json({ error: err.message || "Failed to update retention policy." });
    }
});
/**
 * POST /api/v1/tenant/storage/retention/preview
 * Generate dry-run candidate preview
 */
exports.tenantStorageRouter.post("/retention/preview", auth_1.requireAuth, async (req, res) => {
    try {
        const { tenantId, isAdmin, userId } = getTenantContext(req);
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        if (!isAdmin)
            return res.status(403).json({ error: "Storage administration requires administrator privileges." });
        const preview = await storage_retention_service_1.StorageRetentionService.createDryRunPreview(tenantId, userId);
        return res.json(preview);
    }
    catch (err) {
        console.error("[Tenant Retention Preview Error]:", err);
        return res.status(500).json({ error: err.message || "Failed to generate retention preview." });
    }
});
/**
 * POST /api/v1/tenant/storage/retention/execute
 * Execute permanent retention cleanup (or dry-run)
 */
exports.tenantStorageRouter.post("/retention/execute", auth_1.requireAuth, async (req, res) => {
    try {
        const { tenantId, isAdmin, userId } = getTenantContext(req);
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        if (!isAdmin)
            return res.status(403).json({ error: "Storage administration requires administrator privileges." });
        const { jobId, isDryRun, force } = req.body;
        const result = await storage_retention_service_1.StorageRetentionService.executeRetentionJob({
            tenantId,
            jobId,
            actorId: userId,
            isDryRun,
            force,
        });
        return res.json(result);
    }
    catch (err) {
        console.error("[Tenant Retention Execute Error]:", err);
        return res.status(400).json({ error: err.message || "Failed to execute retention cleanup." });
    }
});
/**
 * POST /api/v1/tenant/storage/retention/request-approval
 * Request approval for a retention job
 */
exports.tenantStorageRouter.post("/retention/request-approval", auth_1.requireAuth, async (req, res) => {
    try {
        const { tenantId, isAdmin, userId } = getTenantContext(req);
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        if (!isAdmin)
            return res.status(403).json({ error: "Storage administration requires administrator privileges." });
        const job = await storage_retention_service_1.StorageRetentionService.requestJobApproval(tenantId, userId);
        return res.json({ success: true, job });
    }
    catch (err) {
        console.error("[Tenant Retention Approval Request Error]:", err);
        return res.status(400).json({ error: err.message || "Failed to request job approval." });
    }
});
/**
 * POST /api/v1/tenant/storage/retention/jobs/:jobId/approve
 * Approve a pending retention job
 */
exports.tenantStorageRouter.post("/retention/jobs/:jobId/approve", auth_1.requireAuth, async (req, res) => {
    try {
        const { tenantId, isAdmin, userId } = getTenantContext(req);
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        if (!isAdmin)
            return res.status(403).json({ error: "Storage administration requires administrator privileges." });
        const { jobId } = req.params;
        const job = await storage_retention_service_1.StorageRetentionService.approveJob(tenantId, jobId, userId);
        return res.json({ success: true, job });
    }
    catch (err) {
        console.error("[Tenant Retention Job Approve Error]:", err);
        return res.status(400).json({ error: err.message || "Failed to approve job." });
    }
});
/**
 * POST /api/v1/tenant/storage/retention/jobs/:jobId/reject
 * Reject a pending retention job
 */
exports.tenantStorageRouter.post("/retention/jobs/:jobId/reject", auth_1.requireAuth, async (req, res) => {
    try {
        const { tenantId, isAdmin, userId } = getTenantContext(req);
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        if (!isAdmin)
            return res.status(403).json({ error: "Storage administration requires administrator privileges." });
        const { jobId } = req.params;
        const { reason } = req.body;
        const job = await storage_retention_service_1.StorageRetentionService.rejectJob(tenantId, jobId, reason, userId);
        return res.json({ success: true, job });
    }
    catch (err) {
        console.error("[Tenant Retention Job Reject Error]:", err);
        return res.status(400).json({ error: err.message || "Failed to reject job." });
    }
});
/**
 * GET /api/v1/tenant/storage/retention/history
 * Paginated execution history of retention jobs
 */
exports.tenantStorageRouter.get("/retention/history", auth_1.requireAuth, async (req, res) => {
    try {
        const { tenantId, isAdmin } = getTenantContext(req);
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        if (!isAdmin)
            return res.status(403).json({ error: "Storage administration requires administrator privileges." });
        const page = req.query.page ? Number(req.query.page) : 1;
        const limit = req.query.limit ? Number(req.query.limit) : 20;
        const history = await storage_retention_service_1.StorageRetentionService.listJobs({ tenantId, page, limit });
        return res.json(history);
    }
    catch (err) {
        console.error("[Tenant Retention History Error]:", err);
        return res.status(500).json({ error: err.message || "Failed to retrieve retention history." });
    }
});
/**
 * GET /api/v1/tenant/storage/retention/holds
 * List legal holds for this tenant
 */
exports.tenantStorageRouter.get("/retention/holds", auth_1.requireAuth, async (req, res) => {
    try {
        const { tenantId, isAdmin } = getTenantContext(req);
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        if (!isAdmin)
            return res.status(403).json({ error: "Storage administration requires administrator privileges." });
        const { fileId, activeOnly, page, limit } = req.query;
        const holds = await storage_retention_service_1.StorageRetentionService.listLegalHolds(tenantId, {
            fileId,
            activeOnly: activeOnly === "true" || activeOnly === true,
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 50,
        });
        return res.json(holds);
    }
    catch (err) {
        console.error("[Tenant Legal Holds Error]:", err);
        return res.status(500).json({ error: err.message || "Failed to retrieve legal holds." });
    }
});
/**
 * POST /api/v1/tenant/storage/retention/holds
 * Place a legal hold on a file or version
 */
exports.tenantStorageRouter.post("/retention/holds", auth_1.requireAuth, async (req, res) => {
    try {
        const { tenantId, isAdmin, userId } = getTenantContext(req);
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        if (!isAdmin)
            return res.status(403).json({ error: "Storage administration requires administrator privileges." });
        const { fileId, fileVersionId, reason, holdScope } = req.body;
        if (!fileId || !reason) {
            return res.status(400).json({ error: "Both fileId and reason are required." });
        }
        const hold = await storage_retention_service_1.StorageRetentionService.createLegalHold({
            tenantId,
            fileId,
            fileVersionId,
            reason,
            holdScope,
            actorId: userId,
        });
        return res.json({ success: true, hold });
    }
    catch (err) {
        console.error("[Create Legal Hold Error]:", err);
        const status = err.status || 400;
        return res.status(status).json({ error: err.message || "Failed to create legal hold." });
    }
});
/**
 * POST /api/v1/tenant/storage/retention/holds/:id/release
 * Release an active legal hold
 */
exports.tenantStorageRouter.post("/retention/holds/:id/release", auth_1.requireAuth, async (req, res) => {
    try {
        const { tenantId, isAdmin, userId } = getTenantContext(req);
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        if (!isAdmin)
            return res.status(403).json({ error: "Storage administration requires administrator privileges." });
        const { id } = req.params;
        const { releaseReason } = req.body;
        if (!releaseReason) {
            return res.status(400).json({ error: "releaseReason is required to release a legal hold." });
        }
        const hold = await storage_retention_service_1.StorageRetentionService.releaseLegalHold({
            tenantId,
            holdId: id,
            releaseReason,
            actorId: userId,
        });
        return res.json({ success: true, hold });
    }
    catch (err) {
        console.error("[Release Legal Hold Error]:", err);
        const status = err.status || 400;
        return res.status(status).json({ error: err.message || "Failed to release legal hold." });
    }
});
