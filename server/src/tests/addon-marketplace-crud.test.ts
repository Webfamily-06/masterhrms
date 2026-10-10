/**
 * MASTERHRMS — Dynamic Addon Marketplace, CRUD, File API & CMS Remediation Acceptance Suite
 *
 * Verifies:
 * 1. Super Admin Add-on CRUD lifecycle (Create, Read, Update, Delete)
 * 2. Duplicate slug conflict checks (409 SLUG_EXISTS) and validation enforcement (400)
 * 3. Soft-archive protection: Addons referenced by TenantAddon are archived, not hard-deleted
 * 4. Distinct category retrieval across Super Admin and Public CMS APIs
 * 5. Media upload via /api/v1/media/upload with magic-byte image validation
 * 6. Public /api/cms/addons and /api/cms/addons/:slug active-only filtering
 * 7. Relational bridge for /api/cms/pages/system-addons-catalog backed by prisma.addon
 * 8. Super Admin RBAC enforcement (non-super admins rejected with 403)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import { prisma, rawPrisma } from "../prisma";
import { superRouter } from "../routes/super.routes";
import { cmsRouter } from "../routes/cms.routes";
import { mediaRouter } from "../routes/media.routes";
import { generateToken } from "../lib/jwt";

const db = rawPrisma || prisma;

describe("MASTERHRMS — Add-on Marketplace, CRUD & CMS Verification Suite", () => {
  const timestamp = Date.now();
  const testSuperAdminId = `usr-super-${timestamp}`;
  const testTenantAdminId = `usr-tenant-${timestamp}`;
  const testTenantId = `tenant-${timestamp}`;

  let superAdminToken: string;
  let tenantAdminToken: string;

  let testApp: express.Application;
  let httpServer: http.Server;
  let baseUrl: string;

  const validPngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );

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
        email: `super-${timestamp}@masterhrms.test`,
        passwordHash: "mock-hash",
        roles: {
          create: [{ role: "super_admin" }],
        },
        profile: {
          create: {
            fullName: "Super Admin Tester",
          },
        },
      },
    });

    superAdminToken = generateToken({
      userId: testSuperAdminId,
      email: `super-${timestamp}@masterhrms.test`,
      tenantId: null,
      roles: ["super_admin"],
    });

    // 2. Create Regular Tenant Admin User (for RBAC testing)
    await db.tenant.create({
      data: {
        id: testTenantId,
        name: `Test Tenant ${timestamp}`,
        slug: `tenant-slug-${timestamp}`,
      },
    });

    await db.user.create({
      data: {
        id: testTenantAdminId,
        email: `tenant-${timestamp}@masterhrms.test`,
        passwordHash: "mock-hash",
        roles: {
          create: [{ role: "hr_admin" }],
        },
        profile: {
          create: {
            fullName: "Tenant Admin Tester",
            tenantId: testTenantId,
          },
        },
      },
    });

    tenantAdminToken = generateToken({
      userId: testTenantAdminId,
      email: `tenant-${timestamp}@masterhrms.test`,
      tenantId: testTenantId,
      roles: ["hr_admin"],
    });

    // 3. Mount Test Express Application
    testApp = express();
    testApp.use(express.json());
    testApp.use("/api/super", superRouter);
    testApp.use("/api/cms", cmsRouter);
    testApp.use("/api/v1/media", mediaRouter);

    await new Promise<void>((resolve) => {
      httpServer = testApp.listen(0, () => {
        const address = httpServer.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (httpServer) {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    }

    // Cleanup test records
    await db.tenantAddon.deleteMany({
      where: { tenantId: testTenantId },
    }).catch(() => {});

    await db.addon.deleteMany({
      where: { slug: { contains: `test-addon-${timestamp}` } },
    }).catch(() => {});

    await db.userRole.deleteMany({
      where: { userId: { in: [testSuperAdminId, testTenantAdminId] } },
    }).catch(() => {});

    await db.profile.deleteMany({
      where: { userId: { in: [testSuperAdminId, testTenantAdminId] } },
    }).catch(() => {});

    await db.user.deleteMany({
      where: { id: { in: [testSuperAdminId, testTenantAdminId] } },
    }).catch(() => {});

    await db.tenant.deleteMany({
      where: { id: testTenantId },
    }).catch(() => {});
  });

  describe("1. Super Admin RBAC Enforcement", () => {
    it("rejects unauthorized requests without a token (401)", async () => {
      const { status } = await apiFetch("/api/super/addons");
      expect(status).toBe(401);
    });

    it("rejects non-super-admin authenticated requests (403)", async () => {
      const { status } = await apiFetch("/api/super/addons", {
        headers: { Authorization: `Bearer ${tenantAdminToken}` },
      });
      expect(status).toBe(403);
    });

    it("allows Super Admin requests (200)", async () => {
      const { status, body } = await apiFetch("/api/super/addons", {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      expect(status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
    });
  });

  describe("2. Super Admin Addon CRUD Lifecycle", () => {
    const slug1 = `test-addon-${timestamp}-a`;
    let createdAddonId: string;

    it("validates required fields on create (400)", async () => {
      const { status, body } = await apiFetch("/api/super/addons", {
        method: "POST",
        headers: { Authorization: `Bearer ${superAdminToken}` },
        body: { name: "Incomplete Addon" }, // Missing slug and category
      });
      expect(status).toBe(400);
      expect(body.code).toBe("VALIDATION_FAILED");
    });

    it("creates a new add-on with all metadata fields (201)", async () => {
      const { status, body } = await apiFetch("/api/super/addons", {
        method: "POST",
        headers: { Authorization: `Bearer ${superAdminToken}` },
        body: {
          name: "Test Smart Automation",
          slug: slug1,
          tagline: "Automated trigger-action workflows",
          description: "Connect events with automated webhook notifications",
          long_description: "Detailed description of how automation works in the system.",
          category: "Productivity",
          price_monthly: 999,
          icon: "/uploads/media/icons/automation.png",
          screenshots: ["/uploads/media/screens/screen1.png", "/uploads/media/screens/screen2.png"],
          features: ["Real-time triggers", "Custom webhooks", "Conditional logic"],
          developer: "Master Automation Team",
          version: "1.2.0",
          featured: true,
          status: "active",
        },
      });

      expect(status).toBe(201);
      expect(body.id).toBeDefined();
      expect(body.slug).toBe(slug1);
      expect(body.price_monthly).toBe(999);
      expect(body.priceMonthly).toBe(999);
      expect(body.long_description).toBe("Detailed description of how automation works in the system.");
      expect(body.features).toHaveLength(3);
      expect(body.screenshots).toHaveLength(2);
      createdAddonId = body.id;
    });

    it("rejects duplicate slug on creation (409 SLUG_EXISTS)", async () => {
      const { status, body } = await apiFetch("/api/super/addons", {
        method: "POST",
        headers: { Authorization: `Bearer ${superAdminToken}` },
        body: {
          name: "Duplicate Slug Addon",
          slug: slug1,
          category: "Finance",
        },
      });
      expect(status).toBe(409);
      expect(body.code).toBe("SLUG_EXISTS");
    });

    it("reads the created add-on through Super Admin list and filters", async () => {
      const { status, body } = await apiFetch(`/api/super/addons?category=Productivity&search=${slug1}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      expect(status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      const found = body.find((item: any) => item.id === createdAddonId);
      expect(found).toBeDefined();
      expect(found.name).toBe("Test Smart Automation");
    });

    it("updates the add-on and persists modifications (200)", async () => {
      const { status, body } = await apiFetch(`/api/super/addons/${createdAddonId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${superAdminToken}` },
        body: {
          name: "Updated Smart Automation",
          price_monthly: 1299,
          features: ["Updated Feature 1", "Updated Feature 2"],
          version: "1.3.0",
        },
      });

      expect(status).toBe(200);
      expect(body.name).toBe("Updated Smart Automation");
      expect(body.price_monthly).toBe(1299);
      expect(body.version).toBe("1.3.0");
      expect(body.features).toEqual(["Updated Feature 1", "Updated Feature 2"]);
      // Unmodified fields preserved
      expect(body.slug).toBe(slug1);
      expect(body.category).toBe("Productivity");
    });

    it("retrieves distinct categories including the created add-on category", async () => {
      const { status, body } = await apiFetch("/api/super/addons/categories", {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      expect(status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body).toContain("Productivity");
    });
  });

  describe("3. Category Management & CRUD Lifecycle", () => {
    const customCatName = `Custom Cat ${timestamp}`;
    const renamedCatName = `Renamed Cat ${timestamp}`;

    it("rejects non-super-admin category mutations with 403", async () => {
      const { status } = await apiFetch("/api/super/addons/categories", {
        method: "POST",
        headers: { Authorization: `Bearer ${tenantAdminToken}` },
        body: { name: "Unauthorized Category" },
      });
      expect(status).toBe(403);
    });

    it("creates a new custom category (201)", async () => {
      const { status, body } = await apiFetch("/api/super/addons/categories", {
        method: "POST",
        headers: { Authorization: `Bearer ${superAdminToken}` },
        body: { name: customCatName },
      });
      expect(status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.name).toBe(customCatName);
    });

    it("rejects duplicate category creation (409 CATEGORY_EXISTS)", async () => {
      const { status, body } = await apiFetch("/api/super/addons/categories", {
        method: "POST",
        headers: { Authorization: `Bearer ${superAdminToken}` },
        body: { name: customCatName },
      });
      expect(status).toBe(409);
      expect(body.code).toBe("CATEGORY_EXISTS");
    });

    it("retrieves category metrics with counts and isDeletable flags", async () => {
      const { status, body } = await apiFetch("/api/super/addons/categories?details=true", {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      expect(status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      const customItem = body.find((c: any) => c.name === customCatName);
      expect(customItem).toBeDefined();
      expect(customItem.count).toBe(0);
      expect(customItem.isDeletable).toBe(true);
    });

    it("renames a category and updates associated add-ons (200)", async () => {
      // Create a temporary addon assigned to customCatName
      const tempSlug = `test-cat-rename-${timestamp}`;
      await db.addon.create({
        data: {
          name: "Addon For Category Rename",
          slug: tempSlug,
          category: customCatName,
          status: "active",
        },
      });

      const { status, body } = await apiFetch(`/api/super/addons/categories/${encodeURIComponent(customCatName)}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${superAdminToken}` },
        body: { newName: renamedCatName },
      });

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.newName).toBe(renamedCatName);
      expect(body.updatedCount).toBeGreaterThanOrEqual(1);

      // Verify addon in database was updated
      const checkAddon = await db.addon.findUnique({ where: { slug: tempSlug } });
      expect(checkAddon?.category).toBe(renamedCatName);
    });

    it("prevents deleting a category that has assigned add-ons (400 CATEGORY_IN_USE)", async () => {
      const { status, body } = await apiFetch(`/api/super/addons/categories/${encodeURIComponent(renamedCatName)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      expect(status).toBe(400);
      expect(body.code).toBe("CATEGORY_IN_USE");
      expect(body.count).toBeGreaterThan(0);
    });

    it("safely deletes a category once all associated add-ons are removed (200)", async () => {
      // Delete the addon that was using this category
      await db.addon.deleteMany({
        where: { category: renamedCatName },
      });

      const { status, body } = await apiFetch(`/api/super/addons/categories/${encodeURIComponent(renamedCatName)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      expect(status).toBe(200);
      expect(body.success).toBe(true);
    });
  });

  describe("3. Soft-Archive vs Hard-Delete Behavior", () => {
    const unreferencedSlug = `test-addon-${timestamp}-unref`;
    const referencedSlug = `test-addon-${timestamp}-ref`;
    let unrefId: string;
    let refId: string;

    beforeAll(async () => {
      // Create unreferenced addon
      const unref = await db.addon.create({
        data: {
          name: "Unreferenced Addon",
          slug: unreferencedSlug,
          category: "Communication",
          status: "active",
        },
      });
      unrefId = unref.id;

      // Create referenced addon with a TenantAddon entitlement
      const ref = await db.addon.create({
        data: {
          name: "Referenced Addon",
          slug: referencedSlug,
          category: "Finance",
          status: "active",
        },
      });
      refId = ref.id;

      await db.tenantAddon.create({
        data: {
          tenantId: testTenantId,
          addonSlug: referencedSlug,
          status: "active",
        },
      });
    });

    it("hard-deletes an add-on that has zero tenant entitlement references", async () => {
      const { status, body } = await apiFetch(`/api/super/addons/${unrefId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      expect(status).toBe(200);
      expect(body.success).toBe(true);

      const checkDb = await db.addon.findUnique({ where: { id: unrefId } });
      expect(checkDb).toBeNull();
    });

    it("soft-archives an add-on that is referenced by existing entitlements", async () => {
      const { status, body } = await apiFetch(`/api/super/addons/${refId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      expect(status).toBe(200);
      expect(body.archived).toBe(true);

      const checkDb = await db.addon.findUnique({ where: { id: refId } });
      expect(checkDb).not.toBeNull();
      expect(checkDb?.status).toBe("archived");

      // Verify tenant entitlement remains completely intact
      const checkEntitlement = await db.tenantAddon.findFirst({
        where: { tenantId: testTenantId, addonSlug: referencedSlug },
      });
      expect(checkEntitlement).not.toBeNull();
      expect(checkEntitlement?.status).toBe("active");
    });
  });

  describe("4. Public CMS Catalog & Slug Detail Routes", () => {
    const publicSlug = `test-addon-${timestamp}-public`;
    const draftSlug = `test-addon-${timestamp}-draft`;

    beforeAll(async () => {
      await db.addon.create({
        data: {
          name: "Public Visible Addon",
          slug: publicSlug,
          tagline: "Publicly visible extension",
          description: "Full description for public visitors",
          category: "AI & ML",
          priceMonthly: 799,
          icon: "/uploads/media/icons/ai.png",
          screenshots: ["/uploads/media/screens/screen-ai.png"],
          features: ["AI Model A", "AI Model B"],
          developer: "Master AI Core",
          status: "active",
          featured: true,
        },
      });

      await db.addon.create({
        data: {
          name: "Unpublished Draft Addon",
          slug: draftSlug,
          category: "AI & ML",
          status: "draft",
        },
      });
    });

    it("displays active addons on /api/cms/addons without requiring auth", async () => {
      const { status, body } = await apiFetch("/api/cms/addons");
      expect(status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      const publicItem = body.find((a: any) => a.slug === publicSlug);
      expect(publicItem).toBeDefined();
      expect(publicItem.name).toBe("Public Visible Addon");
    });

    it("hides unpublished drafts and archived addons from /api/cms/addons", async () => {
      const { status, body } = await apiFetch("/api/cms/addons");
      expect(status).toBe(200);
      const draftItem = body.find((a: any) => a.slug === draftSlug);
      expect(draftItem).toBeUndefined();
    });

    it("serves detail metadata on /api/cms/addons/:slug for active addons", async () => {
      const { status, body } = await apiFetch(`/api/cms/addons/${publicSlug}`);
      expect(status).toBe(200);
      expect(body.slug).toBe(publicSlug);
      expect(body.price_monthly).toBe(799);
      expect(body.features).toEqual(["AI Model A", "AI Model B"]);
      expect(body.icon).toBe("/uploads/media/icons/ai.png");
    });

    it("returns 404 on /api/cms/addons/:slug for draft or nonexistent slugs", async () => {
      const { status: draftStatus } = await apiFetch(`/api/cms/addons/${draftSlug}`);
      expect(draftStatus).toBe(404);

      const { status: nonExistentStatus } = await apiFetch("/api/cms/addons/does-not-exist");
      expect(nonExistentStatus).toBe(404);
    });

    it("relational bridge /api/cms/pages/system-addons-catalog returns live active addons", async () => {
      const { status, body } = await apiFetch("/api/cms/pages/system-addons-catalog");
      expect(status).toBe(200);
      expect(body.id).toBe("system-addons-catalog");
      expect(Array.isArray(body.content)).toBe(true);
      const publicItem = body.content.find((a: any) => a.slug === publicSlug);
      expect(publicItem).toBeDefined();
      const draftItem = body.content.find((a: any) => a.slug === draftSlug);
      expect(draftItem).toBeUndefined();
    });
  });

  describe("5. File Upload & Media Library Validation", () => {
    it("validates magic bytes and stores file via /api/v1/media/upload", async () => {
      const formData = new FormData();
      const blob = new Blob([validPngBuffer], { type: "image/png" });
      formData.append("file", blob, "test-icon.png");
      formData.append("folder", "addons/icons");

      const res = await fetch(`${baseUrl}/api/v1/media/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: formData,
      });

      const body = await res.json();
      expect(res.status).toBe(201);
      expect(body.id).toBeDefined();
      expect(body.url).toBeDefined();
      expect(body.url).toContain("/uploads/");
    });

    it("rejects non-image corrupt payload disguised with image MIME type", async () => {
      const formData = new FormData();
      const corruptBlob = new Blob([Buffer.from("NOT_A_VALID_IMAGE_HEADER")], { type: "image/png" });
      formData.append("file", corruptBlob, "fake.png");
      formData.append("folder", "addons/icons");

      const res = await fetch(`${baseUrl}/api/v1/media/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: formData,
      });

      expect(res.status).toBe(400);
    });
  });
});
