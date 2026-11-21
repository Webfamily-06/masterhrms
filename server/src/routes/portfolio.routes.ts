import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { resolveTenantId } from "../lib/tenant";
import { PortfolioService, PortfolioCategory, PortfolioStatus } from "../services/portfolio.service";

export const portfolioRouter = Router();

portfolioRouter.use(requireAuth, resolveTenantContext);

// GET /api/portfolio
portfolioRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { category, status, tech, search } = req.query;
    const items = await PortfolioService.listItems(tenantId, {
      category: category as PortfolioCategory,
      status: status as PortfolioStatus,
      tech: tech as string,
      search: search as string,
    });
    return res.json({ success: true, items });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/portfolio/:idOrSlug
portfolioRouter.get("/:idOrSlug", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const item = await PortfolioService.getItem(tenantId, req.params.idOrSlug);
    if (!item) {
      return res.status(404).json({ success: false, error: "Portfolio item not found" });
    }
    return res.json({ success: true, item });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/portfolio
portfolioRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const userId = req.user?.userId || "user_system";
    const { title, clientName, category, description } = req.body;

    if (!title || !clientName || !description) {
      return res.status(400).json({
        success: false,
        error: "title, clientName, and description are required",
      });
    }

    const item = await PortfolioService.createItem(tenantId, req.body, userId);
    return res.status(201).json({ success: true, item });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/portfolio/:id
portfolioRouter.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const updated = await PortfolioService.updateItem(tenantId, req.params.id, req.body);
    return res.json({ success: true, item: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/portfolio/:id
portfolioRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const deleted = await PortfolioService.deleteItem(tenantId, req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Portfolio item not found" });
    }
    return res.json({ success: true, message: "Portfolio item deleted" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
