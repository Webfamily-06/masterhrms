import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import { prisma, rawPrisma } from "../prisma";
import { addonsRouter } from "../routes/addons.routes";
import { woocommerceRouter } from "../routes/woocommerce.routes";
import { shopifyRouter } from "../routes/shopify.routes";
import { ecommerceRouter } from "../routes/ecommerce.routes";
import { UnifiedCatalogService } from "../services/unified-catalog.service";
import { checkTenantEntitlement } from "../middleware/entitlements";
import { generateToken } from "../lib/jwt";
import {
  checkEntitlementByKey,
  ROUTE_ENTITLEMENT_MAP,
  ADDON_ALIASES,
} from "../../../src/lib/navigation-resolver";

const db = rawPrisma || prisma;

describe("MASTERHRMS — E-Commerce Add-On Migration & Strict Installation-Based Access Control", { timeout: 30000 }, () => {
  const timestamp = Date.now();
  const testTenantAlphaId = `tenant-ecom-alpha-${timestamp}`;
  const testTenantBetaId = `tenant-ecom-beta-${timestamp}`;
  const testAlphaAdminId = `usr-ecom-alpha-${timestamp}`;
  const testBetaAdminId = `usr-ecom-beta-${timestamp}`;

  let alphaAdminToken: string;
  let betaAdminToken: string;

  let testApp: express.Application;
  let httpServer: http.Server;
  let baseUrl: string;

  async function apiFetch(
    urlPath: string,
    options: {
      method?: string;
      token?: string;
      body?: any;
    } = {}
  ): Promise<{ status: number; body: any }> {
    const res = await fetch(`${baseUrl}${urlPath}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    let body: any;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { status: res.status, body };
  }

  beforeAll(async () => {
    // 1. Provision Test Tenants and Admin Users
    await db.tenant.createMany({
      data: [
        {
          id: testTenantAlphaId,
          name: "Alpha Retailers",
          slug: `alpha-retail-${timestamp}`,
        },
        {
          id: testTenantBetaId,
          name: "Beta Boutiques",
          slug: `beta-boutique-${timestamp}`,
        },
      ],
      skipDuplicates: true,
    });

    await db.user.create({
      data: {
        id: testAlphaAdminId,
        email: `admin.alpha.${timestamp}@example.com`,
        passwordHash: "hash123",
        roles: { create: [{ role: "hr_admin" }] },
        profile: { create: { fullName: "Alpha Admin", tenantId: testTenantAlphaId } },
      },
    });

    await db.user.create({
      data: {
        id: testBetaAdminId,
        email: `admin.beta.${timestamp}@example.com`,
        passwordHash: "hash123",
        roles: { create: [{ role: "hr_admin" }] },
        profile: { create: { fullName: "Beta Admin", tenantId: testTenantBetaId } },
      },
    });

    alphaAdminToken = generateToken({
      userId: testAlphaAdminId,
      email: `admin.alpha.${timestamp}@example.com`,
      role: "admin",
      roles: ["hr_admin"],
      tenantId: testTenantAlphaId,
    });

    betaAdminToken = generateToken({
      userId: testBetaAdminId,
      email: `admin.beta.${timestamp}@example.com`,
      role: "admin",
      roles: ["hr_admin"],
      tenantId: testTenantBetaId,
    });

    // 2. Setup Express test server with live routers
    testApp = express();
    testApp.use(express.json());

    testApp.use("/api/addons", addonsRouter);
    testApp.use("/api/woocommerce", woocommerceRouter);
    testApp.use("/api/shopify", shopifyRouter);
    testApp.use("/api/ecommerce", ecommerceRouter);

    await new Promise<void>((resolve) => {
      httpServer = testApp.listen(0, "127.0.0.1", () => {
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
    await db.tenantAddon.deleteMany({
      where: { tenantId: { in: [testTenantAlphaId, testTenantBetaId] } },
    });
    await db.tenantModule.deleteMany({
      where: { tenantId: { in: [testTenantAlphaId, testTenantBetaId] } },
    });
    await db.userRole.deleteMany({
      where: { userId: { in: [testAlphaAdminId, testBetaAdminId] } },
    });
    await db.profile.deleteMany({
      where: { userId: { in: [testAlphaAdminId, testBetaAdminId] } },
    });
    await db.user.deleteMany({
      where: { id: { in: [testAlphaAdminId, testBetaAdminId] } },
    });
    await db.tenant.deleteMany({
      where: { id: { in: [testTenantAlphaId, testTenantBetaId] } },
    });
  });

  // ─── Test 1: Canonical Catalog & Database Seeding ───────────────────────────
  it("seeds and normalizes WooCommerce and Shopify add-ons under E-Commerce category", async () => {
    await UnifiedCatalogService.ensureCanonicalAddonsInDb();

    const dbAddons = await db.addon.findMany({
      where: {
        slug: { in: ["woocommerce-sync", "woocommerce-hub", "shopify-sync"] },
      },
    });

    expect(dbAddons.length).toBeGreaterThanOrEqual(3);
    for (const addon of dbAddons) {
      expect(addon.category).toBe("E-Commerce");
      expect(addon.status).toBe("active");
    }

    const catalog = await UnifiedCatalogService.getCatalog({
      tenantId: testTenantAlphaId,
      category: "E-Commerce",
    });

    const slugs = catalog.products.map((p) => p.slug);
    expect(slugs).toContain("woocommerce-sync");
    expect(slugs).toContain("woocommerce-hub");
    expect(slugs).toContain("shopify-sync");

    for (const prod of catalog.products) {
      expect(prod.category).toBe("E-Commerce");
      expect(prod.eligibility?.isInstalled).toBe(false);
      expect(prod.eligibility?.isFree).toBe(true);
      expect(prod.eligibility?.allowedAction).toBe("install");
    }
  });

  // ─── Test 2: Route Entitlement Navigation Resolver Mappings ──────────────────
  it("resolves route entitlement map and aliases correctly for e-commerce routes", () => {
    expect(ROUTE_ENTITLEMENT_MAP["/integrations"]).toBe("woocommerce-sync");
    expect(ROUTE_ENTITLEMENT_MAP["/shopify"]).toBe("shopify-sync");

    expect(ADDON_ALIASES["woocommerce-hub"]).toContain("woocommerce-sync");
    expect(ADDON_ALIASES["woocommerce-sync"]).toContain("woocommerce-hub");
    expect(ADDON_ALIASES["shopify-sync"]).toContain("shopify");

    const unentitledContext = {
      tenantId: "tenant-mock",
      isSuperAdmin: false,
      isWorkspaceAdmin: true,
      roles: ["admin"],
      permissions: [],
      activeAddons: [],
      enabledModules: ["hrms"],
      serverEntitlements: {},
      isLoading: false,
      isError: false,
    };
    expect(checkEntitlementByKey("woocommerce-sync", unentitledContext)).toBe(false);
    expect(checkEntitlementByKey("woocommerce-hub", unentitledContext)).toBe(false);
    expect(checkEntitlementByKey("shopify-sync", unentitledContext)).toBe(false);

    const entitledContext = {
      tenantId: "tenant-mock",
      isSuperAdmin: false,
      isWorkspaceAdmin: true,
      roles: ["admin"],
      permissions: [],
      activeAddons: ["woocommerce-sync"],
      enabledModules: ["hrms", "woocommerce-sync"],
      serverEntitlements: {},
      isLoading: false,
      isError: false,
    };
    expect(checkEntitlementByKey("woocommerce-sync", entitledContext)).toBe(true);
    expect(checkEntitlementByKey("woocommerce-hub", entitledContext)).toBe(true);
  });

  // ─── Test 3: Strict Backend Access Control (Denied When Uninstalled) ──────────
  it("strictly denies backend API access with 403 ADDON_REQUIRED when uninstalled", async () => {
    // WooCommerce endpoints
    const wooSettingsRes = await apiFetch("/api/woocommerce/settings", { token: alphaAdminToken });
    expect(wooSettingsRes.status).toBe(403);
    expect(wooSettingsRes.body.code).toBe("ADDON_REQUIRED");

    // Shopify endpoints
    const shopDashboardRes = await apiFetch("/api/shopify/dashboard", { token: alphaAdminToken });
    expect(shopDashboardRes.status).toBe(403);
    expect(shopDashboardRes.body.code).toBe("ADDON_REQUIRED");

    // eCommerce router endpoints
    const ecomStatusRes = await apiFetch("/api/ecommerce/status", { token: alphaAdminToken });
    expect(ecomStatusRes.status).toBe(403);
    expect(ecomStatusRes.body.code).toBe("ADDON_REQUIRED");

    const ecomSyncWooRes = await apiFetch("/api/ecommerce/sync/woocommerce", {
      method: "POST",
      token: alphaAdminToken,
    });
    expect(ecomSyncWooRes.status).toBe(403);
    expect(ecomSyncWooRes.body.code).toBe("ADDON_REQUIRED");

    const ecomSyncShopRes = await apiFetch("/api/ecommerce/sync/shopify", {
      method: "POST",
      token: alphaAdminToken,
    });
    expect(ecomSyncShopRes.status).toBe(403);
    expect(ecomSyncShopRes.body.code).toBe("ADDON_REQUIRED");
  });

  // ─── Test 4: Idempotent Free Installation ─────────────────────────────────────
  it("installs WooCommerce and Shopify add-ons idempotently without payment order", async () => {
    const installWoo1 = await apiFetch("/api/addons/woocommerce-sync/install", {
      method: "POST",
      token: alphaAdminToken,
    });
    expect(installWoo1.status).toBe(200);
    expect(installWoo1.body.success).toBe(true);

    // Idempotent repeat call
    const installWoo2 = await apiFetch("/api/addons/woocommerce-sync/install", {
      method: "POST",
      token: alphaAdminToken,
    });
    expect(installWoo2.status).toBe(200);
    expect(installWoo2.body.success).toBe(true);

    const installShop = await apiFetch("/api/addons/shopify-sync/install", {
      method: "POST",
      token: alphaAdminToken,
    });
    expect(installShop.status).toBe(200);
    expect(installShop.body.success).toBe(true);

    // Verify entitlements in DB
    const alphaAddons = await db.tenantAddon.findMany({
      where: { tenantId: testTenantAlphaId, status: "active" },
    });
    const alphaSlugs = alphaAddons.map((a) => a.addonSlug);
    expect(alphaSlugs).toContain("woocommerce-sync");
    expect(alphaSlugs).toContain("shopify-sync");
  });

  // ─── Test 5: Permitted Access When Installed ──────────────────────────────────
  it("allows access to protected APIs once add-ons are installed and active", async () => {
    const wooSettingsRes = await apiFetch("/api/woocommerce/settings", { token: alphaAdminToken });
    expect(wooSettingsRes.status).toBe(200);
    expect(wooSettingsRes.body.ok).toBe(true);

    const shopDashboardRes = await apiFetch("/api/shopify/dashboard", { token: alphaAdminToken });
    expect(shopDashboardRes.status).toBe(200);
    expect(shopDashboardRes.body.ok).toBe(true);

    const ecomStatusRes = await apiFetch("/api/ecommerce/status", { token: alphaAdminToken });
    expect(ecomStatusRes.status).toBe(200);
    expect(ecomStatusRes.body.success).toBe(true);
    expect(ecomStatusRes.body.channels.wooCommerce.isEntitled).toBe(true);
    expect(ecomStatusRes.body.channels.shopify.isEntitled).toBe(true);
  });

  // ─── Test 6: Dynamic Disable and Enable Lifecycle ─────────────────────────────
  it("revokes access immediately when disabled and restores access when enabled", async () => {
    const disableRes = await apiFetch("/api/addons/woocommerce-sync/disable", {
      method: "POST",
      token: alphaAdminToken,
    });
    expect(disableRes.status).toBe(200);
    expect(disableRes.body.success).toBe(true);

    // Access must now be rejected
    const wooSettingsAfterDisable = await apiFetch("/api/woocommerce/settings", {
      token: alphaAdminToken,
    });
    expect(wooSettingsAfterDisable.status).toBe(403);
    expect(wooSettingsAfterDisable.body.code).toBe("ADDON_REQUIRED");

    // Re-enable
    const enableRes = await apiFetch("/api/addons/woocommerce-sync/enable", {
      method: "POST",
      token: alphaAdminToken,
    });
    expect(enableRes.status).toBe(200);
    expect(enableRes.body.success).toBe(true);

    // Access must now be restored
    const wooSettingsAfterEnable = await apiFetch("/api/woocommerce/settings", {
      token: alphaAdminToken,
    });
    expect(wooSettingsAfterEnable.status).toBe(200);
    expect(wooSettingsAfterEnable.body.ok).toBe(true);
  });

  // ─── Test 7: Strict Cross-Tenant Isolation ────────────────────────────────────
  it("strictly enforces tenant isolation: Tenant B remains denied even when Tenant A is active", async () => {
    const betaWooRes = await apiFetch("/api/woocommerce/settings", { token: betaAdminToken });
    expect(betaWooRes.status).toBe(403);
    expect(betaWooRes.body.code).toBe("ADDON_REQUIRED");

    const betaShopRes = await apiFetch("/api/shopify/dashboard", { token: betaAdminToken });
    expect(betaShopRes.status).toBe(403);
    expect(betaShopRes.body.code).toBe("ADDON_REQUIRED");

    const betaEcomStatus = await apiFetch("/api/ecommerce/status", { token: betaAdminToken });
    expect(betaEcomStatus.status).toBe(403);
    expect(betaEcomStatus.body.code).toBe("ADDON_REQUIRED");
  });
});
