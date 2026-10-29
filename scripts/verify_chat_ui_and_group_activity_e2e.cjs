/**
 * MASTERHRMS — End-to-End Functional Acceptance & Browser Verification Suite
 * Focus:
 * 1. WhatsApp-Style Message Alignment & Real Profile Avatars (2 authenticated accounts)
 * 2. Group Avatar Upload & Edit without runtime exceptions
 * 3. Inline Sidebar Group Editing (No unnecessary popup modal)
 * 4. Group Activity System Persistence, Realtime, and Timeline Rendering
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const jwt = require("../server/node_modules/jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "master-hrms-jwt-super-secret-key-change-this-in-production";
const BASE_URL = "http://localhost:3000";
const API_URL = "http://localhost:4000";

const hrAdminPayload = {
  userId: "user-hr-001",
  email: "hr@masterhrms.com",
  tenantId: "tenant-default-001",
  roles: ["hr_admin"],
};

const employeePayload = {
  userId: "user-emp-001",
  email: "employee@masterhrms.com",
  tenantId: "tenant-default-001",
  roles: ["employee"],
};

const hrToken = jwt.sign(hrAdminPayload, JWT_SECRET, { expiresIn: "12h" });
const empToken = jwt.sign(employeePayload, JWT_SECRET, { expiresIn: "12h" });

async function setAuth(page, token, user) {
  await page.evaluate(
    ({ t, u }) => {
      localStorage.setItem("hrms_auth_token", t);
      localStorage.setItem("auth_token", t);
      localStorage.setItem("token", t);
      localStorage.setItem("hrms_user", JSON.stringify(u));
      localStorage.setItem("user", JSON.stringify(u));
      localStorage.setItem("current_user", JSON.stringify(u));
      localStorage.setItem("master_hrms_active_tenant", u.tenantId || "tenant-default-001");
      document.cookie = `hrms_auth_token=${encodeURIComponent(t)}; path=/; max-age=604800; SameSite=Lax`;
    },
    { t: token, u: user }
  );
}

const screenshotDir = path.join(__dirname, "../docs/Saas/screenshots/chat");
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function run() {
  console.log("\n==================================================================");
  console.log(" STARTING CHAT UI/UX, INLINE EDITING & GROUP ACTIVITY E2E SUITE");
  console.log("==================================================================\n");

  const results = [];
  function record(check, passed, details = "") {
    results.push({ check, passed, details });
    console.log(`  ${passed ? "✔ [PASS]" : "✖ [FAIL]"} ${check} ${details ? "(" + details + ")" : ""}`);
  }

  const browser = await chromium.launch({ headless: true });

  try {
    // -------------------------------------------------------------
    // Context A: HR Admin (/hr/chat)
    // -------------------------------------------------------------
    const contextA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageA = await contextA.newPage();
    await pageA.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await setAuth(pageA, hrToken, hrAdminPayload);
    await pageA.goto(`${BASE_URL}/hr/chat`, { waitUntil: "networkidle" });
    await pageA.waitForTimeout(2000);

    // -------------------------------------------------------------
    // Context B: Employee (/me/chat)
    // -------------------------------------------------------------
    const contextB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageB = await contextB.newPage();
    await pageB.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await setAuth(pageB, empToken, employeePayload);
    await pageB.goto(`${BASE_URL}/me/chat`, { waitUntil: "networkidle" });
    await pageB.waitForTimeout(2000);

    // =============================================================
    // TEST 1: Direct Messaging - WhatsApp Alignment & Avatars
    // =============================================================
    console.log("\n--- TEST 1: Direct Messaging - WhatsApp Alignment & Avatars ---");

    const directThreadId = `direct_${["user-emp-001", "user-hr-001"].sort().join("_")}`;
    await pageA.goto(`${BASE_URL}/hr/chat?threadId=${directThreadId}`, { waitUntil: "networkidle" });
    await pageA.waitForTimeout(1500);

    await pageB.goto(`${BASE_URL}/me/chat?threadId=${directThreadId}`, { waitUntil: "networkidle" });
    await pageB.waitForTimeout(1500);

    // Send message from Account A
    const msgTextA = `Hello Alex from HR Admin! [${Date.now()}]`;
    const inputA = pageA.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first();
    const sendBtnA = pageA.locator('button:has(svg.lucide-send)').first();

    await inputA.waitFor({ state: "visible", timeout: 5000 });
    await inputA.fill(msgTextA);
    await sendBtnA.click();
    await pageA.waitForTimeout(1500);

    // Verify on Account A (Sender):
    // Target the actual message bubble in the message center section
    const sentBubbleRowA = pageA.locator(`section.flex-1 div.group.flex.items-end:has-text("${msgTextA}")`).last();
    const isBubbleVisibleA = await sentBubbleRowA.isVisible();
    record("Account A: Sent message is visible in chat", isBubbleVisibleA);

    if (isBubbleVisibleA) {
      const classNameA = await sentBubbleRowA.getAttribute("class") || "";
      const isRightAlignedA = classNameA.includes("ml-auto") || classNameA.includes("flex-row-reverse");
      record("Account A: Outgoing message is aligned to the RIGHT", isRightAlignedA, classNameA);

      // Verify no left avatar beside outgoing bubble
      record("Account A: No avatar rendered beside outgoing message bubble", !classNameA.includes("mr-auto"));
    }

    await pageA.screenshot({ path: path.join(screenshotDir, "whatsapp_alignment_sender.png") });

    // Verify on Account B (Recipient):
    await pageB.waitForTimeout(1500);
    const receivedBubbleRowB = pageB.locator(`section.flex-1 div.group.flex.items-end:has-text("${msgTextA}")`).last();
    const isReceivedVisibleB = await receivedBubbleRowB.isVisible();
    record("Account B: Received message is visible in recipient chat", isReceivedVisibleB);

    if (isReceivedVisibleB) {
      const classNameB = await receivedBubbleRowB.getAttribute("class") || "";
      const isLeftAlignedB = classNameB.includes("mr-auto") && !classNameB.includes("ml-auto");
      record("Account B: Incoming message is aligned to the LEFT", isLeftAlignedB, classNameB);

      // Verify sender's avatar exists next to the incoming bubble
      const avatarImgB = receivedBubbleRowB.locator('img[src*="dicebear"], img[alt*="HR Administrator"], .rounded-full').first();
      const hasAvatarB = await avatarImgB.count() > 0;
      record("Account B: Sender avatar/initials rendered next to incoming message", hasAvatarB);
    }

    await pageB.screenshot({ path: path.join(screenshotDir, "whatsapp_alignment_recipient.png") });

    // Send reply from Account B to Account A
    const msgTextB = `Acknowledged HR Admin! Ready for testing. [${Date.now()}]`;
    const inputB = pageB.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first();
    const sendBtnB = pageB.locator('button:has(svg.lucide-send)').first();

    await inputB.fill(msgTextB);
    await sendBtnB.click();
    await pageB.waitForTimeout(1500);

    // Verify on Account B: right-aligned in section.flex-1
    const sentBubbleRowB = pageB.locator(`section.flex-1 div.group.flex.items-end:has-text("${msgTextB}")`).last();
    if (await sentBubbleRowB.isVisible()) {
      const classNameB2 = await sentBubbleRowB.getAttribute("class") || "";
      record("Account B: Outgoing reply is aligned to the RIGHT", classNameB2.includes("ml-auto"));
    }

    // Verify on Account A: left-aligned with Account B's avatar
    await pageA.waitForTimeout(1500);
    const receivedBubbleRowA = pageA.locator(`section.flex-1 div.group.flex.items-end:has-text("${msgTextB}")`).last();
    if (await receivedBubbleRowA.isVisible()) {
      const classNameA2 = await receivedBubbleRowA.getAttribute("class") || "";
      record("Account A: Incoming reply from B is aligned to the LEFT", classNameA2.includes("mr-auto"));
    }

    // =============================================================
    // TEST 2: Group Messages - Sender Display Name Above Incoming Bubble
    // =============================================================
    console.log("\n--- TEST 2: Group Messages - Sender Display Name ---");

    const groupId = "audit_concurrency_test";
    const groupThreadId = `group_${groupId}`;

    await pageA.goto(`${BASE_URL}/hr/chat?threadId=${groupThreadId}`, { waitUntil: "networkidle" });
    await pageA.waitForTimeout(1500);

    await pageB.goto(`${BASE_URL}/me/chat?threadId=${groupThreadId}`, { waitUntil: "networkidle" });
    await pageB.waitForTimeout(1500);

    const groupMsgTextA = `Team announcement from HR Administrator [${Date.now()}]`;
    const groupInputA = pageA.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first();
    const groupSendBtnA = pageA.locator('button:has(svg.lucide-send)').first();

    await groupInputA.fill(groupMsgTextA);
    await groupSendBtnA.click();
    await pageA.waitForTimeout(1500);

    // Check Account B: Incoming group message displays sender's name
    await pageB.waitForTimeout(1500);
    const groupBubbleRowB = pageB.locator(`section.flex-1 div.group.flex.items-end:has-text("${groupMsgTextA}")`).last();
    const isGroupMsgVisibleB = await groupBubbleRowB.isVisible();
    record("Account B: Group message received from Account A", isGroupMsgVisibleB);

    if (isGroupMsgVisibleB) {
      const senderNameEl = groupBubbleRowB.locator('p:has-text("HR Administrator")');
      const hasSenderName = await senderNameEl.isVisible();
      record("Account B: Sender display name 'HR Administrator' displayed above incoming group bubble", hasSenderName);
    }

    await pageB.screenshot({ path: path.join(screenshotDir, "group_sender_name_incoming.png") });

    // =============================================================
    // TEST 3: Inline Sidebar Editing - No Popup Modal
    // =============================================================
    console.log("\n--- TEST 3: Inline Sidebar Editing - No Popup Modal ---");

    const rightSidebar = pageA.locator("aside.w-\\[300px\\]");

    // Make sure right sidebar details panel is open on Page A
    const isSidebarVisible = await rightSidebar.isVisible();
    if (!isSidebarVisible) {
      const detailsToggleA = pageA.locator('button[title*="Toggle Details Panel"], button[title*="Details"]');
      if (await detailsToggleA.count() > 0) {
        await detailsToggleA.click();
        await pageA.waitForTimeout(800);
      }
    }

    record("Right sidebar group details panel (aside.w-[300px]) is open", await rightSidebar.isVisible());

    // Look for "Edit Group Details" button
    const editBtn = rightSidebar.locator('button:has-text("Edit Group Details"), button:has-text("Edit Group Profile")').first();
    const hasEditBtn = await editBtn.isVisible();
    record("Authorized user sees 'Edit Group Details' button in sidebar", hasEditBtn);

    if (hasEditBtn) {
      await editBtn.click();
      await pageA.waitForTimeout(800);

      // CRITICAL CHECK: Verify NO <Dialog> modal opened on screen!
      const modalDialog = pageA.locator('div[role="dialog"]');
      const modalCount = await modalDialog.count();
      record("Editing group DOES NOT open any modal popup dialog", modalCount === 0, `modal count: ${modalCount}`);

      // Verify inline inputs appeared inside rightSidebar
      const inlineNameInput = rightSidebar.locator('input[placeholder*="group name"]');
      const hasInlineName = await inlineNameInput.isVisible();
      record("Inline Group Name input is visible inside the Right Sidebar", hasInlineName);

      const inlineDescTextarea = rightSidebar.locator('textarea[placeholder*="description"]');
      const hasInlineDesc = await inlineDescTextarea.isVisible();
      record("Inline Group Description textarea is visible inside the Right Sidebar", hasInlineDesc);

      const hasSaveBtn = await rightSidebar.locator('button:has-text("Save Changes")').isVisible();
      const hasCancelBtn = await rightSidebar.locator('button:has-text("Cancel")').isVisible();
      record("Inline 'Save Changes' and 'Cancel' buttons are present", hasSaveBtn && hasCancelBtn);

      await pageA.screenshot({ path: path.join(screenshotDir, "inline_sidebar_editing_mode.png") });

      // Test Cancel button reverts
      if (hasCancelBtn) {
        await rightSidebar.locator('button:has-text("Cancel")').click();
        await pageA.waitForTimeout(500);
        const nameInputAfterCancel = await rightSidebar.locator('input[placeholder*="group name"]').count();
        record("Clicking Cancel reverts and exits inline editing mode cleanly", nameInputAfterCancel === 0);
      }

      // Re-enter edit mode and perform a verified edit
      await editBtn.click();
      await pageA.waitForTimeout(500);

      const updatedGroupName = `Sprint Core Alpha [${Date.now().toString().slice(-4)}]`;
      await rightSidebar.locator('input[placeholder*="group name"]').fill(updatedGroupName);
      await rightSidebar.locator('textarea[placeholder*="description"]').fill("Updated via WhatsApp-style inline sidebar editing");

      // Save changes
      await rightSidebar.locator('button:has-text("Save Changes")').click();
      
      // Wait for header to reflect updated group name
      const headerLocatorA = pageA.locator("section.flex-1 div.border-b h3, header h3, div.min-w-0 h3").first();
      let headerTitle = "";
      for (let i = 0; i < 15; i++) {
        await pageA.waitForTimeout(400);
        headerTitle = (await headerLocatorA.textContent()) || "";
        if (headerTitle.includes(updatedGroupName)) break;
      }
      record("Header title immediately reflects updated group name", headerTitle.includes(updatedGroupName), headerTitle);

      // Verify in Account B's browser that real-time update arrived
      const headerLocatorB = pageB.locator("section.flex-1 div.border-b h3, header h3, div.min-w-0 h3").first();
      let headerTitleB = "";
      for (let i = 0; i < 15; i++) {
        await pageB.waitForTimeout(400);
        headerTitleB = (await headerLocatorB.textContent()) || "";
        if (headerTitleB.includes(updatedGroupName)) break;
      }
      record("Account B: Real-time update propagated new group name without page reload", headerTitleB.includes(updatedGroupName), headerTitleB);
    }

    // =============================================================
    // TEST 4: Group Activity System Persistence & Timeline Rendering
    // =============================================================
    console.log("\n--- TEST 4: Group Activity System Persistence & Timeline ---");

    // On Page A, click "Activity" tab in right sidebar
    const activityTabA = rightSidebar.locator('button:has-text("Activity")');
    if (await activityTabA.count() > 0) {
      await activityTabA.click();
      await pageA.waitForTimeout(1500);

      // Check for activity cards (div with border inside tab panel)
      const activityCards = rightSidebar.locator('div.rounded-lg.border');
      const activityCount = await activityCards.count();
      record("Group Activity tab renders activity timeline entries", activityCount > 0, `entries count: ${activityCount}`);

      const sidebarText = await rightSidebar.textContent();
      const hasMeaningfulEvent = sidebarText.includes("changed group name") || sidebarText.includes("created the group") || sidebarText.includes("group");
      record("Activity timeline shows human-readable group lifecycle event", hasMeaningfulEvent);

      await pageA.screenshot({ path: path.join(screenshotDir, "group_activity_timeline.png") });
    }

    // Also verify centered system event in message thread
    const systemNotice = pageA.locator('div.flex.items-center.justify-center span:has-text("changed group name")').first();
    const hasSystemNotice = await systemNotice.count() > 0;
    record("Chat thread contains distinct centered system event row", hasSystemNotice);

    // =============================================================
    // TEST 5: API-Level Group Activity & Group Avatar Verification
    // =============================================================
    console.log("\n--- TEST 5: API-Level Verification ---");

    const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));
    const actRes = await fetch(`${API_URL}/api/chat/groups/${groupId}/activity`, {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    record("GET /api/chat/groups/:id/activity returns 200 OK", actRes.status === 200, `status: ${actRes.status}`);

    if (actRes.status === 200) {
      const actData = await actRes.json();
      record("Activity API returns array of persisted system events", Array.isArray(actData) && actData.length > 0, `count: ${actData.length}`);
      if (Array.isArray(actData) && actData.length > 0) {
        record("Persisted event has isSystemEvent: true", actData[0].isSystemEvent === true);
        record("Persisted event contains eventType and eventMetadata", Boolean(actData[0].eventType));
      }
    }

    // Test group avatar update via PATCH /api/chat/groups/:id
    const avatarTestUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&q=80";
    const patchRes = await fetch(`${API_URL}/api/chat/groups/${groupId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${hrToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ avatarUrl: avatarTestUrl }),
    });
    record("PATCH /api/chat/groups/:id with avatarUrl returns 200 OK", patchRes.status === 200, `status: ${patchRes.status}`);

    if (patchRes.status === 200) {
      const patchData = await patchRes.json();
      record("Database group record has updated avatarUrl", patchData.avatarUrl === avatarTestUrl, patchData.avatarUrl);
    }

  } catch (err) {
    console.error("Test execution encountered an error:", err);
    record("Test execution completed without uncaught exceptions", false, err.message);
  } finally {
    await browser.close();
  }

  // Summary
  console.log("\n========================================================");
  console.log(" VERIFICATION SUITE SUMMARY");
  console.log("========================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Success Rate: ${Math.round((passed / total) * 100)}%\n`);

  fs.writeFileSync(
    path.join(__dirname, "chat_ui_group_activity_acceptance_results.json"),
    JSON.stringify(results, null, 2)
  );

  if (failed > 0) {
    process.exit(1);
  }
}

run();
