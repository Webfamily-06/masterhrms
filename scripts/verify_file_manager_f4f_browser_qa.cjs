const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../server/.env") });
const { chromium } = require("playwright");
const { PrismaClient } = require("../server/node_modules/@prisma/client");
const jwt = require("../server/node_modules/jsonwebtoken");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const ARTIFACT_DIR = "C:\\Users\\TSV Global Solutions\\.gemini\\antigravity\\brain\\29494ee0-4f9e-4896-8c16-14b56e9678b0";
const DOCS_DIR = path.join(__dirname, "../docs/Saas/screenshots/files_f4f");

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });
}

async function runBrowserQA() {
  console.log("================================================================================");
  console.log("PHASE F4-F PLAYWRIGHT BROWSER QA SUITE — STORAGE RETENTION & LEGAL HOLDS");
  console.log("================================================================================");

  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
  if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

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
    }));

  const superToken = generateToken({
    userId: superAdmin.id,
    id: superAdmin.id,
    email: superAdmin.email,
    roles: ["super_admin"],
  });

  const tenantToken = generateToken({
    userId: tenantUser.id,
    id: tenantUser.id,
    tenantId: tenant.id,
    email: tenantUser.email,
    roles: ["hr_admin", "admin"],
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  function saveShot(fileName) {
    const docsPath = path.join(DOCS_DIR, fileName);
    const artifactPath = path.join(ARTIFACT_DIR, fileName);
    return { docsPath, artifactPath };
  }

  // -------------------------------------------------------------------------
  // SCENARIO 1: TENANT STORAGE RETENTION DASHBOARD
  // -------------------------------------------------------------------------
  console.log("\n[SCENARIO 1] Capturing Tenant Storage Retention Dashboard...");
  const pageTenant = await context.newPage();

  // Inject auth state in localStorage
  await pageTenant.addInitScript(
    ({ token, user, tenantObj }) => {
      window.localStorage.setItem("token", token);
      window.localStorage.setItem("auth_token", token);
      window.localStorage.setItem("user", JSON.stringify(user));
      window.localStorage.setItem("current_tenant", JSON.stringify(tenantObj));
    },
    {
      token: tenantToken,
      user: {
        id: tenantUser.id,
        email: tenantUser.email,
        roles: ["hr_admin", "admin"],
        tenantId: tenant.id,
      },
      tenantObj: { id: tenant.id, name: tenant.name },
    }
  );

  await pageTenant.goto("http://localhost:3000/tenant/files/storage?tab=retention", {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await pageTenant.waitForTimeout(3000);

  const shot1 = saveShot("01_tenant_retention_policy_dashboard.png");
  await pageTenant.screenshot({ path: shot1.docsPath, fullPage: true });
  fs.copyFileSync(shot1.docsPath, shot1.artifactPath);
  console.log(`  ✓ Captured: ${shot1.docsPath}`);

  // -------------------------------------------------------------------------
  // SCENARIO 2: DRY-RUN CANDIDATE PREVIEW
  // -------------------------------------------------------------------------
  console.log("\n[SCENARIO 2] Triggering Dry-Run Preview...");
  const previewBtn = pageTenant.locator("button:has-text('Dry-Run Preview')");
  if (await previewBtn.isVisible()) {
    await previewBtn.click();
    await pageTenant.waitForTimeout(3000);
  }

  const shot2 = saveShot("02_tenant_dry_run_preview_breakdown.png");
  await pageTenant.screenshot({ path: shot2.docsPath, fullPage: true });
  fs.copyFileSync(shot2.docsPath, shot2.artifactPath);
  console.log(`  ✓ Captured: ${shot2.docsPath}`);

  // -------------------------------------------------------------------------
  // SCENARIO 3: PLACE LEGAL HOLD MODAL
  // -------------------------------------------------------------------------
  console.log("\n[SCENARIO 3] Opening Place Legal Hold Dialog...");
  const holdBtn = pageTenant.locator("button:has-text('Place Legal Hold'), button:has-text('Place New Hold')").first();
  if (await holdBtn.isVisible()) {
    await holdBtn.click();
    await pageTenant.waitForTimeout(1000);
  }

  const shot3 = saveShot("03_tenant_place_legal_hold_modal.png");
  await pageTenant.screenshot({ path: shot3.docsPath });
  fs.copyFileSync(shot3.docsPath, shot3.artifactPath);
  console.log(`  ✓ Captured: ${shot3.docsPath}`);

  // Close modal with Cancel
  const cancelBtn = pageTenant.locator("button:has-text('Cancel')").first();
  if (await cancelBtn.isVisible()) {
    await cancelBtn.click();
    await pageTenant.waitForTimeout(500);
  }

  // -------------------------------------------------------------------------
  // SCENARIO 4: ACTIVE LEGAL HOLDS TABLE
  // -------------------------------------------------------------------------
  console.log("\n[SCENARIO 4] Capturing Active Legal Holds Table...");
  const legalHoldsSection = pageTenant.locator("h4:has-text('Active Legal Holds')");
  if (await legalHoldsSection.isVisible()) {
    await legalHoldsSection.scrollIntoViewIfNeeded();
    await pageTenant.waitForTimeout(1000);
  }

  const shot4 = saveShot("04_tenant_active_legal_holds_table.png");
  await pageTenant.screenshot({ path: shot4.docsPath });
  fs.copyFileSync(shot4.docsPath, shot4.artifactPath);
  console.log(`  ✓ Captured: ${shot4.docsPath}`);

  // -------------------------------------------------------------------------
  // SCENARIO 5: RETENTION EXECUTION AUDIT TRAIL
  // -------------------------------------------------------------------------
  console.log("\n[SCENARIO 5] Capturing Execution Audit Trail...");
  const auditSection = pageTenant.locator("h4:has-text('Retention Execution Audit Trail')");
  if (await auditSection.isVisible()) {
    await auditSection.scrollIntoViewIfNeeded();
    await pageTenant.waitForTimeout(1000);
  }

  const shot5 = saveShot("05_tenant_execution_history_log.png");
  await pageTenant.screenshot({ path: shot5.docsPath });
  fs.copyFileSync(shot5.docsPath, shot5.artifactPath);
  console.log(`  ✓ Captured: ${shot5.docsPath}`);

  // -------------------------------------------------------------------------
  // SCENARIO 6: SUPER ADMIN FLEET RETENTION OVERVIEW
  // -------------------------------------------------------------------------
  console.log("\n[SCENARIO 6] Capturing Super Admin Fleet Retention Overview...");
  const pageSuper = await context.newPage();

  await pageSuper.addInitScript(
    ({ token, user }) => {
      window.localStorage.setItem("token", token);
      window.localStorage.setItem("auth_token", token);
      window.localStorage.setItem("user", JSON.stringify(user));
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

  await pageSuper.goto("http://localhost:3000/super/tenant-usage-metrics", {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await pageSuper.waitForTimeout(4000);

  // Scroll to Fleet Retention card
  const fleetRetentionSection = pageSuper.locator("h3:has-text('Fleet Storage Retention')");
  if (await fleetRetentionSection.isVisible()) {
    await fleetRetentionSection.scrollIntoViewIfNeeded();
    await pageSuper.waitForTimeout(1000);
  }

  const shot6 = saveShot("06_super_admin_fleet_retention_overview.png");
  await pageSuper.screenshot({ path: shot6.docsPath });
  fs.copyFileSync(shot6.docsPath, shot6.artifactPath);
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
