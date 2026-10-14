import { Router, Response } from "express";
import { AuthRequest, requireAuth } from "../middleware/auth";
import { requireAddon } from "../middleware/entitlements";
import { PlanningStrategyService } from "../services/planning-strategy.service";

const router = Router();

// Apply auth and entitlement checks to all planning routes
router.use(requireAuth);
router.use(requireAddon("planning"));

function getTenantId(req: AuthRequest): string {
  return req.user?.tenantId || (req.user as any)?.tenant_id || "default";
}

function getUserId(req: AuthRequest): string {
  return req.user?.userId || (req.user as any)?.id || "user_system";
}

function getUserName(req: AuthRequest): string {
  return (req.user as any)?.name || (req.user as any)?.email || "User";
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
router.get("/dashboard", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const data = await PlanningStrategyService.getDashboard(tenantId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── CATEGORIES ─────────────────────────────────────────────────────────────
router.get("/categories", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const data = await PlanningStrategyService.getCategories(tenantId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/categories", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const data = await PlanningStrategyService.saveCategory(tenantId, req.body, userId);
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put("/categories/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const data = await PlanningStrategyService.saveCategory(tenantId, { ...req.body, id: req.params.id }, userId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete("/categories/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    await PlanningStrategyService.deleteCategory(tenantId, req.params.id);
    res.json({ success: true, message: "Category deleted successfully" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── STAGES ─────────────────────────────────────────────────────────────────
router.get("/stages", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const data = await PlanningStrategyService.getStages(tenantId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/stages", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const data = await PlanningStrategyService.saveStage(tenantId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put("/stages/reorder", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, message: "orderedIds array is required" });
    }
    const data = await PlanningStrategyService.reorderStages(tenantId, orderedIds);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put("/stages/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const data = await PlanningStrategyService.saveStage(tenantId, { ...req.body, id: req.params.id });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete("/stages/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    await PlanningStrategyService.deleteStage(tenantId, req.params.id);
    res.json({ success: true, message: "Stage deleted successfully" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── STATUSES ───────────────────────────────────────────────────────────────
router.get("/statuses", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const data = await PlanningStrategyService.getStatuses(tenantId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/statuses", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const data = await PlanningStrategyService.saveStatus(tenantId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put("/statuses/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const data = await PlanningStrategyService.saveStatus(tenantId, { ...req.body, id: req.params.id });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete("/statuses/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    await PlanningStrategyService.deleteStatus(tenantId, req.params.id);
    res.json({ success: true, message: "Status deleted successfully" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── CHALLENGES ─────────────────────────────────────────────────────────────
router.get("/challenges", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { position, categoryId, search } = req.query as any;
    const data = await PlanningStrategyService.getChallenges(tenantId, { position, categoryId, search });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/challenges/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const data = await PlanningStrategyService.getChallengeById(tenantId, req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Challenge not found" });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/challenges", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const data = await PlanningStrategyService.createChallenge(tenantId, req.body, userId);
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put("/challenges/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const data = await PlanningStrategyService.updateChallenge(tenantId, req.params.id, req.body, userId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete("/challenges/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    await PlanningStrategyService.deleteChallenge(tenantId, req.params.id, userId);
    res.json({ success: true, message: "Challenge deleted successfully" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── MODELS (CHARTERS & STRATEGY MATRICES) ──────────────────────────────────
router.get("/models", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { type, challengeId, stageId, statusId, search } = req.query as any;
    const data = await PlanningStrategyService.getModels(tenantId, {
      type: type || "charter",
      challengeId,
      stageId,
      statusId,
      search,
    });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/models/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const data = await PlanningStrategyService.getModelById(tenantId, req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Model not found" });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/models", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const data = await PlanningStrategyService.createModel(tenantId, req.body, userId);
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post("/models/:id/clone", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const data = await PlanningStrategyService.cloneModel(tenantId, req.params.id, userId);
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post("/charters/:id/clone", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const data = await PlanningStrategyService.cloneModel(tenantId, req.params.id, userId);
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put("/models/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const data = await PlanningStrategyService.updateModel(tenantId, req.params.id, req.body, userId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch("/models/:id/stage", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const { stageId } = req.body;
    if (!stageId) return res.status(400).json({ success: false, message: "stageId is required" });
    const data = await PlanningStrategyService.changeModelStage(tenantId, req.params.id, stageId, userId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put("/models/:id/rating", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const { rating } = req.body;
    const data = await PlanningStrategyService.rateModel(tenantId, req.params.id, parseInt(rating), userId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put("/models/:id/sections/:key", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const { content } = req.body;
    const data = await PlanningStrategyService.updateModelSection(
      tenantId,
      req.params.id,
      req.params.key,
      content,
      userId
    );
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete("/models/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    await PlanningStrategyService.deleteModel(tenantId, req.params.id, userId);
    res.json({ success: true, message: "Model deleted successfully" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── COMMENTS ───────────────────────────────────────────────────────────────
router.get("/models/:id/comments", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const data = await PlanningStrategyService.getComments(tenantId, req.params.id);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/models/:id/comments", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const userName = getUserName(req);
    const data = await PlanningStrategyService.addComment(tenantId, req.params.id, req.body, userId, userName);
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
