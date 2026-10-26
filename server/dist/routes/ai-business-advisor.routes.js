"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiBusinessAdvisorRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const entitlements_1 = require("../middleware/entitlements");
const ai_business_advisor_service_1 = require("../services/ai-business-advisor.service");
exports.aiBusinessAdvisorRouter = (0, express_1.Router)();
// Guard with Authentication, Tenant Context & Add-on Entitlement
exports.aiBusinessAdvisorRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, (0, entitlements_1.requireEntitlement)("ai-business-advisor"));
// GET /api/ai-business-advisor/dashboard
exports.aiBusinessAdvisorRouter.get("/dashboard", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const date = req.query.date;
        const data = await ai_business_advisor_service_1.AiBusinessAdvisorService.getOrGenerateDailyAnalysis(tenantId, date, false);
        return res.json({ success: true, data });
    }
    catch (error) {
        console.error("AI Advisor Dashboard Error:", error);
        return res.status(500).json({ error: error.message || "Failed to load advisor dashboard" });
    }
});
// POST /api/ai-business-advisor/generate - "Generate Now" action
exports.aiBusinessAdvisorRouter.post("/generate", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const force = req.body?.force === true;
        const date = req.body?.date;
        const data = await ai_business_advisor_service_1.AiBusinessAdvisorService.getOrGenerateDailyAnalysis(tenantId, date, force || true);
        return res.json({ success: true, data, message: "Fresh AI Business Analysis generated successfully." });
    }
    catch (error) {
        console.error("AI Advisor Generate Error:", error);
        return res.status(500).json({ error: error.message || "Failed to generate AI analysis" });
    }
});
// POST /api/ai-business-advisor/insights/:id/dismiss
exports.aiBusinessAdvisorRouter.post("/insights/:id/dismiss", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const { id } = req.params;
        const date = req.body?.date;
        const data = await ai_business_advisor_service_1.AiBusinessAdvisorService.dismissInsight(tenantId, id, date);
        return res.json({ success: true, data, message: "Insight dismissed." });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Failed to dismiss insight" });
    }
});
// POST /api/ai-business-advisor/recommendations/:id/status
exports.aiBusinessAdvisorRouter.post("/recommendations/:id/status", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const { id } = req.params;
        const status = req.body?.status;
        const date = req.body?.date;
        if (!status || !["completed", "dismissed"].includes(status)) {
            return res.status(400).json({ error: "Invalid status: must be 'completed' or 'dismissed'" });
        }
        const data = await ai_business_advisor_service_1.AiBusinessAdvisorService.updateRecommendationStatus(tenantId, id, status, date);
        return res.json({ success: true, data, message: `Recommendation marked as ${status}.` });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Failed to update recommendation" });
    }
});
// POST /api/ai-business-advisor/alerts/:id/resolve
exports.aiBusinessAdvisorRouter.post("/alerts/:id/resolve", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const { id } = req.params;
        const date = req.body?.date;
        const data = await ai_business_advisor_service_1.AiBusinessAdvisorService.resolveAlert(tenantId, id, date);
        return res.json({ success: true, data, message: "Alert resolved." });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Failed to resolve alert" });
    }
});
// GET /api/ai-business-advisor/config
exports.aiBusinessAdvisorRouter.get("/config", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const config = await ai_business_advisor_service_1.AiBusinessAdvisorService.getConfig(tenantId);
        return res.json({ success: true, config });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Failed to fetch AI configuration" });
    }
});
// POST /api/ai-business-advisor/config
exports.aiBusinessAdvisorRouter.post("/config", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const { provider, model, apiKey, retentionDays } = req.body;
        await ai_business_advisor_service_1.AiBusinessAdvisorService.saveConfig(tenantId, { provider, model, apiKey, retentionDays });
        return res.json({ success: true, message: "AI Business Advisor settings updated." });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Failed to save AI configuration" });
    }
});
