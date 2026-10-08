import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { getTenantDb } from "../context/tenant-context.js";
import { TrainingService } from "../services/training.service.js";

export const meTrainingRouter = Router();

async function resolveEmployee(req: AuthRequest) {
  const tenantId = req.user?.tenantId!;
  const user = req.user!;
  const userId = user.userId || (user as any).id;
  const db = getTenantDb();
  return await db.employee.findFirst({
    where: { tenantId, userId },
  });
}

// My Trainings (Enrollments)
meTrainingRouter.get("/trainings", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.json([]);

    const enrollments = await TrainingService.getEmployeeTrainings(tenantId, employee.id);
    return res.json(enrollments);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// My Sessions / Available Sessions
meTrainingRouter.get("/sessions", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.json([]);

    const sessions = await TrainingService.getEmployeeSessions(tenantId, employee.id);
    return res.json(sessions);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Browse Programs
meTrainingRouter.get("/programs", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const programs = await TrainingService.listPrograms(
      tenantId,
      req.query.category as string,
      req.query.search as string
    );
    return res.json(programs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Self-Register for a Session
meTrainingRouter.post("/sessions/:id/register", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.status(403).json({ error: "Employee profile not found" });

    const registration = await TrainingService.registerSession(tenantId, req.params.id, employee.id);
    return res.status(201).json(registration);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Self-update training progress
meTrainingRouter.patch("/trainings/:id/progress", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.status(403).json({ error: "Employee profile not found" });

    const updated = await TrainingService.updateProgress(
      tenantId,
      req.params.id,
      req.body.progress,
      req.body.score
    );
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});
