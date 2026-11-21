import { Router, Response } from "express";
import { RequestManagementService } from "../services/request-management.service";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { prisma } from "../prisma";

export const requestManagementRouter = Router();

requestManagementRouter.use(requireAuth, resolveTenantContext as any);

/**
 * GET /api/service-requests
 * List service requests
 */
requestManagementRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { employeeId, status, category } = req.query;

    const requests = await RequestManagementService.listRequests(tenantId, {
      employeeId: employeeId ? String(employeeId) : undefined,
      status: status as any,
      category: category as any,
    });

    return res.json({ requests, total: requests.length });
  } catch (err: any) {
    console.error("[service-requests:list] error:", err);
    return res.status(500).json({ error: err.message || "Failed to load service requests." });
  }
});

/**
 * POST /api/service-requests
 * Submit service request
 */
requestManagementRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    let employeeId = req.body.employeeId || (req.user as any)?.employeeId;
    let employeeName = req.body.employeeName;

    if (!employeeId && req.user?.userId) {
      const emp = await prisma.employee.findFirst({
        where: { tenantId, userId: req.user.userId },
        select: { id: true, firstName: true, lastName: true },
      });
      if (emp) {
        employeeId = emp.id;
        employeeName = `${emp.firstName} ${emp.lastName}`.trim();
      }
    }

    if (!employeeId) {
      return res.status(400).json({ error: "Employee ID is required." });
    }

    const { category, title, details, priority } = req.body;
    if (!category || !title || !details) {
      return res.status(400).json({ error: "Missing required fields: category, title, details." });
    }

    const request = await RequestManagementService.createRequest(tenantId, {
      employeeId,
      employeeName: employeeName || "Employee Requester",
      category,
      title,
      details,
      priority,
    });

    return res.status(201).json({ request });
  } catch (err: any) {
    console.error("[service-requests:create] error:", err);
    return res.status(500).json({ error: err.message || "Failed to create service request." });
  }
});

/**
 * PUT /api/service-requests/:id/review
 * Review / approve / fulfill service request
 */
requestManagementRouter.put("/:id/review", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const reviewer = req.user?.email || "Reviewer Lead";
    const { status, reviewNotes } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required for review." });
    }

    const request = await RequestManagementService.reviewRequest(
      tenantId,
      req.params.id,
      status,
      reviewer,
      reviewNotes
    );

    return res.json({ request });
  } catch (err: any) {
    console.error("[service-requests:review] error:", err);
    return res.status(500).json({ error: err.message || "Failed to review service request." });
  }
});

/**
 * DELETE /api/service-requests/:id
 * Delete service request
 */
requestManagementRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    await RequestManagementService.deleteRequest(tenantId, req.params.id);
    return res.json({ success: true, message: "Service request deleted." });
  } catch (err: any) {
    console.error("[service-requests:delete] error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete service request." });
  }
});
