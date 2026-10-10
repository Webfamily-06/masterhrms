/**
 * MASTERHRMS — Phase A7: Add-on Waves Rollout & Staging Acceptance Suite
 *
 * Verifies:
 * 1. Canonical Catalog Registry Wave Integrity (Waves 1, 2, 3 sequence & definitions)
 * 2. Unified Catalog Service normalization with wave metadata and non-production pricing
 * 3. Super Admin Wave Add-on provisioning and assignment lifecycle
 * 4. Tenant Entitlement resolution across all three waves
 * 5. Strict Tenant Isolation and cross-tenant access denial
 * 6. Protection of commercially purchased and plan-included entitlements
 * 7. Real-time revocation and immediate denial (403 ADDON_REQUIRED)
 * 8. Audit trail persistence for privileged assignment and revocation actions
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import { prisma, rawPrisma } from "../prisma";
import { superRouter } from "../routes/super.routes";
import { addonsRouter } from "../routes/addons.routes";
import { strategyStudioRouter } from "../routes/strategy-studio.routes";
import { integrationRouter } from "../routes/integration.routes";
import { generateToken } from "../lib/jwt";
import {
  CANONICAL_CATALOG_REGISTRY,
  UnifiedCatalogService,
  findCanonicalProduct,
} from "../services/unified-catalog.service";
import {
  checkEntitlementByKey,
  isAccessPermitted,
  EntitlementResolverContext,
} from "../../../src/lib/navigation-resolver";

const db = rawPrisma || prisma;

describe("MASTERHRMS — Phase A7: Add-on Waves Rollout Suite", () => {
  const timestamp = Date.now();
  const testSuperAdminId = `usr-super-a7-${timestamp}`;
  const testTenantAdminAlphaId = `usr-admin-a7-a-${timestamp}`;
  const testTenantAdminBetaId = `usr-admin-a7-b-${timestamp}`;
  const testEmployeeAlphaId = `usr-emp-a7-a-${timestamp}`;
  const testTenantAlphaId = `tenant-a7-alpha-${timestamp}`;
  const testTenantBetaId = `tenant-a7-beta-${timestamp}`;

  let superAdminToken: string;
  let tenantAlphaToken: string;
  let tenantBetaToken: string;
  let employeeAlphaToken: string;

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
    // 1. Create isolated test tenants
    await db.tenant.create({
      data: {
        id: testTenantAlphaId,
        name: `A7 Wave Test Workspace Alpha (${timestamp})`,
        slug: `a7-alpha-${timestamp}`,
      },
    });

    await db.tenant.create({
      data: {
        id: testTenantBetaId,
        name: `A7 Wave Test Workspace Beta (${timestamp})`,
        slug: `a7-beta-${timestamp}`,
      },
    });

    // 2. Create Super Admin User
    await db.user.create({
      data: {
        id: testSuperAdminId,
        email: `superadmin-a7-${timestamp}@example.com`,
        passwordHash: "dummy-hash",
        roles: { create: [{ role: "super_admin" }] },
        profile: {
          create: {
            fullName: "Super Admin",
          },
        },
      },
    });

    // 3. Create Tenant Admin Alpha
    await db.user.create({
      data: {
        id: testTenantAdminAlphaId,
        email: `admin-alpha-a7-${timestamp}@example.com`,
        passwordHash: "dummy-hash",
        roles: { create: [{ role: "hr_admin" }] },
        profile: {
          create: {
            fullName: "Alpha Admin",
            tenantId: testTenantAlphaId,
          },
        },
      },
    });

    // 4. Create Tenant Admin Beta
    await db.user.create({
      data: {
        id: testTenantAdminBetaId,
        email: `admin-beta-a7-${timestamp}@example.com`,
        passwordHash: "dummy-hash",
        roles: { create: [{ role: "hr_admin" }] },
        profile: {
          create: {
            fullName: "Beta Admin",
            tenantId: testTenantBetaId,
          },
        },
      },
    });

    // 5. Create Employee Alpha
    await db.user.create({
      data: {
        id: testEmployeeAlphaId,
        email: `emp-alpha-a7-${timestamp}@example.com`,
        passwordHash: "dummy-hash",
        roles: { create: [{ role: "employee" }] },
        profile: {
          create: {
            fullName: "Alpha Employee",
            tenantId: testTenantAlphaId,
          },
        },
      },
    });

    // 5. Generate Auth Tokens
    superAdminToken = generateToken({
      userId: testSuperAdminId,
      email: `superadmin-a7-${timestamp}@example.com`,
      roles: ["super_admin"],
      tenantId: null,
    });

    tenantAlphaToken = generateToken({
      userId: testTenantAdminAlphaId,
      email: `admin-alpha-a7-${timestamp}@example.com`,
      roles: ["admin", "hr_admin"],
      tenantId: testTenantAlphaId,
    });

    tenantBetaToken = generateToken({
      userId: testTenantAdminBetaId,
      email: `admin-beta-a7-${timestamp}@example.com`,
      roles: ["admin", "hr_admin"],
      tenantId: testTenantBetaId,
    });

    employeeAlphaToken = generateToken({
      userId: testEmployeeAlphaId,
      email: `emp-alpha-a7-${timestamp}@example.com`,
      roles: ["employee"],
      tenantId: testTenantAlphaId,
    });

    // 6. Setup local test express server
    testApp = express();
    testApp.use(express.json());
    testApp.use("/api/super", superRouter);
    testApp.use("/api/addons", addonsRouter);
    testApp.use("/api/strategy-studio", strategyStudioRouter);
    testApp.use("/api/integrations", integrationRouter);

    httpServer = http.createServer(testApp);
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const addr = httpServer.address();
        if (typeof addr === "object" && addr !== null) {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (httpServer) {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    }
    // Cleanup fixtures
    await db.auditLog.deleteMany({
      where: { tenantId: { in: [testTenantAlphaId, testTenantBetaId] } },
    });
    await db.tenantAddon.deleteMany({
      where: { tenantId: { in: [testTenantAlphaId, testTenantBetaId] } },
    });
    await db.userRole.deleteMany({
      where: { userId: { in: [testSuperAdminId, testTenantAdminAlphaId, testTenantAdminBetaId, testEmployeeAlphaId] } },
    });
    await db.profile.deleteMany({
      where: { userId: { in: [testSuperAdminId, testTenantAdminAlphaId, testTenantAdminBetaId, testEmployeeAlphaId] } },
    });
    await db.user.deleteMany({
      where: { id: { in: [testSuperAdminId, testTenantAdminAlphaId, testTenantAdminBetaId, testEmployeeAlphaId] } },
    });
    await db.tenant.deleteMany({
      where: { id: { in: [testTenantAlphaId, testTenantBetaId] } },
    });
  });

  // =========================================================================
  // STAGE 1: CANONICAL CATALOG REGISTRY & WAVE INTEGRITY
  // =========================================================================

  it("Stage 1.1: Canonical Catalog Registry contains complete Wave 1, 2, and 3 entries without duplicate slugs", () => {
    const slugs = CANONICAL_CATALOG_REGISTRY.map((p) => p.slug);
    const uniqueSlugs = new Set(slugs);
    expect(slugs.length).toBe(uniqueSlugs.size);

    const wave1 = CANONICAL_CATALOG_REGISTRY.filter((p) => p.wave === "WAVE_1");
    const wave2 = CANONICAL_CATALOG_REGISTRY.filter((p) => p.wave === "WAVE_2");
    const wave3 = CANONICAL_CATALOG_REGISTRY.filter((p) => p.wave === "WAVE_3");

    expect(wave1.length).toBeGreaterThanOrEqual(10);
    expect(wave2.length).toBeGreaterThanOrEqual(10);
    expect(wave3.length).toBeGreaterThanOrEqual(10);

    // Verify presence of canonical wave representatives
    expect(wave1.some((p) => p.slug === "biometric-sync")).toBe(true);
    expect(wave1.some((p) => p.slug === "time-tracker")).toBe(true);
    expect(wave2.some((p) => p.slug === "learning-lms")).toBe(true);
    expect(wave2.some((p) => p.slug === "procurement")).toBe(true);
    expect(wave2.some((p) => p.slug === "woocommerce-sync")).toBe(true);
    expect(wave3.some((p) => p.slug === "swot")).toBe(true);
    expect(wave3.some((p) => p.slug === "pestel")).toBe(true);
    expect(wave3.some((p) => p.slug === "zatca")).toBe(true);
  });

  it("Stage 1.2: UnifiedCatalogService normalizes catalog items with wave tags and valid target engines", async () => {
    const catalog = await UnifiedCatalogService.getCatalog();
    expect(catalog.totalProducts).toBeGreaterThan(20);

    const swotItem = catalog.products.find((p) => p.slug === "swot");
    expect(swotItem).toBeDefined();
    expect(swotItem?.wave).toBe("WAVE_3");
    expect(swotItem?.targetEngine).toBe("addon");

    const lmsItem = catalog.products.find((p) => p.slug === "learning-lms");
    expect(lmsItem).toBeDefined();
    expect(lmsItem?.wave).toBe("WAVE_2");

    const bioItem = catalog.products.find((p) => p.slug === "biometric-sync");
    expect(bioItem).toBeDefined();
    expect(bioItem?.wave).toBe("WAVE_1");
  });

  // =========================================================================
  // STAGE 2: SUPER ADMIN ASSIGNMENT LIFECYCLE & WAVE PROVISIONING
  // =========================================================================

  it("Stage 2.1: Super Admin GET tenant add-ons auto-provisions missing canonical wave add-ons into database Addon table", async () => {
    const res = await apiFetch(`/api/super/tenants/${testTenantAlphaId}/addons`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });

    expect(res.status).toBe(200);
    expect(res.body.tenant.id).toBe(testTenantAlphaId);
    expect(Array.isArray(res.body.catalogAddons)).toBe(true);
    expect(res.body.catalogAddons.length).toBeGreaterThanOrEqual(25);

    // Verify auto-provisioning persisted to database
    const dbAddonCount = await db.addon.count();
    expect(dbAddonCount).toBeGreaterThanOrEqual(25);
  }, 15000);

  it("Stage 2.2: Super Admin assigns Wave 1 add-on ('time-tracker') to Tenant Alpha", async () => {
    const res = await apiFetch(`/api/super/tenants/${testTenantAlphaId}/addons/time-tracker/assign`, {
      method: "POST",
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: { reason: "Phase A7 Wave 1 Grant" },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.entitlement.status).toBe("active");
    expect(res.body.entitlement.addonSlug).toBe("time-tracker");

    // Verify audit log
    const audit = await db.auditLog.findFirst({
      where: {
        tenantId: testTenantAlphaId,
        action: "SUPER_ADMIN_ADDON_ASSIGNED",
      },
      orderBy: { createdAt: "desc" },
    });
    expect(audit).toBeDefined();
    expect((audit?.afterJson as any)?.addonSlug).toBe("time-tracker");
  });

  it("Stage 2.3: Super Admin assigns Wave 2 add-on ('learning-lms') and Wave 3 add-on ('swot')", async () => {
    const resWave2 = await apiFetch(`/api/super/tenants/${testTenantAlphaId}/addons/learning-lms/assign`, {
      method: "POST",
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: { reason: "Phase A7 Wave 2 Grant" },
    });
    expect(resWave2.status).toBe(200);
    expect(resWave2.body.success).toBe(true);

    const resWave3 = await apiFetch(`/api/super/tenants/${testTenantAlphaId}/addons/swot/assign`, {
      method: "POST",
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: { reason: "Phase A7 Wave 3 Grant" },
    });
    expect(resWave3.status).toBe(200);
    expect(resWave3.body.success).toBe(true);
  });

  it("Stage 2.4: Duplicate assignment of active add-on is idempotent and does not create duplicate rows", async () => {
    const duplicateRes = await apiFetch(`/api/super/tenants/${testTenantAlphaId}/addons/swot/assign`, {
      method: "POST",
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: { reason: "Duplicate Grant Attempt" },
    });

    expect(duplicateRes.status).toBe(200);
    expect(duplicateRes.body.alreadyActive).toBe(true);

    const rowCount = await db.tenantAddon.count({
      where: { tenantId: testTenantAlphaId, addonSlug: "swot" },
    });
    expect(rowCount).toBe(1);
  });

  // =========================================================================
  // STAGE 3: TENANT ENTITLEMENT RESOLUTION & DIRECT API PROTECTION
  // =========================================================================

  it("Stage 3.1: Tenant Alpha resolves active entitlements for assigned wave add-ons", async () => {
    const res = await apiFetch("/api/addons/entitlements", {
      headers: { Authorization: `Bearer ${tenantAlphaToken}` },
    });

    expect(res.status).toBe(200);
    const entitlements = res.body.entitlements;
    expect(entitlements["time-tracker"]?.isActive).toBe(true);
    expect(entitlements["learning-lms"]?.isActive).toBe(true);
    expect(entitlements["swot"]?.isActive).toBe(true);
  });

  it("Stage 3.2: Tenant Beta (unassigned) resolves unentitled state and receives 403 on direct access", async () => {
    const resBeta = await apiFetch("/api/addons/entitlements", {
      headers: { Authorization: `Bearer ${tenantBetaToken}` },
    });

    expect(resBeta.status).toBe(200);
    const betaEntitlements = resBeta.body.entitlements;
    expect(betaEntitlements["swot"]).toBeUndefined();

    // Direct API denial on Strategy Studio
    const deniedRes = await apiFetch("/api/strategy-studio/documents", {
      method: "POST",
      headers: { Authorization: `Bearer ${tenantBetaToken}` },
      body: { matrixType: "swot", title: "Unauthorized Matrix" },
    });

    expect(deniedRes.status).toBe(403);
    expect(deniedRes.body.code).toBe("ADDON_REQUIRED");
  });

  it("Stage 3.3: Tenant Alpha successfully creates Strategy Studio document and verifies persistence", async () => {
    const createRes = await apiFetch("/api/strategy-studio/documents", {
      method: "POST",
      headers: { Authorization: `Bearer ${tenantAlphaToken}` },
      body: {
        matrixType: "swot",
        title: "Alpha Expansion Plan",
        description: "Automated test doc",
      },
    });

    expect(createRes.status).toBe(200);
    expect(createRes.body.success).toBe(true);
    const docId = createRes.body.document.id;
    expect(docId).toBeDefined();

    // Verify document in list
    const listRes = await apiFetch("/api/strategy-studio/documents", {
      headers: { Authorization: `Bearer ${tenantAlphaToken}` },
    });
    expect(listRes.status).toBe(200);
    expect(listRes.body.documents.some((d: any) => d.id === docId)).toBe(true);

    // Stage 3.4: Cross-tenant isolation — Tenant Beta cannot export Tenant Alpha's document
    const crossTenantExport = await apiFetch(`/api/strategy-studio/documents/${docId}/export`, {
      headers: { Authorization: `Bearer ${tenantBetaToken}` },
    });
    expect([403, 404]).toContain(crossTenantExport.status);
  });

  // =========================================================================
  // STAGE 4: COMMERCIAL PURCHASE & PLAN-INCLUDED PROTECTION (STAGE 3 BOUNDARY)
  // =========================================================================

  it("Stage 4.1: Manual revocation strictly rejects commercially purchased add-on entitlements (400 PURCHASED_ENTITLEMENT_PROTECTED)", async () => {
    // Seed a commercially purchased entitlement for Tenant Alpha
    await db.tenantAddon.upsert({
      where: {
        tenantId_addonSlug: { tenantId: testTenantAlphaId, addonSlug: "whatsapp-alerts" },
      },
      create: {
        tenantId: testTenantAlphaId,
        addonSlug: "whatsapp-alerts",
        status: "active",
        plan: "standard",
        features: { source: "PURCHASED", paymentId: "pay_test_123" },
      },
      update: {
        status: "active",
        plan: "standard",
        features: { source: "PURCHASED", paymentId: "pay_test_123" },
      },
    });

    const revokeRes = await apiFetch(`/api/super/tenants/${testTenantAlphaId}/addons/whatsapp-alerts/revoke`, {
      method: "POST",
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: { reason: "Attempted illegal revocation" },
    });

    expect(revokeRes.status).toBe(400);
    expect(revokeRes.body.code).toBe("PURCHASED_ENTITLEMENT_PROTECTED");

    // Verify entitlement remains active
    const ent = await db.tenantAddon.findUnique({
      where: {
        tenantId_addonSlug: { tenantId: testTenantAlphaId, addonSlug: "whatsapp-alerts" },
      },
    });
    expect(ent?.status).toBe("active");
  });

  it("Stage 4.2: Manual revocation strictly rejects plan-included entitlements (400 PURCHASED_ENTITLEMENT_PROTECTED)", async () => {
    await db.tenantAddon.upsert({
      where: {
        tenantId_addonSlug: { tenantId: testTenantAlphaId, addonSlug: "ai-ocr" },
      },
      create: {
        tenantId: testTenantAlphaId,
        addonSlug: "ai-ocr",
        status: "active",
        plan: "plan_included",
        features: { source: "PLAN_INCLUDED" },
      },
      update: {
        status: "active",
        plan: "plan_included",
        features: { source: "PLAN_INCLUDED" },
      },
    });

    const revokeRes = await apiFetch(`/api/super/tenants/${testTenantAlphaId}/addons/ai-ocr/revoke`, {
      method: "POST",
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: { reason: "Attempted illegal revocation" },
    });

    expect(revokeRes.status).toBe(400);
    expect(revokeRes.body.code).toBe("PURCHASED_ENTITLEMENT_PROTECTED");
  });

  // =========================================================================
  // STAGE 5: SUPER ADMIN REVOCATION & IMMEDIATE ACCESS SHUTDOWN
  // =========================================================================

  it("Stage 5.1: Super Admin revokes manually assigned Wave 3 add-on ('swot')", async () => {
    const revokeRes = await apiFetch(`/api/super/tenants/${testTenantAlphaId}/addons/swot/revoke`, {
      method: "POST",
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: { reason: "Revocation acceptance test" },
    });

    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.success).toBe(true);

    const dbEnt = await db.tenantAddon.findUnique({
      where: { tenantId_addonSlug: { tenantId: testTenantAlphaId, addonSlug: "swot" } },
    });
    expect(dbEnt?.status).toBe("cancelled");

    // Verify audit log
    const audit = await db.auditLog.findFirst({
      where: {
        tenantId: testTenantAlphaId,
        action: "SUPER_ADMIN_ADDON_REVOKED",
      },
      orderBy: { createdAt: "desc" },
    });
    expect(audit).toBeDefined();
    expect((audit?.afterJson as any)?.addonSlug).toBe("swot");
  });

  it("Stage 5.2: Immediate denial after revocation (HTTP 403 ADDON_REQUIRED)", async () => {
    const postRevokeRes = await apiFetch("/api/strategy-studio/documents", {
      method: "POST",
      headers: { Authorization: `Bearer ${tenantAlphaToken}` },
      body: { matrixType: "swot", title: "Post Revoke Attempt" },
    });

    expect(postRevokeRes.status).toBe(403);
    expect(postRevokeRes.body.code).toBe("ADDON_REQUIRED");
  });

  // =========================================================================
  // STAGE 6: FRONTEND ROUTE PROTECTION & NAVIGATION RESOLVER EVALUATION
  // =========================================================================

  it("Stage 6.1: checkEntitlementByKey correctly checks wave aliases and fail-closed state", () => {
    const contextActive: EntitlementResolverContext = {
      tenantId: testTenantAlphaId,
      isSuperAdmin: false,
      isWorkspaceAdmin: true,
      roles: ["admin"],
      permissions: [],
      enabledModules: [],
      activeAddons: ["learning-lms", "swot"],
      serverEntitlements: {
        "learning-lms": { isActive: true },
        "swot": { isActive: true },
      },
      isLoading: false,
      isError: false,
    };

    expect(checkEntitlementByKey("learning-lms", contextActive)).toBe(true);
    expect(checkEntitlementByKey("lms", contextActive)).toBe(true); // alias
    expect(checkEntitlementByKey("swot", contextActive)).toBe(true);
    expect(checkEntitlementByKey("strategy-studio", contextActive)).toBe(true); // alias
    expect(checkEntitlementByKey("procurement", contextActive)).toBe(false);

    // Fail-closed on loading or error
    const contextLoading = { ...contextActive, isLoading: true };
    expect(checkEntitlementByKey("swot", contextLoading)).toBe(false);
  });

  it("Stage 6.2: isAccessPermitted enforces route, entitlement, and role restrictions", () => {
    const contextAdmin: EntitlementResolverContext = {
      tenantId: testTenantAlphaId,
      isSuperAdmin: false,
      isWorkspaceAdmin: true,
      roles: ["admin"],
      permissions: ["view_strategy"],
      enabledModules: [],
      activeAddons: ["swot"],
      serverEntitlements: { swot: { isActive: true } },
      isLoading: false,
      isError: false,
    };

    const contextEmployee: EntitlementResolverContext = {
      tenantId: testTenantAlphaId,
      isSuperAdmin: false,
      isWorkspaceAdmin: false,
      roles: ["employee"],
      permissions: [],
      enabledModules: [],
      activeAddons: ["swot"],
      serverEntitlements: { swot: { isActive: true } },
      isLoading: false,
      isError: false,
    };

    // Route /strategy-studio requires 'swot' entitlement
    expect(isAccessPermitted({ route: "/strategy-studio" }, contextAdmin)).toBe(true);

    // Route /procurement requires 'procurement' entitlement -> false
    expect(isAccessPermitted({ route: "/procurement" }, contextAdmin)).toBe(false);

    // Role check: Admin route protected from regular Employee
    expect(isAccessPermitted({ roles: ["admin"] }, contextEmployee)).toBe(false);
    expect(isAccessPermitted({ roles: ["admin"] }, contextAdmin)).toBe(true);
  });
});
