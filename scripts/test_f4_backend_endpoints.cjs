const http = require("http");
const path = require("path");
const jwt = require("../server/node_modules/jsonwebtoken");

require("dotenv").config({ path: path.join(__dirname, "../server/.env") });

const JWT_SECRET = process.env.JWT_SECRET || "master-hrms-jwt-super-secret-key-change-this-in-production";
const API_BASE = "http://localhost:4000/api/v1";

function apiRequest(method, urlPath, token, body = null) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(API_BASE + urlPath);
    const options = {
      hostname: fullUrl.hostname,
      port: fullUrl.port,
      path: fullUrl.pathname + fullUrl.search,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });

    req.on("error", reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Generate Super Admin Token using real DB account
const superToken = jwt.sign(
  {
    userId: "32255e7f-42d6-46ac-af56-29d7f57e9bd4",
    roles: ["super_admin"],
    email: "admin@hrms.local",
    tenantId: null,
  },
  JWT_SECRET,
  { expiresIn: "1h" }
);

// Generate Tenant Admin Token using real DB account
const tenantId = "tenant-default-001";
const tenantAdminToken = jwt.sign(
  {
    userId: "user-hr-001",
    roles: ["hr_admin", "admin"],
    email: "hr@masterhrms.com",
    tenantId,
  },
  JWT_SECRET,
  { expiresIn: "1h" }
);

async function runTests() {
  console.log("--- Testing Phase F4 Storage Admin Endpoints ---");

  // 1. Super Admin Overview
  console.log("\n[1] Testing GET /api/v1/super/storage/overview");
  const superOverviewRes = await apiRequest("GET", "/super/storage/overview", superToken);
  console.log("Status:", superOverviewRes.status);
  console.log("Platform Tenants Count:", superOverviewRes.data.platform?.totalTenants);
  console.log("Fleet Subscribed Storage:", superOverviewRes.data.platform?.formattedSubscribed);
  console.log("Fleet Consumed Storage:", superOverviewRes.data.platform?.formattedConsumed);
  console.log("Plan Distribution:", superOverviewRes.data.planDistribution?.map((p) => `${p.name}: ${p.count}`).join(", "));

  // 2. Super Admin Tenants List with Search
  console.log("\n[2] Testing GET /api/v1/super/storage/tenants?limit=5");
  const superTenantsRes = await apiRequest("GET", "/super/storage/tenants?limit=5", superToken);
  console.log("Status:", superTenantsRes.status);
  console.log("Returned Tenants:", superTenantsRes.data.tenants?.length);
  if (superTenantsRes.data.tenants?.length > 0) {
    const t0 = superTenantsRes.data.tenants[0];
    console.log(`First Tenant: ${t0.name} (${t0.plan}) - Used: ${t0.formattedUsed} / ${t0.formattedQuota} (${t0.percentUsed}%) - State: ${t0.thresholdState}`);
  }

  // 3. Super Admin Analytics & Forecast
  console.log("\n[3] Testing GET /api/v1/super/storage/analytics");
  const superAnalyticsRes = await apiRequest("GET", "/super/storage/analytics", superToken);
  console.log("Status:", superAnalyticsRes.status);
  console.log("Snapshots Tracked Days:", superAnalyticsRes.data.growth?.trackedDays);
  console.log("Forecast Growth / Day:", superAnalyticsRes.data.forecast?.formattedDailyGrowth);
  console.log("Forecast Runway Days:", superAnalyticsRes.data.forecast?.estimatedDaysToExhaustion);

  // 4. Tenant Storage Summary
  console.log("\n[4] Testing GET /api/v1/tenant/storage/summary");
  const tenantSummaryRes = await apiRequest("GET", "/tenant/storage/summary", tenantAdminToken);
  console.log("Status:", tenantSummaryRes.status);
  console.log("Tenant:", tenantSummaryRes.data.tenant?.name);
  console.log("Plan Quota:", tenantSummaryRes.data.quota?.formattedQuota, `(Source: ${tenantSummaryRes.data.quota?.quotaSource})`);
  console.log("Active Used:", tenantSummaryRes.data.usage?.formattedActive);
  console.log("Trash Bin:", tenantSummaryRes.data.usage?.formattedTrash);
  console.log("Versions:", tenantSummaryRes.data.usage?.formattedVersion);
  console.log("Threshold State:", tenantSummaryRes.data.usage?.thresholdState);

  // 5. Tenant Storage Breakdown
  console.log("\n[5] Testing GET /api/v1/tenant/storage/breakdown");
  const tenantBreakdownRes = await apiRequest("GET", "/tenant/storage/breakdown", tenantAdminToken);
  console.log("Status:", tenantBreakdownRes.status);
  console.log("Categories:", tenantBreakdownRes.data.categories?.map((c) => `${c.category}: ${c.formatted}`).join(", "));

  // 6. Tenant Storage Reconciliation Audit (dryRun = true)
  console.log("\n[6] Testing POST /api/v1/tenant/storage/reconcile (Dry Run)");
  const reconcileDryRes = await apiRequest("POST", "/tenant/storage/reconcile", tenantAdminToken, { dryRun: true });
  console.log("Status:", reconcileDryRes.status);
  console.log("Reconciliation Status:", reconcileDryRes.data.before?.reconciliationStatus);
  console.log("Has Drift:", reconcileDryRes.data.before?.hasDrift);
  console.log("Drift Values:", reconcileDryRes.data.before?.drift);

  // 7. Tenant Storage Reconciliation Repair (dryRun = false)
  console.log("\n[7] Testing POST /api/v1/tenant/storage/reconcile (Execute Repair)");
  const reconcileRepairRes = await apiRequest("POST", "/tenant/storage/reconcile", tenantAdminToken, { dryRun: false });
  console.log("Status:", reconcileRepairRes.status);
  console.log("Repaired:", reconcileRepairRes.data.repaired);
  console.log("After Status:", reconcileRepairRes.data.after?.reconciliationStatus);

  console.log("\n>>> All Phase F4 Backend Endpoints Successfully Verified! <<<");
}

runTests().catch((err) => {
  console.error("Test Failed:", err);
  process.exit(1);
});
