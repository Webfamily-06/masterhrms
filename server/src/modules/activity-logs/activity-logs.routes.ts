import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../../middleware/auth";
import { resolveTenantContext } from "../../middleware/tenant-context.middleware";
import { requireEntitlement } from "../../middleware/entitlements";
import { ActivityLogsService, ActivityLogQueryParams } from "./activity-logs.service";

export const activityLogsRouter = Router();

// Middleware: auth -> tenant resolution -> entitlement check
activityLogsRouter.use(requireAuth, resolveTenantContext, requireEntitlement("activity-logs"));

/**
 * GET /api/activity-logs
 * List paginated, filtered activity logs for the current tenant.
 */
activityLogsRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const query: ActivityLogQueryParams = {
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

    const results = await ActivityLogsService.listActivityLogs(tenantId, query);
    return res.json({
      ...results,
      logs: results.items,
      pagination: results.pagination,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to retrieve activity logs." });
  }
});

/**
 * GET /api/activity-logs/export & GET /api/activity-logs/export/csv
 * Downloads activity logs as an RFC 4180 CSV file with secrets redacted.
 */
const handleExportCsv = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const query: ActivityLogQueryParams = {
      actorId: req.query.actorId ? String(req.query.actorId) : undefined,
      actorEmail: req.query.actorEmail ? String(req.query.actorEmail) : undefined,
      action: req.query.action ? String(req.query.action) : undefined,
      entityType: req.query.entityType ? String(req.query.entityType) : undefined,
      dateFrom: req.query.dateFrom ? String(req.query.dateFrom) : undefined,
      dateTo: req.query.dateTo ? String(req.query.dateTo) : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
    };

    const csvContent = await ActivityLogsService.exportActivityLogsCsv(tenantId, query);

    const filename = `activity_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");

    return res.send(csvContent);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to export activity logs." });
  }
};

activityLogsRouter.get("/export", handleExportCsv);
activityLogsRouter.get("/export/csv", handleExportCsv);

/**
 * GET /api/activity-logs/:id
 * Retrieve details of a specific activity log entry.
 */
activityLogsRouter.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const { id } = req.params;

    const log = await ActivityLogsService.getActivityLog(tenantId, id);
    if (!log) {
      return res.status(404).json({ error: "Activity log entry not found." });
    }

    return res.json(log);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to retrieve activity log entry." });
  }
});
