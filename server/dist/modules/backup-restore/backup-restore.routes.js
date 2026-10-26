"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupRestoreRouter = void 0;
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const auth_1 = require("../../middleware/auth");
const tenant_context_middleware_1 = require("../../middleware/tenant-context.middleware");
const entitlements_1 = require("../../middleware/entitlements");
const backup_restore_service_1 = require("./backup-restore.service");
exports.backupRestoreRouter = (0, express_1.Router)();
// Enforce auth -> tenant resolution -> entitlement check
exports.backupRestoreRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, (0, entitlements_1.requireEntitlement)("backup-restore"));
/**
 * POST /api/backup-restore/export & POST /api/backup-restore/backups
 * Triggers a manual tenant-scoped backup snapshot creation.
 */
const handleExportBackup = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;
        const userId = req.user?.userId;
        const bundle = await backup_restore_service_1.BackupRestoreService.createTenantBackup(tenantId, userId, {
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
        });
        return res.status(201).json({
            success: true,
            message: "Workspace backup created successfully.",
            manifest: bundle.manifest,
            backup: bundle.manifest,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to create workspace backup." });
    }
};
exports.backupRestoreRouter.post("/export", handleExportBackup);
exports.backupRestoreRouter.post("/backups", handleExportBackup);
/**
 * GET /api/backup-restore/backups
 * Lists all available backup snapshots for the tenant workspace.
 */
exports.backupRestoreRouter.get("/backups", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;
        const backups = backup_restore_service_1.BackupRestoreService.listTenantBackups(tenantId);
        return res.json({ success: true, backups });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to list workspace backups." });
    }
});
/**
 * GET /api/backup-restore/backups/:id/download
 * Downloads a backup file with strict tenant-scoping.
 */
exports.backupRestoreRouter.get("/backups/:id/download", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;
        const { id } = req.params;
        const filePath = backup_restore_service_1.BackupRestoreService.getTenantBackupFilePath(tenantId, id);
        if (!filePath || !fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ error: "Backup file not found or inaccessible." });
        }
        res.setHeader("Content-Disposition", `attachment; filename="${path_1.default.basename(filePath)}"`);
        res.setHeader("Content-Type", "application/json");
        const stream = fs_1.default.createReadStream(filePath);
        stream.on("error", (err) => {
            if (!res.headersSent) {
                res.status(500).json({ error: err.message });
            }
        });
        return stream.pipe(res);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to download backup." });
    }
});
/**
 * DELETE /api/backup-restore/backups/:id
 * Deletes a backup snapshot for the current tenant.
 */
exports.backupRestoreRouter.delete("/backups/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;
        const userId = req.user?.userId;
        const { id } = req.params;
        const success = await backup_restore_service_1.BackupRestoreService.deleteTenantBackup(tenantId, id, userId, {
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
        });
        if (!success) {
            return res.status(404).json({ error: "Backup file not found or could not be removed." });
        }
        return res.json({ success: true, message: "Backup deleted successfully." });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to delete backup." });
    }
});
/**
 * POST /api/backup-restore/validate
 * Validates integrity and compatibility of a backup snapshot.
 */
exports.backupRestoreRouter.post("/validate", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;
        const { backupId, bundle } = req.body;
        const result = backup_restore_service_1.BackupRestoreService.validateBackupBundle(tenantId, bundle || backupId);
        if (!result.valid) {
            return res.status(400).json({ valid: false, error: result.error });
        }
        return res.json({
            valid: true,
            manifest: result.bundle?.manifest,
            message: "Backup bundle is valid, untampered, and compatible with this workspace.",
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to validate backup bundle." });
    }
});
/**
 * POST /api/backup-restore/dry-run & POST /api/backup-restore/restore/dry-run
 * Simulates restore operation and outputs a safety impact report.
 */
const handleDryRun = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;
        const { backupId, bundle } = req.body;
        const report = await backup_restore_service_1.BackupRestoreService.dryRunRestore(tenantId, bundle || backupId);
        return res.json({ report, ...report });
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Dry run simulation failed." });
    }
};
exports.backupRestoreRouter.post("/dry-run", handleDryRun);
exports.backupRestoreRouter.post("/restore/dry-run", handleDryRun);
/**
 * POST /api/backup-restore/restore
 * Executes guarded restore into the same workspace with typed confirmation.
 */
exports.backupRestoreRouter.post("/restore", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;
        const userId = req.user?.userId;
        const { backupId, bundle, confirmationPhrase } = req.body;
        if (!confirmationPhrase) {
            return res.status(400).json({
                error: "Confirmation phrase is required to execute workspace restore.",
            });
        }
        const result = await backup_restore_service_1.BackupRestoreService.restoreTenantBackup(tenantId, bundle || backupId, confirmationPhrase, userId, {
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
        });
        return res.json(result);
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to execute restore." });
    }
});
/**
 * GET /api/backup-restore/policy
 * Get backup retention and schedule policy.
 */
exports.backupRestoreRouter.get("/policy", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;
        const policy = await backup_restore_service_1.BackupRestoreService.getBackupPolicy(tenantId);
        return res.json(policy);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to get backup policy." });
    }
});
/**
 * PUT /api/backup-restore/policy
 * Update backup retention and schedule policy.
 */
exports.backupRestoreRouter.put("/policy", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;
        const userId = req.user?.userId;
        const updated = await backup_restore_service_1.BackupRestoreService.updateBackupPolicy(tenantId, req.body, userId);
        return res.json(updated);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to update backup policy." });
    }
});
