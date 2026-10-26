"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hrTrainingRouter = void 0;
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const training_service_js_1 = require("../services/training.service.js");
const tenant_context_js_1 = require("../context/tenant-context.js");
exports.hrTrainingRouter = (0, express_1.Router)();
// Overview
exports.hrTrainingRouter.get("/overview", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const overview = await training_service_js_1.TrainingService.getOverview(tenantId);
        return res.json(overview);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to load training overview" });
    }
});
// Meta Dropdowns (Branches, Departments, Types, Trainers, Courses, Employees)
exports.hrTrainingRouter.get("/meta", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_js_1.getTenantDb)();
        const [branches, departments, types, trainers, courses, employees] = await Promise.all([
            db.branch.findMany({ where: { tenantId }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
            db.department.findMany({ where: { tenantId }, select: { id: true, name: true, branchId: true }, orderBy: { name: "asc" } }),
            db.trainingTypeMaster.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
            db.trainer.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
            db.trainingCourse.findMany({ where: { tenantId }, select: { id: true, title: true, category: true }, orderBy: { title: "asc" } }),
            db.employee.findMany({ where: { tenantId }, select: { id: true, firstName: true, lastName: true, employeeCode: true, departmentId: true, branchId: true }, orderBy: { firstName: "asc" } }),
        ]);
        return res.json({ branches, departments, types, trainers, courses, employees });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// ─── TRAINING TYPES ───────────────────────────────────────────
exports.hrTrainingRouter.get("/types", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const types = await training_service_js_1.TrainingService.listTypes(tenantId, req.query.branchId, req.query.departmentId, req.query.search);
        return res.json(types);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.hrTrainingRouter.post("/types", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const type = await training_service_js_1.TrainingService.createType(tenantId, req.body);
        return res.status(201).json(type);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrTrainingRouter.put("/types/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const type = await training_service_js_1.TrainingService.updateType(tenantId, req.params.id, req.body);
        return res.json(type);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrTrainingRouter.delete("/types/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        await training_service_js_1.TrainingService.deleteType(tenantId, req.params.id);
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// ─── TRAINERS ─────────────────────────────────────────────────
exports.hrTrainingRouter.get("/trainers", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const trainers = await training_service_js_1.TrainingService.listTrainers(tenantId, {
            branchId: req.query.branchId,
            departmentId: req.query.departmentId,
            trainerType: req.query.trainerType,
            search: req.query.search,
        });
        return res.json(trainers);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.hrTrainingRouter.get("/trainers/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const trainer = await training_service_js_1.TrainingService.getTrainer(tenantId, req.params.id);
        if (!trainer)
            return res.status(404).json({ error: "Trainer not found" });
        return res.json(trainer);
    }
    catch (err) {
        return res.status(404).json({ error: err.message });
    }
});
exports.hrTrainingRouter.post("/trainers", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const trainer = await training_service_js_1.TrainingService.createTrainer(tenantId, actorId, req.body);
        return res.status(201).json(trainer);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrTrainingRouter.put("/trainers/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const trainer = await training_service_js_1.TrainingService.updateTrainer(tenantId, actorId, req.params.id, req.body);
        return res.json(trainer);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrTrainingRouter.delete("/trainers/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        await training_service_js_1.TrainingService.deleteTrainer(tenantId, req.params.id);
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// ─── TRAINING SESSIONS / LIST ─────────────────────────────────
exports.hrTrainingRouter.get("/sessions", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const sessions = await training_service_js_1.TrainingService.listSessions(tenantId, {
            courseId: req.query.courseId,
            trainingTypeId: req.query.trainingTypeId,
            trainerId: req.query.trainerId,
            branchId: req.query.branchId,
            departmentId: req.query.departmentId,
            status: req.query.status,
            search: req.query.search,
        });
        return res.json(sessions);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.hrTrainingRouter.get("/sessions/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const session = await training_service_js_1.TrainingService.getSession(tenantId, req.params.id);
        if (!session)
            return res.status(404).json({ error: "Session not found" });
        return res.json(session);
    }
    catch (err) {
        return res.status(404).json({ error: err.message });
    }
});
exports.hrTrainingRouter.post("/sessions", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const session = await training_service_js_1.TrainingService.createSession(tenantId, actorId, req.body);
        return res.status(201).json(session);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrTrainingRouter.put("/sessions/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const session = await training_service_js_1.TrainingService.updateSession(tenantId, actorId, req.params.id, req.body);
        return res.json(session);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrTrainingRouter.delete("/sessions/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        await training_service_js_1.TrainingService.deleteSession(tenantId, req.params.id);
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// ─── TASKS WITHIN A TRAINING ──────────────────────────────────
exports.hrTrainingRouter.get("/sessions/:id/tasks", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const tasks = await training_service_js_1.TrainingService.listTasks(tenantId, req.params.id, req.query.search);
        return res.json(tasks);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.hrTrainingRouter.post("/sessions/:id/tasks", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const task = await training_service_js_1.TrainingService.createTask(tenantId, actorId, req.params.id, req.body);
        return res.status(201).json(task);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrTrainingRouter.put("/tasks/:taskId", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const updated = await training_service_js_1.TrainingService.updateTask(tenantId, req.params.taskId, req.body);
        return res.json(updated);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrTrainingRouter.patch("/tasks/:taskId/complete", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const completed = await training_service_js_1.TrainingService.markTaskComplete(tenantId, req.params.taskId);
        return res.json(completed);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrTrainingRouter.delete("/tasks/:taskId", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        await training_service_js_1.TrainingService.deleteTask(tenantId, req.params.taskId);
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// ─── TASK FEEDBACKS ───────────────────────────────────────────
exports.hrTrainingRouter.get("/tasks/:taskId/feedbacks", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const feedbacks = await training_service_js_1.TrainingService.listFeedbacks(tenantId, req.params.taskId, req.query.search);
        return res.json(feedbacks);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.hrTrainingRouter.post("/tasks/:taskId/feedbacks", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const feedback = await training_service_js_1.TrainingService.createFeedback(tenantId, req.params.taskId, {
            ...req.body,
            userId: req.user?.userId,
            userName: req.user?.email || "HR Reviewer",
        });
        return res.status(201).json(feedback);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrTrainingRouter.delete("/feedbacks/:feedbackId", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        await training_service_js_1.TrainingService.deleteFeedback(tenantId, req.params.feedbackId);
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// ─── ATTENDANCE & REGISTRATION ────────────────────────────────
exports.hrTrainingRouter.post("/sessions/:id/register", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const reg = await training_service_js_1.TrainingService.registerSession(tenantId, req.params.id, req.body.employeeId);
        return res.status(201).json(reg);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrTrainingRouter.post("/sessions/:id/attendance", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_js_1.getTenantDb)();
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
        const result = await training_service_js_1.TrainingService.markSessionAttendance(tenantId, attendance.id, req.body.status, req.body.feedback, req.body.rating);
        return res.json(result);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// ─── PROGRAMS / COURSES ───────────────────────────────────────
exports.hrTrainingRouter.get("/programs", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const programs = await training_service_js_1.TrainingService.listPrograms(tenantId, req.query.category, req.query.search);
        return res.json(programs);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.hrTrainingRouter.get("/programs/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_js_1.getTenantDb)();
        const program = await db.trainingCourse.findFirst({
            where: { id: req.params.id, tenantId },
            include: { sessions: true },
        });
        if (!program)
            return res.status(404).json({ error: "Program not found" });
        return res.json(program);
    }
    catch (err) {
        return res.status(404).json({ error: err.message });
    }
});
exports.hrTrainingRouter.post("/programs", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const program = await training_service_js_1.TrainingService.createProgram(tenantId, actorId, req.body);
        return res.status(201).json(program);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// ─── EMPLOYEE TRAININGS (ENROLLMENTS) ─────────────────────────
exports.hrTrainingRouter.get("/employee-trainings", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_js_1.getTenantDb)();
        const enrollments = await db.courseEnrollment.findMany({
            where: {
                tenantId,
                ...(req.query.employeeId ? { employeeId: req.query.employeeId } : {}),
                ...(req.query.courseId ? { courseId: req.query.courseId } : {}),
                ...(req.query.status ? { status: req.query.status } : {}),
            },
            include: {
                employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
                course: true,
            },
            orderBy: { createdAt: "desc" },
        });
        return res.json(enrollments);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.hrTrainingRouter.post("/employee-trainings", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const enrollment = await training_service_js_1.TrainingService.assignTraining(tenantId, actorId, req.body.courseId, req.body.employeeId);
        return res.status(201).json(enrollment);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.hrTrainingRouter.patch("/employee-trainings/:id/progress", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const updated = await training_service_js_1.TrainingService.updateProgress(tenantId, req.params.id, req.body.progress, req.body.score);
        return res.json(updated);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
