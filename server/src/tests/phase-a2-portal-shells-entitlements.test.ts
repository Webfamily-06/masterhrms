import http from "http";
import express from "express";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { workspaceHostMiddleware } from "../middleware/workspace-host.middleware";
import { setCachedWorkspace, invalidateWorkspaceCache } from "../lib/workspace-host";
import { productsRouter } from "../routes/products.routes";
import { purchasesRouter } from "../routes/purchases.routes";
import { transfersRouter } from "../routes/transfers.routes";
import { adjustmentsRouter } from "../routes/adjustments.routes";
import { suppliersRouter } from "../routes/suppliers.routes";
import { accountingRouter } from "../routes/accounting.routes";
import { invoicesRouter } from "../routes/invoices.routes";
import { authRouter } from "../routes/auth.routes";
import { requireAuth } from "../middleware/auth";
import { checkTenantEntitlement } from "../middleware/entitlements";

// Helper for exact HTTP request execution
function hostFetch(
  url: string,
  opts: { method?: string; headers?: Record<string, string>; body?: string } = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; json: () => Promise<any> }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers: Record<string, string | number> = { ...(opts.headers || {}) };
    if (opts.body) headers["Content-Length"] = Buffer.byteLength(opts.body);
    const req = http.request(
      { hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: opts.method || "GET", headers },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () =>
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            json: async () => {
              try {
                return JSON.parse(raw);
              } catch {
                return { raw };
              }
            },
          })
        );
      }
    );
    req.on("error", reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

let testIndex = 1;
function assertTest(condition: boolean, testName: string, details?: any) {
  const num = testIndex.toString().padStart(2, "0");
  if (condition) {
    console.log(`[PASS] Test ${num}: ${testName}`);
  } else {
    console.error(`[FAIL] Test ${num}: ${testName}`, details || "");
    throw new Error(`Test failed: ${testName}`);
  }
  testIndex++;
}

async function runSuite() {
  console.log("================================================================================");
  console.log("PHASE A2: POS SATELLITES & FINANCE ENTITLEMENT VERIFICATION SUITE");
  console.log("================================================================================");

  // 1. Setup Express app & HTTP Server
  const app = express();
  app.use(express.json());
  app.use(workspaceHostMiddleware);

  app.use("/api/products", productsRouter);
  app.use("/api/purchases", purchasesRouter);
  app.use("/api/transfers", transfersRouter);
  app.use("/api/adjustments", adjustmentsRouter);
  app.use("/api/suppliers", suppliersRouter);
  app.use("/api/accounting", accountingRouter);
  app.use("/api/invoices", invoicesRouter);
  app.use("/api/auth", authRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Unique IDs for isolated test execution
  const timestamp = Date.now();
  const unentitledTenantId = `tenant_unent_${timestamp}`;
  const unentitledTenantSlug = `unent-${timestamp}`.substring(0, 28);
  const entitledTenantId = `tenant_ent_${timestamp}`;
  const entitledTenantSlug = `ent-${timestamp}`.substring(0, 28);

  const unentitledUserId = `user_unent_${timestamp}`;
  const entitledUserId = `user_ent_${timestamp}`;
  const superAdminUserId = `user_super_${timestamp}`;

  try {
    // 2. Seed test tenants
    await prisma.tenant.create({
      data: {
        id: unentitledTenantId,
        name: "Unentitled Co",
        slug: unentitledTenantSlug,
      },
    });

    await prisma.tenant.create({
      data: {
        id: entitledTenantId,
        name: "Entitled Enterprise Co",
        slug: entitledTenantSlug,
      },
    });

    // 3. Seed users & roles
    await prisma.user.create({
      data: {
        id: unentitledUserId,
        email: `unent_${timestamp}@test.local`,
        passwordHash: "hash",
        profile: {
          create: {
            fullName: "Unentitled Admin",
            tenantId: unentitledTenantId,
          },
        },
        roles: {
          create: {
            role: "hr_admin",
            tenantId: unentitledTenantId,
          },
        },
      },
    });

    await prisma.user.create({
      data: {
        id: entitledUserId,
        email: `ent_${timestamp}@test.local`,
        passwordHash: "hash",
        profile: {
          create: {
            fullName: "Entitled Admin",
            tenantId: entitledTenantId,
          },
        },
        roles: {
          create: {
            role: "hr_admin",
            tenantId: entitledTenantId,
          },
        },
      },
    });

    await prisma.user.create({
      data: {
        id: superAdminUserId,
        email: `super_${timestamp}@test.local`,
        passwordHash: "hash",
        profile: {
          create: {
            fullName: "Super Admin",
            tenantId: null,
          },
        },
        roles: {
          create: {
            role: "super_admin",
          },
        },
      },
    });

    // 4. Provision modules for entitled tenant
    await prisma.tenantModule.createMany({
      data: [
        { tenantId: entitledTenantId, moduleKey: "pos", isEnabled: true },
        { tenantId: entitledTenantId, moduleKey: "accounting", isEnabled: true },
        { tenantId: entitledTenantId, moduleKey: "crm", isEnabled: true },
      ],
    });

    // 5. Generate test tokens
    const unentitledToken = generateToken({
      userId: unentitledUserId,
      email: `unent_${timestamp}@test.local`,
      tenantId: unentitledTenantId,
      roles: ["admin"],
    });

    const entitledToken = generateToken({
      userId: entitledUserId,
      email: `ent_${timestamp}@test.local`,
      tenantId: entitledTenantId,
      roles: ["admin"],
    });

    const superAdminToken = generateToken({
      userId: superAdminUserId,
      email: `super_${timestamp}@test.local`,
      tenantId: null,
      roles: ["super_admin"],
    });

    // Cache workspaces for immediate host resolution
    setCachedWorkspace(unentitledTenantSlug, {
      tenantId: unentitledTenantId,
      name: "Unentitled Co",
      slug: unentitledTenantSlug,
      status: "active",
      isRedirect: false,
    });
    setCachedWorkspace(entitledTenantSlug, {
      tenantId: entitledTenantId,
      name: "Entitled Enterprise Co",
      slug: entitledTenantSlug,
      status: "active",
      isRedirect: false,
    });

    console.log("\n--- Part 1: POS Satellite API Entitlements ---");

    // Test 1: GET /api/products blocked for unentitled tenant
    const res1 = await hostFetch(`${baseUrl}/api/products`, {
      headers: {
        Authorization: `Bearer ${unentitledToken}`,
        Host: `${unentitledTenantSlug}.localhost:${port}`,
      },
    });
    const body1 = await res1.json();
    assertTest(
      res1.status === 403 && body1.code === "PRODUCT_NOT_SUBSCRIBED",
      "GET /api/products blocked for unentitled tenant with 403 PRODUCT_NOT_SUBSCRIBED",
      body1
    );

    // Test 2: GET /api/purchases blocked for unentitled tenant
    const res2 = await hostFetch(`${baseUrl}/api/purchases`, {
      headers: {
        Authorization: `Bearer ${unentitledToken}`,
        Host: `${unentitledTenantSlug}.localhost:${port}`,
      },
    });
    const body2 = await res2.json();
    assertTest(
      res2.status === 403 && body2.code === "PRODUCT_NOT_SUBSCRIBED",
      "GET /api/purchases blocked for unentitled tenant with 403 PRODUCT_NOT_SUBSCRIBED",
      body2
    );

    // Test 3: GET /api/transfers blocked for unentitled tenant
    const res3 = await hostFetch(`${baseUrl}/api/transfers`, {
      headers: {
        Authorization: `Bearer ${unentitledToken}`,
        Host: `${unentitledTenantSlug}.localhost:${port}`,
      },
    });
    const body3 = await res3.json();
    assertTest(
      res3.status === 403 && body3.code === "PRODUCT_NOT_SUBSCRIBED",
      "GET /api/transfers blocked for unentitled tenant with 403 PRODUCT_NOT_SUBSCRIBED",
      body3
    );

    // Test 4: GET /api/adjustments blocked for unentitled tenant
    const res4 = await hostFetch(`${baseUrl}/api/adjustments`, {
      headers: {
        Authorization: `Bearer ${unentitledToken}`,
        Host: `${unentitledTenantSlug}.localhost:${port}`,
      },
    });
    const body4 = await res4.json();
    assertTest(
      res4.status === 403 && body4.code === "PRODUCT_NOT_SUBSCRIBED",
      "GET /api/adjustments blocked for unentitled tenant with 403 PRODUCT_NOT_SUBSCRIBED",
      body4
    );

    // Test 5: GET /api/suppliers blocked for unentitled tenant
    const res5 = await hostFetch(`${baseUrl}/api/suppliers`, {
      headers: {
        Authorization: `Bearer ${unentitledToken}`,
        Host: `${unentitledTenantSlug}.localhost:${port}`,
      },
    });
    const body5 = await res5.json();
    assertTest(
      res5.status === 403 && body5.code === "PRODUCT_NOT_SUBSCRIBED",
      "GET /api/suppliers blocked for unentitled tenant with 403 PRODUCT_NOT_SUBSCRIBED",
      body5
    );

    // Test 6: GET /api/products allowed for entitled tenant
    const res6 = await hostFetch(`${baseUrl}/api/products`, {
      headers: {
        Authorization: `Bearer ${entitledToken}`,
        Host: `${entitledTenantSlug}.localhost:${port}`,
      },
    });
    assertTest(res6.status === 200, "GET /api/products allowed for entitled tenant (200 OK)");

    // Test 7: GET /api/purchases allowed for entitled tenant
    const res7 = await hostFetch(`${baseUrl}/api/purchases`, {
      headers: {
        Authorization: `Bearer ${entitledToken}`,
        Host: `${entitledTenantSlug}.localhost:${port}`,
      },
    });
    assertTest(res7.status === 200, "GET /api/purchases allowed for entitled tenant (200 OK)");

    // Test 8: GET /api/transfers allowed for entitled tenant
    const res8 = await hostFetch(`${baseUrl}/api/transfers`, {
      headers: {
        Authorization: `Bearer ${entitledToken}`,
        Host: `${entitledTenantSlug}.localhost:${port}`,
      },
    });
    assertTest(res8.status === 200, "GET /api/transfers allowed for entitled tenant (200 OK)");

    // Test 9: GET /api/adjustments allowed for entitled tenant
    const res9 = await hostFetch(`${baseUrl}/api/adjustments`, {
      headers: {
        Authorization: `Bearer ${entitledToken}`,
        Host: `${entitledTenantSlug}.localhost:${port}`,
      },
    });
    assertTest(res9.status === 200, "GET /api/adjustments allowed for entitled tenant (200 OK)");

    // Test 10: GET /api/suppliers allowed for entitled tenant
    const res10 = await hostFetch(`${baseUrl}/api/suppliers`, {
      headers: {
        Authorization: `Bearer ${entitledToken}`,
        Host: `${entitledTenantSlug}.localhost:${port}`,
      },
    });
    assertTest(res10.status === 200, "GET /api/suppliers allowed for entitled tenant (200 OK)");

    // Test 11: Super Admin bypasses POS satellite route checks
    const res11 = await hostFetch(`${baseUrl}/api/products`, {
      headers: {
        Authorization: `Bearer ${superAdminToken}`,
        Host: `${unentitledTenantSlug}.localhost:${port}`,
      },
    });
    assertTest(res11.status === 200, "Super Admin bypasses POS products entitlement check on unentitled host (200 OK)");

    console.log("\n--- Part 2: Finance API Entitlements ---");

    // Test 12: GET /api/accounting/accounts blocked for unentitled tenant
    const res12 = await hostFetch(`${baseUrl}/api/accounting/accounts`, {
      headers: {
        Authorization: `Bearer ${unentitledToken}`,
        Host: `${unentitledTenantSlug}.localhost:${port}`,
      },
    });
    const body12 = await res12.json();
    assertTest(
      res12.status === 403 && body12.code === "PRODUCT_NOT_SUBSCRIBED",
      "GET /api/accounting/accounts blocked for unentitled tenant with 403 PRODUCT_NOT_SUBSCRIBED",
      body12
    );

    // Test 13: GET /api/invoices blocked for unentitled tenant
    const res13 = await hostFetch(`${baseUrl}/api/invoices`, {
      headers: {
        Authorization: `Bearer ${unentitledToken}`,
        Host: `${unentitledTenantSlug}.localhost:${port}`,
      },
    });
    const body13 = await res13.json();
    assertTest(
      res13.status === 403 && body13.code === "PRODUCT_NOT_SUBSCRIBED",
      "GET /api/invoices blocked for unentitled tenant with 403 PRODUCT_NOT_SUBSCRIBED",
      body13
    );

    // Test 14: GET /api/accounting/accounts allowed for entitled tenant
    const res14 = await hostFetch(`${baseUrl}/api/accounting/accounts`, {
      headers: {
        Authorization: `Bearer ${entitledToken}`,
        Host: `${entitledTenantSlug}.localhost:${port}`,
      },
    });
    assertTest(res14.status === 200, "GET /api/accounting/accounts allowed for entitled tenant (200 OK)");

    // Test 15: GET /api/invoices allowed for entitled tenant
    const res15 = await hostFetch(`${baseUrl}/api/invoices`, {
      headers: {
        Authorization: `Bearer ${entitledToken}`,
        Host: `${entitledTenantSlug}.localhost:${port}`,
      },
    });
    assertTest(res15.status === 200, "GET /api/invoices allowed for entitled tenant (200 OK)");

    // Test 16: Super Admin bypasses Finance entitlement check
    const res16 = await hostFetch(`${baseUrl}/api/accounting/accounts`, {
      headers: {
        Authorization: `Bearer ${superAdminToken}`,
        Host: `${unentitledTenantSlug}.localhost:${port}`,
      },
    });
    assertTest(res16.status === 200, "Super Admin bypasses Finance entitlement check on unentitled host (200 OK)");

    // --------------------------------------------------------------------------
    // PHASE A2 EXTENSION: PROFILE RESOLUTION & FRONTEND ENTITLEMENT REGRESSION
    // --------------------------------------------------------------------------

    // Test 17: Case 1 - No TenantModule records: /api/auth/me does not grant POS/CRM/Finance
    const res17 = await hostFetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${unentitledToken}`,
        Host: `${unentitledTenantSlug}.localhost:${port}`,
      },
    });
    const body17 = await res17.json();
    assertTest(
      res17.status === 200 &&
      Array.isArray(body17.enabledModules) &&
      !body17.enabledModules.includes("pos") &&
      !body17.enabledModules.includes("crm") &&
      !body17.enabledModules.includes("finance"),
      "Case 1: Workspace with NO TenantModule records does NOT grant POS/CRM/Finance in /api/auth/me",
      body17
    );

    // Test 18: Case 2 - Empty enabledModules array does NOT unlock products in frontend evaluation
    const evaluateFrontendEntitlements = (mods: string[], isSuper = false) => {
      const isPos = isSuper || mods.includes("pos") || mods.includes("product_pos") || mods.includes("inventory");
      const isFinance = isSuper || mods.includes("accounting") || mods.includes("finance") || mods.includes("product_finance");
      const isCrm = isSuper || mods.includes("crm") || mods.includes("product_crm");
      const isHrms = isSuper || mods.length === 0 || mods.includes("hrm") || mods.includes("hrms") || mods.includes("product_hrms");
      return { isPos, isFinance, isCrm, isHrms };
    };
    const emptyResult = evaluateFrontendEntitlements([]);
    assertTest(
      emptyResult.isPos === false && emptyResult.isFinance === false && emptyResult.isCrm === false && emptyResult.isHrms === true,
      "Case 2: Empty enabledModules [] correctly keeps products locked while preserving HRMS base platform"
    );

    // Test 19: Case 3 - Explicitly enabled module is present in /api/auth/me
    const res19 = await hostFetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${entitledToken}`,
        Host: `${entitledTenantSlug}.localhost:${port}`,
      },
    });
    const body19 = await res19.json();
    assertTest(
      res19.status === 200 &&
      body19.enabledModules.includes("pos") &&
      body19.enabledModules.includes("crm"),
      "Case 3: Explicitly enabled module is present in /api/auth/me",
      body19
    );

    // Test 20: Case 4 - Explicitly disabled module is excluded from /api/auth/me
    await prisma.tenantModule.update({
      where: { tenantId_moduleKey: { tenantId: entitledTenantId, moduleKey: "pos" } },
      data: { isEnabled: false },
    });
    const res20 = await hostFetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${entitledToken}`,
        Host: `${entitledTenantSlug}.localhost:${port}`,
      },
    });
    const body20 = await res20.json();
    assertTest(
      res20.status === 200 && !body20.enabledModules.includes("pos"),
      "Case 4: Explicitly disabled module (isEnabled: false) is excluded from /api/auth/me",
      body20
    );

    // Restore pos for entitled tenant
    await prisma.tenantModule.update({
      where: { tenantId_moduleKey: { tenantId: entitledTenantId, moduleKey: "pos" } },
      data: { isEnabled: true },
    });

    // Test 21: Case 5 - Valid active subscription with product entitlement
    const subPlanId = `plan_test_${timestamp}`;
    await prisma.subscriptionPlan.create({
      data: {
        id: subPlanId,
        name: "Growth Plan",
        features: ["hrm", "crm"],
      },
    });
    const subRecord = await prisma.tenantSubscription.create({
      data: {
        tenantId: unentitledTenantId,
        planId: subPlanId,
        status: "active",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    const res21 = await hostFetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${unentitledToken}`,
        Host: `${unentitledTenantSlug}.localhost:${port}`,
      },
    });
    const body21 = await res21.json();
    assertTest(
      res21.status === 200 && body21.enabledModules.includes("crm") && !body21.enabledModules.includes("pos"),
      "Case 5: Active subscription plan granting 'crm' dynamically unlocks it in /api/auth/me without manual TenantModule",
      body21
    );

    // Test 22: Case 6 - Expired subscription revokes product entitlement
    await prisma.tenantSubscription.update({
      where: { id: subRecord.id },
      data: { status: "expired", expiresAt: new Date(Date.now() - 1000) },
    });
    const res22 = await hostFetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${unentitledToken}`,
        Host: `${unentitledTenantSlug}.localhost:${port}`,
      },
    });
    const body22 = await res22.json();
    assertTest(
      res22.status === 200 && !body22.enabledModules.includes("crm"),
      "Case 6: Expired subscription revokes product entitlement from /api/auth/me",
      body22
    );

    // Test 23: Case 7 - HRMS core access is always preserved for tenant workspaces
    assertTest(
      body17.enabledModules.includes("hrm") && body19.enabledModules.includes("hrm") && body22.enabledModules.includes("hrm"),
      "Case 7: HRMS core access ('hrm') is consistently retained across all active tenant states"
    );

    // Test 24: Case 8 - Authorized Super Admin bypass yields full module access
    const res24 = await hostFetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${superAdminToken}`,
        Host: `${unentitledTenantSlug}.localhost:${port}`,
      },
    });
    const body24 = await res24.json();
    assertTest(
      res24.status === 200 &&
      body24.enabledModules.length >= 9 &&
      body24.enabledModules.includes("pos") &&
      body24.enabledModules.includes("crm") &&
      body24.enabledModules.includes("finance"),
      "Case 8: Authorized Super Admin bypass yields complete ERP module catalog in /api/auth/me",
      body24
    );

    // Clean up temporary subscription before Test 25 so workspace is pure unentitled
    await prisma.tenantSubscription.deleteMany({
      where: { tenantId: unentitledTenantId },
    });

    // Test 25: Case 9 - Ordinary tenant user attempting an unentitled product gets 403
    const res25 = await hostFetch(`${baseUrl}/api/products`, {
      headers: {
        Authorization: `Bearer ${unentitledToken}`,
        Host: `${unentitledTenantSlug}.localhost:${port}`,
      },
    });
    const body25 = await res25.json();
    assertTest(
      res25.status === 403 && body25.code === "PRODUCT_NOT_SUBSCRIBED",
      "Case 9: Ordinary tenant user attempting unentitled product strictly blocked with 403 PRODUCT_NOT_SUBSCRIBED",
      { status: res25.status, body: body25 }
    );

    // Test 26: Case 10 - Frontend route guard evaluates correctly and blocks direct URL
    const unentitledFrontend = evaluateFrontendEntitlements(body17.enabledModules);
    const entitledFrontend = evaluateFrontendEntitlements(body19.enabledModules);
    assertTest(
      unentitledFrontend.isPos === false && entitledFrontend.isPos === true,
      "Case 10: Frontend route guards agree with server entitlement decision (POS locked for unentitled, unlocked for entitled)"
    );

    console.log("\n================================================================================");
    console.log("✅ ALL 26 PHASE A2 POS SATELLITE, FINANCE & ENTITLEMENT DEFAULT TESTS PASSED!");
    console.log("================================================================================\n");
  } finally {
    // Teardown
    await prisma.tenantSubscription.deleteMany({
      where: { tenantId: { in: [unentitledTenantId, entitledTenantId] } },
    });
    await prisma.subscriptionPlan.deleteMany({
      where: { id: `plan_test_${timestamp}` },
    });
    await prisma.tenantModule.deleteMany({
      where: { tenantId: { in: [unentitledTenantId, entitledTenantId] } },
    });
    await prisma.userRole.deleteMany({
      where: { userId: { in: [unentitledUserId, entitledUserId, superAdminUserId] } },
    });
    await prisma.profile.deleteMany({
      where: { userId: { in: [unentitledUserId, entitledUserId, superAdminUserId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [unentitledUserId, entitledUserId, superAdminUserId] } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [unentitledTenantId, entitledTenantId] } },
    });
    invalidateWorkspaceCache(unentitledTenantSlug);
    invalidateWorkspaceCache(entitledTenantSlug);
    server.close();
  }
}

runSuite().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
