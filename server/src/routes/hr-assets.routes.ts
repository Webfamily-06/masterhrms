import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { AssetService } from "../services/asset.service.js";
import { getTenantDb } from "../context/tenant-context.js";

export const hrAssetsRouter = Router();

// Overview
hrAssetsRouter.get("/overview", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const overview = await AssetService.getOverview(tenantId);
    return res.json(overview);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load assets overview" });
  }
});

// Categories / Types
hrAssetsRouter.get("/types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const types = await AssetService.listCategories(tenantId);
    return res.json(types);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrAssetsRouter.post("/types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const type = await AssetService.createCategory(tenantId, req.body);
    return res.status(201).json(type);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrAssetsRouter.put("/types/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const db = getTenantDb();
    const type = await db.assetCategory.update({
      where: { id: req.params.id },
      data: req.body,
    });
    return res.json(type);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrAssetsRouter.delete("/types/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const db = getTenantDb();
    await db.assetCategory.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Depreciation
hrAssetsRouter.get("/depreciation", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const schedules = await AssetService.listDepreciationSchedules(
      tenantId,
      req.query.assetId as string
    );
    return res.json(schedules);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrAssetsRouter.post("/:id/depreciation/calculate", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const schedule = await AssetService.calculateDepreciation(tenantId, req.params.id);
    return res.json(schedule);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Requests & Maintenance
hrAssetsRouter.get("/requests-maintenance", requireAuth, async (req: AuthRequest, res: Response) => {
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
    return res.status(500).json({ error: err.message });
  }
});

hrAssetsRouter.patch("/requests/:id", requireAuth, async (req: AuthRequest, res: Response) => {
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
    return res.status(400).json({ error: err.message });
  }
});

hrAssetsRouter.post("/maintenance", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const record = await AssetService.createMaintenance(tenantId, actorId, req.body);
    return res.status(201).json(record);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrAssetsRouter.patch("/maintenance/:id/complete", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const updated = await AssetService.completeMaintenance(
      tenantId,
      req.params.id,
      req.body.resolutionDetails
    );
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Assets Registry
hrAssetsRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const assets = await AssetService.listAssets(tenantId, {
      status: req.query.status as string,
      category: req.query.category as string,
      search: req.query.search as string,
    });
    return res.json(assets);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrAssetsRouter.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const asset = await AssetService.createAsset(tenantId, actorId, req.body);
    return res.status(201).json(asset);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrAssetsRouter.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const asset = await db.asset.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        categoryRel: true,
        assignments: { include: { employee: true } },
        maintenanceLogs: true,
        depreciationSchedules: true,
      },
    });
    if (!asset) return res.status(404).json({ error: "Asset not found" });
    return res.json(asset);
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});

hrAssetsRouter.put("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const db = getTenantDb();
    const updated = await db.asset.update({
      where: { id: req.params.id },
      data: req.body,
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrAssetsRouter.post("/:id/assign", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
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
    return res.status(400).json({ error: err.message });
  }
});

hrAssetsRouter.post("/assignments/:id/return", requireAuth, async (req: AuthRequest, res: Response) => {
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
    return res.status(400).json({ error: err.message });
  }
});
