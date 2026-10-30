import { Router, Response } from "express";
import { requireAuth, requireSuperAdmin, AuthRequest } from "../middleware/auth";
import { StorageAdminService } from "../services/files/storage-admin.service";
import { StorageReconciliationService } from "../services/files/storage-reconciliation.service";
import { QuotaGovernanceService } from "../services/files/quota-governance.service";

export const superStorageRouter = Router();

/**
 * GET /api/v1/super/storage/overview
 * Platform-wide storage consumption, capacity, quotas, and at-risk tenants.
 */
superStorageRouter.get("/overview", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { search, plan, status, utilization, page, limit } = req.query as any;
    const overview = await StorageAdminService.getPlatformOverview({
      search,
      plan,
      status,
      utilization,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    return res.json(overview);
  } catch (err: any) {
    console.error("[Super Storage Overview Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to retrieve platform storage overview." });
  }
});

/**
 * GET /api/v1/super/storage/tenants
 * Searchable, filterable list of tenants and their storage usage.
 */
superStorageRouter.get("/tenants", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { search, plan, status, utilization, page, limit } = req.query as any;
    const overview = await StorageAdminService.getPlatformOverview({
      search,
      plan,
      status,
      utilization,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    return res.json({
      tenants: overview.tenants,
      pagination: overview.pagination,
      platform: overview.platform,
    });
  } catch (err: any) {
    console.error("[Super Storage Tenants Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to retrieve tenant storage list." });
  }
});

/**
 * GET /api/v1/super/storage/tenants/:id
 * Deep storage inspection for a single tenant (metadata & usage only, no unrestricted file access).
 */
superStorageRouter.get("/tenants/:id", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const summary = await StorageAdminService.getTenantStorageSummary(id);
    return res.json(summary);
  } catch (err: any) {
    console.error("[Super Storage Tenant Detail Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to inspect tenant storage." });
  }
});

/**
 * GET /api/v1/super/storage/tenants/:id/quota
 * Inspect tenant quota governance and child allocations.
 */
superStorageRouter.get("/tenants/:id/quota", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const summary = await QuotaGovernanceService.getTenantQuotaGovernanceSummary(id);
    return res.json(summary);
  } catch (err: any) {
    console.error("[Super Storage Tenant Quota Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to inspect tenant quota." });
  }
});

/**
 * PUT /api/v1/super/storage/tenants/:id/quota
 * Set or override tenant storage quota.
 */
superStorageRouter.put("/tenants/:id/quota", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { quotaBytes } = req.body;
    if (!quotaBytes || Number(quotaBytes) <= 0) {
      return res.status(400).json({ error: "Valid quotaBytes required." });
    }
    const actorId = req.user?.id || req.user?.userId;
    const updated = await QuotaGovernanceService.setTenantQuotaOverride(id, BigInt(quotaBytes), actorId);
    return res.json({
      success: true,
      quota: {
        tenantId: updated.tenantId,
        quotaBytes: Number(updated.quotaBytes),
        formattedQuota: updated.formattedQuota,
        source: updated.source,
      },
    });
  } catch (err: any) {
    console.error("[Super Storage Tenant Quota Override Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to override tenant quota." });
  }
});

/**
 * GET /api/v1/super/storage/analytics
 * Fleet-wide growth trends and forecasting.
 */
superStorageRouter.get("/analytics", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const growth = await StorageAdminService.getStorageGrowthAnalytics(null);
    const forecast = await StorageAdminService.calculateCapacityForecast(null);
    return res.json({ growth, forecast });
  } catch (err: any) {
    console.error("[Super Storage Analytics Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to retrieve platform storage analytics." });
  }
});

/**
 * POST /api/v1/super/storage/reconcile
 * Trigger reconciliation for a specific tenant or the entire fleet.
 */
superStorageRouter.post("/reconcile", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, dryRun } = req.body;
    if (tenantId) {
      const result = await StorageReconciliationService.repairTenantStorage(tenantId, {
        dryRun: !!dryRun,
        actorId: req.user?.id || req.user?.userId,
      });
      return res.json(result);
    }

    // Fleet-wide reconciliation with mutual exclusion lock and bounded batching
    const fleetResult = await StorageReconciliationService.reconcileFleet({
      dryRun: dryRun === undefined ? true : !!dryRun,
      batchSize: 25,
      limit: req.body.limit ? Number(req.body.limit) : undefined,
      actorId: req.user?.id || req.user?.userId,
    });

    return res.json(fleetResult);
  } catch (err: any) {
    console.error("[Super Storage Reconcile Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to execute reconciliation." });
  }
});

