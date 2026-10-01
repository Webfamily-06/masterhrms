import dotenv from "dotenv";
import path from "path";
import http from "http";
import express from "express";
import bcrypt from "bcryptjs";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { superRouter } from "../routes/super.routes";
import { cmsRouter } from "../routes/cms.routes";
import { recordLoginHistory } from "../services/login-history.service";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

async function runWave2TestSuite() {
  console.log("================================================================================");
  console.log("🧪 RUNNING COMPREHENSIVE VERIFICATION: WAVE 2 — SUPER ADMIN & CMS EXTENSIONS");
  console.log("================================================================================\n");

  const app = express();
  app.use(express.json());

  app.use("/api/super", superRouter);
  app.use("/api/cms", cmsRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const timestamp = Date.now();
  const superAdminId = `user-w2-super-${timestamp}`;
  const regularUserId = `user-w2-regular-${timestamp}`;
  const targetUserId = `user-w2-target-${timestamp}`;

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (detail) console.error("     Detail:", detail);
    }
  }

  let createdFaqId = "";
  let createdTestimonialId = "";
  let backupFileName = "";
  let testLoginHistoryId = "";

  try {
    console.log("▶ [Setup] Provisioning test users and auth tokens...");

    const initialHash = await bcrypt.hash("InitialPassword123!", 10);
    await prisma.user.createMany({
      data: [
        { id: superAdminId, email: `super-${timestamp}@test.com`, passwordHash: initialHash },
        { id: regularUserId, email: `regular-${timestamp}@test.com`, passwordHash: initialHash },
        { id: targetUserId, email: `target-${timestamp}@test.com`, passwordHash: initialHash },
      ],
    });

    await prisma.profile.createMany({
      data: [
        { id: `prof-super-${timestamp}`, userId: superAdminId, fullName: "Super Admin Tester" },
        { id: `prof-reg-${timestamp}`, userId: regularUserId, fullName: "Regular User Tester" },
        { id: `prof-target-${timestamp}`, userId: targetUserId, fullName: "Target Employee" },
      ],
    });

    await prisma.userRole.createMany({
      data: [
        { userId: superAdminId, role: "super_admin" },
        { userId: regularUserId, role: "employee" },
      ],
    });

    const tokenSuper = generateToken({
      userId: superAdminId,
      email: `super-${timestamp}@test.com`,
      roles: ["super_admin"],
    });

    const tokenRegular = generateToken({
      userId: regularUserId,
      email: `regular-${timestamp}@test.com`,
      roles: ["employee"],
    });

    const headersSuper = {
      Authorization: `Bearer ${tokenSuper}`,
      "Content-Type": "application/json",
    };

    const headersRegular = {
      Authorization: `Bearer ${tokenRegular}`,
      "Content-Type": "application/json",
    };

    // =========================================================================
    // SECTION 1: P01 — PASSWORD RESET & AUTH CHECKS
    // =========================================================================
    console.log("\n▶ [Section 1: P01] Testing Super Admin Password Reset & Permissions...");

    // 1.1 Non-super admin cannot reset password
    const unauthReset = await fetch(`${baseUrl}/api/super/users/${targetUserId}/reset-password`, {
      method: "PUT",
      headers: headersRegular,
      body: JSON.stringify({ password: "NewStrongPass99!", password_confirmation: "NewStrongPass99!" }),
    });
    assert(unauthReset.status === 403, "1.1 Non-super admin is rejected with 403 Forbidden");

    // 1.2 Password too short (< 8 chars)
    const shortPassRes = await fetch(`${baseUrl}/api/super/users/${targetUserId}/reset-password`, {
      method: "PUT",
      headers: headersSuper,
      body: JSON.stringify({ password: "short", password_confirmation: "short" }),
    });
    assert(shortPassRes.status === 400, "1.2 Short password (< 8 chars) rejected with 400 Bad Request");

    // 1.3 Confirmation mismatch
    const mismatchRes = await fetch(`${baseUrl}/api/super/users/${targetUserId}/reset-password`, {
      method: "PUT",
      headers: headersSuper,
      body: JSON.stringify({ password: "ValidPassword123!", password_confirmation: "DifferentPass123!" }),
    });
    assert(mismatchRes.status === 400, "1.3 Password confirmation mismatch rejected with 400");

    // 1.4 Successful password reset
    const validResetRes = await fetch(`${baseUrl}/api/super/users/${targetUserId}/reset-password`, {
      method: "PUT",
      headers: headersSuper,
      body: JSON.stringify({ password: "SecureNewPassword2026!", password_confirmation: "SecureNewPassword2026!" }),
    });
    const validResetJson = await validResetRes.json();
    assert(validResetRes.status === 200 && validResetJson.success, "1.4 Super admin can successfully reset user password");

    // 1.5 Verify updated hash in database with bcrypt
    const updatedUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    const isMatch = await bcrypt.compare("SecureNewPassword2026!", updatedUser?.passwordHash || "");
    assert(isMatch === true, "1.5 Database stores real bcrypt hash matching the new password");

    // =========================================================================
    // SECTION 2: P01 — LOGIN HISTORY AUDIT TRAIL
    // =========================================================================
    console.log("\n▶ [Section 2: P01] Testing Login History Recording & Inspection...");

    // 2.1 Record a login history entry directly via service
    const mockReq = {
      headers: { "x-forwarded-for": "192.168.1.100", "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" },
      socket: { remoteAddress: "192.168.1.100" },
    } as any;
    const historyEntry = await recordLoginHistory(mockReq, targetUserId, targetUserId);
    assert(!!historyEntry?.id && historyEntry.ip === "192.168.1.100", "2.1 recordLoginHistory service captures IP and user ID");
    testLoginHistoryId = historyEntry?.id || "";

    // 2.2 Super admin lists login history across all users
    const historyListRes = await fetch(`${baseUrl}/api/super/users/login-history?search=192.168.1.100`, {
      headers: headersSuper,
    });
    const historyListJson = await historyListRes.json();
    const foundEntry = historyListJson.data?.find((h: any) => h.id === testLoginHistoryId);
    assert(historyListRes.status === 200 && !!foundEntry, "2.2 GET /api/super/users/login-history returns recorded entry with user details");

    // 2.3 Single user login history
    const userHistoryRes = await fetch(`${baseUrl}/api/super/users/${targetUserId}/login-history`, {
      headers: headersSuper,
    });
    const userHistoryJson = await userHistoryRes.json();
    assert(userHistoryRes.status === 200 && Array.isArray(userHistoryJson.data) && userHistoryJson.data.length > 0, "2.3 GET /api/super/users/:id/login-history returns specific user events");

    // 2.4 Delete login history entry
    const deleteHistoryRes = await fetch(`${baseUrl}/api/super/users/login-history/${testLoginHistoryId}`, {
      method: "DELETE",
      headers: headersSuper,
    });
    assert(deleteHistoryRes.status === 200, "2.4 DELETE /api/super/users/login-history/:id removes audit entry");

    // =========================================================================
    // SECTION 3: P02 — DATABASE BACKUP GENERATION & STORAGE
    // =========================================================================
    console.log("\n▶ [Section 3: P02] Testing Database Backup System...");

    // 3.1 Non-super admin cannot trigger backup
    const unauthBackup = await fetch(`${baseUrl}/api/super/backup/generate`, {
      method: "POST",
      headers: headersRegular,
    });
    assert(unauthBackup.status === 403, "3.1 Non-super admin cannot generate database backup (403)");

    // 3.2 Super admin generates live database backup archive
    const genBackupRes = await fetch(`${baseUrl}/api/super/backup/generate`, {
      method: "POST",
      headers: headersSuper,
    });
    const genBackupJson = await genBackupRes.json();
    assert(genBackupRes.status === 201 && genBackupJson.success && !!genBackupJson.snapshot?.name, "3.2 Super admin triggers live database backup generation");
    backupFileName = genBackupJson.snapshot?.name || "";

    // 3.3 List backup snapshots
    const snapshotsRes = await fetch(`${baseUrl}/api/super/backup/snapshots`, {
      headers: headersSuper,
    });
    const snapshotsJson = await snapshotsRes.json();
    const foundBackup = Array.isArray(snapshotsJson) ? snapshotsJson.find((s: any) => s.name === backupFileName) : null;
    assert(snapshotsRes.status === 200 && !!foundBackup && foundBackup.bytes > 0 && typeof foundBackup.size === "string", "3.3 GET /api/super/backup/snapshots lists real files with formatted byte sizes");

    // 3.4 Directory traversal attack protection on download
    const traversalDownloadRes = await fetch(`${baseUrl}/api/super/backup/download/..%2F..%2F..%2Fetc%2Fpasswd`, {
      headers: headersSuper,
    });
    assert(traversalDownloadRes.status === 400, "3.4 Directory traversal on backup download is blocked (400 Bad Request)");

    // 3.5 Directory traversal attack protection on delete
    const traversalDeleteRes = await fetch(`${baseUrl}/api/super/backup/..%2F..%2F..%2Fetc%2Fpasswd`, {
      method: "DELETE",
      headers: headersSuper,
    });
    assert(traversalDeleteRes.status === 400, "3.5 Directory traversal on backup delete is blocked (400 Bad Request)");

    // 3.6 Delete backup file safely
    const deleteBackupRes = await fetch(`${baseUrl}/api/super/backup/${encodeURIComponent(backupFileName)}`, {
      method: "DELETE",
      headers: headersSuper,
    });
    assert(deleteBackupRes.status === 200, "3.6 DELETE /api/super/backup/:filename cleans up backup archive safely");

    // =========================================================================
    // SECTION 4: P03 — MULTILINGUAL PHRASE EDITOR
    // =========================================================================
    console.log("\n▶ [Section 4: P03] Testing Multilingual Phrase Editor & Persistence...");

    // 4.1 Fetch languages registry
    const langListRes = await fetch(`${baseUrl}/api/super/languages`, {
      headers: headersSuper,
    });
    const langListJson = await langListRes.json();
    assert(langListRes.status === 200 && Array.isArray(langListJson) && langListJson.some((l: any) => l.code === "en"), "4.1 GET /api/super/languages returns registered language packs (including 'en')");

    // 4.2 Fetch English dictionary phrases
    const enDictRes = await fetch(`${baseUrl}/api/super/languages/en`, {
      headers: headersSuper,
    });
    const enDictJson = await enDictRes.json();
    assert(enDictRes.status === 200 && typeof enDictJson.phrases === "object" && !!enDictJson.phrases["Dashboard"], "4.2 GET /api/super/languages/en returns phrase dictionary");

    // 4.3 Update phrases in English dictionary
    const updatedPhrases = {
      ...enDictJson.phrases,
      "test.wave2.phrase": "Wave 2 Super Admin Parity Verified",
    };
    const updateLangRes = await fetch(`${baseUrl}/api/super/languages/en`, {
      method: "PUT",
      headers: headersSuper,
      body: JSON.stringify({ phrases: updatedPhrases }),
    });
    const updateLangJson = await updateLangRes.json();
    assert(updateLangRes.status === 200 && updateLangJson.success, "4.3 PUT /api/super/languages/en persists updated phrases to cmsPage");

    // 4.4 Verify persistence
    const verifyLangRes = await fetch(`${baseUrl}/api/super/languages/en`, {
      headers: headersSuper,
    });
    const verifyLangJson = await verifyLangRes.json();
    assert(verifyLangJson.phrases?.["test.wave2.phrase"] === "Wave 2 Super Admin Parity Verified", "4.4 Updated phrase persists across requests in database");

    // 4.5 Register a new language pack
    const newLangCode = `it`;
    const createLangRes = await fetch(`${baseUrl}/api/super/languages`, {
      method: "POST",
      headers: headersSuper,
      body: JSON.stringify({
        code: newLangCode,
        name: "Italiano",
        countryCode: "IT",
      }),
    });
    assert(createLangRes.status === 201, "4.5 POST /api/super/languages creates new language pack");

    // 4.6 Toggle language status
    const toggleLangRes = await fetch(`${baseUrl}/api/super/languages/${newLangCode}/toggle`, {
      method: "PATCH",
      headers: headersSuper,
    });
    assert(toggleLangRes.status === 200, "4.6 PATCH /api/super/languages/:code/toggle toggles active state");

    // 4.7 Delete custom language pack
    const deleteLangRes = await fetch(`${baseUrl}/api/super/languages/${newLangCode}`, {
      method: "DELETE",
      headers: headersSuper,
    });
    assert(deleteLangRes.status === 200, "4.7 DELETE /api/super/languages/:code removes custom language pack");

    // =========================================================================
    // SECTION 5: P10 — CMS FAQS MANAGEMENT
    // =========================================================================
    console.log("\n▶ [Section 5: P10] Testing CMS FAQs Management...");

    // 5.1 List FAQs
    const faqsRes = await fetch(`${baseUrl}/api/cms/faqs`);
    const faqsJson = await faqsRes.json();
    assert(faqsRes.status === 200 && Array.isArray(faqsJson), "5.1 GET /api/cms/faqs returns FAQ list");

    // 5.2 Create new FAQ
    const createFaqRes = await fetch(`${baseUrl}/api/cms/faqs`, {
      method: "POST",
      headers: headersSuper,
      body: JSON.stringify({
        question: "How does multi-tenant isolation work in Master HRMS?",
        answer: "Every tenant is strictly isolated by tenant_id across MySQL, Prisma query layers, and web sockets.",
        category: "Security",
        isActive: true,
      }),
    });
    const createFaqJson = await createFaqRes.json();
    assert(createFaqRes.status === 201 && !!createFaqJson?.id, "5.2 POST /api/cms/faqs creates new FAQ entry");
    createdFaqId = createFaqJson?.id || "";

    // 5.3 Update FAQ
    const updateFaqRes = await fetch(`${baseUrl}/api/cms/faqs/${createdFaqId}`, {
      method: "PUT",
      headers: headersSuper,
      body: JSON.stringify({
        question: "How does multi-tenant isolation work in Master HRMS? (Updated)",
        answer: "Updated answer text with verified security proof.",
        category: "Architecture",
        isActive: true,
      }),
    });
    const updateFaqJson = await updateFaqRes.json();
    assert(updateFaqRes.status === 200 && updateFaqJson?.category === "Architecture", "5.3 PUT /api/cms/faqs/:id updates FAQ attributes");

    // 5.4 Reorder FAQs
    const reorderFaqRes = await fetch(`${baseUrl}/api/cms/faqs/reorder`, {
      method: "PATCH",
      headers: headersSuper,
      body: JSON.stringify({ orderedIds: [createdFaqId] }),
    });
    assert(reorderFaqRes.status === 200, "5.4 PATCH /api/cms/faqs/reorder reorders FAQ sequence");

    // 5.5 Delete FAQ
    const deleteFaqRes = await fetch(`${baseUrl}/api/cms/faqs/${createdFaqId}`, {
      method: "DELETE",
      headers: headersSuper,
    });
    assert(deleteFaqRes.status === 200, "5.5 DELETE /api/cms/faqs/:id removes FAQ entry");

    // =========================================================================
    // SECTION 6: P11 — CMS TESTIMONIALS MANAGEMENT
    // =========================================================================
    console.log("\n▶ [Section 6: P11] Testing CMS Testimonials Management...");

    // 6.1 List Testimonials
    const testListRes = await fetch(`${baseUrl}/api/cms/testimonials`);
    const testListJson = await testListRes.json();
    assert(testListRes.status === 200 && Array.isArray(testListJson), "6.1 GET /api/cms/testimonials returns testimonials list");

    // 6.2 Create Testimonial
    const createTestRes = await fetch(`${baseUrl}/api/cms/testimonials`, {
      method: "POST",
      headers: headersSuper,
      body: JSON.stringify({
        name: "Alexander Wright",
        role: "Chief Technology Officer",
        company: "Vanguard Enterprise Solutions",
        rating: 5,
        content: "The Wave 2 Super Admin architecture and CMS extensions deliver unparalleled speed and security.",
        isActive: true,
      }),
    });
    const createTestJson = await createTestRes.json();
    assert(createTestRes.status === 201 && !!createTestJson?.id, "6.2 POST /api/cms/testimonials creates new testimonial");
    createdTestimonialId = createTestJson?.id || "";

    // 6.3 Update Testimonial
    const updateTestRes = await fetch(`${baseUrl}/api/cms/testimonials/${createdTestimonialId}`, {
      method: "PUT",
      headers: headersSuper,
      body: JSON.stringify({
        name: "Alexander Wright",
        role: "Chief Technology Officer",
        company: "Vanguard Global Group",
        rating: 5,
        content: "Verified 5-star customer review.",
        isActive: true,
      }),
    });
    const updateTestJson = await updateTestRes.json();
    assert(updateTestRes.status === 200 && updateTestJson?.company === "Vanguard Global Group", "6.3 PUT /api/cms/testimonials/:id updates customer testimonial");

    // 6.4 Reorder Testimonials
    const reorderTestRes = await fetch(`${baseUrl}/api/cms/testimonials/reorder`, {
      method: "PATCH",
      headers: headersSuper,
      body: JSON.stringify({ orderedIds: [createdTestimonialId] }),
    });
    assert(reorderTestRes.status === 200, "6.4 PATCH /api/cms/testimonials/reorder reorders testimonial sequence");

    // 6.5 Delete Testimonial
    const deleteTestRes = await fetch(`${baseUrl}/api/cms/testimonials/${createdTestimonialId}`, {
      method: "DELETE",
      headers: headersSuper,
    });
    assert(deleteTestRes.status === 200, "6.5 DELETE /api/cms/testimonials/:id removes testimonial entry");

  } catch (error) {
    console.error("💥 Unhandled Exception in Wave 2 Test Suite:", error);
  } finally {
    console.log("\n▶ [Teardown] Cleaning up test records in MySQL...");
    try {
      if (testLoginHistoryId) {
        await prisma.loginHistory.deleteMany({ where: { id: testLoginHistoryId } });
      }
      await prisma.loginHistory.deleteMany({ where: { userId: { in: [superAdminId, regularUserId, targetUserId] } } });
      await prisma.userRole.deleteMany({ where: { userId: { in: [superAdminId, regularUserId, targetUserId] } } });
      await prisma.profile.deleteMany({ where: { userId: { in: [superAdminId, regularUserId, targetUserId] } } });
      await prisma.user.deleteMany({ where: { id: { in: [superAdminId, regularUserId, targetUserId] } } });
    } catch (e: any) {
      console.warn("Teardown warning:", e.message);
    }

    await new Promise<void>((resolve) => server.close(() => resolve()));
    console.log("\n================================================================================");
    console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} PASSED (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
    console.log("================================================================================\n");

    if (passedTests !== totalTests) {
      process.exit(1);
    }
  }
}

runWave2TestSuite().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
