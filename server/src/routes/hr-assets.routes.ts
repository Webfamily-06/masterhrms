import { Router, Response } from "express";
import { Prisma } from "@prisma/client";
import { requireAuth, AuthRequest, requireRole } from "../middleware/auth.js";
import { resolveTenantContext } from "../middleware/tenant-context.middleware.js";
import { AssetService } from "../services/asset.service.js";
import { getTenantDb } from "../context/tenant-context.js";

export const hrAssetsRouter = Router();

// Strict Authentication and Tenant AsyncLocalStorage Isolation
hrAssetsRouter.use(requireAuth, resolveTenantContext);

// Authorized Asset Administration Roles
const ASSET_ADMIN_ROLES = [
  "admin",
  "super_admin",
  "tenant_admin",
  "hr_admin",
  "assets_admin",
  "hr_manager",
];
const requireAssetAdmin = requireRole(...ASSET_ADMIN_ROLES);

// =========================================================================
// HELPERS: METADATA & LIVE DEPRECIATION CALCULATION
// =========================================================================
interface AssetDocumentItem {
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
  uploadedAt?: string;
}

interface AssetMeta {
  warrantyInfo?: string;
  imageName?: string;
  documents?: AssetDocumentItem[];
}

function normalizeMethod(raw?: string | null): string {
  const m = String(raw || "straight_line").toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (m === "declining_balance" || m === "reducing_balance") return "declining_balance";
  if (m === "double_declining" || m === "double_declining_balance") return "double_declining";
  if (m === "units_of_production") return "units_of_production";
  return "straight_line";
}

function formatMethodLabel(method: string): string {
  switch (normalizeMethod(method)) {
    case "declining_balance":
      return "Declining Balance";
    case "double_declining":
      return "Double Declining";
    case "units_of_production":
      return "Units of Production";
    default:
      return "Straight Line";
  }
}

function computeAssetDepreciation(asset: any) {
  const purchaseCost = Math.max(0, Number(asset.purchasePrice || 0));
  const salvageValue = Math.max(0, Math.min(purchaseCost, Number(asset.salvageValue || 0)));
  const usefulLifeMonths = Math.max(1, Number(asset.usefulLifeMonths || 60));
  const usefulLifeYears = Math.round((usefulLifeMonths / 12) * 100) / 100;
  const method = normalizeMethod(asset.depreciationMethod);
  const depreciableAmount = Math.max(0, purchaseCost - salvageValue);

  const now = new Date();
  const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : now;
  const msElapsed = Math.max(0, now.getTime() - purchaseDate.getTime());
  const monthsElapsed = Math.min(usefulLifeMonths, msElapsed / (1000 * 60 * 60 * 24 * 30.4375));
  const yearsElapsed = monthsElapsed / 12;

  const monthlyStraight = depreciableAmount / usefulLifeMonths;
  const annualStraight = depreciableAmount / Math.max(usefulLifeYears, 1 / 12);

  let accumulatedDepreciation = 0;
  let annualDepreciation = annualStraight;
  let monthlyDepreciation = monthlyStraight;

  if (method === "declining_balance" || method === "double_declining") {
    const multiplier = method === "double_declining" ? 2 : 1.5;
    const rate = Math.min(1, multiplier / Math.max(usefulLifeYears, 1));
    const bookVal = Math.max(salvageValue, purchaseCost * Math.pow(1 - rate, yearsElapsed));
    accumulatedDepreciation = Math.min(depreciableAmount, Math.max(0, purchaseCost - bookVal));
    annualDepreciation = Math.min(depreciableAmount, purchaseCost * rate);
    monthlyDepreciation = annualDepreciation / 12;
  } else {
    accumulatedDepreciation = Math.min(depreciableAmount, monthlyStraight * monthsElapsed);
  }

  const currentValue = Math.max(salvageValue, purchaseCost - accumulatedDepreciation);
  const depreciationPercent =
    purchaseCost > 0 ? Math.round((accumulatedDepreciation / purchaseCost) * 10000) / 100 : 0;
  const lifeConsumedPercent =
    usefulLifeMonths > 0
      ? Math.min(100, Math.round((monthsElapsed / usefulLifeMonths) * 1000) / 10)
      : 0;

  return {
    method,
    methodLabel: formatMethodLabel(method),
    purchaseCost: Math.round(purchaseCost * 100) / 100,
    salvageValue: Math.round(salvageValue * 100) / 100,
    depreciableAmount: Math.round(depreciableAmount * 100) / 100,
    usefulLifeMonths,
    usefulLifeYears,
    monthsElapsed: Math.round(monthsElapsed * 10) / 10,
    annualDepreciation: Math.round(annualDepreciation * 100) / 100,
    monthlyDepreciation: Math.round(monthlyDepreciation * 100) / 100,
    accumulatedDepreciation: Math.round(accumulatedDepreciation * 100) / 100,
    currentValue: Math.round(currentValue * 100) / 100,
    depreciationPercent,
    lifeConsumedPercent,
  };
}

async function getAssetMetaMap(db: any, tenantId: string, assetIds: string[]): Promise<Map<string, AssetMeta>> {
  const map = new Map<string, AssetMeta>();
  if (!assetIds.length) return map;
  const rows = await db.setting.findMany({
    where: {
      scope: "TENANT",
      scopeId: tenantId,
      group: "asset_meta",
      key: { in: assetIds },
    },
  });
  for (const row of rows) {
    const val =
      row.valueJson && typeof row.valueJson === "object" && !Array.isArray(row.valueJson)
        ? (row.valueJson as Record<string, any>)
        : {};
    map.set(row.key, {
      warrantyInfo: typeof val.warrantyInfo === "string" ? val.warrantyInfo : "",
      imageName: typeof val.imageName === "string" ? val.imageName : "",
      documents: Array.isArray(val.documents) ? val.documents : [],
    });
  }
  return map;
}

async function upsertAssetMeta(db: any, tenantId: string, assetId: string, patch: Partial<AssetMeta>) {
  const existing = await db.setting.findFirst({
    where: {
      scope: "TENANT",
      scopeId: tenantId,
      group: "asset_meta",
      key: assetId,
    },
  });
  const current =
    existing?.valueJson && typeof existing.valueJson === "object" && !Array.isArray(existing.valueJson)
      ? (existing.valueJson as Record<string, any>)
      : {};
  const merged = {
    ...current,
    ...(patch.warrantyInfo !== undefined ? { warrantyInfo: patch.warrantyInfo } : {}),
    ...(patch.imageName !== undefined ? { imageName: patch.imageName } : {}),
    ...(patch.documents !== undefined ? { documents: patch.documents } : {}),
  };

  if (existing) {
    await db.setting.update({
      where: { id: existing.id },
      data: { valueJson: merged },
    });
  } else {
    await db.setting.create({
      data: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "asset_meta",
        key: assetId,
        valueType: "json",
        valueJson: merged,
      },
    });
  }
  return merged;
}

function extractPrimaryImage(images: any): string | null {
  if (!images) return null;
  if (typeof images === "string") return images;
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0];
    return typeof first === "string" ? first : first?.url || null;
  }
  if (typeof images === "object" && typeof images.url === "string") return images.url;
  return null;
}

function enrichAsset(asset: any, meta?: AssetMeta) {
  const depreciation = computeAssetDepreciation(asset);
  const imageUrl = extractPrimaryImage(asset.images);
  return {
    ...asset,
    purchasePrice: asset.purchasePrice !== null && asset.purchasePrice !== undefined ? Number(asset.purchasePrice) : 0,
    salvageValue: asset.salvageValue !== null && asset.salvageValue !== undefined ? Number(asset.salvageValue) : 0,
    imageUrl,
    warrantyInfo: meta?.warrantyInfo || "",
    imageName: meta?.imageName || "",
    documents: meta?.documents || [],
    depreciation,
  };
}

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

hrAssetsRouter.get("/dashboard", requireAssetAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();

    const assets = await db.asset.findMany({
      where: { tenantId },
      include: {
        categoryRel: { select: { id: true, name: true } },
        assignedEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalAssets = assets.length;
    const assignedAssets = assets.filter((a: any) => a.status === "assigned").length;
    const availableAssets = assets.filter((a: any) => a.status === "available").length;
    const maintenanceAssets = assets.filter((a: any) => a.status === "maintenance").length;
    const disposedAssets = assets.filter((a: any) => a.status === "disposed").length;

    const assignedRate = totalAssets > 0 ? Math.round((assignedAssets / totalAssets) * 1000) / 10 : 0;
    const availableRate = totalAssets > 0 ? Math.round((availableAssets / totalAssets) * 1000) / 10 : 0;

    // Valuation & live depreciation totals
    let totalPurchaseValue = 0;
    let totalCurrentValue = 0;
    let totalDepreciation = 0;

    // Monthly buckets for current year (Jan..Dec)
    const now = new Date();
    const currentYear = now.getFullYear();
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const purchaseByMonth = new Array(12).fill(0);
    const assignedByMonth = new Array(12).fill(0);
    const availableByMonth = new Array(12).fill(0);
    const valueByMonth = new Array(12).fill(0);
    const depByMonth = new Array(12).fill(0);

    let totalThisYear = 0;
    let totalLastYear = 0;

    const deptCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();

    for (const a of assets) {
      const dep = computeAssetDepreciation(a);
      totalPurchaseValue += dep.purchaseCost;
      totalCurrentValue += dep.currentValue;
      totalDepreciation += dep.accumulatedDepreciation;

      const refDate = a.purchaseDate ? new Date(a.purchaseDate) : new Date(a.createdAt);
      const yr = refDate.getFullYear();
      const mo = refDate.getMonth();
      if (yr === currentYear) {
        totalThisYear += 1;
        purchaseByMonth[mo] += 1;
        if (a.status === "assigned") assignedByMonth[mo] += 1;
        if (a.status === "available") availableByMonth[mo] += 1;
        valueByMonth[mo] += dep.purchaseCost;
        depByMonth[mo] += dep.accumulatedDepreciation;
      } else if (yr === currentYear - 1) {
        totalLastYear += 1;
        // Include in monthly distribution when current year has few items
        purchaseByMonth[mo] += 1;
        valueByMonth[mo] += dep.purchaseCost;
        depByMonth[mo] += dep.accumulatedDepreciation;
      } else {
        purchaseByMonth[mo] += 1;
        valueByMonth[mo] += dep.purchaseCost;
        depByMonth[mo] += dep.accumulatedDepreciation;
      }

      const deptName = a.assignedEmployee?.department?.name || "Unassigned";
      deptCounts.set(deptName, (deptCounts.get(deptName) || 0) + 1);

      const catName = a.categoryRel?.name || a.category || "Uncategorized";
      categoryCounts.set(catName, (categoryCounts.get(catName) || 0) + 1);
    }

    const growthPercent =
      totalLastYear > 0
        ? Math.round(((totalThisYear - totalLastYear) / totalLastYear) * 100)
        : totalThisYear > 0
          ? 100
          : 0;

    const depreciationPercent =
      totalPurchaseValue > 0
        ? Math.round((totalDepreciation / totalPurchaseValue) * 1000) / 10
        : 0;
    const currentValuePercent =
      totalPurchaseValue > 0
        ? Math.round((totalCurrentValue / totalPurchaseValue) * 1000) / 10
        : 0;

    const deptEntries = Array.from(deptCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const categoryEntries = Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        percent: totalAssets > 0 ? Math.round((count / totalAssets) * 100) : 0,
      }));

    const recentAssets = assets.map((a: any) => ({
      id: a.id,
      assetTag: a.assetTag,
      name: a.name,
      category: a.categoryRel?.name || a.category || "Uncategorized",
      categoryId: a.categoryId,
      assignedTo: a.assignedEmployee
        ? `${a.assignedEmployee.firstName || ""} ${a.assignedEmployee.lastName || ""}`.trim()
        : null,
      purchaseDate: a.purchaseDate,
      warrantyExpiry: a.warrantyExpiry,
      status: a.status,
      purchasePrice: Number(a.purchasePrice || 0),
    }));

    return res.json({
      summary: {
        totalAssets,
        assignedAssets,
        availableAssets,
        maintenanceAssets,
        disposedAssets,
        assignedRate,
        availableRate,
        totalPurchaseValue: Math.round(totalPurchaseValue * 100) / 100,
        totalCurrentValue: Math.round(totalCurrentValue * 100) / 100,
        totalDepreciation: Math.round(totalDepreciation * 100) / 100,
        depreciationPercent,
        currentValuePercent,
      },
      purchaseTrend: {
        labels: monthLabels,
        data: purchaseByMonth,
        total: totalAssets,
        growthPercent,
      },
      assetsByDepartment: {
        labels: deptEntries.map(([name]) => name),
        data: deptEntries.map(([, count]) => count),
      },
      assetsByCategory: categoryEntries,
      sparklines: {
        total: purchaseByMonth,
        assigned: assignedByMonth,
        available: availableByMonth,
        value: valueByMonth.map((v) => Math.round(v)),
        depreciation: depByMonth.map((v) => Math.round(v)),
      },
      recentAssets,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load asset dashboard data" });
  }
});

// =========================================================================
// 2. ASSET CATEGORIES / TYPES (GET, POST, PUT, PATCH, DELETE)
// =========================================================================
hrAssetsRouter.get("/types", requireAssetAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const search = String(req.query.search || "").trim();

    const where: any = { tenantId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const types = await db.assetCategory.findMany({
      where,
      include: { _count: { select: { assets: true } } },
      orderBy: { name: "asc" },
    });
    return res.json(types);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load asset categories" });
  }
});

hrAssetsRouter.post("/types", requireAssetAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const name = String(req.body?.name || "").trim();
    const description = req.body?.description !== undefined ? String(req.body.description).trim() : "";
    const icon = req.body?.icon ? String(req.body.icon).trim() : "ph-shapes";

    if (!name) {
      return res.status(400).json({ error: "Asset type name is required" });
    }

    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "asset-type";
    const existingSlug = await db.assetCategory.findFirst({
      where: { tenantId, slug: baseSlug },
    });
    if (existingSlug) {
      return res.status(400).json({ error: `Asset type '${name}' already exists` });
    }

    const prefix =
      req.body?.prefix?.trim().toUpperCase() ||
      name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase() ||
      "AST";

    const created = await db.assetCategory.create({
      data: {
        tenantId,
        name,
        slug: baseSlug,
        description: description || null,
        prefix,
        icon,
      },
      include: { _count: { select: { assets: true } } },
    });
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to create asset type" });
  }
});

const handleUpdateAssetType = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.assetCategory.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Asset type not found in this organization" });
    }

    const updateData: any = {};
    if (req.body?.name !== undefined) {
      const cleanName = String(req.body.name).trim();
      if (!cleanName) return res.status(400).json({ error: "Asset type name cannot be empty" });
      updateData.name = cleanName;
      const newSlug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || existing.slug;
      if (newSlug !== existing.slug) {
        const conflict = await db.assetCategory.findFirst({
          where: { tenantId, slug: newSlug, id: { not: existing.id } },
        });
        if (conflict) {
          return res.status(400).json({ error: `Asset type '${cleanName}' already exists` });
        }
        updateData.slug = newSlug;
      }
    }
    if (req.body?.description !== undefined) {
      updateData.description = String(req.body.description).trim() || null;
    }
    if (req.body?.prefix !== undefined && String(req.body.prefix).trim()) {
      updateData.prefix = String(req.body.prefix).trim().toUpperCase();
    }
    if (req.body?.icon !== undefined && String(req.body.icon).trim()) {
      updateData.icon = String(req.body.icon).trim();
    }

    const updated = await db.assetCategory.update({
      where: { id: req.params.id },
      data: updateData,
      include: { _count: { select: { assets: true } } },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to update asset type" });
  }
};

hrAssetsRouter.put("/types/:id", requireAssetAdmin, handleUpdateAssetType);
hrAssetsRouter.patch("/types/:id", requireAssetAdmin, handleUpdateAssetType);

hrAssetsRouter.delete("/types/:id", requireAssetAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.assetCategory.findFirst({
      where: { id: req.params.id, tenantId },
      include: { _count: { select: { assets: true } } },
    });
    if (!existing) {
      return res.status(404).json({ error: "Asset type not found in this organization" });
    }
    if (existing._count.assets > 0) {
      return res.status(400).json({
        error: `Cannot delete '${existing.name}' with ${existing._count.assets} linked assets. Reassign assets first.`,
      });
    }

    await db.assetCategory.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: "Asset type deleted successfully" });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to delete asset type" });
  }
});

// =========================================================================
// 3. DEPRECIATION REPORT & SCHEDULES
// =========================================================================
hrAssetsRouter.get("/depreciation/report", requireAssetAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { categoryId, dateFrom, dateTo, search } = req.query;

    const where: any = { tenantId };
    if (categoryId && categoryId !== "all") {
      where.categoryId = String(categoryId);
    }
    if (dateFrom || dateTo) {
      where.purchaseDate = {};
      if (dateFrom) where.purchaseDate.gte = new Date(String(dateFrom));
      if (dateTo) {
        const end = new Date(String(dateTo));
        end.setHours(23, 59, 59, 999);
        where.purchaseDate.lte = end;
      }
    }
    if (search && String(search).trim()) {
      const q = String(search).trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { assetTag: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
      ];
    }

    const assets = await db.asset.findMany({
      where,
      include: {
        categoryRel: { select: { id: true, name: true, prefix: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = assets.map((asset: any) => {
      const dep = computeAssetDepreciation(asset);
      return {
        id: asset.id,
        name: asset.name,
        assetTag: asset.assetTag,
        categoryId: asset.categoryId,
        categoryName: asset.categoryRel?.name || asset.category || "Uncategorized",
        imageUrl: extractPrimaryImage(asset.images),
        purchaseDate: asset.purchaseDate,
        purchaseCost: dep.purchaseCost,
        depreciationMethod: dep.method,
        depreciationMethodLabel: dep.methodLabel,
        usefulLifeMonths: dep.usefulLifeMonths,
        usefulLifeYears: dep.usefulLifeYears,
        salvageValue: dep.salvageValue,
        currentValue: dep.currentValue,
        depreciation: dep.accumulatedDepreciation,
        depreciationPercent: dep.depreciationPercent,
        lifeConsumedPercent: dep.lifeConsumedPercent,
        annualDepreciation: dep.annualDepreciation,
        monthlyDepreciation: dep.monthlyDepreciation,
      };
    });

    const totalPurchaseValue = rows.reduce((s: number, r: any) => s + r.purchaseCost, 0);
    const totalCurrentValue = rows.reduce((s: number, r: any) => s + r.currentValue, 0);
    const totalDepreciation = rows.reduce((s: number, r: any) => s + r.depreciation, 0);

    const currentValuePercent =
      totalPurchaseValue > 0 ? Math.round((totalCurrentValue / totalPurchaseValue) * 100) : 0;
    const depreciationPercent =
      totalPurchaseValue > 0 ? Math.round((totalDepreciation / totalPurchaseValue) * 100) : 0;

    return res.json({
      summary: {
        totalPurchaseValue: Math.round(totalPurchaseValue * 100) / 100,
        totalCurrentValue: Math.round(totalCurrentValue * 100) / 100,
        totalDepreciation: Math.round(totalDepreciation * 100) / 100,
        currentValuePercent,
        depreciationPercent,
        assetCount: rows.length,
      },
      assets: rows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to generate depreciation report" });
  }
});

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
      actorId,
      req.params.id,
      req.body.status,
      req.body.adminNotes
    );
    return res.json(resolved);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to review asset request" });
  }
});

hrAssetsRouter.post("/maintenance", requireAssetAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const assetId = String(req.body?.assetId || "").trim();
    if (!assetId) return res.status(400).json({ error: "assetId is required" });

    const asset = await db.asset.findFirst({ where: { id: assetId, tenantId } });
    if (!asset) return res.status(404).json({ error: "Asset not found" });

    const record = await db.assetMaintenance.create({
      data: {
        assetId,
        serviceType: req.body.serviceType || req.body.maintenanceType || "corrective",
        serviceDate: req.body.startDate || req.body.serviceDate ? new Date(req.body.startDate || req.body.serviceDate) : new Date(),
        nextServiceDate: req.body.endDate || req.body.nextServiceDate ? new Date(req.body.endDate || req.body.nextServiceDate) : null,
        vendor: req.body.supplier || req.body.vendor || null,
        cost: req.body.cost !== undefined && req.body.cost !== "" ? new Prisma.Decimal(Number(req.body.cost)) : new Prisma.Decimal(0),
        issueDescription: req.body.details || req.body.issueDescription || "Scheduled maintenance",
        status: req.body.status || "in_progress",
      },
    });

    await db.asset.update({
      where: { id: assetId },
      data: { status: "maintenance" },
    });

    return res.status(201).json(record);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to record asset maintenance" });
  }
});

hrAssetsRouter.post("/:id/maintenance", requireAssetAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const assetId = req.params.id;

    const asset = await db.asset.findFirst({ where: { id: assetId, tenantId } });
    if (!asset) return res.status(404).json({ error: "Asset not found" });

    const details = String(req.body?.details || req.body?.issueDescription || "").trim();
    if (!details) return res.status(400).json({ error: "Maintenance details are required" });

    const record = await db.assetMaintenance.create({
      data: {
        assetId,
        serviceType: req.body.maintenanceType || req.body.serviceType || "preventive",
        serviceDate: req.body.startDate || req.body.serviceDate ? new Date(req.body.startDate || req.body.serviceDate) : new Date(),
        nextServiceDate: req.body.endDate || req.body.nextServiceDate ? new Date(req.body.endDate || req.body.nextServiceDate) : null,
        vendor: req.body.supplier || req.body.vendor || null,
        cost: req.body.cost !== undefined && req.body.cost !== "" ? new Prisma.Decimal(Number(req.body.cost)) : new Prisma.Decimal(0),
        issueDescription: details,
        status: req.body.status || "in_progress",
      },
    });

    await db.asset.update({
      where: { id: assetId },
      data: { status: "maintenance" },
    });

    await db.assetActivityLog.create({
      data: {
        tenantId,
        assetId,
        actionType: "maintenance",
        performedBy: req.user?.email || req.user?.userId || "Admin",
        details: `Scheduled ${record.serviceType} maintenance: ${details}`,
      },
    });

    return res.status(201).json(record);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to schedule maintenance" });
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
// 5. ASSETS REGISTRY (GET, POST, PUT, PATCH, DELETE)
// =========================================================================
hrAssetsRouter.get("/", requireAssetAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { status, condition, categoryId, category, dateFrom, dateTo, search } = req.query;

    const where: any = { tenantId };
    if (status && status !== "all") where.status = String(status).toLowerCase();
    if (condition && condition !== "all") where.condition = String(condition).toLowerCase();
    if (categoryId && categoryId !== "all") where.categoryId = String(categoryId);
    if (category && category !== "all") where.category = String(category);
    if (dateFrom || dateTo) {
      where.purchaseDate = {};
      if (dateFrom) where.purchaseDate.gte = new Date(String(dateFrom));
      if (dateTo) {
        const end = new Date(String(dateTo));
        end.setHours(23, 59, 59, 999);
        where.purchaseDate.lte = end;
      }
    }
    if (search && String(search).trim()) {
      const q = String(search).trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { assetTag: { contains: q, mode: "insensitive" } },
        { serialNumber: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
      ];
    }

    const [assets, allCount, availableCount, assignedCount, maintenanceCount, disposedCount] =
      await Promise.all([
        db.asset.findMany({
          where,
          include: {
            categoryRel: { select: { id: true, name: true, prefix: true } },
            assignedEmployee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
                email: true,
              },
            },
            assignments: {
              where: { status: "active" },
              take: 1,
              orderBy: { assignedAt: "desc" },
              include: {
                employee: {
                  select: { id: true, firstName: true, lastName: true, email: true },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        db.asset.count({ where: { tenantId } }),
        db.asset.count({ where: { tenantId, status: "available" } }),
        db.asset.count({ where: { tenantId, status: "assigned" } }),
        db.asset.count({ where: { tenantId, status: "maintenance" } }),
        db.asset.count({ where: { tenantId, status: "disposed" } }),
      ]);

    const metaMap = await getAssetMetaMap(
      db,
      tenantId,
      assets.map((a: any) => a.id)
    );
    const enriched = assets.map((a: any) => enrichAsset(a, metaMap.get(a.id)));

    return res.json({
      assets: enriched,
      counts: {
        all: allCount,
        available: availableCount,
        assigned: assignedCount,
        maintenance: maintenanceCount,
        disposed: disposedCount,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list assets" });
  }
});

hrAssetsRouter.post("/", requireAssetAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const db = getTenantDb();

    const name = String(req.body?.name || "").trim();
    if (!name) {
      return res.status(400).json({ error: "Asset name is required" });
    }

    const categoryId = req.body.categoryId ? String(req.body.categoryId).trim() : null;
    let categoryName = String(req.body.category || "General").trim();

    if (categoryId) {
      const cat = await db.assetCategory.findFirst({ where: { id: categoryId, tenantId } });
      if (!cat) {
        return res.status(400).json({ error: "Selected asset type does not exist" });
      }
      categoryName = cat.name;
    }

    const assetTag =
      String(req.body.assetTag || req.body.assetCode || "").trim() ||
      `AST-${Date.now().toString().slice(-6)}`;

    const existingTag = await db.asset.findFirst({ where: { tenantId, assetTag } });
    if (existingTag) {
      return res.status(400).json({ error: `Asset code '${assetTag}' already exists.` });
    }

    const usefulLifeMonths =
      req.body.usefulLifeMonths !== undefined && req.body.usefulLifeMonths !== ""
        ? Math.max(1, Number(req.body.usefulLifeMonths))
        : req.body.usefulLifeYears !== undefined && req.body.usefulLifeYears !== ""
          ? Math.max(1, Math.round(Number(req.body.usefulLifeYears) * 12))
          : 60;

    const purchaseCostRaw = req.body.purchasePrice ?? req.body.purchaseCost ?? 0;
    const salvageRaw = req.body.salvageValue ?? 0;

    const imagesPayload =
      req.body.images !== undefined
        ? req.body.images
        : req.body.imageUrl
          ? [req.body.imageUrl]
          : null;

    const created = await db.asset.create({
      data: {
        tenantId,
        assetTag,
        name,
        category: categoryName,
        categoryId,
        brand: req.body.brand || null,
        model: req.body.model || null,
        serialNumber: req.body.serialNumber ? String(req.body.serialNumber).trim() : null,
        location: req.body.location ? String(req.body.location).trim() : "Main Office",
        images: imagesPayload,
        purchaseDate: req.body.purchaseDate ? new Date(req.body.purchaseDate) : new Date(),
        purchasePrice: new Prisma.Decimal(Number(purchaseCostRaw) || 0),
        vendor: req.body.vendor || req.body.supplier || null,
        warrantyExpiry: req.body.warrantyExpiry ? new Date(req.body.warrantyExpiry) : null,
        condition: String(req.body.condition || "good").toLowerCase(),
        status: String(req.body.status || "available").toLowerCase(),
        notes: req.body.notes ?? req.body.description ?? null,
        depreciationMethod: normalizeMethod(req.body.depreciationMethod),
        usefulLifeMonths,
        salvageValue: new Prisma.Decimal(Number(salvageRaw) || 0),
        qrCode: `/a/${assetTag}`,
      },
      include: {
        categoryRel: { select: { id: true, name: true, prefix: true } },
        assignedEmployee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    const meta = await upsertAssetMeta(db, tenantId, created.id, {
      warrantyInfo: req.body.warrantyInfo ?? "",
      imageName: req.body.imageName ?? "",
      documents: Array.isArray(req.body.documents) ? req.body.documents : [],
    });

    await db.assetActivityLog.create({
      data: {
        tenantId,
        assetId: created.id,
        actionType: "create",
        performedBy: req.user?.email || actorId,
        details: `Registered asset '${created.name}' (${created.assetTag})`,
      },
    });

    return res.status(201).json(enrichAsset(created, meta));
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
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            email: true,
          },
        },
        assignments: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
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

    const metaMap = await getAssetMetaMap(db, tenantId, [asset.id]);
    return res.json(enrichAsset(asset, metaMap.get(asset.id)));
  } catch (err: any) {
    return res.status(404).json({ error: err.message || "Asset not found" });
  }
});

const handleUpdateAsset = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();

    const existing = await db.asset.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Asset not found in this organization" });
    }

    const incomingTag = req.body.assetTag ?? req.body.assetCode;
    if (incomingTag && String(incomingTag).trim() !== existing.assetTag) {
      const duplicate = await db.asset.findFirst({
        where: { tenantId, assetTag: String(incomingTag).trim(), id: { not: existing.id } },
      });
      if (duplicate) {
        return res.status(400).json({ error: `Asset code '${incomingTag}' is already in use.` });
      }
    }

    const updateData: any = {};
    if (req.body.name !== undefined) updateData.name = String(req.body.name).trim();
    if (incomingTag !== undefined && String(incomingTag).trim()) {
      updateData.assetTag = String(incomingTag).trim();
    }
    if (req.body.categoryId !== undefined) {
      const catId = req.body.categoryId ? String(req.body.categoryId).trim() : null;
      updateData.categoryId = catId;
      if (catId) {
        const cat = await db.assetCategory.findFirst({ where: { id: catId, tenantId } });
        if (cat) updateData.category = cat.name;
      }
    } else if (req.body.category !== undefined) {
      updateData.category = String(req.body.category).trim();
    }
    if (req.body.brand !== undefined) updateData.brand = req.body.brand || null;
    if (req.body.model !== undefined) updateData.model = req.body.model || null;
    if (req.body.serialNumber !== undefined) updateData.serialNumber = req.body.serialNumber || null;
    if (req.body.location !== undefined) updateData.location = req.body.location || null;
    if (req.body.purchaseDate !== undefined) {
      updateData.purchaseDate = req.body.purchaseDate ? new Date(req.body.purchaseDate) : null;
    }
    const purchaseCostVal = req.body.purchasePrice ?? req.body.purchaseCost;
    if (purchaseCostVal !== undefined && purchaseCostVal !== "") {
      updateData.purchasePrice = new Prisma.Decimal(Number(purchaseCostVal) || 0);
    }
    const vendorVal = req.body.vendor ?? req.body.supplier;
    if (vendorVal !== undefined) updateData.vendor = vendorVal || null;
    if (req.body.warrantyExpiry !== undefined) {
      updateData.warrantyExpiry = req.body.warrantyExpiry ? new Date(req.body.warrantyExpiry) : null;
    }
    if (req.body.condition !== undefined && req.body.condition) {
      updateData.condition = String(req.body.condition).toLowerCase();
    }
    if (req.body.status !== undefined && req.body.status) {
      updateData.status = String(req.body.status).toLowerCase();
    }
    const notesVal = req.body.notes ?? req.body.description;
    if (notesVal !== undefined) updateData.notes = notesVal || null;
    if (req.body.depreciationMethod !== undefined) {
      updateData.depreciationMethod = normalizeMethod(req.body.depreciationMethod);
    }
    if (req.body.usefulLifeMonths !== undefined && req.body.usefulLifeMonths !== "") {
      updateData.usefulLifeMonths = Math.max(1, Number(req.body.usefulLifeMonths));
    } else if (req.body.usefulLifeYears !== undefined && req.body.usefulLifeYears !== "") {
      updateData.usefulLifeMonths = Math.max(1, Math.round(Number(req.body.usefulLifeYears) * 12));
    }
    if (req.body.salvageValue !== undefined && req.body.salvageValue !== "") {
      updateData.salvageValue = new Prisma.Decimal(Number(req.body.salvageValue) || 0);
    }
    if (req.body.images !== undefined) {
      updateData.images = req.body.images;
    } else if (req.body.imageUrl !== undefined) {
      updateData.images = req.body.imageUrl ? [req.body.imageUrl] : null;
    }

    const updated = await db.asset.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        categoryRel: true,
        assignedEmployee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    const hasMetaPatch =
      req.body.warrantyInfo !== undefined ||
      req.body.imageName !== undefined ||
      req.body.documents !== undefined;
    let meta: AssetMeta | undefined;
    if (hasMetaPatch) {
      meta = await upsertAssetMeta(db, tenantId, updated.id, {
        ...(req.body.warrantyInfo !== undefined ? { warrantyInfo: req.body.warrantyInfo } : {}),
        ...(req.body.imageName !== undefined ? { imageName: req.body.imageName } : {}),
        ...(req.body.documents !== undefined ? { documents: req.body.documents } : {}),
      });
    } else {
      const map = await getAssetMetaMap(db, tenantId, [updated.id]);
      meta = map.get(updated.id);
    }

    return res.json(enrichAsset(updated, meta));
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to update asset" });
  }
};

hrAssetsRouter.put("/:id", requireAssetAdmin, handleUpdateAsset);
hrAssetsRouter.patch("/:id", requireAssetAdmin, handleUpdateAsset);

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

    await db.$transaction(async (tx: any) => {
      await tx.assetActivityLog.deleteMany({ where: { assetId: existing.id } });
      await tx.assetDepreciationSchedule.deleteMany({ where: { assetId: existing.id } });
      await tx.assetMaintenance.deleteMany({ where: { assetId: existing.id } });
      await tx.assetAssignment.deleteMany({ where: { assetId: existing.id } });
      await tx.setting.deleteMany({
        where: { scope: "TENANT", scopeId: tenantId, group: "asset_meta", key: existing.id },
      });
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
    const db = getTenantDb();

    if (!req.body?.employeeId) {
      return res.status(400).json({ error: "Employee is required for assignment" });
    }

    const asset = await db.asset.findFirst({ where: { id: req.params.id, tenantId } });
    if (!asset) return res.status(404).json({ error: "Asset not found" });

    if (asset.status === "assigned") {
      return res.status(400).json({ error: "Asset is already assigned. Return it first." });
    }

    const employee = await db.employee.findFirst({
      where: { id: req.body.employeeId, tenantId },
    });
    if (!employee) return res.status(404).json({ error: "Selected employee not found" });

    const assignedAt = req.body.checkoutDate || req.body.assignedAt
      ? new Date(req.body.checkoutDate || req.body.assignedAt)
      : new Date();
    const expectedReturnDate = req.body.expectedReturnDate ? new Date(req.body.expectedReturnDate) : null;
    const conditionOnAssign = String(req.body.checkoutCondition || req.body.conditionOnAssign || asset.condition || "good").toLowerCase();

    const assignment = await db.$transaction(async (tx: any) => {
      const created = await tx.assetAssignment.create({
        data: {
          assetId: asset.id,
          employeeId: employee.id,
          departmentId: employee.departmentId || null,
          targetType: "employee",
          quantity: 1,
          assignedAt,
          expectedReturnDate,
          conditionOnAssign,
          status: "active",
          notes: req.body.notes || null,
        },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });

      await tx.asset.update({
        where: { id: asset.id },
        data: {
          status: "assigned",
          assignedEmployeeId: employee.id,
          assignedAt,
          condition: conditionOnAssign,
        },
      });

      await tx.assetActivityLog.create({
        data: {
          tenantId,
          assetId: asset.id,
          actionType: "assign",
          performedBy: req.user?.email || actorId,
          details: `Assigned to ${employee.firstName} ${employee.lastName}`,
        },
      });

      return created;
    });

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
      req.body.returnCondition || req.body.checkInCondition,
      req.body.returnNotes || req.body.notes
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

    const checkInCondition = String(
      req.body.checkInCondition || req.body.returnCondition || "good"
    ).toLowerCase();
    const returnNotes = req.body.notes ?? req.body.returnNotes ?? null;
    const returnedAt = req.body.checkInDate ? new Date(req.body.checkInDate) : new Date();

    const asset = await db.asset.findFirst({ where: { id: req.params.id, tenantId } });
    if (!asset) return res.status(404).json({ error: "Asset not found" });

    const activeAssignment = await db.assetAssignment.findFirst({
      where: { assetId: asset.id, status: "active" },
      orderBy: { assignedAt: "desc" },
    });

    const result = await db.$transaction(async (tx: any) => {
      let updatedAssignment = null;
      if (activeAssignment) {
        updatedAssignment = await tx.assetAssignment.update({
          where: { id: activeAssignment.id },
          data: {
            status: "returned",
            returnedAt,
            conditionOnReturn: checkInCondition,
            notes: returnNotes || activeAssignment.notes,
          },
        });
      }

      const updatedAsset = await tx.asset.update({
        where: { id: asset.id },
        data: {
          status: "available",
          assignedEmployeeId: null,
          assignedAt: null,
          condition: checkInCondition,
        },
      });

      await tx.assetActivityLog.create({
        data: {
          tenantId,
          assetId: asset.id,
          actionType: "return",
          performedBy: req.user?.email || actorId,
          details: `Returned asset (condition: ${checkInCondition})`,
        },
      });

      return { asset: updatedAsset, assignment: updatedAssignment };
    });

    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to return asset" });
  }
});
