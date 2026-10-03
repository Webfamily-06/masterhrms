import assert from "node:assert/strict";
import {
  evaluateMaintenanceStatus,
  maintenanceMiddleware,
  invalidateMaintenanceCache,
} from "../middleware/maintenance";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";

async function run() {
  console.log("=================================================");
  console.log("🧪 RUNNING MAINTENANCE MODE WORKFLOW VERIFICATION SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res
          .then(() => {
            passed++;
            console.log(`  ✔ [PASS] ${name}`);
          })
          .catch((err) => {
            console.error(`  ❌ [FAIL] ${name}:`, err.message);
            throw err;
          });
      }
      passed++;
      console.log(`  ✔ [PASS] ${name}`);
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  // ─── 1. Status Evaluation Logic ──────────────────────────────────────────
  console.log("▶ [Category 1] Schedule & Status Evaluation:");

  test("1.1 Default operational state when toggles are false", () => {
    const res = evaluateMaintenanceStatus({
      maintenanceMode: false,
      maintenanceScheduled: false,
    });
    assert.equal(res.isActive, false);
    assert.equal(res.isScheduled, false);
    assert.equal(res.status, "operational");
    assert.equal(res.retryAfterSeconds, null);
  });

  test("1.2 Emergency active maintenance mode (instant toggle)", () => {
    const res = evaluateMaintenanceStatus({
      maintenanceMode: true,
      maintenanceScheduled: false,
    });
    assert.equal(res.isActive, true);
    assert.equal(res.status, "active");
    assert.equal(res.retryAfterSeconds, null, "no end time should yield null retryAfterSeconds");
  });

  test("1.3 Emergency active maintenance with valid future end time calculates retryAfter", () => {
    const futureDate = new Date(Date.now() + 3600 * 1000).toISOString();
    const res = evaluateMaintenanceStatus({
      maintenanceMode: true,
      maintenanceScheduled: true,
      maintenanceEndTime: futureDate,
    });
    assert.equal(res.isActive, true);
    assert.equal(res.status, "active");
    assert.ok(
      res.retryAfterSeconds && res.retryAfterSeconds > 3500 && res.retryAfterSeconds <= 3600,
      "retryAfterSeconds must be between 3500 and 3600",
    );
  });

  test("1.4 Advance scheduled maintenance prior to start time is not active", () => {
    const futureStart = new Date(Date.now() + 7200 * 1000).toISOString();
    const futureEnd = new Date(Date.now() + 10800 * 1000).toISOString();
    const res = evaluateMaintenanceStatus({
      maintenanceMode: false,
      maintenanceScheduled: true,
      maintenanceStartTime: futureStart,
      maintenanceEndTime: futureEnd,
    });
    assert.equal(res.isActive, false, "future scheduled maintenance must not block before start");
    assert.equal(res.isScheduled, true);
    assert.equal(res.status, "scheduled");
  });

  test("1.5 Scheduled maintenance during the active window evaluates to active", () => {
    const pastStart = new Date(Date.now() - 1800 * 1000).toISOString();
    const futureEnd = new Date(Date.now() + 1800 * 1000).toISOString();
    const res = evaluateMaintenanceStatus({
      maintenanceMode: false,
      maintenanceScheduled: true,
      maintenanceStartTime: pastStart,
      maintenanceEndTime: futureEnd,
    });
    assert.equal(res.isActive, true, "window must be active between start and end");
    assert.equal(res.status, "active");
    assert.ok(res.retryAfterSeconds && res.retryAfterSeconds > 0);
  });

  test("1.6 Scheduled maintenance after end time evaluates to completed", () => {
    const pastStart = new Date(Date.now() - 7200 * 1000).toISOString();
    const pastEnd = new Date(Date.now() - 3600 * 1000).toISOString();
    const res = evaluateMaintenanceStatus({
      maintenanceMode: false,
      maintenanceScheduled: true,
      maintenanceStartTime: pastStart,
      maintenanceEndTime: pastEnd,
    });
    assert.equal(res.isActive, false, "must not be active after end time");
    assert.equal(res.status, "completed");
  });

  // ─── 2. Backend Middleware Enforcement ───────────────────────────────────
  console.log("\n▶ [Category 2] Middleware Protection & Endpoint Whitelisting:");

  // Helper mock request/response
  function createMockContext(url: string, headers: Record<string, string> = {}) {
    let statusCode = 200;
    let jsonBody: any = null;
    const responseHeaders: Record<string, string> = {};
    let nextCalled = false;

    const req: any = {
      url,
      originalUrl: url,
      method: "GET",
      headers,
    };

    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      setHeader: (name: string, val: string) => {
        responseHeaders[name] = val;
        return res;
      },
      json: (body: any) => {
        jsonBody = body;
        return res;
      },
    };

    const next = () => {
      nextCalled = true;
    };

    return { req, res, next, getResult: () => ({ statusCode, jsonBody, responseHeaders, nextCalled }) };
  }

  // Set DB settings to active maintenance for test
  await prisma.cmsPage.upsert({
    where: { slug: "system-platform-settings" },
    create: {
      slug: "system-platform-settings",
      title: "Platform Settings",
      content: {
        maintenanceMode: true,
        maintenanceNoticeMessage: "Automated Test Maintenance Active",
        maintenanceEndTime: new Date(Date.now() + 1800 * 1000).toISOString(),
        supportEmail: "support@masterhrms.com",
      },
      published: true,
    },
    update: {
      content: {
        maintenanceMode: true,
        maintenanceNoticeMessage: "Automated Test Maintenance Active",
        maintenanceEndTime: new Date(Date.now() + 1800 * 1000).toISOString(),
        supportEmail: "support@masterhrms.com",
      },
    },
  });
  invalidateMaintenanceCache();

  await test("2.1 Whitelisted endpoint /api/health passes without interruption", async () => {
    const ctx = createMockContext("/api/health");
    await maintenanceMiddleware(ctx.req, ctx.res, ctx.next);
    const r = ctx.getResult();
    assert.equal(r.nextCalled, true, "next() must be called for health check");
    assert.equal(r.statusCode, 200);
  });

  await test("2.2 Whitelisted endpoint /api/system/maintenance-status passes", async () => {
    const ctx = createMockContext("/api/system/maintenance-status");
    await maintenanceMiddleware(ctx.req, ctx.res, ctx.next);
    const r = ctx.getResult();
    assert.equal(r.nextCalled, true, "next() must be called for maintenance status");
  });

  await test("2.3 Whitelisted auth endpoint /api/auth/login passes", async () => {
    const ctx = createMockContext("/api/auth/login");
    await maintenanceMiddleware(ctx.req, ctx.res, ctx.next);
    const r = ctx.getResult();
    assert.equal(r.nextCalled, true, "next() must be called for auth login");
  });

  await test("2.4 Protected API /api/employees is blocked with HTTP 503 SYSTEM_MAINTENANCE", async () => {
    const ctx = createMockContext("/api/employees");
    await maintenanceMiddleware(ctx.req, ctx.res, ctx.next);
    const r = ctx.getResult();
    assert.equal(r.nextCalled, false, "next() must NOT be called for protected API");
    assert.equal(r.statusCode, 503, "status must be 503");
    assert.equal(r.jsonBody?.code, "SYSTEM_MAINTENANCE");
    assert.ok(r.responseHeaders["Retry-After"], "Retry-After header must be present");
    assert.equal(r.jsonBody?.maintenance?.status, "active");
  });

  await test("2.5 Authenticated Super Admin bypasses maintenance restrictions", async () => {
    // Look up or create a test super admin in DB
    let superUser = await prisma.user.findFirst({
      where: { roles: { some: { role: "super_admin" } } },
    });
    if (!superUser) {
      superUser = await prisma.user.create({
        data: {
          email: "test.superadmin@masterhrms.com",
          passwordHash: "test-hash",
          roles: {
            create: { role: "super_admin" },
          },
        },
      });
    }

    const token = generateToken({
      userId: superUser.id,
      email: superUser.email,
      roles: ["super_admin"],
    });

    const ctx = createMockContext("/api/super/tenants", {
      authorization: `Bearer ${token}`,
    });
    await maintenanceMiddleware(ctx.req, ctx.res, ctx.next);
    const r = ctx.getResult();
    assert.equal(r.nextCalled, true, "Super Admin must bypass maintenance on /api/super/*");
  });

  await test("2.6 Authenticated Tenant User is strictly blocked during maintenance", async () => {
    let tenantUser = await prisma.user.findFirst({
      where: { roles: { some: { role: "employee" } } },
    });
    if (!tenantUser) {
      tenantUser = await prisma.user.create({
        data: {
          email: "test.employee@company.com",
          passwordHash: "test-hash",
          roles: {
            create: { role: "employee" },
          },
        },
      });
    }

    const token = generateToken({
      userId: tenantUser.id,
      email: tenantUser.email,
      roles: ["employee"],
    });

    const ctx = createMockContext("/api/dashboard", {
      authorization: `Bearer ${token}`,
    });
    await maintenanceMiddleware(ctx.req, ctx.res, ctx.next);
    const r = ctx.getResult();
    assert.equal(r.nextCalled, false, "Tenant Admin must NOT bypass maintenance");
    assert.equal(r.statusCode, 503);
    assert.equal(r.jsonBody?.code, "SYSTEM_MAINTENANCE");
  });

  // Restore DB settings to operational state
  await prisma.cmsPage.update({
    where: { slug: "system-platform-settings" },
    data: {
      content: {
        maintenanceMode: false,
        maintenanceScheduled: false,
        maintenanceNoticeMessage: "",
      },
    },
  });
  invalidateMaintenanceCache();

  await test("2.7 Restoring operational mode allows protected API requests normally", async () => {
    const ctx = createMockContext("/api/dashboard");
    await maintenanceMiddleware(ctx.req, ctx.res, ctx.next);
    const r = ctx.getResult();
    assert.equal(r.nextCalled, true, "Protected API must be allowed when maintenance is disabled");
    assert.equal(r.statusCode, 200);
  });

  console.log("\n=================================================");
  console.log(`🏁 TEST SUITE COMPLETE: ${passed}/${total} TESTS PASSED`);
  console.log("=================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal test error:", err);
    process.exit(1);
  });
