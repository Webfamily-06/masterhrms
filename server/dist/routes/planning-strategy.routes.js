"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const entitlements_1 = require("../middleware/entitlements");
const planning_strategy_service_1 = require("../services/planning-strategy.service");
const router = (0, express_1.Router)();
// Apply auth and entitlement checks to all planning routes
router.use(auth_1.requireAuth);
router.use((0, entitlements_1.requireAddon)("planning"));
function getTenantId(req) {
    return req.user?.tenantId || req.user?.tenant_id || "default";
}
function getUserId(req) {
    return req.user?.userId || req.user?.id || "user_system";
}
function getUserName(req) {
    return req.user?.name || req.user?.email || "User";
}
// ─── DASHBOARD ───────────────────────────────────────────────────────────────
router.get("/dashboard", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const data = await planning_strategy_service_1.PlanningStrategyService.getDashboard(tenantId);
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// ─── CATEGORIES ─────────────────────────────────────────────────────────────
router.get("/categories", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const data = await planning_strategy_service_1.PlanningStrategyService.getCategories(tenantId);
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
router.post("/categories", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const userId = getUserId(req);
        const data = await planning_strategy_service_1.PlanningStrategyService.saveCategory(tenantId, req.body, userId);
        res.status(201).json({ success: true, data });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});
router.put("/categories/:id", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const userId = getUserId(req);
        const data = await planning_strategy_service_1.PlanningStrategyService.saveCategory(tenantId, { ...req.body, id: req.params.id }, userId);
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});
router.delete("/categories/:id", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        await planning_strategy_service_1.PlanningStrategyService.deleteCategory(tenantId, req.params.id);
        res.json({ success: true, message: "Category deleted successfully" });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});
// ─── STAGES ─────────────────────────────────────────────────────────────────
router.get("/stages", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const data = await planning_strategy_service_1.PlanningStrategyService.getStages(tenantId);
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
router.post("/stages", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const data = await planning_strategy_service_1.PlanningStrategyService.saveStage(tenantId, req.body);
        res.status(201).json({ success: true, data });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});
router.put("/stages/reorder", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { orderedIds } = req.body;
        if (!Array.isArray(orderedIds)) {
            return res.status(400).json({ success: false, message: "orderedIds array is required" });
        }
        const data = await planning_strategy_service_1.PlanningStrategyService.reorderStages(tenantId, orderedIds);
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});
router.put("/stages/:id", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const data = await planning_strategy_service_1.PlanningStrategyService.saveStage(tenantId, { ...req.body, id: req.params.id });
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});
router.delete("/stages/:id", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        await planning_strategy_service_1.PlanningStrategyService.deleteStage(tenantId, req.params.id);
        res.json({ success: true, message: "Stage deleted successfully" });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});
// ─── STATUSES ───────────────────────────────────────────────────────────────
router.get("/statuses", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const data = await planning_strategy_service_1.PlanningStrategyService.getStatuses(tenantId);
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
router.post("/statuses", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const data = await planning_strategy_service_1.PlanningStrategyService.saveStatus(tenantId, req.body);
        res.status(201).json({ success: true, data });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});
router.put("/statuses/:id", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const data = await planning_strategy_service_1.PlanningStrategyService.saveStatus(tenantId, { ...req.body, id: req.params.id });
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});
router.delete("/statuses/:id", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        await planning_strategy_service_1.PlanningStrategyService.deleteStatus(tenantId, req.params.id);
        res.json({ success: true, message: "Status deleted successfully" });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});
// ─── CHALLENGES ─────────────────────────────────────────────────────────────
router.get("/challenges", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { position, categoryId, search } = req.query;
        const data = await planning_strategy_service_1.PlanningStrategyService.getChallenges(tenantId, { position, categoryId, search });
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
router.get("/challenges/:id", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const data = await planning_strategy_service_1.PlanningStrategyService.getChallengeById(tenantId, req.params.id);
        if (!data)
            return res.status(404).json({ success: false, message: "Challenge not found" });
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
router.post("/challenges", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const userId = getUserId(req);
        const data = await planning_strategy_service_1.PlanningStrategyService.createChallenge(tenantId, req.body, userId);
        res.status(201).json({ success: true, data });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});
router.put("/challenges/:id", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const userId = getUserId(req);
        const data = await planning_strategy_service_1.PlanningStrategyService.updateChallenge(tenantId, req.params.id, req.body, userId);
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});
router.delete("/challenges/:id", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const userId = getUserId(req);
        await planning_strategy_service_1.PlanningStrategyService.deleteChallenge(tenantId, req.params.id, userId);
        res.json({ success: true, message: "Challenge deleted successfully" });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});
// ─── MODELS (CHARTERS & STRATEGY MATRICES) ──────────────────────────────────
router.get("/models", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { type, challengeId, stageId, statusId, search } = req.query;
        const data = await planning_strategy_service_1.PlanningStrategyService.getModels(tenantId, {
            type: type || "charter",
            challengeId,
            stageId,
            statusId,
            search,
        });
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
router.get("/models/:id", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const data = await planning_strategy_service_1.PlanningStrategyService.getModelById(tenantId, req.params.id);
        if (!data)
            return res.status(404).json({ success: false, message: "Model not found" });
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
router.post("/models", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const userId = getUserId(req);
        const data = await planning_strategy_service_1.PlanningStrategyService.createModel(tenantId, req.body, userId);
        res.status(201).json({ success: true, data });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});
router.post("/models/:id/clone", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const userId = getUserId(req);
        const data = await planning_strategy_service_1.PlanningStrategyService.cloneModel(tenantId, req.params.id, userId);
        res.status(201).json({ success: true, data });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});
router.post("/charters/:id/clone", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const userId = getUserId(req);
        const data = await planning_strategy_service_1.PlanningStrategyService.cloneModel(tenantId, req.params.id, userId);
        res.status(201).json({ success: true, data });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});
router.put("/models/:id", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const userId = getUserId(req);
        const data = await planning_strategy_service_1.PlanningStrategyService.updateModel(tenantId, req.params.id, req.body, userId);
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});
router.patch("/models/:id/stage", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const userId = getUserId(req);
        const { stageId } = req.body;
        if (!stageId)
            return res.status(400).json({ success: false, message: "stageId is required" });
        const data = await planning_strategy_service_1.PlanningStrategyService.changeModelStage(tenantId, req.params.id, stageId, userId);
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});
router.put("/models/:id/rating", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const userId = getUserId(req);
        const { rating } = req.body;
        const data = await planning_strategy_service_1.PlanningStrategyService.rateModel(tenantId, req.params.id, parseInt(rating), userId);
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});
router.put("/models/:id/sections/:key", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const userId = getUserId(req);
        const { content } = req.body;
        const data = await planning_strategy_service_1.PlanningStrategyService.updateModelSection(tenantId, req.params.id, req.params.key, content, userId);
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});
router.delete("/models/:id", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const userId = getUserId(req);
        await planning_strategy_service_1.PlanningStrategyService.deleteModel(tenantId, req.params.id, userId);
        res.json({ success: true, message: "Model deleted successfully" });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});
// ─── COMMENTS ───────────────────────────────────────────────────────────────
router.get("/models/:id/comments", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const data = await planning_strategy_service_1.PlanningStrategyService.getComments(tenantId, req.params.id);
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
router.post("/models/:id/comments", async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const userId = getUserId(req);
        const userName = getUserName(req);
        const data = await planning_strategy_service_1.PlanningStrategyService.addComment(tenantId, req.params.id, req.body, userId, userName);
        res.status(201).json({ success: true, data });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});
exports.default = router;
