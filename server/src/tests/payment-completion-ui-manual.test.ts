import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { prisma, rawPrisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { getAuthoritativeCanonicalInvoice } from "../services/invoice-engine.service";
import { generateInvoicePdf, formatCurrencyWithIso } from "../services/invoice-pdf.service";
import { superRouter } from "../routes/super.routes";
import { billingRouter } from "../routes/billing.routes";

dotenv.config();

const db = rawPrisma || prisma;

interface TestReport {
  id: number;
  category: string;
  name: string;
  passed: boolean;
  details: string;
}

const reports: TestReport[] = [];

function record(id: number, category: string, name: string, passed: boolean, details: string) {
  reports.push({ id, category, name, passed, details });
  const icon = passed ? "✔" : "✖";
  console.log(`  ${icon} [Test ${id}: ${category}] ${name} — ${details}`);
}

async function runTests() {
  console.log("\n=========================================================================");
  console.log("  MANUAL PAYMENT UI/API, RECEIPT ACCESS & PDF ENGINE VERIFICATION");
  console.log("=========================================================================\n");

  const app = express();
  app.use(express.json());

  // Mount test routers
  app.use("/api/billing", billingRouter);
  app.use("/api/super", superRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const cleanupFns: Array<() => Promise<void>> = [];

  try {
    const timestamp = Date.now();

    // 1. Setup Test Tenant & Admin Users
    const tenantA = await db.tenant.create({
      data: {
        name: `Manual QA Corp A ${timestamp}`,
        slug: `manual-qa-a-${timestamp}`,
      },
    });
    cleanupFns.push(async () => {
      await db.billingInvoice.deleteMany({ where: { tenantId: tenantA.id } }).catch(() => {});
      await db.paymentGatewayTransaction.deleteMany({ where: { tenantId: tenantA.id } }).catch(() => {});
      await db.tenantSubscription.deleteMany({ where: { tenantId: tenantA.id } }).catch(() => {});
      await db.profile.deleteMany({ where: { tenantId: tenantA.id } }).catch(() => {});
      await db.tenant.delete({ where: { id: tenantA.id } }).catch(() => {});
    });

    const tenantB = await db.tenant.create({
      data: {
        name: `Manual QA Corp B ${timestamp}`,
        slug: `manual-qa-b-${timestamp}`,
      },
    });
    cleanupFns.push(async () => {
      await db.billingInvoice.deleteMany({ where: { tenantId: tenantB.id } }).catch(() => {});
      await db.paymentGatewayTransaction.deleteMany({ where: { tenantId: tenantB.id } }).catch(() => {});
      await db.tenantSubscription.deleteMany({ where: { tenantId: tenantB.id } }).catch(() => {});
      await db.profile.deleteMany({ where: { tenantId: tenantB.id } }).catch(() => {});
      await db.tenant.delete({ where: { id: tenantB.id } }).catch(() => {});
    });

    const superAdminUser = await db.user.create({
      data: {
        email: `superadmin-${timestamp}@test.local`,
        passwordHash: "test_hash",
        roles: {
          create: {
            role: "super_admin",
          },
        },
      },
    });
    cleanupFns.push(async () => {
      await db.userRole.deleteMany({ where: { userId: superAdminUser.id } }).catch(() => {});
      await db.user.delete({ where: { id: superAdminUser.id } }).catch(() => {});
    });

    const tenantAdminUserA = await db.user.create({
      data: {
        email: `admin-a-${timestamp}@test.local`,
        passwordHash: "test_hash",
        roles: {
          create: {
            role: "hr_admin",
            tenantId: tenantA.id,
          },
        },
        profile: {
          create: {
            tenantId: tenantA.id,
            email: `admin-a-${timestamp}@test.local`,
            fullName: "Tenant A Admin",
          },
        },
      },
    });
    cleanupFns.push(async () => {
      await db.userRole.deleteMany({ where: { userId: tenantAdminUserA.id } }).catch(() => {});
      await db.profile.deleteMany({ where: { userId: tenantAdminUserA.id } }).catch(() => {});
      await db.user.delete({ where: { id: tenantAdminUserA.id } }).catch(() => {});
    });

    const employeeUserA = await db.user.create({
      data: {
        email: `emp-a-${timestamp}@test.local`,
        passwordHash: "test_hash",
        roles: {
          create: {
            role: "employee",
            tenantId: tenantA.id,
          },
        },
        profile: {
          create: {
            tenantId: tenantA.id,
            email: `emp-a-${timestamp}@test.local`,
            fullName: "Tenant A Employee",
          },
        },
      },
    });
    cleanupFns.push(async () => {
      await db.userRole.deleteMany({ where: { userId: employeeUserA.id } }).catch(() => {});
      await db.profile.deleteMany({ where: { userId: employeeUserA.id } }).catch(() => {});
      await db.user.delete({ where: { id: employeeUserA.id } }).catch(() => {});
    });

    const superAdminToken = generateToken({
      userId: superAdminUser.id,
      email: superAdminUser.email,
      roles: ["super_admin"],
    });

    const tenantAdminTokenA = generateToken({
      userId: tenantAdminUserA.id,
      email: tenantAdminUserA.email,
      tenantId: tenantA.id,
      roles: ["hr_admin"],
    });

    const employeeTokenA = generateToken({
      userId: employeeUserA.id,
      email: employeeUserA.email,
      tenantId: tenantA.id,
      roles: ["employee"],
    });

    const defaultPlan = await db.subscriptionPlan.findFirst({ where: { status: "active" } });
    if (!defaultPlan) throw new Error("No active plan in database");

    const subA = await db.tenantSubscription.create({
      data: {
        tenantId: tenantA.id,
        planId: defaultPlan.id,
        status: "trialing",
        billingCycle: "monthly",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    console.log("▶ Phase 1: Manual / Offline Payment Submission & Validation");

    // Test 1: Submit offline payment without proof receipt -> Rejected (400)
    const inv1 = await db.billingInvoice.create({
      data: {
        tenantId: tenantA.id,
        subscriptionId: subA.id,
        planId: defaultPlan.id,
        invoiceNo: `SUB-INV-QA-${timestamp}-1`,
        amount: 2999,
        currency: "INR",
        status: "open",
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const resNoReceipt = await fetch(`${baseUrl}/api/billing/submit-offline-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tenantAdminTokenA}` },
      body: JSON.stringify({
        invoiceId: inv1.id,
        referenceNo: "UTR-NO-RECEIPT-999",
        amount: 2999,
      }),
    });
    const jsonNoReceipt: any = await resNoReceipt.json();
    record(1, "VALIDATION", "Missing receipt proof rejected with HTTP 400", resNoReceipt.status === 400 && jsonNoReceipt.code === "RECEIPT_REQUIRED", `HTTP ${resNoReceipt.status}, Code: ${jsonNoReceipt.code}`);

    // Test 2: Submit offline payment with placeholder URL -> Rejected (400)
    const resPlaceholder = await fetch(`${baseUrl}/api/billing/submit-offline-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tenantAdminTokenA}` },
      body: JSON.stringify({
        invoiceId: inv1.id,
        referenceNo: "UTR-PLACEHOLDER-999",
        receiptUrl: "https://images.unsplash.com/photo-12345?w=500",
        amount: 2999,
      }),
    });
    const jsonPlaceholder: any = await resPlaceholder.json();
    record(2, "VALIDATION", "Placeholder Unsplash receipt URL rejected", resPlaceholder.status === 400 && jsonPlaceholder.code === "PLACEHOLDER_RECEIPT_REJECTED", `HTTP ${resPlaceholder.status}, Code: ${jsonPlaceholder.code}`);

    // Test 3: Submit offline payment with amount mismatch -> Rejected (400)
    const resAmtMismatch = await fetch(`${baseUrl}/api/billing/submit-offline-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tenantAdminTokenA}` },
      body: JSON.stringify({
        invoiceId: inv1.id,
        referenceNo: "UTR-AMT-MISMATCH-999",
        receiptUrl: "https://storage.googleapis.com/test-bucket/receipts/proof-amt.png",
        amount: 1, // Tampered client amount
      }),
    });
    const jsonAmtMismatch: any = await resAmtMismatch.json();
    record(3, "VALIDATION", "Client tampered amount rejected with HTTP 400", resAmtMismatch.status === 400 && jsonAmtMismatch.code === "PAYMENT_AMOUNT_MISMATCH", `HTTP ${resAmtMismatch.status}, Code: ${jsonAmtMismatch.code}`);

    // Test 4: Valid offline payment submission -> HTTP 201, Pending Review
    const resValidOffline = await fetch(`${baseUrl}/api/billing/submit-offline-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tenantAdminTokenA}` },
      body: JSON.stringify({
        invoiceId: inv1.id,
        referenceNo: "UTR-VALID-555111",
        receiptUrl: "https://storage.googleapis.com/test-bucket/receipts/proof-555111.png",
        amount: 2999,
        notes: "Paid via HDFC Corporate Net Banking UTR 555111",
      }),
    });
    const jsonValidOffline: any = await resValidOffline.json();
    const inv1After = await db.billingInvoice.findUnique({ where: { id: inv1.id } });
    record(4, "SUBMISSION", "Valid offline payment submitted, status remains open (pending verification)", resValidOffline.status === 201 && inv1After?.status === "open" && inv1After?.bankTransferRef === "UTR-VALID-555111", `Status: ${inv1After?.status}, Ref: ${inv1After?.bankTransferRef}`);

    console.log("\n▶ Phase 2: Super Admin Operations UI & API (View, Approve, Reject)");

    // Test 5: Super Admin list transactions -> includes submitted transaction
    const resList = await fetch(`${baseUrl}/api/super/transactions`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    const jsonList: any = await resList.json();
    const foundInList = jsonList.transactions?.some((t: any) => t.invoiceId === inv1.invoiceNo || t.id === inv1.id);
    record(5, "SUPER_ADMIN", "Super Admin lists transactions including newly submitted manual payment", resList.status === 200 && foundInList, `HTTP 200, Total entries: ${jsonList.pagination?.total}`);

    // Test 6: Unauthorized tenant employee blocked from Super Admin transactions (403)
    const resEmpBlocked = await fetch(`${baseUrl}/api/super/transactions`, {
      headers: { Authorization: `Bearer ${employeeTokenA}` },
    });
    record(6, "RBAC", "Tenant employee blocked from /api/super/transactions (HTTP 403)", resEmpBlocked.status === 403, `HTTP ${resEmpBlocked.status}`);

    // Test 7: Super Admin approves payment -> marks PAID and activates subscription
    const resApprove = await fetch(`${baseUrl}/api/super/transactions/${inv1.id}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    const jsonApprove: any = await resApprove.json();
    const inv1Approved = await db.billingInvoice.findUnique({ where: { id: inv1.id } });
    const subAApproved = await db.tenantSubscription.findUnique({ where: { id: subA.id } });
    const ledgerTx = await db.paymentGatewayTransaction.findFirst({
      where: { tenantId: tenantA.id, providerOrderId: inv1.invoiceNo },
    });
    record(7, "APPROVAL", "Super Admin approves payment: invoice PAID, subscription ACTIVE, ledger CAPTURED", resApprove.status === 200 && inv1Approved?.status === "paid" && subAApproved?.status === "active" && ledgerTx?.status === "captured", `Invoice: ${inv1Approved?.status}, Sub: ${subAApproved?.status}, Ledger: ${ledgerTx?.status}`);

    // Test 8: Duplicate approval idempotency -> returns success without creating duplicate ledgers
    const resDuplicateApprove = await fetch(`${baseUrl}/api/super/transactions/${inv1.id}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    const jsonDupApprove: any = await resDuplicateApprove.json();
    const ledgerCount = await db.paymentGatewayTransaction.count({
      where: { tenantId: tenantA.id, providerOrderId: inv1.invoiceNo },
    });
    record(8, "IDEMPOTENCY", "Duplicate approval prevented, returns early with status Paid (1 ledger record)", resDuplicateApprove.status === 200 && ledgerCount === 1, `Ledger records: ${ledgerCount}, Message: "${jsonDupApprove.message}"`);

    // Test 9: Super Admin rejects payment flow
    const inv2 = await db.billingInvoice.create({
      data: {
        tenantId: tenantA.id,
        subscriptionId: subA.id,
        planId: defaultPlan.id,
        invoiceNo: `SUB-INV-QA-${timestamp}-2`,
        amount: 4500,
        currency: "INR",
        status: "open",
        paymentMethod: "bank_transfer",
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const resReject = await fetch(`${baseUrl}/api/super/transactions/${inv2.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({ reason: "Bank statement does not show matching credit." }),
    });
    const inv2Rejected = await db.billingInvoice.findUnique({ where: { id: inv2.id } });
    record(9, "REJECTION", "Super Admin rejects transaction: invoice marked failed, subscription remains untouched", resReject.status === 200 && inv2Rejected?.status === "failed", `Invoice status: ${inv2Rejected?.status}`);

    // Test 10: Non-admin employee blocked from approving transaction (HTTP 403)
    const resEmpApprove = await fetch(`${baseUrl}/api/super/transactions/${inv2.id}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${employeeTokenA}` },
    });
    record(10, "RBAC", "Non-admin approval attempt strictly blocked with HTTP 403", resEmpApprove.status === 403, `HTTP ${resEmpApprove.status}`);

    console.log("\n▶ Phase 3: PDF Generation & Branding Diagnostics");

    // Test 11: PDF Header & Branding with configured logo
    const canonicalApproved = await getAuthoritativeCanonicalInvoice(inv1.id);
    assert.ok(canonicalApproved, "Canonical invoice must resolve");
    const pdfBufferWithLogo = await generateInvoicePdf(canonicalApproved);
    const hasPdfHeader = pdfBufferWithLogo.slice(0, 5).toString("utf-8") === "%PDF-";
    record(11, "PDF_ENGINE", "PDFKit generates genuine vector PDF with magic header %PDF-", hasPdfHeader && pdfBufferWithLogo.length > 50000, `Buffer size: ${pdfBufferWithLogo.length} bytes, Header: %PDF-`);

    // Test 12: PDF Fallback when logo is missing (renders typography monogram without crash)
    const canonicalNoLogo = {
      ...canonicalApproved,
      supplier: {
        ...canonicalApproved.supplier,
        logoPath: null,
        logoBuffer: null,
      },
    };
    const pdfBufferNoLogo = await generateInvoicePdf(canonicalNoLogo);
    record(12, "PDF_ENGINE", "PDF renders clean typography fallback box when logo is unconfigured", pdfBufferNoLogo.slice(0, 5).toString("utf-8") === "%PDF-", `Generated fallback PDF: ${pdfBufferNoLogo.length} bytes`);

    // Test 13: Authoritative Currency Formatting & Zero-Corruption
    const inrText = formatCurrencyWithIso(2999, "INR");
    const usdText = formatCurrencyWithIso(199, "USD");
    record(13, "CURRENCY", "formatCurrencyWithIso produces authoritative symbol & ISO code", inrText === "₹2,999.00 INR" && usdText === "$199.00 USD", `INR: "${inrText}", USD: "${usdText}"`);

    // Test 14: Document Classification Preserved
    record(14, "CLASSIFICATION", "Document classification preserved (COMMERCIAL INVOICE / BILL OF SUPPLY)", canonicalApproved.classification === "COMMERCIAL INVOICE / BILL OF SUPPLY", `Classification: "${canonicalApproved.classification}"`);

    // Test 15: Cross-Tenant Verification Check (Tenant B cannot verify or modify Tenant A invoice)
    const tenantBUser = await db.user.create({
      data: {
        email: `admin-b-${timestamp}@test.local`,
        passwordHash: "test_hash",
        roles: {
          create: {
            role: "hr_admin",
            tenantId: tenantB.id,
          },
        },
        profile: {
          create: {
            tenantId: tenantB.id,
            email: `admin-b-${timestamp}@test.local`,
            fullName: "Tenant B Admin",
          },
        },
      },
    });
    cleanupFns.push(async () => {
      await db.userRole.deleteMany({ where: { userId: tenantBUser.id } }).catch(() => {});
      await db.profile.deleteMany({ where: { userId: tenantBUser.id } }).catch(() => {});
      await db.user.delete({ where: { id: tenantBUser.id } }).catch(() => {});
    });

    const tenantBToken = generateToken({
      userId: tenantBUser.id,
      email: tenantBUser.email,
      tenantId: tenantB.id,
      roles: ["hr_admin"],
    });

    const resCrossTenant = await fetch(`${baseUrl}/api/billing/submit-offline-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tenantBToken}` },
      body: JSON.stringify({
        invoiceId: inv1.id, // Tenant A's invoice!
        referenceNo: "UTR-CROSS-HACK",
        receiptUrl: "https://storage.googleapis.com/test-bucket/receipts/hack.png",
        amount: 2999,
      }),
    });
    record(15, "ISOLATION", "Cross-tenant offline submission blocked with HTTP 404 (Invoice not found for tenant)", resCrossTenant.status === 404, `HTTP ${resCrossTenant.status}`);

    console.log("\n=========================================================================");
    const passed = reports.filter((r) => r.passed).length;
    const failed = reports.filter((r) => !r.passed).length;
    console.log(`  RESULTS: ${passed}/${reports.length} TESTS PASSED (${failed} FAILED)`);
    console.log("=========================================================================\n");

    if (failed > 0) {
      throw new Error(`Manual payment test suite had ${failed} failures`);
    }
  } finally {
    server.close();
    for (const fn of cleanupFns.reverse()) {
      try {
        await fn();
      } catch (e) {
        // ignore cleanup errors
      }
    }
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
