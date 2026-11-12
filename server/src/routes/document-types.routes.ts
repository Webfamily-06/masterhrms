import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { DocumentTypeService } from "../services/document-type.service";

export const documentTypesRouter = Router();

// Apply auth and tenant resolution to all routes
documentTypesRouter.use(requireAuth, resolveTenantContext);

/**
 * GET /
 * List document types for tenant with search, filtering, and usage metrics.
 */
documentTypesRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { search, filter, isActive } = req.query;

    let activeFilter: boolean | undefined = undefined;
    if (isActive === "true") activeFilter = true;
    if (isActive === "false") activeFilter = false;

    const result = await DocumentTypeService.listDocumentTypes(tenantId, {
      search: typeof search === "string" ? search : undefined,
      filter: filter === "required" || filter === "optional" ? filter : "all",
      isActive: activeFilter,
    });

    return res.json({
      success: true,
      data: result.items,
      counts: result.counts,
    });
  } catch (err: any) {
    console.error("[documentTypesRouter.get] Error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || "Failed to retrieve document types.",
    });
  }
});

/**
 * POST /
 * Create a new document type.
 */
documentTypesRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || (req.user as any)?.id || "system";
    const { name, description, isRequired, code } = req.body;

    const created = await DocumentTypeService.createDocumentType(tenantId, actorId, {
      name,
      description,
      isRequired: isRequired === true || isRequired === "true" || isRequired === "Required",
      code,
    });

    return res.status(201).json({
      success: true,
      message: `Document type "${created.name}" created successfully.`,
      data: created,
    });
  } catch (err: any) {
    console.error("[documentTypesRouter.post] Error:", err);
    return res.status(err.statusCode || 400).json({
      success: false,
      error: err.message || "Failed to create document type.",
    });
  }
});

/**
 * PUT /:id
 * Update an existing document type.
 */
documentTypesRouter.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || (req.user as any)?.id || "system";
    const { id } = req.params;
    const { name, description, isRequired, isActive } = req.body;

    let parsedRequired: boolean | undefined = undefined;
    if (isRequired !== undefined) {
      parsedRequired = isRequired === true || isRequired === "true" || isRequired === "Required";
    }

    const updated = await DocumentTypeService.updateDocumentType(tenantId, actorId, id, {
      name,
      description,
      isRequired: parsedRequired,
      isActive,
    });

    return res.json({
      success: true,
      message: `Document type "${updated.name}" updated successfully.`,
      data: updated,
    });
  } catch (err: any) {
    console.error("[documentTypesRouter.put] Error:", err);
    return res.status(err.statusCode || 400).json({
      success: false,
      error: err.message || "Failed to update document type.",
    });
  }
});

/**
 * DELETE /:id
 * Delete or deactivate document type.
 */
documentTypesRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || (req.user as any)?.id || "system";
    const { id } = req.params;
    const forceDeactivate =
      req.query.deactivate === "true" ||
      req.body?.deactivate === true;

    const result = await DocumentTypeService.deleteDocumentType(
      tenantId,
      actorId,
      id,
      forceDeactivate
    );

    return res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error("[documentTypesRouter.delete] Error:", err);
    return res.status(err.statusCode || 400).json({
      success: false,
      error: err.message || "Failed to delete document type.",
      canDeactivate: err.canDeactivate,
      totalUsage: err.totalUsage,
    });
  }
});

/**
 * POST /bulk-delete
 * Bulk delete or deactivate document types.
 */
documentTypesRouter.post("/bulk-delete", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const roles = req.user?.roles || [];
    const isAuthorizedHR = roles.some((r: string) =>
      ["admin", "super_admin", "tenant_admin", "hr_admin", "hr_manager"].includes(r)
    );
    if (!isAuthorizedHR) {
      return res.status(403).json({ error: "Access denied. HR Administrator privileges required." });
    }

    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array is required" });
    }

    const validIds = ids.filter((id: any) => typeof id === "string" && id.trim().length > 0);
    if (validIds.length === 0) {
      return res.status(400).json({ error: "Valid string IDs array required" });
    }

    const actorId = req.user?.userId || (req.user as any)?.id || "system";
    let deletedCount = 0;
    let failedCount = 0;
    const failures: { id: string; reason: string }[] = [];

    for (const id of validIds) {
      try {
        await DocumentTypeService.deleteDocumentType(tenantId, actorId, id, false);
        deletedCount++;
      } catch (err: any) {
        failedCount++;
        failures.push({ id, reason: err.message || "Deletion failed" });
      }
    }

    return res.json({
      success: true,
      deletedCount,
      failedCount,
      failures,
      message: `Processed ${validIds.length} document type(s). ${deletedCount} deleted, ${failedCount} failed.`,
    });
  } catch (err: any) {
    console.error("[documentTypesRouter.bulk-delete] Error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || "Failed to bulk delete document types.",
    });
  }
});


