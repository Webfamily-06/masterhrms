import { prisma, rawPrisma } from "../src/prisma";
import { generateToken } from "../src/lib/jwt";

const db = rawPrisma || prisma;

async function prepare() {
  console.log("Preparing Super Admin session & transactions for Visual QA...");

  // 1. Get or create super admin user
  let superAdminUser = await db.user.findFirst({
    where: {
      roles: {
        some: { role: "super_admin" },
      },
    },
    include: { roles: true },
  });

  if (!superAdminUser) {
    superAdminUser = await db.user.create({
      data: {
        email: "superadmin@masterhrms.com",
        passwordHash: "test_hash",
        roles: {
          create: {
            role: "super_admin",
          },
        },
        profile: {
          create: {
            email: "superadmin@masterhrms.com",
            fullName: "Master Super Admin",
          },
        },
      },
      include: { roles: true },
    });
  }

  const token = generateToken({
    userId: superAdminUser.id,
    email: superAdminUser.email,
    roles: ["super_admin"],
  });

  // 2. Ensure a tenant and plan exist for transaction demo
  let tenant = await db.tenant.findFirst({
    where: { slug: "acme-corp" },
  });

  if (!tenant) {
    tenant = await db.tenant.create({
      data: {
        name: "Acme Corporation",
        slug: "acme-corp",
      },
    });
  }

  let plan = await db.subscriptionPlan.findFirst({ where: { status: "active" } });
  if (!plan) {
    plan = await db.subscriptionPlan.create({
      data: {
        name: "Enterprise Cloud",
        slug: "enterprise-cloud",
        priceMonthly: 499,
        priceAnnual: 4990,
        currency: "USD",
      },
    });
  }

  let sub = await db.tenantSubscription.findFirst({
    where: { tenantId: tenant.id },
  });

  if (!sub) {
    sub = await db.tenantSubscription.create({
      data: {
        tenantId: tenant.id,
        planId: plan.id,
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      },
    });
  }

  // 3. Ensure we have representative transactions in the database
  const demoInvoices = [
    {
      invoiceNo: "INV-DEMO-RZP-PROC",
      amount: 4999,
      currency: "INR",
      status: "open",
      paymentMethod: "razorpay",
      gatewayOrderId: "order_rzp_demo_proc_99",
      gatewayPaymentId: null,
      paidAt: null,
      bankTransferRef: null,
    },
    {
      invoiceNo: "INV-DEMO-RZP-PAID",
      amount: 4999,
      currency: "INR",
      status: "paid",
      paymentMethod: "razorpay",
      gatewayOrderId: "order_rzp_demo_paid_88",
      gatewayPaymentId: "pay_rzp_demo_paid_88",
      paidAt: new Date(),
      bankTransferRef: null,
    },
    {
      invoiceNo: "INV-DEMO-STRIPE-PAID",
      amount: 499,
      currency: "USD",
      status: "paid",
      paymentMethod: "stripe",
      gatewayOrderId: "cs_test_demo_stripe_77",
      gatewayPaymentId: "pi_demo_stripe_77",
      paidAt: new Date(),
      bankTransferRef: null,
    },
    {
      invoiceNo: "INV-DEMO-PAYPAL-PAID",
      amount: 499,
      currency: "USD",
      status: "paid",
      paymentMethod: "paypal",
      gatewayOrderId: "ORDER-PP-DEMO-66",
      gatewayPaymentId: "CAPTURE-PP-DEMO-66",
      paidAt: new Date(),
      bankTransferRef: null,
    },
    {
      invoiceNo: "INV-DEMO-RZP-FAIL",
      amount: 4999,
      currency: "INR",
      status: "failed",
      paymentMethod: "razorpay",
      gatewayOrderId: "order_rzp_demo_fail_55",
      gatewayPaymentId: null,
      paidAt: null,
      bankTransferRef: null,
    },
    {
      invoiceNo: "INV-DEMO-BANK-PENDING",
      amount: 12500,
      currency: "INR",
      status: "open",
      paymentMethod: "bank_transfer",
      gatewayOrderId: null,
      gatewayPaymentId: null,
      paidAt: null,
      bankTransferRef: "UTR-HDFC-9922881144",
    },
    {
      invoiceNo: "INV-DEMO-NETBANK-PENDING",
      amount: 8500,
      currency: "INR",
      status: "open",
      paymentMethod: "net_banking",
      gatewayOrderId: null,
      gatewayPaymentId: null,
      paidAt: null,
      bankTransferRef: "UTR-ICICI-NETBK-3344",
    },
    {
      invoiceNo: "INV-DEMO-OFFLINE-PENDING",
      amount: 15000,
      currency: "INR",
      status: "open",
      paymentMethod: "manual",
      gatewayOrderId: null,
      gatewayPaymentId: null,
      paidAt: null,
      bankTransferRef: "CHQ-SBIN-889900",
    },
  ];

  for (const item of demoInvoices) {
    const existing = await db.billingInvoice.findFirst({
      where: { invoiceNo: item.invoiceNo },
    });
    if (!existing) {
      await db.billingInvoice.create({
        data: {
          tenantId: tenant.id,
          subscriptionId: sub.id,
          planId: plan.id,
          invoiceNo: item.invoiceNo,
          amount: item.amount,
          currency: item.currency,
          status: item.status,
          paidAt: item.paidAt,
          paymentMethod: item.paymentMethod,
          gatewayOrderId: item.gatewayOrderId,
          gatewayPaymentId: item.gatewayPaymentId,
          bankTransferRef: item.bankTransferRef,
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 86400000),
        },
      });
    }
  }

  // 4. Attach proof to demo manual invoice in system-monetization-plans
  let cms = await db.cmsPage.findUnique({ where: { slug: "system-monetization-plans" } });
  let content: any = {};
  if (cms?.content) {
    content = typeof cms.content === "string" ? JSON.parse(cms.content as string) : cms.content;
  }
  if (!Array.isArray(content.bankTransfers)) {
    content.bankTransfers = [];
  }
  const existingBt = content.bankTransfers.find((b: any) => b.invoice_no === "INV-DEMO-BANK-PENDING");
  if (!existingBt) {
    content.bankTransfers.push({
      invoice_no: "INV-DEMO-BANK-PENDING",
      reference_no: "UTR-HDFC-9922881144",
      receipt_url: "/uploads/proofs/bank_transfer_slip_demo.png",
      status: "pending",
      notes: "Direct NEFT payment from HDFC corporate account",
      submitted_at: new Date().toISOString(),
    });
  }
  await db.cmsPage.upsert({
    where: { slug: "system-monetization-plans" },
    create: {
      slug: "system-monetization-plans",
      title: "System Monetization Plans",
      content: content,
    },
    update: {
      content: content,
    },
  });

  console.log("READY");
}

prepare().catch(console.error);
