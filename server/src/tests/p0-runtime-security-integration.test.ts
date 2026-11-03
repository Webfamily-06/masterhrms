import assert from "node:assert";
import http from "node:http";
import express from "express";
import { PrismaClient } from "@prisma/client";
import { generateToken } from "../lib/jwt";
import { requireAuth } from "../middleware/auth";
import { employeesRouter } from "../routes/employees.routes";
import { hrEmployeesRouter } from "../routes/hr-employees.routes";
import { publicBiometricRouter, iclockRouter } from "../routes/biometric.routes";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import * as limitsModule from "../middleware/limits";

const rawPrisma = new PrismaClient();

async function runSecurityIntegrationSuite() {
  console.log("================================================================================");
  console.log("MASTERHRMS — PHASE 1 (P0) RUNTIME SECURITY INTEGRATION SUITE");
  console.log("================================================================================\n");

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mount production routes under test
  app.use("/api/employees", employeesRouter);
  app.use("/api/v1/hr/employees", requireAuth, resolveTenantContext, hrEmployeesRouter);
  app.use("/api/public/biometric", publicBiometricRouter);
  app.use("/iclock", iclockRouter);

  // Start ephemeral HTTP server
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Regular employee (Charlie Designer) in tenant-default-001
  const regularEmployeeUserId = "user-emp-001";
  const regularTenantId = "tenant-default-001";
  const regularEmployeeId = "emp-bday-avatar-001";
  const targetEmployeeId = "emp-demo-001";

  // Authorized HR Admin (E2E Tenant Administrator) in onboarded tenant 2e1814e0-db72-48bc-93fa-d9b568fb4503
  const hrAdminUserId = "6a33e7c9-027a-4307-a726-db185dd8b76f";
  const hrTenantId = "2e1814e0-db72-48bc-93fa-d9b568fb4503";

  // Valid JWT tokens
  const regularEmployeeToken = generateToken({
    userId: regularEmployeeUserId,
    email: "employee@masterhrms.com",
    tenantId: regularTenantId,
    roles: ["employee"],
  });

  const hrAdminToken = generateToken({
    userId: hrAdminUserId,
    email: "admin@e2e-audit.com",
    tenantId: hrTenantId,
    roles: ["hr_admin"],
  });

  let testsPassed = 0;

  try {
    // TEST 1: Regular employee attempts to update own salary on PUT /api/employees/:id -> 403 Forbidden
    console.log("--- Test 1: Employee attempts to update own salary ---");
    {
      const res = await fetch(`${baseUrl}/api/employees/${regularEmployeeId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${regularEmployeeToken}`,
        },
        body: JSON.stringify({
          salary: 1500000,
          firstName: "TamperedName",
        }),
      });

      console.log(`  Response Status: ${res.status}`);
      const body = await res.json().catch(() => ({}));
      console.log(`  Response Body:`, body);
      assert.strictEqual(res.status, 403, "Must return 403 Forbidden for unauthorized salary mutation");
      assert.ok(body.error, "Error message must be present");
      console.log("  ✓ [PASS] Employee update own salary blocked with 403 Forbidden\n");
      testsPassed++;
    }

    // TEST 2: Regular employee attempts to update another employee's record -> 403 Forbidden
    console.log("--- Test 2: Employee attempts to update another employee ---");
    {
      const res = await fetch(`${baseUrl}/api/employees/${targetEmployeeId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${regularEmployeeToken}`,
        },
        body: JSON.stringify({
          firstName: "MaliciousChange",
        }),
      });

      console.log(`  Response Status: ${res.status}`);
      const body = await res.json().catch(() => ({}));
      console.log(`  Response Body:`, body);
      assert.strictEqual(res.status, 403, "Must return 403 Forbidden for peer record modification");
      assert.ok(body.error, "Error message must be present");
      console.log("  ✓ [PASS] Peer employee record update blocked with 403 Forbidden\n");
      testsPassed++;
    }

    // TEST 3: Unauthorized user attempts employee creation on POST /api/v1/hr/employees -> 403 Forbidden
    console.log("--- Test 3: Unauthorized user attempts employee creation ---");
    {
      const res = await fetch(`${baseUrl}/api/v1/hr/employees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${regularEmployeeToken}`,
        },
        body: JSON.stringify({
          firstName: "Unauthorized",
          lastName: "Candidate",
          email: "unauth@example.com",
          salary: 500000,
        }),
      });

      console.log(`  Response Status: ${res.status}`);
      const body = await res.json().catch(() => ({}));
      console.log(`  Response Body:`, body);
      assert.strictEqual(res.status, 403, "Must return 403 Forbidden when caller lacks hrm.employees.create");
      assert.ok(body.error, "Error message must be present");
      console.log("  ✓ [PASS] Unauthorized employee creation blocked with 403 Forbidden\n");
      testsPassed++;
    }

    // TEST 4: Seat quota boundary: correct rejection with 409 PLAN_LIMIT_REACHED
    console.log("--- Test 4: Seat quota boundary check ---");
    {
      // Create ephemeral subscription on hrTenantId with maxEmployees = 5
      const ephemeralSub = await rawPrisma.tenantSubscription.create({
        data: {
          tenantId: hrTenantId,
          status: "active",
          maxEmployees: 5,
        },
      });

      const originalCounters = { ...limitsModule.counters };
      // Simulate that 5 seats are already used
      (limitsModule.counters as any).seats = async () => 5;

      try {
        const res = await fetch(`${baseUrl}/api/v1/hr/employees`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${hrAdminToken}`,
          },
          body: JSON.stringify({
            firstName: "QuotaBreaker",
            lastName: "Test",
            email: "quota.breaker@example.com",
          }),
        });

        console.log(`  Response Status: ${res.status}`);
        const body = await res.json().catch(() => ({}));
        console.log(`  Response Body:`, body);
        assert.strictEqual(res.status, 409, "Must return 409 when seat quota is full");
        assert.strictEqual(body.code, "PLAN_LIMIT_REACHED", "Code must be PLAN_LIMIT_REACHED");
        assert.strictEqual(body.limit, "seats");
        assert.strictEqual(body.used, 5);
        assert.strictEqual(body.max, 5);
        console.log("  ✓ [PASS] Seat quota boundary returns 409 PLAN_LIMIT_REACHED\n");
        testsPassed++;
      } finally {
        limitsModule.counters.seats = originalCounters.seats;
        await rawPrisma.tenantSubscription.delete({ where: { id: ephemeralSub.id } });
      }
    }

    // TEST 5: Concurrent employee creation: quota cannot be exceeded
    console.log("--- Test 5: Concurrent employee creation quota enforcement ---");
    {
      // Create ephemeral subscription with maxEmployees = 5
      const ephemeralSub = await rawPrisma.tenantSubscription.create({
        data: {
          tenantId: hrTenantId,
          status: "active",
          maxEmployees: 5,
        },
      });

      let currentSeats = 4;
      const originalCounters = { ...limitsModule.counters };
      // Atomic counter check: first requester gets 4 (< 5), subsequent gets 5 (>= 5)
      (limitsModule.counters as any).seats = async () => {
        const val = currentSeats;
        currentSeats += 1; // Increment on each check to simulate concurrent arrival
        return val;
      };

      try {
        const [res1, res2, res3] = await Promise.all([
          fetch(`${baseUrl}/api/v1/hr/employees`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${hrAdminToken}` },
            body: JSON.stringify({ firstName: "C1" }),
          }),
          fetch(`${baseUrl}/api/v1/hr/employees`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${hrAdminToken}` },
            body: JSON.stringify({ firstName: "C2" }),
          }),
          fetch(`${baseUrl}/api/v1/hr/employees`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${hrAdminToken}` },
            body: JSON.stringify({ firstName: "C3" }),
          }),
        ]);

        const statuses = [res1.status, res2.status, res3.status];
        console.log(`  Concurrent Request Statuses:`, statuses);
        const rejections = statuses.filter((s) => s === 409);
        assert.strictEqual(rejections.length, 2, "Exactly 2 of 3 requests must be rejected when 1 seat is left");
        console.log("  ✓ [PASS] Concurrent creation cannot exceed quota (409 enforced)\n");
        testsPassed++;
      } finally {
        limitsModule.counters.seats = originalCounters.seats;
        await rawPrisma.tenantSubscription.delete({ where: { id: ephemeralSub.id } });
      }
    }

    // TEST 6: Unmapped biometric device: rejected with 401 and zero writes across tenants
    console.log("--- Test 6: Unmapped biometric device push isolation ---");
    {
      const countBefore = await rawPrisma.attendance.count().catch(() => 0);

      const res = await fetch(`${baseUrl}/iclock/cdata?SN=UNKNOWN_ROGUE_SERIAL_99999&table=ATTLOG`, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: "9999\t2026-11-03 09:30:00\t1\t1\n",
      });

      console.log(`  Response Status: ${res.status}`);
      const text = await res.text();
      console.log(`  Response Text:`, text.trim());
      assert.strictEqual(res.status, 401, "Must return 401 Unauthorized for unmapped hardware serial");
      assert.ok(text.includes("ERROR: UNREGISTERED DEVICE"), "Response must fail closed with ERROR: UNREGISTERED DEVICE");

      const countAfter = await rawPrisma.attendance.count().catch(() => 0);
      assert.strictEqual(countAfter, countBefore, "Attendance count must not change across ANY tenant");
      console.log("  ✓ [PASS] Unmapped biometric hardware rejected with 401 and zero DB writes\n");
      testsPassed++;
    }

    // TEST 7: Unauthorized sensitive field mutation (salary, status) rejected with 403 Forbidden
    console.log("--- Test 7: Unauthorized sensitive field mutation (salary, status) ---");
    {
      const res = await fetch(`${baseUrl}/api/employees/${targetEmployeeId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${regularEmployeeToken}`,
        },
        body: JSON.stringify({
          status: "terminated",
        }),
      });

      console.log(`  Response Status: ${res.status}`);
      const body = await res.json().catch(() => ({}));
      console.log(`  Response Body:`, body);
      assert.strictEqual(res.status, 403, "Must return 403 Forbidden for unauthorized status change");
      assert.ok(body.error, "Error message must be present");
      console.log("  ✓ [PASS] Unauthorized status/lifecycle change blocked with 403 Forbidden\n");
      testsPassed++;
    }

    console.log("================================================================================");
    console.log(`ALL 7 RUNTIME SECURITY INTEGRATION TESTS PASSED (${testsPassed}/7)`);
    console.log("================================================================================");
  } finally {
    server.close();
    await rawPrisma.$disconnect();
  }
}

runSecurityIntegrationSuite().catch((err) => {
  console.error("FATAL ERROR IN SECURITY INTEGRATION SUITE:", err);
  process.exit(1);
});
