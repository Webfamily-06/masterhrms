/**
 * QA PROBE — FAIL-CLOSED PAYMENT SECURITY REGRESSION SUITE
 * Validates C1, C2, C3, C4, C4b, C5, C5b, C5c, C6, C7 fail-closed invariants.
 * Strictly uses isolated ephemeral fixtures and deletes all created entities.
 * Historical financial records are NEVER modified.
 * Run: npx tsx server/scripts/qa_payment_security_probe.ts
 */
import http from "node:http";
import crypto from "node:crypto";
import express from "express";
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });
import { prisma, rawPrisma } from "../src/prisma";
import { generateToken } from "../src/lib/jwt";
import { superRouter } from "../src/routes/super.routes";
import { billingRouter, handleRazorpayWebhook } from "../src/routes/billing.routes";

const db: any = rawPrisma || prisma;

async function call(base: string, p: string, method: string, token: string | null, body?: any, headers: any = {}) {
  const res = await fetch(base + p, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: any = null;
  const ct = res.headers.get("content-type") || "";
  data = ct.includes("json") ? await res.json() : `<${ct}>`;
  return { status: res.status, data };
}

async function main() {
  console.log("\n=========================================================================");
  console.log("  FAIL-CLOSED PAYMENT SECURITY REGRESSION PROBE (C1–C5)");
  console.log("=========================================================================\n");

  const app = express();
  app.use(express.json({ limit: "10mb" }));
  app.use("/api/super", superRouter);
  app.use("/api/billing", billingRouter);
  app.post("/api/billing/webhook", handleRazorpayWebhook);

  const server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, r));
  const base = `http://localhost:${(server.address() as any).port}`;

  const stamp = Date.now();
  const mk = async (tag: string) => {
    const t = await db.tenant.create({ data: { name: `QA Probe ${tag} ${stamp}`, slug: `qa-probe-${tag}-${stamp}` } });
    const u = await db.user.create({
      data: {
        email: `qa-${tag}-${stamp}@probe.local`, passwordHash: "x",
        profile: { create: { fullName: `QA ${tag}`, tenantId: t.id } },
        roles: { create: [{ role: "hr_admin", tenantId: t.id }] },
      },
    });
    const sub = await db.tenantSubscription.create({
      data: { tenantId: t.id, status: "trialing", billingCycle: "monthly", billingInterval: "1_month", billingIntervalCount: 1 },
    });
    const token = generateToken({ userId: u.id, email: u.email, tenantId: t.id, roles: ["hr_admin"] });
    return { t, u, sub, token };
  };
  const A = await mk("a");
  const B = await mk("b");

  const inv = (tag: string, extra: any = {}) =>
    db.billingInvoice.create({
      data: {
        tenantId: A.t.id, subscriptionId: A.sub.id, invoiceNo: `QA-${tag}-${stamp}`, amount: 3700, currency: "INR",
        status: "open", periodStart: new Date(), periodEnd: new Date(Date.now() + 2592000000), paymentMethod: "razorpay", ...extra,
      },
    });

  const results: any[] = [];
  const record = (id: string, desc: string, passed: boolean, http: number, details: string) => {
    results.push({ id, desc, passed, http, details });
    const icon = passed ? "✔" : "✖";
    console.log(`  ${icon} [Probe ${id}] ${desc} — HTTP ${http} | ${details}`);
  };

  const status = async (id: string) => (await db.billingInvoice.findUnique({ where: { id } }))?.status;
  const subStatus = async () => (await db.tenantSubscription.findUnique({ where: { id: A.sub.id } }))?.status;

  try {
    // -------------------------------------------------------------------------
    // C1: Razorpay verify with fabricated IDs & no signature must FAIL CLOSED
    // -------------------------------------------------------------------------
    const i1 = await inv("C1");
    const r1 = await call(base, "/api/billing/verify", "POST", A.token, {
      invoiceId: i1.id,
      razorpay_order_id: "order_FAKE",
      razorpay_payment_id: "pay_FAKE",
    });
    const s1 = await status(i1.id);
    const sub1 = await subStatus();
    record(
      "C1",
      "Razorpay /verify without secret/signature fails closed (NOT paid)",
      (r1.status === 503 || r1.status === 400) && s1 === "open" && sub1 === "trialing",
      r1.status,
      `Invoice status: ${s1}, Subscription: ${sub1}`
    );

    // -------------------------------------------------------------------------
    // C1b: Razorpay verify with tampered signature must be rejected (HTTP 400)
    // -------------------------------------------------------------------------
    const prevSecret = process.env.RAZORPAY_KEY_SECRET;
    process.env.RAZORPAY_KEY_SECRET = "temp_probe_secret_key";
    const i1b = await inv("C1B");
    const r1b = await call(base, "/api/billing/verify", "POST", A.token, {
      invoiceId: i1b.id,
      razorpay_order_id: "order_FAKE",
      razorpay_payment_id: "pay_FAKE",
      razorpay_signature: "tampered_crypto_signature_invalid",
    });
    const s1b = await status(i1b.id);
    if (!prevSecret) delete process.env.RAZORPAY_KEY_SECRET;
    else process.env.RAZORPAY_KEY_SECRET = prevSecret;
    record(
      "C1b",
      "Razorpay /verify with tampered signature rejected cryptographically (HTTP 400)",
      r1b.status === 400 && s1b === "open",
      r1b.status,
      `Invoice status: ${s1b}`
    );

    // -------------------------------------------------------------------------
    // C2: PayPal verify with fabricated ID must FAIL CLOSED (HTTP 503, NOT paid)
    // -------------------------------------------------------------------------
    const i2 = await inv("C2", { currency: "USD", amount: 49, paymentMethod: "paypal" });
    const r2 = await call(base, "/api/billing/verify", "POST", A.token, {
      invoiceId: i2.id,
      provider: "paypal",
      paypal_order_id: "PP-PAY-FAKE0001",
    });
    const s2 = await status(i2.id);
    record(
      "C2",
      "PayPal /verify fails closed without server capture API (HTTP 503, NOT paid)",
      r2.status === 503 && s2 === "open",
      r2.status,
      `Invoice status: ${s2}`
    );

    // -------------------------------------------------------------------------
    // C3: Stripe verify with fabricated intent must FAIL CLOSED (HTTP 503, NOT paid)
    // -------------------------------------------------------------------------
    const i3 = await inv("C3", { currency: "USD", amount: 99, paymentMethod: "stripe" });
    const r3 = await call(base, "/api/billing/verify", "POST", A.token, {
      invoiceId: i3.id,
      provider: "stripe",
      payment_intent_id: "pi_FAKE",
    });
    const s3 = await status(i3.id);
    record(
      "C3",
      "Stripe /verify fails closed without server Intent API (HTTP 503, NOT paid)",
      r3.status === 503 && s3 === "open",
      r3.status,
      `Invoice status: ${s3}`
    );

    // -------------------------------------------------------------------------
    // C4: Unsigned webhook must be rejected (HTTP 400 or 503, NOT paid)
    // -------------------------------------------------------------------------
    const i4 = await inv("C4", { gatewayOrderId: `order_c4_${stamp}` });
    const r4 = await call(base, "/api/billing/webhook", "POST", null, {
      id: `evt_c4_${stamp}`,
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_FORGED", order_id: `order_c4_${stamp}`, amount: 370000, currency: "INR" } } },
    });
    const s4 = await status(i4.id);
    record(
      "C4",
      "Unsigned webhook rejected (HTTP 400 or 503, NOT paid)",
      (r4.status === 400 || r4.status === 503) && s4 === "open",
      r4.status,
      `Invoice status: ${s4}`
    );

    // -------------------------------------------------------------------------
    // C4b: Signed webhook with amount mismatch (1 paisa vs 3700) rejected (HTTP 422)
    // -------------------------------------------------------------------------
    const prevWhSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const testWhSecret = "wh_probe_secret_key_123";
    process.env.RAZORPAY_WEBHOOK_SECRET = testWhSecret;

    const i4b = await inv("C4B", { gatewayOrderId: `order_c4b_${stamp}`, amount: 3700, currency: "INR" });
    const whBody = JSON.stringify({
      id: `evt_c4b_${stamp}`,
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_MISMATCH", order_id: `order_c4b_${stamp}`, amount: 1, currency: "INR" } } }, // 1 paisa instead of 370000
    });
    const validWhSig = crypto.createHmac("sha256", testWhSecret).update(whBody).digest("hex");

    const r4b = await fetch(`${base}/api/billing/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": validWhSig,
      },
      body: whBody,
    });
    const s4b = await status(i4b.id);
    if (!prevWhSecret) delete process.env.RAZORPAY_WEBHOOK_SECRET;
    else process.env.RAZORPAY_WEBHOOK_SECRET = prevWhSecret;

    record(
      "C4b",
      "Signed webhook with amount mismatch rejected (HTTP 422, NOT paid)",
      r4b.status === 422 && s4b === "open",
      r4b.status,
      `Invoice status: ${s4b}`
    );

    // -------------------------------------------------------------------------
    // C5: Offline submit with amount = 1 when plan price = 399 rejected (HTTP 400)
    // -------------------------------------------------------------------------
    const plan = await db.subscriptionPlan.findFirst({ where: { priceMonthly: { gt: 0 } } });
    const r5 = await call(base, "/api/billing/submit-offline-payment", "POST", A.token, {
      planId: plan?.id,
      amount: 1, // Tampered client amount
      referenceNo: `UTR-QA-${stamp}`,
      receiptUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    });
    record(
      "C5",
      "Offline submission with client-tampered amount rejected (HTTP 400)",
      r5.status === 400 && (r5.data?.code === "PAYMENT_AMOUNT_MISMATCH" || r5.data?.error?.includes("mismatch")),
      r5.status,
      `Error code: ${r5.data?.code || r5.data?.error}`
    );

    // -------------------------------------------------------------------------
    // C5b: Offline submit with missing receipt rejected (HTTP 400)
    // -------------------------------------------------------------------------
    const r5b = await call(base, "/api/billing/submit-offline-payment", "POST", A.token, {
      planId: plan?.id,
      amount: Number(plan?.priceMonthly || 3700),
      referenceNo: `UTR-QA-NO-PROOF-${stamp}`,
      receiptUrl: null, // Missing proof
    });
    record(
      "C5b",
      "Offline submission without proof receipt rejected (HTTP 400)",
      r5b.status === 400,
      r5b.status,
      `Error code: ${r5b.data?.code || r5b.data?.error}`
    );

    // -------------------------------------------------------------------------
    // C5c: Offline submit with Unsplash placeholder receipt rejected (HTTP 400)
    // -------------------------------------------------------------------------
    const r5c = await call(base, "/api/billing/submit-offline-payment", "POST", A.token, {
      planId: plan?.id,
      amount: Number(plan?.priceMonthly || 3700),
      referenceNo: `UTR-QA-UNSPLASH-${stamp}`,
      receiptUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400", // Placeholder
    });
    record(
      "C5c",
      "Offline submission with placeholder URL rejected (HTTP 400)",
      r5c.status === 400 && r5c.data?.code === "PLACEHOLDER_RECEIPT_REJECTED",
      r5c.status,
      `Error code: ${r5c.data?.code || r5c.data?.error}`
    );

    // -------------------------------------------------------------------------
    // C6: Cross-tenant isolation — Tenant B cannot verify Tenant A's invoice
    // -------------------------------------------------------------------------
    const i6 = await inv("C6");
    const r6 = await call(base, "/api/billing/verify", "POST", B.token, {
      invoiceId: i6.id,
      razorpay_order_id: "order_x",
      razorpay_payment_id: "pay_x",
    });
    record(
      "C6",
      "Cross-tenant isolation: Tenant B cannot verify Tenant A invoice (HTTP 404)",
      r6.status === 404,
      r6.status,
      `Response: ${JSON.stringify(r6.data)}`
    );

    // -------------------------------------------------------------------------
    // C7: Tenant admin blocked from Super Admin transaction APIs (HTTP 403)
    // -------------------------------------------------------------------------
    const r7 = await call(base, "/api/super/transactions", "GET", A.token);
    record(
      "C7",
      "Super Admin RBAC: Tenant admin blocked from /api/super/transactions (HTTP 403)",
      r7.status === 403,
      r7.status,
      `Response: ${JSON.stringify(r7.data)}`
    );
  } finally {
    server.close();
    // Complete cleanup of isolated probe data
    for (const X of [A, B]) {
      await db.billingInvoice.deleteMany({ where: { tenantId: X.t.id } });
      await db.paymentGatewayTransaction.deleteMany({ where: { tenantId: X.t.id } });
      await db.tenantSubscription.deleteMany({ where: { tenantId: X.t.id } });
      await db.userRole.deleteMany({ where: { userId: X.u.id } });
      await db.profile.deleteMany({ where: { tenantId: X.t.id } });
      await db.user.deleteMany({ where: { id: X.u.id } });
      await db.tenant.delete({ where: { id: X.t.id } }).catch(() => {});
    }

    // Clean up CMS bank transfers created during probe
    const page = await db.cmsPage.findUnique({ where: { slug: "system-monetization-plans" } });
    if (page?.content) {
      const c = typeof page.content === "string" ? JSON.parse(page.content) : page.content;
      if (Array.isArray(c.bankTransfers)) {
        const before = c.bankTransfers.length;
        c.bankTransfers = c.bankTransfers.filter((b: any) => b.tenant_id !== A.t.id && b.tenant_id !== B.t.id);
        if (c.bankTransfers.length !== before) {
          await db.cmsPage.update({ where: { slug: "system-monetization-plans" }, data: { content: c } });
        }
      }
    }

    const allPassed = results.every((r) => r.passed);
    const passCount = results.filter((r) => r.passed).length;
    console.log("\n=========================================================================");
    console.log(`  PROBE RESULTS: ${passCount}/${results.length} PASSED (${results.length - passCount} FAILED)`);
    console.log("=========================================================================\n");

    if (!allPassed) {
      process.exit(1);
    }
  }
}

main().catch((e) => {
  console.error("Probe error:", e);
  process.exit(1);
});
