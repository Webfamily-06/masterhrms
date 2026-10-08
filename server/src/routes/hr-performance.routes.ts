import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { getTenantDb } from "../context/tenant-context";
import { PerformanceService } from "../services/performance.service";

export const hrPerformanceRouter = Router();

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

// =========================================================================
// 1. REVIEW CYCLES (HR-PF-03)
// =========================================================================
hrPerformanceRouter.get("/cycles", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const cycles = await PerformanceService.listCycles(tenantId);
    return res.json(cycles);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch cycles." });
  }
});

hrPerformanceRouter.post("/cycles", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const cycle = await PerformanceService.createCycle(tenantId, actorId, req.body);
    return res.status(201).json(cycle);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create cycle." });
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

// =========================================================================
// 2. GOALS & OKRs (HR-PF-02)
// =========================================================================
hrPerformanceRouter.get("/goals", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { cycleId, employeeId } = req.query;
    const db = getTenantDb();

    const where: any = { tenantId };
    if (cycleId && cycleId !== "all") where.cycleId = String(cycleId);
    if (employeeId && employeeId !== "all") where.ownerId = String(employeeId);

    const goals = await db.okrObjective.findMany({
      where,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true } },
        keyResults: { include: { checkins: { take: 5, orderBy: { createdAt: "desc" } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(goals);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch goals." });
  }
});

hrPerformanceRouter.post("/goals", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const goal = await PerformanceService.createObjective(tenantId, actorId, req.body);
    return res.status(201).json(goal);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create goal." });
  }
});

// =========================================================================
// 3. INDICATORS & COMPETENCIES (HR-PF-04)
// =========================================================================
hrPerformanceRouter.get("/indicators", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const indicators = await PerformanceService.listIndicators(tenantId);
    return res.json(indicators);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch indicators." });
  }
});

hrPerformanceRouter.post("/indicators", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const indicator = await PerformanceService.createIndicator(tenantId, req.body);
    return res.status(201).json(indicator);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create indicator." });
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
      orderBy: { name: "asc" },
    });
    return res.json(types);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch goal types." });
  }
});

hrPerformanceRouter.post("/goal-types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const item = await db.goalTypeMaster.create({
      data: {
        tenantId,
        name: req.body.name,
        code: req.body.code.toUpperCase(),
        measurementType: req.body.measurementType || "percentage",
        unit: req.body.unit || null,
        description: req.body.description || null,
      },
    });
    return res.status(201).json(item);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create goal type." });
  }
});

hrPerformanceRouter.get("/indicator-categories", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const categories = await db.indicatorCategory.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
    return res.json(categories);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch indicator categories." });
  }
});

hrPerformanceRouter.post("/indicator-categories", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const item = await db.indicatorCategory.create({
      data: {
        tenantId,
        name: req.body.name,
        code: req.body.code.toUpperCase(),
        description: req.body.description || null,
        defaultWeight: req.body.defaultWeight ? parseFloat(req.body.defaultWeight) : 25.0,
      },
    });
    return res.status(201).json(item);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create indicator category." });
  }
});

// =========================================================================
// 5. REVIEWS & RATINGS (HR-PF-01)
// =========================================================================
hrPerformanceRouter.get("/reviews", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { cycleId, employeeId } = req.query;
    const db = getTenantDb();

    const where: any = { cycle: { tenantId } };
    if (cycleId && cycleId !== "all") where.cycleId = String(cycleId);
    if (employeeId && employeeId !== "all") where.employeeId = String(employeeId);

    const reviews = await db.okrReview.findMany({
      where,
      include: {
        cycle: true,
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(reviews);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch reviews." });
  }
});

hrPerformanceRouter.post("/reviews", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const review = await PerformanceService.submitReview(tenantId, actorId, req.body);
    return res.status(201).json(review);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to submit review." });
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
