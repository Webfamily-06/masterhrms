const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../server/.env") });
const { chromium } = require("playwright");
const { PrismaClient } = require("../server/node_modules/@prisma/client");
const jwt = require("../server/node_modules/jsonwebtoken");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "master-hrms-jwt-super-secret-key-change-this-in-production";
const ARTIFACT_DIR = path.resolve("C:/Users/TSV Global Solutions/.gemini/antigravity/brain/29494ee0-4f9e-4896-8c16-14b56e9678b0");
const DOCS_DIR = path.join(__dirname, "../docs/Saas/screenshots/files_f6");

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
  console.log("PHASE F6 PLAYWRIGHT BROWSER QA SUITE — TRACKS A, B, C, D ENTERPRISE CAPABILITIES");
  console.log("================================================================================");

  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
  if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  const tenant = (await prisma.tenant.findFirst()) || { id: "tenant-default-001", name: "Default Enterprise" };
  const user = (await prisma.user.findFirst()) || { id: "user-admin-001", email: "admin@masterhrms.local" };

  const token = generateToken({
    userId: user.id,
    id: user.id,
    email: user.email || "admin@masterhrms.local",
    tenantId: tenant.id,
    tenantName: tenant.name || "Default Enterprise",
    roles: ["tenant_admin"],
    workspaceRole: "tenant_admin",
  });

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await context.addInitScript(({ t, tid, email, tname }) => {
    localStorage.setItem("hrms_auth_token", t);
    localStorage.setItem("auth_token", t);
    localStorage.setItem("token", t);
    localStorage.setItem("hrms_tenant_id", tid);
    localStorage.setItem("hrms_tenant_name", tname);
    localStorage.setItem("hrms_user_email", email);
    document.cookie = `hrms_auth_token=${t}; path=/; max-age=7200; SameSite=Lax`;
  }, { t: token, tid: tenant.id, email: user.email, tname: tenant.name });

  const page = await context.newPage();

  try {
    // 1. Capture Unified File Manager with Enterprise Ribbon
    console.log("[QA 1/5] Navigating to File Manager...");
    await page.goto("http://localhost:3000/tenant/files", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    const shot1 = saveShot("01_f6_unified_file_manager_enterprise_ribbon.png");
    await page.screenshot({ path: shot1.docsPath, fullPage: false });
    copyArtifact(shot1.docsPath, shot1.artifactPath);
    console.log(`  ✓ Saved: ${shot1.docsPath}`);

    // 2. Capture Security Center - Quarantine Tab
    console.log("[QA 2/5] Navigating to File Security Center (Quarantine)...");
    await page.goto("http://localhost:3000/tenant/files/security", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    const shot2 = saveShot("02_f6_security_quarantine_center.png");
    await page.screenshot({ path: shot2.docsPath, fullPage: false });
    copyArtifact(shot2.docsPath, shot2.artifactPath);
    console.log(`  ✓ Saved: ${shot2.docsPath}`);

    // 3. Capture Security Center - DLP Compliance Tab
    console.log("[QA 3/5] Switching to DLP Compliance Tab...");
    const dlpTab = await page.$("button:has-text('Data Loss Prevention')");
    if (dlpTab) {
      await dlpTab.click();
      await page.waitForTimeout(1500);
    }
    const shot3 = saveShot("03_f6_security_dlp_policies_and_findings.png");
    await page.screenshot({ path: shot3.docsPath, fullPage: false });
    copyArtifact(shot3.docsPath, shot3.artifactPath);
    console.log(`  ✓ Saved: ${shot3.docsPath}`);

    // 4. Capture Cloud Storage Connectors
    console.log("[QA 4/5] Navigating to Cloud Connectors...");
    await page.goto("http://localhost:3000/tenant/files/connectors", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    const shot4 = saveShot("04_f6_cloud_connectors_management.png");
    await page.screenshot({ path: shot4.docsPath, fullPage: false });
    copyArtifact(shot4.docsPath, shot4.artifactPath);
    console.log(`  ✓ Saved: ${shot4.docsPath}`);

    // 5. Capture WebDAV Mount Gateway
    console.log("[QA 5/5] Navigating to WebDAV Drive Gateway...");
    await page.goto("http://localhost:3000/tenant/files/webdav", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    const shot5 = saveShot("05_f6_webdav_network_mount_gateway.png");
    await page.screenshot({ path: shot5.docsPath, fullPage: false });
    copyArtifact(shot5.docsPath, shot5.artifactPath);
    console.log(`  ✓ Saved: ${shot5.docsPath}`);

    console.log("\n================================================================================");
    console.log("🎉 ALL PHASE F6 BROWSER QA SCREENSHOTS CAPTURED SUCCESSFULLY!");
    console.log("================================================================================\n");
  } catch (err) {
    console.error("[QA ERROR]", err);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

runBrowserQA();
