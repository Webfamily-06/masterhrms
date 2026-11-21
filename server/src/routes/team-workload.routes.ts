import { Router, Response } from "express";
import { TeamWorkloadService } from "../services/team-workload.service";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";

export const teamWorkloadRouter = Router();

teamWorkloadRouter.use(requireAuth, resolveTenantContext as any);

/**
 * GET /api/team-workload/summary
 * Aggregated team workload with task & timesheet utilization
 */
teamWorkloadRouter.get("/summary", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { departmentId, startDate, endDate } = req.query;

    const summary = await TeamWorkloadService.getWorkloadSummary(tenantId, {
      departmentId: departmentId ? String(departmentId) : undefined,
      startDate: startDate ? new Date(String(startDate)) : undefined,
      endDate: endDate ? new Date(String(endDate)) : undefined,
    });

    return res.json({ summary });
  } catch (err: any) {
    console.error("[team-workload:summary] error:", err);
    return res.status(500).json({ error: err.message || "Failed to load team workload summary." });
  }
});

/**
 * GET /api/team-workload/employee/:employeeId
 * Specific employee workload details
 */
teamWorkloadRouter.get("/employee/:employeeId", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const workload = await TeamWorkloadService.getEmployeeWorkload(tenantId, req.params.employeeId);

    if (!workload) {
      return res.status(404).json({ error: "Employee workload not found." });
    }

    return res.json({ workload });
  } catch (err: any) {
    console.error("[team-workload:employee] error:", err);
    return res.status(500).json({ error: err.message || "Failed to load employee workload." });
  }
});
