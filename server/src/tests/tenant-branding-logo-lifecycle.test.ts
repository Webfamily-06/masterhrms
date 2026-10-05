import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma, rawPrisma } from "../prisma";
import { SettingsService } from "../services/settings/settings.service";
import { resolveBranding } from "../services/branding/branding-resolver.service";
import { MediaService } from "../services/media/media.service";

describe("TENANT BRANDING LOGO UPDATE / REMOVE / PLATFORM INHERITANCE LIFECYCLE", () => {
  const db = rawPrisma || prisma;
  const testTenantAId = `test-branding-tenant-a-${Date.now()}`;
  const testTenantBId = `test-branding-tenant-b-${Date.now()}`;

  let platformLightMedia: any = null;
  let platformDarkMedia: any = null;
  let platformFaviconMedia: any = null;

  let tenantALightMedia: any = null;
  let tenantADarkMedia: any = null;
  let tenantALightMedia2: any = null;
  let tenantAFaviconMedia: any = null;

  let tenantBLightMedia: any = null;

  const dummyPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );

  beforeAll(async () => {
    // 1. Create Test Tenants
    await db.tenant.createMany({
      data: [
        {
          id: testTenantAId,
          name: "Tenant Alpha Corp",
          slug: `alpha-${Date.now()}`,
        },
        {
          id: testTenantBId,
          name: "Tenant Beta Ltd",
          slug: `beta-${Date.now()}`,
        },
      ],
    });

    // 2. Upload Platform Media (tenantId = null)
    platformLightMedia = await MediaService.uploadMedia(dummyPng, "platform-logo-light.png", {
      mimeType: "image/png",
      uploadedBy: "superadmin",
    });

    platformDarkMedia = await MediaService.uploadMedia(dummyPng, "platform-logo-dark.png", {
      mimeType: "image/png",
      uploadedBy: "superadmin",
    });

    platformFaviconMedia = await MediaService.uploadMedia(dummyPng, "platform-favicon.png", {
      mimeType: "image/png",
      uploadedBy: "superadmin",
    });

    // 3. Configure Platform Identity Settings
    await SettingsService.setGroup("PLATFORM", null, "branding", {
      "branding.app_name": "Master Platform",
      "branding.primary_color": "#FF6B00",
      "branding.logo_light_id": platformLightMedia.id,
      "branding.logo_dark_id": platformDarkMedia.id,
      "branding.favicon_id": platformFaviconMedia.id,
      "branding.footer_text": "© 2026 Master HRMS Platform. All rights reserved.",
    });

    // 4. Upload Tenant A and Tenant B Media (owned by respective tenants)
    tenantALightMedia = await MediaService.uploadMedia(dummyPng, "tenant-a-light.png", {
      mimeType: "image/png",
      tenantId: testTenantAId,
      uploadedBy: "admin-a",
    });

    tenantADarkMedia = await MediaService.uploadMedia(dummyPng, "tenant-a-dark.png", {
      mimeType: "image/png",
      tenantId: testTenantAId,
      uploadedBy: "admin-a",
    });

    tenantALightMedia2 = await MediaService.uploadMedia(dummyPng, "tenant-a-light-v2.png", {
      mimeType: "image/png",
      tenantId: testTenantAId,
      uploadedBy: "admin-a",
    });

    tenantAFaviconMedia = await MediaService.uploadMedia(dummyPng, "tenant-a-favicon.png", {
      mimeType: "image/png",
      tenantId: testTenantAId,
      uploadedBy: "admin-a",
    });

    tenantBLightMedia = await MediaService.uploadMedia(dummyPng, "tenant-b-light.png", {
      mimeType: "image/png",
      tenantId: testTenantBId,
      uploadedBy: "admin-b",
    });
  });

  afterAll(async () => {
    // Clean up settings and audits
    await db.settingAudit.deleteMany({
      where: { scopeId: { in: ["global", testTenantAId, testTenantBId] } },
    });
    await db.mediaUsage.deleteMany({
      where: {
        mediaId: {
          in: [
            platformLightMedia?.id,
            platformDarkMedia?.id,
            platformFaviconMedia?.id,
            tenantALightMedia?.id,
            tenantADarkMedia?.id,
            tenantALightMedia2?.id,
            tenantAFaviconMedia?.id,
            tenantBLightMedia?.id,
          ].filter(Boolean),
        },
      },
    });
    await db.setting.deleteMany({
      where: { scopeId: { in: ["global", testTenantAId, testTenantBId] } },
    });

    // Clean up media files
    const mediaIds = [
      platformLightMedia?.id,
      platformDarkMedia?.id,
      platformFaviconMedia?.id,
      tenantALightMedia?.id,
      tenantADarkMedia?.id,
      tenantALightMedia2?.id,
      tenantAFaviconMedia?.id,
      tenantBLightMedia?.id,
    ].filter(Boolean);
    if (mediaIds.length > 0) {
      await db.mediaFile.deleteMany({ where: { id: { in: mediaIds } } });
    }

    // Clean up tenants
    await db.tenant.deleteMany({
      where: { id: { in: [testTenantAId, testTenantBId] } },
    });
  });

  it("TEST 1: Initial state - Tenant with NO override inherits Platform values and exposes accurate inheritance metadata", async () => {
    // Direct DB check: NO setting rows exist for Tenant A
    const tenantASettingsInDb = await db.setting.findMany({
      where: { scope: "TENANT", scopeId: testTenantAId },
    });
    expect(tenantASettingsInDb.length).toBe(0);

    // Call getGroup for Tenant A
    const resA = await SettingsService.getGroup("TENANT", testTenantAId, "branding");

    // Values resolve to Platform
    expect(resA.values["branding.logo_light_id"]).toBe(platformLightMedia.id);
    expect(resA.values["branding.logo_dark_id"]).toBe(platformDarkMedia.id);
    expect(resA.values["branding.favicon_id"]).toBe(platformFaviconMedia.id);
    expect(resA.mediaUrls["branding.logo_light_id"]).toBe(platformLightMedia.url);
    expect(resA.mediaUrls["branding.logo_dark_id"]).toBe(platformDarkMedia.url);
    expect(resA.mediaUrls["branding.favicon_id"]).toBe(platformFaviconMedia.url);

    // Overrides map indicates no overrides
    expect(resA.overrides?.["branding.logo_light_id"]).toBeFalsy();
    expect(resA.overrides?.["branding.logo_dark_id"]).toBeFalsy();
    expect(resA.overrides?.["branding.favicon_id"]).toBeFalsy();

    // Sources indicate PLATFORM
    expect(resA.sources?.["branding.logo_light_id"]).toBe("PLATFORM");
    expect(resA.sources?.["branding.logo_dark_id"]).toBe("PLATFORM");
    expect(resA.sources?.["branding.favicon_id"]).toBe("PLATFORM");

    // Structured items provide exact state
    const lightItem = resA.items?.["branding.logo_light_id"];
    expect(lightItem).toBeDefined();
    expect(lightItem?.source).toBe("PLATFORM");
    expect(lightItem?.hasTenantOverride).toBe(false);
    expect(lightItem?.value).toBe(platformLightMedia.id);
    expect(lightItem?.mediaUrl).toBe(platformLightMedia.url);
    expect(lightItem?.fallbackMediaUrl).toBe(platformLightMedia.url);

    const darkItem = resA.items?.["branding.logo_dark_id"];
    expect(darkItem?.source).toBe("PLATFORM");
    expect(darkItem?.hasTenantOverride).toBe(false);

    const favItem = resA.items?.["branding.favicon_id"];
    expect(favItem?.source).toBe("PLATFORM");
    expect(favItem?.hasTenantOverride).toBe(false);
  });

  it("TEST 2: Replace Light and Dark Logo - Tenant Admin creates custom overrides without mutating Platform", async () => {
    // MediaFile ownership check
    expect(tenantALightMedia.tenantId).toBe(testTenantAId);
    expect(tenantADarkMedia.tenantId).toBe(testTenantAId);
    expect(platformLightMedia.tenantId).toBeNull();
    expect(platformDarkMedia.tenantId).toBeNull();

    // Tenant Admin uploads and saves custom light and dark logo
    const saveResult = await SettingsService.setGroup("TENANT", testTenantAId, "branding", {
      "branding.logo_light_id": tenantALightMedia.id,
      "branding.logo_dark_id": tenantADarkMedia.id,
    });
    expect(saveResult.success).toBe(true);

    // Direct DB check for Tenant A
    const tenantRowLight = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: testTenantAId, key: "branding.logo_light_id" },
    });
    expect(tenantRowLight).not.toBeNull();
    expect(tenantRowLight?.valueJson).toBe(tenantALightMedia.id);

    const tenantRowDark = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: testTenantAId, key: "branding.logo_dark_id" },
    });
    expect(tenantRowDark).not.toBeNull();
    expect(tenantRowDark?.valueJson).toBe(tenantADarkMedia.id);

    // CRITICAL: Platform Setting row is UNTOUCHED
    const platformRowLight = await db.setting.findFirst({
      where: { scope: "PLATFORM", scopeId: "global", key: "branding.logo_light_id" },
    });
    expect(platformRowLight?.valueJson).toBe(platformLightMedia.id);

    const platformRowDark = await db.setting.findFirst({
      where: { scope: "PLATFORM", scopeId: "global", key: "branding.logo_dark_id" },
    });
    expect(platformRowDark?.valueJson).toBe(platformDarkMedia.id);

    // Verify Tenant A resolution
    const resA = await SettingsService.getGroup("TENANT", testTenantAId, "branding");
    expect(resA.items?.["branding.logo_light_id"]?.source).toBe("TENANT");
    expect(resA.items?.["branding.logo_light_id"]?.hasTenantOverride).toBe(true);
    expect(resA.items?.["branding.logo_light_id"]?.mediaUrl).toBe(tenantALightMedia.url);
    expect(resA.items?.["branding.logo_light_id"]?.fallbackMediaUrl).toBe(platformLightMedia.url);

    expect(resA.items?.["branding.logo_dark_id"]?.source).toBe("TENANT");
    expect(resA.items?.["branding.logo_dark_id"]?.hasTenantOverride).toBe(true);
    expect(resA.items?.["branding.logo_dark_id"]?.mediaUrl).toBe(tenantADarkMedia.url);
    expect(resA.items?.["branding.logo_dark_id"]?.fallbackMediaUrl).toBe(platformDarkMedia.url);

    // Favicon was NOT overridden -> remains PLATFORM
    expect(resA.items?.["branding.favicon_id"]?.source).toBe("PLATFORM");
    expect(resA.items?.["branding.favicon_id"]?.hasTenantOverride).toBe(false);

    // Tenant B Isolation Check: Tenant B STILL inherits Platform
    const resB = await SettingsService.getGroup("TENANT", testTenantBId, "branding");
    expect(resB.items?.["branding.logo_light_id"]?.source).toBe("PLATFORM");
    expect(resB.items?.["branding.logo_light_id"]?.hasTenantOverride).toBe(false);
    expect(resB.items?.["branding.logo_light_id"]?.mediaUrl).toBe(platformLightMedia.url);
  });

  it("TEST 3: Remove Light Logo - Removes Tenant override, preserves Platform Setting & MediaFile, restores fallback", async () => {
    // Tenant Admin removes light logo (sends null in payload)
    const removeResult = await SettingsService.setGroup("TENANT", testTenantAId, "branding", {
      "branding.logo_light_id": null,
    });
    expect(removeResult.success).toBe(true);

    // 1. Direct DB check: Tenant A light logo row was DELETED
    const tenantRowLight = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: testTenantAId, key: "branding.logo_light_id" },
    });
    expect(tenantRowLight).toBeNull();

    // 2. Direct DB check: Dark logo override is STILL active for Tenant A
    const tenantRowDark = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: testTenantAId, key: "branding.logo_dark_id" },
    });
    expect(tenantRowDark?.valueJson).toBe(tenantADarkMedia.id);

    // 3. Platform Setting row is 100% UNTOUCHED
    const platformRowLight = await db.setting.findFirst({
      where: { scope: "PLATFORM", scopeId: "global", key: "branding.logo_light_id" },
    });
    expect(platformRowLight?.valueJson).toBe(platformLightMedia.id);

    // 4. Platform MediaFile is NOT deleted
    const platformMediaInDb = await db.mediaFile.findUnique({
      where: { id: platformLightMedia.id },
    });
    expect(platformMediaInDb).not.toBeNull();
    expect(platformMediaInDb?.deletedAt).toBeNull();

    // 5. Tenant's removed unreferenced MediaFile was soft-deleted (clean Media Library)
    const tenantMediaInDb = await db.mediaFile.findUnique({
      where: { id: tenantALightMedia.id },
    });
    expect(tenantMediaInDb?.deletedAt).not.toBeNull();

    // 6. Resolution check: Light logo has fallen back to Platform
    const resA = await SettingsService.getGroup("TENANT", testTenantAId, "branding");
    expect(resA.items?.["branding.logo_light_id"]?.source).toBe("PLATFORM");
    expect(resA.items?.["branding.logo_light_id"]?.hasTenantOverride).toBe(false);
    expect(resA.items?.["branding.logo_light_id"]?.value).toBe(platformLightMedia.id);
    expect(resA.items?.["branding.logo_light_id"]?.mediaUrl).toBe(platformLightMedia.url);

    // Dark logo still custom
    expect(resA.items?.["branding.logo_dark_id"]?.source).toBe("TENANT");
    expect(resA.items?.["branding.logo_dark_id"]?.hasTenantOverride).toBe(true);

    // Tenant B still sees Platform
    const resB = await SettingsService.getGroup("TENANT", testTenantBId, "branding");
    expect(resB.items?.["branding.logo_light_id"]?.mediaUrl).toBe(platformLightMedia.url);
  });

  it("TEST 4: Replace with TENANT-A2 logo and verify full independent lifecycle", async () => {
    // Tenant A uploads and saves new version of light logo
    await SettingsService.setGroup("TENANT", testTenantAId, "branding", {
      "branding.logo_light_id": tenantALightMedia2.id,
    });

    const resA = await SettingsService.getGroup("TENANT", testTenantAId, "branding");
    expect(resA.items?.["branding.logo_light_id"]?.source).toBe("TENANT");
    expect(resA.items?.["branding.logo_light_id"]?.hasTenantOverride).toBe(true);
    expect(resA.items?.["branding.logo_light_id"]?.mediaUrl).toBe(tenantALightMedia2.url);

    // Tenant B still sees Platform
    const resB = await SettingsService.getGroup("TENANT", testTenantBId, "branding");
    expect(resB.items?.["branding.logo_light_id"]?.mediaUrl).toBe(platformLightMedia.url);

    // Platform still sees Platform
    const resPlatform = await SettingsService.getGroup("PLATFORM", null, "branding");
    expect(resPlatform.values["branding.logo_light_id"]).toBe(platformLightMedia.id);
  });

  it("TEST 5: Delete single override via deleteSetting method (Dark Logo & Favicon)", async () => {
    // 1. Delete Tenant A's dark logo override
    const delDark = await SettingsService.deleteSetting(
      "TENANT",
      testTenantAId,
      "branding",
      "branding.logo_dark_id"
    );
    expect(delDark.success).toBe(true);

    // DB check: dark logo row is gone
    const darkRowInDb = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: testTenantAId, key: "branding.logo_dark_id" },
    });
    expect(darkRowInDb).toBeNull();

    // Platform dark logo row is still there
    const platformDarkInDb = await db.setting.findFirst({
      where: { scope: "PLATFORM", scopeId: "global", key: "branding.logo_dark_id" },
    });
    expect(platformDarkInDb?.valueJson).toBe(platformDarkMedia.id);

    // Resolved dark logo is now Platform
    const resA = await SettingsService.getGroup("TENANT", testTenantAId, "branding");
    expect(resA.items?.["branding.logo_dark_id"]?.source).toBe("PLATFORM");
    expect(resA.items?.["branding.logo_dark_id"]?.hasTenantOverride).toBe(false);
    expect(resA.items?.["branding.logo_dark_id"]?.mediaUrl).toBe(platformDarkMedia.url);
  });

  it("TEST 6: Cross-tenant and Platform media deletion protection", async () => {
    // 1. Tenant A cannot attach Tenant B's media
    await expect(
      SettingsService.setGroup("TENANT", testTenantAId, "branding", {
        "branding.logo_light_id": tenantBLightMedia.id,
      })
    ).rejects.toThrow(/Forbidden: Cannot use media belonging to another tenant/);

    // 2. Tenant A cannot delete Platform media
    await expect(
      MediaService.deleteMedia(platformLightMedia.id, {
        isSuper: false,
        requestedByTenantId: testTenantAId,
      })
    ).rejects.toThrow(/Forbidden: Cannot delete platform media/);

    // 3. Tenant A cannot delete Tenant B's media
    await expect(
      MediaService.deleteMedia(tenantBLightMedia.id, {
        isSuper: false,
        requestedByTenantId: testTenantAId,
      })
    ).rejects.toThrow(/Forbidden: Cannot delete media belonging to another workspace/);
  });

  it("TEST 7: Cold restart persistence simulation", async () => {
    // Simulate server cold restart by running ensureDefaultSettings
    await SettingsService.ensureDefaultSettings();

    // Verify Tenant A still has light logo override (tenantALightMedia2)
    const resA = await SettingsService.getGroup("TENANT", testTenantAId, "branding");
    expect(resA.items?.["branding.logo_light_id"]?.source).toBe("TENANT");
    expect(resA.items?.["branding.logo_light_id"]?.hasTenantOverride).toBe(true);
    expect(resA.items?.["branding.logo_light_id"]?.mediaUrl).toBe(tenantALightMedia2.url);

    // Verify Tenant A dark logo is still inherited from Platform
    expect(resA.items?.["branding.logo_dark_id"]?.source).toBe("PLATFORM");
    expect(resA.items?.["branding.logo_dark_id"]?.hasTenantOverride).toBe(false);
    expect(resA.items?.["branding.logo_dark_id"]?.mediaUrl).toBe(platformDarkMedia.url);

    // Verify Platform branding remains intact
    const resPlatform = await SettingsService.getGroup("PLATFORM", null, "branding");
    expect(resPlatform.values["branding.logo_light_id"]).toBe(platformLightMedia.id);
    expect(resPlatform.values["branding.logo_dark_id"]).toBe(platformDarkMedia.id);

    // Verify BrandingResolver output
    const resolvedA = await resolveBranding({ scope: "TENANT", tenantId: testTenantAId });
    expect(resolvedA.logoLightUrl).toBe(tenantALightMedia2.url);
    expect(resolvedA.logoDarkUrl).toBe(platformDarkMedia.url);
    expect(resolvedA.hasOverrides).toBe(true);

    const resolvedB = await resolveBranding({ scope: "TENANT", tenantId: testTenantBId });
    expect(resolvedB.logoLightUrl).toBe(platformLightMedia.url);
    expect(resolvedB.logoDarkUrl).toBe(platformDarkMedia.url);
    expect(resolvedB.hasOverrides).toBe(false);
  }, 30000);
});
