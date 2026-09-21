import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { InventoryMovementService } from "../services/inventory-movement.service";

export const transfersRouter = Router();

/**
 * GET /api/transfers
 * List all stock transfers for the tenant
 */
transfersRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const status = req.query.status as string | undefined;

    const where: any = { tenantId };
    if (status) {
      where.status = status;
    }

    const transfers = await prisma.stockTransfer.findMany({
      where,
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        details: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                salePrice: true,
                purchasePrice: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ data: transfers });
  } catch (err: any) {
    console.error("Failed to list transfers:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch transfers" });
  }
});

/**
 * POST /api/transfers
 * Create a new stock transfer request
 */
transfersRouter.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { fromWarehouseId, toWarehouseId, notes, items } = req.body;

    if (!fromWarehouseId || !toWarehouseId) {
      return res.status(400).json({ error: "Source and destination warehouses are required" });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "At least one product item is required" });
    }

    const transfer = await InventoryMovementService.createTransfer({
      tenantId,
      fromWarehouseId,
      toWarehouseId,
      notes,
      items,
    });

    return res.status(201).json({ data: transfer, message: "Transfer request created successfully" });
  } catch (err: any) {
    console.error("Failed to create transfer:", err);
    return res.status(400).json({ error: err.message || "Transfer creation failed" });
  }
});

/**
 * PATCH /api/transfers/:id/status
 * Multi-Tier approval state transition
 */
transfersRouter.patch("/:id/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const transferId = req.params.id;
    const { status } = req.body;

    if (!["approved", "in_transit", "completed", "rejected"].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be one of: "approved", "in_transit", "completed", "rejected"',
      });
    }

    const updated = await InventoryMovementService.updateTransferStatus({
      transferId,
      newStatus: status as any,
      tenantId,
    });

    return res.json({ data: updated, message: `Transfer marked as ${status}` });
  } catch (err: any) {
    console.error("Failed to update transfer status:", err);
    return res.status(400).json({ error: err.message || "Status transition failed" });
  }
});

/**
 * GET /api/transfers/warehouses/summary
 * Live stock valuations and levels across all warehouses
 */
transfersRouter.get("/warehouses/summary", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const summary = await InventoryMovementService.getWarehouseStockSummary(tenantId);
    return res.json({ data: summary });
  } catch (err: any) {
    console.error("Failed to get warehouse summary:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch summary" });
  }
});

/**
 * GET /api/transfers/adjustments
 * List stock adjustments for the tenant
 */
transfersRouter.get("/adjustments", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const warehouseId = req.query.warehouseId as string | undefined;
    const type = req.query.type as string | undefined;

    const where: any = { tenantId };
    if (warehouseId && warehouseId !== "all") where.warehouseId = warehouseId;
    if (type && type !== "all") where.type = type;

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
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ data: adjustments });
  } catch (err: any) {
    console.error("Failed to list adjustments:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch adjustments" });
  }
});

/**
 * POST /api/transfers/adjustments
 * Record stock adjustment (waste, audit correction, damage)
 */
transfersRouter.post("/adjustments", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { warehouseId, type, reason, details } = req.body;

    if (!warehouseId || !type || !details || details.length === 0) {
      return res.status(400).json({ error: "Warehouse, type, and details are required" });
    }

    const adjustment = await InventoryMovementService.recordAdjustment({
      tenantId,
      warehouseId,
      type,
      reason,
      details,
    });

    return res.status(201).json({ data: adjustment, message: "Adjustment recorded successfully" });
  } catch (err: any) {
    console.error("Failed to record adjustment:", err);
    return res.status(400).json({ error: err.message || "Adjustment failed" });
  }
});
