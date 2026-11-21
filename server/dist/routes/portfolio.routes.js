"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.portfolioRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const tenant_1 = require("../lib/tenant");
const portfolio_service_1 = require("../services/portfolio.service");
exports.portfolioRouter = (0, express_1.Router)();
exports.portfolioRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
// GET /api/portfolio
exports.portfolioRouter.get("/", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { category, status, tech, search } = req.query;
        const items = await portfolio_service_1.PortfolioService.listItems(tenantId, {
            category: category,
            status: status,
            tech: tech,
            search: search,
        });
        return res.json({ success: true, items });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// GET /api/portfolio/:idOrSlug
exports.portfolioRouter.get("/:idOrSlug", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const item = await portfolio_service_1.PortfolioService.getItem(tenantId, req.params.idOrSlug);
        if (!item) {
            return res.status(404).json({ success: false, error: "Portfolio item not found" });
        }
        return res.json({ success: true, item });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/portfolio
exports.portfolioRouter.post("/", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const userId = req.user?.userId || "user_system";
        const { title, clientName, category, description } = req.body;
        if (!title || !clientName || !description) {
            return res.status(400).json({
                success: false,
                error: "title, clientName, and description are required",
            });
        }
        const item = await portfolio_service_1.PortfolioService.createItem(tenantId, req.body, userId);
        return res.status(201).json({ success: true, item });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// PUT /api/portfolio/:id
exports.portfolioRouter.put("/:id", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const updated = await portfolio_service_1.PortfolioService.updateItem(tenantId, req.params.id, req.body);
        return res.json({ success: true, item: updated });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// DELETE /api/portfolio/:id
exports.portfolioRouter.delete("/:id", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const deleted = await portfolio_service_1.PortfolioService.deleteItem(tenantId, req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: "Portfolio item not found" });
        }
        return res.json({ success: true, message: "Portfolio item deleted" });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
