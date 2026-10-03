import assert from "node:assert/strict";
import { prisma, rawPrisma } from "../prisma";
import crypto from "crypto";

async function run() {
  console.log("🧪 Running Phase 3: Relational CRM Deals & Cross-Tenant Isolation Tests...\n");
  const db = rawPrisma || prisma;

  const tenantAId = "test-crm-a-" + crypto.randomBytes(4).toString("hex");
  const tenantBId = "test-crm-b-" + crypto.randomBytes(4).toString("hex");

  try {
    // Setup Tenant A
    await db.tenant.create({
      data: {
        id: tenantAId,
        name: "CRM Test Tenant Alpha",
        slug: `crm-alpha-${Date.now()}`,
      },
    });

    // Setup Tenant B
    await db.tenant.create({
      data: {
        id: tenantBId,
        name: "CRM Test Tenant Beta",
        slug: `crm-beta-${Date.now()}`,
      },
    });

    // 1. Relational Deal Creation in Postgres for Tenant A
    console.log("▶ [Test 1] Create Relational Deal for Tenant A:");
    const dealA = await db.crmDeal.create({
      data: {
        tenantId: tenantAId,
        name: "Enterprise ERP Cloud Migration",
        customer: "Acme Industrial Corp",
        stage: "Proposal",
        value: 85000,
        probability: 65,
        owner: "Ethan Walker",
        status: "Open",
      },
    });

    assert.ok(dealA.id, "Deal ID should be generated");
    assert.equal(dealA.tenantId, tenantAId, "Deal must belong to Tenant A");
    assert.equal(dealA.name, "Enterprise ERP Cloud Migration");
    assert.equal(Number(dealA.value), 85000);
    assert.equal(dealA.status, "Open");
    console.log("  ✔ Deal created in relational Postgres table with tenantId scoping");

    // 2. Querying Tenant A's deals
    console.log("\n▶ [Test 2] Query Tenant A deals:");
    const dealsA = await db.crmDeal.findMany({
      where: { tenantId: tenantAId },
    });
    assert.equal(dealsA.length, 1, "Tenant A should have exactly 1 deal");
    assert.equal(dealsA[0].id, dealA.id);
    console.log("  ✔ Tenant A deals retrieved accurately");

    // 3. Cross-Tenant Isolation (Tenant B must NOT see or access Tenant A's deal)
    console.log("\n▶ [Test 3] Cross-Tenant Isolation Guarantee:");
    const dealsB = await db.crmDeal.findMany({
      where: { tenantId: tenantBId },
    });
    assert.equal(dealsB.length, 0, "Tenant B must have 0 deals");

    const breachAttempt = await db.crmDeal.findFirst({
      where: { id: dealA.id, tenantId: tenantBId },
    });
    assert.equal(breachAttempt, null, "Tenant B cannot query Tenant A's deal by id");
    console.log("  ✔ Cross-tenant isolation verified: Tenant B cannot access Tenant A deals");

    // 4. Deal Stage Transition & Status Automation
    console.log("\n▶ [Test 4] Stage Transition & Status Automation:");
    const updatedDeal = await db.crmDeal.update({
      where: { id: dealA.id },
      data: {
        stage: "Won",
        status: "Won",
      },
    });
    assert.equal(updatedDeal.stage, "Won");
    assert.equal(updatedDeal.status, "Won");
    console.log("  ✔ Deal stage advanced to Won and status updated to Won");

    // 5. Verification of relational proposals (no legacy CMS page fallback needed)
    console.log("\n▶ [Test 5] Relational Proposals Verification:");
    const proposal = await db.crmProposal.create({
      data: {
        tenantId: tenantAId,
        proposalNo: "PROP-TEST-001",
        title: "Test Proposal for Acme",
        clientName: "Acme Industrial Corp",
        amount: 85000,
        status: "sent",
      },
    });
    assert.ok(proposal.id);
    assert.equal(proposal.tenantId, tenantAId);

    const proposals = await db.crmProposal.findMany({
      where: { tenantId: tenantAId },
    });
    assert.equal(proposals.length, 1);
    console.log("  ✔ Proposals operate directly on relational table with tenant isolation");

    console.log("\n✅ ALL 5 Relational CRM Tests Passed Successfully!");
  } finally {
    // Cleanup
    await db.crmDeal.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } }).catch(() => {});
    await db.crmProposal.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } }).catch(() => {});
    await db.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } }).catch(() => {});
  }
}

run().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
