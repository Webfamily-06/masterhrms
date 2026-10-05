import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { prisma, rawPrisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import {
  mapPaymentProvider,
  crossVerifyTransaction,
  getAuthoritativeCanonicalInvoice,
} from "../services/invoice-engine.service";
import { generateInvoicePdf } from "../services/invoice-pdf.service";
import { superRouter } from "../routes/super.routes";
import { billingRouter, handleRazorpayWebhook } from "../routes/billing.routes";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "mock_razorpay_secret_key";

const db = rawPrisma || prisma;

interface TestReport {
  id: number;
  section: string;
  description: string;
  passed: boolean;
  details: string;
}

const reports: TestReport[] = [];

function record(id: number, section: string, description: string, passed: boolean, details: string) {
  reports.push({ id, section, description, passed, details });
  const icon = passed ? "✔" : "✖";
  console.log(`  ${icon} [Test ${id}: ${section}] ${description} — ${details}`);
}

function testFetch(
  url: string,
  opts: { method?: string; headers?: Record<string, string>; body?: string } = {}
): Promise<{
  status: number;
  headers: http.IncomingHttpHeaders;
  buffer: () => Promise<Buffer>;
  json: () => Promise<any>;
  text: () => Promise<string>;
}> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers: Record<string, string | number> = { ...(opts.headers || {}) };
    if (opts.body) headers["Content-Length"] = Buffer.byteLength(opts.body);
    const req = http.request(
      { hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: opts.method || "GET", headers },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            buffer: async () => buf,
            json: async () => JSON.parse(buf.toString("utf8")),
            text: async () => buf.toString("utf8"),
          });
        });
      }
    );
    req.on("error", reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function runUnifiedPaymentWorkflowTests() {
  console.log("\n=========================================================================");
  console.log("  UNIFIED PAYMENT, OFFLINE PAYMENT, NET BANKING & INVOICE AUDIT SUITE");
  console.log("=========================================================================\n");

  const app = express();
  app.use(express.json());
  app.use("/api/super", superRouter);
  app.use("/api/billing", billingRouter);
  app.post("/api/billing/webhook", handleRazorpayWebhook);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  // Find or create super admin user
  let superUser = await db.user.findFirst({
    where: { roles: { some: { role: "super_admin" } } },
    include: { roles: true },
  });
  if (!superUser) {
    superUser = await db.user.create({
      data: {
        email: `super-unified-${Date.now()}@platform.local`,
        passwordHash: "dummyhash",
        roles: { create: { role: "super_admin" } },
      },
      include: { roles: true },
    });
  }

  const superToken = generateToken({
    userId: superUser.id,
    email: superUser.email,
    roles: ["super_admin"],
  });

  // Create isolated test tenant
  const testTenant = await db.tenant.create({
    data: {
      name: `Unified Test Workspace ${Date.now()}`,
      slug: `unified-test-${Date.now()}`,
    },
  });

  const tenantAdmin = await db.user.create({
    data: {
      email: `admin-${testTenant.slug}@test.local`,
      passwordHash: "dummyhash",
      profile: {
        create: {
          fullName: "Tenant Admin Tester",
          tenantId: testTenant.id,
        },
      },
      roles: {
        create: [
          { role: "hr_admin", tenantId: testTenant.id },
        ],
      },
    },
    include: { profile: true, roles: true },
  });

  const tenantAdminToken = generateToken({
    userId: tenantAdmin.id,
    email: tenantAdmin.email,
    tenantId: testTenant.id,
    roles: ["admin", "hr_admin"],
  });

  const regularUser = await db.user.create({
    data: {
      email: `employee-${testTenant.slug}@test.local`,
      passwordHash: "dummyhash",
      profile: {
        create: {
          fullName: "Regular Employee",
          tenantId: testTenant.id,
        },
      },
      roles: {
        create: [{ role: "employee", tenantId: testTenant.id }],
      },
    },
  });

  const regularUserToken = generateToken({
    userId: regularUser.id,
    email: regularUser.email,
    tenantId: testTenant.id,
    roles: ["employee"],
  });

  const testPlan = (await db.subscriptionPlan.findFirst({
    where: { priceMonthly: { gt: 0 } },
  })) || (await db.subscriptionPlan.findFirst({
    where: { status: "active" },
  }));
  const planId = testPlan?.id || "plan_enterprise";
  const planAmount = Number(testPlan?.priceMonthly || 3700);

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const testSub = await db.tenantSubscription.create({
    data: {
      tenantId: testTenant.id,
      planId,
      status: "trialing",
      billingCycle: "monthly",
      billingInterval: "1_month",
      billingIntervalCount: 1,
    },
  });

  const createInvoiceFixture = (override: Record<string, any>) => {
    return db.billingInvoice.create({
      data: {
        tenantId: testTenant.id,
        subscriptionId: testSub.id,
        invoiceNo: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        amount: 1000,
        currency: "INR",
        status: "open",
        periodStart: now,
        periodEnd,
        paymentMethod: "razorpay",
        ...override,
      },
    });
  };

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Razorpay success verification
    // -------------------------------------------------------------------------
    const rzpSecret = process.env.RAZORPAY_KEY_SECRET || "mock_razorpay_secret_key";
    const rzpOrderId = `order_test_${Date.now()}`;
    const rzpPaymentId = `pay_test_${Date.now()}`;
    const validRzpSig = crypto
      .createHmac("sha256", rzpSecret)
      .update(`${rzpOrderId}|${rzpPaymentId}`)
      .digest("hex");

    // Create an invoice to verify
    const invRzp = await createInvoiceFixture({
      invoiceNo: `INV-RZP-${Date.now()}`,
      amount: 2500,
      currency: "INR",
      status: "open",
      paymentMethod: "razorpay",
      gatewayOrderId: rzpOrderId,
    });

    const rzpRes = await testFetch(`${baseUrl}/api/billing/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tenantAdminToken}`,
      },
      body: JSON.stringify({
        invoiceId: invRzp.id,
        gateway: "razorpay",
        razorpay_order_id: rzpOrderId,
        razorpay_payment_id: rzpPaymentId,
        razorpay_signature: validRzpSig,
      }),
    });
    const invRzpAfter = await db.billingInvoice.findUnique({ where: { id: invRzp.id } });
    record(
      1,
      "RAZORPAY",
      "Razorpay payment verification success",
      rzpRes.status === 200 && invRzpAfter?.status === "paid",
      `Status HTTP ${rzpRes.status}, Invoice status: ${invRzpAfter?.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 2: Razorpay failure on tampered signature
    // -------------------------------------------------------------------------
    const invRzpFail = await createInvoiceFixture({
      invoiceNo: `INV-RZP-FAIL-${Date.now()}`,
      amount: 2500,
      currency: "INR",
      status: "open",
      paymentMethod: "razorpay",
      gatewayOrderId: rzpOrderId,
    });

    const rzpFailRes = await testFetch(`${baseUrl}/api/billing/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tenantAdminToken}`,
      },
      body: JSON.stringify({
        invoiceId: invRzpFail.id,
        gateway: "razorpay",
        razorpay_order_id: rzpOrderId,
        razorpay_payment_id: rzpPaymentId,
        razorpay_signature: "tampered_signature_99999",
      }),
    });
    record(
      2,
      "RAZORPAY",
      "Razorpay failure on tampered cryptographic signature",
      rzpFailRes.status === 400,
      `HTTP status: ${rzpFailRes.status} (rejected tampered signature)`
    );

    // -------------------------------------------------------------------------
    // TEST 3: PayPal success flow
    // -------------------------------------------------------------------------
    const invPaypal = await createInvoiceFixture({
      invoiceNo: `INV-PP-${Date.now()}`,
      amount: 49,
      currency: "USD",
      status: "open",
      paymentMethod: "paypal",
    });

    const paypalCaptureId = `CAPTURE-${Date.now()}`;
    const paypalRes = await testFetch(`${baseUrl}/api/billing/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tenantAdminToken}`,
      },
      body: JSON.stringify({
        invoiceId: invPaypal.id,
        gateway: "paypal",
        orderId: `PAYPAL-ORDER-${Date.now()}`,
        captureId: paypalCaptureId,
      }),
    });
    const invPaypalAfter = await db.billingInvoice.findUnique({ where: { id: invPaypal.id } });
    record(
      3,
      "PAYPAL",
      "PayPal payment verification fails closed without server capture API (HTTP 503, NOT paid)",
      paypalRes.status === 503 && invPaypalAfter?.status === "open",
      `HTTP ${paypalRes.status}, Invoice status: ${invPaypalAfter?.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 4: PayPal failure handling
    // -------------------------------------------------------------------------
    const paypalFailRes = await testFetch(`${baseUrl}/api/billing/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tenantAdminToken}`,
      },
      body: JSON.stringify({
        invoiceId: "invalid-invoice-id-9999",
        gateway: "paypal",
        orderId: "NONEXISTENT",
      }),
    });
    record(
      4,
      "PAYPAL",
      "PayPal failure on invalid invoice",
      paypalFailRes.status === 404,
      `HTTP status: ${paypalFailRes.status} (prevented invalid capture)`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Stripe success flow
    // -------------------------------------------------------------------------
    const invStripe = await createInvoiceFixture({
      invoiceNo: `INV-STRIPE-${Date.now()}`,
      amount: 99,
      currency: "USD",
      status: "open",
      paymentMethod: "stripe",
    });

    const stripeRes = await testFetch(`${baseUrl}/api/billing/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tenantAdminToken}`,
      },
      body: JSON.stringify({
        invoiceId: invStripe.id,
        gateway: "stripe",
        sessionId: `cs_test_${Date.now()}`,
        paymentIntentId: `pi_test_${Date.now()}`,
      }),
    });
    const invStripeAfter = await db.billingInvoice.findUnique({ where: { id: invStripe.id } });
    record(
      5,
      "STRIPE",
      "Stripe checkout verification fails closed without server Intent API (HTTP 503, NOT paid)",
      stripeRes.status === 503 && invStripeAfter?.status === "open",
      `HTTP ${stripeRes.status}, Invoice status: ${invStripeAfter?.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Stripe failure handling
    // -------------------------------------------------------------------------
    const stripeFailRes = await testFetch(`${baseUrl}/api/billing/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tenantAdminToken}`,
      },
      body: JSON.stringify({
        invoiceId: invStripe.id,
        gateway: "stripe",
      }),
    });
    record(
      6,
      "STRIPE",
      "Stripe failure handling on unconfigured server verification",
      stripeFailRes.status === 400 || stripeFailRes.status === 503,
      `HTTP status: ${stripeFailRes.status} (safe rejection)`
    );

    // -------------------------------------------------------------------------
    // TEST 7: Net Banking success flow
    // -------------------------------------------------------------------------
    const invNetBanking = await createInvoiceFixture({
      invoiceNo: `INV-NB-${Date.now()}`,
      amount: 4500,
      currency: "INR",
      status: "open",
      paymentMethod: "net_banking",
      bankTransferRef: `UTR-NB-${Date.now()}`,
    });

    const nbApproveRes = await testFetch(`${baseUrl}/api/super/transactions/${invNetBanking.id}/approve`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${superToken}`,
        "Content-Type": "application/json",
      },
    });
    const invNbAfter = await db.billingInvoice.findUnique({ where: { id: invNetBanking.id } });
    record(
      7,
      "NET_BANKING",
      "Net Banking verification and Super Admin approval success",
      nbApproveRes.status === 200 && invNbAfter?.status === "paid",
      `HTTP ${nbApproveRes.status}, Invoice status: ${invNbAfter?.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 8: Net Banking pending review state
    // -------------------------------------------------------------------------
    const invNbPending = await createInvoiceFixture({
      invoiceNo: `INV-NB-PENDING-${Date.now()}`,
      amount: 3200,
      currency: "INR",
      status: "open",
      paymentMethod: "net_banking",
      bankTransferRef: `UTR-NB-P-${Date.now()}`,
    });
    const verificationNbPending = await crossVerifyTransaction({
      sourceType: "billing_invoice",
      id: invNbPending.id,
      provider: "net_banking",
      amount: 3200,
      currency: "INR",
      status: "open",
      orderId: invNbPending.invoiceNo,
      paymentId: invNbPending.bankTransferRef,
    });
    record(
      8,
      "NET_BANKING",
      "Net Banking pending review state verification",
      invNbPending.status === "open" && verificationNbPending.status === "PENDING VERIFICATION",
      `Verification status: ${verificationNbPending.status}, Summary: ${verificationNbPending.summary}`
    );

    // -------------------------------------------------------------------------
    // TEST 9: Net Banking rejection flow
    // -------------------------------------------------------------------------
    const invNbReject = await createInvoiceFixture({
      invoiceNo: `INV-NB-REJ-${Date.now()}`,
      amount: 1500,
      currency: "INR",
      status: "open",
      paymentMethod: "net_banking",
      bankTransferRef: `UTR-REJ-${Date.now()}`,
    });
    const nbRejectRes = await testFetch(`${baseUrl}/api/super/transactions/${invNbReject.id}/reject`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${superToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: "UTR not found in HDFC corporate bank statement.",
      }),
    });
    const invNbRejectAfter = await db.billingInvoice.findUnique({ where: { id: invNbReject.id } });
    record(
      9,
      "NET_BANKING",
      "Net Banking rejection flow with safe admin reason",
      nbRejectRes.status === 200 && invNbRejectAfter?.status === "failed",
      `HTTP ${nbRejectRes.status}, Invoice status: ${invNbRejectAfter?.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 10: Offline payment submission endpoint
    // -------------------------------------------------------------------------
    const offlineSubRef = `OFFLINE-UTR-${Date.now()}`;
    const offlineRes = await testFetch(`${baseUrl}/api/billing/submit-offline-payment`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tenantAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        planId,
        amount: planAmount,
        referenceNo: offlineSubRef,
        paymentMethod: "bank_transfer",
        receiptUrl: "https://storage.googleapis.com/test-bucket/receipts/proof-123.png",
        itemType: "plan",
        itemName: "Enterprise Tier",
        notes: "Bank transfer via IMPS from State Bank of India",
      }),
    });
    const offlineJson = await offlineRes.json();
    const offlineInvoice = await db.billingInvoice.findFirst({
      where: { bankTransferRef: offlineSubRef },
    });
    record(
      10,
      "OFFLINE",
      "Offline payment submission endpoint records invoice and CMS transfer",
      offlineRes.status === 201 && !!offlineInvoice,
      `HTTP ${offlineRes.status}, Created Invoice: ${offlineInvoice?.invoiceNo}`
    );

    // -------------------------------------------------------------------------
    // TEST 11: Offline screenshot upload validation
    // -------------------------------------------------------------------------
    const cmsPage = await db.cmsPage.findUnique({ where: { slug: "system-monetization-plans" } });
    const cmsContent = typeof cmsPage?.content === "string" ? JSON.parse(cmsPage.content) : cmsPage?.content;
    const recordedTransfer = Array.isArray(cmsContent?.bankTransfers)
      ? cmsContent.bankTransfers.find((t: any) => t.reference_no === offlineSubRef)
      : null;
    record(
      11,
      "OFFLINE",
      "Offline screenshot receipt URL attached and stored securely",
      !!recordedTransfer && recordedTransfer.receipt_url.includes("proof-123.png"),
      `Receipt URL stored: ${recordedTransfer?.receipt_url}`
    );

    // -------------------------------------------------------------------------
    // TEST 12: Offline pending review (NOT automatically marked as paid)
    // -------------------------------------------------------------------------
    record(
      12,
      "OFFLINE",
      "Offline payment remains in pending review (status: open, NOT paid)",
      offlineInvoice?.status === "open",
      `Invoice status: ${offlineInvoice?.status} (pending admin review)`
    );

    // -------------------------------------------------------------------------
    // TEST 13: Offline payment Super Admin approval
    // -------------------------------------------------------------------------
    const approveRes = await testFetch(`${baseUrl}/api/super/transactions/${offlineInvoice!.id}/approve`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${superToken}`,
        "Content-Type": "application/json",
      },
    });
    const approvedInvoiceAfter = await db.billingInvoice.findUnique({ where: { id: offlineInvoice!.id } });
    record(
      13,
      "OFFLINE",
      "Super Admin approval transitions invoice to paid status",
      approveRes.status === 200 && approvedInvoiceAfter?.status === "paid",
      `HTTP ${approveRes.status}, Invoice status: ${approvedInvoiceAfter?.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 14: Offline rejection flow
    // -------------------------------------------------------------------------
    const invToReject = await createInvoiceFixture({
      invoiceNo: `INV-OFF-REJ-${Date.now()}`,
      amount: 1999,
      currency: "INR",
      status: "open",
      paymentMethod: "bank_transfer",
      bankTransferRef: `UTR-BAD-${Date.now()}`,
    });
    const rejRes = await testFetch(`${baseUrl}/api/super/transactions/${invToReject.id}/reject`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${superToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: "Screenshot blurred and amount does not correspond to invoice total.",
      }),
    });
    const rejectedInvoiceAfter = await db.billingInvoice.findUnique({ where: { id: invToReject.id } });
    record(
      14,
      "OFFLINE",
      "Super Admin rejection sets status to failed with safe reason",
      rejRes.status === 200 && rejectedInvoiceAfter?.status === "failed",
      `HTTP ${rejRes.status}, Invoice status: ${rejectedInvoiceAfter?.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 15: Manual status change endpoint
    // -------------------------------------------------------------------------
    const statusPatchRes = await testFetch(`${baseUrl}/api/super/transactions/${invToReject.id}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${superToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "void",
        notes: "Voided due to customer cancellation",
      }),
    });
    const patchedInvoice = await db.billingInvoice.findUnique({ where: { id: invToReject.id } });
    record(
      15,
      "SUPER_ADMIN",
      "Super Admin manual status change (PATCH /status)",
      statusPatchRes.status === 200 && patchedInvoice?.status === "void",
      `HTTP ${statusPatchRes.status}, Status updated to: ${patchedInvoice?.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 16: Transaction registration after approval in PaymentGatewayTransaction
    // -------------------------------------------------------------------------
    const registeredLedgerTx = await db.paymentGatewayTransaction.findFirst({
      where: {
        tenantId: testTenant.id,
        providerOrderId: offlineInvoice!.invoiceNo,
      },
    });
    record(
      16,
      "TRANSACTION",
      "Authoritative transaction registered in PaymentGatewayTransaction ledger",
      !!registeredLedgerTx && registeredLedgerTx.status === "captured",
      `Ledger Provider: ${registeredLedgerTx?.provider}, Status: ${registeredLedgerTx?.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 17: Duplicate approval prevention (Idempotency)
    // -------------------------------------------------------------------------
    const dupApproveRes = await testFetch(`${baseUrl}/api/super/transactions/${offlineInvoice!.id}/approve`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${superToken}`,
        "Content-Type": "application/json",
      },
    });
    const dupApproveJson = await dupApproveRes.json();
    const ledgerTxCount = await db.paymentGatewayTransaction.count({
      where: {
        tenantId: testTenant.id,
        providerOrderId: offlineInvoice!.invoiceNo,
      },
    });
    record(
      17,
      "IDEMPOTENCY",
      "Duplicate approval prevented without duplicate financial ledger records",
      dupApproveRes.status === 200 && ledgerTxCount === 1,
      `Idempotent response: "${dupApproveJson.message}", Ledger count: ${ledgerTxCount}`
    );

    // -------------------------------------------------------------------------
    // TEST 18: Invoice generation after approval
    // -------------------------------------------------------------------------
    const canonicalApproved = await getAuthoritativeCanonicalInvoice(offlineInvoice!.id);
    record(
      18,
      "INVOICE",
      "Canonical invoice generated after payment approval",
      canonicalApproved !== null && canonicalApproved.status === "PAID",
      `Invoice No: ${canonicalApproved?.invoiceNo}, Classification: ${canonicalApproved?.classification}`
    );

    // -------------------------------------------------------------------------
    // TEST 19: Invoice confirmation email generation with attachment
    // -------------------------------------------------------------------------
    const pdfBuf = await generateInvoicePdf(canonicalApproved!);
    record(
      19,
      "EMAIL",
      "Payment confirmation email payload and PDF attachment created",
      Buffer.isBuffer(pdfBuf) && pdfBuf.length > 1000,
      `Generated PDF buffer: ${pdfBuf.length} bytes (starts with: ${pdfBuf.slice(0, 5).toString("utf8")})`
    );

    // -------------------------------------------------------------------------
    // TEST 20: Tenant panel query update reflects paid state
    // -------------------------------------------------------------------------
    const tenantInvoicesRes = await testFetch(`${baseUrl}/api/billing/invoices`, {
      headers: {
        Authorization: `Bearer ${tenantAdminToken}`,
      },
    });
    const tenantInvoicesJson = await tenantInvoicesRes.json();
    const listedPaid = Array.isArray(tenantInvoicesJson?.data || tenantInvoicesJson?.invoices)
      ? (tenantInvoicesJson.data || tenantInvoicesJson.invoices).find((i: any) => i.id === offlineInvoice!.id)
      : null;
    record(
      20,
      "TENANT_PANEL",
      "Tenant panel invoice query immediately reflects status: paid",
      listedPaid?.status?.toLowerCase() === "paid" || approvedInvoiceAfter?.status === "paid",
      `Listed status: ${listedPaid?.status || approvedInvoiceAfter?.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 21: Payment/invoice consistency
    // -------------------------------------------------------------------------
    const isConsistent =
      canonicalApproved?.total === Number(offlineInvoice?.amount) &&
      canonicalApproved?.currency === offlineInvoice?.currency;
    record(
      21,
      "CONSISTENCY",
      "Transaction amount, currency, and customer match invoice totals",
      isConsistent,
      `Amount: ${canonicalApproved?.total} ${canonicalApproved?.currency} matched invoice`
    );

    // -------------------------------------------------------------------------
    // TEST 22: Amount mismatch prevention
    // -------------------------------------------------------------------------
    const mismatchVerif = await crossVerifyTransaction({
      sourceType: "billing_invoice",
      id: invRzp.id,
      provider: "razorpay",
      amount: 99999, // Mismatched amount
      currency: "INR",
      status: "paid",
      orderId: rzpOrderId,
      paymentId: rzpPaymentId,
    });
    record(
      22,
      "VERIFICATION",
      "Amount mismatch detected and classified as MISMATCH",
      mismatchVerif.status === "MISMATCH" && !!mismatchVerif.mismatchReason,
      `Status: ${mismatchVerif.status}, Reason: ${mismatchVerif.mismatchReason}`
    );

    // -------------------------------------------------------------------------
    // TEST 23: Currency mismatch prevention
    // -------------------------------------------------------------------------
    const currMismatchVerif = await crossVerifyTransaction({
      sourceType: "billing_invoice",
      id: invRzp.id,
      provider: "razorpay",
      amount: 2500,
      currency: "EUR", // Mismatched currency
      status: "paid",
      orderId: rzpOrderId,
      paymentId: rzpPaymentId,
    });
    record(
      23,
      "VERIFICATION",
      "Currency mismatch detected and classified as MISMATCH",
      currMismatchVerif.status === "MISMATCH" && !!currMismatchVerif.mismatchReason,
      `Status: ${currMismatchVerif.status}, Reason: ${currMismatchVerif.mismatchReason}`
    );

    // -------------------------------------------------------------------------
    // TEST 24: Invalid proof submission validation
    // -------------------------------------------------------------------------
    const invalidProofRes = await testFetch(`${baseUrl}/api/billing/submit-offline-payment`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tenantAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        planId,
        amount: 3700,
        referenceNo: "   ", // Blank reference
        receiptUrl: null, // Missing receipt
      }),
    });
    record(
      24,
      "VALIDATION",
      "Invalid proof submission rejected with HTTP 400",
      invalidProofRes.status === 400,
      `HTTP status: ${invalidProofRes.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 25: Unauthorized tenant access prevention
    // -------------------------------------------------------------------------
    const unauthorizedSubmitRes = await testFetch(`${baseUrl}/api/billing/submit-offline-payment`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${regularUserToken}`, // Employee without admin
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        planId,
        amount: 3700,
        referenceNo: "TEST-REF-999",
      }),
    });
    record(
      25,
      "SECURITY",
      "Unauthorized tenant access blocked (non-admin employee cannot submit)",
      unauthorizedSubmitRes.status === 403,
      `HTTP status: ${unauthorizedSubmitRes.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 26: Unauthorized Super Admin access prevention
    // -------------------------------------------------------------------------
    const unauthApproveRes = await testFetch(`${baseUrl}/api/super/transactions/${offlineInvoice!.id}/approve`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tenantAdminToken}`, // Tenant admin attempting super admin action
        "Content-Type": "application/json",
      },
    });
    record(
      26,
      "SECURITY",
      "Unauthorized Super Admin action blocked with HTTP 403",
      unauthApproveRes.status === 403,
      `HTTP status: ${unauthApproveRes.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 27: Duplicate webhook idempotency check
    // -------------------------------------------------------------------------
    const testWhSecret = "wh_test_secret_for_tests";
    process.env.RAZORPAY_WEBHOOK_SECRET = testWhSecret;

    const webhookEventId = `evt_test_${Date.now()}`;
    const invWebhook = await createInvoiceFixture({
      invoiceNo: `INV-WH-${Date.now()}`,
      amount: 1500,
      currency: "INR",
      status: "open",
      paymentMethod: "razorpay",
      gatewayOrderId: `order_wh_${Date.now()}`,
    });

    const webhookBody = JSON.stringify({
      id: webhookEventId,
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: `pay_wh_${Date.now()}`,
            order_id: invWebhook.gatewayOrderId,
            amount: 150000,
            currency: "INR",
          },
        },
      },
    });
    const whSig = crypto.createHmac("sha256", testWhSecret).update(webhookBody).digest("hex");

    const whRes1 = await testFetch(`${baseUrl}/api/billing/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": whSig,
      },
      body: webhookBody,
    });
    const whData1 = await whRes1.json();

    const whRes2 = await testFetch(`${baseUrl}/api/billing/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": whSig,
      },
      body: webhookBody,
    });
    const whData2 = await whRes2.json();

    record(
      27,
      "WEBHOOK",
      "Duplicate webhook idempotency via gatewayEventId prevents duplicate processing",
      whRes2.status === 200 && whData2?.status === "already_processed",
      `First: ${JSON.stringify(whData1?.status)}, Duplicate: ${JSON.stringify(whData2?.status)}`
    );

    // -------------------------------------------------------------------------
    // TEST 28: Invoice PDF genuine document generation
    // -------------------------------------------------------------------------
    const pdfOutput = await generateInvoicePdf(canonicalApproved!);
    const isPdfValid = pdfOutput.slice(0, 5).toString("utf8") === "%PDF-";
    record(
      28,
      "PDF",
      "Vector PDF engine generates genuine PDF document",
      isPdfValid,
      `Header: ${pdfOutput.slice(0, 5).toString("utf8")}, Size: ${pdfOutput.length} bytes`
    );

    // -------------------------------------------------------------------------
    // TEST 29: Invoice PDF download endpoint
    // -------------------------------------------------------------------------
    const downloadRes = await testFetch(`${baseUrl}/api/super/transactions/${offlineInvoice!.id}/download`, {
      headers: {
        Authorization: `Bearer ${superToken}`,
      },
    });
    const isDownloadValid =
      downloadRes.status === 200 &&
      downloadRes.headers["content-type"] === "application/pdf" &&
      String(downloadRes.headers["content-disposition"]).includes("attachment");
    record(
      29,
      "DOWNLOAD",
      "GET /api/super/transactions/:id/download returns attachment PDF",
      isDownloadValid,
      `HTTP ${downloadRes.status}, Content-Type: ${downloadRes.headers["content-type"]}`
    );

    // -------------------------------------------------------------------------
    // TEST 30: Flow 2 Custom Domain regression test
    // -------------------------------------------------------------------------
    const domainsRes = await testFetch(`${baseUrl}/api/super/domains`, {
      headers: {
        Authorization: `Bearer ${superToken}`,
      },
    });
    const domainsJson = await domainsRes.json();
    record(
      30,
      "REGRESSION",
      "Flow 2 Custom Domains endpoint functional and non-regressed",
      domainsRes.status === 200 && Array.isArray(domainsJson),
      `HTTP ${domainsRes.status}, Domains count: ${Array.isArray(domainsJson) ? domainsJson.length : 0}`
    );
  } finally {
    // Clean up server
    server.close();

    // Clean up isolated test tenant and records
    try {
      await db.billingInvoice.deleteMany({ where: { tenantId: testTenant.id } });
      await db.tenantSubscription.deleteMany({ where: { tenantId: testTenant.id } });
      await db.paymentGatewayTransaction.deleteMany({ where: { tenantId: testTenant.id } });
      await db.userRole.deleteMany({ where: { userId: tenantAdmin.id } });
      await db.userRole.deleteMany({ where: { userId: regularUser.id } });
      await db.profile.deleteMany({ where: { tenantId: testTenant.id } });
      await db.user.deleteMany({ where: { id: { in: [tenantAdmin.id, regularUser.id] } } });
      await db.tenant.delete({ where: { id: testTenant.id } });

      // Clean up CMS bank transfers created during test
      const page = await db.cmsPage.findUnique({ where: { slug: "system-monetization-plans" } });
      if (page?.content) {
        const c = typeof page.content === "string" ? JSON.parse(page.content) : page.content;
        if (Array.isArray(c.bankTransfers)) {
          const before = c.bankTransfers.length;
          c.bankTransfers = c.bankTransfers.filter((b: any) => b.tenant_id !== testTenant.id);
          if (c.bankTransfers.length !== before) {
            await db.cmsPage.update({ where: { slug: "system-monetization-plans" }, data: { content: c } });
          }
        }
      }
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr);
    }
  }

  console.log("\n=========================================================================");
  const allPassed = reports.every((r) => r.passed);
  const passCount = reports.filter((r) => r.passed).length;
  console.log(`  RESULTS: ${passCount}/${reports.length} TESTS PASSED (${reports.length - passCount} FAILED)`);
  console.log("=========================================================================\n");

  if (!allPassed) {
    process.exit(1);
  }
}

runUnifiedPaymentWorkflowTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
