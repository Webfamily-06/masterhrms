import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { resolveTenantId } from "../lib/tenant";
import { checkTenantEntitlement } from "../middleware/entitlements";
import { StrategyStudioService, StrategyMatrixType } from "../services/strategy-studio.service";

export const strategyStudioRouter = Router();

strategyStudioRouter.use(requireAuth, resolveTenantContext);

/**
 * GET /api/strategy-studio/templates/:type
 * Get matrix template structure
 */
strategyStudioRouter.get("/templates/:type", (req: AuthRequest, res: Response) => {
  const type = req.params.type as StrategyMatrixType;
  const template = StrategyStudioService.getTemplate(type);
  return res.json({ success: true, template });
});

/**
 * GET /api/strategy-studio/documents
 * List strategy documents for tenant
 */
strategyStudioRouter.get("/documents", (req: AuthRequest, res: Response) => {
  const tenantId = resolveTenantId(req, res);
  if (!tenantId) return;

  const type = req.query.type as StrategyMatrixType | undefined;
  const docs = StrategyStudioService.listDocuments(tenantId, type);
  return res.json({ success: true, documents: docs });
});

/**
 * POST /api/strategy-studio/documents
 * Create strategy matrix document from template with entitlement check
 */
strategyStudioRouter.post("/documents", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { matrixType = "swot", title = "Untitled Matrix", description, initialItems } = req.body;
    const requiredAddon = matrixType === "swot" ? "swot" : matrixType === "pestel" ? "pestel" : "swot";

    const isSuper = req.user?.roles?.includes("super_admin") || false;
    const check = await checkTenantEntitlement(tenantId, requiredAddon, isSuper);
    if (!check.entitled) {
      return res.status(403).json({
        error: `Add-on '${requiredAddon}' is not active on this workspace`,
        code: "ADDON_REQUIRED",
        key: requiredAddon,
      });
    }

    const doc = await StrategyStudioService.createDocument(
      tenantId,
      { matrixType, title, description, initialItems },
      req.user?.id
    );

    return res.json({ success: true, document: doc });
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || "Failed to create strategy document" });
  }
});

/**
 * POST /api/strategy-studio/documents/:id/items
 * Add an item to a category within the strategy document
 */
strategyStudioRouter.post("/documents/:id/items", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { category, text, impactScore } = req.body;
    if (!category || !text) {
      return res.status(400).json({ error: "Category and text are required." });
    }

    const doc = await StrategyStudioService.updateCategoryItem(
      tenantId,
      req.params.id,
      category,
      { text, impactScore },
      req.user?.id
    );

    return res.json({ success: true, document: doc });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to add strategy item" });
  }
});

/**
 * GET /api/strategy-studio/documents/:id/export
 * Export strategy matrix document
 */
strategyStudioRouter.get("/documents/:id/export", (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const exported = StrategyStudioService.exportDocument(tenantId, req.params.id);
    return res.json({ success: true, ...exported });
  } catch (err: any) {
    if (err.message?.includes("not found")) {
      return res.status(404).json({ error: "Strategy document not found." });
    }
    return res.status(500).json({ error: err.message || "Failed to export strategy document" });
  }
});
