"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategyStudioRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const tenant_1 = require("../lib/tenant");
const entitlements_1 = require("../middleware/entitlements");
const strategy_studio_service_1 = require("../services/strategy-studio.service");
exports.strategyStudioRouter = (0, express_1.Router)();
exports.strategyStudioRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
// Enforce Planning & Strategy engine dependency across all Strategy Studio tools
exports.strategyStudioRouter.use(async (req, res, next) => {
    const tenantId = (0, tenant_1.resolveTenantId)(req, res);
    if (!tenantId)
        return;
    const isSuper = req.user?.roles?.includes("super_admin") || false;
    const planningCheck = await (0, entitlements_1.checkTenantEntitlement)(tenantId, "planning", isSuper);
    if (!planningCheck.entitled) {
        return res.status(403).json({
            error: "Planning & Strategy Engine is required and is currently not active or expired on this workspace.",
            code: "DEPENDENCY_UNAVAILABLE",
            requiredAddon: "planning",
            status: planningCheck.status,
        });
    }
    next();
});
/**
 * GET /api/strategy-studio/templates/:type
 * Get matrix template structure
 */
exports.strategyStudioRouter.get("/templates/:type", (req, res) => {
    const type = req.params.type;
    const template = strategy_studio_service_1.StrategyStudioService.getTemplate(type);
    return res.json({ success: true, template });
});
/**
 * GET /api/strategy-studio/documents
 * List strategy documents for tenant
 */
exports.strategyStudioRouter.get("/documents", (req, res) => {
    const tenantId = (0, tenant_1.resolveTenantId)(req, res);
    if (!tenantId)
        return;
    const type = req.query.type;
    const docs = strategy_studio_service_1.StrategyStudioService.listDocuments(tenantId, type);
    return res.json({ success: true, documents: docs });
});
/**
 * POST /api/strategy-studio/documents
 * Create strategy matrix document from template with entitlement check
 */
exports.strategyStudioRouter.post("/documents", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { matrixType = "swot", title = "Untitled Matrix", description, initialItems } = req.body;
        const requiredAddon = matrixType === "swot" ? "swot" : matrixType === "pestel" ? "pestel" : "swot";
        const isSuper = req.user?.roles?.includes("super_admin") || false;
        const check = await (0, entitlements_1.checkTenantEntitlement)(tenantId, requiredAddon, isSuper);
        if (!check.entitled) {
            return res.status(403).json({
                error: `Add-on '${requiredAddon}' is not active on this workspace`,
                code: "ADDON_REQUIRED",
                key: requiredAddon,
            });
        }
        const doc = await strategy_studio_service_1.StrategyStudioService.createDocument(tenantId, { matrixType, title, description, initialItems }, req.user?.userId);
        return res.json({ success: true, document: doc });
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to create strategy document" });
    }
});
/**
 * POST /api/strategy-studio/documents/:id/items
 * Add an item to a category within the strategy document
 */
exports.strategyStudioRouter.post("/documents/:id/items", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { category, text, impactScore } = req.body;
        if (!category || !text) {
            return res.status(400).json({ error: "Category and text are required." });
        }
        const doc = await strategy_studio_service_1.StrategyStudioService.updateCategoryItem(tenantId, req.params.id, category, { text, impactScore }, req.user?.userId);
        return res.json({ success: true, document: doc });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to add strategy item" });
    }
});
/**
 * GET /api/strategy-studio/documents/:id/export
 * Export strategy matrix document
 */
exports.strategyStudioRouter.get("/documents/:id/export", (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const exported = strategy_studio_service_1.StrategyStudioService.exportDocument(tenantId, req.params.id);
        return res.json({ success: true, ...exported });
    }
    catch (err) {
        if (err.message?.includes("not found")) {
            return res.status(404).json({ error: "Strategy document not found." });
        }
        return res.status(500).json({ error: err.message || "Failed to export strategy document" });
    }
});
