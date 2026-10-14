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

// Meta Dropdowns (Branches, Departments, Types, Trainers, Courses, Employees)
hrTrainingRouter.get("/meta", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const [branches, departments, types, trainers, courses, employees] = await Promise.all([
      db.branch.findMany({ where: { tenantId }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
      db.department.findMany({ where: { tenantId }, select: { id: true, name: true, branchId: true }, orderBy: { name: "asc" } }),
      db.trainingTypeMaster.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
      db.trainer.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
      db.trainingCourse.findMany({ where: { tenantId }, select: { id: true, title: true, category: true }, orderBy: { title: "asc" } }),
      db.employee.findMany({ where: { tenantId }, select: { id: true, firstName: true, lastName: true, employeeCode: true, departmentId: true, branchId: true }, orderBy: { firstName: "asc" } }),
    ]);
    return res.json({ branches, departments, types, trainers, courses, employees });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── TRAINING TYPES ───────────────────────────────────────────
hrTrainingRouter.get("/types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const types = await TrainingService.listTypes(
      tenantId,
      req.query.branchId as string,
      req.query.departmentId as string,
      req.query.search as string
    );
    return res.json(types);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrTrainingRouter.post("/types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const type = await TrainingService.createType(tenantId, req.body);
    return res.status(201).json(type);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.put("/types/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const type = await TrainingService.updateType(tenantId, req.params.id, req.body);
    return res.json(type);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.delete("/types/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    await TrainingService.deleteType(tenantId, req.params.id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── TRAINERS ─────────────────────────────────────────────────
hrTrainingRouter.get("/trainers", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const trainers = await TrainingService.listTrainers(tenantId, {
      branchId: req.query.branchId as string,
      departmentId: req.query.departmentId as string,
      trainerType: req.query.trainerType as string,
      search: req.query.search as string,
    });
    return res.json(trainers);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrTrainingRouter.get("/trainers/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const trainer = await TrainingService.getTrainer(tenantId, req.params.id);
    if (!trainer) return res.status(404).json({ error: "Trainer not found" });
    return res.json(trainer);
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});

hrTrainingRouter.post("/trainers", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const trainer = await TrainingService.createTrainer(tenantId, actorId, req.body);
    return res.status(201).json(trainer);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.put("/trainers/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const trainer = await TrainingService.updateTrainer(tenantId, actorId, req.params.id, req.body);
    return res.json(trainer);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.delete("/trainers/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    await TrainingService.deleteTrainer(tenantId, req.params.id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── TRAINING SESSIONS / LIST ─────────────────────────────────
hrTrainingRouter.get("/sessions", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const sessions = await TrainingService.listSessions(tenantId, {
      courseId: req.query.courseId as string,
      trainingTypeId: req.query.trainingTypeId as string,
      trainerId: req.query.trainerId as string,
      branchId: req.query.branchId as string,
      departmentId: req.query.departmentId as string,
      status: req.query.status as string,
      search: req.query.search as string,
    });
    return res.json(sessions);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrTrainingRouter.get("/sessions/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const session = await TrainingService.getSession(tenantId, req.params.id);
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

hrTrainingRouter.put("/sessions/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const session = await TrainingService.updateSession(tenantId, actorId, req.params.id, req.body);
    return res.json(session);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.delete("/sessions/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    await TrainingService.deleteSession(tenantId, req.params.id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── TASKS WITHIN A TRAINING ──────────────────────────────────
hrTrainingRouter.get("/sessions/:id/tasks", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const tasks = await TrainingService.listTasks(tenantId, req.params.id, req.query.search as string);
    return res.json(tasks);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrTrainingRouter.post("/sessions/:id/tasks", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const task = await TrainingService.createTask(tenantId, actorId, req.params.id, req.body);
    return res.status(201).json(task);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.put("/tasks/:taskId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const updated = await TrainingService.updateTask(tenantId, req.params.taskId, req.body);
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.patch("/tasks/:taskId/complete", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const completed = await TrainingService.markTaskComplete(tenantId, req.params.taskId);
    return res.json(completed);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.delete("/tasks/:taskId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    await TrainingService.deleteTask(tenantId, req.params.taskId);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── TASK FEEDBACKS ───────────────────────────────────────────
hrTrainingRouter.get("/tasks/:taskId/feedbacks", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const feedbacks = await TrainingService.listFeedbacks(tenantId, req.params.taskId, req.query.search as string);
    return res.json(feedbacks);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrTrainingRouter.post("/tasks/:taskId/feedbacks", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const feedback = await TrainingService.createFeedback(tenantId, req.params.taskId, {
      ...req.body,
      userId: req.user?.userId,
      userName: req.user?.email || "HR Reviewer",
    });
    return res.status(201).json(feedback);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.delete("/feedbacks/:feedbackId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    await TrainingService.deleteFeedback(tenantId, req.params.feedbackId);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── ATTENDANCE & REGISTRATION ────────────────────────────────
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
      req.body.feedback,
      req.body.rating
    );
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── PROGRAMS / COURSES ───────────────────────────────────────
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

// ─── EMPLOYEE TRAININGS (ENROLLMENTS) ─────────────────────────
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
