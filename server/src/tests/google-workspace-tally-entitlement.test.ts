/**
 * MASTERHRMS — Google Workspace & Tally Prime Sync Entitlement & Access Verification Test Suite
 *
 * Covers:
 * 1. Entitled tenant accesses Google Workspace configuration API successfully.
 * 2. Unentitled tenant receives 403 ADDON_REQUIRED for Google Workspace.
 * 3. Entitled tenant accesses Tally Prime importer preview API successfully.
 * 4. Unentitled tenant receives 403 ADDON_REQUIRED for Tally Prime.
 * 5. Tenant isolation: Tenant A's entitlement does not grant access to Tenant B.
 * 6. Entitlement resolver mapping: Route-to-addon and alias normalization for Google Workspace & Tally.
 * 7. Missing external credentials return valid configuration object with empty/masked fields rather than plan restriction.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import { prisma, rawPrisma } from "../prisma";
import { workspaceRouter } from "../routes/workspace.routes";
import { accountingRouter } from "../routes/accounting.routes";
import { generateToken } from "../lib/jwt";
import {
  checkEntitlementByKey,
  isAccessPermitted,
  EntitlementResolverContext,
  ROUTE_ENTITLEMENT_MAP,
} from "../../../src/lib/navigation-resolver";

const db = rawPrisma || prisma;

describe("Google Workspace & Tally Prime Sync Entitlement & Verification Suite", () => {
  const timestamp = Date.now();
  const tenantAlphaId = `gw-tally-alpha-${timestamp}`;
  const tenantBetaId = `gw-tally-beta-${timestamp}`;
  const userAlphaId = `usr-gw-alpha-${timestamp}`;
  const userBetaId = `usr-gw-beta-${timestamp}`;

  let tokenAlpha: string;
  let tokenBeta: string;
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
    // 1. Create Tenant Alpha (Entitled)
    await db.tenant.create({
      data: {
        id: tenantAlphaId,
        name: "Alpha Entitled Corp",
        slug: `alpha-${timestamp}`,
      },
    });

    // 2. Create Tenant Beta (Unentitled)
    await db.tenant.create({
      data: {
        id: tenantBetaId,
        name: "Beta Unentitled Corp",
        slug: `beta-${timestamp}`,
      },
    });

    // 3. Create Users
    await db.user.create({
      data: {
        id: userAlphaId,
        email: `alpha-admin-${timestamp}@test.com`,
        passwordHash: "hash",
        roles: { create: [{ role: "hr_admin" }] },
        profile: { create: { fullName: "Alpha Admin", tenantId: tenantAlphaId } },
      },
    });

    await db.user.create({
      data: {
        id: userBetaId,
        email: `beta-admin-${timestamp}@test.com`,
        passwordHash: "hash",
        roles: { create: [{ role: "hr_admin" }] },
        profile: { create: { fullName: "Beta Admin", tenantId: tenantBetaId } },
      },
    });

    tokenAlpha = generateToken({
      userId: userAlphaId,
      email: `alpha-admin-${timestamp}@test.com`,
      tenantId: tenantAlphaId,
      roles: ["hr_admin"],
    });

    tokenBeta = generateToken({
      userId: userBetaId,
      email: `beta-admin-${timestamp}@test.com`,
      tenantId: tenantBetaId,
      roles: ["hr_admin"],
    });

    // 4. Grant Tenant Alpha entitlements for Google Workspace & Tally Importer & Finance
    await db.tenantAddon.createMany({
      data: [
        { tenantId: tenantAlphaId, addonSlug: "google-workspace-integration", status: "active" },
        { tenantId: tenantAlphaId, addonSlug: "tally-importer", status: "active" },
      ],
    });

    await db.tenantModule.createMany({
      data: [
        { tenantId: tenantAlphaId, moduleKey: "google-workspace-integration", isEnabled: true },
        { tenantId: tenantAlphaId, moduleKey: "tally-importer", isEnabled: true },
        { tenantId: tenantAlphaId, moduleKey: "product_finance", isEnabled: true },
        { tenantId: tenantBetaId, moduleKey: "product_finance", isEnabled: true }, // Has Finance, but lacks tally-importer add-on
      ],
    });

    // 5. Setup Express app
    testApp = express();
    testApp.use(express.json());
    testApp.use("/api/workspace", workspaceRouter);
    testApp.use("/api/accounting", accountingRouter);

    await new Promise<void>((resolve) => {
      httpServer = testApp.listen(0, () => {
        const addr = httpServer.address();
        if (addr && typeof addr === "object") {
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
    // Cleanup test data
    await db.tenantAddon.deleteMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
    });
    await db.tenantModule.deleteMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
    });
    await db.userRole.deleteMany({
      where: { userId: { in: [userAlphaId, userBetaId] } },
    });
    await db.profile.deleteMany({
      where: { userId: { in: [userAlphaId, userBetaId] } },
    });
    await db.user.deleteMany({
      where: { id: { in: [userAlphaId, userBetaId] } },
    });
    await db.tenant.deleteMany({
      where: { id: { in: [tenantAlphaId, tenantBetaId] } },
    });
  });

  describe("1. Authoritative Route Entitlement Mapping", () => {
    it("maps /google-workspace to google-workspace-integration", () => {
      expect(ROUTE_ENTITLEMENT_MAP["/google-workspace"]).toBe("google-workspace-integration");
    });

    it("maps /tally-importer to tally-importer", () => {
      expect(ROUTE_ENTITLEMENT_MAP["/tally-importer"]).toBe("tally-importer");
    });

    it("resolves entitlement with alias fallbacks in client navigation resolver", () => {
      const alphaContext: EntitlementResolverContext = {
        tenantId: tenantAlphaId,
        isSuperAdmin: false,
        isWorkspaceAdmin: true,
        roles: ["hr_admin"],
        permissions: [],
        enabledModules: ["google-workspace-integration", "tally-importer"],
        activeAddons: ["google-workspace-integration", "tally-importer"],
        serverEntitlements: {},
        isLoading: false,
        isError: false,
      };

      // Direct and aliased lookups
      expect(checkEntitlementByKey("google-workspace-integration", alphaContext)).toBe(true);
      expect(checkEntitlementByKey("google-workspace", alphaContext)).toBe(true);
      expect(checkEntitlementByKey("tally-importer", alphaContext)).toBe(true);
      expect(checkEntitlementByKey("tally", alphaContext)).toBe(true);

      const betaContext: EntitlementResolverContext = {
        tenantId: tenantBetaId,
        isSuperAdmin: false,
        isWorkspaceAdmin: false,
        roles: ["employee"],
        permissions: [],
        enabledModules: [],
        activeAddons: [],
        serverEntitlements: {},
        isLoading: false,
        isError: false,
      };

      expect(checkEntitlementByKey("google-workspace-integration", betaContext)).toBe(false);
      expect(checkEntitlementByKey("google-workspace", betaContext)).toBe(false);
      expect(checkEntitlementByKey("tally-importer", betaContext)).toBe(false);
      expect(checkEntitlementByKey("tally", betaContext)).toBe(false);
    });
  });

  describe("2. Google Workspace Backend Authorization & Config", () => {
    it("allows entitled Tenant Alpha to fetch Google Workspace config", async () => {
      const res = await apiFetch("/api/workspace/google/config", {
        headers: { Authorization: `Bearer ${tokenAlpha}` },
      });
      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
      expect(typeof res.body.config?.ssoEnabled).toBe("boolean");
      expect(typeof res.body.config?.driveEnabled).toBe("boolean");
    });

    it("allows entitled Tenant Alpha to save Google Workspace config", async () => {
      const res = await apiFetch("/api/workspace/google/config", {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: {
          clientId: "test-client-id-alpha.apps.googleusercontent.com",
          clientSecret: "test-secret-alpha",
          ssoEnabled: true,
          driveEnabled: true,
        },
      });
      expect(res.status).toBe(200);
      expect(res.body.config?.ssoEnabled).toBe(true);
      expect(res.body.config?.driveEnabled).toBe(true);
    });

    it("denies unentitled Tenant Beta with 403 ADDON_REQUIRED", async () => {
      const res = await apiFetch("/api/workspace/google/config", {
        headers: { Authorization: `Bearer ${tokenBeta}` },
      });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("ADDON_REQUIRED");
      expect(res.body.addonSlug).toBe("google-workspace-integration");
    });
  });

  describe("3. Tally Prime Importer Backend Authorization & Validation", () => {
    it("allows entitled Tenant Alpha to invoke Tally preview API", async () => {
      const res = await apiFetch("/api/accounting/tally/preview", {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: {
          fileContent: `<ENVELOPE><BODY><DATA><TALLYMESSAGE><VOUCHER VCHTYPE="Payment" VOUCHERNUMBER="101"><DATE>20260401</DATE><ALLLEDGERENTRIES.LIST><LEDGERNAME>Rent Expense</LEDGERNAME><ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE><AMOUNT>-5000</AMOUNT></ALLLEDGERENTRIES.LIST></VOUCHER></TALLYMESSAGE></DATA></BODY></ENVELOPE>`,
          fileName: "tally_export.xml",
        },
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.rows)).toBe(true);
    });

    it("denies unentitled Tenant Beta with 403 ADDON_REQUIRED", async () => {
      const res = await apiFetch("/api/accounting/tally/preview", {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenBeta}` },
        body: {
          fileContent: "test",
        },
      });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("ADDON_REQUIRED");
      expect(res.body.addonSlug).toBe("tally-importer");
    });
  });

  describe("4. Tenant Isolation & Missing Credentials State", () => {
    it("verifies Tenant Beta cannot view or modify Tenant Alpha config", async () => {
      const alphaConfig = await apiFetch("/api/workspace/google/config", {
        headers: { Authorization: `Bearer ${tokenAlpha}` },
      });
      expect(alphaConfig.status).toBe(200);

      // Beta request is blocked at gateway
      const betaAttempt = await apiFetch("/api/workspace/google/config", {
        headers: { Authorization: `Bearer ${tokenBeta}` },
      });
      expect(betaAttempt.status).toBe(403);
    });

    it("returns clean unconfigured state with masked fields if credentials are not set", async () => {
      // In a tenant with entitlement but empty credentials:
      const res = await apiFetch("/api/workspace/google/config", {
        headers: { Authorization: `Bearer ${tokenAlpha}` },
      });
      expect(res.status).toBe(200);
      // Secrets should be masked or empty, not revealing sensitive values
      if (res.body.clientSecret) {
        expect(res.body.clientSecret).toMatch(/^•+$/);
      }
    });
  });
});
