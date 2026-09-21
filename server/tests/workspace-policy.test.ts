import test from "node:test";
import assert from "node:assert/strict";
import { resolveWorkspacePolicy, assertWorkspaceActive, getWorkspacePolicy, lockWorkspaceCapacity, syncSubscriptionPlans } from "../src/services/workspace-policy.service";
import { provisionEmployeeUser } from "../src/lib/auth-helpers";
import { requireAuth, requireSuperAdmin } from "../src/middleware/auth";
import { generateToken, generateMfaToken } from "../src/lib/jwt";
import { prisma } from "../src/prisma";

const plans = [{ id: "plan", name: "Team", max_employees: 10, max_users: 5, price_monthly: 120, price_annual: 1200 }];

test("plan limits and annual subscription run-rate come from the saved catalog", () => {
  const result = resolveWorkspacePolicy({ planId: "plan", billingCycle: "annual" }, plans);
  assert.equal(result.maxEmployees, 10);
  assert.equal(result.maxUsers, 5);
  assert.equal(result.monthlyRevenue, 100);
});

test("zero and unlimited overrides preserve their distinct meanings", () => {
  const result = resolveWorkspacePolicy({ planId: "plan", maxEmployees: 0, maxUsers: null }, plans);
  assert.equal(result.maxEmployees, 0);
  assert.equal(result.maxUsers, null);
});

test("unassigned workspaces do not invent subscription revenue", () => {
  assert.equal(resolveWorkspacePolicy({}, plans).monthlyRevenue, 0);
  assert.equal(resolveWorkspacePolicy({}, plans).planName, "Unassigned");
});

test("a relational workspace subscription takes precedence over legacy CMS data", async () => {
  const policy = await getWorkspacePolicy("tenant-a", {
    tenantSubscription: {
      findUnique: async () => ({
        tenantId: "tenant-a", planId: "relational-plan", status: "active", billingCycle: "annual",
        maxEmployees: 20, maxUsers: 0, expiresAt: null,
        plan: { id: "relational-plan", name: "Relational", maxEmployees: 20, maxUsers: 10, priceMonthly: 240, priceAnnual: 2400 },
      }),
    },
    cmsPage: { findUnique: async () => { throw new Error("Legacy storage must not be read"); } },
  });
  assert.equal(policy.planName, "Relational");
  assert.equal(policy.maxEmployees, 20);
  assert.equal(policy.maxUsers, 0);
  assert.equal(policy.monthlyRevenue, 200);
});

test("plan catalog synchronization preserves plan IDs and monetary limits", async () => {
  const calls: any[] = [];
  await syncSubscriptionPlans([{ id: "plan-a", name: "Plan A", price_monthly: 99.5, price_annual: 995, max_employees: 5, max_users: null, features: ["Core"] }], {
    subscriptionPlan: { upsert: async (args: any) => { calls.push(args); } },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].where.id, "plan-a");
  assert.equal(calls[0].create.priceMonthly, 99.5);
  assert.equal(calls[0].create.maxEmployees, 5);
  assert.equal(calls[0].create.maxUsers, null);
});

test("suspended and expired workspaces are denied", () => {
  assert.throws(() => assertWorkspaceActive(resolveWorkspacePolicy({ status: "suspended" })), /suspended/);
  assert.throws(() => assertWorkspaceActive(resolveWorkspacePolicy({ expiresAt: "2000-01-01T00:00:00Z" })), /expired/);
  assert.doesNotThrow(() => assertWorkspaceActive(resolveWorkspacePolicy({ status: "active" })));
});

function databaseFixture(used: number, subscription: any = { planId: "plan" }) {
  let locked = false;
  return {
    $queryRaw: async (_query: any, tenantId: string) => { assert.equal(tenantId, "tenant-a"); locked = true; return [{ id: tenantId }]; },
    cmsPage: { findUnique: async ({ where }: any) => ({ content: where.slug === "system-monetization-plans" ? { plans } : subscription }) },
    employee: { count: async ({ where }: any) => { assert.ok(locked); assert.equal(where.tenantId, "tenant-a"); return used; } },
    profile: { count: async ({ where }: any) => { assert.ok(locked); assert.equal(where.tenantId, "tenant-a"); assert.equal(where.user.roles.none.role, "super_admin"); return used; } },
  };
}

test("last available employee seat can be used, then further creation is rejected", async () => {
  await lockWorkspaceCapacity(databaseFixture(9), "tenant-a", "employees");
  await assert.rejects(lockWorkspaceCapacity(databaseFixture(10), "tenant-a", "employees"), /limit reached/);
});

test("user capacity excludes platform administrators and cannot be exceeded", async () => {
  await lockWorkspaceCapacity(databaseFixture(4), "tenant-a", "users");
  await assert.rejects(lockWorkspaceCapacity(databaseFixture(5), "tenant-a", "users"), /limit reached/);
});

test("capacity checks reject missing and suspended workspace context", async () => {
  await assert.rejects(lockWorkspaceCapacity(databaseFixture(0), "", "employees"), /context/);
  await assert.rejects(lockWorkspaceCapacity(databaseFixture(0, { status: "suspended" }), "tenant-a", "employees"), /suspended/);
});

test("employee provisioning cannot reset an account in another workspace", async () => {
  const db = { user: { findUnique: async () => ({ id: "other-user", profile: { tenantId: "tenant-b" }, roles: [] }) } };
  await assert.rejects(provisionEmployeeUser(db, { tenantId: "tenant-a", email: "person@example.test", password: "new-password" }), /another account/);
});

test("employee provisioning cannot reset a platform administrator", async () => {
  const db = { user: { findUnique: async () => ({ id: "admin", profile: { tenantId: "tenant-a" }, roles: [{ role: "super_admin" }] }) } };
  await assert.rejects(provisionEmployeeUser(db, { tenantId: "tenant-a", email: "admin@example.test" }), /another account/);
});

function responseFixture() {
  return { statusCode: 200, body: null as any, status(code: number) { this.statusCode = code; return this; }, json(body: any) { this.body = body; return this; } };
}

test("an MFA challenge token cannot access authenticated APIs", async () => {
  const token = generateMfaToken({ userId: "user", email: "user@example.test" });
  const response = responseFixture(); let allowed = false;
  await requireAuth({ headers: { authorization: `Bearer ${token}` }, originalUrl: "/api/super/stats" } as any, response as any, () => { allowed = true; });
  assert.equal(response.statusCode, 401); assert.equal(allowed, false);
});

test("stale JWT roles cannot preserve Super Admin access after demotion", async () => {
  const findUser = prisma.user.findUnique; const findPage = prisma.cmsPage.findUnique;
  try {
    prisma.user.findUnique = (async () => ({ id: "user", profile: { tenantId: "tenant-a" }, roles: [{ role: "employee", tenantId: "tenant-a" }] })) as any;
    prisma.cmsPage.findUnique = (async () => null) as any;
    const token = generateToken({ userId: "user", email: "user@example.test", tenantId: "tenant-b", roles: ["super_admin"] });
    const req: any = { headers: { authorization: `Bearer ${token}` }, originalUrl: "/api/super/stats" };
    const res = responseFixture(); let authenticated = false; let allowed = false;
    await requireAuth(req, res as any, () => { authenticated = true; });
    assert.equal(authenticated, true); assert.equal(req.user.tenantId, "tenant-a");
    requireSuperAdmin(req, res as any, () => { allowed = true; });
    assert.equal(res.statusCode, 403); assert.equal(allowed, false);
  } finally { prisma.user.findUnique = findUser; prisma.cmsPage.findUnique = findPage; }
});

test("tenant API access stops when Super Admin suspends the workspace", async () => {
  const findUser = prisma.user.findUnique; const findPage = prisma.cmsPage.findUnique;
  try {
    prisma.user.findUnique = (async () => ({ id: "user", profile: { tenantId: "tenant-a" }, roles: [{ role: "employee", tenantId: "tenant-a" }] })) as any;
    prisma.cmsPage.findUnique = (async () => ({ content: { status: "suspended" } })) as any;
    const token = generateToken({ userId: "user", email: "user@example.test", tenantId: "tenant-a", roles: ["employee"] });
    const res = responseFixture(); let allowed = false;
    await requireAuth({ headers: { authorization: `Bearer ${token}` }, originalUrl: "/api/employees" } as any, res as any, () => { allowed = true; });
    assert.equal(res.statusCode, 403); assert.equal(allowed, false);
  } finally { prisma.user.findUnique = findUser; prisma.cmsPage.findUnique = findPage; }
});
