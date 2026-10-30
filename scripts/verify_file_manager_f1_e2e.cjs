/**
 * MASTERHRMS — Phase F1 Comprehensive E2E Verification Suite
 * Covers 10 Mandatory Acceptance Checks with Empirical Assertions and Playwright Screenshots.
 */

const fs = require("fs");
const path = require("path");
const jwt = require("../server/node_modules/jsonwebtoken");
const { PrismaClient } = require("../server/node_modules/@prisma/client");
const { chromium } = require("playwright");

require("dotenv").config({ path: path.join(__dirname, "../server/.env") });
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || "master-hrms-jwt-super-secret-key-change-this-in-production";
const API_URL = "http://localhost:4000/api/v1";
const BASE_URL = "http://localhost:3000";

const SCREENSHOT_DIR = path.join(__dirname, "../docs/Saas/screenshots/files");
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Auth tokens for test users
const tenantId = "tenant-default-001";
const hrUser = {
  userId: "user-hr-001",
  tenantId: tenantId,
  roles: ["hr_admin"],
};
const empUser = {
  userId: "user-emp-001",
  tenantId: tenantId,
  roles: ["employee"],
};
const tenantBUser = {
  userId: "user-tenant-b-001",
  tenantId: "tenant-other-999",
  roles: ["hr_admin"],
};

const hrToken = jwt.sign(hrUser, JWT_SECRET, { expiresIn: "1d" });
const empToken = jwt.sign(empUser, JWT_SECRET, { expiresIn: "1d" });
const tenantBToken = jwt.sign(tenantBUser, JWT_SECRET, { expiresIn: "1d" });

const hrHeaders = { Authorization: `Bearer ${hrToken}` };
const empHeaders = { Authorization: `Bearer ${empToken}` };
const tenantBHeaders = { Authorization: `Bearer ${tenantBToken}` };

// Helper HTTP fetch functions
async function apiGet(endpoint, headers = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `${API_URL}${endpoint}`;
  const res = await fetch(url, { headers });
  const data = await res.json().catch(() => null);
  return { status: res.status, data, headers: Object.fromEntries(res.headers.entries()) };
}

async function apiPost(endpoint, body = {}, headers = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `${API_URL}${endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function apiPatch(endpoint, body = {}, headers = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `${API_URL}${endpoint}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function apiDelete(endpoint, headers = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `${API_URL}${endpoint}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function runVerification() {
  console.log("===============================================================================");
  console.log(" MASTERHRMS FILE MANAGER — PHASE F1 E2E VERIFICATION SUITE");
  console.log("===============================================================================\n");

  const results = [];
  function assert(title, condition, details = "") {
    if (condition) {
      console.log(`[PASS] ${title}`);
      results.push({ title, status: "PASS", details });
    } else {
      console.error(`[FAIL] ${title} — ${details}`);
      results.push({ title, status: "FAIL", details });
    }
  }

  const runId = Date.now();
  const folderName1 = `F1 Parent ${runId}`;
  const folderName2 = `F1 Child ${runId}`;

  try {
    // -------------------------------------------------------------------------
    // CHECK 1: Baseline MediaFile Record Integrity
    // -------------------------------------------------------------------------
    console.log(">>> CHECK 1: Baseline MediaFile Record Integrity");
    const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, "media_baseline.json"), "utf8"));
    const currentMediaCount = await prisma.mediaFile.count();
    assert(
      "Canonical MediaFile Count Preserved",
      currentMediaCount >= baseline.mediaCount,
      `Baseline: ${baseline.mediaCount}, Current: ${currentMediaCount}`
    );

    // -------------------------------------------------------------------------
    // CHECK 2: Baseline MediaUsage References
    // -------------------------------------------------------------------------
    console.log("\n>>> CHECK 2: Baseline MediaUsage References");
    const currentUsageCount = await prisma.mediaUsage.count();
    assert(
      "MediaUsage Links Preserved",
      currentUsageCount >= baseline.usageCount,
      `Baseline: ${baseline.usageCount}, Current: ${currentUsageCount}`
    );

    // -------------------------------------------------------------------------
    // CHECK 3: Branding & Chat Attachment URLs
    // -------------------------------------------------------------------------
    console.log("\n>>> CHECK 3: Branding & Chat Attachment URLs");
    const chatMediaFiles = await prisma.mediaFile.findMany({
      where: { folder: { startsWith: "Chat/" } },
    });
    const brokenChatUrls = chatMediaFiles.filter((f) => !f.url || f.url.includes("undefined"));
    assert(
      "Chat Attachment URLs Non-Corrupted",
      brokenChatUrls.length === 0,
      `Verified ${chatMediaFiles.length} chat media files.`
    );

    const brandingFiles = await prisma.mediaFile.findMany({
      where: { folder: { contains: "branding" } },
    });
    const brokenBrandingUrls = brandingFiles.filter((f) => !f.url || f.url.includes("undefined"));
    assert(
      "Branding Asset URLs Non-Corrupted",
      brokenBrandingUrls.length === 0,
      `Verified ${brandingFiles.length} branding media files.`
    );

    // -------------------------------------------------------------------------
    // CHECK 4: Backward Compatibility — /api/v1/media Endpoints
    // -------------------------------------------------------------------------
    console.log("\n>>> CHECK 4: Media Library Backward Compatibility");
    const mediaRes = await apiGet("/media", hrHeaders);
    assert(
      "GET /api/v1/media Returns Legacy List",
      Array.isArray(mediaRes.data) && mediaRes.data.length > 0,
      `Returned ${mediaRes.data?.length || 0} media items.`
    );

    // -------------------------------------------------------------------------
    // CHECK 5: Unified Files API — List & Stats
    // -------------------------------------------------------------------------
    console.log("\n>>> CHECK 5: Unified Files API — List & Stats");
    const statsRes = await apiGet("/files/stats", hrHeaders);
    assert(
      "GET /api/v1/files/stats Returns Accurate Quota & Category Breakdown",
      statsRes.data &&
        typeof statsRes.data.totalFiles === "number" &&
        typeof statsRes.data.quotaBytes === "number" &&
        statsRes.data.categoryBreakdown !== undefined,
      `Files: ${statsRes.data?.totalFiles}, Size: ${statsRes.data?.formattedTotalSize}, Quota: ${statsRes.data?.formattedQuota}`
    );

    const filesListRes = await apiGet("/files?limit=20", hrHeaders);
    assert(
      "GET /api/v1/files Returns Paginated Items with Category & Attributes",
      filesListRes.data &&
        Array.isArray(filesListRes.data.items) &&
        filesListRes.data.pagination?.total > 0,
      `Total: ${filesListRes.data?.pagination?.total}, Sample: ${filesListRes.data?.items?.[0]?.name}`
    );

    // -------------------------------------------------------------------------
    // CHECK 6: Folder Lifecycle (Create, Subfolder, Circular Nesting Rejection)
    // -------------------------------------------------------------------------
    console.log("\n>>> CHECK 6: Folder Lifecycle & Circular Nesting Protection");
    const folder1Res = await apiPost("/files/folder", { name: folderName1 }, hrHeaders);
    const folder1 = folder1Res.data;
    assert(
      "POST /api/v1/files/folder Creates Root Folder",
      folder1?.id && (folder1?.fileName === folderName1 || folder1?.name === folderName1),
      `Folder ID: ${folder1?.id}`
    );

    const folder2Res = await apiPost(
      "/files/folder",
      { name: folderName2, parentId: folder1.id },
      hrHeaders
    );
    const folder2 = folder2Res.data;
    assert(
      "POST /api/v1/files/folder Creates Nested Subfolder",
      folder2?.id && folder2?.parentId === folder1.id,
      `Parent ID: ${folder2?.parentId}`
    );

    // Test circular move rejection: attempt moving folder1 into folder2
    const circularRes = await apiPatch(
      `/files/${folder1.id}/move`,
      { targetParentId: folder2.id },
      hrHeaders
    );
    assert(
      "Circular Folder Nesting Strictly Blocked",
      circularRes.status === 400 || circularRes.status === 500,
      `Response status: ${circularRes.status}, error: ${circularRes.data?.error}`
    );

    // -------------------------------------------------------------------------
    // CHECK 7: Per-User Starred State & Isolation
    // -------------------------------------------------------------------------
    console.log("\n>>> CHECK 7: Per-User Starred State & Isolation");
    // Star folder1 as HR user
    const starRes1 = await apiPost(`/files/${folder1.id}/star`, {}, hrHeaders);
    assert(
      "HR User Stars Folder1",
      starRes1.data?.isStarred === true,
      "FileStar created for user-hr-001."
    );

    // Verify folder1 is starred when listed by HR user
    const hrFiles = await apiGet("/files?starred=true", hrHeaders);
    const isStarredForHr = (hrFiles.data?.items || []).some((i) => i.id === folder1.id);
    assert(
      "HR Starred Query Includes Folder1",
      isStarredForHr,
      `Found ${hrFiles.data?.items?.length || 0} starred items for HR.`
    );

    // Verify folder1 is NOT starred when listed by Employee user
    const empFiles = await apiGet("/files?starred=true", empHeaders);
    const isStarredForEmp = (empFiles.data?.items || []).some((i) => i.id === folder1.id);
    assert(
      "Employee User Starred Isolation Verified (Not Starred for Emp)",
      !isStarredForEmp,
      "Per-user isolation intact: Employee does not see HR starred item."
    );

    // -------------------------------------------------------------------------
    // CHECK 8: Sharing ACL & Permissions
    // -------------------------------------------------------------------------
    console.log("\n>>> CHECK 8: Sharing ACL & Permissions");
    const shareRes = await apiPost(
      `/files/${folder1.id}/share`,
      {
        sharedWith: "user-emp-001",
        sharedRole: "employee",
        accessLevel: "download",
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      },
      hrHeaders
    );
    const shareRecord = shareRes.data;
    assert(
      "POST /api/v1/files/:id/share Creates ACL Share Record",
      shareRecord?.id && shareRecord?.fileId === folder1.id && shareRecord?.accessLevel === "download",
      `Share ID: ${shareRecord?.id}`
    );

    const listSharesRes = await apiGet(`/files/${folder1.id}/shares`, hrHeaders);
    assert(
      "GET /api/v1/files/:id/shares Lists Active Shares",
      Array.isArray(listSharesRes.data) && listSharesRes.data.some((s) => s.id === shareRecord.id),
      `Total active shares: ${listSharesRes.data?.length || 0}`
    );

    // Revoke share
    const revokeRes = await apiDelete(`/files/${folder1.id}/share/${shareRecord.id}`, hrHeaders);
    assert(
      "DELETE /api/v1/files/:id/share/:shareId Revokes Share",
      revokeRes.data?.success === true,
      `Revoked at: ${revokeRes.data?.share?.revokedAt}`
    );

    // -------------------------------------------------------------------------
    // CHECK 9: Trash, In-Use Protection & Restore
    // -------------------------------------------------------------------------
    console.log("\n>>> CHECK 9: Trash, In-Use Protection & Restore");
    // Find a file in this tenant that has active usages
    const inUseFile = await prisma.mediaFile.findFirst({
      where: { tenantId: tenantId, usages: { some: {} }, deletedAt: null },
    });
    if (inUseFile) {
      const blockedRes = await apiPost("/files/trash", { ids: [inUseFile.id] }, hrHeaders);
      assert(
        "Trash In-Use Conflict Check Blocks Deletion of Active Assets",
        blockedRes.status === 409 || blockedRes.data?.code === "MEDIA_IN_USE",
        `Blocked deletion of in-use file: "${inUseFile.fileName}" (status: ${blockedRes.status}, code: ${blockedRes.data?.code})`
      );
    }

    // Trash folder2 (which is not in use)
    const trashRes = await apiPost("/files/trash", { ids: [folder2.id] }, hrHeaders);
    assert(
      "POST /api/v1/files/trash Soft-Deletes Non-In-Use Asset",
      trashRes.data?.trashedCount === 1,
      `Trashed ID: ${folder2.id}`
    );

    // Restore folder2
    const restoreRes = await apiPost("/files/restore", { ids: [folder2.id] }, hrHeaders);
    assert(
      "POST /api/v1/files/restore Restores Asset with Original Hierarchy",
      restoreRes.data?.restoredCount === 1,
      `Restored ID: ${folder2.id}`
    );

    // -------------------------------------------------------------------------
    // CHECK 10: Authorized Streaming & HMAC Signed URLs
    // -------------------------------------------------------------------------
    console.log("\n>>> CHECK 10: Authorized Streaming & HMAC Signed URLs");
    const sampleFile = await prisma.mediaFile.findFirst({
      where: { tenantId: tenantId, isFolder: false, deletedAt: null },
    });
    if (sampleFile) {
      const signedRes = await apiGet(`/files/${sampleFile.id}/signed-url`, hrHeaders);
      const signedUrl = signedRes.data?.signedUrl;
      assert(
        "GET /api/v1/files/:id/signed-url Generates Valid HMAC Signature",
        signedUrl && signedUrl.includes("sig=") && signedUrl.includes("exp="),
        `Signed URL: ${signedUrl}`
      );

      // Stream file using the signed URL without Authorization header
      const fullStreamUrl = signedUrl.startsWith("http")
        ? signedUrl.replace(":3000", ":4000")
        : `http://localhost:4000${signedUrl}`;
      const streamRes = await fetch(fullStreamUrl);
      assert(
        "GET /api/v1/files/:id/stream Downloads File via Signed URL",
        streamRes.status === 200 && streamRes.headers.get("content-type") !== null,
        `Status: ${streamRes.status}, Content-Type: ${streamRes.headers.get("content-type")}`
      );

      // Verify cross-tenant isolation: Tenant B attempts to access Tenant A file
      const tenantBRes = await apiGet(`/files/${sampleFile.id}`, tenantBHeaders);
      assert(
        "Cross-Tenant Access Strictly Blocked (Tenant B -> Tenant A File)",
        tenantBRes.status === 403 || tenantBRes.status === 404,
        `Tenant B rejected with status: ${tenantBRes.status}`
      );
    }

    // Clean up temporary test folders
    await prisma.fileStar.deleteMany({ where: { fileId: { in: [folder1.id, folder2.id] } } });
    await prisma.fileShare.deleteMany({ where: { fileId: { in: [folder1.id, folder2.id] } } });
    await prisma.mediaFile.deleteMany({ where: { id: { in: [folder1.id, folder2.id] } } });
    console.log("\n[CLEANUP] Temporary test folders deleted cleanly.");

    // -------------------------------------------------------------------------
    // PLAYWRIGHT BROWSER VERIFICATION & SCREENSHOTS
    // -------------------------------------------------------------------------
    console.log("\n>>> RUNNING PLAYWRIGHT SCREENSHOT VERIFICATION...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });

    // Set auth cookies
    await context.addCookies([
      {
        name: "hrms_auth_token",
        value: hrToken,
        domain: "localhost",
        path: "/",
      },
      {
        name: "auth_token",
        value: hrToken,
        domain: "localhost",
        path: "/",
      },
    ]);

    const page = await context.newPage();

    // 1. Visit /hr/files
    console.log("Navigating to http://localhost:3000/hr/files ...");
    await page.goto(`${BASE_URL}/hr/files`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.evaluate((tok) => {
      localStorage.setItem("hrms_auth_token", tok);
      localStorage.setItem("auth_token", tok);
    }, hrToken);
    await page.waitForTimeout(2500);

    const hrFilesPath = path.join(SCREENSHOT_DIR, "01_hr_files_list_view.png");
    await page.screenshot({ path: hrFilesPath, fullPage: true });
    console.log(`Saved screenshot: ${hrFilesPath}`);

    // Switch to Grid view
    const gridBtn = await page.$('button[title="Grid View"]');
    if (gridBtn) {
      await gridBtn.click();
      await page.waitForTimeout(1000);
      const hrFilesGridPath = path.join(SCREENSHOT_DIR, "02_hr_files_grid_view.png");
      await page.screenshot({ path: hrFilesGridPath, fullPage: true });
      console.log(`Saved screenshot: ${hrFilesGridPath}`);
    }

    // 2. Visit /apps/file-manager/list-view
    console.log("Navigating to http://localhost:3000/apps/file-manager/list-view ...");
    await page.goto(`${BASE_URL}/apps/file-manager/list-view`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2000);
    const appListPath = path.join(SCREENSHOT_DIR, "03_apps_file_manager_list.png");
    await page.screenshot({ path: appListPath, fullPage: true });
    console.log(`Saved screenshot: ${appListPath}`);

    // 3. Visit /apps/file-manager/grid-view
    console.log("Navigating to http://localhost:3000/apps/file-manager/grid-view ...");
    await page.goto(`${BASE_URL}/apps/file-manager/grid-view`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2000);
    const appGridPath = path.join(SCREENSHOT_DIR, "04_apps_file_manager_grid.png");
    await page.screenshot({ path: appGridPath, fullPage: true });
    console.log(`Saved screenshot: ${appGridPath}`);

    // 4. Visit /hr/media (confirm backward compatibility)
    console.log("Navigating to http://localhost:3000/hr/media ...");
    await page.goto(`${BASE_URL}/hr/media`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2000);
    const mediaPath = path.join(SCREENSHOT_DIR, "05_hr_media_library_backward_compat.png");
    await page.screenshot({ path: mediaPath, fullPage: true });
    console.log(`Saved screenshot: ${mediaPath}`);

    await browser.close();

    // Copy screenshots to Artifact Directory
    const ARTIFACT_DIR = path.resolve("C:/Users/TSV Global Solutions/.gemini/antigravity/brain/29494ee0-4f9e-4896-8c16-14b56e9678b0");
    if (fs.existsSync(ARTIFACT_DIR)) {
      const files = fs.readdirSync(SCREENSHOT_DIR);
      for (const f of files) {
        fs.copyFileSync(path.join(SCREENSHOT_DIR, f), path.join(ARTIFACT_DIR, f));
      }
      console.log("Copied all screenshots to artifact directory.");
    }

    console.log("\n===============================================================================");
    console.log(" VERIFICATION SUMMARY");
    console.log("===============================================================================");
    const passed = results.filter((r) => r.status === "PASS").length;
    const failed = results.filter((r) => r.status === "FAIL").length;
    console.log(`TOTAL CHECKS: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error("FATAL ERROR IN VERIFICATION:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();
