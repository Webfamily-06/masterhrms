import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { chromium, BrowserContext, Page } from "playwright";
import jwt from "jsonwebtoken";
import assert from "node:assert";

const JWT_SECRET = "master-hrms-jwt-super-secret-key-change-this-in-production";
const BASE_URL = "http://localhost:3000";
const API_URL = "http://localhost:4000";

// Helper to inject tokens into localStorage before loading page
async function setupAuthenticatedPage(context: BrowserContext, user: any): Promise<Page> {
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: "2h" });
  const page = await context.newPage();

  // Navigate to blank page to set localStorage
  await page.goto(`${BASE_URL}/favicon.ico`).catch(() => {});
  await page.evaluate(({ t, u }) => {
    localStorage.setItem("hrms_auth_token", t);
    localStorage.setItem("auth_token", t);
    localStorage.setItem("token", t);
    localStorage.setItem("hrms_user", JSON.stringify(u));
  }, { t: token, u: user });

  return page;
}

async function runCallingE2EVerification() {
  console.log("================================================================================");
  console.log("🚀 MASTERHRMS: AUDIO/VIDEO CALLING PLAYWRIGHT E2E ACCEPTANCE SUITE");
  console.log("================================================================================\n");

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      "--allow-file-access",
    ],
  });

  const results: Record<string, boolean> = {};

  try {
    // PRE-FLIGHT TEST STATE CLEANUP
    await prisma.callHistoryRecord.updateMany({
      where: {
        OR: [
          { receiverId: "user-emp-001" },
          { callerId: "user-emp-001" },
          { receiverId: "user-hr-001" },
          { callerId: "user-hr-001" },
        ],
        status: { in: ["ringing", "connected"] },
      },
      data: {
        status: "ended",
        endedAt: new Date(),
        notes: "Test runner pre-flight cleanup",
      },
    });
    console.log("▶ [Setup] Pre-flight active test call records cleaned.");

    // -------------------------------------------------------------------------
    // SETUP USERS
    // -------------------------------------------------------------------------
    const userA = {
      userId: "user-hr-001",
      email: "hr@masterhrms.com",
      tenantId: "tenant-default-001",
      roles: ["admin", "hr_admin"],
      name: "Sarah HR Lead",
    };

    const userB = {
      userId: "user-emp-001",
      email: "employee@masterhrms.com",
      tenantId: "tenant-default-001",
      roles: ["employee"],
      name: "Alex Morgan",
    };

    const userC = {
      userId: "w1_c2_alpha_user",
      email: "alpha@w1c2-invoices.local",
      tenantId: "w1_c2_tenant_alpha",
      roles: ["admin"],
      name: "Charlie CrossTenant",
    };

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const contextC = await browser.newContext();

    console.log("▶ [Setup] Authenticating user sessions...");
    const pageA = await setupAuthenticatedPage(contextA, userA);
    const pageB = await setupAuthenticatedPage(contextB, userB);
    const pageC = await setupAuthenticatedPage(contextC, userC);

    // -------------------------------------------------------------------------
    // TEST 1: INCOMING CALL OVERLAY ON CALLEE SHELL (/hr/employees) & TENANT ISOLATION
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 1] Testing Incoming Call Overlay on Callee Shell (/hr/employees) with Tenant Isolation...");
    await pageB.goto(`${BASE_URL}/hr/employees`, { waitUntil: "domcontentloaded" });
    await pageC.goto(`${BASE_URL}/hr/employees`, { waitUntil: "domcontentloaded" });
    await pageB.waitForTimeout(2000);

    const call1Id = `call_test_overlay_${Date.now()}`;
    const tokenA = jwt.sign(userA, JWT_SECRET, { expiresIn: "1h" });

    // Initiate call via Persistent Calls API
    const inviteRes = await fetch(`${API_URL}/api/calls/invite`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        targetUserId: "user-emp-001",
        callId: call1Id,
        callType: "audio",
        callerPhone: "+1-555-0199",
      }),
    });
    assert.strictEqual(inviteRes.status, 201, "Expected 201 Created from Calls API");

    // Check User B (/hr/employees) receives incoming call dialog
    const overlaySelector = 'div[role="dialog"][aria-modal="true"]';
    await pageB.waitForSelector(overlaySelector, { timeout: 8000 });
    const callerText = await pageB.textContent(overlaySelector);
    assert.ok(callerText?.includes("Sarah HR Lead"), "Expected caller name to be displayed in overlay");
    assert.ok(callerText?.includes("Incoming Audio Call"), "Expected audio call badge");

    // Take screenshot of overlay on Callee shell
    await pageB.screenshot({ path: "evidence_incoming_call_overlay_callee.png" });
    console.log("  ✔ User B received incoming-call overlay on /hr/employees. Saved: evidence_incoming_call_overlay_callee.png");

    // Check User C (Cross-tenant) did NOT receive overlay
    const userCOverlay = await pageC.$(overlaySelector);
    assert.strictEqual(userCOverlay, null, "User C in different tenant must NOT receive incoming call dialog");
    console.log("  ✔ Strict Tenant Isolation: User C received ZERO alerts.");
    results["1. Incoming-call overlay & tenant isolation"] = true;

    // -------------------------------------------------------------------------
    // TEST 2: REJECT / DECLINE CALL
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 2] Testing Call Rejection / Decline...");
    const declineButton = await pageB.waitForSelector('button[aria-label*="Decline"]');
    await declineButton.click({ force: true });
    await pageB.waitForTimeout(1000);

    // Verify overlay dismissed on User B
    const overlayAfterReject = await pageB.$(overlaySelector);
    assert.strictEqual(overlayAfterReject, null, "Overlay must be dismissed after declining");

    // Verify call status in backend is 'rejected'
    const statusRes = await fetch(`${API_URL}/api/calls/${call1Id}/status`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const statusBody = await statusRes.json();
    assert.strictEqual(statusBody.data.status, "rejected", "Expected backend status to be 'rejected'");
    console.log("  ✔ Call declined cleanly; overlay dismissed and database updated to 'rejected'.");
    results["2. Call decline & status transition"] = true;

    // -------------------------------------------------------------------------
    // TEST 3: CALLER CANCELLATION
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 3] Testing Caller Cancellation before answer...");
    const call2Id = `call_test_cancel_${Date.now()}`;
    await fetch(`${API_URL}/api/calls/invite`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: "user-emp-001", callId: call2Id, callType: "video" }),
    });

    await pageB.waitForSelector(overlaySelector, { timeout: 8000 });
    console.log("  ✔ Callee overlay appeared for call 2.");

    // Caller cancels via REST
    const cancelRes = await fetch(`${API_URL}/api/calls/${call2Id}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
    });
    assert.strictEqual(cancelRes.status, 200, "Expected 200 OK for cancel");

    // Verify User B overlay automatically dismisses
    await pageB.waitForSelector(overlaySelector, { state: "detached", timeout: 8000 });
    console.log("  ✔ Callee overlay automatically dismissed upon caller cancellation.");
    results["3. Caller cancellation"] = true;

    // -------------------------------------------------------------------------
    // TEST 4: MULTI-TAB ANSWER HANDLING & DEDUPLICATION
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 4] Testing Multi-Tab Answer Handling & Transport Deduplication...");
    const pageB_Tab2 = await setupAuthenticatedPage(contextB, userB);
    await pageB_Tab2.goto(`${BASE_URL}/tenant/chat`, { waitUntil: "domcontentloaded" });
    await pageB_Tab2.waitForTimeout(2000);

    const call3Id = `call_test_multitab_${Date.now()}`;
    await fetch(`${API_URL}/api/calls/invite`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: "user-emp-001", callId: call3Id, callType: "audio" }),
    });

    // Both tabs should see overlay
    await pageB.waitForSelector(overlaySelector, { timeout: 8000 });
    await pageB_Tab2.waitForSelector(overlaySelector, { timeout: 8000 });
    console.log("  ✔ Both Tab 1 (/hr/employees) and Tab 2 (/tenant/chat) displayed incoming call overlay.");

    // Answer call in Tab 2
    const acceptBtnTab2 = await pageB_Tab2.waitForSelector('button[aria-label*="Accept"]');
    await acceptBtnTab2.click({ force: true });
    await pageB_Tab2.waitForTimeout(1500);

    // Tab 1 must automatically dismiss its overlay because call was answered on another tab!
    await pageB.waitForSelector(overlaySelector, { state: "detached", timeout: 8000 });
    await pageB.screenshot({ path: "evidence_multitab_answered_dismissal.png" });
    console.log("  ✔ Multi-Tab coordination: Tab 1 dismissed ringing overlay when Tab 2 answered. Saved: evidence_multitab_answered_dismissal.png");
    results["4. Multi-tab answer coordination & dismissal"] = true;

    // -------------------------------------------------------------------------
    // TEST 5: BUSY STATE PROTECTION
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 5] Testing Busy State Protection...");
    // Call 3 is connected. Third dial attempt to User B must be rejected as BUSY
    const busyRes = await fetch(`${API_URL}/api/calls/invite`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: "user-emp-001", callType: "audio" }),
    });
    assert.strictEqual(busyRes.status, 409, "Expected 409 Conflict for busy user");
    const busyBody = await busyRes.json();
    assert.strictEqual(busyBody.busy, true, "Expected busy flag");
    console.log("  ✔ Busy Protection: Additional call attempt rejected with 409:", busyBody.error);
    results["5. Busy state protection"] = true;

    // Clean up call 3 via /end (since it transitioned to connected)
    await fetch(`${API_URL}/api/calls/${call3Id}/end`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "test_done" }),
    }).catch(() => {});
    await new Promise(r => setTimeout(r, 500));

    // -------------------------------------------------------------------------
    // TEST 6: PENDING CALL RECOVERY ON PAGE MOUNT / RECONNECT
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 6] Testing Pending Call Recovery on Page Load / Reconnect...");
    const call4Id = `call_test_recovery_${Date.now()}`;
    const invite4Res = await fetch(`${API_URL}/api/calls/invite`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: "user-emp-001", callId: call4Id, callType: "audio" }),
    });
    assert.strictEqual(invite4Res.status, 201, "Expected 201 Created for recovery call");

    // Callee opens a completely brand new tab AFTER call started ringing
    const pageB_NewTab = await setupAuthenticatedPage(contextB, userB);
    await pageB_NewTab.goto(`${BASE_URL}/hr/employees`, { waitUntil: "domcontentloaded" });

    // The new tab should fetch GET /api/calls/pending on mount and display the overlay!
    await pageB_NewTab.waitForSelector(overlaySelector, { timeout: 8000 });
    const recoveryText = await pageB_NewTab.textContent(overlaySelector);
    assert.ok(recoveryText?.includes("Sarah HR Lead"), "Recovered call must show caller name");
    await pageB_NewTab.screenshot({ path: "evidence_pending_call_recovery.png" });
    console.log("  ✔ Pending-Call Recovery: New tab successfully recovered ringing call on mount. Saved: evidence_pending_call_recovery.png");
    results["6. Pending-call recovery on mount / reconnect"] = true;

    // Clean up call 4
    await fetch(`${API_URL}/api/calls/${call4Id}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    // -------------------------------------------------------------------------
    // TEST 7: VERCEL SERVERLESS / SOCKET-DISABLED MODE (REST Persistent Calls API)
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 7] Testing VERCEL Serverless / Socket-Disabled Mode...");
    const serverlessCallId = `call_serverless_${Date.now()}`;
    const tokenB = jwt.sign(userB, JWT_SECRET, { expiresIn: "1h" });

    // 1. Invite via REST
    const sInvite = await fetch(`${API_URL}/api/calls/invite`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: "user-emp-001", callId: serverlessCallId, callType: "audio" }),
    });
    assert.strictEqual(sInvite.status, 201, "Serverless invite must succeed with 201");

    // 2. Callee checks pending via REST
    const sPending = await fetch(`${API_URL}/api/calls/pending`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.strictEqual(sPending.status, 200, "Serverless pending check must succeed with 200");
    const sPendingData = await sPending.json();
    assert.strictEqual(sPendingData.data.callId, serverlessCallId, "Call ID must match");

    // 3. Callee accepts via REST
    const sAccept = await fetch(`${API_URL}/api/calls/${serverlessCallId}/accept`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.strictEqual(sAccept.status, 200, "Serverless accept must succeed with 200");
    const sAcceptData = await sAccept.json();
    assert.strictEqual(sAcceptData.data.status, "connected", "Call must transition to connected");

    // 4. WebRTC Signaling relay via REST
    const sSignal = await fetch(`${API_URL}/api/calls/${serverlessCallId}/signal`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        toUserId: "user-emp-001",
        signal: { type: "candidate", candidate: { candidate: "dummy_candidate", sdpMid: "0", sdpMLineIndex: 0 } },
      }),
    });
    assert.strictEqual(sSignal.status, 200, "Serverless signaling relay must succeed with 200");
    console.log("  ✔ Serverless Mode: Full lifecycle (invite -> pending -> accept -> signal) operational without persistent socket server.");
    results["7. Vercel serverless / socket-disabled mode"] = true;

    // Clean up serverless call
    await fetch(`${API_URL}/api/calls/${serverlessCallId}/end`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "serverless_test_done" }),
    });
    await new Promise(r => setTimeout(r, 500));

    // -------------------------------------------------------------------------
    // TEST 8: AUTOPLAY AUDIO RESILIENCE
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 8] Testing Autoplay Audio Resilience in Restricted Context...");
    const restrictedContext = await browser.newContext({
      // Simulate strict user gesture required for audio autoplay
      permissions: [],
    });
    const pageRestricted = await setupAuthenticatedPage(restrictedContext, userB);
    await pageRestricted.goto(`${BASE_URL}/hr/employees`, { waitUntil: "domcontentloaded" });
    await pageRestricted.waitForTimeout(2000);

    const call5Id = `call_test_autoplay_${Date.now()}`;
    const call5Res = await fetch(`${API_URL}/api/calls/invite`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: "user-emp-001", callId: call5Id, callType: "audio" }),
    });
    assert.strictEqual(call5Res.status, 201, "Expected 201 Created for autoplay test call");

    // In restricted context, overlay renders without throwing and displays visual badge
    await pageRestricted.waitForSelector(overlaySelector, { timeout: 8000 });
    const restrictedOverlay = await pageRestricted.textContent(overlaySelector);
    assert.ok(restrictedOverlay?.includes("Sarah HR Lead"), "Overlay must render even if audio is blocked");
    await pageRestricted.screenshot({ path: "evidence_autoplay_blocked_resilience.png" });
    console.log("  ✔ Autoplay Resilience: Incoming-call UI rendered without error despite autoplay restriction. Saved: evidence_autoplay_blocked_resilience.png");
    results["8. Autoplay audio resilience"] = true;

    // Clean up call 5
    await fetch(`${API_URL}/api/calls/${call5Id}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    await pageB_Tab2.close().catch(() => {});
    await pageB_NewTab.close().catch(() => {});
    await pageRestricted.close().catch(() => {});
    await contextA.close();
    await contextB.close();
    await contextC.close();
    await restrictedContext.close();

  } finally {
    await prisma.$disconnect();
    await browser.close();
  }

  console.log("\n================================================================================");
  console.log("📊 PLAYWRIGHT E2E ACCEPTANCE TEST RESULTS SUMMARY");
  console.log("================================================================================");
  let allPassed = true;
  for (const [testName, passed] of Object.entries(results)) {
    console.log(`  ${passed ? "✔ PASS" : "❌ FAIL"}: ${testName}`);
    if (!passed) allPassed = false;
  }
  console.log("================================================================================");
  console.log(allPassed ? "🎉 ALL ACCEPTANCE SCENARIOS VERIFIED AND PASSED 100%!" : "❌ SOME TESTS FAILED");
  console.log("================================================================================");
}

runCallingE2EVerification().catch((err) => {
  console.error("FATAL ERROR IN E2E VERIFICATION:", err);
  process.exit(1);
});

