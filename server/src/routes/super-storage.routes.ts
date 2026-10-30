import { Router, Response } from "express";
import { requireAuth, requireSuperAdmin, AuthRequest } from "../middleware/auth";
import { StorageAdminService } from "../services/files/storage-admin.service";
import { StorageReconciliationService } from "../services/files/storage-reconciliation.service";
import { QuotaGovernanceService } from "../services/files/quota-governance.service";
import { StorageForecastService } from "../services/files/storage-forecast.service";
import { StorageRetentionService } from "../services/files/storage-retention.service";

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
    const lookbackDays = req.query.lookbackDays ? Number(req.query.lookbackDays) : 30;
    const [growth, forecast, watchlist, anomalies] = await Promise.all([
      StorageForecastService.getFleetGrowthHistory({ lookbackDays }),
      StorageForecastService.calculateFleetForecast({ lookbackDays }),
      StorageForecastService.getExhaustionWatchlist(10),
      StorageForecastService.getStorageAnomalies(10),
    ]);
    return res.json({ growth, forecast, watchlist, anomalies });
  } catch (err: any) {
    console.error("[Super Storage Analytics Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to retrieve platform storage analytics." });
  }
});

/**
 * GET /api/v1/super/storage/analytics/fleet
 * Fleet aggregate capacity forecast with least squares regression
 */
superStorageRouter.get("/analytics/fleet", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const lookbackDays = req.query.lookbackDays ? Number(req.query.lookbackDays) : 30;
    const forecast = await StorageForecastService.calculateFleetForecast({ lookbackDays });
    return res.json(forecast);
  } catch (err: any) {
    console.error("[Super Storage Fleet Forecast Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to calculate fleet forecast." });
  }
});

/**
 * GET /api/v1/super/storage/analytics/growth
 * Fleet historical snapshots + forward projections
 */
superStorageRouter.get("/analytics/growth", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const lookbackDays = req.query.lookbackDays ? Number(req.query.lookbackDays) : 30;
    const growth = await StorageForecastService.getFleetGrowthHistory({ lookbackDays });
    return res.json(growth);
  } catch (err: any) {
    console.error("[Super Storage Fleet Growth Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to retrieve fleet growth history." });
  }
});

/**
 * GET /api/v1/super/storage/analytics/watchlist
 * Tenants approaching quota or capacity exhaustion
 */
superStorageRouter.get("/analytics/watchlist", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const watchlist = await StorageForecastService.getExhaustionWatchlist(limit);
    return res.json({ watchlist });
  } catch (err: any) {
    console.error("[Super Storage Watchlist Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to retrieve exhaustion watchlist." });
  }
});

/**
 * GET /api/v1/super/storage/analytics/anomalies
 * Storage consumption anomalies (spikes, trash bloat, stalled uploads)
 */
superStorageRouter.get("/analytics/anomalies", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const anomalies = await StorageForecastService.getStorageAnomalies(limit);
    return res.json({ anomalies });
  } catch (err: any) {
    console.error("[Super Storage Anomalies Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to retrieve storage anomalies." });
  }
});

/**
 * GET /api/v1/super/storage/analytics/tenants/:id/forecast
 * Deep single-tenant capacity forecast
 */
superStorageRouter.get("/analytics/tenants/:id/forecast", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const lookbackDays = req.query.lookbackDays ? Number(req.query.lookbackDays) : 30;
    const history = await StorageForecastService.getTenantGrowthHistory(id, { lookbackDays });
    const forecast = history.forecast;
    return res.json({ forecast, history });
  } catch (err: any) {
    console.error("[Super Storage Tenant Forecast Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to calculate tenant forecast." });
  }
});

/**
 * POST /api/v1/super/storage/snapshots/capture
 * Explicit trigger for daily snapshot capture (scheduler or manual)
 */
superStorageRouter.post("/snapshots/capture", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await StorageForecastService.captureDailySnapshots();
    return res.json({ success: true, ...result });
  } catch (err: any) {
    console.error("[Super Storage Capture Snapshots Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to capture storage snapshots." });
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

/**
 * GET /api/v1/super/storage/retention/fleet
 * Fleet-wide retention metrics, active policies, and reclaimed storage.
 */
superStorageRouter.get(
  "/retention/fleet",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const summary = await StorageRetentionService.getFleetRetentionSummary();
      return res.json(summary);
    } catch (err: any) {
      console.error("[Super Storage Fleet Retention Error]:", err);
      return res.status(500).json({ error: err.message || "Failed to retrieve fleet retention summary." });
    }
  }
);

/**
 * GET /api/v1/super/storage/retention/history
 * Fleet-wide retention execution history.
 */
superStorageRouter.get(
  "/retention/history",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { tenantId, page: rawPage, limit: rawLimit } = req.query as any;

      let page = 1;
      if (rawPage !== undefined) {
        const parsedPage = parseInt(String(rawPage), 10);
        if (Number.isFinite(parsedPage) && parsedPage > 0) {
          page = parsedPage;
        }
      }

      let limit = 20;
      if (rawLimit !== undefined) {
        const parsedLimit = parseInt(String(rawLimit), 10);
        if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
          limit = Math.min(parsedLimit, 100);
        }
      }

      const history = await StorageRetentionService.listJobs({
        tenantId: tenantId ? String(tenantId) : undefined,
        page,
        limit,
      });
      return res.json(history);
    } catch (err: any) {
      console.error("[Super Storage Retention History Error]:", err);
      return res.status(500).json({ error: err.message || "Failed to retrieve retention history." });
    }
  }
);

/**
 * POST /api/v1/super/storage/retention/execute
 * Super Admin trigger for tenant retention cleanup (or dry-run).
 */
superStorageRouter.post(
  "/retention/execute",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { tenantId, jobId, isDryRun, force } = req.body;
      if (!tenantId) {
        return res.status(400).json({ error: "tenantId is required for retention execution." });
      }

      const result = await StorageRetentionService.executeRetentionJob({
        tenantId,
        jobId: jobId ? String(jobId) : undefined,
        actorId: req.user?.id || req.user?.userId,
        isDryRun,
        force,
      });
      return res.json(result);
    } catch (err: any) {
      console.error("[Super Storage Retention Execute Error]:", err);
      return res.status(500).json({ error: err.message || "Failed to execute retention cleanup." });
    }
  }
);

