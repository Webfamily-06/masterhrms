import http from "http";
import express from "express";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import {
  validateWorkspaceSlug,
  setCachedWorkspace,
  invalidateWorkspaceCache,
} from "../lib/workspace-host";
import { workspaceHostMiddleware } from "../middleware/workspace-host.middleware";
import { authRouter } from "../routes/auth.routes";
import { superRouter } from "../routes/super.routes";
import { docsRouter } from "../routes/docs.routes";
import { calendarRouter } from "../routes/calendar.routes";
import { crmRouter } from "../routes/crm.routes";
import { salesRouter } from "../routes/sales.routes";
import { biometricRouter } from "../routes/biometric.routes";
import { requireAuth, AuthRequest } from "../middleware/auth";
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
  console.log("PHASE A1: PLATFORM CORE ENTITLEMENTS & HOST BINDING TEST SUITE");
  console.log("================================================================================");

  // 1. Setup Express app & HTTP Server
  const app = express();
  app.use(express.json());
  app.use(workspaceHostMiddleware);

  // Test echo endpoint for token/host verification
  app.get("/api/test-profile", requireAuth, (req: AuthRequest, res) => {
    res.json({
      success: true,
      tenantId: req.user?.tenantId,
      userId: req.user?.userId,
      roles: req.user?.roles,
      isImpersonating: (req.user as any)?.isImpersonating || false,
    });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/super", superRouter);
  app.use("/api/docs", docsRouter);
  app.use("/api/calendar", calendarRouter);
  app.use("/api/crm", crmRouter);
  app.use("/api/sales", salesRouter);
  app.use("/api/biometric", biometricRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Unique IDs for isolated test execution
  const timestamp = Date.now();
  const tenantAlphaId = `tenant_alpha_${timestamp}`;
  const tenantAlphaSlug = `alpha-ent-${timestamp}`.substring(0, 28);
  const tenantBetaId = `tenant_beta_${timestamp}`;
  const tenantBetaSlug = `beta-ent-${timestamp}`.substring(0, 28);

  const alphaUserId = `user_alpha_${timestamp}`;
  const betaUserId = `user_beta_${timestamp}`;
  const superAdminUserId = `user_super_${timestamp}`;

  try {
    // 2. Seed Test Tenants and Subscriptions
    await prisma.tenant.create({
      data: {
        id: tenantAlphaId,
        name: "Alpha Corp",
        slug: tenantAlphaSlug,
      },
    });

    await prisma.tenant.create({
      data: {
        id: tenantBetaId,
        name: "Beta Corp",
        slug: tenantBetaSlug,
      },
    });

    // Seed starter subscription for Alpha (no CRM, no Google Workspace)
    await (prisma as any).tenantSubscription.create({
      data: {
        tenantId: tenantAlphaId,
        status: "active",
        planType: "starter",
        planId: "starter",
      },
    });

    // Seed starter subscription for Beta
    await (prisma as any).tenantSubscription.create({
      data: {
        tenantId: tenantBetaId,
        status: "active",
        planType: "starter",
        planId: "starter",
      },
    });

    // Seed User Accounts and Profiles
    await prisma.user.create({
      data: {
        id: alphaUserId,
        email: `alpha_${timestamp}@test.local`,
        passwordHash: "mock-hash",
        profile: {
          create: {
            tenantId: tenantAlphaId,
            fullName: "Alpha Admin",
          },
        },
        roles: {
          create: {
            role: "hr_admin",
            tenantId: tenantAlphaId,
          },
        },
      },
    });

    await prisma.user.create({
      data: {
        id: betaUserId,
        email: `beta_${timestamp}@test.local`,
        passwordHash: "mock-hash",
        profile: {
          create: {
            tenantId: tenantBetaId,
            fullName: "Beta Admin",
          },
        },
        roles: {
          create: {
            role: "hr_admin",
            tenantId: tenantBetaId,
          },
        },
      },
    });

    await prisma.user.create({
      data: {
        id: superAdminUserId,
        email: `super_${timestamp}@masterhrms.com`,
        passwordHash: "mock-hash",
        profile: {
          create: {
            tenantId: null,
            fullName: "Root Super Admin",
          },
        },
        roles: {
          create: {
            role: "super_admin",
            tenantId: null,
          },
        },
      },
    });

    // Cache workspaces for immediate host resolution
    setCachedWorkspace(tenantAlphaSlug, {
      tenantId: tenantAlphaId,
      name: "Alpha Corp",
      slug: tenantAlphaSlug,
      status: "active",
      isRedirect: false,
    });
    setCachedWorkspace(tenantBetaSlug, {
      tenantId: tenantBetaId,
      name: "Beta Corp",
      slug: tenantBetaSlug,
      status: "active",
      isRedirect: false,
    });

    // Generate test JWTs
    const alphaToken = generateToken({
      userId: alphaUserId,
      email: `alpha_${timestamp}@test.local`,
      tenantId: tenantAlphaId,
      roles: ["hr_admin", "admin"],
    });

    const betaToken = generateToken({
      userId: betaUserId,
      email: `beta_${timestamp}@test.local`,
      tenantId: tenantBetaId,
      roles: ["hr_admin", "admin"],
    });

    const superToken = generateToken({
      userId: superAdminUserId,
      email: `super_${timestamp}@masterhrms.com`,
      tenantId: null,
      roles: ["super_admin"],
    });

    // =========================================================================
    // PART 1: HOST-TO-JWT TENANT BINDING & AUDITED IMPERSONATION
    // =========================================================================
    console.log("\n--- Part 1: Host-to-JWT Tenant Binding & Impersonation ---");

    // Test 1: Alpha token on Alpha host -> PASS (200)
    const res1 = await hostFetch(`${baseUrl}/api/test-profile`, {
      headers: {
        Host: `${tenantAlphaSlug}.localhost:${port}`,
        Authorization: `Bearer ${alphaToken}`,
      },
    });
    const body1 = await res1.json();
    assertTest(res1.status === 200 && body1.tenantId === tenantAlphaId, "Alpha token on Alpha host allowed (200 OK)");

    // Test 2: Negative cross-tenant: Alpha token on Beta host -> 403 TENANT_HOST_MISMATCH
    const res2 = await hostFetch(`${baseUrl}/api/test-profile`, {
      headers: {
        Host: `${tenantBetaSlug}.localhost:${port}`,
        Authorization: `Bearer ${alphaToken}`,
      },
    });
    const body2 = await res2.json();
    assertTest(
      res2.status === 403 && body2.code === "TENANT_HOST_MISMATCH",
      "Negative cross-tenant token on foreign host rejected with 403 TENANT_HOST_MISMATCH",
      body2
    );

    // Test 3: Negative cross-tenant: Beta token on Alpha host -> 403 TENANT_HOST_MISMATCH
    const res3 = await hostFetch(`${baseUrl}/api/test-profile`, {
      headers: {
        Host: `${tenantAlphaSlug}.localhost:${port}`,
        Authorization: `Bearer ${betaToken}`,
      },
    });
    const body3 = await res3.json();
    assertTest(
      res3.status === 403 && body3.code === "TENANT_HOST_MISMATCH",
      "Negative cross-tenant token on reverse host rejected with 403 TENANT_HOST_MISMATCH",
      body3
    );

    // Test 4: Super Admin direct access to Alpha host -> 200 OK & Audited in AuditLog
    const res4 = await hostFetch(`${baseUrl}/api/test-profile`, {
      headers: {
        Host: `${tenantAlphaSlug}.localhost:${port}`,
        Authorization: `Bearer ${superToken}`,
      },
    });
    const body4 = await res4.json();
    assertTest(
      res4.status === 200 && body4.tenantId === tenantAlphaId,
      "Super Admin direct access to tenant host allowed with auto-bound tenant context"
    );

    const superAccessAudit = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenantAlphaId,
        action: "SUPER_ADMIN_WORKSPACE_ACCESS",
        actorId: superAdminUserId,
      },
      orderBy: { createdAt: "desc" },
    });
    assertTest(Boolean(superAccessAudit), "Super Admin host access written to immutable AuditLog");

    // Test 5: Super Admin 1-Click Impersonation POST /api/super/impersonate/:tenantId
    const res5 = await hostFetch(`${baseUrl}/api/super/impersonate/${tenantAlphaId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${superToken}`,
      },
    });
    const body5 = await res5.json();
    assertTest(res5.status === 200 && body5.isImpersonating === true, "POST /api/super/impersonate returns scoped token");

    const impersonationStartAudit = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenantAlphaId,
        action: "SUPER_ADMIN_IMPERSONATION_STARTED",
        actorId: superAdminUserId,
      },
    });
    assertTest(Boolean(impersonationStartAudit), "Impersonation start recorded in AuditLog");

    const impersonationToken = body5.token;

    // Test 6: Impersonation token accessing target Alpha host -> 200 OK
    const res6 = await hostFetch(`${baseUrl}/api/test-profile`, {
      headers: {
        Host: `${tenantAlphaSlug}.localhost:${port}`,
        Authorization: `Bearer ${impersonationToken}`,
      },
    });
    const body6 = await res6.json();
    assertTest(
      res6.status === 200 && body6.isImpersonating === true && body6.tenantId === tenantAlphaId,
      "Impersonation token on matching tenant host accepted"
    );

    // Test 7: Impersonation token for Alpha hitting Beta host -> 403 TENANT_HOST_MISMATCH
    const res7 = await hostFetch(`${baseUrl}/api/test-profile`, {
      headers: {
        Host: `${tenantBetaSlug}.localhost:${port}`,
        Authorization: `Bearer ${impersonationToken}`,
      },
    });
    const body7 = await res7.json();
    assertTest(
      res7.status === 403 && body7.code === "TENANT_HOST_MISMATCH",
      "Alpha impersonation token blocked from Beta host with 403 TENANT_HOST_MISMATCH"
    );

    // Test 8: Super Admin exit impersonation POST /api/super/leave-impersonation
    const res8 = await hostFetch(`${baseUrl}/api/super/leave-impersonation`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${impersonationToken}`,
      },
    });
    const body8 = await res8.json();
    assertTest(res8.status === 200 && body8.success === true, "POST /api/super/leave-impersonation exits successfully");

    const impersonationEndAudit = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenantAlphaId,
        action: "SUPER_ADMIN_IMPERSONATION_ENDED",
        actorId: superAdminUserId,
      },
    });
    assertTest(Boolean(impersonationEndAudit), "Impersonation exit recorded in AuditLog");

    // =========================================================================
    // PART 2: PROTECTED DOCS ROUTES IN PRODUCTION
    // =========================================================================
    console.log("\n--- Part 2: Protected Docs Routes in Production ---");

    // Test 9: GET /api/docs/metadata without auth in production -> 401
    const res9 = await hostFetch(`${baseUrl}/api/docs/metadata`, {
      headers: {
        "x-enforce-docs-protection": "true",
      },
    });
    assertTest(res9.status === 401, "GET /api/docs/metadata blocked without auth (401)");

    // Test 10: GET /api/docs/metadata with regular tenant user in production -> 403
    const res10 = await hostFetch(`${baseUrl}/api/docs/metadata`, {
      headers: {
        "x-enforce-docs-protection": "true",
        Authorization: `Bearer ${alphaToken}`,
      },
    });
    assertTest(res10.status === 403, "GET /api/docs/metadata blocked for non-super-admin user (403)");

    // Test 11: GET /api/docs/metadata with super admin in production -> 200 OK
    const res11 = await hostFetch(`${baseUrl}/api/docs/metadata`, {
      headers: {
        "x-enforce-docs-protection": "true",
        Authorization: `Bearer ${superToken}`,
      },
    });
    const body11 = await res11.json();
    assertTest(res11.status === 200 && Array.isArray(body11.endpoints), "GET /api/docs/metadata allowed for Super Admin in production");

    // Test 12: POST /api/docs/execute without auth in production -> 401
    const res12 = await hostFetch(`${baseUrl}/api/docs/execute`, {
      method: "POST",
      headers: {
        "x-enforce-docs-protection": "true",
      },
      body: JSON.stringify({ method: "GET", url: "/api/health" }),
    });
    assertTest(res12.status === 401, "POST /api/docs/execute blocked without auth in production (401)");

    // Test 13: POST /api/docs/execute with tenant admin in production -> 403
    const res13 = await hostFetch(`${baseUrl}/api/docs/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-enforce-docs-protection": "true",
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify({ method: "GET", url: "/api/health" }),
    });
    assertTest(res13.status === 403, "POST /api/docs/execute blocked for tenant admin in production (403)");

    // =========================================================================
    // PART 3: RESERVED WORKSPACE SLUG VALIDATION
    // =========================================================================
    console.log("\n--- Part 3: Reserved Workspace Slug Validation ---");

    const reservedSlugsToTest = ["admin", "api", "super", "dashboard", "developer", "auth", "docs"];
    for (const reservedSlug of reservedSlugsToTest) {
      const resSlug = await hostFetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `reserved_test_${reservedSlug}_${timestamp}@test.local`,
          password: "password123",
          fullName: "Reserved Tester",
          workspaceSlug: reservedSlug,
        }),
      });
      const bodySlug = await resSlug.json();
      assertTest(
        resSlug.status === 400 && bodySlug.code === "RESERVED_SLUG",
        `Register with reserved slug '${reservedSlug}' returns 400 RESERVED_SLUG`
      );
    }

    // Test valid slug returns valid in validateWorkspaceSlug
    const validValidation = validateWorkspaceSlug("valid-new-corp");
    assertTest(validValidation.valid === true, "Valid slug 'valid-new-corp' passes validation");

    // =========================================================================
    // PART 4: UNIFIED PRODUCT AND ADD-ON ENTITLEMENT GUARD
    // =========================================================================
    console.log("\n--- Part 4: Unified Product & Add-On Entitlement Guard ---");

    // Test 21: Direct function: Base HRMS is entitled by default on active workspace
    const hrmsEnt = await checkTenantEntitlement(tenantAlphaId, "product_hrms");
    assertTest(hrmsEnt.entitled === true && hrmsEnt.type === "product", "Base HRMS entitled by default");

    // Test 22: Direct function: Product CRM not entitled on starter plan
    const crmEnt = await checkTenantEntitlement(tenantAlphaId, "product_crm");
    assertTest(crmEnt.entitled === false && crmEnt.type === "product", "Product CRM not entitled without subscription");

    // Test 23: Direct function: Super admin bypasses entitlement
    const superEnt = await checkTenantEntitlement(tenantAlphaId, "product_crm", true);
    assertTest(superEnt.entitled === true && superEnt.source === "super_admin_bypass", "Super admin bypasses entitlement check");

    // Test 24: Direct function: Module enablement awards entitlement
    await prisma.tenantModule.create({
      data: {
        tenantId: tenantAlphaId,
        moduleKey: "crm",
        isEnabled: true,
      },
    });
    const crmModEnt = await checkTenantEntitlement(tenantAlphaId, "product_crm");
    assertTest(crmModEnt.entitled === true && crmModEnt.source === "module", "Active TenantModule awards CRM entitlement");

    // Test 25: Direct function: Explicitly disabled module revokes entitlement
    await prisma.tenantModule.update({
      where: { tenantId_moduleKey: { tenantId: tenantAlphaId, moduleKey: "crm" } },
      data: { isEnabled: false },
    });
    const crmDisabledEnt = await checkTenantEntitlement(tenantAlphaId, "product_crm");
    assertTest(crmDisabledEnt.entitled === false && crmDisabledEnt.status === "disabled", "Disabled TenantModule blocks entitlement");

    // Test 26: Route guard: Tenant Alpha without CRM hitting /api/crm/deals -> 403 PRODUCT_NOT_SUBSCRIBED
    const resCrmBlocked = await hostFetch(`${baseUrl}/api/crm/deals`, {
      headers: {
        Authorization: `Bearer ${alphaToken}`,
      },
    });
    const bodyCrmBlocked = await resCrmBlocked.json();
    assertTest(
      resCrmBlocked.status === 403 && bodyCrmBlocked.code === "PRODUCT_NOT_SUBSCRIBED",
      "Calling CRM endpoint without subscription rejected with 403 PRODUCT_NOT_SUBSCRIBED"
    );

    // Test 27: Route guard: Tenant Alpha without Google Workspace hitting /api/calendar/google-sync -> 403 ADDON_REQUIRED
    const resCalBlocked = await hostFetch(`${baseUrl}/api/calendar/google-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify({}),
    });
    const bodyCalBlocked = await resCalBlocked.json();
    assertTest(
      resCalBlocked.status === 403 && bodyCalBlocked.code === "ADDON_REQUIRED",
      "Calling Google sync without add-on rejected with 403 ADDON_REQUIRED"
    );

    // Test 28: Add active TenantAddon for google-workspace -> 200 OK
    const googleAddon = await (prisma as any).tenantAddon.create({
      data: {
        tenantId: tenantAlphaId,
        addonSlug: "google-workspace",
        status: "active",
      },
    });

    const resCalAllowed = await hostFetch(`${baseUrl}/api/calendar/google-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify({}),
    });
    const bodyCalAllowed = await resCalAllowed.json();
    assertTest(resCalAllowed.status === 200 && bodyCalAllowed.success === true, "Google sync allowed when add-on is active (200 OK)");

    // Test 29: Expired Add-on trial -> 403 ADDON_EXPIRED
    await (prisma as any).tenantAddon.update({
      where: { id: googleAddon.id },
      data: {
        status: "trial",
        trialEndsAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
      },
    });

    const resCalExpired = await hostFetch(`${baseUrl}/api/calendar/google-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify({}),
    });
    const bodyCalExpired = await resCalExpired.json();
    assertTest(
      resCalExpired.status === 403 && bodyCalExpired.code === "ADDON_EXPIRED",
      "Google sync rejected with 403 ADDON_EXPIRED when trial timestamp has elapsed"
    );

    // Test 34: Super Admin bypasses CRM route entitlement
    const resCrmSuper = await hostFetch(`${baseUrl}/api/crm/deals`, {
      headers: {
        Host: `${tenantAlphaSlug}.localhost:${port}`,
        Authorization: `Bearer ${superToken}`,
      },
    });
    assertTest(resCrmSuper.status === 200, "Super Admin bypasses CRM route entitlement check (200 OK)");

    // Test 35: Route guard: Tenant Alpha without POS hitting /api/sales -> 403 PRODUCT_NOT_SUBSCRIBED
    const resPosBlocked = await hostFetch(`${baseUrl}/api/sales`, {
      headers: {
        Host: `${tenantAlphaSlug}.localhost:${port}`,
        Authorization: `Bearer ${alphaToken}`,
      },
    });
    const bodyPosBlocked = await resPosBlocked.json();
    assertTest(
      resPosBlocked.status === 403 && bodyPosBlocked.code === "PRODUCT_NOT_SUBSCRIBED",
      "Calling POS /api/sales without subscription rejected with 403 PRODUCT_NOT_SUBSCRIBED"
    );

    // Test 36: Provision POS module -> /api/sales allowed (200 OK)
    await prisma.tenantModule.create({
      data: {
        tenantId: tenantAlphaId,
        moduleKey: "pos",
        isEnabled: true,
      },
    });
    const resPosAllowed = await hostFetch(`${baseUrl}/api/sales`, {
      headers: {
        Host: `${tenantAlphaSlug}.localhost:${port}`,
        Authorization: `Bearer ${alphaToken}`,
      },
    });
    assertTest(resPosAllowed.status === 200, "POS /api/sales allowed when pos module is active (200 OK)");

    // Test 37: Biometric sync management route /api/biometric/devices -> 200 OK
    const resBioAllowed = await hostFetch(`${baseUrl}/api/biometric/devices`, {
      headers: {
        Host: `${tenantAlphaSlug}.localhost:${port}`,
        Authorization: `Bearer ${alphaToken}`,
      },
    });
    assertTest(resBioAllowed.status === 200, "Biometric devices management allowed when entitled (200 OK)");

    // Test 38: Super Admin bypasses POS route entitlement
    const resPosSuper = await hostFetch(`${baseUrl}/api/sales`, {
      headers: {
        Host: `${tenantAlphaSlug}.localhost:${port}`,
        Authorization: `Bearer ${superToken}`,
      },
    });
    assertTest(resPosSuper.status === 200, "Super Admin bypasses POS route entitlement check (200 OK)");

    console.log("\n================================================================================");
    console.log(`✅ ALL 38 PLATFORM CORE ENTITLEMENTS & HOST BINDING TESTS PASSED!`);
    console.log("================================================================================\n");
  } finally {
    // Teardown test server and cleanup fixtures
    server.close();
    invalidateWorkspaceCache(tenantAlphaSlug);
    invalidateWorkspaceCache(tenantBetaSlug);

    try {
      await (prisma as any).tenantAddon.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
      await prisma.tenantModule.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
      await (prisma as any).tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
      await prisma.auditLog.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
      await prisma.userRole.deleteMany({ where: { userId: { in: [alphaUserId, betaUserId, superAdminUserId] } } });
      await prisma.profile.deleteMany({ where: { userId: { in: [alphaUserId, betaUserId, superAdminUserId] } } });
      await prisma.user.deleteMany({ where: { id: { in: [alphaUserId, betaUserId, superAdminUserId] } } });
      await prisma.tenant.deleteMany({ where: { id: { in: [tenantAlphaId, tenantBetaId] } } });
    } catch (cleanupErr: any) {
      console.warn("Cleanup warning:", cleanupErr.message);
    }
  }
}

runSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
