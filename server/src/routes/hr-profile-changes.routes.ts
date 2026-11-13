import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { EmployeeChangeRequestService } from "../services/employee-change-request.service";
import { rawPrisma, prisma } from "../prisma";

export const hrProfileChangesRouter = Router();

// Apply auth and tenant resolution to all HR change request routes
hrProfileChangesRouter.use(requireAuth);
hrProfileChangesRouter.use(resolveTenantContext);

// Guard: Must have HR employee view permissions or HR admin role
const requireHrAccess = (req: AuthRequest, res: Response, next: any) => {
  const isHr = Boolean(
    req.user?.roles?.includes("hr_admin") ||
    req.user?.roles?.includes("super_admin") ||
    req.user?.roles?.includes("admin") ||
    req.user?.permissions?.includes("hrm.employees.view") ||
    req.user?.permissions?.includes("hrm.employees.manage")
  );

  if (!isHr) {
    return res.status(403).json({ error: "Access denied. HR employee view permissions required." });
  }
  next();
};

hrProfileChangesRouter.use(requireHrAccess);

/**
 * GET /api/v1/hr/requests/profile-changes/summary
 * Returns KPI counters for requests queue (pending, approved, rejected, etc.)
 */
hrProfileChangesRouter.get("/summary", async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenantId!;

  try {
    const summary = await EmployeeChangeRequestService.getHrSummary(tenantId);
    return res.json({ success: true, data: summary });
  } catch (err: any) {
    console.error("[GET /hr/requests/profile-changes/summary] Error:", err?.message || err);
    return res.status(500).json({ error: "Failed to fetch profile requests summary" });
  }
});

/**
 * GET /api/v1/hr/requests/profile-changes
 * Lists tenant-wide profile change requests with search, filtering, and pagination.
 */
hrProfileChangesRouter.get("/", async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const { status, category, departmentId, search, page, limit } = req.query;

  // Determine if caller has permission to view unmasked sensitive statutory/banking details
  const canViewSensitive = Boolean(
    req.user?.roles?.includes("super_admin") ||
    req.user?.permissions?.includes("hrm.sensitive.view") ||
    req.user?.permissions?.includes("hr:employee:sensitive:read")
  );

  try {
    const result = await EmployeeChangeRequestService.listHrRequests(tenantId, {
      status: typeof status === "string" ? status : undefined,
      category: typeof category === "string" ? category : undefined,
      departmentId: typeof departmentId === "string" ? departmentId : undefined,
      search: typeof search === "string" ? search : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      canViewSensitive,
    });

    return res.json({
      success: true,
      data: result.items,
      pagination: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    });
  } catch (err: any) {
    console.error("[GET /hr/requests/profile-changes] Error:", err?.message || err);
    return res.status(500).json({ error: "Failed to fetch change requests queue" });
  }
});

/**
 * GET /api/v1/hr/requests/profile-changes/:id
 * Fetches single request detail with employee profile, diff, proof media, and approval history.
 */
hrProfileChangesRouter.get("/:id", async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const { id } = req.params;

  const canViewSensitive = Boolean(
    req.user?.roles?.includes("super_admin") ||
    req.user?.permissions?.includes("hrm.sensitive.view") ||
    req.user?.permissions?.includes("hr:employee:sensitive:read")
  );

  try {
    const details = await EmployeeChangeRequestService.getRequestDetails(tenantId, id, {
      isHrAdmin: true,
      canViewSensitive,
    });

    return res.json({ success: true, data: details });
  } catch (err: any) {
    console.error("[GET /hr/requests/profile-changes/:id] Error:", err?.message || err);
    return res.status(404).json({ error: err?.message || "Change request not found" });
  }
});

/**
 * POST /api/v1/hr/requests/profile-changes/:id/action
 * Approves, rejects, or requests correction on a profile change request.
 */
hrProfileChangesRouter.post("/:id/action", async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const userId = req.user!.userId;
  const { id } = req.params;
  const { action, reviewComments, comments } = req.body;

  // Verify caller has HR write/edit permissions
  const hasEditPermission = Boolean(
    req.user?.roles?.includes("hr_admin") ||
    req.user?.roles?.includes("super_admin") ||
    req.user?.roles?.includes("admin") ||
    req.user?.permissions?.includes("hrm.employees.edit") ||
    req.user?.permissions?.includes("hrm.employees.manage")
  );

  if (!hasEditPermission) {
    return res.status(403).json({ error: "Permission denied. HR employee edit permissions required to review requests." });
  }

  // Resolve reviewer employee ID if available
  const db: any = rawPrisma || prisma;
  const reviewerEmployee = await db.employee.findFirst({
    where: { tenantId, userId },
    select: { id: true },
  });

  const canViewSensitive = Boolean(
    req.user?.roles?.includes("super_admin") ||
    req.user?.permissions?.includes("hrm.sensitive.view") ||
    req.user?.permissions?.includes("hr:employee:sensitive:read")
  );

  try {
    const result = await EmployeeChangeRequestService.processReviewDecision({
      tenantId,
      reviewerUserId: userId,
      reviewerEmployeeId: reviewerEmployee?.id || null,
      isHrAdmin: true,
      requestId: id,
      action,
      reviewComments: reviewComments || comments,
      canViewSensitive,
    });

    return res.json(result);
  } catch (err: any) {
    console.error("[POST /hr/requests/profile-changes/:id/action] Error:", err?.message || err);
    return res.status(400).json({ error: err?.message || "Failed to process review decision" });
  }
});

