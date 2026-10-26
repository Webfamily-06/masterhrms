"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meTrainingRouter = void 0;
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const tenant_context_js_1 = require("../context/tenant-context.js");
const training_service_js_1 = require("../services/training.service.js");
exports.meTrainingRouter = (0, express_1.Router)();
async function resolveEmployee(req) {
    const tenantId = req.user?.tenantId;
    const user = req.user;
    const userId = user.userId || user.id;
    const db = (0, tenant_context_js_1.getTenantDb)();
    return await db.employee.findFirst({
        where: { tenantId, userId },
    });
}
// My Trainings (Enrollments)
exports.meTrainingRouter.get("/trainings", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.json([]);
        const enrollments = await training_service_js_1.TrainingService.getEmployeeTrainings(tenantId, employee.id);
        return res.json(enrollments);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// My Sessions / Available Sessions
exports.meTrainingRouter.get("/sessions", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.json([]);
        const sessions = await training_service_js_1.TrainingService.getEmployeeSessions(tenantId, employee.id);
        return res.json(sessions);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// Browse Programs
exports.meTrainingRouter.get("/programs", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const programs = await training_service_js_1.TrainingService.listPrograms(tenantId, req.query.category, req.query.search);
        return res.json(programs);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// Self-Register for a Session
exports.meTrainingRouter.post("/sessions/:id/register", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.status(403).json({ error: "Employee profile not found" });
        const registration = await training_service_js_1.TrainingService.registerSession(tenantId, req.params.id, employee.id);
        return res.status(201).json(registration);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// Self-update training progress
exports.meTrainingRouter.patch("/trainings/:id/progress", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.status(403).json({ error: "Employee profile not found" });
        const updated = await training_service_js_1.TrainingService.updateProgress(tenantId, req.params.id, req.body.progress, req.body.score);
        return res.json(updated);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
