import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { requireEntitlement } from "../middleware/entitlements";
import { SuggestionBoxService, SuggestionStatus } from "../services/suggestion-box.service";

export const suggestionBoxRouter = Router();

// Gating: Require authenticated user, tenant context, and entitlement check
suggestionBoxRouter.use(requireAuth, resolveTenantContext, requireEntitlement("suggestion-box"));

// ─── DASHBOARD METRICS ────────────────────────────────────────────────────────

suggestionBoxRouter.get("/stats", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const stats = await SuggestionBoxService.getStats(tenantId);
    return res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error("Suggestion Box stats error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch stats" });
  }
});

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

suggestionBoxRouter.get("/categories", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const categories = await SuggestionBoxService.getCategories(tenantId);
    return res.json({ success: true, data: categories });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch categories" });
  }
});

suggestionBoxRouter.post("/categories", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
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

    const category = await SuggestionBoxService.createCategory(
      tenantId,
      { name, color, displayOrder, description, isActive },
      userId
    );
    return res.status(201).json({ success: true, data: category });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to create category" });
  }
});

suggestionBoxRouter.put("/categories/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const userId = req.user?.userId || "user";
    const category = await SuggestionBoxService.updateCategory(tenantId, req.params.id, req.body, userId);
    return res.json({ success: true, data: category });
  } catch (error: any) {
    return res.status(404).json({ error: error.message || "Failed to update category" });
  }
});

suggestionBoxRouter.delete("/categories/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const userId = req.user?.userId || "user";
    const ok = await SuggestionBoxService.deleteCategory(tenantId, req.params.id, userId);
    if (!ok) return res.status(404).json({ error: "Category not found" });
    return res.json({ success: true, message: "Category deleted" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to delete category" });
  }
});

// ─── SUGGESTIONS CRUD ─────────────────────────────────────────────────────────

suggestionBoxRouter.get("/suggestions", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const userId = req.user?.userId || "user";
    const isAdmin = req.user?.roles?.some((r) => ["admin", "super_admin", "hr_admin", "manager"].includes(r));

    const { search, status, categoryId, mineOnly } = req.query;
    const items = await SuggestionBoxService.getSuggestions(tenantId, {
      search: search ? String(search) : undefined,
      status: status ? String(status) : undefined,
      categoryId: categoryId ? String(categoryId) : undefined,
      mineOnly: mineOnly === "true",
      currentUserId: userId,
      isAdmin,
    });

    return res.json({ success: true, data: items, count: items.length });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch suggestions" });
  }
});

suggestionBoxRouter.get("/suggestions/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const userId = req.user?.userId || "user";
    const isAdmin = req.user?.roles?.some((r) => ["admin", "super_admin", "hr_admin", "manager"].includes(r));

    const item = await SuggestionBoxService.getSuggestionById(tenantId, req.params.id, userId, isAdmin);
    if (!item) return res.status(404).json({ error: "Suggestion not found" });
    return res.json({ success: true, data: item });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch suggestion" });
  }
});

suggestionBoxRouter.post("/suggestions", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const userId = req.user?.userId || "user";
    const userName = (req.user as any)?.name || (req.user as any)?.email?.split("@")[0] || "Employee";

    const { title, description, categoryId, isAnonymous } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: "Title is required" });
    if (!description || !description.trim()) return res.status(400).json({ error: "Description is required" });
    if (!categoryId) return res.status(400).json({ error: "Category is required" });

    const suggestion = await SuggestionBoxService.createSuggestion(
      tenantId,
      { title, description, categoryId, isAnonymous },
      userId,
      userName
    );
    return res.status(201).json({ success: true, data: suggestion });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to create suggestion" });
  }
});

suggestionBoxRouter.put("/suggestions/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const userId = req.user?.userId || "user";
    const isAdmin = req.user?.roles?.some((r) => ["admin", "super_admin", "hr_admin"].includes(r));

    const updated = await SuggestionBoxService.updateSuggestion(tenantId, req.params.id, req.body, userId, isAdmin);
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || "Failed to update suggestion" });
  }
});

suggestionBoxRouter.delete("/suggestions/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const userId = req.user?.userId || "user";
    const isAdmin = req.user?.roles?.some((r) => ["admin", "super_admin", "hr_admin"].includes(r));

    const ok = await SuggestionBoxService.deleteSuggestion(tenantId, req.params.id, userId, isAdmin);
    if (!ok) return res.status(404).json({ error: "Suggestion not found" });
    return res.json({ success: true, message: "Suggestion deleted successfully" });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || "Failed to delete suggestion" });
  }
});

// ─── VOTING ───────────────────────────────────────────────────────────────────

suggestionBoxRouter.post("/suggestions/:id/vote", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const userId = req.user?.userId || "user";

    const result = await SuggestionBoxService.toggleVote(tenantId, req.params.id, userId);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || "Failed to toggle vote" });
  }
});

// ─── ADMIN RESPONSE & STATUS WORKFLOW ─────────────────────────────────────────

suggestionBoxRouter.post("/suggestions/:id/respond", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const userId = req.user?.userId || "user";
    const userName = (req.user as any)?.name || (req.user as any)?.email?.split("@")[0] || "Administrator";
    const isAdmin = req.user?.roles?.some((r) => ["admin", "super_admin", "hr_admin", "manager"].includes(r));

    if (!isAdmin) {
      return res.status(403).json({ error: "Only administrators or managers can update suggestion status" });
    }

    const { status, responseNotes } = req.body;
    if (!status) return res.status(400).json({ error: "Status is required" });
    if (!responseNotes || !responseNotes.trim()) {
      return res.status(400).json({ error: "Response notes are required" });
    }

    const updated = await SuggestionBoxService.adminRespond(
      tenantId,
      req.params.id,
      status as SuggestionStatus,
      responseNotes,
      userId,
      userName
    );
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || "Failed to submit response" });
  }
});

// ─── STATUS HISTORIES ─────────────────────────────────────────────────────────

suggestionBoxRouter.get("/history", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const suggestionId = req.query.suggestionId ? String(req.query.suggestionId) : undefined;
    const history = await SuggestionBoxService.getStatusHistories(tenantId, suggestionId);
    return res.json({ success: true, data: history });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch status histories" });
  }
});

// ─── EXPORT ───────────────────────────────────────────────────────────────────

suggestionBoxRouter.get("/export", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const format = (req.query.format as string) || "csv";
    const suggestions = await SuggestionBoxService.getSuggestions(tenantId, { isAdmin: true });

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
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to export data" });
  }
});
