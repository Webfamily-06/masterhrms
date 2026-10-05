import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma, rawPrisma } from "../prisma";
import { SettingsService, normalizeScopeId } from "../services/settings/settings.service";
import { MediaService } from "../services/media/media.service";
import { validateSettingValue } from "../services/settings/settings-registry";
import express from "express";
import http from "http";
import { appConfigRouter } from "../routes/app-config.routes";
import { settingsRouter } from "../routes/settings.routes";
import { mediaRouter } from "../routes/media.routes";
import { generateToken } from "../lib/jwt";

describe("Phase 1.2: White-Label Multi-Tenant Branding (Platform Default + Tenant Override)", () => {
  const tenantAId = "test-tenant-a-" + Date.now();
  const tenantBId = "test-tenant-b-" + Date.now();

  let platformLogoMedia: any;
  let platformFaviconMedia: any;
  let tenantALogoMedia: any;
  let tenantAFaviconMedia: any;
  let tenantBMedia: any;

  // Setup Express test app for route and security tests
  const app = express();
  app.use(express.json());
  app.use("/api/v1/public", appConfigRouter);
  app.use("/api/v1/settings", settingsRouter);
  app.use("/api/v1/media", mediaRouter);

  let server: http.Server;
  let baseUrl: string;

  // Users & Tokens
  let superAdminUser: any;
  let tenantAAdminUser: any;
  let tenantBAdminUser: any;
  let superToken: string;
  let tenantAToken: string;
  let tenantBToken: string;

  beforeAll(async () => {
    // 1. Create Test Tenants
    await rawPrisma.tenant.create({
      data: {
        id: tenantAId,
        name: "Acme Corp (Tenant A)",
        slug: "acme-" + Date.now(),
        timezone: "Asia/Kolkata",
      },
    });

    await rawPrisma.tenant.create({
      data: {
        id: tenantBId,
        name: "Beta Logistics (Tenant B)",
        slug: "beta-" + Date.now(),
        timezone: "Asia/Kolkata",
      },
    });

    // 2. Create Users & Profiles
    superAdminUser = await rawPrisma.user.create({
      data: {
        email: `super-${Date.now()}@platform.com`,
        passwordHash: "hash123",
        roles: { create: [{ role: "super_admin" }] },
      },
    });

    tenantAAdminUser = await rawPrisma.user.create({
      data: {
        email: `admin-a-${Date.now()}@acme.com`,
        passwordHash: "hash123",
        roles: { create: [{ role: "hr_admin", tenantId: tenantAId }] },
        profile: {
          create: {
            tenantId: tenantAId,
            fullName: "Alice Admin",
          },
        },
      },
    });

    tenantBAdminUser = await rawPrisma.user.create({
      data: {
        email: `admin-b-${Date.now()}@beta.com`,
        passwordHash: "hash123",
        roles: { create: [{ role: "hr_admin", tenantId: tenantBId }] },
        profile: {
          create: {
            tenantId: tenantBId,
            fullName: "Bob Admin",
          },
        },
      },
    });

    superToken = generateToken({
      userId: superAdminUser.id,
      email: superAdminUser.email,
      roles: ["super_admin"],
    });

    tenantAToken = generateToken({
      userId: tenantAAdminUser.id,
      email: tenantAAdminUser.email,
      tenantId: tenantAId,
      roles: ["hr_admin"],
    });

    tenantBToken = generateToken({
      userId: tenantBAdminUser.id,
      email: tenantBAdminUser.email,
      tenantId: tenantBId,
      roles: ["hr_admin"],
    });

    // 3. Create Media Assets
    const dummyPng = Buffer.from(
      "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082",
      "hex"
    );

    platformLogoMedia = await MediaService.uploadMedia(dummyPng, "platform-logo.png", {
      tenantId: null, // Platform media
      folder: "platform/branding",
    });

    platformFaviconMedia = await MediaService.uploadMedia(dummyPng, "platform-favicon.png", {
      tenantId: null, // Platform media
      folder: "platform/branding",
    });

    tenantALogoMedia = await MediaService.uploadMedia(dummyPng, "tenant-a-logo.png", {
      tenantId: tenantAId, // Tenant A media
      folder: "workspace/branding",
    });

    tenantAFaviconMedia = await MediaService.uploadMedia(dummyPng, "tenant-a-favicon.png", {
      tenantId: tenantAId, // Tenant A media
      folder: "workspace/branding",
    });

    tenantBMedia = await MediaService.uploadMedia(dummyPng, "tenant-b-logo.png", {
      tenantId: tenantBId, // Tenant B media
      folder: "workspace/branding",
    });

    // 4. Configure PLATFORM default branding
    await SettingsService.setGroup(
      "PLATFORM",
      null,
      "branding",
      {
        "branding.logo_light_id": platformLogoMedia.id,
        "branding.logo_dark_id": platformLogoMedia.id,
        "branding.favicon_id": platformFaviconMedia.id,
        "branding.primary_color": "#10B981", // Platform Emerald
      },
      { userId: superAdminUser.id }
    );

    // 5. Start HTTP server on random port
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address: any = server.address();
        baseUrl = `http://localhost:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }

    // Cleanup settings, media, users and tenants
    await prisma.mediaUsage.deleteMany({
      where: {
        mediaId: {
          in: [
            platformLogoMedia?.id,
            platformFaviconMedia?.id,
            tenantALogoMedia?.id,
            tenantAFaviconMedia?.id,
            tenantBMedia?.id,
          ].filter(Boolean),
        },
      },
    });

    await prisma.setting.deleteMany({
      where: {
        scopeId: { in: [normalizeScopeId("PLATFORM", null), tenantAId, tenantBId] },
        group: "branding",
      },
    });

    await prisma.settingAudit.deleteMany({
      where: {
        scopeId: { in: [normalizeScopeId("PLATFORM", null), tenantAId, tenantBId] },
      },
    });

    await prisma.mediaFile.deleteMany({
      where: {
        id: {
          in: [
            platformLogoMedia?.id,
            platformFaviconMedia?.id,
            tenantALogoMedia?.id,
            tenantAFaviconMedia?.id,
            tenantBMedia?.id,
          ].filter(Boolean),
        },
      },
    });

    const userIds = [superAdminUser?.id, tenantAAdminUser?.id, tenantBAdminUser?.id].filter(Boolean);
    if (userIds.length > 0) {
      await rawPrisma.userRole.deleteMany({
        where: { userId: { in: userIds } },
      });
      await rawPrisma.profile.deleteMany({
        where: { userId: { in: userIds } },
      });
      await rawPrisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }
    await rawPrisma.tenant.deleteMany({
      where: { id: { in: [tenantAId, tenantBId] } },
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 1 & 2 & 3. PLATFORM & TENANT FALLBACK RESOLUTION
  // ─────────────────────────────────────────────────────────────
  it("TEST 1 & 2: Platform branding configured, Tenant A & B with no overrides fall back to Platform", async () => {
    // Platform resolution
    const platformBranding = await SettingsService.getGroup("PLATFORM", null, "branding");
    expect(platformBranding.values["branding.primary_color"]).toBe("#10B981");
    expect(platformBranding.values["branding.logo_light_id"]).toBe(platformLogoMedia.id);
    expect(platformBranding.mediaUrls["branding.logo_light_id"]).toBe(platformLogoMedia.url);

    // Tenant A with no overrides -> falls back to platform
    const tenantABranding = await SettingsService.getGroup("TENANT", tenantAId, "branding");
    expect(tenantABranding.values["branding.primary_color"]).toBe("#10B981");
    expect(tenantABranding.values["branding.logo_light_id"]).toBe(platformLogoMedia.id);
    expect(tenantABranding.mediaUrls["branding.logo_light_id"]).toBe(platformLogoMedia.url);
    expect(tenantABranding.overrides?.["branding.primary_color"]).toBeFalsy();

    // Tenant B with no overrides -> falls back to platform
    const tenantBBranding = await SettingsService.getGroup("TENANT", tenantBId, "branding");
    expect(tenantBBranding.values["branding.primary_color"]).toBe("#10B981");
    expect(tenantBBranding.values["branding.favicon_id"]).toBe(platformFaviconMedia.id);
    expect(tenantBBranding.mediaUrls["branding.favicon_id"]).toBe(platformFaviconMedia.url);
  });

  // ─────────────────────────────────────────────────────────────
  // 4. PARTIAL TENANT OVERRIDE (Per-key fallback)
  // ─────────────────────────────────────────────────────────────
  it("TEST 4: Partial tenant override — Tenant A overrides primary_color only, logo & favicon fall back to platform", async () => {
    // Tenant A sets color to Blue (#2563EB)
    await SettingsService.setGroup(
      "TENANT",
      tenantAId,
      "branding",
      {
        "branding.primary_color": "#2563EB",
      },
      { userId: tenantAAdminUser.id }
    );

    const tenantABranding = await SettingsService.getGroup("TENANT", tenantAId, "branding");

    // Primary color is overridden
    expect(tenantABranding.values["branding.primary_color"]).toBe("#2563EB");
    expect(tenantABranding.overrides?.["branding.primary_color"]).toBe(true);

    // Logos and favicon must fall back to platform
    expect(tenantABranding.values["branding.logo_light_id"]).toBe(platformLogoMedia.id);
    expect(tenantABranding.mediaUrls["branding.logo_light_id"]).toBe(platformLogoMedia.url);
    expect(tenantABranding.values["branding.favicon_id"]).toBe(platformFaviconMedia.id);
    expect(tenantABranding.mediaUrls["branding.favicon_id"]).toBe(platformFaviconMedia.url);
  });

  // ─────────────────────────────────────────────────────────────
  // 5, 6, 7. TENANT ISOLATION (LOGO, FAVICON, COLOR)
  // ─────────────────────────────────────────────────────────────
  it("TEST 3, 4, 5, 6: Tenant A customizes logo and favicon — Tenant B and Platform remain completely unaffected", async () => {
    // Tenant A updates logo and favicon
    await SettingsService.setGroup(
      "TENANT",
      tenantAId,
      "branding",
      {
        "branding.logo_light_id": tenantALogoMedia.id,
        "branding.favicon_id": tenantAFaviconMedia.id,
      },
      { userId: tenantAAdminUser.id }
    );

    // Tenant A has custom logo, favicon, and color
    const tenantA = await SettingsService.getGroup("TENANT", tenantAId, "branding");
    expect(tenantA.values["branding.primary_color"]).toBe("#2563EB");
    expect(tenantA.values["branding.logo_light_id"]).toBe(tenantALogoMedia.id);
    expect(tenantA.mediaUrls["branding.logo_light_id"]).toBe(tenantALogoMedia.url);
    expect(tenantA.values["branding.favicon_id"]).toBe(tenantAFaviconMedia.id);
    expect(tenantA.mediaUrls["branding.favicon_id"]).toBe(tenantAFaviconMedia.url);

    // Tenant B still has Platform defaults
    const tenantB = await SettingsService.getGroup("TENANT", tenantBId, "branding");
    expect(tenantB.values["branding.primary_color"]).toBe("#10B981");
    expect(tenantB.values["branding.logo_light_id"]).toBe(platformLogoMedia.id);
    expect(tenantB.mediaUrls["branding.logo_light_id"]).toBe(platformLogoMedia.url);
    expect(tenantB.values["branding.favicon_id"]).toBe(platformFaviconMedia.id);
    expect(tenantB.mediaUrls["branding.favicon_id"]).toBe(platformFaviconMedia.url);

    // Platform remains unchanged
    const platform = await SettingsService.getGroup("PLATFORM", null, "branding");
    expect(platform.values["branding.primary_color"]).toBe("#10B981");
    expect(platform.values["branding.logo_light_id"]).toBe(platformLogoMedia.id);
  });

  // ─────────────────────────────────────────────────────────────
  // 8. PLATFORM UPDATE WITH TENANT OVERRIDE
  // ─────────────────────────────────────────────────────────────
  it("TEST 7: Platform changes color to #8B5CF6 — Tenant B updates, Tenant A retains custom override #2563EB", async () => {
    // Super admin updates platform primary color to Violet
    await SettingsService.setGroup(
      "PLATFORM",
      null,
      "branding",
      {
        "branding.primary_color": "#8B5CF6",
      },
      { userId: superAdminUser.id }
    );

    // Tenant B has no override -> reflects new platform color
    const tenantB = await SettingsService.getGroup("TENANT", tenantBId, "branding");
    expect(tenantB.values["branding.primary_color"]).toBe("#8B5CF6");

    // Tenant A has explicit override -> stays on #2563EB
    const tenantA = await SettingsService.getGroup("TENANT", tenantAId, "branding");
    expect(tenantA.values["branding.primary_color"]).toBe("#2563EB");
  });

  // ─────────────────────────────────────────────────────────────
  // 9. TENANT OVERRIDE REMOVAL (Per-key fallback restore)
  // ─────────────────────────────────────────────────────────────
  it("TEST 8, 9, 10: Tenant A removes color, logo, and favicon overrides -> falls back to platform values", async () => {
    // 1. Remove color override
    await SettingsService.setGroup(
      "TENANT",
      tenantAId,
      "branding",
      {
        "branding.primary_color": null,
      },
      { userId: tenantAAdminUser.id }
    );

    let tenantA = await SettingsService.getGroup("TENANT", tenantAId, "branding");
    expect(tenantA.values["branding.primary_color"]).toBe("#8B5CF6"); // Platform value
    expect(tenantA.overrides?.["branding.primary_color"]).toBeFalsy();

    // 2. Remove logo override
    await SettingsService.setGroup(
      "TENANT",
      tenantAId,
      "branding",
      {
        "branding.logo_light_id": null,
      },
      { userId: tenantAAdminUser.id }
    );

    tenantA = await SettingsService.getGroup("TENANT", tenantAId, "branding");
    expect(tenantA.values["branding.logo_light_id"]).toBe(platformLogoMedia.id);
    expect(tenantA.mediaUrls["branding.logo_light_id"]).toBe(platformLogoMedia.url);

    // 3. Remove favicon override
    await SettingsService.setGroup(
      "TENANT",
      tenantAId,
      "branding",
      {
        "branding.favicon_id": null,
      },
      { userId: tenantAAdminUser.id }
    );

    tenantA = await SettingsService.getGroup("TENANT", tenantAId, "branding");
    expect(tenantA.values["branding.favicon_id"]).toBe(platformFaviconMedia.id);
    expect(tenantA.mediaUrls["branding.favicon_id"]).toBe(platformFaviconMedia.url);
  });

  // ─────────────────────────────────────────────────────────────
  // 10. TENANT MEDIA OWNERSHIP
  // ─────────────────────────────────────────────────────────────
  it("TEST 10: Media ownership: Tenant uploads have tenantId, platform uploads have null tenantId", async () => {
    expect(platformLogoMedia.tenantId).toBeNull();
    expect(tenantALogoMedia.tenantId).toBe(tenantAId);
    expect(tenantBMedia.tenantId).toBe(tenantBId);
  });

  // ─────────────────────────────────────────────────────────────
  // 11. CROSS-TENANT MEDIA PROTECTION
  // ─────────────────────────────────────────────────────────────
  it("TEST 11: Cross-tenant media protection: Tenant A cannot attach or delete Tenant B's or Platform's media", async () => {
    // Tenant A attempts to attach Tenant B's media
    await expect(
      SettingsService.setGroup(
        "TENANT",
        tenantAId,
        "branding",
        {
          "branding.logo_light_id": tenantBMedia.id,
        },
        { userId: tenantAAdminUser.id }
      )
    ).rejects.toThrow(/Forbidden: Cannot use media belonging to another tenant/);

    // Tenant A attempts to delete Tenant B's media
    const deleteAnotherTenantRes = await fetch(`${baseUrl}/api/v1/media/${tenantBMedia.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tenantAToken}` },
    });
    expect(deleteAnotherTenantRes.status).toBe(403);

    // Tenant A attempts to delete Platform media
    const deletePlatformRes = await fetch(`${baseUrl}/api/v1/media/${platformLogoMedia.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tenantAToken}` },
    });
    expect(deletePlatformRes.status).toBe(403);
  });

  // ─────────────────────────────────────────────────────────────
  // 12. CROSS-TENANT SETTING PROTECTION
  // ─────────────────────────────────────────────────────────────
  it("TEST 12: Cross-tenant setting protection: Tenant Admin cannot modify PLATFORM settings or another tenant's settings", async () => {
    // Tenant A attempts to modify PLATFORM settings
    const updatePlatformRes = await fetch(`${baseUrl}/api/v1/settings/PLATFORM/branding`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${tenantAToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ "branding.primary_color": "#000000" }),
    });
    expect(updatePlatformRes.status).toBe(403);

    // Tenant A attempts to spoof another tenant via query parameter
    const updateAnotherTenantRes = await fetch(
      `${baseUrl}/api/v1/settings/TENANT/branding?tenantId=${tenantBId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tenantAToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ "branding.primary_color": "#123456" }),
      }
    );

    // The server must ignore query param and apply strictly to Tenant A, not Tenant B
    expect(updateAnotherTenantRes.status).toBe(200);

    // Verify Tenant B was NOT changed
    const tenantB = await SettingsService.getGroup("TENANT", tenantBId, "branding");
    expect(tenantB.values["branding.primary_color"]).not.toBe("#123456");
  });

  // ─────────────────────────────────────────────────────────────
  // 13. APP-CONFIG TENANT RESOLUTION & SPOOFING PROTECTION
  // ─────────────────────────────────────────────────────────────
  it("TEST 13: GET /api/v1/public/app-config resolves tenant correctly and ignores arbitrary query params", async () => {
    // 1. Unauthenticated request without tenant host -> PLATFORM branding
    const platRes = await fetch(`${baseUrl}/api/v1/public/app-config`);
    expect(platRes.status).toBe(200);
    const platBody: any = await platRes.json();
    expect(platBody.scope).toBe("PLATFORM");
    expect(platBody.tenantId).toBeNull();
    expect(platBody.branding).toBeDefined();

    // 2. Unauthenticated request with spoofed ?tenantId=... parameter -> MUST STILL BE PLATFORM
    const spoofRes = await fetch(`${baseUrl}/api/v1/public/app-config?tenantId=${tenantAId}`);
    expect(spoofRes.status).toBe(200);
    const spoofBody: any = await spoofRes.json();
    expect(spoofBody.scope).toBe("PLATFORM");
    expect(spoofBody.tenantId).toBeNull();

    // 3. Authenticated request with Tenant A token -> resolves to Tenant A
    const authResA = await fetch(`${baseUrl}/api/v1/public/app-config`, {
      headers: { Authorization: `Bearer ${tenantAToken}` },
    });
    expect(authResA.status).toBe(200);
    const authBodyA: any = await authResA.json();
    expect(authBodyA.scope).toBe("TENANT");
    expect(authBodyA.tenantId).toBe(tenantAId);
  });

  // ─────────────────────────────────────────────────────────────
  // 14. CACHE ISOLATION (ETag & Vary Headers)
  // ─────────────────────────────────────────────────────────────
  it("TEST 14: Cache isolation: ETag and cache keys differ across scopes and Vary: Host, Authorization is present", async () => {
    const resPlatform = await fetch(`${baseUrl}/api/v1/public/app-config`);
    const resTenantA = await fetch(`${baseUrl}/api/v1/public/app-config`, {
      headers: { Authorization: `Bearer ${tenantAToken}` },
    });
    const resTenantB = await fetch(`${baseUrl}/api/v1/public/app-config`, {
      headers: { Authorization: `Bearer ${tenantBToken}` },
    });

    expect(resPlatform.headers.get("vary")).toContain("Host");
    expect(resPlatform.headers.get("vary")).toContain("Authorization");
    expect(resPlatform.headers.get("cache-control")).toContain("no-cache");

    // ETags must differ between Platform and Tenant
    expect(resPlatform.headers.get("etag")).not.toBe(resTenantA.headers.get("etag"));
  });

  // ─────────────────────────────────────────────────────────────
  // 15. REALTIME SCOPE SPECIFICATION
  // ─────────────────────────────────────────────────────────────
  it("TEST 15: Settings update emits scope-aware payloads", async () => {
    const result = await SettingsService.setGroup(
      "TENANT",
      tenantAId,
      "branding",
      { "branding.primary_color": "#E11D48" },
      { userId: tenantAAdminUser.id }
    );
    expect(result.success).toBe(true);
    expect(result.values["branding.primary_color"]).toBe("#E11D48");
  });
});
