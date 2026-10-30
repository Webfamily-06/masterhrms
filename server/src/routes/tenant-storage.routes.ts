import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { StorageAdminService } from "../services/files/storage-admin.service";
import { StorageReconciliationService } from "../services/files/storage-reconciliation.service";
import { StorageUsageEngine } from "../services/files/storage-usage.engine";
import { QuotaGovernanceService } from "../services/files/quota-governance.service";
import { StorageForecastService } from "../services/files/storage-forecast.service";
import { StorageRetentionService } from "../services/files/storage-retention.service";
import { rawPrisma, prisma as proxiedPrisma } from "../prisma";

const prisma = rawPrisma || proxiedPrisma;

export const tenantStorageRouter = Router();

function getTenantContext(req: any) {
  const isSuper = req.user?.roles?.includes("super_admin") || false;
  let tenantId: string | null = null;
  if (isSuper && req.query.tenantId) {
    tenantId = String(req.query.tenantId);
  } else {
    tenantId = req.user?.tenantId || null;
  }
  const userId = req.user?.userId || req.user?.id;
  const userRoles: string[] = req.user?.roles || (req.user?.workspaceRole ? [req.user.workspaceRole] : []);
  const isAdmin =
    isSuper ||
    userRoles.some((r) =>
      ["admin", "tenantadmin", "tenant_admin", "workspaceadmin", "owner", "super_admin", "hr_admin"].includes(r.toLowerCase())
    );
  return { isSuper, isAdmin, tenantId, userId, userRoles };
}

/**
 * GET /api/v1/tenant/storage/summary
 * Multi-dimensional tenant storage summary against plan quota.
 */
tenantStorageRouter.get("/summary", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, isAdmin } = getTenantContext(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context is required." });
    }
    if (!isAdmin) {
      return res.status(403).json({ error: "Storage administration requires administrator privileges." });
    }

    const summary = await StorageAdminService.getTenantStorageSummary(tenantId);
    return res.json(summary);
  } catch (err: any) {
    console.error("[Tenant Storage Summary Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to retrieve tenant storage summary." });
  }
});

/**
 * GET /api/v1/tenant/storage/breakdown
 * File category, MIME type, and format distribution.
 */
tenantStorageRouter.get("/breakdown", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, isAdmin } = getTenantContext(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context is required." });
    }
    if (!isAdmin) {
      return res.status(403).json({ error: "Storage administration requires administrator privileges." });
    }

    const summary = await StorageAdminService.getTenantStorageSummary(tenantId);
    return res.json({
      categories: summary.categories,
      activeBytes: summary.usage.activeBytes,
      fileCount: summary.usage.fileCount,
    });
  } catch (err: any) {
    console.error("[Tenant Storage Breakdown Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to retrieve storage breakdown." });
  }
});

/**
 * GET /api/v1/tenant/storage/analytics
 * Real growth snapshots and forward runway forecasting.
 */
tenantStorageRouter.get("/analytics", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, isAdmin } = getTenantContext(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context is required." });
    }
    if (!isAdmin) {
      return res.status(403).json({ error: "Storage administration requires administrator privileges." });
    }

    const lookbackDays = req.query.lookbackDays ? Number(req.query.lookbackDays) : 30;
    const growth = await StorageForecastService.getTenantGrowthHistory(tenantId, { lookbackDays });
    const forecast = growth.forecast;
    return res.json({ growth, forecast });
  } catch (err: any) {
    console.error("[Tenant Storage Analytics Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to retrieve growth analytics." });
  }
});

/**
 * GET /api/v1/tenant/storage/users
 * User consumption leaderboard within tenant.
 */
tenantStorageRouter.get("/users", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, isAdmin } = getTenantContext(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context is required." });
    }
    if (!isAdmin) {
      return res.status(403).json({ error: "Storage administration requires administrator privileges." });
    }

    const summary = await StorageAdminService.getTenantStorageSummary(tenantId);
    return res.json({ users: summary.topUsers });
  } catch (err: any) {
    console.error("[Tenant Storage Users Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to retrieve user storage leaderboard." });
  }
});

/**
 * GET /api/v1/tenant/storage/teams
 * Team shared folders storage distribution.
 */
tenantStorageRouter.get("/teams", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, isAdmin } = getTenantContext(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context is required." });
    }
    if (!isAdmin) {
      return res.status(403).json({ error: "Storage administration requires administrator privileges." });
    }

    const summary = await StorageAdminService.getTenantStorageSummary(tenantId);
    return res.json({ teams: summary.teams });
  } catch (err: any) {
    console.error("[Tenant Storage Teams Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to retrieve team storage distribution." });
  }
});

/**
 * GET /api/v1/tenant/storage/departments
 * Department storage breakdown calculated by Storage Usage Calculation Engine (SUCE).
 */
tenantStorageRouter.get("/departments", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, isAdmin } = getTenantContext(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context is required." });
    }
    if (!isAdmin) {
      return res.status(403).json({ error: "Storage administration requires administrator privileges." });
    }

    const breakdown = await StorageUsageEngine.calculateDepartmentBreakdown(tenantId);
    return res.json(breakdown);
  } catch (err: any) {
    console.error("[Tenant Storage Departments Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to retrieve department storage breakdown." });
  }
});

/**
 * GET /api/v1/tenant/storage/maintenance/status
 * Read-only storage audit and drift report.
 */
tenantStorageRouter.get("/maintenance/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, isAdmin } = getTenantContext(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context is required." });
    }
    if (!isAdmin) {
      return res.status(403).json({ error: "Storage administration requires administrator privileges." });
    }

    const report = await StorageReconciliationService.auditTenantStorage(tenantId);
    return res.json(report);
  } catch (err: any) {
    console.error("[Tenant Storage Maintenance Status Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to retrieve maintenance status." });
  }
});

/**
 * POST /api/v1/tenant/storage/maintenance/reconcile
 * Trigger tenant storage audit and safe transactional self-healing.
 */
tenantStorageRouter.post(
  ["/maintenance/reconcile", "/reconcile"],
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const { tenantId, isAdmin, userId } = getTenantContext(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context is required." });
      }
      if (!isAdmin) {
        return res.status(403).json({ error: "Storage administration requires administrator privileges." });
      }

      const { dryRun } = req.body;
      const result = await StorageReconciliationService.repairTenantStorage(tenantId, {
        dryRun: dryRun === undefined ? true : !!dryRun,
        actorId: userId,
      });
      return res.json(result);
    } catch (err: any) {
      console.error("[Tenant Storage Reconcile Error]:", err);
      return res.status(500).json({ error: err.message || "Failed to execute storage reconciliation." });
    }
  }
);

/**
 * GET /api/v1/tenant/storage/quotas
 * Comprehensive quota governance summary (Tenant, Departments, Teams, Users, Alerts).
 */
tenantStorageRouter.get("/quotas", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, isAdmin } = getTenantContext(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context is required." });
    }
    if (!isAdmin) {
      return res.status(403).json({ error: "Storage administration requires administrator privileges." });
    }

    const summary = await QuotaGovernanceService.getTenantQuotaGovernanceSummary(tenantId);
    return res.json(summary);
  } catch (err: any) {
    console.error("[Tenant Quota Governance Summary Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to retrieve quota governance summary." });
  }
});

/**
 * PUT /api/v1/tenant/storage/quotas/teams/:teamId
 * Set team folder quota allocation with oversubscription validation.
 */
tenantStorageRouter.put("/quotas/teams/:teamId", requireAuth, async (req: AuthRequest, res: Response) => {
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

    const result = await QuotaGovernanceService.setTeamQuota(tenantId, teamId, BigInt(quotaBytes));
    return res.json({ success: true, ...result });
  } catch (err: any) {
    console.error("[Tenant Team Quota Allocation Error]:", err);
    const status = err.message && err.message.includes("exceed") ? 400 : 500;
    return res.status(status).json({ error: err.message || "Failed to set team quota." });
  }
});

/**
 * PUT /api/v1/tenant/storage/quotas/departments/:departmentId
 * Set department quota allocation with oversubscription validation.
 */
tenantStorageRouter.put("/quotas/departments/:departmentId", requireAuth, async (req: AuthRequest, res: Response) => {
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

    const result = await QuotaGovernanceService.setDepartmentQuota(tenantId, departmentId, BigInt(quotaBytes));
    return res.json({ success: true, ...result });
  } catch (err: any) {
    console.error("[Tenant Department Quota Allocation Error]:", err);
    const status = err.message && err.message.includes("exceed") ? 400 : 500;
    return res.status(status).json({ error: err.message || "Failed to set department quota." });
  }
});

/**
 * PUT /api/v1/tenant/storage/quotas/users/:targetUserId
 * Custom user quota override with validation against tenant quota limit.
 */
tenantStorageRouter.put("/quotas/users/:targetUserId", requireAuth, async (req: AuthRequest, res: Response) => {
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

    const updated = await QuotaGovernanceService.setUserQuota(
      tenantId,
      targetUserId,
      BigInt(quotaBytes),
      userId
    );

    return res.json({
      success: true,
      quota: {
        userId: updated.userId,
        quotaBytes: Number(updated.quotaBytes),
        formattedQuota: updated.formattedQuota,
        source: updated.source,
      },
    });
  } catch (err: any) {
    console.error("[Tenant Storage Quota Override Error]:", err);
    const status = err.message && err.message.includes("exceed") ? 400 : 500;
    return res.status(status).json({ error: err.message || "Failed to update user quota." });
  }
});

/**
 * GET /api/v1/tenant/storage/activity
 * Real-time storage audit events and file activity timeline.
 */
tenantStorageRouter.get("/activity", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, isAdmin } = getTenantContext(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context is required." });
    }
    if (!isAdmin) {
      return res.status(403).json({ error: "Storage administration requires administrator privileges." });
    }

    const limit = req.query.limit ? Number(req.query.limit) : 25;
    const activities = await StorageAdminService.getStorageActivity(tenantId, limit);
    return res.json({ activities, data: activities });
  } catch (err: any) {
    console.error("[Tenant Storage Activity Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to retrieve storage activity." });
  }
});

/**
 * GET /api/v1/tenant/storage/dashboard
 * Aggregated tenant dashboard endpoint returning summary, quotas, departments, teams, and activity in one call.
 */
tenantStorageRouter.get("/dashboard", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, isAdmin } = getTenantContext(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context is required." });
    }
    if (!isAdmin) {
      return res.status(403).json({ error: "Storage administration requires administrator privileges." });
    }

    const [summary, departments, activities] = await Promise.all([
      StorageAdminService.getTenantStorageSummary(tenantId),
      StorageUsageEngine.calculateDepartmentBreakdown(tenantId),
      StorageAdminService.getStorageActivity(tenantId, 15),
    ]);

    return res.json({
      summary,
      departments,
      activities,
    });
  } catch (err: any) {
    console.error("[Tenant Storage Dashboard Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to retrieve storage dashboard." });
  }
});

/**
 * GET /api/v1/tenant/storage/retention/policy
 * Get active retention policy for tenant
 */
tenantStorageRouter.get("/retention/policy", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, isAdmin } = getTenantContext(req);
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });
    if (!isAdmin) return res.status(403).json({ error: "Storage administration requires administrator privileges." });

    const policy = await StorageRetentionService.getTenantPolicy(tenantId);
    return res.json(policy);
  } catch (err: any) {
    console.error("[Tenant Retention Policy Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to retrieve retention policy." });
  }
});

/**
 * PUT /api/v1/tenant/storage/retention/policy
 * Update or configure tenant retention policy
 */
tenantStorageRouter.put("/retention/policy", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, isAdmin, userId } = getTenantContext(req);
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });
    if (!isAdmin) return res.status(403).json({ error: "Storage administration requires administrator privileges." });

    const policy = await StorageRetentionService.upsertTenantPolicy(tenantId, req.body, userId);
    return res.json({ success: true, policy });
  } catch (err: any) {
    console.error("[Tenant Update Retention Policy Error]:", err);
    return res.status(400).json({ error: err.message || "Failed to update retention policy." });
  }
});

/**
 * POST /api/v1/tenant/storage/retention/preview
 * Generate dry-run candidate preview
 */
tenantStorageRouter.post("/retention/preview", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, isAdmin, userId } = getTenantContext(req);
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });
    if (!isAdmin) return res.status(403).json({ error: "Storage administration requires administrator privileges." });

    const preview = await StorageRetentionService.createDryRunPreview(tenantId, userId);
    return res.json(preview);
  } catch (err: any) {
    console.error("[Tenant Retention Preview Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to generate retention preview." });
  }
});

/**
 * POST /api/v1/tenant/storage/retention/execute
 * Execute permanent retention cleanup (or dry-run)
 */
tenantStorageRouter.post("/retention/execute", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, isAdmin, userId } = getTenantContext(req);
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });
    if (!isAdmin) return res.status(403).json({ error: "Storage administration requires administrator privileges." });

    const { jobId, isDryRun, force } = req.body;
    const result = await StorageRetentionService.executeRetentionJob({
      tenantId,
      jobId,
      actorId: userId,
      isDryRun,
      force,
    });
    return res.json(result);
  } catch (err: any) {
    console.error("[Tenant Retention Execute Error]:", err);
    return res.status(400).json({ error: err.message || "Failed to execute retention cleanup." });
  }
});

/**
 * POST /api/v1/tenant/storage/retention/request-approval
 * Request approval for a retention job
 */
tenantStorageRouter.post("/retention/request-approval", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, isAdmin, userId } = getTenantContext(req);
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });
    if (!isAdmin) return res.status(403).json({ error: "Storage administration requires administrator privileges." });

    const job = await StorageRetentionService.requestJobApproval(tenantId, userId);
    return res.json({ success: true, job });
  } catch (err: any) {
    console.error("[Tenant Retention Approval Request Error]:", err);
    return res.status(400).json({ error: err.message || "Failed to request job approval." });
  }
});

/**
 * POST /api/v1/tenant/storage/retention/jobs/:jobId/approve
 * Approve a pending retention job
 */
tenantStorageRouter.post("/retention/jobs/:jobId/approve", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, isAdmin, userId } = getTenantContext(req);
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });
    if (!isAdmin) return res.status(403).json({ error: "Storage administration requires administrator privileges." });

    const { jobId } = req.params;
    const job = await StorageRetentionService.approveJob(tenantId, jobId, userId);
    return res.json({ success: true, job });
  } catch (err: any) {
    console.error("[Tenant Retention Job Approve Error]:", err);
    return res.status(400).json({ error: err.message || "Failed to approve job." });
  }
});

/**
 * POST /api/v1/tenant/storage/retention/jobs/:jobId/reject
 * Reject a pending retention job
 */
tenantStorageRouter.post("/retention/jobs/:jobId/reject", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, isAdmin, userId } = getTenantContext(req);
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });
    if (!isAdmin) return res.status(403).json({ error: "Storage administration requires administrator privileges." });

    const { jobId } = req.params;
    const { reason } = req.body;
    const job = await StorageRetentionService.rejectJob(tenantId, jobId, reason, userId);
    return res.json({ success: true, job });
  } catch (err: any) {
    console.error("[Tenant Retention Job Reject Error]:", err);
    return res.status(400).json({ error: err.message || "Failed to reject job." });
  }
});

/**
 * GET /api/v1/tenant/storage/retention/history
 * Paginated execution history of retention jobs
 */
tenantStorageRouter.get("/retention/history", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, isAdmin } = getTenantContext(req);
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });
    if (!isAdmin) return res.status(403).json({ error: "Storage administration requires administrator privileges." });

    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const history = await StorageRetentionService.listJobs({ tenantId, page, limit });
    return res.json(history);
  } catch (err: any) {
    console.error("[Tenant Retention History Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to retrieve retention history." });
  }
});

/**
 * GET /api/v1/tenant/storage/retention/holds
 * List legal holds for this tenant
 */
tenantStorageRouter.get("/retention/holds", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, isAdmin } = getTenantContext(req);
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });
    if (!isAdmin) return res.status(403).json({ error: "Storage administration requires administrator privileges." });

    const { fileId, activeOnly, page, limit } = req.query as any;
    const holds = await StorageRetentionService.listLegalHolds(tenantId, {
      fileId,
      activeOnly: activeOnly === "true" || activeOnly === true,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    return res.json(holds);
  } catch (err: any) {
    console.error("[Tenant Legal Holds Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to retrieve legal holds." });
  }
});

/**
 * POST /api/v1/tenant/storage/retention/holds
 * Place a legal hold on a file or version
 */
tenantStorageRouter.post("/retention/holds", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, isAdmin, userId } = getTenantContext(req);
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });
    if (!isAdmin) return res.status(403).json({ error: "Storage administration requires administrator privileges." });

    const { fileId, fileVersionId, reason, holdScope } = req.body;
    if (!fileId || !reason) {
      return res.status(400).json({ error: "Both fileId and reason are required." });
    }

    const hold = await StorageRetentionService.createLegalHold({
      tenantId,
      fileId,
      fileVersionId,
      reason,
      holdScope,
      actorId: userId,
    });
    return res.json({ success: true, hold });
  } catch (err: any) {
    console.error("[Create Legal Hold Error]:", err);
    const status = err.status || 400;
    return res.status(status).json({ error: err.message || "Failed to create legal hold." });
  }
});

/**
 * POST /api/v1/tenant/storage/retention/holds/:id/release
 * Release an active legal hold
 */
tenantStorageRouter.post("/retention/holds/:id/release", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, isAdmin, userId } = getTenantContext(req);
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });
    if (!isAdmin) return res.status(403).json({ error: "Storage administration requires administrator privileges." });

    const { id } = req.params;
    const { releaseReason } = req.body;
    if (!releaseReason) {
      return res.status(400).json({ error: "releaseReason is required to release a legal hold." });
    }

    const hold = await StorageRetentionService.releaseLegalHold({
      tenantId,
      holdId: id,
      releaseReason,
      actorId: userId,
    });
    return res.json({ success: true, hold });
  } catch (err: any) {
    console.error("[Release Legal Hold Error]:", err);
    const status = err.status || 400;
    return res.status(status).json({ error: err.message || "Failed to release legal hold." });
  }
});
