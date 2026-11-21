"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roadmapCentralRouter = void 0;
const express_1 = require("express");
const roadmap_central_service_1 = require("../services/roadmap-central.service");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
exports.roadmapCentralRouter = (0, express_1.Router)();
exports.roadmapCentralRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
/**
 * GET /api/roadmap
 * List roadmap items
 */
exports.roadmapCentralRouter.get("/", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { horizon, status, category } = req.query;
        const items = await roadmap_central_service_1.RoadmapCentralService.listItems(tenantId, {
            horizon: horizon,
            status: status,
            category: category ? String(category) : undefined,
        });
        return res.json({ items, total: items.length });
    }
    catch (err) {
        console.error("[roadmap:list] error:", err);
        return res.status(500).json({ error: err.message || "Failed to load roadmap items." });
    }
});
/**
 * POST /api/roadmap
 * Create roadmap item
 */
exports.roadmapCentralRouter.post("/", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { title, description, category, horizon, priority } = req.body;
        if (!title) {
            return res.status(400).json({ error: "Roadmap title is required." });
        }
        const item = await roadmap_central_service_1.RoadmapCentralService.createItem(tenantId, {
            title,
            description,
            category,
            horizon,
            priority,
        });
        return res.status(201).json({ item });
    }
    catch (err) {
        console.error("[roadmap:create] error:", err);
        return res.status(500).json({ error: err.message || "Failed to create roadmap item." });
    }
});
/**
 * PUT /api/roadmap/:id/status
 * Update status
 */
exports.roadmapCentralRouter.put("/:id/status", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ error: "Status is required." });
        }
        const item = await roadmap_central_service_1.RoadmapCentralService.updateStatus(tenantId, req.params.id, status);
        return res.json({ item });
    }
    catch (err) {
        console.error("[roadmap:status] error:", err);
        return res.status(500).json({ error: err.message || "Failed to update status." });
    }
});
/**
 * POST /api/roadmap/:id/upvote
 * Toggle upvote
 */
exports.roadmapCentralRouter.post("/:id/upvote", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const userId = req.user?.userId || req.user?.id || "user";
        const item = await roadmap_central_service_1.RoadmapCentralService.toggleUpvote(tenantId, req.params.id, userId);
        return res.json({ item });
    }
    catch (err) {
        console.error("[roadmap:upvote] error:", err);
        return res.status(500).json({ error: err.message || "Failed to toggle upvote." });
    }
});
/**
 * DELETE /api/roadmap/:id
 * Delete roadmap item
 */
exports.roadmapCentralRouter.delete("/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        await roadmap_central_service_1.RoadmapCentralService.deleteItem(tenantId, req.params.id);
        return res.json({ success: true, message: "Roadmap item deleted." });
    }
    catch (err) {
        console.error("[roadmap:delete] error:", err);
        return res.status(500).json({ error: err.message || "Failed to delete roadmap item." });
    }
});
