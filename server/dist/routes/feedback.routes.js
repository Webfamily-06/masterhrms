"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.feedbackRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const tenant_1 = require("../lib/tenant");
const feedback_service_1 = require("../services/feedback.service");
exports.feedbackRouter = (0, express_1.Router)();
exports.feedbackRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
// GET /api/feedback/metrics
exports.feedbackRouter.get("/metrics", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const metrics = await feedback_service_1.FeedbackService.getMetrics(tenantId);
        return res.json({ success: true, metrics });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// GET /api/feedback
exports.feedbackRouter.get("/", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { targetType, category, status, rating, search } = req.query;
        const submissions = await feedback_service_1.FeedbackService.listSubmissions(tenantId, {
            targetType: targetType,
            category: category,
            status: status,
            rating: rating ? parseInt(String(rating), 10) : undefined,
            search: search,
        });
        return res.json({ success: true, submissions });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// GET /api/feedback/:id
exports.feedbackRouter.get("/:id", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const submission = await feedback_service_1.FeedbackService.getSubmission(tenantId, req.params.id);
        if (!submission) {
            return res.status(404).json({ success: false, error: "Feedback submission not found" });
        }
        return res.json({ success: true, submission });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/feedback
exports.feedbackRouter.post("/", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { targetType, category, rating, title, comments, submitterName, submitterEmail, isAnonymous } = req.body;
        if (!rating || !title || !comments) {
            return res.status(400).json({
                success: false,
                error: "Rating (1-5), title, and comments are required",
            });
        }
        const submission = await feedback_service_1.FeedbackService.submitFeedback(tenantId, {
            targetType,
            category,
            rating,
            title,
            comments,
            submitterName,
            submitterEmail,
            isAnonymous,
        });
        return res.status(201).json({ success: true, submission });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// PUT /api/feedback/:id/resolve
exports.feedbackRouter.put("/:id/resolve", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const userId = req.user?.userId || "user_system";
        const { status, resolutionNotes } = req.body;
        if (!status || !resolutionNotes) {
            return res.status(400).json({
                success: false,
                error: "Status and resolutionNotes are required",
            });
        }
        const updated = await feedback_service_1.FeedbackService.resolveFeedback(tenantId, req.params.id, { status: status, resolutionNotes }, userId);
        return res.json({ success: true, submission: updated });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
