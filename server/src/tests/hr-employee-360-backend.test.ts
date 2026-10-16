import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { EmployeeService } from "../services/employee.service";
import { UserSecurityContext } from "../lib/data-scope";
import { runWithTenantContext, TenantContext } from "../context/tenant-context";

const rawPrisma = new PrismaClient();

function executeAsTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
  const ctx: TenantContext = {
    tenantId,
    userId: "admin-actor-1",
    roles: ["admin", "hr_admin"],
    status: "ACTIVE",
    tenancyStrategy: "SHARED_SCHEMA",
    db: rawPrisma,
  };
  return runWithTenantContext(ctx, fn);
}

describe("HR Employee 360 Consolidated Profile Backend Suite", () => {
  let tenantA: string;
  let tenantB: string;
  let branchA: string;
  let deptA: string;
  let desigA: string;
  let userA: string;
  let managerId: string;
  let employeeId: string;
  let subEmployeeId: string;
  let docId: string;
  let letterId: string;

  beforeAll(async () => {
    // 1. Setup Tenant A & Tenant B
    const tA = await rawPrisma.tenant.create({
      data: {
        name: "360 Test Tenant A",
        slug: `360-a-${Date.now()}`,
      },
    });
    tenantA = tA.id;

    const tB = await rawPrisma.tenant.create({
      data: {
        name: "360 Test Tenant B",
        slug: `360-b-${Date.now()}`,
      },
    });
    tenantB = tB.id;

    // 2. Setup master records for Tenant A
    const br = await rawPrisma.branch.create({
      data: {
        tenantId: tenantA,
        name: "North Campus HQ",
        code: `BR360-${Date.now()}`,
      },
    });
    branchA = br.id;

    const dp = await rawPrisma.department.create({
      data: {
        tenantId: tenantA,
        branchId: branchA,
        name: "Product Design & Architecture",
      },
    });
    deptA = dp.id;

    const ds = await rawPrisma.designation.create({
      data: {
        tenantId: tenantA,
        name: "Staff Software Engineer",
      },
    });
    desigA = ds.id;

    // 3. User with Profile avatar for Tenant A
    const u = await rawPrisma.user.create({
      data: {
        email: `emp360-${Date.now()}@example.com`,
        passwordHash: "dummy-hash",
        profile: {
          create: {
            fullName: "Alexander Hamilton",
            avatarUrl: "https://example.com/avatars/ahamilton.png",
            phone: "+91 98765 43210",
          },
        },
        roles: {
          create: {
            role: "employee",
          },
        },
      },
    });
    userA = u.id;

    // 4. Manager Employee in Tenant A
    const mgr = await rawPrisma.employee.create({
      data: {
        tenantId: tenantA,
        employeeCode: `MGR-${Date.now().toString().slice(-4)}`,
        firstName: "Eleanor",
        lastName: "Vance",
        email: `mgr-${Date.now()}@example.com`,
        position: "Director of Engineering",
        departmentId: deptA,
        branchId: branchA,
      },
    });
    managerId = mgr.id;

    // 5. Target Employee in Tenant A
    const emp = await rawPrisma.employee.create({
      data: {
        tenantId: tenantA,
        userId: userA,
        employeeCode: `EMP-${Date.now().toString().slice(-4)}`,
        firstName: "Alexander",
        lastName: "Hamilton",
        email: `alex.hamilton.${Date.now()}@masterhrms.com`,
        phone: "+91 91234 56789",
        position: "Staff Software Engineer",
        departmentId: deptA,
        branchId: branchA,
        designationId: desigA,
        managerId: managerId,
        employmentType: "full_time",
        status: "active",
        joinedAt: new Date("2023-01-15"),
        dateOfBirth: new Date("1992-07-20"),
        gender: "male",
        salary: 1850000.0,
        bankName: "HDFC Bank Ltd",
        bankAccount: "50100456789123",
        bankIfsc: "HDFC0001234",
        bankBranch: "Cyber City Branch",
        pan: "ABCDE1234F",
        aadhaar: "987654321098",
        uan: "100987654321",
        esiNumber: "31000987650001",
        pfNumber: "MH/PUN/0012345/000/0001234",
        taxRegime: "new",
        state: "Maharashtra",
        workStateCode: "MH",
      },
    });
    employeeId = emp.id;

    // 6. Subordinate Employee reporting to target Employee
    const sub = await rawPrisma.employee.create({
      data: {
        tenantId: tenantA,
        employeeCode: `SUB-${Date.now().toString().slice(-4)}`,
        firstName: "John",
        lastName: "Laurens",
        email: `j.laurens.${Date.now()}@example.com`,
        position: "Junior Frontend Engineer",
        managerId: employeeId,
      },
    });
    subEmployeeId = sub.id;

    // 7. Company Document for Target Employee
    const cDoc = await rawPrisma.companyDocument.create({
      data: {
        tenantId: tenantA,
        employeeId: employeeId,
        documentCode: `DOC-360-${Date.now().toString().slice(-4)}`,
        title: "Permanent Employment Agreement",
        category: "Employment Contract",
        fileName: "employment-agreement-ahamilton.pdf",
        fileSize: "1.8 MB",
        fileType: "application/pdf",
        status: "verified",
        requiresSignature: false,
        verifiedBy: "Compliance Director",
        verifiedAt: new Date(),
      },
    });
    docId = cDoc.id;

    // 8. Generated Letter for Target Employee
    const gLetter = await rawPrisma.generatedLetter.create({
      data: {
        tenantId: tenantA,
        employeeId: employeeId,
        letterType: "Appointment",
        title: "Official Appointment Letter — Staff Engineer",
        contentHtml: "<h1>Appointment Letter</h1><p>Dear Alexander, we are pleased to appoint you...</p>",
      },
    });
    letterId = gLetter.id;

    // 9. Probation Record for Target Employee
    await rawPrisma.probationRecord.create({
      data: {
        tenantId: tenantA,
        employeeId: employeeId,
        startDate: new Date("2023-01-15"),
        endDate: new Date("2023-04-15"),
        probationPeriodDays: 90,
        status: "confirmed",
        confirmedAt: new Date("2023-04-15"),
      },
    });
  });

  afterAll(async () => {
    // Cleanup created records
    try {
      await rawPrisma.generatedLetter.deleteMany({ where: { tenantId: tenantA } });
      await rawPrisma.companyDocument.deleteMany({ where: { tenantId: tenantA } });
      await rawPrisma.probationRecord.deleteMany({ where: { tenantId: tenantA } });
      await rawPrisma.employee.deleteMany({ where: { tenantId: tenantA } });
      await rawPrisma.designation.deleteMany({ where: { tenantId: tenantA } });
      await rawPrisma.department.deleteMany({ where: { tenantId: tenantA } });
      await rawPrisma.branch.deleteMany({ where: { tenantId: tenantA } });
      await rawPrisma.profile.deleteMany({ where: { userId: userA } });
      await rawPrisma.userRole.deleteMany({ where: { userId: userA } });
      await rawPrisma.user.deleteMany({ where: { id: userA } });
      await rawPrisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
    } catch {
      // Ignore cleanup error in teardown
    }
    await rawPrisma.$disconnect();
  });

  it("1. getEmployee360 retrieves full relational 360 data for authorized admin", async () => {
    const adminContext: UserSecurityContext = {
      userId: "admin-actor-1",
      roles: ["admin", "hr_admin"],
      departmentId: null,
      branchId: null,
      employeeId: null,
      scopeType: "ALL",
      scopedBranchIds: [],
      scopedDepartmentIds: [],
    };

    const result = await executeAsTenant(tenantA, async () => {
      return EmployeeService.getEmployee360(
        tenantA,
        employeeId,
        adminContext,
        ["hr:employee:read", "hr:employee:sensitive:read"]
      );
    });

    expect(result).toBeDefined();
    expect(result.id).toBe(employeeId);
    expect(result.firstName).toBe("Alexander");
    expect(result.lastName).toBe("Hamilton");
    expect(result.employeeCode).toContain("EMP-");

    // Relational includes
    expect(result.department?.name).toBe("Product Design & Architecture");
    expect(result.branch?.name).toBe("North Campus HQ");
    expect(result.designation?.name).toBe("Staff Software Engineer");
    expect(result.manager?.firstName).toBe("Eleanor");
    expect(result.subordinates).toHaveLength(1);
    expect(result.subordinates[0].firstName).toBe("John");

    // Profile avatarUrl computed from user.profile
    expect(result.avatarUrl).toBe("https://example.com/avatars/ahamilton.png");

    // Company documents & generated letters included
    expect(result.companyDocuments).toHaveLength(1);
    expect(result.companyDocuments[0].title).toBe("Permanent Employment Agreement");
    expect(result.generatedLetters).toHaveLength(1);
    expect(result.generatedLetters[0].title).toBe("Official Appointment Letter — Staff Engineer");

    // Probation records included
    expect(result.probationRecords).toHaveLength(1);
    expect(result.probationRecords[0].status).toBe("confirmed");

    // Allowed actions attached
    expect(result.allowedActions).toBeDefined();
  });

  it("2. Field-level security masks PAN, Aadhaar, Bank Account and Compensation for unauthorized roles", async () => {
    const regularEmployeeContext: UserSecurityContext = {
      userId: "other-user-1",
      roles: ["employee"],
      departmentId: deptA,
      branchId: branchA,
      employeeId: subEmployeeId,
      scopeType: "SELF",
      scopedBranchIds: [],
      scopedDepartmentIds: [],
    };

    const result = await executeAsTenant(tenantA, async () => {
      return EmployeeService.getEmployee360(
        tenantA,
        employeeId,
        regularEmployeeContext,
        ["hr:employee:read"]
      );
    });

    // Sensitive statutory numbers are masked
    expect(result.pan).not.toBe("ABCDE1234F");
    expect(result.pan).toContain("••••");
    expect(result.aadhaar).not.toBe("987654321098");
    expect(result.aadhaar).toContain("••••");
    expect(result.bankAccount).not.toBe("50100456789123");
    expect(result.bankAccount).toContain("••••");

    // Compensation/salary is redacted (null)
    expect(result.salary).toBeNull();
  });

  it("3. Admin roles can access unmasked statutory values and compensation", async () => {
    const adminContext: UserSecurityContext = {
      userId: "admin-actor-1",
      roles: ["admin", "super_admin"],
      departmentId: null,
      branchId: null,
      employeeId: null,
      scopeType: "ALL",
      scopedBranchIds: [],
      scopedDepartmentIds: [],
    };

    const result = await executeAsTenant(tenantA, async () => {
      return EmployeeService.getEmployee360(
        tenantA,
        employeeId,
        adminContext,
        ["hr:employee:read"]
      );
    });

    // Unmasked for admin
    expect(result.pan).toBe("ABCDE1234F");
    expect(result.aadhaar).toBe("987654321098");
    expect(result.bankAccount).toBe("50100456789123");
    expect(Number(result.salary)).toBe(1850000);
  });

  it("4. Cross-tenant isolation rejects employee access across workspaces", async () => {
    const tenantBAdmin: UserSecurityContext = {
      userId: "admin-actor-b",
      roles: ["admin"],
      departmentId: null,
      branchId: null,
      employeeId: null,
      scopeType: "ALL",
      scopedBranchIds: [],
      scopedDepartmentIds: [],
    };

    // Attempt to access Tenant A's employee from Tenant B context
    await expect(
      executeAsTenant(tenantB, async () => {
        return EmployeeService.getEmployee360(
          tenantB,
          employeeId,
          tenantBAdmin,
          ["hr:employee:read"]
        );
      })
    ).rejects.toThrow("Employee not found in current workspace");
  });
});
