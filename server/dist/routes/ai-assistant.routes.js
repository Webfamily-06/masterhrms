"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ai_assistant_service_1 = require("../services/ai-assistant.service");
const auth_1 = require("../middleware/auth");
const entitlements_1 = require("../middleware/entitlements");
const router = (0, express_1.Router)();
// Apply auth and add-on entitlement middlewares
router.use(auth_1.requireAuth);
router.use((0, entitlements_1.requireAddon)("ai-assistant"));
/**
 * GET /settings - Retrieve provider config
 */
router.get("/settings", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const config = await ai_assistant_service_1.AiAssistantService.getProviderConfig(tenantId);
        res.json(config);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * PUT /settings - Update provider config
 */
router.put("/settings", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const config = await ai_assistant_service_1.AiAssistantService.updateProviderConfig(tenantId, req.body);
        res.json(config);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
/**
 * POST /settings/test - Test provider connection
 */
router.post("/settings/test", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const result = await ai_assistant_service_1.AiAssistantService.testConnection(tenantId, req.body?.apiKey);
        res.json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
/**
 * GET /providers - Get supported adapters
 */
router.get("/providers", (_req, res) => {
    res.json(ai_assistant_service_1.AiAssistantService.getProviders());
});
/**
 * GET /models - Get models
 */
router.get("/models", async (req, res) => {
    try {
        const provider = req.query.provider;
        const models = await ai_assistant_service_1.AiAssistantService.getModels(provider);
        res.json(models);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * GET /languages - Platform language registry
 */
router.get("/languages", (_req, res) => {
    res.json(ai_assistant_service_1.PLATFORM_LANGUAGES);
});
/**
 * GET /fields - Get field rules for installed modules
 */
router.get("/fields", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const fields = await ai_assistant_service_1.AiAssistantService.getFieldRules(tenantId);
        res.json(fields);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * PUT /fields/:id - Update field rule toggle
 */
router.put("/fields/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { isEnabled } = req.body;
        const updated = await ai_assistant_service_1.AiAssistantService.updateFieldRule(tenantId, req.params.id, Boolean(isEnabled));
        res.json(updated);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
/**
 * POST /generate - Generate content
 */
router.post("/generate", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const userId = req.user?.id || "user-unknown";
        const result = await ai_assistant_service_1.AiAssistantService.generate(tenantId, userId, req.body);
        res.json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
/**
 * GET /history - Get generation logs
 */
router.get("/history", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const history = await ai_assistant_service_1.AiAssistantService.getHistory(tenantId);
        res.json(history);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * GET /history/:id - Get generation log detail
 */
router.get("/history/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const detail = await ai_assistant_service_1.AiAssistantService.getHistoryDetail(tenantId, req.params.id);
        if (!detail) {
            return res.status(404).json({ error: "Generation record not found" });
        }
        res.json(detail);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * GET /usage - Get usage metrics
 */
router.get("/usage", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const from = req.query.from;
        const to = req.query.to;
        const analytics = await ai_assistant_service_1.AiAssistantService.getUsageAnalytics(tenantId, from, to);
        res.json(analytics);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
