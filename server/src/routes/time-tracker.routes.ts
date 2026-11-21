import { Router, Response } from "express";
import { TimeTrackerService } from "../services/time-tracker.service";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { prisma } from "../prisma";

export const timeTrackerRouter = Router();

timeTrackerRouter.use(requireAuth, resolveTenantContext as any);

/**
 * GET /api/time-tracker/active
 * Get current active timer for logged-in user / employee
 */
timeTrackerRouter.get("/active", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    let employeeId = (req.query.employeeId as string) || (req.user as any)?.employeeId;

    if (!employeeId && req.user?.userId) {
      const emp = await prisma.employee.findFirst({
        where: { tenantId, userId: req.user.userId },
        select: { id: true },
      });
      if (emp) employeeId = emp.id;
    }

    if (!employeeId) {
      return res.json({ timer: null });
    }

    const timer = await TimeTrackerService.getActiveTimer(tenantId, employeeId);
    return res.json({ timer });
  } catch (err: any) {
    console.error("[time-tracker:active] error:", err);
    return res.status(500).json({ error: err.message || "Failed to load active timer." });
  }
});

/**
 * POST /api/time-tracker/start
 * Start active timer
 */
timeTrackerRouter.post("/start", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const userId = req.user?.userId || (req.user as any)?.id || "system";
    let employeeId = req.body.employeeId || (req.user as any)?.employeeId;

    if (!employeeId && userId) {
      const emp = await prisma.employee.findFirst({
        where: { tenantId, userId },
        select: { id: true },
      });
      if (emp) employeeId = emp.id;
    }

    if (!employeeId) {
      return res.status(400).json({ error: "Employee ID is required to start a timer." });
    }

    const timer = await TimeTrackerService.startTimer(tenantId, userId, employeeId, {
      projectId: req.body.projectId,
      taskId: req.body.taskId,
      description: req.body.description,
    });

    return res.status(201).json({ timer });
  } catch (err: any) {
    console.error("[time-tracker:start] error:", err);
    return res.status(500).json({ error: err.message || "Failed to start timer." });
  }
});

/**
 * POST /api/time-tracker/stop
 * Stop timer and automatically commit formal Timesheet entry
 */
timeTrackerRouter.post("/stop", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    let employeeId = req.body.employeeId || (req.user as any)?.employeeId;

    if (!employeeId && req.user?.userId) {
      const emp = await prisma.employee.findFirst({
        where: { tenantId, userId: req.user.userId },
        select: { id: true },
      });
      if (emp) employeeId = emp.id;
    }

    if (!employeeId) {
      return res.status(400).json({ error: "Employee ID is required to stop timer." });
    }

    const result = await TimeTrackerService.stopTimer(tenantId, employeeId, {
      description: req.body.description,
      reviewNotes: req.body.reviewNotes,
    });

    return res.json(result);
  } catch (err: any) {
    console.error("[time-tracker:stop] error:", err);
    const status = err.message.includes("No active timer") ? 404 : 500;
    return res.status(status).json({ error: err.message || "Failed to stop timer." });
  }
});

/**
 * POST /api/time-tracker/discard
 * Discard active timer without saving timesheet
 */
timeTrackerRouter.post("/discard", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    let employeeId = req.body.employeeId || (req.user as any)?.employeeId;

    if (!employeeId && req.user?.userId) {
      const emp = await prisma.employee.findFirst({
        where: { tenantId, userId: req.user.userId },
        select: { id: true },
      });
      if (emp) employeeId = emp.id;
    }

    if (!employeeId) {
      return res.status(400).json({ error: "Employee ID is required to discard timer." });
    }

    await TimeTrackerService.discardTimer(tenantId, employeeId);
    return res.json({ success: true, message: "Timer discarded." });
  } catch (err: any) {
    console.error("[time-tracker:discard] error:", err);
    const status = err.message.includes("No active timer") ? 404 : 500;
    return res.status(status).json({ error: err.message || "Failed to discard timer." });
  }
});
