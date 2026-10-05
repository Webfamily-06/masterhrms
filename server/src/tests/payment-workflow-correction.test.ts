import assert from "node:assert/strict";
import crypto from "node:crypto";
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

// Logic mirror of the frontend isManualVerification helper from src/routes/_authenticated/super/transactions.tsx
function isManualVerification(tx: {
  verificationMode?: string;
  paymentMethod?: string;
  rawPaymentMethod?: string;
  provider?: string;
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
    method.includes("cash")
  );
}

function canShowApproveOrReject(tx: {
  verificationMode?: string;
  verificationStatus?: string;
  status: string;
  paymentMethod?: string;
  rawPaymentMethod?: string;
  provider?: string;
}): boolean {
  const isManual = isManualVerification(tx);
  const isPaid = tx.status === "Paid" || tx.status === "paid";
  const isFailed =
    tx.status === "Failed" ||
    tx.status === "failed" ||
    tx.status === "Rejected" ||
    tx.status === "rejected";
  const isRejectedVerification = tx.verificationStatus === "REJECTED";
  return isManual && !isPaid && !isFailed && !isRejectedVerification;
}

async function runPaymentWorkflowCorrectionTests() {
  console.log("\n=========================================================================");
  console.log("  PAYMENT TRANSACTION WORKFLOW CORRECTION SUITE (TESTS 01 - 12)");
  console.log("=========================================================================\n");

  const app = express();
  app.use(express.json());

  // Mount routers
  app.use("/api/billing", billingRouter);
  app.use("/api/super", superRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const cleanupFns: Array<() => Promise<void>> = [];

  try {
    const timestamp = Date.now();

    // 1. Setup Tenants
    const tenantA = await db.tenant.create({
      data: {
        name: `Workflow QA Corp A ${timestamp}`,
        slug: `wf-qa-a-${timestamp}`,
      },
    });

    const tenantB = await db.tenant.create({
      data: {
        name: `Workflow QA Corp B ${timestamp}`,
        slug: `wf-qa-b-${timestamp}`,
      },
    });

    cleanupFns.push(async () => {
      await db.billingInvoice.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } }).catch(() => {});
      await db.paymentGatewayTransaction.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } }).catch(() => {});
      await db.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } }).catch(() => {});
      await db.profile.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } }).catch(() => {});
      await db.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } }).catch(() => {});
    });

    // 2. Setup Super Admin User
    const superAdminUser = await db.user.create({
      data: {
        email: `superadmin-wf-${timestamp}@test.local`,
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

    // 3. Setup Regular Tenant Admin (Tenant A)
    const tenantAAdminUser = await db.user.create({
      data: {
        email: `tenantadmin-a-${timestamp}@test.local`,
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
            email: `tenantadmin-a-${timestamp}@test.local`,
            fullName: "Tenant A Admin",
          },
        },
      },
    });
    cleanupFns.push(async () => {
      await db.userRole.deleteMany({ where: { userId: tenantAAdminUser.id } }).catch(() => {});
      await db.profile.deleteMany({ where: { userId: tenantAAdminUser.id } }).catch(() => {});
      await db.user.delete({ where: { id: tenantAAdminUser.id } }).catch(() => {});
    });

    // Tokens
    const superAdminToken = generateToken({
      userId: superAdminUser.id,
      email: superAdminUser.email,
      roles: ["super_admin"],
    });

    const tenantAAdminToken = generateToken({
      userId: tenantAAdminUser.id,
      email: tenantAAdminUser.email,
      tenantId: tenantA.id,
      roles: ["hr_admin"],
    });

    // Setup a standard subscription plan
    let plan = await db.subscriptionPlan.findFirst({ where: { status: "active" } });
    if (!plan) {
      plan = await db.subscriptionPlan.create({
        data: {
          name: "Enterprise QA Plan",
          status: "active",
          priceMonthly: 199,
          priceAnnual: 1990,
          currency: "USD",
        },
      });
      cleanupFns.push(async () => {
        await db.subscriptionPlan.delete({ where: { id: plan!.id } }).catch(() => {});
      });
    }

    // Subscriptions for Tenant A & B
    const subA = await db.tenantSubscription.create({
      data: {
        tenantId: tenantA.id,
        planId: plan.id,
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      },
    });

    const subB = await db.tenantSubscription.create({
      data: {
        tenantId: tenantB.id,
        planId: plan.id,
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      },
    });

    // -------------------------------------------------------------------------
    // TEST 01: Razorpay successful payment
    // -------------------------------------------------------------------------
    {
      const razorpayOrder = `order_rzp_${timestamp}`;
      const razorpayPayId = `pay_rzp_${timestamp}`;

      const inv = await db.billingInvoice.create({
        data: {
          tenantId: tenantA.id,
          subscriptionId: subA.id,
          planId: plan.id,
          invoiceNo: `SUB-INV-RZP-${timestamp}`,
          amount: 2500,
          currency: "INR",
          status: "paid",
          paidAt: new Date(),
          paymentMethod: "razorpay",
          gatewayOrderId: razorpayOrder,
          gatewayPaymentId: razorpayPayId,
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 86400000),
        },
      });

      const mode = getVerificationMode("razorpay", inv.paymentMethod);
      const vStatus = resolveVerificationStatus("paid", mode);
      const showButtons = canShowApproveOrReject({
        verificationMode: mode,
        verificationStatus: vStatus,
        status: inv.status,
        paymentMethod: "Razorpay",
      });

      const passed =
        inv.status === "paid" &&
        vStatus === "VERIFIED" &&
        mode === "AUTOMATIC" &&
        subA.status === "active" &&
        showButtons === false;

      record(
        "TEST 01",
        "Razorpay successful payment",
        passed,
        `status=${inv.status}, verificationStatus=${vStatus}, mode=${mode}, subStatus=${subA.status}, showButtons=${showButtons}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 02: Stripe successful payment
    // -------------------------------------------------------------------------
    {
      const stripeSession = `cs_test_${timestamp}`;
      const stripePayment = `pi_test_${timestamp}`;

      const inv = await db.billingInvoice.create({
        data: {
          tenantId: tenantA.id,
          subscriptionId: subA.id,
          planId: plan.id,
          invoiceNo: `SUB-INV-STRIPE-${timestamp}`,
          amount: 199,
          currency: "USD",
          status: "paid",
          paidAt: new Date(),
          paymentMethod: "stripe",
          gatewayOrderId: stripeSession,
          gatewayPaymentId: stripePayment,
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 86400000),
        },
      });

      const mode = getVerificationMode("stripe", inv.paymentMethod);
      const vStatus = resolveVerificationStatus("paid", mode);
      const showButtons = canShowApproveOrReject({
        verificationMode: mode,
        verificationStatus: vStatus,
        status: inv.status,
        paymentMethod: "Stripe",
      });

      const passed =
        inv.status === "paid" &&
        vStatus === "VERIFIED" &&
        mode === "AUTOMATIC" &&
        subA.status === "active" &&
        showButtons === false;

      record(
        "TEST 02",
        "Stripe successful payment",
        passed,
        `status=${inv.status}, verificationStatus=${vStatus}, mode=${mode}, subStatus=${subA.status}, showButtons=${showButtons}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 03: PayPal successful payment
    // -------------------------------------------------------------------------
    {
      const paypalOrder = `PAYPAL-ORD-${timestamp}`;
      const paypalCapture = `PAYPAL-CAP-${timestamp}`;

      const inv = await db.billingInvoice.create({
        data: {
          tenantId: tenantA.id,
          subscriptionId: subA.id,
          planId: plan.id,
          invoiceNo: `SUB-INV-PP-${timestamp}`,
          amount: 199,
          currency: "USD",
          status: "paid",
          paidAt: new Date(),
          paymentMethod: "paypal",
          gatewayOrderId: paypalOrder,
          gatewayPaymentId: paypalCapture,
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 86400000),
        },
      });

      const mode = getVerificationMode("paypal", inv.paymentMethod);
      const vStatus = resolveVerificationStatus("paid", mode);
      const showButtons = canShowApproveOrReject({
        verificationMode: mode,
        verificationStatus: vStatus,
        status: inv.status,
        paymentMethod: "PayPal",
      });

      const passed =
        inv.status === "paid" &&
        vStatus === "VERIFIED" &&
        mode === "AUTOMATIC" &&
        subA.status === "active" &&
        showButtons === false;

      record(
        "TEST 03",
        "PayPal successful payment",
        passed,
        `status=${inv.status}, verificationStatus=${vStatus}, mode=${mode}, subStatus=${subA.status}, showButtons=${showButtons}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 04: Manual payment submitted with proof
    // -------------------------------------------------------------------------
    let manualInvId: string = "";
    {
      const manualInv = await db.billingInvoice.create({
        data: {
          tenantId: tenantA.id,
          subscriptionId: subA.id,
          planId: plan.id,
          invoiceNo: `SUB-INV-MANUAL-${timestamp}`,
          amount: 350,
          currency: "USD",
          status: "open",
          paymentMethod: "bank_transfer",
          bankTransferRef: `UTR-REF-${timestamp}`,
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 86400000),
        },
      });
      manualInvId = manualInv.id;

      // Submit offline payment with genuine proof
      const submitRes = await fetch(`${baseUrl}/api/billing/submit-offline-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantAAdminToken}`,
        },
        body: JSON.stringify({
          invoiceId: manualInv.id,
          referenceNo: `UTR-REF-${timestamp}`,
          receiptUrl: `https://storage.local/proofs/receipt_${timestamp}.png`,
          notes: "Wire transfer submitted via corporate HDFC account",
        }),
      });

      const submitJson: any = await submitRes.json();
      assert.ok(submitRes.status === 200 || submitRes.status === 201, `Expected 200/201 from submit-offline-payment, got ${submitRes.status}`);

      const mode = getVerificationMode(undefined, "bank_transfer");
      const vStatus = resolveVerificationStatus("open", mode);
      const showButtons = canShowApproveOrReject({
        verificationMode: mode,
        verificationStatus: vStatus,
        status: "Pending",
        paymentMethod: "Bank Transfer",
      });

      // Verify transaction from Super Admin perspective has proof attached
      const superTxRes = await fetch(`${baseUrl}/api/super/transactions/${manualInv.id}`, {
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
        },
      });
      const superTx: any = await superTxRes.json();
      const proofVisible = !!superTx.proofUrl || !!submitJson.invoice;

      const passed =
        vStatus === "PENDING" &&
        mode === "MANUAL" &&
        showButtons === true &&
        proofVisible === true;

      record(
        "TEST 04",
        "Manual payment submitted with proof",
        passed,
        `status=open, verificationStatus=${vStatus}, mode=${mode}, showButtons=${showButtons}, proofVisible=${proofVisible}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 05: Manual payment approved
    // -------------------------------------------------------------------------
    {
      const res = await fetch(`${baseUrl}/api/super/transactions/${manualInvId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
      });

      const body = await res.json();
      assert.equal(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(body)}`);

      const updatedInv = await db.billingInvoice.findUnique({ where: { id: manualInvId } });
      const mode = getVerificationMode(undefined, updatedInv?.paymentMethod);
      const vStatus = resolveVerificationStatus(updatedInv?.status || "", mode);
      const showButtons = canShowApproveOrReject({
        verificationMode: mode,
        verificationStatus: vStatus,
        status: updatedInv?.status || "",
        paymentMethod: "Bank Transfer",
      });

      const recheckedSub = await db.tenantSubscription.findUnique({ where: { id: subA.id } });

      const passed =
        updatedInv?.status === "paid" &&
        vStatus === "VERIFIED" &&
        recheckedSub?.status === "active" &&
        showButtons === false;

      record(
        "TEST 05",
        "Manual payment approved",
        passed,
        `status=${updatedInv?.status}, verificationStatus=${vStatus}, subStatus=${recheckedSub?.status}, showButtons=${showButtons}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 06: Manual payment rejected
    // -------------------------------------------------------------------------
    {
      const rejectedInv = await db.billingInvoice.create({
        data: {
          tenantId: tenantA.id,
          subscriptionId: subA.id,
          planId: plan.id,
          invoiceNo: `SUB-INV-REJECT-${timestamp}`,
          amount: 450,
          currency: "USD",
          status: "open",
          paymentMethod: "offline",
          bankTransferRef: `INVALID-UTR-${timestamp}`,
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 86400000),
        },
      });

      const rejectionReasonText = "UTR not recognized on bank statement";

      const res = await fetch(`${baseUrl}/api/super/transactions/${rejectedInv.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({ reason: rejectionReasonText }),
      });

      const body = await res.json();
      assert.equal(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(body)}`);

      const recheckedInv = await db.billingInvoice.findUnique({ where: { id: rejectedInv.id } });
      const mode = getVerificationMode(undefined, recheckedInv?.paymentMethod);
      const meta = (recheckedInv as any)?.metadata || {};
      const vStatus = meta?.verificationStatus || resolveVerificationStatus(recheckedInv?.status || "", mode);

      const showButtons = canShowApproveOrReject({
        verificationMode: mode,
        verificationStatus: vStatus,
        status: recheckedInv?.status || "",
        paymentMethod: "Offline",
      });

      const passed =
        (recheckedInv?.status === "failed" || recheckedInv?.status === "rejected") &&
        vStatus === "REJECTED" &&
        body.rejectionReason === rejectionReasonText &&
        showButtons === false;

      record(
        "TEST 06",
        "Manual payment rejected",
        passed,
        `status=${recheckedInv?.status}, verificationStatus=${vStatus}, rejectionReason="${body.rejectionReason}", showButtons=${showButtons}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 07: Attempt API approval on automatic payment (Must be REJECTED)
    // -------------------------------------------------------------------------
    {
      const autoInv = await db.billingInvoice.create({
        data: {
          tenantId: tenantA.id,
          subscriptionId: subA.id,
          planId: plan.id,
          invoiceNo: `SUB-INV-AUTO-APPROVE-FAIL-${timestamp}`,
          amount: 299,
          currency: "USD",
          status: "open",
          paymentMethod: "stripe",
          gatewayOrderId: `cs_auto_err_${timestamp}`,
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 86400000),
        },
      });

      const res = await fetch(`${baseUrl}/api/super/transactions/${autoInv.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
      });

      const body = await res.json();
      const passed =
        res.status === 400 &&
        body.code === "AUTOMATIC_TRANSACTION_MANUAL_APPROVAL_DISALLOWED";

      record(
        "TEST 07",
        "Attempt API approval on automatic payment",
        passed,
        `status=${res.status}, code=${body.code}, message="${body.message}"`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 08: Attempt API rejection on automatic payment (Must be REJECTED)
    // -------------------------------------------------------------------------
    {
      const autoInv = await db.billingInvoice.create({
        data: {
          tenantId: tenantA.id,
          subscriptionId: subA.id,
          planId: plan.id,
          invoiceNo: `SUB-INV-AUTO-REJECT-FAIL-${timestamp}`,
          amount: 299,
          currency: "USD",
          status: "open",
          paymentMethod: "razorpay",
          gatewayOrderId: `order_auto_err_${timestamp}`,
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 86400000),
        },
      });

      const res = await fetch(`${baseUrl}/api/super/transactions/${autoInv.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({ reason: "Manual rejection attempt on gateway transaction" }),
      });

      const body = await res.json();
      const passed =
        res.status === 400 &&
        body.code === "AUTOMATIC_TRANSACTION_MANUAL_REJECTION_DISALLOWED";

      record(
        "TEST 08",
        "Attempt API rejection on automatic payment",
        passed,
        `status=${res.status}, code=${body.code}, message="${body.message}"`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 09: Duplicate gateway webhook (Idempotency)
    // -------------------------------------------------------------------------
    {
      const deliveryKey = `deliv_${timestamp}`;
      await db.paymentWebhookEvent.create({
        data: {
          tenantId: tenantA.id,
          provider: "stripe",
          deliveryKey,
          eventType: "payment_intent.succeeded",
          signatureOk: true,
          payload: { id: `pi_${timestamp}` },
        },
      });

      // Simulate second webhook delivery attempt with identical deliveryKey
      let duplicateCreated = false;
      try {
        await db.paymentWebhookEvent.create({
          data: {
            tenantId: tenantA.id,
            provider: "stripe",
            deliveryKey,
            eventType: "payment_intent.succeeded",
            signatureOk: true,
            payload: { id: `pi_${timestamp}` },
          },
        });
        duplicateCreated = true;
      } catch (err: any) {
        // Unique constraint on deliveryKey prevents duplicates
        duplicateCreated = false;
      }

      const totalMatching = await db.paymentWebhookEvent.count({
        where: { deliveryKey },
      });

      const passed = duplicateCreated === false && totalMatching === 1;

      record(
        "TEST 09",
        "Duplicate gateway webhook (Idempotency)",
        passed,
        `duplicateCreated=${duplicateCreated}, totalMatchingEvents=${totalMatching}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 10: Cross-tenant attempt to access/approve another tenant's payment
    // -------------------------------------------------------------------------
    {
      // Create Tenant B invoice
      const tenantBInv = await db.billingInvoice.create({
        data: {
          tenantId: tenantB.id,
          subscriptionId: subB.id,
          planId: plan.id,
          invoiceNo: `SUB-INV-TENANTB-${timestamp}`,
          amount: 500,
          currency: "USD",
          status: "open",
          paymentMethod: "bank_transfer",
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 86400000),
        },
      });

      // Tenant A admin tries to query tenant B's invoice via tenant billing API
      const res = await fetch(`${baseUrl}/api/billing/invoices/${tenantBInv.id}`, {
        headers: {
          Authorization: `Bearer ${tenantAAdminToken}`,
        },
      });

      // Must be 404 Not Found or 403 Forbidden under Tenant A's isolated view
      const passed = res.status === 404 || res.status === 403;

      record(
        "TEST 10",
        "Cross-tenant attempt to access another tenant's payment",
        passed,
        `status=${res.status} (tenant B invoice inaccessible to tenant A token)`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 11: Unauthorized user attempts manual approval
    // -------------------------------------------------------------------------
    {
      // Regular tenant admin (not super admin) attempts /api/super/transactions/:id/approve
      const testManualInv = await db.billingInvoice.create({
        data: {
          tenantId: tenantA.id,
          subscriptionId: subA.id,
          planId: plan.id,
          invoiceNo: `SUB-INV-RBAC-${timestamp}`,
          amount: 150,
          currency: "USD",
          status: "open",
          paymentMethod: "bank_transfer",
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 86400000),
        },
      });

      const res = await fetch(`${baseUrl}/api/super/transactions/${testManualInv.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantAAdminToken}`, // Non-super-admin
        },
      });

      const passed = res.status === 403;

      record(
        "TEST 11",
        "Unauthorized user attempts manual approval",
        passed,
        `status=${res.status} (Permission denied: super_admin required)`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 12: Already-approved manual payment submitted again for approval
    // -------------------------------------------------------------------------
    {
      // manualInvId was already approved in TEST 05
      const res = await fetch(`${baseUrl}/api/super/transactions/${manualInvId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
      });

      const body = await res.json();
      // Server must either return 400 TRANSACTION_ALREADY_PAID or gracefully return idempotent success (status Paid)
      const passed =
        (res.status === 400 && body.code === "TRANSACTION_ALREADY_PAID") ||
        (res.status === 200 && (body.status === "Paid" || body.alreadyPaid === true));

      record(
        "TEST 12",
        "Already-approved manual payment submitted again for approval",
        passed,
        `status=${res.status}, code=${body.code || "ALREADY_HANDLED"}, message="${body.message}"`
      );
    }

    // -------------------------------------------------------------------------
    // SUMMARY REPORT
    // -------------------------------------------------------------------------
    console.log("\n=========================================================================");
    console.log("  TEST RESULTS SUMMARY");
    console.log("=========================================================================");

    const total = reports.length;
    const passedCount = reports.filter((r) => r.passed).length;
    const failedCount = total - passedCount;

    console.log(`  Total Tests : ${total}`);
    console.log(`  Passed      : ${passedCount}`);
    console.log(`  Failed      : ${failedCount}`);

    if (failedCount > 0) {
      console.error(`\n🔴 ${failedCount} TESTS FAILED!`);
      process.exitCode = 1;
    } else {
      console.log(`\n🟢 ALL ${total} WORKFLOW CORRECTION TESTS PASSED!\n`);
    }

  } catch (err) {
    console.error("Fatal test runner error:", err);
    process.exitCode = 1;
  } finally {
    for (const fn of cleanupFns) {
      await fn().catch(() => {});
    }
    server.close();
  }
}

runPaymentWorkflowCorrectionTests().catch((e) => {
  console.error("Unhandled error:", e);
  process.exit(1);
});
