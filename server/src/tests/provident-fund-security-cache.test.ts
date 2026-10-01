import dotenv from "dotenv";
import path from "path";
import http from "http";
import express from "express";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { providentFundRouter, bannedIpRouter, systemMaintenanceRouter } from "../routes/hrm-extensions.routes";
import { isValidIpOrCidr, matchIpOrCidr } from "../lib/ip-firewall";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { requireAuth } from "../middleware/auth";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

async function runTestSuite() {
  console.log("================================================================================");
  console.log("🧪 RUNNING COMPREHENSIVE VERIFICATION: PROVIDENT FUND, BAN IP, & CLEAR CACHE");
  console.log("================================================================================\n");

  const app = express();
  app.use(express.json());

  // Mount routers
  app.use("/api/provident-funds", providentFundRouter);
  app.use("/api/banned-ips", bannedIpRouter);
  app.use("/api/system", systemMaintenanceRouter);

  // Dummy protected tenant endpoint to test real IP firewall blocking
  app.get("/api/test-protected", requireAuth, resolveTenantContext, (req, res) => {
    res.json({ ok: true, message: "Access granted through security firewall." });
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const timestamp = Date.now();
  const tenantAlphaId = `test-pf-alpha-${timestamp}`;
  const tenantBetaId = `test-pf-beta-${timestamp}`;
  const adminAlphaId = `user-adm-a-${timestamp}`;
  const empAlphaId = `user-emp-a-${timestamp}`;
  const adminBetaId = `user-adm-b-${timestamp}`;

  let empRecordAlphaId = "";
  let empRecordBetaId = "";
  let pfRecordId = "";
  let bannedIpRecordId = "";

  try {
    // --------------------------------------------------------------------------
    // Setup test fixtures
    // --------------------------------------------------------------------------
    console.log("▶ [Setup] Provisioning isolated test tenants and users in MySQL...");

    // Create Tenants
    await prisma.tenant.createMany({
      data: [
        { id: tenantAlphaId, name: "Alpha Security & Payroll Corp", slug: `alpha-${timestamp}` },
        { id: tenantBetaId, name: "Beta Independent Holdings", slug: `beta-${timestamp}` },
      ],
    });

    // Create Users & Profiles
    await prisma.user.createMany({
      data: [
        { id: adminAlphaId, email: `admin-alpha-${timestamp}@test.com`, passwordHash: "test" },
        { id: empAlphaId, email: `emp-alpha-${timestamp}@test.com`, passwordHash: "test" },
        { id: adminBetaId, email: `admin-beta-${timestamp}@test.com`, passwordHash: "test" },
      ],
    });

    await prisma.profile.createMany({
      data: [
        { userId: adminAlphaId, fullName: "Alpha Admin", tenantId: tenantAlphaId },
        { userId: empAlphaId, fullName: "Alpha Employee", tenantId: tenantAlphaId },
        { userId: adminBetaId, fullName: "Beta Admin", tenantId: tenantBetaId },
      ],
    });

    await prisma.userRole.createMany({
      data: [
        { userId: adminAlphaId, role: "hr_admin", tenantId: tenantAlphaId },
        { userId: empAlphaId, role: "employee", tenantId: tenantAlphaId },
        { userId: adminBetaId, role: "hr_admin", tenantId: tenantBetaId },
      ],
    });

    // Create Employees
    const empAlpha = await prisma.employee.create({
      data: {
        tenantId: tenantAlphaId,
        firstName: "Alice",
        lastName: "Alpha",
        email: `alice-${timestamp}@alpha.com`,
        employeeCode: `EMP-A-${timestamp.toString().slice(-4)}`,
      },
    });
    empRecordAlphaId = empAlpha.id;

    const empBeta = await prisma.employee.create({
      data: {
        tenantId: tenantBetaId,
        firstName: "Bob",
        lastName: "Beta",
        email: `bob-${timestamp}@beta.com`,
        employeeCode: `EMP-B-${timestamp.toString().slice(-4)}`,
      },
    });
    empRecordBetaId = empBeta.id;

    // Tokens
    const tokenAlphaAdmin = generateToken({ userId: adminAlphaId, email: `admin-alpha-${timestamp}@test.com`, tenantId: tenantAlphaId, roles: ["hr_admin"] });
    const tokenAlphaEmp = generateToken({ userId: empAlphaId, email: `emp-alpha-${timestamp}@test.com`, tenantId: tenantAlphaId, roles: ["employee"] });
    const tokenBetaAdmin = generateToken({ userId: adminBetaId, email: `admin-beta-${timestamp}@test.com`, tenantId: tenantBetaId, roles: ["hr_admin"] });

    // --------------------------------------------------------------------------
    // Test 1: Unit Validation of IP & CIDR formats
    // --------------------------------------------------------------------------
    console.log("▶ [Test 1] Verifying IP & CIDR parsing and matching rules...");
    if (!isValidIpOrCidr("192.168.1.1")) throw new Error("Expected 192.168.1.1 to be valid");
    if (!isValidIpOrCidr("::1")) throw new Error("Expected ::1 to be valid");
    if (!isValidIpOrCidr("2001:db8::1")) throw new Error("Expected IPv6 to be valid");
    if (!isValidIpOrCidr("10.0.0.0/24")) throw new Error("Expected CIDR /24 to be valid");
    if (isValidIpOrCidr("999.999.999.999")) throw new Error("Expected invalid IP to be rejected");
    if (isValidIpOrCidr("10.0.0.0/35")) throw new Error("Expected invalid prefix to be rejected");
    if (isValidIpOrCidr("malicious-host.com")) throw new Error("Expected hostname to be rejected");

    // Matcher
    if (!matchIpOrCidr("192.168.1.50", "192.168.1.0/24")) throw new Error("Expected CIDR /24 to match 192.168.1.50");
    if (matchIpOrCidr("192.168.2.1", "192.168.1.0/24")) throw new Error("Expected CIDR /24 not to match 192.168.2.1");
    if (!matchIpOrCidr("::ffff:192.168.1.1", "192.168.1.1")) throw new Error("Expected IPv4-mapped IPv6 to match IPv4 rule");
    console.log("  -> PASS: All IP and CIDR validation and matcher tests passed.\n");

    // --------------------------------------------------------------------------
    // Test 2: Provident Fund Validation & Cross-Tenant Boundary Protection
    // --------------------------------------------------------------------------
    console.log("▶ [Test 2] Verifying Provident Fund cross-tenant isolation & validation...");

    // Non-admin employee cannot create PF record
    const resForbiddenCreate = await fetch(`${baseUrl}/api/provident-funds`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenAlphaEmp}` },
      body: JSON.stringify({ employeeId: empRecordAlphaId }),
    });
    if (resForbiddenCreate.status !== 403) {
      throw new Error(`Expected 403 for employee creating PF record, got ${resForbiddenCreate.status}`);
    }
    console.log("  -> PASS: Non-admin role blocked with 403 from creating PF records.");

    // Cannot create PF record for an employee belonging to Beta tenant using Alpha admin
    const resCrossTenantEmp = await fetch(`${baseUrl}/api/provident-funds`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenAlphaAdmin}` },
      body: JSON.stringify({ employeeId: empRecordBetaId, pfType: "Employee Provident Fund" }),
    });
    if (resCrossTenantEmp.status !== 400) {
      throw new Error(`Expected 400 when assigning cross-tenant employee, got ${resCrossTenantEmp.status}`);
    }
    console.log("  -> PASS: Cross-tenant employee assignment successfully rejected with 400.");

    // Validation boundary check: share percent > 100%
    const resInvalidPct = await fetch(`${baseUrl}/api/provident-funds`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenAlphaAdmin}` },
      body: JSON.stringify({ employeeId: empRecordAlphaId, employeeSharePercent: 125 }),
    });
    if (resInvalidPct.status !== 400) {
      throw new Error(`Expected 400 for share > 100%, got ${resInvalidPct.status}`);
    }
    console.log("  -> PASS: Share percentage > 100% rejected with 400.");

    // Valid creation
    const resValidCreate = await fetch(`${baseUrl}/api/provident-funds`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenAlphaAdmin}` },
      body: JSON.stringify({
        employeeId: empRecordAlphaId,
        pfType: "Employee Provident Fund",
        employeeSharePercent: 12,
        employeeShareAmount: 1800,
        orgSharePercent: 12,
        orgShareAmount: 1800,
        status: "Approved",
        description: "Statutory EPF deduction",
      }),
    });
    if (!resValidCreate.ok) {
      throw new Error(`Failed to create PF record: ${await resValidCreate.text()}`);
    }
    const createdPf = await resValidCreate.json();
    pfRecordId = createdPf.id;
    console.log("  -> PASS: Valid PF enrollment created successfully in Tenant Alpha.");

    // Verify Tenant Beta CANNOT see Tenant Alpha's PF records (Data Isolation)
    const resBetaList = await fetch(`${baseUrl}/api/provident-funds`, {
      headers: { Authorization: `Bearer ${tokenBetaAdmin}` },
    });
    const betaData = await resBetaList.json();
    if (betaData.data?.some((r: any) => r.id === pfRecordId)) {
      throw new Error("SECURITY FAILURE: Tenant Beta can see Tenant Alpha's PF records!");
    }
    console.log("  -> PASS: Tenant Beta data isolation confirmed (0 cross-tenant leaks).");

    // Summary endpoint accuracy
    const resSummary = await fetch(`${baseUrl}/api/provident-funds/summary`, {
      headers: { Authorization: `Bearer ${tokenAlphaAdmin}` },
    });
    const summaryPayload = await resSummary.json();
    if (summaryPayload.totalEnrolled !== 1 || summaryPayload.approved !== 1) {
      throw new Error(`Summary metric mismatch: ${JSON.stringify(summaryPayload)}`);
    }
    console.log("  -> PASS: Summary metrics correctly aggregate approved PF plans.\n");

    // --------------------------------------------------------------------------
    // Test 3: Banned IP & Active Firewall Enforcement
    // --------------------------------------------------------------------------
    console.log("▶ [Test 3] Verifying Banned IP firewall enforcement and isolation...");

    const testMaliciousIp = "198.51.100.42";

    // Non-banned IP can access protected route
    const resNormalTraffic = await fetch(`${baseUrl}/api/test-protected`, {
      headers: {
        Authorization: `Bearer ${tokenAlphaAdmin}`,
        "x-forwarded-for": "203.0.113.1",
      },
    });
    if (!resNormalTraffic.ok) {
      throw new Error(`Normal traffic failed: ${resNormalTraffic.status}`);
    }
    console.log("  -> PASS: Legitimate client IP successfully allowed through.");

    // Ban the malicious IP in Tenant Alpha
    const resBan = await fetch(`${baseUrl}/api/banned-ips`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenAlphaAdmin}` },
      body: JSON.stringify({
        ipAddress: testMaliciousIp,
        reason: "Suspected automated credential stuffing attacks.",
      }),
    });
    if (!resBan.ok) throw new Error(`Failed to ban IP: ${await resBan.text()}`);
    const bannedRecord = await resBan.json();
    bannedIpRecordId = bannedRecord.id;
    console.log("  -> PASS: IP address added to blacklist.");

    // Now request from testMaliciousIp to Tenant Alpha MUST be rejected with 403 IP_BANNED
    const resBlocked = await fetch(`${baseUrl}/api/test-protected`, {
      headers: {
        Authorization: `Bearer ${tokenAlphaAdmin}`,
        "x-forwarded-for": testMaliciousIp,
      },
    });
    if (resBlocked.status !== 403) {
      throw new Error(`Expected 403 IP_BANNED for blacklisted IP, got: ${resBlocked.status}`);
    }
    const blockedPayload = await resBlocked.json();
    if (blockedPayload.code !== "IP_BANNED") {
      throw new Error(`Expected code IP_BANNED, got: ${JSON.stringify(blockedPayload)}`);
    }
    console.log("  -> PASS: Active firewall intercepted and blocked malicious IP with 403 IP_BANNED.");

    // Tenant Isolation: The same IP visiting Tenant Beta MUST NOT be blocked
    const resBetaTraffic = await fetch(`${baseUrl}/api/test-protected`, {
      headers: {
        Authorization: `Bearer ${tokenBetaAdmin}`,
        "x-forwarded-for": testMaliciousIp,
      },
    });
    if (resBetaTraffic.status !== 200) {
      throw new Error(`Firewall leaked: IP banned in Alpha was also blocked in Beta (${resBetaTraffic.status})`);
    }
    console.log("  -> PASS: Firewall rules are strictly tenant-isolated (Tenant Beta unaffected).\n");

    // --------------------------------------------------------------------------
    // Test 4: Clear Cache Authorization & Real Invalidation
    // --------------------------------------------------------------------------
    console.log("▶ [Test 4] Verifying Clear Cache RBAC and eviction execution...");

    // Employee cannot purge server cache
    const resEmpPurge = await fetch(`${baseUrl}/api/system/clear-cache`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenAlphaEmp}` },
      body: JSON.stringify({ cacheType: "all" }),
    });
    if (resEmpPurge.status !== 403) {
      throw new Error(`Expected 403 for employee purging cache, got: ${resEmpPurge.status}`);
    }
    console.log("  -> PASS: Unauthorized cache purge rejected with 403.");

    // Admin can purge cache
    const resAdminPurge = await fetch(`${baseUrl}/api/system/clear-cache`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenAlphaAdmin}` },
      body: JSON.stringify({ cacheType: "all" }),
    });
    if (!resAdminPurge.ok) {
      throw new Error(`Admin purge failed: ${resAdminPurge.status}`);
    }
    const purgePayload = await resAdminPurge.json();
    if (!purgePayload.success || !purgePayload.memory?.heapUsedMb) {
      throw new Error(`Unexpected cache purge response: ${JSON.stringify(purgePayload)}`);
    }
    console.log(`  -> PASS: Cache cleared successfully (Heap: ${purgePayload.memory.heapUsedMb} MB, Pool evicted: ${purgePayload.evictedConnectionPool}).\n`);

    console.log("================================================================================");
    console.log("✅ ALL COMPREHENSIVE TESTS PASSED (4/4 TEST BLOCKS — 12 INDIVIDUAL ASSERTIONS)");
    console.log("================================================================================\n");
  } finally {
    console.log("Cleaning up test database records...");
    if (pfRecordId) await prisma.providentFundRecord.deleteMany({ where: { id: pfRecordId } });
    if (bannedIpRecordId) await prisma.bannedIp.deleteMany({ where: { id: bannedIpRecordId } });
    if (empRecordAlphaId || empRecordBetaId) {
      await prisma.employee.deleteMany({ where: { id: { in: [empRecordAlphaId, empRecordBetaId].filter(Boolean) } } });
    }
    await prisma.userRole.deleteMany({ where: { userId: { in: [adminAlphaId, empAlphaId, adminBetaId] } } });
    await prisma.profile.deleteMany({ where: { userId: { in: [adminAlphaId, empAlphaId, adminBetaId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [adminAlphaId, empAlphaId, adminBetaId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAlphaId, tenantBetaId] } } });

    server.close();
  }
}

runTestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
  });
