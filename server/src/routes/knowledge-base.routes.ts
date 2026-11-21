import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { resolveTenantId } from "../lib/tenant";
import { KnowledgeBaseService, ArticleStatus } from "../services/knowledge-base.service";

export const knowledgeBaseRouter = Router();

knowledgeBaseRouter.use(requireAuth, resolveTenantContext);

// GET /api/knowledge-base/categories
knowledgeBaseRouter.get("/categories", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const categories = await KnowledgeBaseService.listCategories(tenantId);
    return res.json({ success: true, categories });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/knowledge-base/categories
knowledgeBaseRouter.post("/categories", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { name, slug, description, icon, sortOrder } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: "Category name is required" });
    }

    const category = await KnowledgeBaseService.createCategory(tenantId, {
      name,
      slug,
      description,
      icon,
      sortOrder,
    });
    return res.status(201).json({ success: true, category });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/knowledge-base/articles
knowledgeBaseRouter.get("/articles", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { categoryId, status, tag, search } = req.query;
    const articles = await KnowledgeBaseService.listArticles(tenantId, {
      categoryId: categoryId as string,
      status: status as ArticleStatus,
      tag: tag as string,
      search: search as string,
    });
    return res.json({ success: true, articles });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/knowledge-base/articles/:idOrSlug
knowledgeBaseRouter.get("/articles/:idOrSlug", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const article = await KnowledgeBaseService.getArticle(tenantId, req.params.idOrSlug);
    if (!article) {
      return res.status(404).json({ success: false, error: "Article not found" });
    }

    // Automatically count view on read
    await KnowledgeBaseService.incrementView(tenantId, article.id);
    article.viewCount = (article.viewCount || 0) + 1;

    return res.json({ success: true, article });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/knowledge-base/articles
knowledgeBaseRouter.post("/articles", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const userId = req.user?.userId || "user_system";
    const userName = (req.user as any)?.name || (req.user as any)?.email || "User";
    const { categoryId, title, slug, summary, content, tags, status } = req.body;

    if (!categoryId || !title || !content) {
      return res.status(400).json({
        success: false,
        error: "categoryId, title, and content are required",
      });
    }

    const article = await KnowledgeBaseService.createArticle(
      tenantId,
      { categoryId, title, slug, summary, content, tags, status },
      userId,
      userName
    );
    return res.status(201).json({ success: true, article });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/knowledge-base/articles/:id/vote
knowledgeBaseRouter.post("/articles/:id/vote", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { helpful } = req.body;
    if (helpful === undefined) {
      return res.status(400).json({ success: false, error: "helpful boolean flag is required" });
    }

    const article = await KnowledgeBaseService.voteArticle(tenantId, req.params.id, Boolean(helpful));
    return res.json({ success: true, article });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
