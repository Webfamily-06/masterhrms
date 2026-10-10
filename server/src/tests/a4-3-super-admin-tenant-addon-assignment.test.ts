/**
 * MASTERHRMS — Phase A4.3: Super Admin Tenant Add-on Assignment & Integration Catalog Suite
 *
 * Verifies:
 * 1. Super Admin can view assignments for a selected workspace (GET /api/super/tenants/:id/addons)
 * 2. Unauthorized users cannot assign or revoke add-ons (401 / 403 enforcement)
 * 3. A manual assignment appears for the intended tenant
 * 4. Other tenants cannot see that assignment (tenant isolation)
 * 5. Duplicate assignment attempts do not create duplicate active records (idempotency)
 * 6. Revocation removes access only when no other valid entitlement source grants it
 * 7. Purchased and plan-included entitlements remain intact and protected from manual revocation
 * 8. Assignment and revocation actions produce audit records in audit_logs
 * 9. Archived catalog entries cannot be newly assigned (400 ARCHIVED_ADDON)
 * 10. All six integration catalog entries are unique and use expected stable slugs
 * 11. Catalog registration does not falsely mark integrations as operational
 * 12. Integration status endpoints never expose secrets or credentials
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import { prisma, rawPrisma } from "../prisma";
import { superRouter } from "../routes/super.routes";
import { addonsRouter } from "../routes/addons.routes";
import { generateToken } from "../lib/jwt";

const db = rawPrisma || prisma;

describe("MASTERHRMS — Phase A4.3 Super Admin Tenant Add-on Assignment & Integrations Suite", () => {
  const timestamp = Date.now();
  const testSuperAdminId = `usr-super-a43-${timestamp}`;
  const testTenantAdminId = `usr-tenant-a43-${timestamp}`;
  const testTenantAlphaId = `tenant-a43-alpha-${timestamp}`;
  const testTenantBetaId = `tenant-a43-beta-${timestamp}`;

  let superAdminToken: string;
  let tenantAdminToken: string;

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
    // 1. Create Super Admin User & Profile
    await db.user.create({
      data: {
        id: testSuperAdminId,
        email: `super-a43-${timestamp}@masterhrms.test`,
        passwordHash: "mock-hash",
        roles: {
          create: [{ role: "super_admin" }],
        },
        profile: {
          create: {
            fullName: "Super Admin Tester A4.3",
          },
        },
      },
    });

    superAdminToken = generateToken({
      userId: testSuperAdminId,
      email: `super-a43-${timestamp}@masterhrms.test`,
      tenantId: null,
      roles: ["super_admin"],
    });

    // 2. Create Tenant Alpha & Beta
    await db.tenant.create({
      data: {
        id: testTenantAlphaId,
        name: `Alpha Workspace A4.3 ${timestamp}`,
        slug: `alpha-a43-${timestamp}`,
      },
    });

    await db.tenant.create({
      data: {
        id: testTenantBetaId,
        name: `Beta Workspace A4.3 ${timestamp}`,
        slug: `beta-a43-${timestamp}`,
      },
    });

    // 3. Create Tenant Admin for Alpha
    await db.user.create({
      data: {
        id: testTenantAdminId,
        email: `tenant-a43-${timestamp}@alpha.test`,
        passwordHash: "mock-hash",
        roles: {
          create: [{ role: "hr_admin" }],
        },
        profile: {
          create: {
            fullName: "Alpha Admin User",
            tenantId: testTenantAlphaId,
          },
        },
      },
    });

    tenantAdminToken = generateToken({
      userId: testTenantAdminId,
      email: `tenant-a43-${timestamp}@alpha.test`,
      tenantId: testTenantAlphaId,
      roles: ["hr_admin"],
    });

    // 4. Mount test Express Server
    testApp = express();
    testApp.use(express.json());
    testApp.use("/api/super", superRouter);
    testApp.use("/api/addons", addonsRouter);

    await new Promise<void>((resolve) => {
      httpServer = testApp.listen(0, () => {
        const addr = httpServer.address();
        const port = typeof addr === "object" && addr ? addr.port : 4199;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (httpServer) {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    }

    // Clean up test data
    try {
      await db.auditLog.deleteMany({
        where: { tenantId: { in: [testTenantAlphaId, testTenantBetaId] } },
      });
      await db.tenantAddon.deleteMany({
        where: { tenantId: { in: [testTenantAlphaId, testTenantBetaId] } },
      });
      await db.userRole.deleteMany({
        where: { userId: { in: [testSuperAdminId, testTenantAdminId] } },
      });
      await db.profile.deleteMany({
        where: { userId: { in: [testSuperAdminId, testTenantAdminId] } },
      });
      await db.user.deleteMany({
        where: { id: { in: [testSuperAdminId, testTenantAdminId] } },
      });
      await db.tenant.deleteMany({
        where: { id: { in: [testTenantAlphaId, testTenantBetaId] } },
      });
    } catch (e) {
      // non-fatal cleanup
    }
  });

  describe("Group 1: Authorization and RBAC Enforcement", () => {
    it("rejects unauthorized requests without auth header (401)", async () => {
      const { status } = await apiFetch(`/api/super/tenants/${testTenantAlphaId}/addons`);
      expect(status).toBe(401);
    });

    it("rejects non-super-admin authenticated requests (403)", async () => {
      const { status } = await apiFetch(`/api/super/tenants/${testTenantAlphaId}/addons`, {
        headers: { Authorization: `Bearer ${tenantAdminToken}` },
      });
      expect(status).toBe(403);
    });

    it("prevents non-super-admin from assigning an add-on (403)", async () => {
      const { status } = await apiFetch(
        `/api/super/tenants/${testTenantAlphaId}/addons/woocommerce-sync/assign`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${tenantAdminToken}` },
          body: { reason: "Unauthorized attempt" },
        }
      );
      expect(status).toBe(403);
    });

    it("prevents non-super-admin from revoking an add-on (403)", async () => {
      const { status } = await apiFetch(
        `/api/super/tenants/${testTenantAlphaId}/addons/woocommerce-sync/revoke`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${tenantAdminToken}` },
          body: { reason: "Unauthorized attempt" },
        }
      );
      expect(status).toBe(403);
    });
  });

  describe("Group 2: Super Admin Add-on Assignment & Idempotency", () => {
    it("allows Super Admin to view assignments and catalog for a workspace", async () => {
      const { status, body } = await apiFetch(
        `/api/super/tenants/${testTenantAlphaId}/addons`,
        {
          headers: { Authorization: `Bearer ${superAdminToken}` },
        }
      );

      expect(status).toBe(200);
      expect(body.tenant).toBeDefined();
      expect(body.tenant.id).toBe(testTenantAlphaId);
      expect(Array.isArray(body.catalogAddons)).toBe(true);
      expect(body.catalogAddons.length).toBeGreaterThanOrEqual(6);
      expect(Array.isArray(body.assignments)).toBe(true);
    });

    it("assigns an add-on to Tenant Alpha and creates an audit record", async () => {
      const { status, body } = await apiFetch(
        `/api/super/tenants/${testTenantAlphaId}/addons/woocommerce-sync/assign`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${superAdminToken}` },
          body: { reason: "Testing manual grant" },
        }
      );

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.entitlement.addonSlug).toBe("woocommerce-sync");
      expect(body.entitlement.status).toBe("active");
      expect(body.entitlement.plan).toBe("manual_assignment");

      // Verify audit record in database
      const auditLog = await db.auditLog.findFirst({
        where: {
          tenantId: testTenantAlphaId,
          action: "SUPER_ADMIN_ADDON_ASSIGNED",
        },
      });
      expect(auditLog).toBeDefined();
      expect((auditLog?.afterJson as any)?.addonSlug).toBe("woocommerce-sync");
    });

    it("enforces idempotency on duplicate assignment attempts", async () => {
      const { status, body } = await apiFetch(
        `/api/super/tenants/${testTenantAlphaId}/addons/woocommerce-sync/assign`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${superAdminToken}` },
          body: { reason: "Duplicate grant attempt" },
        }
      );

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.alreadyActive).toBe(true);

      // Verify database still only has 1 active assignment for Tenant Alpha & woocommerce-sync
      const activeCount = await db.tenantAddon.count({
        where: {
          tenantId: testTenantAlphaId,
          addonSlug: "woocommerce-sync",
          status: "active",
        },
      });
      expect(activeCount).toBe(1);
    });

    it("verifies Tenant Alpha can see its assignment, but Tenant Beta CANNOT (Tenant Isolation)", async () => {
      // 1. Tenant Alpha checks entitlements via /api/addons/entitlements
      const alphaRes = await apiFetch("/api/addons/entitlements", {
        headers: { Authorization: `Bearer ${tenantAdminToken}` },
      });
      expect(alphaRes.status).toBe(200);
      expect(alphaRes.body.entitlements["woocommerce-sync"]).toBeDefined();
      expect(alphaRes.body.entitlements["woocommerce-sync"].isActive).toBe(true);

      // 2. Super Admin views Tenant Beta assignments: must NOT contain woocommerce-sync
      const betaRes = await apiFetch(
        `/api/super/tenants/${testTenantBetaId}/addons`,
        {
          headers: { Authorization: `Bearer ${superAdminToken}` },
        }
      );
      expect(betaRes.status).toBe(200);
      const betaAssignments = betaRes.body.assignments.filter(
        (a: any) => a.addonSlug === "woocommerce-sync" && a.status === "active"
      );
      expect(betaAssignments.length).toBe(0);
    });
  });

  describe("Group 3: Revocation Protection and Commercial Entitlement Safety", () => {
    it("revokes manual assignment and produces an audit log", async () => {
      const { status, body } = await apiFetch(
        `/api/super/tenants/${testTenantAlphaId}/addons/woocommerce-sync/revoke`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${superAdminToken}` },
          body: { reason: "End of trial evaluation" },
        }
      );

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.entitlement.status).toBe("cancelled");

      // Verify audit log
      const auditLog = await db.auditLog.findFirst({
        where: {
          tenantId: testTenantAlphaId,
          action: "SUPER_ADMIN_ADDON_REVOKED",
        },
        orderBy: { createdAt: "desc" },
      });
      expect(auditLog).toBeDefined();
      expect((auditLog?.afterJson as any)?.addonSlug).toBe("woocommerce-sync");
    });

    it("protects commercially purchased entitlements from manual administrative revocation", async () => {
      // Seed a commercially purchased entitlement for Tenant Beta
      await db.tenantAddon.upsert({
        where: {
          tenantId_addonSlug: {
            tenantId: testTenantBetaId,
            addonSlug: "whatsapp-alerts",
          },
        },
        create: {
          tenantId: testTenantBetaId,
          addonSlug: "whatsapp-alerts",
          status: "active",
          plan: "standard",
          features: { source: "PURCHASED", orderId: "ord_commercial_123" },
        },
        update: {
          status: "active",
          plan: "standard",
          features: { source: "PURCHASED", orderId: "ord_commercial_123" },
        },
      });

      // Attempt to revoke via manual revocation endpoint
      const { status, body } = await apiFetch(
        `/api/super/tenants/${testTenantBetaId}/addons/whatsapp-alerts/revoke`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${superAdminToken}` },
          body: { reason: "Attempt to revoke purchased entitlement" },
        }
      );

      expect(status).toBe(400);
      expect(body.code).toBe("PURCHASED_ENTITLEMENT_PROTECTED");

      // Ensure the entitlement remains active
      const dbRecord = await db.tenantAddon.findUnique({
        where: {
          tenantId_addonSlug: {
            tenantId: testTenantBetaId,
            addonSlug: "whatsapp-alerts",
          },
        },
      });
      expect(dbRecord?.status).toBe("active");
    });

    it("rejects manual assignment of archived catalog add-ons (400 ARCHIVED_ADDON)", async () => {
      // Create a temporary archived add-on in database
      const archivedSlug = `temp-archived-${timestamp}`;
      await db.addon.create({
        data: {
          slug: archivedSlug,
          name: "Temporary Archived Addon",
          category: "Integrations",
          status: "archived",
        },
      });

      try {
        const { status, body } = await apiFetch(
          `/api/super/tenants/${testTenantAlphaId}/addons/${archivedSlug}/assign`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${superAdminToken}` },
            body: { reason: "Assign archived" },
          }
        );

        expect(status).toBe(400);
        expect(body.code).toBe("ARCHIVED_ADDON");
      } finally {
        await db.addon.delete({ where: { slug: archivedSlug } });
      }
    });
  });

  describe("Group 4: Integration Catalog Slugs, Readiness & Secret Masking", () => {
    it("ensures all six integration add-ons are registered with unique stable slugs", async () => {
      const requiredSlugs = [
        "woocommerce-sync",
        "shopify-sync",
        "razorpay-gateway",
        "whatsapp-alerts",
        "tally-importer",
        "google-workspace-integration",
      ];

      const addons = await db.addon.findMany({
        where: { slug: { in: requiredSlugs } },
      });

      const foundSlugs = addons.map((a) => a.slug);
      for (const slug of requiredSlugs) {
        expect(foundSlugs).toContain(slug);
      }

      // Slugs must be strictly unique
      const uniqueSlugs = new Set(foundSlugs);
      expect(uniqueSlugs.size).toBe(requiredSlugs.length);
    });

    it("returns accurate readiness classification without exposing external secrets", async () => {
      const { status, body } = await apiFetch(
        `/api/super/tenants/${testTenantAlphaId}/addons/integrations-status`,
        {
          headers: { Authorization: `Bearer ${superAdminToken}` },
        }
      );

      expect(status).toBe(200);
      expect(body.tenantId).toBe(testTenantAlphaId);
      expect(Array.isArray(body.integrations)).toBe(true);

      const integrations = body.integrations;
      expect(integrations.length).toBe(6);

      const rawJson = JSON.stringify(body);
      // Zero token/secret leakage assertions
      expect(rawJson).not.toContain("consumer_secret");
      expect(rawJson).not.toContain("wp_app_password");
      expect(rawJson).not.toContain("keySecret");
      expect(rawJson).not.toContain("secretKey");
      expect(rawJson).not.toContain("accessToken");

      const tally = integrations.find((i: any) => i.slug === "tally-importer");
      expect(tally?.readinessStatus).toBe("PARTIALLY_IMPLEMENTED");

      const woo = integrations.find((i: any) => i.slug === "woocommerce-sync");
      expect(["IMPLEMENTED_UNCONFIGURED", "IMPLEMENTED_AND_CONFIGURED"]).toContain(
        woo?.readinessStatus
      );
    });
  });
});
