import dotenv from "dotenv";
import path from "path";
import http from "http";
import express from "express";
import { rawPrisma as prisma } from "../prisma";
import { generateToken, verifyToken } from "../lib/jwt";
import { superRouter } from "../routes/super.routes";
import { workspaceRouter } from "../routes/workspace.routes";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

interface TestReportItem {
  id: number;
  scenario: string;
  passed: boolean;
  durationMs: number;
  evidence: string;
}

const report: TestReportItem[] = [];

async function runWave1TestSuite() {
  console.log("================================================================================");
  console.log("PHASE C — WAVE 1: CONTROLLED CORE SAAS CONTROL PLANE TEST SUITE");
  console.log("Testing: Impersonation, Plans CRUD, Addon Engine, Settings & Tenant Isolation");
  console.log("Runtime: Node.js 20 LTS | Prisma 5.19.1 | Express 4 | MySQL/MariaDB 10.11");
  console.log("================================================================================\n");

  // Spin up an ephemeral Express test server
  const app = express();
  app.use(express.json());
  app.use("/api/super", superRouter);
  app.use("/api/workspace", workspaceRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  console.log(`Ephemeral test API running on ${baseUrl}\n`);

  // Setup test fixtures in database
  const tenantAlphaId = "wave1_test_tenant_alpha";
  const tenantBetaId = "wave1_test_tenant_beta";
  const superAdminUserId = "wave1_super_admin_user";
  const tenantAlphaAdminUserId = "wave1_alpha_admin_user";
  const tenantBetaAdminUserId = "wave1_beta_admin_user";

  try {
    // Upsert tenants
    await prisma.tenant.upsert({
      where: { id: tenantAlphaId },
      create: { id: tenantAlphaId, name: "Alpha Wave 1 Corp", slug: "alpha-wave1-test" },
      update: { name: "Alpha Wave 1 Corp" },
    });

    await prisma.tenant.upsert({
      where: { id: tenantBetaId },
      create: { id: tenantBetaId, name: "Beta Wave 1 Corp", slug: "beta-wave1-test" },
      update: { name: "Beta Wave 1 Corp" },
    });

    // Create users & profiles
    await prisma.user.upsert({
      where: { id: superAdminUserId },
      create: { id: superAdminUserId, email: "superadmin@wave1-test.local", passwordHash: "dummy" },
      update: {},
    });
    await prisma.profile.upsert({
      where: { userId: superAdminUserId },
      create: { userId: superAdminUserId, email: "superadmin@wave1-test.local", fullName: "Super Admin Tester" },
      update: {},
    });
    await prisma.userRole.deleteMany({ where: { userId: superAdminUserId } });
    await prisma.userRole.create({
      data: { userId: superAdminUserId, role: "super_admin", tenantId: null },
    });

    await prisma.user.upsert({
      where: { id: tenantAlphaAdminUserId },
      create: { id: tenantAlphaAdminUserId, email: "alpha-admin@wave1-test.local", passwordHash: "dummy" },
      update: {},
    });
    await prisma.profile.upsert({
      where: { userId: tenantAlphaAdminUserId },
      create: { userId: tenantAlphaAdminUserId, email: "alpha-admin@wave1-test.local", fullName: "Alpha Admin", tenantId: tenantAlphaId },
      update: { tenantId: tenantAlphaId },
    });
    await prisma.userRole.deleteMany({ where: { userId: tenantAlphaAdminUserId } });
    await prisma.userRole.create({
      data: { userId: tenantAlphaAdminUserId, role: "hr_admin", tenantId: tenantAlphaId },
    });

    await prisma.user.upsert({
      where: { id: tenantBetaAdminUserId },
      create: { id: tenantBetaAdminUserId, email: "beta-admin@wave1-test.local", passwordHash: "dummy" },
      update: {},
    });
    await prisma.profile.upsert({
      where: { userId: tenantBetaAdminUserId },
      create: { userId: tenantBetaAdminUserId, email: "beta-admin@wave1-test.local", fullName: "Beta Admin", tenantId: tenantBetaId },
      update: { tenantId: tenantBetaId },
    });
    await prisma.userRole.deleteMany({ where: { userId: tenantBetaAdminUserId } });
    await prisma.userRole.create({
      data: { userId: tenantBetaAdminUserId, role: "hr_admin", tenantId: tenantBetaId },
    });
  } catch (err: any) {
    console.error("Fixture setup warning (non-fatal):", err.message);
  }

  // Pre-generate tokens
  const superAdminToken = generateToken({
    userId: superAdminUserId,
    email: "superadmin@wave1-test.local",
    tenantId: null,
    roles: ["super_admin"],
  });

  const tenantAlphaAdminToken = generateToken({
    userId: tenantAlphaAdminUserId,
    email: "alpha-admin@wave1-test.local",
    tenantId: tenantAlphaId,
    roles: ["hr_admin"],
  });

  const tenantBetaAdminToken = generateToken({
    userId: tenantBetaAdminUserId,
    email: "beta-admin@wave1-test.local",
    tenantId: tenantBetaId,
    roles: ["hr_admin"],
  });

  let activeImpersonationToken = "";
  let createdPlanId = "";
  let createdAddonId = "";

  // =========================================================================
  // SCENARIO 1: Super Admin Impersonation Token Issuance & Claims
  // =========================================================================
  {
    const start = Date.now();
    try {
      const res = await fetch(`${baseUrl}/api/super/impersonate/${tenantAlphaId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
      });

      const body: any = await res.json();
      const decoded = verifyToken(body.token);

      const passed =
        res.status === 200 &&
        Boolean(body.token) &&
        body.isImpersonating === true &&
        decoded.isImpersonating === true &&
        decoded.impersonatorUserId === superAdminUserId &&
        decoded.tenantId === tenantAlphaId;

      activeImpersonationToken = body.token;

      report.push({
        id: 1,
        scenario: "1. Super Admin Impersonation Token Issuance & Cryptographic Claims",
        passed,
        durationMs: Date.now() - start,
        evidence: `HTTP ${res.status} | isImpersonating=${decoded.isImpersonating} | tenantId=${decoded.tenantId} | impersonator=${decoded.impersonatorUserId}`,
      });
    } catch (err: any) {
      report.push({
        id: 1,
        scenario: "1. Super Admin Impersonation Token Issuance & Cryptographic Claims",
        passed: false,
        durationMs: Date.now() - start,
        evidence: err.message,
      });
    }
  }

  // =========================================================================
  // SCENARIO 2: Leave Impersonation & Session Restoration
  // =========================================================================
  {
    const start = Date.now();
    try {
      const res = await fetch(`${baseUrl}/api/super/leave-impersonation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeImpersonationToken}`,
        },
      });

      const body: any = await res.json();
      const decoded = verifyToken(body.token);

      const passed =
        res.status === 200 &&
        body.success === true &&
        decoded.isImpersonating !== true &&
        decoded.tenantId === null &&
        decoded.roles.includes("super_admin") &&
        decoded.userId === superAdminUserId;

      report.push({
        id: 2,
        scenario: "2. Leave Impersonation & Super Admin Console Session Restoration",
        passed,
        durationMs: Date.now() - start,
        evidence: `HTTP ${res.status} | restored tenantId=${decoded.tenantId} | roles=${decoded.roles.join(",")} | impersonating=${Boolean(decoded.isImpersonating)}`,
      });
    } catch (err: any) {
      report.push({
        id: 2,
        scenario: "2. Leave Impersonation & Super Admin Console Session Restoration",
        passed: false,
        durationMs: Date.now() - start,
        evidence: err.message,
      });
    }
  }

  // =========================================================================
  // SCENARIO 3: Leave Impersonation Rejection for Non-Impersonated Sessions
  // =========================================================================
  {
    const start = Date.now();
    try {
      const res = await fetch(`${baseUrl}/api/super/leave-impersonation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
      });

      const body: any = await res.json();
      const passed = res.status === 400 && body.error === "Active session is not an impersonation session.";

      report.push({
        id: 3,
        scenario: "3. Leave Impersonation Rejection for Non-Impersonated Sessions",
        passed,
        durationMs: Date.now() - start,
        evidence: `HTTP ${res.status} | Rejected correctly: "${body.error}"`,
      });
    } catch (err: any) {
      report.push({
        id: 3,
        scenario: "3. Leave Impersonation Rejection for Non-Impersonated Sessions",
        passed: false,
        durationMs: Date.now() - start,
        evidence: err.message,
      });
    }
  }

  // =========================================================================
  // SCENARIO 4: Security & RBAC Barrier (Non-Super Admin Rejection)
  // =========================================================================
  {
    const start = Date.now();
    try {
      const res1 = await fetch(`${baseUrl}/api/super/impersonate/${tenantAlphaId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tenantAlphaAdminToken}` },
      });

      const res2 = await fetch(`${baseUrl}/api/super/plans`, {
        method: "GET",
        headers: { Authorization: `Bearer ${tenantAlphaAdminToken}` },
      });

      const res3 = await fetch(`${baseUrl}/api/super/addons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantAlphaAdminToken}`,
        },
        body: JSON.stringify({ name: "Hacked Addon", slug: "hacked", category: "core" }),
      });

      const passed = res1.status === 403 && res2.status === 403 && res3.status === 403;

      report.push({
        id: 4,
        scenario: "4. Security & RBAC Enforcement (Tenant Admin Forbidden from Super APIs)",
        passed,
        durationMs: Date.now() - start,
        evidence: `Impersonate: HTTP ${res1.status} | Plans: HTTP ${res2.status} | Addons: HTTP ${res3.status}`,
      });
    } catch (err: any) {
      report.push({
        id: 4,
        scenario: "4. Security & RBAC Enforcement (Tenant Admin Forbidden from Super APIs)",
        passed: false,
        durationMs: Date.now() - start,
        evidence: err.message,
      });
    }
  }

  // =========================================================================
  // SCENARIO 5: Tenant Workspace Status Lifecycle (Suspend & Reactivate)
  // =========================================================================
  {
    const start = Date.now();
    try {
      // 1. Suspend tenant
      const suspendRes = await fetch(`${baseUrl}/api/super/tenants/${tenantAlphaId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({ status: "suspended" }),
      });

      const subAfterSuspend = await prisma.tenantSubscription.findUnique({
        where: { tenantId: tenantAlphaId },
      });

      // 2. Reactivate tenant
      const activateRes = await fetch(`${baseUrl}/api/super/tenants/${tenantAlphaId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({ status: "active" }),
      });

      const subAfterActivate = await prisma.tenantSubscription.findUnique({
        where: { tenantId: tenantAlphaId },
      });

      // 3. Invalid status check
      const invalidRes = await fetch(`${baseUrl}/api/super/tenants/${tenantAlphaId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({ status: "invalid_status_code" }),
      });

      const passed =
        suspendRes.status === 200 &&
        subAfterSuspend?.status === "suspended" &&
        activateRes.status === 200 &&
        subAfterActivate?.status === "active" &&
        invalidRes.status === 400;

      report.push({
        id: 5,
        scenario: "5. Tenant Workspace Status Lifecycle & Validation (Active <-> Suspended)",
        passed,
        durationMs: Date.now() - start,
        evidence: `Suspend: HTTP ${suspendRes.status} (DB: ${subAfterSuspend?.status}) | Activate: HTTP ${activateRes.status} (DB: ${subAfterActivate?.status}) | Invalid: HTTP ${invalidRes.status}`,
      });
    } catch (err: any) {
      report.push({
        id: 5,
        scenario: "5. Tenant Workspace Status Lifecycle & Validation (Active <-> Suspended)",
        passed: false,
        durationMs: Date.now() - start,
        evidence: err.message,
      });
    }
  }

  // =========================================================================
  // SCENARIO 6: Relational Subscription Plans CRUD Lifecycle
  // =========================================================================
  {
    const start = Date.now();
    try {
      // 1. Create plan
      const createRes = await fetch(`${baseUrl}/api/super/plans`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          name: "Wave 1 Enterprise Scale",
          description: "High-scale enterprise tier for Wave 1 testing",
          priceMonthly: 7999,
          priceAnnual: 79990,
          maxEmployees: 1000,
          maxUsers: 100,
          features: ["Automated Payroll", "Asset Tracking", "Multi-Warehouse POS"],
          isPopular: true,
        }),
      });

      const createdPlan: any = await createRes.json();
      createdPlanId = createdPlan.id;

      // 2. Fetch plans list
      const listRes = await fetch(`${baseUrl}/api/super/plans`, {
        method: "GET",
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const listBody: any = await listRes.json();
      const planInList = Array.isArray(listBody) && listBody.some((p: any) => p.id === createdPlanId);

      // 3. Update plan
      const updateRes = await fetch(`${baseUrl}/api/super/plans/${createdPlanId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          priceMonthly: 8999,
          maxEmployees: 1500,
        }),
      });
      const updatedPlan: any = await updateRes.json();

      // 4. Test Deletion Protection (attach to tenant subscription first)
      await prisma.tenantSubscription.upsert({
        where: { tenantId: tenantAlphaId },
        create: { tenantId: tenantAlphaId, planId: createdPlanId, status: "active" },
        update: { planId: createdPlanId },
      });

      const protectedDeleteRes = await fetch(`${baseUrl}/api/super/plans/${createdPlanId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      // 5. Unlink and successfully delete
      await prisma.tenantSubscription.update({
        where: { tenantId: tenantAlphaId },
        data: { planId: null },
      });

      const successfulDeleteRes = await fetch(`${baseUrl}/api/super/plans/${createdPlanId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      const passed =
        createRes.status === 201 &&
        planInList &&
        updateRes.status === 200 &&
        Number(updatedPlan.priceMonthly) === 8999 &&
        protectedDeleteRes.status === 400 &&
        successfulDeleteRes.status === 200;

      report.push({
        id: 6,
        scenario: "6. Relational Subscription Plans CRUD Lifecycle & Deletion Protection",
        passed,
        durationMs: Date.now() - start,
        evidence: `Created: HTTP ${createRes.status} (${createdPlanId}) | Listed: ${planInList} | Updated: HTTP ${updateRes.status} | Protected Delete: HTTP ${protectedDeleteRes.status} | Final Delete: HTTP ${successfulDeleteRes.status}`,
      });
    } catch (err: any) {
      report.push({
        id: 6,
        scenario: "6. Relational Subscription Plans CRUD Lifecycle & Deletion Protection",
        passed: false,
        durationMs: Date.now() - start,
        evidence: err.message,
      });
    }
  }

  // =========================================================================
  // SCENARIO 7: Addon Catalog CRUD & Tenant Override Entitlement
  // =========================================================================
  {
    const start = Date.now();
    try {
      const testAddonSlug = `wave1-biometric-addon-${Date.now()}`;

      // 1. Create addon in catalog
      const createRes = await fetch(`${baseUrl}/api/super/addons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          name: "Wave 1 Biometric Sync Engine",
          slug: testAddonSlug,
          category: "hardware",
          tagline: "High-speed biometric sync daemon",
          description: "Syncs ZKTeco and Hikvision biometrics into ERP attendance",
          priceMonthly: 1499,
          version: "1.2.0",
        }),
      });

      const createdAddon: any = await createRes.json();
      createdAddonId = createdAddon.id;

      // 2. Fetch addon list
      const listRes = await fetch(`${baseUrl}/api/super/addons`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const list: any = await listRes.json();
      const inList = Array.isArray(list) && list.some((a: any) => a.slug === testAddonSlug);

      // 3. Super Admin Override: Enable addon for Tenant Alpha
      const enableRes = await fetch(`${baseUrl}/api/super/tenants/${tenantAlphaId}/addons/${testAddonSlug}/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({ enabled: true }),
      });
      const enableBody: any = await enableRes.json();

      // Verify DB record
      const dbEntitlementActive = await prisma.tenantAddon.findUnique({
        where: { tenantId_addonSlug: { tenantId: tenantAlphaId, addonSlug: testAddonSlug } },
      });

      // 4. Super Admin Override: Disable addon for Tenant Alpha
      const disableRes = await fetch(`${baseUrl}/api/super/tenants/${tenantAlphaId}/addons/${testAddonSlug}/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({ enabled: false }),
      });
      const disableBody: any = await disableRes.json();

      const dbEntitlementCancelled = await prisma.tenantAddon.findUnique({
        where: { tenantId_addonSlug: { tenantId: tenantAlphaId, addonSlug: testAddonSlug } },
      });

      // 5. Clean up addon
      const deleteRes = await fetch(`${baseUrl}/api/super/addons/${createdAddonId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      // Clean up tenant addon record
      await prisma.tenantAddon.deleteMany({
        where: { addonSlug: testAddonSlug },
      });

      const passed =
        createRes.status === 201 &&
        inList &&
        enableRes.status === 200 &&
        dbEntitlementActive?.status === "active" &&
        disableRes.status === 200 &&
        dbEntitlementCancelled?.status === "cancelled" &&
        deleteRes.status === 200;

      report.push({
        id: 7,
        scenario: "7. Addon Catalog CRUD & Super Admin Tenant Entitlement Override",
        passed,
        durationMs: Date.now() - start,
        evidence: `Created: HTTP ${createRes.status} | Listed: ${inList} | Enabled: ${dbEntitlementActive?.status} | Disabled: ${dbEntitlementCancelled?.status} | Deleted: HTTP ${deleteRes.status}`,
      });
    } catch (err: any) {
      report.push({
        id: 7,
        scenario: "7. Addon Catalog CRUD & Super Admin Tenant Entitlement Override",
        passed: false,
        durationMs: Date.now() - start,
        evidence: err.message,
      });
    }
  }

  // =========================================================================
  // SCENARIO 8: Platform-Wide Global Settings Persistence
  // =========================================================================
  {
    const start = Date.now();
    try {
      const getRes = await fetch(`${baseUrl}/api/super/settings`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const initialSettings: any = await getRes.json();

      const putRes = await fetch(`${baseUrl}/api/super/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          platformName: "Master ERP Cloud Wave 1 Enterprise",
          defaultCurrency: "EUR",
          currencySymbol: "€",
          defaultLanguage: "en",
          allowRegistration: false,
          enableTwoFactor: true,
        }),
      });
      const putBody: any = await putRes.json();

      const verifyRes = await fetch(`${baseUrl}/api/super/settings`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const verifiedSettings: any = await verifyRes.json();

      const passed =
        getRes.status === 200 &&
        putRes.status === 200 &&
        verifiedSettings.platformName === "Master ERP Cloud Wave 1 Enterprise" &&
        verifiedSettings.defaultCurrency === "EUR" &&
        verifiedSettings.allowRegistration === false;

      report.push({
        id: 8,
        scenario: "8. Platform-Wide Global Settings Persistence & Retrieval",
        passed,
        durationMs: Date.now() - start,
        evidence: `HTTP ${putRes.status} | Saved Name: "${verifiedSettings.platformName}" | Currency: ${verifiedSettings.defaultCurrency} | AllowReg: ${verifiedSettings.allowRegistration}`,
      });
    } catch (err: any) {
      report.push({
        id: 8,
        scenario: "8. Platform-Wide Global Settings Persistence & Retrieval",
        passed: false,
        durationMs: Date.now() - start,
        evidence: err.message,
      });
    }
  }

  // =========================================================================
  // SCENARIO 9: Tenant-Scoped Branding & Company Settings Updates
  // =========================================================================
  {
    const start = Date.now();
    try {
      // 1. Update branding for Tenant Alpha
      const brandRes = await fetch(`${baseUrl}/api/workspace/settings/brand`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantAlphaAdminToken}`,
        },
        body: JSON.stringify({
          titleText: "Alpha Enterprise Portal",
          footerText: "Alpha Corp © 2026",
          themeColor: "emerald",
          themeMode: "dark",
          currency: "USD",
          currencySymbol: "$",
        }),
      });

      // 2. Update company profile for Tenant Alpha
      const companyRes = await fetch(`${baseUrl}/api/workspace/settings/company`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantAlphaAdminToken}`,
        },
        body: JSON.stringify({
          companyName: "Alpha Global Solutions Ltd",
          phone: "+1-800-555-0199",
          address: "450 Silicon Avenue, Suite 100",
          city: "San Jose",
          state: "California",
          country: "United States",
          zipCode: "95134",
          taxNumber: "US-987654321",
        }),
      });

      // 3. Fetch settings for Tenant Alpha
      const getRes = await fetch(`${baseUrl}/api/workspace/settings`, {
        headers: { Authorization: `Bearer ${tenantAlphaAdminToken}` },
      });
      const alphaSettings: any = await getRes.json();

      const passed =
        brandRes.status === 200 &&
        companyRes.status === 200 &&
        getRes.status === 200 &&
        alphaSettings.brand.titleText === "Alpha Enterprise Portal" &&
        alphaSettings.brand.themeColor === "emerald" &&
        (alphaSettings.company?.companyName === "Alpha Global Solutions Ltd" ||
          alphaSettings.company?.name === "Alpha Global Solutions Ltd") &&
        alphaSettings.company?.city === "San Jose";

      report.push({
        id: 9,
        scenario: "9. Tenant-Scoped Branding & Company Settings Mutation & Retrieval",
        passed,
        durationMs: Date.now() - start,
        evidence: `Brand: HTTP ${brandRes.status} | Company: HTTP ${companyRes.status} | Title: "${alphaSettings.brand.titleText}" | Company: "${alphaSettings.company?.companyName || alphaSettings.company?.name}"`,
      });
    } catch (err: any) {
      report.push({
        id: 9,
        scenario: "9. Tenant-Scoped Branding & Company Settings Mutation & Retrieval",
        passed: false,
        durationMs: Date.now() - start,
        evidence: err.message,
      });
    }
  }

  // =========================================================================
  // SCENARIO 10: Strict Multi-Tenant Isolation of Settings
  // =========================================================================
  {
    const start = Date.now();
    try {
      // Fetch settings for Tenant Beta — must NOT reflect Tenant Alpha's customized values
      const betaGetRes = await fetch(`${baseUrl}/api/workspace/settings`, {
        headers: { Authorization: `Bearer ${tenantBetaAdminToken}` },
      });
      const betaSettings: any = await betaGetRes.json();

      const isIsolatedFromAlpha =
        betaSettings.brand.titleText !== "Alpha Enterprise Portal" &&
        betaSettings.company?.companyName !== "Alpha Global Solutions Ltd";

      // Tenant Beta updates its own independent branding
      const betaBrandRes = await fetch(`${baseUrl}/api/workspace/settings/brand`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantBetaAdminToken}`,
        },
        body: JSON.stringify({
          titleText: "Beta Logistics Hub",
          themeColor: "purple",
        }),
      });

      // Re-fetch Tenant Alpha — must remain completely unchanged
      const alphaRecheckRes = await fetch(`${baseUrl}/api/workspace/settings`, {
        headers: { Authorization: `Bearer ${tenantAlphaAdminToken}` },
      });
      const alphaRecheck: any = await alphaRecheckRes.json();

      const alphaRemainedIntact =
        alphaRecheck.brand.titleText === "Alpha Enterprise Portal" &&
        alphaRecheck.brand.themeColor === "emerald";

      const passed =
        betaGetRes.status === 200 &&
        isIsolatedFromAlpha &&
        betaBrandRes.status === 200 &&
        alphaRemainedIntact;

      report.push({
        id: 10,
        scenario: "10. Strict Multi-Tenant Settings Isolation & Non-Interference",
        passed,
        durationMs: Date.now() - start,
        evidence: `Beta Initial Isolated: ${isIsolatedFromAlpha} | Beta Mutated: HTTP ${betaBrandRes.status} | Alpha Intact: ${alphaRemainedIntact} (Title="${alphaRecheck.brand.titleText}", Color="${alphaRecheck.brand.themeColor}")`,
      });
    } catch (err: any) {
      report.push({
        id: 10,
        scenario: "10. Strict Multi-Tenant Settings Isolation & Non-Interference",
        passed: false,
        durationMs: Date.now() - start,
        evidence: err.message,
      });
    }
  }

  // Cleanup test artifacts
  try {
    await prisma.cmsPage.deleteMany({
      where: { slug: { in: [`tenant-${tenantAlphaId}-settings`, `tenant-${tenantBetaId}-settings`] } },
    });
    await prisma.tenantSubscription.deleteMany({
      where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
    });
    await prisma.userRole.deleteMany({
      where: { userId: superAdminUserId },
    });
    await prisma.profile.deleteMany({
      where: { userId: { in: [superAdminUserId, tenantAlphaAdminUserId, tenantBetaAdminUserId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [superAdminUserId, tenantAlphaAdminUserId, tenantBetaAdminUserId] } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantAlphaId, tenantBetaId] } },
    });
  } catch (e) {
    // Non-fatal cleanup
  }

  // Close server
  await new Promise<void>((resolve) => server.close(() => resolve()));

  // Print Summary Table
  console.log("\n================================================================================");
  console.log("PHASE C — WAVE 1 INTEGRATION & ISOLATION TEST RESULTS");
  console.log("================================================================================");
  let allPassed = true;
  for (const item of report) {
    const status = item.passed ? "[PASS]" : "[FAIL]";
    console.log(`${status} ${item.scenario} (${item.durationMs}ms)`);
    console.log(`       Evidence: ${item.evidence}`);
    if (!item.passed) allPassed = false;
  }
  console.log("================================================================================");
  console.log(
    `TOTAL SCENARIOS: ${report.length} | PASSED: ${report.filter((r) => r.passed).length} | FAILED: ${
      report.filter((r) => !r.passed).length
    }`
  );
  console.log(
    `OVERALL RESULT: ${allPassed ? "100% WAVE 1 CONTROL PLANE SUITE PASSED" : "WAVE 1 TEST SUITE FAILED"}`
  );
  console.log("================================================================================\n");

  return allPassed;
}

runWave1TestSuite()
  .then((success) => process.exit(success ? 0 : 1))
  .catch((err) => {
    console.error("Test execution fatal error:", err);
    process.exit(1);
  });
