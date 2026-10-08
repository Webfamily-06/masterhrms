import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { TrainingService } from "../services/training.service.js";
import { getTenantDb } from "../context/tenant-context.js";

export const hrTrainingRouter = Router();

// Overview
hrTrainingRouter.get("/overview", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const overview = await TrainingService.getOverview(tenantId);
    return res.json(overview);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load training overview" });
  }
});

// Training Types
hrTrainingRouter.get("/types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const types = await TrainingService.listTypes(tenantId);
    return res.json(types);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrTrainingRouter.post("/types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const type = await TrainingService.createType(tenantId, req.body.name, req.body.description);
    return res.status(201).json(type);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.put("/types/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const db = getTenantDb();
    const type = await db.trainingTypeMaster.update({
      where: { id: req.params.id },
      data: req.body,
    });
    return res.json(type);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.delete("/types/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const db = getTenantDb();
    await db.trainingTypeMaster.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Programs / Courses
hrTrainingRouter.get("/programs", requireAuth, async (req: AuthRequest, res: Response) => {
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

hrTrainingRouter.get("/programs/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const program = await db.trainingCourse.findFirst({
      where: { id: req.params.id, tenantId },
      include: { sessions: true },
    });
    if (!program) return res.status(404).json({ error: "Program not found" });
    return res.json(program);
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});

hrTrainingRouter.post("/programs", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const program = await TrainingService.createProgram(tenantId, actorId, req.body);
    return res.status(201).json(program);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Sessions
hrTrainingRouter.get("/sessions", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const sessions = await TrainingService.listSessions(
      tenantId,
      req.query.courseId as string,
      req.query.status as string
    );
    return res.json(sessions);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrTrainingRouter.get("/sessions/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const session = await db.trainingSession.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        course: true,
        attendances: { include: { employee: true } },
      },
    });
    if (!session) return res.status(404).json({ error: "Session not found" });
    return res.json(session);
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});

hrTrainingRouter.post("/sessions", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const session = await TrainingService.createSession(tenantId, actorId, req.body);
    return res.status(201).json(session);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.post("/sessions/:id/register", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const reg = await TrainingService.registerSession(tenantId, req.params.id, req.body.employeeId);
    return res.status(201).json(reg);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.post("/sessions/:id/attendance", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    let attendance = await db.sessionAttendance.findFirst({
      where: { tenantId, sessionId: req.params.id, employeeId: req.body.employeeId },
    });
    if (!attendance) {
      attendance = await db.sessionAttendance.create({
        data: {
          tenantId,
          sessionId: req.params.id,
          employeeId: req.body.employeeId,
          status: req.body.status || "attended",
        },
      });
    }

    const result = await TrainingService.markSessionAttendance(
      tenantId,
      attendance.id,
      req.body.status,
      req.body.feedback
    );
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Employee Trainings (Enrollments)
hrTrainingRouter.get("/employee-trainings", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const enrollments = await db.courseEnrollment.findMany({
      where: {
        tenantId,
        ...(req.query.employeeId ? { employeeId: req.query.employeeId as string } : {}),
        ...(req.query.courseId ? { courseId: req.query.courseId as string } : {}),
        ...(req.query.status ? { status: req.query.status as string } : {}),
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        course: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(enrollments);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrTrainingRouter.post("/employee-trainings", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const enrollment = await TrainingService.assignTraining(
      tenantId,
      actorId,
      req.body.courseId,
      req.body.employeeId
    );
    return res.status(201).json(enrollment);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.patch("/employee-trainings/:id/progress", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
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
