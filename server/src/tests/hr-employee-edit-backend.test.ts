import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import express from "express";
import http from "http";
import { EmployeeService, UpdateEmployeeInput } from "../services/employee.service";
import { UserSecurityContext } from "../lib/data-scope";
import { runWithTenantContext, TenantContext } from "../context/tenant-context";
import { generateToken } from "../lib/jwt";
import { documentsRouter } from "../routes/documents.routes";

const rawPrisma = new PrismaClient();

function executeAsTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
  const ctx: TenantContext = {
    tenantId,
    userId: "admin-actor-edit",
    roles: ["admin", "hr_admin"],
    status: "ACTIVE",
    tenancyStrategy: "SHARED_SCHEMA",
    db: rawPrisma,
  };
  return runWithTenantContext(ctx, fn);
}

describe("HR Employee Edit Wizard Backend & Security Acceptance Suite", { timeout: 25000 }, () => {
  let tenantA: string;
  let tenantB: string;
  let branchA1: string;
  let branchA2: string;
  let branchB: string;
  let deptA: string;
  let desigA: string;
  let shiftA: string;
  let userA: string;
  let employeeId: string;
  let otherEmployeeId: string;
  let tenantBEmployeeId: string;
  let testServer: http.Server;
  let baseUrl: string;
  let hrAdminToken: string;
  let employeeToken: string;
  let tenantBToken: string;
  let hrAdminUserId: string;
  let empUserId: string;
  let tenantBUserId: string;

  beforeAll(async () => {
    // 1. Create Tenant A and Tenant B
    const tA = await rawPrisma.tenant.create({
      data: {
        name: "Edit Suite Tenant A",
        slug: `edit-a-${Date.now()}`,
      },
    });
    tenantA = tA.id;

    const tB = await rawPrisma.tenant.create({
      data: {
        name: "Edit Suite Tenant B",
        slug: `edit-b-${Date.now()}`,
      },
    });
    tenantB = tB.id;

    // 2. Org master records
    const b1 = await rawPrisma.branch.create({
      data: { tenantId: tenantA, name: "HQ Branch", code: `B1-${Date.now()}` },
    });
    branchA1 = b1.id;

    const b2 = await rawPrisma.branch.create({
      data: { tenantId: tenantA, name: "Secondary Branch", code: `B2-${Date.now()}` },
    });
    branchA2 = b2.id;

    const bB = await rawPrisma.branch.create({
      data: { tenantId: tenantB, name: "Tenant B Branch", code: `BB-${Date.now()}` },
    });
    branchB = bB.id;

    const dp = await rawPrisma.department.create({
      data: { tenantId: tenantA, branchId: branchA1, name: "Engineering" },
    });
    deptA = dp.id;

    const ds = await rawPrisma.designation.create({
      data: { tenantId: tenantA, name: "Senior Fullstack Developer" },
    });
    desigA = ds.id;

    const sh = await rawPrisma.shiftDefinition.create({
      data: {
        tenantId: tenantA,
        name: "Standard Day Shift",
        code: `SH-${Date.now()}`,
        startTime: "09:00",
        endTime: "18:00",
      },
    });
    shiftA = sh.id;

    // 3. User with initial password
    const initialHash = await bcrypt.hash("InitialSecret@123", 10);
    const u = await rawPrisma.user.create({
      data: {
        email: `primary.emp-${Date.now()}@example.com`,
        passwordHash: initialHash,
        profile: {
          create: {
            fullName: "Initial Name",
            avatarUrl: "https://example.com/initial-avatar.png",
            phone: "+91 99999 11111",
          },
        },
        roles: {
          create: { role: "employee" },
        },
      },
    });
    userA = u.id;

    // 4. Primary Employee under Tenant A
    const emp = await rawPrisma.employee.create({
      data: {
        tenantId: tenantA,
        userId: userA,
        employeeCode: `EMP-${Date.now()}`,
        firstName: "Robert",
        lastName: "Taylor",
        email: `primary.emp-${Date.now()}@example.com`,
        phone: "+91 99999 11111",
        branchId: branchA1,
        departmentId: deptA,
        designationId: desigA,
        employmentType: "full_time",
        status: "active",
        joinedAt: new Date("2024-01-15"),
        dateOfBirth: new Date("1992-06-20"),
        gender: "Male",
        salary: "900000.00",
        bankName: "State Bank of India",
        bankAccount: "112233445566",
        bankIfsc: "SBIN0001234",
        bankBranch: "Main Branch",
        pan: "ABCDE1234F",
      },
    });
    employeeId = emp.id;

    // 5. Another employee in Tenant A (for duplicate uniqueness checks)
    const other = await rawPrisma.employee.create({
      data: {
        tenantId: tenantA,
        employeeCode: `OTHER-${Date.now()}`,
        firstName: "Jane",
        lastName: "Doe",
        email: `jane.other-${Date.now()}@example.com`,
        branchId: branchA1,
        departmentId: deptA,
        designationId: desigA,
      },
    });
    otherEmployeeId = other.id;

    // 6. Employee in Tenant B (for cross-tenant checks)
    const empB = await rawPrisma.employee.create({
      data: {
        tenantId: tenantB,
        employeeCode: `EMPB-${Date.now()}`,
        firstName: "TenantB",
        lastName: "Employee",
        email: `empb-${Date.now()}@example.com`,
        branchId: branchB,
      },
    });
    tenantBEmployeeId = empB.id;

    // 7. Create Users for HTTP Document Tests: HR Admin (Tenant A), Employee (Tenant A), and Tenant B Admin
    const hrAdmin = await rawPrisma.user.create({
      data: {
        email: `hr.admin-${Date.now()}@example.com`,
        passwordHash: "dummyhash",
        profile: {
          create: {
            fullName: "HR Admin",
            tenantId: tenantA,
          },
        },
        roles: {
          create: { role: "hr_admin", tenantId: tenantA },
        },
      },
    });
    hrAdminUserId = hrAdmin.id;
    hrAdminToken = generateToken({
      userId: hrAdmin.id,
      email: hrAdmin.email,
      tenantId: tenantA,
      roles: ["hr_admin"],
    });

    const empUser = await rawPrisma.user.create({
      data: {
        email: `emp.regular-${Date.now()}@example.com`,
        passwordHash: "dummyhash",
        profile: {
          create: {
            fullName: "Regular Employee",
            tenantId: tenantA,
          },
        },
        roles: {
          create: { role: "employee", tenantId: tenantA },
        },
      },
    });
    empUserId = empUser.id;
    employeeToken = generateToken({
      userId: empUser.id,
      email: empUser.email,
      tenantId: tenantA,
      roles: ["employee"],
    });

    const tBUser = await rawPrisma.user.create({
      data: {
        email: `tenant.b-${Date.now()}@example.com`,
        passwordHash: "dummyhash",
        profile: {
          create: {
            fullName: "Tenant B Admin",
            tenantId: tenantB,
          },
        },
        roles: {
          create: { role: "hr_admin", tenantId: tenantB },
        },
      },
    });
    tenantBUserId = tBUser.id;
    tenantBToken = generateToken({
      userId: tBUser.id,
      email: tBUser.email,
      tenantId: tenantB,
      roles: ["hr_admin"],
    });

    // 8. Ephemeral express server for documents endpoints
    const testApp = express();
    testApp.use(express.json());
    testApp.use("/api/documents", documentsRouter);
    testServer = http.createServer(testApp);
    await new Promise<void>((resolve) => testServer.listen(0, "127.0.0.1", () => resolve()));
    const port = (testServer.address() as any).port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    if (testServer) {
      await new Promise<void>((resolve) => testServer.close(() => resolve()));
    }

    // Cleanup records
    await rawPrisma.companyDocument.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await rawPrisma.customFieldValue.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await rawPrisma.customField.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await rawPrisma.shiftRoster.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await rawPrisma.employee.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await rawPrisma.designation.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await rawPrisma.department.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await rawPrisma.branch.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await rawPrisma.shiftDefinition.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await rawPrisma.user.deleteMany({ where: { id: { in: [userA, hrAdminUserId, empUserId, tenantBUserId].filter(Boolean) } } });
    await rawPrisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  });

  it("1. Successfully updates personal and employment information with valid fields", async () => {
    await executeAsTenant(tenantA, async () => {
      const authorizedContext: UserSecurityContext = {
        userId: "actor-hr-admin",
        tenantId: tenantA,
        roles: ["hr_admin"],
        isSuperAdmin: false,
        isTenantAdmin: true,
        directReportEmployeeIds: [],
        allSubordinateEmployeeIds: [],
      };

      const perms = ["hr:employees:read", "hr:employees:write", "hr:employee:sensitive:write"];

      const updated = await EmployeeService.updateEmployee(
        tenantA,
        "actor-hr-admin",
        employeeId,
        {
          firstName: "Robert Updated",
          lastName: "Taylor Smith",
          phone: "+91 98765 00000",
          dateOfBirth: "1992-07-15",
          gender: "Male",
          branchId: branchA2,
          employmentType: "contract",
          status: "active",
        },
        authorizedContext,
        perms
      );

      expect(updated.firstName).toBe("Robert Updated");
      expect(updated.lastName).toBe("Taylor Smith");
      expect(updated.phone).toBe("+91 98765 00000");
      expect(updated.branchId).toBe(branchA2);
      expect(updated.employmentType).toBe("contract");
    });
  });

  it("2. Preserves password when replacement password is blank or omitted", async () => {
    await executeAsTenant(tenantA, async () => {
      const authorizedContext: UserSecurityContext = {
        userId: "actor-hr-admin",
        tenantId: tenantA,
        roles: ["hr_admin"],
        isSuperAdmin: false,
        isTenantAdmin: true,
        directReportEmployeeIds: [],
        allSubordinateEmployeeIds: [],
      };

      const userBefore = await rawPrisma.user.findUnique({ where: { id: userA } });
      const hashBefore = userBefore?.passwordHash;

      await EmployeeService.updateEmployee(
        tenantA,
        "actor-hr-admin",
        employeeId,
        {
          password: "", // blank password should not alter existing password hash
          firstName: "Robert",
        },
        authorizedContext,
        ["hr:employees:write"]
      );

      const userAfter = await rawPrisma.user.findUnique({ where: { id: userA } });
      expect(userAfter?.passwordHash).toBe(hashBefore);
    });
  });

  it("3. Successfully updates password hash when a non-empty password is provided", async () => {
    await executeAsTenant(tenantA, async () => {
      const authorizedContext: UserSecurityContext = {
        userId: "actor-hr-admin",
        tenantId: tenantA,
        roles: ["hr_admin"],
        isSuperAdmin: false,
        isTenantAdmin: true,
        directReportEmployeeIds: [],
        allSubordinateEmployeeIds: [],
      };

      await EmployeeService.updateEmployee(
        tenantA,
        "actor-hr-admin",
        employeeId,
        {
          password: "BrandNewSecurePassword@2026",
        },
        authorizedContext,
        ["hr:employees:write"]
      );

      const userAfter = await rawPrisma.user.findUnique({ where: { id: userA } });
      const matches = await bcrypt.compare("BrandNewSecurePassword@2026", userAfter!.passwordHash);
      expect(matches).toBe(true);
    });
  });

  it("4. Enforces duplicate employee code rejection within tenant", async () => {
    await executeAsTenant(tenantA, async () => {
      const authorizedContext: UserSecurityContext = {
        userId: "actor-hr-admin",
        tenantId: tenantA,
        roles: ["hr_admin"],
        isSuperAdmin: false,
        isTenantAdmin: true,
        directReportEmployeeIds: [],
        allSubordinateEmployeeIds: [],
      };

      const other = await rawPrisma.employee.findUnique({ where: { id: otherEmployeeId } });

      await expect(
        EmployeeService.updateEmployee(
          tenantA,
          "actor-hr-admin",
          employeeId,
          {
            employeeCode: other!.employeeCode, // Attempt to use other employee's code
          },
          authorizedContext,
          ["hr:employees:write"]
        )
      ).rejects.toThrow(/already exists in this workspace/);
    });
  });

  it("5. Enforces duplicate email rejection within tenant", async () => {
    await executeAsTenant(tenantA, async () => {
      const authorizedContext: UserSecurityContext = {
        userId: "actor-hr-admin",
        tenantId: tenantA,
        roles: ["hr_admin"],
        isSuperAdmin: false,
        isTenantAdmin: true,
        directReportEmployeeIds: [],
        allSubordinateEmployeeIds: [],
      };

      const other = await rawPrisma.employee.findUnique({ where: { id: otherEmployeeId } });

      await expect(
        EmployeeService.updateEmployee(
          tenantA,
          "actor-hr-admin",
          employeeId,
          {
            email: other!.email, // Attempt to use other employee's email
          },
          authorizedContext,
          ["hr:employees:write"]
        )
      ).rejects.toThrow(/already exists in this workspace/);
    });
  });

  it("6. Rejects cross-tenant branch reference", async () => {
    await executeAsTenant(tenantA, async () => {
      const authorizedContext: UserSecurityContext = {
        userId: "actor-hr-admin",
        tenantId: tenantA,
        roles: ["hr_admin"],
        isSuperAdmin: false,
        isTenantAdmin: true,
        directReportEmployeeIds: [],
        allSubordinateEmployeeIds: [],
      };

      await expect(
        EmployeeService.updateEmployee(
          tenantA,
          "actor-hr-admin",
          employeeId,
          {
            branchId: branchB, // Branch belongs to Tenant B!
          },
          authorizedContext,
          ["hr:employees:write"]
        )
      ).rejects.toThrow(/Selected branch does not belong to this workspace/);
    });
  });

  it("7. Denies salary/banking modification by Tenant Admin lacking explicit sensitive permission", async () => {
    await executeAsTenant(tenantA, async () => {
      // Tenant Admin without explicit sensitive write permission
      const tenantAdminContext: UserSecurityContext = {
        userId: "admin-actor-ordinary",
        tenantId: tenantA,
        roles: ["admin"],
        isSuperAdmin: false,
        isTenantAdmin: true,
        directReportEmployeeIds: [],
        allSubordinateEmployeeIds: [],
      };

      const permsWithoutSensitive = ["hr:employees:read", "hr:employees:write"];

      await expect(
        EmployeeService.updateEmployee(
          tenantA,
          "admin-actor-ordinary",
          employeeId,
          {
            salary: 1500000, // Modifying salary
          },
          tenantAdminContext,
          permsWithoutSensitive
        )
      ).rejects.toThrow(/do not have explicit permission/);
    });
  });

  it("8. Allows salary/banking modification when user has explicit sensitive permission", async () => {
    await executeAsTenant(tenantA, async () => {
      const authorizedHrContext: UserSecurityContext = {
        userId: "actor-hr-admin",
        tenantId: tenantA,
        roles: ["hr_admin"],
        isSuperAdmin: false,
        isTenantAdmin: true,
        directReportEmployeeIds: [],
        allSubordinateEmployeeIds: [],
      };

      const permsWithSensitive = [
        "hr:employees:read",
        "hr:employees:write",
        "hr:employee:sensitive:write",
      ];

      const result = await EmployeeService.updateEmployee(
        tenantA,
        "actor-hr-admin",
        employeeId,
        {
          salary: 1350000,
          bankName: "HDFC Bank Corporate",
          bankAccount: "50100998877665",
          bicSwift: "HDFC0004321",
          bankBranch: "Cyber City Branch",
        },
        authorizedHrContext,
        permsWithSensitive
      );

      expect(Number(result.salary)).toBe(1350000);
      expect(result.bankName).toBe("HDFC Bank Corporate");
      expect(result.bankAccount).toBe("50100998877665");
      expect(result.bankIfsc).toBe("HDFC0004321");
    });
  });

  it("9. Rejects editing of employee records by regular employee role", async () => {
    await executeAsTenant(tenantA, async () => {
      const employeeContext: UserSecurityContext = {
        userId: "regular-emp-id",
        tenantId: tenantA,
        roles: ["employee"], // Regular employee
        isSuperAdmin: false,
        isTenantAdmin: false,
        directReportEmployeeIds: [],
        allSubordinateEmployeeIds: [],
      };

      await expect(
        EmployeeService.updateEmployee(
          tenantA,
          "regular-emp-id",
          employeeId,
          {
            firstName: "Hacked Name",
          },
          employeeContext,
          []
        )
      ).rejects.toThrow(/Employees are not permitted to edit employee records/);
    });
  });

  it("10. Rejects cross-tenant employee update", async () => {
    await executeAsTenant(tenantA, async () => {
      const authorizedContext: UserSecurityContext = {
        userId: "actor-hr-admin",
        tenantId: tenantA,
        roles: ["hr_admin"],
        isSuperAdmin: false,
        isTenantAdmin: true,
        directReportEmployeeIds: [],
        allSubordinateEmployeeIds: [],
      };

      // Authenticated under Tenant A, but requesting employee belonging to Tenant B
      await expect(
        EmployeeService.updateEmployee(
          tenantA,
          "actor-hr-admin",
          tenantBEmployeeId,
          {
            firstName: "Intruder Name",
          },
          authorizedContext,
          ["hr:employees:write"]
        )
      ).rejects.toThrow(/Employee not found in current workspace/);
    });
  });

  it("11. Correctly persists and retrieves extended contact fields", async () => {
    await executeAsTenant(tenantA, async () => {
      const authorizedContext: UserSecurityContext = {
        userId: "actor-hr-admin",
        tenantId: tenantA,
        roles: ["hr_admin"],
        isSuperAdmin: false,
        isTenantAdmin: true,
        directReportEmployeeIds: [],
        allSubordinateEmployeeIds: [],
      };

      const perms = ["hr:employees:read", "hr:employees:write", "hr:employee:sensitive:write"];

      const res = await EmployeeService.updateEmployee(
        tenantA,
        "actor-hr-admin",
        employeeId,
        {
          addressLine1: "123 Innovation Boulevard",
          addressLine2: "Suite 404, Tech Park",
          city: "Bangalore",
          state: "Karnataka",
          country: "India",
          postalCode: "560100",
          emergencyContactName: "Eleanor Taylor",
          emergencyContactRelationship: "Spouse",
          emergencyContactPhone: "+91 98888 77777",
          shiftId: shiftA,
        },
        authorizedContext,
        perms
      );

      expect(res.addressLine1).toBe("123 Innovation Boulevard");
      expect(res.addressLine2).toBe("Suite 404, Tech Park");
      expect(res.city).toBe("Bangalore");
      expect(res.state).toBe("Karnataka");
      expect(res.country).toBe("India");
      expect(res.postalCode).toBe("560100");
      expect(res.emergencyContactName).toBe("Eleanor Taylor");
      expect(res.emergencyContactRelationship).toBe("Spouse");
      expect(res.emergencyContactPhone).toBe("+91 98888 77777");
    });
  });

  it("12. Document verification: Rejects regular employee with 403 Forbidden", async () => {
    // Create pending document for Tenant A
    const doc = await rawPrisma.companyDocument.create({
      data: {
        tenantId: tenantA,
        employeeId: employeeId,
        documentCode: `DOC-VER-${Date.now()}`,
        title: "Offer Letter Verification Test",
        category: "Employment Contract",
        fileName: "offer-letter.pdf",
        status: "pending",
      },
    });

    const res = await fetch(`${baseUrl}/api/documents/${doc.id}/verify`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${employeeToken}`,
        "Content-Type": "application/json",
      },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("Forbidden: You do not have permission to verify or approve employee documents.");
  });

  it("13. Document verification: Allows authorized HR admin to verify document", async () => {
    // Create pending document for Tenant A
    const doc = await rawPrisma.companyDocument.create({
      data: {
        tenantId: tenantA,
        employeeId: employeeId,
        documentCode: `DOC-VER2-${Date.now()}`,
        title: "Verified Contract Test",
        category: "Employment Contract",
        fileName: "contract.pdf",
        status: "pending",
      },
    });

    const res = await fetch(`${baseUrl}/api/documents/${doc.id}/verify`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${hrAdminToken}`,
        "Content-Type": "application/json",
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.document.status).toBe("verified");
  });

  it("14. Document deletion: Rejects regular employee with 403 Forbidden", async () => {
    // Create document for Tenant A
    const doc = await rawPrisma.companyDocument.create({
      data: {
        tenantId: tenantA,
        employeeId: employeeId,
        documentCode: `DOC-DEL-${Date.now()}`,
        title: "Protected Doc Test",
        category: "Policy",
        fileName: "policy.pdf",
        status: "verified",
      },
    });

    const res = await fetch(`${baseUrl}/api/documents/${doc.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${employeeToken}`,
      },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("Forbidden: You do not have permission to delete employee documents.");
  });

  it("15. Document deletion: Allows authorized HR admin to delete document", async () => {
    // Create document for Tenant A
    const doc = await rawPrisma.companyDocument.create({
      data: {
        tenantId: tenantA,
        employeeId: employeeId,
        documentCode: `DOC-DEL2-${Date.now()}`,
        title: "Deletable Doc Test",
        category: "Policy",
        fileName: "deletable.pdf",
        status: "verified",
      },
    });

    const res = await fetch(`${baseUrl}/api/documents/${doc.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${hrAdminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const check = await rawPrisma.companyDocument.findUnique({ where: { id: doc.id } });
    expect(check).toBeNull();
  });

  it("16. Cross-tenant document isolation: Rejects operations on another tenant's document with 404", async () => {
    // Create document for Tenant A
    const docA = await rawPrisma.companyDocument.create({
      data: {
        tenantId: tenantA,
        employeeId: employeeId,
        documentCode: `DOC-ISO-${Date.now()}`,
        title: "Tenant A Doc",
        category: "Confidential",
        fileName: "confidential.pdf",
        status: "pending",
      },
    });

    // Tenant B attempts to verify Tenant A's document
    const resVerify = await fetch(`${baseUrl}/api/documents/${docA.id}/verify`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${tenantBToken}`,
        "Content-Type": "application/json",
      },
    });
    expect(resVerify.status).toBe(404);

    // Tenant B attempts to delete Tenant A's document
    const resDelete = await fetch(`${baseUrl}/api/documents/${docA.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tenantBToken}`,
      },
    });
    expect(resDelete.status).toBe(404);
  });

  it("17. Employee ID & Employee Count Integrity: ID is immutable and no duplicate employee is created", async () => {
    await executeAsTenant(tenantA, async () => {
      const authorizedContext: UserSecurityContext = {
        userId: "actor-hr-admin",
        tenantId: tenantA,
        roles: ["hr_admin"],
        isSuperAdmin: false,
        isTenantAdmin: true,
        directReportEmployeeIds: [],
        allSubordinateEmployeeIds: [],
      };

      const perms = ["hr:employees:read", "hr:employees:write", "hr:employee:sensitive:write"];

      // 1. Snapshot count before update
      const employeeCountBefore = await rawPrisma.employee.count({
        where: { tenantId: tenantA },
      });

      // 2. Perform update
      const updated = await EmployeeService.updateEmployee(
        tenantA,
        "actor-hr-admin",
        employeeId,
        {
          firstName: "Robert Immutable",
          lastName: "Taylor Preserved",
          city: "Metropolis",
          state: "Karnataka",
        },
        authorizedContext,
        perms
      );

      // 3. Verify ID remains strictly identical
      expect(updated.id).toBe(employeeId);

      // 4. Snapshot count after update - must not increase (zero duplicate created)
      const employeeCountAfter = await rawPrisma.employee.count({
        where: { tenantId: tenantA },
      });
      expect(employeeCountAfter).toBe(employeeCountBefore);

      // 5. Verify database record
      const dbRecord = await rawPrisma.employee.findUnique({
        where: { id: employeeId },
      });
      expect(dbRecord).not.toBeNull();
      expect(dbRecord?.id).toBe(employeeId);
      expect(dbRecord?.firstName).toBe("Robert Immutable");
      expect(dbRecord?.state).toBe("Karnataka");
    });
  });
});

