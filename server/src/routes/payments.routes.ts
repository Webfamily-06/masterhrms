import { Router, Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { autoPostSaleToLedger } from "../services/ledger-posting.service";
import { broadcastToTenant } from "../socket";

export const paymentsRouter = Router();

// -------------------------------------------------------------
// 1. GET /api/payments/razorpay/config - Get Razorpay settings
// -------------------------------------------------------------
paymentsRouter.get("/razorpay/config", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const slug = `system-razorpay-gateway-${tenantId}`;

    const page = await prisma.cmsPage.findUnique({
      where: { slug },
    });

    let content: any = { transactions: [], config: {} };
    if (page?.content) {
      try {
        content = typeof page.content === "string" ? JSON.parse(page.content) : page.content;
      } catch {
        content = { transactions: [], config: {} };
      }
    }

    const cfg = content.config || {};
    return res.json({
      config: {
        keyId: cfg.keyId || "",
        keySecretMasked: cfg.keySecret ? "••••••••••••••••" : "",
        hasKeySecret: !!cfg.keySecret,
        webhookSecret: cfg.webhookSecret || "",
        currency: cfg.currency || "INR",
        environment: cfg.environment || "sandbox",
      },
      transactionsCount: (content.transactions || []).length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch Razorpay config" });
  }
});

// -------------------------------------------------------------
// 2. POST /api/payments/razorpay/config - Save Razorpay settings
// -------------------------------------------------------------
paymentsRouter.post("/razorpay/config", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const slug = `system-razorpay-gateway-${tenantId}`;
    const { keyId, keySecret, webhookSecret, currency, environment } = req.body;

    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    let existingContent: any = { transactions: [], config: {} };
    if (page?.content) {
      try {
        existingContent = typeof page.content === "string" ? JSON.parse(page.content) : page.content;
      } catch {
        existingContent = { transactions: [], config: {} };
      }
    }

    const previousSecret = existingContent.config?.keySecret || "";
    const updatedSecret = keySecret && !keySecret.includes("••••") ? keySecret : previousSecret;

    const newConfig = {
      ...existingContent.config,
      keyId: keyId !== undefined ? keyId : existingContent.config?.keyId || "",
      keySecret: updatedSecret,
      webhookSecret: webhookSecret !== undefined ? webhookSecret : existingContent.config?.webhookSecret || "",
      currency: currency || existingContent.config?.currency || "INR",
      environment: environment || existingContent.config?.environment || "sandbox",
      updatedAt: new Date().toISOString(),
    };

    const newContent = {
      transactions: existingContent.transactions || [],
      config: newConfig,
    };

    await prisma.cmsPage.upsert({
      where: { slug },
      update: {
        title: "Razorpay Gateway Config",
        content: newContent,
        published: true,
      },
      create: {
        slug,
        title: "Razorpay Gateway Config",
        content: newContent,
        published: true,
      },
    });

    return res.json({
      message: "Razorpay API credentials and configuration saved securely!",
      config: {
        keyId: newConfig.keyId,
        hasKeySecret: !!newConfig.keySecret,
        webhookSecret: newConfig.webhookSecret,
        currency: newConfig.currency,
        environment: newConfig.environment,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to save Razorpay config" });
  }
});

// -------------------------------------------------------------
// 3. POST /api/payments/razorpay/create-order - Create Razorpay Order
// -------------------------------------------------------------
paymentsRouter.post("/razorpay/create-order", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const slug = `system-razorpay-gateway-${tenantId}`;
    const { amount, currency = "INR", receipt, notes = {} } = req.body;

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ error: "Valid payment amount is required" });
    }

    // Retrieve credentials
    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    let config: any = {};
    if (page?.content) {
      try {
        const c = typeof page.content === "string" ? JSON.parse(page.content) : page.content;
        config = c.config || {};
      } catch {
        config = {};
      }
    }

    const keyId = config.keyId || process.env.RAZORPAY_KEY_ID;
    const keySecret = config.keySecret || process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return res.status(503).json({ error: "Razorpay is not configured for this workspace." });
    }

    const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${basicAuth}` },
      body: JSON.stringify({
        amount: Math.round(parsedAmount * 100),
        currency,
        receipt: receipt || `rec_${Date.now()}`,
        notes: { ...notes, tenantId },
      }),
    });
    if (!rzpResponse.ok) {
      return res.status(502).json({ error: "Razorpay could not create a payment order. No payment was recorded." });
    }
    const rzpOrder = await rzpResponse.json();
    return res.json({ success: true, orderId: rzpOrder.id, amount: parsedAmount, currency, keyId, raw: rzpOrder });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create payment order" });
  }
});

// -------------------------------------------------------------
// 4. POST /api/payments/razorpay/verify - Verify Signature & Record Payment
// -------------------------------------------------------------
paymentsRouter.post("/razorpay/verify", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const slug = `system-razorpay-gateway-${tenantId}`;
    const { orderId, paymentId, signature, invoiceId, amount, customerName, method = "UPI" } = req.body;

    if (!orderId || !paymentId) {
      return res.status(400).json({ error: "orderId and paymentId are required" });
    }

    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    let existingContent: any = { transactions: [], config: {} };
    if (page?.content) {
      try {
        existingContent = typeof page.content === "string" ? JSON.parse(page.content) : page.content;
      } catch {
        existingContent = { transactions: [], config: {} };
      }
    }

    const keySecret = existingContent.config?.keySecret || process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret || !signature) {
      return res.status(503).json({ error: "Razorpay signature verification is unavailable for this workspace." });
    }
    const generated = crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
    const isVerified = generated.length === signature.length && crypto.timingSafeEqual(Buffer.from(generated), Buffer.from(signature));
    if (!isVerified) {
      return res.status(400).json({ error: "Invalid payment cryptographic signature" });
    }

    const parsedAmount = parseFloat(amount) || 0;
    const invoiceNo = `INV-RZP-${Date.now().toString().slice(-6)}`;

    // Create or update Sale in MySQL
    let sale;
    if (invoiceId) {
      sale = await prisma.sale.findFirst({
        where: { id: invoiceId, tenantId },
      });
      if (sale) {
        sale = await prisma.sale.update({
          where: { id: sale.id },
          data: {
            paymentStatus: "paid",
            paidAmount: sale.total,
            payments: {
              create: {
                amount: sale.total,
                method: `Razorpay (${method})`,
                referenceNo: paymentId,
              },
            },
          },
        });
      }
    }

    if (!sale) {
      sale = await prisma.sale.create({
        data: {
          tenantId,
          invoiceNo,
          type: "gateway_payment",
          customerName: customerName || "Online Customer",
          subtotal: parsedAmount,
          total: parsedAmount,
          paidAmount: parsedAmount,
          paymentStatus: "paid",
          paymentMethod: `Razorpay (${method})`,
          notes: `Payment captured via Razorpay. Order ID: ${orderId}, Payment ID: ${paymentId}`,
          payments: {
            create: {
              amount: parsedAmount,
              method: `Razorpay (${method})`,
              referenceNo: paymentId,
            },
          },
        },
      });
    }

    // Auto-post to Double-Entry General Ledger
    await autoPostSaleToLedger({
      tenantId,
      saleId: sale.id,
      invoiceNo: sale.invoiceNo,
      total: Number(sale.total),
      subtotal: Number(sale.subtotal),
      totalTax: Number(sale.totalTax || 0),
      paymentMode: `Razorpay (${method})`,
      isPaid: true,
    }).catch((e) => console.error("Auto post gateway payment to ledger error:", e));

    const txnRecord = {
      id: `txn-${Date.now()}`,
      paymentId,
      orderId,
      customer: customerName || sale.customerName || "Online Customer",
      amount: parsedAmount || Number(sale.total),
      currency: "INR",
      status: "captured",
      method,
      timestamp: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
      invoiceRef: sale.invoiceNo,
    };

    const updatedTxns = [txnRecord, ...(existingContent.transactions || [])];
    await prisma.cmsPage.upsert({
      where: { slug },
      update: {
        content: {
          ...existingContent,
          transactions: updatedTxns,
        },
      },
      create: {
        slug,
        title: "Razorpay Gateway Config",
        content: { transactions: updatedTxns, config: existingContent.config || {} },
        published: true,
      },
    });

    broadcastToTenant(tenantId, "payment:captured", txnRecord);

    return res.json({
      success: true,
      message: "Payment successfully verified and auto-posted to General Ledger!",
      transaction: txnRecord,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to verify payment" });
  }
});

// -------------------------------------------------------------
// 5. POST /api/payments/razorpay/test-payment - Sandbox Test Payment Runner
// -------------------------------------------------------------
paymentsRouter.post("/razorpay/test-payment", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const slug = `system-razorpay-gateway-${tenantId}`;
    const { amount, description = "Test Payment", method = "UPI", customerName = "Sandbox Customer" } = req.body;

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ error: "Please enter a valid payment amount greater than 0" });
    }

    const payId = `pay_${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const ordId = `order_${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const invoiceNo = `INV-RZP-${Date.now().toString().slice(-6)}`;

    // Create real Sale in MySQL
    const sale = await prisma.sale.create({
      data: {
        tenantId,
        invoiceNo,
        type: "gateway_payment",
        customerName,
        subtotal: parsedAmount,
        total: parsedAmount,
        paidAmount: parsedAmount,
        paymentStatus: "paid",
        paymentMethod: `Razorpay (${method})`,
        notes: `Sandbox verification test payment: ${description}. Ref: ${payId}`,
        payments: {
          create: {
            amount: parsedAmount,
            method: `Razorpay (${method})`,
            referenceNo: payId,
          },
        },
      },
    });

    // Auto-post to Double-Entry General Ledger
    await autoPostSaleToLedger({
      tenantId,
      saleId: sale.id,
      invoiceNo: sale.invoiceNo,
      total: parsedAmount,
      subtotal: parsedAmount,
      totalTax: 0,
      paymentMode: `Razorpay (${method})`,
      isPaid: true,
    }).catch((e) => console.error("Auto post test payment to ledger error:", e));

    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    let existingContent: any = { transactions: [], config: {} };
    if (page?.content) {
      try {
        existingContent = typeof page.content === "string" ? JSON.parse(page.content) : page.content;
      } catch {
        existingContent = { transactions: [], config: {} };
      }
    }

    const newTxn = {
      id: `txn-${Date.now()}`,
      paymentId: payId,
      orderId: ordId,
      customer: customerName,
      amount: parsedAmount,
      currency: "INR",
      status: "captured",
      method,
      timestamp: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
      invoiceRef: invoiceNo,
    };

    const updatedTransactions = [newTxn, ...(existingContent.transactions || [])];

    await prisma.cmsPage.upsert({
      where: { slug },
      update: {
        content: {
          ...existingContent,
          transactions: updatedTransactions,
        },
      },
      create: {
        slug,
        title: "Razorpay Gateway Config",
        content: {
          transactions: updatedTransactions,
          config: existingContent.config || {},
        },
        published: true,
      },
    });

    // Broadcast real-time event to connected UI clients
    broadcastToTenant(tenantId, "payment:captured", newTxn);

    return res.status(201).json({
      success: true,
      message: `Test payment of ₹${parsedAmount} captured and auto-posted to General Ledger!`,
      transaction: newTxn,
      saleId: sale.id,
      invoiceNo,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to execute sandbox test payment" });
  }
});

// -------------------------------------------------------------
// 6. GET /api/payments/razorpay/transactions - List transactions & metrics
// -------------------------------------------------------------
paymentsRouter.get("/razorpay/transactions", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const slug = `system-razorpay-gateway-${tenantId}`;

    const relationalTransactions = await prisma.paymentGatewayTransaction.findMany({
      where: { tenantId, provider: "razorpay" },
      include: { sale: { select: { invoiceNo: true, customerName: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    if (relationalTransactions.length) {
      const transactions = relationalTransactions.map((transaction) => ({
        id: transaction.id,
        paymentId: transaction.providerPaymentId || "",
        orderId: transaction.providerOrderId,
        customer: transaction.sale?.customerName || "Customer",
        amount: Number(transaction.amount),
        currency: transaction.currency,
        status: transaction.status,
        method: transaction.method || "Razorpay",
        timestamp: transaction.verifiedAt?.toISOString() || transaction.createdAt.toISOString(),
        invoiceRef: transaction.sale?.invoiceNo || "",
      }));
      return res.json({
        transactions,
        metrics: {
          total: transactions.reduce((sum, transaction) => sum + (transaction.status === "captured" ? transaction.amount : 0), 0),
          count: transactions.filter((transaction) => transaction.status === "captured").length,
          failed: transactions.filter((transaction) => transaction.status === "failed").length,
        },
      });
    }

    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    let content: any = { transactions: [], config: {} };
    if (page?.content) {
      try {
        content = typeof page.content === "string" ? JSON.parse(page.content) : page.content;
      } catch {
        content = { transactions: [], config: {} };
      }
    }

    const txns: any[] = content.transactions || [];

    // Also query recent real Sale payments for this tenant with Razorpay method
    const dbPayments = await prisma.salePayment.findMany({
      where: {
        sale: { tenantId },
        method: { contains: "Razorpay" },
      },
      include: {
        sale: true,
      },
      orderBy: { paidAt: "desc" },
      take: 20,
    });

    // Combine any payments from database not already in transactions array
    const existingPaymentIds = new Set(txns.map((t) => t.paymentId));
    for (const dp of dbPayments as any[]) {
      if (dp.referenceNo && !existingPaymentIds.has(dp.referenceNo)) {
        txns.push({
          id: dp.id,
          paymentId: dp.referenceNo,
          orderId: `order_${dp.sale?.invoiceNo || dp.id}`,
          customer: dp.sale?.customerName || "Customer",
          amount: Number(dp.amount),
          currency: "INR",
          status: "captured",
          method: dp.method,
          timestamp: dp.paidAt ? new Date(dp.paidAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "",
          invoiceRef: dp.sale?.invoiceNo || "",
        });
      }
    }

    const metrics = {
      total: txns.reduce((s, t) => s + (t.status === "captured" ? Number(t.amount || 0) : 0), 0),
      count: txns.filter((t) => t.status === "captured").length,
      failed: txns.filter((t) => t.status === "failed").length,
    };

    return res.json({
      transactions: txns,
      metrics,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch transactions" });
  }
});

// Mounted before the JSON parser in index.ts, preserving the signed bytes.
export async function razorpayWebhookHandler(req: Request, res: Response) {
  try {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
    if (!raw.length) return res.status(400).json({ error: "A raw webhook body is required." });
    const body = JSON.parse(raw.toString("utf8"));
    const payment = body?.payload?.payment?.entity;
    const order = body?.payload?.order?.entity;
    const tenantId = payment?.notes?.tenantId || order?.notes?.tenantId;
    const signature = req.headers["x-razorpay-signature"];
    if (typeof tenantId !== "string" || !tenantId || typeof signature !== "string") {
      return res.status(400).json({ error: "Webhook is missing workspace routing or signature data." });
    }
    const page = await prisma.cmsPage.findUnique({ where: { slug: `system-razorpay-gateway-${tenantId}` } });
    const config: any = (page?.content as any)?.config || {};
    const secret = config.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return res.status(503).json({ error: "Webhook signing is not configured for this workspace." });
    const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
    const signatureOk = expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    if (!signatureOk) return res.status(400).json({ error: "Invalid webhook signature." });

    const deliveryKey = crypto.createHash("sha256").update(raw).digest("hex");
    const existing = await prisma.paymentWebhookEvent.findUnique({ where: { deliveryKey } });
    if (existing) return res.json({ status: "duplicate" });
    await prisma.$transaction(async (tx) => {
      await tx.paymentWebhookEvent.create({ data: { tenantId, provider: "razorpay", deliveryKey, eventType: body.event || "unknown", signatureOk: true, payload: body } });
      if (payment?.order_id) {
        const captured = body.event === "payment.captured";
        await tx.paymentGatewayTransaction.upsert({
          where: { tenantId_provider_providerOrderId: { tenantId, provider: "razorpay", providerOrderId: payment.order_id } },
          create: { tenantId, provider: "razorpay", providerOrderId: payment.order_id, providerPaymentId: payment.id || null, amount: Number(payment.amount || 0) / 100, currency: payment.currency || "INR", status: captured ? "captured" : body.event || "received", method: payment.method || null, verifiedAt: captured ? new Date() : null, payload: payment },
          update: { providerPaymentId: payment.id || undefined, status: captured ? "captured" : body.event || "received", method: payment.method || null, verifiedAt: captured ? new Date() : undefined, payload: payment },
        });
      }
    });
    return res.json({ status: "processed" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Webhook processing error" });
  }
}
