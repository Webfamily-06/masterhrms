import { Router, Response } from "express";
import { FinancialGoalService } from "../services/financial-goal.service";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";

export const financialGoalsRouter = Router();

financialGoalsRouter.use(requireAuth, resolveTenantContext as any);

/**
 * GET /api/financial-goals
 * List all financial goals
 */
financialGoalsRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { status, goalType, search } = req.query;

    const goals = await FinancialGoalService.list(tenantId, {
      status: status ? String(status) : undefined,
      goalType: goalType ? String(goalType) : undefined,
      search: search ? String(search) : undefined,
    });

    return res.json({ goals, total: goals.length });
  } catch (err: any) {
    console.error("[financial-goals:list] error:", err);
    return res.status(500).json({ error: err.message || "Failed to load financial goals." });
  }
});

/**
 * GET /api/financial-goals/:id
 * Get single financial goal
 */
financialGoalsRouter.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const goal = await FinancialGoalService.getById(tenantId, req.params.id);

    if (!goal) {
      return res.status(404).json({ error: "Financial goal not found." });
    }

    return res.json({ goal });
  } catch (err: any) {
    console.error("[financial-goals:get] error:", err);
    return res.status(500).json({ error: err.message || "Failed to load financial goal." });
  }
});

/**
 * POST /api/financial-goals
 * Create a new financial goal
 */
financialGoalsRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { name, goalType, targetAmount, currentAmount, startDate, targetDate, description } = req.body;

    if (!name || !targetAmount || !startDate || !targetDate) {
      return res.status(400).json({ error: "Missing required fields: name, targetAmount, startDate, targetDate" });
    }

    const goal = await FinancialGoalService.create(tenantId, {
      name,
      goalType,
      targetAmount,
      currentAmount,
      startDate,
      targetDate,
      description,
    });

    return res.status(201).json({ goal });
  } catch (err: any) {
    console.error("[financial-goals:create] error:", err);
    return res.status(500).json({ error: err.message || "Failed to create financial goal." });
  }
});

/**
 * PUT /api/financial-goals/:id
 * Update financial goal
 */
financialGoalsRouter.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const goal = await FinancialGoalService.update(tenantId, req.params.id, req.body);
    return res.json({ goal });
  } catch (err: any) {
    console.error("[financial-goals:update] error:", err);
    const status = err.message === "Financial goal not found." ? 404 : 500;
    return res.status(status).json({ error: err.message || "Failed to update financial goal." });
  }
});

/**
 * POST /api/financial-goals/:id/progress
 * Record progress towards financial goal
 */
financialGoalsRouter.post("/:id/progress", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { amount } = req.body;

    if (amount === undefined || isNaN(Number(amount))) {
      return res.status(400).json({ error: "Valid progress amount is required." });
    }

    const goal = await FinancialGoalService.recordProgress(tenantId, req.params.id, Number(amount));
    return res.json({ goal });
  } catch (err: any) {
    console.error("[financial-goals:recordProgress] error:", err);
    const status = err.message === "Financial goal not found." ? 404 : 500;
    return res.status(status).json({ error: err.message || "Failed to record progress." });
  }
});

/**
 * DELETE /api/financial-goals/:id
 * Delete financial goal
 */
financialGoalsRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    await FinancialGoalService.delete(tenantId, req.params.id);
    return res.json({ success: true, message: "Financial goal deleted." });
  } catch (err: any) {
    console.error("[financial-goals:delete] error:", err);
    const status = err.message === "Financial goal not found." ? 404 : 500;
    return res.status(status).json({ error: err.message || "Failed to delete financial goal." });
  }
});
