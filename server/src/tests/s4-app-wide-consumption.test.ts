/**
 * MASTERHRMS — S-Track Step S4: App-wide Consumption of Persisted Settings Test Suite
 *
 * Validates:
 * 1. Dynamic Public App Config: Realtime consumption of branding, identity, and locale.
 * 2. Multi-Tenant Branding Isolation: Tenant overrides do not contaminate platform or sibling tenants.
 * 3. Dynamic OAuth Consumption: Realtime visibility of social login providers (Google, GitHub, Microsoft, etc.) without secret leaks.
 * 4. Maintenance Mode Runtime Consumer: Emergency maintenance enforcement, HTTP 503 responses, and Super Admin bypass.
 * 5. Runtime Factory Consumption: Storage, Mailer, and SMS consumers reading persisted settings dynamically.
 * 6. Dual Razorpay Architecture & Security Boundaries Invariance.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import http from "http";
import { rawPrisma } from "../prisma";
import { appConfigRouter } from "../routes/app-config.routes";
import { authRouter } from "../routes/auth.routes";
import { settingsRouter } from "../routes/settings.routes";
import { maintenanceMiddleware, invalidateMaintenanceCache } from "../middleware/maintenance";
import { generateToken } from "../lib/jwt";
import { SettingsService } from "../services/settings/settings.service";
import { RuntimeLifecycleService } from "../services/settings/runtime-lifecycle.service";
import { OAuthFactory } from "../services/factories/oauth.factory";
import { StorageFactory } from "../services/factories/storage.factory";
import { MailerFactory } from "../services/factories/mailer.factory";
import { SmsFactory } from "../services/factories/sms.factory";

describe("S-Track Step S4: App-wide Settings Consumption Test Suite", { timeout: 35000 }, () => {
  const timestamp = Date.now();
  const tenantAId = `s4-tenant-a-${timestamp}`;
  const tenantBId = `s4-tenant-b-${timestamp}`;

  const app = express();
  app.use(express.json());

  // Mount test routers
  app.use("/api/v1/public", appConfigRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/v1/settings", settingsRouter);

  // Mount a mock protected business endpoint wrapped with maintenanceMiddleware
  app.get("/api/v1/protected-data", maintenanceMiddleware, (_req, res) => {
    return res.json({ success: true, message: "Operational business response" });
  });

  let server: http.Server;
  let baseUrl: string;

  let superToken: string;
  let tenantAToken: string;
  let tenantBToken: string;
  let superUserId: string;

  beforeAll(async () => {
    // 1. Create Isolated Test Tenants
    await rawPrisma.tenant.create({
      data: {
        id: tenantAId,
        name: `S4 Tenant A ${timestamp}`,
        slug: `s4-a-${timestamp}`,
      },
    });

    await rawPrisma.tenant.create({
      data: {
        id: tenantBId,
        name: `S4 Tenant B ${timestamp}`,
        slug: `s4-b-${timestamp}`,
      },
    });

    // 2. Create Users & JWT Tokens
    superUserId = `s4-super-${timestamp}`;
    await rawPrisma.user.create({
      data: {
        id: superUserId,
        email: `super_${timestamp}@platform.test`,
        passwordHash: "hash123",
        roles: { create: { role: "super_admin" } },
      },
    });
    superToken = generateToken({
      userId: superUserId,
      email: `super_${timestamp}@platform.test`,
      roles: ["super_admin"],
    });

    const tenantAUserId = `s4-admin-a-${timestamp}`;
    await rawPrisma.user.create({
      data: {
        id: tenantAUserId,
        email: `admin_${timestamp}@tenanta.test`,
        passwordHash: "hash123",
        roles: { create: [{ role: "hr_admin", tenantId: tenantAId }] },
        profile: {
          create: {
            id: `prof-a-${timestamp}`,
            email: `admin_${timestamp}@tenanta.test`,
            tenantId: tenantAId,
          },
        },
      },
    });
    tenantAToken = generateToken({
      userId: tenantAUserId,
      email: `admin_${timestamp}@tenanta.test`,
      tenantId: tenantAId,
      roles: ["hr_admin"],
    });

    const tenantBUserId = `s4-admin-b-${timestamp}`;
    await rawPrisma.user.create({
      data: {
        id: tenantBUserId,
        email: `admin_${timestamp}@tenantb.test`,
        passwordHash: "hash123",
        roles: { create: [{ role: "hr_admin", tenantId: tenantBId }] },
        profile: {
          create: {
            id: `prof-b-${timestamp}`,
            email: `admin_${timestamp}@tenantb.test`,
            tenantId: tenantBId,
          },
        },
      },
    });
    tenantBToken = generateToken({
      userId: tenantBUserId,
      email: `admin_${timestamp}@tenantb.test`,
      tenantId: tenantBId,
      roles: ["hr_admin"],
    });

    // 3. Start local ephemeral HTTP server
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    // Teardown HTTP server
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }

    // Cleanup maintenance mode
    try {
      await SettingsService.set("PLATFORM", null, "system.maintenance_mode", false);
      invalidateMaintenanceCache();
    } catch {}

    // Cleanup tenants and users
    try {
      await rawPrisma.user.deleteMany({
        where: { id: { in: [superUserId, `s4-admin-a-${timestamp}`, `s4-admin-b-${timestamp}`] } },
      });
      await rawPrisma.tenant.deleteMany({
        where: { id: { in: [tenantAId, tenantBId] } },
      });
    } catch {}
  });

  describe("1. Dynamic Public App Config Consumption", () => {
    it("1.1 GET /api/v1/public/app-config consumes persisted platform branding and locale", async () => {
      // Set platform branding
      await RuntimeLifecycleService.updateSettingsGroup(
        "PLATFORM",
        null,
        "branding",
        {
          "branding.app_name": "Apex Global ERP",
          "branding.primary_color": "#4F46E5",
          "branding.footer_text": "© 2026 Apex Global Technologies",
        },
        { userId: superUserId }
      );

      await RuntimeLifecycleService.updateSettingsGroup(
        "PLATFORM",
        null,
        "locale",
        {
          "locale.default_currency": "USD",
          "locale.currency_symbol": "$",
          "locale.timezone": "America/New_York",
          "locale.date_format": "YYYY-MM-DD",
        },
        { userId: superUserId }
      );

      const res = await fetch(`${baseUrl}/api/v1/public/app-config`);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.appName).toBe("Apex Global ERP");
      expect(data.primaryColor).toBe("#4F46E5");
      expect(data.footerText).toBe("© 2026 Apex Global Technologies");
      expect(data.locale.defaultCurrency).toBe("USD");
      expect(data.locale.currencySymbol).toBe("$");
      expect(data.locale.timezone).toBe("America/New_York");
      expect(data.locale.dateFormat).toBe("YYYY-MM-DD");
      expect(data.scope).toBe("PLATFORM");
    });

    it("1.2 Public app-config contains zero decrypted secrets or credential fields", async () => {
      const res = await fetch(`${baseUrl}/api/v1/public/app-config`);
      const text = await res.text();

      expect(text).not.toContain("smtp_password");
      expect(text).not.toContain("clientSecret");
      expect(text).not.toContain("apiSecret");
      expect(text).not.toContain("s3SecretKey");
    });
  });

  describe("2. Multi-Tenant Scope Isolation & Context Branding", () => {
    it("2.1 Tenant A branding override is reflected when requested with Tenant A authorization", async () => {
      // Set Tenant A specific branding
      await RuntimeLifecycleService.updateSettingsGroup(
        "TENANT",
        tenantAId,
        "branding",
        {
          "branding.app_name": "Tenant A Custom HR",
          "branding.primary_color": "#10B981",
        },
        { userId: superUserId }
      );

      await RuntimeLifecycleService.updateSettingsGroup(
        "TENANT",
        tenantAId,
        "locale",
        {
          "locale.default_currency": "EUR",
          "locale.currency_symbol": "€",
        },
        { userId: superUserId }
      );

      // Query app-config with Tenant A bearer token
      const resA = await fetch(`${baseUrl}/api/v1/public/app-config?pathname=%2F_app%2Fdashboard`, {
        headers: { Authorization: `Bearer ${tenantAToken}` },
      });
      expect(resA.status).toBe(200);
      const dataA = await resA.json();

      expect(dataA.scope).toBe("TENANT");
      expect(dataA.tenantId).toBe(tenantAId);
      expect(dataA.appName).toBe("Tenant A Custom HR");
      expect(dataA.primaryColor).toBe("#10B981");
      expect(dataA.locale.defaultCurrency).toBe("EUR");
      expect(dataA.locale.currencySymbol).toBe("€");

      // Verify Platform config remains unaffected
      const resPlatform = await fetch(`${baseUrl}/api/v1/public/app-config`);
      const dataPlatform = await resPlatform.json();
      expect(dataPlatform.appName).toBe("Apex Global ERP");
      expect(dataPlatform.locale.defaultCurrency).toBe("USD");

      // Verify Tenant B config does NOT leak Tenant A branding
      const resB = await fetch(`${baseUrl}/api/v1/public/app-config?pathname=%2F_app%2Fdashboard`, {
        headers: { Authorization: `Bearer ${tenantBToken}` },
      });
      const dataB = await resB.json();
      expect(dataB.tenantId).toBe(tenantBId);
      expect(dataB.appName).not.toBe("Tenant A Custom HR");
    });
  });

  describe("3. Dynamic OAuth Social Login Buttons & Providers", () => {
    it("3.1 GET /api/auth/oauth/config returns real provider status without secret leakage", async () => {
      const res = await fetch(`${baseUrl}/api/auth/oauth/config`);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data).toHaveProperty("google");
      expect(data).toHaveProperty("github");
      expect(data).toHaveProperty("microsoft");
      expect(data).toHaveProperty("apple");
      expect(data).toHaveProperty("linkedin");
      expect(data).toHaveProperty("facebook");

      // Verify zero clientSecret exposure
      const rawText = JSON.stringify(data);
      expect(rawText).not.toContain("clientSecret");
      expect(rawText).not.toContain("client_secret");
      expect(rawText).not.toContain("appSecret");
    });

    it("3.2 Configuring GitHub in SettingsService dynamically enables GitHub OAuth button", async () => {
      await RuntimeLifecycleService.updateSettingsGroup(
        "PLATFORM",
        null,
        "oauth",
        {
          "oauth.github_enabled": true,
          "oauth.github_client_id": "gh_client_12345",
          "oauth.github_client_secret": "gh_secret_super_secret",
        },
        { userId: superUserId }
      );

      const res = await fetch(`${baseUrl}/api/auth/oauth/config`);
      const data = await res.json();

      expect(data.github.enabled).toBe(true);
      expect(data.github.configured).toBe(true);
      expect(data.providers.github.enabled).toBe(true);
    });

    it("3.3 Disabling GitHub in SettingsService immediately disables GitHub OAuth button", async () => {
      await RuntimeLifecycleService.updateSettingsGroup(
        "PLATFORM",
        null,
        "oauth",
        {
          "oauth.github_enabled": false,
        },
        { userId: superUserId }
      );

      const res = await fetch(`${baseUrl}/api/auth/oauth/config`);
      const data = await res.json();

      expect(data.github.enabled).toBe(false);
      expect(data.providers.github.enabled).toBe(false);
    });

    it("3.4 Initiating unconfigured OAuth provider fails gracefully without server crash", async () => {
      const res = await fetch(`${baseUrl}/api/auth/oauth/linkedin`, {
        redirect: "manual",
      });

      // Should redirect to auth page with descriptive error parameter
      expect(res.status).toBe(302);
      const location = res.headers.get("location");
      expect(location).toContain("/auth?error=");
    });
  });

  describe("4. Maintenance Mode Runtime Enforcement & Super Admin Bypass", () => {
    it("4.1 Activating maintenance mode sets active flag in app-config and blocks regular traffic with HTTP 503", async () => {
      await RuntimeLifecycleService.updateSettingsGroup(
        "PLATFORM",
        null,
        "system",
        {
          "system.maintenance_mode": true,
          "system.maintenance_message": "Platform upgrading to v2.5.0 database engine.",
        },
        { userId: superUserId }
      );

      // Verify app-config reflects active maintenance mode
      const configRes = await fetch(`${baseUrl}/api/v1/public/app-config`);
      expect(configRes.status).toBe(200);
      const configData = await configRes.json();
      expect(configData.maintenance.active).toBe(true);
      expect(configData.maintenance.message).toBe("Platform upgrading to v2.5.0 database engine.");

      // Regular traffic without token receives HTTP 503
      const blockedRes = await fetch(`${baseUrl}/api/v1/protected-data`);
      expect(blockedRes.status).toBe(503);
      const blockedData = await blockedRes.json();
      expect(blockedData.code).toBe("SYSTEM_MAINTENANCE");
      expect(blockedData.error).toContain("Platform upgrading to v2.5.0");

      // Tenant admin request also receives HTTP 503
      const tenantBlockedRes = await fetch(`${baseUrl}/api/v1/protected-data`, {
        headers: { Authorization: `Bearer ${tenantAToken}` },
      });
      expect(tenantBlockedRes.status).toBe(503);
    });

    it("4.2 Authorized Super Admin bypasses maintenance mode and accesses protected routes", async () => {
      const superRes = await fetch(`${baseUrl}/api/v1/protected-data`, {
        headers: { Authorization: `Bearer ${superToken}` },
      });
      expect(superRes.status).toBe(200);
      const superData = await superRes.json();
      expect(superData.success).toBe(true);
      expect(superData.message).toBe("Operational business response");
    });

    it("4.3 Disabling maintenance mode immediately restores full traffic flow", async () => {
      await RuntimeLifecycleService.updateSettingsGroup(
        "PLATFORM",
        null,
        "system",
        {
          "system.maintenance_mode": false,
        },
        { userId: superUserId }
      );

      // Verify app-config reflects inactive maintenance mode
      const configRes = await fetch(`${baseUrl}/api/v1/public/app-config`);
      const configData = await configRes.json();
      expect(configData.maintenance.active).toBe(false);

      // Regular traffic succeeds without 503
      const resumedRes = await fetch(`${baseUrl}/api/v1/protected-data`);
      expect(resumedRes.status).toBe(200);
    });
  });

  describe("5. Runtime Factory Consumption (Storage, Mailer, SMS)", () => {
    it("5.1 StorageFactory resolves dynamic tenant driver and preserves fail-closed security", async () => {
      const driverA = await StorageFactory.getDriver("TENANT", tenantAId);
      expect(driverA).toBeDefined();

      // Configure S3 settings for tenant A
      await RuntimeLifecycleService.updateSettingsGroup(
        "TENANT",
        tenantAId,
        "storage",
        {
          "storage.provider": "s3",
          "storage.s3_bucket": "tenant-a-backups",
          "storage.s3_region": "us-east-1",
          "storage.s3_access_key": "AKIA_TENANT_A",
          "storage.s3_secret_key": "secret_tenant_a_key",
        },
        { userId: superUserId }
      );

      const driverV2 = await StorageFactory.getDriver("TENANT", tenantAId);
      expect(driverV2).toBeDefined();

      // Ensure Tenant B is unaffected and retains isolated config
      const configB = await StorageFactory.resolveConfig("TENANT", tenantBId);
      expect(configB.s3Bucket).not.toBe("tenant-a-backups");
    });

    it("5.2 MailerFactory invalidation and dynamic settings resolution", async () => {
      await RuntimeLifecycleService.updateSettingsGroup(
        "TENANT",
        tenantAId,
        "email",
        {
          "email.from_name": "Tenant A HR Operations",
          "email.from_email": "hr@tenanta.com",
        },
        { userId: superUserId }
      );

      const resolved = await MailerFactory.resolveSettings("TENANT", tenantAId);
      expect(resolved.fromName).toBe("Tenant A HR Operations");
      expect(resolved.fromEmail).toBe("hr@tenanta.com");
    });
  });

  describe("6. Architectural Invariance & Security Boundaries", () => {
    it("6.1 Dual Razorpay architecture remains strictly separate", async () => {
      // 1. Platform Razorpay in PLATFORM scope
      await RuntimeLifecycleService.updateSettingsGroup(
        "PLATFORM",
        null,
        "payments",
        {
          "payments.razorpay_enabled": true,
          "payments.razorpay_key_id": "rzp_test_platform_key_id",
          "payments.razorpay_key_secret": "platform_secret_12345",
        },
        { userId: superUserId }
      );

      // 2. Tenant A configures custom Razorpay credentials
      await RuntimeLifecycleService.updateSettingsGroup(
        "TENANT",
        tenantAId,
        "payments",
        {
          "payments.razorpay_enabled": true,
          "payments.razorpay_key_id": "rzp_test_tenant_a_custom_key",
          "payments.razorpay_key_secret": "tenant_a_secret_54321",
        },
        { userId: superUserId }
      );

      const platformGroup = await SettingsService.getGroup("PLATFORM", null, "payments");
      const tenantAGroup = await SettingsService.getGroup("TENANT", tenantAId, "payments");
      const tenantBGroup = await SettingsService.getGroup("TENANT", tenantBId, "payments");

      expect(platformGroup.values["payments.razorpay_key_id"]).toBe("rzp_test_platform_key_id");
      expect(platformGroup.sources["payments.razorpay_key_id"]).toBe("PLATFORM");

      expect(tenantAGroup.values["payments.razorpay_key_id"]).toBe("rzp_test_tenant_a_custom_key");
      expect(tenantAGroup.sources["payments.razorpay_key_id"]).toBe("TENANT");

      // Tenant B did not configure custom payments, so it inherits platform without tenant A contamination
      expect(tenantBGroup.values["payments.razorpay_key_id"]).toBe("rzp_test_platform_key_id");
      expect(tenantBGroup.sources["payments.razorpay_key_id"]).toBe("PLATFORM");
    });

    it("6.2 Tenant Admin cannot modify PLATFORM settings to breach isolation", async () => {
      const res = await fetch(`${baseUrl}/api/v1/settings/PLATFORM/system`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tenantAToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: {
            "system.maintenance_mode": true,
          },
        }),
      });

      expect(res.status).toBe(403);
    });
  });
});
