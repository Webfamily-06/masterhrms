"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resumeBuilderRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const tenant_1 = require("../lib/tenant");
const resume_builder_service_1 = require("../services/resume-builder.service");
exports.resumeBuilderRouter = (0, express_1.Router)();
exports.resumeBuilderRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
// GET /api/resume-builder
exports.resumeBuilderRouter.get("/", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { candidateId, employeeId, search } = req.query;
        const resumes = await resume_builder_service_1.ResumeBuilderService.listResumes(tenantId, {
            candidateId: candidateId,
            employeeId: employeeId,
            search: search,
        });
        return res.json({ success: true, resumes });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// GET /api/resume-builder/:id
exports.resumeBuilderRouter.get("/:id", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const resume = await resume_builder_service_1.ResumeBuilderService.getResume(tenantId, req.params.id);
        if (!resume) {
            return res.status(404).json({ success: false, error: "Resume not found" });
        }
        return res.json({ success: true, resume });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/resume-builder
exports.resumeBuilderRouter.post("/", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const userId = req.user?.userId || "user_system";
        const { title, fullName, email, summary } = req.body;
        if (!title || !fullName || !email || !summary) {
            return res.status(400).json({
                success: false,
                error: "title, fullName, email, and summary are required",
            });
        }
        const resume = await resume_builder_service_1.ResumeBuilderService.createResume(tenantId, req.body, userId);
        return res.status(201).json({ success: true, resume });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// PUT /api/resume-builder/:id
exports.resumeBuilderRouter.put("/:id", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const updated = await resume_builder_service_1.ResumeBuilderService.updateResume(tenantId, req.params.id, req.body);
        return res.json({ success: true, resume: updated });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// DELETE /api/resume-builder/:id
exports.resumeBuilderRouter.delete("/:id", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const deleted = await resume_builder_service_1.ResumeBuilderService.deleteResume(tenantId, req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: "Resume not found" });
        }
        return res.json({ success: true, message: "Resume deleted" });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
