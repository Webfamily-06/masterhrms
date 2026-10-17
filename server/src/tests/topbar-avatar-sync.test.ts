import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import http from "http";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { authRouter } from "../routes/auth.routes";
import { employeeSelfServiceRouter } from "../routes/employee-self-service.routes";
import { hrEmployeesRouter } from "../routes/hr-employees.routes";
import { EmployeeService } from "../services/employee.service";
import { requireAuth } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { runWithTenantContext } from "../context/tenant-context";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "default_test_secret_for_auth_tokens_123456";

describe("Topbar Profile Avatar Synchronization & Fallback Suite", { timeout: 25000 }, () => {
  let server: http.Server;
  let baseUrl: string;

  const testTenantId = `tenant-topbar-${Date.now()}`;
  const otherTenantId = `tenant-other-${Date.now()}`;

  let testUser: any;
  let otherTenantUser: any;
  let testEmployee: any;
  let testToken: string;
  let otherToken: string;

  beforeAll(async () => {
    // 1. Create Test Tenants
    await prisma.tenant.createMany({
      data: [
        {
          id: testTenantId,
          name: "Topbar Test Corp",
          slug: `topbar-${Date.now()}`,
          logoUrl: "/logo.webp",
        },
        {
          id: otherTenantId,
          name: "Other Tenant Corp",
          slug: `other-${Date.now()}`,
          logoUrl: "/logo.webp",
        },
      ],
    });

    // 2. Create Test Users & Profiles with legacy /favicon.webp seeded avatar
    const email = `topbar.emp.${Date.now()}@example.com`;
    testUser = await prisma.user.create({
      data: {
        email,
        passwordHash: "hashed",
        profile: {
          create: {
            fullName: "Topbar Test Employee",
            tenantId: testTenantId,
            avatarUrl: "/favicon.webp", // Legacy seeded placeholder
          },
        },
        roles: {
          create: [
            { role: "employee", tenantId: testTenantId },
            { role: "hr_admin", tenantId: testTenantId },
          ],
        },
      },
      include: { profile: true },
    });

    otherTenantUser = await prisma.user.create({
      data: {
        email: `other.${Date.now()}@example.com`,
        passwordHash: "hashed",
        profile: {
          create: {
            fullName: "Other Tenant User",
            tenantId: otherTenantId,
            avatarUrl: null,
          },
        },
        roles: {
          create: [{ role: "employee", tenantId: otherTenantId }],
        },
      },
      include: { profile: true },
    });

    // 3. Create linked Employee record in testTenant
    testEmployee = await prisma.employee.create({
      data: {
        tenantId: testTenantId,
        userId: testUser.id,
        employeeCode: `EMP-TOP-${Date.now()}`,
        firstName: "Topbar",
        lastName: "Tester",
        email,
        status: "active",
      },
    });

    testToken = jwt.sign(
      {
        userId: testUser.id,
        tenantId: testTenantId,
        email: testUser.email,
        roles: ["employee", "hr_admin"],
        permissions: ["hr:employee:sensitive:write", "employee:write"],
      },
      JWT_SECRET
    );

    otherToken = jwt.sign(
      {
        userId: otherTenantUser.id,
        tenantId: otherTenantId,
        email: otherTenantUser.email,
        roles: ["employee"],
      },
      JWT_SECRET
    );

    const app = express();
    app.use(express.json());
    app.use("/api/auth", authRouter);
    app.use("/api/v1/me", employeeSelfServiceRouter);
    app.use("/api/me", employeeSelfServiceRouter);
    app.use("/api/v1/hr/employees", requireAuth, resolveTenantContext as any, hrEmployeesRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
    await prisma.customFieldValue.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } }).catch(() => {});
    await prisma.employee.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } }).catch(() => {});
    await prisma.userRole.deleteMany({ where: { userId: { in: [testUser?.id, otherTenantUser?.id] } } }).catch(() => {});
    await prisma.profile.deleteMany({ where: { userId: { in: [testUser?.id, otherTenantUser?.id] } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [testUser?.id, otherTenantUser?.id] } } }).catch(() => {});
    await prisma.tenant.deleteMany({ where: { id: { in: [testTenantId, otherTenantId] } } }).catch(() => {});
    await prisma.$disconnect();
  });

  it("1. GET /api/auth/me cleans legacy placeholder /favicon.webp and returns avatarUrl: null", async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${testToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.profile.avatarUrl).toBeNull();
  });

  it("2. Updating employee avatar via Employee Self-Service PUT /api/v1/me/profile updates canonical avatar", async () => {
    const newAvatar = `/uploads/Employees/${testEmployee.employeeCode}/Profile/self-avatar.png`;

    const putRes = await fetch(`${baseUrl}/api/v1/me/profile`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${testToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ avatarUrl: newAvatar }),
    });

    expect(putRes.status).toBe(200);
    const putBody = await putRes.json();
    expect(putBody.success).toBe(true);
    expect(putBody.data.avatarUrl).toBe(newAvatar);

    // Verify GET /api/auth/me immediately reflects updated avatar
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${testToken}` },
    });

    expect(meRes.status).toBe(200);
    const meBody = await meRes.json();
    expect(meBody.profile.avatarUrl).toBe(newAvatar);
  });

  it("3. Updating employee photo via HR API propagates directly to /api/auth/me", async () => {
    const hrAvatar = `/uploads/Employees/${testEmployee.employeeCode}/Profile/hr-avatar.jpg`;

    const hrRes = await fetch(`${baseUrl}/api/v1/hr/employees/${testEmployee.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${testToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ avatarUrl: hrAvatar }),
    });

    expect(hrRes.status).toBe(200);

    // Verify /api/auth/me returns the authoritative photo set by HR
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${testToken}` },
    });

    expect(meRes.status).toBe(200);
    const meBody = await meRes.json();
    expect(meBody.profile.avatarUrl).toBe(hrAvatar);
  });

  it("4. Removing employee photo via PUT /api/v1/me/profile sets avatarUrl to null in /api/auth/me", async () => {
    const removeRes = await fetch(`${baseUrl}/api/v1/me/profile`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${testToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ avatarUrl: null }),
    });

    expect(removeRes.status).toBe(200);
    const removeBody = await removeRes.json();
    expect(removeBody.data.avatarUrl).toBeNull();

    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${testToken}` },
    });

    expect(meRes.status).toBe(200);
    const meBody = await meRes.json();
    expect(meBody.profile.avatarUrl).toBeNull();
  });

  it("5. Strict Tenant Isolation: Avatar changes in Tenant A never leak to Tenant B's /api/auth/me", async () => {
    const otherMeRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${otherToken}` },
    });

    expect(otherMeRes.status).toBe(200);
    const otherBody = await otherMeRes.json();
    expect(otherBody.profile.avatarUrl).toBeNull();
    expect(otherBody.profile.tenantId).toBe(otherTenantId);
  });
});
