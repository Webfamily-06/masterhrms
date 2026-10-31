const path = require("path");
const fs = require("fs");
require("../server/node_modules/dotenv").config({ path: path.join(__dirname, "../server/.env") });
const { chromium } = require("playwright");
const { PrismaClient } = require("../server/node_modules/@prisma/client");
const jwt = require("../server/node_modules/jsonwebtoken");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "master-hrms-jwt-super-secret-key-change-this-in-production";
const SCREENSHOTS_DIR = path.join(__dirname, "../docs/Saas/screenshots/wave1_verification");

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });
}

async function runResponsiveVerification() {
  console.log("================================================================================");
  console.log("MASTERHRMS — PHASE 2 / WAVE 1: PLAYWRIGHT VERIFICATION SUITE");
  console.log("Foundational Layouts & Breakpoint Standardization Acceptance");
  console.log("================================================================================");

  // 1. Prepare Tenant & User Credentials
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
    console.log("[Info] Database query skipped, using authoritative mock test identity.");
  }

  const tenantAdminToken = generateToken({
    id: adminUserId,
    userId: adminUserId,
    email: adminEmail,
    tenantId,
    roles: ["admin", "tenant_admin", "hr_admin"],
  });

  const superAdminToken = generateToken({
    id: "32255e7f-42d6-46ac-af56-29d7f57e9bd4",
    userId: "32255e7f-42d6-46ac-af56-29d7f57e9bd4",
    email: "superadmin@masterhrms.com",
    roles: ["super_admin"],
    tenantId: null,
  });

  const employeeToken = generateToken({
    id: adminUserId,
    userId: adminUserId,
    email: "employee@masterhrms.com",
    tenantId,
    roles: ["employee", "user"],
  });

  const TARGET_VIEWPORTS = [
    { name: "mobile_small_360", width: 360, height: 800, isMobile: true },
    { name: "mobile_standard_390", width: 390, height: 844, isMobile: true },
    { name: "tablet_portrait_768", width: 768, height: 1024, isTablet: true },
    { name: "legacy_boundary_992", width: 992, height: 768, isTablet: true },
    { name: "tablet_max_1023", width: 1023, height: 768, isTablet: true },
    { name: "desktop_min_1024", width: 1024, height: 768, isDesktop: true },
    { name: "laptop_1280", width: 1280, height: 800, isDesktop: true },
    { name: "desktop_standard_1440", width: 1440, height: 900, isDesktop: true },
  ];

  const TARGET_ROUTES = [
    { name: "super_dashboard", url: "http://localhost:3000/super", token: superAdminToken, roles: ["super_admin"], isSuper: true },
    { name: "super_settings", url: "http://localhost:3000/super/settings", token: superAdminToken, roles: ["super_admin"], isSuper: true },
    { name: "hr_dashboard", url: "http://localhost:3000/hr/dashboard", token: tenantAdminToken, roles: ["admin", "tenant_admin", "hr_admin"] },
    { name: "hr_employees", url: "http://localhost:3000/hr/employees", token: tenantAdminToken, roles: ["admin", "tenant_admin", "hr_admin"] },
    { name: "hr_calendar", url: "http://localhost:3000/hr/calendar", token: tenantAdminToken, roles: ["admin", "tenant_admin", "hr_admin"] },
    { name: "me_dashboard", url: "http://localhost:3000/me/dashboard", token: employeeToken, roles: ["employee", "user"] },
    { name: "tenant_dashboard", url: "http://localhost:3000/tenant/dashboard", token: tenantAdminToken, roles: ["admin", "tenant_admin"] },
  ];

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const vp of TARGET_VIEWPORTS) {
    console.log(`\n================================================================================`);
    console.log(`TESTING VIEWPORT: ${vp.name.toUpperCase()} (${vp.width}x${vp.height})`);
    console.log(`================================================================================`);

    for (const route of TARGET_ROUTES) {
      const testId = `${route.name}_${vp.width}x${vp.height}`;
      const logPrefix = `[${vp.width}x${vp.height}][${route.name}]`;
      const consoleErrors = [];
      const failedRequests = [];

      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
      });

      await context.addCookies([
        { name: "hrms_auth_token", value: route.token, domain: "localhost", path: "/" },
      ]);

      await context.addInitScript(
        ({ token, roles, tenantId, isSuper }) => {
          const userObj = {
            id: isSuper ? "usr-super" : "usr-test",
            email: isSuper ? "super@masterhrms.com" : "admin@masterhrms.com",
            roles,
            permissions: ["*"],
            enabledModules: ["*"],
            tenantId: isSuper ? null : (tenantId || "ten-001"),
          };
          window.localStorage.setItem("hrms_auth_token", token);
          window.localStorage.setItem("token", token);
          window.localStorage.setItem("auth_token", token);
          window.localStorage.setItem("hrms_user", JSON.stringify(userObj));
          window.localStorage.setItem("user", JSON.stringify(userObj));
          window.localStorage.setItem("tenantId", isSuper ? "" : (tenantId || "ten-001"));
          document.cookie = `hrms_auth_token=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
        },
        { token: route.token, roles: route.roles, tenantId: route.isSuper ? null : tenantId, isSuper: Boolean(route.isSuper) }
      );

      const page = await context.newPage();

      await page.route("**/api/auth/me", (r) => {
        r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: route.isSuper ? "usr-super" : "usr-test",
            email: route.isSuper ? "super@masterhrms.com" : "admin@masterhrms.com",
            roles: route.roles,
            permissions: ["*"],
            enabledModules: ["hrm", "hrms", "pos", "crm", "finance", "accounting", "inventory", "recruitment", "attendance", "payroll"],
            profile: {
              fullName: route.isSuper ? "Super Administrator" : "Workspace Administrator",
              tenantId: route.isSuper ? null : (tenantId || "ten-001"),
              tenant: route.isSuper ? null : { id: tenantId || "ten-001", name: "Acme Corp", slug: "acme" }
            }
          })
        });
      });

      await page.route("**/api/workspace/subscription", (r) => {
        r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "active",
            planName: "Enterprise SaaS Tier",
            isExpired: false,
            expiresAt: "2099-12-31T23:59:59.000Z"
          })
        });
      });

      await page.route("**/api/system/maintenance-status", (r) => {
        r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            active: false,
            status: "inactive"
          })
        });
      });

      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });

      page.on("requestfailed", (req) => {
        // Exclude optional external fonts or aborted navigations
        if (!req.url().includes("fonts.gstatic.com") && !req.url().includes("favicon")) {
          failedRequests.push(`${req.method()} ${req.url()}: ${req.failure()?.errorText}`);
        }
      });

      try {
        console.log(`${logPrefix} Navigating to ${route.url}...`);
        await page.goto(route.url, { waitUntil: "domcontentloaded", timeout: 20000 });
        
        // Wait for shell navigation controls to hydrate
        if (vp.width < 1024) {
          try {
            await page.waitForSelector("#mobile_btn, .mobile-btn", { timeout: 8000 });
          } catch {}
        } else {
          try {
            await page.waitForSelector(".sidebar, #sidebar", { timeout: 8000 });
          } catch {}
        }
        await page.waitForTimeout(500);

        // 1. Check Root Viewport Meta Tag
        const viewportMeta = await page.$eval('meta[name="viewport"]', (el) => el.getAttribute("content")).catch(() => null);
        const hasDeviceWidth = Boolean(viewportMeta && viewportMeta.includes("width=device-width"));

        // 2. Measure Horizontal Overflow
        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth - window.innerWidth;
        });
        const hasNoPageOverflow = overflow <= 1; // 1px rounding tolerance

        // 3. Check Hamburger Visibility
        const hamburgerBtn = await page.$("#mobile_btn, .mobile-btn");
        let isHamburgerVisible = false;
        if (hamburgerBtn) {
          isHamburgerVisible = await hamburgerBtn.isVisible();
        }

        // 4. Check Sidebar Position & Visibility
        const sidebar = await page.$(".sidebar, #sidebar");
        let sidebarBox = null;
        let isSidebarPersistent = false;
        if (sidebar) {
          sidebarBox = await sidebar.boundingBox();
          isSidebarPersistent = (await sidebar.isVisible()) && sidebarBox && sidebarBox.x >= 0;
        }

        // 5. Breakpoint Contract Verification:
        // On < 1024px: Hamburger must be visible; Persistent sidebar must NOT be docked on canvas.
        // On >= 1024px: Hamburger must be hidden; Persistent sidebar MUST be docked on canvas.
        const isBelow1024 = vp.width < 1024;
        let breakpointContractPassed = false;

        if (isBelow1024) {
          breakpointContractPassed = isHamburgerVisible && (!sidebarBox || sidebarBox.x < 0 || !isSidebarPersistent);
        } else {
          breakpointContractPassed = !isHamburgerVisible && isSidebarPersistent;
        }

        // 6. Interactive Drawer Test (on < 1024px)
        let drawerOpenSuccess = false;
        let backdropDismissSuccess = false;
        let escapeDismissSuccess = false;

        if (isBelow1024 && hamburgerBtn && isHamburgerVisible) {
          // A. Click Hamburger to Open
          await hamburgerBtn.click();
          await page.waitForTimeout(400);

          const isOpened = await page.evaluate(() => {
            return document.body.classList.contains("slide-nav") ||
              Boolean(document.querySelector(".sidebar.opened, .sidebar-overlay.opened"));
          });
          drawerOpenSuccess = isOpened;

          // Capture Drawer Opened Screenshot
          const drawerShot = path.join(SCREENSHOTS_DIR, `${testId}_drawer_opened.png`);
          await page.screenshot({ path: drawerShot, fullPage: false });

          // B. Test Backdrop Dismissal
          const overlay = await page.$(".sidebar-overlay");
          if (overlay && (await overlay.isVisible())) {
            // Click top-right corner of backdrop outside drawer
            await page.mouse.click(vp.width - 20, 100);
            await page.waitForTimeout(400);

            const isClosedAfterBackdrop = await page.evaluate(() => {
              return !document.body.classList.contains("slide-nav");
            });
            backdropDismissSuccess = isClosedAfterBackdrop;
          }

          // C. Test Escape Key Dismissal
          await hamburgerBtn.click();
          await page.waitForTimeout(400);
          await page.keyboard.press("Escape");
          await page.waitForTimeout(400);

          const isClosedAfterEscape = await page.evaluate(() => {
            return !document.body.classList.contains("slide-nav");
          });
          escapeDismissSuccess = isClosedAfterEscape;
        } else {
          // Not applicable on desktop
          drawerOpenSuccess = true;
          backdropDismissSuccess = true;
          escapeDismissSuccess = true;
        }

        // Capture Standard Viewport Screenshot
        const screenshotPath = path.join(SCREENSHOTS_DIR, `${testId}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });

        const testPassed =
          hasDeviceWidth &&
          hasNoPageOverflow &&
          breakpointContractPassed &&
          drawerOpenSuccess &&
          backdropDismissSuccess &&
          escapeDismissSuccess;

        results.push({
          testId,
          route: route.name,
          viewport: vp.name,
          width: vp.width,
          height: vp.height,
          hasDeviceWidth,
          overflow,
          hasNoPageOverflow,
          isHamburgerVisible,
          isSidebarPersistent,
          breakpointContractPassed,
          drawerOpenSuccess,
          backdropDismissSuccess,
          escapeDismissSuccess,
          consoleErrorsCount: consoleErrors.length,
          failedRequestsCount: failedRequests.length,
          passed: testPassed,
          screenshot: screenshotPath,
        });

        console.log(`${logPrefix} ${testPassed ? "✓ PASS" : "✗ FAIL"} | Overflow: ${overflow}px | Hamburger: ${isHamburgerVisible} | SidebarDocked: ${isSidebarPersistent} | Contract: ${breakpointContractPassed}`);
      } catch (err) {
        console.error(`${logPrefix} ✗ ERROR: ${err.message}`);
        results.push({
          testId,
          route: route.name,
          viewport: vp.name,
          width: vp.width,
          height: vp.height,
          error: err.message,
          passed: false,
        });
      } finally {
        await context.close();
      }
    }
  }

  await browser.close();

  // Print Summary Table
  console.log("\n================================================================================");
  console.log("PLAYWRIGHT MULTI-VIEWPORT VERIFICATION SUMMARY");
  console.log("================================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`Total Runs: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

  // Write Results JSON
  const resultsJsonPath = path.join(__dirname, "../docs/Saas/screenshots/wave1_verification/results.json");
  fs.writeFileSync(resultsJsonPath, JSON.stringify(results, null, 2));
  console.log(`Results written to: ${resultsJsonPath}`);

  if (failed > 0) {
    console.log("\nFAILED TESTS:");
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`  - ${r.testId}: Overflow=${r.overflow}px, Contract=${r.breakpointContractPassed}, DrawerOpen=${r.drawerOpenSuccess}, Backdrop=${r.backdropDismissSuccess}`);
    });
    process.exit(1);
  } else {
    console.log("\nALL 56 VIEWPORT ACCEPTANCE TESTS PASSED (100%)!");
  }
}

runResponsiveVerification().catch((err) => {
  console.error("Verification script error:", err);
  process.exit(1);
});
