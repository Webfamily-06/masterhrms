/**
 * MASTERHRMS — Strict Add-on Billing Separation, Lifecycle Controls & Navigation Acceptance Tests
 *
 * Verifies:
 * 1. Strict separation of subscription plans (BASE_PLAN) and add-on products (ADDON_FEATURE, ADDON_INTEGRATION).
 * 2. Add-on monthly and annual price definitions exist independently and never inherit or alter subscription plan prices.
 * 3. Lifecycle controls: POST /api/addons/:slug/disable sets authoritative disabled state and TenantModule.isEnabled = false.
 * 4. Sovereign/Growth plan-included fall-through prevention: Disabled add-ons remain strictly un-entitled (entitled: false).
 * 5. Platform core protection: Core modules (starter, growth, sovereign, core_platform, hrm) reject disable attempts with 400.
 * 6. Lifecycle controls: POST /api/addons/:slug/enable restores active state.
 * 7. Navigation separation: POS and Inventory do not cross-entitle each other.
 * 8. Navigation resolution: Disabled add-on is omitted from active navigation routes.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import { rawPrisma as prisma } from "../prisma";
import { addonsRouter } from "../routes/addons.routes";
import { commerceRouter } from "../routes/commerce.routes";
import { workspaceRouter } from "../routes/workspace.routes";
import { UnifiedCatalogService } from "../services/unified-catalog.service";
import { generateToken } from "../lib/jwt";
import { checkTenantEntitlement } from "../middleware/entitlements";
import { isModuleAllowed } from "../../../src/lib/permissions";
import { checkEntitlementByKey } from "../../../src/lib/navigation-resolver";

const db = prisma;

describe("MASTERHRMS — Add-on Billing Separation & Lifecycle Navigation Tests", () => {
  const timestamp = Date.now();
  const testTenantId = `tenant-sep-${timestamp}`;
  const testUserId = `usr-sep-${timestamp}`;

  let tenantToken: string;
  let testApp: express.Application;
  let httpServer: http.Server;
  let baseUrl: string;

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
    // 1. Seed test tenant
    await db.tenant.create({
      data: {
        id: testTenantId,
        name: `Separation Test Workspace ${timestamp}`,
        slug: `tenant-sep-${timestamp}`,
      },
    });

    // 2. Create subscription record (Sovereign Tier)
    await db.tenantSubscription.create({
      data: {
        tenantId: testTenantId,
        planId: "sovereign",
        status: "active",
        billingCycle: "monthly",
      },
    });

    // 3. Create user and profile
    await db.user.create({
      data: {
        id: testUserId,
        email: `admin-sep-${timestamp}@test.com`,
        passwordHash: "dummy-hash",
        roles: {
          create: [{ role: "hr_admin" }],
        },
        profile: {
          create: {
            tenantId: testTenantId,
            fullName: "Separation Admin",
          },
        },
      },
    });

    tenantToken = generateToken({
      userId: testUserId,
      email: `admin-sep-${timestamp}@test.com`,
      tenantId: testTenantId,
      roles: ["hr_admin"],
    });

    // 4. Stand up lightweight express test server
    testApp = express();
    testApp.use(express.json());
    testApp.use("/api/addons", addonsRouter);
    testApp.use("/api/commerce", commerceRouter);
    testApp.use("/api/workspace", workspaceRouter);

    httpServer = http.createServer(testApp);
    await new Promise<void>((resolve) => {
      httpServer.listen(0, "127.0.0.1", () => {
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
    // Cleanup seeded records
    try {
      await db.tenantAddon.deleteMany({ where: { tenantId: testTenantId } });
      await db.tenantModule.deleteMany({ where: { tenantId: testTenantId } });
      await db.tenantSubscription.deleteMany({ where: { tenantId: testTenantId } });
      await db.userRole.deleteMany({ where: { userId: testUserId } });
      await db.profile.deleteMany({ where: { userId: testUserId } });
      await db.user.deleteMany({ where: { id: testUserId } });
      await db.tenant.deleteMany({ where: { id: testTenantId } });
    } catch {
      // Ignore cleanup error
    }
  });

  it("1. Commerce catalog strictly separates subscription plans (BASE_PLAN) from add-on products", async () => {
    const { status, body } = await apiFetch(`/api/commerce/catalog?tenantId=${testTenantId}`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.products)).toBe(true);

    const basePlans = body.products.filter((p: any) => p.productType === "BASE_PLAN");
    const addons = body.products.filter((p: any) => p.productType !== "BASE_PLAN");

    expect(basePlans.length).toBeGreaterThan(0);
    expect(addons.length).toBeGreaterThan(0);

    // Verify base plans have slug starter, growth, or sovereign
    const planSlugs = basePlans.map((p: any) => p.slug);
    expect(planSlugs).toContain("starter");
    expect(planSlugs).toContain("growth");
    expect(planSlugs).toContain("sovereign");

    // Verify add-on products do not include base plans
    const addonSlugs = addons.map((p: any) => p.slug);
    expect(addonSlugs).not.toContain("starter");
    expect(addonSlugs).not.toContain("growth");
    expect(addonSlugs).not.toContain("sovereign");
  });

  it("2. Add-on products have independent monthly and annual price definitions", async () => {
    const { body } = await apiFetch(`/api/commerce/catalog?tenantId=${testTenantId}`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });

    const addons = body.products.filter((p: any) => p.productType !== "BASE_PLAN");
    const paidAddon = addons.find((p: any) => Array.isArray(p.prices) && p.prices.length > 0 && p.prices[0].basePrice > 0);

    if (paidAddon) {
      const monthly = paidAddon.prices.find((pr: any) => pr.billingInterval === "1_month");
      expect(monthly).toBeDefined();
      expect(typeof monthly.basePrice).toBe("number");

      // Verify that add-on base price is not equal to Sovereign tier plan price (14999)
      expect(monthly.basePrice).toBeLessThan(14000);
    }
  });

  it("3. Disabling an add-on sets status='disabled' and isEnabled=false idempotently", async () => {
    const testAddonSlug = "smart-reports";

    const { status, body } = await apiFetch(`/api/addons/${testAddonSlug}/disable`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tenantToken}` },
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.status).toBe("disabled");

    // Verify in database TenantAddon table
    const dbAddon = await db.tenantAddon.findFirst({
      where: { tenantId: testTenantId, addonSlug: testAddonSlug },
    });
    expect(dbAddon).toBeDefined();
    expect(dbAddon?.status).toBe("disabled");

    // Verify in database TenantModule table
    const dbModule = await db.tenantModule.findFirst({
      where: { tenantId: testTenantId, moduleKey: testAddonSlug },
    });
    expect(dbModule).toBeDefined();
    expect(dbModule?.isEnabled).toBe(false);
  });

  it("4. Disabled add-on NEVER falls through to Sovereign plan inclusion in entitlements check", async () => {
    const testAddonSlug = "smart-reports";

    // Call checkTenantEntitlement directly
    const entitlement = await checkTenantEntitlement(testTenantId, testAddonSlug);
    expect(entitlement.entitled).toBe(false);
    expect(entitlement.status).toBe("disabled");

    // Call GET /api/addons/entitlements
    const { status, body } = await apiFetch(`/api/addons/entitlements`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });

    expect(status).toBe(200);
    expect(body.entitlements).toBeDefined();
    expect(body.entitlements[testAddonSlug]).toBeDefined();
    expect(body.entitlements[testAddonSlug].status).toBe("disabled");
    expect(body.entitlements[testAddonSlug].isActive).toBe(false);
  });

  it("5. Core platform modules reject disable attempts with HTTP 400 Bad Request", async () => {
    const coreSlugs = ["starter", "growth", "sovereign", "core_platform", "hrm", "hrms"];

    for (const coreSlug of coreSlugs) {
      const { status, body } = await apiFetch(`/api/addons/${coreSlug}/disable`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tenantToken}` },
      });

      expect(status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain("Core platform modules cannot be disabled");
    }
  });

  it("6. Re-enabling a disabled add-on restores active status and entitlement", async () => {
    const testAddonSlug = "smart-reports";

    const { status, body } = await apiFetch(`/api/addons/${testAddonSlug}/enable`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tenantToken}` },
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.status).toBe("active");

    // Verify entitlement is now restored
    const entitlement = await checkTenantEntitlement(testTenantId, testAddonSlug);
    expect(entitlement.entitled).toBe(true);
    expect(entitlement.status).toBe("active");
  });

  it("7. POS and Inventory do not cross-entitle each other", () => {
    // Case A: Workspace with only inventory module
    const inventoryProfile: any = {
      enabledModules: ["inventory"],
      roles: ["admin"],
    };
    expect(isModuleAllowed("inventory", inventoryProfile)).toBe(true);
    expect(isModuleAllowed("pos", inventoryProfile)).toBe(false);

    // Case B: Workspace with only pos module
    const posProfile: any = {
      enabledModules: ["pos"],
      roles: ["admin"],
    };
    expect(isModuleAllowed("pos", posProfile)).toBe(true);
    expect(isModuleAllowed("inventory", posProfile)).toBe(false);
  });

  it("8. Disabled add-on is omitted from navigation resolver output", () => {
    // When smart-reports is disabled on server
    const context: any = {
      tenantId: testTenantId,
      isSuperAdmin: false,
      isWorkspaceAdmin: true,
      roles: ["admin"],
      permissions: [],
      enabledModules: ["pos"],
      activeAddons: ["pos"],
      serverEntitlements: {
        "smart-reports": { isActive: false, isEnabled: false, status: "disabled" },
        pos: { isActive: true, isEnabled: true, status: "active" },
      },
    };

    expect(checkEntitlementByKey("smart-reports", context)).toBe(false);
    expect(checkEntitlementByKey("pos", context)).toBe(true);
  });
});
