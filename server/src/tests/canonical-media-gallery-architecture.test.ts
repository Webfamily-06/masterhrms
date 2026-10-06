import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma, rawPrisma } from "../prisma";
import { SettingsService } from "../services/settings/settings.service";
import { MediaService } from "../services/media/media.service";
import express from "express";
import http from "http";
import { mediaRouter } from "../routes/media.routes";
import { settingsRouter } from "../routes/settings.routes";
import { generateToken } from "../lib/jwt";

describe("Canonical Media Gallery Architecture & Isolation", () => {
  const tenantAId = "test-media-tenant-a-" + Date.now();
  const tenantBId = "test-media-tenant-b-" + Date.now();

  const app = express();
  app.use(express.json());
  app.use("/api/v1/media", mediaRouter);
  app.use("/api/v1/settings", settingsRouter);

  let server: http.Server;
  let baseUrl: string;

  // Tokens
  let superAdminUser: any;
  let tenantAUser: any;
  let tenantBUser: any;
  let superToken: string;
  let tenantAToken: string;
  let tenantBToken: string;

  // Tracked media IDs
  let platformMediaId: string;
  let platformPdfId: string;
  let tenantAMediaId: string;
  let tenantBMediaId: string;

  // Valid 1x1 PNG Buffer
  const validPngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );

  // Valid PDF Buffer (%PDF-1.4 header)
  const validPdfBuffer = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n%%EOF"
  );

  beforeAll(async () => {
    // 1. Create Test Tenants
    await rawPrisma.tenant.create({
      data: {
        id: tenantAId,
        name: "Acme Media Alpha",
        slug: "acme-media-" + Date.now(),
        timezone: "Asia/Kolkata",
      },
    });

    await rawPrisma.tenant.create({
      data: {
        id: tenantBId,
        name: "Beta Media Logistics",
        slug: "beta-media-" + Date.now(),
        timezone: "Asia/Kolkata",
      },
    });

    // 2. Create Users
    superAdminUser = await rawPrisma.user.create({
      data: {
        email: `super-media-${Date.now()}@platform.com`,
        passwordHash: "hash123",
        roles: { create: [{ role: "super_admin" }] },
      },
    });

    tenantAUser = await rawPrisma.user.create({
      data: {
        email: `admin-media-a-${Date.now()}@acme.com`,
        passwordHash: "hash123",
        roles: { create: [{ role: "hr_admin", tenantId: tenantAId }] },
        profile: {
          create: {
            tenantId: tenantAId,
            fullName: "Alice Media Admin",
          },
        },
      },
    });

    tenantBUser = await rawPrisma.user.create({
      data: {
        email: `admin-media-b-${Date.now()}@beta.com`,
        passwordHash: "hash123",
        roles: { create: [{ role: "hr_admin", tenantId: tenantBId }] },
        profile: {
          create: {
            tenantId: tenantBId,
            fullName: "Bob Media Admin",
          },
        },
      },
    });

    // 3. Generate JWTs
    superToken = generateToken({
      userId: superAdminUser.id,
      email: superAdminUser.email,
      roles: ["super_admin"],
      tenantId: null,
    });

    tenantAToken = generateToken({
      userId: tenantAUser.id,
      email: tenantAUser.email,
      roles: ["hr_admin"],
      tenantId: tenantAId,
    });

    tenantBToken = generateToken({
      userId: tenantBUser.id,
      email: tenantBUser.email,
      roles: ["hr_admin"],
      tenantId: tenantBId,
    });

    // 4. Start HTTP test server
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as any).port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) server.close();
    // Cleanup records
    await rawPrisma.mediaUsage.deleteMany({
      where: {
        mediaId: { in: [platformMediaId, platformPdfId, tenantAMediaId, tenantBMediaId].filter(Boolean) },
      },
    });
    await rawPrisma.mediaFile.deleteMany({
      where: {
        id: { in: [platformMediaId, platformPdfId, tenantAMediaId, tenantBMediaId].filter(Boolean) },
      },
    });
    await rawPrisma.tenant.deleteMany({
      where: { id: { in: [tenantAId, tenantBId] } },
    });
    const userIds = [superAdminUser?.id, tenantAUser?.id, tenantBUser?.id].filter(Boolean) as string[];
    if (userIds.length > 0) {
      await rawPrisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }
  });

  // ==========================================
  // 1. PLATFORM MEDIA UPLOAD & VALIDATION
  // ==========================================
  describe("1. Platform Media Upload & Validation", () => {
    it("should allow Super Admin to upload platform image with tenantId = null", async () => {
      const media = await MediaService.uploadMedia(validPngBuffer, "platform-logo.png", {
        folder: "system/branding",
        tenantId: null,
        uploadedBy: superAdminUser.id,
        tags: ["branding", "platform"],
      });

      expect(media.id).toBeDefined();
      expect(media.tenantId).toBeNull();
      expect(media.mimeType).toBe("image/png");
      expect(media.checksumSha).toHaveLength(64);
      expect(media.url).toContain("/uploads/system/branding/");

      platformMediaId = media.id;
    });

    it("should allow Super Admin to upload valid PDF document asset", async () => {
      const media = await MediaService.uploadMedia(validPdfBuffer, "terms-of-service.pdf", {
        folder: "documents",
        tenantId: null,
        uploadedBy: superAdminUser.id,
        tags: ["legal", "pdf"],
      });

      expect(media.id).toBeDefined();
      expect(media.tenantId).toBeNull();
      expect(media.mimeType).toBe("application/pdf");
      expect(media.url).toContain("/uploads/documents/");

      platformPdfId = media.id;
    });

    it("should reject malicious SVG containing script tags", async () => {
      const maliciousSvg = Buffer.from('<svg><script>alert("xss")</script></svg>');
      await expect(
        MediaService.uploadMedia(maliciousSvg, "hacked.svg", { tenantId: null })
      ).rejects.toThrow(/Malicious script/);
    });

    it("should deduplicate identical upload with same checksum & filename within scope", async () => {
      const duplicateUpload = await MediaService.uploadMedia(validPngBuffer, "platform-logo.png", {
        folder: "system/branding",
        tenantId: null,
        uploadedBy: superAdminUser.id,
      });

      expect(duplicateUpload.id).toBe(platformMediaId);
    });
  });

  // ==========================================
  // 2. TENANT MEDIA UPLOAD & ISOLATION
  // ==========================================
  describe("2. Tenant Media Upload & Isolation", () => {
    it("should allow Tenant A to upload media strictly scoped to tenantAId", async () => {
      const mediaA = await MediaService.uploadMedia(validPngBuffer, "tenant-a-logo.png", {
        folder: "branding",
        tenantId: tenantAId,
        uploadedBy: tenantAUser.id,
      });

      expect(mediaA.id).toBeDefined();
      expect(mediaA.tenantId).toBe(tenantAId);
      tenantAMediaId = mediaA.id;
    });

    it("should allow Tenant B to upload media strictly scoped to tenantBId", async () => {
      const mediaB = await MediaService.uploadMedia(validPngBuffer, "tenant-b-logo.png", {
        folder: "branding",
        tenantId: tenantBId,
        uploadedBy: tenantBUser.id,
      });

      expect(mediaB.id).toBeDefined();
      expect(mediaB.tenantId).toBe(tenantBId);
      tenantBMediaId = mediaB.id;
    });

    it("GET /api/v1/media: Tenant A receives only Tenant A media and no Tenant B or Platform media", async () => {
      const res = await fetch(`${baseUrl}/api/v1/media`, {
        headers: { Authorization: `Bearer ${tenantAToken}` },
      });
      expect(res.status).toBe(200);
      const list = await res.json();

      expect(Array.isArray(list)).toBe(true);
      const ids = list.map((m: any) => m.id);
      expect(ids).toContain(tenantAMediaId);
      expect(ids).not.toContain(tenantBMediaId);
      expect(ids).not.toContain(platformMediaId);
    });

    it("GET /api/v1/media: Query parameter ?tenantId=... is strictly ignored for tenant user", async () => {
      const res = await fetch(`${baseUrl}/api/v1/media?tenantId=${tenantBId}`, {
        headers: { Authorization: `Bearer ${tenantAToken}` },
      });
      expect(res.status).toBe(200);
      const list = await res.json();

      const ids = list.map((m: any) => m.id);
      expect(ids).toContain(tenantAMediaId);
      expect(ids).not.toContain(tenantBMediaId);
    });

    it("GET /api/v1/media: Super Admin retrieves Platform media (tenantId = null) by default", async () => {
      const res = await fetch(`${baseUrl}/api/v1/media`, {
        headers: { Authorization: `Bearer ${superToken}` },
      });
      expect(res.status).toBe(200);
      const list = await res.json();

      const ids = list.map((m: any) => m.id);
      expect(ids).toContain(platformMediaId);
      expect(ids).toContain(platformPdfId);
      expect(ids).not.toContain(tenantAMediaId);
      expect(ids).not.toContain(tenantBMediaId);
    });
  });

  // ==========================================
  // 3. CROSS-TENANT & CROSS-SCOPE ACCESS DENIAL
  // ==========================================
  describe("3. Cross-Tenant and Cross-Scope Access Denial", () => {
    it("Tenant A cannot retrieve Tenant B media by ID (HTTP 403)", async () => {
      const res = await fetch(`${baseUrl}/api/v1/media/${tenantBMediaId}`, {
        headers: { Authorization: `Bearer ${tenantAToken}` },
      });
      expect(res.status).toBe(403);
    });

    it("Tenant A cannot retrieve Platform media by ID (HTTP 403)", async () => {
      const res = await fetch(`${baseUrl}/api/v1/media/${platformMediaId}`, {
        headers: { Authorization: `Bearer ${tenantAToken}` },
      });
      expect(res.status).toBe(403);
    });

    it("Tenant A cannot delete Tenant B media (HTTP 403)", async () => {
      const res = await fetch(`${baseUrl}/api/v1/media/${tenantBMediaId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tenantAToken}` },
      });
      expect(res.status).toBe(403);
    });

    it("Tenant A cannot delete Platform media (HTTP 403)", async () => {
      const res = await fetch(`${baseUrl}/api/v1/media/${platformMediaId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tenantAToken}` },
      });
      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // 4. MEDIA USAGE TRACKING & DELETION PROTECTION
  // ==========================================
  describe("4. Media Usage Tracking & Deletion Protection", () => {
    it("should register MediaUsage when attached to settings and block deletion with HTTP 409", async () => {
      // Attach platformMediaId to platform branding setting
      await SettingsService.setGroup("PLATFORM", null, "branding", {
        "branding.logo_light_id": platformMediaId,
      });

      // Verify MediaUsage record exists
      const usages = await prisma.mediaUsage.findMany({
        where: { mediaId: platformMediaId },
      });
      expect(usages.length).toBeGreaterThanOrEqual(1);

      // Attempt to delete in-use media without force
      const deleteRes = await fetch(`${baseUrl}/api/v1/media/${platformMediaId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${superToken}` },
      });

      expect(deleteRes.status).toBe(409);
      const err = await deleteRes.json();
      expect(err.error).toBe("MEDIA_IN_USE");
      expect(err.usages).toBeDefined();

      // Verify file is NOT deleted in DB
      const file = await prisma.mediaFile.findUnique({
        where: { id: platformMediaId },
      });
      expect(file?.deletedAt).toBeNull();
    });

    it("should resolve MediaFile URL through SettingsService.getGroup", async () => {
      const groupData = await SettingsService.getGroup("PLATFORM", null, "branding");
      expect(groupData.values["branding.logo_light_id"]).toBe(platformMediaId);
      expect(groupData.mediaUrls["branding.logo_light_id"]).toContain("/uploads/system/branding/");
    });

    it("should allow deletion with ?force=true and remove usages", async () => {
      const forceDeleteRes = await fetch(
        `${baseUrl}/api/v1/media/${platformMediaId}?force=true`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${superToken}` },
        }
      );

      expect(forceDeleteRes.status).toBe(200);

      // Verify file is marked deleted
      const file = await prisma.mediaFile.findUnique({
        where: { id: platformMediaId },
      });
      expect(file?.deletedAt).not.toBeNull();

      // Verify usages cleaned
      const usages = await prisma.mediaUsage.findMany({
        where: { mediaId: platformMediaId },
      });
      expect(usages.length).toBe(0);
    });
  });
});
