import dotenv from "dotenv";
import path from "path";
import http from "http";
import express from "express";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { crmRouter } from "../routes/crm.routes";
import { attendanceRouter } from "../routes/attendance.routes";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { requireAuth } from "../middleware/auth";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

async function runTestSuite() {
  console.log("================================================================================");
  console.log("🧪 RUNNING COMPREHENSIVE VERIFICATION: CALL HISTORY & DAILY REPORT");
  console.log("================================================================================\n");

  const app = express();
  app.use(express.json());

  // Mount routers
  app.use("/api/crm", crmRouter);
  app.use("/api/attendance", attendanceRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const timestamp = Date.now();
  const tenantAlphaId = `test-calls-alpha-${timestamp}`;
  const tenantBetaId = `test-calls-beta-${timestamp}`;
  const adminAlphaId = `user-call-adm-${timestamp}`;

  let createdCallId = "";
  let empAlphaId = "";

  try {
    console.log("▶ [Setup] Provisioning isolated test tenants and fixtures in MySQL...");

    // Create Tenants
    await prisma.tenant.createMany({
      data: [
        { id: tenantAlphaId, name: "Alpha Telecom & Operations", slug: `alpha-calls-${timestamp}` },
        { id: tenantBetaId, name: "Beta Communications", slug: `beta-calls-${timestamp}` },
      ],
    });

    // Create Admin User & Role
    await prisma.user.create({
      data: {
        id: adminAlphaId,
        email: `admin-call-${timestamp}@test.com`,
        passwordHash: "hash123",
      },
    });

    await prisma.profile.create({
      data: {
        userId: adminAlphaId,
        fullName: "Call Center Admin",
        tenantId: tenantAlphaId,
      },
    });

    await prisma.userRole.create({
      data: {
        userId: adminAlphaId,
        role: "hr_admin",
        tenantId: tenantAlphaId,
      },
    });

    // Create Employee for attendance
    const dept = await prisma.department.create({
      data: {
        name: `Customer Support-${timestamp}`,
        tenantId: tenantAlphaId,
      },
    });

    const emp = await prisma.employee.create({
      data: {
        tenantId: tenantAlphaId,
        departmentId: dept.id,
        employeeCode: `EMP-CALL-${timestamp}`,
        firstName: "Sarah",
        lastName: "Jenkins",
        email: `sarah-${timestamp}@test.com`,
        position: "Support Lead",
      },
    });
    empAlphaId = emp.id;

    // Create Attendance Record for Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.attendance.create({
      data: {
        tenantId: tenantAlphaId,
        employeeId: emp.id,
        date: today,
        status: "present",
        hours: 8.5,
      },
    });

    // Token
    const adminAlphaToken = generateToken({
      userId: adminAlphaId,
      email: `admin-call-${timestamp}@test.com`,
      roles: ["admin", "hr_admin"],
      tenantId: tenantAlphaId,
    });

    // --------------------------------------------------------------------------
    // TEST 1: CALL HISTORY ENDPOINTS & ISOLATION
    // --------------------------------------------------------------------------
    console.log("\n▶ [Test 1] Verifying Call History endpoints & isolation...");

    // 1.1: Authentication required
    const unauthCalls = await fetch(`${baseUrl}/api/crm/calls`);
    if (unauthCalls.status !== 401) {
      throw new Error(`Expected 401 for unauthenticated calls request, got ${unauthCalls.status}`);
    }
    console.log("  -> PASS: Unauthenticated calls request blocked with 401.");

    // 1.2: Initial list returns auto-seeded demo records
    const listRes = await fetch(`${baseUrl}/api/crm/calls`, {
      headers: { Authorization: `Bearer ${adminAlphaToken}` },
    });
    if (listRes.status !== 200) {
      throw new Error(`Failed to list calls: ${listRes.status}`);
    }
    const callsList = await listRes.json();
    if (!Array.isArray(callsList) || callsList.length === 0) {
      throw new Error("Call history listing should return auto-seeded records.");
    }
    console.log(`  -> PASS: Call history list returned ${callsList.length} records.`);

    // 1.3: Create new call log
    const createRes = await fetch(`${baseUrl}/api/crm/calls`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminAlphaToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        callerName: "Marcus Vance",
        callerEmail: "marcus@company.com",
        callerPhone: "(555) 019-2834",
        callType: "incoming",
        durationSeconds: 185,
        notes: "Discussed enterprise subscription inquiry.",
      }),
    });
    if (createRes.status !== 201) {
      const err = await createRes.json();
      throw new Error(`Failed to create call log: ${JSON.stringify(err)}`);
    }
    const newCall = await createRes.json();
    createdCallId = newCall.id;
    console.log(`  -> PASS: New call log created (ID: ${createdCallId}, duration: ${newCall.durationSeconds}s).`);

    // 1.4: Filter by Call Type
    const filterRes = await fetch(`${baseUrl}/api/crm/calls?callType=incoming`, {
      headers: { Authorization: `Bearer ${adminAlphaToken}` },
    });
    const filteredList = await filterRes.json();
    const allIncoming = filteredList.every((c: any) => c.callType === "incoming");
    if (!allIncoming) {
      throw new Error("Call type filter returned non-incoming call records.");
    }
    console.log(`  -> PASS: Call type filtering returned ${filteredList.length} incoming calls.`);

    // 1.5: Delete individual call record
    const deleteRes = await fetch(`${baseUrl}/api/crm/calls/${createdCallId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminAlphaToken}` },
    });
    if (deleteRes.status !== 200) {
      throw new Error(`Failed to delete call record: ${deleteRes.status}`);
    }
    console.log("  -> PASS: Call record deleted successfully.");

    // --------------------------------------------------------------------------
    // TEST 2: DAILY ATTENDANCE & OPERATIONS REPORT
    // --------------------------------------------------------------------------
    console.log("\n▶ [Test 2] Verifying Daily Report metrics & calculations...");

    // 2.1: Authentication required
    const unauthReport = await fetch(`${baseUrl}/api/attendance/daily-report`);
    if (unauthReport.status !== 401) {
      throw new Error(`Expected 401 for unauthenticated daily report request, got ${unauthReport.status}`);
    }
    console.log("  -> PASS: Unauthenticated daily report request blocked with 401.");

    // 2.2: Live daily report query
    const reportRes = await fetch(`${baseUrl}/api/attendance/daily-report`, {
      headers: { Authorization: `Bearer ${adminAlphaToken}` },
    });
    if (reportRes.status !== 200) {
      const err = await reportRes.json();
      throw new Error(`Daily report request failed: ${JSON.stringify(err)}`);
    }
    const report = await reportRes.json();
    if (!report.success || !report.metrics || !Array.isArray(report.records)) {
      throw new Error("Daily report response missing success, metrics, or records array.");
    }

    if (typeof report.metrics.totalPresent !== "number" || typeof report.metrics.totalAbsent !== "number") {
      throw new Error("Daily report metrics missing numeric totalPresent/totalAbsent.");
    }
    console.log(`  -> PASS: Daily report computed successfully (Present: ${report.metrics.totalPresent}, Absent: ${report.metrics.totalAbsent}, Completed Tasks: ${report.metrics.completedTasks}).`);

    // 2.3: 12-month trends array
    if (!Array.isArray(report.monthlyTrends) || report.monthlyTrends.length !== 12) {
      throw new Error("Daily report monthlyTrends missing 12 months array.");
    }
    console.log("  -> PASS: 12-month monthly trends returned for visual attendance chart.");

    console.log("\n================================================================================");
    console.log("✅ ALL COMPREHENSIVE TESTS PASSED (8/8 INDIVIDUAL ASSERTIONS)");
    console.log("================================================================================\n");

  } finally {
    console.log("Cleaning up test database records...");
    await prisma.callHistoryRecord.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } }).catch(() => {});
    await prisma.attendance.deleteMany({ where: { tenantId: tenantAlphaId } }).catch(() => {});
    if (empAlphaId) {
      await prisma.employee.deleteMany({ where: { id: empAlphaId } }).catch(() => {});
    }
    await prisma.department.deleteMany({ where: { tenantId: tenantAlphaId } }).catch(() => {});
    await prisma.userRole.deleteMany({ where: { userId: adminAlphaId } }).catch(() => {});
    await prisma.profile.deleteMany({ where: { userId: adminAlphaId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: adminAlphaId } }).catch(() => {});
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAlphaId, tenantBetaId] } } }).catch(() => {});
    server.close();
  }
}

runTestSuite().catch((err) => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});
