import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { FbpService, STANDARD_FBP_COMPONENTS } from "../services/fbp.service";

export const fbpRouter = Router();
const fbpService = new FbpService(prisma as any);

// GET /api/fbp/window-status (Check corporate FBP windows and mid-year joiner grace period - PO-DEC-04)
fbpRouter.get("/window-status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const employeeId = (req.user as any)?.employeeId || (req.query.employeeId as string);

    const status = await fbpService.checkWindowStatus(tenantId, employeeId);
    return res.json(status);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to check window status." });
  }
});

// GET /api/fbp/components (List standard flexible benefit plan components and caps)
fbpRouter.get("/components", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    return res.json({
      success: true,
      components: STANDARD_FBP_COMPONENTS,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to get FBP components." });
  }
});

// GET /api/fbp/pool (Get employee's allocated annual FBP pool)
fbpRouter.get("/pool", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const employeeId = (req.user as any)?.employeeId || (req.query.employeeId as string);
    if (!employeeId) return res.status(400).json({ error: "Employee ID is required." });

    const pool = await fbpService.getEmployeeFbpAllowancePool(tenantId, employeeId);
    return res.json({
      success: true,
      employeeId,
      allocatedFbpAnnualPool: pool,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch FBP pool." });
  }
});

// GET /api/fbp/my-declaration (Get current employee declaration for financial year)
fbpRouter.get("/my-declaration", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const employeeId = (req.user as any)?.employeeId || (req.query.employeeId as string);
    const financialYear = (req.query.financialYear as string) || "2026-2027";

    if (!employeeId) return res.status(400).json({ error: "Employee ID is required." });

    const declaration = await fbpService.getDeclaration(tenantId, employeeId, financialYear);
    const pool = await fbpService.getEmployeeFbpAllowancePool(tenantId, employeeId);
    const windowStatus = await fbpService.checkWindowStatus(tenantId, employeeId);

    return res.json({
      success: true,
      declaration,
      allocatedFbpAnnualPool: pool,
      windowStatus,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to retrieve FBP declaration." });
  }
});

// POST /api/fbp/declarations (Save draft or submit FBP declaration)
fbpRouter.post("/declarations", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const employeeId = (req.user as any)?.employeeId || req.body.employeeId;
    const { financialYear = "2026-2027", items = [], submitImmediately = false } = req.body;

    if (!employeeId) return res.status(400).json({ error: "Employee ID is required." });

    const declaration = await fbpService.saveDeclaration(
      tenantId,
      employeeId,
      financialYear,
      items,
      submitImmediately
    );

    return res.status(201).json({
      success: true,
      message: submitImmediately
        ? "FBP declaration submitted successfully for HR approval!"
        : "FBP declaration draft saved successfully.",
      declaration,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to save FBP declaration." });
  }
});

// GET /api/fbp/admin/declarations (List all employee declarations for HR Admin)
fbpRouter.get("/admin/declarations", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { financialYear, status } = req.query;

    const declarations = await fbpService.listDeclarations(
      tenantId,
      financialYear ? String(financialYear) : undefined,
      status ? String(status) : undefined
    );

    return res.json({
      success: true,
      count: declarations.length,
      declarations,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list FBP declarations." });
  }
});

// PATCH /api/fbp/admin/declarations/:id/approve (HR Admin approves declaration)
fbpRouter.patch("/admin/declarations/:id/approve", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { id } = req.params;
    const approverName = (req.user as any)?.email || "HR Admin";

    const updated = await fbpService.approveDeclaration(tenantId, id, approverName);

    return res.json({
      success: true,
      message: "FBP declaration approved.",
      declaration: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to approve FBP declaration." });
  }
});
