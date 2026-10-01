import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { resolveTenantId } from "../lib/tenant";

export const budgetsRouter = Router();

budgetsRouter.use(requireAuth, resolveTenantContext as any);

/**
 * GET /api/budgets
 * List all budget plans for the tenant
 */
budgetsRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { status, fiscalYear, departmentId } = req.query;
    const where: any = { tenantId };

    if (status && status !== "all") {
      where.status = String(status);
    }
    if (fiscalYear && fiscalYear !== "all") {
      where.fiscalYear = String(fiscalYear);
    }
    if (departmentId && departmentId !== "all") {
      where.departmentId = String(departmentId);
    }

    const budgets = await prisma.budgetPlan.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = budgets.map((b) => {
      const budgeted = Number(b.budgetedAmount || 0);
      const spent = Number(b.spentAmount || 0);
      const remaining = Math.max(0, budgeted - spent);
      const utilization = budgeted > 0 ? Math.min(100, (spent / budgeted) * 100) : 0;

      return {
        id: b.id,
        name: b.name,
        fiscalYear: b.fiscalYear,
        periodType: b.periodType,
        departmentId: b.departmentId,
        departmentName: b.department?.name || "All Departments",
        budgetedAmount: budgeted,
        spentAmount: spent,
        remainingAmount: remaining,
        utilizationPercentage: parseFloat(utilization.toFixed(1)),
        status: b.status,
        notes: b.notes || "",
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      };
    });

    return res.json(formatted);
  } catch (err: any) {
    console.error("GET /api/budgets error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch budgets" });
  }
});

/**
 * GET /api/budgets/summary
 * Aggregate metrics across tenant budgets
 */
budgetsRouter.get("/summary", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const budgets = await prisma.budgetPlan.findMany({
      where: { tenantId },
      select: { budgetedAmount: true, spentAmount: true, status: true },
    });

    const totalBudgeted = budgets.reduce((acc, b) => acc + Number(b.budgetedAmount || 0), 0);
    const totalSpent = budgets.reduce((acc, b) => acc + Number(b.spentAmount || 0), 0);
    const totalRemaining = Math.max(0, totalBudgeted - totalSpent);
    const overallUtilization = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
    const activePlans = budgets.filter((b) => b.status === "active").length;

    return res.json({
      totalBudgeted,
      totalSpent,
      totalRemaining,
      overallUtilization: parseFloat(overallUtilization.toFixed(1)),
      activePlans,
      totalPlans: budgets.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch budget summary" });
  }
});

/**
 * POST /api/budgets
 * Create a new budget plan
 */
budgetsRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { name, fiscalYear, periodType, departmentId, budgetedAmount, spentAmount, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Budget plan name is required." });
    }

    const currentYear = new Date().getFullYear();
    const fYear = fiscalYear || `${currentYear}-${currentYear + 1}`;

    const newBudget = await prisma.budgetPlan.create({
      data: {
        tenantId,
        name: name.trim(),
        fiscalYear: fYear,
        periodType: periodType || "monthly",
        departmentId: departmentId && departmentId !== "all" ? departmentId : null,
        budgetedAmount: budgetedAmount ? Number(budgetedAmount) : 0,
        spentAmount: spentAmount ? Number(spentAmount) : 0,
        status: "active",
        notes: notes || null,
      },
      include: {
        department: { select: { id: true, name: true } },
      },
    });

    return res.status(201).json(newBudget);
  } catch (err: any) {
    console.error("POST /api/budgets error:", err);
    return res.status(500).json({ error: err.message || "Failed to create budget plan" });
  }
});

/**
 * PUT /api/budgets/:id
 * Update an existing budget plan
 */
budgetsRouter.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { id } = req.params;
    const { name, fiscalYear, periodType, departmentId, budgetedAmount, spentAmount, status, notes } = req.body;

    const existing = await prisma.budgetPlan.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return res.status(404).json({ error: "Budget plan not found" });
    }

    const updated = await prisma.budgetPlan.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(fiscalYear !== undefined ? { fiscalYear } : {}),
        ...(periodType !== undefined ? { periodType } : {}),
        ...(departmentId !== undefined ? { departmentId: departmentId && departmentId !== "all" ? departmentId : null } : {}),
        ...(budgetedAmount !== undefined ? { budgetedAmount: Number(budgetedAmount) } : {}),
        ...(spentAmount !== undefined ? { spentAmount: Number(spentAmount) } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      include: {
        department: { select: { id: true, name: true } },
      },
    });

    return res.json(updated);
  } catch (err: any) {
    console.error("PUT /api/budgets/:id error:", err);
    return res.status(500).json({ error: err.message || "Failed to update budget plan" });
  }
});

/**
 * DELETE /api/budgets/:id
 * Delete a budget plan
 */
budgetsRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { id } = req.params;

    const existing = await prisma.budgetPlan.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return res.status(404).json({ error: "Budget plan not found" });
    }

    await prisma.budgetPlan.delete({ where: { id } });
    return res.json({ success: true, message: "Budget plan deleted successfully" });
  } catch (err: any) {
    console.error("DELETE /api/budgets/:id error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete budget plan" });
  }
});
