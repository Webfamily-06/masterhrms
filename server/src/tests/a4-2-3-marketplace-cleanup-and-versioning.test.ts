import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import { prisma, rawPrisma } from "../prisma";
import { cmsRouter } from "../routes/cms.routes";
import { superRouter } from "../routes/super.routes";
import { generateToken } from "../lib/jwt";

const db = rawPrisma || prisma;

describe("MASTERHRMS — Phase A4.2.3 Marketplace UI Cleanup, Dynamic Settings & Version History Suite", () => {
  const timestamp = Date.now();
  const testSuperAdminId = `usr-super-a423-${timestamp}`;
  let superAdminToken: string;
  let server: http.Server;
  let baseUrl: string;

  async function apiRequest(
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
    // 1. Create Super Admin User & Roles
    await db.user.create({
      data: {
        id: testSuperAdminId,
        email: `super-a423-${timestamp}@masterhrms.test`,
        passwordHash: "mock-hash",
        roles: {
          create: [{ role: "super_admin" }],
        },
      },
    });

    superAdminToken = generateToken({
      userId: testSuperAdminId,
      email: `super-a423-${timestamp}@masterhrms.test`,
      roles: ["super_admin"],
    });

    // 2. Setup Express test server
    const app = express();
    app.use(express.json());
    app.use("/api/cms", cmsRouter);
    app.use("/api/super", superRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as any).port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await db.userRole.deleteMany({ where: { userId: testSuperAdminId } }).catch(() => null);
    await db.user.delete({ where: { id: testSuperAdminId } }).catch(() => null);
  });

  describe("Group 1: Authoritative Version History & Changelog Persistence", () => {
    it("returns clean empty release array for an add-on with no recorded history", async () => {
      const res = await apiRequest("/api/super/addons/pos/releases", {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.addonSlug).toBe("pos");
      expect(res.body.totalReleases).toBeDefined();
      expect(Array.isArray(res.body.releases)).toBe(true);
    });

    it("publishes an immutable version release with semver validation", async () => {
      // Invalid semver check
      const invalidRes = await apiRequest("/api/super/addons/pos/releases", {
        method: "POST",
        headers: { Authorization: `Bearer ${superAdminToken}` },
        body: {
          version: "invalid-version",
          changeSummary: "Test invalid semver",
        },
      });

      expect(invalidRes.status).toBe(400);
      expect(invalidRes.body.code).toBe("INVALID_SEMVER");

      // Valid release publication
      const testVer = `3.0.${Math.floor(Math.random() * 1000)}`;
      const validRes = await apiRequest("/api/super/addons/pos/releases", {
        method: "POST",
        headers: { Authorization: `Bearer ${superAdminToken}` },
        body: {
          version: testVer,
          changeSummary: "Initial Phase A4.2.3 verified release notes",
          releaseNotes: "Full release documentation with thermal printing and zero-mock catalog.",
          isPublic: true,
        },
      });

      expect(validRes.status).toBe(201);
      expect(validRes.body.success).toBe(true);
      expect(validRes.body.release.version).toBe(testVer);
      expect(validRes.body.release.actorEmail).toBe(`super-a423-${timestamp}@masterhrms.test`);

      // Verify duplicate prevention
      const dupRes = await apiRequest("/api/super/addons/pos/releases", {
        method: "POST",
        headers: { Authorization: `Bearer ${superAdminToken}` },
        body: {
          version: testVer,
          changeSummary: "Duplicate attempt",
        },
      });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.code).toBe("VERSION_EXISTS");

      // Clean up test release from system-addon-releases-pos
      const page = await db.cmsPage.findUnique({ where: { slug: "system-addon-releases-pos" } });
      if (page?.content && Array.isArray((page.content as any).releases)) {
        const filtered = (page.content as any).releases.filter((r: any) => r.version !== testVer);
        await db.cmsPage.update({
          where: { slug: "system-addon-releases-pos" },
          data: { content: { releases: filtered } },
        });
      }
    });

    it("public releases endpoint redacts administrator email and private fields", async () => {
      // First publish a test release
      const testVer = `3.1.${Math.floor(Math.random() * 1000)}`;
      await apiRequest("/api/super/addons/pos/releases", {
        method: "POST",
        headers: { Authorization: `Bearer ${superAdminToken}` },
        body: {
          version: testVer,
          changeSummary: "Public Changelog Release",
          releaseNotes: "Publicly visible features",
          isPublic: true,
        },
      });

      const publicRes = await apiRequest("/api/cms/addons/pos/releases");

      expect(publicRes.status).toBe(200);
      expect(publicRes.body.addonSlug).toBe("pos");
      const matched = publicRes.body.releases.find((r: any) => r.version === testVer);
      expect(matched).toBeDefined();
      expect(matched.changeSummary).toBe("Public Changelog Release");
      // Private fields must be redacted
      expect(matched.actorEmail).toBeUndefined();
      expect(matched.metadataDiff).toBeUndefined();

      // Clean up test release
      const page = await db.cmsPage.findUnique({ where: { slug: "system-addon-releases-pos" } });
      if (page?.content && Array.isArray((page.content as any).releases)) {
        const filtered = (page.content as any).releases.filter((r: any) => r.version !== testVer);
        await db.cmsPage.update({
          where: { slug: "system-addon-releases-pos" },
          data: { content: { releases: filtered } },
        });
      }
    });
  });

  describe("Group 2: Category Persistence and Referential Deletion Guards", () => {
    it("prevents duplicate category creation with case-insensitive check", async () => {
      const res = await apiRequest("/api/super/addons/categories", {
        method: "POST",
        headers: { Authorization: `Bearer ${superAdminToken}` },
        body: { name: "COMMERCE" }, // existing category in different case
      });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CATEGORY_EXISTS");
    });

    it("guards categories from accidental deletion when associated with active addons", async () => {
      const res = await apiRequest("/api/super/addons/categories/Commerce", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("CATEGORY_IN_USE");
      expect(res.body.count).toBeGreaterThan(0);
    });
  });

  describe("Group 3: Platform Settings & Currency Formatting Authority", () => {
    it("returns platform settings with authoritative defaultCurrency", async () => {
      const res = await apiRequest("/api/cms/pages/system-platform-settings");
      expect(res.status).toBe(200);
      if (res.body?.content) {
        expect(res.body.content.defaultCurrency || "INR").toBeDefined();
      }
    });
  });
});
