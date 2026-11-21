"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.knowledgeBaseRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const tenant_1 = require("../lib/tenant");
const knowledge_base_service_1 = require("../services/knowledge-base.service");
exports.knowledgeBaseRouter = (0, express_1.Router)();
exports.knowledgeBaseRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
// GET /api/knowledge-base/categories
exports.knowledgeBaseRouter.get("/categories", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const categories = await knowledge_base_service_1.KnowledgeBaseService.listCategories(tenantId);
        return res.json({ success: true, categories });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/knowledge-base/categories
exports.knowledgeBaseRouter.post("/categories", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { name, slug, description, icon, sortOrder } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: "Category name is required" });
        }
        const category = await knowledge_base_service_1.KnowledgeBaseService.createCategory(tenantId, {
            name,
            slug,
            description,
            icon,
            sortOrder,
        });
        return res.status(201).json({ success: true, category });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// GET /api/knowledge-base/articles
exports.knowledgeBaseRouter.get("/articles", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { categoryId, status, tag, search } = req.query;
        const articles = await knowledge_base_service_1.KnowledgeBaseService.listArticles(tenantId, {
            categoryId: categoryId,
            status: status,
            tag: tag,
            search: search,
        });
        return res.json({ success: true, articles });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// GET /api/knowledge-base/articles/:idOrSlug
exports.knowledgeBaseRouter.get("/articles/:idOrSlug", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const article = await knowledge_base_service_1.KnowledgeBaseService.getArticle(tenantId, req.params.idOrSlug);
        if (!article) {
            return res.status(404).json({ success: false, error: "Article not found" });
        }
        // Automatically count view on read
        await knowledge_base_service_1.KnowledgeBaseService.incrementView(tenantId, article.id);
        article.viewCount = (article.viewCount || 0) + 1;
        return res.json({ success: true, article });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/knowledge-base/articles
exports.knowledgeBaseRouter.post("/articles", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const userId = req.user?.userId || "user_system";
        const userName = req.user?.name || req.user?.email || "User";
        const { categoryId, title, slug, summary, content, tags, status } = req.body;
        if (!categoryId || !title || !content) {
            return res.status(400).json({
                success: false,
                error: "categoryId, title, and content are required",
            });
        }
        const article = await knowledge_base_service_1.KnowledgeBaseService.createArticle(tenantId, { categoryId, title, slug, summary, content, tags, status }, userId, userName);
        return res.status(201).json({ success: true, article });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/knowledge-base/articles/:id/vote
exports.knowledgeBaseRouter.post("/articles/:id/vote", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { helpful } = req.body;
        if (helpful === undefined) {
            return res.status(400).json({ success: false, error: "helpful boolean flag is required" });
        }
        const article = await knowledge_base_service_1.KnowledgeBaseService.voteArticle(tenantId, req.params.id, Boolean(helpful));
        return res.json({ success: true, article });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
