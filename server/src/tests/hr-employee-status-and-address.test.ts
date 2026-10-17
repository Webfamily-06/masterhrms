import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { EmployeeService } from "../services/employee.service";
import { UserSecurityContext } from "../lib/data-scope";
import { runWithTenantContext, TenantContext } from "../context/tenant-context";
import { validateAndNormalizeServerPhone } from "../lib/phone-validation";

const rawPrisma = new PrismaClient();

function executeAsTenant<T>(tenantId: string, actorId: string, fn: () => Promise<T>): Promise<T> {
  const ctx: TenantContext = {
    tenantId,
    userId: actorId,
    roles: ["admin", "hr_admin"],
    status: "ACTIVE",
    tenancyStrategy: "SHARED_SCHEMA",
    db: rawPrisma,
  };
  return runWithTenantContext(ctx, fn);
}

describe("Status Filter, Address Order & International Phone Acceptance Cases", () => {
  let tenant1: string;
  let tenant2: string;
  let branch1: string;
  let dept1: string;
  let desig1: string;
  let adminUser1: string;
  let testEmployeeIds: string[] = [];

  const getAdminContext = (tId: string): UserSecurityContext => ({
    userId: adminUser1 || "admin-actor-1",
    tenantId: tId,
    roles: ["admin", "hr_admin"],
    employeeId: null,
    employeeCode: null,
    departmentId: null,
    branchId: null,
    managerId: null,
    directReportEmployeeIds: [],
    allSubordinateEmployeeIds: [],
    isSuperAdmin: false,
    isTenantAdmin: true,
  });

  beforeAll(async () => {
    // Setup Tenant 1
    const t1 = await rawPrisma.tenant.create({
      data: {
        name: "Acceptance Suite Tenant 1",
        slug: `acc-t1-${Date.now()}`,
      },
    });
    tenant1 = t1.id;

    // Setup Tenant 2 (for tenant isolation verification)
    const t2 = await rawPrisma.tenant.create({
      data: {
        name: "Acceptance Suite Tenant 2",
        slug: `acc-t2-${Date.now()}`,
      },
    });
    tenant2 = t2.id;

    const br = await rawPrisma.branch.create({
      data: {
        tenantId: tenant1,
        name: "Primary City HQ",
        code: `BR-ACC-${Date.now()}`,
      },
    });
    branch1 = br.id;

    const dp = await rawPrisma.department.create({
      data: {
        tenantId: tenant1,
        branchId: branch1,
        name: "Product & Engineering",
      },
    });
    dept1 = dp.id;

    const ds = await rawPrisma.designation.create({
      data: {
        tenantId: tenant1,
        name: "Staff Software Engineer",
      },
    });
    desig1 = ds.id;

    const u = await rawPrisma.user.create({
      data: {
        email: `acc.admin.${Date.now()}@test.com`,
        passwordHash: "hash-secret-pwd",
      },
    });
    adminUser1 = u.id;
  });

  afterAll(async () => {
    // Cleanup tenant test records safely
    await rawPrisma.customFieldValue.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
    await rawPrisma.probationRecord.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
    await rawPrisma.employee.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
    await rawPrisma.userRole.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
    await rawPrisma.designation.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
    await rawPrisma.department.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
    await rawPrisma.branch.deleteMany({ where: { tenantId: { in: [tenant1, tenant2] } } });
    await rawPrisma.user.deleteMany({ where: { id: adminUser1 } });
    await rawPrisma.tenant.deleteMany({ where: { id: { in: [tenant1, tenant2] } } });
    await rawPrisma.$disconnect();
  });

  // Acceptance Case 1: Four active employees produce All = 4 and Active = 4
  it("Case 1: 4 active employees produce All = 4 and Active = 4", async () => {
    await executeAsTenant(tenant1, adminUser1, async () => {
      for (let i = 1; i <= 4; i++) {
        const emp = await EmployeeService.createEmployeeAtomic(
          tenant1,
          adminUser1,
          {
            firstName: `Emp${i}`,
            lastName: "Tester",
            email: `emp${i}.${Date.now()}@acceptance.com`,
            employeeCode: `ACC-EMP-00${i}`,
            branchId: branch1,
            departmentId: dept1,
            designationId: desig1,
            status: "active",
            phone: "+91 98765 0000" + i,
            createLoginAccount: false,
          }
        );
        testEmployeeIds.push(emp.id);
      }

      const list = await EmployeeService.listEmployees(
        tenant1,
        getAdminContext(tenant1),
        ["admin", "hr_admin"],
        {}
      );

      expect(list.total).toBe(4);
      expect(list.statusCounts.all).toBe(4);
      expect(list.statusCounts.active).toBe(4);
      expect(list.statusCounts.inactive).toBe(0);
      expect(list.statusCounts.terminated).toBe(0);
    });
  }, 30000);

  // Acceptance Case 2: Changing one employee to Inactive produces All = 4, Active = 3, Inactive = 1
  it("Case 2: Changing one employee to Inactive produces All = 4, Active = 3, Inactive = 1", async () => {
    await executeAsTenant(tenant1, adminUser1, async () => {
      const targetEmpId = testEmployeeIds[0];
      await EmployeeService.updateEmployeeStatus(
        tenant1,
        adminUser1,
        targetEmpId,
        "inactive",
        getAdminContext(tenant1)
      );

      const list = await EmployeeService.listEmployees(
        tenant1,
        getAdminContext(tenant1),
        ["admin", "hr_admin"],
        {}
      );

      expect(list.statusCounts.all).toBe(4);
      expect(list.statusCounts.active).toBe(3);
      expect(list.statusCounts.inactive).toBe(1);
      expect(list.statusCounts.terminated).toBe(0);
    });
  }, 15000);

  // Acceptance Case 3: Clicking Inactive shows that employee
  it("Case 3: Filtering by status = 'inactive' returns precisely the inactive employee", async () => {
    await executeAsTenant(tenant1, adminUser1, async () => {
      const filtered = await EmployeeService.listEmployees(
        tenant1,
        getAdminContext(tenant1),
        ["admin", "hr_admin"],
        { status: "inactive" }
      );

      expect(filtered.total).toBe(1);
      expect(filtered.data.length).toBe(1);
      expect(filtered.data[0].id).toBe(testEmployeeIds[0]);
      expect(filtered.data[0].status).toBe("inactive");
      // Status counts are still preserved across the tabs
      expect(filtered.statusCounts.all).toBe(4);
      expect(filtered.statusCounts.active).toBe(3);
      expect(filtered.statusCounts.inactive).toBe(1);
    });
  }, 15000);

  // Acceptance Case 4: Reactivating the employee restores Active = 4 and Inactive = 0
  it("Case 4: Reactivating the employee restores Active = 4 and Inactive = 0", async () => {
    await executeAsTenant(tenant1, adminUser1, async () => {
      const targetEmpId = testEmployeeIds[0];
      await EmployeeService.updateEmployeeStatus(
        tenant1,
        adminUser1,
        targetEmpId,
        "active",
        getAdminContext(tenant1)
      );

      const list = await EmployeeService.listEmployees(
        tenant1,
        getAdminContext(tenant1),
        ["admin", "hr_admin"],
        {}
      );

      expect(list.statusCounts.all).toBe(4);
      expect(list.statusCounts.active).toBe(4);
      expect(list.statusCounts.inactive).toBe(0);
    });
  }, 15000);

  // Acceptance Case 5: Terminating an employee updates the correct count and filtered list
  it("Case 5: Terminating an employee produces Active = 3, Terminated = 1, and Inactive remains 0", async () => {
    await executeAsTenant(tenant1, adminUser1, async () => {
      const targetEmpId = testEmployeeIds[1];
      await EmployeeService.updateEmployeeStatus(
        tenant1,
        adminUser1,
        targetEmpId,
        "terminated",
        getAdminContext(tenant1)
      );

      const list = await EmployeeService.listEmployees(
        tenant1,
        getAdminContext(tenant1),
        ["admin", "hr_admin"],
        {}
      );

      expect(list.statusCounts.all).toBe(4);
      expect(list.statusCounts.active).toBe(3);
      expect(list.statusCounts.inactive).toBe(0);
      expect(list.statusCounts.terminated).toBe(1);

      // Verify filtered list for terminated
      const terminatedList = await EmployeeService.listEmployees(
        tenant1,
        getAdminContext(tenant1),
        ["admin", "hr_admin"],
        { status: "terminated" }
      );
      expect(terminatedList.total).toBe(1);
      expect(terminatedList.data[0].id).toBe(targetEmpId);
    });
  }, 15000);

  // Acceptance Case 6: Probation counts match documented business rule
  it("Case 6: Probation is an employment attribute and does not double-count in All headcount", async () => {
    await executeAsTenant(tenant1, adminUser1, async () => {
      // Create probation record for employee 3 (who is active)
      const emp3Id = testEmployeeIds[2];
      await rawPrisma.probationRecord.create({
        data: {
          tenantId: tenant1,
          employeeId: emp3Id,
          status: "active",
          startDate: new Date(),
          probationPeriodDays: 180,
          endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        },
      });

      const list = await EmployeeService.listEmployees(
        tenant1,
        getAdminContext(tenant1),
        ["admin", "hr_admin"],
        {}
      );

      // Total employees remain 4; probation count is 1, active is 3 (1 terminated in Case 5)
      expect(list.statusCounts.all).toBe(4);
      expect(list.statusCounts.probation).toBe(1);
      expect(list.statusCounts.active).toBe(3);

      // Filtering by probation tab returns the probation employee
      const probationList = await EmployeeService.listEmployees(
        tenant1,
        getAdminContext(tenant1),
        ["admin", "hr_admin"],
        { status: "probation" }
      );
      expect(probationList.total).toBe(1);
      expect(probationList.data[0].id).toBe(emp3Id);
    });
  }, 15000);

  // Acceptance Case 7: Counts are strictly isolated between tenants
  it("Case 7: Counts and employee rows are strictly isolated between tenants", async () => {
    // Seed 1 active employee in Tenant 2
    await executeAsTenant(tenant2, "admin-actor-2", async () => {
      await rawPrisma.employee.create({
        data: {
          tenantId: tenant2,
          firstName: "Tenant2",
          lastName: "User",
          email: `t2.user.${Date.now()}@tenant2.com`,
          employeeCode: `T2-EMP-01`,
          status: "active",
        },
      });

      const listT2 = await EmployeeService.listEmployees(
        tenant2,
        getAdminContext(tenant2),
        ["admin", "hr_admin"],
        {}
      );

      expect(listT2.statusCounts.all).toBe(1);
      expect(listT2.statusCounts.active).toBe(1);
      expect(listT2.statusCounts.inactive).toBe(0);
      expect(listT2.statusCounts.terminated).toBe(0);
    });

    // Tenant 1 counts remain completely unaffected
    await executeAsTenant(tenant1, adminUser1, async () => {
      const listT1 = await EmployeeService.listEmployees(
        tenant1,
        getAdminContext(tenant1),
        ["admin", "hr_admin"],
        {}
      );

      expect(listT1.statusCounts.all).toBe(4);
      expect(listT1.statusCounts.active).toBe(3);
      expect(listT1.statusCounts.terminated).toBe(1);
    });
  }, 15000);

  // Acceptance Case 8: Login activation and employment status remain independent
  it("Case 8: Toggling login activation preserves employment status, and changing employment status preserves login access", async () => {
    await executeAsTenant(tenant1, adminUser1, async () => {
      const targetEmp = testEmployeeIds[3]; // Currently active
      
      // 1. Toggle login account status
      const toggleRes = await EmployeeService.toggleEmployeeAccountStatus(
        tenant1,
        adminUser1,
        targetEmp,
        getAdminContext(tenant1)
      );
      expect(toggleRes.loginStatus).toBe("active");

      // Verify employment status remains active and counts unchanged
      const list1 = await EmployeeService.listEmployees(
        tenant1,
        getAdminContext(tenant1),
        ["admin", "hr_admin"],
        {}
      );
      expect(list1.statusCounts.active).toBe(3);

      // Verify the employee record itself has status: active
      const empRecord = await rawPrisma.employee.findUnique({ where: { id: targetEmp } });
      expect(empRecord?.status).toBe("active");

      // 2. Change employment status to inactive
      await EmployeeService.updateEmployeeStatus(
        tenant1,
        adminUser1,
        targetEmp,
        "inactive",
        getAdminContext(tenant1)
      );

      // Verify login user still exists and was not removed
      const empRecordAfter = await rawPrisma.employee.findUnique({ where: { id: targetEmp } });
      expect(empRecordAfter?.status).toBe("inactive");
      expect(empRecordAfter?.userId).toBeTruthy();
    });
  }, 15000);

  // Acceptance Case 9: Creating or editing an employee updates counts and address persistence
  it("Case 9: Creating employee with full address (1-7) persists and reloads correctly", async () => {
    await executeAsTenant(tenant1, adminUser1, async () => {
      const newEmp = await EmployeeService.createEmployeeAtomic(
        tenant1,
        adminUser1,
        {
          firstName: "Deepa",
          lastName: "Natarajan",
          email: `deepa.${Date.now()}@acceptance.com`,
          employeeCode: `ACC-ADDR-01`,
          branchId: branch1,
          departmentId: dept1,
          designationId: desig1,
          status: "active",
          country: "India",
          state: "Tamil Nadu",
          district: "Chennai",
          city: "Chennai",
          postalCode: "600001",
          addressLine1: "10 Rajaji Salai",
          addressLine2: "Suite 402, 4th Floor",
          phone: "+91 98400 12345",
          emergencyContactName: "K. Natarajan",
          emergencyContactRelationship: "Father",
          emergencyContactPhone: "+91 94440 54321",
          createLoginAccount: false,
        }
      );

      // Verify 360 profile returns all address fields in restored form
      const profile = await EmployeeService.getEmployee360(
        tenant1,
        newEmp.id,
        getAdminContext(tenant1),
        ["admin", "hr_admin"]
      );

      expect(profile.country).toBe("India");
      expect(profile.state).toBe("Tamil Nadu");
      expect(profile.district).toBe("Chennai");
      expect(profile.city).toBe("Chennai");
      expect(profile.postalCode).toBe("600001");
      expect(profile.addressLine1).toBe("10 Rajaji Salai");
      expect(profile.addressLine2).toBe("Suite 402, 4th Floor");
      expect(profile.phone).toBe("+91 98400 12345");
      expect(profile.emergencyContactPhone).toBe("+91 94440 54321");
    });
  }, 30000);

  // Acceptance Case: Phone Validation Rule Engine
  it("Phone Validation Engine: Rejects alphabetic characters, enforces international rules, formats properly", () => {
    // 1. Reject alphabetic characters
    const alphaRes = validateAndNormalizeServerPhone("98765abcde", false, "India");
    expect(alphaRes.isValid).toBe(false);
    expect(alphaRes.error).toContain("alphabetic characters");

    // 2. Reject short number and 9-digit Indian mobile
    const shortNumber = validateAndNormalizeServerPhone("98765", false, "India");
    expect(shortNumber.isValid).toBe(false);
    expect(shortNumber.error).toContain("length is invalid");

    const nineDigitsIndia = validateAndNormalizeServerPhone("987654321", false, "India");
    expect(nineDigitsIndia.isValid).toBe(false);
    expect(nineDigitsIndia.error).toContain("10 digits");

    // 3. Accept valid Indian mobile and normalize with country calling code
    const validIndia = validateAndNormalizeServerPhone("9876543210", false, "India");
    expect(validIndia.isValid).toBe(true);
    expect(validIndia.normalized).toBe("+91 9876543210");

    // 4. Accept international US number (+1 415 555 2671)
    const validUS = validateAndNormalizeServerPhone("+1 (415) 555-2671", false, "United States");
    expect(validUS.isValid).toBe(true);
    expect(validUS.normalized).toBe("+1 4155552671");

    // 5. Reject invalid US number (too short)
    const invalidUS = validateAndNormalizeServerPhone("+1 415 555", false, "United States");
    expect(invalidUS.isValid).toBe(false);

    // 6. Accept UK number (+44 20 7946 0958)
    const validUK = validateAndNormalizeServerPhone("+44 20 7946 0958", false, "United Kingdom");
    expect(validUK.isValid).toBe(true);
  });
});
