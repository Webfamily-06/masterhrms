import { PrismaClient } from "@prisma/client";
import http from "http";

const prisma = new PrismaClient();

async function post(path: string, body: any, token?: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Content-Length": String(Buffer.byteLength(data)),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const req = http.request(
      {
        hostname: "localhost",
        port: 4000,
        path,
        method: "POST",
        headers,
      },
      (res) => {
        let resData = "";
        res.on("data", (chunk) => (resData += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode || 500, body: JSON.parse(resData) });
          } catch {
            resolve({ status: res.statusCode || 500, body: resData });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function get(path: string, token: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "localhost",
        port: 4000,
        path,
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
      (res) => {
        let resData = "";
        res.on("data", (chunk) => (resData += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode || 500, body: JSON.parse(resData) });
          } catch {
            resolve({ status: res.statusCode || 500, body: resData });
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

async function runRegressionSuite() {
  console.log("================================================================================");
  console.log("EMPLOYEE COUNT CONSISTENCY & MULTI-TENANT ISOLATION REGRESSION TEST SUITE");
  console.log("Verifying: /employees, /dashboard/hrm-hub, /dashboard/hrm");
  console.log("================================================================================\n");

  const loginRes = await post("/api/auth/login", { email: "admin@masterhrms.com", password: "admin123" });
  if (loginRes.status !== 200) {
    throw new Error(`Failed to log in: ${JSON.stringify(loginRes.body)}`);
  }
  const token = loginRes.body.token;
  const tenantId = "tenant-default-001";

  // Test 1: Verify all 3 endpoints respond with 200 and 0 employees initially
  console.log("▶ [Test 1] Initial empty state consistency across all 3 endpoints...");
  const [emp0, hub0, dsh0] = await Promise.all([
    get("/api/employees", token),
    get("/api/dashboard/hrm-hub", token),
    get("/api/dashboard/hrm", token),
  ]);

  if (emp0.status !== 200 || hub0.status !== 200 || dsh0.status !== 200) {
    throw new Error(`Initial status failure: emp=${emp0.status}, hub=${hub0.status}, dsh=${dsh0.status}`);
  }
  const empCount0 = Array.isArray(emp0.body) ? emp0.body.length : 0;
  const hubCount0 = hub0.body?.totalEmployees ?? -1;
  const dshCount0 = dsh0.body?.totalWorkforce ?? -1;
  if (empCount0 === 0 && hubCount0 === 0 && dshCount0 === 0) {
    console.log("  -> PASS: All 3 endpoints returned HTTP 200 and matched database count (0).");
  } else {
    throw new Error(`Count mismatch at empty state: emp=${empCount0}, hub=${hubCount0}, dsh=${dshCount0}`);
  }

  // Test 2: Active Employee Creation
  console.log("\n▶ [Test 2] Active employee creation & count synchronization...");
  const e1 = await prisma.employee.create({
    data: {
      id: "reg-emp-active-001",
      tenantId,
      employeeCode: "REG-001",
      firstName: "ActiveUser",
      lastName: "One",
      email: "activeuser1@masterhrms.dev",
      position: "Senior Lead",
      status: "active",
      employmentType: "full_time",
    },
  });

  const [emp1, hub1, dsh1] = await Promise.all([
    get("/api/employees", token),
    get("/api/dashboard/hrm-hub", token),
    get("/api/dashboard/hrm", token),
  ]);

  const empCount1 = Array.isArray(emp1.body) ? emp1.body.length : 0;
  const hubCount1 = hub1.body?.totalEmployees ?? -1;
  const dshCount1 = dsh1.body?.totalWorkforce ?? -1;
  if (empCount1 === 1 && hubCount1 === 1 && dshCount1 === 1) {
    console.log("  -> PASS: All 3 endpoints synchronized to exactly 1 active employee.");
  } else {
    throw new Error(`Count mismatch with 1 active: emp=${empCount1}, hub=${hubCount1}, dsh=${dshCount1}`);
  }

  // Test 3: On Leave Employee Creation (Operational workforce includes on_leave)
  console.log("\n▶ [Test 3] On Leave employee inclusion in operational workforce...");
  const e2 = await prisma.employee.create({
    data: {
      id: "reg-emp-leave-002",
      tenantId,
      employeeCode: "REG-002",
      firstName: "LeaveUser",
      lastName: "Two",
      email: "leaveuser2@masterhrms.dev",
      position: "Specialist",
      status: "on_leave",
      employmentType: "full_time",
    },
  });

  const [emp2, hub2, dsh2] = await Promise.all([
    get("/api/employees", token),
    get("/api/dashboard/hrm-hub", token),
    get("/api/dashboard/hrm", token),
  ]);

  const empCount2 = Array.isArray(emp2.body) ? emp2.body.length : 0;
  const hubCount2 = hub2.body?.totalEmployees ?? -1;
  const dshCount2 = dsh2.body?.totalWorkforce ?? -1;
  if (empCount2 === 2 && hubCount2 === 2 && dshCount2 === 2) {
    console.log("  -> PASS: Current operational workforce matches across all 3 endpoints (2 employees).");
  } else {
    throw new Error(`Count mismatch with on_leave: emp=${empCount2}, hub=${hubCount2}, dsh=${dshCount2}`);
  }

  // Test 4: Terminated Employee (Excluded from operational workforce, included in directory totalHeadcount)
  console.log("\n▶ [Test 4] Terminated employee handling...");
  const e3 = await prisma.employee.create({
    data: {
      id: "reg-emp-term-003",
      tenantId,
      employeeCode: "REG-003",
      firstName: "TerminatedUser",
      lastName: "Three",
      email: "termuser3@masterhrms.dev",
      position: "Exited Staff",
      status: "terminated",
      employmentType: "contract",
    },
  });

  const [emp3, hub3, dsh3] = await Promise.all([
    get("/api/employees", token),
    get("/api/dashboard/hrm-hub", token),
    get("/api/dashboard/hrm", token),
  ]);

  const empCount3 = Array.isArray(emp3.body) ? emp3.body.length : 0;
  const hubWorkforce3 = hub3.body?.totalEmployees ?? -1;
  const dshWorkforce3 = dsh3.body?.totalWorkforce ?? -1;
  const hubHeadcount3 = hub3.body?.totalHeadcount ?? -1;
  const dshHeadcount3 = dsh3.body?.totalHeadcount ?? -1;

  if (
    empCount3 === 3 &&
    hubWorkforce3 === 2 &&
    dshWorkforce3 === 2 &&
    hubHeadcount3 === 3 &&
    dshHeadcount3 === 3
  ) {
    console.log("  -> PASS: Operational workforce correctly excludes terminated (2), while total headcount preserves all records (3).");
  } else {
    throw new Error(`Terminated handling mismatch: emp=${empCount3}, hubWF=${hubWorkforce3}, dshWF=${dshWorkforce3}, hubHC=${hubHeadcount3}, dshHC=${dshHeadcount3}`);
  }

  // Test 5: Reactivation of Terminated Employee
  console.log("\n▶ [Test 5] Reactivation of terminated employee...");
  await prisma.employee.update({
    where: { id: "reg-emp-term-003" },
    data: { status: "active" },
  });

  const [emp4, hub4, dsh4] = await Promise.all([
    get("/api/employees", token),
    get("/api/dashboard/hrm-hub", token),
    get("/api/dashboard/hrm", token),
  ]);

  const empCount4 = Array.isArray(emp4.body) ? emp4.body.length : 0;
  const hubCount4 = hub4.body?.totalEmployees ?? -1;
  const dshCount4 = dsh4.body?.totalWorkforce ?? -1;
  if (empCount4 === 3 && hubCount4 === 3 && dshCount4 === 3) {
    console.log("  -> PASS: Reactivated employee reflected as active workforce across all 3 endpoints (3).");
  } else {
    throw new Error(`Reactivation count mismatch: emp=${empCount4}, hub=${hubCount4}, dsh=${dshCount4}`);
  }

  // Test 6: Cross-Tenant Isolation
  console.log("\n▶ [Test 6] Cross-tenant isolation verification...");
  await prisma.employee.create({
    data: {
      id: "reg-emp-foreign-004",
      tenantId: "w2test_tenant_beta",
      employeeCode: "FOREIGN-004",
      firstName: "ForeignWorker",
      lastName: "Beta",
      email: "foreign@beta.local",
      position: "Beta Member",
      status: "active",
      employmentType: "full_time",
    },
  });

  const [emp5, hub5, dsh5] = await Promise.all([
    get("/api/employees", token),
    get("/api/dashboard/hrm-hub", token),
    get("/api/dashboard/hrm", token),
  ]);

  const empCount5 = Array.isArray(emp5.body) ? emp5.body.length : 0;
  const hubCount5 = hub5.body?.totalEmployees ?? -1;
  const dshCount5 = dsh5.body?.totalWorkforce ?? -1;
  if (empCount5 === 3 && hubCount5 === 3 && dshCount5 === 3) {
    console.log("  -> PASS: Foreign tenant records are strictly isolated and invisible (counts remain 3).");
  } else {
    throw new Error(`Isolation breach: emp=${empCount5}, hub=${hubCount5}, dsh=${dshCount5}`);
  }

  // Cleanup
  console.log("\n▶ [Test 7] Cleaning up test records & verifying zero-state restored...");
  await prisma.employee.deleteMany({
    where: {
      id: {
        in: ["reg-emp-active-001", "reg-emp-leave-002", "reg-emp-term-003", "reg-emp-foreign-004"],
      },
    },
  });

  const [empFinal, hubFinal, dshFinal] = await Promise.all([
    get("/api/employees", token),
    get("/api/dashboard/hrm-hub", token),
    get("/api/dashboard/hrm", token),
  ]);
  const finalEmp = Array.isArray(empFinal.body) ? empFinal.body.length : 0;
  const finalHub = hubFinal.body?.totalEmployees ?? -1;
  const finalDsh = dshFinal.body?.totalWorkforce ?? -1;

  if (finalEmp === 0 && finalHub === 0 && finalDsh === 0) {
    console.log("  -> PASS: Clean state restored. All 3 endpoints report 0.");
  } else {
    throw new Error(`Cleanup failed to restore zero state: emp=${finalEmp}, hub=${finalHub}, dsh=${finalDsh}`);
  }

  console.log("\n================================================================================");
  console.log("🏆 ALL 7 REGRESSION ASSERTIONS PASSED WITH 100% MATHEMATICAL CONSISTENCY!");
  console.log("================================================================================\n");
}

runRegressionSuite()
  .catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
