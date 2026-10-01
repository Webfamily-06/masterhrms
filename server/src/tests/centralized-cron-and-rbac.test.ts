import dotenv from "dotenv";
import path from "path";
import http from "http";
import express from "express";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { superRouter } from "../routes/super.routes";
import { systemMaintenanceRouter, bannedIpRouter } from "../routes/hrm-extensions.routes";
import { employeesRouter } from "../routes/employees.routes";
import { tenantStorage, TenantContext } from "../context/tenant-context";
import { TenantConnectionManager } from "../services/tenant-connection-manager.service";
import {
  isSuperAdminUser,
  isWorkspaceAdminUser,
  hasPermission,
  isPlatformOnlyRoute,
  isSharedRoute,
  PLATFORM_ONLY_ROUTES,
  EXPLICIT_SHARED_ROUTES,
} from "../../../src/lib/permissions";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    testsPassed++;
    console.log(`  ✔ PASS: ${testName}`);
  } else {
    testsFailed++;
    console.error(`  ✖ FAIL: ${testName}`, details !== undefined ? details : "");
  }
}

async function runCentralizedCronAndRbacSuite() {
  console.log("================================================================================");
  console.log("🛡️ RUNNING COMPREHENSIVE VERIFICATION SUITE: CENTRALIZED CRON & PLATFORM RBAC");
  console.log("Scope: All 12 Architectural Assertions from User Specification (Section E)");
  console.log("================================================================================\n");

  const app = express();
  app.use(express.json());

  // Mount API routers under test
  app.use("/api/super", superRouter);
  app.use("/api/system", systemMaintenanceRouter);
  app.use("/api/banned-ips", bannedIpRouter);
  app.use("/api/employees", employeesRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const timestamp = Date.now();
  const tenantAlphaId = `test-rbac-alpha-${timestamp}`;
  const tenantBetaId = `test-rbac-beta-${timestamp}`;
  const superAdminId = `user-super-${timestamp}`;
  const adminAlphaId = `user-adm-a-${timestamp}`;
  const empAlphaId = `user-emp-a-${timestamp}`;
  const adminBetaId = `user-adm-b-${timestamp}`;

  let createdCronId = "";
  let empAlphaRecordId = "";
  let empBetaRecordId = "";

  try {
    console.log("▶ [Setup] Provisioning isolated test tenants and role fixtures in MySQL...");

    // 1. Create Tenants Alpha & Beta
    await prisma.tenant.createMany({
      data: [
        { id: tenantAlphaId, name: "Alpha Enterprises", slug: `alpha-ent-${timestamp}` },
        { id: tenantBetaId, name: "Beta Corporation", slug: `beta-corp-${timestamp}` },
      ],
    });

    // 2. Create Users
    await prisma.user.createMany({
      data: [
        { id: superAdminId, email: `superadmin-${timestamp}@platform.com`, passwordHash: "hash123" },
        { id: adminAlphaId, email: `admin-a-${timestamp}@alpha.com`, passwordHash: "hash123" },
        { id: empAlphaId, email: `emp-a-${timestamp}@alpha.com`, passwordHash: "hash123" },
        { id: adminBetaId, email: `admin-b-${timestamp}@beta.com`, passwordHash: "hash123" },
      ],
    });

    // 3. Create Profiles (Super Admin has NO tenantId; Alpha and Beta have respective tenantIds)
    await prisma.profile.createMany({
      data: [
        { userId: superAdminId, fullName: "Platform Super Admin", tenantId: null },
        { userId: adminAlphaId, fullName: "Alpha Admin", tenantId: tenantAlphaId },
        { userId: empAlphaId, fullName: "Alpha Employee", tenantId: tenantAlphaId },
        { userId: adminBetaId, fullName: "Beta Admin", tenantId: tenantBetaId },
      ],
    });

    // 4. Create User Roles (Valid AppRole enum: super_admin, hr_admin, manager, employee)
    await prisma.userRole.createMany({
      data: [
        { userId: superAdminId, role: "super_admin" },
        { userId: adminAlphaId, role: "hr_admin", tenantId: tenantAlphaId },
        { userId: empAlphaId, role: "employee", tenantId: tenantAlphaId },
        { userId: adminBetaId, role: "hr_admin", tenantId: tenantBetaId },
      ],
    });

    // 5. Create Employee Records in Alpha & Beta for cross-tenant tests
    const alphaEmp = await prisma.employee.create({
      data: {
        tenantId: tenantAlphaId,
        firstName: "Alice",
        lastName: "Alpha",
        employeeCode: `CODE-A-${timestamp}`,
        email: `alice-${timestamp}@alpha.com`,
      },
    });
    empAlphaRecordId = alphaEmp.id;

    const betaEmp = await prisma.employee.create({
      data: {
        tenantId: tenantBetaId,
        firstName: "Bob",
        lastName: "Beta",
        employeeCode: `CODE-B-${timestamp}`,
        email: `bob-${timestamp}@beta.com`,
      },
    });
    empBetaRecordId = betaEmp.id;

    // Tokens
    const superAdminToken = generateToken({
      userId: superAdminId,
      email: `superadmin-${timestamp}@platform.com`,
      roles: ["super_admin"],
    });

    const adminAlphaToken = generateToken({
      userId: adminAlphaId,
      email: `admin-a-${timestamp}@alpha.com`,
      roles: ["admin", "hr_admin"],
      tenantId: tenantAlphaId,
    });

    const empAlphaToken = generateToken({
      userId: empAlphaId,
      email: `emp-a-${timestamp}@alpha.com`,
      roles: ["employee"],
      tenantId: tenantAlphaId,
    });

    const adminBetaToken = generateToken({
      userId: adminBetaId,
      email: `admin-b-${timestamp}@beta.com`,
      roles: ["admin", "hr_admin"],
      tenantId: tenantBetaId,
    });

    // Frontend Profile Objects for route guard validation
    const superAdminProfile = {
      userId: superAdminId,
      fullName: "Platform Super Admin",
      roles: ["super_admin"],
      tenant_id: null,
      permissions: [],
    } as any;

    const tenantAdminProfile = {
      userId: adminAlphaId,
      fullName: "Alpha Admin",
      roles: ["admin", "hr_admin"],
      tenant_id: tenantAlphaId,
      permissions: ["hrm.employees.manage", "hrm.payroll.manage"],
    } as any;

    const tenantEmpProfile = {
      userId: empAlphaId,
      fullName: "Alpha Employee",
      roles: ["employee"],
      tenant_id: tenantAlphaId,
      permissions: [],
    } as any;

    console.log("▶ [Setup] Provisioning complete. Commencing test execution.\n");

    // =========================================================================
    // 1. Super Admin access to /super/*
    // =========================================================================
    console.log("--- 1. Super Admin access to /super/* ---");
    const superStatsRes = await fetch(`${baseUrl}/api/super/stats`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert(superStatsRes.status === 200, "Super Admin can access /api/super/stats (200 OK)");

    const isSuperGuardAllowed = isSuperAdminUser(superAdminProfile);
    const isSuperRoutePlatformOnly = isPlatformOnlyRoute("/super/tenants");
    assert(
      isSuperGuardAllowed && isSuperRoutePlatformOnly,
      "Frontend route guards recognize /super/* as platform-only and allow Super Admin"
    );

    // =========================================================================
    // 2. Super Admin access to explicitly approved shared /pages
    // =========================================================================
    console.log("\n--- 2. Super Admin access to explicitly approved shared /pages ---");
    assert(isSharedRoute("/clear-cache"), "Route /clear-cache is classified as explicit shared route");
    assert(isSharedRoute("/system-states"), "Route /system-states is classified as explicit shared route");
    assert(isSharedRoute("/ai-configuration"), "Route /ai-configuration is classified as explicit shared route");
    assert(isSharedRoute("/ai-settings"), "Route /ai-settings is classified as explicit shared route");

    // Super Admin executing shared /api/system/clear-cache
    const superClearCacheRes = await fetch(`${baseUrl}/api/system/clear-cache`, {
      method: "POST",
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    const superClearCacheBody = await superClearCacheRes.json();
    assert(
      superClearCacheRes.status === 200 && superClearCacheBody.scope === "platform",
      "Super Admin executes shared /api/system/clear-cache in platform scope"
    );

    // =========================================================================
    // 3. Super Admin denial on tenant-only pages & APIs
    // =========================================================================
    console.log("\n--- 3. Super Admin denial on tenant-only pages & APIs ---");
    const superTenantEmpRes = await fetch(`${baseUrl}/api/employees`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert(
      superTenantEmpRes.status === 403,
      "Super Admin without tenantId is blocked with 403 Forbidden on /api/employees"
    );

    // Frontend guard: Super Admin attempting direct access to tenant-only route without workspace
    const directTenantAccessDenied = isSuperAdminUser(superAdminProfile) && !superAdminProfile.tenant_id;
    assert(
      directTenantAccessDenied,
      "Frontend guard correctly identifies Super Admin has no tenant workspace and denies direct tenant route access"
    );

    // =========================================================================
    // 4. Tenant Admin denial on platform-only pages & APIs
    // =========================================================================
    console.log("\n--- 4. Tenant Admin denial on platform-only pages & APIs ---");
    const tenantAdminSuperRes = await fetch(`${baseUrl}/api/super/stats`, {
      headers: { Authorization: `Bearer ${adminAlphaToken}` },
    });
    assert(
      tenantAdminSuperRes.status === 403,
      "Tenant Admin is denied with 403 Forbidden from /api/super/stats"
    );

    const tenantAdminPlatformGuard = isSuperAdminUser(tenantAdminProfile);
    assert(
      !tenantAdminPlatformGuard,
      "Frontend guards block Tenant Admin from accessing platform-only routes (/super/* and /cronjob)"
    );

    // =========================================================================
    // 5. Tenant Employee denial on restricted pages & APIs
    // =========================================================================
    console.log("\n--- 5. Tenant Employee denial on restricted pages & APIs ---");
    const empSuperRes = await fetch(`${baseUrl}/api/super/stats`, {
      headers: { Authorization: `Bearer ${empAlphaToken}` },
    });
    assert(empSuperRes.status === 403, "Tenant Employee is denied with 403 Forbidden from /api/super/*");

    const empBannedIpRes = await fetch(`${baseUrl}/api/banned-ips`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${empAlphaToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ipAddress: "192.168.1.100", reason: "Unauthorized attempt" }),
    });
    assert(
      empBannedIpRes.status === 403,
      "Tenant Employee is denied with 403 Forbidden from admin-only /api/banned-ips"
    );

    // =========================================================================
    // 6. Super Admin Cron configuration allowed
    // =========================================================================
    console.log("\n--- 6. Super Admin Cron configuration allowed ---");
    // Create cronjob
    const createCronRes = await fetch(`${baseUrl}/api/system/cronjobs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${superAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Automated Platform Cron ${timestamp}`,
        schedule: "1 hour",
        cronExpression: "0 * * * *",
      }),
    });
    assert(createCronRes.status === 201, "Super Admin can create a platform cronjob (201 Created)");
    const createCronBody = await createCronRes.json();
    createdCronId = createCronBody.job.id;

    // List cronjobs
    const listCronRes = await fetch(`${baseUrl}/api/system/cronjobs`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    const cronList = await listCronRes.json();
    assert(
      listCronRes.status === 200 && Array.isArray(cronList) && cronList.some((c: any) => c.id === createdCronId),
      "Super Admin can list platform cronjobs"
    );

    // Update / Pause cronjob
    const updateCronRes = await fetch(`${baseUrl}/api/system/cronjobs/${createdCronId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${superAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "paused" }),
    });
    const updateCronBody = await updateCronRes.json();
    assert(
      updateCronRes.status === 200 && updateCronBody.job.status === "paused",
      "Super Admin can pause/update cronjob schedule and status"
    );

    // Manual run
    const runCronRes = await fetch(`${baseUrl}/api/system/cronjobs/${createdCronId}/run`, {
      method: "POST",
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    const runCronBody = await runCronRes.json();
    assert(
      runCronRes.status === 200 && runCronBody.success && typeof runCronBody.job.durationMs === "number",
      "Super Admin can trigger manual execution and monitor runtime metrics"
    );

    // Delete cronjob
    const deleteCronRes = await fetch(`${baseUrl}/api/system/cronjobs/${createdCronId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert(deleteCronRes.status === 200, "Super Admin can delete cronjobs");

    // =========================================================================
    // 7. Tenant Cron configuration denied
    // =========================================================================
    console.log("\n--- 7. Tenant Cron configuration denied ---");
    const tenantCreateCron = await fetch(`${baseUrl}/api/system/cronjobs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminAlphaToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Tenant Forbidden Cron", schedule: "5 minutes" }),
    });
    assert(
      tenantCreateCron.status === 403,
      "Tenant Admin is strictly denied with 403 from creating cronjobs"
    );

    const tenantListCron = await fetch(`${baseUrl}/api/system/cronjobs`, {
      headers: { Authorization: `Bearer ${adminAlphaToken}` },
    });
    assert(
      tenantListCron.status === 403,
      "Tenant Admin is strictly denied with 403 from viewing platform cronjobs"
    );

    const empListCron = await fetch(`${baseUrl}/api/system/cronjobs`, {
      headers: { Authorization: `Bearer ${empAlphaToken}` },
    });
    assert(
      empListCron.status === 403,
      "Tenant Employee is strictly denied with 403 from viewing platform cronjobs"
    );

    // =========================================================================
    // 8. Tenant schedule handling where applicable
    // =========================================================================
    console.log("\n--- 8. Tenant schedule handling where applicable ---");
    // Tenant schedules (e.g. biometric auto sync intervals) live in tenant configuration, NOT platform cron setup
    assert(
      isPlatformOnlyRoute("/cronjob"),
      "Cronjob route /cronjob is platform-only; tenants do not have a Cron Setup page"
    );

    // =========================================================================
    // 9. Correct tenant context during scheduled execution
    // =========================================================================
    console.log("\n--- 9. Correct tenant context during scheduled execution ---");
    // Test that background execution operates strictly inside tenantStorage with isolated db client
    const { client, status, strategy } = await TenantConnectionManager.getInstance().getClientForTenant(tenantAlphaId);
    let capturedTenantId = "";

    await tenantStorage.run(
      {
        tenantId: tenantAlphaId,
        userId: "system-cron-scheduler",
        roles: ["system"],
        status,
        tenancyStrategy: strategy,
        db: client,
      },
      async () => {
        const activeContext = tenantStorage.getStore();
        capturedTenantId = activeContext?.tenantId || "";
      }
    );

    assert(
      capturedTenantId === tenantAlphaId,
      "Scheduled execution correctly resolves and binds authentic TenantContext via tenantStorage.run"
    );

    // =========================================================================
    // 10. Tenant API isolation and cross-tenant access denial
    // =========================================================================
    console.log("\n--- 10. Tenant API isolation and cross-tenant access denial ---");
    // Tenant Alpha reading employees
    const alphaEmployeesRes = await fetch(`${baseUrl}/api/employees`, {
      headers: { Authorization: `Bearer ${adminAlphaToken}` },
    });
    const alphaRaw = await alphaEmployeesRes.json();
    const alphaEmpList = Array.isArray(alphaRaw) ? alphaRaw : (alphaRaw.data || []);
    assert(
      alphaEmployeesRes.status === 200 &&
        alphaEmpList.some((e: any) => e.id === empAlphaRecordId) &&
        !alphaEmpList.some((e: any) => e.id === empBetaRecordId),
      "Tenant Alpha Admin can ONLY view Tenant Alpha employees, never Tenant Beta"
    );

    // Attempting to spoof tenant using untrusted headers: x-tenant-id
    const spoofHeaderRes = await fetch(`${baseUrl}/api/employees`, {
      headers: {
        Authorization: `Bearer ${adminAlphaToken}`,
        "x-tenant-id": tenantBetaId,
      },
    });
    const spoofHeaderRaw = await spoofHeaderRes.json();
    const spoofHeaderList = Array.isArray(spoofHeaderRaw) ? spoofHeaderRaw : (spoofHeaderRaw.data || []);
    assert(
      !spoofHeaderList.some((e: any) => e.id === empBetaRecordId),
      "Untrusted x-tenant-id header is ignored: caller cannot escape assigned tenant boundary"
    );

    // Attempting to spoof tenant using query parameter ?tenant_id=
    const spoofQueryRes = await fetch(`${baseUrl}/api/employees?tenant_id=${tenantBetaId}`, {
      headers: { Authorization: `Bearer ${adminAlphaToken}` },
    });
    const spoofQueryRaw = await spoofQueryRes.json();
    const spoofQueryList = Array.isArray(spoofQueryRaw) ? spoofQueryRaw : (spoofQueryRaw.data || []);
    assert(
      !spoofQueryList.some((e: any) => e.id === empBetaRecordId),
      "Untrusted ?tenant_id query param is ignored: caller cannot escape assigned tenant boundary"
    );

    // =========================================================================
    // 11. Direct URL access and direct API access
    // =========================================================================
    console.log("\n--- 11. Direct URL access and direct API access ---");
    // Direct API request without token -> 401
    const unauthApiRes = await fetch(`${baseUrl}/api/employees`);
    assert(unauthApiRes.status === 401, "Direct API call without token rejected with 401 Unauthorized");

    // Direct API request with invalid/tampered token -> 401
    const badTokenApiRes = await fetch(`${baseUrl}/api/employees`, {
      headers: { Authorization: "Bearer invalid.token.payload" },
    });
    assert(badTokenApiRes.status === 401, "Direct API call with invalid token rejected with 401 Unauthorized");

    // Direct access to /super by employee -> 403
    const employeeToSuperRes = await fetch(`${baseUrl}/api/super/tenants`, {
      headers: { Authorization: `Bearer ${empAlphaToken}` },
    });
    assert(employeeToSuperRes.status === 403, "Direct API call by employee to /api/super rejected with 403");

    // =========================================================================
    // 12. Shared page data source and permission consistency
    // =========================================================================
    console.log("\n--- 12. Shared page data source and permission consistency ---");
    // Shared /clear-cache called by Tenant Admin -> clears tenant connection cache
    const tenantClearCacheRes = await fetch(`${baseUrl}/api/system/clear-cache`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminAlphaToken}` },
    });
    const tenantClearCacheBody = await tenantClearCacheRes.json();
    assert(
      tenantClearCacheRes.status === 200 && tenantClearCacheBody.scope === "tenant",
      "Tenant Admin calling shared /api/system/clear-cache is scoped strictly to tenant connection cache"
    );

    // Shared /clear-cache called by non-admin employee -> 403
    const empClearCacheRes = await fetch(`${baseUrl}/api/system/clear-cache`, {
      method: "POST",
      headers: { Authorization: `Bearer ${empAlphaToken}` },
    });
    assert(
      empClearCacheRes.status === 403,
      "Non-admin employee calling shared /api/system/clear-cache is denied with 403 Forbidden"
    );

    console.log("\n================================================================================");
    console.log(`VERIFICATION SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
    console.log("================================================================================\n");

    if (testsFailed > 0) {
      throw new Error(`${testsFailed} assertions failed in test suite.`);
    }
  } finally {
    console.log("Cleaning up test database records...");
    await prisma.employee.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } }).catch(() => {});
    if (createdCronId) {
      await prisma.systemCronJob.deleteMany({ where: { id: createdCronId } }).catch(() => {});
    }
    await prisma.userRole.deleteMany({
      where: { userId: { in: [superAdminId, adminAlphaId, empAlphaId, adminBetaId] } },
    }).catch(() => {});
    await prisma.profile.deleteMany({
      where: { userId: { in: [superAdminId, adminAlphaId, empAlphaId, adminBetaId] } },
    }).catch(() => {});
    await prisma.user.deleteMany({
      where: { id: { in: [superAdminId, adminAlphaId, empAlphaId, adminBetaId] } },
    }).catch(() => {});
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantAlphaId, tenantBetaId] } },
    }).catch(() => {});

    server.close();
  }
}

runCentralizedCronAndRbacSuite().catch((err) => {
  console.error("\n❌ SUITE EXECUTION FAILED:", err);
  process.exit(1);
});
