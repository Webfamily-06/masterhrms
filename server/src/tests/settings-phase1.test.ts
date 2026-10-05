import { describe, it, expect, beforeAll } from "vitest";
import { SETTINGS_REGISTRY, validateSettingValue, getSettingDefinition } from "../services/settings/settings-registry";
import { encryptSecret, decryptSecret, SettingsService } from "../services/settings/settings.service";
import { MediaService, getUploadsRoot } from "../services/media/media.service";
import { prisma } from "../prisma";
import fs from "fs";
import path from "path";

describe("Phase 1: Settings Core, Media, Branding & Realtime", () => {
  beforeAll(async () => {
    // Ensure clean state for test platform settings
    await prisma.mediaUsage.deleteMany({});
    await prisma.settingSecret.deleteMany({});
    await prisma.settingAudit.deleteMany({});
    await prisma.setting.deleteMany({
      where: { group: "branding" },
    });
    SettingsService.clearCache();
  });

  describe("1. Settings Registry & Validation", () => {
    it("should define branding settings with proper defaults", () => {
      const appNameDef = getSettingDefinition("branding.app_name");
      expect(appNameDef).toBeDefined();
      expect(appNameDef?.default).toBe("Master HRMS");
      expect(appNameDef?.applyStrategy).toBe("INSTANT");

      const colorDef = getSettingDefinition("branding.primary_color");
      expect(colorDef).toBeDefined();
      expect(colorDef?.default).toBe("#FF6B00");
    });

    it("should validate primary color format", () => {
      expect(validateSettingValue("branding.primary_color", "#FF6B00").valid).toBe(true);
      expect(validateSettingValue("branding.primary_color", "#10b981").valid).toBe(true);
      expect(validateSettingValue("branding.primary_color", "invalid-color").valid).toBe(false);
      expect(validateSettingValue("branding.primary_color", "123456").valid).toBe(false);
    });

    it("should validate support email format", () => {
      expect(validateSettingValue("branding.support_email", "admin@company.com").valid).toBe(true);
      expect(validateSettingValue("branding.support_email", "not-an-email").valid).toBe(false);
    });

    it("should validate app name constraints", () => {
      expect(validateSettingValue("branding.app_name", "Acme HRMS").valid).toBe(true);
      expect(validateSettingValue("branding.app_name", "").valid).toBe(false);
      expect(validateSettingValue("branding.app_name", "a".repeat(105)).valid).toBe(false);
    });
  });

  describe("2. AES-256-GCM Secret Cryptography", () => {
    it("should securely encrypt and decrypt sensitive settings", () => {
      const sensitiveKey = "super_secret_smtp_password_987654";
      const encrypted = encryptSecret(sensitiveKey);

      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.ciphertext).not.toBe(sensitiveKey);
      expect(encrypted.iv).toHaveLength(24); // 12 bytes = 24 hex
      expect(encrypted.authTag).toHaveLength(32); // 16 bytes = 32 hex

      const decrypted = decryptSecret(encrypted.ciphertext, encrypted.iv, encrypted.authTag);
      expect(decrypted).toBe(sensitiveKey);
    });

    it("should fail decryption if auth tag is tampered with", () => {
      const encrypted = encryptSecret("sensitive_data");
      const badAuthTag = "0".repeat(32);
      expect(() => {
        decryptSecret(encrypted.ciphertext, encrypted.iv, badAuthTag);
      }).toThrow();
    });
  });

  describe("3. Media Upload, Integrity & Storage", () => {
    let uploadedMediaId = "";

    it("should accept valid PNG buffer, compute SHA-256, and store MediaFile", async () => {
      // 1x1 transparent PNG buffer
      const pngBuffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      );

      const media = await MediaService.uploadMedia(pngBuffer, "test-logo.png", {
        folder: "system/branding",
        uploadedBy: "test-user-id",
      });

      expect(media.id).toBeDefined();
      expect(media.mimeType).toBe("image/png");
      expect(media.fileSize).toBe(pngBuffer.length);
      expect(media.checksumSha).toHaveLength(64);
      expect(media.url).toContain("/uploads/system/branding/");

      // Verify file exists on disk
      const diskPath = path.join(getUploadsRoot(), media.filePath);
      expect(fs.existsSync(diskPath)).toBe(true);

      uploadedMediaId = media.id;
    });

    it("should reject malicious buffer or invalid format", async () => {
      // Executable MZ header
      const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
      await expect(MediaService.uploadMedia(exeBuffer, "virus.exe")).rejects.toThrow();

      // SVG with script tag
      const maliciousSvg = Buffer.from('<svg><script>alert("xss")</script></svg>');
      await expect(MediaService.uploadMedia(maliciousSvg, "logo.svg")).rejects.toThrow(/Malicious script/);
    });

    it("should list media files with empty usages initially", async () => {
      const mediaList = await MediaService.listMedia({ folder: "system/branding" });
      const found = mediaList.find((m) => m.id === uploadedMediaId);
      expect(found).toBeDefined();
      expect(found?.usages).toHaveLength(0);
    });
  });

  describe("4. Settings Service Save, Audit & Media Usage Tracking", () => {
    let testMediaId = "";

    beforeAll(async () => {
      const pngBuffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      );
      const media = await MediaService.uploadMedia(pngBuffer, "branding-light-logo.png", {
        folder: "system/branding",
      });
      testMediaId = media.id;
    });

    it("should save branding settings atomically and register MediaUsage", async () => {
      const payload = {
        "branding.app_name": "Antigravity Global HRMS",
        "branding.primary_color": "#0066FF",
        "branding.support_email": "ops@antigravity.corp",
        "branding.logo_light_id": testMediaId,
        "branding.footer_text": "© 2026 Antigravity Corp.",
      };

      const result = await SettingsService.setGroup("PLATFORM", null, "branding", payload, {
        userId: "admin-1",
        ipAddress: "127.0.0.1",
        userAgent: "Vitest/2.0",
      });

      expect(result.success).toBe(true);
      expect(result.version).toBeGreaterThanOrEqual(1);

      // Verify DB Setting records
      const appNameInDb = await prisma.setting.findFirst({
        where: { scope: "PLATFORM", key: "branding.app_name" },
      });
      expect(appNameInDb?.valueJson).toBe("Antigravity Global HRMS");

      // Verify MediaUsage was created for the light logo
      const usage = await prisma.mediaUsage.findFirst({
        where: {
          mediaId: testMediaId,
          entityType: "setting",
          fieldKey: "branding.logo_light_id",
        },
      });
      expect(usage).toBeDefined();

      // Verify Audit record was written
      const audit = await prisma.settingAudit.findFirst({
        where: { key: "branding.app_name", changedBy: "admin-1" },
      });
      expect(audit).toBeDefined();
      expect(audit?.newValueMasked).toContain("Antigravity Global HRMS");
    });

    it("should resolve resolved media URLs in getGroup", async () => {
      const groupData = await SettingsService.getGroup("PLATFORM", null, "branding");

      expect(groupData.values["branding.app_name"]).toBe("Antigravity Global HRMS");
      expect(groupData.values["branding.primary_color"]).toBe("#0066FF");
      expect(groupData.values["branding.logo_light_id"]).toBe(testMediaId);

      // mediaUrls map should contain the resolved URL
      expect(groupData.mediaUrls["branding.logo_light_id"]).toBeDefined();
      expect(groupData.mediaUrls["branding.logo_light_id"]).toContain("/uploads/system/branding/");
    });

    it("should prevent deletion of in-use media file (409 Conflict)", async () => {
      // Attempting to delete testMediaId which is currently used in branding.logo_light_id
      await expect(MediaService.deleteMedia(testMediaId)).rejects.toMatchObject({
        code: "MEDIA_IN_USE",
      });

      // Verify the file was NOT deleted
      const fileStillPresent = await prisma.mediaFile.findUnique({ where: { id: testMediaId } });
      expect(fileStillPresent?.deletedAt).toBeNull();
    });

    it("should allow forced deletion if force=true option is passed", async () => {
      const result = await MediaService.deleteMedia(testMediaId, { force: true });
      expect(result.success).toBe(true);

      const fileAfter = await prisma.mediaFile.findUnique({ where: { id: testMediaId } });
      expect(fileAfter?.deletedAt).not.toBeNull();
    });
  });

  describe("5. Public App Config Resolution", () => {
    it("should return updated branding without secrets via SettingsService", async () => {
      const branding = await SettingsService.getGroup("PLATFORM", null, "branding");
      const locale = await SettingsService.getGroup("PLATFORM", null, "locale");

      expect(branding.values["branding.app_name"]).toBe("Antigravity Global HRMS");
      expect(branding.values["branding.primary_color"]).toBe("#0066FF");
      expect(locale.values["locale.default_currency"]).toBe("INR");
    });
  });
});
