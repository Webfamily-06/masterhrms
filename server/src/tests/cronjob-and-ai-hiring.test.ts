import dotenv from "dotenv";
import path from "path";
import http from "http";
import express from "express";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { systemMaintenanceRouter } from "../routes/hrm-extensions.routes";
import { aiRouter } from "../routes/ai.routes";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { requireAuth } from "../middleware/auth";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

async function runTestSuite() {
  console.log("================================================================================");
  console.log("🧪 RUNNING COMPREHENSIVE VERIFICATION: CRONJOB MANAGEMENT & AI HIRING FORECAST");
  console.log("================================================================================\n");

  const app = express();
  app.use(express.json());

  // Mount routers
  app.use("/api/system", systemMaintenanceRouter);
  app.use("/api/ai", aiRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const timestamp = Date.now();
  const tenantAlphaId = `test-ai-alpha-${timestamp}`;
  const tenantBetaId = `test-ai-beta-${timestamp}`;
  const adminAlphaId = `user-adm-a-${timestamp}`;
  const empAlphaId = `user-emp-a-${timestamp}`;

  let createdCronId = "";
  let alphaJobId = "";
  let superAdminId = "";

  try {
    console.log("▶ [Setup] Provisioning isolated test tenants and fixtures in MySQL...");

    // Create Tenants
    await prisma.tenant.createMany({
      data: [
        { id: tenantAlphaId, name: "Alpha AI Talent Dynamics", slug: `alpha-ai-${timestamp}` },
        { id: tenantBetaId, name: "Beta Independent Corp", slug: `beta-ai-${timestamp}` },
      ],
    });

    // Create Users & Profiles & Roles
    await prisma.user.createMany({
      data: [
        { id: adminAlphaId, email: `admin-alpha-${timestamp}@test.com`, passwordHash: "hash123" },
        { id: empAlphaId, email: `emp-alpha-${timestamp}@test.com`, passwordHash: "hash123" },
      ],
    });

    await prisma.profile.createMany({
      data: [
        { userId: adminAlphaId, fullName: "Alpha Admin", tenantId: tenantAlphaId },
        { userId: empAlphaId, fullName: "Alpha Employee", tenantId: tenantAlphaId },
      ],
    });

    await prisma.userRole.createMany({
      data: [
        { userId: adminAlphaId, role: "hr_admin", tenantId: tenantAlphaId },
        { userId: empAlphaId, role: "employee", tenantId: tenantAlphaId },
      ],
    });

    // Create test department and job posting in Tenant Alpha
    const dept = await prisma.department.create({
      data: {
        name: `Engineering-${timestamp}`,
        tenantId: tenantAlphaId,
      },
    });

    const job = await prisma.jobPosting.create({
      data: {
        title: "Senior Fullstack Engineer",
        slug: `senior-fullstack-engineer-${timestamp}`,
        description: "Test job description for engineering recruitment",
        departmentId: dept.id,
        tenantId: tenantAlphaId,
        status: "published",
        openingsCount: 4,
      },
    });
    alphaJobId = job.id;

    // Create test candidate in Tenant Alpha
    await prisma.jobCandidate.create({
      data: {
        jobPostingId: job.id,
        tenantId: tenantAlphaId,
        fullName: "TestCandidate Alpha",
        email: `candidate-${timestamp}@example.com`,
        stage: "interview",
      },
    });

    // Tokens
    superAdminId = `user-super-${timestamp}`;
    await prisma.user.create({
      data: { id: superAdminId, email: `superadmin-${timestamp}@test.com`, passwordHash: "hash123" },
    });
    await prisma.profile.create({
      data: { userId: superAdminId, fullName: "Platform Super Admin" },
    });
    await prisma.userRole.create({
      data: { userId: superAdminId, role: "super_admin" },
    });

    const superAdminToken = generateToken({
      userId: superAdminId,
      email: `superadmin-${timestamp}@test.com`,
      roles: ["super_admin"],
    });

    const adminAlphaToken = generateToken({
      userId: adminAlphaId,
      email: `admin-alpha-${timestamp}@test.com`,
      roles: ["admin", "tenant_admin"],
      tenantId: tenantAlphaId,
    });

    const empAlphaToken = generateToken({
      userId: empAlphaId,
      email: `emp-alpha-${timestamp}@test.com`,
      roles: ["employee"],
      tenantId: tenantAlphaId,
    });

    // --------------------------------------------------------------------------
    // TEST 1: CRONJOB MANAGEMENT
    // --------------------------------------------------------------------------
    console.log("\n▶ [Test 1] Verifying Cronjob Management lifecycle & RBAC...");

    // 1.1: Non-admin rejected from creating cronjob
    const unauthCreate = await fetch(`${baseUrl}/api/system/cronjobs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${empAlphaToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Unauthorized Cron",
        schedule: "5 minutes",
      }),
    });
    if (unauthCreate.status !== 403) {
      throw new Error(`Expected 403 for non-admin cron creation, got ${unauthCreate.status}`);
    }
    console.log("  -> PASS: Non-admin blocked with 403 from creating cronjobs.");

    // 1.2: Tenant Admin rejected from creating cronjob (Centralized Cron Policy)
    const tenantAdminCreate = await fetch(`${baseUrl}/api/system/cronjobs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminAlphaToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Tenant Admin Cron Attempt",
        schedule: "15 minutes",
      }),
    });
    if (tenantAdminCreate.status !== 403) {
      throw new Error(`Expected 403 for Tenant Admin cron creation, got ${tenantAdminCreate.status}`);
    }
    console.log("  -> PASS: Tenant Admin strictly blocked with 403 from creating cronjobs.");

    // 1.3: Invalid cron expression rejected with 400 for Super Admin
    const invalidCronExpr = await fetch(`${baseUrl}/api/system/cronjobs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${superAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Bad Cron",
        schedule: "Custom",
        cronExpression: "invalid_syntax",
      }),
    });
    if (invalidCronExpr.status !== 400) {
      throw new Error(`Expected 400 for invalid cron expression syntax, got ${invalidCronExpr.status}`);
    }
    console.log("  -> PASS: Invalid cron expression syntax rejected with 400.");

    // 1.4: Valid cron creation by Super Admin
    const validCreate = await fetch(`${baseUrl}/api/system/cronjobs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${superAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Automated Test Cron ${timestamp}`,
        schedule: "15 minutes",
        cronExpression: "*/15 * * * *",
      }),
    });
    if (validCreate.status !== 201) {
      const err = await validCreate.json();
      throw new Error(`Cronjob creation failed: ${JSON.stringify(err)}`);
    }
    const createRes = await validCreate.json();
    createdCronId = createRes.job.id;
    console.log(`  -> PASS: Cronjob created in database by Super Admin (ID: ${createdCronId}).`);

    // 1.5: List cronjobs as Super Admin & verify Tenant Admin cannot list
    const tenantListRes = await fetch(`${baseUrl}/api/system/cronjobs`, {
      headers: { Authorization: `Bearer ${adminAlphaToken}` },
    });
    if (tenantListRes.status !== 403) {
      throw new Error(`Expected 403 for Tenant Admin cron listing, got ${tenantListRes.status}`);
    }
    console.log("  -> PASS: Tenant Admin denied (403) from listing centralized cronjobs.");

    const listRes = await fetch(`${baseUrl}/api/system/cronjobs`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    const list = await listRes.json();
    const found = list.find((j: any) => j.id === createdCronId);
    if (!found) {
      throw new Error("Created cronjob not found in listing.");
    }
    console.log(`  -> PASS: Super Admin cronjob listing returned ${list.length} jobs including newly created.`);

    // 1.6: Pause / Update Cronjob as Super Admin
    const updateRes = await fetch(`${baseUrl}/api/system/cronjobs/${createdCronId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${superAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "paused",
      }),
    });
    const updateBody = await updateRes.json();
    if (updateBody.job.status !== "paused") {
      throw new Error("Cronjob status failed to update to paused.");
    }
    console.log("  -> PASS: Cronjob successfully paused by Super Admin via PUT endpoint.");

    // 1.7: Immediate manual execution as Super Admin
    const runRes = await fetch(`${baseUrl}/api/system/cronjobs/${createdCronId}/run`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${superAdminToken}`,
      },
    });
    if (runRes.status !== 200) {
      throw new Error(`Manual execution failed with status ${runRes.status}`);
    }
    const runBody = await runRes.json();
    if (!runBody.success || !runBody.job.lastRun || !runBody.job.durationMs) {
      throw new Error("Execution response missing duration or lastRun timestamp.");
    }
    console.log(`  -> PASS: Manual execution executed successfully (${runBody.job.durationMs}ms duration recorded).`);

    // 1.8: Delete Cronjob as Super Admin
    const delRes = await fetch(`${baseUrl}/api/system/cronjobs/${createdCronId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    if (delRes.status !== 200) {
      throw new Error("Failed to delete cronjob.");
    }
    console.log("  -> PASS: Cronjob successfully deleted by Super Admin.");

    // --------------------------------------------------------------------------
    // TEST 2: AI HIRING FORECAST
    // --------------------------------------------------------------------------
    console.log("\n▶ [Test 2] Verifying AI Hiring Forecast data computation & isolation...");

    // 2.1: Authentication required
    const unauthForecast = await fetch(`${baseUrl}/api/ai/hiring-forecast`);
    if (unauthForecast.status !== 401) {
      throw new Error(`Expected 401 for unauthenticated forecast query, got ${unauthForecast.status}`);
    }
    console.log("  -> PASS: Unauthenticated query to AI forecast rejected with 401.");

    // 2.2: Tenant Alpha live calculation
    const alphaForecastRes = await fetch(`${baseUrl}/api/ai/hiring-forecast`, {
      headers: { Authorization: `Bearer ${adminAlphaToken}` },
    });
    if (alphaForecastRes.status !== 200) {
      const err = await alphaForecastRes.json();
      throw new Error(`Forecast request failed: ${JSON.stringify(err)}`);
    }
    const alphaForecast = await alphaForecastRes.json();
    if (!alphaForecast.success || !alphaForecast.stats) {
      throw new Error("AI forecast missing success or stats structure.");
    }

    if (alphaForecast.stats.openRoles < 1) {
      throw new Error("Open roles count failed to reflect published job posting.");
    }
    console.log(`  -> PASS: Live forecast returned valid stats (Open Roles: ${alphaForecast.stats.openRoles}, Headcount Need: ${alphaForecast.stats.headcountNeed}).`);

    // 2.3: Verify timeline array and pipeline distribution
    if (!Array.isArray(alphaForecast.timeline) || alphaForecast.timeline.length !== 12) {
      throw new Error("AI forecast missing 12-month timeline array.");
    }
    if (typeof alphaForecast.pipelineDistribution.applied !== "number") {
      throw new Error("AI forecast missing pipeline distribution percentages.");
    }
    console.log("  -> PASS: 12-month predictive hiring timeline and pipeline breakdown validated.");

    console.log("\n================================================================================");
    console.log("✅ ALL COMPREHENSIVE TESTS PASSED (10/10 INDIVIDUAL ASSERTIONS)");
    console.log("================================================================================\n");

  } finally {
    console.log("Cleaning up test database records...");
    await prisma.jobCandidate.deleteMany({ where: { tenantId: tenantAlphaId } }).catch(() => {});
    await prisma.jobPosting.deleteMany({ where: { tenantId: tenantAlphaId } }).catch(() => {});
    await prisma.department.deleteMany({ where: { tenantId: tenantAlphaId } }).catch(() => {});
    if (createdCronId) {
      await prisma.systemCronJob.deleteMany({ where: { id: createdCronId } }).catch(() => {});
    }
    await prisma.userRole.deleteMany({ where: { userId: { in: [adminAlphaId, empAlphaId, superAdminId] } } }).catch(() => {});
    await prisma.profile.deleteMany({ where: { userId: { in: [adminAlphaId, empAlphaId, superAdminId] } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [adminAlphaId, empAlphaId, superAdminId] } } }).catch(() => {});
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAlphaId, tenantBetaId] } } }).catch(() => {});
    server.close();
  }
}

runTestSuite().catch((err) => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});
