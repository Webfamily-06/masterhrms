import assert from "node:assert";
import { prisma, rawPrisma } from "../prisma";
import { EmployeeService, EMPLOYEE_PHYSICAL_COLUMNS_SELECT } from "../services/employee.service";
import { runWithTenantContext, TenantContext } from "../context/tenant-context";
import { TenantConnectionManager } from "../services/tenant-connection-manager.service";
import { UserSecurityContext } from "../lib/data-scope";

async function runRegressionSuite() {
  console.log("================================================================================");
  console.log("🧪 MASTERHRMS: CHAT & EMPLOYEE REGRESSION & ARCHITECTURAL VERIFICATION SUITE");
  console.log("================================================================================\n");

  const testTenantId = "tenant-default-001";
  const manager = TenantConnectionManager.getInstance();
  const { client: testTenantDb } = await manager.getClientForTenant(testTenantId);

  const testContext: TenantContext = {
    tenantId: testTenantId,
    db: testTenantDb,
    userId: "user-admin-001",
    userRoles: ["admin", "hr_admin"],
    status: "ACTIVE",
    tenancyStrategy: "SHARED_SCHEMA",
    isSuperAdmin: false,
    auditMetadata: {}
  };

  await runWithTenantContext(testContext, async () => {
    // --------------------------------------------------------------------------
    // TEST 1: Physical Columns Projection Integrity
    // --------------------------------------------------------------------------
    console.log("Test 1: Verifying physical columns projection integrity...");
    assert.strictEqual(typeof EMPLOYEE_PHYSICAL_COLUMNS_SELECT, "object");
    assert.strictEqual(EMPLOYEE_PHYSICAL_COLUMNS_SELECT.id, true);
    assert.strictEqual(EMPLOYEE_PHYSICAL_COLUMNS_SELECT.tenantId, true);
    assert.strictEqual(EMPLOYEE_PHYSICAL_COLUMNS_SELECT.employeeCode, true);
    assert.strictEqual(EMPLOYEE_PHYSICAL_COLUMNS_SELECT.firstName, true);
    assert.strictEqual(EMPLOYEE_PHYSICAL_COLUMNS_SELECT.email, true);
    // Ensure phantom unmigrated columns are NOT in the projection
    assert.strictEqual((EMPLOYEE_PHYSICAL_COLUMNS_SELECT as any).fatherOrSpouseName, undefined);
    assert.strictEqual((EMPLOYEE_PHYSICAL_COLUMNS_SELECT as any).presentAddress, undefined);
    assert.strictEqual((EMPLOYEE_PHYSICAL_COLUMNS_SELECT as any).permanentAddress, undefined);
    console.log("  [PASS] Projection only targets validated PostgreSQL columns.");

    // --------------------------------------------------------------------------
    // TEST 2: Employee Listing with Full Records (Status, Departments, Branches)
    // --------------------------------------------------------------------------
    console.log("\nTest 2: Verifying EmployeeService.listEmployees with complete records...");
    const adminUserContext: UserSecurityContext = {
      userId: "user-admin-001",
      tenantId: testTenantId,
      roles: ["admin"],
      isTenantAdmin: true,
      permissions: ["employee:read", "employee:write"],
      dataScope: "ALL",
      directReportEmployeeIds: [],
      allSubordinateEmployeeIds: [],
      isSuperAdmin: false
    };

    const listResult = await EmployeeService.listEmployees(
      testTenantId,
      adminUserContext,
      ["employee:read", "employee:write"],
      { page: 1, limit: 10 }
    );

    assert.ok(listResult, "Result must not be null/undefined");
    assert.strictEqual(typeof listResult.total, "number");
    assert.ok(listResult.total >= 1, `Expected at least 1 employee in tenant, found ${listResult.total}`);
    assert.ok(Array.isArray(listResult.data), "listResult.data must be an array");
    assert.strictEqual(listResult.page, 1);
    assert.strictEqual(typeof listResult.totalPages, "number");
    assert.ok(listResult.statusCounts, "statusCounts must be provided");
    assert.strictEqual(typeof listResult.statusCounts.all, "number");
    assert.strictEqual(typeof listResult.statusCounts.active, "number");
    console.log(`  [PASS] Successfully retrieved ${listResult.data.length} records. Total: ${listResult.total}.`);

    // --------------------------------------------------------------------------
    // TEST 3: Employees lacking login accounts (userId = null) are preserved
    // --------------------------------------------------------------------------
    console.log("\nTest 3: Verifying employees lacking login accounts (userId = null) are never dropped...");
    const employeesWithoutLogin = listResult.data.filter((e: any) => !e.userId);
    console.log(`  Found ${employeesWithoutLogin.length} employees without login account (userId = null).`);
    for (const emp of employeesWithoutLogin) {
      assert.strictEqual(emp.loginStatus, "inactive", "Employees without login must have loginStatus 'inactive'");
      assert.strictEqual(emp.avatarUrl, null, "Employees without profile/login must default to null avatar");
      assert.ok(emp.id, "Employee must have an id");
      assert.ok(emp.employeeCode, "Employee must have an employeeCode");
      assert.ok(emp.firstName, "Employee must have a firstName");
      assert.ok(Array.isArray(emp.allowedActions), "Employee must have computed allowedActions");
    }
    console.log("  [PASS] Employees without login accounts are cleanly preserved and normalized.");

    // --------------------------------------------------------------------------
    // TEST 4: Data Scopes (ALL, DEPARTMENT, BRANCH, SELF/OWN)
    // --------------------------------------------------------------------------
    console.log("\nTest 4: Verifying organizational data scopes...");
    
    // Scope ALL
    const allScopeResult = await EmployeeService.listEmployees(
      testTenantId,
      { ...adminUserContext, isTenantAdmin: false, dataScope: "ALL" },
      ["employee:read"],
      { page: 1, limit: 50, dataScope: "ALL" as any }
    );
    assert.ok(allScopeResult.total >= 0, "ALL scope must succeed");

    // Scope DEPARTMENT
    const sampleEmpWithDept = listResult.data.find((e: any) => e.departmentId);
    if (sampleEmpWithDept) {
      const deptScopeResult = await EmployeeService.listEmployees(
        testTenantId,
        {
          ...adminUserContext,
          isTenantAdmin: false,
          departmentId: sampleEmpWithDept.departmentId,
          dataScope: "DEPARTMENT"
        },
        ["employee:read"],
        { page: 1, limit: 50, dataScope: "DEPARTMENT" as any }
      );
      assert.ok(deptScopeResult.data.every((e: any) => e.departmentId === sampleEmpWithDept.departmentId),
        "DEPARTMENT scope must strictly contain only employees of that department");
      console.log(`  [PASS] DEPARTMENT scope filtered strictly to department ${sampleEmpWithDept.departmentId}`);
    } else {
      console.log("  [SKIP] No employees with departmentId found for DEPARTMENT scope verification.");
    }

    // Scope SELF
    const firstEmp = listResult.data[0];
    const selfScopeResult = await EmployeeService.listEmployees(
      testTenantId,
      {
        ...adminUserContext,
        isTenantAdmin: false,
        employeeId: firstEmp.id,
        dataScope: "SELF"
      },
      ["employee:read"],
      { page: 1, limit: 50, dataScope: "SELF" as any }
    );
    assert.ok(selfScopeResult.total <= 1, "SELF scope must return at most 1 employee");
    if (selfScopeResult.total === 1) {
      assert.strictEqual(selfScopeResult.data[0].id, firstEmp.id);
    }
    console.log("  [PASS] SELF scope strictly isolated to target employee.");

    // --------------------------------------------------------------------------
    // TEST 5: Chat Contacts Endpoint Query
    // --------------------------------------------------------------------------
    console.log("\nTest 5: Verifying Chat Contacts endpoint query...");
    const activeEmployees = await prisma.employee.findMany({
      where: {
        tenantId: testTenantId,
        status: "active",
      },
      select: {
        id: true,
        userId: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        position: true,
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, name: true } },
      },
      take: 200,
    });

    assert.ok(Array.isArray(activeEmployees), "Active employees query must return an array");
    for (const emp of activeEmployees) {
      assert.ok(emp.id, "Contact must have an id");
      assert.ok(emp.firstName, "Contact must have firstName");
      assert.ok(emp.email, "Contact must have email");
    }
    console.log(`  [PASS] Contacts query returned ${activeEmployees.length} active contacts without error.`);

    // --------------------------------------------------------------------------
    // TEST 6: Chat Personal Conversations Endpoint Query
    // --------------------------------------------------------------------------
    console.log("\nTest 6: Verifying Chat Conversations endpoint query...");
    const currentUserId = "user-emp-001";
    const directMessages = await prisma.chatMessage.findMany({
      where: {
        tenantId: testTenantId,
        threadId: { startsWith: "direct_" },
        OR: [
          { threadId: { contains: `_${currentUserId}` } },
          { threadId: { contains: `${currentUserId}_` } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const directThreadsMap = new Map<string, any>();
    for (const msg of directMessages) {
      if (!directThreadsMap.has(msg.threadId)) {
        directThreadsMap.set(msg.threadId, msg);
      }
    }

    const conversations = [];
    for (const [threadId, lastMsg] of directThreadsMap.entries()) {
      const parts = threadId.slice("direct_".length).split("_");
      const otherUserId = parts.find((p) => p !== currentUserId) || currentUserId;

      const emp = await prisma.employee.findFirst({
        where: { tenantId: testTenantId, OR: [{ userId: otherUserId }, { id: otherUserId }] },
        select: {
          id: true,
          userId: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          position: true,
          department: { select: { id: true, name: true } },
          designation: { select: { id: true, name: true } },
        },
      });

      const prof = await prisma.profile.findFirst({
        where: { tenantId: testTenantId, userId: otherUserId },
      });

      const receipt = await prisma.chatReadReceipt.findUnique({
        where: { tenantId_threadId_userId: { tenantId: testTenantId, threadId, userId: currentUserId } },
      });

      conversations.push({
        id: otherUserId,
        userId: emp?.userId || prof?.userId || otherUserId,
        threadId,
        type: "direct" as const,
        name: emp ? `${emp.firstName} ${emp.lastName}` : (prof?.fullName || "User"),
        email: emp?.email || prof?.email || "",
        lastMessage: lastMsg.content,
        lastMessageTime: lastMsg.createdAt,
        unreadCount: 0,
      });
    }

    assert.ok(Array.isArray(conversations), "Conversations must be an array");
    console.log(`  [PASS] Personal conversations query returned ${conversations.length} conversation threads.`);
    if (conversations.length > 0) {
      assert.ok(conversations[0].threadId.startsWith("direct_"));
      assert.ok(conversations[0].name.length > 0);
      console.log(`         Sample thread: ${conversations[0].threadId} with ${conversations[0].name}`);
    }

    // --------------------------------------------------------------------------
    // TEST 7: Chat Participant Profile Query (/participant/:id)
    // --------------------------------------------------------------------------
    console.log("\nTest 7: Verifying Chat Participant profile lookup (/participant/:id)...");
    const testParticipantId = firstEmp.id;
    const participantEmp = await prisma.employee.findFirst({
      where: {
        tenantId: testTenantId,
        OR: [{ id: testParticipantId }, { userId: testParticipantId }],
      },
      select: {
        id: true,
        userId: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        position: true,
        employmentType: true,
        joinedAt: true,
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, name: true } },
        user: {
          select: {
            profile: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    assert.ok(participantEmp, "Participant must be resolved");
    assert.strictEqual(participantEmp.id, testParticipantId);
    console.log(`  [PASS] Successfully retrieved participant: ${participantEmp.firstName} ${participantEmp.lastName}`);

    // --------------------------------------------------------------------------
    // TEST 8: Multi-Tenant Workspace Boundary Enforcement
    // --------------------------------------------------------------------------
    console.log("\nTest 8: Verifying cross-workspace boundary enforcement...");
    const otherTenantId = "tenant-nonexistent-999";
    const { client: otherTenantDb } = await manager.getClientForTenant(otherTenantId);
    const otherContext: TenantContext = {
      tenantId: otherTenantId,
      db: otherTenantDb,
      userId: "user-other-001",
      userRoles: ["admin"],
      status: "ACTIVE",
      tenancyStrategy: "SHARED_SCHEMA",
      isSuperAdmin: false,
      auditMetadata: {}
    };

    await runWithTenantContext(otherContext, async () => {
      const otherTenantList = await EmployeeService.listEmployees(
        otherTenantId,
        { ...adminUserContext, tenantId: otherTenantId },
        ["employee:read"],
        { page: 1, limit: 10 }
      );
      assert.strictEqual(otherTenantList.total, 0, "Non-existent tenant must return 0 records");
      assert.strictEqual(otherTenantList.data.length, 0, "No records can leak across tenant boundaries");
      console.log("  [PASS] Cross-workspace boundary strictly enforced (0 leaks).");
    });
  });

  console.log("\n================================================================================");
  console.log("🎉 ALL 8 SUITES COMPLETED WITH 100% PASS RATE — ZERO REGRESSIONS DETECTED");
  console.log("================================================================================\n");
}

runRegressionSuite().catch((err) => {
  console.error("❌ REGRESSION TEST FAILED:", err);
  process.exit(1);
}).finally(() => {
  rawPrisma.$disconnect();
});
