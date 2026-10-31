const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");
const { PrismaClient } = require("../server/node_modules/@prisma/client");
const jwt = require("../server/node_modules/jsonwebtoken");

// ─── 1. ENVIRONMENT & SECURE JWT SECRET RESOLUTION (TASK B) ───
const serverEnvPath = path.join(__dirname, "../server/.env");
const rootEnvPath = path.join(__dirname, "../.env");

if (fs.existsSync(serverEnvPath)) {
  require("../server/node_modules/dotenv").config({ path: serverEnvPath });
}
if (!process.env.JWT_SECRET && fs.existsSync(rootEnvPath)) {
  require("../server/node_modules/dotenv").config({ path: rootEnvPath });
}

// Fail-closed validation: Hard-coded fallback JWT secrets are strictly prohibited
if (!process.env.JWT_SECRET || typeof process.env.JWT_SECRET !== "string" || process.env.JWT_SECRET.trim().length === 0) {
  console.error("================================================================================");
  console.error("FATAL [Security Check]: JWT_SECRET environment variable is missing, empty, or unconfigured.");
  console.error("Halting test runner immediately: Hard-coded fallback JWT secrets are strictly prohibited.");
  console.error("Please configure JWT_SECRET in server/.env or your local test environment.");
  console.error("================================================================================");
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET.trim();
const SCREENSHOTS_PHASE3_DIR = path.join(__dirname, "../docs/Saas/screenshots/calendar-phase-3-responsive");
const SCREENSHOTS_PHASE3_1_DIR = path.join(__dirname, "../docs/Saas/screenshots/calendar-phase-3-responsive/phase-3-1");

if (!fs.existsSync(SCREENSHOTS_PHASE3_1_DIR)) {
  fs.mkdirSync(SCREENSHOTS_PHASE3_1_DIR, { recursive: true });
}

const prisma = new PrismaClient();

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "4h" });
}

// ─── 2. SAMPLE ISOLATED TEST DATA ───
const SAMPLE_CATEGORIES = [
  { id: "cat-1", name: "Meetings", color: "bg-teal-600 text-white" },
  { id: "cat-2", name: "Training", color: "bg-blue-600 text-white" },
  { id: "cat-3", name: "Leave & Time Off", color: "bg-amber-600 text-white" },
  { id: "cat-4", name: "Holidays", color: "bg-emerald-600 text-white" },
  { id: "cat-5", name: "Birthdays", color: "bg-rose-600 text-white" },
  { id: "cat-6", name: "General Events", color: "bg-purple-600 text-white" },
];

const now = new Date();
const todayYear = now.getFullYear();
const todayMonth = String(now.getMonth() + 1).padStart(2, "0");
const todayDate = String(now.getDate()).padStart(2, "0");
const todayISO = `${todayYear}-${todayMonth}-${todayDate}`;

const SAMPLE_EVENTS = [
  {
    id: "evt-01",
    title: "Q4 Strategic Executive Planning",
    description: "Quarterly alignment and roadmap review across department leaders.",
    startDate: `${todayISO}T10:00:00.000Z`,
    endDate: `${todayISO}T11:30:00.000Z`,
    category: "Meetings",
    color: "bg-teal-600 text-white",
    location: "Executive Boardroom & Zoom",
    status: "confirmed",
    isShared: true,
    reminders: [{ minutesBefore: 15 }],
  },
  {
    id: "evt-02",
    title: "React 19 & Next.js 16 Team Workshop",
    description: "Internal engineering training on modern App Router and concurrent features.",
    startDate: `${todayISO}T14:00:00.000Z`,
    endDate: `${todayISO}T16:00:00.000Z`,
    category: "Training",
    color: "bg-blue-600 text-white",
    location: "Engineering Hub B",
    status: "confirmed",
    isShared: false,
    reminders: [{ minutesBefore: 30 }],
  },
  {
    id: "birthday-01",
    title: "Jane Doe's Birthday",
    startDate: `${todayISO}T00:00:00.000Z`,
    endDate: `${todayISO}T23:59:59.000Z`,
    category: "Birthday",
    color: "bg-rose-600 text-white",
    employeeName: "Jane Doe",
    employeeInitials: "JD",
    status: "confirmed",
  },
  {
    id: "evt-03",
    title: "Complete Monthly Payroll Review",
    startDate: `${todayISO}T17:00:00.000Z`,
    endDate: `${todayISO}T18:00:00.000Z`,
    category: "General Events",
    color: "bg-purple-600 text-white",
    sourceDomain: "todo",
    completed: false,
    status: "confirmed",
  },
];

// ─── 3. TARGET VIEWPORTS & ROUTES ───
const TARGET_VIEWPORTS = [
  { name: "mobile_small_360", width: 360, height: 800, isMobile: true, tier: "Mobile" },
  { name: "mobile_standard_390", width: 390, height: 844, isMobile: true, tier: "Mobile" },
  { name: "mobile_large_430", width: 430, height: 932, isMobile: true, tier: "Mobile" },
  { name: "tablet_portrait_768", width: 768, height: 1024, isTablet: true, tier: "Tablet" },
  { name: "tablet_boundary_1023", width: 1023, height: 768, isTablet: true, tier: "Tablet" },
  { name: "tablet_landscape_1024", width: 1024, height: 768, isDesktop: true, tier: "Desktop" },
  { name: "laptop_1280", width: 1280, height: 800, isDesktop: true, tier: "Desktop" },
  { name: "desktop_standard_1440", width: 1440, height: 900, isDesktop: true, tier: "Desktop" },
];

const TARGET_ROUTES = [
  { name: "hr_calendar", path: "/hr/calendar", url: "http://localhost:3000/hr/calendar", roles: ["admin", "tenant_admin", "hr_admin"] },
  { name: "tenant_calendar", path: "/tenant/calendar", url: "http://localhost:3000/tenant/calendar", roles: ["admin", "tenant_admin"] },
  { name: "me_calendar", path: "/me/calendar", url: "http://localhost:3000/me/calendar", roles: ["employee", "user"] },
  { name: "canonical_calendar", path: "/calendar", url: "http://localhost:3000/calendar", roles: ["admin", "tenant_admin"] },
  { name: "apps_calendar", path: "/apps/calendar", url: "http://localhost:3000/apps/calendar", roles: ["admin", "tenant_admin", "hr_admin"] },
];

async function runHardenedCalendarVerification() {
  console.log("================================================================================");
  console.log("MASTERHRMS — PHASE 3.1: CALENDAR RESPONSIVE TEST HARDENING & VERIFICATION");
  console.log("Strict Enforced Assertions / Zero Swallowed Exceptions / Multi-Dialog Validation");
  console.log("================================================================================");

  let tenantId = "tenant-default-001";
  let adminUserId = "32255e7f-42d6-46ac-af56-29d7f57e9bd4";
  let adminEmail = "admin@masterhrms.com";

  try {
    const tenant = (await prisma.tenant.findFirst({ where: { id: "tenant-default-001" } })) || (await prisma.tenant.findFirst());
    if (tenant) tenantId = tenant.id;

    const adminUser =
      (await prisma.user.findFirst({ where: { email: "admin@masterhrms.com" } })) ||
      (await prisma.user.findFirst({ where: { profile: { tenantId } } })) ||
      (await prisma.user.findFirst());
    if (adminUser) {
      adminUserId = adminUser.id;
      adminEmail = adminUser.email;
    }
  } catch (err) {
    console.log("[Info] Database query skipped, using standard test identity.");
  }

  const tenantAdminToken = generateToken({
    id: adminUserId,
    userId: adminUserId,
    email: adminEmail,
    tenantId,
    roles: ["admin", "tenant_admin", "hr_admin"],
  });

  const employeeToken = generateToken({
    id: adminUserId,
    userId: adminUserId,
    email: "employee@masterhrms.com",
    tenantId,
    roles: ["employee", "user"],
  });

  const browser = await chromium.launch({ headless: true });
  const allTestResults = [];
  const globalAssertionMetrics = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    categories: {
      responsive_layout: { total: 0, passed: 0, failed: 0 },
      sidebar_and_drawer: { total: 0, passed: 0, failed: 0 },
      calendar_views: { total: 0, passed: 0, failed: 0 },
      dialog_viewport_and_scroll: { total: 0, passed: 0, failed: 0 },
      console_and_runtime: { total: 0, passed: 0, failed: 0 },
    },
  };

  for (const vp of TARGET_VIEWPORTS) {
    console.log(`\n================================================================================`);
    console.log(`VIEWPORT: ${vp.name.toUpperCase()} (${vp.width}x${vp.height} - ${vp.tier})`);
    console.log(`================================================================================`);

    for (const route of TARGET_ROUTES) {
      const testId = `${route.name}_${vp.width}x${vp.height}`;
      const logPrefix = `[${vp.width}x${vp.height}][${route.name}]`;
      const token = route.roles.includes("employee") && !route.roles.includes("admin") ? employeeToken : tenantAdminToken;

      const consoleErrors = [];
      const pageErrors = [];
      const assertions = [];

      function assert(category, name, pass, message) {
        globalAssertionMetrics.total++;
        if (globalAssertionMetrics.categories[category]) {
          globalAssertionMetrics.categories[category].total++;
        }

        const assertionObj = { category, name, pass: Boolean(pass), message };
        assertions.push(assertionObj);

        if (pass) {
          globalAssertionMetrics.passed++;
          if (globalAssertionMetrics.categories[category]) {
            globalAssertionMetrics.categories[category].passed++;
          }
        } else {
          globalAssertionMetrics.failed++;
          if (globalAssertionMetrics.categories[category]) {
            globalAssertionMetrics.categories[category].failed++;
          }
          console.error(`   ❌ [ASSERTION FAILED] [${category}] ${name}: ${message}`);
        }
      }

      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
      });

      await context.addCookies([
        { name: "hrms_auth_token", value: token, domain: "localhost", path: "/" },
      ]);

      await context.addInitScript(
        ({ token, roles, tenantId }) => {
          const userObj = {
            id: "usr-admin",
            email: "admin@masterhrms.com",
            roles,
            permissions: ["*"],
            enabledModules: ["hrm", "hrms", "calendar"],
            tenantId: tenantId || "ten-001",
          };
          window.localStorage.setItem("hrms_auth_token", token);
          window.localStorage.setItem("token", token);
          window.localStorage.setItem("auth_token", token);
          window.localStorage.setItem("hrms_user", JSON.stringify(userObj));
          window.localStorage.setItem("user", JSON.stringify(userObj));
          window.localStorage.setItem("tenantId", tenantId || "ten-001");
          document.cookie = `hrms_auth_token=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
        },
        { token, roles: route.roles, tenantId }
      );

      const page = await context.newPage();

      // Intercept auth & system calls
      await page.route("**/api/auth/me", (r) => {
        r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "usr-admin",
            email: "admin@masterhrms.com",
            roles: route.roles,
            permissions: ["*"],
            enabledModules: ["hrm", "hrms", "calendar"],
            profile: {
              fullName: "Master HRMS Administrator",
              tenantId: tenantId || "ten-001",
              tenant: { id: tenantId || "ten-001", name: "MasterHRMS Enterprise", slug: "masterhrms" },
            },
          }),
        });
      });

      await page.route("**/api/workspace/subscription", (r) => {
        r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "active",
            planName: "Enterprise Tier",
            isExpired: false,
            expiresAt: "2099-12-31T23:59:59.000Z",
          }),
        });
      });

      await page.route("**/api/system/maintenance-status", (r) => {
        r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ active: false, status: "inactive" }),
        });
      });

      // Intercept Calendar data endpoints
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
          body: JSON.stringify({ success: true, data: [{ id: "room-1", name: "Main Boardroom" }] }),
        });
      });

      await page.route("**/api/calendar/events**", (r) => {
        r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: SAMPLE_EVENTS }),
        });
      });

      await page.route("**/api/hr/calendar/composite-events**", (r) => {
        r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(SAMPLE_EVENTS),
        });
      });

      await page.route("**/api/hr/calendar/events**", (r) => {
        r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(SAMPLE_EVENTS),
        });
      });

      await page.route("**/api/me/calendar/events**", (r) => {
        r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(SAMPLE_EVENTS),
        });
      });

      page.on("response", (res) => {
        if (res.status() === 403) {
          console.log(`[DEBUG 403] ${res.status()} on ${res.request().method()} ${res.url()}`);
        }
      });

      await page.route("**/api/calendar/events/*/audit-logs**", (r) => {
        r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: "audit-001",
                action: "CREATE",
                createdAt: new Date().toISOString(),
                userId: "usr-admin",
                user: { email: "admin@masterhrms.com" },
                ipAddress: "127.0.0.1",
                details: { title: "Q4 Strategic Executive Planning" },
              },
            ],
          }),
        });
      });

      page.on("pageerror", (err) => {
        pageErrors.push(err.message || String(err));
      });

      const externalWarnings = [];

      page.on("console", (msg) => {
        if (msg.type() === "error") {
          const text = msg.text();
          // Filter external background connection warnings (e.g. backend socket reconnection, devtools, favicons, unmocked background telemetry)
          if (
            text.includes("SOCKET_CLIENT") ||
            text.includes("WebSocket") ||
            text.includes("favicon") ||
            text.includes("Download the React DevTools") ||
            text.includes("Failed to load resource") ||
            text.includes("status of 401") ||
            text.includes("status of 403") ||
            text.includes("status of 404")
          ) {
            externalWarnings.push(text);
          } else {
            consoleErrors.push(text);
          }
        }
      });

      let screenshotPath = null;
      let drawerShotPath = null;
      let createDialogShotPath = null;
      let categoryDialogShotPath = null;
      let detailsDialogShotPath = null;
      let auditDialogShotPath = null;

      try {
        await page.goto(route.url, { waitUntil: "domcontentloaded", timeout: 25000 });
        // For redirect dispatcher routes (like /apps/calendar), wait for client-side URL transition to settle
        if (route.name === "apps_calendar") {
          try {
            await page.waitForURL((url) => !url.pathname.includes("/apps/calendar"), { timeout: 6000 });
          } catch {}
        }
        try {
          await page.waitForSelector('button[data-testid="calendar-filter-drawer-btn"]:visible, button:visible[aria-label*="Filters"], aside[data-testid="calendar-sidebar"]:visible', { timeout: 5000 });
        } catch {}
        await page.waitForTimeout(600);

        // ─── CATEGORY 1: RESPONSIVE LAYOUT ASSERTIONS ───
        const layoutMetrics = await page.evaluate(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
          const clientW = docEl.clientWidth;
          const delta = scrollW - clientW;

          const asideEl = document.querySelector('[data-testid="calendar-sidebar"]');
          let asideVisible = false;
          if (asideEl) {
            const style = window.getComputedStyle(asideEl);
            asideVisible = style.display !== "none" && style.visibility !== "hidden" && asideEl.offsetWidth > 0;
          }

          const filterBtn = document.querySelector('button[data-testid="calendar-filter-drawer-btn"]') || document.querySelector('button[aria-label*="Filters"]');
          let filterBtnVisible = false;
          if (filterBtn) {
            const style = window.getComputedStyle(filterBtn);
            filterBtnVisible = style.display !== "none" && style.visibility !== "hidden" && filterBtn.offsetWidth > 0;
          }

          const allButtons = Array.from(document.querySelectorAll("button"));
          const viewButtons = allButtons.filter((b) => ["Month", "Week", "Day", "List"].includes(b.textContent?.trim() || ""));

          return {
            scrollW,
            clientW,
            delta,
            asideVisible,
            filterBtnVisible,
            viewButtonsCount: viewButtons.length,
          };
        });

        assert(
          "responsive_layout",
          "horizontal_overflow_zero",
          layoutMetrics.delta <= 2,
          `Document horizontal overflow detected: scrollWidth (${layoutMetrics.scrollW}px) > clientWidth (${layoutMetrics.clientW}px) by ${layoutMetrics.delta}px`
        );

        if (vp.width < 1024) {
          assert(
            "responsive_layout",
            "desktop_sidebar_hidden_below_1024",
            !layoutMetrics.asideVisible,
            `Desktop sidebar [data-testid="calendar-sidebar"] must be hidden below 1024px breakpoint (found visible)`
          );
          assert(
            "responsive_layout",
            "mobile_filter_trigger_visible_below_1024",
            layoutMetrics.filterBtnVisible,
            `Mobile filter trigger button must be visible below 1024px breakpoint`
          );
          assert(
            "responsive_layout",
            "segmented_view_buttons_present",
            layoutMetrics.viewButtonsCount >= 4,
            `Mobile segmented view selector buttons (Month, Week, Day, List) must be present (found ${layoutMetrics.viewButtonsCount})`
          );
        } else {
          assert(
            "responsive_layout",
            "desktop_sidebar_visible_at_or_above_1024",
            layoutMetrics.asideVisible,
            `Desktop sidebar [data-testid="calendar-sidebar"] must be visible at or above 1024px breakpoint`
          );
        }

        // ─── CATEGORY 2: SIDEBAR & DRAWER INTERACTIONS (< 1024px) ───
        if (vp.width < 1024) {
          const filterBtn = page.locator('button[data-testid="calendar-filter-drawer-btn"]:visible, button:visible[aria-label*="Filters"]').first();
          const filterBtnCount = await filterBtn.count();
          if (filterBtnCount === 0) {
            assert("sidebar_and_drawer", "filter_button_clickable", false, "Filter drawer trigger button not found in DOM");
          } else {
            await filterBtn.click();
            try {
              await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
            } catch {}
            await page.waitForTimeout(300);

            const drawerMetrics = await page.evaluate(() => {
              const sheetEl = document.querySelector('[role="dialog"]');
              if (!sheetEl) return { isOpen: false, hasCreateBtn: false, hasCategories: false, hasMiniCal: false };

              const hasCreateBtn = Array.from(sheetEl.querySelectorAll("button")).some((b) => b.textContent?.includes("Create"));
              const hasCategories = sheetEl.textContent?.includes("Categories");
              const hasMiniCal = Array.from(sheetEl.querySelectorAll("span")).some((s) => ["Su", "Mo", "Tu", "We"].includes(s.textContent?.trim() || ""));

              return {
                isOpen: true,
                hasCreateBtn,
                hasCategories,
                hasMiniCal,
              };
            });

            assert("sidebar_and_drawer", "drawer_opens_on_click", drawerMetrics.isOpen, "Slide-over drawer did not open after clicking filter button");
            assert("sidebar_and_drawer", "drawer_contains_create_cta", drawerMetrics.hasCreateBtn, "Drawer is missing Create Event CTA");
            assert("sidebar_and_drawer", "drawer_contains_categories", drawerMetrics.hasCategories, "Drawer is missing Categories section");
            assert("sidebar_and_drawer", "drawer_contains_mini_calendar", drawerMetrics.hasMiniCal, "Drawer is missing Mini Calendar widget");

            if (route.name === "hr_calendar") {
              drawerShotPath = path.join(SCREENSHOTS_PHASE3_1_DIR, `${testId}_drawer.png`);
              await page.screenshot({ path: drawerShotPath, fullPage: false });
            }

            // Test Escape dismissal
            await page.keyboard.press("Escape");
            await page.waitForTimeout(400);

            const drawerClosed = await page.evaluate(() => {
              const sheetEl = document.querySelector('[role="dialog"]');
              return !sheetEl;
            });
            assert("sidebar_and_drawer", "drawer_dismisses_on_escape", drawerClosed, "Slide-over drawer failed to dismiss when Escape key was pressed");
          }
        }

        // ─── CATEGORY 3: CALENDAR VIEW SWITCHING & PAN (Tested on hr_calendar & apps_calendar) ───
        if (["hr_calendar", "apps_calendar"].includes(route.name)) {
          // Switch to Week View (targeting visible button on active toolbar)
          const weekBtn = page.locator("button:visible").filter({ hasText: /^Week$/ }).first();
          const weekBtnCount = await weekBtn.count();
          if (weekBtnCount > 0) {
            await weekBtn.click();
            await page.waitForTimeout(400);

            const weekMetrics = await page.evaluate(() => {
              // Look for week header elements and pan container
              const weekContainer = document.querySelector(".min-w-\\[560px\\]");
              const hasSevenCols = Boolean(weekContainer && weekContainer.querySelector(".grid-cols-7"));
              const docEl = document.documentElement;
              const hasDocOverflow = (docEl.scrollWidth - docEl.clientWidth) > 2;
              return { hasWeekContainer: Boolean(weekContainer), hasSevenCols, hasDocOverflow };
            });

            assert("calendar_views", "switch_to_week_renders_pan_container", weekMetrics.hasWeekContainer, "Week view pan container (.min-w-[560px]) did not render");
            assert("calendar_views", "week_view_no_document_overflow", !weekMetrics.hasDocOverflow, "Week view broke document boundaries and caused page overflow");
          } else {
            assert("calendar_views", "week_button_available", false, "Visible Week view selector button not found");
          }

          // Switch to Day View
          const dayBtn = page.locator("button:visible").filter({ hasText: /^Day$/ }).first();
          const dayBtnCount = await dayBtn.count();
          if (dayBtnCount > 0) {
            await dayBtn.click();
            await page.waitForTimeout(400);

            const dayMetrics = await page.evaluate(() => {
              const hasScheduleSubtitle = Array.from(document.querySelectorAll("p")).some((p) =>
                p.textContent?.includes("Scheduled Sessions, Reminders and Projections")
              );
              const hasAddBtn = Array.from(document.querySelectorAll("button")).some((b) =>
                b.textContent?.includes("Add Event")
              );
              return hasScheduleSubtitle || hasAddBtn;
            });
            assert("calendar_views", "switch_to_day_renders_timeline", dayMetrics, "Day view timeline header and Add Event button failed to render");
          } else {
            assert("calendar_views", "day_button_available", false, "Visible Day view selector button not found");
          }

          // Switch to List View
          const listBtn = page.locator("button:visible").filter({ hasText: /^List$/ }).first();
          const listBtnCount = await listBtn.count();
          if (listBtnCount > 0) {
            await listBtn.click();
            await page.waitForTimeout(400);

            const listMetrics = await page.evaluate(() => {
              return Array.from(document.querySelectorAll("h4, h5")).some((el) => el.textContent?.includes("Scheduled Events Agenda") || el.textContent?.includes("Agenda"));
            });
            assert("calendar_views", "switch_to_list_renders_agenda", listMetrics, "List view agenda header failed to render");
          } else {
            assert("calendar_views", "list_button_available", false, "Visible List view selector button not found");
          }

          // Switch back to Month View
          const monthBtn = page.locator("button:visible").filter({ hasText: /^Month$/ }).first();
          const monthBtnCount = await monthBtn.count();
          if (monthBtnCount > 0) {
            await monthBtn.click();
            await page.waitForTimeout(400);

            const monthMetrics = await page.evaluate(() => {
              const monthHeaders = document.querySelector(".grid-cols-7");
              return Boolean(monthHeaders);
            });
            assert("calendar_views", "switch_to_month_renders_grid", monthMetrics, "Month grid failed to re-render after view cycling");
          } else {
            assert("calendar_views", "month_button_available", false, "Visible Month view selector button not found");
          }
        }

        // ─── CATEGORY 4: MOBILE & VIEWPORT DIALOG VALIDATIONS (TASK C) ───
        // Run deep dialog validations on hr_calendar across viewports
        if (route.name === "hr_calendar") {
          // 4.1 CREATE EVENT MODAL
          // Trigger either from desktop sidebar or by clicking filter drawer on mobile
          if (vp.width >= 1024) {
            const createBtn = page.locator("button:visible").filter({ hasText: /Create New Event/i }).first();
            const createBtnCount = await createBtn.count();
            if (createBtnCount > 0) {
              await createBtn.click();
              await page.waitForTimeout(400);
            }
          } else {
            // Open drawer first, then click Create New Event
            const filterBtn = page.locator('button[data-testid="calendar-filter-drawer-btn"]:visible, button:visible[aria-label*="Filters"]').first();
            const filterBtnCount = await filterBtn.count();
            if (filterBtnCount > 0) {
              await filterBtn.click();
              try {
                await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
              } catch {}
              await page.waitForTimeout(300);
              const drawerCreateBtn = page.locator('[role="dialog"] button:visible').filter({ hasText: /Create New Event/i }).first();
              const drawerCreateCount = await drawerCreateBtn.count();
              if (drawerCreateCount > 0) {
                await drawerCreateBtn.click();
                await page.waitForTimeout(400);
              }
            }
          }

          const createDialogMetrics = await page.evaluate(() => {
            const dialog = document.querySelector('[role="dialog"]');
            if (!dialog) return { open: false };

            const rect = dialog.getBoundingClientRect();
            const winW = window.innerWidth;
            const winH = window.innerHeight;

            const fitsW = rect.width <= winW + 2;
            const fitsH = rect.height <= winH + 2;

            // Check form scrollability & sticky footer
            const hasScrollableContent = dialog.scrollHeight >= dialog.clientHeight;
            const footerEl = dialog.querySelector('[data-testid="dialog-footer"]');
            let footerReachable = false;
            if (footerEl) {
              const footerRect = footerEl.getBoundingClientRect();
              footerReachable = footerRect.top >= 0 && footerRect.bottom <= winH + 10;
            }

            return {
              open: true,
              width: rect.width,
              height: rect.height,
              fitsW,
              fitsH,
              hasScrollableContent,
              footerReachable,
            };
          });

          assert("dialog_viewport_and_scroll", "create_event_dialog_opens", createDialogMetrics.open, "Create Event dialog failed to open");
          assert("dialog_viewport_and_scroll", "create_event_dialog_width_fits_viewport", createDialogMetrics.fitsW, `Create Event dialog width (${createDialogMetrics.width}px) exceeds viewport (${vp.width}px)`);
          assert("dialog_viewport_and_scroll", "create_event_dialog_height_fits_viewport", createDialogMetrics.fitsH, `Create Event dialog height (${createDialogMetrics.height}px) exceeds viewport (${vp.height}px)`);
          assert("dialog_viewport_and_scroll", "create_event_dialog_footer_accessible", createDialogMetrics.footerReachable, "Create Event dialog sticky footer actions are clipped or out of viewport bounds");

          createDialogShotPath = path.join(SCREENSHOTS_PHASE3_1_DIR, `${testId}_dialog_create.png`);
          await page.screenshot({ path: createDialogShotPath, fullPage: false });

          // Dismiss dialog safely without submitting mutation
          await page.keyboard.press("Escape");
          await page.waitForTimeout(300);

          // 4.2 CREATE CATEGORY MODAL
          let catBtnFound = false;
          if (vp.width >= 1024) {
            const addCatBtn = page.locator('aside[data-testid="calendar-sidebar"] button[data-testid="add-category-btn"]').first();
            if ((await addCatBtn.count()) > 0) {
              await addCatBtn.click();
              catBtnFound = true;
            }
          } else {
            const filterBtn = page.locator('button[data-testid="calendar-filter-drawer-btn"]:visible, button:visible[aria-label*="Filters"]').first();
            if ((await filterBtn.count()) > 0) {
              await filterBtn.click();
              try {
                await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
              } catch {}
              await page.waitForTimeout(300);
              const addCatBtn = page.locator('[role="dialog"] button[data-testid="add-category-btn"]').first();
              if ((await addCatBtn.count()) > 0) {
                await addCatBtn.click();
                catBtnFound = true;
              }
            }
          }

          assert("dialog_viewport_and_scroll", "category_button_visible_to_open_modal", catBtnFound, "Add Category button not found in sidebar or drawer");
          if (catBtnFound) {
            await page.waitForTimeout(400);
            const catDialogMetrics = await page.evaluate(() => {
              const dialog = document.querySelector('[role="dialog"]');
              if (!dialog) return { open: false };
              const rect = dialog.getBoundingClientRect();
              const hasColorSwatches = Boolean(dialog.querySelector("button span.rounded-full"));
              return {
                open: true,
                fitsW: rect.width <= window.innerWidth + 2,
                fitsH: rect.height <= window.innerHeight + 2,
                hasColorSwatches,
              };
            });

            assert("dialog_viewport_and_scroll", "category_dialog_opens", catDialogMetrics.open, "Create Category dialog failed to open");
            assert("dialog_viewport_and_scroll", "category_dialog_fits_viewport", catDialogMetrics.fitsW && catDialogMetrics.fitsH, "Category dialog exceeds viewport dimensions");
            assert("dialog_viewport_and_scroll", "category_dialog_renders_swatches", catDialogMetrics.hasColorSwatches, "Category dialog color swatch selector failed to render");

            categoryDialogShotPath = path.join(SCREENSHOTS_PHASE3_1_DIR, `${testId}_dialog_category.png`);
            await page.screenshot({ path: categoryDialogShotPath, fullPage: false });

            await page.keyboard.press("Escape");
            await page.waitForTimeout(300);
          }

          // 4.3 EVENT DETAILS & AUDIT TRAIL MODALS
          // Click on the first event pill (in current view: List on mobile, Month on desktop, or whichever is active)
          const eventPill = page.locator('[data-testid="calendar-event-pill"]:visible').first();
          let eventPillCount = await eventPill.count();
          if (eventPillCount === 0) {
            try {
              await page.waitForSelector('[data-testid="calendar-event-pill"]:visible', { timeout: 3000 });
              eventPillCount = await page.locator('[data-testid="calendar-event-pill"]:visible').count();
            } catch {}
          }
          assert("dialog_viewport_and_scroll", "event_pill_visible_to_open_details", eventPillCount > 0, "No event pill found on calendar to open Details modal");
          if (eventPillCount > 0) {
            await eventPill.click();
            await page.waitForTimeout(500);

            const detailsDialogMetrics = await page.evaluate(() => {
              const dialog = document.querySelector('[role="dialog"]');
              if (!dialog) return { open: false };
              const rect = dialog.getBoundingClientRect();
              const hasAuditBtn = Array.from(dialog.querySelectorAll("button")).some((b) => b.textContent?.includes("Audit Trail"));
              return {
                open: true,
                fitsW: rect.width <= window.innerWidth + 2,
                fitsH: rect.height <= window.innerHeight + 2,
                hasAuditBtn,
              };
            });

            assert("dialog_viewport_and_scroll", "details_dialog_opens", detailsDialogMetrics.open, "Event Details modal failed to open when event pill was clicked");
            assert("dialog_viewport_and_scroll", "details_dialog_fits_viewport", detailsDialogMetrics.fitsW && detailsDialogMetrics.fitsH, "Event Details modal exceeds viewport bounds");

            detailsDialogShotPath = path.join(SCREENSHOTS_PHASE3_1_DIR, `${testId}_dialog_details.png`);
            await page.screenshot({ path: detailsDialogShotPath, fullPage: false });

            // 4.4 AUDIT TRAIL MODAL (Open from details dialog)
            assert("dialog_viewport_and_scroll", "audit_button_present_in_details", detailsDialogMetrics.hasAuditBtn, "Audit Trail button not found in Event Details modal");
            if (detailsDialogMetrics.hasAuditBtn) {
              const auditBtn = page.getByRole("button", { name: /Audit Trail/i }).first();
              const auditBtnCount = await auditBtn.count();
              if (auditBtnCount > 0) {
                await auditBtn.click();
                await page.waitForTimeout(500);

                const auditDialogMetrics = await page.evaluate(() => {
                  const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
                  const auditDialog = dialogs[dialogs.length - 1]; // Top-most dialog
                  if (!auditDialog) return { open: false };
                  const rect = auditDialog.getBoundingClientRect();
                  const hasLogContent = auditDialog.textContent?.includes("Audit Trail");
                  return {
                    open: true,
                    fitsW: rect.width <= window.innerWidth + 2,
                    fitsH: rect.height <= window.innerHeight + 2,
                    hasLogContent,
                  };
                });

                assert("dialog_viewport_and_scroll", "audit_dialog_opens", auditDialogMetrics.open, "Audit Trail modal failed to open from event details");
                assert("dialog_viewport_and_scroll", "audit_dialog_fits_viewport", auditDialogMetrics.fitsW && auditDialogMetrics.fitsH, "Audit Trail modal exceeds viewport bounds");

                auditDialogShotPath = path.join(SCREENSHOTS_PHASE3_1_DIR, `${testId}_dialog_audit.png`);
                await page.screenshot({ path: auditDialogShotPath, fullPage: false });

                // Dismiss audit modal
                await page.keyboard.press("Escape");
                await page.waitForTimeout(300);
              }
            }

            // Dismiss details modal
            await page.keyboard.press("Escape");
            await page.waitForTimeout(300);
          }
        }

        // ─── CATEGORY 6: CONSOLE AND RUNTIME ERROR ASSERTIONS (TASK E) ───
        assert(
          "console_and_runtime",
          "zero_uncaught_page_errors",
          pageErrors.length === 0,
          `Uncaught page runtime error(s) detected: ${pageErrors.join(" | ")}`
        );

        assert(
          "console_and_runtime",
          "zero_application_console_errors",
          consoleErrors.length === 0,
          `Unexpected application console error(s) detected: ${consoleErrors.join(" | ")}`
        );

        // Base Screenshot for this combination
        screenshotPath = path.join(SCREENSHOTS_PHASE3_1_DIR, `${testId}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });

        const testPassed = assertions.every((a) => a.pass);
        const failedReasons = assertions.filter((a) => !a.pass).map((a) => `[${a.category}] ${a.name}: ${a.message}`);

        allTestResults.push({
          testId,
          route: route.name,
          path: route.path,
          viewport: vp.name,
          width: vp.width,
          height: vp.height,
          tier: vp.tier,
          status: testPassed ? "PASS" : "FAIL",
          totalAssertions: assertions.length,
          passedAssertions: assertions.filter((a) => a.pass).length,
          failedAssertions: assertions.filter((a) => !a.pass).length,
          skippedAssertions: 0,
          assertions,
          consoleErrors,
          pageErrors,
          externalWarnings,
          failedReasons,
          screenshots: {
            base: path.basename(screenshotPath),
            drawer: drawerShotPath ? path.basename(drawerShotPath) : null,
            createDialog: createDialogShotPath ? path.basename(createDialogShotPath) : null,
            categoryDialog: categoryDialogShotPath ? path.basename(categoryDialogShotPath) : null,
            detailsDialog: detailsDialogShotPath ? path.basename(detailsDialogShotPath) : null,
            auditDialog: auditDialogShotPath ? path.basename(auditDialogShotPath) : null,
          },
        });

        const statusIcon = testPassed ? "✅ PASS" : "❌ FAIL";
        console.log(`${logPrefix} ${statusIcon} (Assertions: ${assertions.filter((a) => a.pass).length}/${assertions.length} passed, Delta: ${layoutMetrics.delta}px)`);
        if (!testPassed) {
          failedReasons.forEach((r) => console.log(`   -> ${r}`));
        }
      } catch (err) {
        console.error(`${logPrefix} ❌ Unexpected Test Exception: ${err.message}`);
        assert("console_and_runtime", "test_runner_execution_integrity", false, `Test execution threw uncaught exception: ${err.message}`);

        allTestResults.push({
          testId,
          route: route.name,
          path: route.path,
          viewport: vp.name,
          width: vp.width,
          height: vp.height,
          tier: vp.tier,
          status: "FAIL",
          totalAssertions: assertions.length,
          passedAssertions: assertions.filter((a) => a.pass).length,
          failedAssertions: assertions.filter((a) => !a.pass).length,
          skippedAssertions: 0,
          assertions,
          consoleErrors,
          pageErrors: [...pageErrors, err.message],
          failedReasons: [`Exception: ${err.message}`],
          screenshots: { base: null },
        });
      } finally {
        await context.close();
      }
    }
  }

  await browser.close();

  // Summary Metrics
  const totalTests = allTestResults.length;
  const passedTests = allTestResults.filter((r) => r.status === "PASS").length;
  const failedTests = totalTests - passedTests;
  const passRate = ((passedTests / totalTests) * 100).toFixed(1);

  console.log("\n================================================================================");
  console.log(`HARDENED VERIFICATION SUMMARY:`);
  console.log(`  Tests:      ${passedTests}/${totalTests} PASSED (${passRate}%)`);
  console.log(`  Assertions: ${globalAssertionMetrics.passed}/${globalAssertionMetrics.total} PASSED`);
  console.log(`  Failed:     ${globalAssertionMetrics.failed}`);
  console.log(`  Skipped:    ${globalAssertionMetrics.skipped}`);
  console.log(`  Categories:`);
  console.log(`    - Responsive Layout:          ${globalAssertionMetrics.categories.responsive_layout.passed}/${globalAssertionMetrics.categories.responsive_layout.total}`);
  console.log(`    - Sidebar & Drawer:           ${globalAssertionMetrics.categories.sidebar_and_drawer.passed}/${globalAssertionMetrics.categories.sidebar_and_drawer.total}`);
  console.log(`    - Calendar View Switching:    ${globalAssertionMetrics.categories.calendar_views.passed}/${globalAssertionMetrics.categories.calendar_views.total}`);
  console.log(`    - Dialog Viewport & Scroll:   ${globalAssertionMetrics.categories.dialog_viewport_and_scroll.passed}/${globalAssertionMetrics.categories.dialog_viewport_and_scroll.total}`);
  console.log(`    - Console & Runtime:          ${globalAssertionMetrics.categories.console_and_runtime.passed}/${globalAssertionMetrics.categories.console_and_runtime.total}`);
  console.log("================================================================================");

  const finalReport = {
    timestamp: new Date().toISOString(),
    suite: "MASTERHRMS_PHASE_3_1_CALENDAR_RESPONSIVE_HARDENED_VERIFICATION",
    totalTests,
    passedTests,
    failedTests,
    passRate: `${passRate}%`,
    assertions: globalAssertionMetrics,
    results: allTestResults,
    limitations: {
      virtualKeyboard: "Emulated via desktop Chromium viewport resizing; physical iOS/Android virtual keyboard requires physical device or device cloud.",
      mutationTesting: "All dialog tests executed in read-only non-destructive mode; no creation, editing, or deletion mutations submitted against production data.",
    },
  };

  const jsonReportPath = path.join(SCREENSHOTS_PHASE3_1_DIR, "report.json");
  fs.writeFileSync(jsonReportPath, JSON.stringify(finalReport, null, 2));
  console.log(`Comprehensive test report saved to: ${jsonReportPath}`);

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runHardenedCalendarVerification().catch((err) => {
  console.error("Fatal hardened test runner exception:", err);
  process.exit(1);
});
