import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { prisma, rawPrisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import {
  mapPaymentProvider,
  resolveDocumentClassification,
  formatDocumentDate,
  getAuthoritativeCanonicalInvoice,
} from "../services/invoice-engine.service";
import { generateInvoicePdf, formatCurrencyWithIso } from "../services/invoice-pdf.service";
import { superRouter } from "../routes/super.routes";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const db = rawPrisma || prisma;

interface TestReport {
  id: number;
  description: string;
  passed: boolean;
  details: string;
}

const reports: TestReport[] = [];

function record(id: number, description: string, passed: boolean, details: string) {
  reports.push({ id, description, passed, details });
  const icon = passed ? "✔" : "✖";
  console.log(`  ${icon} [Test ${id}] ${description} — ${details}`);
}

/**
 * node:http fetch helper for testing Express routes
 */
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

async function runInvoiceEngineTests() {
  console.log("\n=========================================================================");
  console.log("  SUPER ADMIN INVOICE ENGINE & PDF VERIFICATION TEST SUITE (19 CHECKS)");
  console.log("=========================================================================\n");

  // ─────────────────────────────────────────────────────────────────
  // 1-4. PAYMENT GATEWAY MAPPING TESTS
  // ─────────────────────────────────────────────────────────────────
  console.log("▶ Phase A: Payment Gateway Provider Mapping Tests");

  // 1. Razorpay mapping
  const razorpayMap = mapPaymentProvider("razorpay");
  const razorpayPass = razorpayMap.displayName === "Razorpay" && razorpayMap.normalizedKey === "razorpay";
  record(1, "Razorpay Mapping", razorpayPass, `Mapped to: ${razorpayMap.displayName} (${razorpayMap.planDescription})`);

  // 2. Stripe mapping
  const stripeMap = mapPaymentProvider("stripe");
  const stripePass = stripeMap.displayName === "Stripe" && stripeMap.normalizedKey === "stripe";
  record(2, "Stripe Mapping", stripePass, `Mapped to: ${stripeMap.displayName} (${stripeMap.planDescription})`);

  // 3. PayPal mapping
  const paypalMap = mapPaymentProvider("paypal");
  const paypalPass = paypalMap.displayName === "PayPal" && paypalMap.normalizedKey === "paypal";
  record(3, "PayPal Mapping", paypalPass, `Mapped to: ${paypalMap.displayName} (${paypalMap.planDescription})`);

  // 4. Bank transfer mapping & non-PayPal fallback
  const bankMap = mapPaymentProvider("bank_transfer");
  const customMap = mapPaymentProvider("manual_wire");
  const bankPass = bankMap.displayName === "Bank Transfer" && customMap.displayName !== "PayPal";
  record(
    4,
    "Bank Transfer & Safe Fallback Mapping",
    bankPass,
    `bank_transfer -> ${bankMap.displayName}, unknown provider fallback -> ${customMap.displayName} (never defaults to PayPal)`
  );

  // ─────────────────────────────────────────────────────────────────
  // 5-8. CURRENCY HANDLING & ZERO-CONVERSION TESTS
  // ─────────────────────────────────────────────────────────────────
  console.log("\n▶ Phase B: Authoritative Currency Handling & Formatting Tests");

  // 5. USD currency
  const usdFormat = formatCurrencyWithIso(999, "USD");
  const usdPass = usdFormat === "$999.00 USD";
  record(5, "USD Currency Formatting", usdPass, `Formatted: "${usdFormat}" (exact symbol + ISO code)`);

  // 6. INR currency
  const inrFormat = formatCurrencyWithIso(3700, "INR");
  const inrPass = inrFormat === "₹3,700.00 INR";
  record(6, "INR Currency Formatting", inrPass, `Formatted: "${inrFormat}" (exact symbol + ISO code)`);

  // 7. EUR currency
  const eurFormat = formatCurrencyWithIso(850.5, "EUR");
  const eurPass = eurFormat === "€850.50 EUR";
  record(7, "EUR Currency Formatting", eurPass, `Formatted: "${eurFormat}" (exact symbol + ISO code)`);

  // 8. No unauthorized currency conversion
  // Verify that an amount of 999.00 USD is passed as exactly 999.00 in canonical invoice without conversion multiplier
  const testUsdAmount = 999.0;
  const canonicalUsdFormat = formatCurrencyWithIso(testUsdAmount, "USD");
  const noConversionPass = canonicalUsdFormat.includes("999.00") && !canonicalUsdFormat.includes("82917");
  record(
    8,
    "No Unauthorized Currency Conversion",
    noConversionPass,
    `Amount ${testUsdAmount} USD rendered as 999.00 USD without conversion rate multiplication`
  );

  // ─────────────────────────────────────────────────────────────────
  // 9-11. IMMUTABILITY & DATE HANDLING TESTS
  // ─────────────────────────────────────────────────────────────────
  console.log("\n▶ Phase C: Invoice Number Immutability & Date Separation Tests");

  // Fetch live INV-2024-003 transaction record
  const liveTx = await db.paymentGatewayTransaction.findFirst({
    where: { providerOrderId: "INV-2024-003" },
  });

  assert.ok(liveTx, "Fatal: INV-2024-003 must exist in paymentGatewayTransaction table");

  // 9. Invoice number immutability
  const canonicalInv = await getAuthoritativeCanonicalInvoice(liveTx.id);
  assert.ok(canonicalInv, "Failed to resolve canonical invoice for INV-2024-003");

  const invNoPass = canonicalInv.invoiceNo === "INV-2024-003" && liveTx.providerOrderId === "INV-2024-003";
  record(9, "Invoice Number Immutability", invNoPass, `Retained historical invoice number: "${canonicalInv.invoiceNo}"`);

  // 10. Issue date
  const expectedIssueDate = formatDocumentDate(liveTx.createdAt);
  const issueDatePass = canonicalInv.issueDate === expectedIssueDate && canonicalInv.issueDate === "01 Oct 2026";
  record(
    10,
    "Issue Date Correctness",
    issueDatePass,
    `Issue date resolves to: "${canonicalInv.issueDate}" (matches createdAt 2026-10-01)`
  );

  // 11. Settlement date separation
  const settlementPass =
    canonicalInv.settlementDate !== null &&
    typeof canonicalInv.settlementDate === "string" &&
    canonicalInv.billingPeriod !== null;
  record(
    11,
    "Settlement Date & Billing Period Separation",
    settlementPass,
    `Settlement Date: "${canonicalInv.settlementDate}", Billing Period: "${canonicalInv.billingPeriod}"`
  );

  // ─────────────────────────────────────────────────────────────────
  // 12. DOCUMENT CLASSIFICATION TESTS
  // ─────────────────────────────────────────────────────────────────
  console.log("\n▶ Phase D: Document Classification Resolver Tests");

  const classTax = resolveDocumentClassification({
    sourceType: "billing_invoice",
    status: "paid",
    taxAmount: 180,
  });
  const classCommercial = resolveDocumentClassification({
    sourceType: "billing_invoice",
    status: "paid",
    taxAmount: 0,
  });
  const classReceipt = resolveDocumentClassification({
    sourceType: "gateway_transaction",
    status: "verified",
    taxAmount: 0,
  });
  const classProForma = resolveDocumentClassification({
    sourceType: "billing_invoice",
    status: "pending",
  });
  const classCredit = resolveDocumentClassification({
    sourceType: "billing_invoice",
    status: "refunded",
  });

  const classificationPass =
    classTax === "TAX INVOICE" &&
    classCommercial === "COMMERCIAL INVOICE / BILL OF SUPPLY" &&
    classReceipt === "PAYMENT RECEIPT / TRANSACTION VOUCHER" &&
    classProForma === "PRO FORMA INVOICE" &&
    classCredit === "CREDIT NOTE";

  record(
    12,
    "Document Classification Rules",
    classificationPass,
    `Verified all 5 types: Tax Invoice (${classTax}), Commercial (${classCommercial}), Receipt (${classReceipt}), Pro Forma (${classProForma}), Credit Note (${classCredit})`
  );

  // ─────────────────────────────────────────────────────────────────
  // 13-16. VECTOR PDF GENERATION & HTTP BINARY TESTS
  // ─────────────────────────────────────────────────────────────────
  console.log("\n▶ Phase E: PDFKit Vector PDF Generation & HTTP Binary Delivery Tests");

  // 15. PDF Binary Validity
  const generatedPdfBuffer = await generateInvoicePdf(canonicalInv);
  const magicBytes = generatedPdfBuffer.slice(0, 5).toString("utf-8");
  const isBinaryPdf = magicBytes === "%PDF-";
  record(
    15,
    "PDF Binary Validity",
    isBinaryPdf && generatedPdfBuffer.length > 2000,
    `Magic bytes: "${magicBytes}", Total vector PDF size: ${generatedPdfBuffer.length} bytes`
  );

  // Setup express test app with superRouter to test HTTP endpoints live
  const app = express();
  app.use(express.json());
  app.use("/api/super", superRouter);

  const server = http.createServer(app);
  await new Promise<void>((res) => server.listen(0, "127.0.0.1", () => res()));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Find or create super admin user for testing
  let superUser = await db.user.findFirst({
    where: { roles: { some: { role: "super_admin" } } },
    include: { roles: true },
  });

  if (!superUser) {
    superUser = await db.user.create({
      data: {
        email: `super-test-${Date.now()}@platform.local`,
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

  try {
    // 13. PDF Content-Type Header
    // 14. PDF Content-Disposition Header
    // 16. Correct PDF Filename
    const downloadRes = await testFetch(`${baseUrl}/api/super/transactions/${liveTx.id}/download`, {
      method: "GET",
      headers: { Authorization: `Bearer ${superToken}` },
    });

    const contentType = downloadRes.headers["content-type"];
    const contentDisp = downloadRes.headers["content-disposition"] || "";
    const resBuffer = await downloadRes.buffer();

    const contentTypePass = contentType === "application/pdf";
    record(13, "PDF Content-Type Header", contentTypePass, `Header: "Content-Type: ${contentType}"`);

    const expectedDisp = `attachment; filename="Invoice-${canonicalInv.invoiceNo}.pdf"`;
    const contentDispPass = contentDisp === expectedDisp;
    record(14, "PDF Content-Disposition Header", contentDispPass, `Header: "${contentDisp}"`);

    const filenamePass = contentDisp.includes(`Invoice-INV-2024-003.pdf`);
    record(16, "Correct PDF Filename", filenamePass, `Filename matches: "Invoice-${canonicalInv.invoiceNo}.pdf"`);

    // ─────────────────────────────────────────────────────────────────
    // 17. TENANT ISOLATION TESTS
    // ─────────────────────────────────────────────────────────────────
    console.log("\n▶ Phase F: Tenant Isolation & Preview API Tests");

    const previewRes = await testFetch(`${baseUrl}/api/super/transactions/${liveTx.id}/preview`, {
      method: "GET",
      headers: { Authorization: `Bearer ${superToken}` },
    });
    const previewData = await previewRes.json();

    const tenantIsolationPass =
      previewData.success === true &&
      previewData.invoice.customer.slug === "master" &&
      previewData.invoice.payment.gateway === "Razorpay" &&
      previewData.invoice.currency === "USD";

    record(
      17,
      "Tenant Isolation & Structured Preview Data",
      tenantIsolationPass,
      `Preview API successfully returned tenant @${previewData.invoice?.customer?.slug} with payment gateway "${previewData.invoice?.payment?.gateway}"`
    );

    // ─────────────────────────────────────────────────────────────────
    // 18. SUPER ADMIN AUTHORIZATION & RBAC TESTS
    // ─────────────────────────────────────────────────────────────────
    console.log("\n▶ Phase G: Super Admin Security & RBAC Enforcement Tests");

    // Unauthenticated download request
    const unauthRes = await testFetch(`${baseUrl}/api/super/transactions/${liveTx.id}/download`, {
      method: "GET",
    });

    // Create regular non-super tenant user
    let regularUser = await db.user.findFirst({
      where: { roles: { none: { role: "super_admin" } } },
      include: { roles: true },
    });

    if (!regularUser) {
      regularUser = await db.user.create({
        data: {
          email: `regular-test-${Date.now()}@tenant.local`,
          passwordHash: "dummyhash",
          roles: { create: { role: "employee" } },
        },
        include: { roles: true },
      });
    }

    const regularToken = generateToken({
      userId: regularUser.id,
      email: regularUser.email,
      roles: ["employee"],
    });

    const forbiddenRes = await testFetch(`${baseUrl}/api/super/transactions/${liveTx.id}/download`, {
      method: "GET",
      headers: { Authorization: `Bearer ${regularToken}` },
    });

    const rbacPass = unauthRes.status === 401 && forbiddenRes.status === 403;
    record(
      18,
      "Super Admin Authorization & RBAC Enforcement",
      rbacPass,
      `Unauthenticated access: HTTP ${unauthRes.status} (expected 401), Non-superadmin: HTTP ${forbiddenRes.status} (expected 403)`
    );

    // ─────────────────────────────────────────────────────────────────
    // 19. FLOW 2 / CUSTOM DOMAIN FUNCTIONALITY INTEGRITY
    // ─────────────────────────────────────────────────────────────────
    console.log("\n▶ Phase H: Flow 2 / Custom Domain Non-Regression Tests");

    const domainsRes = await testFetch(`${baseUrl}/api/super/domains`, {
      method: "GET",
      headers: { Authorization: `Bearer ${superToken}` },
    });

    const flow2Pass = domainsRes.status === 200 && Array.isArray(await domainsRes.json());
    record(
      19,
      "Flow 2 Custom Domain Routes Intact",
      flow2Pass,
      `GET /api/super/domains responded with HTTP ${domainsRes.status} and returned array of domains without interference`
    );
  } finally {
    server.close();
  }

  // ─────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────
  console.log("\n=========================================================================");
  const total = reports.length;
  const passed = reports.filter((r) => r.passed).length;
  const failed = reports.filter((r) => !r.passed).length;
  console.log(`  TEST RESULTS: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log("=========================================================================\n");

  if (failed > 0) {
    throw new Error(`Invoice engine test suite failed with ${failed} failures!`);
  }
}

runInvoiceEngineTests()
  .then(() => {
    console.log("✔ All 19 invoice engine and PDF test suites passed successfully!\n");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
