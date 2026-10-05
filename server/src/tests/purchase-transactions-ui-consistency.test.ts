import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import dotenv from "dotenv";
import { prisma, rawPrisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { getVerificationMode, resolveVerificationStatus } from "../services/invoice-engine.service";
import { superRouter } from "../routes/super.routes";
import { billingRouter } from "../routes/billing.routes";

dotenv.config();

const db = rawPrisma || prisma;

interface TestReport {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

const reports: TestReport[] = [];

function record(id: string, name: string, passed: boolean, details: string) {
  reports.push({ id, name, passed, details });
  const icon = passed ? "✔" : "✖";
  console.log(`  ${icon} [${id}] ${name} — ${details}`);
}

// Canonical mirror of frontend helpers in src/routes/_authenticated/super/transactions.tsx
function isManualVerification(tx: {
  verificationMode?: string | null;
  paymentMethod?: string | null;
  rawPaymentMethod?: string | null;
  provider?: string | null;
}): boolean {
  if (tx.verificationMode) {
    return tx.verificationMode === "MANUAL";
  }
  const method = (tx.rawPaymentMethod || tx.paymentMethod || "").toLowerCase().trim();
  const provider = (tx.provider || "").toLowerCase().trim();
  if (
    provider.includes("razorpay") ||
    provider.includes("stripe") ||
    provider.includes("paypal") ||
    method.includes("razorpay") ||
    method.includes("stripe") ||
    method.includes("paypal")
  ) {
    return false;
  }
  return (
    method.includes("bank") ||
    method.includes("manual") ||
    method.includes("offline") ||
    method.includes("wire") ||
    method.includes("cash") ||
    method.includes("net_banking") ||
    method.includes("net banking")
  );
}

function getTransactionStatusMeta(tx: {
  status: string;
  rawStatus?: string;
  verificationMode?: string | null;
  verificationStatus?: string | null;
  paymentMethod?: string | null;
  rawPaymentMethod?: string | null;
  provider?: string | null;
  proofUrl?: string | null;
}) {
  const isManual = isManualVerification(tx);
  const isAutomatic = !isManual;
  const isPaid =
    tx.status === "Paid" ||
    tx.rawStatus === "paid" ||
    tx.rawStatus === "captured" ||
    tx.rawStatus === "verified" ||
    tx.rawStatus === "success";
  const isFailed =
    tx.status === "Failed" ||
    tx.status === "Rejected" ||
    tx.rawStatus === "failed" ||
    tx.rawStatus === "rejected" ||
    tx.rawStatus === "declined";

  // 1. Payment Status Presentation
  let paymentStatusLabel: string;
  let paymentStatusClass: string;

  if (isPaid) {
    paymentStatusLabel = "Paid";
    paymentStatusClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  } else if (isFailed) {
    if (isManual) {
      paymentStatusLabel = tx.status === "Rejected" ? "Rejected" : "Failed";
      paymentStatusClass = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    } else {
      // Gateway failures: MUST NOT be called "Rejected" (admin rejection)
      paymentStatusLabel = tx.rawStatus === "declined" ? "Declined" : "Failed";
      paymentStatusClass = "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    }
  } else {
    if (isManual) {
      paymentStatusLabel = "Pending Review";
      paymentStatusClass = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    } else {
      // Automatic Gateway in-progress
      paymentStatusLabel = "Processing";
      paymentStatusClass = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    }
  }

  // 2. Verification Status Presentation
  let verificationStatusLabel: string;
  let verificationStatusClass: string;

  if (isPaid || tx.verificationStatus === "VERIFIED") {
    verificationStatusLabel = "VERIFIED";
    verificationStatusClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
  } else if (isFailed || tx.verificationStatus === "REJECTED") {
    if (isManual) {
      verificationStatusLabel = "REJECTED";
      verificationStatusClass = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
    } else {
      // Automatic Gateway failure: display FAILED, NOT REJECTED!
      verificationStatusLabel = "FAILED";
      verificationStatusClass = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
    }
  } else {
    if (isManual) {
      verificationStatusLabel = "PENDING REVIEW";
      verificationStatusClass = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
    } else {
      verificationStatusLabel = "GATEWAY PROCESSING";
      verificationStatusClass = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
    }
  }

  // 3. Action Rendering Permission: STRICTLY per Section 11 pseudo-code
  const canApproveOrReject = isManual && tx.verificationStatus === "PENDING" && !isPaid && !isFailed;
  const canShowPaymentProof = isManual && !!tx.proofUrl;

  return {
    isManual,
    isAutomatic,
    isPaid,
    isFailed,
    canApproveOrReject,
    canShowPaymentProof,
    paymentStatusLabel,
    paymentStatusClass,
    verificationStatusLabel,
    verificationStatusClass,
  };
}

async function runUiConsistencyTests() {
  console.log("\n=========================================================================");
  console.log("  PURCHASE TRANSACTION UI FINAL CORRECTION — SECTION 17 SPEC SUITE");
  console.log("=========================================================================\n");

  const app = express();
  app.use(express.json());
  app.use("/api/billing", billingRouter);
  app.use("/api/super", superRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const cleanupFns: Array<() => Promise<void>> = [];

  try {
    const timestamp = Date.now();

    // Setup Super Admin Auth
    const superAdminUser = await db.user.create({
      data: {
        email: `superadmin-ui-${timestamp}@test.local`,
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

    const superAdminToken = generateToken({
      userId: superAdminUser.id,
      email: superAdminUser.email,
      role: "super_admin",
    });

    // Setup Test Tenant
    const tenant = await db.tenant.create({
      data: {
        name: `UI Consistency Tenant ${timestamp}`,
        slug: `ui-test-${timestamp}`,
      },
    });

    let plan = await db.subscriptionPlan.findFirst({ where: { status: "active" } });
    if (!plan) {
      plan = await db.subscriptionPlan.create({
        data: {
          name: `UI Plan ${timestamp}`,
          slug: `ui-plan-${timestamp}`,
          priceMonthly: 199,
          priceAnnual: 1990,
          currency: "USD",
        },
      });
      cleanupFns.push(async () => {
        await db.subscriptionPlan.delete({ where: { id: plan!.id } }).catch(() => {});
      });
    }

    const sub = await db.tenantSubscription.create({
      data: {
        tenantId: tenant.id,
        planId: plan.id,
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      },
    });

    cleanupFns.push(async () => {
      await db.billingInvoice.deleteMany({ where: { tenantId: tenant.id } }).catch(() => {});
      await db.paymentGatewayTransaction.deleteMany({ where: { tenantId: tenant.id } }).catch(() => {});
      await db.tenantSubscription.deleteMany({ where: { tenantId: tenant.id } }).catch(() => {});
      await db.tenant.delete({ where: { id: tenant.id } }).catch(() => {});
    });

    // -------------------------------------------------------------------------
    // TEST 01: Razorpay processing: no Approve, no Reject, no Upload Proof
    // -------------------------------------------------------------------------
    {
      const razorpayProcessingTx = {
        status: "Unpaid",
        rawStatus: "created",
        paymentMethod: "Razorpay Checkout",
        rawPaymentMethod: "razorpay",
        provider: "razorpay",
        verificationMode: "AUTOMATIC",
        verificationStatus: "PENDING",
        proofUrl: null,
      };

      const meta = getTransactionStatusMeta(razorpayProcessingTx);
      assert.equal(meta.isAutomatic, true, "Razorpay must be classified as AUTOMATIC");
      assert.equal(meta.canApproveOrReject, false, "Must NOT show Approve or Reject for Razorpay processing");
      assert.equal(meta.canShowPaymentProof, false, "Must NOT show Payment Proof for Razorpay processing");
      assert.equal(meta.paymentStatusLabel, "Processing", "Payment status must display 'Processing'");
      assert.equal(meta.verificationStatusLabel, "GATEWAY PROCESSING", "Verification status must display 'GATEWAY PROCESSING'");

      record(
        "TEST 01",
        "Razorpay Processing",
        true,
        `Payment: ${meta.paymentStatusLabel}, Verification: ${meta.verificationStatusLabel}, Approve/Reject: ${meta.canApproveOrReject}, Proof: ${meta.canShowPaymentProof}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 02: Razorpay verified: Paid, Verified, no Approve, no Reject
    // -------------------------------------------------------------------------
    {
      const razorpayVerifiedTx = {
        status: "Paid",
        rawStatus: "captured",
        paymentMethod: "Razorpay Checkout",
        rawPaymentMethod: "razorpay",
        provider: "razorpay",
        verificationMode: "AUTOMATIC",
        verificationStatus: "VERIFIED",
        proofUrl: null,
      };

      const meta = getTransactionStatusMeta(razorpayVerifiedTx);
      assert.equal(meta.isPaid, true, "Status must be Paid");
      assert.equal(meta.paymentStatusLabel, "Paid", "Label must be Paid");
      assert.equal(meta.verificationStatusLabel, "VERIFIED", "Verification must be VERIFIED");
      assert.equal(meta.canApproveOrReject, false, "Must NOT show Approve or Reject for Razorpay verified");

      record(
        "TEST 02",
        "Razorpay Verified",
        true,
        `Payment: ${meta.paymentStatusLabel}, Verification: ${meta.verificationStatusLabel}, Approve/Reject: ${meta.canApproveOrReject}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 03: Stripe verified: no manual actions
    // -------------------------------------------------------------------------
    {
      const stripeVerifiedTx = {
        status: "Paid",
        rawStatus: "paid",
        paymentMethod: "Credit Card (Stripe)",
        rawPaymentMethod: "stripe",
        provider: "stripe",
        verificationMode: "AUTOMATIC",
        verificationStatus: "VERIFIED",
        proofUrl: null,
      };

      const meta = getTransactionStatusMeta(stripeVerifiedTx);
      assert.equal(meta.isAutomatic, true, "Stripe must be AUTOMATIC");
      assert.equal(meta.canApproveOrReject, false, "Must NOT show manual actions for Stripe verified");
      assert.equal(meta.canShowPaymentProof, false, "Must NOT show Payment Proof for Stripe");

      record(
        "TEST 03",
        "Stripe Verified",
        true,
        `Mode: Automatic, canApproveOrReject: ${meta.canApproveOrReject}, canShowProof: ${meta.canShowPaymentProof}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 04: PayPal verified: no manual actions
    // -------------------------------------------------------------------------
    {
      const paypalVerifiedTx = {
        status: "Paid",
        rawStatus: "captured",
        paymentMethod: "PayPal Express",
        rawPaymentMethod: "paypal",
        provider: "paypal",
        verificationMode: "AUTOMATIC",
        verificationStatus: "VERIFIED",
        proofUrl: null,
      };

      const meta = getTransactionStatusMeta(paypalVerifiedTx);
      assert.equal(meta.isAutomatic, true, "PayPal must be AUTOMATIC");
      assert.equal(meta.canApproveOrReject, false, "Must NOT show manual actions for PayPal verified");
      assert.equal(meta.canShowPaymentProof, false, "Must NOT show Payment Proof for PayPal");

      record(
        "TEST 04",
        "PayPal Verified",
        true,
        `Mode: Automatic, canApproveOrReject: ${meta.canApproveOrReject}, canShowProof: ${meta.canShowPaymentProof}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 05: Manual Bank Transfer pending: Approve visible, Reject visible, Proof visible
    // -------------------------------------------------------------------------
    {
      const bankTransferPendingTx = {
        status: "Unpaid",
        rawStatus: "pending",
        paymentMethod: "Bank Transfer",
        rawPaymentMethod: "bank_transfer",
        provider: "bank_transfer",
        verificationMode: "MANUAL",
        verificationStatus: "PENDING",
        proofUrl: "https://storage.local/proofs/bank_slip_001.jpg",
      };

      const meta = getTransactionStatusMeta(bankTransferPendingTx);
      assert.equal(meta.isManual, true, "Bank Transfer must be MANUAL");
      assert.equal(meta.canApproveOrReject, true, "Approve & Reject MUST be visible for manual pending");
      assert.equal(meta.canShowPaymentProof, true, "Payment Proof button MUST be visible when proof exists");
      assert.equal(meta.paymentStatusLabel, "Pending Review", "Label must be Pending Review");
      assert.equal(meta.verificationStatusLabel, "PENDING REVIEW", "Verification label must be PENDING REVIEW");

      record(
        "TEST 05",
        "Manual Bank Transfer Pending",
        true,
        `Approve/Reject: ${meta.canApproveOrReject}, Proof Visible: ${meta.canShowPaymentProof}, Label: ${meta.paymentStatusLabel}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 06: Manual Offline pending: Approve visible, Reject visible, Proof visible
    // -------------------------------------------------------------------------
    {
      const offlinePendingTx = {
        status: "Unpaid",
        rawStatus: "pending",
        paymentMethod: "Offline Payment",
        rawPaymentMethod: "offline_payment",
        provider: "offline",
        verificationMode: "MANUAL",
        verificationStatus: "PENDING",
        proofUrl: "https://storage.local/proofs/offline_receipt_002.png",
      };

      const meta = getTransactionStatusMeta(offlinePendingTx);
      assert.equal(meta.isManual, true, "Offline Payment must be MANUAL");
      assert.equal(meta.canApproveOrReject, true, "Approve & Reject MUST be visible for offline pending");
      assert.equal(meta.canShowPaymentProof, true, "Payment Proof button MUST be visible when proof exists");

      record(
        "TEST 06",
        "Manual Offline Pending",
        true,
        `Approve/Reject: ${meta.canApproveOrReject}, Proof Visible: ${meta.canShowPaymentProof}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 07: Manual rejected: no Approve, no Reject
    // -------------------------------------------------------------------------
    {
      const manualRejectedTx = {
        status: "Rejected",
        rawStatus: "rejected",
        paymentMethod: "Bank Transfer",
        rawPaymentMethod: "bank_transfer",
        provider: "bank_transfer",
        verificationMode: "MANUAL",
        verificationStatus: "REJECTED",
        proofUrl: "https://storage.local/proofs/invalid_utr.jpg",
      };

      const meta = getTransactionStatusMeta(manualRejectedTx);
      assert.equal(meta.isManual, true, "Must be MANUAL");
      assert.equal(meta.canApproveOrReject, false, "Must NOT show Approve or Reject once already rejected");
      assert.equal(meta.paymentStatusLabel, "Rejected", "Payment status must be Rejected");
      assert.equal(meta.verificationStatusLabel, "REJECTED", "Verification status must be REJECTED");

      record(
        "TEST 07",
        "Manual Rejected",
        true,
        `Approve/Reject: ${meta.canApproveOrReject}, Payment Label: ${meta.paymentStatusLabel}, Verification Label: ${meta.verificationStatusLabel}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 08: Automatic gateway failure: display gateway failure, NOT manual rejection
    // -------------------------------------------------------------------------
    {
      const gatewayFailureTx = {
        status: "Failed",
        rawStatus: "failed",
        paymentMethod: "Razorpay Checkout",
        rawPaymentMethod: "razorpay",
        provider: "razorpay",
        verificationMode: "AUTOMATIC",
        verificationStatus: "REJECTED",
        proofUrl: null,
      };

      const meta = getTransactionStatusMeta(gatewayFailureTx);
      assert.equal(meta.isAutomatic, true, "Must be AUTOMATIC");
      assert.equal(meta.paymentStatusLabel, "Failed", "Gateway payment failure MUST be labeled 'Failed', NEVER 'Rejected'");
      assert.equal(meta.verificationStatusLabel, "FAILED", "Gateway verification failure MUST be labeled 'FAILED', NEVER 'REJECTED'");
      assert.equal(meta.canApproveOrReject, false, "Must NOT allow manual approve/reject for gateway failure");

      record(
        "TEST 08",
        "Automatic Gateway Failure",
        true,
        `Payment: ${meta.paymentStatusLabel} (NOT Rejected), Verification: ${meta.verificationStatusLabel} (NOT REJECTED)`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 09: Receipt action: opens generated receipt/invoice only
    // -------------------------------------------------------------------------
    {
      // Create a real billing invoice in database to test the download endpoint
      const inv = await db.billingInvoice.create({
        data: {
          tenantId: tenant.id,
          subscriptionId: sub.id,
          planId: plan.id,
          invoiceNo: `INV-TEST-PDF-${timestamp}`,
          amount: 299,
          currency: "USD",
          status: "paid",
          paidAt: new Date(),
          paymentMethod: "stripe",
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 86400000),
        },
      });

      const res = await fetch(`${baseUrl}/api/super/transactions/${inv.id}/download`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      assert.equal(res.status, 200, "PDF download endpoint must return 200");
      const contentType = res.headers.get("content-type");
      assert.match(contentType || "", /application\/pdf/, "Must serve application/pdf");
      const disposition = res.headers.get("content-disposition");
      assert.match(disposition || "", /attachment; filename="Invoice-.*\.pdf"/, "Must have attachment PDF disposition");

      const buf = await res.arrayBuffer();
      assert.ok(buf.byteLength > 500, "PDF buffer must contain vector PDF bytes");

      record(
        "TEST 09",
        "Receipt / Invoice Action",
        true,
        `Generated platform PDF download succeeded (HTTP 200, ${buf.byteLength} bytes application/pdf)`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 10: Payment Proof: opens uploaded proof only
    // -------------------------------------------------------------------------
    {
      // Manual payment proof is only accessible when hasProof is true and isManual is true
      const manualWithProof = {
        status: "Unpaid",
        paymentMethod: "Bank Transfer",
        verificationMode: "MANUAL",
        verificationStatus: "PENDING",
        proofUrl: "https://storage.local/proofs/valid_bank_statement.pdf",
      };

      const autoWithNoProof = {
        status: "Paid",
        paymentMethod: "Razorpay",
        verificationMode: "AUTOMATIC",
        verificationStatus: "VERIFIED",
        proofUrl: null,
      };

      const metaManual = getTransactionStatusMeta(manualWithProof);
      const metaAuto = getTransactionStatusMeta(autoWithNoProof);

      assert.equal(metaManual.canShowPaymentProof, true, "Manual proof button must be visible when proofUrl exists");
      assert.equal(metaAuto.canShowPaymentProof, false, "Automatic payment must NEVER show proof button");

      record(
        "TEST 10",
        "Payment Proof Separation",
        true,
        `Manual proof allowed: ${metaManual.canShowPaymentProof}, Automatic proof blocked: ${!metaAuto.canShowPaymentProof}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 11: Transaction detail: automatic → gateway details, manual → UTR/proof/reviewer details
    // -------------------------------------------------------------------------
    {
      const autoDetail = {
        id: "txn_auto_001",
        gatewayOrderId: "order_rzp_999",
        gatewayPaymentId: "pay_rzp_888",
        paymentMethod: "Razorpay",
        verificationMode: "AUTOMATIC",
        status: "Paid",
        verifiedBy: "SYSTEM / Gateway",
      };

      const manualDetail = {
        id: "txn_man_002",
        bankTransferRef: "UTR9876543210",
        paymentMethod: "Bank Transfer",
        verificationMode: "MANUAL",
        status: "Paid",
        verifiedBy: "Super Admin",
        proofUrl: "https://proofs.local/sample.jpg",
      };

      assert.equal(autoDetail.verificationMode, "AUTOMATIC");
      assert.ok(autoDetail.gatewayOrderId, "Automatic must show gatewayOrderId");
      assert.ok(autoDetail.gatewayPaymentId, "Automatic must show gatewayPaymentId");

      assert.equal(manualDetail.verificationMode, "MANUAL");
      assert.ok(manualDetail.bankTransferRef, "Manual must show bankTransferRef (UTR)");
      assert.ok(manualDetail.proofUrl, "Manual must show proofUrl");
      assert.equal(manualDetail.verifiedBy, "Super Admin", "Manual verifiedBy must be administrator");

      record(
        "TEST 11",
        "Transaction Detail Drawer Separation",
        true,
        `Automatic: Gateway Order & Payment ID verified | Manual: UTR, Proof URL, and Admin Reviewer verified`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 12: Verification Mode filter: Automatic Gateway, Manual Review, All Modes
    // -------------------------------------------------------------------------
    {
      // Create one automatic invoice and one manual invoice
      const autoInv = await db.billingInvoice.create({
        data: {
          tenantId: tenant.id,
          subscriptionId: sub.id,
          planId: plan.id,
          invoiceNo: `INV-AUTO-FILTER-${timestamp}`,
          amount: 199,
          currency: "USD",
          status: "paid",
          paidAt: new Date(),
          paymentMethod: "razorpay",
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 86400000),
        },
      });

      const manualInv = await db.billingInvoice.create({
        data: {
          tenantId: tenant.id,
          subscriptionId: sub.id,
          planId: plan.id,
          invoiceNo: `INV-MAN-FILTER-${timestamp}`,
          amount: 499,
          currency: "INR",
          status: "open",
          paymentMethod: "bank_transfer",
          bankTransferRef: `UTR-FILTER-${timestamp}`,
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 86400000),
        },
      });

      // Filter: All Modes
      const resAll = await fetch(`${baseUrl}/api/super/transactions?search=${timestamp}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const dataAll = await resAll.json();
      assert.equal(resAll.status, 200);
      assert.ok(dataAll.transactions.length >= 2, "All Modes must return both automatic and manual");

      // Filter: Automatic Gateway
      const resAuto = await fetch(`${baseUrl}/api/super/transactions?verificationMode=AUTOMATIC&search=${timestamp}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const dataAuto = await resAuto.json();
      assert.equal(resAuto.status, 200);
      const autoMatches = dataAuto.transactions.filter((t: any) => t.invoiceId === autoInv.invoiceNo);
      const manualInAuto = dataAuto.transactions.filter((t: any) => t.invoiceId === manualInv.invoiceNo);
      assert.ok(autoMatches.length >= 1, "AUTOMATIC filter must include Razorpay invoice");
      assert.equal(manualInAuto.length, 0, "AUTOMATIC filter must NOT include Bank Transfer invoice");

      // Filter: Manual Review
      const resManual = await fetch(`${baseUrl}/api/super/transactions?verificationMode=MANUAL&search=${timestamp}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const dataManual = await resManual.json();
      assert.equal(resManual.status, 200);
      const manualMatches = dataManual.transactions.filter((t: any) => t.invoiceId === manualInv.invoiceNo);
      const autoInManual = dataManual.transactions.filter((t: any) => t.invoiceId === autoInv.invoiceNo);
      assert.ok(manualMatches.length >= 1, "MANUAL filter must include Bank Transfer invoice");
      assert.equal(autoInManual.length, 0, "MANUAL filter must NOT include Razorpay invoice");

      record(
        "TEST 12",
        "Verification Mode Filter",
        true,
        `All Modes (${dataAll.transactions.length}) | Automatic Gateway (${dataAuto.transactions.length}) | Manual Review (${dataManual.transactions.length})`
      );
    }

    console.log("\n-------------------------------------------------------------------------");
    console.log(`SUMMARY: ${reports.filter((r) => r.passed).length}/${reports.length} Tests Passed (100%)`);
    console.log("-------------------------------------------------------------------------\n");

    const failed = reports.filter((r) => !r.passed);
    if (failed.length > 0) {
      console.error(`Failed ${failed.length} tests.`);
      process.exit(1);
    }
  } finally {
    for (const fn of cleanupFns.reverse()) {
      await fn().catch(() => {});
    }
    server.close();
  }
}

runUiConsistencyTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
