"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lmsRouter = void 0;
const express_1 = require("express");
const lms_service_1 = require("../services/lms.service");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
exports.lmsRouter = (0, express_1.Router)();
exports.lmsRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
/**
 * POST /api/lms/courses
 * Create new course
 */
exports.lmsRouter.post("/courses", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { title, category, instructor, durationHours, isMandatory, passingScore, description } = req.body;
        if (!title) {
            return res.status(400).json({ error: "Course title is required." });
        }
        const course = await lms_service_1.LmsService.createCourse(tenantId, {
            title,
            category,
            instructor,
            durationHours,
            isMandatory,
            passingScore,
            description,
        });
        return res.status(201).json({ course });
    }
    catch (err) {
        console.error("[lms:course:create] error:", err);
        return res.status(500).json({ error: err.message || "Failed to create course." });
    }
});
/**
 * POST /api/lms/courses/:courseId/enroll
 * Enroll employee into course
 */
exports.lmsRouter.post("/courses/:courseId/enroll", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { employeeId } = req.body;
        if (!employeeId) {
            return res.status(400).json({ error: "Employee ID is required." });
        }
        const enrollment = await lms_service_1.LmsService.enrollEmployee(tenantId, req.params.courseId, employeeId);
        return res.status(201).json({ enrollment });
    }
    catch (err) {
        console.error("[lms:course:enroll] error:", err);
        return res.status(500).json({ error: err.message || "Failed to enroll employee." });
    }
});
/**
 * POST /api/lms/enrollments/:enrollmentId/progress
 * Record course lesson progress
 */
exports.lmsRouter.post("/enrollments/:enrollmentId/progress", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { progressPercentage, score } = req.body;
        const enrollment = await lms_service_1.LmsService.updateProgress(tenantId, req.params.enrollmentId, Number(progressPercentage), score !== undefined ? Number(score) : undefined);
        return res.json({ enrollment });
    }
    catch (err) {
        console.error("[lms:progress:update] error:", err);
        return res.status(500).json({ error: err.message || "Failed to update progress." });
    }
});
/**
 * GET /api/lms/enrollments/:enrollmentId/certificate
 * Get completion certificate
 */
exports.lmsRouter.get("/enrollments/:enrollmentId/certificate", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const cert = await lms_service_1.LmsService.getCertificate(tenantId, req.params.enrollmentId);
        return res.json({ certificate: cert });
    }
    catch (err) {
        console.error("[lms:certificate] error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch certificate." });
    }
});
