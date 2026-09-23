import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { InventoryMovementService } from "../services/inventory-movement.service";
import { autoPostStockAdjustmentToLedger } from "../services/ledger-posting.service";
import { broadcastToTenant } from "../socket";
import { resolveTenantId } from "../lib/tenant";

export const adjustmentsRouter = Router();

/**
 * GET /api/adjustments
 * List physical stock adjustments for the tenant with aggregated metrics
 */
adjustmentsRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { warehouseId, type, search } = req.query;
    const where: any = { tenantId };

    if (warehouseId && warehouseId !== "all") {
      where.warehouseId = String(warehouseId);
    }
    if (type && type !== "all") {
      where.type = String(type);
    }
    if (search) {
      where.OR = [
        { reason: { contains: String(search) } },
        { details: { some: { product: { name: { contains: String(search) } } } } },
      ];
    }

    const adjustments = await prisma.stockAdjustment.findMany({
      where,
      include: {
        warehouse: true,
        details: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                purchasePrice: true,
                salePrice: true,
                unit: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Compute live summary metrics
    let totalAdditionsCount = 0;
    let totalSubtractionsCount = 0;
    let totalAddedUnits = 0;
    let totalSubtractedUnits = 0;
    let totalValuationImpact = 0;

    for (const adj of adjustments) {
      const isAdd = adj.type.toLowerCase() === "addition";
      if (isAdd) {
        totalAdditionsCount++;
      } else {
        totalSubtractionsCount++;
      }

      for (const d of adj.details) {
        const qty = d.quantity || 0;
        const price = Number(d.product?.purchasePrice || 0);
        if (isAdd) {
          totalAddedUnits += qty;
        } else {
          totalSubtractedUnits += qty;
        }
        totalValuationImpact += qty * price;
      }
    }

    return res.json({
      data: adjustments,
      metrics: {
        totalCount: adjustments.length,
        totalAdditionsCount,
        totalSubtractionsCount,
        totalAddedUnits,
        totalSubtractedUnits,
        netUnitsAdjusted: totalAddedUnits - totalSubtractedUnits,
        totalValuationImpact,
      },
    });
  } catch (err: any) {
    console.error("GET /api/adjustments error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch stock adjustments" });
  }
});

/**
 * GET /api/adjustments/:id
 * Retrieve single physical adjustment details
 */
adjustmentsRouter.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const adjustment = await prisma.stockAdjustment.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        warehouse: true,
        details: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!adjustment) {
      return res.status(404).json({ error: "Stock adjustment record not found" });
    }

    return res.json({ data: adjustment });
  } catch (err: any) {
    console.error("GET /api/adjustments/:id error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch adjustment details" });
  }
});

/**
 * POST /api/adjustments
 * Record a new physical stock adjustment with atomic stock movement and GL ledger entry
 */
adjustmentsRouter.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { warehouseId, type, reason, details } = req.body;

    if (!warehouseId) {
      return res.status(400).json({ error: "Target warehouse is required" });
    }
    if (!type || !["addition", "subtraction"].includes(type)) {
      return res.status(400).json({ error: 'Adjustment type must be either "addition" or "subtraction"' });
    }
    if (!details || !Array.isArray(details) || details.length === 0) {
      return res.status(400).json({ error: "At least one product item line is required for adjustment" });
    }

    // Verify warehouse exists
    const warehouse = await prisma.warehouse.findFirst({
      where: { id: warehouseId, tenantId },
    });
    if (!warehouse) {
      return res.status(404).json({ error: "Selected warehouse does not exist or unauthorized" });
    }

    // Execute atomic balance movements
    const adjustment = await InventoryMovementService.recordAdjustment({
      tenantId,
      warehouseId,
      type,
      reason,
      details: details.map((d: any) => ({
        productId: d.productId,
        quantity: Math.max(1, Math.floor(Number(d.quantity) || 1)),
      })),
    });

    // Calculate valuation for double-entry GL auto-posting
    let totalValuation = 0;
    const productIds = details.map((d: any) => d.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, purchasePrice: true },
    });
    const priceMap = new Map<string, number>();
    products.forEach((p) => priceMap.set(p.id, Number(p.purchasePrice || 0)));

    for (const d of details) {
      const qty = Math.max(1, Math.floor(Number(d.quantity) || 1));
      const cost = priceMap.get(d.productId) || 0;
      totalValuation += qty * cost;
    }

    // Auto-post to General Ledger
    await autoPostStockAdjustmentToLedger({
      tenantId,
      adjustmentId: adjustment.id,
      warehouseName: warehouse.name,
      type,
      totalValue: Math.round(totalValuation * 100) / 100,
      reason,
    });

    // Real-time broadcast
    broadcastToTenant(tenantId, "stock:adjusted", {
      adjustmentId: adjustment.id,
      warehouseId,
      type,
    });

    return res.status(201).json({
      data: adjustment,
      message: `Stock adjustment (${type.toUpperCase()}) recorded and ledger posted successfully`,
    });
  } catch (err: any) {
    console.error("POST /api/adjustments error:", err);
    return res.status(400).json({ error: err.message || "Failed to record stock adjustment" });
  }
});
