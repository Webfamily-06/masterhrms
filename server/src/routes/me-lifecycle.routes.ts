import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { getTenantDb } from "../context/tenant-context";
import { LifecycleService } from "../services/lifecycle.service";

export const meLifecycleRouter = Router();

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
// 1. MY AWARDS (ME-LC-01)
// =========================================================================
meLifecycleRouter.get("/awards", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.json([]);

    const db = getTenantDb();
    const awards = await db.award.findMany({
      where: { tenantId, employeeId: employee.id },
      include: { awardType: true },
      orderBy: { awardDate: "desc" },
    });
    return res.json(awards);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load awards." });
  }
});

// =========================================================================
// 2. MY PROMOTIONS & CAREER PROGRESSION (ME-LC-02)
// =========================================================================
meLifecycleRouter.get("/promotions", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.json([]);

    const db = getTenantDb();
    const promotions = await db.promotionRecord.findMany({
      where: { tenantId, employeeId: employee.id },
      orderBy: { promotionDate: "desc" },
    });
    return res.json(promotions);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load promotions." });
  }
});

// =========================================================================
// 3. MY TRANSFERS (ME-LC-03)
// =========================================================================
meLifecycleRouter.get("/transfers", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.json([]);

    const db = getTenantDb();
    const transfers = await db.employeeTransfer.findMany({
      where: { tenantId, employeeId: employee.id },
      orderBy: { effectiveDate: "desc" },
    });
    return res.json(transfers);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load transfers." });
  }
});

meLifecycleRouter.post("/transfers/request", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.status(404).json({ error: "Employee profile not found." });

    const db = getTenantDb();
    const { toBranchId, toDeptId, reason } = req.body;

    const request = await db.employeeTransfer.create({
      data: {
        tenantId,
        employeeId: employee.id,
        fromBranchId: employee.branchId,
        toBranchId: toBranchId || null,
        fromDeptId: employee.departmentId,
        toDeptId: toDeptId || null,
        effectiveDate: new Date(),
        reason: reason || "Employee requested transfer",
        status: "PENDING",
      },
    });

    return res.status(201).json(request);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to request transfer." });
  }
});

// =========================================================================
// 4. MY DISCIPLINARY WARNINGS (ME-LC-04)
// =========================================================================
meLifecycleRouter.get("/warnings", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.json([]);

    const db = getTenantDb();
    const warnings = await db.disciplinaryWarning.findMany({
      where: { tenantId, employeeId: employee.id },
      include: { warningType: true },
      orderBy: { warningDate: "desc" },
    });
    return res.json(warnings);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load warnings." });
  }
});

meLifecycleRouter.put("/warnings/:id/acknowledge", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.status(404).json({ error: "Employee profile not found." });

    const updated = await LifecycleService.acknowledgeWarning(tenantId, employee.id, req.params.id);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to acknowledge warning." });
  }
});

meLifecycleRouter.put("/warnings/:id/response", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.status(404).json({ error: "Employee profile not found." });

    const { response } = req.body;
    if (!response) return res.status(400).json({ error: "Response text is required." });

    const updated = await LifecycleService.submitWarningResponse(tenantId, employee.id, req.params.id, response);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to submit response." });
  }
});

// =========================================================================
// 5. MY RESIGNATION (ME-LC-05)
// =========================================================================
meLifecycleRouter.get("/resignation", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.json(null);

    const db = getTenantDb();
    const exit = await db.employeeExit.findFirst({
      where: { tenantId, employeeId: employee.id, exitType: "resignation" },
      include: { checklists: true },
      orderBy: { createdAt: "desc" },
    });
    return res.json(exit);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load resignation status." });
  }
});

meLifecycleRouter.post("/resignation", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.status(404).json({ error: "Employee profile not found." });

    const exit = await LifecycleService.submitResignation(tenantId, employee.id, req.body);
    return res.status(201).json(exit);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to submit resignation." });
  }
});

meLifecycleRouter.post("/resignation/:id/withdraw", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.status(404).json({ error: "Employee profile not found." });

    const updated = await LifecycleService.withdrawResignation(
      tenantId,
      employee.id,
      req.params.id,
      req.body.reason || "Employee withdrew resignation."
    );
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to withdraw resignation." });
  }
});

// =========================================================================
// 6. MY EXIT & CLEARANCE (ME-LC-06)
// =========================================================================
meLifecycleRouter.get("/exit", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.json(null);

    const db = getTenantDb();
    const exit = await db.employeeExit.findFirst({
      where: { tenantId, employeeId: employee.id },
      include: { checklists: true },
      orderBy: { createdAt: "desc" },
    });
    return res.json(exit);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load exit details." });
  }
});

// =========================================================================
// 7. MY BUSINESS TRIPS (ME-LC-07)
// =========================================================================
meLifecycleRouter.get("/trips", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.json([]);

    const db = getTenantDb();
    const trips = await db.employeeTrip.findMany({
      where: { tenantId, employeeId: employee.id },
      include: { expenses: true },
      orderBy: { fromDate: "desc" },
    });
    return res.json(trips);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load trips." });
  }
});

meLifecycleRouter.post("/trips", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.status(404).json({ error: "Employee profile not found." });

    const trip = await LifecycleService.createTrip(tenantId, employee.id, req.body);
    return res.status(201).json(trip);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create trip request." });
  }
});

meLifecycleRouter.post("/trips/:id/expenses", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const expense = await LifecycleService.addTripExpense(tenantId, req.params.id, req.body);
    return res.status(201).json(expense);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to add trip expense." });
  }
});

// =========================================================================
// 8. MY COMPLAINTS & GRIEVANCES (ME-LC-08)
// STRICT SECURITY (P6-BR-014): Complaints filed against me are NEVER visible!
// =========================================================================
meLifecycleRouter.get("/complaints", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    if (!employee) return res.json([]);

    const db = getTenantDb();
    // Only return complaints FILED BY the logged-in employee
    const complaints = await db.employeeComplaint.findMany({
      where: { tenantId, complainantId: employee.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        ticketCode: true,
        category: true,
        severity: true,
        incidentDate: true,
        subject: true,
        description: true,
        status: true,
        actionTaken: true,
        resolvedAt: true,
        createdAt: true,
      },
    });
    return res.json(complaints);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load complaints." });
  }
});

meLifecycleRouter.post("/complaints", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);

    const complaint = await LifecycleService.fileComplaint(tenantId, {
      ...req.body,
      complainantId: employee?.id,
    });
    return res.status(201).json(complaint);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to file complaint." });
  }
});
