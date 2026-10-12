import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { Server } from "http";
import { rawPrisma } from "../prisma";
import { superRouter } from "../routes/super.routes";
import { cmsRouter } from "../routes/cms.routes";
import { generateToken } from "../lib/jwt";
import fs from "fs";
import path from "path";

describe("MASTERHRMS — Super Admin Authorization Guard & Route Protection Regression Suite", () => {
  let testApp: express.Application;
  let httpServer: Server;
  let baseUrl: string;

  let testTenantId: string;
  let superAdminUserId: string;
  let tenantAdminUserId: string;
  let employeeUserId: string;

  let superAdminToken: string;
  let tenantAdminToken: string;
  let employeeToken: string;

  beforeAll(async () => {
    // 1. Establish isolated tenant fixture
    const tenant = await rawPrisma.tenant.create({
      data: {
        name: "AuthGuard-Test-Tenant",
        slug: `authguard-${Date.now()}`,
      },
    });
    testTenantId = tenant.id;

    superAdminUserId = `usr-super-${Date.now()}`;
    tenantAdminUserId = `usr-tenantadmin-${Date.now()}`;
    employeeUserId = `usr-emp-${Date.now()}`;

    // 2. Create users with distinct role assignments
    await rawPrisma.user.create({
      data: {
        id: superAdminUserId,
        email: `super-${Date.now()}@platform.local`,
        passwordHash: "dummyhash",
        roles: {
          create: { role: "super_admin", tenantId: null },
        },
      },
    });

    await rawPrisma.user.create({
      data: {
        id: tenantAdminUserId,
        email: `tenantadmin-${Date.now()}@workspace.local`,
        passwordHash: "dummyhash",
        profile: {
          create: {
            fullName: "Tenant Administrator",
            tenantId: testTenantId,
          },
        },
        roles: {
          create: { role: "hr_admin", tenantId: testTenantId },
        },
      },
    });

    await rawPrisma.user.create({
      data: {
        id: employeeUserId,
        email: `employee-${Date.now()}@workspace.local`,
        passwordHash: "dummyhash",
        profile: {
          create: {
            fullName: "Regular Employee",
            tenantId: testTenantId,
          },
        },
        roles: {
          create: { role: "employee", tenantId: testTenantId },
        },
      },
    });

    // 3. Issue signed JWT tokens
    superAdminToken = generateToken({
      userId: superAdminUserId,
      email: `super-${Date.now()}@platform.local`,
      roles: ["super_admin"],
    });

    tenantAdminToken = generateToken({
      userId: tenantAdminUserId,
      email: `tenantadmin-${Date.now()}@workspace.local`,
      roles: ["hr_admin"],
      tenantId: testTenantId,
    });

    employeeToken = generateToken({
      userId: employeeUserId,
      email: `employee-${Date.now()}@workspace.local`,
      roles: ["employee"],
      tenantId: testTenantId,
    });

    // 4. Initialize Express HTTP server with super and cms routers
    testApp = express();
    testApp.use(express.json());
    testApp.use("/api/super", superRouter);
    testApp.use("/api/cms", cmsRouter);

    httpServer = testApp.listen(0);
    const addr = httpServer.address() as any;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    if (httpServer) {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    }
    await rawPrisma.userRole.deleteMany({
      where: { userId: { in: [superAdminUserId, tenantAdminUserId, employeeUserId] } },
    }).catch(() => {});
    await rawPrisma.profile.deleteMany({
      where: { userId: { in: [superAdminUserId, tenantAdminUserId, employeeUserId] } },
    }).catch(() => {});
    await rawPrisma.user.deleteMany({
      where: { id: { in: [superAdminUserId, tenantAdminUserId, employeeUserId] } },
    }).catch(() => {});
    if (testTenantId) {
      await rawPrisma.tenant.delete({ where: { id: testTenantId } }).catch(() => {});
    }
  });

  // ---------------------------------------------------------------------------
  // Tier 1: Backend Route Security & Role Separation
  // ---------------------------------------------------------------------------
  describe("Tier 1: Backend Route Authorization & Platform Role Separation", () => {
    it("T1.1: Allows authorized Super Admin to retrieve settings (HTTP 200)", async () => {
      const res = await fetch(`${baseUrl}/api/super/settings`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("platformName");
      expect(data).toHaveProperty("defaultCurrency");
    });

    it("T1.2: Strictly rejects Tenant Admin access to /api/super/settings with HTTP 403", async () => {
      const res = await fetch(`${baseUrl}/api/super/settings`, {
        headers: { Authorization: `Bearer ${tenantAdminToken}` },
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/Forbidden|Insufficient permissions/i);
      expect(data).not.toHaveProperty("systemPlatformSettings");
    });

    it("T1.3: Strictly rejects regular Employee access to /api/super/settings with HTTP 403", async () => {
      const res = await fetch(`${baseUrl}/api/super/settings`, {
        headers: { Authorization: `Bearer ${employeeToken}` },
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/Forbidden|Insufficient permissions/i);
    });

    it("T1.4: Strictly rejects unauthenticated request to /api/super/settings with HTTP 401", async () => {
      const res = await fetch(`${baseUrl}/api/super/settings`);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toMatch(/Unauthorized/i);
    });

    it("T1.5: Strictly rejects Tenant Admin access to /api/super/tenants with HTTP 403", async () => {
      const res = await fetch(`${baseUrl}/api/super/tenants`, {
        headers: { Authorization: `Bearer ${tenantAdminToken}` },
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/Forbidden|Insufficient permissions/i);
    });

    it("T1.6: Strictly rejects Tenant Admin updating system-platform-settings with HTTP 403", async () => {
      const res = await fetch(`${baseUrl}/api/cms/pages/system-platform-settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantAdminToken}`,
        },
        body: JSON.stringify({
          title: "Tenant Admin Attempted Tamper",
          content: { razorpayKeySecret: "malicious_overwrite" },
        }),
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/Super Admin|super_admin/i);
    });

    it("T1.7: Strictly rejects unauthenticated PUT to system-platform-settings with HTTP 401", async () => {
      const res = await fetch(`${baseUrl}/api/cms/pages/system-platform-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Unauthenticated Tamper" }),
      });
      expect(res.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------------------
  // Tier 2: Redaction, Sanitization & Zero Leakage
  // ---------------------------------------------------------------------------
  describe("Tier 2: Information Leakage & Error Sanitization", () => {
    it("T2.1: Unauthorized responses never expose internal stack traces, DB queries, or file paths", async () => {
      const endpoints = [
        `${baseUrl}/api/super/settings`,
        `${baseUrl}/api/super/tenants`,
        `${baseUrl}/api/super/plans`,
      ];
      for (const endpoint of endpoints) {
        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${tenantAdminToken}` },
        });
        expect(res.status).toBe(403);
        const text = await res.text();
        expect(text).not.toContain("node_modules");
        expect(text).not.toContain("at requireAuth");
        expect(text).not.toContain("SELECT ");
        expect(text).not.toContain("prisma");
      }
    });

    it("T2.2: Public GET /api/cms/pages/system-platform-settings strictly omits all payment secrets", async () => {
      const res = await fetch(`${baseUrl}/api/cms/pages/system-platform-settings`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.content.razorpayKeySecret).toBeUndefined();
      expect(data.content.razorpayKeyId).toBeUndefined();
      expect(data.content.stripeSecretKey).toBeUndefined();
      expect(data.content.smtpPassword).toBeUndefined();
      expect(JSON.stringify(data)).not.toContain("rzp_");
    });
  });

  // ---------------------------------------------------------------------------
  // Tier 3: Frontend Route Shell Architecture Contract
  // ---------------------------------------------------------------------------
  describe("Tier 3: Frontend Route Shell Architecture Contract", () => {
    it("T3.1: Super route file guarantees ForbiddenView for authenticated non-super-admins", () => {
      const superRoutePath = path.resolve(__dirname, "../../../src/routes/_authenticated/super/route.tsx");
      const fileContent = fs.readFileSync(superRoutePath, "utf-8");

      // Verify ForbiddenView import
      expect(fileContent).toContain('import { ForbiddenView } from "@/components/error-pages/forbidden-view";');

      // Verify mounting ForbiddenView when profile loaded but not super admin
      expect(fileContent).toContain("if (profile && !isSuperAdmin)");
      expect(fileContent).toContain("<ForbiddenView");
      expect(fileContent).toContain('requiredRole="super_admin"');

      // Verify Super06LoginPage is NOT mounted inline in SuperShell
      expect(fileContent).not.toContain("<Super06LoginPage");
    });

    it("T3.2: Super route file guarantees programmatic navigation to /super06 when unauthenticated", () => {
      const superRoutePath = path.resolve(__dirname, "../../../src/routes/_authenticated/super/route.tsx");
      const fileContent = fs.readFileSync(superRoutePath, "utf-8");

      expect(fileContent).toContain('navigate({ to: "/super06" })');
    });
  });
});
