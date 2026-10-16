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

describe("HR Employee Directory Backend Suite (Real Database & Strict Tenant Isolation)", () => {
  let tenantA: string;
  let tenantB: string;
  let branchA: string;
  let deptA: string;
  let desigA: string;
  let userA: string;

  beforeAll(async () => {
    // 1. Create Tenant A
    const tA = await rawPrisma.tenant.create({
      data: {
        name: "Directory Test Tenant A",
        slug: `dir-a-${Date.now()}`,
      },
    });
    tenantA = tA.id;

    // 2. Create Tenant B
    const tB = await rawPrisma.tenant.create({
      data: {
        name: "Directory Test Tenant B",
        slug: `dir-b-${Date.now()}`,
      },
    });
    tenantB = tB.id;

    // 3. Create Branch, Department, Designation for Tenant A
    const br = await rawPrisma.branch.create({
      data: {
        tenantId: tenantA,
        name: "HQ City Tower",
        code: `BR-${Date.now()}`,
      },
    });
    branchA = br.id;

    const dp = await rawPrisma.department.create({
      data: {
        tenantId: tenantA,
        branchId: branchA,
        name: "Engineering & IT",
      },
    });
    deptA = dp.id;

    const ds = await rawPrisma.designation.create({
      data: {
        tenantId: tenantA,
        name: "Lead Systems Architect",
      },
    });
    desigA = ds.id;

    // 4. Create an authentication user for Tenant A
    const u = await rawPrisma.user.create({
      data: {
        email: `lead.arch.${Date.now()}@tenant-a.com`,
        passwordHash: "hash-secret-pwd",
        profile: {
          create: {
            tenantId: tenantA,
            fullName: "Alice Vance",
            avatarUrl: "https://example.com/avatar-alice.jpg",
          },
        },
      },
    });
    userA = u.id;

    // 5. Seed 12 employees for Tenant A
    // - 9 Active (1 has login account userA, 8 without login user)
    // - 2 Terminated
    // - 1 On Leave
    for (let i = 1; i <= 12; i++) {
      let status: "active" | "terminated" | "on_leave" = "active";
      if (i === 10 || i === 11) status = "terminated";
      if (i === 12) status = "on_leave";

      const empCode = `EMP-DIR-${String(i).padStart(4, "0")}`;
      await rawPrisma.employee.create({
        data: {
          tenantId: tenantA,
          employeeCode: empCode,
          firstName: i === 1 ? "Alice" : `Staff${i}`,
          lastName: i === 1 ? "Vance" : "Directory",
          email: i === 1 ? `lead.arch.${Date.now()}@tenant-a.com` : `staff${i}.${Date.now()}@tenant-a.com`,
          status,
          employmentType: i % 2 === 0 ? "full_time" : "contract",
          branchId: branchA,
          departmentId: deptA,
          designationId: desigA,
          userId: i === 1 ? userA : null,
          joinedAt: new Date(2025, 0, i),
        },
      });
    }

    // 6. Seed 2 employees for Tenant B to verify strict isolation
    for (let j = 1; j <= 2; j++) {
      await rawPrisma.employee.create({
        data: {
          tenantId: tenantB,
          employeeCode: `EMP-TENANTB-${j}`,
          firstName: `TenantB_User${j}`,
          lastName: "Foreign",
          email: `foreign${j}@tenant-b.com`,
          status: "active",
        },
      });
    }
  });

  afterAll(async () => {
    await rawPrisma.employee.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await rawPrisma.user.deleteMany({ where: { email: { contains: "lead.arch." } } });
    await rawPrisma.designation.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await rawPrisma.department.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await rawPrisma.branch.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await rawPrisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
    await rawPrisma.$disconnect();
  });

  const adminContext: UserSecurityContext = {
    userId: "admin-actor-1",
    employeeId: null,
    tenantId: "",
    roles: ["admin", "hr_admin"],
    isTenantAdmin: true,
  };

  it("1. lists employees with real database tallies, accurate pagination, and tenant scoping", async () => {
    const res = await executeAsTenant(tenantA, () =>
      EmployeeService.listEmployees(
        tenantA,
        { ...adminContext, tenantId: tenantA },
        ["hr.employees.read"],
        { page: 1, limit: 10 }
      )
    );

    expect(res.total).toBe(12);
    expect(res.data.length).toBe(10);
    expect(res.totalPages).toBe(2);
    expect(res.page).toBe(1);
    expect(res.limit).toBe(10);

    // Verify status counts
    expect(res.statusCounts).toBeDefined();
    expect(res.statusCounts.all).toBe(12);
    expect(res.statusCounts.active).toBe(9);
    expect(res.statusCounts.inactive).toBe(3); // 2 terminated + 1 on_leave
    expect(res.statusCounts.terminated).toBe(2);

    // Verify second page
    const page2 = await executeAsTenant(tenantA, () =>
      EmployeeService.listEmployees(
        tenantA,
        { ...adminContext, tenantId: tenantA },
        ["hr.employees.read"],
        { page: 2, limit: 10 }
      )
    );
    expect(page2.data.length).toBe(2);
    expect(page2.page).toBe(2);

    // No duplicate records between adjacent pages
    const idsPage1 = new Set(res.data.map((e: any) => e.id));
    for (const e of page2.data) {
      expect(idsPage1.has(e.id)).toBe(false);
    }
  });

  it("2. supports pagination with page sizes 10, 20, 30", async () => {
    const res20 = await executeAsTenant(tenantA, () =>
      EmployeeService.listEmployees(
        tenantA,
        { ...adminContext, tenantId: tenantA },
        [],
        { page: 1, limit: 20 }
      )
    );
    expect(res20.data.length).toBe(12);
    expect(res20.totalPages).toBe(1);

    const res30 = await executeAsTenant(tenantA, () =>
      EmployeeService.listEmployees(
        tenantA,
        { ...adminContext, tenantId: tenantA },
        [],
        { page: 1, limit: 30 }
      )
    );
    expect(res30.data.length).toBe(12);
    expect(res30.totalPages).toBe(1);
  });

  it("3. enriches employees with loginStatus, avatarUrl, and organization relations", async () => {
    const res = await executeAsTenant(tenantA, () =>
      EmployeeService.listEmployees(
        tenantA,
        { ...adminContext, tenantId: tenantA },
        [],
        { search: "Alice" }
      )
    );

    expect(res.data.length).toBe(1);
    const alice = res.data[0];
    expect(alice.firstName).toBe("Alice");
    expect(alice.loginStatus).toBe("active");
    expect(alice.avatarUrl).toBe("https://example.com/avatar-alice.jpg");
    expect(alice.branch?.name).toBe("HQ City Tower");
    expect(alice.department?.name).toBe("Engineering & IT");
    expect(alice.designation?.name).toBe("Lead Systems Architect");

    // Staff without user has inactive login status
    const staffRes = await executeAsTenant(tenantA, () =>
      EmployeeService.listEmployees(
        tenantA,
        { ...adminContext, tenantId: tenantA },
        [],
        { search: "Staff2" }
      )
    );
    expect(staffRes.data.length).toBe(1);
    expect(staffRes.data[0].loginStatus).toBe("inactive");
  });

  it("4. filters employees accurately by status", async () => {
    // Active only
    const activeRes = await executeAsTenant(tenantA, () =>
      EmployeeService.listEmployees(
        tenantA,
        { ...adminContext, tenantId: tenantA },
        [],
        { status: "active" }
      )
    );
    expect(activeRes.total).toBe(9);
    for (const e of activeRes.data) {
      expect(e.status).toBe("active");
    }

    // Terminated only
    const termRes = await executeAsTenant(tenantA, () =>
      EmployeeService.listEmployees(
        tenantA,
        { ...adminContext, tenantId: tenantA },
        [],
        { status: "terminated" }
      )
    );
    expect(termRes.total).toBe(2);
    for (const e of termRes.data) {
      expect(e.status).toBe("terminated");
    }

    // Inactive (not active)
    const inactiveRes = await executeAsTenant(tenantA, () =>
      EmployeeService.listEmployees(
        tenantA,
        { ...adminContext, tenantId: tenantA },
        [],
        { status: "inactive" }
      )
    );
    expect(inactiveRes.total).toBe(3);
  });

  it("5. strictly isolates Tenant A from Tenant B employees", async () => {
    const resA = await executeAsTenant(tenantA, () =>
      EmployeeService.listEmployees(
        tenantA,
        { ...adminContext, tenantId: tenantA },
        [],
        {}
      )
    );
    expect(resA.total).toBe(12);
    for (const e of resA.data) {
      expect(e.tenantId).toBe(tenantA);
      expect(e.firstName).not.toContain("TenantB");
    }

    const resB = await executeAsTenant(tenantB, () =>
      EmployeeService.listEmployees(
        tenantB,
        { ...adminContext, tenantId: tenantB },
        [],
        {}
      )
    );
    expect(resB.total).toBe(2);
    for (const e of resB.data) {
      expect(e.tenantId).toBe(tenantB);
      expect(e.firstName).toContain("TenantB");
    }
  });

  it("6. combines filters across branch, department, designation, and employmentType", async () => {
    const combined = await executeAsTenant(tenantA, () =>
      EmployeeService.listEmployees(
        tenantA,
        { ...adminContext, tenantId: tenantA },
        [],
        {
          branchId: branchA,
          departmentId: deptA,
          designationId: desigA,
          employmentType: "contract",
        }
      )
    );

    expect(combined.total).toBeGreaterThan(0);
    for (const e of combined.data) {
      expect(e.branchId).toBe(branchA);
      expect(e.departmentId).toBe(deptA);
      expect(e.designationId).toBe(desigA);
      expect(e.employmentType).toBe("contract");
    }
  });
});
