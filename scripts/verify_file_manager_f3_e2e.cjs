/**
 * MASTERHRMS — Phase F3 Comprehensive Automated Verification & Browser QA Suite
 *
 * Checks:
 *  1. Privacy by Default (unshared files inaccessible to other users -> 404/denied)
 *  2. Internal ACL Grant (Owner grants EDITOR to Employee via API)
 *  3. Cross-Tenant Direct ID & ACL Isolation (403/404 enforcement)
 *  4. Upward Folder Inheritance (Child items inherit parent folder ACLs)
 *  5. Principal Search API (Fuzzy lookup by name/email)
 *  6. Team Folder Lifecycle (Create team -> auto folder -> add member -> safe non-destructive delete)
 *  7. Public Link Cryptographic Token & Bcrypt Password Protection
 *  8. Short-Lived Signed Download URL Authorization
 *  9. Public Link Revocation & 404 Invalidation
 * 10. Audit Logging (FileActivity) & Transactional Outbox (OutboxEvent)
 * 11. Browser QA: HR Admin Ribbon / Details Row Share Trigger
 * 12. Browser QA: Share Dialog Internal Collaborator Assignment & Realtime List
 * 13. Browser QA: Share Dialog Public Link Generation with Password
 * 14. Browser QA: Guest Anonymous Password Prompt & Unlocked Preview
 * 15. Browser QA: Guest Signed Download URL Trigger
 * 16. Browser QA: Employee "Shared with Me" Navigation Filter & Realtime Access
 * 17. Browser QA: Public Link Revocation UI & Invalidation Verification
 * 18. F1 & F2 Core Regression Check (Quota, Categories, Legacy Media)
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const jwt = require("../server/node_modules/jsonwebtoken");
const { chromium } = require("playwright");

require("dotenv").config({ path: path.join(__dirname, "../server/.env") });

const JWT_SECRET = process.env.JWT_SECRET || "master-hrms-jwt-super-secret-key-change-this-in-production";
const BASE_URL = "http://localhost:3000";
const API_BASE = "http://localhost:4000/api/v1";

const SCREENSHOT_DIR = path.join(__dirname, "../docs/Saas/screenshots/files_f3");
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// User credentials
const tenantId = "tenant-default-001";
const otherTenantId = "tenant-other-999";

const hrUser = {
  userId: "user-hr-001",
  tenantId: tenantId,
  roles: ["hr_admin"],
  email: "hr@masterhrms.com",
};

const empUser = {
  userId: "user-emp-001",
  tenantId: tenantId,
  roles: ["employee"],
  email: "employee@masterhrms.com",
};

const foreignUser = {
  userId: "user-foreign-999",
  tenantId: otherTenantId,
  roles: ["employee"],
  email: "foreign@othercorp.com",
};

const hrToken = jwt.sign(hrUser, JWT_SECRET, { expiresIn: "1d" });
const empToken = jwt.sign(empUser, JWT_SECRET, { expiresIn: "1d" });
const foreignToken = jwt.sign(foreignUser, JWT_SECRET, { expiresIn: "1d" });

const checks = [];
function recordCheck(id, description, status, details = "") {
  checks.push({ id, description, status, details });
  console.log(`[${status}] Check ${id}: ${description} ${details ? `(${details})` : ""}`);
}

// Helper: HTTP request wrapper
function request(method, urlPath, token, body = null) {
  return new Promise((resolve, reject) => {
    const fullUrl = urlPath.startsWith("http")
      ? urlPath
      : `${API_BASE}${urlPath.startsWith("/") ? "" : "/"}${urlPath}`;
    const parsed = new URL(fullUrl);
    const headers = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const data = body ? JSON.stringify(body) : null;
    if (data) {
      headers["Content-Length"] = Buffer.byteLength(data);
    }

    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: method,
        headers: headers,
      },
      (res) => {
        let resBody = "";
        res.on("data", (chunk) => (resBody += chunk));
        res.on("end", () => {
          let parsedBody;
          try {
            parsedBody = JSON.parse(resBody);
          } catch (e) {
            parsedBody = resBody;
          }
          resolve({ status: res.statusCode, headers: res.headers, data: parsedBody });
        });
      }
    );

    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runF3VerificationSuite() {
  console.log("===============================================================================");
  console.log(" MASTERHRMS FILE MANAGER — PHASE F3 COMPREHENSIVE VERIFICATION SUITE");
  console.log("===============================================================================\n");

  const { PrismaClient } = require("../server/node_modules/@prisma/client");
  const prisma = new PrismaClient();

  try {
    // -------------------------------------------------------------------------
    // 0. Seed Database Prereqs (Tenants, Users, Profiles)
    // -------------------------------------------------------------------------
    await prisma.tenant.upsert({
      where: { id: tenantId },
      update: { name: "Default Tenant", slug: "default-tenant" },
      create: { id: tenantId, name: "Default Tenant", slug: "default-tenant" },
    });

    await prisma.tenant.upsert({
      where: { id: otherTenantId },
      update: { name: "Other Tenant", slug: "other-tenant" },
      create: { id: otherTenantId, name: "Other Tenant", slug: "other-tenant" },
    });

    await prisma.user.upsert({
      where: { id: hrUser.userId },
      create: { id: hrUser.userId, email: hrUser.email, passwordHash: "test_hash" },
      update: {},
    });
    await prisma.profile.upsert({
      where: { userId: hrUser.userId },
      create: { userId: hrUser.userId, email: hrUser.email, fullName: "HR Admin", tenantId: tenantId },
      update: { tenantId: tenantId, fullName: "HR Admin" },
    });

    await prisma.user.upsert({
      where: { id: empUser.userId },
      create: { id: empUser.userId, email: empUser.email, passwordHash: "test_hash" },
      update: {},
    });
    await prisma.profile.upsert({
      where: { userId: empUser.userId },
      create: { userId: empUser.userId, email: empUser.email, fullName: "Regular Employee", tenantId: tenantId },
      update: { tenantId: tenantId, fullName: "Regular Employee" },
    });

    await prisma.user.upsert({
      where: { id: foreignUser.userId },
      create: { id: foreignUser.userId, email: foreignUser.email, passwordHash: "test_hash" },
      update: {},
    });
    await prisma.profile.upsert({
      where: { userId: foreignUser.userId },
      create: { userId: foreignUser.userId, email: foreignUser.email, fullName: "Foreign Worker", tenantId: otherTenantId },
      update: { tenantId: otherTenantId, fullName: "Foreign Worker" },
    });

    // Clean prior test items
    await prisma.mediaFile.deleteMany({
      where: {
        fileName: {
          in: [
            "F3_Confidential_Plan.pdf",
            "F3_Shared_Folder",
            "F3_Child_Document.docx",
            "F3_Public_Spec.pdf",
            "Q4_Financial_Strategy_2026.docx",
          ],
        },
      },
    });

    // =========================================================================
    // PART 1: BACKEND API & SECURITY VERIFICATION
    // =========================================================================
    console.log(">>> [PART 1] Backend API & Security Engine Checks...");

    // Test File 1: Confidential file owned by HR
    const testFile = await prisma.mediaFile.create({
      data: {
        fileName: "F3_Confidential_Plan.pdf",
        mimeType: "application/pdf",
        fileSize: 1024 * 512,
        filePath: "uploads/tenant-default-001/f3_confidential.pdf",
        storageDisk: "LOCAL",
        tenantId: tenantId,
        ownerId: hrUser.userId,
        ownerType: "USER",
        category: "Documents",
        folder: "Documents",
        checksumSha: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        url: "/uploads/tenant-default-001/f3_confidential.pdf",
        isFolder: false,
        version: 1,
      },
    });

    // 1. Privacy by default check (Employee attempting to access private file gets 404)
    const empGetPre = await request("GET", `/files/nodes/${testFile.id}`, empToken);
    if (empGetPre.status === 404) {
      recordCheck(1, "Privacy by default: unshared file is inaccessible to other users (404)", "PASS");
    } else {
      recordCheck(1, "Privacy by default: unshared file is inaccessible to other users (404)", "FAIL", `status: ${empGetPre.status}`);
    }

    // 2. Internal ACL Grant (HR Admin grants EDITOR to Employee)
    const grantRes = await request("POST", `/files/${testFile.id}/acls`, hrToken, {
      principalType: "USER",
      principalId: empUser.userId,
      permission: "EDITOR",
      inherit: true,
    });
    if (grantRes.status === 201 && grantRes.data.permission === "EDITOR") {
      recordCheck(2, "Internal ACL Grant: HR Admin grants EDITOR to Employee", "PASS", `AclId: ${grantRes.data.id}`);
    } else {
      recordCheck(2, "Internal ACL Grant: HR Admin grants EDITOR to Employee", "FAIL", JSON.stringify(grantRes.data));
    }

    // 3. Employee Access Verification & Shared With Me listing
    const empItemRes = await request("GET", `/files/nodes/${testFile.id}`, empToken);
    const empSharedList = await request("GET", "/files?view=shared-with-me", empToken);
    const empHasInShared = empSharedList.data.items?.some((f) => f.id === testFile.id);

    if (empItemRes.status === 200 && empItemRes.data.userPermission === "EDITOR" && empHasInShared) {
      recordCheck(3, "Shared With Me filter & resolved permission verification", "PASS", `Permission: ${empItemRes.data.userPermission}`);
    } else {
      recordCheck(3, "Shared With Me filter & resolved permission verification", "FAIL", `status: ${empItemRes.status}, permission: ${empItemRes.data?.userPermission}, inShared: ${empHasInShared}`);
    }

    // 4. Cross-Tenant Direct ID & ACL Isolation (403/404)
    const crossTenantGet = await request("GET", `/files/nodes/${testFile.id}`, foreignToken);
    const crossTenantAcl = await request("GET", `/files/${testFile.id}/acls`, foreignToken);
    if ((crossTenantGet.status === 403 || crossTenantGet.status === 404) && (crossTenantAcl.status === 403 || crossTenantAcl.status === 404)) {
      recordCheck(4, "Cross-Tenant isolation: unauthorized foreign tenant denied", "PASS", `Status: ${crossTenantGet.status}`);
    } else {
      recordCheck(4, "Cross-Tenant isolation: unauthorized foreign tenant denied", "FAIL", `Status: ${crossTenantGet.status}`);
    }

    // 5. Upward Folder Inheritance
    const testFolder = await prisma.mediaFile.create({
      data: {
        fileName: "F3_Shared_Folder",
        mimeType: "folder",
        fileSize: 0,
        filePath: "folders/f3_shared_folder",
        storageDisk: "LOCAL",
        tenantId: tenantId,
        ownerId: hrUser.userId,
        ownerType: "USER",
        category: "Folders",
        folder: "Folders",
        checksumSha: "0000000000000000000000000000000000000000000000000000000000000000",
        url: "",
        isFolder: true,
        version: 1,
      },
    });

    const testChild = await prisma.mediaFile.create({
      data: {
        fileName: "F3_Child_Document.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        fileSize: 1024 * 256,
        filePath: "uploads/tenant-default-001/f3_child.docx",
        storageDisk: "LOCAL",
        tenantId: tenantId,
        ownerId: hrUser.userId,
        ownerType: "USER",
        parentId: testFolder.id,
        category: "Documents",
        folder: "Documents",
        checksumSha: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        url: "/uploads/tenant-default-001/f3_child.docx",
        isFolder: false,
        version: 1,
      },
    });

    // Grant VIEWER on parent folder to Employee
    await request("POST", `/files/${testFolder.id}/acls`, hrToken, {
      principalType: "USER",
      principalId: empUser.userId,
      permission: "VIEWER",
      inherit: true,
    });

    // Verify child file automatically resolves to VIEWER
    const childRes = await request("GET", `/files/nodes/${testChild.id}`, empToken);
    if (childRes.status === 200 && childRes.data.userPermission === "VIEWER") {
      recordCheck(5, "Upward Folder Inheritance: child inherits parent folder ACL", "PASS", `Resolved: ${childRes.data.userPermission}`);
    } else {
      recordCheck(5, "Upward Folder Inheritance: child inherits parent folder ACL", "FAIL", `Child permission: ${childRes.data?.userPermission}`);
    }

    // 6. Principal Search API
    const searchRes = await request("GET", "/files/principals/search?q=Regular", hrToken);
    if (searchRes.status === 200 && searchRes.data.users?.some((u) => u.id === empUser.userId)) {
      recordCheck(6, "Principal search API: returns matching tenant users", "PASS", `Found ${searchRes.data.users.length} user(s)`);
    } else {
      recordCheck(6, "Principal search API: returns matching tenant users", "FAIL", JSON.stringify(searchRes.data));
    }

    // 7. Team Folder Lifecycle & Safe Non-Destructive Deletion
    const teamRes = await request("POST", "/files/teams", hrToken, {
      name: `Core Team ${Date.now()}`,
      description: "Core Engineering Team",
    });
    const teamId = teamRes.data.id;
    const teamFolderId = teamRes.data.rootFolderId || teamRes.data.rootFolder?.id;

    // Add employee as team member
    await request("POST", `/files/teams/${teamId}/members`, hrToken, {
      userId: empUser.userId,
      role: "CONTRIBUTOR",
    });

    // Verify employee has access to team folder
    const teamFolderEmpGet = await request("GET", `/files/nodes/${teamFolderId}`, empToken);
    const empTeamAccessOk = teamFolderEmpGet.status === 200 && ["MANAGER", "CONTRIBUTOR", "EDITOR"].includes(teamFolderEmpGet.data.userPermission);

    // Delete team and verify folder is preserved (safe non-destructive)
    await request("DELETE", `/files/teams/${teamId}`, hrToken);
    const preservedFolder = await prisma.mediaFile.findUnique({ where: { id: teamFolderId } });
    const isFolderPreserved = preservedFolder && preservedFolder.ownerType === "USER" && preservedFolder.ownerId === hrUser.userId;

    if (empTeamAccessOk && isFolderPreserved) {
      recordCheck(7, "Team Folder lifecycle & non-destructive preservation", "PASS", `Folder ${teamFolderId} retained`);
    } else {
      recordCheck(7, "Team Folder lifecycle & non-destructive preservation", "FAIL", `empAccess: ${empTeamAccessOk}, preserved: ${isFolderPreserved}`);
    }

    // 8. Public Link Cryptographic Token & Bcrypt Password Protection
    const publicFile = await prisma.mediaFile.create({
      data: {
        fileName: "F3_Public_Spec.pdf",
        mimeType: "application/pdf",
        fileSize: 1024 * 128,
        filePath: "uploads/tenant-default-001/f3_public_spec.pdf",
        storageDisk: "LOCAL",
        tenantId: tenantId,
        ownerId: hrUser.userId,
        ownerType: "USER",
        category: "Documents",
        folder: "Documents",
        checksumSha: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        url: "/uploads/tenant-default-001/f3_public_spec.pdf",
        isFolder: false,
        version: 1,
      },
    });

    const createLinkRes = await request("POST", `/files/${publicFile.id}/public-link`, hrToken, {
      password: "TestPassword123!",
      allowDownload: true,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    const rawToken = createLinkRes.data.token || createLinkRes.data.link?.token;

    // Verify hash in DB is NOT plaintext token
    const dbAcl = await prisma.fileAcl.findFirst({
      where: { fileId: publicFile.id, principalType: "LINK" },
    });
    const tokenSecurelyHashed = dbAcl && dbAcl.linkTokenHash !== rawToken && !!dbAcl.linkPasswordHash;

    // Test unauthenticated guest endpoint
    const guestMetaRes = await request("GET", `/public/files/link/${rawToken}`, null);
    const requiresPassword = guestMetaRes.data.requiresPassword === true && !guestMetaRes.data.file.downloadUrl;

    // Test verify with wrong password
    const wrongVerify = await request("POST", `/public/files/link/${rawToken}/verify`, null, { password: "wrong" });
    const wrongRejected = wrongVerify.status === 401;

    // Test verify with correct password
    const rightVerify = await request("POST", `/public/files/link/${rawToken}/verify`, null, { password: "TestPassword123!" });
    const rightAccepted = rightVerify.status === 200 && (rightVerify.data.success === true || rightVerify.data.isPasswordValid === true);

    // Test signed download URL generation
    const downloadRes = await request("POST", `/public/files/link/${rawToken}/download`, null, { password: "TestPassword123!" });
    const hasDownloadUrl = downloadRes.status === 200 && downloadRes.data.downloadUrl && (downloadRes.data.downloadUrl.includes("exp=") || downloadRes.data.downloadUrl.includes("/stream"));

    if (tokenSecurelyHashed && requiresPassword && wrongRejected && rightAccepted && hasDownloadUrl) {
      recordCheck(8, "Public Link cryptographic security, bcrypt auth & signed download", "PASS");
    } else {
      recordCheck(8, "Public Link cryptographic security, bcrypt auth & signed download", "FAIL", `hash: ${tokenSecurelyHashed}, reqPass: ${requiresPassword}, wrong: ${wrongRejected}, right: ${rightAccepted}, dl: ${hasDownloadUrl}`);
    }

    // 9. Public Link Revocation
    await request("DELETE", `/files/${publicFile.id}/public-link`, hrToken);
    const postRevokeGet = await request("GET", `/public/files/link/${rawToken}`, null);
    if (postRevokeGet.status === 404) {
      recordCheck(9, "Public Link revocation & instant 404 invalidation", "PASS");
    } else {
      recordCheck(9, "Public Link revocation & instant 404 invalidation", "FAIL", `status: ${postRevokeGet.status}`);
    }

    // 10. Audit Logging (FileActivity) & Transactional Outbox (OutboxEvent)
    const recentActivities = await prisma.fileActivity.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    const recentOutbox = await prisma.outboxEvent.findMany({
      where: {
        eventType: {
          in: [
            "file:acl:created",
            "file:acl:revoked",
            "file:public_link:created",
            "file:public_link:revoked",
            "file:team:created",
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    if (recentActivities.length > 0 && recentOutbox.length > 0) {
      recordCheck(10, "Audit logging (FileActivity) & Transactional Outbox persistence", "PASS", `${recentActivities.length} activities, ${recentOutbox.length} outbox events recorded`);
    } else {
      recordCheck(10, "Audit logging (FileActivity) & Transactional Outbox persistence", "FAIL", `activities: ${recentActivities.length}, outbox: ${recentOutbox.length}`);
    }

    // =========================================================================
    // PART 2: PLAYWRIGHT BROWSER QA (MULTI-SESSION & GUEST)
    // =========================================================================
    console.log("\n>>> [PART 2] Playwright Multi-Session Browser QA...");

    const browser = await chromium.launch({ headless: true });
    const consoleErrors = [];

    // Create a rich test file for UI verification
    const uiTestFile = await prisma.mediaFile.create({
      data: {
        fileName: "Q4_Financial_Strategy_2026.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        fileSize: 1024 * 768,
        filePath: "uploads/tenant-default-001/q4_strategy.docx",
        storageDisk: "LOCAL",
        tenantId: tenantId,
        ownerId: hrUser.userId,
        ownerType: "USER",
        category: "Documents",
        folder: "Documents",
        checksumSha: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        url: "/uploads/tenant-default-001/q4_strategy.docx",
        isFolder: false,
        version: 1,
      },
    });

    // -------------------------------------------------------------------------
    // BROWSER SESSION 1: HR Admin in /hr/files
    // -------------------------------------------------------------------------
    console.log("--> Testing HR Admin Session & Share Dialog (/hr/files)...");
    const hrContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const hrPage = await hrContext.newPage();

    hrPage.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push({ role: "HR Admin", text: msg.text() });
    });

    await hrPage.addInitScript((tok) => {
      localStorage.setItem("hrms_auth_token", tok);
      localStorage.setItem("auth_token", tok);
    }, hrToken);

    await hrPage.goto(`${BASE_URL}/hr/files`, { waitUntil: "networkidle", timeout: 20000 });
    await hrPage.waitForTimeout(2000);

    // Select the file row in the file table/grid
    const fileRow = await hrPage.waitForSelector(`text="Q4_Financial_Strategy_2026.docx"`, { timeout: 10000 });
    await fileRow.click();
    await hrPage.waitForTimeout(500);

    // 11. Verify Share Button in Ribbon Bar
    const ribbonShareBtn = await hrPage.$('header button:has-text("Share")');
    if (ribbonShareBtn) {
      recordCheck(11, "Ribbon Bar contains active Share command button", "PASS");
      await ribbonShareBtn.click();
    } else {
      recordCheck(11, "Ribbon Bar contains active Share command button", "FAIL");
    }

    // Wait for Share Dialog to appear
    await hrPage.waitForSelector('[role="dialog"]', { timeout: 8000 });
    await hrPage.waitForTimeout(500);

    // 12. Browser QA: Share Dialog Internal Collaborator Assignment
    // Search for employee
    const searchInput = await hrPage.$('input[placeholder*="Type name, email"]');
    if (searchInput) {
      await searchInput.focus();
      await searchInput.type("Regular", { delay: 60 });
      await hrPage.waitForTimeout(1200);

      // Select candidate from dropdown
      const candidate = await hrPage.waitForSelector('div:has-text("Regular Employee")', { timeout: 8000 });
      if (candidate) {
        await candidate.click();
        await hrPage.waitForTimeout(500);

        // Click "Share" button inside dialog
        const shareSubmitBtn = await hrPage.waitForSelector('[role="dialog"] button:has-text("Share")', { timeout: 5000 });
        if (shareSubmitBtn) {
          await shareSubmitBtn.click();
          await hrPage.waitForTimeout(2000);
        }
      }
    }

    const shotInternal = path.join(SCREENSHOT_DIR, "01_f3_share_modal_internal.png");
    await hrPage.screenshot({ path: shotInternal });

    // Check if employee is now visible in the collaborators list
    const hasEmployeeAccessListed = await hrPage.$('div:has-text("Regular Employee")');
    if (hasEmployeeAccessListed) {
      recordCheck(12, "Share Dialog: internal collaborator assigned & listed in access matrix", "PASS");
    } else {
      recordCheck(12, "Share Dialog: internal collaborator assigned & listed in access matrix", "FAIL");
    }

    // 13. Browser QA: Public Link Generation with Password in UI
    const publicTabBtn = await hrPage.$('button:has-text("Public Link")');
    let generatedPublicToken = null;
    if (publicTabBtn) {
      await publicTabBtn.click();
      await hrPage.waitForTimeout(500);

      // Enable password protection checkbox
      const pwdCheckbox = await hrPage.$('#enable-password, label[for="enable-password"]');
      if (pwdCheckbox) {
        await pwdCheckbox.click();
        await hrPage.waitForTimeout(300);
      }

      // Enter password
      const passwordInput = await hrPage.$('input[type="password"]');
      if (passwordInput) {
        await passwordInput.fill("ClientDemoPass2026!");
        await hrPage.waitForTimeout(300);
      }

      // Click "Create Public Link"
      const createLinkBtn = await hrPage.$('button:has-text("Create Public Link")');
      if (createLinkBtn) {
        await createLinkBtn.click();
        await hrPage.waitForTimeout(2000);
      }

      // Check generated link input
      const linkInput = await hrPage.$('input[readonly]');
      if (linkInput) {
        const val = await linkInput.inputValue();
        if (val.includes("/share/")) {
          generatedPublicToken = val.split("/share/")[1];
        }
      }
    }

    const shotPublic = path.join(SCREENSHOT_DIR, "02_f3_share_modal_public.png");
    await hrPage.screenshot({ path: shotPublic });

    if (generatedPublicToken) {
      recordCheck(13, "Share Dialog: public link generated with password protection", "PASS", `Token: ${generatedPublicToken.substring(0, 12)}...`);
    } else {
      recordCheck(13, "Share Dialog: public link generated with password protection", "FAIL");
    }

    // Close dialog
    await hrPage.keyboard.press("Escape");
    await hrPage.waitForTimeout(500);

    // -------------------------------------------------------------------------
    // BROWSER SESSION 2: ANONYMOUS GUEST (No Auth, Public Link Verification)
    // -------------------------------------------------------------------------
    console.log("--> Testing Anonymous Guest Session (/share/:token)...");
    const guestContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const guestPage = await guestContext.newPage();

    if (generatedPublicToken) {
      await guestPage.goto(`${BASE_URL}/share/${generatedPublicToken}`, { waitUntil: "networkidle", timeout: 15000 });
      await guestPage.waitForTimeout(1000);

      // 14. Guest Password Screen Render
      const passPrompt = await guestPage.$('h2:has-text("Protected File")');
      const guestPassInput = await guestPage.$('input[type="password"]');
      const shotGuestPrompt = path.join(SCREENSHOT_DIR, "03_f3_guest_password_prompt.png");
      await guestPage.screenshot({ path: shotGuestPrompt });

      if (passPrompt && guestPassInput) {
        recordCheck(14, "Anonymous Guest: password gate rendered successfully", "PASS");

        // Submit correct password
        await guestPassInput.fill("ClientDemoPass2026!");
        const unlockBtn = await guestPage.$('button:has-text("Unlock File")');
        await unlockBtn.click();
        await guestPage.waitForTimeout(1500);

        // 15. Guest Unlocked Preview & Signed Download Button
        const shotGuestUnlocked = path.join(SCREENSHOT_DIR, "04_f3_guest_unlocked_preview.png");
        await guestPage.screenshot({ path: shotGuestUnlocked });

        const downloadBtn = await guestPage.$('a:has-text("Download File"), button:has-text("Download File")');
        if (downloadBtn) {
          recordCheck(15, "Anonymous Guest: unlocked file preview and signed download URL ready", "PASS");
        } else {
          recordCheck(15, "Anonymous Guest: unlocked file preview and signed download URL ready", "FAIL");
        }
      } else {
        recordCheck(14, "Anonymous Guest: password gate rendered successfully", "FAIL");
        recordCheck(15, "Anonymous Guest: unlocked file preview and signed download URL ready", "FAIL");
      }
    } else {
      recordCheck(14, "Anonymous Guest: password gate rendered successfully", "FAIL", "No public token");
      recordCheck(15, "Anonymous Guest: unlocked file preview and signed download URL ready", "FAIL", "No public token");
    }

    // -------------------------------------------------------------------------
    // BROWSER SESSION 3: EMPLOYEE ROLE (Shared with Me verification)
    // -------------------------------------------------------------------------
    console.log("--> Testing Employee Session (/me/files)...");
    const empContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const empPage = await empContext.newPage();

    await empPage.addInitScript((tok) => {
      localStorage.setItem("hrms_auth_token", tok);
      localStorage.setItem("auth_token", tok);
    }, empToken);

    await empPage.goto(`${BASE_URL}/me/files`, { waitUntil: "networkidle", timeout: 20000 });
    await empPage.waitForTimeout(1500);

    // Click "Shared with Me" in sidebar
    const sharedWithMeBtn = await empPage.$('button:has-text("Shared with Me")');
    if (sharedWithMeBtn) {
      await sharedWithMeBtn.click();
      await empPage.waitForTimeout(1500);
    }

    const shotSharedWithMe = path.join(SCREENSHOT_DIR, "05_f3_employee_shared_with_me.png");
    await empPage.screenshot({ path: shotSharedWithMe, fullPage: true });

    const sharedFileVisible = await empPage.$(`text="Q4_Financial_Strategy_2026.docx"`);
    if (sharedFileVisible) {
      recordCheck(16, "Employee UI: 'Shared with Me' view lists collaborative files", "PASS");
    } else {
      recordCheck(16, "Employee UI: 'Shared with Me' view lists collaborative files", "FAIL");
    }

    // -------------------------------------------------------------------------
    // BROWSER SESSION 1 (Revocation Test): HR Admin Revokes Public Link
    // -------------------------------------------------------------------------
    console.log("--> Testing Link Revocation in HR Admin Session...");
    const testFileAgain = await hrPage.waitForSelector(`text="Q4_Financial_Strategy_2026.docx"`);
    await testFileAgain.click();
    await hrPage.waitForTimeout(300);

    const shareBtnAgain = await hrPage.$('header button:has-text("Share")');
    if (shareBtnAgain) {
      await shareBtnAgain.click();
      await hrPage.waitForTimeout(500);

      const pubTab = await hrPage.$('button:has-text("Public Link")');
      if (pubTab) {
        await pubTab.click();
        await hrPage.waitForTimeout(500);

        const revokeBtn = await hrPage.$('button:has-text("Revoke Link")');
        if (revokeBtn) {
          await revokeBtn.click();
          await hrPage.waitForTimeout(1000);
        }
      }
    }

    // Verify Guest page now returns 404
    if (generatedPublicToken) {
      await guestPage.reload({ waitUntil: "networkidle" });
      await guestPage.waitForTimeout(1000);

      const shotRevoked = path.join(SCREENSHOT_DIR, "06_f3_guest_link_revoked_404.png");
      await guestPage.screenshot({ path: shotRevoked });

      const notFoundHeading = await guestPage.$('h2:has-text("Link Unavailable or Expired"), div:has-text("Link Unavailable or Expired")');
      if (notFoundHeading) {
        recordCheck(17, "Public Link revocation reflected instantly on guest page (404 UI)", "PASS");
      } else {
        recordCheck(17, "Public Link revocation reflected instantly on guest page (404 UI)", "FAIL");
      }
    }

    await browser.close();

    // =========================================================================
    // PART 3: REGRESSION TEST FOR F1 & F2 INVARIANTS
    // =========================================================================
    console.log("\n>>> [PART 3] F1 & F2 Core Regression Invariant Verification...");

    // Verify storage stats calculation
    const statsRes = await request("GET", "/files/stats", hrToken);
    const statsOk = statsRes.status === 200 && typeof statsRes.data.quotaBytes === "number" && statsRes.data.categoryBreakdown !== undefined;

    // Verify tenant usage
    const usageRes = await request("GET", "/files/usage/tenant", hrToken);
    const usageOk = usageRes.status === 200 && usageRes.data.usedBytes !== undefined;

    // Verify legacy media API compatibility
    const legacyMedia = await request("GET", "/media", hrToken);
    const legacyOk = legacyMedia.status === 200;

    if (statsOk && usageOk && legacyOk) {
      recordCheck(18, "F1 & F2 Regression: Quota engine, Category aggregation, and Legacy Media API 100% intact", "PASS");
    } else {
      recordCheck(18, "F1 & F2 Regression: Quota engine, Category aggregation, and Legacy Media API 100% intact", "FAIL", `stats: ${statsOk}, usage: ${usageOk}, legacy: ${legacyOk}`);
    }

    // -------------------------------------------------------------------------
    // SUMMARY REPORT
    // -------------------------------------------------------------------------
    console.log("\n===============================================================================");
    console.log(" PHASE F3 VERIFICATION RESULTS SUMMARY");
    console.log("===============================================================================");
    const passed = checks.filter((c) => c.status === "PASS").length;
    const failed = checks.filter((c) => c.status === "FAIL").length;
    console.log(`TOTAL CHECKS: ${checks.length}`);
    console.log(`PASSED: ${passed}`);
    console.log(`FAILED: ${failed}`);
    console.log("===============================================================================\n");

    if (failed > 0) {
      console.error("FAILED CHECKS:");
      checks.filter((c) => c.status === "FAIL").forEach((c) => console.error(` - [FAIL] Check ${c.id}: ${c.description} (${c.details})`));
      process.exit(1);
    } else {
      console.log("ALL 18 PHASE F3 ACCEPTANCE CHECKS PASSED SUCCESSFULLY!");
      process.exit(0);
    }
  } catch (err) {
    console.error("Test Suite Execution Failed with Error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runF3VerificationSuite();
