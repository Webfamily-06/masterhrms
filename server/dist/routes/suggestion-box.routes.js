"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.suggestionBoxRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const entitlements_1 = require("../middleware/entitlements");
const suggestion_box_service_1 = require("../services/suggestion-box.service");
exports.suggestionBoxRouter = (0, express_1.Router)();
// Gating: Require authenticated user, tenant context, and entitlement check
exports.suggestionBoxRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, (0, entitlements_1.requireEntitlement)("suggestion-box"));
// ─── DASHBOARD METRICS ────────────────────────────────────────────────────────
exports.suggestionBoxRouter.get("/stats", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const stats = await suggestion_box_service_1.SuggestionBoxService.getStats(tenantId);
        return res.json({ success: true, data: stats });
    }
    catch (error) {
        console.error("Suggestion Box stats error:", error);
        return res.status(500).json({ error: error.message || "Failed to fetch stats" });
    }
});
// ─── CATEGORIES ───────────────────────────────────────────────────────────────
exports.suggestionBoxRouter.get("/categories", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const categories = await suggestion_box_service_1.SuggestionBoxService.getCategories(tenantId);
        return res.json({ success: true, data: categories });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Failed to fetch categories" });
    }
});
exports.suggestionBoxRouter.post("/categories", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const userId = req.user?.userId || "user";
        const isSuper = req.user?.roles?.includes("super_admin");
        const isHr = req.user?.roles?.some((r) => ["admin", "hr_admin", "manager"].includes(r));
        if (!isSuper && !isHr) {
            return res.status(403).json({ error: "Only administrators and managers can create categories" });
        }
        const { name, color, displayOrder, description, isActive } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: "Category name is required" });
        }
        const category = await suggestion_box_service_1.SuggestionBoxService.createCategory(tenantId, { name, color, displayOrder, description, isActive }, userId);
        return res.status(201).json({ success: true, data: category });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Failed to create category" });
    }
});
exports.suggestionBoxRouter.put("/categories/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const userId = req.user?.userId || "user";
        const category = await suggestion_box_service_1.SuggestionBoxService.updateCategory(tenantId, req.params.id, req.body, userId);
        return res.json({ success: true, data: category });
    }
    catch (error) {
        return res.status(404).json({ error: error.message || "Failed to update category" });
    }
});
exports.suggestionBoxRouter.delete("/categories/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const userId = req.user?.userId || "user";
        const ok = await suggestion_box_service_1.SuggestionBoxService.deleteCategory(tenantId, req.params.id, userId);
        if (!ok)
            return res.status(404).json({ error: "Category not found" });
        return res.json({ success: true, message: "Category deleted" });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Failed to delete category" });
    }
});
// ─── SUGGESTIONS CRUD ─────────────────────────────────────────────────────────
exports.suggestionBoxRouter.get("/suggestions", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const userId = req.user?.userId || "user";
        const isAdmin = req.user?.roles?.some((r) => ["admin", "super_admin", "hr_admin", "manager"].includes(r));
        const { search, status, categoryId, mineOnly } = req.query;
        const items = await suggestion_box_service_1.SuggestionBoxService.getSuggestions(tenantId, {
            search: search ? String(search) : undefined,
            status: status ? String(status) : undefined,
            categoryId: categoryId ? String(categoryId) : undefined,
            mineOnly: mineOnly === "true",
            currentUserId: userId,
            isAdmin,
        });
        return res.json({ success: true, data: items, count: items.length });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Failed to fetch suggestions" });
    }
});
exports.suggestionBoxRouter.get("/suggestions/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const userId = req.user?.userId || "user";
        const isAdmin = req.user?.roles?.some((r) => ["admin", "super_admin", "hr_admin", "manager"].includes(r));
        const item = await suggestion_box_service_1.SuggestionBoxService.getSuggestionById(tenantId, req.params.id, userId, isAdmin);
        if (!item)
            return res.status(404).json({ error: "Suggestion not found" });
        return res.json({ success: true, data: item });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Failed to fetch suggestion" });
    }
});
exports.suggestionBoxRouter.post("/suggestions", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const userId = req.user?.userId || "user";
        const userName = req.user?.name || req.user?.email?.split("@")[0] || "Employee";
        const { title, description, categoryId, isAnonymous } = req.body;
        if (!title || !title.trim())
            return res.status(400).json({ error: "Title is required" });
        if (!description || !description.trim())
            return res.status(400).json({ error: "Description is required" });
        if (!categoryId)
            return res.status(400).json({ error: "Category is required" });
        const suggestion = await suggestion_box_service_1.SuggestionBoxService.createSuggestion(tenantId, { title, description, categoryId, isAnonymous }, userId, userName);
        return res.status(201).json({ success: true, data: suggestion });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Failed to create suggestion" });
    }
});
exports.suggestionBoxRouter.put("/suggestions/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const userId = req.user?.userId || "user";
        const isAdmin = req.user?.roles?.some((r) => ["admin", "super_admin", "hr_admin"].includes(r));
        const updated = await suggestion_box_service_1.SuggestionBoxService.updateSuggestion(tenantId, req.params.id, req.body, userId, isAdmin);
        return res.json({ success: true, data: updated });
    }
    catch (error) {
        return res.status(400).json({ error: error.message || "Failed to update suggestion" });
    }
});
exports.suggestionBoxRouter.delete("/suggestions/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const userId = req.user?.userId || "user";
        const isAdmin = req.user?.roles?.some((r) => ["admin", "super_admin", "hr_admin"].includes(r));
        const ok = await suggestion_box_service_1.SuggestionBoxService.deleteSuggestion(tenantId, req.params.id, userId, isAdmin);
        if (!ok)
            return res.status(404).json({ error: "Suggestion not found" });
        return res.json({ success: true, message: "Suggestion deleted successfully" });
    }
    catch (error) {
        return res.status(400).json({ error: error.message || "Failed to delete suggestion" });
    }
});
// ─── VOTING ───────────────────────────────────────────────────────────────────
exports.suggestionBoxRouter.post("/suggestions/:id/vote", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const userId = req.user?.userId || "user";
        const result = await suggestion_box_service_1.SuggestionBoxService.toggleVote(tenantId, req.params.id, userId);
        return res.json({ success: true, data: result });
    }
    catch (error) {
        return res.status(400).json({ error: error.message || "Failed to toggle vote" });
    }
});
// ─── ADMIN RESPONSE & STATUS WORKFLOW ─────────────────────────────────────────
exports.suggestionBoxRouter.post("/suggestions/:id/respond", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const userId = req.user?.userId || "user";
        const userName = req.user?.name || req.user?.email?.split("@")[0] || "Administrator";
        const isAdmin = req.user?.roles?.some((r) => ["admin", "super_admin", "hr_admin", "manager"].includes(r));
        if (!isAdmin) {
            return res.status(403).json({ error: "Only administrators or managers can update suggestion status" });
        }
        const { status, responseNotes } = req.body;
        if (!status)
            return res.status(400).json({ error: "Status is required" });
        if (!responseNotes || !responseNotes.trim()) {
            return res.status(400).json({ error: "Response notes are required" });
        }
        const updated = await suggestion_box_service_1.SuggestionBoxService.adminRespond(tenantId, req.params.id, status, responseNotes, userId, userName);
        return res.json({ success: true, data: updated });
    }
    catch (error) {
        return res.status(400).json({ error: error.message || "Failed to submit response" });
    }
});
// ─── STATUS HISTORIES ─────────────────────────────────────────────────────────
exports.suggestionBoxRouter.get("/history", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const suggestionId = req.query.suggestionId ? String(req.query.suggestionId) : undefined;
        const history = await suggestion_box_service_1.SuggestionBoxService.getStatusHistories(tenantId, suggestionId);
        return res.json({ success: true, data: history });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Failed to fetch status histories" });
    }
});
// ─── EXPORT ───────────────────────────────────────────────────────────────────
exports.suggestionBoxRouter.get("/export", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId || "default";
        const format = req.query.format || "csv";
        const suggestions = await suggestion_box_service_1.SuggestionBoxService.getSuggestions(tenantId, { isAdmin: true });
        if (format === "csv") {
            const headers = ["ID", "Title", "Category", "Status", "Submitted By", "Votes", "Views", "Created At", "Admin Response"];
            const rows = suggestions.map((s) => [
                `"${s.id}"`,
                `"${s.title.replace(/"/g, '""')}"`,
                `"${s.categoryName}"`,
                `"${s.status}"`,
                `"${s.isAnonymous ? "Anonymous" : s.submittedByName}"`,
                s.voteCount,
                s.viewCount,
                `"${s.createdAt}"`,
                `"${s.adminResponse ? s.adminResponse.responseNotes.replace(/"/g, '""') : ""}"`,
            ]);
            const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", `attachment; filename=suggestions-${Date.now()}.csv`);
            return res.send(csvContent);
        }
        return res.json({ success: true, data: suggestions });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Failed to export data" });
    }
});
