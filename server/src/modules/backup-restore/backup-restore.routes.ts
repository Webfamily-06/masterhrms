import { Router, Response } from "express";
import fs from "fs";
import path from "path";
import { requireAuth, AuthRequest } from "../../middleware/auth";
import { resolveTenantContext } from "../../middleware/tenant-context.middleware";
import { requireEntitlement } from "../../middleware/entitlements";
import { BackupRestoreService } from "./backup-restore.service";

export const backupRestoreRouter = Router();

// Enforce auth -> tenant resolution -> entitlement check
backupRestoreRouter.use(requireAuth, resolveTenantContext, requireEntitlement("backup-restore"));

/**
 * POST /api/backup-restore/export & POST /api/backup-restore/backups
 * Triggers a manual tenant-scoped backup snapshot creation.
 */
const handleExportBackup = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const userId = req.user?.userId;

    const bundle = await BackupRestoreService.createTenantBackup(tenantId, userId, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(201).json({
      success: true,
      message: "Workspace backup created successfully.",
      manifest: bundle.manifest,
      backup: bundle.manifest,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create workspace backup." });
  }
};

backupRestoreRouter.post("/export", handleExportBackup);
backupRestoreRouter.post("/backups", handleExportBackup);

/**
 * GET /api/backup-restore/backups
 * Lists all available backup snapshots for the tenant workspace.
 */
backupRestoreRouter.get("/backups", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const backups = BackupRestoreService.listTenantBackups(tenantId);
    return res.json({ success: true, backups });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list workspace backups." });
  }
});

/**
 * GET /api/backup-restore/backups/:id/download
 * Downloads a backup file with strict tenant-scoping.
 */
backupRestoreRouter.get("/backups/:id/download", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const { id } = req.params;

    const filePath = BackupRestoreService.getTenantBackupFilePath(tenantId, id);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Backup file not found or inaccessible." });
    }

    res.setHeader("Content-Disposition", `attachment; filename="${path.basename(filePath)}"`);
    res.setHeader("Content-Type", "application/json");

    const stream = fs.createReadStream(filePath);
    stream.on("error", (err) => {
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    });
    return stream.pipe(res);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to download backup." });
  }
});

/**
 * DELETE /api/backup-restore/backups/:id
 * Deletes a backup snapshot for the current tenant.
 */
backupRestoreRouter.delete("/backups/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const userId = req.user?.userId;
    const { id } = req.params;

    const success = await BackupRestoreService.deleteTenantBackup(tenantId, id, userId, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    if (!success) {
      return res.status(404).json({ error: "Backup file not found or could not be removed." });
    }

    return res.json({ success: true, message: "Backup deleted successfully." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete backup." });
  }
});

/**
 * POST /api/backup-restore/validate
 * Validates integrity and compatibility of a backup snapshot.
 */
backupRestoreRouter.post("/validate", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const { backupId, bundle } = req.body;

    const result = BackupRestoreService.validateBackupBundle(tenantId, bundle || backupId);
    if (!result.valid) {
      return res.status(400).json({ valid: false, error: result.error });
    }

    return res.json({
      valid: true,
      manifest: result.bundle?.manifest,
      message: "Backup bundle is valid, untampered, and compatible with this workspace.",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to validate backup bundle." });
  }
});

/**
 * POST /api/backup-restore/dry-run & POST /api/backup-restore/restore/dry-run
 * Simulates restore operation and outputs a safety impact report.
 */
const handleDryRun = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const { backupId, bundle } = req.body;

    const report = await BackupRestoreService.dryRunRestore(tenantId, bundle || backupId);
    return res.json({ report, ...report });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Dry run simulation failed." });
  }
};

backupRestoreRouter.post("/dry-run", handleDryRun);
backupRestoreRouter.post("/restore/dry-run", handleDryRun);

/**
 * POST /api/backup-restore/restore
 * Executes guarded restore into the same workspace with typed confirmation.
 */
backupRestoreRouter.post("/restore", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const userId = req.user?.userId;
    const { backupId, bundle, confirmationPhrase } = req.body;

    if (!confirmationPhrase) {
      return res.status(400).json({
        error: "Confirmation phrase is required to execute workspace restore.",
      });
    }

    const result = await BackupRestoreService.restoreTenantBackup(
      tenantId,
      bundle || backupId,
      confirmationPhrase,
      userId,
      {
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      }
    );

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to execute restore." });
  }
});

/**
 * GET /api/backup-restore/policy
 * Get backup retention and schedule policy.
 */
backupRestoreRouter.get("/policy", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const policy = await BackupRestoreService.getBackupPolicy(tenantId);
    return res.json(policy);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to get backup policy." });
  }
});

/**
 * PUT /api/backup-restore/policy
 * Update backup retention and schedule policy.
 */
backupRestoreRouter.put("/policy", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const userId = req.user?.userId;
    const updated = await BackupRestoreService.updateBackupPolicy(tenantId, req.body, userId);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update backup policy." });
  }
});
