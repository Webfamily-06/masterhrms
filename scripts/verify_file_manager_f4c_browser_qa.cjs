const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../server/.env") });
const { chromium } = require("playwright");
const { PrismaClient } = require("../server/node_modules/@prisma/client");
const jwt = require("../server/node_modules/jsonwebtoken");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "master-hrms-jwt-super-secret-key-change-this-in-production";
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || null;

function copyArtifact(sourcePath, targetFileName) {
  if (ARTIFACT_DIR && fs.existsSync(ARTIFACT_DIR)) {
    try {
      fs.copyFileSync(sourcePath, path.join(ARTIFACT_DIR, targetFileName));
    } catch (err) {
      console.warn(`Could not copy artifact ${targetFileName}:`, err.message);
    }
  }
}
const DOCS_DIR = path.join(__dirname, "../docs/Saas/screenshots/files");

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

async function runBrowserQA() {
  console.log("================================================================================");
  console.log("PHASE F4-C PLAYWRIGHT BROWSER QA SUITE");
  console.log("================================================================================");

  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

  const tenant = await prisma.tenant.findFirst({
    where: { subscription: { isNot: null } },
  });
  const user = await prisma.user.findFirst({
    where: { employees: { some: { tenantId: tenant.id } } },
  }) || await prisma.user.findFirst();

  const token = generateToken({
    userId: user.id,
    id: user.id,
    tenantId: tenant.id,
    email: user.email,
    roles: ["admin", "tenantadmin", "hr_admin"],
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await context.addInitScript(({ token, tenantId }) => {
    localStorage.setItem("hrms_auth_token", token);
    localStorage.setItem("auth_token", token);
    localStorage.setItem("token", token);
    localStorage.setItem("tenant_id", tenantId);
    document.cookie = `hrms_auth_token=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
    document.cookie = `auth_token=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
  }, { token, tenantId: tenant.id });

  const page = await context.newPage();

  // 1. Storage Administration - Governance Tab
  console.log("1. Navigating to Tenant Storage Administration...");
  await page.goto("http://localhost:3000/tenant/files/storage", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // Click on Quota Governance tab
  const govTabBtn = page.locator("button:has-text('Quota Governance')");
  if (await govTabBtn.count() > 0) {
    await govTabBtn.first().click();
    await page.waitForTimeout(1500);
  }

  const screen1 = path.join(DOCS_DIR, "01_f4c_tenant_storage_quota_governance.png");
  await page.screenshot({ path: screen1, fullPage: true });
  copyArtifact(screen1, "01_f4c_tenant_storage_quota_governance.png");
  console.log(`Saved screenshot 1: ${screen1}`);

  // 2. Open Department Quota Dialog
  console.log("2. Opening Department Quota Dialog...");
  const deptConfigureBtn = page.locator("button:has-text('Configure')").first();
  if (await deptConfigureBtn.count() > 0) {
    await deptConfigureBtn.click();
    await page.waitForTimeout(1000);

    const screen2 = path.join(DOCS_DIR, "02_f4c_department_quota_dialog.png");
    await page.screenshot({ path: screen2, fullPage: false });
    copyArtifact(screen2, "02_f4c_department_quota_dialog.png");
    console.log(`Saved screenshot 2: ${screen2}`);

    // Close dialog
    const cancelBtn = page.locator("button:has-text('Cancel')").first();
    if (await cancelBtn.count() > 0) await cancelBtn.click();
    await page.waitForTimeout(500);
  }

  // 3. Open Team Quota Dialog
  console.log("3. Opening Team Quota Dialog...");
  const teamConfigureBtn = page.locator("button:has-text('Configure')").nth(1);
  if (await teamConfigureBtn.count() > 0) {
    await teamConfigureBtn.click();
    await page.waitForTimeout(1000);

    const screen3 = path.join(DOCS_DIR, "03_f4c_team_quota_dialog.png");
    await page.screenshot({ path: screen3, fullPage: false });
    copyArtifact(screen3, "03_f4c_team_quota_dialog.png");
    console.log(`Saved screenshot 3: ${screen3}`);

    const cancelBtn = page.locator("button:has-text('Cancel')").first();
    if (await cancelBtn.count() > 0) await cancelBtn.click();
    await page.waitForTimeout(500);
  }

  // 4. File Manager UI with Storage Meter
  console.log("4. Navigating to /hr/files...");
  await page.goto("http://localhost:3000/hr/files", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const screen4 = path.join(DOCS_DIR, "04_f4c_file_manager_storage_meter.png");
  await page.screenshot({ path: screen4, fullPage: true });
  copyArtifact(screen4, "04_f4c_file_manager_storage_meter.png");
  console.log(`Saved screenshot 4: ${screen4}`);

  // 5. Tablet Responsive View
  console.log("5. Testing Tablet View...");
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("http://localhost:3000/tenant/files/storage", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const screen5 = path.join(DOCS_DIR, "05_f4c_responsive_tablet_governance.png");
  await page.screenshot({ path: screen5, fullPage: true });
  copyArtifact(screen5, "05_f4c_responsive_tablet_governance.png");
  console.log(`Saved screenshot 5: ${screen5}`);

  await browser.close();
  await prisma.$disconnect();
  console.log("Playwright QA Completed successfully!");
}

runBrowserQA().catch((err) => {
  console.error("Browser QA Error:", err);
  process.exit(1);
});
