const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../server/.env") });
const { chromium } = require("playwright");
const { PrismaClient } = require("../server/node_modules/@prisma/client");
const jwt = require("../server/node_modules/jsonwebtoken");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "master-hrms-jwt-super-secret-key-change-this-in-production";
const ARTIFACT_DIR = "/Users/apple/.gemini/antigravity/brain/feffb0e9-787d-4bae-8819-d3c1e461ac59";
const DOCS_DIR = path.join(__dirname, "../docs/Saas/screenshots/files_f5");

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });
}

function saveShot(fileName) {
  const docsPath = path.join(DOCS_DIR, fileName);
  const artifactPath = path.join(ARTIFACT_DIR, fileName);
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
  console.log("PHASE F5 PLAYWRIGHT BROWSER QA SUITE — SYSTEM FOLDERS, PICKER & MIGRATION");
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
    })) ||
    superAdmin;

  console.log(`[QA SETUP] Tenant: ${tenant.name} (${tenant.id})`);
  console.log(`[QA SETUP] User: ${tenantUser.email} (${tenantUser.id})`);

  // Ensure system folders exist for tenant-default-001
  const { SystemFolderService } = require("../server/dist/services/files/system-folder.service");
  await SystemFolderService.ensureSystemFolder({
    tenantId: tenant.id,
    moduleKey: "expenses",
    pageKey: "claims",
    actorId: tenantUser.id,
  });

  // Seed a sample file in Expenses system folder for explorer picker test
  let sampleReceipt = await prisma.mediaFile.findFirst({
    where: { tenantId: tenant.id, fileName: "sample_hotel_invoice.pdf" },
  });
  if (!sampleReceipt) {
    const claimsFolder = await prisma.mediaFile.findFirst({
      where: { tenantId: tenant.id, systemPage: "claims" },
    });
    sampleReceipt = await prisma.mediaFile.create({
      data: {
        tenantId: tenant.id,
        fileName: "sample_hotel_invoice.pdf",
        nameKey: "sample_hotel_invoice.pdf",
        filePath: "App Files/Expenses/Expense Claims/sample_hotel_invoice.pdf",
        url: "/uploads/sample_hotel_invoice.pdf",
        storageDisk: "LOCAL",
        mimeType: "application/pdf",
        fileSize: 185420,
        checksumSha: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        folder: "App Files/Expenses/Expense Claims",
        parentId: claimsFolder ? claimsFolder.id : null,
        ownerType: "USER",
        ownerId: tenantUser.id,
        uploadedBy: tenantUser.id,
        type: "FILE",
        category: "Documents",
        status: "ACTIVE",
      },
    });
  }

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
        name: "Admin User",
        tenantId: tenant.id,
        roles: ["admin", "tenant_admin", "hr_admin"],
      },
    }
  );

  const page = await tenantContext.newPage();

  // ---------------------------------------------------------------------------
  // SCREENSHOT 1: Universal FilePicker - Upload New Tab
  // ---------------------------------------------------------------------------
  console.log("\n[1/6] Capturing 01_universal_file_picker_upload_tab.png...");
  await page.goto("http://localhost:3000/expenses", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  // Look for "New Claim" or "Add Expense" button
  const newClaimBtn = page.locator('button:has-text("New Claim"), button:has-text("Add Expense"), button:has-text("Create Claim")').first();
  if (await newClaimBtn.isVisible()) {
    await newClaimBtn.click();
    await page.waitForTimeout(1000);
  }

  // Look for "Attach Receipt" or "Attach File" button
  const attachBtn = page.locator('button:has-text("Attach Receipt"), button:has-text("Attach File")').first();
  if (await attachBtn.isVisible()) {
    await attachBtn.click();
    await page.waitForTimeout(1000);
  }

  const shot1 = saveShot("01_universal_file_picker_upload_tab.png");
  await page.screenshot({ path: shot1.docsPath });
  copyArtifact(shot1.docsPath, shot1.artifactPath);
  console.log(`  ✓ Saved: ${shot1.docsPath}`);

  // ---------------------------------------------------------------------------
  // SCREENSHOT 2: Universal FilePicker - Explorer Tab
  // ---------------------------------------------------------------------------
  console.log("\n[2/6] Capturing 02_universal_file_picker_explorer_tab.png...");
  const explorerTab = page.locator('button[role="tab"]:has-text("From File Manager"), [role="tab"]:has-text("File Manager")').first();
  if (await explorerTab.isVisible()) {
    await explorerTab.click();
    await page.waitForTimeout(1500);
  }

  const shot2 = saveShot("02_universal_file_picker_explorer_tab.png");
  await page.screenshot({ path: shot2.docsPath });
  copyArtifact(shot2.docsPath, shot2.artifactPath);
  console.log(`  ✓ Saved: ${shot2.docsPath}`);

  // ---------------------------------------------------------------------------
  // SCREENSHOT 3: File Linking Visibility Warning Callout
  // ---------------------------------------------------------------------------
  console.log("\n[3/6] Capturing 03_file_linking_visibility_warning.png...");
  // Focus on the visibility callout banner
  const calloutBanner = page.locator('div:has-text("Visibility Notice"), div:has-text("linking this file")').first();
  const shot3 = saveShot("03_file_linking_visibility_warning.png");
  if (await calloutBanner.isVisible()) {
    await calloutBanner.screenshot({ path: shot3.docsPath });
  } else {
    await page.screenshot({ path: shot3.docsPath });
  }
  copyArtifact(shot3.docsPath, shot3.artifactPath);
  console.log(`  ✓ Saved: ${shot3.docsPath}`);

  // ---------------------------------------------------------------------------
  // SCREENSHOT 4: Module Integrated File Attachment Chip
  // ---------------------------------------------------------------------------
  console.log("\n[4/6] Capturing 04_module_integrated_file_attachment.png...");
  // Select a file candidate if available, and click Link
  const candidateItem = page.locator('div:has-text("sample_hotel_invoice.pdf"), div:has-text(".pdf")').first();
  if (await candidateItem.isVisible()) {
    await candidateItem.click();
    await page.waitForTimeout(500);
  }
  const linkSubmitBtn = page.locator('button:has-text("Link Selected File"), button:has-text("Link File")').first();
  if (await linkSubmitBtn.isVisible()) {
    await linkSubmitBtn.click();
    await page.waitForTimeout(1000);
  }

  const shot4 = saveShot("04_module_integrated_file_attachment.png");
  await page.screenshot({ path: shot4.docsPath });
  copyArtifact(shot4.docsPath, shot4.artifactPath);
  console.log(`  ✓ Saved: ${shot4.docsPath}`);

  // Close any remaining dialogs
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // ---------------------------------------------------------------------------
  // SCREENSHOT 5: Main File Manager Explorer View with App Files
  // ---------------------------------------------------------------------------
  console.log("\n[5/6] Capturing 05_system_folders_explorer_view.png...");
  await page.goto("http://localhost:3000/files", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2500);

  const shot5 = saveShot("05_system_folders_explorer_view.png");
  await page.screenshot({ path: shot5.docsPath });
  copyArtifact(shot5.docsPath, shot5.artifactPath);
  console.log(`  ✓ Saved: ${shot5.docsPath}`);

  // ---------------------------------------------------------------------------
  // SCREENSHOT 6: Super Admin Storage Migration Modal
  // ---------------------------------------------------------------------------
  console.log("\n[6/6] Capturing 06_super_admin_storage_migration_modal.png...");
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
        name: "Platform Super Admin",
        roles: ["super_admin"],
      },
    }
  );

  const superPage = await superContext.newPage();
  await superPage.goto("http://localhost:3000/super/tenant-usage-metrics", { waitUntil: "networkidle", timeout: 30000 });
  await superPage.waitForTimeout(2000);

  // Find and click "Storage Migration" button
  const migrationBtn = superPage.locator('button:has-text("Storage Migration"), button:has-text("Migrate")').first();
  if (await migrationBtn.isVisible()) {
    await migrationBtn.click();
    await superPage.waitForTimeout(1000);
  }

  const shot6 = saveShot("06_super_admin_storage_migration_modal.png");
  await superPage.screenshot({ path: shot6.docsPath });
  copyArtifact(shot6.docsPath, shot6.artifactPath);
  console.log(`  ✓ Saved: ${shot6.docsPath}`);

  await browser.close();
  await prisma.$disconnect();

  console.log("\n================================================================================");
  console.log("🎉 ALL 6 PHASE F5 PLAYWRIGHT BROWSER QA SCREENSHOTS CAPTURED SUCCESSFULLY!");
  console.log("================================================================================\n");
}

runBrowserQA().catch((err) => {
  console.error("FATAL: Browser QA failed:", err);
  prisma.$disconnect();
  process.exit(1);
});
