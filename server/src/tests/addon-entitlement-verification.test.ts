import test from "node:test";
import assert from "node:assert/strict";
import { rawPrisma } from "../prisma";
import { UnifiedCatalogService, CANONICAL_CATALOG_REGISTRY } from "../services/unified-catalog.service";
import { checkTenantEntitlement } from "../middleware/entitlements";

test("Phase 5 — Modular Add-on Architecture & Entitlement Verification", async (t) => {
  const existingTenant = await rawPrisma.tenant.findFirst({
    select: { id: true, name: true, slug: true },
  });
  assert.ok(existingTenant, "Tenant must exist");
  const tenantId = existingTenant.id;

  await t.test("Catalog Registry — Canonical Add-on Definitions & Parity", async () => {
    assert.ok(CANONICAL_CATALOG_REGISTRY.length >= 50, "At least 50 canonical catalog products defined");
    const addons = CANONICAL_CATALOG_REGISTRY.filter((p) => p.targetEngine === "addon");
    assert.ok(addons.length >= 40, "At least 40 add-on templates present in registry");

    const sampleAddon = addons.find((a) => a.slug === "asset-management" || a.slug === "biometric-sync");
    assert.ok(sampleAddon, "Key add-on exists in canonical registry");
    assert.ok(sampleAddon.name && sampleAddon.category, "Addon has name and category metadata");
    console.log(`✅ Canonical catalog verified: ${CANONICAL_CATALOG_REGISTRY.length} products (${addons.length} add-ons).`);
  });

  await t.test("Database Persistence — ensureCanonicalAddonsInDb Synchronization", async () => {
    await UnifiedCatalogService.ensureCanonicalAddonsInDb();
    const count = await rawPrisma.addon.count();
    assert.ok(count >= 50, `Expected at least 50 Addon rows in DB, found ${count}`);
    console.log(`✅ Database Addon table synced: ${count} verified records.`);
  });

  await t.test("Entitlement Gating — Active Grant vs Revocation", async () => {
    const testAddonSlug = "biometric-sync";

    // 1. Grant entitlement to tenant
    await rawPrisma.tenantAddon.upsert({
      where: { tenantId_addonSlug: { tenantId, addonSlug: testAddonSlug } },
      create: {
        tenantId,
        addonSlug: testAddonSlug,
        status: "active",
        plan: "standard",
      },
      update: {
        status: "active",
      },
    });

    const activeCheck = await checkTenantEntitlement(tenantId, testAddonSlug);
    assert.strictEqual(activeCheck.entitled, true, "Tenant should be entitled when active");

    // 2. Suspend/disable entitlement
    await rawPrisma.tenantAddon.update({
      where: { tenantId_addonSlug: { tenantId, addonSlug: testAddonSlug } },
      data: { status: "disabled" },
    });

    const disabledCheck = await checkTenantEntitlement(tenantId, testAddonSlug);
    assert.strictEqual(disabledCheck.entitled, false, "Tenant should NOT be entitled when disabled");

    // Restore to active
    await rawPrisma.tenantAddon.update({
      where: { tenantId_addonSlug: { tenantId, addonSlug: testAddonSlug } },
      data: { status: "active" },
    });
    console.log("✅ Entitlement gating verified: active/disabled state transitions enforced correctly.");
  });
});
