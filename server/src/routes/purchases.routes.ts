import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { broadcastToTenant } from "../socket";
import { autoPostPurchaseToLedger, autoPostSupplierPaymentToLedger } from "../services/ledger-posting.service";
import { resolveTenantId } from "../lib/tenant";
import { parsePaginationParams, formatPaginatedResponse } from "../lib/pagination";
import { InventoryMovementService } from "../services/inventory-movement.service";
import { STOCK_MOVEMENT_TYPES } from "../services/inventory-movement.types";
import { InsufficientStockError } from "../services/inventory-movement.errors";
import { requireEntitlement } from "../middleware/entitlements";

export const purchasesRouter = Router();

/**
 * Step 3.3.5 — Purchase status transition race guard.
 * Thrown when the purchase status changed between the pre-transaction read and the
 * conditional UPDATE inside the transaction, preventing concurrent duplicate stock
 * increments (receipt) or duplicate reversals (cancellation).
 */
class PurchaseStatusRaceError extends Error {
  constructor(purchaseNo: string, expected: string, actual: string) {
    super(
      `Purchase ${purchaseNo} status changed concurrently (expected '${expected}', found '${actual}'). No stock movement was applied; please retry.`
    );
    this.name = "PurchaseStatusRaceError";
  }
}

// Enforce Request-Scoped Tenant Context and Product POS Entitlement on all purchase endpoints
purchasesRouter.use(requireAuth, resolveTenantContext, requireEntitlement("product_pos"));

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
        },
      });

      for (const d of detailsToCreate) {
        await tx.purchaseDetail.create({
          data: {
            purchaseId: created.id,
            productId: d.productId,
            productName: d.productName,
            cost: d.cost,
            quantity: d.quantity,
            taxRate: d.taxRate,
            subtotal: d.subtotal,
          },
        });
      }

      // If received upon creation, increment warehouse stock atomically via Centralized Stock Engine
      if (status === "received" && targetWarehouseId) {
        for (const item of detailsToCreate) {
          await InventoryMovementService.increaseStock({
            tenantId,
            productId: item.productId,
            warehouseId: targetWarehouseId,
            quantity: item.quantity,
            movementType: STOCK_MOVEMENT_TYPES.PURCHASE_RECEIPT,
            referenceType: "PURCHASE",
            referenceId: created.id,
            createdById: (req as any).user?.userId || (req as any).user?.id,
            notes: `Purchase order received (${purchaseNo})`,
            tx,
          });
        }
      }

      return await tx.purchase.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          supplier: true,
          warehouse: true,
          details: { include: { product: true } },
        },
      });
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

    if (prevStatus === "cancelled") {
      return res.status(400).json({ error: "Cannot change status of an already-cancelled purchase order" });
    }

    const updated = await prisma.$transaction(async (tx): Promise<typeof existing> => {
      // Step 3.3.5 concurrency guard: re-read the CURRENT status inside the transaction
      // and perform a conditional UPDATE (status = prevStatus) so two simultaneous
      // requests cannot both pass the earlier pre-transaction check and each execute a
      // full stock increment/reversal. The losing request updates 0 rows and aborts.
      const current = await tx.purchase.findFirst({
        where: { id, tenantId },
        select: { status: true },
      });
      if (!current) {
        throw new Error("Purchase order not found");
      }
      if (current.status !== prevStatus) {
        throw new PurchaseStatusRaceError(existing.purchaseNo, prevStatus, current.status);
      }

      const res = await tx.purchase.updateMany({
        where: { id, tenantId, status: prevStatus },
        data: { status },
      });
      if (res.count === 0) {
        throw new PurchaseStatusRaceError(existing.purchaseNo, prevStatus, "changed concurrently");
      }

      const updatedPurchase = await tx.purchase.findUniqueOrThrow({
        where: { id },
        include: { supplier: true, warehouse: true, details: { include: { product: true } } },
      });

      // 1. If transitioning to "received", increment stock via Centralized Stock Engine
      if (status === "received" && prevStatus !== "received" && existing.warehouseId) {
        for (const it of existing.details) {
          await InventoryMovementService.increaseStock({
            tenantId,
            productId: it.productId,
            warehouseId: existing.warehouseId,
            quantity: it.quantity,
            movementType: STOCK_MOVEMENT_TYPES.PURCHASE_RECEIPT,
            referenceType: "PURCHASE",
            referenceId: id,
            createdById: (req as any).user?.userId || (req as any).user?.id,
            notes: `Purchase order goods receipt (${existing.purchaseNo})`,
            tx,
          });
        }
      }

      // 2. If reversing from "received" to "cancelled", decrement stock back via Centralized Stock Engine
      if (prevStatus === "received" && status === "cancelled" && existing.warehouseId) {
        for (const it of existing.details) {
          await InventoryMovementService.decreaseStock({
            tenantId,
            productId: it.productId,
            warehouseId: existing.warehouseId,
            quantity: it.quantity,
            movementType: STOCK_MOVEMENT_TYPES.PURCHASE_RETURN,
            referenceType: "PURCHASE",
            referenceId: id,
            createdById: (req as any).user?.userId || (req as any).user?.id,
            notes: `Purchase order cancelled - stock reversed (${existing.purchaseNo})`,
            tx,
          });
        }
      }

      return updatedPurchase;
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
    if (err instanceof InsufficientStockError || err.code === "INSUFFICIENT_STOCK") {
      return res.status(409).json({
        error: `Cannot cancel purchase order: received items have already been sold or depleted from warehouse. (${err.message})`,
        code: "INSUFFICIENT_STOCK",
      });
    }
    if (err.name === "PurchaseStatusRaceError") {
      return res.status(409).json({
        error: err.message,
        code: "STATUS_CONFLICT",
      });
    }
    return res.status(400).json({ error: err.message || "Failed to update purchase status" });
  }
});

/**
 * GET /api/purchases/:id/payments
 * Stream all discrete payment installments for a purchase order (AP ledger trail)
 */
purchasesRouter.get("/:id/payments", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { id } = req.params;

    const purchase = await prisma.purchase.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!purchase) {
      return res.status(404).json({ error: "Purchase order not found" });
    }

    const payments = await prisma.purchasePayment.findMany({
      where: { purchaseId: id, tenantId },
      orderBy: { paidAt: "asc" },
    });

    return res.json({ data: payments });
  } catch (err: any) {
    console.error("GET /api/purchases/:id/payments error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch payment history" });
  }
});

/**
 * GET /api/purchases/:id/returns
 * Stream all returns for a specific purchase order
 */
purchasesRouter.get("/:id/returns", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { id } = req.params;

    const purchase = await prisma.purchase.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!purchase) {
      return res.status(404).json({ error: "Purchase order not found" });
    }

    const returns = await prisma.purchaseReturn.findMany({
      where: { purchaseId: id, tenantId },
      include: {
        details: { include: { product: true } },
        debitNote: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ data: returns });
  } catch (err: any) {
    console.error("GET /api/purchases/:id/returns error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch purchase returns" });
  }
});

/**
 * POST /api/purchases/:id/payments
 * Record a supplier payment installment against a purchase order.
 *
 * Hardening (Step 3.4):
 * 1. Validates amount > 0 and amount <= remaining balance (no over-payment)
 * 2. Creates a discrete PurchasePayment row (idempotency-safe)
 * 3. Atomically updates paidAmount + paymentStatus with a concurrency guard
 *    (updateMany with current paidAmount check → 0-row conflict → 409)
 * 4. Auto-posts AP-settlement double-entry to the GL (fire-and-forget)
 * 5. Broadcasts purchase:updated WebSocket event
 */
purchasesRouter.post("/:id/payments", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { id } = req.params;
    const {
      amount,
      paymentMethod = "Bank Transfer",
      referenceNo,
      notes,
      idempotencyKey,
    } = req.body;

    const existing = await prisma.purchase.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return res.status(404).json({ error: "Purchase order not found" });
    }

    const payAmt = Number(amount || 0);
    if (payAmt <= 0) {
      return res.status(400).json({ error: "Payment amount must be greater than 0" });
    }

    const currentPaid = Number(existing.paidAmount || 0);
    const totalAmt = Number(existing.total || 0);
    const remaining = totalAmt - currentPaid;

    if (payAmt > remaining + 0.005) {
      return res.status(400).json({
        error: `Payment of ${payAmt} exceeds the outstanding balance of ${remaining.toFixed(2)} for PO ${existing.purchaseNo}`,
        code: "OVERPAYMENT",
      });
    }

    const newPaid = currentPaid + payAmt;
    const newStatus = newPaid >= totalAmt - 0.005 ? "paid" : "partial";
    const createdById = (req as any).user?.userId || (req as any).user?.id || null;

    let payment: any;

    const updated = await prisma.$transaction(async (tx) => {
      // Concurrency guard: only proceed if paidAmount hasn't changed since we read it
      const guardResult = await tx.purchase.updateMany({
        where: { id, tenantId, paidAmount: existing.paidAmount },
        data: { paidAmount: newPaid, paymentStatus: newStatus },
      });

      if (guardResult.count === 0) {
        throw Object.assign(
          new Error(`Concurrent payment detected on PO ${existing.purchaseNo}. Please retry.`),
          { code: "PAYMENT_RACE" }
        );
      }

      // Persist discrete payment installment
      payment = await tx.purchasePayment.create({
        data: {
          purchaseId: id,
          tenantId,
          amount: payAmt,
          method: paymentMethod,
          referenceNo: referenceNo || null,
          idempotencyKey: idempotencyKey || null,
          notes: notes || null,
          createdById,
        },
      });

      return await tx.purchase.findUniqueOrThrow({
        where: { id },
        include: { supplier: true, warehouse: true, details: true },
      });
    });

    // ⚡ Fire-and-forget AP Settlement GL posting
    autoPostSupplierPaymentToLedger({
      tenantId,
      paymentId: payment.id,
      purchaseNo: existing.purchaseNo,
      amount: payAmt,
      method: paymentMethod,
    }).catch((e) => console.error("AP ledger posting error:", e));

    broadcastToTenant(tenantId, "purchase:updated", updated);

    return res.status(201).json({
      success: true,
      message: `Payment of ₹${payAmt.toLocaleString("en-IN")} recorded successfully!`,
      data: { purchase: updated, payment },
    });
  } catch (err: any) {
    console.error("POST /api/purchases/:id/payments error:", err);
    if (err.code === "PAYMENT_RACE") {
      return res.status(409).json({ error: err.message, code: "PAYMENT_RACE" });
    }
    if (err.code === "P2002") {
      // Unique constraint on idempotencyKey — duplicate submission
      return res.status(409).json({
        error: "Duplicate payment submission detected (idempotency key already used).",
        code: "DUPLICATE_PAYMENT",
      });
    }
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
