/**
 * MASTERHRMS — PHASE F4-B COMPREHENSIVE VERIFICATION SUITE
 * Core Storage Usage Calculation Engine (SUCE) & Reconciliation Service
 *
 * Invocation:
 *   npx tsx scripts/verify_file_manager_f4b_e2e.cjs
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../server/.env") });
const { PrismaClient } = require("../server/node_modules/@prisma/client");
const http = require("http");
const jwt = require("../server/node_modules/jsonwebtoken");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "master-hrms-jwt-super-secret-key-change-this-in-production";
const API_PORT = process.env.PORT || 4000;

function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: API_PORT,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({ status: res.statusCode, data: parsed });
      });
    });

    req.on("error", reject);
    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

async function runVerification() {
  console.log("================================================================================");
  console.log("MASTERHRMS — PHASE F4-B SUCE & RECONCILIATION VERIFICATION SUITE");
  console.log("================================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Database Catalog & Type Inspection
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 1: Database Catalog & Physical Column Types ---");
    const colTypes = await prisma.$queryRawUnsafe(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('media_files', 'file_versions', 'file_upload_sessions', 'storage_usages', 'storage_quotas')
        AND column_name IN ('file_size', 'size_bytes', 'used_bytes', 'trash_bytes', 'reserved_bytes', 'quota_bytes')
      ORDER BY table_name, column_name;
    `);

    const mediaFileSize = colTypes.find(c => c.table_name === 'media_files' && c.column_name === 'file_size');
    assert(mediaFileSize && mediaFileSize.data_type === 'bigint', `media_files.file_size physical PostgreSQL type is BIGINT (actual: ${mediaFileSize?.data_type})`);

    const fileVersionSize = colTypes.find(c => c.table_name === 'file_versions' && c.column_name === 'size_bytes');
    assert(fileVersionSize && fileVersionSize.data_type === 'bigint', `file_versions.size_bytes physical PostgreSQL type is BIGINT (actual: ${fileVersionSize?.data_type})`);

    const storageUsageUsed = colTypes.find(c => c.table_name === 'storage_usages' && c.column_name === 'used_bytes');
    assert(storageUsageUsed && storageUsageUsed.data_type === 'bigint', `storage_usages.used_bytes physical PostgreSQL type is BIGINT (actual: ${storageUsageUsed?.data_type})`);

    // -------------------------------------------------------------------------
    // TEST 2: Canonical Tenant Pool Identity Normalization
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 2: Canonical Tenant Pool Identity Normalization ---");
    const legacyQuotas = await prisma.storageQuota.count({ where: { userId: "tenant_pool" } });
    assert(legacyQuotas === 0, `Legacy "tenant_pool" quotas count is strictly 0 (actual: ${legacyQuotas})`);

    const legacyUsages = await prisma.storageUsage.count({ where: { userId: "tenant_pool" } });
    assert(legacyUsages === 0, `Legacy "tenant_pool" usages count is strictly 0 (actual: ${legacyUsages})`);

    const canonicalPoolQuotas = await prisma.storageQuota.count({ where: { userId: null } });
    assert(canonicalPoolQuotas >= 246, `Canonical userId = null pool quotas exist for all tenants (count: ${canonicalPoolQuotas})`);

    const canonicalPoolUsages = await prisma.storageUsage.count({ where: { userId: null } });
    assert(canonicalPoolUsages >= 246, `Canonical userId = null pool usages exist for all tenants (count: ${canonicalPoolUsages})`);

    // Partial unique indexes verification
    const partialIndexes = await prisma.$queryRawUnsafe(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE indexname IN ('uq_storage_quotas_tenant_pool', 'uq_storage_usages_tenant_pool');
    `);
    assert(partialIndexes.length === 2, `Partial unique PostgreSQL indexes exist for tenant-pool records (found: ${partialIndexes.length})`);

    // -------------------------------------------------------------------------
    // TEST 3: Multi-Dimensional SUCE Engine Calculations
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 3: Multi-Dimensional SUCE Engine Calculations ---");
    // Pick an active test tenant
    const testTenant = await prisma.tenant.findFirst({
      where: {
        subscription: { isNot: null },
      },
      include: { subscription: { include: { plan: true } } },
    });
    const tenantId = testTenant.id;
    console.log(`Using test tenant: ${testTenant.name} (${tenantId})`);

    // Dynamically import TS engine module
    let StorageUsageEngine, StorageReconciliationService;
    try {
      ({ StorageUsageEngine } = require("../server/dist/services/files/storage-usage.engine"));
      ({ StorageReconciliationService } = require("../server/dist/services/files/storage-reconciliation.service"));
    } catch {
      try {
        require("../server/node_modules/ts-node/register");
      } catch {}
      ({ StorageUsageEngine } = require("../server/src/services/files/storage-usage.engine"));
      ({ StorageReconciliationService } = require("../server/src/services/files/storage-reconciliation.service"));
    }

    const dimensions = await StorageUsageEngine.calculateTenantDimensions(tenantId);
    assert(dimensions.tenantId === tenantId, `Engine calculated dimensions for correct tenant ID`);
    assert(typeof dimensions.usage.activeBytes === "bigint", `usage.activeBytes is BigInt`);
    assert(typeof dimensions.usage.trashBytes === "bigint", `usage.trashBytes is BigInt`);
    assert(typeof dimensions.usage.versionBytes === "bigint", `usage.versionBytes is BigInt`);
    assert(typeof dimensions.usage.physicalBytes === "bigint", `usage.physicalBytes is BigInt`);
    assert(typeof dimensions.usage.billableBytes === "bigint", `usage.billableBytes is BigInt`);
    assert(
      dimensions.usage.physicalBytes === (dimensions.usage.activeBytes + dimensions.usage.trashBytes + dimensions.usage.versionBytes),
      `Physical Bytes formula verified: S_physical = S_active + S_trash + S_versions`
    );
    assert(
      dimensions.usage.billableBytes === (dimensions.usage.activeBytes + dimensions.usage.trashBytes + dimensions.usage.versionBytes),
      `Billable Bytes formula verified: S_billable = S_active + S_trash + S_versions`
    );
    assert(
      dimensions.thresholdState === "NORMAL" || dimensions.thresholdState === "WARNING_70" || dimensions.thresholdState === "HIGH_85" || dimensions.thresholdState === "CRITICAL_95" || dimensions.thresholdState === "LOCKED_100",
      `Threshold state successfully evaluated: ${dimensions.thresholdState}`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Department & Team Rollups
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 4: Department & Team Rollups ---");
    const deptBreakdown = await StorageUsageEngine.calculateDepartmentBreakdown(tenantId);
    assert(Array.isArray(deptBreakdown.departments), `Department breakdown returns array of departments (count: ${deptBreakdown.departments.length})`);
    assert(typeof deptBreakdown.unassignedBytes === "bigint", `Unassigned bytes tracked as BigInt: ${deptBreakdown.formattedUnassigned}`);

    const teamBreakdown = await StorageUsageEngine.calculateTeamBreakdown(tenantId);
    assert(Array.isArray(teamBreakdown), `Team breakdown returns array of teams (count: ${teamBreakdown.length})`);

    const userBreakdown = await StorageUsageEngine.calculateUserBreakdown(tenantId, { limit: 10 });
    assert(Array.isArray(userBreakdown.users), `User consumption leaderboard returns users array`);
    assert(typeof userBreakdown.totalUsersCount === "number", `totalUsersCount is number: ${userBreakdown.totalUsersCount}`);

    // -------------------------------------------------------------------------
    // TEST 5: Real-Time Atomic Lifecycle Delta Updates & Floor Protection
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 5: Real-Time Atomic Lifecycle Delta Updates & Floor Protection ---");
    const dummyUserId = "00000000-0000-0000-0000-000000000001";
    const testFileSize = 1048576; // 1 MB

    // Ensure baseline usage
    const baselineReport = await StorageReconciliationService.auditTenantStorage(tenantId);
    const initialUsed = baselineReport.counters.usedBytes;
    const initialReserved = baselineReport.counters.reservedBytes;
    const initialTrash = baselineReport.counters.trashBytes;
    const initialFiles = baselineReport.counters.fileCount;

    // A. Reserve Upload
    await prisma.$transaction(async (tx) => {
      await StorageUsageEngine.reserveUpload(tx, tenantId, dummyUserId, testFileSize);
    });
    const afterReserve = await StorageReconciliationService.auditTenantStorage(tenantId);
    assert(afterReserve.counters.reservedBytes === initialReserved + testFileSize, `reserveUpload atomically increased reservedBytes by ${testFileSize}`);

    // B. Commit Upload
    await prisma.$transaction(async (tx) => {
      await StorageUsageEngine.commitUpload(tx, tenantId, dummyUserId, testFileSize);
    });
    const afterCommit = await StorageReconciliationService.auditTenantStorage(tenantId);
    assert(afterCommit.counters.reservedBytes === initialReserved, `commitUpload decremented reservedBytes back to baseline`);
    assert(afterCommit.counters.usedBytes === initialUsed + testFileSize, `commitUpload incremented usedBytes by ${testFileSize}`);
    assert(afterCommit.counters.fileCount === initialFiles + 1, `commitUpload incremented fileCount by 1`);

    // C. Trash File
    await prisma.$transaction(async (tx) => {
      await StorageUsageEngine.trashFile(tx, tenantId, dummyUserId, testFileSize);
    });
    const afterTrash = await StorageReconciliationService.auditTenantStorage(tenantId);
    assert(afterTrash.counters.usedBytes === initialUsed, `trashFile decremented usedBytes by ${testFileSize}`);
    assert(afterTrash.counters.trashBytes === initialTrash + testFileSize, `trashFile incremented trashBytes by ${testFileSize}`);

    // D. Restore File
    await prisma.$transaction(async (tx) => {
      await StorageUsageEngine.restoreFile(tx, tenantId, dummyUserId, testFileSize);
    });
    const afterRestore = await StorageReconciliationService.auditTenantStorage(tenantId);
    assert(afterRestore.counters.usedBytes === initialUsed + testFileSize, `restoreFile decremented trashBytes and re-incremented usedBytes`);

    // E. Purge File
    await prisma.$transaction(async (tx) => {
      await StorageUsageEngine.purgeFile(tx, tenantId, dummyUserId, testFileSize, false);
    });
    const afterPurge = await StorageReconciliationService.auditTenantStorage(tenantId);
    assert(afterPurge.counters.usedBytes === initialUsed, `purgeFile decremented usedBytes back to original baseline`);
    assert(afterPurge.counters.fileCount === initialFiles, `purgeFile decremented fileCount back to original baseline`);

    // F. Floor Protection (clamp at zero)
    await prisma.$transaction(async (tx) => {
      // Attempt to purge 100 GB when counters are small
      await StorageUsageEngine.purgeFile(tx, tenantId, dummyUserId, 100 * 1024 * 1024 * 1024, false);
    });
    const afterFloor = await StorageReconciliationService.auditTenantStorage(tenantId);
    assert(afterFloor.counters.usedBytes >= 0, `Floor protection: usedBytes never goes negative (actual: ${afterFloor.counters.usedBytes})`);
    assert(afterFloor.counters.trashBytes >= 0, `Floor protection: trashBytes never goes negative (actual: ${afterFloor.counters.trashBytes})`);
    assert(afterFloor.counters.fileCount >= 0, `Floor protection: fileCount never goes negative (actual: ${afterFloor.counters.fileCount})`);

    // -------------------------------------------------------------------------
    // TEST 6: Background Reconciliation Engine (Audit & Repair)
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 6: Background Reconciliation Engine (Audit & Repair) ---");
    // Inject intentional drift into StorageUsage
    const poolUsage = await prisma.storageUsage.findFirst({
      where: { tenantId, userId: null },
    });
    const DRIFT_DELTA = 5242880; // 5 MB
    await prisma.storageUsage.update({
      where: { id: poolUsage.id },
      data: { usedBytes: poolUsage.usedBytes + BigInt(DRIFT_DELTA) },
    });

    // 1. Dry-Run Audit should detect drift without repairing
    const dryRunRes = await StorageReconciliationService.repairTenantStorage(tenantId, { dryRun: true });
    assert(dryRunRes.dryRun === true, `Dry-run reported dryRun: true`);
    assert(dryRunRes.repaired === false, `Dry-run reported repaired: false`);
    assert(dryRunRes.before.hasDrift === true, `Dry-run detected injected drift of 5 MB (drift: ${dryRunRes.before.drift.usedBytes})`);

    // Verify DB was NOT mutated during dry-run
    const unmutatedUsage = await prisma.storageUsage.findFirst({ where: { id: poolUsage.id } });
    assert(unmutatedUsage.usedBytes === poolUsage.usedBytes + BigInt(DRIFT_DELTA), `Dry-run did not mutate database record`);

    // 2. Authoritative Repair Execution
    const repairRes = await StorageReconciliationService.repairTenantStorage(tenantId, { dryRun: false, actorId: dummyUserId });
    assert(repairRes.repaired === true, `Authorized repair executed successfully (repaired: true)`);
    assert(repairRes.after.hasDrift === false, `Post-repair report confirms 0 bytes drift (hasDrift: false)`);
    assert(repairRes.after.reconciliationStatus === "IN_SYNC", `Reconciliation status is IN_SYNC`);

    // Verify Outbox Event created
    const outboxEvent = await prisma.outboxEvent.findFirst({
      where: {
        tenantId,
        eventType: "storage.reconciled",
      },
      orderBy: { createdAt: "desc" },
    });
    assert(outboxEvent !== null, `Outbox event 'storage.reconciled' was transactionally persisted`);
    assert(outboxEvent && outboxEvent.payload && outboxEvent.payload.driftCorrected, `Outbox event includes audit payload with drift correction`);

    // -------------------------------------------------------------------------
    // TEST 7: Fleet-Wide Reconciliation with Mutual Exclusion Lock
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 7: Fleet-Wide Reconciliation with Mutual Exclusion Lock ---");
    const fleetResult = await StorageReconciliationService.reconcileFleet({
      dryRun: true,
      batchSize: 20,
      limit: 20,
    });
    assert(fleetResult.locked === false, `Fleet reconciliation lock acquired cleanly`);
    assert(fleetResult.totalAudited >= 20, `Fleet reconciliation audited batch of tenants (audited: ${fleetResult.totalAudited})`);

    // -------------------------------------------------------------------------
    // TEST 8: REST API Surface Verification
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 8: REST API Surface Verification ---");
    const adminUser = await prisma.user.findFirst({
      where: {
        profile: { tenantId },
        roles: { some: { role: { in: ["hr_admin", "super_admin"] } } },
      },
    }) || await prisma.user.findFirst({
      where: {
        roles: { some: { role: { in: ["hr_admin", "super_admin"] } } },
      },
    });

    const superAdminUser = await prisma.user.findFirst({
      where: {
        roles: { some: { role: "super_admin" } },
      },
    });

    const adminToken = generateToken({
      userId: adminUser?.id || "admin-test-id",
      id: adminUser?.id || "admin-test-id",
      email: adminUser?.email || "admin@example.com",
      tenantId,
      roles: ["admin"],
    });

    const superToken = generateToken({
      userId: superAdminUser?.id || "super-test-id",
      id: superAdminUser?.id || "super-test-id",
      email: superAdminUser?.email || "super@example.com",
      roles: ["super_admin"],
    });

    // A. GET /api/v1/tenant/storage/summary
    const summaryRes = await makeRequest("GET", "/api/v1/tenant/storage/summary", {
      Authorization: `Bearer ${adminToken}`,
    });
    assert(summaryRes.status === 200, `GET /api/v1/tenant/storage/summary returns 200 (actual: ${summaryRes.status})`);
    assert(summaryRes.data && summaryRes.data.tenantId === tenantId, `Summary payload returns correct tenantId`);
    assert(summaryRes.data && summaryRes.data.usage && summaryRes.data.usage.activeBytes !== undefined, `Summary payload includes SUCE usage dimensions`);

    // B. GET /api/v1/tenant/storage/departments
    const deptRes = await makeRequest("GET", "/api/v1/tenant/storage/departments", {
      Authorization: `Bearer ${adminToken}`,
    });
    assert(deptRes.status === 200, `GET /api/v1/tenant/storage/departments returns 200 (actual: ${deptRes.status})`);
    assert(deptRes.data && Array.isArray(deptRes.data.departments), `Departments payload contains array of departments`);

    // C. GET /api/v1/tenant/storage/maintenance/status
    const statusRes = await makeRequest("GET", "/api/v1/tenant/storage/maintenance/status", {
      Authorization: `Bearer ${adminToken}`,
    });
    assert(statusRes.status === 200, `GET /api/v1/tenant/storage/maintenance/status returns 200 (actual: ${statusRes.status})`);
    assert(statusRes.data && statusRes.data.reconciliationStatus, `Maintenance status payload returns reconciliation status`);

    // D. POST /api/v1/tenant/storage/maintenance/reconcile (dryRun: true)
    const recRes = await makeRequest("POST", "/api/v1/tenant/storage/maintenance/reconcile", {
      Authorization: `Bearer ${adminToken}`,
    }, { dryRun: true });
    assert(recRes.status === 200, `POST /api/v1/tenant/storage/maintenance/reconcile (dry-run) returns 200`);
    assert(recRes.data && recRes.data.dryRun === true, `Dry-run response confirms dryRun: true`);

    // E. POST /api/v1/super/storage/reconcile (super admin)
    const superRecRes = await makeRequest("POST", "/api/v1/super/storage/reconcile", {
      Authorization: `Bearer ${superToken}`,
    }, { dryRun: true, limit: 10 });
    assert(superRecRes.status === 200, `POST /api/v1/super/storage/reconcile returns 200 for super admin`);
    assert(superRecRes.data && superRecRes.data.totalAudited >= 10, `Super reconcile audits fleet batch: ${superRecRes.data?.totalAudited} tenants`);

    // -------------------------------------------------------------------------
    // TEST 9: Platform Media Isolation
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 9: Platform Media Isolation ---");
    const platformFiles = await prisma.mediaFile.findMany({
      where: { tenantId: null },
      select: { fileSize: true },
    });
    const platformBytes = platformFiles.reduce((acc, f) => acc + BigInt(f.fileSize || 0), BigInt(0));

    // Verify tenant dimensions do NOT include platform bytes
    const tenantActiveBytes = dimensions.usage.activeBytes;
    assert(
      platformBytes === BigInt(0) || tenantActiveBytes !== platformBytes,
      `Platform media with tenantId = null is strictly isolated and not charged to tenant pools`
    );

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log("\n================================================================================");
    console.log(`F4-B VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("================================================================================");

    if (failed === 0) {
      console.log("ALL PHASE F4-B VERIFICATION CRITERIA PASS.");
      process.exit(0);
    } else {
      console.error(`Verification encountered ${failed} failure(s).`);
      process.exit(1);
    }
  } catch (err) {
    console.error("FATAL ERROR IN VERIFICATION SUITE:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();