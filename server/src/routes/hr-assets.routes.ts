import { Router, Response } from "express";
import { requireAuth, AuthRequest, requireRole } from "../middleware/auth.js";
import { resolveTenantContext } from "../middleware/tenant-context.middleware.js";
import { AssetService } from "../services/asset.service.js";
import { getTenantDb } from "../context/tenant-context.js";

export const hrAssetsRouter = Router();

// Strict Authentication and Tenant AsyncLocalStorage Isolation
hrAssetsRouter.use(requireAuth, resolveTenantContext);

// Authorized Asset Administration Roles
const ASSET_ADMIN_ROLES = ["admin", "super_admin", "tenant_admin", "hr_admin", "assets_admin", "hr_manager"];
const requireAssetAdmin = requireRole(...ASSET_ADMIN_ROLES);

// =========================================================================
// 1. DASHBOARD & OVERVIEW AGGREGATES
// =========================================================================
hrAssetsRouter.get("/overview", requireAssetAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const overview = await AssetService.getOverview(tenantId);
    return res.json(overview);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load assets overview" });
  }
});

// =========================================================================
// 2. ASSET CATEGORIES / TYPES
// =========================================================================
hrAssetsRouter.get("/types", requireAssetAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const types = await AssetService.listCategories(tenantId);
    return res.json(types);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load asset categories" });
  }
});

hrAssetsRouter.post("/types", requireAssetAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    if (!req.body?.name?.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }
    const type = await AssetService.createCategory(tenantId, req.body);
    return res.status(201).json(type);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to create asset category" });
  }
});

hrAssetsRouter.put("/types/:id", requireAssetAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.assetCategory.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Asset category not found in this organization" });
    }

    const type = await db.assetCategory.update({
      where: { id: req.params.id },
      data: req.body,
    });
    return res.json(type);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to update category" });
  }
});

hrAssetsRouter.delete("/types/:id", requireAssetAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.assetCategory.findFirst({
      where: { id: req.params.id, tenantId },
      include: { _count: { select: { assets: true } } },
    });
    if (!existing) {
      return res.status(404).json({ error: "Asset category not found in this organization" });
    }
    if (existing._count.assets > 0) {
      return res.status(400).json({
        error: `Cannot delete category with ${existing._count.assets} linked assets. Reassign assets first.`,
      });
    }

    await db.assetCategory.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: "Category deleted successfully" });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to delete category" });
  }
});

// =========================================================================
// 3. DEPRECIATION SCHEDULES
// =========================================================================
hrAssetsRouter.get("/depreciation", requireAssetAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const schedules = await AssetService.listDepreciationSchedules(
      tenantId,
      req.query.assetId as string
    );
    return res.json(schedules);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load depreciation schedules" });
  }
});

hrAssetsRouter.post("/:id/depreciation/calculate", requireAssetAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const schedule = await AssetService.calculateDepreciation(tenantId, req.params.id);
    return res.json(schedule);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to calculate depreciation" });
  }
});

// =========================================================================
// 4. REQUESTS & MAINTENANCE
// =========================================================================
hrAssetsRouter.get("/requests-maintenance", requireAssetAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const [requests, maintenance] = await Promise.all([
      db.assetRequest.findMany({
        where: { tenantId },
        include: { employee: true },
        orderBy: { requestedAt: "desc" },
      }),
      db.assetMaintenance.findMany({
        where: { asset: { tenantId } },
        include: { asset: true },
        orderBy: { serviceDate: "desc" },
      }),
    ]);
    return res.json({ requests, maintenance });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load maintenance records" });
  }
});

hrAssetsRouter.patch("/requests/:id", requireAssetAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const resolved = await AssetService.reviewAssetRequest(
      tenantId,
      req.params.id,
      actorId,
      req.body
    );
    return res.json(resolved);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to review asset request" });
  }
});

hrAssetsRouter.post("/maintenance", requireAssetAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const record = await AssetService.createMaintenance(tenantId, actorId, req.body);
    return res.status(201).json(record);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to record asset maintenance" });
  }
});

hrAssetsRouter.patch("/maintenance/:id/complete", requireAssetAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const updated = await AssetService.completeMaintenance(
      tenantId,
      req.params.id,
      req.body.resolutionDetails
    );
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to complete maintenance record" });
  }
});

// =========================================================================
// 5. ASSETS REGISTRY (CRUD)
// =========================================================================
hrAssetsRouter.get("/", requireAssetAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const assets = await AssetService.listAssets(tenantId, {
      status: req.query.status as string,
      category: req.query.category as string,
      search: req.query.search as string,
    });
    return res.json(assets);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list assets" });
  }
});

hrAssetsRouter.post("/", requireAssetAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";

    if (!req.body?.name?.trim()) {
      return res.status(400).json({ error: "Asset name is required" });
    }

    const asset = await AssetService.createAsset(tenantId, actorId, req.body);
    return res.status(201).json(asset);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to create asset" });
  }
});

hrAssetsRouter.get("/:id", requireAssetAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const asset = await db.asset.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        categoryRel: true,
        assignedEmployee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true, email: true },
        },
        assignments: {
          include: { employee: true },
          orderBy: { assignedAt: "desc" },
        },
        maintenanceLogs: {
          orderBy: { serviceDate: "desc" },
        },
        depreciationSchedules: {
          orderBy: { calculationDate: "desc" },
        },
      },
    });
    if (!asset) return res.status(404).json({ error: "Asset not found" });
    return res.json(asset);
  } catch (err: any) {
    return res.status(404).json({ error: err.message || "Asset not found" });
  }
});

hrAssetsRouter.put("/:id", requireAssetAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();

    const existing = await db.asset.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Asset not found in this organization" });
    }

    // Check duplicate tag if tag changed
    if (req.body.assetTag && req.body.assetTag !== existing.assetTag) {
      const duplicate = await db.asset.findFirst({
        where: { tenantId, assetTag: req.body.assetTag, id: { not: existing.id } },
      });
      if (duplicate) {
        return res.status(400).json({ error: `Asset tag '${req.body.assetTag}' is already in use.` });
      }
    }

    const updated = await db.asset.update({
      where: { id: req.params.id },
      data: req.body,
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to update asset" });
  }
});

hrAssetsRouter.delete("/:id", requireAssetAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();

    const existing = await db.asset.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        assignments: { where: { status: "active" } },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Asset not found in this organization" });
    }

    if (existing.status === "assigned" || existing.assignments.length > 0) {
      return res.status(400).json({
        error: "Cannot delete an asset that is currently assigned. Return the asset before deleting.",
      });
    }

    // Transaction to remove relational dependencies cleanly
    await db.$transaction(async (tx: any) => {
      await tx.assetActivityLog.deleteMany({ where: { assetId: existing.id } });
      await tx.assetDepreciationSchedule.deleteMany({ where: { assetId: existing.id } });
      await tx.assetMaintenance.deleteMany({ where: { assetId: existing.id } });
      await tx.assetAssignment.deleteMany({ where: { assetId: existing.id } });
      await tx.asset.delete({ where: { id: existing.id } });
    });

    return res.json({ success: true, message: "Asset deleted successfully" });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to delete asset" });
  }
});

// =========================================================================
// 6. ASSET ASSIGNMENT & RETURN WORKFLOWS
// =========================================================================
hrAssetsRouter.post("/:id/assign", requireAssetAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";

    if (!req.body?.employeeId) {
      return res.status(400).json({ error: "Target employeeId is required for assignment" });
    }

    const assignment = await AssetService.assignAsset(
      tenantId,
      actorId,
      req.params.id,
      req.body.employeeId,
      req.body.expectedReturnDate,
      req.body.conditionOnAssign,
      req.body.notes
    );
    return res.status(201).json(assignment);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to assign asset" });
  }
});

// Return via assignment ID
hrAssetsRouter.post("/assignments/:id/return", requireAssetAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const returned = await AssetService.returnAsset(
      tenantId,
      actorId,
      req.params.id,
      req.body.returnCondition,
      req.body.returnNotes
    );
    return res.json(returned);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to return asset" });
  }
});

// Convenience return directly via asset ID
hrAssetsRouter.post("/:id/return", requireAssetAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const db = getTenantDb();

    const activeAssignment = await db.assetAssignment.findFirst({
      where: { assetId: req.params.id, asset: { tenantId }, status: "active" },
    });

    if (!activeAssignment) {
      // If no active assignment record exists, ensure asset is marked available
      const asset = await db.asset.findFirst({ where: { id: req.params.id, tenantId } });
      if (!asset) return res.status(404).json({ error: "Asset not found" });

      await db.asset.update({
        where: { id: asset.id },
        data: { status: "available", assignedEmployeeId: null, assignedAt: null },
      });
      return res.json({ success: true, message: "Asset marked available" });
    }

    const returned = await AssetService.returnAsset(
      tenantId,
      actorId,
      activeAssignment.id,
      req.body.returnCondition,
      req.body.returnNotes
    );
    return res.json(returned);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to return asset" });
  }
});
