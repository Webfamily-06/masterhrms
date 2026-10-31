const path = require("path");
const fs = require("fs");
require("../server/node_modules/dotenv").config({ path: path.join(__dirname, "../server/.env") });
const { chromium } = require("playwright");
const { PrismaClient } = require("../server/node_modules/@prisma/client");
const jwt = require("../server/node_modules/jsonwebtoken");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "1ZYZ7mY+t2XA5DjcbUZrz4bekU+E3s03xfssWUoOtwq+FFBYdNtHhXY4NG8UbL4J";
const SCREENSHOTS_DIR = path.join(__dirname, "../docs/Saas/screenshots/calendar-phase-3-responsive");

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "4h" });
}

const SAMPLE_CATEGORIES = [
  { id: "cat-1", name: "Meetings", color: "bg-teal-600 text-white" },
  { id: "cat-2", name: "Training", color: "bg-blue-600 text-white" },
  { id: "cat-3", name: "Leave & Time Off", color: "bg-amber-600 text-white" },
  { id: "cat-4", name: "Holidays", color: "bg-emerald-600 text-white" },
  { id: "cat-5", name: "Birthdays", color: "bg-rose-600 text-white" },
  { id: "cat-6", name: "General Events", color: "bg-purple-600 text-white" },
];

const now = new Date();
const todayISO = now.toISOString().split("T")[0];

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

async function runCalendarResponsiveVerification() {
  console.log("================================================================================");
  console.log("MASTERHRMS — PHASE 3: CALENDAR RESPONSIVE PLAYWRIGHT VERIFICATION SUITE");
  console.log("Multi-Viewport Verification Across 8 Dimensions and 5 Routes");
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
    console.log("[Info] Database query skipped, using authoritative mock identity.");
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
    { name: "hr_calendar", path: "/hr/calendar", url: "http://localhost:3000/hr/calendar", token: tenantAdminToken, roles: ["admin", "tenant_admin", "hr_admin"] },
    { name: "tenant_calendar", path: "/tenant/calendar", url: "http://localhost:3000/tenant/calendar", token: tenantAdminToken, roles: ["admin", "tenant_admin"] },
    { name: "me_calendar", path: "/me/calendar", url: "http://localhost:3000/me/calendar", token: employeeToken, roles: ["employee", "user"] },
    { name: "canonical_calendar", path: "/calendar", url: "http://localhost:3000/calendar", token: tenantAdminToken, roles: ["admin", "tenant_admin"] },
    { name: "apps_calendar", path: "/apps/calendar", url: "http://localhost:3000/apps/calendar", token: tenantAdminToken, roles: ["admin", "tenant_admin", "hr_admin"] },
  ];

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const vp of TARGET_VIEWPORTS) {
    console.log(`\n================================================================================`);
    console.log(`TESTING VIEWPORT: ${vp.name.toUpperCase()} (${vp.width}x${vp.height} - ${vp.tier})`);
    console.log(`================================================================================`);

    for (const route of TARGET_ROUTES) {
      const testId = `${route.name}_${vp.width}x${vp.height}`;
      const logPrefix = `[${vp.width}x${vp.height}][${route.name}]`;
      const consoleErrors = [];

      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
      });

      await context.addCookies([
        { name: "hrms_auth_token", value: route.token, domain: "localhost", path: "/" },
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
        { token: route.token, roles: route.roles, tenantId }
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

      page.on("console", (msg) => {
        if (msg.type() === "error") {
          const text = msg.text();
          if (
            !text.includes("favicon") &&
            !text.includes("404") &&
            !text.includes("Download the React DevTools") &&
            !text.includes("WebSocket")
          ) {
            consoleErrors.push(text);
          }
        }
      });

      try {
        console.log(`${logPrefix} Navigating to ${route.url}...`);
        await page.goto(route.url, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.waitForTimeout(1200);

        // 1. Horizontal Overflow Audit
        const overflowMetrics = await page.evaluate(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
          const clientW = docEl.clientWidth;
          const delta = scrollW - clientW;
          return {
            scrollWidth: scrollW,
            clientWidth: clientW,
            hasHorizontalOverflow: delta > 2,
            delta,
          };
        });

        // 2. Component Inspection
        const componentMetrics = await page.evaluate((isDesktop) => {
          // Check Desktop Calendar Sidebar Aside
          const asideEl = document.querySelector('[data-testid="calendar-sidebar"]');
          let asideVisible = false;
          if (asideEl) {
            const style = window.getComputedStyle(asideEl);
            asideVisible = style.display !== "none" && style.visibility !== "hidden" && asideEl.offsetWidth > 0;
          }

          // Check Mobile Filter button
          const filterBtn = document.querySelector('button[aria-label*="Filters"]');
          let filterBtnVisible = false;
          if (filterBtn) {
            const style = window.getComputedStyle(filterBtn);
            filterBtnVisible = style.display !== "none" && style.visibility !== "hidden";
          }

          // Check View Mode Buttons (Month, Week, Day, List)
          const allButtons = Array.from(document.querySelectorAll("button"));
          const viewButtons = allButtons.filter((b) => ["Month", "Week", "Day", "List"].includes(b.textContent?.trim() || ""));

          return {
            asideVisible,
            filterBtnVisible,
            viewButtonsCount: viewButtons.length,
          };
        }, vp.isDesktop || false);

        // 3. Validation Logic per Viewport Tier
        let passed = true;
        const failureReasons = [];

        if (overflowMetrics.hasHorizontalOverflow) {
          passed = false;
          failureReasons.push(`Horizontal overflow detected: scrollWidth (${overflowMetrics.scrollWidth}px) > clientWidth (${overflowMetrics.clientWidth}px) by ${overflowMetrics.delta}px`);
        }

        if (vp.width < 1024) {
          // Under 1024px: Sidebar aside should be hidden, mobile filter button should be visible
          if (componentMetrics.asideVisible) {
            passed = false;
            failureReasons.push(`Desktop sidebar <aside> should be hidden on < 1024px viewport (found visible)`);
          }
          if (!componentMetrics.filterBtnVisible) {
            passed = false;
            failureReasons.push(`Mobile filter drawer trigger button not visible on < 1024px viewport`);
          }
        } else {
          // >= 1024px: Desktop sidebar should be visible
          if (!componentMetrics.asideVisible) {
            passed = false;
            failureReasons.push(`Desktop sidebar <aside> should be visible on >= 1024px viewport`);
          }
        }

        // 4. Interactive Test: Test Drawer on Mobile/Tablet
        let drawerTested = false;
        if (vp.width < 1024 && componentMetrics.filterBtnVisible) {
          const filterBtn = await page.$('button[aria-label*="Filters"]');
          if (filterBtn) {
            await filterBtn.click();
            await page.waitForTimeout(500);

            const drawerMetrics = await page.evaluate(() => {
              const sheetEl = document.querySelector('[role="dialog"]');
              if (!sheetEl) return { found: false };
              const titleEl = sheetEl.querySelector("h2, [class*='SheetTitle']");
              const hasCreateBtn = Array.from(sheetEl.querySelectorAll("button")).some((b) => b.textContent?.includes("Create"));
              return {
                found: true,
                title: titleEl?.textContent || "",
                hasCreateBtn,
              };
            });

            if (drawerMetrics.found && drawerMetrics.hasCreateBtn) {
              drawerTested = true;
              // Take screenshot of drawer
              if (route.name === "hr_calendar") {
                const drawerShotPath = path.join(SCREENSHOTS_DIR, `${testId}_drawer.png`);
                await page.screenshot({ path: drawerShotPath, fullPage: false });
              }
            }

            // Close drawer with Escape or close button
            await page.keyboard.press("Escape");
            await page.waitForTimeout(300);
          }
        }

        // 5. Interactive Test: Test View switching (Month -> Week -> Day -> List) on hr_calendar
        let viewsTested = false;
        if (route.name === "hr_calendar") {
          try {
            // Test Week view
            const weekBtn = await page.getByRole("button", { name: "Week" }).first();
            if (weekBtn) {
              await weekBtn.click();
              await page.waitForTimeout(400);
            }

            // Test Day view
            const dayBtn = await page.getByRole("button", { name: "Day" }).first();
            if (dayBtn) {
              await dayBtn.click();
              await page.waitForTimeout(400);
            }

            // Test List view
            const listBtn = await page.getByRole("button", { name: "List" }).first();
            if (listBtn) {
              await listBtn.click();
              await page.waitForTimeout(400);
            }

            // Switch back to Month view
            const monthBtn = await page.getByRole("button", { name: "Month" }).first();
            if (monthBtn) {
              await monthBtn.click();
              await page.waitForTimeout(400);
              viewsTested = true;
            }
          } catch (e) {
            // non-fatal view switch check
          }
        }

        // 6. Interactive Test: Test Create Event Dialog on hr_calendar
        let dialogTested = false;
        if (route.name === "hr_calendar") {
          try {
            if (vp.width >= 1024) {
              const createBtn = await page.getByRole("button", { name: "Create New Event" }).first();
              if (createBtn) {
                await createBtn.click();
                await page.waitForTimeout(500);

                const dialogCheck = await page.evaluate(() => {
                  const dialogEl = document.querySelector('[role="dialog"]');
                  if (!dialogEl) return { open: false };
                  const rect = dialogEl.getBoundingClientRect();
                  return {
                    open: true,
                    width: rect.width,
                    height: rect.height,
                    fitsViewport: rect.width <= window.innerWidth && rect.height <= window.innerHeight,
                  };
                });

                if (dialogCheck.open && dialogCheck.fitsViewport) {
                  dialogTested = true;
                  const dialogShotPath = path.join(SCREENSHOTS_DIR, `${testId}_dialog.png`);
                  await page.screenshot({ path: dialogShotPath, fullPage: false });
                }

                await page.keyboard.press("Escape");
                await page.waitForTimeout(300);
              }
            }
          } catch (e) {
            // non-fatal
          }
        }

        // 7. Base Screenshot
        const screenshotPath = path.join(SCREENSHOTS_DIR, `${testId}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });

        const resultItem = {
          testId,
          route: route.name,
          path: route.path,
          viewport: vp.name,
          width: vp.width,
          height: vp.height,
          tier: vp.tier,
          scrollWidth: overflowMetrics.scrollWidth,
          clientWidth: overflowMetrics.clientWidth,
          hasHorizontalOverflow: overflowMetrics.hasHorizontalOverflow,
          asideVisible: componentMetrics.asideVisible,
          filterBtnVisible: componentMetrics.filterBtnVisible,
          drawerTested,
          viewsTested,
          dialogTested,
          passed,
          failureReasons,
          screenshot: path.basename(screenshotPath),
        };

        results.push(resultItem);

        const statusIcon = passed ? "✅ PASS" : "❌ FAIL";
        console.log(`${logPrefix} ${statusIcon} (Scroll: ${overflowMetrics.scrollWidth}px, Client: ${overflowMetrics.clientWidth}px, Aside: ${componentMetrics.asideVisible}, FilterBtn: ${componentMetrics.filterBtnVisible})`);
        if (!passed) {
          failureReasons.forEach((r) => console.log(`   -> Error: ${r}`));
        }
      } catch (err) {
        console.error(`${logPrefix} ❌ Exception: ${err.message}`);
        results.push({
          testId,
          route: route.name,
          path: route.path,
          viewport: vp.name,
          width: vp.width,
          height: vp.height,
          tier: vp.tier,
          passed: false,
          failureReasons: [`Exception: ${err.message}`],
          screenshot: null,
        });
      } finally {
        await context.close();
      }
    }
  }

  await browser.close();

  // Summary Metrics
  const total = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = total - passedCount;
  const passRate = ((passedCount / total) * 100).toFixed(1);

  console.log("\n================================================================================");
  console.log(`EXECUTION SUMMARY: ${passedCount}/${total} PASSED (${passRate}%)`);
  console.log("================================================================================");

  const reportData = {
    timestamp: new Date().toISOString(),
    totalTests: total,
    passedCount,
    failedCount,
    passRate: `${passRate}%`,
    results,
  };

  const jsonReportPath = path.join(__dirname, "../docs/Saas/screenshots/calendar-phase-3-responsive/report.json");
  fs.writeFileSync(jsonReportPath, JSON.stringify(reportData, null, 2));
  console.log(`Results saved to: ${jsonReportPath}`);

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runCalendarResponsiveVerification().catch((err) => {
  console.error("Fatal test suite runner error:", err);
  process.exit(1);
});
