import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import http from "http";
import { prisma, rawPrisma } from "../prisma";
import { SettingsService } from "../services/settings/settings.service";
import { MediaService } from "../services/media/media.service";
import { appConfigRouter } from "../routes/app-config.routes";
import { settingsRouter } from "../routes/settings.routes";
import { cmsRouter } from "../routes/cms.routes";
import { superRouter } from "../routes/super.routes";
import { generateToken } from "../lib/jwt";

describe("Platform Identity & Colors Settings Restart Persistence & DB Source-of-Truth", () => {
  const app = express();
  app.use(express.json());

  // Mount routes matching server/src/index.ts
  app.use("/api/v1/settings", settingsRouter);
  app.use("/api/v1/public", appConfigRouter);
  app.use("/api/public", appConfigRouter);
  app.use("/api", appConfigRouter);
  app.use("/api/cms", cmsRouter);
  app.use("/api/super", superRouter);

  let server: http.Server;
  let baseUrl: string;

  let superAdminUser: any;
  let superToken: string;
  let testTenant: any;
  let tenantAdminUser: any;
  let tenantToken: string;
  let testLogoMedia: any;

  beforeAll(async () => {
    // 1. Create super admin user & token
    superAdminUser = await rawPrisma.user.create({
      data: {
        email: `superadmin-${Date.now()}@restart-test.com`,
        passwordHash: "hashed_password",
        roles: { create: [{ role: "super_admin" }] },
      },
    });

    superToken = generateToken({
      userId: superAdminUser.id,
      email: superAdminUser.email,
      roles: ["super_admin"],
      role: "super_admin",
    });

    // 2. Create test tenant & tenant admin
    testTenant = await rawPrisma.tenant.create({
      data: {
        name: "Acme Restart Corp",
        slug: `acme-restart-${Date.now()}`,
        timezone: "Asia/Kolkata",
      },
    });

    tenantAdminUser = await rawPrisma.user.create({
      data: {
        email: `tenantadmin-${Date.now()}@acme.com`,
        passwordHash: "hashed_password",
        roles: { create: [{ role: "hr_admin", tenantId: testTenant.id }] },
        profile: {
          create: {
            tenantId: testTenant.id,
            fullName: "Acme Admin",
          },
        },
      },
    });

    tenantToken = generateToken({
      userId: tenantAdminUser.id,
      email: tenantAdminUser.email,
      roles: ["hr_admin"],
      role: "hr_admin",
      tenantId: testTenant.id,
    });

    // 3. Create test logo media record
    const dummyPng = Buffer.from(
      "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082",
      "hex"
    );
    testLogoMedia = await MediaService.uploadMedia(dummyPng, "enterprise-logo.png", {
      tenantId: null,
      folder: "platform/branding",
    });

    // Clean up any preexisting platform branding settings for clean start
    await rawPrisma.setting.deleteMany({
      where: {
        key: { startsWith: "branding." },
      },
    });
    await rawPrisma.cmsPage.deleteMany({
      where: { slug: "system-platform-settings" },
    });
    SettingsService.clearCache();

    // 4. Start HTTP test server
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    // Clean up test data
    try {
      await rawPrisma.setting.deleteMany({
        where: {
          OR: [
            { scopeId: "global" },
            { scopeId: testTenant.id },
          ],
        },
      });
      await rawPrisma.mediaFile.deleteMany({ where: { id: testLogoMedia.id } });
      await rawPrisma.user.deleteMany({
        where: { id: { in: [superAdminUser.id, tenantAdminUser.id] } },
      });
      await rawPrisma.tenant.deleteMany({ where: { id: testTenant.id } });
    } catch {}
  });

  it("Step 1: ensureDefaultSettings creates missing platform defaults in DB without error", async () => {
    // Run ensureDefaultSettings
    await SettingsService.ensureDefaultSettings();

    // Verify DB contains branding settings
    const settings = await rawPrisma.setting.findMany({
      where: {
        key: {
          in: [
            "branding.app_name",
            "branding.primary_color",
            "branding.support_email",
            "branding.footer_text",
          ],
        },
      },
    });

    expect(settings.length).toBeGreaterThanOrEqual(4);
    const appNameSetting = settings.find((s) => s.key === "branding.app_name");
    expect(appNameSetting).toBeDefined();
    expect(appNameSetting?.scope).toBe("PLATFORM");
  });

  it("Step 2: Save custom Platform Identity & Colors to DB and verify DB is updated", async () => {
    const customValues = {
      "branding.app_name": "Apex Enterprise HRMS",
      "branding.support_email": "apex-support@enterprise.com",
      "branding.primary_color": "#2563EB",
      "branding.footer_text": "© 2026 Apex HRMS Global. All rights reserved.",
      "branding.logo_light_id": testLogoMedia.id,
    };

    // Save via SettingsService.setMany
    await SettingsService.setMany(customValues, "PLATFORM", "global", superAdminUser.id);

    // Verify DB directly (Prisma Setting table is single source of truth)
    const dbSettings = await rawPrisma.setting.findMany({
      where: {
        key: { in: Object.keys(customValues) },
      },
    });

    const dbMap = new Map(dbSettings.map((s) => [s.key, s.valueJson]));
    expect(dbMap.get("branding.app_name")).toBe("Apex Enterprise HRMS");
    expect(dbMap.get("branding.support_email")).toBe("apex-support@enterprise.com");
    expect(dbMap.get("branding.primary_color")).toBe("#2563EB");
    expect(dbMap.get("branding.footer_text")).toBe("© 2026 Apex HRMS Global. All rights reserved.");
    expect(dbMap.get("branding.logo_light_id")).toBe(testLogoMedia.id);
  });

  it("Step 3: Simulate server cold restart — DB values must NOT revert to registry defaults", async () => {
    // 1. Clear all in-memory caches
    SettingsService.clearCache();

    // 2. Simulate server startup boot sequence (ensureDefaultSettings runs on startup)
    await SettingsService.ensureDefaultSettings();

    // 3. Inspect DB directly — verify custom values STILL exist and were not overwritten by defaults
    const dbSettings = await rawPrisma.setting.findMany({
      where: {
        key: {
          in: [
            "branding.app_name",
            "branding.support_email",
            "branding.primary_color",
            "branding.footer_text",
            "branding.logo_light_id",
          ],
        },
      },
    });

    const dbMap = new Map(dbSettings.map((s) => [s.key, s.valueJson]));
    expect(dbMap.get("branding.app_name")).toBe("Apex Enterprise HRMS");
    expect(dbMap.get("branding.support_email")).toBe("apex-support@enterprise.com");
    expect(dbMap.get("branding.primary_color")).toBe("#2563EB");
    expect(dbMap.get("branding.footer_text")).toBe("© 2026 Apex HRMS Global. All rights reserved.");
    expect(dbMap.get("branding.logo_light_id")).toBe(testLogoMedia.id);
  });

  it("Step 4: All app-config endpoints return persisted DB values after cold restart", async () => {
    // Test GET /api/app-config
    const res1 = await fetch(`${baseUrl}/api/app-config`);
    expect(res1.status).toBe(200);
    const config1 = await res1.json();
    expect(config1.appName).toBe("Apex Enterprise HRMS");
    expect(config1.supportEmail).toBe("apex-support@enterprise.com");
    expect(config1.primaryColor).toBe("#2563EB");
    expect(config1.footerText).toBe("© 2026 Apex HRMS Global. All rights reserved.");
    expect(config1.logoLightUrl).toBe(testLogoMedia.url);
    expect(res1.headers.get("cache-control")).toContain("no-cache");

    // Test GET /api/v1/public/app-config
    const res2 = await fetch(`${baseUrl}/api/v1/public/app-config`);
    expect(res2.status).toBe(200);
    const config2 = await res2.json();
    expect(config2.appName).toBe("Apex Enterprise HRMS");
    expect(config2.primaryColor).toBe("#2563EB");

    // Test GET /api/public/app-config
    const res3 = await fetch(`${baseUrl}/api/public/app-config`);
    expect(res3.status).toBe(200);
    const config3 = await res3.json();
    expect(config3.appName).toBe("Apex Enterprise HRMS");
    expect(config3.primaryColor).toBe("#2563EB");
  });

  it("Step 5: Super admin settings and CMS page endpoints reflect persisted DB values", async () => {
    // GET /api/super/settings with super admin token
    const superRes = await fetch(`${baseUrl}/api/super/settings`, {
      headers: { Authorization: `Bearer ${superToken}` },
    });
    expect(superRes.status).toBe(200);
    const superSettings = await superRes.json();
    expect(superSettings.appName).toBe("Apex Enterprise HRMS");
    expect(superSettings.supportEmail).toBe("apex-support@enterprise.com");
    expect(superSettings.primaryThemeColor).toBe("#2563EB");
    expect(superSettings.logoLightUrl).toBe(testLogoMedia.url);

    // GET /api/cms/pages/system-platform-settings
    const cmsRes = await fetch(`${baseUrl}/api/cms/pages/system-platform-settings`, {
      headers: { Authorization: `Bearer ${superToken}` },
    });
    expect(cmsRes.status).toBe(200);
    const cmsPage = await cmsRes.json();
    expect(cmsPage.content.appName).toBe("Apex Enterprise HRMS");
    expect(cmsPage.content.primaryThemeColor).toBe("#2563EB");
  });

  it("Step 6: Saving via PUT /api/super/settings syncs to DB and persists across restart", async () => {
    // Update via PUT /api/super/settings
    const putRes = await fetch(`${baseUrl}/api/super/settings`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${superToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        appName: "Apex Cloud HRMS Ultra",
        supportEmail: "ultra-support@apex.com",
        primaryThemeColor: "#7C3AED",
        footerText: "© 2026 Apex HRMS Ultra. Persisted Forever.",
      }),
    });
    expect(putRes.status).toBe(200);

    // Simulate cold restart again
    SettingsService.clearCache();
    await SettingsService.ensureDefaultSettings();

    // Verify DB has the new values
    const dbAppName = await SettingsService.get("branding.app_name", "PLATFORM");
    const dbColor = await SettingsService.get("branding.primary_color", "PLATFORM");
    const dbEmail = await SettingsService.get("branding.support_email", "PLATFORM");

    expect(dbAppName).toBe("Apex Cloud HRMS Ultra");
    expect(dbColor).toBe("#7C3AED");
    expect(dbEmail).toBe("ultra-support@apex.com");

    // Verify app-config reflects updated values
    const appConfigRes = await fetch(`${baseUrl}/api/app-config`);
    const appConfig = await appConfigRes.json();
    expect(appConfig.appName).toBe("Apex Cloud HRMS Ultra");
    expect(appConfig.primaryColor).toBe("#7C3AED");
  });

  it("Step 7: Tenant custom override survives restart and un-overridden fields fall back to Platform", async () => {
    // Tenant overrides primary_color to green
    await SettingsService.set("branding.primary_color", "#10B981", "TENANT", testTenant.id, tenantAdminUser.id);

    // Simulate restart
    SettingsService.clearCache();
    await SettingsService.ensureDefaultSettings();

    // Query app-config with Tenant Bearer token
    const tenantRes = await fetch(`${baseUrl}/api/v1/public/app-config`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });
    expect(tenantRes.status).toBe(200);
    const tenantConfig = await tenantRes.json();

    // Overridden field: green
    expect(tenantConfig.primaryColor).toBe("#10B981");
    // Fallback field: platform's custom appName, not the default "Master HRMS"
    expect(tenantConfig.appName).toBe("Apex Cloud HRMS Ultra");
    expect(tenantConfig.scope).toBe("TENANT");

    // Public/platform client without tenant token still gets platform custom purple
    const publicRes = await fetch(`${baseUrl}/api/v1/public/app-config`);
    const publicConfig = await publicRes.json();
    expect(publicConfig.primaryColor).toBe("#7C3AED");
    expect(publicConfig.scope).toBe("PLATFORM");
  });
});
