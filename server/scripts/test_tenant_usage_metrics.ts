import { rawPrisma as prisma } from "../src/prisma";
import { TenantUsageMetricsService, formatBytes } from "../src/services/tenant-usage-metrics.service";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";

async function runTestSuite() {
  console.log("=================================================");
  console.log("🧪 TENANT USAGE METRICS AUTHORITATIVE TEST SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. UNIT TEST: formatBytes helper
  console.log("1. UNIT TESTS — Storage Formatting");
  assert(formatBytes(0) === "0 B", "formatBytes(0) returns '0 B'");
  assert(formatBytes(1024) === "1 KB", "formatBytes(1024) returns '1 KB'");
  assert(formatBytes(1024 * 1024 * 5) === "5 MB", "formatBytes(5MB) returns '5 MB'");
  assert(formatBytes(1024 * 1024 * 1024 * 2.5) === "2.5 GB", "formatBytes(2.5GB) returns '2.5 GB'");
  assert(formatBytes(1024 * 1024 * 1024 * 1024) === "1 TB", "formatBytes(1TB) returns '1 TB'");

  // 2. INTEGRATION TEST: getTenantUsageMetricsList
  console.log("\n2. INTEGRATION TESTS — Service List Aggregation");
  const allMetrics = await TenantUsageMetricsService.getTenantUsageMetricsList({ period: "30d" });
  assert(Array.isArray(allMetrics), "getTenantUsageMetricsList returns array");
  assert(allMetrics.length > 0, `Returned ${allMetrics.length} tenant workspaces`);

  if (allMetrics.length > 0) {
    const t0 = allMetrics[0];
    assert(typeof t0.id === "string" && t0.id.length > 0, "Record has valid tenant ID");
    assert(typeof t0.name === "string" && t0.name.length > 0, "Record has valid company name");
    assert(typeof t0.domainUrl === "string" && t0.domainUrl.includes(".masterhrms.com"), "Record has valid domain URL");
    assert(typeof t0.plan === "string", "Record has assigned subscription plan");
    assert(typeof t0.activeUsers === "number" && t0.activeUsers >= 1, `Active users is valid number: ${t0.activeUsers}`);
    assert(typeof t0.totalUsers === "number" && t0.totalUsers >= 1, `Total users is valid number: ${t0.totalUsers}`);
    assert(typeof t0.storageUsedBytes === "number" && t0.storageUsedBytes >= 0, `Storage used bytes measured: ${t0.storageUsedBytes}`);
    assert(typeof t0.storageUsedFormatted === "string" && t0.storageUsedFormatted.length > 0, `Storage formatted: ${t0.storageUsedFormatted}`);
    assert(Array.isArray(t0.mostModuleUsage), "mostModuleUsage is an array");
    assert(["Active", "Suspended", "Expired"].includes(t0.status), `Status is valid lifecycle state: ${t0.status}`);
  }

  // 3. SEARCH FILTER TEST
  console.log("\n3. FILTER TESTS — Search by Company and Domain");
  if (allMetrics.length > 0) {
    const target = allMetrics[0];
    const searched = await TenantUsageMetricsService.getTenantUsageMetricsList({ search: target.name.slice(0, 4) });
    assert(searched.some((s) => s.id === target.id), `Search '${target.name.slice(0, 4)}' matches target tenant`);
  }

  // 4. SORTING TESTS
  console.log("\n4. SORTING TESTS — Validating Sort Order");
  const sortedByActivity = await TenantUsageMetricsService.getTenantUsageMetricsList({ sortBy: "activity_desc" });
  let isSortedActivity = true;
  for (let i = 0; i < sortedByActivity.length - 1; i++) {
    if (sortedByActivity[i].totalActivityScore < sortedByActivity[i + 1].totalActivityScore) {
      isSortedActivity = false;
      break;
    }
  }
  assert(isSortedActivity, "Sort by activity_desc produces non-increasing activity scores");

  const sortedByName = await TenantUsageMetricsService.getTenantUsageMetricsList({ sortBy: "name_asc" });
  let isSortedName = true;
  for (let i = 0; i < sortedByName.length - 1; i++) {
    if (sortedByName[i].name.localeCompare(sortedByName[i + 1].name) > 0) {
      isSortedName = false;
      break;
    }
  }
  assert(isSortedName, "Sort by name_asc produces alphabetical ordering");

  // 5. DEEP TENANT USAGE DETAIL TEST
  console.log("\n5. DEEP USAGE DETAIL TESTS — getTenantUsageDetail");
  if (allMetrics.length > 0) {
    const tenantId = allMetrics[0].id;
    const detail = await TenantUsageMetricsService.getTenantUsageDetail(tenantId, "30d");

    assert(detail.profile.id === tenantId, "Detail profile ID matches requested tenant");
    assert(typeof detail.profile.name === "string", "Profile contains name");
    assert(typeof detail.profile.domainUrl === "string", "Profile contains domainUrl");

    // Storage categories
    assert(typeof detail.storage.totalUsedBytes === "number", "Storage has totalUsedBytes");
    assert(typeof detail.storage.categories === "object", "Storage contains categories object");
    assert("database" in detail.storage.categories, "Storage categories includes database");
    assert("images" in detail.storage.categories, "Storage categories includes images");
    assert("documents" in detail.storage.categories, "Storage categories includes documents");
    assert("videos" in detail.storage.categories, "Storage categories includes videos");
    assert("audio" in detail.storage.categories, "Storage categories includes audio");
    assert("other" in detail.storage.categories, "Storage categories includes other");

    // User & Login telemetry
    assert(typeof detail.userActivity.activeUsers === "number", "User activity contains activeUsers count");
    assert(typeof detail.userActivity.totalLogins === "number", "User activity contains totalLogins count");
    assert(detail.userActivity.averageSessionDuration === null, "Avg session duration is null ('Not available') when untracked");

    // Module usage
    assert(Array.isArray(detail.moduleUsage.records), "Module usage records is an array");

    // Notifications
    assert(typeof detail.notifications.emailsSent === "number", "Notifications includes emailsSent count");
    assert(typeof detail.notifications.emailsFailed === "number", "Notifications includes emailsFailed count");
    assert(detail.notifications.push === null, "Push notification is null (Not configured)");
    assert(detail.notifications.sms === null, "SMS notification is null (Not configured)");
  }

  // 6. HTTP API ROUTE ENDPOINT TEST
  console.log("\n6. HTTP API ENDPOINT TESTS — Super Admin Authorization & Isolation");
  const superAdminUser = await prisma.user.findFirst({
    where: {
      roles: { some: { role: "super_admin" } },
    },
  });

  if (superAdminUser) {
    const token = jwt.sign(
      { id: superAdminUser.id, email: superAdminUser.email, role: "super_admin" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Call GET /api/super/tenant-usage-metrics
    const httpRes = await fetch("http://localhost:4000/api/super/tenant-usage-metrics", {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(httpRes.status === 200, `GET /api/super/tenant-usage-metrics returns 200 OK (Status: ${httpRes.status})`);
    const httpData = await httpRes.json();
    assert(Array.isArray(httpData), "Endpoint returns JSON array of tenant records");

    // Call deep detail endpoint
    if (httpData.length > 0) {
      const detailRes = await fetch(`http://localhost:4000/api/super/tenant-usage-metrics/${httpData[0].id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert(detailRes.status === 200, `GET /api/super/tenant-usage-metrics/:id returns 200 OK (Status: ${detailRes.status})`);
      const detailJson = await detailRes.json();
      assert(detailJson.profile && detailJson.storage && detailJson.userActivity, "Detail payload contains profile, storage, and userActivity");
    }

    // Call without token (Expect 401)
    const unauthorizedRes = await fetch("http://localhost:4000/api/super/tenant-usage-metrics");
    assert(unauthorizedRes.status === 401, `Unauthorized request returns 401 (Status: ${unauthorizedRes.status})`);
  }

  console.log("\n=================================================");
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
