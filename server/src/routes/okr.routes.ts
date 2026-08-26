import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { requireAddon } from "../middleware/addons";

export const okrRouter = Router();

// Apply Auth and Add-on Entitlement requirement to all OKR endpoints
okrRouter.use(requireAuth);
okrRouter.use(requireAddon("okr-performance"));

/**
 * -------------------------------------------------------------
 * 1. OKR REVIEW CYCLES
 * -------------------------------------------------------------
 */
okrRouter.get("/cycles", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const cycles = await prisma.okrCycle.findMany({
      where: { tenantId },
      orderBy: { startDate: "desc" },
      include: {
        _count: {
          select: { objectives: true, reviews: true },
        },
      },
    });

    return res.json({ cycles });
  } catch (err: any) {
    console.error("[okr/cycles] error:", err);
    return res.status(500).json({ error: err.message || "Failed to load OKR cycles." });
  }
});

okrRouter.post("/cycles", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { name, periodType = "quarterly", startDate, endDate } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({ error: "Cycle name, start date, and end date are required." });
    }

    const cycle = await prisma.okrCycle.create({
      data: {
        tenantId,
        name,
        periodType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: "active",
      },
    });

    return res.status(201).json({ cycle });
  } catch (err: any) {
    console.error("[okr/cycles:create] error:", err);
    return res.status(500).json({ error: err.message || "Failed to create OKR cycle." });
  }
});

/**
 * -------------------------------------------------------------
 * 2. OKR OBJECTIVES LIST & DETAILED HIERARCHICAL TREE
 * -------------------------------------------------------------
 */
okrRouter.get("/objectives", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { cycleId, ownerId, departmentId, alignmentType, category } = req.query;

    const whereClause: any = { tenantId };
    if (cycleId && cycleId !== "all") whereClause.cycleId = String(cycleId);
    if (ownerId && ownerId !== "all") whereClause.ownerId = String(ownerId);
    if (departmentId && departmentId !== "all") whereClause.departmentId = String(departmentId);
    if (alignmentType && alignmentType !== "all") whereClause.alignmentType = String(alignmentType);
    if (category && category !== "all") whereClause.category = String(category);

    const objectives = await prisma.okrObjective.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true,
            department: { select: { name: true } },
          },
        },
        parent: {
          select: { id: true, title: true, alignmentType: true },
        },
        children: {
          select: { id: true, title: true, progress: true, alignmentType: true },
        },
        keyResults: {
          include: {
            checkins: {
              orderBy: { createdAt: "desc" },
              take: 5,
              include: {
                employee: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    // Aggregations
    const totalCount = objectives.length;
    const avgProgress =
      totalCount > 0
        ? Math.round(
            objectives.reduce((sum, obj) => sum + Number(obj.progress), 0) / totalCount
          )
        : 0;

    return res.json({
      objectives,
      summary: {
        totalObjectives: totalCount,
        averageProgress: avgProgress,
        achievedCount: objectives.filter((o) => Number(o.progress) >= 100).length,
        inProgressCount: objectives.filter((o) => Number(o.progress) > 0 && Number(o.progress) < 100).length,
        notStartedCount: objectives.filter((o) => Number(o.progress) === 0).length,
      },
    });
  } catch (err: any) {
    console.error("[okr/objectives] error:", err);
    return res.status(500).json({ error: err.message || "Failed to load objectives." });
  }
});

/**
 * Hierarchical Tree: Company -> Department -> Individual
 */
okrRouter.get("/tree", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { cycleId } = req.query;

    const whereClause: any = { tenantId };
    if (cycleId && cycleId !== "all") whereClause.cycleId = String(cycleId);

    const allObjectives = await prisma.okrObjective.findMany({
      where: whereClause,
      include: {
        owner: { select: { firstName: true, lastName: true, position: true } },
        keyResults: true,
        children: {
          include: {
            owner: { select: { firstName: true, lastName: true } },
            keyResults: true,
            children: {
              include: {
                owner: { select: { firstName: true, lastName: true } },
                keyResults: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Root nodes: parentId is null
    const rootObjectives = allObjectives.filter((o) => !o.parentId);

    return res.json({ tree: rootObjectives });
  } catch (err: any) {
    console.error("[okr/tree] error:", err);
    return res.status(500).json({ error: err.message || "Failed to load OKR tree." });
  }
});

/**
 * Single OKR Detail
 */
okrRouter.get("/objectives/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { id } = req.params;

    const objective = await prisma.okrObjective.findUnique({
      where: { id },
      include: {
        cycle: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            position: true,
            department: { select: { name: true } },
          },
        },
        parent: {
          select: { id: true, title: true, alignmentType: true, progress: true },
        },
        children: {
          include: {
            owner: { select: { firstName: true, lastName: true } },
            keyResults: true,
          },
        },
        keyResults: {
          include: {
            checkins: {
              orderBy: { createdAt: "desc" },
              include: {
                employee: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    if (!objective || objective.tenantId !== tenantId) {
      return res.status(404).json({ error: "Objective not found." });
    }

    return res.json({ objective });
  } catch (err: any) {
    console.error("[okr/objective:detail] error:", err);
    return res.status(500).json({ error: err.message || "Failed to load objective details." });
  }
});

okrRouter.post("/objectives", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const {
      cycleId,
      parentId,
      category = "Strategy",
      title,
      description,
      ownerId,
      departmentId,
      alignmentType = "individual",
      keyResults = [],
    } = req.body;

    if (!cycleId || !title || !ownerId) {
      return res.status(400).json({ error: "Cycle, title, and owner are required." });
    }

    const objective = await prisma.okrObjective.create({
      data: {
        tenantId,
        cycleId,
        parentId: parentId || null,
        category,
        title,
        description,
        ownerId,
        departmentId: departmentId || null,
        alignmentType,
        progress: 0,
        status: "in_progress",
        keyResults: {
          create: keyResults.map((kr: any) => ({
            title: kr.title || "Measurable Result",
            measurementType: kr.measurementType || "percentage",
            startValue: Number(kr.startValue) || 0,
            targetValue: Number(kr.targetValue) || 100,
            currentValue: Number(kr.startValue) || 0,
            weight: Number(kr.weight) || 1.0,
            status: "in_progress",
          })),
        },
      },
      include: {
        keyResults: true,
      },
    });

    return res.status(201).json({ objective });
  } catch (err: any) {
    console.error("[okr/objectives:create] error:", err);
    return res.status(500).json({ error: err.message || "Failed to create objective." });
  }
});

/**
 * -------------------------------------------------------------
 * 3. CHECK-INS & LIVE PROGRESS EVALUATION
 * -------------------------------------------------------------
 */
okrRouter.get("/checkins", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const checkins = await prisma.okrCheckin.findMany({
      where: { keyResult: { objective: { tenantId } } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        employee: { select: { firstName: true, lastName: true, position: true } },
        keyResult: {
          select: {
            title: true,
            measurementType: true,
            targetValue: true,
            objective: { select: { id: true, title: true, alignmentType: true } },
          },
        },
      },
    });

    return res.json({ checkins });
  } catch (err: any) {
    console.error("[okr/checkins:list] error:", err);
    return res.status(500).json({ error: err.message || "Failed to load checkins." });
  }
});

okrRouter.post("/checkins", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const {
      keyResultId,
      employeeId,
      progressValue,
      confidenceScore = 8,
      notes,
      blockers,
    } = req.body;

    if (!keyResultId || !employeeId || progressValue === undefined) {
      return res.status(400).json({ error: "KeyResult ID, employee ID, and progress value are required." });
    }

    // 1. Create checkin record
    const checkin = await prisma.okrCheckin.create({
      data: {
        keyResultId,
        employeeId,
        progressValue: Number(progressValue),
        confidenceScore: Number(confidenceScore),
        notes,
        blockers,
      },
    });

    // 2. Update Key Result current value
    const updatedKr = await prisma.okrKeyResult.update({
      where: { id: keyResultId },
      data: {
        currentValue: Number(progressValue),
      },
      include: {
        objective: {
          include: {
            keyResults: true,
          },
        },
      },
    });

    // 3. Recalculate Objective Overall Progress (%)
    const allKrs = updatedKr.objective.keyResults;
    let totalWeight = 0;
    let weightedProgressSum = 0;

    allKrs.forEach((kr) => {
      const start = Number(kr.startValue);
      const target = Number(kr.targetValue);
      const current = Number(kr.currentValue);
      const weight = Number(kr.weight || 1.0);

      const span = target - start || 1;
      const pct = Math.min(100, Math.max(0, ((current - start) / span) * 100));

      weightedProgressSum += pct * weight;
      totalWeight += weight;
    });

    const objectiveProgress = totalWeight > 0 ? Math.round(weightedProgressSum / totalWeight) : 0;

    await prisma.okrObjective.update({
      where: { id: updatedKr.objectiveId },
      data: {
        progress: objectiveProgress,
        status: objectiveProgress >= 100 ? "achieved" : objectiveProgress > 0 ? "in_progress" : "not_started",
      },
    });

    return res.json({
      checkin,
      keyResult: updatedKr,
      objectiveProgress,
    });
  } catch (err: any) {
    console.error("[okr/checkins:create] error:", err);
    return res.status(500).json({ error: err.message || "Failed to record check-in." });
  }
});

/**
 * -------------------------------------------------------------
 * 4. 360° APPRAISAL REVIEWS & RATINGS
 * -------------------------------------------------------------
 */
okrRouter.get("/reviews", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { cycleId, employeeId, reviewerId } = req.query;

    const whereClause: any = {
      cycle: { tenantId },
    };
    if (cycleId && cycleId !== "all") whereClause.cycleId = String(cycleId);
    if (employeeId) whereClause.employeeId = String(employeeId);
    if (reviewerId) whereClause.reviewerId = String(reviewerId);

    const reviews = await prisma.okrReview.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        cycle: { select: { name: true } },
        employee: { select: { firstName: true, lastName: true, position: true } },
        reviewer: { select: { firstName: true, lastName: true } },
      },
    });

    const totalReviews = reviews.length;
    const completedReviews = reviews.filter((r) => r.status === "approved" || r.status === "submitted");
    const avgScore =
      completedReviews.length > 0
        ? (
            completedReviews.reduce((sum, r) => sum + Number(r.ratingScore || 0), 0) /
            completedReviews.length
          ).toFixed(1)
        : "0.0";

    return res.json({
      reviews,
      summary: {
        totalReviews,
        completedCount: completedReviews.length,
        pendingCount: totalReviews - completedReviews.length,
        averageScore: avgScore,
      },
    });
  } catch (err: any) {
    console.error("[okr/reviews] error:", err);
    return res.status(500).json({ error: err.message || "Failed to load reviews." });
  }
});

okrRouter.post("/reviews", async (req: AuthRequest, res: Response) => {
  try {
    const { cycleId, employeeId, reviewerId, reviewType = "manager", ratingScore, feedbackText } = req.body;

    if (!cycleId || !employeeId || !reviewerId || ratingScore === undefined) {
      return res.status(400).json({ error: "Cycle, employee, reviewer, and rating score are required." });
    }

    const review = await prisma.okrReview.create({
      data: {
        cycleId,
        employeeId,
        reviewerId,
        reviewType,
        ratingScore: Number(ratingScore),
        feedbackText,
        status: "submitted",
      },
    });

    return res.status(201).json({ review });
  } catch (err: any) {
    console.error("[okr/reviews:create] error:", err);
    return res.status(500).json({ error: err.message || "Failed to submit review." });
  }
});
