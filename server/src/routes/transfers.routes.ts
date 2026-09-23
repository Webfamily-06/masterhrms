import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { InventoryMovementService } from "../services/inventory-movement.service";
import { resolveTenantId } from "../lib/tenant";
import { parsePaginationParams, formatPaginatedResponse } from "../lib/pagination";

export const transfersRouter = Router();

/**
 * GET /api/transfers
 * List all stock transfers for the tenant (Stocky Rule 0: Universal Query Contract)
 */
transfersRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const pagination = parsePaginationParams(req, "createdAt", 25);
    const status = req.query.status as string | undefined;

    const where: any = { tenantId };
    if (status && status !== "all") {
      where.status = status;
    }

    if (pagination.search) {
      where.OR = [
        { transferNo: { contains: pagination.search } },
        { notes: { contains: pagination.search } },
        { fromWarehouse: { name: { contains: pagination.search } } },
        { toWarehouse: { name: { contains: pagination.search } } },
      ];
    }

    const sortField = ["transferNo", "createdAt", "updatedAt", "status"].includes(pagination.sortField)
      ? pagination.sortField
      : "createdAt";

    const [total, transfers] = await Promise.all([
      prisma.stockTransfer.count({ where }),
      prisma.stockTransfer.findMany({
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
        orderBy: { [sortField]: pagination.sortType },
        ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
      }),
    ]);

    if (pagination.isPaginated) {
      return res.json(formatPaginatedResponse(transfers, total, pagination));
    }

    res.setHeader("X-Total-Count", String(total));
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
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

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
 * Multi-Tier approval state transition (pending -> approved -> in_transit -> completed | rejected)
 */
transfersRouter.patch("/:id/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

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
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const summary = await InventoryMovementService.getWarehouseStockSummary(tenantId);
    return res.json({ data: summary });
  } catch (err: any) {
    console.error("Failed to get warehouse summary:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch summary" });
  }
});

/**
 * GET /api/transfers/adjustments
 * List stock adjustments for the tenant (Stocky Rule 0: Universal Query Contract)
 */
transfersRouter.get("/adjustments", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const pagination = parsePaginationParams(req, "createdAt", 25);
    const warehouseId = req.query.warehouseId as string | undefined;
    const type = req.query.type as string | undefined;

    const where: any = { tenantId };
    if (warehouseId && warehouseId !== "all") where.warehouseId = warehouseId;
    if (type && type !== "all") where.type = type;

    if (pagination.search) {
      where.OR = [
        { reason: { contains: pagination.search } },
        { warehouse: { name: { contains: pagination.search } } },
        { details: { some: { product: { name: { contains: pagination.search } } } } },
      ];
    }

    const sortField = ["createdAt", "updatedAt", "type"].includes(pagination.sortField)
      ? pagination.sortField
      : "createdAt";

    const [total, adjustments] = await Promise.all([
      prisma.stockAdjustment.count({ where }),
      prisma.stockAdjustment.findMany({
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
        orderBy: { [sortField]: pagination.sortType },
        ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
      }),
    ]);

    if (pagination.isPaginated) {
      return res.json(formatPaginatedResponse(adjustments, total, pagination));
    }

    res.setHeader("X-Total-Count", String(total));
    return res.json({ data: adjustments });
  } catch (err: any) {
    console.error("Failed to list adjustments:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch adjustments" });
  }
});

/**
 * POST /api/transfers/adjustments
 * Record stock adjustment (waste, audit correction, damage) or physical stock reconciliation
 */
transfersRouter.post("/adjustments", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { warehouseId, type, reason, details, counts, mode } = req.body;

    if (!warehouseId) {
      return res.status(400).json({ error: "Warehouse is required" });
    }

    // Physical audit reconciliation mode
    if (mode === "reconcile" || (counts && Array.isArray(counts))) {
      if (!counts || counts.length === 0) {
        return res.status(400).json({ error: "Physical counts list is required for reconciliation" });
      }

      const adjustment = await InventoryMovementService.reconcilePhysicalStock({
        tenantId,
        warehouseId,
        reason,
        counts,
      });

      return res.status(200).json({
        data: adjustment,
        message: adjustment
          ? "Physical stock reconciliation recorded successfully"
          : "Stock counts already match system records. No adjustments needed.",
      });
    }

    if (!type || !details || details.length === 0) {
      return res.status(400).json({ error: "Adjustment type and details are required" });
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
