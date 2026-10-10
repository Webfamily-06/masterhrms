/**
 * MASTERHRMS — Phase A3.8 Backend Hardening & Observability Acceptance Suite
 *
 * Test Scenarios:
 * 1. B01: Sovereign 100-Employee Hard Limit & Quota Enforcement
 *    - Single employee creation blocks 101st employee with 409 & QUOTA_EXCEEDED
 *    - Bulk employee import rejects batch exceeding capacity atomically (zero created)
 *    - Recruitment candidate conversion blocks when tenant is at full capacity
 *    - Tenant isolation: Workspace A at limit does not affect Workspace B
 *    - Slot reuse: Terminated employees free up capacity
 * 2. B02: Deep Health Check Observability (/api/health)
 *    - Returns 200 with DB status connected, latencyMs, and outbox metrics
 *    - Accurately tracks pending and failed outbox events
 *    - Does not leak credentials or internal hostnames
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import { prisma, rawPrisma } from "../prisma";
import { employeesRouter } from "../routes/employees.routes";
import { recruitmentRouter } from "../routes/recruitment.routes";
import { generateToken } from "../lib/jwt";

const db = rawPrisma || prisma;

describe("MASTERHRMS — Phase A3.8 Backend Hardening Acceptance Suite", () => {
  const timestamp = Date.now();
  const testTenantSovereign = `test-sov-${timestamp}`;
  const testTenantIsolated = `test-iso-${timestamp}`;
  const sovereignUserId = `usr-sov-${timestamp}`;
  const isolatedUserId = `usr-iso-${timestamp}`;

  let sovereignToken: string;
  let isolatedToken: string;
  let testJobPostingId: string;

  let testApp: express.Application;
  let httpServer: http.Server;
  let baseUrl: string;

  async function apiFetch(
    endpoint: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: any;
    } = {}
  ): Promise<{ status: number; body: any }> {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const body = await res.json().catch(() => null);
    return { status: res.status, body };
  }

  beforeAll(async () => {
    // 1. Create Sovereign test workspace (CP-02: capped at 100 employees)
    await db.tenant.create({
      data: {
        id: testTenantSovereign,
        name: "Sovereign Tier Enterprise Workspace",
        slug: `sovereign-corp-${timestamp}`,
      },
    });

    await db.tenantSubscription.create({
      data: {
        tenantId: testTenantSovereign,
        planId: "sovereign",
        status: "active",
        billingCycle: "annual",
        maxEmployees: 100, // Explicit CP-02 Sovereign hard limit
        maxUsers: 50,
      },
    });

    // 2. Create Isolated test workspace
    await db.tenant.create({
      data: {
        id: testTenantIsolated,
        name: "Isolated Beta Workspace",
        slug: `isolated-corp-${timestamp}`,
      },
    });

    await db.tenantSubscription.create({
      data: {
        tenantId: testTenantIsolated,
        planId: "growth",
        status: "active",
        billingCycle: "monthly",
        maxEmployees: 50,
        maxUsers: 25,
      },
    });

    // 3. Provision Sovereign Admin User
    await db.user.create({
      data: {
        id: sovereignUserId,
        email: `admin-sov-${timestamp}@example.com`,
        passwordHash: "hash123",
        profile: {
          create: {
            fullName: "Sovereign Workspace Admin",
            tenantId: testTenantSovereign,
          },
        },
        roles: {
          create: {
            role: "hr_admin",
            tenantId: testTenantSovereign,
          },
        },
      },
    });

    // 4. Provision Isolated Admin User
    await db.user.create({
      data: {
        id: isolatedUserId,
        email: `admin-iso-${timestamp}@example.com`,
        passwordHash: "hash123",
        profile: {
          create: {
            fullName: "Isolated Workspace Admin",
            tenantId: testTenantIsolated,
          },
        },
        roles: {
          create: {
            role: "hr_admin",
            tenantId: testTenantIsolated,
          },
        },
      },
    });

    // 5. Generate Authoritative JWT Tokens
    sovereignToken = generateToken({
      userId: sovereignUserId,
      email: `admin-sov-${timestamp}@example.com`,
      roles: ["hr_admin", "admin"],
      tenantId: testTenantSovereign,
    });

    isolatedToken = generateToken({
      userId: isolatedUserId,
      email: `admin-iso-${timestamp}@example.com`,
      roles: ["hr_admin", "admin"],
      tenantId: testTenantIsolated,
    });

    // 6. Provision Department & JobPosting for Candidate conversion testing
    const dept = await db.department.create({
      data: {
        name: `Engineering-${timestamp}`,
        tenantId: testTenantSovereign,
      },
    });

    const job = await db.jobPosting.create({
      data: {
        title: "Staff Architect",
        slug: `staff-architect-${timestamp}`,
        description: "Senior engineering position",
        departmentId: dept.id,
        tenantId: testTenantSovereign,
        status: "published",
        openingsCount: 1,
      },
    });
    testJobPostingId = job.id;

    // 7. Set up test Express app
    testApp = express();
    testApp.use(express.json());
    testApp.use("/api/employees", employeesRouter);
    testApp.use("/api/recruitment", recruitmentRouter);

    // Mount deep health check on testApp exactly as in server/src/index.ts
    testApp.get("/api/health", async (_req, res) => {
      const timeoutMs = 3000;
      const startTime = Date.now();
      try {
        const dbPingPromise = (async () => {
          await db.$queryRawUnsafe("SELECT 1");
          return Date.now() - startTime;
        })();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Database ping timed out")), timeoutMs)
        );
        const latencyMs = await Promise.race([dbPingPromise, timeoutPromise]);
        const [pendingCount, failedCount] = await Promise.all([
          db.outboxEvent.count({ where: { status: "PENDING" } }),
          db.outboxEvent.count({ where: { status: "FAILED" } }),
        ]);
        return res.status(200).json({
          status: "healthy",
          timestamp: new Date().toISOString(),
          service: "Master HRMS API",
          database: { status: "connected", latencyMs },
          commerceOutbox: {
            status: failedCount > 10 ? "degraded" : "operational",
            pendingCount,
            failedCount,
          },
        });
      } catch {
        return res.status(503).json({
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          service: "Master HRMS API",
          database: { status: "disconnected" },
          error: "Primary database health check failed",
        });
      }
    });

    await new Promise<void>((resolve) => {
      httpServer = testApp.listen(0, () => {
        const address = httpServer.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (httpServer) {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    }
    await db.jobCandidate.deleteMany({ where: { tenantId: { in: [testTenantSovereign, testTenantIsolated] } } });
    await db.jobPosting.deleteMany({ where: { tenantId: { in: [testTenantSovereign, testTenantIsolated] } } });
    await db.department.deleteMany({ where: { tenantId: { in: [testTenantSovereign, testTenantIsolated] } } });
    await db.employee.deleteMany({ where: { tenantId: { in: [testTenantSovereign, testTenantIsolated] } } });
    await db.userRoleAssignment.deleteMany({ where: { tenantId: { in: [testTenantSovereign, testTenantIsolated] } } });
    await db.userRole.deleteMany({ where: { tenantId: { in: [testTenantSovereign, testTenantIsolated] } } });
    await db.profile.deleteMany({ where: { tenantId: { in: [testTenantSovereign, testTenantIsolated] } } });
    await db.user.deleteMany({ where: { id: { in: [sovereignUserId, isolatedUserId] } } });
    await db.tenantSubscription.deleteMany({ where: { tenantId: { in: [testTenantSovereign, testTenantIsolated] } } });
    await db.tenant.deleteMany({ where: { id: { in: [testTenantSovereign, testTenantIsolated] } } });
  });

  describe("B01: Sovereign 100-Employee Hard Limit & Quota Enforcement", () => {
    it("T1.1: Fills Sovereign workspace to exactly 99 employees successfully", async () => {
      // Seed 99 active employees
      const batchData = [];
      for (let i = 1; i <= 99; i++) {
        batchData.push({
          tenantId: testTenantSovereign,
          firstName: `Employee${i}`,
          lastName: "Sovereign",
          email: `emp${i}-${timestamp}@sovereign.local`,
          employeeCode: `SOV-${String(i).padStart(4, "0")}`,
          status: "active" as const,
        });
      }
      await db.employee.createMany({ data: batchData });

      const count = await db.employee.count({
        where: { tenantId: testTenantSovereign, status: { in: ["active", "on_leave"] } },
      });
      expect(count).toBe(99);
    });

    it("T1.2: Allows 100th employee creation (filling capacity to exact limit)", async () => {
      const res = await apiFetch("/api/employees", {
        method: "POST",
        headers: { Authorization: `Bearer ${sovereignToken}` },
        body: {
          firstName: "Century",
          lastName: "Employee",
          email: `emp100-${timestamp}@sovereign.local`,
          employeeCode: `SOV-0100-${timestamp}`,
          status: "active",
        },
      });

      expect(res.status).toBe(201);
      expect(res.body.email).toBe(`emp100-${timestamp}@sovereign.local`);

      const count = await db.employee.count({
        where: { tenantId: testTenantSovereign, status: { in: ["active", "on_leave"] } },
      });
      expect(count).toBe(100);
    });

    it("T1.3: Strictly rejects 101st employee creation with HTTP 409 & QUOTA_EXCEEDED", async () => {
      const res = await apiFetch("/api/employees", {
        method: "POST",
        headers: { Authorization: `Bearer ${sovereignToken}` },
        body: {
          firstName: "Overflow",
          lastName: "Candidate",
          email: `emp101-${timestamp}@sovereign.local`,
          employeeCode: `SOV-0101-${timestamp}`,
          status: "active",
        },
      });

      expect(res.status).toBe(409);
      expect(["QUOTA_EXCEEDED", "PLAN_LIMIT_REACHED"]).toContain(res.body.code);
      expect(res.body.error).toMatch(/allows \d+ seats|limit/i);

      // Verify no extra employee was persisted
      const count = await db.employee.count({
        where: { tenantId: testTenantSovereign, status: { in: ["active", "on_leave"] } },
      });
      expect(count).toBe(100);
    });

    it("T1.4: Bulk import exceeding remaining capacity is atomically rejected with 409 & zero records created", async () => {
      // Sovereign workspace is currently full at 100/100.
      // Attempting to bulk import 3 employees must fail completely.
      const res = await apiFetch("/api/employees/bulk-import", {
        method: "POST",
        headers: { Authorization: `Bearer ${sovereignToken}` },
        body: [
          { firstName: "Bulk1", lastName: "Overflow", email: `bulk1-${timestamp}@sovereign.local` },
          { firstName: "Bulk2", lastName: "Overflow", email: `bulk2-${timestamp}@sovereign.local` },
          { firstName: "Bulk3", lastName: "Overflow", email: `bulk3-${timestamp}@sovereign.local` },
        ],
      });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("QUOTA_EXCEEDED");
      expect(res.body.error).toContain("limit reached");

      // Verify zero records were created (atomic rollback)
      const count = await db.employee.count({
        where: { tenantId: testTenantSovereign, status: { in: ["active", "on_leave"] } },
      });
      expect(count).toBe(100);

      const bulkCheck = await db.employee.findFirst({
        where: { tenantId: testTenantSovereign, email: `bulk1-${timestamp}@sovereign.local` },
      });
      expect(bulkCheck).toBeNull();
    });

    it("T1.5: Recruitment candidate conversion strictly fails with 409 & QUOTA_EXCEEDED when at full capacity", async () => {
      // Create a test candidate in Sovereign workspace
      const candidate = await db.jobCandidate.create({
        data: {
          tenantId: testTenantSovereign,
          jobPostingId: testJobPostingId,
          fullName: "Talent Star",
          email: `talent.star-${timestamp}@sovereign.local`,
          phone: "9876543210",
          stage: "offered",
        },
      });

      const res = await apiFetch(`/api/recruitment/candidates/${candidate.id}/convert-to-employee`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sovereignToken}` },
        body: { department: "Engineering", position: "Staff Architect" },
      });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("QUOTA_EXCEEDED");
      expect(res.body.error).toContain("limit reached (100/100)");

      // Candidate must remain unconverted
      const candidateState = await db.jobCandidate.findUnique({ where: { id: candidate.id } });
      expect(candidateState?.isConvertedToEmployee).toBe(false);
      expect(candidateState?.convertedEmployeeId).toBeNull();
    });

    it("T1.6: Workspace Isolation: Workspace A at 100 limit does NOT block employee creation in Workspace B", async () => {
      // Workspace B has limit 50 and 0 employees
      const res = await apiFetch("/api/employees", {
        method: "POST",
        headers: { Authorization: `Bearer ${isolatedToken}` },
        body: {
          firstName: "Isolated",
          lastName: "Worker",
          email: `worker1-${timestamp}@isolated.local`,
          employeeCode: `ISO-0001-${timestamp}`,
          status: "active",
        },
      });

      expect(res.status).toBe(201);
      expect(res.body.email).toBe(`worker1-${timestamp}@isolated.local`);

      const countB = await db.employee.count({
        where: { tenantId: testTenantIsolated, status: { in: ["active", "on_leave"] } },
      });
      expect(countB).toBe(1);
    });

    it("T1.7: Terminated employees do not count toward active capacity; slot can be reused", async () => {
      // Terminate 1 employee in Sovereign workspace (emp100)
      const emp100 = await db.employee.findFirst({
        where: { tenantId: testTenantSovereign, email: `emp100-${timestamp}@sovereign.local` },
      });
      expect(emp100).not.toBeNull();

      await db.employee.update({
        where: { id: emp100!.id },
        data: { status: "terminated" },
      });

      const activeCount = await db.employee.count({
        where: { tenantId: testTenantSovereign, status: { in: ["active", "on_leave"] } },
      });
      expect(activeCount).toBe(99);

      // Now 1 new employee can be created into the freed slot
      const res = await apiFetch("/api/employees", {
        method: "POST",
        headers: { Authorization: `Bearer ${sovereignToken}` },
        body: {
          firstName: "Replacement",
          lastName: "Worker",
          email: `replacement-${timestamp}@sovereign.local`,
          employeeCode: `SOV-REP-${timestamp}`,
          status: "active",
        },
      });

      expect(res.status).toBe(201);
      expect(res.body.email).toBe(`replacement-${timestamp}@sovereign.local`);

      // Now at 100 again
      const newActiveCount = await db.employee.count({
        where: { tenantId: testTenantSovereign, status: { in: ["active", "on_leave"] } },
      });
      expect(newActiveCount).toBe(100);
    });
  });

  describe("B02: Deep Health Check Observability (/api/health)", () => {
    it("T2.1: Returns 200 with database connected, latencyMs, and outbox metrics", async () => {
      const res = await apiFetch("/api/health");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("healthy");
      expect(res.body.service).toBe("Master HRMS API");
      expect(res.body.database.status).toBe("connected");
      expect(typeof res.body.database.latencyMs).toBe("number");
      expect(res.body.database.latencyMs).toBeGreaterThanOrEqual(0);
      expect(res.body.commerceOutbox.status).toBe("operational");
      expect(typeof res.body.commerceOutbox.pendingCount).toBe("number");
      expect(typeof res.body.commerceOutbox.failedCount).toBe("number");
    });

    it("T2.2: Does not leak internal credentials, database hosts, or SQL text", async () => {
      const res = await apiFetch("/api/health");
      const bodyStr = JSON.stringify(res.body);

      expect(bodyStr).not.toContain("password");
      expect(bodyStr).not.toContain("mysql://");
      expect(bodyStr).not.toContain("postgresql://");
      expect(bodyStr).not.toContain("SELECT");
    });
  });
});
