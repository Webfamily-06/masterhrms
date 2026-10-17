import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import http from "http";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { employeeSelfServiceRouter } from "../routes/employee-self-service.routes";
import { employeesRouter } from "../routes/employees.routes";
import { EmployeeService } from "../services/employee.service";
import { runWithTenantContext, TenantContext } from "../context/tenant-context";

const rawPrisma = new PrismaClient();

function executeAsTenant<T>(tenantId: string, userId: string, roles: string[], fn: () => Promise<T>): Promise<T> {
  const ctx: TenantContext = {
    tenantId,
    userId,
    roles,
    status: "ACTIVE",
    tenancyStrategy: "SHARED_SCHEMA",
    db: rawPrisma,
  };
  return runWithTenantContext(ctx, fn);
}

describe("EMPLOYEE DASHBOARD PROFILE & HR DATA CONSISTENCY TEST SUITE", { timeout: 25000 }, () => {
  let server: http.Server;
  let baseUrl: string;

  // Tenant 1 & Users
  let tenant1Id: string;
  let hrAdminUserId: string;
  let hrAdminToken: string;
  let managerUserId: string;
  let managerEmployeeId: string;
  let emp1UserId: string;
  let emp1EmployeeId: string;
  let emp1Token: string;
  let emp2UserId: string;
  let emp2EmployeeId: string;
  let emp2Token: string;

  // Tenant 2 (for cross-tenant testing)
  let tenant2Id: string;
  let tenant2UserId: string;
  let tenant2EmployeeId: string;
  let tenant2Token: string;

  const jwtSecret = process.env.JWT_SECRET || "masterhrms-super-secret-jwt-key-change-in-production";

  beforeAll(async () => {
    const timestamp = Date.now();

    // 1. Create Tenant 1
    const t1 = await rawPrisma.tenant.create({
      data: {
        name: "Acme HR Corp",
        slug: `acme-hr-${timestamp}`,
      },
    });
    tenant1Id = t1.id;

    // 2. Create Tenant 2
    const t2 = await rawPrisma.tenant.create({
      data: {
        name: "Globex Industries",
        slug: `globex-${timestamp}`,
      },
    });
    tenant2Id = t2.id;

    // 3. Create HR Admin User in Tenant 1
    const hrUser = await rawPrisma.user.create({
      data: {
        email: `hr.admin.${timestamp}@acme.com`,
        passwordHash: "hash-acme-admin",
        profile: {
          create: {
            fullName: "Alice HR Admin",
            tenantId: tenant1Id,
          },
        },
        roles: {
          create: [{ role: "hr_admin", tenantId: tenant1Id }],
        },
      },
    });
    hrAdminUserId = hrUser.id;
    hrAdminToken = jwt.sign(
      {
        id: hrUser.id,
        userId: hrUser.id,
        email: hrUser.email,
        tenantId: tenant1Id,
        roles: ["hr_admin"],
      },
      jwtSecret,
      { expiresIn: "2h" }
    );

    // 4. Create Manager Employee in Tenant 1
    const mgrUser = await rawPrisma.user.create({
      data: {
        email: `manager.bob.${timestamp}@acme.com`,
        passwordHash: "hash-bob",
        profile: {
          create: {
            fullName: "Bob Supervisor",
            tenantId: tenant1Id,
          },
        },
        roles: {
          create: [{ role: "manager", tenantId: tenant1Id }],
        },
      },
    });
    managerUserId = mgrUser.id;
    const mgrEmp = await executeAsTenant(tenant1Id, hrAdminUserId, ["hr_admin"], async () => {
      return await EmployeeService.createEmployeeAtomic(
        tenant1Id,
        hrAdminUserId,
        {
          firstName: "Bob",
          lastName: "Supervisor",
          email: mgrUser.email,
          employeeCode: `MGR-${Math.floor(1000 + Math.random() * 9000)}`,
          phone: "+91 91234 56789",
          createLoginAccount: false,
        },
        {
          userId: hrAdminUserId,
          roles: ["hr_admin"],
          status: "ACTIVE",
          tenancyStrategy: "SHARED_SCHEMA",
        }
      );
    });
    managerEmployeeId = mgrEmp.id;
    // Link user to employee
    await rawPrisma.employee.update({
      where: { id: managerEmployeeId },
      data: { userId: managerUserId },
    });

    // 5. Create Employee 1 in Tenant 1 (full profile with manager, shift, joining date, work mode)
    const emp1User = await rawPrisma.user.create({
      data: {
        email: `charlie.dev.${timestamp}@acme.com`,
        passwordHash: "hash-charlie",
        profile: {
          create: {
            fullName: "Charlie Engineer",
            tenantId: tenant1Id,
          },
        },
        roles: {
          create: [{ role: "employee", tenantId: tenant1Id }],
        },
      },
    });
    emp1UserId = emp1User.id;
    emp1Token = jwt.sign(
      {
        id: emp1User.id,
        userId: emp1User.id,
        email: emp1User.email,
        tenantId: tenant1Id,
        roles: ["employee"],
      },
      jwtSecret,
      { expiresIn: "2h" }
    );

    const emp1Record = await executeAsTenant(tenant1Id, hrAdminUserId, ["hr_admin"], async () => {
      return await EmployeeService.createEmployeeAtomic(
        tenant1Id,
        hrAdminUserId,
        {
          firstName: "Charlie",
          lastName: "Engineer",
          email: emp1User.email,
          employeeCode: `EMP-CH-${Math.floor(1000 + Math.random() * 9000)}`,
          phone: "+91 99887 76655",
          managerId: managerEmployeeId,
          joinedAt: new Date("2024-03-15T00:00:00.000Z"),
          workMode: "HYBRID",
          createLoginAccount: false,
        },
        {
          userId: hrAdminUserId,
          roles: ["hr_admin"],
          status: "ACTIVE",
          tenancyStrategy: "SHARED_SCHEMA",
        }
      );
    });
    emp1EmployeeId = emp1Record.id;
    await rawPrisma.employee.update({
      where: { id: emp1EmployeeId },
      data: { userId: emp1UserId, managerId: managerEmployeeId, position: "Senior Frontend Engineer" },
    });

    // 6. Create Employee 2 in Tenant 1 (sparse profile: NO manager, NO shift, NO work mode, NO avatar)
    const emp2User = await rawPrisma.user.create({
      data: {
        email: `diana.intern.${timestamp}@acme.com`,
        passwordHash: "hash-diana",
        profile: {
          create: {
            fullName: "Diana Intern",
            tenantId: tenant1Id,
          },
        },
        roles: {
          create: [{ role: "employee", tenantId: tenant1Id }],
        },
      },
    });
    emp2UserId = emp2User.id;
    emp2Token = jwt.sign(
      {
        id: emp2User.id,
        userId: emp2User.id,
        email: emp2User.email,
        tenantId: tenant1Id,
        roles: ["employee"],
      },
      jwtSecret,
      { expiresIn: "2h" }
    );

    const emp2Record = await executeAsTenant(tenant1Id, hrAdminUserId, ["hr_admin"], async () => {
      return await EmployeeService.createEmployeeAtomic(
        tenant1Id,
        hrAdminUserId,
        {
          firstName: "Diana",
          lastName: "Intern",
          email: emp2User.email,
          employeeCode: `EMP-DI-${Math.floor(1000 + Math.random() * 9000)}`,
          phone: "+91 98765 43210",
          createLoginAccount: false,
        },
        {
          userId: hrAdminUserId,
          roles: ["hr_admin"],
          status: "ACTIVE",
          tenancyStrategy: "SHARED_SCHEMA",
        }
      );
    });
    emp2EmployeeId = emp2Record.id;
    await rawPrisma.employee.update({
      where: { id: emp2EmployeeId },
      data: { userId: emp2UserId, managerId: null },
    });

    // 7. Create Employee in Tenant 2 (for tenant boundary testing)
    const t2User = await rawPrisma.user.create({
      data: {
        email: `eva.globex.${timestamp}@globex.com`,
        passwordHash: "hash-eva",
        profile: {
          create: {
            fullName: "Eva Globex",
            tenantId: tenant2Id,
          },
        },
        roles: {
          create: [{ role: "employee", tenantId: tenant2Id }],
        },
      },
    });
    tenant2UserId = t2User.id;
    tenant2Token = jwt.sign(
      {
        id: t2User.id,
        userId: t2User.id,
        email: t2User.email,
        tenantId: tenant2Id,
        roles: ["employee"],
      },
      jwtSecret,
      { expiresIn: "2h" }
    );

    const t2EmpRecord = await executeAsTenant(tenant2Id, tenant2UserId, ["employee"], async () => {
      return await EmployeeService.createEmployeeAtomic(
        tenant2Id,
        tenant2UserId,
        {
          firstName: "Eva",
          lastName: "Globex",
          email: t2User.email,
          employeeCode: `EMP-EV-${Math.floor(1000 + Math.random() * 9000)}`,
          phone: "+1 555 123 4567",
          createLoginAccount: false,
        },
        {
          userId: tenant2UserId,
          roles: ["employee"],
          status: "ACTIVE",
          tenancyStrategy: "SHARED_SCHEMA",
        }
      );
    });
    tenant2EmployeeId = t2EmpRecord.id;
    await rawPrisma.employee.update({
      where: { id: tenant2EmployeeId },
      data: { userId: tenant2UserId },
    });

    // Setup Test Express Server
    const app = express();
    app.use(express.json());
    app.use("/api/v1/me", employeeSelfServiceRouter);
    app.use("/api/v1/hr/employees", employeesRouter);
    app.use("/api/hr/employees", employeesRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    // Clean up created entities
    try {
      await rawPrisma.customFieldValue.deleteMany({
        where: { tenantId: { in: [tenant1Id, tenant2Id] } },
      });
      await rawPrisma.employee.deleteMany({
        where: { tenantId: { in: [tenant1Id, tenant2Id] } },
      });
      await rawPrisma.userRole.deleteMany({
        where: { tenantId: { in: [tenant1Id, tenant2Id] } },
      });
      await rawPrisma.profile.deleteMany({
        where: { tenantId: { in: [tenant1Id, tenant2Id] } },
      });
      await rawPrisma.user.deleteMany({
        where: { id: { in: [hrAdminUserId, managerUserId, emp1UserId, emp2UserId, tenant2UserId] } },
      });
      await rawPrisma.tenant.deleteMany({
        where: { id: { in: [tenant1Id, tenant2Id] } },
      });
    } catch {}
    await rawPrisma.$disconnect();
  });

  describe("1. Authoritative Employee Dashboard Profile & HR Data Resolution", () => {
    it("resolves authenticated employee to correct record with full HR fields in GET /api/v1/me/dashboard", async () => {
      const res = await fetch(`${baseUrl}/api/v1/me/dashboard`, {
        headers: { Authorization: `Bearer ${emp1Token}` },
      });
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();

      const emp = json.data.employee;
      expect(emp).toBeDefined();

      // 1. Employee ID: systemId or immutable id (not login user ID)
      expect(emp.id).toBe(emp1EmployeeId);
      expect(emp.id).not.toBe(emp1UserId);
      expect(emp.systemId).toBeDefined();

      // 2. Email Address: authoritative work email
      expect(emp.email).toBe(`charlie.dev.${emp.email.split("@")[0].split(".").pop()}@acme.com`);

      // 3. Reporting Manager: resolved from relational database (Bob Supervisor)
      expect(emp.manager).toBeDefined();
      expect(emp.manager.id).toBe(managerEmployeeId);
      expect(emp.manager.firstName).toBe("Bob");
      expect(emp.manager.lastName).toBe("Supervisor");

      // 4. Position & Work Mode
      expect(emp.position).toBe("Senior Frontend Engineer");
      expect(emp.workMode).toBe("HYBRID");

      // 5. Date of Joining
      expect(emp.joinedAt).toBeDefined();
      expect(new Date(emp.joinedAt).getFullYear()).toBe(2024);
    });

    it("GET /api/v1/me/profile returns consistent authoritative employee metadata & canonical avatarUrl", async () => {
      const res = await fetch(`${baseUrl}/api/v1/me/profile`, {
        headers: { Authorization: `Bearer ${emp1Token}` },
      });
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);

      const profile = json.data;
      expect(profile.id).toBe(emp1EmployeeId);
      expect(profile.workMode).toBe("HYBRID");
      expect(profile.manager).toBeDefined();
      expect(profile.manager.firstName).toBe("Bob");
    });
  });

  describe("2. Profile Image Consistency, Propagation & Graceful Fallback", () => {
    const newAvatarUrl = "https://cdn.masterhrms.com/uploads/employees/avatar-charlie-2026.png";

    it("HR updates employee avatar via EmployeeService / HR API and propagates to Employee 360", async () => {
      await executeAsTenant(tenant1Id, hrAdminUserId, ["hr_admin"], async () => {
        return await EmployeeService.updateEmployee(
          tenant1Id,
          hrAdminUserId,
          emp1EmployeeId,
          { avatarUrl: newAvatarUrl },
          {
            userId: hrAdminUserId,
            roles: ["hr_admin"],
            status: "ACTIVE",
            tenancyStrategy: "SHARED_SCHEMA",
          },
          ["hr.employee.update", "employee.edit"]
        );
      });

      // Verify Employee 360 sees the new avatar
      const emp360 = await executeAsTenant(tenant1Id, hrAdminUserId, ["hr_admin"], async () => {
        return await EmployeeService.getEmployee360(tenant1Id, emp1EmployeeId);
      });
      expect(emp360.avatarUrl).toBe(newAvatarUrl);
      expect(emp360.metadata?.avatarUrl).toBe(newAvatarUrl);
    });

    it("Employee Dashboard and Profile immediately resolve the updated avatar for the authenticated user", async () => {
      // 1. Dashboard endpoint
      const dashRes = await fetch(`${baseUrl}/api/v1/me/dashboard`, {
        headers: { Authorization: `Bearer ${emp1Token}` },
      });
      expect(dashRes.status).toBe(200);
      const dashJson: any = await dashRes.json();
      expect(dashJson.data.employee.avatarUrl).toBe(newAvatarUrl);

      // 2. Profile endpoint
      const profRes = await fetch(`${baseUrl}/api/v1/me/profile`, {
        headers: { Authorization: `Bearer ${emp1Token}` },
      });
      expect(profRes.status).toBe(200);
      const profJson: any = await profRes.json();
      expect(profJson.data.avatarUrl).toBe(newAvatarUrl);
    });

    it("Removing avatar sets avatarUrl to null and restores neutral fallback (no obsolete/broken image)", async () => {
      await executeAsTenant(tenant1Id, hrAdminUserId, ["hr_admin"], async () => {
        return await EmployeeService.updateEmployee(
          tenant1Id,
          hrAdminUserId,
          emp1EmployeeId,
          { avatarUrl: null },
          {
            userId: hrAdminUserId,
            roles: ["hr_admin"],
            status: "ACTIVE",
            tenancyStrategy: "SHARED_SCHEMA",
          },
          ["hr.employee.update", "employee.edit"]
        );
      });

      // Employee 360 verification
      const emp360 = await executeAsTenant(tenant1Id, hrAdminUserId, ["hr_admin"], async () => {
        return await EmployeeService.getEmployee360(tenant1Id, emp1EmployeeId);
      });
      expect(emp360.avatarUrl).toBeNull();

      // Dashboard verification
      const dashRes = await fetch(`${baseUrl}/api/v1/me/dashboard`, {
        headers: { Authorization: `Bearer ${emp1Token}` },
      });
      expect(dashRes.status).toBe(200);
      const dashJson: any = await dashRes.json();
      expect(dashJson.data.employee.avatarUrl).toBeNull();
    });
  });

  describe("3. Neutral Fallbacks for Sparse Employee Records (Zero Fabricated Placeholders)", () => {
    it("Employee 2 with missing manager, shift, work mode, and avatar returns null without fabricated placeholders", async () => {
      const res = await fetch(`${baseUrl}/api/v1/me/dashboard`, {
        headers: { Authorization: `Bearer ${emp2Token}` },
      });
      expect(res.status).toBe(200);
      const json: any = await res.json();
      const emp = json.data.employee;

      // Assert that values are neutral null / undefined, NOT hardcoded strings like "Direct Management" or "Regular Shift"
      expect(emp.manager).toBeNull();
      expect(emp.shiftToday).toBeNull();
      expect(emp.workMode).toBeNull();
      expect(emp.avatarUrl).toBeNull();
      expect(emp.id).toBe(emp2EmployeeId);
    });
  });

  describe("4. Tenant Isolation, RBAC & Security Boundaries", () => {
    it("Employee from Tenant 2 cannot access or view Tenant 1 dashboard data", async () => {
      const res = await fetch(`${baseUrl}/api/v1/me/dashboard`, {
        headers: { Authorization: `Bearer ${tenant2Token}` },
      });
      expect(res.status).toBe(200);
      const json: any = await res.json();

      // Scoped strictly to Tenant 2 employee
      expect(json.data.employee.id).toBe(tenant2EmployeeId);
      expect(json.data.employee.id).not.toBe(emp1EmployeeId);
      expect(json.data.employee.id).not.toBe(emp2EmployeeId);
    });

    it("Dashboard profile response does NOT leak sensitive financial/statutory data (salary, bank, PAN)", async () => {
      const res = await fetch(`${baseUrl}/api/v1/me/dashboard`, {
        headers: { Authorization: `Bearer ${emp1Token}` },
      });
      expect(res.status).toBe(200);
      const json: any = await res.json();
      const emp = json.data.employee;

      // Verify restricted fields are not present on dashboard employee payload
      expect(emp.salary).toBeUndefined();
      expect(emp.bankAccount).toBeUndefined();
      expect(emp.bankName).toBeUndefined();
      expect(emp.bankIfsc).toBeUndefined();
      expect(emp.pan).toBeUndefined();
      expect(emp.aadhaar).toBeUndefined();
    });
  });
});
