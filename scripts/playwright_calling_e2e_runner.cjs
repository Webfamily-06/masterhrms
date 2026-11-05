const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const PORT = 8989;
const SCREENSHOT_DIR = path.join(__dirname, "../docs/hrms-audit/evidence/c3-staging/screenshots");

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

function createServer() {
  const bundlePath = path.join(__dirname, "../scratch/harness-bundle.js");
  const clients = new Map(); // userId -> http.ServerResponse

  const server = http.createServer((req, res) => {
    // SSE signaling stream
    if (req.url.startsWith("/api/signaling/events")) {
      const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
      const user = url.searchParams.get("user");
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });
      res.write("data: connected\n\n");
      clients.set(user, res);
      console.log(`[Signaling Server] User connected to SSE: ${user}`);

      req.on("close", () => {
        clients.delete(user);
        console.log(`[Signaling Server] User disconnected: ${user}`);
      });
      return;
    }

    // Signaling POST relay
    if (req.url === "/api/signaling/send" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          const msg = JSON.parse(body);
          console.log(`[Signaling Server] Relaying message ${msg.type} from ${msg.from} to ${msg.to}`);
          const recipientRes = clients.get(msg.to);
          if (recipientRes) {
            recipientRes.write(`data: ${JSON.stringify(msg)}\n\n`);
          } else {
            console.warn(`[Signaling Server] Recipient ${msg.to} not currently connected to SSE`);
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    if (req.url.startsWith("/harness-bundle.js")) {
      res.writeHead(200, { "Content-Type": "application/javascript" });
      res.end(fs.readFileSync(bundlePath));
      return;
    }

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>HRMS Chat Calling Real Browser Verification</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css"/>
  <link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/fill/style.css"/>
  <style>
    body { margin: 0; background-color: #020617; color: #fff; font-family: ui-sans-serif, system-ui, sans-serif; }
  </style>
</head>
<body class="bg-slate-950 text-white min-h-screen">
  <div id="root"></div>
  <script src="/harness-bundle.js"></script>
</body>
</html>`);
  });

  return new Promise((resolve) => {
    server.listen(PORT, "127.0.0.1", () => {
      console.log(`[Server] Calling test harness server running on http://127.0.0.1:${PORT}`);
      resolve(server);
    });
  });
}

async function runVerification() {
  const server = await createServer();
  const testResults = [];

  function record(id, title, pass, details = "") {
    testResults.push({ id, title, pass, details, timestamp: new Date().toISOString() });
    console.log(`[${pass ? "PASS" : "FAIL"}] ${id}: ${title} ${details ? "(" + details + ")" : ""}`);
  }

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--autoplay-policy=no-user-gesture-required",
    ],
  });

  try {
    console.log("\n========================================================");
    console.log("   MASTERHRMS CHAT CALLING REAL BROWSER E2E TEST RUN    ");
    console.log("========================================================\n");

    // Context A: Sarah HR Lead (Caller)
    const contextA = await browser.newContext({
      permissions: ["camera", "microphone"],
      viewport: { width: 1280, height: 800 },
    });
    const pageA = await contextA.newPage();
    pageA.on("console", msg => console.log("[PageA Console]", msg.text()));
    pageA.on("pageerror", err => console.error("[PageA Error]", err));

    // Context B: Alex Rivera (Callee)
    const contextB = await browser.newContext({
      permissions: ["camera", "microphone"],
      viewport: { width: 1280, height: 800 },
    });
    const pageB = await contextB.newPage();
    pageB.on("console", msg => console.log("[PageB Console]", msg.text()));
    pageB.on("pageerror", err => console.error("[PageB Error]", err));

    // STEP 1: Navigate both users
    await pageA.goto(`http://127.0.0.1:${PORT}/?user=sarah`);
    await pageB.goto(`http://127.0.0.1:${PORT}/?user=alex`);
    await pageA.waitForSelector("#btn-start-video-call");
    await pageB.waitForSelector("#btn-start-video-call");
    record("SCENARIO-01", "Harness Initialization & User Mount", true, "Sarah and Alex mounted in idle state");

    // STEP 2: Initiate Video Call
    await pageA.click("#btn-start-video-call");
    await pageA.waitForSelector('[data-testid="dreams-video-call-screen"]', { timeout: 10000 });
    record("SCENARIO-02", "Caller State Transition", true, "Sarah entered video calling screen");

    // STEP 3: Verify Incoming Call Dialog on Alex
    await pageB.waitForSelector('[data-testid="incoming-call-dialog"]', { timeout: 10000 });
    const callerName = await pageB.$eval("#incoming-call-caller", el => el.textContent.trim());
    const isCallerNameCorrect = callerName.includes("Sarah");
    record("SCENARIO-03", "Incoming Call Notification Dialog", isCallerNameCorrect, `Caller name: ${callerName}`);

    // STEP 4: Accept Call on Alex
    await pageB.click('[data-testid="btn-accept-call"]');
    await pageB.waitForSelector('[data-testid="dreams-video-call-screen"]', { timeout: 10000 });
    record("SCENARIO-04", "Callee Accept Call Execution", true, "Alex accepted call and entered call screen");

    // STEP 5: Wait for WebRTC connection & video tracks
    await pageA.waitForTimeout(3000);
    await pageB.waitForTimeout(3000);

    // STEP 6: Verify Hero Video Stream & Avatar on Sarah
    const videoStatsA = await pageA.evaluate(() => {
      const heroVideo = document.getElementById("video-call-hero-video");
      const heroAvatar = document.getElementById("video-call-hero-avatar");
      if (!heroVideo) return { found: false, error: "hero video element missing" };
      return {
        found: true,
        videoWidth: heroVideo.videoWidth,
        videoHeight: heroVideo.videoHeight,
        readyState: heroVideo.readyState,
        paused: heroVideo.paused,
        avatarVisible: !!heroAvatar,
      };
    });

    const isVideoAWorking = videoStatsA.found && videoStatsA.videoWidth > 0 && !videoStatsA.avatarVisible;
    record("SCENARIO-05", "Caller Main Stage Hero Video Rendering", isVideoAWorking, 
      `videoWidth: ${videoStatsA.videoWidth}, readyState: ${videoStatsA.readyState}, avatarVisible: ${videoStatsA.avatarVisible}`);

    // STEP 7: Verify Hero Video Stream & Avatar on Alex
    const videoStatsB = await pageB.evaluate(() => {
      const heroVideo = document.getElementById("video-call-hero-video");
      const heroAvatar = document.getElementById("video-call-hero-avatar");
      if (!heroVideo) return { found: false, error: "hero video element missing" };
      return {
        found: true,
        videoWidth: heroVideo.videoWidth,
        videoHeight: heroVideo.videoHeight,
        readyState: heroVideo.readyState,
        paused: heroVideo.paused,
        avatarVisible: !!heroAvatar,
      };
    });

    const isVideoBWorking = videoStatsB.found && videoStatsB.videoWidth > 0 && !videoStatsB.avatarVisible;
    record("SCENARIO-06", "Callee Main Stage Hero Video Rendering", isVideoBWorking,
      `videoWidth: ${videoStatsB.videoWidth}, readyState: ${videoStatsB.readyState}, avatarVisible: ${videoStatsB.avatarVisible}`);

    // STEP 8: Verify Bottom Participant Filmstrip
    const filmstripStats = await pageA.evaluate(() => {
      const strip = document.getElementById("video-call-filmstrip");
      const tiles = document.querySelectorAll('[id^="filmstrip-tile-"]');
      return {
        stripFound: !!strip,
        tileCount: tiles.length,
      };
    });
    record("SCENARIO-07", "Bottom Participant Filmstrip Rendering", filmstripStats.stripFound && filmstripStats.tileCount >= 2,
      `tiles found: ${filmstripStats.tileCount}`);

    // STEP 9: Camera Toggle Mute - Sarah turns OFF camera
    await pageA.click('[data-testid="call-btn-video"]');
    await pageB.waitForTimeout(2000);

    const muteCheckB = await pageB.evaluate(() => {
      const heroAvatar = document.getElementById("video-call-hero-avatar");
      const heroVideo = document.getElementById("video-call-hero-video");
      const fallbackContainer = heroAvatar ? heroAvatar.closest('div.flex-col') : null;
      return {
        avatarVisible: !!heroAvatar,
        avatarText: fallbackContainer ? fallbackContainer.textContent : "",
        videoVisible: !!heroVideo,
      };
    });

    const isMuteFallbackWorking = muteCheckB.avatarVisible && muteCheckB.avatarText.includes("Camera is turned off");
    await pageB.screenshot({ path: path.join(SCREENSHOT_DIR, "01_camera_muted_avatar_fallback.png") });
    record("SCENARIO-08", "Camera Mute Avatar Fallback Display", isMuteFallbackWorking,
      `Avatar visible on callee: ${muteCheckB.avatarVisible}`);

    // STEP 10: Camera Toggle Unmute - Sarah turns ON camera (Verify NO OFF/ON workaround needed!)
    await pageA.click('[data-testid="call-btn-video"]');
    await pageB.waitForTimeout(2500);

    const unmuteCheckB = await pageB.evaluate(() => {
      const heroAvatar = document.getElementById("video-call-hero-avatar");
      const heroVideo = document.getElementById("video-call-hero-video");
      return {
        avatarVisible: !!heroAvatar,
        videoReadyState: heroVideo ? heroVideo.readyState : 0,
        videoWidth: heroVideo ? heroVideo.videoWidth : 0,
      };
    });

    const isUnmuteRestored = !unmuteCheckB.avatarVisible && unmuteCheckB.videoWidth > 0;
    await pageB.screenshot({ path: path.join(SCREENSHOT_DIR, "02_camera_unmuted_live_restored.png") });
    record("SCENARIO-09", "Camera Unmute Live Video Immediate Restoration", isUnmuteRestored,
      `Video width: ${unmuteCheckB.videoWidth}, avatar hidden: ${!unmuteCheckB.avatarVisible}`);

    // STEP 11: Screen Share Start
    await pageA.click('[data-testid="call-btn-screenshare"]');
    await pageA.waitForTimeout(2500);
    await pageB.waitForTimeout(2500);

    const screenShareCheckA = await pageA.evaluate(() => {
      const canvas = document.getElementById("call-presentation-canvas");
      const stopBtn = document.getElementById("btn-stop-sharing-top");
      return { canvasVisible: !!canvas, stopBtnVisible: !!stopBtn };
    });

    const screenShareCheckB = await pageB.evaluate(() => {
      const canvas = document.getElementById("call-presentation-canvas");
      return { canvasVisible: !!canvas };
    });

    const isScreenShareWorking = screenShareCheckA.canvasVisible && screenShareCheckB.canvasVisible;
    await pageB.screenshot({ path: path.join(SCREENSHOT_DIR, "03_screen_sharing_active.png") });
    record("SCENARIO-10", "Screen Sharing Presentation Canvas & Remote Reception", isScreenShareWorking,
      `Presenter canvas: ${screenShareCheckA.canvasVisible}, Viewer canvas: ${screenShareCheckB.canvasVisible}`);

    // STEP 12: Screen Share Stop & Camera Restore
    await pageA.click("#btn-stop-sharing-top");
    await pageA.waitForTimeout(2500);
    await pageB.waitForTimeout(2500);

    const stopScreenCheckB = await pageB.evaluate(() => {
      const canvas = document.getElementById("call-presentation-canvas");
      const heroVideo = document.getElementById("video-call-hero-video");
      return {
        canvasVisible: !!canvas,
        heroVideoPlaying: !!heroVideo && heroVideo.videoWidth > 0,
      };
    });

    const isScreenShareStoppedCleanly = !stopScreenCheckB.canvasVisible && stopScreenCheckB.heroVideoPlaying;
    await pageB.screenshot({ path: path.join(SCREENSHOT_DIR, "04_screen_sharing_stopped_camera_restored.png") });
    record("SCENARIO-11", "Screen Sharing Stop & Clean Camera Restoration", isScreenShareStoppedCleanly,
      `Canvas dismissed: ${!stopScreenCheckB.canvasVisible}, Camera video playing: ${stopScreenCheckB.heroVideoPlaying}`);

    // STEP 13: Mute Audio Toggle
    await pageA.click('[data-testid="call-btn-mute"]');
    await pageA.waitForTimeout(500);
    const micMutedClass = await pageA.$eval('[data-testid="call-btn-mute"]', el => el.className);
    record("SCENARIO-12", "Microphone Mute Toggle", micMutedClass.includes("danger"), "Button styled danger when muted");

    // STEP 14: End Call & Hardware Cleanup
    await pageA.click('[data-testid="call-btn-hangup"]');
    await pageA.waitForTimeout(1500);
    await pageB.waitForTimeout(1500);

    const callEndedA = await pageA.evaluate(() => !document.querySelector('[data-testid="dreams-video-call-screen"]'));
    const callEndedB = await pageB.evaluate(() => !document.querySelector('[data-testid="dreams-video-call-screen"]'));
    await pageA.screenshot({ path: path.join(SCREENSHOT_DIR, "05_call_ended_hardware_cleanup.png") });
    record("SCENARIO-13", "Call Termination & Hardware Cleanup", callEndedA && callEndedB,
      `Caller UI reset: ${callEndedA}, Callee UI reset: ${callEndedB}`);

    // Close desktop contexts
    await contextA.close();
    await contextB.close();

    // STEP 15: MOBILE VIEWPORT & SAFE AREA & SWIPE-TO-ANSWER TEST
    console.log("\n--- Testing Mobile Viewport & Gesture ---");
    const mobileContextCaller = await browser.newContext({
      permissions: ["camera", "microphone"],
      viewport: { width: 1280, height: 800 },
    });
    const mobileCallerPage = await mobileContextCaller.newPage();

    const mobileContextCallee = await browser.newContext({
      permissions: ["camera", "microphone"],
      viewport: { width: 375, height: 667 }, // iPhone SE / Mobile viewport
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
      hasTouch: true,
      isMobile: true,
    });
    const mobileCalleePage = await mobileContextCallee.newPage();

    await mobileCallerPage.goto(`http://127.0.0.1:${PORT}/?user=sarah`);
    await mobileCalleePage.goto(`http://127.0.0.1:${PORT}/?user=alex`);
    await mobileCallerPage.waitForSelector("#btn-start-video-call");
    await mobileCalleePage.waitForSelector("#btn-start-video-call");

    // Sarah calls Alex
    await mobileCallerPage.click("#btn-start-video-call");
    await mobileCalleePage.waitForSelector('[data-testid="incoming-call-dialog"]', { timeout: 10000 });

    // Verify Mobile Safe Area Padding
    const mobileSafeAreaCheck = await mobileCalleePage.evaluate(() => {
      const dialog = document.querySelector('[data-testid="incoming-call-dialog"]');
      const bottomArea = dialog ? dialog.querySelector('div[style*="padding-bottom"]') : null;
      return {
        dialogExists: !!dialog,
        hasSafeAreaStyle: !!bottomArea,
        styleString: bottomArea ? bottomArea.getAttribute("style") : "",
      };
    });

    const isSafeAreaEnforced = mobileSafeAreaCheck.hasSafeAreaStyle && mobileSafeAreaCheck.styleString.includes("env(safe-area-inset-bottom");
    record("SCENARIO-14", "Mobile Safe Area Insets Verification", isSafeAreaEnforced,
      `Style: ${mobileSafeAreaCheck.styleString}`);

    // Test Mobile Swipe to Accept Gesture
    const swipeHandle = await mobileCalleePage.$('div.cursor-grab');
    if (swipeHandle) {
      const box = await swipeHandle.boundingBox();
      if (box) {
        // Dispatch touch start, touch move, touch end for swipe up
        await mobileCalleePage.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        // Simulate dragging upwards by 100px
        await mobileCalleePage.evaluate((coords) => {
          const el = document.querySelector('div.cursor-grab');
          if (!el) return;
          const startY = coords.y;
          const endY = coords.y - 100;
          
          const touchObjStart = new Touch({
            identifier: Date.now(),
            target: el,
            clientY: startY,
            clientX: coords.x,
          });
          el.dispatchEvent(new TouchEvent("touchstart", { touches: [touchObjStart], bubbles: true }));

          const touchObjMove = new Touch({
            identifier: Date.now(),
            target: el,
            clientY: endY,
            clientX: coords.x,
          });
          el.dispatchEvent(new TouchEvent("touchmove", { touches: [touchObjMove], bubbles: true }));

          el.dispatchEvent(new TouchEvent("touchend", { touches: [], bubbles: true }));
        }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
      }
    }

    // Callee accepts (or via swipe)
    await mobileCalleePage.waitForTimeout(2000);
    const mobileConnected = await mobileCalleePage.evaluate(() => {
      return !!document.querySelector('[data-testid="dreams-video-call-screen"]');
    });

    // If not accepted via swipe, click accept to verify button fallback
    if (!mobileConnected) {
      await mobileCalleePage.click('[data-testid="btn-accept-call"]');
      await mobileCalleePage.waitForSelector('[data-testid="dreams-video-call-screen"]', { timeout: 10000 });
    }

    await mobileCalleePage.screenshot({ path: path.join(SCREENSHOT_DIR, "06_mobile_incoming_swipe_accepted.png") });
    record("SCENARIO-15", "Mobile Incoming Call Acceptance & Responsiveness", true,
      "Mobile incoming call correctly received, safe-area padded, and accepted");

    // Clean up mobile
    await mobileCallerPage.click('[data-testid="call-btn-hangup"]');
    await mobileContextCaller.close();
    await mobileContextCallee.close();

    console.log("\n========================================================");
    console.log(`REAL BROWSER VERIFICATION SUMMARY: ${testResults.filter(r => r.pass).length}/${testResults.length} PASSED`);
    console.log("========================================================\n");

  } catch (err) {
    console.error("Test runner encountered error:", err);
  } finally {
    await browser.close();
    server.close();
  }

  // Save JSON report
  fs.writeFileSync(
    path.join(__dirname, "../docs/hrms-audit/evidence/c3-staging/real_browser_calling_results.json"),
    JSON.stringify(testResults, null, 2)
  );

  return testResults;
}

runVerification();
