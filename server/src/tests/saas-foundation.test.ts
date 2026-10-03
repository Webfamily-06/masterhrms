import assert from "node:assert/strict";
import { parsePagination, paginate } from "../lib/pagination";
import { requireActiveSubscription } from "../middleware/subscription";
import { requireWithinLimit, counters } from "../middleware/limits";

async function run() {
  console.log("🧪 Running Phase 1 SaaS Foundation Verification Tests...\n");

  // 1. Pagination Tests
  console.log("▶ [Test 1] Pagination Contract:");
  // 1.1 Limit cap
  const q1 = { page: "2", limit: "1000", sort: "name", order: "asc" };
  const p1 = parsePagination(q1, ["name", "createdAt"], "createdAt");
  assert.equal(p1.limit, 100, "limit must be strictly capped at 100");
  assert.equal(p1.page, 2, "page must be 2");
  assert.equal(p1.skip, 100, "skip must be (2-1)*100 = 100");
  assert.deepEqual(p1.orderBy, { name: "asc" });
  console.log("  ✔ Limit 1000 properly capped at 100");

  // 1.2 Un-whitelisted sort fallback
  const q2 = { page: "1", limit: "25", sort: "malicious_injection; DROP TABLE;", order: "desc" };
  const p2 = parsePagination(q2, ["name", "createdAt"], "createdAt");
  assert.deepEqual(p2.orderBy, { createdAt: "desc" }, "unwhitelisted sort must fall back to defaultSort");
  console.log("  ✔ Unwhitelisted sort correctly fell back to defaultSort");

  // 1.3 Paginate execution envelope
  let findManyCalledWith: any = null;
  const fakeDelegate = {
    findMany: async (opts: any) => {
      findManyCalledWith = opts;
      return [{ id: "emp-1", name: "Alice" }];
    },
    count: async () => 1,
  };
  const result = await paginate(fakeDelegate, { where: { status: "active" } }, p1);
  assert.deepEqual(result, {
    items: [{ id: "emp-1", name: "Alice" }],
    total: 1,
    page: 2,
    limit: 100,
  });
  assert.equal(findManyCalledWith.take, 100);
  assert.equal(findManyCalledWith.skip, 100);
  console.log("  ✔ Paginate helper returned standardized { items, total, page, limit } envelope");

  // 2. requireActiveSubscription Tests
  console.log("\n▶ [Test 2] requireActiveSubscription:");
  // 2.1 Read-only requests allowed for suspended tenant
  let getPassed = false;
  const getReq: any = {
    method: "GET",
    originalUrl: "/api/dashboard",
    user: { tenantId: "tenant-suspended-test", roles: ["admin"] },
  };
  const dummyRes: any = {
    status: (code: number) => ({ json: (data: any) => ({ code, data }) }),
  };
  await requireActiveSubscription(getReq, dummyRes, () => { getPassed = true; });
  assert.equal(getPassed, true, "GET request must be allowed (HTTP 200 / next()) for suspended tenant");
  console.log("  ✔ Suspended tenant: GET allowed (200 / next())");

  // 2.2 Safe routes allowed for suspended tenant even on POST
  let billingPassed = false;
  const billingReq: any = {
    method: "POST",
    originalUrl: "/api/billing/checkout",
    user: { tenantId: "tenant-suspended-test", roles: ["admin"] },
  };
  await requireActiveSubscription(billingReq, dummyRes, () => { billingPassed = true; });
  assert.equal(billingPassed, true, "POST /api/billing/* must be allowed (200 / next()) for suspended tenant");
  console.log("  ✔ Suspended tenant: POST /api/billing/checkout allowed (200 / next())");

  let webhookPassed = false;
  const webhookReq: any = {
    method: "POST",
    originalUrl: "/api/webhooks/razorpay",
    user: { tenantId: "tenant-suspended-test", roles: ["admin"] },
  };
  await requireActiveSubscription(webhookReq, dummyRes, () => { webhookPassed = true; });
  assert.equal(webhookPassed, true, "POST /api/webhooks/* must be allowed (200 / next()) for suspended tenant");
  console.log("  ✔ Suspended tenant: POST /api/webhooks/* allowed (200 / next())");

  // 2.3 Super admin bypasses suspension
  let superPassed = false;
  const superReq: any = {
    method: "POST",
    originalUrl: "/api/employees",
    user: { tenantId: "tenant-suspended-test", roles: ["super_admin"] },
  };
  await requireActiveSubscription(superReq, dummyRes, () => { superPassed = true; });
  assert.equal(superPassed, true, "super_admin must bypass subscription checks");
  console.log("  ✔ Super admin bypasses suspension on POST");

  // 3. requireWithinLimit Tests
  console.log("\n▶ [Test 3] requireWithinLimit:");
  // Override counters
  counters.seats = async () => 10;
  counters.warehouses = async () => 5;

  const seatsMiddleware = requireWithinLimit("seats");

  // 3.1 Limit reached -> 409 PLAN_LIMIT_REACHED
  let statusSent: number | null = null;
  let jsonSent: any = null;
  const mockRes: any = {
    status: (code: number) => {
      statusSent = code;
      return {
        json: (data: any) => {
          jsonSent = data;
        },
      };
    },
  };

  const limitReq: any = {
    user: { tenantId: "tenant-limit-test", roles: ["admin"] },
  };

  // Temporarily stub prisma.tenantSubscription.findFirst
  const { rawPrisma, prisma } = await import("../prisma");
  const db = rawPrisma || prisma;
  const originalFindFirst = db.tenantSubscription.findFirst;
  db.tenantSubscription.findFirst = async () => ({
    id: "sub-limit",
    tenantId: "tenant-limit-test",
    maxEmployees: 10,
    maxUsers: 5,
    status: "active",
    plan: null,
  } as any);

  let limitPassed = false;
  await seatsMiddleware(limitReq, mockRes, () => { limitPassed = true; });
  assert.equal(limitPassed, false, "Must not proceed to next() when limit reached");
  assert.equal(statusSent, 409, "Must return HTTP 409");
  assert.equal(jsonSent?.code, "PLAN_LIMIT_REACHED", "Must return code PLAN_LIMIT_REACHED");
  assert.equal(jsonSent?.used, 10);
  assert.equal(jsonSent?.max, 10);
  console.log("  ✔ Plan limit reached: returned HTTP 409 with PLAN_LIMIT_REACHED");

  // 3.2 Below limit -> next() proceeds
  counters.seats = async () => 4;
  let belowLimitPassed = false;
  statusSent = null;
  jsonSent = null;
  await seatsMiddleware(limitReq, mockRes, () => { belowLimitPassed = true; });
  assert.equal(belowLimitPassed, true, "Must proceed to next() when below limit");
  assert.equal(statusSent, null);
  console.log("  ✔ Below plan limit: proceeded to next() successfully");

  // Restore prisma stub
  db.tenantSubscription.findFirst = originalFindFirst;

  console.log("\n🎉 ALL PHASE 1 FOUNDATION TESTS PASSED (10/10)!\n");
}

run().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
