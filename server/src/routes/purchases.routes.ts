import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { broadcastToTenant } from "../socket";
import { autoPostPurchaseToLedger } from "../services/ledger-posting.service";
import { resolveTenantId } from "../lib/tenant";

import { parsePaginationParams, formatPaginatedResponse } from "../lib/pagination";

export const purchasesRouter = Router();

/**
 * GET /api/purchases
 * List all purchase orders & goods receipt notes (Stocky Rule 0: Universal Query Contract)
 */
purchasesRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const pagination = parsePaginationParams(req, "createdAt", 25);
    const { status, supplierId, warehouseId } = req.query;
    const where: any = { tenantId };

    if (pagination.search) {
      where.OR = [
        { purchaseNo: { contains: pagination.search } },
        { notes: { contains: pagination.search } },
        { supplier: { name: { contains: pagination.search } } },
      ];
    }

    if (status && status !== "all") {
      where.status = String(status);
    }
    if (supplierId && supplierId !== "all") {
      where.supplierId = String(supplierId);
    }
    if (warehouseId && warehouseId !== "all") {
      where.warehouseId = String(warehouseId);
    }

    const sortField = ["purchaseNo", "createdAt", "updatedAt", "date", "total", "status"].includes(pagination.sortField)
      ? pagination.sortField
      : "createdAt";

    const [total, purchases] = await Promise.all([
      prisma.purchase.count({ where }),
      prisma.purchase.findMany({
        where,
        include: {
          supplier: true,
          warehouse: true,
          details: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, unit: true },
              },
            },
          },
        },
        orderBy: { [sortField]: pagination.sortType },
        ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
      }),
    ]);

    if (pagination.isPaginated) {
      return res.json(formatPaginatedResponse(purchases, total, pagination));
    }

    res.setHeader("X-Total-Count", String(total));
    return res.json({ data: purchases });
  } catch (err: any) {
    console.error("GET /api/purchases error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch purchases" });
  }
});

/**
 * GET /api/purchases/:id
 * Retrieve single purchase order details
 */
purchasesRouter.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { id } = req.params;

    const purchase = await prisma.purchase.findFirst({
      where: { id, tenantId },
      include: {
        supplier: true,
        warehouse: true,
        details: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!purchase) {
      return res.status(404).json({ error: "Purchase order not found" });
    }

    return res.json({ data: purchase });
  } catch (err: any) {
    console.error("GET /api/purchases/:id error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch purchase details" });
  }
});

/**
 * POST /api/purchases
 * Create a new Purchase Order / Goods Receipt Note
 * Atomically increments warehouse stock if status === "received"
 * Auto-posts double-entry transaction to general ledger
 */
purchasesRouter.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const {
      supplierId,
      warehouseId,
      status = "ordered",
      paymentStatus = "unpaid",
      paymentMode = "Bank Transfer",
      paidAmount = 0,
      notes,
      date,
      items,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Purchase order must include at least one product item" });
    }

    // Default warehouse if none specified
    let targetWarehouseId = warehouseId;
    if (!targetWarehouseId) {
      const defaultWh = await prisma.warehouse.findFirst({ where: { tenantId, isDefault: true } });
      targetWarehouseId = defaultWh ? defaultWh.id : (await prisma.warehouse.findFirst({ where: { tenantId } }))?.id;
    }

    const count = await prisma.purchase.count({ where: { tenantId } });
    const purchaseNo = req.body.purchaseNo || `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    // Compute totals
    let totalAmount = 0;
    const detailsToCreate: any[] = [];

    for (const it of items) {
      const qty = Number(it.quantity || it.qty || 1);
      const cost = Number(it.cost || it.price || 0);
      const taxRate = Number(it.taxRate || it.gst_rate || 0);
      const taxAmount = (cost * qty * taxRate) / 100;
      const subtotal = cost * qty + taxAmount;
      totalAmount += subtotal;

      detailsToCreate.push({
        productId: it.productId || it.id,
        productName: it.productName || it.name || "Purchased Product",
        cost,
        quantity: qty,
        taxRate,
        subtotal,
      });
    }

    const actualPaid = paymentStatus === "paid" ? totalAmount : Number(paidAmount || 0);
    const resolvedPayStatus = actualPaid >= totalAmount ? "paid" : actualPaid > 0 ? "partial" : "unpaid";

    const purchase = await prisma.$transaction(async (tx) => {
      const created = await tx.purchase.create({
        data: {
          tenantId,
          purchaseNo,
          supplierId: supplierId || null,
          warehouseId: targetWarehouseId || null,
          status,
          total: totalAmount,
          paidAmount: actualPaid,
          paymentStatus: resolvedPayStatus,
          notes: notes || null,
          date: date ? new Date(date) : new Date(),
          details: {
            create: detailsToCreate,
          },
        },
        include: {
          supplier: true,
          warehouse: true,
          details: { include: { product: true } },
        },
      });

      // If received upon creation, increment warehouse stock atomically
      if (status === "received" && targetWarehouseId) {
        for (const item of detailsToCreate) {
          await tx.productWarehouse.upsert({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: targetWarehouseId,
              },
            },
            update: {
              quantity: { increment: item.quantity },
            },
            create: {
              productId: item.productId,
              warehouseId: targetWarehouseId,
              quantity: item.quantity,
            },
          });
        }
      }

      return created;
    });

    // ⚡ Auto-post to Double-Entry General Ledger if received or ordered
    if (status === "received") {
      autoPostPurchaseToLedger({
        tenantId,
        purchaseId: purchase.id,
        purchaseNo: purchase.purchaseNo,
        total: Number(purchase.total),
        isPaid: purchase.paymentStatus === "paid",
        paymentMode,
      }).catch((e) => console.error("Auto-post purchase to ledger error:", e));

      broadcastToTenant(tenantId, "inventory:stock_updated", {
        warehouseId: targetWarehouseId,
        items: detailsToCreate.map((d) => ({
          productId: d.productId,
          quantityIncremented: d.quantity,
        })),
      });
    }

    broadcastToTenant(tenantId, "purchase:created", purchase);

    return res.status(201).json({
      success: true,
      message: "Purchase order created successfully",
      data: purchase,
    });
  } catch (err: any) {
    console.error("POST /api/purchases error:", err);
    return res.status(500).json({ error: err.message || "Failed to create purchase order" });
  }
});

/**
 * PATCH /api/purchases/:id/status
 * Transition PO status (e.g. ordered -> received -> cancelled)
 * Atomically adjusts warehouse stock on goods receipt
 */
purchasesRouter.patch("/:id/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { id } = req.params;
    const { status, paymentMode = "Bank Transfer" } = req.body;

    if (!["ordered", "received", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be 'ordered', 'received', or 'cancelled'." });
    }

    const existing = await prisma.purchase.findFirst({
      where: { id, tenantId },
      include: { details: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Purchase order not found" });
    }

    const prevStatus = existing.status;
    if (prevStatus === status) {
      return res.json({ data: existing, message: "Status unchanged" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.purchase.update({
        where: { id },
        data: { status },
        include: { supplier: true, warehouse: true, details: { include: { product: true } } },
      });

      // 1. If transitioning to "received", increment stock
      if (status === "received" && prevStatus !== "received" && existing.warehouseId) {
        for (const it of existing.details) {
          await tx.productWarehouse.upsert({
            where: {
              productId_warehouseId: {
                productId: it.productId,
                warehouseId: existing.warehouseId,
              },
            },
            update: {
              quantity: { increment: it.quantity },
            },
            create: {
              productId: it.productId,
              warehouseId: existing.warehouseId,
              quantity: it.quantity,
            },
          });
        }
      }

      // 2. If reversing from "received" to "cancelled", decrement stock back
      if (prevStatus === "received" && status === "cancelled" && existing.warehouseId) {
        for (const it of existing.details) {
          await tx.productWarehouse.upsert({
            where: {
              productId_warehouseId: {
                productId: it.productId,
                warehouseId: existing.warehouseId,
              },
            },
            update: {
              quantity: { decrement: it.quantity },
            },
            create: {
              productId: it.productId,
              warehouseId: existing.warehouseId,
              quantity: -it.quantity,
            },
          });
        }
      }

      return res;
    });

    // ⚡ Auto-post to General Ledger upon receipt
    if (status === "received") {
      autoPostPurchaseToLedger({
        tenantId,
        purchaseId: updated.id,
        purchaseNo: updated.purchaseNo,
        total: Number(updated.total),
        isPaid: updated.paymentStatus === "paid",
        paymentMode,
      }).catch((e) => console.error("Auto-post purchase to ledger error:", e));

      broadcastToTenant(tenantId, "inventory:stock_updated", {
        warehouseId: existing.warehouseId,
      });
    }

    broadcastToTenant(tenantId, "purchase:updated", updated);

    return res.json({
      success: true,
      message: `Purchase order marked as ${status.toUpperCase()}`,
      data: updated,
    });
  } catch (err: any) {
    console.error("PATCH /api/purchases/:id/status error:", err);
    return res.status(500).json({ error: err.message || "Failed to update purchase status" });
  }
});

/**
 * POST /api/purchases/:id/payments
 * Record payment to supplier against purchase order
 */
purchasesRouter.post("/:id/payments", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { id } = req.params;
    const { amount, paymentMethod = "Bank Transfer" } = req.body;

    const existing = await prisma.purchase.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return res.status(404).json({ error: "Purchase order not found" });
    }

    const payAmt = Number(amount || 0);
    if (payAmt <= 0) {
      return res.status(400).json({ error: "Payment amount must be greater than 0" });
    }

    const newPaid = Number(existing.paidAmount || 0) + payAmt;
    const newStatus = newPaid >= Number(existing.total) ? "paid" : "partial";

    const updated = await prisma.purchase.update({
      where: { id },
      data: {
        paidAmount: newPaid,
        paymentStatus: newStatus,
      },
      include: { supplier: true, warehouse: true, details: true },
    });

    return res.json({
      success: true,
      message: `Payment of ₹${payAmt.toLocaleString("en-IN")} recorded successfully!`,
      data: updated,
    });
  } catch (err: any) {
    console.error("POST /api/purchases/:id/payments error:", err);
    return res.status(500).json({ error: err.message || "Failed to record payment" });
  }
});

/**
 * DELETE /api/purchases/:id
 * Delete purchase order if not yet received
 */
purchasesRouter.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { id } = req.params;

    const existing = await prisma.purchase.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return res.status(404).json({ error: "Purchase order not found" });
    }

    if (existing.status === "received") {
      return res.status(400).json({
        error: "Cannot delete a received purchase order. Cancel the order first to reverse warehouse stock.",
      });
    }

    await prisma.purchase.delete({ where: { id } });

    return res.json({ success: true, message: "Purchase order deleted successfully" });
  } catch (err: any) {
    console.error("DELETE /api/purchases/:id error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete purchase order" });
  }
});
