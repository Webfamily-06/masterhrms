/**
 * MASTERHRMS — Phase A4.2.1 Marketplace Data Provenance & Add-on Detail Page Verification Suite
 *
 * Verifies:
 * 1. Authoritative public detail endpoint GET /api/cms/addons/:slug returns the exact database record.
 * 2. Unknown slugs return HTTP 404 NOT_FOUND.
 * 3. Draft/archived add-ons remain hidden from public catalog and detail endpoints.
 * 4. Image provenance: Uploaded icon vs neutral Lucide icon string preserved accurately.
 * 5. Screenshots array correctly handles empty/null states without producing broken data.
 * 6. Commerce catalog GET /api/commerce/catalog reflects authoritative prices, currency (INR), and bridged marketing metadata.
 * 7. Category reconciliation between DB Addon categories and canonical catalog registry.
 * 8. Product type discrimination: Base plans vs standalone ERP modules vs add-on extensions.
 * 9. Tenant entitlement evaluation and ownership flags remain preserved.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import { prisma, rawPrisma } from "../prisma";
import { cmsRouter } from "../routes/cms.routes";
import { commerceRouter } from "../routes/commerce.routes";
import { superRouter } from "../routes/super.routes";
import { UnifiedCatalogService } from "../services/unified-catalog.service";
import { generateToken } from "../lib/jwt";

const db = rawPrisma || prisma;

describe("MASTERHRMS — Phase A4.2.1 Marketplace Data Provenance & Detail Page Suite", () => {
  const timestamp = Date.now();
  const testSuperAdminId = `usr-super-a421-${timestamp}`;
  const testTenantId = `tenant-a421-${timestamp}`;
  const testUserId = `usr-tenant-a421-${timestamp}`;

  let superAdminToken: string;
  let tenantUserToken: string;

  let testApp: express.Application;
  let httpServer: http.Server;
  let baseUrl: string;

  // Track created add-ons for clean-up
  const createdAddonSlugs: string[] = [];

  async function apiFetch(
    endpoint: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: any;
    } = {}
  ): Promise<{ status: number; body: any }> {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const body = await res.json().catch(() => null);
    return { status: res.status, body };
  }

  beforeAll(async () => {
    // 1. Create Super Admin User & Roles
    await db.user.create({
      data: {
        id: testSuperAdminId,
        email: `super-a421-${timestamp}@masterhrms.test`,
        passwordHash: "mock-hash",
        roles: {
          create: [{ role: "super_admin" }],
        },
      },
    });

    superAdminToken = generateToken({
      userId: testSuperAdminId,
      email: `super-a421-${timestamp}@masterhrms.test`,
      roles: ["super_admin"],
    });

    // 2. Create Test Tenant & Tenant User
    await db.tenant.create({
      data: {
        id: testTenantId,
        name: `A4.2.1 Test Workspace ${timestamp}`,
        slug: `test-a421-${timestamp}`,
      },
    });

    await db.user.create({
      data: {
        id: testUserId,
        email: `user-a421-${timestamp}@masterhrms.test`,
        passwordHash: "mock-hash",
        roles: {
          create: [{ role: "hr_admin" }],
        },
        profile: {
          create: {
            tenantId: testTenantId,
            fullName: "Tenant Admin",
          },
        },
      },
    });

    tenantUserToken = generateToken({
      userId: testUserId,
      email: `user-a421-${timestamp}@masterhrms.test`,
      tenantId: testTenantId,
      roles: ["admin"],
    });

    // 3. Mount Test Express Server
    testApp = express();
    testApp.use(express.json());
    testApp.use("/api/cms", cmsRouter);
    testApp.use("/api/commerce", commerceRouter);
    testApp.use("/api/super", superRouter);

    await new Promise<void>((resolve) => {
      httpServer = testApp.listen(0, () => {
        const addr = httpServer.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (httpServer) {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    }

    // Clean up created test add-ons (only delete test-specific addons, preserving seeded database records)
    await db.tenantAddon.deleteMany({ where: { tenantId: testTenantId } });
    if (createdAddonSlugs.length > 0) {
      await db.addon.deleteMany({ where: { slug: { in: createdAddonSlugs } } });
    }

    // Clean up test users & tenant
    await db.userRole.deleteMany({ where: { userId: { in: [testSuperAdminId, testUserId] } } });
    await db.profile.deleteMany({ where: { userId: testUserId } });
    await db.user.deleteMany({ where: { id: { in: [testSuperAdminId, testUserId] } } });
    await db.tenant.deleteMany({ where: { id: testTenantId } });
  });

  // =========================================================================
  // TEST GROUP 1: Public Detail Page API GET /api/cms/addons/:slug
  // =========================================================================
  describe("Group 1: Authoritative Public Detail Endpoint", () => {
    it("fetches the correct add-on for a valid published slug with exact persisted fields", async () => {
      const res = await apiFetch("/api/cms/addons/whatsapp-alerts");
      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
      expect(res.body.slug).toBe("whatsapp-alerts");
      expect(res.body.name).toBe("WhatsApp Business Automations");
      expect(res.body.status).toBe("active");
      expect(res.body.price_monthly).toBe(49);
      expect(res.body.icon).toBe("MessageSquare");
      expect(Array.isArray(res.body.features)).toBe(true);
      expect(res.body.features.length).toBeGreaterThan(0);
      expect(Array.isArray(res.body.screenshots)).toBe(true);
    });

    it("returns 404 NOT_FOUND for an unknown slug", async () => {
      const res = await apiFetch(`/api/cms/addons/non-existent-addon-${Date.now()}`);
      expect(res.status).toBe(404);
      expect(res.body.code).toBe("NOT_FOUND");
      expect(res.body.error).toContain("Addon not found");
    });

    it("does not expose draft add-ons on the public detail endpoint", async () => {
      const draftSlug = `draft-addon-${timestamp}`;
      createdAddonSlugs.push(draftSlug);

      await db.addon.create({
        data: {
          name: "Confidential Beta Add-on",
          slug: draftSlug,
          category: "Security",
          status: "draft",
          priceMonthly: 199,
          description: "Internal beta only",
        },
      });

      // Public detail endpoint should return 404 for draft addons
      const res = await apiFetch(`/api/cms/addons/${draftSlug}`);
      expect(res.status).toBe(404);
      expect(res.body.code).toBe("NOT_FOUND");

      // Public list endpoint should not include the draft addon
      const listRes = await apiFetch("/api/cms/addons");
      expect(listRes.status).toBe(200);
      const found = listRes.body.find((a: any) => a.slug === draftSlug);
      expect(found).toBeUndefined();
    });
  });

  // =========================================================================
  // TEST GROUP 2: Media Provenance & Fallback Data Integrity
  // =========================================================================
  describe("Group 2: Media Provenance & Icon Rendering", () => {
    it("preserves persisted uploaded media URL without string modification", async () => {
      const mediaSlug = `uploaded-icon-addon-${timestamp}`;
      createdAddonSlugs.push(mediaSlug);
      const uploadedIconUrl = `/uploads/addons/icons/${timestamp}-icon.png`;

      await db.addon.create({
        data: {
          name: "Addon With Uploaded Asset",
          slug: mediaSlug,
          category: "Integrations",
          status: "active",
          priceMonthly: 29,
          icon: uploadedIconUrl,
          screenshots: [`/uploads/addons/screenshots/${timestamp}-screen1.png`],
        },
      });

      const res = await apiFetch(`/api/cms/addons/${mediaSlug}`);
      expect(res.status).toBe(200);
      expect(res.body.icon).toBe(uploadedIconUrl);
      expect(res.body.screenshots).toEqual([`/uploads/addons/screenshots/${timestamp}-screen1.png`]);
    });

    it("handles null screenshots gracefully without returning null or breaking", async () => {
      const noMediaSlug = `no-media-addon-${timestamp}`;
      createdAddonSlugs.push(noMediaSlug);

      await db.addon.create({
        data: {
          name: "Addon Without Screenshots",
          slug: noMediaSlug,
          category: "Operations",
          status: "active",
          priceMonthly: 0,
          icon: "Cpu",
          screenshots: null,
        },
      });

      const res = await apiFetch(`/api/cms/addons/${noMediaSlug}`);
      expect(res.status).toBe(200);
      expect(res.body.icon).toBe("Cpu");
      expect(Array.isArray(res.body.screenshots)).toBe(true);
      expect(res.body.screenshots.length).toBe(0);
    });
  });

  // =========================================================================
  // TEST GROUP 3: Commerce Catalog Bridge & Data Provenance
  // =========================================================================
  describe("Group 3: Commerce Catalog Integration & Pricing Authority", () => {
    it("returns commercial products enriched with marketing metadata from prisma.addon", async () => {
      const res = await apiFetch("/api/commerce/catalog");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.currency).toBe("INR");
      expect(Array.isArray(res.body.products)).toBe(true);

      // Verify POS marketing enrichment
      const posProduct = res.body.products.find((p: any) => p.slug === "pos");
      expect(posProduct).toBeDefined();
      expect(posProduct.icon).toBe("Store");
      expect(posProduct.productType).toBe("STANDALONE_PRODUCT");
      expect(posProduct.targetEngine).toBe("module");
      expect(posProduct.prices[0].currency).toBe("INR");
      expect(posProduct.prices[0].basePrice).toBeGreaterThan(0);

      // Verify Biometric Sync marketing enrichment
      const bioProduct = res.body.products.find((p: any) => p.slug === "biometric-sync");
      expect(bioProduct).toBeDefined();
      expect(bioProduct.icon).toBe("Fingerprint");
      expect(bioProduct.category).toBe("Hardware");
      expect(bioProduct.productType).toBe("ADDON_FEATURE");
      expect(bioProduct.targetEngine).toBe("addon");
    });

    it("clearly segregates Base Subscription Plans from Standalone Modules and Add-ons", async () => {
      const res = await apiFetch("/api/commerce/catalog");
      expect(res.status).toBe(200);

      const products: any[] = res.body.products;
      const basePlans = products.filter((p) => p.productType === "BASE_PLAN");
      const standalone = products.filter((p) => p.productType === "STANDALONE_PRODUCT");
      const addOns = products.filter(
        (p) => p.productType === "ADDON_FEATURE" || p.productType === "ADDON_INTEGRATION"
      );

      expect(basePlans.length).toBe(4); // starter, growth, sovereign, custom-flex
      basePlans.forEach((plan) => {
        expect(plan.targetEngine).toBe("subscription");
      });

      expect(standalone.length).toBeGreaterThanOrEqual(3); // pos, crm, finance
      standalone.forEach((mod) => {
        expect(mod.targetEngine).toBe("module");
      });

      expect(addOns.length).toBeGreaterThanOrEqual(8);
      addOns.forEach((addon) => {
        expect(addon.targetEngine).toBe("addon");
      });
    });

    it("reconciles category filtering across marketing categories and canonical registry", async () => {
      // Hardware category should return biometric-sync (bridged from DB Addon category 'Hardware')
      const hardwareRes = await apiFetch("/api/commerce/catalog?category=Hardware");
      expect(hardwareRes.status).toBe(200);
      const bio = hardwareRes.body.products.find((p: any) => p.slug === "biometric-sync");
      expect(bio).toBeDefined();

      // Communication category should return whatsapp-alerts (bridged from DB Addon category 'Communication')
      const commRes = await apiFetch("/api/commerce/catalog?category=Communication");
      expect(commRes.status).toBe(200);
      const wa = commRes.body.products.find((p: any) => p.slug === "whatsapp-alerts");
      expect(wa).toBeDefined();
    });

    it("evaluates tenant entitlements accurately when authenticated tenantId is provided", async () => {
      // Grant biometric-sync to test tenant
      await db.tenantAddon.create({
        data: {
          tenantId: testTenantId,
          addonSlug: "biometric-sync",
          status: "active",
        },
      });

      const catalogWithTenant = await UnifiedCatalogService.getCatalog({ tenantId: testTenantId });
      const bio = catalogWithTenant.products.find((p) => p.slug === "biometric-sync");
      expect(bio).toBeDefined();
      expect(bio?.eligibility?.alreadyOwned).toBe(true);
      expect(bio?.eligibility?.eligible).toBe(false);

      const unowned = catalogWithTenant.products.find((p) => p.slug === "whatsapp-alerts");
      expect(unowned).toBeDefined();
      expect(unowned?.eligibility?.alreadyOwned).toBe(false);
      expect(unowned?.eligibility?.eligible).toBe(true);
    });
  });
});
