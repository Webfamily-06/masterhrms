import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { getTenantDb } from "../context/tenant-context";
import { LifecycleService } from "../services/lifecycle.service";
import { parsePaginationParams, formatPaginatedResponse } from "../lib/pagination";

export const hrLifecycleRouter = Router();

// =========================================================================
// 0. COMMAND CENTER OVERVIEW
// =========================================================================
hrLifecycleRouter.get("/overview", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const metrics = await LifecycleService.getOverviewMetrics(tenantId);
    return res.json(metrics);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load lifecycle overview." });
  }
});

// =========================================================================
// 1. AWARDS (HR-LC-01)
// =========================================================================
hrLifecycleRouter.get("/awards", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const awards = await db.award.findMany({
      where: { tenantId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true } },
        awardType: true,
      },
      orderBy: { awardDate: "desc" },
    });
    return res.json(awards);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch awards." });
  }
});

hrLifecycleRouter.post("/awards", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const db = getTenantDb();
    const { employeeId, awardTypeId, awardDate, giftItem, giftAmount, description, presentedBy, certificateNo } = req.body;

    if (!employeeId || !awardDate) {
      return res.status(400).json({ error: "Employee and award date are required." });
    }

    const award = await db.award.create({
      data: {
        tenantId,
        employeeId,
        awardTypeId: awardTypeId || null,
        awardDate: new Date(awardDate),
        giftItem: giftItem || null,
        giftAmount: giftAmount ? parseFloat(giftAmount) : 0,
        description: description || null,
        presentedBy: presentedBy || null,
        certificateNo: certificateNo || `CERT-${Date.now().toString(36).toUpperCase()}`,
        status: "awarded",
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        awardType: true,
      },
    });

    await LifecycleService.recordEvent({
      tenantId,
      employeeId,
      eventType: "AWARD_GRANTED",
      effectiveDate: new Date(awardDate),
      newState: { giftItem, giftAmount },
      actorId,
      source: "hr_admin",
      reason: description || "Employee recognized with award.",
      referenceId: award.id,
    });

    return res.status(201).json(award);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to grant award." });
  }
});

hrLifecycleRouter.delete("/awards/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    await db.award.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete award." });
  }
});

// =========================================================================
// 2. PROMOTIONS (HR-LC-02)
// =========================================================================
hrLifecycleRouter.get("/promotions", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const promotions = await db.promotionRecord.findMany({
      where: { tenantId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true } },
      },
      orderBy: { promotionDate: "desc" },
    });
    return res.json(promotions);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch promotions." });
  }
});

hrLifecycleRouter.post("/promotions", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const promotion = await LifecycleService.executePromotion(tenantId, actorId, req.body);
    return res.status(201).json(promotion);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to execute promotion." });
  }
});

// =========================================================================
// 3. TRANSFERS (HR-LC-03)
// =========================================================================
hrLifecycleRouter.get("/transfers", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const transfers = await db.employeeTransfer.findMany({
      where: { tenantId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true } },
      },
      orderBy: { effectiveDate: "desc" },
    });
    return res.json(transfers);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch employee transfers." });
  }
});

hrLifecycleRouter.post("/transfers", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const transfer = await LifecycleService.executeTransfer(tenantId, actorId, req.body);
    return res.status(201).json(transfer);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to execute employee transfer." });
  }
});

// =========================================================================
// 4. WARNINGS (HR-LC-04)
// =========================================================================
hrLifecycleRouter.get("/warnings", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const warnings = await db.disciplinaryWarning.findMany({
      where: { tenantId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true } },
        warningType: true,
      },
      orderBy: { warningDate: "desc" },
    });
    return res.json(warnings);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch disciplinary warnings." });
  }
});

hrLifecycleRouter.post("/warnings", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const warning = await LifecycleService.issueWarning(tenantId, actorId, req.body);
    return res.status(201).json(warning);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to issue disciplinary warning." });
  }
});

hrLifecycleRouter.delete("/warnings/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    await db.disciplinaryWarning.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete warning." });
  }
});

// =========================================================================
// 5. RESIGNATIONS (HR-LC-05)
// =========================================================================
hrLifecycleRouter.get("/resignations", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const resignations = await db.employeeExit.findMany({
      where: { tenantId, exitType: "resignation" },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true } },
        checklists: true,
      },
      orderBy: { resignationDate: "desc" },
    });
    return res.json(resignations);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch resignations." });
  }
});

hrLifecycleRouter.put("/resignations/:id/review", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { status, acceptedLastWorkingDay, notes } = req.body;

    const exit = await db.employeeExit.update({
      where: { id: req.params.id },
      data: {
        status: status || "clearance_pending",
        lastWorkingDay: acceptedLastWorkingDay ? new Date(acceptedLastWorkingDay) : undefined,
        exitInterviewNotes: notes || undefined,
      },
      include: { employee: true },
    });

    return res.json(exit);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to review resignation." });
  }
});

// =========================================================================
// 6. TERMINATIONS (HR-LC-06)
// =========================================================================
hrLifecycleRouter.get("/terminations", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const terminations = await db.employeeExit.findMany({
      where: { tenantId, exitType: { not: "resignation" } },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true } },
      },
      orderBy: { lastWorkingDay: "desc" },
    });
    return res.json(terminations);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch terminations." });
  }
});

hrLifecycleRouter.post("/terminations", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const exit = await LifecycleService.executeTermination(tenantId, actorId, req.body);
    return res.status(201).json(exit);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to execute termination." });
  }
});

// =========================================================================
// 7. BUSINESS TRIPS (HR-LC-07)
// =========================================================================
hrLifecycleRouter.get("/trips", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const trips = await db.employeeTrip.findMany({
      where: { tenantId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true } },
        expenses: true,
      },
      orderBy: { fromDate: "desc" },
    });
    return res.json(trips);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch business trips." });
  }
});

hrLifecycleRouter.put("/trips/:id/approve", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const trip = await LifecycleService.approveTrip(tenantId, actorId, req.params.id, req.body.remarks);
    return res.json(trip);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to approve trip." });
  }
});

// =========================================================================
// 8. COMPLAINTS & GRIEVANCES (HR-LC-08)
// =========================================================================
hrLifecycleRouter.get("/complaints", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const complaints = await db.employeeComplaint.findMany({
      where: { tenantId },
      include: {
        caseNotes: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(complaints);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch complaints." });
  }
});

hrLifecycleRouter.put("/complaints/:id/resolve", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { resolutionNotes, actionTaken } = req.body;
    const resolved = await LifecycleService.resolveComplaint(tenantId, req.params.id, resolutionNotes, actionTaken);
    return res.json(resolved);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to resolve complaint." });
  }
});

// =========================================================================
// 9. EXITS & CLEARANCE (HR-LC-09)
// =========================================================================
hrLifecycleRouter.get("/exits", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const exits = await db.employeeExit.findMany({
      where: { tenantId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true } },
        checklists: true,
      },
      orderBy: { lastWorkingDay: "desc" },
    });
    return res.json(exits);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch exit cases." });
  }
});

hrLifecycleRouter.put("/exits/:id/checklist/:itemId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { isCompleted } = req.body;
    const actorName = req.user?.email || "HR Admin";

    const item = await db.exitChecklistItem.update({
      where: { id: req.params.itemId },
      data: {
        isCompleted: !!isCompleted,
        completedBy: isCompleted ? actorName : null,
        completedAt: isCompleted ? new Date() : null,
      },
    });
    return res.json(item);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update checklist item." });
  }
});

hrLifecycleRouter.put("/exits/:id/finalize", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const exit = await LifecycleService.finalizeExit(tenantId, actorId, req.params.id);
    return res.json(exit);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to finalize employee exit." });
  }
});

// =========================================================================
// 10. PROBATION MANAGEMENT (HR-LC-10)
// =========================================================================
hrLifecycleRouter.get("/probation", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const probations = await db.probationRecord.findMany({
      where: { tenantId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true } },
      },
      orderBy: { endDate: "asc" },
    });
    return res.json(probations);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch probation records." });
  }
});

hrLifecycleRouter.put("/probation/:id/extend", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const { extensionDays, remarks } = req.body;
    const updated = await LifecycleService.extendProbation(tenantId, actorId, req.params.id, parseInt(extensionDays), remarks);
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to extend probation." });
  }
});

hrLifecycleRouter.put("/probation/:id/confirm", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const { performanceRating, remarks } = req.body;
    const updated = await LifecycleService.confirmProbation(tenantId, actorId, req.params.id, performanceRating, remarks);
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to confirm probation." });
  }
});

// =========================================================================
// 11. TIMELINE & EVENT STORE QUERY (P6-BR-019)
// =========================================================================
hrLifecycleRouter.get("/timeline/:employeeId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const events = await LifecycleService.getTimeline(tenantId, req.params.employeeId);
    return res.json(events);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load employee timeline." });
  }
});
