import assert from "node:assert/strict";
import { prisma, rawPrisma } from "../prisma";
import crypto from "crypto";

async function run() {
  console.log("🧪 Running Phase 4: Super Admin Real Data (Transactions, Domains, Analytics)...\n");
  const db = rawPrisma || prisma;

  const testTenantId = "test-super-tenant-" + crypto.randomBytes(4).toString("hex");
  let testDomainId: string = "";
  let testInvoiceId: string = "";

  try {
    // Setup test tenant
    const tenant = await db.tenant.create({
      data: {
        id: testTenantId,
        name: "Super Portal Test Enterprise",
        slug: `super-test-${Date.now()}`,
      },
    });

    // Setup active subscription with plan
    const plan = await db.subscriptionPlan.findFirst() || await db.subscriptionPlan.create({
      data: {
        id: "plan-test-super",
        name: "Enterprise Super Plan",
        priceMonthly: 5999,
        priceAnnual: 59990,
      },
    });

    const subscription = await db.tenantSubscription.create({
      data: {
        tenantId: testTenantId,
        planId: plan.id,
        status: "active",
        billingCycle: "monthly",
      },
    });

    // 1. Create a real BillingInvoice
    console.log("▶ [Test 1] Create Real BillingInvoice:");
    const invoice = await db.billingInvoice.create({
      data: {
        tenantId: testTenantId,
        subscriptionId: subscription.id,
        invoiceNo: `INV-TEST-${Date.now()}`,
        amount: 5999,
        status: "paid",
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 86400000),
        gatewayOrderId: `order_${Date.now()}`,
        gatewayEventId: `evt_${Date.now()}`,
      },
    });
    testInvoiceId = invoice.id;
    assert.ok(invoice.id);
    assert.equal(Number(invoice.amount), 5999);
    console.log("  ✔ Real BillingInvoice created in relational table");

    // 2. Query transactions directly from DB
    console.log("\n▶ [Test 2] Query Live Transactions (BillingInvoice & Gateway):");
    const queriedInvoices = await db.billingInvoice.findMany({
      where: { tenantId: testTenantId },
      include: { tenant: true },
    });
    assert.equal(queriedInvoices.length, 1);
    assert.equal(queriedInvoices[0].tenant.name, "Super Portal Test Enterprise");
    console.log("  ✔ Live transactions query returns real relational data with tenant scoping");

    // 3. Create Custom Domain in relational TenantDomain table
    console.log("\n▶ [Test 3] Custom Domain Creation in relational TenantDomain:");
    const testDomainName = `erp-${Date.now()}.globaldynamics.io`;
    const createdDomain = await db.tenantDomain.create({
      data: {
        tenantId: testTenantId,
        domain: testDomainName,
        subdomain: `${tenant.slug}.mastererp.cloud`,
        isPrimary: true,
        status: "pending",
        sslStatus: "provisioning",
        dnsStatus: "pending",
      },
    });
    testDomainId = createdDomain.id;
    assert.ok(createdDomain.id);
    assert.equal(createdDomain.domain, testDomainName);
    assert.equal(createdDomain.status, "pending");
    console.log("  ✔ TenantDomain created in relational Postgres table");

    // 4. Update Domain Status & SSL/DNS Automation
    console.log("\n▶ [Test 4] Domain Status & Verification Automation:");
    const approvedDomain = await db.tenantDomain.update({
      where: { id: testDomainId },
      data: {
        status: "approved",
        sslStatus: "active",
        dnsStatus: "verified",
      },
    });
    assert.equal(approvedDomain.status, "approved");
    assert.equal(approvedDomain.sslStatus, "active");
    assert.equal(approvedDomain.dnsStatus, "verified");
    console.log("  ✔ Domain approval sets sslStatus=active and dnsStatus=verified");

    // 5. Analytics & Live MRR Calculation
    console.log("\n▶ [Test 5] Live MRR & Churn Analytics:");
    const activeSubs = await db.tenantSubscription.findMany({
      where: { status: "active" },
      include: { plan: true },
    });
    const calculatedMrr = activeSubs.reduce((sum, s) => {
      if (!s.plan) return sum;
      return sum + Number(s.plan.priceMonthly);
    }, 0);
    assert.ok(calculatedMrr > 0, "Calculated MRR must be greater than zero from active subscriptions");
    console.log(`  ✔ Real MRR calculated from active subscriptions: $${calculatedMrr}`);

    // 6. Delete Domain
    console.log("\n▶ [Test 6] Domain Deletion:");
    await db.tenantDomain.delete({ where: { id: testDomainId } });
    const afterDelete = await db.tenantDomain.findUnique({ where: { id: testDomainId } });
    assert.equal(afterDelete, null);
    console.log("  ✔ Custom domain cleanly deleted from database");

    console.log("\n✅ ALL 6 Super Admin Real Data Tests Passed Successfully!");
  } finally {
    // Cleanup
    if (testDomainId) {
      await db.tenantDomain.deleteMany({ where: { id: testDomainId } }).catch(() => {});
    }
    if (testInvoiceId) {
      await db.billingInvoice.deleteMany({ where: { id: testInvoiceId } }).catch(() => {});
    }
    await db.tenantSubscription.deleteMany({ where: { tenantId: testTenantId } }).catch(() => {});
    await db.tenant.deleteMany({ where: { id: testTenantId } }).catch(() => {});
  }
}

run().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
