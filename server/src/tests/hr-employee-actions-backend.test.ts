import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { EmployeeService } from "../services/employee.service";
import { UserSecurityContext } from "../lib/data-scope";
import { runWithTenantContext, TenantContext } from "../context/tenant-context";

const rawPrisma = new PrismaClient();

function executeAsTenant<T>(tenantId: string, actorId: string, roles: string[], fn: () => Promise<T>): Promise<T> {
  const ctx: TenantContext = {
    tenantId,
    userId: actorId,
    roles,
    status: "ACTIVE",
    tenancyStrategy: "SHARED_SCHEMA",
    db: rawPrisma,
  };
  return runWithTenantContext(ctx, fn);
}

describe("HR Employee Actions: Change Password & Toggle Status Suite", () => {
  let tenantA: string;
  let tenantB: string;
  let adminUserA: any;
  let regularEmployeeUserA: any;
  let employeeRecordA: any;
  let unprovisionedEmployeeA: any;
  let superAdminUser: any;
  let employeeRecordB: any;

  beforeAll(async () => {
    // 1. Create Tenant A & Tenant B
    const tA = await rawPrisma.tenant.create({
      data: {
        name: "Actions Test Tenant A",
        slug: `actions-a-${Date.now()}`,
      },
    });
    tenantA = tA.id;

    const tB = await rawPrisma.tenant.create({
      data: {
        name: "Actions Test Tenant B",
        slug: `actions-b-${Date.now()}`,
      },
    });
    tenantB = tB.id;

    // 2. Create Super Admin User
    const superAdminHash = await bcrypt.hash("SuperSecret@123", 10);
    superAdminUser = await rawPrisma.user.create({
      data: {
        email: `super.admin.${Date.now()}@platform.global`,
        passwordHash: superAdminHash,
        roles: {
          create: {
            role: "super_admin",
            tenantId: null,
          },
        },
      },
      include: { roles: true },
    });

    // 3. Create Tenant Admin in Tenant A
    const adminHash = await bcrypt.hash("AdminSecret@123", 10);
    adminUserA = await rawPrisma.user.create({
      data: {
        email: `hr.admin.${Date.now()}@tenant-a.com`,
        passwordHash: adminHash,
        profile: {
          create: {
            fullName: "Alice HR Administrator",
            email: `hr.admin.${Date.now()}@tenant-a.com`,
            tenantId: tenantA,
          },
        },
        roles: {
          create: {
            role: "hr_admin",
            tenantId: tenantA,
          },
        },
      },
      include: { roles: true, profile: true },
    });

    // 4. Create an Employee User in Tenant A with existing login account
    const initialEmployeeHash = await bcrypt.hash("OldPassword@123", 10);
    regularEmployeeUserA = await rawPrisma.user.create({
      data: {
        email: `bob.engineer.${Date.now()}@tenant-a.com`,
        passwordHash: initialEmployeeHash,
        profile: {
          create: {
            fullName: "Bob Engineer",
            email: `bob.engineer.${Date.now()}@tenant-a.com`,
            tenantId: tenantA,
          },
        },
        roles: {
          create: {
            role: "employee",
            tenantId: tenantA,
          },
        },
      },
      include: { roles: true, profile: true },
    });

    employeeRecordA = await rawPrisma.employee.create({
      data: {
        tenantId: tenantA,
        userId: regularEmployeeUserA.id,
        employeeCode: `EMP-BOB-${Date.now()}`,
        firstName: "Bob",
        lastName: "Engineer",
        email: regularEmployeeUserA.email,
        employmentType: "full_time",
        status: "active",
      },
    });

    // 5. Create an Employee in Tenant A without an existing user login account
    unprovisionedEmployeeA = await rawPrisma.employee.create({
      data: {
        tenantId: tenantA,
        userId: null,
        employeeCode: `EMP-CHARLIE-${Date.now()}`,
        firstName: "Charlie",
        lastName: "Designer",
        email: `charlie.designer.${Date.now()}@tenant-a.com`,
        employmentType: "contract",
        status: "active",
      },
    });

    // 6. Create an Employee in Tenant B (for cross-tenant checks)
    const empBHash = await bcrypt.hash("TenantBSecret@123", 10);
    const userB = await rawPrisma.user.create({
      data: {
        email: `david.${Date.now()}@tenant-b.com`,
        passwordHash: empBHash,
        roles: { create: { role: "employee", tenantId: tenantB } },
      },
    });

    employeeRecordB = await rawPrisma.employee.create({
      data: {
        tenantId: tenantB,
        userId: userB.id,
        employeeCode: `EMP-DAVID-${Date.now()}`,
        firstName: "David",
        lastName: "TenantB",
        email: userB.email,
        employmentType: "full_time",
        status: "active",
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await rawPrisma.auditLog.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await rawPrisma.employee.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await rawPrisma.userRole.deleteMany({ where: { userId: { in: [adminUserA?.id, regularEmployeeUserA?.id, superAdminUser?.id] } } });
    await rawPrisma.profile.deleteMany({ where: { userId: { in: [adminUserA?.id, regularEmployeeUserA?.id] } } });
    await rawPrisma.user.deleteMany({ where: { id: { in: [adminUserA?.id, regularEmployeeUserA?.id, superAdminUser?.id] } } });
    await rawPrisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
    await rawPrisma.$disconnect();
  });

  describe("Phase 2 — Change Employee Password Tests", () => {
    it("1. authorized HR admin resets employee password successfully", async () => {
      const adminContext: UserSecurityContext = {
        userId: adminUserA.id,
        tenantId: tenantA,
        roles: ["hr_admin", "admin"],
        dataScope: "ALL" as any,
      };

      const result = await executeAsTenant(tenantA, adminUserA.id, ["hr_admin"], async () => {
        return EmployeeService.changeEmployeePassword(
          tenantA,
          adminUserA.id,
          employeeRecordA.id,
          "NewBrandPassword@2026",
          adminContext
        );
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("Bob Engineer");

      // Verify stored password in database is hashed with bcrypt, not plaintext
      const updatedUser = await rawPrisma.user.findUnique({
        where: { id: regularEmployeeUserA.id },
      });

      expect(updatedUser?.passwordHash).not.toBe("NewBrandPassword@2026");
      expect(updatedUser?.passwordHash).toMatch(/^\$2[aby]\$\d+\$/);

      // Verify new password matches bcrypt hash
      const isNewMatch = await bcrypt.compare("NewBrandPassword@2026", updatedUser!.passwordHash);
      expect(isNewMatch).toBe(true);

      // Verify old password fails
      const isOldMatch = await bcrypt.compare("OldPassword@123", updatedUser!.passwordHash);
      expect(isOldMatch).toBe(false);
    });

    it("2. rejects missing or short password policy violations (< 6 characters)", async () => {
      const adminContext: UserSecurityContext = {
        userId: adminUserA.id,
        tenantId: tenantA,
        roles: ["hr_admin"],
        dataScope: "ALL" as any,
      };

      await expect(
        executeAsTenant(tenantA, adminUserA.id, ["hr_admin"], () =>
          EmployeeService.changeEmployeePassword(tenantA, adminUserA.id, employeeRecordA.id, "12345", adminContext)
        )
      ).rejects.toThrow("Password must be at least 6 characters long.");

      await expect(
        executeAsTenant(tenantA, adminUserA.id, ["hr_admin"], () =>
          EmployeeService.changeEmployeePassword(tenantA, adminUserA.id, employeeRecordA.id, "", adminContext)
        )
      ).rejects.toThrow("Password must be at least 6 characters long.");
    });

    it("3. unauthorized caller (regular employee) cannot reset another employee's password", async () => {
      const unauthorizedEmployeeContext: UserSecurityContext = {
        userId: "random-employee-user",
        tenantId: tenantA,
        roles: ["employee"],
        dataScope: "SELF" as any,
        employeeId: "random-employee-id",
      };

      await expect(
        executeAsTenant(tenantA, "random-employee-user", ["employee"], () =>
          EmployeeService.changeEmployeePassword(
            tenantA,
            "random-employee-user",
            employeeRecordA.id,
            "HackerPassword@123",
            unauthorizedEmployeeContext
          )
        )
      ).rejects.toThrow(/Forbidden/);
    });

    it("4. cross-tenant password reset is strictly rejected (Tenant A cannot reset Tenant B employee)", async () => {
      const adminContextA: UserSecurityContext = {
        userId: adminUserA.id,
        tenantId: tenantA,
        roles: ["hr_admin"],
        dataScope: "ALL" as any,
      };

      await expect(
        executeAsTenant(tenantA, adminUserA.id, ["hr_admin"], () =>
          EmployeeService.changeEmployeePassword(
            tenantA,
            adminUserA.id,
            employeeRecordB.id,
            "CrossTenantPwd@123",
            adminContextA
          )
        )
      ).rejects.toThrow("Employee not found in current workspace.");
    });

    it("5. automatically provisions user account when employee had no prior login account", async () => {
      const adminContext: UserSecurityContext = {
        userId: adminUserA.id,
        tenantId: tenantA,
        roles: ["hr_admin"],
        dataScope: "ALL" as any,
      };

      expect(unprovisionedEmployeeA.userId).toBeNull();

      const result = await executeAsTenant(tenantA, adminUserA.id, ["hr_admin"], async () => {
        return EmployeeService.changeEmployeePassword(
          tenantA,
          adminUserA.id,
          unprovisionedEmployeeA.id,
          "CharlieFirstLogin@2026",
          adminContext
        );
      });

      expect(result.success).toBe(true);

      // Verify employee record now has userId linked
      const refreshedEmployee = await rawPrisma.employee.findUnique({
        where: { id: unprovisionedEmployeeA.id },
      });
      expect(refreshedEmployee?.userId).toBeTruthy();

      // Verify new user has hashed password
      const newUser = await rawPrisma.user.findUnique({
        where: { id: refreshedEmployee!.userId! },
      });
      expect(newUser?.email).toBe(unprovisionedEmployeeA.email.toLowerCase().trim());
      const isMatch = await bcrypt.compare("CharlieFirstLogin@2026", newUser!.passwordHash);
      expect(isMatch).toBe(true);
    });

    it("6. audit logs are recorded with mutation metadata without recording password or hash", async () => {
      const auditEntry = await rawPrisma.auditLog.findFirst({
        where: {
          tenantId: tenantA,
          action: "EMPLOYEE_PASSWORD_RESET",
          entityId: employeeRecordA.id,
        },
        orderBy: { createdAt: "desc" },
      });

      expect(auditEntry).toBeTruthy();
      expect(auditEntry?.actorId).toBe(adminUserA.id);
      expect(auditEntry?.entityType).toBe("Employee");

      // Verify plaintext password and hash are completely absent from audit log
      const logString = JSON.stringify(auditEntry);
      expect(logString).not.toContain("NewBrandPassword@2026");
      expect(logString).not.toContain("$2a$");
      expect(logString).not.toContain("$2b$");
    });
  });

  describe("Phase 3 — Toggle Employee Account Status Tests", () => {
    it("7. authorized HR admin deactivates active employee account access", async () => {
      const adminContext: UserSecurityContext = {
        userId: adminUserA.id,
        tenantId: tenantA,
        roles: ["hr_admin", "admin"],
        dataScope: "ALL" as any,
      };

      const result = await executeAsTenant(tenantA, adminUserA.id, ["hr_admin"], async () => {
        return EmployeeService.toggleEmployeeAccountStatus(
          tenantA,
          adminUserA.id,
          employeeRecordA.id,
          adminContext
        );
      });

      expect(result.success).toBe(true);
      expect(result.loginStatus).toBe("inactive");

      // Verify user's roles in this tenant were removed
      const rolesInTenant = await rawPrisma.userRole.findMany({
        where: { userId: regularEmployeeUserA.id, tenantId: tenantA },
      });
      expect(rolesInTenant.length).toBe(0);

      // Verify employment status remains active (NOT terminated or corrupted)
      const empDb = await rawPrisma.employee.findUnique({
        where: { id: employeeRecordA.id },
      });
      expect(empDb?.status).toBe("active");
    });

    it("8. directory query reflects inactive loginStatus while preserving employment status", async () => {
      const adminContext: UserSecurityContext = {
        userId: adminUserA.id,
        tenantId: tenantA,
        roles: ["hr_admin"],
        dataScope: "ALL" as any,
      };

      const listResult = await executeAsTenant(tenantA, adminUserA.id, ["hr_admin"], async () => {
        return EmployeeService.listEmployees(tenantA, adminContext, [], { search: "Bob" });
      });

      const bobRow = listResult.data.find((e: any) => e.id === employeeRecordA.id);
      expect(bobRow).toBeTruthy();
      expect(bobRow?.loginStatus).toBe("inactive");
      expect(bobRow?.status).toBe("active");
    });

    it("9. authorized HR admin reactivates deactivated employee account", async () => {
      const adminContext: UserSecurityContext = {
        userId: adminUserA.id,
        tenantId: tenantA,
        roles: ["hr_admin"],
        dataScope: "ALL" as any,
      };

      const result = await executeAsTenant(tenantA, adminUserA.id, ["hr_admin"], async () => {
        return EmployeeService.toggleEmployeeAccountStatus(
          tenantA,
          adminUserA.id,
          employeeRecordA.id,
          adminContext
        );
      });

      expect(result.success).toBe(true);
      expect(result.loginStatus).toBe("active");

      // Verify userRole in tenant restored
      const restoredRoles = await rawPrisma.userRole.findMany({
        where: { userId: regularEmployeeUserA.id, tenantId: tenantA },
      });
      expect(restoredRoles.length).toBeGreaterThan(0);
      expect(restoredRoles[0].role).toBe("employee");
    });

    it("10. prevents administrative self-deactivation", async () => {
      // Create an employee linked to the admin themselves
      const adminEmp = await rawPrisma.employee.create({
        data: {
          tenantId: tenantA,
          userId: adminUserA.id,
          employeeCode: `EMP-ADMIN-${Date.now()}`,
          firstName: "Alice",
          lastName: "Admin",
          email: adminUserA.email,
          status: "active",
        },
      });

      const adminContext: UserSecurityContext = {
        userId: adminUserA.id,
        tenantId: tenantA,
        roles: ["hr_admin"],
        dataScope: "ALL" as any,
      };

      await expect(
        executeAsTenant(tenantA, adminUserA.id, ["hr_admin"], () =>
          EmployeeService.toggleEmployeeAccountStatus(
            tenantA,
            adminUserA.id,
            adminEmp.id,
            adminContext
          )
        )
      ).rejects.toThrow("You cannot deactivate your own administrative login account.");

      await rawPrisma.employee.delete({ where: { id: adminEmp.id } });
    });

    it("11. audit log records previous state and new state for status toggle", async () => {
      const auditEntries = await rawPrisma.auditLog.findMany({
        where: {
          tenantId: tenantA,
          action: { in: ["EMPLOYEE_ACCOUNT_DEACTIVATED", "EMPLOYEE_ACCOUNT_ACTIVATED"] },
          entityId: employeeRecordA.id,
        },
        orderBy: { createdAt: "desc" },
      });

      expect(auditEntries.length).toBeGreaterThanOrEqual(2);
      const latest = auditEntries[0];
      expect(latest.actorId).toBe(adminUserA.id);
      expect(latest.afterJson).toEqual({ loginStatus: "active" });
      expect(latest.beforeJson).toEqual({ loginStatus: "inactive" });
    });

    it("12. deactivated employee account cannot authenticate in tenant workspace", async () => {
      const adminContext: UserSecurityContext = {
        userId: adminUserA.id,
        tenantId: tenantA,
        roles: ["hr_admin"],
        dataScope: "ALL" as any,
      };

      // Deactivate Bob
      await executeAsTenant(tenantA, adminUserA.id, ["hr_admin"], () =>
        EmployeeService.toggleEmployeeAccountStatus(
          tenantA,
          adminUserA.id,
          employeeRecordA.id,
          adminContext
        )
      );

      // Verify Bob's employee.userId is null and roles in tenantA removed
      const bobEmp = await rawPrisma.employee.findUnique({ where: { id: employeeRecordA.id } });
      expect(bobEmp?.userId).toBeNull();

      const roles = await rawPrisma.userRole.findMany({
        where: { userId: regularEmployeeUserA.id, tenantId: tenantA },
      });
      expect(roles.length).toBe(0);

      // Verify login verification checks
      const user = await rawPrisma.user.findUnique({
        where: { id: regularEmployeeUserA.id },
        include: { roles: true, employees: true, profile: true },
      });

      const isSuperUser = user!.roles.some((r: any) => r.role === "super_admin");
      const hasTenantRole = user!.roles.some((r: any) => r.tenantId === tenantA);
      expect(isSuperUser).toBe(false);
      expect(hasTenantRole).toBe(false);

      // Re-activate Bob for clean teardown
      await executeAsTenant(tenantA, adminUserA.id, ["hr_admin"], () =>
        EmployeeService.toggleEmployeeAccountStatus(
          tenantA,
          adminUserA.id,
          employeeRecordA.id,
          adminContext
        )
      );
    });
  });
});
