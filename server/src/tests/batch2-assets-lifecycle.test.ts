import { PrismaClient } from "@prisma/client";
import { generateToken } from "../lib/jwt";

const prisma = new PrismaClient();
const API_BASE = "http://localhost:4000/api";

let passedCount = 0;
let failedCount = 0;

function assertTest(condition: boolean, testName: string, details?: any) {
  if (condition) {
    passedCount++;
    console.log(`  ✔ PASS: ${testName}`);
  } else {
    failedCount++;
    console.error(`  ✖ FAIL: ${testName}`, details ? details : "");
  }
}

async function runBatch2AssetLifecycleTests() {
  console.log("================================================================================");
  console.log("MASTERHRMS BATCH 2: ENTERPRISE ASSET REGISTER, LIFECYCLE & SECURITY TEST SUITE");
  console.log("Scope: hr-assets.routes.ts CRUD, Assignment, RBAC, Multi-Tenant & Payroll Safety");
  console.log("================================================================================\n");

  let createdAssetId: string | null = null;
  let testAssignmentId: string | null = null;
  const uniqueTag = `AST-TEST-${Date.now()}`;

  try {
    const tenantAId = "tenant-default-001";
    const tenantBId = "tenant-002";

    // 1. Fetch test users and employee
    const hrUser = await prisma.user.findFirst({
      where: { email: "hr@masterhrms.com" },
      include: { profile: true, roles: true },
    });
    const empUser = await prisma.user.findFirst({
      where: { email: "employee@masterhrms.com" },
      include: { profile: true, roles: true },
    });
    const employeeAlex = await prisma.employee.findFirst({
      where: { tenantId: tenantAId, employeeCode: "EMP-0001" },
    });

    if (!hrUser || !empUser || !employeeAlex) {
      throw new Error("Required test users or employee EMP-0001 not found.");
    }

    const hrToken = generateToken({
      userId: hrUser.id,
      email: hrUser.email,
      tenantId: tenantAId,
      roles: hrUser.roles.map((r) => r.role),
    });

    const empToken = generateToken({
      userId: empUser.id,
      email: empUser.email,
      tenantId: tenantAId,
      roles: empUser.roles.map((r) => r.role),
    });

    // Lookup userB for Tenant B isolation testing
    const userB = await prisma.user.findUnique({
      where: { id: "094c95f9-12cc-4f7b-a433-21ebc58b1f71" },
      include: { profile: true, roles: true },
    });
    if (!userB) {
      throw new Error("Test userB (094c95f9-12cc-4f7b-a433-21ebc58b1f71) not found.");
    }

    const tenantBAdminToken = generateToken({
      userId: userB.id,
      email: userB.email,
      tenantId: userB.profile!.tenantId!,
      roles: userB.roles.map((r) => r.role),
    });

    // =========================================================================
    // GROUP 1: Asset Creation, Retrieval, Updating & Category Listing
    // =========================================================================
    console.log("--- TEST GROUP 1: Asset Creation, Retrieval, Updating & Category Listing ---");

    // List categories
    const catRes = await fetch(`${API_BASE}/v1/hr/assets/types`, {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    assertTest(catRes.status === 200, "GET /hr/assets/types returns 200 OK for HR Admin");
    const categories = await catRes.json();
    assertTest(Array.isArray(categories), "Asset categories is a valid array");

    // Create an Asset
    const createRes = await fetch(`${API_BASE}/v1/hr/assets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hrToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Enterprise ThinkPad P1 Gen 6",
        assetTag: uniqueTag,
        category: "IT Equipment",
        purchasePrice: 2850,
        warranty: "3 Years",
        location: "HQ - Engineering Wing",
        condition: "new",
      }),
    });

    assertTest(createRes.status === 201, "POST /hr/assets creates asset with 201 Created");
    const createdAsset = await createRes.json();
    createdAssetId = createdAsset?.id;
    assertTest(createdAsset?.assetTag === uniqueTag, "Asset tag matches requested uniqueTag");
    assertTest(Number(createdAsset?.purchasePrice) === 2850, "Purchase price persists accurately as 2850");

    // Verify in database directly
    const dbAsset = await prisma.asset.findUnique({ where: { id: createdAssetId! } });
    assertTest(dbAsset !== null && dbAsset.tenantId === tenantAId, "Asset record persisted directly in MySQL under Tenant A");

    // List assets and verify inclusion
    const listRes = await fetch(`${API_BASE}/v1/hr/assets`, {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    assertTest(listRes.status === 200, "GET /hr/assets returns 200 OK");
    const assetList = await listRes.json();
    const foundInList = Array.isArray(assetList) && assetList.some((a: any) => a.id === createdAssetId);
    assertTest(foundInList, "Newly created asset is present in GET /hr/assets list");

    // Get asset by ID
    const getByIdRes = await fetch(`${API_BASE}/v1/hr/assets/${createdAssetId}`, {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    assertTest(getByIdRes.status === 200, "GET /hr/assets/:id returns 200 OK");
    const retrieved = await getByIdRes.json();
    assertTest(retrieved?.name === "Enterprise ThinkPad P1 Gen 6", "Retrieved asset name matches persisted record");

    // Update asset
    const updateRes = await fetch(`${API_BASE}/v1/hr/assets/${createdAssetId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${hrToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        location: "Executive Boardroom Tech Rack",
        condition: "good",
      }),
    });
    assertTest(updateRes.status === 200, "PUT /hr/assets/:id returns 200 OK");
    const updated = await updateRes.json();
    assertTest(updated?.location === "Executive Boardroom Tech Rack", "Asset location successfully updated");

    // =========================================================================
    // GROUP 2: Asset Assignment & Return Workflow (Transactional)
    // =========================================================================
    console.log("\n--- TEST GROUP 2: Asset Assignment & Return Workflow (Transactional) ---");

    // Assign to Alex Morgan (EMP-0001)
    const assignRes = await fetch(`${API_BASE}/v1/hr/assets/${createdAssetId}/assign`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hrToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        employeeId: employeeAlex.id,
        conditionOnAssign: "new",
        notes: "Assigned for high-performance ML workloads",
      }),
    });

    assertTest(assignRes.status === 201, "POST /hr/assets/:id/assign assigns asset with 201 Created");
    const assignment = await assignRes.json();
    testAssignmentId = assignment?.id;
    assertTest(assignment?.status === "active", "Assignment record status is 'active'");

    // Verify Asset status in database is now 'assigned'
    const dbAssetAfterAssign = await prisma.asset.findUnique({ where: { id: createdAssetId! } });
    assertTest(dbAssetAfterAssign?.status === "assigned", "Asset status transitioned to 'assigned'");
    assertTest(dbAssetAfterAssign?.assignedEmployeeId === employeeAlex.id, "Asset assignedEmployeeId is linked to employee");

    // Verify cannot re-assign already assigned asset
    const reassignRes = await fetch(`${API_BASE}/v1/hr/assets/${createdAssetId}/assign`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hrToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ employeeId: employeeAlex.id }),
    });
    assertTest(reassignRes.status === 400, "Attempting to assign an already-assigned asset fails with 400 Bad Request");

    // Return the asset
    const returnRes = await fetch(`${API_BASE}/v1/hr/assets/${createdAssetId}/return`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hrToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        returnCondition: "good",
        returnNotes: "Project completed, returned in perfect condition",
      }),
    });
    assertTest(returnRes.status === 200, "POST /hr/assets/:id/return returns 200 OK");

    // Verify database state after return
    const dbAssetAfterReturn = await prisma.asset.findUnique({ where: { id: createdAssetId! } });
    assertTest(dbAssetAfterReturn?.status === "available", "Asset status transitioned back to 'available'");
    assertTest(dbAssetAfterReturn?.assignedEmployeeId === null, "Asset assignedEmployeeId successfully cleared");

    const dbAssignmentAfterReturn = await prisma.assetAssignment.findUnique({ where: { id: testAssignmentId! } });
    assertTest(dbAssignmentAfterReturn?.status === "returned", "Assignment status transitioned to 'returned'");
    assertTest(dbAssignmentAfterReturn?.returnedAt !== null, "Assignment returnedAt timestamp recorded");

    // =========================================================================
    // GROUP 3: Administrative RBAC & Security Boundaries
    // =========================================================================
    console.log("\n--- TEST GROUP 3: Administrative RBAC & Security Boundaries ---");

    // Regular employee cannot create asset
    const empCreateRes = await fetch(`${API_BASE}/v1/hr/assets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${empToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Unauthorized Employee Device",
        assetTag: `EMP-LEAK-${Date.now()}`,
      }),
    });
    assertTest(empCreateRes.status === 403, "Regular employee blocked from POST /hr/assets with 403 Forbidden");

    // Check DB mutation guard
    const leakedAsset = await prisma.asset.findFirst({
      where: { name: "Unauthorized Employee Device" },
    });
    assertTest(leakedAsset === null, "DB Mutation Guard: Unauthorized asset was NOT created in database");

    // Regular employee cannot list or access overview
    const empListRes = await fetch(`${API_BASE}/v1/hr/assets`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    assertTest(empListRes.status === 403, "Regular employee blocked from GET /hr/assets with 403 Forbidden");

    const empOverviewRes = await fetch(`${API_BASE}/v1/hr/assets/overview`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    assertTest(empOverviewRes.status === 403, "Regular employee blocked from GET /hr/assets/overview with 403 Forbidden");

    // Regular employee cannot assign or delete
    const empAssignRes = await fetch(`${API_BASE}/v1/hr/assets/${createdAssetId}/assign`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${empToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ employeeId: employeeAlex.id }),
    });
    assertTest(empAssignRes.status === 403, "Regular employee blocked from POST /hr/assets/:id/assign with 403 Forbidden");

    const empDeleteRes = await fetch(`${API_BASE}/v1/hr/assets/${createdAssetId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${empToken}` },
    });
    assertTest(empDeleteRes.status === 403, "Regular employee blocked from DELETE /hr/assets/:id with 403 Forbidden");

    // Fail-closed authentication
    const noAuthRes = await fetch(`${API_BASE}/v1/hr/assets`, { method: "GET" });
    assertTest(noAuthRes.status === 401, "Missing Authorization header fails closed with 401 Unauthorized");

    const badAuthRes = await fetch(`${API_BASE}/v1/hr/assets`, {
      headers: { Authorization: "Bearer forged.invalid.token" },
    });
    assertTest(badAuthRes.status === 401, "Forged JWT fails closed with 401 Unauthorized");

    // =========================================================================
    // GROUP 4: Multi-Tenant Data & Mutation Isolation
    // =========================================================================
    console.log("\n--- TEST GROUP 4: Multi-Tenant Data & Mutation Isolation ---");

    // Tenant B Admin cannot see Tenant A's asset
    const tenantBListRes = await fetch(`${API_BASE}/v1/hr/assets`, {
      headers: { Authorization: `Bearer ${tenantBAdminToken}` },
    });
    assertTest(tenantBListRes.status === 200, "Tenant B HR Admin can query their own asset registry");
    const tenantBAssets = await tenantBListRes.json();
    const leakage = Array.isArray(tenantBAssets) && tenantBAssets.some((a: any) => a.id === createdAssetId);
    assertTest(!leakage, "Tenant B asset list has 0 leakage of Tenant A assets");

    // Tenant B Admin cannot get Tenant A asset by ID
    const tenantBGetRes = await fetch(`${API_BASE}/v1/hr/assets/${createdAssetId}`, {
      headers: { Authorization: `Bearer ${tenantBAdminToken}` },
    });
    assertTest(tenantBGetRes.status === 404, "Tenant B querying Tenant A asset ID returns 404 Not Found");

    // Tenant B Admin cannot update Tenant A asset
    const tenantBUpdateRes = await fetch(`${API_BASE}/v1/hr/assets/${createdAssetId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${tenantBAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Hacked by Tenant B" }),
    });
    assertTest(tenantBUpdateRes.status === 404, "Tenant B attempting to update Tenant A asset returns 404 Not Found");

    // Verify name was not modified in database
    const verifyUntouched = await prisma.asset.findUnique({ where: { id: createdAssetId! } });
    assertTest(verifyUntouched?.name === "Enterprise ThinkPad P1 Gen 6", "Cross-tenant mutation strictly blocked (DB value unchanged)");

    // =========================================================================
    // GROUP 5: Integrity Constraints & Edge Cases
    // =========================================================================
    console.log("\n--- TEST GROUP 5: Integrity Constraints & Edge Cases ---");

    // Duplicate assetTag in same tenant rejected
    const dupRes = await fetch(`${API_BASE}/v1/hr/assets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hrToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Conflicting Tag Machine",
        assetTag: uniqueTag,
      }),
    });
    assertTest(dupRes.status === 400, "Duplicate assetTag rejected with 400 Bad Request");

    // Empty name rejected
    const emptyNameRes = await fetch(`${API_BASE}/v1/hr/assets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hrToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "   " }),
    });
    assertTest(emptyNameRes.status === 400, "Blank asset name rejected with 400 Bad Request");

    // Delete available asset
    const deleteRes = await fetch(`${API_BASE}/v1/hr/assets/${createdAssetId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    assertTest(deleteRes.status === 200, "DELETE /hr/assets/:id deletes available asset with 200 OK");

    const dbAssetDeleted = await prisma.asset.findUnique({ where: { id: createdAssetId! } });
    assertTest(dbAssetDeleted === null, "Asset record cleanly removed from database");

    // =========================================================================
    // GROUP 6: Dashboard KPI Aggregates Verification
    // =========================================================================
    console.log("\n--- TEST GROUP 6: Dashboard KPI Aggregates Verification ---");

    const overviewRes = await fetch(`${API_BASE}/v1/hr/assets/overview`, {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    assertTest(overviewRes.status === 200, "GET /hr/assets/overview returns 200 OK");
    const overview = await overviewRes.json();

    const actualCount = await prisma.asset.count({ where: { tenantId: tenantAId } });
    const actualAvailable = await prisma.asset.count({ where: { tenantId: tenantAId, status: "available" } });
    const actualAssigned = await prisma.asset.count({ where: { tenantId: tenantAId, status: "assigned" } });

    assertTest(overview.totalAssets === actualCount, `Overview totalAssets (${overview.totalAssets}) matches MySQL count (${actualCount})`);
    assertTest(overview.availableAssets === actualAvailable, `Overview availableAssets (${overview.availableAssets}) matches MySQL available (${actualAvailable})`);
    assertTest(overview.assignedAssets === actualAssigned, `Overview assignedAssets (${overview.assignedAssets}) matches MySQL assigned (${actualAssigned})`);

    // =========================================================================
    // GROUP 7: Statutory Payroll Immutability Guard
    // =========================================================================
    console.log("\n--- TEST GROUP 7: Statutory Payroll Immutability Guard ---");

    const completedRuns = await prisma.payrollRun.findMany({
      where: { status: "completed" },
    });
    assertTest(completedRuns.length === 2, `Completed payroll runs count unchanged (${completedRuns.length} runs, expected 2)`);
    assertTest(
      completedRuns.every((r) => Number(r.totalAmount) === 50000 && Number(r.totalDeductions) === 2310),
      "Historical payroll gross & deduction totals remain strictly locked and unmodified"
    );

    const publishedPayslips = await prisma.payslip.count({
      where: { status: "published" },
    });
    assertTest(publishedPayslips === 6, `Published payslips count unchanged (${publishedPayslips}, expected 6)`);

    console.log("\n================================================================================");
    console.log(`BATCH 2 ASSET LIFECYCLE TEST RESULTS: ${passedCount} PASSED | ${failedCount} FAILED`);
    console.log("================================================================================");

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error("FATAL BATCH 2 TEST ERROR:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runBatch2AssetLifecycleTests();
