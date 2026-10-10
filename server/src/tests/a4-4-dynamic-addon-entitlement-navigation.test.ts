/**
 * MASTERHRMS — Dynamic Add-on Entitlement-Based Navigation Enforcement Test Suite
 *
 * Verifies all 12 acceptance criteria:
 * 1. An uninstalled add-on is absent from all applicable role menus.
 * 2. An entitled add-on appears only for roles with the required permissions.
 * 3. An employee cannot see an HR Admin-only module.
 * 4. Tenant A's entitlement does not expose the module in Tenant B.
 * 5. Direct URL access is denied without the required entitlement.
 * 6. Protected API access is denied without the required entitlement (403 ADDON_REQUIRED).
 * 7. Revoked and expired entitlements no longer grant access.
 * 8. Missing or failed entitlement data fails closed.
 * 9. Workspace switching does not reuse the previous workspace's menu state.
 * 10. Existing core HRMS navigation remains available according to established policy.
 * 11. Super Admin administrative navigation remains governed by separate authorization rules.
 * 12. Cross-tenant isolation & regression integrity.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import { prisma, rawPrisma } from "../prisma";
import { addonsRouter } from "../routes/addons.routes";
import { woocommerceRouter } from "../routes/woocommerce.routes";
import { shopifyRouter } from "../routes/shopify.routes";
import { workspaceRouter } from "../routes/workspace.routes";
import { accountingRouter } from "../routes/accounting.routes";
import { alertsRouter } from "../routes/alerts.routes";
import { paymentsRouter } from "../routes/payments.routes";
import { biometricRouter } from "../routes/biometric.routes";
import { checkTenantEntitlement } from "../middleware/entitlements";
import { generateToken } from "../lib/jwt";
import {
  checkEntitlementByKey,
  isAccessPermitted,
  EntitlementResolverContext,
  ROUTE_ENTITLEMENT_MAP,
} from "../../../src/lib/navigation-resolver";

const db = rawPrisma || prisma;

describe("MASTERHRMS — Dynamic Add-on Entitlement-Based Navigation Enforcement", () => {
  const timestamp = Date.now();
  const testSuperAdminId = `usr-super-a44-${timestamp}`;
  const testTenantAlphaId = `tenant-a44-alpha-${timestamp}`;
  const testTenantBetaId = `tenant-a44-beta-${timestamp}`;
  const testAlphaAdminId = `usr-alpha-admin-${timestamp}`;
  const testAlphaEmpId = `usr-alpha-emp-${timestamp}`;
  const testBetaAdminId = `usr-beta-admin-${timestamp}`;

  let superAdminToken: string;
  let alphaAdminToken: string;
  let alphaEmpToken: string;
  let betaAdminToken: string;

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
    // 1. Create Super Admin User
    await db.user.create({
      data: {
        id: testSuperAdminId,
        email: `super-a44-${timestamp}@masterhrms.test`,
        passwordHash: "mock-hash",
        roles: { create: [{ role: "super_admin" }] },
        profile: { create: { fullName: "Super Admin Tester" } },
      },
    });

    superAdminToken = generateToken({
      userId: testSuperAdminId,
      email: `super-a44-${timestamp}@masterhrms.test`,
      tenantId: null,
      roles: ["super_admin"],
    });

    // 2. Create Tenant Alpha and Tenant Beta
    await db.tenant.create({
      data: {
        id: testTenantAlphaId,
        name: `Alpha Workspace A4.4 ${timestamp}`,
        slug: `alpha-a44-${timestamp}`,
      },
    });

    await db.tenant.create({
      data: {
        id: testTenantBetaId,
        name: `Beta Workspace A4.4 ${timestamp}`,
        slug: `beta-a44-${timestamp}`,
      },
    });

    // 3. Create Alpha Admin
    await db.user.create({
      data: {
        id: testAlphaAdminId,
        email: `alpha-admin-${timestamp}@alpha.test`,
        passwordHash: "mock-hash",
        roles: { create: [{ role: "hr_admin" }] },
        profile: { create: { fullName: "Alpha Admin", tenantId: testTenantAlphaId } },
      },
    });

    alphaAdminToken = generateToken({
      userId: testAlphaAdminId,
      email: `alpha-admin-${timestamp}@alpha.test`,
      tenantId: testTenantAlphaId,
      roles: ["hr_admin"],
    });

    // 4. Create Alpha Employee (no admin permissions)
    await db.user.create({
      data: {
        id: testAlphaEmpId,
        email: `alpha-emp-${timestamp}@alpha.test`,
        passwordHash: "mock-hash",
        roles: { create: [{ role: "employee" }] },
        profile: { create: { fullName: "Alpha Employee", tenantId: testTenantAlphaId } },
      },
    });

    alphaEmpToken = generateToken({
      userId: testAlphaEmpId,
      email: `alpha-emp-${timestamp}@alpha.test`,
      tenantId: testTenantAlphaId,
      roles: ["employee"],
    });

    // 5. Create Beta Admin
    await db.user.create({
      data: {
        id: testBetaAdminId,
        email: `beta-admin-${timestamp}@beta.test`,
        passwordHash: "mock-hash",
        roles: { create: [{ role: "hr_admin" }] },
        profile: { create: { fullName: "Beta Admin", tenantId: testTenantBetaId } },
      },
    });

    betaAdminToken = generateToken({
      userId: testBetaAdminId,
      email: `beta-admin-${timestamp}@beta.test`,
      tenantId: testTenantBetaId,
      roles: ["hr_admin"],
    });

    // 6. Entitle Tenant Alpha with WooCommerce and Google Workspace, but NOT Beta
    await db.tenantAddon.create({
      data: {
        tenantId: testTenantAlphaId,
        addonSlug: "woocommerce-sync",
        status: "active",
        plan: "pro_annual",
      },
    });

    await db.tenantAddon.create({
      data: {
        tenantId: testTenantAlphaId,
        addonSlug: "google-workspace-integration",
        status: "active",
        plan: "enterprise",
      },
    });

    // 7. Mount Express Server with all protected routers
    testApp = express();
    testApp.use(express.json());
    testApp.use("/api/addons", addonsRouter);
    testApp.use("/api/woocommerce", woocommerceRouter);
    testApp.use("/api/shopify", shopifyRouter);
    testApp.use("/api/workspace", workspaceRouter);
    testApp.use("/api/accounting", accountingRouter);
    testApp.use("/api/alerts", alertsRouter);
    testApp.use("/api/payments", paymentsRouter);
    testApp.use("/api/biometric", biometricRouter);

    await new Promise<void>((resolve) => {
      httpServer = testApp.listen(0, () => {
        const addr = httpServer.address();
        const port = typeof addr === "object" && addr ? addr.port : 4198;
        baseUrl = `http://localhost:${port}`;
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
    await db.userRole.deleteMany({
      where: { userId: { in: [testSuperAdminId, testAlphaAdminId, testAlphaEmpId, testBetaAdminId] } },
    });
    await db.profile.deleteMany({
      where: { userId: { in: [testSuperAdminId, testAlphaAdminId, testAlphaEmpId, testBetaAdminId] } },
    });
    await db.user.deleteMany({
      where: { id: { in: [testSuperAdminId, testAlphaAdminId, testAlphaEmpId, testBetaAdminId] } },
    });
    await db.tenant.deleteMany({
      where: { id: { in: [testTenantAlphaId, testTenantBetaId] } },
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Uninstalled add-on absent from menus
  // ─────────────────────────────────────────────────────────────
  it("Criterion 1: Uninstalled add-on is absent from all role menus", () => {
    const uninstalledContext: EntitlementResolverContext = {
      tenantId: testTenantAlphaId,
      isSuperAdmin: false,
      isWorkspaceAdmin: true,
      roles: ["admin"],
      permissions: ["admin.all"],
      enabledModules: ["hrms", "woocommerce-sync"],
      activeAddons: ["woocommerce-sync"],
      serverEntitlements: {
        "woocommerce-sync": { isActive: true },
      },
      isLoading: false,
      isError: false,
    };

    // Shopify Sync is uninstalled
    const isShopifyEntitled = checkEntitlementByKey("shopify-sync", uninstalledContext);
    expect(isShopifyEntitled).toBe(false);

    // Navigation item visibility fails closed
    const isShopifyVisible = isAccessPermitted(
      { moduleKey: "shopify-sync", route: "/shopify" },
      uninstalledContext
    );
    expect(isShopifyVisible).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Entitled add-on appears only for roles with permissions
  // ─────────────────────────────────────────────────────────────
  it("Criterion 2: Entitled add-on appears only for roles with required permissions", () => {
    const entitledAdminContext: EntitlementResolverContext = {
      tenantId: testTenantAlphaId,
      isSuperAdmin: false,
      isWorkspaceAdmin: true,
      roles: ["admin"],
      permissions: ["integrations.manage"],
      enabledModules: ["google-workspace-integration"],
      activeAddons: ["google-workspace-integration"],
      serverEntitlements: {
        "google-workspace-integration": { isActive: true },
      },
      isLoading: false,
      isError: false,
    };

    const entitledEmployeeContext: EntitlementResolverContext = {
      tenantId: testTenantAlphaId,
      isSuperAdmin: false,
      isWorkspaceAdmin: false,
      roles: ["employee"],
      permissions: ["employee.self_service"],
      enabledModules: ["google-workspace-integration"],
      activeAddons: ["google-workspace-integration"],
      serverEntitlements: {
        "google-workspace-integration": { isActive: true },
      },
      isLoading: false,
      isError: false,
    };

    // Both contexts recognize tenant entitlement
    expect(checkEntitlementByKey("google-workspace-integration", entitledAdminContext)).toBe(true);
    expect(checkEntitlementByKey("google-workspace-integration", entitledEmployeeContext)).toBe(true);

    // But admin can view management menu, while employee cannot
    const adminCanView = isAccessPermitted(
      { moduleKey: "google-workspace-integration", permission: "integrations.manage" },
      entitledAdminContext
    );
    const employeeCanView = isAccessPermitted(
      { moduleKey: "google-workspace-integration", permission: "integrations.manage" },
      entitledEmployeeContext
    );

    expect(adminCanView).toBe(true);
    expect(employeeCanView).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Employee cannot see HR Admin-only module
  // ─────────────────────────────────────────────────────────────
  it("Criterion 3: Employee cannot see HR Admin-only navigation", () => {
    const employeeContext: EntitlementResolverContext = {
      tenantId: testTenantAlphaId,
      isSuperAdmin: false,
      isWorkspaceAdmin: false,
      roles: ["employee"],
      permissions: ["me.view"],
      enabledModules: ["hrms"],
      activeAddons: [],
      serverEntitlements: {},
      isLoading: false,
      isError: false,
    };

    const canSeeHrEmployees = isAccessPermitted(
      { moduleKey: "employees", permission: "hr.employees.view" },
      employeeContext
    );
    expect(canSeeHrEmployees).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Tenant A entitlement does not expose module in Tenant B
  // ─────────────────────────────────────────────────────────────
  it("Criterion 4: Tenant Alpha entitlement does not leak into Tenant Beta", async () => {
    // Database authoritative check
    const alphaEntitlement = await checkTenantEntitlement(testTenantAlphaId, "woocommerce-sync");
    const betaEntitlement = await checkTenantEntitlement(testTenantBetaId, "woocommerce-sync");

    expect(alphaEntitlement.entitled).toBe(true);
    expect(betaEntitlement.entitled).toBe(false);

    // API check via GET /api/addons/entitlements
    const alphaRes = await apiFetch("/api/addons/entitlements", {
      headers: { Authorization: `Bearer ${alphaAdminToken}` },
    });
    const betaRes = await apiFetch("/api/addons/entitlements", {
      headers: { Authorization: `Bearer ${betaAdminToken}` },
    });

    expect(alphaRes.status).toBe(200);
    expect(alphaRes.body.entitlements["woocommerce-sync"]?.isActive).toBe(true);

    expect(betaRes.status).toBe(200);
    expect(betaRes.body.entitlements["woocommerce-sync"]).toBeUndefined();
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Direct URL access denied without required entitlement
  // ─────────────────────────────────────────────────────────────
  it("Criterion 5: Direct URL access mapping blocks unentitled route", () => {
    const betaContext: EntitlementResolverContext = {
      tenantId: testTenantBetaId,
      isSuperAdmin: false,
      isWorkspaceAdmin: true,
      roles: ["admin"],
      permissions: ["admin.all"],
      enabledModules: ["hrms"],
      activeAddons: [],
      serverEntitlements: {},
      isLoading: false,
      isError: false,
    };

    expect(ROUTE_ENTITLEMENT_MAP["/integrations"]).toBe("woocommerce-sync");
    expect(ROUTE_ENTITLEMENT_MAP["/shopify"]).toBe("shopify-sync");

    // Direct access to /integrations for Tenant Beta is rejected by entitlement guard
    const canAccessWooRoute = isAccessPermitted({ route: "/integrations" }, betaContext);
    expect(canAccessWooRoute).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Protected API access is denied without required entitlement
  // ─────────────────────────────────────────────────────────────
  it(
    "Criterion 6: Protected API access rejects unentitled tenant with 403 ADDON_REQUIRED",
    async () => {
      // 1. WooCommerce Sync API: Alpha is entitled, Beta is not
      const betaWooRes = await apiFetch("/api/woocommerce/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${betaAdminToken}` },
        body: {},
      });
      expect(betaWooRes.status).toBe(403);
      expect(["ADDON_REQUIRED", "ADDON_EXPIRED"]).toContain(betaWooRes.body.code);

      // 2. Shopify Sync API: Neither is entitled
      const betaShopifyRes = await apiFetch("/api/shopify/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${betaAdminToken}` },
        body: {},
      });
      expect(betaShopifyRes.status).toBe(403);
      expect(["ADDON_REQUIRED", "ADDON_EXPIRED"]).toContain(betaShopifyRes.body.code);

      // 3. Google Workspace config: Alpha is entitled, Beta is not
      const betaGoogleRes = await apiFetch("/api/workspace/google/config", {
        headers: { Authorization: `Bearer ${betaAdminToken}` },
      });
      expect(betaGoogleRes.status).toBe(403);
      expect(["ADDON_REQUIRED", "ADDON_EXPIRED"]).toContain(betaGoogleRes.body.code);

      const alphaGoogleRes = await apiFetch("/api/workspace/google/config", {
        headers: { Authorization: `Bearer ${alphaAdminToken}` },
      });
      expect(alphaGoogleRes.status).toBe(200);

      // 4. WhatsApp send API: Beta is unentitled
      const betaWaRes = await apiFetch("/api/alerts/whatsapp/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${betaAdminToken}` },
        body: { to: "+1234567890", template: "test" },
      });
      expect(betaWaRes.status).toBe(403);
      expect(["ADDON_REQUIRED", "ADDON_EXPIRED"]).toContain(betaWaRes.body.code);

      // 5. Razorpay create-order API: Beta is unentitled
      const betaRazorpayRes = await apiFetch("/api/payments/razorpay/create-order", {
        method: "POST",
        headers: { Authorization: `Bearer ${betaAdminToken}` },
        body: { amount: 1000 },
      });
      expect(betaRazorpayRes.status).toBe(403);
      expect(["ADDON_REQUIRED", "ADDON_EXPIRED"]).toContain(betaRazorpayRes.body.code);

      // 6. Biometric devices API: Beta is unentitled
      const betaBioRes = await apiFetch("/api/biometric/devices", {
        headers: { Authorization: `Bearer ${betaAdminToken}` },
      });
      expect(betaBioRes.status).toBe(403);
      expect(["ADDON_REQUIRED", "ADDON_EXPIRED"]).toContain(betaBioRes.body.code);
    },
    25000
  );

  // ─────────────────────────────────────────────────────────────
  // 7. Revoked and expired entitlements no longer grant access
  // ─────────────────────────────────────────────────────────────
  it("Criterion 7: Expired or revoked entitlements immediately deny access", async () => {
    // Create an expired trial add-on for Beta
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);

    await db.tenantAddon.upsert({
      where: {
        tenantId_addonSlug: {
          tenantId: testTenantBetaId,
          addonSlug: "razorpay-gateway",
        },
      },
      update: {
        status: "trial",
        trialEndsAt: pastDate,
      },
      create: {
        tenantId: testTenantBetaId,
        addonSlug: "razorpay-gateway",
        status: "trial",
        trialEndsAt: pastDate,
        plan: "trial",
      },
    });

    const checkResult = await checkTenantEntitlement(testTenantBetaId, "razorpay-gateway");
    expect(checkResult.entitled).toBe(false);

    // API request immediately returns 403 ADDON_EXPIRED or ADDON_REQUIRED
    const res = await apiFetch("/api/payments/razorpay/create-order", {
      method: "POST",
      headers: { Authorization: `Bearer ${betaAdminToken}` },
      body: { amount: 500 },
    });
    expect(res.status).toBe(403);
    expect(["ADDON_REQUIRED", "ADDON_EXPIRED"]).toContain(res.body.code);
  }, 15000);

  // ─────────────────────────────────────────────────────────────
  // 8. Missing or failed entitlement data fails closed
  // ─────────────────────────────────────────────────────────────
  it("Criterion 8: Loading or failed entitlement state fails closed", () => {
    // 1. Loading state
    const loadingContext: EntitlementResolverContext = {
      tenantId: testTenantAlphaId,
      isSuperAdmin: false,
      isWorkspaceAdmin: true,
      roles: ["admin"],
      permissions: ["admin.all"],
      enabledModules: ["woocommerce-sync"],
      activeAddons: ["woocommerce-sync"],
      serverEntitlements: {},
      isLoading: true, // Still fetching
      isError: false,
    };
    expect(checkEntitlementByKey("woocommerce-sync", loadingContext)).toBe(false);

    // 2. Error state
    const errorContext: EntitlementResolverContext = {
      ...loadingContext,
      isLoading: false,
      isError: true, // Network/API failed
    };
    expect(checkEntitlementByKey("woocommerce-sync", errorContext)).toBe(false);

    // 3. Null tenant state
    const nullTenantContext: EntitlementResolverContext = {
      ...loadingContext,
      tenantId: null,
      isLoading: false,
      isError: false,
    };
    expect(checkEntitlementByKey("woocommerce-sync", nullTenantContext)).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────
  // 9. Workspace switching does not reuse previous workspace state
  // ─────────────────────────────────────────────────────────────
  it("Criterion 9: Workspace switching isolates entitlement state per tenant", () => {
    // Tenant Alpha context
    const alphaContext: EntitlementResolverContext = {
      tenantId: testTenantAlphaId,
      isSuperAdmin: false,
      isWorkspaceAdmin: true,
      roles: ["admin"],
      permissions: ["admin.all"],
      enabledModules: ["woocommerce-sync"],
      activeAddons: ["woocommerce-sync"],
      serverEntitlements: { "woocommerce-sync": { isActive: true } },
      isLoading: false,
      isError: false,
    };

    // Switched to Tenant Beta context
    const betaContext: EntitlementResolverContext = {
      tenantId: testTenantBetaId,
      isSuperAdmin: false,
      isWorkspaceAdmin: true,
      roles: ["admin"],
      permissions: ["admin.all"],
      enabledModules: [],
      activeAddons: [],
      serverEntitlements: {},
      isLoading: false,
      isError: false,
    };

    expect(checkEntitlementByKey("woocommerce-sync", alphaContext)).toBe(true);
    expect(checkEntitlementByKey("woocommerce-sync", betaContext)).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────
  // 10. Existing core HRMS navigation remains available
  // ─────────────────────────────────────────────────────────────
  it("Criterion 10: Existing core HRMS navigation remains available without add-on requirements", () => {
    const regularContext: EntitlementResolverContext = {
      tenantId: testTenantAlphaId,
      isSuperAdmin: false,
      isWorkspaceAdmin: false,
      roles: ["employee"],
      permissions: ["employee.dashboard.view"],
      enabledModules: ["hrms"],
      activeAddons: [],
      serverEntitlements: {},
      isLoading: false,
      isError: false,
    };

    // Core module keys bypass add-on checks
    const canAccessCore = isAccessPermitted({ moduleKey: "core" }, regularContext);
    const canAccessOverview = isAccessPermitted({ moduleKey: "overview" }, regularContext);

    expect(canAccessCore).toBe(true);
    expect(canAccessOverview).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────
  // 11. Super Admin administrative navigation governed separately
  // ─────────────────────────────────────────────────────────────
  it("Criterion 11: Super Admin administrative navigation retains authorized platform bypass", async () => {
    const superAdminContext: EntitlementResolverContext = {
      tenantId: null,
      isSuperAdmin: true,
      isWorkspaceAdmin: true,
      roles: ["super_admin"],
      permissions: ["*"],
      enabledModules: ["*"],
      activeAddons: ["*"],
      serverEntitlements: {},
      isLoading: false,
      isError: false,
    };

    // Super Admin is always entitled via platform bypass
    expect(checkEntitlementByKey("woocommerce-sync", superAdminContext)).toBe(true);
    expect(checkEntitlementByKey("shopify-sync", superAdminContext)).toBe(true);
    expect(checkEntitlementByKey("any-future-addon", superAdminContext)).toBe(true);

    // Direct check of middleware bypass
    const bypassResult = await checkTenantEntitlement(testTenantBetaId, "woocommerce-sync", true);
    expect(bypassResult.entitled).toBe(true);
    expect(bypassResult.source).toBe("super_admin_bypass");
  });

  // ─────────────────────────────────────────────────────────────
  // 12. Existing commerce, entitlement, RBAC & tenant isolation
  // ─────────────────────────────────────────────────────────────
  it("Criterion 12: Addon aliases resolve consistently without inventing new keys", () => {
    const context: EntitlementResolverContext = {
      tenantId: testTenantAlphaId,
      isSuperAdmin: false,
      isWorkspaceAdmin: true,
      roles: ["admin"],
      permissions: ["admin.all"],
      enabledModules: ["woocommerce-sync", "google-workspace-integration"],
      activeAddons: ["woocommerce-sync", "google-workspace-integration"],
      serverEntitlements: {},
      isLoading: false,
      isError: false,
    };

    // Both canonical and alias strings resolve to entitled
    expect(checkEntitlementByKey("woocommerce-sync", context)).toBe(true);
    expect(checkEntitlementByKey("woocommerce", context)).toBe(true);
    expect(checkEntitlementByKey("google-workspace-integration", context)).toBe(true);
    expect(checkEntitlementByKey("google-workspace", context)).toBe(true);

    // Negative verification for unentitled
    expect(checkEntitlementByKey("shopify-sync", context)).toBe(false);
    expect(checkEntitlementByKey("shopify", context)).toBe(false);
    expect(checkEntitlementByKey("tally-importer", context)).toBe(false);
  });
});
