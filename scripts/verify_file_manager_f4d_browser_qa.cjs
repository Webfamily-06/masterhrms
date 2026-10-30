const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../server/.env") });
const { chromium } = require("playwright");
const { PrismaClient } = require("../server/node_modules/@prisma/client");
const jwt = require("../server/node_modules/jsonwebtoken");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const ARTIFACT_DIR = "C:\\Users\\TSV Global Solutions\\.gemini\\antigravity\\brain\\29494ee0-4f9e-4896-8c16-14b56e9678b0";
const DOCS_DIR = path.join(__dirname, "../docs/Saas/screenshots/files_f4");

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });
}

async function runBrowserQA() {
  console.log("================================================================================");
  console.log("PHASE F4-D PLAYWRIGHT BROWSER QA SUITE");
  console.log("================================================================================");

  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

  const superAdmin = await prisma.user.findFirst({
    where: { roles: { some: { role: "super_admin" } } },
  });

  const tenant = await prisma.tenant.findFirst({
    where: { id: "tenant-default-001" },
  }) || await prisma.tenant.findFirst();

  const tenantUser = await prisma.user.findFirst({
    where: { profile: { tenantId: tenant.id } },
  });

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
    roles: ["hr_admin"],
  });

  const browser = await chromium.launch({ headless: true });

  try {
    // -------------------------------------------------------------------------
    // 1. Super Admin: Tenant Usage Fleet Metrics
    // -------------------------------------------------------------------------
    console.log("\n1. Navigating to Super Admin Tenant Usage Metrics (/super/tenant-usage-metrics)...");
    const superContext = await browser.newContext({
      viewport: { width: 1500, height: 950 },
    });
    await superContext.addInitScript(({ token }) => {
      localStorage.setItem("hrms_auth_token", token);
      localStorage.setItem("auth_token", token);
      localStorage.setItem("token", token);
      document.cookie = `hrms_auth_token=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
    }, { token: superToken });

    const superPage = await superContext.newPage();
    await superPage.goto("http://localhost:3000/super/tenant-usage-metrics", { waitUntil: "domcontentloaded" });
    await superPage.waitForTimeout(3000);

    const screen1 = path.join(DOCS_DIR, "01_super_admin_fleet_metrics.png");
    await superPage.screenshot({ path: screen1, fullPage: true });
    fs.copyFileSync(screen1, path.join(ARTIFACT_DIR, "01_super_admin_fleet_metrics.png"));
    console.log(`Saved screenshot 1: ${screen1}`);

    // Open Deep Inspection for Default Tenant
    console.log("2. Opening Deep Inspection Modal for Default Tenant...");
    const inspectBtn = superPage.locator("button[title='Deep Inspection Drawer']").first();
    if (await inspectBtn.count() > 0) {
      await inspectBtn.click();
      await superPage.waitForTimeout(2000);

      const screen2 = path.join(DOCS_DIR, "02_super_admin_deep_inspection.png");
      await superPage.screenshot({ path: screen2, fullPage: false });
      fs.copyFileSync(screen2, path.join(ARTIFACT_DIR, "02_super_admin_deep_inspection.png"));
      console.log(`Saved screenshot 2: ${screen2}`);

      // Sub-tab: Departments
      console.log("3. Inspecting Department Breakdown Sub-tab...");
      const deptTab = superPage.locator("button:has-text('Departments')").first();
      if (await deptTab.count() > 0) {
        await deptTab.click();
        await superPage.waitForTimeout(1000);
        const screen3 = path.join(DOCS_DIR, "03_super_admin_departments_tab.png");
        await superPage.screenshot({ path: screen3, fullPage: false });
        fs.copyFileSync(screen3, path.join(ARTIFACT_DIR, "03_super_admin_departments_tab.png"));
        console.log(`Saved screenshot 3: ${screen3}`);
      }

      // Sub-tab: Storage Activity
      console.log("4. Inspecting Storage Activity Sub-tab...");
      const actTab = superPage.locator("button:has-text('Storage Activity')").first();
      if (await actTab.count() > 0) {
        await actTab.click();
        await superPage.waitForTimeout(1000);
        const screen4 = path.join(DOCS_DIR, "04_super_admin_activity_tab.png");
        await superPage.screenshot({ path: screen4, fullPage: false });
        fs.copyFileSync(screen4, path.join(ARTIFACT_DIR, "04_super_admin_activity_tab.png"));
        console.log(`Saved screenshot 4: ${screen4}`);
      }

      // Close modal
      const closeBtn = superPage.locator("button[title='Close Modal']").first();
      if (await closeBtn.count() > 0) await closeBtn.click();
    }

    // -------------------------------------------------------------------------
    // 2. Tenant Admin: Storage Administration Dashboard
    // -------------------------------------------------------------------------
    console.log("\n5. Navigating to Tenant Storage Administration (/tenant/files/storage)...");
    const tenantContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    await tenantContext.addInitScript(({ token, tenantId }) => {
      localStorage.setItem("hrms_auth_token", token);
      localStorage.setItem("auth_token", token);
      localStorage.setItem("token", token);
      localStorage.setItem("tenant_id", tenantId);
      document.cookie = `hrms_auth_token=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
    }, { token: tenantToken, tenantId: tenant.id });

    const tenantPage = await tenantContext.newPage();
    await tenantPage.goto("http://localhost:3000/tenant/files/storage", { waitUntil: "domcontentloaded" });
    await tenantPage.waitForTimeout(2500);

    const screen5 = path.join(DOCS_DIR, "05_tenant_admin_storage_overview.png");
    await tenantPage.screenshot({ path: screen5, fullPage: true });
    fs.copyFileSync(screen5, path.join(ARTIFACT_DIR, "05_tenant_admin_storage_overview.png"));
    console.log(`Saved screenshot 5: ${screen5}`);

    // Click on Storage Activity tab
    console.log("6. Navigating to Storage Activity Tab...");
    const activityTabBtn = tenantPage.locator("button:has-text('Storage Activity')").first();
    if (await activityTabBtn.count() > 0) {
      await activityTabBtn.click();
      await tenantPage.waitForTimeout(1500);

      const screen6 = path.join(DOCS_DIR, "06_tenant_admin_activity_timeline.png");
      await tenantPage.screenshot({ path: screen6, fullPage: true });
      fs.copyFileSync(screen6, path.join(ARTIFACT_DIR, "06_tenant_admin_activity_timeline.png"));
      console.log(`Saved screenshot 6: ${screen6}`);
    }

    // Click on Quota Governance tab
    console.log("7. Navigating to Quota Governance Tab...");
    const govTabBtn = tenantPage.locator("button:has-text('Quota Governance')").first();
    if (await govTabBtn.count() > 0) {
      await govTabBtn.click();
      await tenantPage.waitForTimeout(1500);

      const screen7 = path.join(DOCS_DIR, "07_tenant_admin_governance.png");
      await tenantPage.screenshot({ path: screen7, fullPage: true });
      fs.copyFileSync(screen7, path.join(ARTIFACT_DIR, "07_tenant_admin_governance.png"));
      console.log(`Saved screenshot 7: ${screen7}`);
    }

    // -------------------------------------------------------------------------
    // 3. Regression Check: Canonical Unified File Manager Routes
    // -------------------------------------------------------------------------
    console.log("\n8. Regression Verification: HR Admin File Manager (/hr/files)...");
    await tenantPage.goto("http://localhost:3000/hr/files?view=grid", { waitUntil: "domcontentloaded" });
    await tenantPage.waitForTimeout(2000);

    const screen8 = path.join(DOCS_DIR, "08_hr_admin_unified_files.png");
    await tenantPage.screenshot({ path: screen8, fullPage: true });
    fs.copyFileSync(screen8, path.join(ARTIFACT_DIR, "08_hr_admin_unified_files.png"));
    console.log(`Saved screenshot 8: ${screen8}`);

    console.log("\n9. Regression Verification: Employee File Manager (/me/files)...");
    await tenantPage.goto("http://localhost:3000/me/files?view=grid", { waitUntil: "domcontentloaded" });
    await tenantPage.waitForTimeout(2000);

    const screen9 = path.join(DOCS_DIR, "09_employee_unified_files.png");
    await tenantPage.screenshot({ path: screen9, fullPage: true });
    fs.copyFileSync(screen9, path.join(ARTIFACT_DIR, "09_employee_unified_files.png"));
    console.log(`Saved screenshot 9: ${screen9}`);

    console.log("\n================================================================================");
    console.log("PHASE F4-D PLAYWRIGHT BROWSER QA SUITE: COMPLETED SUCCESSFULLY (9 SCREENSHOTS)");
    console.log("================================================================================");

    await superContext.close();
    await tenantContext.close();
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

runBrowserQA().catch((e) => {
  console.error("Playwright Browser QA Failed:", e);
  process.exit(1);
});

