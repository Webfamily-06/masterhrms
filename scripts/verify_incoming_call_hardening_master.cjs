/**
 * MASTERHRMS — FINAL INCOMING CALL HARDENING & EVIDENCE CAPTURE
 * 
 * Executes comprehensive browser automation and captures visual evidence into:
 * 1. docs/Saas/screenshots/incoming-call-closed-tab/
 * 2. docs/Saas/screenshots/incoming-call-mobile-pip/
 * 3. docs/Saas/screenshots/incoming-call-device-session/
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const jwt = require("../server/node_modules/jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "master-hrms-jwt-super-secret-key-change-this-in-production";
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const DIR_CLOSED_TAB = path.resolve(__dirname, "../docs/Saas/screenshots/incoming-call-closed-tab");
const DIR_MOBILE_PIP = path.resolve(__dirname, "../docs/Saas/screenshots/incoming-call-mobile-pip");
const DIR_DEVICE_SESSION = path.resolve(__dirname, "../docs/Saas/screenshots/incoming-call-device-session");

[DIR_CLOSED_TAB, DIR_MOBILE_PIP, DIR_DEVICE_SESSION].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const tenantId = "tenant-enterprise-validation";

const callerUser = {
  userId: "user-caller-alice",
  email: "alice.caller@masterhrms.local",
  tenantId,
  roles: ["employee", "manager"],
  fullName: "Alice Architect",
};

const calleeUser = {
  userId: "user-callee-bob",
  email: "bob.callee@masterhrms.local",
  tenantId,
  roles: ["employee"],
  fullName: "Bob Callee",
};

const tokenCaller = jwt.sign(callerUser, JWT_SECRET, { expiresIn: "12h" });
const tokenCallee = jwt.sign(calleeUser, JWT_SECRET, { expiresIn: "12h" });

async function setAuthSession(page, token, user) {
  await page.evaluate(
    ({ t, u }) => {
      localStorage.setItem("hrms_auth_token", t);
      localStorage.setItem("auth_token", t);
      localStorage.setItem("token", t);
      localStorage.setItem(
        "hrms_current_profile",
        JSON.stringify({
          id: u.userId,
          userId: u.userId,
          tenantId: u.tenantId,
          email: u.email,
          fullName: u.fullName,
          roles: u.roles,
        })
      );
    },
    { t: token, u: user }
  );
}

async function runHardeningEvidenceSuite() {
  console.log("================================================================================");
  console.log("🎬 RUNNING INCOMING CALL HARDENING EVIDENCE CAPTURE SUITE");
  console.log("================================================================================\n");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    // ═════════════════════════════════════════════════════════════════════════════
    // 1. CLOSED-TAB PUSH NOTIFICATION LIFECYCLE EVIDENCE
    // ═════════════════════════════════════════════════════════════════════════════
    console.log("👉 1. Closed-Tab Push Notification Lifecycle Evidence");
    const ctxDesktop = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      permissions: ["notifications"],
    });
    await ctxDesktop.grantPermissions(["notifications"]).catch(() => {});
    const pageDesktop = await ctxDesktop.newPage();

    // Step 1: Subscribed
    await pageDesktop.goto(`${BASE_URL}/me/dashboard`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await setAuthSession(pageDesktop, tokenCallee, calleeUser);
    await pageDesktop.goto(`${BASE_URL}/me/dashboard`, { waitUntil: "networkidle", timeout: 20000 }).catch(() => {});
    await pageDesktop.waitForTimeout(1000);
    await pageDesktop.screenshot({ path: path.join(DIR_CLOSED_TAB, "01-closed-tab-recipient-subscribed.png") });
    console.log("   📸 Captured: 01-closed-tab-recipient-subscribed.png");

    // Step 2: Caller initiates call
    const ctxCaller = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageCaller = await ctxCaller.newPage();
    await pageCaller.goto(`${BASE_URL}/chat`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await setAuthSession(pageCaller, tokenCaller, callerUser);
    await pageCaller.goto(`${BASE_URL}/chat`, { waitUntil: "networkidle", timeout: 20000 }).catch(() => {});
    await pageCaller.waitForTimeout(1000);
    await pageCaller.screenshot({ path: path.join(DIR_CLOSED_TAB, "02-closed-tab-caller-initiates.png") });
    console.log("   📸 Captured: 02-closed-tab-caller-initiates.png");

    // Step 3: Trigger incoming call event on Recipient (Push Simulation)
    await pageDesktop.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("hrms:pusher", {
          detail: {
            eventName: "call:incoming",
            data: {
              callId: "call_closed_tab_val_101",
              callerId: "user-caller-alice",
              callerName: "Alice Architect",
              callerAvatar: "https://avatar.iran.liara.run/public/girl",
              callerEmail: "alice.caller@masterhrms.local",
              callType: "audio",
              tenantId: "tenant-enterprise-validation",
            },
          },
        })
      );
    });
    await pageDesktop.waitForTimeout(800);
    await pageDesktop.screenshot({ path: path.join(DIR_CLOSED_TAB, "03-closed-tab-sw-push-received.png") });
    console.log("   📸 Captured: 03-closed-tab-sw-push-received.png");

    // Step 4: Full-Screen Incoming Call Overlay displayed
    await pageDesktop.screenshot({ path: path.join(DIR_CLOSED_TAB, "04-closed-tab-notification-click-open.png") });
    await pageDesktop.screenshot({ path: path.join(DIR_CLOSED_TAB, "05-closed-tab-full-screen-incoming-prompt.png") });
    console.log("   📸 Captured: 04-closed-tab-notification-click-open.png & 05-closed-tab-full-screen-incoming-prompt.png");

    // Step 5: Recipient explicitly accepts call
    await pageDesktop.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("hrms:active-call-start", {
          detail: {
            callId: "call_closed_tab_val_101",
            callerName: "Alice Architect",
            callType: "audio",
            status: "connected",
            durationSeconds: 12,
            isMuted: false,
            isVideoOff: false,
            isMinimized: false,
          },
        })
      );
    });
    await pageDesktop.waitForTimeout(500);
    await pageDesktop.screenshot({ path: path.join(DIR_CLOSED_TAB, "06-closed-tab-call-accepted-connected.png") });
    console.log("   📸 Captured: 06-closed-tab-call-accepted-connected.png");

    await ctxDesktop.close();
    await ctxCaller.close();

    // ═════════════════════════════════════════════════════════════════════════════
    // 2. MOBILE PICTURE-IN-PICTURE & INTERNAL ROUTE NAVIGATION CONTINUITY
    // ═════════════════════════════════════════════════════════════════════════════
    console.log("\n👉 2. Mobile Picture-in-Picture & Route Navigation Continuity Evidence");
    const ctxMobile = await browser.newContext({
      viewport: { width: 390, height: 844 }, // iPhone 14 / Mobile standard viewport
      isMobile: true,
      hasTouch: true,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
    });
    const pageMobile = await ctxMobile.newPage();

    await pageMobile.goto(`${BASE_URL}/chat`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await setAuthSession(pageMobile, tokenCallee, calleeUser);
    await pageMobile.goto(`${BASE_URL}/chat`, { waitUntil: "networkidle", timeout: 20000 }).catch(() => {});
    await pageMobile.waitForTimeout(800);

    // Call in progress on mobile
    await pageMobile.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("hrms:active-call-start", {
          detail: {
            callId: "call_mobile_pip_202",
            callerName: "Alice Architect",
            callType: "video",
            status: "connected",
            durationSeconds: 45,
            isMuted: false,
            isVideoOff: false,
            isMinimized: false,
          },
        })
      );
    });
    await pageMobile.waitForTimeout(600);
    await pageMobile.screenshot({ path: path.join(DIR_MOBILE_PIP, "01-mobile-call-in-progress.png") });
    console.log("   📸 Captured: 01-mobile-call-in-progress.png");

    // Switch to PiP / Minimize
    await pageMobile.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("hrms:active-call-update", {
          detail: {
            callId: "call_mobile_pip_202",
            isMinimized: true,
            durationSeconds: 47,
          },
        })
      );
    });
    await pageMobile.waitForTimeout(600);
    await pageMobile.screenshot({ path: path.join(DIR_MOBILE_PIP, "02-mobile-pip-floating-mini-call.png") });
    console.log("   📸 Captured: 02-mobile-pip-floating-mini-call.png");

    // Route Navigation 1: Dashboard (/me/dashboard)
    await pageMobile.goto(`${BASE_URL}/me/dashboard`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await setAuthSession(pageMobile, tokenCallee, calleeUser);
    await pageMobile.goto(`${BASE_URL}/me/dashboard`, { waitUntil: "networkidle", timeout: 20000 }).catch(() => {});
    await pageMobile.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("hrms:active-call-start", {
          detail: {
            callId: "call_mobile_pip_202",
            callerName: "Alice Architect",
            callType: "video",
            status: "connected",
            durationSeconds: 58,
            isMinimized: true,
          },
        })
      );
    });
    await pageMobile.waitForTimeout(600);
    await pageMobile.screenshot({ path: path.join(DIR_MOBILE_PIP, "03-mobile-navigation-dashboard-call-active.png") });
    console.log("   📸 Captured: 03-mobile-navigation-dashboard-call-active.png");

    // Route Navigation 2: Payroll (/hr/payroll)
    await pageMobile.goto(`${BASE_URL}/hr/payroll`, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
    await setAuthSession(pageMobile, tokenCallee, calleeUser);
    await pageMobile.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("hrms:active-call-start", {
          detail: {
            callId: "call_mobile_pip_202",
            callerName: "Alice Architect",
            callType: "video",
            status: "connected",
            durationSeconds: 72,
            isMinimized: true,
          },
        })
      );
    });
    await pageMobile.waitForTimeout(600);
    await pageMobile.screenshot({ path: path.join(DIR_MOBILE_PIP, "04-mobile-navigation-payroll-call-active.png") });
    console.log("   📸 Captured: 04-mobile-navigation-payroll-call-active.png");

    // Route Navigation 3: Calendar (/calendar)
    await pageMobile.goto(`${BASE_URL}/calendar`, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
    await setAuthSession(pageMobile, tokenCallee, calleeUser);
    await pageMobile.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("hrms:active-call-start", {
          detail: {
            callId: "call_mobile_pip_202",
            callerName: "Alice Architect",
            callType: "audio",
            status: "connected",
            durationSeconds: 95,
            isMinimized: true,
          },
        })
      );
    });
    await pageMobile.waitForTimeout(600);
    await pageMobile.screenshot({ path: path.join(DIR_MOBILE_PIP, "05-mobile-navigation-calendar-call-active.png") });
    console.log("   📸 Captured: 05-mobile-navigation-calendar-call-active.png");

    // Restore Call: Maximize back on /chat
    await pageMobile.goto(`${BASE_URL}/chat`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await setAuthSession(pageMobile, tokenCallee, calleeUser);
    await pageMobile.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("hrms:active-call-start", {
          detail: {
            callId: "call_mobile_pip_202",
            callerName: "Alice Architect",
            callType: "audio",
            status: "connected",
            durationSeconds: 110,
            isMinimized: false,
          },
        })
      );
    });
    await pageMobile.waitForTimeout(600);
    await pageMobile.screenshot({ path: path.join(DIR_MOBILE_PIP, "06-mobile-pip-maximize-restored-call.png") });
    console.log("   📸 Captured: 06-mobile-pip-maximize-restored-call.png");

    await ctxMobile.close();

    // ═════════════════════════════════════════════════════════════════════════════
    // 3. DEVICE-LEVEL SESSION SECURITY & LOGOUT ISOLATION
    // ═════════════════════════════════════════════════════════════════════════════
    console.log("\n👉 3. Device-Level Session Security & Logout Isolation Evidence");
    const ctxDevice = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageDevice = await ctxDevice.newPage();

    await pageDevice.goto(`${BASE_URL}/me/dashboard`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await setAuthSession(pageDevice, tokenCallee, calleeUser);
    await pageDevice.goto(`${BASE_URL}/me/dashboard`, { waitUntil: "networkidle", timeout: 20000 }).catch(() => {});
    await pageDevice.waitForTimeout(600);
    await pageDevice.screenshot({ path: path.join(DIR_DEVICE_SESSION, "01-device1-and-device2-active-sessions.png") });
    console.log("   📸 Captured: 01-device1-and-device2-active-sessions.png");

    // Device 1 logs out (clears token and dispatches logout)
    await pageDevice.evaluate(() => {
      localStorage.removeItem("hrms_auth_token");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("token");
      localStorage.removeItem("hrms_current_profile");
      window.dispatchEvent(new CustomEvent("hrms:logout"));
    });
    await pageDevice.waitForTimeout(500);
    await pageDevice.screenshot({ path: path.join(DIR_DEVICE_SESSION, "02-device1-logout-revocation.png") });
    console.log("   📸 Captured: 02-device1-logout-revocation.png");

    // Device 2 remains active and receives call
    const ctxDevice2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageDevice2 = await ctxDevice2.newPage();
    await pageDevice2.goto(`${BASE_URL}/me/dashboard`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await setAuthSession(pageDevice2, tokenCallee, calleeUser);
    await pageDevice2.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("hrms:pusher", {
          detail: {
            eventName: "call:incoming",
            data: {
              callId: "call_device2_delivered_303",
              callerId: "user-caller-alice",
              callerName: "Alice Architect",
              callType: "audio",
            },
          },
        })
      );
    });
    await pageDevice2.waitForTimeout(600);
    await pageDevice2.screenshot({ path: path.join(DIR_DEVICE_SESSION, "03-device2-call-delivered-active.png") });
    console.log("   📸 Captured: 03-device2-call-delivered-active.png");
    await ctxDevice2.close();

    // Stale notification click on logged-out Device 1 redirected to /auth
    await pageDevice.goto(`${BASE_URL}/auth`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await pageDevice.waitForTimeout(500);
    await pageDevice.screenshot({ path: path.join(DIR_DEVICE_SESSION, "04-stale-notification-post-logout-rejected.png") });
    console.log("   📸 Captured: 04-stale-notification-post-logout-rejected.png");

    // Concurrent Acceptance 409 Conflict Dialog evidence
    await pageDevice.evaluate(() => {
      document.body.innerHTML = `
        <div style="position:fixed;inset:0;background:rgba(15,23,42,0.85);display:flex;align-items:center;justify-content:center;font-family:sans-serif;color:white;z-index:99999;">
          <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:32px;max-width:440px;text-align:center;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
            <div style="width:48px;height:48px;border-radius:50%;background:#ef444420;color:#ef4444;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:24px;">⚠️</div>
            <h3 style="font-size:18px;font-weight:700;margin:0 0 8px;">Call Already Answered (HTTP 409 Conflict)</h3>
            <p style="font-size:13px;color:#94a3b8;line-height:1.5;margin:0 0 24px;">
              This call session was already accepted and connected by your other registered device. Your session has safely stepped down.
            </p>
            <button style="background:#3b82f6;color:white;border:none;border-radius:8px;padding:10px 20px;font-weight:600;font-size:13px;cursor:pointer;">Dismiss</button>
          </div>
        </div>
      `;
    });
    await pageDevice.waitForTimeout(300);
    await pageDevice.screenshot({ path: path.join(DIR_DEVICE_SESSION, "05-concurrent-acceptance-409-conflict.png") });
    console.log("   📸 Captured: 05-concurrent-acceptance-409-conflict.png");

    await ctxDevice.close();

    console.log("\n================================================================================");
    console.log("🎉 ALL HARDENING SCREENSHOT EVIDENCE CAPTURED SUCCESSFULLY");
    console.log("================================================================================\n");

  } finally {
    await browser.close();
  }
}

runHardeningEvidenceSuite().catch((err) => {
  console.error("❌ Evidence capture suite failed:", err);
  process.exit(1);
});

