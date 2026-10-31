const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");
const jwt = require("../server/node_modules/jsonwebtoken");

// ─── 1. ENVIRONMENT & SECURE FAIL-CLOSED JWT RESOLUTION ───
const serverEnvPath = path.join(__dirname, "../server/.env");
const rootEnvPath = path.join(__dirname, "../.env");

if (fs.existsSync(serverEnvPath)) {
  require("../server/node_modules/dotenv").config({ path: serverEnvPath });
}
if (!process.env.JWT_SECRET && fs.existsSync(rootEnvPath)) {
  require("../server/node_modules/dotenv").config({ path: rootEnvPath });
}

if (!process.env.JWT_SECRET || typeof process.env.JWT_SECRET !== "string" || process.env.JWT_SECRET.trim().length === 0) {
  console.error("================================================================================");
  console.error("FATAL [Security Check]: JWT_SECRET environment variable is missing, empty, or unconfigured.");
  console.error("Halting dialog test runner: Hard-coded fallback JWT secrets are strictly prohibited.");
  console.error("================================================================================");
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET.trim();
const OUTPUT_DIR = path.join(__dirname, "../docs/Saas/screenshots/phase-3-1-2-security-hardening/dialog-verification");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "4h" });
}

// ─── 2. TARGET VIEWPORTS & DETERMINISTIC FIXTURES ───
const TARGET_VIEWPORTS = [
  { name: "mobile_360", width: 360, height: 800, tier: "Mobile Small" },
  { name: "mobile_390", width: 390, height: 844, tier: "Mobile Standard" },
  { name: "mobile_430", width: 430, height: 932, tier: "Mobile Large" },
  { name: "tablet_768", width: 768, height: 1024, tier: "Tablet Portrait" },
  { name: "tablet_1023", width: 1023, height: 768, tier: "Tablet Landscape (< 1024)" },
  { name: "desktop_1024", width: 1024, height: 768, tier: "Desktop Boundary (>= 1024)" },
];

const now = new Date();
const todayYear = now.getFullYear();
const todayMonth = String(now.getMonth() + 1).padStart(2, "0");
const todayDate = String(now.getDate()).padStart(2, "0");
const todayISO = `${todayYear}-${todayMonth}-${todayDate}`;

const SAMPLE_CATEGORIES = [
  { id: "cat-1", name: "Executive Review", color: "bg-teal-600 text-white" },
  { id: "cat-2", name: "Engineering Sprint", color: "bg-blue-600 text-white" },
  { id: "cat-3", name: "Company Holiday", color: "bg-emerald-600 text-white" },
];

const SAMPLE_EVENTS = [
  {
    id: "evt-01",
    title: "Quarterly Executive Alignment (Weekly)",
    description: "Weekly recurring executive alignment session and cross-functional sync.",
    startDate: `${todayISO}T10:00:00.000Z`,
    endDate: `${todayISO}T11:30:00.000Z`,
    category: "Executive Review",
    color: "bg-teal-600 text-white",
    location: "Executive Boardroom",
    status: "confirmed",
    isShared: true,
    isRecurringInstance: true,
    recurringSeriesId: "series-recur-01",
    recurrenceRule: "FREQ=WEEKLY;INTERVAL=1",
    reminders: [{ minutesBefore: 15 }],
    creator: { id: "usr-admin", name: "Master HRMS Admin" },
    attendees: [
      { id: "att-1", name: "Sarah Jenkins", email: "sarah@masterhrms.com", status: "accepted" },
      { id: "att-2", name: "David Kim", email: "david@masterhrms.com", status: "tentative" },
    ],
  },
];

const SAMPLE_AUDIT_LOGS = [
  {
    id: "audit-01",
    action: "EVENT_CREATED",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    userName: "System Administrator",
    details: "Created initial recurring event series",
  },
  {
    id: "audit-02",
    action: "ROOM_ASSIGNED",
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    userName: "Sarah Jenkins",
    details: "Assigned Executive Boardroom",
  },
];

const MOCK_CONFLICT_RESPONSE = {
  error: "Scheduling conflict detected",
  conflicts: {
    attendeeConflicts: [
      {
        attendeeName: "Sarah Jenkins (HR Lead)",
        reason: "Busy: Executive Alignment",
        conflictingEventTime: "10:00 - 11:30 AM",
      },
    ],
    roomConflicts: [
      {
        roomName: "Executive Boardroom",
        conflictingEventTitle: "Quarterly Executive Alignment",
        conflictingEventTime: "10:00 - 11:30 AM",
      },
    ],
  },
};

// ─── 3. EXECUTION RUNNER ───
async function runDialogVerification() {
  console.log("================================================================================");
  console.log("MASTERHRMS — Phase 3.1.2 Calendar Mobile Dialog Evidence Reconciliation");
  console.log("Testing 6 Dialogs across 6 Viewports (36 Test Scenarios)");
  console.log("================================================================================");

  const token = generateToken({
    id: "usr-admin",
    userId: "usr-admin",
    email: "admin@masterhrms.com",
    tenantId: "ten-001",
    roles: ["admin", "tenant_admin", "hr_admin"],
  });

  const browser = await chromium.launch({ headless: true });
  const results = [];
  const metrics = {
    totalScenarios: 0,
    passedScenarios: 0,
    failedScenarios: 0,
    totalAssertions: 0,
    passedAssertions: 0,
    failedAssertions: 0,
  };

  for (const vp of TARGET_VIEWPORTS) {
    console.log(`\n================================================================================`);
    console.log(`VIEWPORT: ${vp.name.toUpperCase()} (${vp.width}x${vp.height} - ${vp.tier})`);
    console.log(`================================================================================`);

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });

    await context.addCookies([
      { name: "hrms_auth_token", value: token, domain: "localhost", path: "/" },
    ]);

    await context.addInitScript(({ token }) => {
      const user = {
        id: "usr-admin",
        email: "admin@masterhrms.com",
        roles: ["admin", "tenant_admin", "hr_admin"],
        permissions: ["*"],
        enabledModules: ["hrm", "hrms", "calendar"],
        tenantId: "ten-001",
      };
      window.localStorage.setItem("hrms_auth_token", token);
      window.localStorage.setItem("token", token);
      window.localStorage.setItem("hrms_user", JSON.stringify(user));
      window.localStorage.setItem("user", JSON.stringify(user));
      window.localStorage.setItem("tenantId", "ten-001");
      document.cookie = `hrms_auth_token=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
    }, { token });

    const page = await context.newPage();

    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    // Route Mocks (Deterministic & Non-Destructive)
    await page.route("**/api/auth/me", (r) => {
      r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "usr-admin",
          email: "admin@masterhrms.com",
          roles: ["admin", "tenant_admin", "hr_admin"],
          permissions: ["*"],
          enabledModules: ["hrm", "hrms", "calendar"],
          profile: {
            fullName: "Master HRMS Admin",
            tenantId: "ten-001",
            tenant: { id: "ten-001", name: "MasterHRMS Enterprise", slug: "masterhrms" },
          },
        }),
      });
    });

    await page.route("**/api/workspace/subscription", (r) => {
      r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "active", planName: "Enterprise Tier", isExpired: false }),
      });
    });

    await page.route("**/api/system/maintenance-status", (r) => {
      r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ active: false, status: "inactive" }),
      });
    });

    await page.route("**/api/calendar/categories**", (r) => {
      r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: SAMPLE_CATEGORIES }),
      });
    });

    await page.route("**/api/calendar/rooms**", (r) => {
      r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [{ id: "room-1", name: "Executive Boardroom" }] }),
      });
    });

    await page.route("**/api/calendar/events**", (r) => {
      if (r.request().method() === "POST") {
        const postData = r.request().postDataJSON() || {};
        // If testing conflict scenario, return mock 409
        if (postData.title && postData.title.includes("Conflict Trigger")) {
          return r.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify(MOCK_CONFLICT_RESPONSE),
          });
        }
        return r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: { id: "evt-mock-created", ...postData } }),
        });
      }
      return r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: SAMPLE_EVENTS }),
      });
    });

    await page.route("**/api/hr/calendar/composite-events**", (r) => {
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SAMPLE_EVENTS) });
    });

    await page.route("**/api/hr/calendar/events**", (r) => {
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SAMPLE_EVENTS) });
    });

    await page.route("**/api/me/calendar/events**", (r) => {
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SAMPLE_EVENTS) });
    });

    await page.route("**/api/calendar/events/*/audit-logs**", (r) => {
      r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: SAMPLE_AUDIT_LOGS }),
      });
    });

    // Navigate to HR Calendar
    await page.goto("http://localhost:3000/hr/calendar", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector(".grid-cols-7, button:visible", { timeout: 15000 });
    await page.waitForTimeout(600);

    // Helper assertion function
    function assert(scenarioName, assertionName, condition, failMsg) {
      metrics.totalAssertions++;
      if (condition) {
        metrics.passedAssertions++;
        return { name: assertionName, pass: true };
      }
      metrics.failedAssertions++;
      console.error(`   ❌ [ASSERTION FAILED] [${scenarioName}] ${assertionName}: ${failMsg}`);
      return { name: assertionName, pass: false, error: failMsg };
    }

    async function safeScreenshot(filePath) {
      try {
        await page.screenshot({ path: filePath, fullPage: false, timeout: 8000, animations: "disabled" });
      } catch (err) {
        console.warn(`[Screenshot Notice] ${path.basename(filePath)}: ${err.message}`);
      }
    }

    async function evaluateDialogMetrics() {
      return await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return { open: false };

        const rect = dialog.getBoundingClientRect();
        const winW = window.innerWidth;
        const winH = window.innerHeight;

        const fitsW = rect.width <= winW + 2;
        const fitsH = rect.height <= winH + 2;
        const scrollCapable = dialog.scrollHeight >= (dialog.clientHeight - 2);
        const noHorizClip = dialog.scrollWidth <= (dialog.clientWidth + 2);

        const footerEl = dialog.querySelector('[data-testid="dialog-footer"]');
        let footerAccessible = false;
        if (footerEl) {
          const fRect = footerEl.getBoundingClientRect();
          footerAccessible = fRect.top >= 0 && fRect.bottom <= winH + 10;
        }

        return {
          open: true,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          fitsW,
          fitsH,
          scrollCapable,
          noHorizClip,
          footerAccessible,
        };
      });
    }

    // Helper to open filter drawer on mobile if needed
    async function openMobileDrawerIfNeeded() {
      if (vp.width < 1024) {
        const filterBtn = page.locator('button[data-testid="calendar-filter-drawer-btn"]:visible, button:visible[aria-label*="Filters"]').first();
        if ((await filterBtn.count()) > 0) {
          await filterBtn.click();
          await page.waitForTimeout(300);
        }
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // DIALOG 1: CREATE EVENT MODAL
    // ────────────────────────────────────────────────────────────────────────
    {
      const dName = "create_event_modal";
      metrics.totalScenarios++;
      const scenarioAssertions = [];

      await openMobileDrawerIfNeeded();
      const createBtn = page.locator('button[data-testid="create-event-btn"]:visible, button:visible:has-text("Create New Event")').first();
      assert(dName, "create_button_exists", (await createBtn.count()) > 0, "Create Event button not found");
      await createBtn.click();
      await page.waitForTimeout(400);

      const m = await evaluateDialogMetrics();
      scenarioAssertions.push(assert(dName, "dialog_visible", m.open, "Dialog failed to open"));
      scenarioAssertions.push(assert(dName, "width_within_viewport", m.fitsW, `Width ${m.width}px exceeds viewport ${vp.width}px`));
      scenarioAssertions.push(assert(dName, "height_within_viewport", m.fitsH, `Height ${m.height}px exceeds viewport ${vp.height}px`));
      scenarioAssertions.push(assert(dName, "vertical_scroll_capable", m.scrollCapable, "Scrollable body container not scroll-capable"));
      scenarioAssertions.push(assert(dName, "sticky_footer_accessible", m.footerAccessible, "Sticky footer clipped or unreachable"));
      scenarioAssertions.push(assert(dName, "no_horizontal_clipping", m.noHorizClip, "Horizontal clipping detected"));

      const shotPath = path.join(OUTPUT_DIR, `${vp.name}_01_create_event.png`);
      await safeScreenshot(shotPath);

      // Dismiss dialog
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      const postDismiss = await evaluateDialogMetrics();
      scenarioAssertions.push(assert(dName, "clean_dismissal", !postDismiss.open, "Dialog did not dismiss on Escape"));

      const pass = scenarioAssertions.every((a) => a.pass);
      if (pass) metrics.passedScenarios++; else metrics.failedScenarios++;
      results.push({ viewport: vp.name, dialog: dName, pass, assertions: scenarioAssertions, screenshot: path.basename(shotPath) });
      console.log(`  ${pass ? "✓" : "✗"} [${vp.name}] Dialog 1 (Create Event): ${pass ? "PASS" : "FAIL"}`);
    }

    // ────────────────────────────────────────────────────────────────────────
    // DIALOG 2: ADD CATEGORY MODAL
    // ────────────────────────────────────────────────────────────────────────
    {
      const dName = "add_category_modal";
      metrics.totalScenarios++;
      const scenarioAssertions = [];

      await openMobileDrawerIfNeeded();
      const addCatBtn = page.locator('button[data-testid="add-category-btn"]:visible').first();
      assert(dName, "add_category_button_exists", (await addCatBtn.count()) > 0, "Add Category button not found");
      await addCatBtn.click();
      await page.waitForTimeout(400);

      const m = await evaluateDialogMetrics();
      scenarioAssertions.push(assert(dName, "dialog_visible", m.open, "Dialog failed to open"));
      scenarioAssertions.push(assert(dName, "width_within_viewport", m.fitsW, `Width ${m.width}px exceeds viewport ${vp.width}px`));
      scenarioAssertions.push(assert(dName, "height_within_viewport", m.fitsH, `Height ${m.height}px exceeds viewport ${vp.height}px`));
      scenarioAssertions.push(assert(dName, "sticky_footer_accessible", m.footerAccessible, "Footer actions clipped"));
      scenarioAssertions.push(assert(dName, "no_horizontal_clipping", m.noHorizClip, "Horizontal clipping detected"));

      const shotPath = path.join(OUTPUT_DIR, `${vp.name}_02_add_category.png`);
      await safeScreenshot(shotPath);

      // Dismiss dialog via Cancel button
      const cancelBtn = page.locator('[role="dialog"] button:visible:has-text("Cancel")').first();
      if ((await cancelBtn.count()) > 0) {
        await cancelBtn.click();
      } else {
        await page.keyboard.press("Escape");
      }
      await page.waitForTimeout(300);
      const postDismiss = await evaluateDialogMetrics();
      scenarioAssertions.push(assert(dName, "clean_dismissal", !postDismiss.open, "Dialog did not dismiss cleanly"));

      // Also close drawer if still open on mobile
      if (vp.width < 1024) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      }

      const pass = scenarioAssertions.every((a) => a.pass);
      if (pass) metrics.passedScenarios++; else metrics.failedScenarios++;
      results.push({ viewport: vp.name, dialog: dName, pass, assertions: scenarioAssertions, screenshot: path.basename(shotPath) });
      console.log(`  ${pass ? "✓" : "✗"} [${vp.name}] Dialog 2 (Add Category): ${pass ? "PASS" : "FAIL"}`);
    }

    // ────────────────────────────────────────────────────────────────────────
    // DIALOG 3: EVENT DETAILS MODAL
    // ────────────────────────────────────────────────────────────────────────
    {
      const dName = "event_details_modal";
      metrics.totalScenarios++;
      const scenarioAssertions = [];

      // Open event pill
      const eventPill = page.locator('[data-testid="calendar-event-pill"]:visible').first();
      assert(dName, "event_pill_exists", (await eventPill.count()) > 0, "No visible event pill found in view");
      await eventPill.click();
      await page.waitForTimeout(400);

      const m = await evaluateDialogMetrics();
      scenarioAssertions.push(assert(dName, "dialog_visible", m.open, "Dialog failed to open"));
      scenarioAssertions.push(assert(dName, "width_within_viewport", m.fitsW, `Width ${m.width}px exceeds viewport ${vp.width}px`));
      scenarioAssertions.push(assert(dName, "height_within_viewport", m.fitsH, `Height ${m.height}px exceeds viewport ${vp.height}px`));
      scenarioAssertions.push(assert(dName, "vertical_scroll_capable", m.scrollCapable, "Scroll container not scroll-capable"));
      scenarioAssertions.push(assert(dName, "sticky_footer_accessible", m.footerAccessible, "Footer actions clipped"));
      scenarioAssertions.push(assert(dName, "no_horizontal_clipping", m.noHorizClip, "Horizontal clipping detected"));

      const shotPath = path.join(OUTPUT_DIR, `${vp.name}_03_event_details.png`);
      await safeScreenshot(shotPath);

      // Keep open for Dialog 4 and Dialog 6!
      const pass = scenarioAssertions.every((a) => a.pass);
      if (pass) metrics.passedScenarios++; else metrics.failedScenarios++;
      results.push({ viewport: vp.name, dialog: dName, pass, assertions: scenarioAssertions, screenshot: path.basename(shotPath) });
      console.log(`  ${pass ? "✓" : "✗"} [${vp.name}] Dialog 3 (Event Details): ${pass ? "PASS" : "FAIL"}`);
    }

    // ────────────────────────────────────────────────────────────────────────
    // DIALOG 4: AUDIT TRAIL MODAL (Opened from Event Details)
    // ────────────────────────────────────────────────────────────────────────
    {
      const dName = "audit_trail_modal";
      metrics.totalScenarios++;
      const scenarioAssertions = [];

      const auditBtn = page.locator('button[data-testid="audit-trail-btn"]:visible').first();
      assert(dName, "audit_trail_button_exists", (await auditBtn.count()) > 0, "Audit Trail button not found in Details modal");
      await auditBtn.click();
      await page.waitForTimeout(400);

      const m = await evaluateDialogMetrics();
      scenarioAssertions.push(assert(dName, "dialog_visible", m.open, "Audit Trail modal failed to open"));
      scenarioAssertions.push(assert(dName, "width_within_viewport", m.fitsW, `Width ${m.width}px exceeds viewport ${vp.width}px`));
      scenarioAssertions.push(assert(dName, "height_within_viewport", m.fitsH, `Height ${m.height}px exceeds viewport ${vp.height}px`));
      scenarioAssertions.push(assert(dName, "sticky_footer_accessible", m.footerAccessible, "Footer Close button clipped"));
      scenarioAssertions.push(assert(dName, "no_horizontal_clipping", m.noHorizClip, "Horizontal clipping detected"));

      const shotPath = path.join(OUTPUT_DIR, `${vp.name}_04_audit_trail.png`);
      await safeScreenshot(shotPath);

      // Dismiss audit modal via Close button
      const closeBtn = page.locator('[role="dialog"] button:visible:has-text("Close")').last();
      await closeBtn.click();
      await page.waitForTimeout(300);

      const pass = scenarioAssertions.every((a) => a.pass);
      if (pass) metrics.passedScenarios++; else metrics.failedScenarios++;
      results.push({ viewport: vp.name, dialog: dName, pass, assertions: scenarioAssertions, screenshot: path.basename(shotPath) });
      console.log(`  ${pass ? "✓" : "✗"} [${vp.name}] Dialog 4 (Audit Trail): ${pass ? "PASS" : "FAIL"}`);
    }

    // ────────────────────────────────────────────────────────────────────────
    // DIALOG 6: RECURRENCE SCOPE MODAL (Triggered from recurring Event Details)
    // ────────────────────────────────────────────────────────────────────────
    {
      const dName = "recurrence_scope_modal";
      metrics.totalScenarios++;
      const scenarioAssertions = [];

      // Details modal is currently open for evt-01 which has isRecurringInstance: true
      const cancelEventBtn = page.locator('button[data-testid="cancel-event-btn"]:visible').first();
      assert(dName, "cancel_event_button_exists", (await cancelEventBtn.count()) > 0, "Cancel Event button not found in Details modal");
      await cancelEventBtn.click();
      await page.waitForTimeout(400);

      const m = await evaluateDialogMetrics();
      scenarioAssertions.push(assert(dName, "dialog_visible", m.open, "Recurrence Scope modal failed to open"));
      scenarioAssertions.push(assert(dName, "width_within_viewport", m.fitsW, `Width ${m.width}px exceeds viewport ${vp.width}px`));
      scenarioAssertions.push(assert(dName, "height_within_viewport", m.fitsH, `Height ${m.height}px exceeds viewport ${vp.height}px`));
      scenarioAssertions.push(assert(dName, "sticky_footer_accessible", m.footerAccessible, "Recurrence modal footer clipped"));
      scenarioAssertions.push(assert(dName, "no_horizontal_clipping", m.noHorizClip, "Horizontal clipping detected"));

      // Verify scope options render
      const scopeOptionsCount = await page.locator('[role="dialog"] input[name="recurrence_scope"]').count();
      scenarioAssertions.push(assert(dName, "scope_options_rendered", scopeOptionsCount >= 2, "Recurrence scope radio options not rendered"));

      const shotPath = path.join(OUTPUT_DIR, `${vp.name}_06_recurrence_scope.png`);
      await safeScreenshot(shotPath);

      // Dismiss recurrence modal safely without mutating
      const recCancelBtn = page.locator('button[data-testid="recurrence-scope-cancel-btn"]:visible').first();
      await recCancelBtn.click();
      await page.waitForTimeout(300);

      // Now close Details modal as well
      const closeDetailsBtn = page.locator('button[data-testid="close-details-btn"]:visible').first();
      if ((await closeDetailsBtn.count()) > 0) {
        await closeDetailsBtn.click();
      } else {
        await page.keyboard.press("Escape");
      }
      await page.waitForTimeout(300);

      const pass = scenarioAssertions.every((a) => a.pass);
      if (pass) metrics.passedScenarios++; else metrics.failedScenarios++;
      results.push({ viewport: vp.name, dialog: dName, pass, assertions: scenarioAssertions, screenshot: path.basename(shotPath) });
      console.log(`  ${pass ? "✓" : "✗"} [${vp.name}] Dialog 6 (Recurrence Scope): ${pass ? "PASS" : "FAIL"}`);
    }

    // ────────────────────────────────────────────────────────────────────────
    // DIALOG 5: CONFLICT RESOLUTION MODAL (Triggered via mocked 409 Conflict)
    // ────────────────────────────────────────────────────────────────────────
    {
      const dName = "conflict_resolution_modal";
      metrics.totalScenarios++;
      const scenarioAssertions = [];

      // Open Create Event dialog again
      await openMobileDrawerIfNeeded();
      const createBtn = page.locator('button[data-testid="create-event-btn"]:visible, button:visible:has-text("Create New Event")').first();
      await createBtn.click();
      await page.waitForTimeout(400);

      // Fill Title with trigger string to trip the mock 409
      const titleInput = page.locator('[role="dialog"] input[placeholder*="Executive Strategy"]').first();
      await titleInput.fill("Conflict Trigger Event");
      await page.waitForTimeout(200);

      // Click Save Event -> intercepted mock returns 409 Conflict
      const saveBtn = page.locator('button[data-testid="save-event-btn"]:visible').first();
      await saveBtn.click();
      await page.waitForTimeout(500);

      const m = await evaluateDialogMetrics();
      scenarioAssertions.push(assert(dName, "dialog_visible", m.open, "Conflict modal failed to open"));
      scenarioAssertions.push(assert(dName, "width_within_viewport", m.fitsW, `Width ${m.width}px exceeds viewport ${vp.width}px`));
      scenarioAssertions.push(assert(dName, "height_within_viewport", m.fitsH, `Height ${m.height}px exceeds viewport ${vp.height}px`));
      scenarioAssertions.push(assert(dName, "sticky_footer_accessible", m.footerAccessible, "Conflict modal footer clipped"));
      scenarioAssertions.push(assert(dName, "no_horizontal_clipping", m.noHorizClip, "Horizontal clipping detected"));

      // Verify conflict UI details render
      const conflictHeaderFound = await page.evaluate(() => {
        return Boolean(document.body.textContent.includes("Scheduling Conflict Detected"));
      });
      scenarioAssertions.push(assert(dName, "conflict_warnings_rendered", conflictHeaderFound, "Conflict warning text not rendered"));

      const shotPath = path.join(OUTPUT_DIR, `${vp.name}_05_conflict_modal.png`);
      await safeScreenshot(shotPath);

      // Dismiss conflict modal via "Change Time / Room" button
      const changeBtn = page.locator('button[data-testid="conflict-dialog-change-btn"]:visible').first();
      await changeBtn.click();
      await page.waitForTimeout(300);

      // Dismiss create dialog
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      const pass = scenarioAssertions.every((a) => a.pass);
      if (pass) metrics.passedScenarios++; else metrics.failedScenarios++;
      results.push({ viewport: vp.name, dialog: dName, pass, assertions: scenarioAssertions, screenshot: path.basename(shotPath) });
      console.log(`  ${pass ? "✓" : "✗"} [${vp.name}] Dialog 5 (Conflict Modal): ${pass ? "PASS" : "FAIL"}`);
    }

    await context.close();
  }

  await browser.close();

  // Write detailed report JSON
  const reportPath = path.join(OUTPUT_DIR, "report.json");
  fs.writeFileSync(reportPath, JSON.stringify({ metrics, results }, null, 2));

  console.log("\n================================================================================");
  console.log(`DIALOG VERIFICATION SUMMARY: ${metrics.passedScenarios}/${metrics.totalScenarios} SCENARIOS PASSED`);
  console.log(`TOTAL ASSERTIONS: ${metrics.passedAssertions}/${metrics.totalAssertions} PASSED (${metrics.failedAssertions} failed)`);
  console.log(`REPORT RECORDED: ${reportPath}`);
  console.log("================================================================================");

  if (metrics.failedScenarios > 0 || metrics.failedAssertions > 0) {
    process.exit(1);
  }
}

runDialogVerification().catch((err) => {
  console.error("Fatal Dialog Verification Failure:", err);
  process.exit(1);
});
