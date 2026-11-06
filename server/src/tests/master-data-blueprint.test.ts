import assert from "node:assert";
import {
  createMasterDataRouter,
  buildModelSafePayload,
  resolveModelAllowedFields,
  MASTER_DATA_ALLOWED_FIELDS,
} from "../blueprints/master-data.blueprint";
import * as contextModule from "../context/tenant-context";
import { AuditService } from "../services/audit.service";
import { OutboxService } from "../services/outbox.service";

function getHandler(router: any, method: string, path: string) {
  const route = router.stack.find(
    (layer: any) =>
      layer.route &&
      layer.route.path === path &&
      layer.route.methods[method.toLowerCase()]
  );
  if (!route) throw new Error(`Route ${method} ${path} not found`);
  return route.route.stack[route.route.stack.length - 1].handle;
}

function mockResponse() {
  const res: any = {
    statusCode: 200,
    headersSent: false,
    body: null,
  };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.body = data;
    return res;
  };
  return res;
}

async function runTests() {
  console.log("================================================================================");
  console.log("🧪 RUNNING REGRESSION SUITE: MASTER DATA PRISMA SCHEMA & LIFECYCLE RECONCILIATION");
  console.log("================================================================================\n");

  const tenantId = "tenant-master-data-test";
  const userId = "user-hr-admin-001";
  let testsPassed = 0;
  let testsFailed = 0;

  function recordSuccess(name: string) {
    testsPassed++;
    console.log(`  ✓ ${name}`);
  }

  function recordFailure(name: string, error: any) {
    testsFailed++;
    console.error(`  ✗ ${name}:`, error.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Unit Test field allowlists
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const desigFields = resolveModelAllowedFields("designation");
    assert.deepStrictEqual(desigFields, ["name", "description", "departmentId", "status"]);
    assert(!desigFields.includes("updatedBy"), "Designation allowed fields must not include updatedBy");
    assert(!desigFields.includes("createdBy"), "Designation allowed fields must not include createdBy");

    const deptFields = resolveModelAllowedFields("department");
    assert.deepStrictEqual(deptFields, ["name", "description", "branchId", "status"]);
    assert(!deptFields.includes("updatedBy"), "Department allowed fields must not include updatedBy");

    const branchFields = resolveModelAllowedFields("branch");
    assert(branchFields.includes("name") && branchFields.includes("code") && branchFields.includes("status"));
    assert(!branchFields.includes("updatedBy"), "Branch allowed fields must not include updatedBy");

    recordSuccess("resolveModelAllowedFields returns strictly validated scalar fields without updatedBy");
  } catch (err) {
    recordFailure("resolveModelAllowedFields returns strictly validated scalar fields without updatedBy", err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: buildModelSafePayload stripping unauthorized/unsupported fields
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const input = {
      name: "Senior Architect",
      status: "inactive",
      updatedBy: "malicious-actor",
      createdBy: "attacker",
      randomField: 12345,
      tenantId: "tenant-tamper",
      id: "id-tamper",
      createdAt: new Date(),
    };
    const allowed = resolveModelAllowedFields("designation");
    const safe = buildModelSafePayload(input, allowed);

    assert.deepStrictEqual(safe, {
      name: "Senior Architect",
      status: "inactive",
    });
    assert.strictEqual((safe as any).updatedBy, undefined);
    assert.strictEqual((safe as any).createdBy, undefined);
    assert.strictEqual((safe as any).randomField, undefined);
    assert.strictEqual((safe as any).tenantId, undefined);

    recordSuccess("buildModelSafePayload strips unsupported fields (updatedBy, createdBy, etc.)");
  } catch (err) {
    recordFailure("buildModelSafePayload strips unsupported fields (updatedBy, createdBy, etc.)", err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: Designation Update (Activation/De-activation) Without updatedBy
  // ──────────────────────────────────────────────────────────────────────────
  try {
    let updateDataPassed: any = null;
    let auditLogPassed: any = null;
    let outboxPassed: any = null;

    const mockDb: any = {
      designation: {
        findFirst: async (args: any) => {
          if (args.where.id === "desig-1" && args.where.tenantId === tenantId) {
            return { id: "desig-1", tenantId, name: "Staff Engineer", status: "active" };
          }
          return null;
        },
        update: async (args: any) => {
          updateDataPassed = args.data;
          return { id: args.where.id, tenantId, ...args.data };
        },
      },
      auditLog: {
        create: async (args: any) => {
          auditLogPassed = args.data;
          return { id: "audit-123" };
        },
      },
      outboxEvent: {
        create: async (args: any) => {
          outboxPassed = args.data;
          return { id: "outbox-123" };
        },
      },
      $transaction: async (cb: any) => cb(mockDb),
    };

    const origGetTenantDb = contextModule.getTenantDb;
    (contextModule as any).getTenantDb = () => mockDb;

    const origAuditLog = AuditService.logMutation;
    AuditService.logMutation = async (params: any, tx?: any) => {
      auditLogPassed = params;
      return { id: "audit-logged" };
    };

    const origOutbox = OutboxService.createOutboxEvent;
    OutboxService.createOutboxEvent = async (params: any, tx?: any) => {
      outboxPassed = params;
      return { id: "outbox-created" };
    };

    const router = createMasterDataRouter({
      modelName: "designation",
      entityName: "Designation",
      searchFields: ["name"],
      uniqueFields: ["name"],
    });

    const putHandler = getHandler(router, "put", "/:id");
    const req: any = {
      params: { id: "desig-1" },
      user: { userId, tenantId, roles: ["hr_admin"] },
      tenantContext: { db: mockDb },
      body: { status: "inactive", updatedBy: "user-should-be-omitted" },
    };
    const res = mockResponse();

    await putHandler(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(updateDataPassed, { status: "inactive" });
    assert.strictEqual(updateDataPassed.updatedBy, undefined, "updatedBy MUST NOT be passed to tx.designation.update");
    assert.strictEqual(auditLogPassed.actorId, userId, "Audit log must capture actorId");
    assert.strictEqual(auditLogPassed.action, "DESIGNATION_UPDATE");
    assert.strictEqual(auditLogPassed.entityType, "Designation");
    assert.strictEqual(outboxPassed.eventType, "master.designation.updated");

    // Clean up
    (contextModule as any).getTenantDb = origGetTenantDb;
    AuditService.logMutation = origAuditLog;
    OutboxService.createOutboxEvent = origOutbox;

    recordSuccess("PUT /designations/:id updates status to inactive without passing updatedBy to Prisma");
  } catch (err) {
    recordFailure("PUT /designations/:id updates status to inactive without passing updatedBy to Prisma", err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: Department Lifecycle Updates (Active <-> Inactive)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    let updatePayload: any = null;

    const mockDb: any = {
      department: {
        findFirst: async (args: any) => ({
          id: "dept-1",
          tenantId,
          name: "Engineering",
          status: "active",
        }),
        update: async (args: any) => {
          updatePayload = args.data;
          return { id: args.where.id, tenantId, ...args.data };
        },
      },
      auditLog: {
        create: async () => ({ id: "audit-1" }),
      },
      outboxEvent: {
        create: async () => ({ id: "outbox-1" }),
      },
      $transaction: async (cb: any) => cb(mockDb),
    };

    const origGetTenantDb = contextModule.getTenantDb;
    (contextModule as any).getTenantDb = () => mockDb;

    const router = createMasterDataRouter({
      modelName: "department",
      entityName: "Department",
      searchFields: ["name"],
      uniqueFields: ["name"],
    });

    const putHandler = getHandler(router, "put", "/:id");

    // De-activate
    const req1: any = {
      params: { id: "dept-1" },
      user: { userId, tenantId, roles: ["hr_admin"] },
      tenantContext: { db: mockDb },
      body: { status: "inactive" },
    };
    const res1 = mockResponse();
    await putHandler(req1, res1);
    assert.strictEqual(res1.statusCode, 200);
    assert.deepStrictEqual(updatePayload, { status: "inactive" });

    // Re-activate
    const req2: any = {
      params: { id: "dept-1" },
      user: { userId, tenantId, roles: ["hr_admin"] },
      tenantContext: { db: mockDb },
      body: { status: "active" },
    };
    const res2 = mockResponse();
    await putHandler(req2, res2);
    assert.strictEqual(res2.statusCode, 200);
    assert.deepStrictEqual(updatePayload, { status: "active" });

    (contextModule as any).getTenantDb = origGetTenantDb;
    recordSuccess("Department lifecycle activation and de-activation succeeds");
  } catch (err) {
    recordFailure("Department lifecycle activation and de-activation succeeds", err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: Branch Lifecycle Updates
  // ──────────────────────────────────────────────────────────────────────────
  try {
    let branchUpdatePayload: any = null;

    const mockDb: any = {
      branch: {
        findFirst: async (args: any) => ({
          id: "branch-1",
          tenantId,
          name: "Headquarters",
          code: "HQ",
          status: "active",
        }),
        update: async (args: any) => {
          branchUpdatePayload = args.data;
          return { id: args.where.id, tenantId, ...args.data };
        },
      },
      auditLog: {
        create: async () => ({ id: "audit-1" }),
      },
      outboxEvent: {
        create: async () => ({ id: "outbox-1" }),
      },
      $transaction: async (cb: any) => cb(mockDb),
    };

    const origGetTenantDb = contextModule.getTenantDb;
    (contextModule as any).getTenantDb = () => mockDb;

    const router = createMasterDataRouter({
      modelName: "branch",
      entityName: "Branch",
      searchFields: ["name", "code"],
      uniqueFields: ["code"],
    });

    const putHandler = getHandler(router, "put", "/:id");
    const req: any = {
      params: { id: "branch-1" },
      user: { userId, tenantId, roles: ["hr_admin"] },
      tenantContext: { db: mockDb },
      body: { status: "inactive", address: "123 Tech Park Ave" },
    };
    const res = mockResponse();
    await putHandler(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(branchUpdatePayload, {
      status: "inactive",
      address: "123 Tech Park Ave",
    });
    assert.strictEqual(branchUpdatePayload.updatedBy, undefined);

    (contextModule as any).getTenantDb = origGetTenantDb;
    recordSuccess("Branch lifecycle update accepts valid fields without updatedBy");
  } catch (err) {
    recordFailure("Branch lifecycle update accepts valid fields without updatedBy", err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 6: Generic Update Payload Field Validation (Empty / Invalid Payload Rejection)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const mockDb: any = {
      designation: {
        findFirst: async () => ({ id: "desig-1", tenantId, name: "Staff Engineer" }),
      },
    };

    const origGetTenantDb = contextModule.getTenantDb;
    (contextModule as any).getTenantDb = () => mockDb;

    const router = createMasterDataRouter({
      modelName: "designation",
      entityName: "Designation",
    });

    const putHandler = getHandler(router, "put", "/:id");
    const req: any = {
      params: { id: "desig-1" },
      user: { userId, tenantId, roles: ["hr_admin"] },
      tenantContext: { db: mockDb },
      body: { invalidColumn: "hack", randomStuff: 123 },
    };
    const res = mockResponse();
    await putHandler(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert(res.body.error.includes("No valid updatable fields provided"));

    (contextModule as any).getTenantDb = origGetTenantDb;
    recordSuccess("Rejects update request containing only invalid fields with HTTP 400");
  } catch (err) {
    recordFailure("Rejects update request containing only invalid fields with HTTP 400", err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 7: Cross-Tenant Update Rejection (Tenant A cannot update Tenant B)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const mockDb: any = {
      designation: {
        findFirst: async (args: any) => {
          // Record belongs to tenant-b, but tenant-a makes the request
          if (args.where.tenantId === "tenant-a") {
            return null; // Not found under tenant-a scope
          }
          return { id: "desig-tenant-b", tenantId: "tenant-b" };
        },
      },
    };

    const origGetTenantDb = contextModule.getTenantDb;
    (contextModule as any).getTenantDb = () => mockDb;

    const router = createMasterDataRouter({
      modelName: "designation",
      entityName: "Designation",
    });

    const putHandler = getHandler(router, "put", "/:id");
    const req: any = {
      params: { id: "desig-tenant-b" },
      user: { userId: "user-tenant-a", tenantId: "tenant-a", roles: ["hr_admin"] },
      tenantContext: { db: mockDb },
      body: { status: "inactive" },
    };
    const res = mockResponse();
    await putHandler(req, res);

    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.body.error, "Designation not found");

    (contextModule as any).getTenantDb = origGetTenantDb;
    recordSuccess("Cross-tenant update returns HTTP 404 (strictly rejected)");
  } catch (err) {
    recordFailure("Cross-tenant update returns HTTP 404 (strictly rejected)", err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 8: Transaction Rollback on Failure
  // ──────────────────────────────────────────────────────────────────────────
  try {
    let transactionRolledBack = false;

    const mockDb: any = {
      designation: {
        findFirst: async () => ({ id: "desig-1", tenantId, name: "Staff Engineer" }),
        update: async () => {
          throw new Error("Simulated database failure during update");
        },
      },
      $transaction: async (cb: any) => {
        try {
          return await cb(mockDb);
        } catch (e) {
          transactionRolledBack = true;
          throw e;
        }
      },
    };

    const origGetTenantDb = contextModule.getTenantDb;
    (contextModule as any).getTenantDb = () => mockDb;

    const router = createMasterDataRouter({
      modelName: "designation",
      entityName: "Designation",
    });

    const putHandler = getHandler(router, "put", "/:id");
    const req: any = {
      params: { id: "desig-1" },
      user: { userId, tenantId, roles: ["hr_admin"] },
      tenantContext: { db: mockDb },
      body: { status: "inactive" },
    };
    const res = mockResponse();
    await putHandler(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.error, "Simulated database failure during update");
    assert.strictEqual(transactionRolledBack, true);

    (contextModule as any).getTenantDb = origGetTenantDb;
    recordSuccess("Transaction safely rolls back and reports HTTP 400 on database failure");
  } catch (err) {
    recordFailure("Transaction safely rolls back and reports HTTP 400 on database failure", err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 9: Duplicate Name Constraint On Update
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const mockDb: any = {
      department: {
        findFirst: async (args: any) => {
          if (args.where.NOT) {
            // Duplicate check query
            return { id: "dept-2", name: "Engineering" };
          }
          return { id: "dept-1", tenantId, name: "Old Name" };
        },
      },
    };

    const origGetTenantDb = contextModule.getTenantDb;
    (contextModule as any).getTenantDb = () => mockDb;

    const router = createMasterDataRouter({
      modelName: "department",
      entityName: "Department",
      uniqueFields: ["name"],
    });

    const putHandler = getHandler(router, "put", "/:id");
    const req: any = {
      params: { id: "dept-1" },
      user: { userId, tenantId, roles: ["hr_admin"] },
      tenantContext: { db: mockDb },
      body: { name: "Engineering" },
    };
    const res = mockResponse();
    await putHandler(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert(res.body.error.includes("already exists"));

    (contextModule as any).getTenantDb = origGetTenantDb;
    recordSuccess("Prevents duplicate name update within same tenant");
  } catch (err) {
    recordFailure("Prevents duplicate name update within same tenant", err);
  }

  console.log("\n--------------------------------------------------------------------------------");
  console.log(`Summary: ${testsPassed} passed, ${testsFailed} failed`);
  console.log("--------------------------------------------------------------------------------\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
