import { Router, Response } from "express";
import { prisma, rawPrisma } from "../prisma";
import { requireAuth, requirePermission, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { autoPostSaleToLedger, autoPostCustomerPaymentToLedger, PeriodPostingError } from "../services/ledger-posting.service";
import { InventoryMovementService } from "../services/inventory-movement.service";
import { STOCK_MOVEMENT_TYPES } from "../services/inventory-movement.types";
import { InsufficientStockError } from "../services/inventory-movement.errors";

export const invoicesRouter = Router();

// Enforce requireAuth and resolveTenantContext on all non-public invoice routes
invoicesRouter.use((req, res, next) => {
  if (req.path.startsWith("/public")) {
    return next();
  }
  return requireAuth(req as AuthRequest, res, () => {
    return resolveTenantContext(req as any, res, next);
  });
});

// GET /api/invoices - List formal invoices from Sale table or fallback
invoicesRouter.get("/", requireAuth, requirePermission("finance.invoices.view"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;

    const sales = await prisma.sale.findMany({
      where: { tenantId },
      include: {
        customer: true,
        details: true,
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (sales.length > 0) {
      const formatted = sales.map((s) => ({
        id: s.id,
        number: s.invoiceNo,
        invoiceNo: s.invoiceNo,
        date: s.date.toISOString(),
        dueDate: s.dueDate ? s.dueDate.toISOString() : s.date.toISOString(),
        client: s.customerName || s.customer?.name || "Walk-in Customer",
        client_gstin: s.customerGstin || s.customer?.gstin || "",
        clientGstin: s.customerGstin || s.customer?.gstin || "",
        client_address: s.customer?.address || "",
        clientAddress: s.customer?.address || "",
        client_email: s.customer?.email || "",
        clientEmail: s.customer?.email || "",
        status: s.paymentStatus === "paid" ? "paid" : "sent",
        tax_mode: s.taxMode || "sgst_cgst",
        taxMode: s.taxMode || "sgst_cgst",
        subtotal: Number(s.subtotal),
        total_gst: Number(s.totalTax),
        totalGst: Number(s.totalTax),
        cgst: Number(s.cgst),
        sgst: Number(s.sgst),
        igst: Number(s.igst),
        total: Number(s.total),
        amount: Number(s.total),
        notes: s.notes || "",
        terms: "Standard 30 days payment terms",
        paidAt: s.payments[0]?.paidAt ? s.payments[0].paidAt.toISOString() : undefined,
        created_at: s.createdAt.toISOString(),
        lines: s.details.map((d) => ({
          id: d.productId,
          description: d.productName,
          hsn_sac: d.hsnSac || "",
          qty: d.quantity,
          unit: d.unit || "Pcs",
          rate: Number(d.price),
          gst_rate: Number(d.taxRate),
          amount: Number(d.price) * d.quantity,
          gst_amount: Number(d.taxAmount),
        })),
      }));
      return res.json(formatted);
    }

    // Fallback to cmsPage if no relational sales yet
    const slug = `system-invoices-records-${tenantId}`;
    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    const list = page?.content && Array.isArray(page.content) ? page.content : [];
    return res.json(list);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/invoices - Create formal invoice (persists in Sale table and SaleDetail lines)
invoicesRouter.post("/", requireAuth, requirePermission("finance.invoices.create"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const body = req.body;

    const count = await prisma.sale.count({ where: { tenantId } });
    const invoiceNo = body.number || body.invoiceNo || `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const lines: any[] = Array.isArray(body.lines) ? body.lines : [];
    const subtotal = Number(body.subtotal || lines.reduce((acc, l) => acc + (Number(l.rate || l.unitPrice || 0) * Number(l.qty || l.quantity || 1) - Number(l.discount || 0)), 0));

    // Determine Indian GST mode (Intra-state CGST+SGST vs Inter-state IGST)
    const clientGstin = (body.client_gstin || body.clientGstin || "").trim();
    const customerState = body.customerState || body.clientState || (clientGstin.length >= 2 ? clientGstin.slice(0, 2) : "");
    const companyState = body.companyState || "29"; // Default Karnataka state code 29
    let taxMode: "sgst_cgst" | "igst" = body.taxMode || body.tax_mode;

    if (!taxMode) {
      if (customerState && customerState !== companyState) {
        taxMode = "igst";
      } else {
        taxMode = "sgst_cgst";
      }
    }

    // Calculate line-level taxes if not provided directly
    let calculatedTotalTax = 0;
    for (const l of lines) {
      const lineQty = Number(l.qty || l.quantity || 1);
      const lineRate = Number(l.rate || l.unitPrice || 0);
      const lineTaxRate = Number(l.gst_rate !== undefined ? l.gst_rate : l.taxRate || 0);
      const lineTaxAmt = Number(l.gst_amount !== undefined ? l.gst_amount : l.taxAmount || (lineRate * lineQty * (lineTaxRate / 100)));
      calculatedTotalTax += lineTaxAmt;
    }

    const totalTax = Number(body.totalTax !== undefined ? body.totalTax : body.total_gst !== undefined ? body.total_gst : calculatedTotalTax);

    let cgst = Number(body.cgst || 0);
    let sgst = Number(body.sgst || 0);
    let igst = Number(body.igst || 0);

    if (cgst === 0 && sgst === 0 && igst === 0 && totalTax > 0) {
      if (taxMode === "igst") {
        igst = totalTax;
      } else {
        cgst = Math.round((totalTax / 2) * 100) / 100;
        sgst = Math.round((totalTax / 2) * 100) / 100;
      }
    }

    const total = Number(body.total || body.amount || (subtotal + cgst + sgst + igst));

    // Check optional customer relation
    let customerId = body.customerId || null;
    if (!customerId && (body.client || body.customerName)) {
      const existingCustomer = await prisma.customer.findFirst({
        where: { tenantId, name: body.client || body.customerName },
      });
      if (existingCustomer) customerId = existingCustomer.id;
    }

    const { sale, formattedLines } = await prisma.$transaction(async (tx) => {
      const createdSale = await tx.sale.create({
        data: {
          tenantId,
          invoiceNo,
          type: "invoice",
          customerId,
          warehouseId: body.warehouseId || null,
          customerName: body.client || body.customerName || "B2B Client",
          customerGstin: clientGstin,
          subtotal,
          taxMode,
          cgst,
          sgst,
          igst,
          totalTax: cgst + sgst + igst,
          total,
          paidAmount: body.status === "paid" ? total : 0,
          paymentStatus: body.status === "paid" ? "paid" : "unpaid",
          notes: body.notes || "",
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          date: body.date ? new Date(body.date) : new Date(),
        },
      });

      const lineOut: any[] = [];
      for (const l of lines) {
        const lineName = l.description || l.name || "Item";
        let pId = l.productId || l.id;

        let prod = pId ? await tx.product.findFirst({ where: { id: pId, tenantId } }) : null;
        if (!prod) {
          prod = await tx.product.findFirst({ where: { tenantId, name: lineName } });
        }
        if (!prod) {
          prod = await tx.product.create({
            data: {
              tenantId,
              name: lineName,
              sku: l.sku || `INV-${Date.now().toString().slice(-6)}`,
              purchasePrice: 0,
              salePrice: Number(l.rate || l.unitPrice || 0),
              lowStockThreshold: 0,
            },
          });
        }

        const lineQty = Number(l.qty || l.quantity || 1);
        const lineRate = Number(l.rate || l.unitPrice || 0);
        const lineTaxRate = Number(l.gst_rate !== undefined ? l.gst_rate : l.taxRate || 0);
        const lineTaxAmt = Number(l.gst_amount !== undefined ? l.gst_amount : l.taxAmount || (lineRate * lineQty * (lineTaxRate / 100)));
        const lineDiscount = Number(l.discount || 0);
        const lineSubtotal = (lineRate * lineQty) - lineDiscount + lineTaxAmt;

        const detail = await tx.saleDetail.create({
          data: {
            saleId: createdSale.id,
            productId: prod.id,
            productName: lineName,
            sku: l.sku || prod.sku,
            hsnSac: l.hsn_sac || l.hsnSac || null,
            unit: l.unit || "Pcs",
            price: lineRate,
            quantity: lineQty,
            taxRate: lineTaxRate,
            taxAmount: lineTaxAmt,
            discount: lineDiscount,
            subtotal: lineSubtotal,
          },
        });

        lineOut.push({
          id: detail.productId,
          description: detail.productName,
          hsn_sac: detail.hsnSac || "",
          qty: detail.quantity,
          unit: detail.unit || "Pcs",
          rate: Number(detail.price),
          gst_rate: Number(detail.taxRate),
          amount: Number(detail.price) * detail.quantity,
          gst_amount: Number(detail.taxAmount),
        });
      }

      return { sale: createdSale, formattedLines: lineOut };
    });

    // ⚡ Auto-post to Double-Entry General Ledger
    autoPostSaleToLedger({
      tenantId,
      saleId: sale.id,
      invoiceNo,
      total,
      subtotal,
      totalTax: cgst + sgst + igst,
      paymentMode: body.paymentMode || "Bank Transfer",
      isPaid: body.status === "paid",
    }).catch((e) => console.error("Auto-post invoice to ledger error:", e));

    return res.status(201).json({
      ...body,
      id: sale.id,
      number: invoiceNo,
      invoiceNo,
      date: sale.date.toISOString(),
      dueDate: sale.dueDate ? sale.dueDate.toISOString() : sale.date.toISOString(),
      client: sale.customerName,
      client_gstin: sale.customerGstin,
      tax_mode: sale.taxMode,
      taxMode: sale.taxMode,
      subtotal: Number(sale.subtotal),
      cgst: Number(sale.cgst),
      sgst: Number(sale.sgst),
      igst: Number(sale.igst),
      total_gst: Number(sale.totalTax),
      totalGst: Number(sale.totalTax),
      total: Number(sale.total),
      amount: Number(sale.total),
      status: sale.paymentStatus,
      lines: formattedLines,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// GET /api/invoices/:id - Retrieve single invoice with details & payments
invoicesRouter.get("/:id", requireAuth, requirePermission("finance.invoices.view"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { id } = req.params;

    const sale = await prisma.sale.findFirst({
      where: {
        tenantId,
        OR: [{ id }, { invoiceNo: id }],
      },
      include: {
        customer: true,
        warehouse: true,
        details: true,
        payments: {
          orderBy: { paidAt: "asc" },
        },
      },
    });

    if (!sale) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const formatted = {
      id: sale.id,
      number: sale.invoiceNo,
      invoiceNo: sale.invoiceNo,
      date: sale.date.toISOString(),
      dueDate: sale.dueDate ? sale.dueDate.toISOString() : sale.date.toISOString(),
      client: sale.customerName || sale.customer?.name || "B2B Client",
      client_gstin: sale.customerGstin || sale.customer?.gstin || "",
      clientGstin: sale.customerGstin || sale.customer?.gstin || "",
      client_address: sale.customer?.address || "",
      clientAddress: sale.customer?.address || "",
      client_email: sale.customer?.email || "",
      clientEmail: sale.customer?.email || "",
      status: sale.paymentStatus === "paid" ? "paid" : Number(sale.paidAmount) > 0 ? "partial" : "sent",
      paymentStatus: sale.paymentStatus,
      tax_mode: sale.taxMode || "sgst_cgst",
      taxMode: sale.taxMode || "sgst_cgst",
      subtotal: Number(sale.subtotal),
      total_gst: Number(sale.totalTax),
      totalGst: Number(sale.totalTax),
      cgst: Number(sale.cgst),
      sgst: Number(sale.sgst),
      igst: Number(sale.igst),
      total: Number(sale.total),
      amount: Number(sale.total),
      paidAmount: Number(sale.paidAmount),
      remainingBalance: Math.max(0, Number(sale.total) - Number(sale.paidAmount)),
      notes: sale.notes || "",
      terms: "Standard 30 days payment terms",
      created_at: sale.createdAt.toISOString(),
      lines: sale.details.map((d) => ({
        id: d.productId,
        description: d.productName,
        hsn_sac: d.hsnSac || "",
        qty: d.quantity,
        unit: d.unit || "Pcs",
        rate: Number(d.price),
        gst_rate: Number(d.taxRate),
        amount: Number(d.price) * d.quantity,
        gst_amount: Number(d.taxAmount),
      })),
      payments: sale.payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        method: p.method,
        referenceNo: p.referenceNo,
        notes: (p as any).notes || "",
        paidAt: p.paidAt.toISOString(),
      })),
    };

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch invoice" });
  }
});

// GET /api/invoices/:id/payments - Retrieve all payments for an invoice
invoicesRouter.get("/:id/payments", requireAuth, requirePermission("finance.invoices.view"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { id } = req.params;

    const sale = await prisma.sale.findFirst({
      where: {
        tenantId,
        OR: [{ id }, { invoiceNo: id }],
      },
      select: { id: true, invoiceNo: true, total: true, paidAmount: true, paymentStatus: true },
    });

    if (!sale) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const payments = await prisma.salePayment.findMany({
      where: { saleId: sale.id },
      orderBy: { paidAt: "asc" },
    });

    return res.json({
      invoiceId: sale.id,
      invoiceNo: sale.invoiceNo,
      total: Number(sale.total),
      paidAmount: Number(sale.paidAmount),
      remainingBalance: Math.max(0, Number(sale.total) - Number(sale.paidAmount)),
      paymentStatus: sale.paymentStatus,
      payments: payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        method: p.method,
        referenceNo: p.referenceNo,
        notes: (p as any).notes || "",
        paidAt: p.paidAt.toISOString(),
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch invoice payments" });
  }
});

// POST /api/invoices/:id/payments - Record customer payment for invoice
invoicesRouter.post("/:id/payments", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { id } = req.params;
    const body = req.body;

    const paymentAmount = Number(body.amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ error: "Payment amount must be greater than 0" });
    }

    const method = body.method || body.paymentMethod || "Bank Transfer";
    const referenceNo = body.referenceNo || `PAY-${Date.now()}`;
    const notes = body.notes || "";
    const idempotencyKey = body.idempotencyKey || null;

    if (idempotencyKey) {
      const existing = await prisma.salePayment.findFirst({
        where: { saleId: id, idempotencyKey },
      });
      if (existing) {
        return res.status(409).json({
          error: "A payment with this idempotency key has already been recorded",
          code: "DUPLICATE_PAYMENT",
          payment: existing,
        });
      }
    }

    const { payment, updatedSale } = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: {
          tenantId,
          OR: [{ id }, { invoiceNo: id }],
        },
      });

      if (!sale) {
        throw new Error("NOT_FOUND");
      }

      const total = Number(sale.total);
      const currentPaid = Number(sale.paidAmount);
      const remainingBalance = Math.round((total - currentPaid) * 100) / 100;

      if (paymentAmount > remainingBalance + 0.001) {
        throw new Error(`OVERPAYMENT: Payment amount (${paymentAmount}) exceeds remaining balance (${remainingBalance})`);
      }

      const newPaidAmount = Math.round((currentPaid + paymentAmount) * 100) / 100;
      const newPaymentStatus = newPaidAmount >= total - 0.001 ? "paid" : "partial";

      const updateCount = await tx.sale.updateMany({
        where: {
          id: sale.id,
          tenantId,
          paidAmount: sale.paidAmount,
        },
        data: {
          paidAmount: newPaidAmount,
          paymentStatus: newPaymentStatus,
          paymentMethod: method,
        },
      });

      if (updateCount.count === 0) {
        throw new Error("PAYMENT_RACE: Concurrent payment detected. Please retry.");
      }

      const newPayment = await tx.salePayment.create({
        data: {
          saleId: sale.id,
          amount: paymentAmount,
          method,
          referenceNo,
          notes,
          idempotencyKey,
          paidAt: body.date ? new Date(body.date) : new Date(),
          createdById: (req.user as any)?.userId || (req.user as any)?.id,
        },
      });

      const fresh = await tx.sale.findUnique({
        where: { id: sale.id },
        include: { customer: true, details: true, payments: true },
      });

      return { payment: newPayment, updatedSale: fresh };
    });

    // Auto-post to General Ledger
    try {
      await autoPostCustomerPaymentToLedger({
        tenantId,
        paymentId: payment.id,
        saleId: updatedSale!.id,
        invoiceNo: updatedSale?.invoiceNo || id,
        amount: paymentAmount,
        method,
        customerName: updatedSale?.customerName || updatedSale?.customer?.name,
      });
    } catch (glErr: any) {
      console.error("Auto-post invoice payment to ledger error:", glErr);
    }

    return res.status(201).json({
      success: true,
      message: `Payment of ${paymentAmount} recorded successfully`,
      payment: {
        id: payment.id,
        amount: Number(payment.amount),
        method: payment.method,
        referenceNo: payment.referenceNo,
        notes: (payment as any).notes || "",
        paidAt: payment.paidAt.toISOString(),
      },
      invoice: {
        id: updatedSale?.id,
        number: updatedSale?.invoiceNo,
        total: Number(updatedSale?.total),
        paidAmount: Number(updatedSale?.paidAmount),
        remainingBalance: Math.max(0, Number(updatedSale?.total) - Number(updatedSale?.paidAmount)),
        paymentStatus: updatedSale?.paymentStatus,
      },
    });
  } catch (err: any) {
    console.error("Invoice payment error:", err);
    if (err.message === "NOT_FOUND") {
      return res.status(404).json({ error: "Invoice not found" });
    }
    if (err.message?.startsWith("OVERPAYMENT")) {
      return res.status(400).json({ error: err.message, code: "OVERPAYMENT" });
    }
    if (err.message?.startsWith("PAYMENT_RACE")) {
      return res.status(409).json({ error: err.message, code: "PAYMENT_RACE" });
    }
    if (err instanceof PeriodPostingError || err.code === "PERIOD_CLOSED_FOR_POSTING") {
      return res.status(400).json({ error: err.message, code: "PERIOD_CLOSED_FOR_POSTING" });
    }
    return res.status(500).json({ error: err.message || "Failed to record invoice payment" });
  }
});


// GET /api/invoices/pos/sales - Retrieve POS sales directly from relational MySQL Sale table
invoicesRouter.get("/pos/sales", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;

    const sales = await prisma.sale.findMany({
      where: { tenantId },
      include: {
        customer: true,
        details: true,
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = sales.map((s) => ({
      id: s.id,
      receiptNo: s.invoiceNo,
      customer: s.customerName || s.customer?.name || "Walk-in Customer",
      customerName: s.customerName || s.customer?.name || "Walk-in Customer",
      customerGstin: s.customerGstin || s.customer?.gstin || "",
      paymentMode: s.paymentMethod,
      subtotal: Number(s.subtotal),
      discountPct: s.discountPct ? Number(s.discountPct) : 0,
      discountAmt: Number(s.discountAmt),
      taxMode: s.taxMode || "sgst_cgst",
      cgst: Number(s.cgst),
      sgst: Number(s.sgst),
      igst: Number(s.igst),
      total: Number(s.total),
      cashier: s.cashierName || "Cashier",
      date: s.date.toISOString(),
      completedAt: s.createdAt.toISOString(),
      items: s.details.map((d) => ({
        id: d.productId,
        name: d.productName,
        sku: d.sku || "",
        hsn_sac: d.hsnSac || "",
        unit: d.unit || "Pcs",
        price: Number(d.price),
        qty: d.quantity,
        quantity: d.quantity,
        gst_rate: Number(d.taxRate),
      })),
    }));

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/invoices/pos/sales - POS Checkout with ATOMIC WAREHOUSE STOCK DEDUCTION
invoicesRouter.post("/pos/sales", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const body = req.body;

    const items: any[] = body.items || [];
    if (items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const defaultWh = await prisma.warehouse.findFirst({ where: { tenantId, isDefault: true } });
    const warehouseId = defaultWh ? defaultWh.id : (await prisma.warehouse.findFirst({ where: { tenantId } }))?.id;

    // Idempotency check: if a sale with this receiptNo already exists, return it
    const receiptNo = body.receiptNo;
    if (receiptNo) {
      const existingSale = await prisma.sale.findFirst({
        where: { tenantId, invoiceNo: receiptNo },
        include: { details: true, payments: true },
      });
      if (existingSale) {
        return res.json({
          ...body,
          id: existingSale.id,
          receiptNo: existingSale.invoiceNo,
          invoiceNo: existingSale.invoiceNo,
          completedAt: existingSale.createdAt.toISOString(),
          isDuplicate: true,
        });
      }
    }

    const count = await prisma.sale.count({ where: { tenantId } });
    const entropy = Math.floor(1000 + Math.random() * 9000);
    const invoiceNo = body.receiptNo || `REC-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}-${entropy}`;

    const sale = await prisma.$transaction(async (tx) => {
      const createdSale = await tx.sale.create({
        data: {
          tenantId,
          invoiceNo,
          type: "pos",
          customerName: body.customer || body.customerName || "Walk-in Customer",
          customerGstin: body.customerGstin || "",
          warehouseId: warehouseId || null,
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
          paidAmount: Number(body.total || 0),
          paymentStatus: "paid",
          paymentMethod: body.paymentMode || "Cash",
          date: body.date ? new Date(body.date) : new Date(),
        },
      });

      for (const item of items) {
        const productId = item.id;
        const lineQty = Number(item.qty || item.quantity || 1);
        const linePrice = Number(item.price || 0);
        const taxRate = Number(item.gst_rate !== undefined ? item.gst_rate : 18);
        const lineTax = Number((linePrice * lineQty * (taxRate / 100)));

        await tx.saleDetail.create({
          data: {
            saleId: createdSale.id,
            productId,
            productName: item.name || "Item",
            sku: item.sku || null,
            hsnSac: item.hsn_sac || null,
            unit: item.unit || "Pcs",
            price: linePrice,
            quantity: lineQty,
            taxRate,
            taxAmount: lineTax,
            discount: 0,
            subtotal: Number((linePrice * lineQty) + lineTax),
          },
        });

        // Decrement warehouse stock atomically via Centralized Stock Engine
        if (warehouseId && productId) {
          const product = await tx.product.findUnique({
            where: { id: productId },
            select: { id: true, name: true, type: true },
          });

          const isService = product?.type?.toLowerCase() === "service";

          if (!isService) {
            await InventoryMovementService.decreaseStock({
              tenantId,
              productId,
              warehouseId,
              quantity: lineQty,
              movementType: STOCK_MOVEMENT_TYPES.POS_SALE,
              referenceType: "SALE",
              referenceId: createdSale.id,
              createdById: (req as any).user?.userId || (req as any).user?.id,
              notes: `POS Sale checkout (${invoiceNo})`,
              tx,
            });
          }
        }
      }

      await tx.salePayment.create({
        data: {
          saleId: createdSale.id,
          amount: Number(body.total || 0),
          method: body.paymentMode || "Cash",
          referenceNo: invoiceNo,
        },
      });

      return createdSale;
    });

    // ⚡ Auto-post to Double-Entry General Ledger
    autoPostSaleToLedger({
      tenantId,
      saleId: sale.id,
      invoiceNo,
      total: Number(body.total || 0),
      subtotal: Number(body.subtotal || 0),
      totalTax: Number((body.cgst || 0) + (body.sgst || 0) + (body.igst || 0)),
      paymentMode: body.paymentMode || "Cash",
      isPaid: true,
    }).catch((e) => console.error("Auto-post POS sale to ledger error:", e));

    return res.status(201).json({
      ...body,
      id: sale.id,
      receiptNo: invoiceNo,
      completedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("POS sale error:", err);
    if (err instanceof InsufficientStockError || err.code === "INSUFFICIENT_STOCK") {
      return res.status(409).json({
        error: err.message,
        code: "INSUFFICIENT_STOCK",
        productId: err.productId,
        warehouseId: err.warehouseId,
      });
    }
    return res.status(500).json({ error: err.message || "Failed to process POS sale" });
  }
});

// GET /api/invoices/pos/held - Retrieve held orders from HeldOrder table
invoicesRouter.get("/pos/held", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const held = await prisma.heldOrder.findMany({
      where: { tenantId },
      orderBy: { heldAt: "desc" },
    });

    return res.json(
      held.map((h) => ({
        id: h.id,
        name: h.label || "Held Order",
        label: h.label || "Held Order",
        customer: h.customerName || "Walk-in Customer",
        customerName: h.customerName || "Walk-in Customer",
        savedAt: h.heldAt.toISOString(),
        heldAt: h.heldAt.toISOString(),
        cart: h.cartData,
        items: h.cartData,
      }))
    );
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/invoices/pos/held - Save held order to HeldOrder table
invoicesRouter.post("/pos/held", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { heldOrders } = req.body;

    if (Array.isArray(heldOrders)) {
      await prisma.heldOrder.deleteMany({ where: { tenantId } });
      for (const order of heldOrders) {
        await prisma.heldOrder.create({
          data: {
            tenantId,
            label: order.name || order.label || "Held Order",
            customerName: order.customer || order.customerName || "Walk-in Customer",
            cartData: order.cart || order.items || [],
          },
        });
      }
    }

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

/**
 * GET /api/invoices/public/client/statement
 * Public Client Portal: Look up customer statement of account by phone, email, or invoice number
 */
invoicesRouter.get("/public/client/statement", async (req, res) => {
  try {
    const query = ((req.query.query as string) || "").trim();
    if (!query || query.length < 2) {
      return res.status(400).json({ error: "Please provide a valid client email, phone number, or company name" });
    }

    // Find sales matching customer
    const sales = await (rawPrisma || prisma).sale.findMany({
      where: {
        OR: [
          { customer: { email: { contains: query } } },
          { customer: { phone: { contains: query } } },
          { customerName: { contains: query } },
          { invoiceNo: query },
        ],
      },
      include: {
        customer: true,
        payments: true,
        tenant: { select: { name: true, logoUrl: true } },
      },
      orderBy: { date: "desc" },
      take: 50,
    });

    if (sales.length === 0) {
      return res.status(404).json({ error: "No statement records found for the given search criteria" });
    }

    const primaryCustomer = sales[0].customer || {
      name: sales[0].customerName || "Valued Client",
      email: query.includes("@") ? query : "billing@client.com",
      phone: query,
    };

    const totalInvoiced = sales.reduce((sum, s) => sum + Number(s.total || 0), 0);
    const totalPaid = sales.reduce((sum, s) => sum + Number(s.paidAmount || 0), 0);
    const totalOutstanding = Math.max(0, totalInvoiced - totalPaid);

    const invoices = sales.map((s) => ({
      id: s.id,
      invoiceNo: s.invoiceNo,
      date: s.date,
      dueDate: new Date(new Date(s.date).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      grandTotal: Number(s.total || 0),
      paidAmount: Number(s.paidAmount || 0),
      dueAmount: Math.max(0, Number(s.total || 0) - Number(s.paidAmount || 0)),
      status: s.paymentStatus || (Number(s.paidAmount) >= Number(s.total) ? "paid" : "unpaid"),
    }));

    const proposals = await (rawPrisma || prisma).crmProposal.findMany({
      where: {
        OR: [
          { clientEmail: { contains: query } },
          { clientName: { contains: query } },
          { proposalNo: query },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return res.json({
      success: true,
      data: {
        customer: {
          name: primaryCustomer.name,
          email: primaryCustomer.email,
          phone: primaryCustomer.phone,
          address: (primaryCustomer as any)?.address || "Corporate Client Address",
        },
        company: {
          name: sales[0].tenant?.name || "Master ERP",
          logoUrl: sales[0].tenant?.logoUrl,
        },
        summary: {
          totalInvoiced,
          totalPaid,
          totalOutstanding,
          invoiceCount: sales.length,
          unpaidCount: invoices.filter((i) => i.status !== "paid").length,
          proposalCount: proposals.length,
        },
        invoices,
        proposals: proposals.map((p) => ({
          id: p.id,
          proposalNo: p.proposalNo,
          title: p.title,
          amount: Number(p.amount),
          status: p.status,
          date: p.validUntil ? p.validUntil.toISOString() : p.createdAt.toISOString(),
        })),
      },
    });
  } catch (err: any) {
    console.error("Public statement fetch error:", err);
    return res.status(500).json({ error: err.message || "Failed to load statement of account" });
  }
});

/**
 * GET /api/invoices/public/:id
 * Public Client Self-Service Portal: fetch invoice by id or invoiceNo without staff login
 */
invoicesRouter.get("/public/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const sale = await (rawPrisma || prisma).sale.findFirst({
      where: {
        OR: [{ id }, { invoiceNo: id }],
      },
      include: {
        customer: true,
        warehouse: true,
        details: true,
        payments: true,
        tenant: true,
      },
    });

    if (!sale) {
      return res.status(404).json({ error: "Invoice not found or expired" });
    }

    const formatted = {
      id: sale.id,
      invoiceNo: sale.invoiceNo,
      date: sale.date,
      dueDate: new Date(new Date(sale.date).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      status: sale.paymentStatus || "unpaid",
      client: {
        name: sale.customer?.name || "Valued Client",
        email: sale.customer?.email || "billing@client.com",
        phone: sale.customer?.phone || "—",
        address: sale.customer?.address || "Corporate Client Address",
        city: sale.customer?.city || "—",
        taxNumber: (sale.customer as any)?.taxNumber || sale.customerGstin || "—",
      },
      company: {
        name: sale.tenant?.name || "TSV Global Solutions Pvt Ltd",
        email: "billing@tsvsolutions.com",
        phone: "+91 98765 43210",
        address: (sale.warehouse as any)?.location || "Headquarters Building, Chennai",
        currency: "INR",
        currencySymbol: "₹",
      },
      items: sale.details.map((d: any) => ({
        id: d.id,
        name: d.productName || "Service Item",
        quantity: d.quantity,
        unitPrice: Number(d.price || 0),
        tax: Number(d.taxAmount || 0),
        total: Number(d.subtotal || (d.quantity * Number(d.price || 0))),
      })),
      subtotal: Number(sale.subtotal || 0),
      taxAmount: Number(sale.totalTax || 0),
      discount: Number(sale.discountAmt || 0),
      grandTotal: Number(sale.total || 0),
      paidAmount: Number(sale.paidAmount || 0),
      dueAmount: Math.max(0, Number(sale.total || 0) - Number(sale.paidAmount || 0)),
      notes: sale.notes || "Thank you for your business. Please remit payment via bank transfer or the direct payment portal link.",
    };

    return res.json({ data: formatted });
  } catch (err: any) {
    console.error("Public invoice fetch error:", err);
    return res.status(500).json({ error: err.message || "Failed to load invoice" });
  }
});

/**
 * POST /api/invoices/public/:id/pay
 * Public payment execution via Razorpay or Card
 */
invoicesRouter.post("/public/:id/pay", async (req, res) => {
  try {
    const id = req.params.id;
    const { paymentMethod = "online", transactionId = `TXN-${Date.now()}` } = req.body;

    const sale = await (rawPrisma || prisma).sale.findFirst({
      where: {
        OR: [{ id }, { invoiceNo: id }],
      },
    });

    if (!sale) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const updated = await (rawPrisma || prisma).sale.update({
      where: { id: sale.id },
      data: {
        paymentStatus: "paid",
        paidAmount: sale.total,
        payments: {
          create: {
            amount: sale.total,
            method: paymentMethod,
            referenceNo: transactionId,
          },
        },
      },
    });

    // ⚡ Auto-post to Double-Entry General Ledger
    autoPostSaleToLedger({
      tenantId: sale.tenantId,
      saleId: sale.id,
      invoiceNo: sale.invoiceNo,
      total: Number(sale.total || 0),
      subtotal: Number(sale.subtotal || 0),
      totalTax: Number(sale.totalTax || 0),
      paymentMode: paymentMethod || "Online Gateway",
      isPaid: true,
    }).catch((e) => console.error("Auto-post public payment to ledger error:", e));

    return res.json({
      success: true,
      message: "Payment processed successfully. Receipt generated.",
      data: updated,
    });
  } catch (err: any) {
    console.error("Public invoice payment error:", err);
    return res.status(500).json({ error: err.message || "Payment processing failed" });
  }
});
