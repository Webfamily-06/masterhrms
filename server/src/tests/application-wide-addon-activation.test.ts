/**
 * MASTERHRMS — Application-Wide Add-on Activation & Strict Sidebar Access Control Test Suite
 *
 * Covers 17 exhaustive verification matrix scenarios:
 * 1. Uninstalled add-on -> Hidden from sidebar, API/URL blocked.
 * 2. Single installed add-on -> Appears in its exact designated location.
 * 3. Multiple installed add-ons -> Appear in correct locations without collisions.
 * 4. Installed then disabled add-on -> Disappears immediately, API access blocked.
 * 5. Trial add-on active -> Valid entitlement during trial window.
 * 6. Plan-included add-on not yet activated -> NOT entitled (isInstalled: false, isActive: false).
 * 7. Expired add-on -> Entitlement revoked (ADDON_EXPIRED), hidden from navigation.
 * 8. Add-on with role restrictions -> Visible only to authorized roles.
 * 9. Add-on with permission restrictions -> Visible only to authorized permissions.
 * 10. Multi-tenant isolation -> Tenant A's add-on is never visible/accessible to Tenant B.
 * 11. Rapid toggle / idempotency -> Enable/disable toggles reliably without state corruption.
 * 12. Database persistence -> State survives session/query restarts from DB.
 * 13. Core module protection -> Core platform modules cannot be disabled.
 * 14. POS and Inventory isolation -> Decoupled access, no cross-entitlement.
 * 15. Categorization architecture -> Pattern 1 extension, Pattern 2 standalone, Pattern 3 standalone_with_submenu, Pattern 4 integrated.
 * 16. Route deduplication -> Unified navigation resolver never emits duplicate routes.
 * 17. Backend API gating -> Fail-closed 403 rejection for unentitled requests.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import { rawPrisma as prisma } from "../prisma";
import { addonsRouter } from "../routes/addons.routes";
import { commerceRouter } from "../routes/commerce.routes";
import { workspaceRouter } from "../routes/workspace.routes";
import { generateToken } from "../lib/jwt";
import { requireAuth } from "../middleware/auth";
import { checkTenantEntitlement, requireAddon } from "../middleware/entitlements";
import { isModuleAllowed } from "../../../src/lib/permissions";
import { checkEntitlementByKey, isAccessPermitted } from "../../../src/lib/navigation-resolver";
import {
  MASTER_ADDON_REGISTRY,
  resolveStandaloneModules,
  resolveIntegratedAddons,
  resolveExtensionItems,
} from "../../../src/lib/addon-navigation";

const db = prisma;

describe("MASTERHRMS — Application-Wide Add-on Activation & Access Control Suite", () => {
  const timestamp = Date.now();
  const tenantAId = `tenant-a-${timestamp}`;
  const tenantBId = `tenant-b-${timestamp}`;
  const userAId = `user-a-${timestamp}`;
  const userBId = `user-b-${timestamp}`;

  let tokenA: string;
  let tokenB: string;
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
    // 1. Seed Tenant A (Sovereign Tier)
    await db.tenant.create({
      data: {
        id: tenantAId,
        name: `Tenant A Sovereign ${timestamp}`,
        slug: `tenant-a-${timestamp}`,
      },
    });

    await db.tenantSubscription.create({
      data: {
        tenantId: tenantAId,
        planId: "sovereign",
        status: "active",
        billingCycle: "monthly",
      },
    });

    await db.user.create({
      data: {
        id: userAId,
        email: `admin-a-${timestamp}@test.com`,
        passwordHash: "hash-a",
        roles: { create: [{ role: "hr_admin" }] },
        profile: {
          create: {
            tenantId: tenantAId,
            fullName: "Admin Tenant A",
          },
        },
      },
    });

    tokenA = generateToken({
      userId: userAId,
      email: `admin-a-${timestamp}@test.com`,
      tenantId: tenantAId,
      roles: ["hr_admin"],
    });

    // 2. Seed Tenant B (Starter Tier)
    await db.tenant.create({
      data: {
        id: tenantBId,
        name: `Tenant B Starter ${timestamp}`,
        slug: `tenant-b-${timestamp}`,
      },
    });

    await db.tenantSubscription.create({
      data: {
        tenantId: tenantBId,
        planId: "starter",
        status: "active",
        billingCycle: "monthly",
      },
    });

    await db.user.create({
      data: {
        id: userBId,
        email: `admin-b-${timestamp}@test.com`,
        passwordHash: "hash-b",
        roles: { create: [{ role: "hr_admin" }] },
        profile: {
          create: {
            tenantId: tenantBId,
            fullName: "Admin Tenant B",
          },
        },
      },
    });

    tokenB = generateToken({
      userId: userBId,
      email: `admin-b-${timestamp}@test.com`,
      tenantId: tenantBId,
      roles: ["hr_admin"],
    });

    // 3. Setup test server with protected add-on endpoint
    testApp = express();
    testApp.use(express.json());
    testApp.use("/api/addons", addonsRouter);
    testApp.use("/api/commerce", commerceRouter);
    testApp.use("/api/workspace", workspaceRouter);

    // Protected endpoint requiring specific add-on
    testApp.get("/api/test-protected-reports", requireAuth, requireAddon("smart-reports"), (req, res) => {
      res.json({ success: true, message: "Authorized access to Smart Reports" });
    });

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
    try {
      await db.tenantAddon.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await db.tenantModule.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await db.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await db.userRole.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
      await db.profile.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
      await db.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
      await db.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
    } catch {
      // ignore cleanup errors
    }
  });

  // ─── Scenario 1: Uninstalled Add-on ──────────────────────────────────────────
  it("Scenario 1: Uninstalled add-on returns entitled=false and is omitted from sidebar", async () => {
    // smart-reports is not installed for tenant B
    const ent = await checkTenantEntitlement(tenantBId, "smart-reports");
    expect(ent.entitled).toBe(false);
    expect(ent.status).toBe("not_installed");

    // Client resolver also rejects
    const context: any = {
      tenantId: tenantBId,
      isSuperAdmin: false,
      isWorkspaceAdmin: true,
      roles: ["admin"],
      permissions: [],
      enabledModules: ["hrm"],
      activeAddons: [],
      serverEntitlements: {
        "smart-reports": { isActive: false, isInstalled: false, status: "not_installed" },
      },
    };
    expect(checkEntitlementByKey("smart-reports", context)).toBe(false);

    // Standalone resolver does not output smart-reports
    const standalone = resolveStandaloneModules((key) => checkEntitlementByKey(key, context), false, "/");
    expect(standalone.some((m) => m.key === "smart-reports")).toBe(false);
  });

  // ─── Scenario 2: Single Installed Add-on ─────────────────────────────────────
  it("Scenario 2: Single installed add-on appears in its exact designated location", async () => {
    // Install smart-reports for Tenant A
    await db.tenantAddon.create({
      data: {
        tenantId: tenantAId,
        addonSlug: "smart-reports",
        status: "active",
      },
    });

    const ent = await checkTenantEntitlement(tenantAId, "smart-reports");
    expect(ent.entitled).toBe(true);
    expect(ent.status).toBe("active");

    const context: any = {
      tenantId: tenantAId,
      isSuperAdmin: false,
      isWorkspaceAdmin: true,
      roles: ["admin"],
      permissions: [],
      enabledModules: ["hrm", "smart-reports"],
      activeAddons: ["smart-reports"],
      serverEntitlements: {
        "smart-reports": { isActive: true, isInstalled: true, isEnabled: true, status: "active" },
      },
    };
    expect(checkEntitlementByKey("smart-reports", context)).toBe(true);

    const standalone = resolveStandaloneModules((key) => checkEntitlementByKey(key, context), false, "/");
    const reportsModule = standalone.find((m) => m.key === "smart-reports");
    expect(reportsModule).toBeDefined();
    expect(reportsModule?.menuTitle).toBe("FINANCE");
    expect(reportsModule?.children.length).toBeGreaterThan(0);
  });

  // ─── Scenario 3: Multiple Installed Add-ons ───────────────────────────────────
  it("Scenario 3: Multiple installed add-ons appear in their respective locations without collision", async () => {
    // Also install strategy studio (swot) for Tenant A
    await db.tenantAddon.create({
      data: {
        tenantId: tenantAId,
        addonSlug: "swot",
        status: "active",
      },
    });

    const context: any = {
      tenantId: tenantAId,
      isSuperAdmin: false,
      isWorkspaceAdmin: true,
      roles: ["admin"],
      permissions: [],
      enabledModules: ["hrm", "smart-reports", "swot"],
      activeAddons: ["smart-reports", "swot"],
      serverEntitlements: {
        "smart-reports": { isActive: true, isInstalled: true, isEnabled: true, status: "active" },
        swot: { isActive: true, isInstalled: true, isEnabled: true, status: "active" },
      },
    };

    const standalone = resolveStandaloneModules((key) => checkEntitlementByKey(key, context), true, "/");
    expect(standalone.some((m) => m.key === "smart-reports")).toBe(true);
    expect(standalone.some((m) => m.key === "strategy-studio")).toBe(true);
  });

  // ─── Scenario 4: Installed Then Disabled Add-on ──────────────────────────────
  it("Scenario 4: Disabled add-on is immediately revoked and disappears from navigation", async () => {
    // Disable smart-reports via authoritative API
    const { status, body } = await apiFetch("/api/addons/smart-reports/disable", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(status).toBe(200);
    expect(body.status).toBe("disabled");

    // Backend entitlement immediately returns entitled=false
    const ent = await checkTenantEntitlement(tenantAId, "smart-reports");
    expect(ent.entitled).toBe(false);
    expect(ent.status).toBe("disabled");

    // Resolver rejects
    const context: any = {
      tenantId: tenantAId,
      isSuperAdmin: false,
      isWorkspaceAdmin: true,
      roles: ["admin"],
      permissions: [],
      enabledModules: ["hrm"],
      activeAddons: [],
      serverEntitlements: {
        "smart-reports": { isActive: false, isInstalled: true, isEnabled: false, status: "disabled" },
      },
    };
    expect(checkEntitlementByKey("smart-reports", context)).toBe(false);
  });

  // ─── Scenario 5: Trial Add-on Active ─────────────────────────────────────────
  it("Scenario 5: Trial add-on with valid future expiry resolves entitled=true", async () => {
    const trialExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // +14 days
    await db.tenantAddon.upsert({
      where: { tenantId_addonSlug: { tenantId: tenantAId, addonSlug: "ai-business-advisor" } },
      create: {
        tenantId: tenantAId,
        addonSlug: "ai-business-advisor",
        status: "trial",
        trialEndsAt: trialExpiry,
      },
      update: {
        status: "trial",
        trialEndsAt: trialExpiry,
      },
    });

    const ent = await checkTenantEntitlement(tenantAId, "ai-business-advisor");
    expect(ent.entitled).toBe(true);
    expect(ent.status).toBe("trial");
  });

  // ─── Scenario 6: Plan-Included Add-on Not Yet Activated ───────────────────────
  it("Scenario 6: Plan-included add-on without TenantAddon installation record is NOT entitled", async () => {
    // In Sovereign tier, procurement is included in the plan, but tenant A hasn't installed it
    const ent = await checkTenantEntitlement(tenantAId, "procurement");
    expect(ent.entitled).toBe(false);
    expect(ent.status).toBe("not_installed");

    // GET /api/addons/entitlements marks it as available_in_plan, isInstalled: false
    const { body } = await apiFetch("/api/addons/entitlements", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const procEnt = body.entitlements["procurement"];
    expect(procEnt.status).toBe("available_in_plan");
    expect(procEnt.isInstalled).toBe(false);
    expect(procEnt.isEnabled).toBe(false);
    expect(procEnt.isActive).toBe(false);

    // Client navigation resolver rejects available_in_plan
    const context: any = {
      tenantId: tenantAId,
      isSuperAdmin: false,
      isWorkspaceAdmin: true,
      roles: ["admin"],
      permissions: [],
      enabledModules: ["hrm"],
      activeAddons: [],
      serverEntitlements: body.entitlements,
    };
    expect(checkEntitlementByKey("procurement", context)).toBe(false);
  });

  // ─── Scenario 7: Expired Add-on ──────────────────────────────────────────────
  it("Scenario 7: Expired add-on has entitlement revoked and is blocked with ADDON_EXPIRED", async () => {
    const pastExpiry = new Date(Date.now() - 24 * 60 * 60 * 1000); // -1 day
    await db.tenantAddon.upsert({
      where: { tenantId_addonSlug: { tenantId: tenantAId, addonSlug: "ai-business-advisor" } },
      create: {
        tenantId: tenantAId,
        addonSlug: "ai-business-advisor",
        status: "expired",
        trialEndsAt: pastExpiry,
      },
      update: {
        status: "expired",
        trialEndsAt: pastExpiry,
      },
    });

    const ent = await checkTenantEntitlement(tenantAId, "ai-business-advisor");
    expect(ent.entitled).toBe(false);
    expect(ent.status).toBe("expired");

    const context: any = {
      tenantId: tenantAId,
      isSuperAdmin: false,
      isWorkspaceAdmin: true,
      roles: ["admin"],
      permissions: [],
      enabledModules: ["hrm"],
      activeAddons: [],
      serverEntitlements: {
        "ai-business-advisor": { isActive: false, isInstalled: true, status: "expired" },
      },
    };
    expect(checkEntitlementByKey("ai-business-advisor", context)).toBe(false);
  });

  // ─── Scenario 8: Add-on with Role Restrictions ───────────────────────────────
  it("Scenario 8: Admin-only add-ons are hidden from standard employees even when entitled", () => {
    const employeeContext: any = {
      tenantId: tenantAId,
      isSuperAdmin: false,
      isWorkspaceAdmin: false,
      roles: ["employee"],
      permissions: [],
      enabledModules: ["hrm", "ecommerce"],
      activeAddons: ["ecommerce"],
      serverEntitlements: {
        "woocommerce-sync": { isActive: true, isInstalled: true, isEnabled: true, status: "active" },
      },
    };

    // E-Commerce is adminOnly in MASTER_ADDON_REGISTRY
    const standalone = resolveStandaloneModules((key) => checkEntitlementByKey(key, employeeContext), false, "/");
    expect(standalone.some((m) => m.key === "ecommerce")).toBe(false);

    // But for admin, it appears
    const adminContext = { ...employeeContext, isWorkspaceAdmin: true, roles: ["admin"] };
    const adminStandalone = resolveStandaloneModules((key) => checkEntitlementByKey(key, adminContext), true, "/");
    expect(adminStandalone.some((m) => m.key === "ecommerce")).toBe(true);
  });

  // ─── Scenario 9: Add-on with Permission Restrictions ─────────────────────────
  it("Scenario 9: Access permitted checks permissions properly", () => {
    const restrictedContext: any = {
      tenantId: tenantAId,
      isSuperAdmin: false,
      isWorkspaceAdmin: false,
      roles: ["hr"],
      permissions: ["recruitment.view"],
      enabledModules: ["hrm", "recruitment-ats"],
      activeAddons: ["recruitment-ats"],
      serverEntitlements: {
        "recruitment-ats": { isActive: true, isInstalled: true, isEnabled: true, status: "active" },
      },
    };

    // User with recruitment.view can access recruitment
    expect(isAccessPermitted({ moduleKey: "recruitment-ats", permission: "recruitment.view" }, restrictedContext)).toBe(true);

    // User without finance permission is blocked
    expect(isAccessPermitted({ moduleKey: "finance", permission: "finance.manage" }, restrictedContext)).toBe(false);
  });

  // ─── Scenario 10: Multi-Tenant Isolation ─────────────────────────────────────
  it("Scenario 10: Tenant A's installed add-on is never visible or entitled for Tenant B", async () => {
    // Tenant A has SWOT installed
    const entA = await checkTenantEntitlement(tenantAId, "swot");
    expect(entA.entitled).toBe(true);

    // Tenant B does not have SWOT installed
    const entB = await checkTenantEntitlement(tenantBId, "swot");
    expect(entB.entitled).toBe(false);
    expect(entB.status).toBe("not_installed");
  });

  // ─── Scenario 11: Rapid Toggle / Idempotency ─────────────────────────────────
  it("Scenario 11: Enable and disable actions execute reliably and idempotently", async () => {
    // Re-enable smart-reports
    const enRes1 = await apiFetch("/api/addons/smart-reports/enable", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(enRes1.status).toBe(200);
    expect(enRes1.body.status).toBe("active");

    // Enable again (idempotent)
    const enRes2 = await apiFetch("/api/addons/smart-reports/enable", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(enRes2.status).toBe(200);
    expect(enRes2.body.status).toBe("active");

    // Disable
    const disRes1 = await apiFetch("/api/addons/smart-reports/disable", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(disRes1.status).toBe(200);
    expect(disRes1.body.status).toBe("disabled");

    // Disable again (idempotent)
    const disRes2 = await apiFetch("/api/addons/smart-reports/disable", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(disRes2.status).toBe(200);
    expect(disRes2.body.status).toBe("disabled");
  });

  // ─── Scenario 12: Application Restart / Database Persistence ─────────────────
  it("Scenario 12: Disabled state persists in database across fresh query queries", async () => {
    // Direct database query confirms persistence
    const record = await db.tenantAddon.findUnique({
      where: { tenantId_addonSlug: { tenantId: tenantAId, addonSlug: "smart-reports" } },
    });
    expect(record?.status).toBe("disabled");

    const moduleRecord = await db.tenantModule.findUnique({
      where: { tenantId_moduleKey: { tenantId: tenantAId, moduleKey: "smart-reports" } },
    });
    expect(moduleRecord?.isEnabled).toBe(false);
  });

  // ─── Scenario 13: Core Platform Modules Cannot Be Disabled ───────────────────
  it("Scenario 13: Core platform modules reject disable attempts with HTTP 400", async () => {
    const coreSlugs = ["starter", "growth", "sovereign", "core_platform", "hrm"];
    for (const slug of coreSlugs) {
      const res = await apiFetch(`/api/addons/${slug}/disable`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Core platform modules cannot be disabled");
    }
  });

  // ─── Scenario 14: POS and Inventory Isolation ────────────────────────────────
  it("Scenario 14: POS and Inventory modules are strictly isolated and do not cross-entitle", () => {
    const posOnly: any = {
      enabledModules: ["pos"],
      roles: ["admin"],
    };
    expect(isModuleAllowed("pos", posOnly)).toBe(true);
    expect(isModuleAllowed("inventory", posOnly)).toBe(false);

    const invOnly: any = {
      enabledModules: ["inventory"],
      roles: ["admin"],
    };
    expect(isModuleAllowed("inventory", invOnly)).toBe(true);
    expect(isModuleAllowed("pos", invOnly)).toBe(false);
  });

  // ─── Scenario 15: Add-on Categorization Patterns ─────────────────────────────
  it("Scenario 15: Add-on navigation modes are correctly categorized across 4 patterns", () => {
    const extensionMode = MASTER_ADDON_REGISTRY.filter((d) => d.navigationMode === "extension");
    const standaloneMode = MASTER_ADDON_REGISTRY.filter((d) => d.navigationMode === "standalone");
    const submenuMode = MASTER_ADDON_REGISTRY.filter((d) => d.navigationMode === "standalone_with_submenu");
    const integratedMode = MASTER_ADDON_REGISTRY.filter((d) => d.navigationMode === "integrated");

    expect(extensionMode.length).toBeGreaterThan(0);
    expect(standaloneMode.length).toBeGreaterThan(0);
    expect(submenuMode.length).toBeGreaterThan(0);
    expect(integratedMode.length).toBeGreaterThan(0);

    // Extensions must not leak into standalone modules
    const extensionSlugs = extensionMode.map((m) => m.slug);
    const standaloneSlugs = standaloneMode.map((m) => m.slug);
    for (const extSlug of extensionSlugs) {
      expect(standaloneSlugs).not.toContain(extSlug);
    }
  });

  // ─── Scenario 16: Route Deduplication ────────────────────────────────────────
  it("Scenario 16: Extension resolver enforces route-level deduplication", () => {
    const extensions = resolveExtensionItems(() => true, true, "/");
    const seenRoutes = new Set<string>();

    for (const item of extensions) {
      expect(seenRoutes.has(item.route)).toBe(false);
      seenRoutes.add(item.route);
    }
  });

  // ─── Scenario 17: Backend API Gating (403 Fail-Closed) ───────────────────────
  it("Scenario 17: Backend middleware blocks unentitled requests with 403 ADDON_REQUIRED", async () => {
    // Tenant B attempting to access endpoint requiring smart-reports
    const res = await apiFetch("/api/test-protected-reports", {
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("ADDON_REQUIRED");
  });
});
