"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeTrackerRouter = void 0;
const express_1 = require("express");
const time_tracker_service_1 = require("../services/time-tracker.service");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const prisma_1 = require("../prisma");
exports.timeTrackerRouter = (0, express_1.Router)();
exports.timeTrackerRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
/**
 * GET /api/time-tracker/active
 * Get current active timer for logged-in user / employee
 */
exports.timeTrackerRouter.get("/active", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        let employeeId = req.query.employeeId || req.user?.employeeId;
        if (!employeeId && req.user?.userId) {
            const emp = await prisma_1.prisma.employee.findFirst({
                where: { tenantId, userId: req.user.userId },
                select: { id: true },
            });
            if (emp)
                employeeId = emp.id;
        }
        if (!employeeId) {
            return res.json({ timer: null });
        }
        const timer = await time_tracker_service_1.TimeTrackerService.getActiveTimer(tenantId, employeeId);
        return res.json({ timer });
    }
    catch (err) {
        console.error("[time-tracker:active] error:", err);
        return res.status(500).json({ error: err.message || "Failed to load active timer." });
    }
});
/**
 * POST /api/time-tracker/start
 * Start active timer
 */
exports.timeTrackerRouter.post("/start", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const userId = req.user?.userId || req.user?.id || "system";
        let employeeId = req.body.employeeId || req.user?.employeeId;
        if (!employeeId && userId) {
            const emp = await prisma_1.prisma.employee.findFirst({
                where: { tenantId, userId },
                select: { id: true },
            });
            if (emp)
                employeeId = emp.id;
        }
        if (!employeeId) {
            return res.status(400).json({ error: "Employee ID is required to start a timer." });
        }
        const timer = await time_tracker_service_1.TimeTrackerService.startTimer(tenantId, userId, employeeId, {
            projectId: req.body.projectId,
            taskId: req.body.taskId,
            description: req.body.description,
        });
        return res.status(201).json({ timer });
    }
    catch (err) {
        console.error("[time-tracker:start] error:", err);
        return res.status(500).json({ error: err.message || "Failed to start timer." });
    }
});
/**
 * POST /api/time-tracker/stop
 * Stop timer and automatically commit formal Timesheet entry
 */
exports.timeTrackerRouter.post("/stop", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        let employeeId = req.body.employeeId || req.user?.employeeId;
        if (!employeeId && req.user?.userId) {
            const emp = await prisma_1.prisma.employee.findFirst({
                where: { tenantId, userId: req.user.userId },
                select: { id: true },
            });
            if (emp)
                employeeId = emp.id;
        }
        if (!employeeId) {
            return res.status(400).json({ error: "Employee ID is required to stop timer." });
        }
        const result = await time_tracker_service_1.TimeTrackerService.stopTimer(tenantId, employeeId, {
            description: req.body.description,
            reviewNotes: req.body.reviewNotes,
        });
        return res.json(result);
    }
    catch (err) {
        console.error("[time-tracker:stop] error:", err);
        const status = err.message.includes("No active timer") ? 404 : 500;
        return res.status(status).json({ error: err.message || "Failed to stop timer." });
    }
});
/**
 * POST /api/time-tracker/discard
 * Discard active timer without saving timesheet
 */
exports.timeTrackerRouter.post("/discard", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        let employeeId = req.body.employeeId || req.user?.employeeId;
        if (!employeeId && req.user?.userId) {
            const emp = await prisma_1.prisma.employee.findFirst({
                where: { tenantId, userId: req.user.userId },
                select: { id: true },
            });
            if (emp)
                employeeId = emp.id;
        }
        if (!employeeId) {
            return res.status(400).json({ error: "Employee ID is required to discard timer." });
        }
        await time_tracker_service_1.TimeTrackerService.discardTimer(tenantId, employeeId);
        return res.json({ success: true, message: "Timer discarded." });
    }
    catch (err) {
        console.error("[time-tracker:discard] error:", err);
        const status = err.message.includes("No active timer") ? 404 : 500;
        return res.status(status).json({ error: err.message || "Failed to discard timer." });
    }
});
