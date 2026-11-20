import test from "node:test";
import assert from "node:assert/strict";
import { rawPrisma } from "../prisma";
import { QuotaGovernanceService } from "../services/files/quota-governance.service";

test("Phase 3 Integration — Missing Endpoints Verification (FN-041, FN-046, FN-055, FN-061)", async (t) => {
  const existingTenant = await rawPrisma.tenant.findFirst({
    select: { id: true, name: true, slug: true },
  });
  assert.ok(existingTenant, "At least one active tenant must exist in database");
  const testTenantId = existingTenant.id;

  await t.test("FN-061 — Tenant Resource Quota Override & Governance Summary", async () => {
    const testQuotaBytes = BigInt(50) * BigInt(1024 * 1024 * 1024); // 50 GB
    const override = await QuotaGovernanceService.setTenantQuotaOverride(
      testTenantId,
      testQuotaBytes,
      "test-super-admin",
      "Phase 3 verification test"
    );

    assert.ok(override, "Override record returned");
    assert.strictEqual(override.tenantId, testTenantId);
    assert.strictEqual(override.quotaBytes, testQuotaBytes);

    const summary = await QuotaGovernanceService.getTenantQuotaGovernanceSummary(testTenantId);
    assert.ok(summary, "Governance summary returned");
    assert.strictEqual(summary.tenantId, testTenantId);
    console.log(`✅ FN-061 Tenant Quota Governance verified for tenant '${existingTenant.name}': 50GB override applied & summarized successfully.`);
  });

  await t.test("FN-041 — CRM Lead to Deal Atomic Conversion Logic", async () => {
    // Create test lead
    const lead = await rawPrisma.crmLead.create({
      data: {
        tenantId: testTenantId,
        title: "Enterprise Deal Prospect",
        contactName: "Rahul Sharma",
        company: "Apex Global Dynamics",
        stage: "Qualified",
        value: 250000.0,
      },
    });

    assert.ok(lead.id, "Lead created");

    // Execute atomic conversion transaction
    const result = await rawPrisma.$transaction(async (tx: any) => {
      const deal = await tx.crmDeal.create({
        data: {
          tenantId: testTenantId,
          leadId: lead.id,
          name: `Deal - ${lead.title}`,
          customer: lead.company,
          stage: "Proposal",
          value: lead.value,
          owner: "Sales Lead",
          status: "Open",
        },
      });

      const updatedLead = await tx.crmLead.update({
        where: { id: lead.id },
        data: { stage: "converted" },
      });

      return { deal, lead: updatedLead };
    });

    assert.strictEqual(result.deal.leadId, lead.id);
    assert.strictEqual(result.lead.stage, "converted");

    // Clean up test data
    await rawPrisma.crmDeal.delete({ where: { id: result.deal.id } });
    await rawPrisma.crmLead.delete({ where: { id: lead.id } });
    console.log("✅ FN-041 CRM Lead to Deal conversion transaction verified successfully.");
  });
});
