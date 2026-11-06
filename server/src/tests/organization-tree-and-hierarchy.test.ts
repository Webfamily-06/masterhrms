import assert from "node:assert";
import { validateReportingHierarchy } from "../lib/reporting-hierarchy-validator";
import { OrganizationTreeService } from "../services/organization-tree.service";
import * as contextModule from "../context/tenant-context";

async function runTestSuite() {
  console.log("================================================================================");
  console.log("🌲 MASTERHRMS — ORGANIZATION TREE & REPORTING HIERARCHY CERTIFICATION SUITE");
  console.log("================================================================================\n");

  const tenantA = "tenant-alpha";
  const tenantB = "tenant-beta";

  let employeesDb: any[] = [];
  let departmentsDb: any[] = [];
  let branchesDb: any[] = [];
  let designationsDb: any[] = [];

  function resetMockData() {
    employeesDb = [
      {
        id: "emp-ceo",
        tenantId: tenantA,
        employeeCode: "EMP-001",
        firstName: "Sarah",
        lastName: "Jenkins",
        email: "sarah.ceo@masterhrms.local",
        phone: "+919876543210",
        position: "Chief Executive Officer",
        status: "active",
        joinedAt: new Date("2024-01-01"),
        departmentId: "dept-exec",
        branchId: "branch-hq",
        designationId: "desig-exec",
        managerId: null,
      },
      {
        id: "emp-cto",
        tenantId: tenantA,
        employeeCode: "EMP-002",
        firstName: "Alex",
        lastName: "Rivera",
        email: "alex.cto@masterhrms.local",
        phone: "+919876543211",
        position: "Chief Technology Officer",
        status: "active",
        joinedAt: new Date("2024-02-01"),
        departmentId: "dept-eng",
        branchId: "branch-hq",
        designationId: "desig-dir",
        managerId: "emp-ceo",
      },
      {
        id: "emp-lead",
        tenantId: tenantA,
        employeeCode: "EMP-003",
        firstName: "David",
        lastName: "Chen",
        email: "david.lead@masterhrms.local",
        phone: "+919876543212",
        position: "Engineering Lead",
        status: "active",
        joinedAt: new Date("2024-03-01"),
        departmentId: "dept-eng",
        branchId: "branch-hq",
        designationId: "desig-lead",
        managerId: "emp-cto",
      },
      {
        id: "emp-dev1",
        tenantId: tenantA,
        employeeCode: "EMP-004",
        firstName: "Emily",
        lastName: "Watson",
        email: "emily.dev@masterhrms.local",
        phone: "+919876543213",
        position: "Senior Full Stack Engineer",
        status: "active",
        joinedAt: new Date("2024-04-01"),
        departmentId: "dept-eng",
        branchId: "branch-hq",
        designationId: "desig-eng",
        managerId: "emp-lead",
      },
      {
        id: "emp-dev2",
        tenantId: tenantA,
        employeeCode: "EMP-005",
        firstName: "Marcus",
        lastName: "Vance",
        email: "marcus.dev@masterhrms.local",
        phone: "+919876543214",
        position: "Frontend Specialist",
        status: "active",
        joinedAt: new Date("2024-05-01"),
        departmentId: "dept-eng",
        branchId: "branch-hq",
        designationId: "desig-eng",
        managerId: "emp-lead",
      },
      {
        id: "emp-cfo",
        tenantId: tenantA,
        employeeCode: "EMP-006",
        firstName: "Claire",
        lastName: "Dunphy",
        email: "claire.cfo@masterhrms.local",
        phone: "+919876543215",
        position: "Chief Financial Officer",
        status: "active",
        joinedAt: new Date("2024-01-15"),
        departmentId: "dept-fin",
        branchId: "branch-hq",
        designationId: "desig-exec",
        managerId: "emp-ceo",
      },
      {
        id: "emp-inactive",
        tenantId: tenantA,
        employeeCode: "EMP-099",
        firstName: "Former",
        lastName: "Staff",
        email: "former@masterhrms.local",
        phone: "+919876543299",
        position: "Exited Lead",
        status: "terminated",
        joinedAt: new Date("2023-01-01"),
        departmentId: "dept-eng",
        branchId: "branch-hq",
        designationId: "desig-lead",
        managerId: null,
      },
      {
        id: "emp-tenant-b",
        tenantId: tenantB,
        employeeCode: "EMP-B-001",
        firstName: "Bob",
        lastName: "Foreign",
        email: "bob@tenantb.local",
        phone: "+919876543288",
        position: "Foreign Manager",
        status: "active",
        joinedAt: new Date("2024-01-01"),
        departmentId: null,
        branchId: null,
        designationId: null,
        managerId: null,
      },
    ];

    departmentsDb = [
      { id: "dept-exec", tenantId: tenantA, name: "Executive Leadership", description: "Corporate officers", status: "active", branchId: "branch-hq" },
      { id: "dept-eng", tenantId: tenantA, name: "Engineering & Technology", description: "Core platform and infrastructure", status: "active", branchId: "branch-hq" },
      { id: "dept-fin", tenantId: tenantA, name: "Finance & Accounting", description: "Financial controllership", status: "active", branchId: "branch-hq" },
    ];

    branchesDb = [
      { id: "branch-hq", tenantId: tenantA, name: "Headquarters Tech Campus", code: "HQ-01", status: "active" },
    ];

    designationsDb = [
      { id: "desig-exec", tenantId: tenantA, name: "C-Level Executive", departmentId: "dept-exec" },
      { id: "desig-dir", tenantId: tenantA, name: "Vice President / Director", departmentId: "dept-eng" },
      { id: "desig-lead", tenantId: tenantA, name: "Engineering Lead", departmentId: "dept-eng" },
      { id: "desig-eng", tenantId: tenantA, name: "Senior Software Engineer", departmentId: "dept-eng" },
    ];
  }

  const mockDb = {
    employee: {
      findFirst: async ({ where }: any) => {
        const found = employeesDb.find((e) => {
          if (where.id && e.id !== where.id) return false;
          if (where.tenantId && e.tenantId !== where.tenantId) return false;
          if (where.status && e.status !== where.status) return false;
          return true;
        });
        if (!found) return null;
        return {
          ...found,
          department: departmentsDb.find((d) => d.id === found.departmentId) || null,
          branch: branchesDb.find((b) => b.id === found.branchId) || null,
          designation: designationsDb.find((des) => des.id === found.designationId) || null,
          manager: employeesDb.find((m) => m.id === found.managerId) || null,
          subordinates: employeesDb.filter((sub) => sub.managerId === found.id),
        };
      },
      findMany: async ({ where }: any) => {
        return employeesDb
          .filter((e) => {
            if (where.tenantId && e.tenantId !== where.tenantId) return false;
            if (where.status && e.status !== where.status) return false;
            return true;
          })
          .map((e) => ({
            ...e,
            department: departmentsDb.find((d) => d.id === e.departmentId) || null,
            branch: branchesDb.find((b) => b.id === e.branchId) || null,
            designation: designationsDb.find((des) => des.id === e.designationId) || null,
            manager: employeesDb.find((m) => m.id === e.managerId) || null,
            subordinates: employeesDb.filter((sub) => sub.managerId === e.id),
          }));
      },
      count: async ({ where }: any) => {
        return employeesDb.filter((e) => {
          if (where.tenantId && e.tenantId !== where.tenantId) return false;
          return true;
        }).length;
      },
    },
    department: {
      findMany: async ({ where }: any) => {
        return departmentsDb
          .filter((d) => d.tenantId === where.tenantId)
          .map((d) => ({
            ...d,
            branch: branchesDb.find((b) => b.id === d.branchId) || null,
          }));
      },
      count: async ({ where }: any) => departmentsDb.filter((d) => d.tenantId === where.tenantId).length,
    },
    branch: {
      findMany: async ({ where }: any) => branchesDb.filter((b) => b.tenantId === where.tenantId),
      count: async ({ where }: any) => branchesDb.filter((b) => b.tenantId === where.tenantId).length,
    },
    designation: {
      findMany: async ({ where }: any) => designationsDb.filter((des) => des.tenantId === where.tenantId),
      count: async ({ where }: any) => designationsDb.filter((des) => des.tenantId === where.tenantId).length,
    },
  };

  // Mock getTenantDb to point to mockDb
  (contextModule as any).getTenantDb = () => mockDb;

  let totalTests = 0;
  let passedTests = 0;

  function runTest(name: string, fn: () => Promise<void>) {
    totalTests++;
    return fn()
      .then(() => {
        passedTests++;
        console.log(`  ✓ [PASS] ${name}`);
      })
      .catch((err) => {
        console.error(`  ✗ [FAIL] ${name}:`, err.message);
        throw err;
      });
  }

  // =========================================================================
  // SECTION 1: REPORTING HIERARCHY VALIDATION
  // =========================================================================
  console.log("--- Section 1: Server-Side Reporting Hierarchy Validation ---");
  resetMockData();

  await runTest("1.1 Clearing reporting manager (null or '') is valid", async () => {
    const resNull = await validateReportingHierarchy(tenantA, "emp-lead", null, mockDb);
    assert.strictEqual(resNull.valid, true);
    const resEmpty = await validateReportingHierarchy(tenantA, "emp-lead", "", mockDb);
    assert.strictEqual(resEmpty.valid, true);
  });

  await runTest("1.2 Self-reporting is strictly forbidden (emp cannot report to self)", async () => {
    const res = await validateReportingHierarchy(tenantA, "emp-lead", "emp-lead", mockDb);
    assert.strictEqual(res.valid, false);
    assert.ok(res.error?.includes("Self-reporting is forbidden"));
  });

  await runTest("1.3 Reject reporting manager from a different tenant", async () => {
    const res = await validateReportingHierarchy(tenantA, "emp-lead", "emp-tenant-b", mockDb);
    assert.strictEqual(res.valid, false);
    assert.ok(res.error?.includes("does not exist in this organization"));
  });

  await runTest("1.4 Reject non-existent manager ID", async () => {
    const res = await validateReportingHierarchy(tenantA, "emp-lead", "ghost-uuid-999", mockDb);
    assert.strictEqual(res.valid, false);
    assert.ok(res.error?.includes("does not exist in this organization"));
  });

  await runTest("1.5 Reject assigning inactive/terminated employee as manager", async () => {
    const res = await validateReportingHierarchy(tenantA, "emp-lead", "emp-inactive", mockDb);
    assert.strictEqual(res.valid, false);
    assert.ok(res.error?.includes("Cannot assign inactive employee"));
  });

  await runTest("1.6 Detect and reject direct circular reporting (CEO -> CTO -> CEO)", async () => {
    // CTO reports to CEO. Assigning CEO to report to CTO would create a loop!
    const res = await validateReportingHierarchy(tenantA, "emp-ceo", "emp-cto", mockDb);
    assert.strictEqual(res.valid, false);
    assert.ok(res.error?.includes("Circular reporting detected"));
  });

  await runTest("1.7 Detect and reject deep circular reporting (CEO -> CTO -> Lead -> Dev1 -> CEO)", async () => {
    // Dev1 reports to Lead -> CTO -> CEO. Assigning CEO to report to Dev1 must be blocked!
    const res = await validateReportingHierarchy(tenantA, "emp-ceo", "emp-dev1", mockDb);
    assert.strictEqual(res.valid, false);
    assert.ok(res.error?.includes("Circular reporting detected"));
  });

  await runTest("1.8 Allow valid hierarchical manager reassignment without cycles", async () => {
    // Reassigning Emily (Dev1) directly to Alex (CTO) is completely valid
    const res = await validateReportingHierarchy(tenantA, "emp-dev1", "emp-cto", mockDb);
    assert.strictEqual(res.valid, true);
  });

  // =========================================================================
  // SECTION 2: EMPLOYEE & DEPARTMENT TREE GENERATION
  // =========================================================================
  console.log("\n--- Section 2: Organization Tree Service & Hierarchy Views ---");
  resetMockData();

  await runTest("2.1 Builds full multi-level employee reporting hierarchy with correct metrics", async () => {
    const result = await OrganizationTreeService.getEmployeeHierarchy(tenantA, {}, mockDb);
    assert.strictEqual(result.orgChart.length, 1); // CEO is sole root
    const ceo = result.orgChart[0];
    assert.strictEqual(ceo.name, "Sarah Jenkins");
    assert.strictEqual(ceo.position, "Chief Executive Officer");
    assert.strictEqual(ceo.subordinates.length, 2); // CTO and CFO

    const cto = ceo.subordinates.find((s) => s.id === "emp-cto");
    assert.ok(cto);
    assert.strictEqual(cto?.subordinates.length, 1); // Lead

    const lead = cto?.subordinates[0];
    assert.strictEqual(lead?.name, "David Chen");
    assert.strictEqual(lead?.directReportsCount, 2); // Dev1 and Dev2
    assert.strictEqual(lead?.totalTeamSize, 2);
  });

  await runTest("2.2 Search filter highlights matching nodes while preserving ancestor reporting path", async () => {
    // Search for Marcus Vance
    const result = await OrganizationTreeService.getEmployeeHierarchy(tenantA, { search: "Marcus" }, mockDb);
    assert.strictEqual(result.matchingCount, 1);
    assert.strictEqual(result.orgChart.length, 1);

    const ceo = result.orgChart[0];
    assert.strictEqual(ceo.id, "emp-ceo");

    const cto = ceo.subordinates[0];
    assert.strictEqual(cto.id, "emp-cto");

    const lead = cto.subordinates[0];
    assert.strictEqual(lead.id, "emp-lead");

    const marcus = lead.subordinates[0];
    assert.strictEqual(marcus.id, "emp-dev2");
    assert.strictEqual(marcus.name, "Marcus Vance");
    assert.strictEqual(marcus.isMatchingSearch, true);
  });

  await runTest("2.3 Constructs department hierarchy with counts and fallback department heads", async () => {
    const result = await OrganizationTreeService.getDepartmentHierarchy(tenantA, mockDb);
    assert.strictEqual(result.totalDepartments, 3);

    const engDept = result.departments.find((d) => d.id === "dept-eng");
    assert.ok(engDept);
    assert.strictEqual(engDept?.name, "Engineering & Technology");
    assert.strictEqual(engDept?.head, "Department head not assigned"); // Explicit certified fallback
    assert.strictEqual(engDept?.totalEmployees, 5); // 4 active + 1 terminated
    assert.strictEqual(engDept?.activeEmployees, 4);
    assert.strictEqual(engDept?.branch?.name, "Headquarters Tech Campus");
  });

  await runTest("2.4 Computes hierarchy summary KPIs accurately", async () => {
    const summary = await OrganizationTreeService.getHierarchySummary(tenantA, mockDb);
    assert.strictEqual(summary.totalEmployees, 7);
    assert.strictEqual(summary.totalDepartments, 3);
    assert.strictEqual(summary.totalBranches, 1);
    assert.strictEqual(summary.totalDesignations, 4);
    assert.strictEqual(summary.totalManagers, 3); // CEO, CTO, Lead
    assert.strictEqual(summary.topExecutivesCount, 1); // CEO
    assert.strictEqual(summary.maxHierarchyDepth, 4); // CEO -> CTO -> Lead -> Dev
  });

  await runTest("2.5 Retrieves employee tree detail for drawer without leaking sensitive financial data", async () => {
    const detail = await OrganizationTreeService.getEmployeeTreeDetail(tenantA, "emp-lead", mockDb);
    assert.ok(detail);
    assert.strictEqual(detail?.name, "David Chen");
    assert.strictEqual(detail?.directReportsCount, 2);
    assert.strictEqual(detail?.manager?.name, "Alex Rivera");
    assert.strictEqual(detail?.managerChain.length, 2); // CTO, then CEO

    // Strictly ensure zero financial/statutory leakage
    assert.strictEqual((detail as any).salary, undefined);
    assert.strictEqual((detail as any).pan, undefined);
    assert.strictEqual((detail as any).aadhaar, undefined);
    assert.strictEqual((detail as any).bankAccount, undefined);
  });

  console.log("\n================================================================================");
  console.log(`✅ ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log("================================================================================\n");
}

runTestSuite().catch((err) => {
  console.error("Test Suite Terminated with Error:", err);
  process.exit(1);
});
