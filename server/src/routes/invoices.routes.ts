import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, requirePermission, AuthRequest } from "../middleware/auth";
import crypto from "crypto";
import { autoPostSaleToLedger } from "../services/ledger-posting.service";

export const invoicesRouter = Router();

// GET /api/invoices - List formal invoices from Sale table or fallback
invoicesRouter.get("/", requireAuth, requirePermission("finance.invoices.view"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";

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

// POST /api/invoices - Create formal invoice (persists in Sale table)
invoicesRouter.post("/", requireAuth, requirePermission("finance.invoices.create"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const body = req.body;

    const count = await prisma.sale.count({ where: { tenantId } });
    const invoiceNo = body.number || body.invoiceNo || `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const lines: any[] = body.lines || [];
    const subtotal = Number(body.subtotal || lines.reduce((acc, l) => acc + (Number(l.rate || 0) * Number(l.qty || 1)), 0));
    const cgst = Number(body.cgst || 0);
    const sgst = Number(body.sgst || 0);
    const igst = Number(body.igst || 0);
    const total = Number(body.total || body.amount || subtotal + cgst + sgst + igst);

    const sale = await prisma.sale.create({
      data: {
        tenantId,
        invoiceNo,
        type: "invoice",
        customerName: body.client || body.customerName || "B2B Client",
        customerGstin: body.client_gstin || body.clientGstin || "",
        subtotal,
        taxMode: body.tax_mode || body.taxMode || "sgst_cgst",
        cgst,
        sgst,
        igst,
        totalTax: cgst + sgst + igst,
        total,
        paidAmount: body.status === "paid" ? total : 0,
        paymentStatus: body.status === "paid" ? "paid" : "unpaid",
        notes: body.notes || "",
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      },
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
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// GET /api/invoices/pos/sales - Retrieve POS sales directly from relational MySQL Sale table
invoicesRouter.get("/pos/sales", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";

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
    const tenantId = req.user?.tenantId || "default";
    const body = req.body;

    const items: any[] = body.items || [];
    if (items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const defaultWh = await prisma.warehouse.findFirst({ where: { tenantId, isDefault: true } });
    const warehouseId = defaultWh ? defaultWh.id : (await prisma.warehouse.findFirst({ where: { tenantId } }))?.id;

    const count = await prisma.sale.count({ where: { tenantId } });
    const invoiceNo = body.receiptNo || `REC-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

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

        // Decrement warehouse stock atomically
        if (warehouseId && productId) {
          const pw = await tx.productWarehouse.findUnique({
            where: { productId_warehouseId: { productId, warehouseId } },
          });
          if (pw) {
            await tx.productWarehouse.update({
              where: { id: pw.id },
              data: { quantity: { decrement: lineQty } },
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
    return res.status(500).json({ error: err.message || "Failed to process POS sale" });
  }
});

// GET /api/invoices/pos/held - Retrieve held orders from HeldOrder table
invoicesRouter.get("/pos/held", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
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
    const tenantId = req.user?.tenantId || "default";
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
    const sales = await prisma.sale.findMany({
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

    const proposals = await prisma.crmProposal.findMany({
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

    const sale = await prisma.sale.findFirst({
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

    const sale = await prisma.sale.findFirst({
      where: {
        OR: [{ id }, { invoiceNo: id }],
      },
    });

    if (!sale) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const updated = await prisma.sale.update({
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
