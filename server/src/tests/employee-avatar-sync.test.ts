import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import http from "http";
import { PrismaClient } from "@prisma/client";
import { mediaRouter } from "../routes/media.routes";
import { platformFoundationRouter } from "../routes/platform-foundation.routes";
import { uploadsSecurityMiddleware } from "../middleware/uploads-security.middleware";
import { generateToken } from "../lib/jwt";
import { getUploadsRoot } from "../services/media/media.service";
import { EmployeeService } from "../services/employee.service";
import { runWithTenantContext, TenantContext } from "../context/tenant-context";

const rawPrisma = new PrismaClient();

function executeAsTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
  const ctx: TenantContext = {
    tenantId,
    userId: "admin-actor-avatar-sync",
    roles: ["hr_admin"],
    status: "ACTIVE",
    tenancyStrategy: "SHARED_SCHEMA",
    db: rawPrisma,
  };
  return runWithTenantContext(ctx, fn);
}

describe("Global Employee Profile Image Synchronization & Isolation Test Suite", () => {
  let server: http.Server;
  let baseUrl: string;
  let tenantA: string;
  let tenantB: string;
  let tokenA: string;
  let tokenB: string;
  let userAId: string;
  let userBId: string;
  let employeeAId: string;
  let employeeBId: string;

  const app = express();
  app.use(express.json());
  app.use("/uploads", uploadsSecurityMiddleware, express.static(getUploadsRoot()));
  app.use("/api/v1/media", mediaRouter);
  app.use("/api/media", mediaRouter);
  app.use("/api/v1", platformFoundationRouter);
  app.use("/api", platformFoundationRouter);

  // Minimal 1x1 PNG Buffer
  const validPngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );

  beforeAll(async () => {
    // 1. Create Tenant A
    const tA = await rawPrisma.tenant.create({
      data: {
        name: "Avatar Sync Tenant A",
        slug: `avatar-sync-a-${Date.now()}`,
      },
    });
    tenantA = tA.id;

    // 2. Create Tenant B
    const tB = await rawPrisma.tenant.create({
      data: {
        name: "Avatar Sync Tenant B",
        slug: `avatar-sync-b-${Date.now()}`,
      },
    });
    tenantB = tB.id;

    // 3. User A (HR Admin)
    const uA = await rawPrisma.user.create({
      data: {
        email: `hr-admin-sync-a-${Date.now()}@tenant-a.com`,
        passwordHash: "dummy-hash",
        profile: {
          create: {
            fullName: "HR Admin Tenant A",
            tenantId: tenantA,
          },
        },
        roles: {
          create: [{ role: "hr_admin", tenantId: tenantA }],
        },
      },
    });
    userAId = uA.id;
    tokenA = generateToken({
      userId: uA.id,
      email: uA.email,
      tenantId: tenantA,
      roles: ["hr_admin"],
    });

    // 4. User B (HR Admin in foreign tenant)
    const uB = await rawPrisma.user.create({
      data: {
        email: `hr-admin-sync-b-${Date.now()}@tenant-b.com`,
        passwordHash: "dummy-hash",
        profile: {
          create: {
            fullName: "HR Admin Tenant B",
            tenantId: tenantB,
          },
        },
        roles: {
          create: [{ role: "hr_admin", tenantId: tenantB }],
        },
      },
    });
    userBId = uB.id;
    tokenB = generateToken({
      userId: uB.id,
      email: uB.email,
      tenantId: tenantB,
      roles: ["hr_admin"],
    });

    // 5. Employee in Tenant A
    const empA = await executeAsTenant(tenantA, async () => {
      return await EmployeeService.createEmployeeAtomic(
        tenantA,
        userAId,
        {
          firstName: "Evelyn",
          lastName: "Reed",
          email: `evelyn.reed.${Date.now()}@tenant-a.com`,
          employeeCode: `EMP-EV-${Math.floor(1000 + Math.random() * 9000)}`,
          phone: "+91 98400 99887",
          createLoginAccount: false,
        },
        {
          userId: userAId,
          roles: ["hr_admin"],
          status: "ACTIVE",
          tenancyStrategy: "SHARED_SCHEMA",
        }
      );
    });
    employeeAId = empA.id;

    // 6. Employee in Tenant B
    const empB = await executeAsTenant(tenantB, async () => {
      return await EmployeeService.createEmployeeAtomic(
        tenantB,
        userBId,
        {
          firstName: "Marcus",
          lastName: "Vance",
          email: `marcus.vance.${Date.now()}@tenant-b.com`,
          employeeCode: `EMP-MV-${Math.floor(1000 + Math.random() * 9000)}`,
          phone: "+91 98400 33445",
          createLoginAccount: false,
        },
        {
          userId: userBId,
          roles: ["hr_admin"],
          status: "ACTIVE",
          tenancyStrategy: "SHARED_SCHEMA",
        }
      );
    });
    employeeBId = empB.id;

    // 7. Start isolated test server
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr: any = server.address();
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    try {
      await rawPrisma.customFieldValue.deleteMany({
        where: { tenantId: { in: [tenantA, tenantB] } },
      });
      await rawPrisma.employee.deleteMany({
        where: { tenantId: { in: [tenantA, tenantB] } },
      });
      await rawPrisma.user.deleteMany({
        where: { email: { contains: "sync-" } },
      });
      await rawPrisma.tenant.deleteMany({
        where: { id: { in: [tenantA, tenantB] } },
      });
    } catch {
      // Best effort cleanup
    }
  });

  describe("1. Upload, Persistence, and Directory Propagation", () => {
    let uploadedPhotoUrl: string;

    it("uploads a valid PNG avatar and receives canonical media path", async () => {
      const formData = new FormData();
      formData.append(
        "file",
        new Blob([validPngBuffer], { type: "image/png" }),
        "evelyn-headshot.png"
      );
      formData.append("folder", `Employees/${employeeAId}/Profile`);

      const uploadRes = await fetch(`${baseUrl}/api/v1/media/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
        body: formData,
      });

      expect(uploadRes.status).toBe(201);
      const data = await uploadRes.json();
      expect(data).toHaveProperty("url");
      expect(data.url).toContain(`/uploads/Employees/${employeeAId}/Profile/`);
      uploadedPhotoUrl = data.url;
    }, 15000);

    it("persists avatar to authoritative employee record without creating duplicate records", async () => {
      const initialCount = await rawPrisma.employee.count({ where: { tenantId: tenantA } });

      const updateRes = await fetch(`${baseUrl}/api/hr/employees/${employeeAId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          avatarUrl: uploadedPhotoUrl,
        }),
      });

      expect(updateRes.status).toBe(200);
      const updateData = await updateRes.json();
      const updatedProfile = updateData.data || updateData;
      expect(updatedProfile.avatarUrl).toBe(uploadedPhotoUrl);
      expect(updatedProfile.avatar_url).toBe(uploadedPhotoUrl);

      // Verify zero duplicate records were created
      const finalCount = await rawPrisma.employee.count({ where: { tenantId: tenantA } });
      expect(finalCount).toBe(initialCount);
    }, 15000);

    it("Employee Directory list view returns the authoritative avatar", async () => {
      const listRes = await fetch(`${baseUrl}/api/hr/employees`, {
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
      });

      expect(listRes.status).toBe(200);
      const listData = await listRes.json();
      const employees = listData.data || listData.employees || listData;
      const emp = Array.isArray(employees)
        ? employees.find((e: any) => e.id === employeeAId)
        : null;

      expect(emp).not.toBeNull();
      expect(emp.avatarUrl).toBe(uploadedPhotoUrl);
      expect(emp.avatar_url).toBe(uploadedPhotoUrl);
    }, 15000);

    it("Employee 360 endpoint returns the authoritative avatar and preserved fields", async () => {
      const get360Res = await fetch(`${baseUrl}/api/hr/employees/${employeeAId}`, {
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
      });

      expect(get360Res.status).toBe(200);
      const get360Data = await get360Res.json();
      const profile = get360Data.data || get360Data;

      expect(profile.avatarUrl).toBe(uploadedPhotoUrl);
      expect(profile.avatar_url).toBe(uploadedPhotoUrl);
      expect(profile.firstName).toBe("Evelyn");
      expect(profile.lastName).toBe("Reed");
    }, 15000);
  });

  describe("2. Clean Removal Lifecycle", () => {
    it("clears avatar reference when avatarUrl is set to null", async () => {
      const removeRes = await fetch(`${baseUrl}/api/hr/employees/${employeeAId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          avatarUrl: null,
        }),
      });

      expect(removeRes.status).toBe(200);
      const data = await removeRes.json();
      const profile = data.data || data;
      expect(profile.avatarUrl).toBeNull();
      expect(profile.avatar_url).toBeNull();
    }, 15000);

    it("Employee Directory and 360 reflect avatarUrl: null after removal", async () => {
      // 1. Directory List
      const listRes = await fetch(`${baseUrl}/api/hr/employees`, {
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
      });
      expect(listRes.status).toBe(200);
      const listData = await listRes.json();
      const employees = listData.data || listData.employees || listData;
      const emp = Array.isArray(employees)
        ? employees.find((e: any) => e.id === employeeAId)
        : null;
      expect(emp.avatarUrl).toBeNull();

      // 2. 360 View
      const get360Res = await fetch(`${baseUrl}/api/hr/employees/${employeeAId}`, {
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
      });
      expect(get360Res.status).toBe(200);
      const get360Data = await get360Res.json();
      const profile = get360Data.data || get360Data;
      expect(profile.avatarUrl).toBeNull();
    }, 15000);
  });

  describe("3. Tenant Isolation & Access Enforcement", () => {
    it("prevents Tenant B from modifying Tenant A's employee avatar", async () => {
      const crossTenantRes = await fetch(`${baseUrl}/api/hr/employees/${employeeAId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tokenB}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          avatarUrl: "/uploads/Employees/hacked/Profile/hacked.png",
        }),
      });

      // Must be 404 (not found in workspace) or 403 (forbidden)
      expect([403, 404]).toContain(crossTenantRes.status);
    }, 15000);

    it("prevents Tenant B from retrieving Tenant A's employee 360 profile", async () => {
      const crossGetRes = await fetch(`${baseUrl}/api/hr/employees/${employeeAId}`, {
        headers: {
          Authorization: `Bearer ${tokenB}`,
        },
      });

      expect([403, 404]).toContain(crossGetRes.status);
    }, 15000);
  });
});
