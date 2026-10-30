const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../server/.env") });
const { chromium } = require("playwright");
const { PrismaClient } = require("../server/node_modules/@prisma/client");
const jwt = require("../server/node_modules/jsonwebtoken");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "master-hrms-jwt-super-secret-key-change-this-in-production";
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || null;
const DOCS_DIR = path.join(__dirname, "../docs/Saas/screenshots/files_f4f");

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });
}

function saveShot(fileName) {
  const docsPath = path.join(DOCS_DIR, fileName);
  const artifactPath = ARTIFACT_DIR ? path.join(ARTIFACT_DIR, fileName) : null;
  return { docsPath, artifactPath };
}

function copyArtifact(docsPath, artifactPath) {
  if (artifactPath && fs.existsSync(docsPath)) {
    try {
      fs.copyFileSync(docsPath, artifactPath);
    } catch (e) {
      console.warn(`[QA] Failed to copy artifact: ${e.message}`);
    }
  }
}

async function runBrowserQA() {
  console.log("================================================================================");
  console.log("PHASE F4-F PLAYWRIGHT BROWSER QA SUITE — STORAGE RETENTION & LEGAL HOLDS");
  console.log("================================================================================");

  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
  if (ARTIFACT_DIR && !fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  const superAdmin =
    (await prisma.user.findFirst({
      where: { roles: { some: { role: "super_admin" } } },
    })) || (await prisma.user.findFirst());

  const tenant =
    (await prisma.tenant.findFirst({
      where: { id: "tenant-default-001" },
    })) || (await prisma.tenant.findFirst());

  const tenantUser =
    (await prisma.user.findFirst({
      where: { profile: { tenantId: tenant.id }, roles: { some: { role: "hr_admin" } } },
    })) ||
    (await prisma.user.findFirst({
      where: { profile: { tenantId: tenant.id } },
    })) ||
    superAdmin;

  console.log(`[QA SETUP] Tenant: ${tenant.name} (${tenant.id})`);
  console.log(`[QA SETUP] User: ${tenantUser.email} (${tenantUser.id})`);

  const tenantToken = generateToken({
    id: tenantUser.id,
    userId: tenantUser.id,
    email: tenantUser.email,
    tenantId: tenant.id,
    roles: ["admin", "tenant_admin", "hr_admin"],
  });

  const superToken = generateToken({
    id: superAdmin.id,
    userId: superAdmin.id,
    email: superAdmin.email,
    roles: ["super_admin"],
  });

  const browser = await chromium.launch({ headless: true });
  const tenantContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });

  await tenantContext.addCookies([
    { name: "hrms_auth_token", value: tenantToken, domain: "localhost", path: "/" },
  ]);

  await tenantContext.addInitScript(
    ({ token, user, tenantId }) => {
      window.localStorage.setItem("hrms_auth_token", token);
      window.localStorage.setItem("token", token);
      window.localStorage.setItem("auth_token", token);
      window.localStorage.setItem("tenantId", tenantId);
      window.localStorage.setItem("user", JSON.stringify(user));
      document.cookie = `hrms_auth_token=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
    },
    {
      token: tenantToken,
      tenantId: tenant.id,
      user: {
        id: tenantUser.id,
        email: tenantUser.email,
        tenantId: tenant.id,
        roles: ["admin", "tenant_admin", "hr_admin"],
      },
    }
  );

  // -------------------------------------------------------------------------
  // SCENARIO 1: TENANT RETENTION POLICY DASHBOARD TAB
  // -------------------------------------------------------------------------
  console.log("\n[SCENARIO 1] Navigating to Tenant Storage Retention tab...");
  const pageTenant = await tenantContext.newPage();

  await pageTenant.goto("http://localhost:3000/tenant/files/storage?tab=retention", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  const heading = pageTenant.locator("h3:has-text('Enterprise Retention & Legal Hold Governance')");
  await heading.waitFor({ state: "visible", timeout: 15000 });

  const shot1 = saveShot("01_tenant_retention_policy_dashboard.png");
  await pageTenant.screenshot({ path: shot1.docsPath, fullPage: true });
  copyArtifact(shot1.docsPath, shot1.artifactPath);
  console.log(`  ✓ Captured: ${shot1.docsPath}`);

  // -------------------------------------------------------------------------
  // SCENARIO 2: DRY-RUN CANDIDATE PREVIEW
  // -------------------------------------------------------------------------
  console.log("\n[SCENARIO 2] Triggering Dry-Run Preview...");
  const previewBtn = pageTenant.locator("button:has-text('Dry-Run Preview')");
  await previewBtn.waitFor({ state: "visible", timeout: 15000 });
  await previewBtn.click();

  const previewPanel = pageTenant.locator(
    "h4:has-text('Candidate Discovery & Protection Summary'), [role='dialog']:has-text('Preview Breakdown')"
  );
  await previewPanel.waitFor({ state: "visible", timeout: 15000 });

  const shot2 = saveShot("02_tenant_dry_run_preview_breakdown.png");
  await pageTenant.screenshot({ path: shot2.docsPath, fullPage: true });
  copyArtifact(shot2.docsPath, shot2.artifactPath);
  console.log(`  ✓ Captured: ${shot2.docsPath}`);

  // Close preview dialog if present
  const closePreviewBtn = pageTenant.locator("[role='dialog'] button:has-text('Close')").first();
  if (await closePreviewBtn.count() > 0 && await closePreviewBtn.isVisible()) {
    await closePreviewBtn.click();
    await pageTenant.waitForTimeout(500);
  }

  // -------------------------------------------------------------------------
  // SCENARIO 3: PLACE LEGAL HOLD MODAL
  // -------------------------------------------------------------------------
  console.log("\n[SCENARIO 3] Opening Place Legal Hold Dialog...");
  const holdBtn = pageTenant.locator("button:has-text('Place Legal Hold'), button:has-text('Place New Hold')").first();
  await holdBtn.waitFor({ state: "visible", timeout: 15000 });
  await holdBtn.click();

  const holdModal = pageTenant.locator(
    "[role='dialog']:has-text('Place Legal Preservation Hold'), [role='dialog']:has-text('Place Legal Hold')"
  );
  await holdModal.waitFor({ state: "visible", timeout: 15000 });

  const shot3 = saveShot("03_tenant_place_legal_hold_modal.png");
  await pageTenant.screenshot({ path: shot3.docsPath });
  copyArtifact(shot3.docsPath, shot3.artifactPath);
  console.log(`  ✓ Captured: ${shot3.docsPath}`);

  // Close modal with Cancel
  const cancelBtn = pageTenant.locator("button:has-text('Cancel')").first();
  await cancelBtn.waitFor({ state: "visible", timeout: 5000 });
  await cancelBtn.click();
  await pageTenant.waitForTimeout(500);

  // -------------------------------------------------------------------------
  // SCENARIO 4: ACTIVE LEGAL HOLDS TABLE
  // -------------------------------------------------------------------------
  console.log("\n[SCENARIO 4] Capturing Active Legal Holds Table...");
  const legalHoldsSection = pageTenant.locator("h4:has-text('Active Legal Holds')");
  await legalHoldsSection.waitFor({ state: "visible", timeout: 15000 });
  await legalHoldsSection.scrollIntoViewIfNeeded();
  await pageTenant.waitForTimeout(1000);

  const shot4 = saveShot("04_tenant_active_legal_holds_table.png");
  await pageTenant.screenshot({ path: shot4.docsPath });
  copyArtifact(shot4.docsPath, shot4.artifactPath);
  console.log(`  ✓ Captured: ${shot4.docsPath}`);

  // -------------------------------------------------------------------------
  // SCENARIO 5: RETENTION EXECUTION AUDIT TRAIL
  // -------------------------------------------------------------------------
  console.log("\n[SCENARIO 5] Capturing Execution Audit Trail...");
  const auditSection = pageTenant.locator("h4:has-text('Retention Execution Audit Trail')");
  await auditSection.waitFor({ state: "visible", timeout: 15000 });
  await auditSection.scrollIntoViewIfNeeded();
  await pageTenant.waitForTimeout(1000);

  const shot5 = saveShot("05_tenant_execution_history_log.png");
  await pageTenant.screenshot({ path: shot5.docsPath });
  copyArtifact(shot5.docsPath, shot5.artifactPath);
  console.log(`  ✓ Captured: ${shot5.docsPath}`);

  // -------------------------------------------------------------------------
  // SCENARIO 6: SUPER ADMIN FLEET RETENTION OVERVIEW
  // -------------------------------------------------------------------------
  console.log("\n[SCENARIO 6] Capturing Super Admin Fleet Retention Overview...");
  await tenantContext.close();

  const superContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });

  await superContext.addCookies([
    { name: "hrms_auth_token", value: superToken, domain: "localhost", path: "/" },
  ]);

  await superContext.addInitScript(
    ({ token, user }) => {
      window.localStorage.setItem("hrms_auth_token", token);
      window.localStorage.setItem("token", token);
      window.localStorage.setItem("auth_token", token);
      window.localStorage.setItem("user", JSON.stringify(user));
      document.cookie = `hrms_auth_token=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
    },
    {
      token: superToken,
      user: {
        id: superAdmin.id,
        email: superAdmin.email,
        roles: ["super_admin"],
      },
    }
  );

  const pageSuper = await superContext.newPage();

  await pageSuper.goto("http://localhost:3000/super/tenant-usage-metrics", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  // Scroll to Fleet Retention card
  const fleetRetentionSection = pageSuper.locator("h3:has-text('Fleet Storage Retention')");
  await fleetRetentionSection.waitFor({ state: "visible", timeout: 15000 });
  await fleetRetentionSection.scrollIntoViewIfNeeded();
  await pageSuper.waitForTimeout(1000);

  const shot6 = saveShot("06_super_admin_fleet_retention_overview.png");
  await pageSuper.screenshot({ path: shot6.docsPath });
  copyArtifact(shot6.docsPath, shot6.artifactPath);
  console.log(`  ✓ Captured: ${shot6.docsPath}`);

  await browser.close();
  await prisma.$disconnect();

  console.log("\n================================================================================");
  console.log("🎉 PLAYWRIGHT BROWSER QA COMPLETE: 6 CANONICAL SCREENSHOTS CAPTURED!");
  console.log("================================================================================");
}

runBrowserQA().catch(err => {
  console.error("Playwright QA failed:", err);
  prisma.$disconnect();
  process.exit(1);
});
