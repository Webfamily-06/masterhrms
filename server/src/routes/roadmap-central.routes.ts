import { Router, Response } from "express";
import { RoadmapCentralService } from "../services/roadmap-central.service";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";

export const roadmapCentralRouter = Router();

roadmapCentralRouter.use(requireAuth, resolveTenantContext as any);

/**
 * GET /api/roadmap
 * List roadmap items
 */
roadmapCentralRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { horizon, status, category } = req.query;

    const items = await RoadmapCentralService.listItems(tenantId, {
      horizon: horizon as any,
      status: status as any,
      category: category ? String(category) : undefined,
    });

    return res.json({ items, total: items.length });
  } catch (err: any) {
    console.error("[roadmap:list] error:", err);
    return res.status(500).json({ error: err.message || "Failed to load roadmap items." });
  }
});

/**
 * POST /api/roadmap
 * Create roadmap item
 */
roadmapCentralRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { title, description, category, horizon, priority } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Roadmap title is required." });
    }

    const item = await RoadmapCentralService.createItem(tenantId, {
      title,
      description,
      category,
      horizon,
      priority,
    });

    return res.status(201).json({ item });
  } catch (err: any) {
    console.error("[roadmap:create] error:", err);
    return res.status(500).json({ error: err.message || "Failed to create roadmap item." });
  }
});

/**
 * PUT /api/roadmap/:id/status
 * Update status
 */
roadmapCentralRouter.put("/:id/status", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required." });
    }

    const item = await RoadmapCentralService.updateStatus(tenantId, req.params.id, status);
    return res.json({ item });
  } catch (err: any) {
    console.error("[roadmap:status] error:", err);
    return res.status(500).json({ error: err.message || "Failed to update status." });
  }
});

/**
 * POST /api/roadmap/:id/upvote
 * Toggle upvote
 */
roadmapCentralRouter.post("/:id/upvote", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const userId = req.user?.userId || (req.user as any)?.id || "user";

    const item = await RoadmapCentralService.toggleUpvote(tenantId, req.params.id, userId);
    return res.json({ item });
  } catch (err: any) {
    console.error("[roadmap:upvote] error:", err);
    return res.status(500).json({ error: err.message || "Failed to toggle upvote." });
  }
});

/**
 * DELETE /api/roadmap/:id
 * Delete roadmap item
 */
roadmapCentralRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    await RoadmapCentralService.deleteItem(tenantId, req.params.id);
    return res.json({ success: true, message: "Roadmap item deleted." });
  } catch (err: any) {
    console.error("[roadmap:delete] error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete roadmap item." });
  }
});
