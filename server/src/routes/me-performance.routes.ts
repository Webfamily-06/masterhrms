import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { getTenantDb } from "../context/tenant-context";
import { PerformanceService } from "../services/performance.service";

export const mePerformanceRouter = Router();

async function resolveEmployee(req: AuthRequest) {
  const tenantId = req.user?.tenantId!;
  const user = req.user!;
  const userId = user.userId || (user as any).id;
  const db = getTenantDb();
  return await db.employee.findFirst({
    where: { tenantId, userId },
  });
}

// =========================================================================
// 1. MY PERFORMANCE REVIEWS (ME-PF-01)
// =========================================================================
mePerformanceRouter.get("/reviews", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.json([]);

    const db = getTenantDb();
    const reviews = await db.okrReview.findMany({
      where: {
        cycle: { tenantId },
        employeeId: employee.id,
      },
      include: {
        cycle: true,
        reviewer: { select: { id: true, firstName: true, lastName: true, position: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Mask manager ratings if not yet released/approved
    const sanitized = reviews.map((r) => {
      const isReleased = r.status === "approved" || r.status === "acknowledged";
      return {
        id: r.id,
        cycleId: r.cycleId,
        cycleName: r.cycle.name,
        reviewType: r.reviewType,
        status: r.status,
        reviewerName: `${r.reviewer.firstName} ${r.reviewer.lastName}`,
        ratingScore: isReleased ? r.ratingScore : null,
        feedbackText: isReleased ? r.feedbackText : null,
        createdAt: r.createdAt,
      };
    });

    return res.json(sanitized);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load reviews." });
  }
});

// Submit Self Assessment
mePerformanceRouter.post("/reviews/self", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.status(404).json({ error: "Employee profile not found." });

    const review = await PerformanceService.submitReview(tenantId, employee.id, {
      ...req.body,
      employeeId: employee.id,
      reviewerId: employee.id,
      reviewType: "self",
    });

    return res.status(201).json(review);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to submit self-assessment." });
  }
});

// Acknowledge Final Review
mePerformanceRouter.put("/reviews/:id/acknowledge", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.status(404).json({ error: "Employee profile not found." });

    const db = getTenantDb();
    const review = await db.okrReview.findFirst({
      where: { id: req.params.id, employeeId: employee.id },
    });

    if (!review) throw new Error("Review not found.");

    const updated = await db.okrReview.update({
      where: { id: review.id },
      data: { status: "acknowledged" },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to acknowledge review." });
  }
});

// =========================================================================
// 2. MY GOALS (ME-PF-02)
// =========================================================================
mePerformanceRouter.get("/goals", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.json([]);

    const db = getTenantDb();
    const goals = await db.okrObjective.findMany({
      where: { tenantId, ownerId: employee.id },
      include: {
        cycle: true,
        keyResults: {
          include: {
            checkins: { orderBy: { createdAt: "desc" }, take: 5 },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(goals);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load goals." });
  }
});

// Goal Check-in
mePerformanceRouter.post("/goals/checkin", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.status(404).json({ error: "Employee profile not found." });

    const result = await PerformanceService.checkinKeyResult(tenantId, employee.id, req.body);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to record check-in." });
  }
});

// =========================================================================
// 3. REVIEW CYCLES (ME-PF-03)
// =========================================================================
mePerformanceRouter.get("/cycles", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const cycles = await PerformanceService.listCycles(tenantId);
    return res.json(cycles);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load review cycles." });
  }
});

// =========================================================================
// 4. PERFORMANCE INDICATORS (ME-PF-04)
// =========================================================================
mePerformanceRouter.get("/indicators", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const indicators = await PerformanceService.listIndicators(tenantId);
    return res.json(indicators);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load indicators." });
  }
});
