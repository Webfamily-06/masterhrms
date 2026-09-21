import { Router, Response } from "express";
import { prisma } from "../prisma";
import { notifySaleCompleted } from "../services/alert-notification.service";
import { pushStockToRemoteStores } from "../services/ecommerce-sync.service";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { broadcastToTenant } from "../socket";
import { autoPostSaleToLedger } from "../services/ledger-posting.service";

export const salesRouter = Router();

// GET /api/sales - List sales & POS receipts
salesRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    let tenantId = req.user?.tenantId;
    if (!tenantId || tenantId === "default") {
      const t = await prisma.tenant.findFirst();
      tenantId = t?.id || "tenant-default-001";
    }
    const type = req.query.type as string | undefined;

    const whereClause: any = { tenantId };
    if (type) {
      whereClause.type = type;
    }

    const sales = await prisma.sale.findMany({
      where: whereClause,
      include: {
        customer: true,
        warehouse: true,
        details: {
          include: {
            product: true,
          },
        },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = sales.map((s) => ({
      id: s.id,
      receiptNo: s.invoiceNo,
      invoiceNo: s.invoiceNo,
      type: s.type,
      customer: s.customerName || s.customer?.name || "Walk-in Customer",
      customerName: s.customerName || s.customer?.name || "Walk-in Customer",
      customerGstin: s.customerGstin || s.customer?.gstin || "",
      customerId: s.customerId,
      warehouseId: s.warehouseId,
      warehouseName: s.warehouse?.name || "Main Central Warehouse",
      cashier: s.cashierName || "System Cashier",
      date: s.date.toISOString(),
      completedAt: s.createdAt.toISOString(),
      subtotal: Number(s.subtotal),
      discountPct: s.discountPct ? Number(s.discountPct) : 0,
      discountAmt: Number(s.discountAmt),
      taxMode: s.taxMode || "sgst_cgst",
      cgst: Number(s.cgst),
      sgst: Number(s.sgst),
      igst: Number(s.igst),
      totalTax: Number(s.totalTax),
      total: Number(s.total),
      amount: Number(s.total),
      paidAmount: Number(s.paidAmount),
      paymentStatus: s.paymentStatus,
      paymentMode: s.paymentMethod,
      notes: s.notes || "",
      items: s.details.map((d) => ({
        id: d.productId,
        name: d.productName,
        sku: d.sku || "",
        hsn_sac: d.hsnSac || "",
        unit: d.unit || "Pcs",
        price: Number(d.price),
        qty: d.quantity,
        quantity: d.quantity,
        taxRate: Number(d.taxRate),
        gst_rate: Number(d.taxRate),
        taxAmount: Number(d.taxAmount),
        discount: Number(d.discount),
        subtotal: Number(d.subtotal),
      })),
      payments: s.payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        method: p.method,
        referenceNo: p.referenceNo,
        paidAt: p.paidAt.toISOString(),
      })),
    }));

    return res.json(formatted);
  } catch (err: any) {
    console.error("Sales GET error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch sales" });
  }
});

// POST /api/sales - Checkout POS sale / Create Invoice
salesRouter.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    let tenantId = req.user?.tenantId;
    if (!tenantId || tenantId === "default") {
      const t = await prisma.tenant.findFirst();
      tenantId = t?.id || "tenant-default-001";
    }
    const body = req.body;

    const items: any[] = body.items || [];
    if (items.length === 0) {
      return res.status(400).json({ error: "Cannot create sale with empty cart items." });
    }

    // Determine default warehouse
    let warehouseId = body.warehouseId;
    if (!warehouseId) {
      const defaultWh = await prisma.warehouse.findFirst({ where: { tenantId, isDefault: true } });
      warehouseId = defaultWh ? defaultWh.id : (await prisma.warehouse.findFirst({ where: { tenantId } }))?.id;
    }

    // Generate unique invoice number
    const count = await prisma.sale.count({ where: { tenantId } });
    const prefix = body.type === "invoice" ? "INV" : "REC";
    const year = new Date().getFullYear();
    const invoiceNo = body.receiptNo || body.invoiceNo || `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;

    // Atomic transaction: Create Sale, Create SaleDetails, Create Payment, Decrement Warehouse Stock
    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          tenantId,
          invoiceNo,
          type: body.type || "pos",
          customerId: body.customerId || null,
          customerName: body.customer || body.customerName || "Walk-in Customer",
          customerGstin: body.customerGstin || "",
          warehouseId: warehouseId || null,
          cashierId: req.user?.userId || null,
          cashierName: body.cashier || req.user?.email || "Cashier",
          subtotal: Number(body.subtotal || 0),
          discountPct: body.discountPct !== undefined ? Number(body.discountPct) : null,
          discountAmt: Number(body.discountAmt || 0),
          taxMode: body.taxMode || "sgst_cgst",
          cgst: Number(body.cgst || 0),
          sgst: Number(body.sgst || 0),
          igst: Number(body.igst || 0),
          totalTax: Number((body.cgst || 0) + (body.sgst || 0) + (body.igst || 0)),
          total: Number(body.total || 0),
          paidAmount: Number(body.paidAmount !== undefined ? body.paidAmount : body.total || 0),
          paymentStatus: body.paymentStatus || "paid",
          paymentMethod: body.paymentMode || body.paymentMethod || "Cash",
          notes: body.notes || "",
          date: body.date ? new Date(body.date) : new Date(),
        },
      });

      // Insert SaleDetails & decrement stock
      for (const item of items) {
        const productId = item.id;
        const lineQty = Number(item.qty || item.quantity || 1);
        const linePrice = Number(item.price || 0);
        const taxRate = Number(item.gst_rate !== undefined ? item.gst_rate : item.taxRate || 0);
        const lineTax = Number(item.taxAmount || (linePrice * lineQty * (taxRate / 100)));
        const lineSubtotal = Number((linePrice * lineQty) + lineTax);

        await tx.saleDetail.create({
          data: {
            saleId: sale.id,
            productId,
            productName: item.name || "Product Item",
            sku: item.sku || null,
            hsnSac: item.hsn_sac || item.hsnSac || null,
            unit: item.unit || "Pcs",
            price: linePrice,
            quantity: lineQty,
            taxRate,
            taxAmount: lineTax,
            discount: Number(item.discount || 0),
            subtotal: lineSubtotal,
          },
        });

        // Decrement warehouse stock if warehouseId exists
        if (warehouseId && productId) {
          const pw = await tx.productWarehouse.findUnique({
            where: { productId_warehouseId: { productId, warehouseId } },
          });
          if (pw) {
            await tx.productWarehouse.update({
              where: { id: pw.id },
              data: {
                quantity: {
                  decrement: lineQty,
                },
              },
            });
          }
        }
      }

      // Create Payment record
      const paidAmt = Number(body.paidAmount !== undefined ? body.paidAmount : body.total || 0);
      const payMethod = body.paymentMode || body.paymentMethod || "Cash";
      await tx.salePayment.create({
        data: {
          saleId: sale.id,
          amount: paidAmt,
          method: payMethod,
          referenceNo: body.referenceNo || invoiceNo,
        },
      });

      // Update open cash register shift if active
      const openShift = await tx.registerShift.findFirst({
        where: { tenantId, status: "open" },
      });
      if (openShift) {
        const mode = payMethod.toLowerCase();
        const updateData: any = {};
        if (mode.includes("cash")) {
          updateData.cashSales = { increment: paidAmt };
          updateData.expectedCash = { increment: paidAmt };
        } else if (mode.includes("card")) {
          updateData.cardSales = { increment: paidAmt };
        } else {
          updateData.upiSales = { increment: paidAmt };
        }
        await tx.registerShift.update({
          where: { id: openShift.id },
          data: updateData,
        });
      }

      return sale;
    });

    // ⚡ Realtime Broadcasts: Notify customer display, POS history, and live inventory decrements
    try { notifySaleCompleted({ receiptNo: result.invoiceNo, total: Number(result.total), customer: body.customerName, paymentMode: body.paymentMode }); } catch {}
    try {
      for (const it of items) {
        prisma.product.findUnique({ where: { id: it.id } }).then(prd => {
          if (prd) {
            prisma.productWarehouse.findFirst({ where: { productId: prd.id, warehouseId } }).then(pw => {
              if (pw) pushStockToRemoteStores(tenantId, prd.sku, pw.quantity);
            });
          }
        });
      }
    } catch {}
    broadcastToTenant(tenantId, "pos:sale_created", {
      sale: result,
      receiptNo: result.invoiceNo,
      items: items.map((i: any) => ({
        productId: i.id,
        quantity: Number(i.qty || i.quantity || 1),
      })),
    });

    broadcastToTenant(tenantId, "inventory:stock_updated", {
      warehouseId,
      items: items.map((i: any) => ({
        productId: i.id,
        quantityDecremented: Number(i.qty || i.quantity || 1),
      })),
    });

    // ⚡ Auto-post to Double-Entry General Ledger
    autoPostSaleToLedger({
      tenantId,
      saleId: result.id,
      invoiceNo: result.invoiceNo,
      total: Number(result.total),
      subtotal: Number(result.subtotal),
      totalTax: Number(result.totalTax || 0),
      paymentMode: body.paymentMode || body.paymentMethod || "Cash",
      isPaid: (body.paymentStatus || "paid") === "paid",
    }).catch((e) => console.error("Auto-post sale to ledger error:", e));

    return res.status(201).json({
      success: true,
      message: "Sale processed successfully",
      sale: result,
      receiptNo: result.invoiceNo,
    });
  } catch (err: any) {
    console.error("Sales POST checkout error:", err);
    return res.status(500).json({ error: err.message || "Failed to process sale" });
  }
});

// GET /api/sales/held - Retrieve held orders for POS
salesRouter.get("/held", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    let tenantId = req.user?.tenantId;
    if (!tenantId || tenantId === "default") {
      const t = await prisma.tenant.findFirst();
      tenantId = t?.id || "tenant-default-001";
    }
    const held = await prisma.heldOrder.findMany({
      where: { tenantId },
      orderBy: { heldAt: "desc" },
    });

    const formatted = held.map((h) => ({
      id: h.id,
      label: h.label || "Held Order",
      name: h.label || "Held Order",
      customer: h.customerName || "Walk-in Customer",
      customerName: h.customerName || "Walk-in Customer",
      savedAt: h.heldAt.toISOString(),
      heldAt: h.heldAt.toISOString(),
      cart: h.cartData,
      items: h.cartData,
    }));

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/sales/held - Save a held order
salesRouter.post("/held", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    let tenantId = req.user?.tenantId;
    if (!tenantId || tenantId === "default") {
      const t = await prisma.tenant.findFirst();
      tenantId = t?.id || "tenant-default-001";
    }
    const body = req.body;

    const held = await prisma.heldOrder.create({
      data: {
        tenantId,
        label: body.label || body.name || "Held Order",
        customerName: body.customer || body.customerName || "Walk-in Customer",
        cartData: body.cart || body.items || [],
      },
    });

    broadcastToTenant(tenantId, "pos:held_updated", { action: "created", id: held.id });
    return res.status(201).json(held);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sales/held/:id - Remove held order upon recall/clear
salesRouter.delete("/held/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    let tenantId = req.user?.tenantId;
    if (!tenantId || tenantId === "default") {
      const t = await prisma.tenant.findFirst();
      tenantId = t?.id || "tenant-default-001";
    }
    const { id } = req.params;

    await prisma.heldOrder.deleteMany({
      where: { id, tenantId },
    });

    broadcastToTenant(tenantId, "pos:held_updated", { action: "deleted", id });
    return res.json({ success: true, message: "Held order cleared" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// POS CASH REGISTER & SHIFT SESSIONS
// ==========================================

// GET /api/sales/register/current - Check if shift is open
salesRouter.get("/register/current", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";

    // Ensure default terminal exists
    let register = await prisma.cashRegister.findFirst({ where: { tenantId } });
    if (!register) {
      register = await prisma.cashRegister.create({
        data: {
          tenantId,
          name: "Main POS Counter #1",
          status: "closed",
        },
      });
    }

    const openShift = await prisma.registerShift.findFirst({
      where: { tenantId, status: "open" },
      include: { register: true },
      orderBy: { openedAt: "desc" },
    });

    if (!openShift) {
      return res.json({ isOpen: false, register });
    }

    return res.json({
      isOpen: true,
      shift: {
        id: openShift.id,
        registerId: openShift.registerId,
        registerName: openShift.register.name,
        cashierName: openShift.cashierName,
        openingFloat: Number(openShift.openingFloat),
        cashSales: Number(openShift.cashSales),
        cardSales: Number(openShift.cardSales),
        upiSales: Number(openShift.upiSales),
        cashIn: Number(openShift.cashIn),
        cashOut: Number(openShift.cashOut),
        expectedCash: Number(openShift.expectedCash),
        openedAt: openShift.openedAt.toISOString(),
        notes: openShift.notes || "",
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/sales/register/open - Open register shift with starting float
salesRouter.post("/register/open", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { registerId, openingFloat, notes } = req.body;

    // Check if already open
    const active = await prisma.registerShift.findFirst({
      where: { tenantId, status: "open" },
    });
    if (active) {
      return res.status(400).json({ error: "A register shift is already open." });
    }

    let targetRegisterId = registerId;
    if (!targetRegisterId) {
      const reg = await prisma.cashRegister.findFirst({ where: { tenantId } });
      targetRegisterId = reg?.id;
    }

    const floatAmt = Number(openingFloat || 0);
    const shift = await prisma.registerShift.create({
      data: {
        tenantId,
        registerId: targetRegisterId,
        cashierId: req.user?.userId || null,
        cashierName: req.user?.email ? req.user.email.split("@")[0] : "Cashier",
        openingFloat: floatAmt,
        expectedCash: floatAmt,
        status: "open",
        notes: notes || "Shift opened",
      },
    });

    await prisma.cashRegister.update({
      where: { id: targetRegisterId },
      data: { status: "open" },
    });

    broadcastToTenant(tenantId, "pos:register_opened", { shiftId: shift.id });
    return res.status(201).json({ success: true, shift });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/sales/register/drop - Cash In / Cash Out drawer drops
salesRouter.post("/register/drop", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { type, amount, reason } = req.body; // type: "in" | "out"
    const dropAmt = Number(amount);
    if (isNaN(dropAmt) || dropAmt <= 0) return res.status(400).json({ error: "Invalid amount" });

    const openShift = await prisma.registerShift.findFirst({
      where: { tenantId, status: "open" },
    });
    if (!openShift) return res.status(400).json({ error: "No open register shift found." });

    const updateData: any = {};
    if (type === "in") {
      updateData.cashIn = { increment: dropAmt };
      updateData.expectedCash = { increment: dropAmt };
    } else {
      updateData.cashOut = { increment: dropAmt };
      updateData.expectedCash = { decrement: dropAmt };
    }

    const updated = await prisma.registerShift.update({
      where: { id: openShift.id },
      data: updateData,
    });

    return res.json({ success: true, shift: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/sales/register/close - Close shift with cash drawer count & variance
salesRouter.post("/register/close", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { actualCash, notes } = req.body;
    const countedCash = Number(actualCash || 0);

    const openShift = await prisma.registerShift.findFirst({
      where: { tenantId, status: "open" },
      include: { register: true },
    });
    if (!openShift) return res.status(400).json({ error: "No open register shift found." });

    const expected = Number(openShift.expectedCash);
    const variance = countedCash - expected;

    const closed = await prisma.registerShift.update({
      where: { id: openShift.id },
      data: {
        actualCash: countedCash,
        variance,
        status: "closed",
        closedAt: new Date(),
        notes: notes || openShift.notes,
      },
    });

    await prisma.cashRegister.update({
      where: { id: openShift.registerId },
      data: { status: "closed" },
    });

    broadcastToTenant(tenantId, "pos:register_closed", {
      shiftId: closed.id,
      variance,
      actualCash: countedCash,
    });

    return res.json({
      success: true,
      message: `Shift closed. Variance: ${variance >= 0 ? "+" : ""}${variance}`,
      shift: closed,
      report: {
        openingFloat: Number(closed.openingFloat),
        cashSales: Number(closed.cashSales),
        cardSales: Number(closed.cardSales),
        upiSales: Number(closed.upiSales),
        cashIn: Number(closed.cashIn),
        cashOut: Number(closed.cashOut),
        expectedCash: expected,
        actualCash: countedCash,
        variance,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

