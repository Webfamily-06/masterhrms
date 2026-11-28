import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { isHrOrAdminUser, requireHrOrAdmin } from "../middleware/hr-rbac.middleware";
import { getTenantDb } from "../context/tenant-context";
import { PerformanceService } from "../services/performance.service";

export const hrPerformanceRouter = Router();

// DEFECT-041: Enforce HR/Admin/Manager RBAC on performance mutations while permitting employee self-service goal progress updates
hrPerformanceRouter.use(
  requireAuth,
  resolveTenantContext,
  requireHrOrAdmin({
    allowReads: true,
    allowedPermissions: ["hrm.performance", "performance.manage"],
    allowSelfService: [
      { method: "PATCH", pattern: /^\/goals\/[^/]+\/progress\/?$/i },
    ],
    deniedMessage: "Access denied: HR Administrator or Manager privileges are required to manage performance records.",
  })
);

// =========================================================================
// 0. PERFORMANCE OVERVIEW
// =========================================================================
hrPerformanceRouter.get("/overview", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const metrics = await PerformanceService.getOverviewMetrics(tenantId);
    return res.json(metrics);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load performance overview." });
  }
});

function slugifyCode(name: string): string {
  const base = String(name || "ITEM")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 36);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base || "ITEM"}_${suffix}`;
}

function normalizeGoalStatus(raw?: string | null): "not_started" | "in_progress" | "completed" {
  const s = String(raw || "").toLowerCase().trim();
  if (s === "completed" || s === "achieved" || s === "done") return "completed";
  if (s === "in_progress" || s === "in progress" || s === "active") return "in_progress";
  return "not_started";
}

function formatGoalRecord(g: any) {
  const empAvatar = g.owner?.user?.profile?.avatarUrl || null;
  const employeeObj = g.owner
    ? {
        id: g.owner.id,
        firstName: g.owner.firstName,
        lastName: g.owner.lastName,
        email: g.owner.email,
        employeeCode: g.owner.employeeCode,
        position: g.owner.position,
        avatarUrl: empAvatar,
      }
    : null;
  return {
    id: g.id,
    tenantId: g.tenantId,
    cycleId: g.cycleId,
    goalTypeId: g.goalTypeId,
    goalType: g.goalType
      ? { id: g.goalType.id, name: g.goalType.name, code: g.goalType.code }
      : g.category
      ? { id: g.goalTypeId || "", name: g.category, code: "" }
      : null,
    category: g.goalType?.name || g.category || "General",
    title: g.title,
    description: g.description || "",
    target: g.target || "",
    startDate: g.startDate
      ? new Date(g.startDate).toISOString().split("T")[0]
      : new Date(g.createdAt).toISOString().split("T")[0],
    endDate: g.endDate ? new Date(g.endDate).toISOString().split("T")[0] : "",
    ownerId: g.ownerId,
    employeeId: g.ownerId,
    owner: employeeObj,
    employee: employeeObj,
    progress: Number(g.progress || 0),
    status: normalizeGoalStatus(g.status),
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
}

// =========================================================================
// 1. REVIEW CYCLES (HR-PF-03)
// =========================================================================
hrPerformanceRouter.get("/cycles", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const cycles = await db.okrCycle.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { objectives: true, reviews: true },
        },
      },
    });
    return res.json(
      cycles.map((c) => ({
        ...c,
        title: c.name,
        frequency: c.periodType,
      }))
    );
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch cycles." });
  }
});

hrPerformanceRouter.post("/cycles", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { name, title, periodType, frequency, description, status, startDate, endDate } = req.body || {};
    const cycleName = String(name || title || "").trim();
    if (!cycleName) {
      return res.status(400).json({ error: "Review cycle name is required." });
    }
    const year = new Date().getFullYear();
    const cycle = await db.okrCycle.create({
      data: {
        tenantId,
        name: cycleName,
        periodType: String(frequency || periodType || "quarterly").toLowerCase(),
        description: description ? String(description).trim() : null,
        startDate: startDate ? new Date(startDate) : new Date(`${year}-01-01`),
        endDate: endDate ? new Date(endDate) : new Date(`${year}-12-31`),
        status: String(status || "active").toLowerCase(),
      },
    });
    return res.status(201).json({ ...cycle, title: cycle.name, frequency: cycle.periodType });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create cycle." });
  }
});

hrPerformanceRouter.put("/cycles/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.okrCycle.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Review cycle not found." });

    const { name, title, periodType, frequency, description, status, startDate, endDate } = req.body || {};
    const updated = await db.okrCycle.update({
      where: { id: existing.id },
      data: {
        ...(name || title ? { name: String(name || title).trim() } : {}),
        ...(frequency || periodType ? { periodType: String(frequency || periodType).toLowerCase() } : {}),
        ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
        ...(status ? { status: String(status).toLowerCase() } : {}),
        ...(startDate ? { startDate: new Date(startDate) } : {}),
        ...(endDate ? { endDate: new Date(endDate) } : {}),
      },
    });
    return res.json({ ...updated, title: updated.name, frequency: updated.periodType });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update cycle." });
  }
});

hrPerformanceRouter.put("/cycles/:id/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const cycle = await PerformanceService.updateCycleStatus(tenantId, actorId, req.params.id, req.body.status);
    return res.json(cycle);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update cycle status." });
  }
});

hrPerformanceRouter.patch("/cycles/:id/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.okrCycle.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Review cycle not found." });
    const nextStatus = req.body?.status
      ? String(req.body.status).toLowerCase()
      : existing.status === "active"
      ? "inactive"
      : "active";
    const updated = await db.okrCycle.update({
      where: { id: existing.id },
      data: { status: nextStatus },
    });
    return res.json({ ...updated, title: updated.name, frequency: updated.periodType });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update cycle status." });
  }
});

hrPerformanceRouter.delete("/cycles/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.okrCycle.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Review cycle not found." });
    await db.okrCycle.delete({ where: { id: existing.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete cycle." });
  }
});

// =========================================================================
// 2. GOALS & OKRs (HR-PF-02)
// =========================================================================
hrPerformanceRouter.get("/goals", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { cycleId, employeeId, goalTypeId, status } = req.query;
    const db = getTenantDb();

    const where: any = { tenantId };
    if (cycleId && cycleId !== "all") where.cycleId = String(cycleId);
    if (employeeId && employeeId !== "all") where.ownerId = String(employeeId);
    if (goalTypeId && goalTypeId !== "all") where.goalTypeId = String(goalTypeId);

    const goals = await db.okrObjective.findMany({
      where,
      include: {
        goalType: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            position: true,
            user: { select: { profile: { select: { avatarUrl: true } } } },
          },
        },
        keyResults: { include: { checkins: { take: 5, orderBy: { createdAt: "desc" } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    let formatted = goals.map(formatGoalRecord);
    if (status && status !== "all") {
      const target = normalizeGoalStatus(String(status));
      formatted = formatted.filter((g) => g.status === target);
    }
    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch goals." });
  }
});

hrPerformanceRouter.post("/goals", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const {
      employeeId,
      ownerId,
      goalTypeId,
      cycleId,
      title,
      description,
      target,
      startDate,
      endDate,
      progress,
      status,
    } = req.body || {};

    const resolvedOwnerId = employeeId || ownerId;
    if (!resolvedOwnerId || !title?.trim()) {
      return res.status(400).json({ error: "Employee and Goal Title are required." });
    }

    let categoryName = "General";
    if (goalTypeId) {
      const gt = await db.goalTypeMaster.findFirst({ where: { id: goalTypeId, tenantId } });
      if (gt) categoryName = gt.name;
    }

    const numericProgress = Math.min(100, Math.max(0, Number(progress ?? 0)));
    const resolvedStatus = status
      ? normalizeGoalStatus(status)
      : numericProgress >= 100
      ? "completed"
      : numericProgress > 0
      ? "in_progress"
      : "not_started";

    const created = await db.okrObjective.create({
      data: {
        tenantId,
        ownerId: resolvedOwnerId,
        cycleId: cycleId || null,
        goalTypeId: goalTypeId || null,
        category: categoryName,
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        target: target ? String(target).trim() : null,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        progress: numericProgress,
        status: resolvedStatus,
      },
      include: {
        goalType: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            position: true,
            user: { select: { profile: { select: { avatarUrl: true } } } },
          },
        },
      },
    });
    return res.status(201).json(formatGoalRecord(created));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create goal." });
  }
});

hrPerformanceRouter.put("/goals/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.okrObjective.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Employee goal not found." });

    const {
      employeeId,
      ownerId,
      goalTypeId,
      title,
      description,
      target,
      startDate,
      endDate,
      progress,
      status,
    } = req.body || {};

    let categoryName = existing.category;
    if (goalTypeId) {
      const gt = await db.goalTypeMaster.findFirst({ where: { id: goalTypeId, tenantId } });
      if (gt) categoryName = gt.name;
    }

    const numericProgress =
      progress !== undefined && progress !== ""
        ? Math.min(100, Math.max(0, Number(progress)))
        : undefined;

    const updated = await db.okrObjective.update({
      where: { id: existing.id },
      data: {
        ...(employeeId || ownerId ? { ownerId: employeeId || ownerId } : {}),
        ...(goalTypeId !== undefined ? { goalTypeId: goalTypeId || null, category: categoryName } : {}),
        ...(title ? { title: String(title).trim() } : {}),
        ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
        ...(target !== undefined ? { target: target ? String(target).trim() : null } : {}),
        ...(startDate ? { startDate: new Date(startDate) } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
        ...(numericProgress !== undefined ? { progress: numericProgress } : {}),
        ...(status ? { status: normalizeGoalStatus(status) } : {}),
      },
      include: {
        goalType: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            position: true,
            user: { select: { profile: { select: { avatarUrl: true } } } },
          },
        },
      },
    });
    return res.json(formatGoalRecord(updated));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update goal." });
  }
});

hrPerformanceRouter.patch("/goals/:id/progress", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.okrObjective.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Employee goal not found." });

    // Non-HR employees may only update progress on their own goals
    if (!isHrOrAdminUser(req, ["hrm.performance", "performance.manage"])) {
      const callerEmp = await db.employee.findFirst({
        where: { tenantId, userId: req.user?.userId },
        select: { id: true },
      });
      if (!callerEmp || existing.ownerId !== callerEmp.id) {
        return res.status(403).json({
          error: "Access denied: You can only update progress on your own performance goals.",
          code: "OWNERSHIP_REQUIRED",
        });
      }
    }

    const numericProgress = Math.min(100, Math.max(0, Number(req.body?.progress ?? 0)));
    const nextStatus = req.body?.status
      ? normalizeGoalStatus(req.body.status)
      : numericProgress >= 100
      ? "completed"
      : numericProgress > 0
      ? "in_progress"
      : "not_started";

    const updated = await db.okrObjective.update({
      where: { id: existing.id },
      data: { progress: numericProgress, status: nextStatus },
      include: {
        goalType: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            position: true,
            user: { select: { profile: { select: { avatarUrl: true } } } },
          },
        },
      },
    });
    return res.json(formatGoalRecord(updated));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update goal progress." });
  }
});

hrPerformanceRouter.delete("/goals/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.okrObjective.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Employee goal not found." });
    await db.okrObjective.delete({ where: { id: existing.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete goal." });
  }
});

// =========================================================================
// 3. INDICATORS & COMPETENCIES (HR-PF-04)
// =========================================================================
hrPerformanceRouter.get("/indicators", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const activeOnly = req.query.activeOnly === "true";
    const indicators = await db.performanceIndicator.findMany({
      where: { tenantId, ...(activeOnly ? { isActive: true } : {}) },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
    return res.json(
      indicators.map((ind) => ({
        ...ind,
        weight: Number(ind.weight || 1),
        status: ind.isActive ? "active" : "inactive",
      }))
    );
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch indicators." });
  }
});

hrPerformanceRouter.post("/indicators", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const {
      name,
      categoryId,
      code,
      description,
      measurementUnit,
      targetValue,
      weight,
      status,
      isActive,
    } = req.body || {};

    if (!name?.trim() || !categoryId) {
      return res.status(400).json({ error: "Indicator Name and Category are required." });
    }

    const activeFlag =
      isActive !== undefined
        ? Boolean(isActive)
        : status !== undefined
        ? String(status).toLowerCase() !== "inactive"
        : true;

    const created = await db.performanceIndicator.create({
      data: {
        tenantId,
        categoryId,
        name: String(name).trim(),
        code: code ? String(code).trim().toUpperCase() : slugifyCode(name),
        description: description ? String(description).trim() : null,
        measurementUnit: measurementUnit ? String(measurementUnit).trim() : "Rating",
        targetValue: targetValue ? String(targetValue).trim() : null,
        weight: weight !== undefined && weight !== "" ? Number(weight) : 1,
        isActive: activeFlag,
      },
      include: { category: true },
    });
    return res.status(201).json({
      ...created,
      weight: Number(created.weight || 1),
      status: created.isActive ? "active" : "inactive",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create indicator." });
  }
});

hrPerformanceRouter.put("/indicators/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.performanceIndicator.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Performance indicator not found." });

    const { name, categoryId, description, measurementUnit, targetValue, weight, status, isActive } =
      req.body || {};
    const activeFlag =
      isActive !== undefined
        ? Boolean(isActive)
        : status !== undefined
        ? String(status).toLowerCase() !== "inactive"
        : undefined;

    const updated = await db.performanceIndicator.update({
      where: { id: existing.id },
      data: {
        ...(name ? { name: String(name).trim() } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
        ...(measurementUnit !== undefined
          ? { measurementUnit: measurementUnit ? String(measurementUnit).trim() : "Rating" }
          : {}),
        ...(targetValue !== undefined ? { targetValue: targetValue ? String(targetValue).trim() : null } : {}),
        ...(weight !== undefined && weight !== "" ? { weight: Number(weight) } : {}),
        ...(activeFlag !== undefined ? { isActive: activeFlag } : {}),
      },
      include: { category: true },
    });
    return res.json({
      ...updated,
      weight: Number(updated.weight || 1),
      status: updated.isActive ? "active" : "inactive",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update indicator." });
  }
});

hrPerformanceRouter.patch("/indicators/:id/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.performanceIndicator.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Performance indicator not found." });

    const nextActive =
      req.body?.isActive !== undefined
        ? Boolean(req.body.isActive)
        : req.body?.status !== undefined
        ? String(req.body.status).toLowerCase() !== "inactive"
        : !existing.isActive;

    const updated = await db.performanceIndicator.update({
      where: { id: existing.id },
      data: { isActive: nextActive },
      include: { category: true },
    });
    return res.json({
      ...updated,
      weight: Number(updated.weight || 1),
      status: updated.isActive ? "active" : "inactive",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to toggle indicator status." });
  }
});

hrPerformanceRouter.delete("/indicators/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.performanceIndicator.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Performance indicator not found." });
    await db.performanceIndicator.delete({ where: { id: existing.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete indicator." });
  }
});

// =========================================================================
// 4. GOAL TYPES & INDICATOR CATEGORIES (HR-PF-05, HR-PF-06)
// =========================================================================
hrPerformanceRouter.get("/goal-types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const types = await db.goalTypeMaster.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    return res.json(
      types.map((t) => ({
        ...t,
        status: t.isActive ? "active" : "inactive",
      }))
    );
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch goal types." });
  }
});

hrPerformanceRouter.post("/goal-types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { name, code, measurementType, unit, description, status, isActive } = req.body || {};
    if (!name?.trim()) {
      return res.status(400).json({ error: "Goal Type Name is required." });
    }
    const activeFlag =
      isActive !== undefined
        ? Boolean(isActive)
        : status !== undefined
        ? String(status).toLowerCase() !== "inactive"
        : true;

    const item = await db.goalTypeMaster.create({
      data: {
        tenantId,
        name: String(name).trim(),
        code: code ? String(code).trim().toUpperCase() : slugifyCode(name),
        measurementType: measurementType || "percentage",
        unit: unit || null,
        description: description ? String(description).trim() : null,
        isActive: activeFlag,
      },
    });
    return res.status(201).json({ ...item, status: item.isActive ? "active" : "inactive" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create goal type." });
  }
});

hrPerformanceRouter.put("/goal-types/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.goalTypeMaster.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Goal type not found." });

    const { name, description, status, isActive } = req.body || {};
    const activeFlag =
      isActive !== undefined
        ? Boolean(isActive)
        : status !== undefined
        ? String(status).toLowerCase() !== "inactive"
        : undefined;

    const updated = await db.goalTypeMaster.update({
      where: { id: existing.id },
      data: {
        ...(name ? { name: String(name).trim() } : {}),
        ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
        ...(activeFlag !== undefined ? { isActive: activeFlag } : {}),
      },
    });
    return res.json({ ...updated, status: updated.isActive ? "active" : "inactive" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update goal type." });
  }
});

hrPerformanceRouter.delete("/goal-types/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.goalTypeMaster.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Goal type not found." });
    await db.goalTypeMaster.delete({ where: { id: existing.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete goal type." });
  }
});

hrPerformanceRouter.get("/indicator-categories", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const categories = await db.indicatorCategory.findMany({
      where: { tenantId },
      include: { _count: { select: { indicators: true } } },
      orderBy: { createdAt: "desc" },
    });
    return res.json(
      categories.map((c) => ({
        ...c,
        status: c.isActive ? "active" : "inactive",
      }))
    );
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch indicator categories." });
  }
});

hrPerformanceRouter.post("/indicator-categories", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { name, code, description, defaultWeight, status, isActive } = req.body || {};
    if (!name?.trim()) {
      return res.status(400).json({ error: "Category Name is required." });
    }
    const activeFlag =
      isActive !== undefined
        ? Boolean(isActive)
        : status !== undefined
        ? String(status).toLowerCase() !== "inactive"
        : true;

    const item = await db.indicatorCategory.create({
      data: {
        tenantId,
        name: String(name).trim(),
        code: code ? String(code).trim().toUpperCase() : slugifyCode(name),
        description: description ? String(description).trim() : null,
        defaultWeight: defaultWeight ? parseFloat(defaultWeight) : 25.0,
        isActive: activeFlag,
      },
    });
    return res.status(201).json({ ...item, status: item.isActive ? "active" : "inactive" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create indicator category." });
  }
});

hrPerformanceRouter.put("/indicator-categories/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.indicatorCategory.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Indicator category not found." });

    const { name, description, defaultWeight, status, isActive } = req.body || {};
    const activeFlag =
      isActive !== undefined
        ? Boolean(isActive)
        : status !== undefined
        ? String(status).toLowerCase() !== "inactive"
        : undefined;

    const updated = await db.indicatorCategory.update({
      where: { id: existing.id },
      data: {
        ...(name ? { name: String(name).trim() } : {}),
        ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
        ...(defaultWeight !== undefined && defaultWeight !== ""
          ? { defaultWeight: parseFloat(defaultWeight) }
          : {}),
        ...(activeFlag !== undefined ? { isActive: activeFlag } : {}),
      },
    });
    return res.json({ ...updated, status: updated.isActive ? "active" : "inactive" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update indicator category." });
  }
});

hrPerformanceRouter.patch("/indicator-categories/:id/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.indicatorCategory.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Indicator category not found." });

    const nextActive =
      req.body?.isActive !== undefined
        ? Boolean(req.body.isActive)
        : req.body?.status !== undefined
        ? String(req.body.status).toLowerCase() !== "inactive"
        : !existing.isActive;

    const updated = await db.indicatorCategory.update({
      where: { id: existing.id },
      data: { isActive: nextActive },
    });
    return res.json({ ...updated, status: updated.isActive ? "active" : "inactive" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update indicator category status." });
  }
});

hrPerformanceRouter.delete("/indicator-categories/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.indicatorCategory.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Indicator category not found." });
    await db.indicatorCategory.delete({ where: { id: existing.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete indicator category." });
  }
});

// =========================================================================
// 5. REVIEWS & RATINGS (HR-PF-01)
// =========================================================================
const DEFAULT_PERFORMANCE_CATEGORIES: Array<{
  code: string;
  name: string;
  description: string;
  indicators: Array<{
    code: string;
    name: string;
    description: string;
    measurementUnit: string;
    targetValue: string;
    weight: number;
  }>;
}> = [
  {
    code: "JOB_PERFORMANCE",
    name: "Job Performance",
    description: "Core job execution, task delivery, and productivity",
    indicators: [
      { code: "TASK_COMPLETION_RATE", name: "Task Completion Rate", description: "Percentage of assigned tasks completed within specified timeframes", measurementUnit: "Percentage", targetValue: "95%", weight: 1 },
      { code: "GOAL_ACHIEVEMENT", name: "Goal Achievement", description: "Success rate in achieving individual and team objectives", measurementUnit: "Percentage", targetValue: "90%", weight: 1 },
      { code: "PRODUCTIVITY_LEVEL", name: "Productivity Level", description: "Output efficiency compared to established benchmarks", measurementUnit: "Rating", targetValue: "4/5", weight: 1 },
    ],
  },
  {
    code: "QUALITY_OF_WORK",
    name: "Quality of Work",
    description: "Precision, accuracy, and defect minimization",
    indicators: [
      { code: "ERROR_RATE", name: "Error Rate", description: "Frequency of mistakes or defects in work output", measurementUnit: "Percentage", targetValue: "<5%", weight: 1 },
      { code: "ACCURACY_LEVEL", name: "Accuracy Level", description: "Precision and correctness in completing tasks and deliverables", measurementUnit: "Percentage", targetValue: "98%", weight: 1 },
      { code: "ATTENTION_TO_DETAIL", name: "Attention to Detail", description: "Thoroughness and care in reviewing and completing work", measurementUnit: "Rating", targetValue: "4/5", weight: 1 },
    ],
  },
  {
    code: "COMMUNICATION_SKILLS",
    name: "Communication Skills",
    description: "Verbal, written, and active listening effectiveness",
    indicators: [
      { code: "VERBAL_COMMUNICATION", name: "Verbal Communication", description: "Effectiveness in spoken communication and presentations", measurementUnit: "Rating", targetValue: "4/5", weight: 1 },
      { code: "WRITTEN_COMMUNICATION", name: "Written Communication", description: "Clarity and professionalism in written correspondence", measurementUnit: "Rating", targetValue: "4/5", weight: 1 },
      { code: "ACTIVE_LISTENING", name: "Active Listening", description: "Ability to understand and respond appropriately to others", measurementUnit: "Rating", targetValue: "4/5", weight: 1 },
    ],
  },
  {
    code: "TEAMWORK_COLLABORATION",
    name: "Teamwork and Collaboration",
    description: "Cross-functional collaboration and constructive conflict resolution",
    indicators: [
      { code: "TEAM_CONTRIBUTION", name: "Team Contribution", description: "Active participation and valuable input in team activities", measurementUnit: "Rating", targetValue: "4/5", weight: 1 },
      { code: "COOPERATION_LEVEL", name: "Cooperation Level", description: "Willingness to work with others and support team goals", measurementUnit: "Rating", targetValue: "4/5", weight: 1 },
      { code: "CONFLICT_RESOLUTION", name: "Conflict Resolution", description: "Ability to handle disagreements constructively", measurementUnit: "Rating", targetValue: "3/5", weight: 1 },
    ],
  },
  {
    code: "LEADERSHIP_INITIATIVE",
    name: "Leadership and Initiative",
    description: "Ownership, independent judgment, and mentorship",
    indicators: [
      { code: "DECISION_MAKING", name: "Decision Making", description: "Quality and timeliness of decisions made independently", measurementUnit: "Rating", targetValue: "4/5", weight: 1 },
      { code: "INITIATIVE_TAKING", name: "Initiative Taking", description: "Proactive approach to identifying and addressing opportunities", measurementUnit: "Rating", targetValue: "4/5", weight: 1 },
      { code: "MENTORING_ABILITY", name: "Mentoring Ability", description: "Effectiveness in guiding and developing junior team members", measurementUnit: "Rating", targetValue: "3/5", weight: 1 },
    ],
  },
  {
    code: "PROBLEM_SOLVING",
    name: "Problem Solving",
    description: "Analytical rigor, innovation, and resolution speed",
    indicators: [
      { code: "ANALYTICAL_THINKING", name: "Analytical Thinking", description: "Ability to break down complex problems and analyze components", measurementUnit: "Rating", targetValue: "4/5", weight: 1 },
      { code: "CREATIVE_SOLUTIONS", name: "Creative Solutions", description: "Innovation and creativity in developing problem solutions", measurementUnit: "Rating", targetValue: "3/5", weight: 1 },
      { code: "RESOLUTION_SPEED", name: "Resolution Speed", description: "Efficiency in identifying and implementing solutions", measurementUnit: "Rating", targetValue: "4/5", weight: 1 },
    ],
  },
  {
    code: "ADAPTABILITY_FLEXIBILITY",
    name: "Adaptability and Flexibility",
    description: "Change resilience, learning agility, and composure",
    indicators: [
      { code: "CHANGE_ADAPTATION", name: "Change Adaptation", description: "Ability to adjust to new processes, systems, or requirements", measurementUnit: "Rating", targetValue: "4/5", weight: 1 },
      { code: "LEARNING_AGILITY", name: "Learning Agility", description: "Speed and effectiveness in acquiring new skills and knowledge", measurementUnit: "Rating", targetValue: "4/5", weight: 1 },
      { code: "STRESS_MANAGEMENT", name: "Stress Management", description: "Ability to maintain performance under pressure", measurementUnit: "Rating", targetValue: "3/5", weight: 1 },
    ],
  },
  {
    code: "TIME_MANAGEMENT",
    name: "Time Management",
    description: "Deadline reliability, prioritization, and resource optimization",
    indicators: [
      { code: "DEADLINE_ADHERENCE", name: "Deadline Adherence", description: "Consistency in meeting project and task deadlines", measurementUnit: "Percentage", targetValue: "95%", weight: 1 },
      { code: "PRIORITY_MANAGEMENT", name: "Priority Management", description: "Effectiveness in organizing and prioritizing multiple tasks", measurementUnit: "Rating", targetValue: "4/5", weight: 1 },
      { code: "EFFICIENCY_RATING", name: "Efficiency Rating", description: "Optimal use of time and resources to achieve objectives", measurementUnit: "Rating", targetValue: "4/5", weight: 1 },
    ],
  },
  {
    code: "CUSTOMER_SERVICE",
    name: "Customer Service",
    description: "Client satisfaction, responsiveness, and issue resolution",
    indicators: [
      { code: "CUSTOMER_SATISFACTION", name: "Customer Satisfaction", description: "Level of customer satisfaction with service provided", measurementUnit: "Rating", targetValue: "4.5/5", weight: 1 },
      { code: "RESPONSE_TIME", name: "Response Time", description: "Speed in responding to customer inquiries and requests", measurementUnit: "Hours", targetValue: "<24", weight: 1 },
      { code: "ISSUE_RESOLUTION", name: "Issue Resolution", description: "Effectiveness in resolving customer problems and complaints", measurementUnit: "Percentage", targetValue: "90%", weight: 1 },
    ],
  },
  {
    code: "TECHNICAL_COMPETENCY",
    name: "Technical Competency",
    description: "Role-specific domain expertise and tool mastery",
    indicators: [
      { code: "SKILL_PROFICIENCY", name: "Skill Proficiency", description: "Level of expertise in job-related technical skills", measurementUnit: "Rating", targetValue: "4/5", weight: 1 },
      { code: "TOOL_UTILIZATION", name: "Tool Utilization", description: "Effective use of software, systems, and technical tools", measurementUnit: "Rating", targetValue: "4/5", weight: 1 },
      { code: "KNOWLEDGE_APPLICATION", name: "Knowledge Application", description: "Practical application of technical knowledge to solve problems", measurementUnit: "Rating", targetValue: "4/5", weight: 1 },
    ],
  },
  {
    code: "PROFESSIONAL_DEVELOPMENT",
    name: "Professional Development",
    description: "Continuous training, skill growth, and certifications",
    indicators: [
      { code: "TRAINING_COMPLETION", name: "Training Completion", description: "Participation and completion rate in professional development programs", measurementUnit: "Percentage", targetValue: "100%", weight: 1 },
      { code: "SKILL_ENHANCEMENT", name: "Skill Enhancement", description: "Progress in developing new competencies and improving existing skills", measurementUnit: "Rating", targetValue: "3/5", weight: 1 },
      { code: "CERTIFICATION_ACHIEVEMENT", name: "Certification Achievement", description: "Success in obtaining relevant professional certifications", measurementUnit: "Count", targetValue: "2/year", weight: 1 },
    ],
  },
  {
    code: "ATTENDANCE_PUNCTUALITY",
    name: "Attendance and Punctuality",
    description: "Schedule adherence, timeliness, and leave policy compliance",
    indicators: [
      { code: "ATTENDANCE_RATE", name: "Attendance Rate", description: "Percentage of scheduled work days attended", measurementUnit: "Percentage", targetValue: "98%", weight: 1 },
      { code: "PUNCTUALITY_SCORE", name: "Punctuality Score", description: "Consistency in arriving on time for work and meetings", measurementUnit: "Percentage", targetValue: "95%", weight: 1 },
      { code: "LEAVE_MANAGEMENT", name: "Leave Management", description: "Appropriate use of leave policies and advance notification", measurementUnit: "Rating", targetValue: "4/5", weight: 1 },
    ],
  },
];

function normalizeReviewStatus(raw?: string | null): "scheduled" | "in_progress" | "completed" {
  const s = String(raw || "").toLowerCase().trim();
  if (s === "completed" || s === "finalized" || s === "submitted") return "completed";
  if (s === "in_progress" || s === "in progress" || s === "draft") return "in_progress";
  return "scheduled";
}

function formatReviewRecord(r: any) {
  const empAvatar = r.employee?.user?.profile?.avatarUrl || null;
  const revAvatar = r.reviewer?.user?.profile?.avatarUrl || null;
  return {
    id: r.id,
    cycleId: r.cycleId,
    employeeId: r.employeeId,
    reviewerId: r.reviewerId,
    reviewType: r.reviewType,
    reviewDate: r.reviewDate ? new Date(r.reviewDate).toISOString().split("T")[0] : new Date(r.createdAt).toISOString().split("T")[0],
    ratingScore: r.ratingScore !== null && r.ratingScore !== undefined ? Number(r.ratingScore) : null,
    overallScore: r.ratingScore !== null && r.ratingScore !== undefined ? Number(r.ratingScore) : null,
    overallComments: r.overallComments ?? r.feedbackText ?? "",
    feedbackText: r.feedbackText ?? r.overallComments ?? "",
    status: normalizeReviewStatus(r.status),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    cycle: r.cycle
      ? {
          id: r.cycle.id,
          name: r.cycle.name,
          title: r.cycle.name,
          periodType: r.cycle.periodType,
          startDate: r.cycle.startDate,
          endDate: r.cycle.endDate,
          status: r.cycle.status,
        }
      : null,
    employee: r.employee
      ? {
          id: r.employee.id,
          firstName: r.employee.firstName,
          lastName: r.employee.lastName,
          email: r.employee.email,
          employeeCode: r.employee.employeeCode,
          position: r.employee.position,
          avatarUrl: empAvatar,
        }
      : null,
    reviewer: r.reviewer
      ? {
          id: r.reviewer.id,
          firstName: r.reviewer.firstName,
          lastName: r.reviewer.lastName,
          email: r.reviewer.email,
          employeeCode: r.reviewer.employeeCode,
          position: r.reviewer.position,
          avatarUrl: revAvatar,
        }
      : null,
  };
}
hrPerformanceRouter.get("/reviews", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { cycleId, employeeId, status, dateFrom, dateTo } = req.query;
    const db = getTenantDb();

    const where: any = { cycle: { tenantId } };
    if (cycleId && cycleId !== "all") where.cycleId = String(cycleId);
    if (employeeId && employeeId !== "all") where.employeeId = String(employeeId);

    const reviews = await db.okrReview.findMany({
      where,
      include: {
        cycle: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            position: true,
            user: { select: { profile: { select: { avatarUrl: true } } } },
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            position: true,
            user: { select: { profile: { select: { avatarUrl: true } } } },
          },
        },
      },
      orderBy: [{ reviewDate: "desc" }, { createdAt: "desc" }],
    });

    let formatted = reviews.map(formatReviewRecord);
    if (status && status !== "all") {
      const target = normalizeReviewStatus(String(status));
      formatted = formatted.filter((r) => r.status === target);
    }
    if (dateFrom) {
      const fromStr = String(dateFrom);
      formatted = formatted.filter((r) => r.reviewDate >= fromStr);
    }
    if (dateTo) {
      const toStr = String(dateTo);
      formatted = formatted.filter((r) => r.reviewDate <= toStr);
    }

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch reviews." });
  }
});

hrPerformanceRouter.get("/reviews/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();

    const review = await db.okrReview.findFirst({
      where: { id: req.params.id, cycle: { tenantId } },
      include: {
        cycle: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            position: true,
            user: { select: { profile: { select: { avatarUrl: true } } } },
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            position: true,
            user: { select: { profile: { select: { avatarUrl: true } } } },
          },
        },
      },
    });

    if (!review) {
      return res.status(404).json({ error: "Performance review not found." });
    }

    // Fetch live active categories & indicators configured by the tenant (no mock auto-seeding)
    const [categories, savedRatings] = await Promise.all([
      db.indicatorCategory.findMany({
        where: { tenantId, isActive: true },
        include: {
          indicators: {
            where: { isActive: true },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      db.reviewIndicatorRating.findMany({
        where: { tenantId, reviewId: review.id },
      }),
    ]);

    const ratingMap = new Map<string, any>();
    for (const r of savedRatings) {
      ratingMap.set(r.indicatorId, r);
    }

    // Preserve canonical category order for default categories
    const orderMap = new Map(DEFAULT_PERFORMANCE_CATEGORIES.map((c, idx) => [c.code, idx]));
    const sortedCategories = [...categories].sort((a, b) => {
      const ia = orderMap.has(a.code) ? orderMap.get(a.code)! : 999;
      const ib = orderMap.has(b.code) ? orderMap.get(b.code)! : 999;
      if (ia !== ib) return ia - ib;
      return a.name.localeCompare(b.name);
    });

    const groupedCategories = sortedCategories
      .filter((c) => c.indicators.length > 0)
      .map((cat) => ({
        id: cat.id,
        code: cat.code,
        name: cat.name,
        description: cat.description,
        indicators: cat.indicators.map((ind) => {
          const saved = ratingMap.get(ind.id);
          const ratingVal =
            saved?.managerRating !== null && saved?.managerRating !== undefined
              ? Number(saved.managerRating)
              : saved?.selfRating !== null && saved?.selfRating !== undefined
              ? Number(saved.selfRating)
              : null;
          return {
            id: ind.id,
            code: ind.code,
            name: ind.name,
            description: ind.description || "",
            measurementUnit: ind.measurementUnit || "Rating",
            targetValue: ind.targetValue || "4/5",
            weight: Number(ind.weight || 1),
            rating: ratingVal,
            comments: saved?.managerComments || saved?.selfComments || "",
          };
        }),
      }));

    return res.json({
      ...formatReviewRecord(review),
      categories: groupedCategories,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load review details." });
  }
});

hrPerformanceRouter.post("/reviews", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const {
      employeeId,
      reviewerId,
      cycleId,
      reviewDate,
      reviewType,
      status,
      ratingScore,
      overallScore,
      overallComments,
      feedbackText,
      indicatorRatings,
    } = req.body || {};

    if (!employeeId || !cycleId) {
      return res.status(400).json({ error: "Employee and Review Cycle are required." });
    }

    let resolvedReviewerId = reviewerId;
    if (!resolvedReviewerId && req.user?.userId) {
      const meEmp = await db.employee.findFirst({
        where: { tenantId, userId: req.user.userId },
        select: { id: true },
      });
      resolvedReviewerId = meEmp?.id || employeeId;
    }
    if (!resolvedReviewerId) {
      resolvedReviewerId = employeeId;
    }

    const normalizedStatus = normalizeReviewStatus(status || "scheduled");
    const parsedScore =
      ratingScore !== undefined && ratingScore !== null && ratingScore !== ""
        ? Number(ratingScore)
        : overallScore !== undefined && overallScore !== null && overallScore !== ""
        ? Number(overallScore)
        : null;

    const created = await db.okrReview.create({
      data: {
        cycleId,
        employeeId,
        reviewerId: resolvedReviewerId,
        reviewType: reviewType || "manager",
        reviewDate: reviewDate ? new Date(reviewDate) : new Date(),
        ratingScore: parsedScore,
        overallComments: overallComments ?? feedbackText ?? null,
        feedbackText: feedbackText ?? overallComments ?? null,
        status: normalizedStatus,
      },
      include: {
        cycle: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            position: true,
            user: { select: { profile: { select: { avatarUrl: true } } } },
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            position: true,
            user: { select: { profile: { select: { avatarUrl: true } } } },
          },
        },
      },
    });

    if (Array.isArray(indicatorRatings) && indicatorRatings.length > 0) {
      for (const item of indicatorRatings) {
        if (!item.indicatorId) continue;
        await db.reviewIndicatorRating.create({
          data: {
            tenantId,
            reviewId: created.id,
            indicatorId: item.indicatorId,
            managerRating: item.rating !== undefined ? Number(item.rating) : null,
            managerComments: item.comments || null,
          },
        });
      }
    }

    return res.status(201).json(formatReviewRecord(created));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to schedule review." });
  }
});

hrPerformanceRouter.put("/reviews/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.okrReview.findFirst({
      where: { id: req.params.id, cycle: { tenantId } },
    });
    if (!existing) return res.status(404).json({ error: "Performance review not found." });

    const { employeeId, reviewerId, cycleId, reviewDate, status, overallComments, feedbackText } = req.body || {};
    const updated = await db.okrReview.update({
      where: { id: existing.id },
      data: {
        ...(employeeId ? { employeeId } : {}),
        ...(reviewerId ? { reviewerId } : {}),
        ...(cycleId ? { cycleId } : {}),
        ...(reviewDate ? { reviewDate: new Date(reviewDate) } : {}),
        ...(status ? { status: normalizeReviewStatus(status) } : {}),
        ...(overallComments !== undefined
          ? { overallComments, feedbackText: overallComments }
          : feedbackText !== undefined
          ? { feedbackText, overallComments: feedbackText }
          : {}),
      },
      include: {
        cycle: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            position: true,
            user: { select: { profile: { select: { avatarUrl: true } } } },
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            position: true,
            user: { select: { profile: { select: { avatarUrl: true } } } },
          },
        },
      },
    });
    return res.json(formatReviewRecord(updated));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update review." });
  }
});

hrPerformanceRouter.patch("/reviews/:id/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.okrReview.findFirst({
      where: { id: req.params.id, cycle: { tenantId } },
    });
    if (!existing) return res.status(404).json({ error: "Performance review not found." });

    const nextStatus = normalizeReviewStatus(req.body?.status);
    const updated = await db.okrReview.update({
      where: { id: existing.id },
      data: { status: nextStatus },
      include: {
        cycle: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            position: true,
            user: { select: { profile: { select: { avatarUrl: true } } } },
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            position: true,
            user: { select: { profile: { select: { avatarUrl: true } } } },
          },
        },
      },
    });
    return res.json(formatReviewRecord(updated));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update review status." });
  }
});

hrPerformanceRouter.post("/reviews/:id/conduct", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.okrReview.findFirst({
      where: { id: req.params.id, cycle: { tenantId } },
    });
    if (!existing) return res.status(404).json({ error: "Performance review not found." });

    const { ratings, overallComments, status } = req.body || {};
    const ratingItems: Array<{ indicatorId: string; rating: number; comments?: string }> = Array.isArray(ratings)
      ? ratings
      : [];

    // Fetch indicator weights for accurate weighted average
    const indicators = await db.performanceIndicator.findMany({
      where: { tenantId, id: { in: ratingItems.map((r) => r.indicatorId).filter(Boolean) } },
      select: { id: true, weight: true },
    });
    const weightMap = new Map(indicators.map((i) => [i.id, Number(i.weight || 1)]));

    let weightedSum = 0;
    let totalWeight = 0;

    for (const item of ratingItems) {
      if (!item.indicatorId) continue;
      const numericRating = Math.min(5, Math.max(1, Number(item.rating || 3)));
      const weight = weightMap.get(item.indicatorId) || 1;
      weightedSum += numericRating * weight;
      totalWeight += weight;

      const existingRating = await db.reviewIndicatorRating.findFirst({
        where: { tenantId, reviewId: existing.id, indicatorId: item.indicatorId },
      });

      if (existingRating) {
        await db.reviewIndicatorRating.update({
          where: { id: existingRating.id },
          data: {
            managerRating: numericRating,
            managerComments: item.comments?.trim() || null,
          },
        });
      } else {
        await db.reviewIndicatorRating.create({
          data: {
            tenantId,
            reviewId: existing.id,
            indicatorId: item.indicatorId,
            managerRating: numericRating,
            managerComments: item.comments?.trim() || null,
          },
        });
      }
    }

    const computedScore = totalWeight > 0 ? Number((weightedSum / totalWeight).toFixed(1)) : existing.ratingScore;
    const nextStatus = normalizeReviewStatus(status || "completed");
    const commentsText = overallComments !== undefined ? String(overallComments) : existing.overallComments || "";

    const updated = await db.okrReview.update({
      where: { id: existing.id },
      data: {
        ratingScore: computedScore,
        overallComments: commentsText || null,
        feedbackText: commentsText || null,
        status: nextStatus,
      },
      include: {
        cycle: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            position: true,
            user: { select: { profile: { select: { avatarUrl: true } } } },
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            position: true,
            user: { select: { profile: { select: { avatarUrl: true } } } },
          },
        },
      },
    });

    return res.json(formatReviewRecord(updated));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to submit performance review." });
  }
});

hrPerformanceRouter.delete("/reviews/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.okrReview.findFirst({
      where: { id: req.params.id, cycle: { tenantId } },
    });
    if (!existing) return res.status(404).json({ error: "Performance review not found." });

    await db.reviewIndicatorRating.deleteMany({
      where: { tenantId, reviewId: existing.id },
    });
    await db.okrReview.delete({ where: { id: existing.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete review." });
  }
});

hrPerformanceRouter.post("/cycles/:id/release", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const result = await PerformanceService.releaseReviews(tenantId, actorId, req.params.id);
    return res.json({ success: true, releasedCount: result.count });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to release reviews." });
  }
});

// =========================================================================
// 6. PERFORMANCE IMPROVEMENT PLANS (PIP) (HR-PF-01 Linkage)
// =========================================================================
hrPerformanceRouter.get("/pip", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const pips = await db.performanceImprovementPlan.findMany({
      where: { tenantId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true } },
      },
      orderBy: { startDate: "desc" },
    });
    return res.json(pips);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch PIPs." });
  }
});

hrPerformanceRouter.post("/pip", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const pip = await PerformanceService.createPIP(tenantId, actorId, req.body);
    return res.status(201).json(pip);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create PIP." });
  }
});

hrPerformanceRouter.put("/pip/:id/conclude", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const pip = await PerformanceService.concludePIP(
      tenantId,
      actorId,
      req.params.id,
      req.body.status,
      req.body.finalRemarks
    );
    return res.json(pip);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to conclude PIP." });
  }
});
