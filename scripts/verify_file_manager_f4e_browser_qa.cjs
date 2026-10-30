const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../server/.env") });
const { chromium } = require("playwright");
const { PrismaClient } = require("../server/node_modules/@prisma/client");
const jwt = require("../server/node_modules/jsonwebtoken");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const ARTIFACT_DIR = "C:\\Users\\TSV Global Solutions\\.gemini\\antigravity\\brain\\29494ee0-4f9e-4896-8c16-14b56e9678b0";
const DOCS_DIR = path.join(__dirname, "../docs/Saas/screenshots/files_f4e");

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });
}

async function runBrowserQA() {
  console.log("================================================================================");
  console.log("PHASE F4-E PLAYWRIGHT BROWSER QA SUITE — FLEET ANALYTICS & CAPACITY FORECASTING");
  console.log("================================================================================");

  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
  if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  const superAdmin = await prisma.user.findFirst({
    where: { roles: { some: { role: "super_admin" } } },
  });

  const tenant = await prisma.tenant.findFirst({
    where: { id: "tenant-default-001" },
  }) || await prisma.tenant.findFirst();

  const tenantUser = await prisma.user.findFirst({
    where: { profile: { tenantId: tenant.id }, roles: { some: { role: "hr_admin" } } },
  }) || await prisma.user.findFirst({
    where: { profile: { tenantId: tenant.id } },
  });

  const superToken = generateToken({
    userId: superAdmin.id,
    id: superAdmin.id,
    email: superAdmin.email,
    roles: ["super_admin"],
  });

  const tenantToken = generateToken({
    userId: tenantUser.id,
    id: tenantUser.id,
    tenantId: tenant.id,
    email: tenantUser.email,
    roles: ["hr_admin", "admin"],
  });

  const browser = await chromium.launch({ headless: true });

  try {
    // -------------------------------------------------------------------------
    // 1. Super Admin: Fleet Storage Analytics & Capacity Forecasting Dashboard
    // -------------------------------------------------------------------------
    console.log("\n1. Navigating to Super Admin Tenant Usage Metrics (/super/tenant-usage-metrics)...");
    const superContext = await browser.newContext({
      viewport: { width: 1550, height: 1000 },
    });
    await superContext.addInitScript(({ token }) => {
      localStorage.setItem("hrms_auth_token", token);
      localStorage.setItem("auth_token", token);
      localStorage.setItem("token", token);
      document.cookie = `hrms_auth_token=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
    }, { token: superToken });

    const superPage = await superContext.newPage();
    await superPage.goto("http://localhost:3000/super/tenant-usage-metrics", { waitUntil: "domcontentloaded" });
    await superPage.waitForTimeout(4000);

    const screen1 = path.join(DOCS_DIR, "01_super_admin_fleet_analytics_dashboard.png");
    await superPage.screenshot({ path: screen1, fullPage: true });
    fs.copyFileSync(screen1, path.join(ARTIFACT_DIR, "01_super_admin_fleet_analytics_dashboard.png"));
    console.log(`Saved screenshot 1: ${screen1}`);

    // -------------------------------------------------------------------------
    // 2. Super Admin: Lookback Window Filter Interaction (7d / 90d)
    // -------------------------------------------------------------------------
    console.log("2. Testing Forecast Lookback Window Filter (7d / 90d)...");
    const btn90d = superPage.locator("button:has-text('90d')").first();
    if (await btn90d.count() > 0) {
      await btn90d.click();
      await superPage.waitForTimeout(2000);
      const screen2 = path.join(DOCS_DIR, "02_super_admin_forecast_window_filter.png");
      await superPage.screenshot({ path: screen2, fullPage: false });
      fs.copyFileSync(screen2, path.join(ARTIFACT_DIR, "02_super_admin_forecast_window_filter.png"));
      console.log(`Saved screenshot 2: ${screen2}`);
    }

    // -------------------------------------------------------------------------
    // 3. Super Admin: Tenant Deep Inspection Modal — Capacity Forecast Tab
    // -------------------------------------------------------------------------
    console.log("3. Opening Capacity Forecast Tab in Tenant Deep Inspection Modal...");
    // Try clicking "Inspect" in the Watchlist first, or fallback to drawer icon
    const watchlistInspectBtn = superPage.locator("button:has-text('Inspect')").first();
    if (await watchlistInspectBtn.count() > 0) {
      await watchlistInspectBtn.click();
      await superPage.waitForTimeout(2500);
    } else {
      const inspectBtn = superPage.locator("button[title='Deep Inspection Drawer']").first();
      if (await inspectBtn.count() > 0) {
        await inspectBtn.click();
        await superPage.waitForTimeout(2000);
      }
      const forecastTabBtn = superPage.locator("button:has-text('Capacity Forecast')").first();
      if (await forecastTabBtn.count() > 0) {
        await forecastTabBtn.click();
        await superPage.waitForTimeout(2000);
      }
    }

    const screen3 = path.join(DOCS_DIR, "03_super_admin_tenant_forecast_modal.png");
    await superPage.screenshot({ path: screen3, fullPage: false });
    fs.copyFileSync(screen3, path.join(ARTIFACT_DIR, "03_super_admin_tenant_forecast_modal.png"));
    console.log(`Saved screenshot 3: ${screen3}`);

    await superContext.close();

    // -------------------------------------------------------------------------
    // 4. Tenant Admin: Storage Administration Page Overview
    // -------------------------------------------------------------------------
    console.log("\n4. Navigating to Tenant Admin Storage Dashboard (/tenant/files/storage)...");
    const tenantContext = await browser.newContext({
      viewport: { width: 1550, height: 1000 },
    });
    await tenantContext.addInitScript(({ token }) => {
      localStorage.setItem("hrms_auth_token", token);
      localStorage.setItem("auth_token", token);
      localStorage.setItem("token", token);
      document.cookie = `hrms_auth_token=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
    }, { token: tenantToken });

    const tenantPage = await tenantContext.newPage();
    await tenantPage.goto("http://localhost:3000/tenant/files/storage", { waitUntil: "domcontentloaded" });
    await tenantPage.waitForTimeout(3500);

    const screen4 = path.join(DOCS_DIR, "04_tenant_admin_storage_overview.png");
    await tenantPage.screenshot({ path: screen4, fullPage: false });
    fs.copyFileSync(screen4, path.join(ARTIFACT_DIR, "04_tenant_admin_storage_overview.png"));
    console.log(`Saved screenshot 4: ${screen4}`);

    // -------------------------------------------------------------------------
    // 5. Tenant Admin: Growth & Forecasting Tab
    // -------------------------------------------------------------------------
    console.log("5. Opening Growth & Forecasting Tab in Tenant Storage Dashboard...");
    const growthTab = tenantPage.locator("button:has-text('Growth & Forecasting')").first();
    if (await growthTab.count() > 0) {
      await growthTab.click();
      await tenantPage.waitForTimeout(2500);

      const screen5 = path.join(DOCS_DIR, "05_tenant_admin_growth_forecast_tab.png");
      await tenantPage.screenshot({ path: screen5, fullPage: false });
      fs.copyFileSync(screen5, path.join(ARTIFACT_DIR, "05_tenant_admin_growth_forecast_tab.png"));
      console.log(`Saved screenshot 5: ${screen5}`);

      // -----------------------------------------------------------------------
      // 6. Tenant Admin: Forecast Lookback Window Toggle
      // -----------------------------------------------------------------------
      console.log("6. Toggling lookback window to 7d...");
      const btn7d = tenantPage.locator("button:has-text('7d')").first();
      if (await btn7d.count() > 0) {
        await btn7d.click();
        await tenantPage.waitForTimeout(2000);

        const screen6 = path.join(DOCS_DIR, "06_tenant_admin_forecast_window_toggle.png");
        await tenantPage.screenshot({ path: screen6, fullPage: false });
        fs.copyFileSync(screen6, path.join(ARTIFACT_DIR, "06_tenant_admin_forecast_window_toggle.png"));
        console.log(`Saved screenshot 6: ${screen6}`);
      }
    }

    await tenantContext.close();

    console.log("\n================================================================================");
    console.log("ALL PLAYWRIGHT BROWSER QA SCREENSHOTS CAPTURED SUCCESSFULLY!");
    console.log("================================================================================");
  } catch (error) {
    console.error("Browser QA Error:", error);
    process.exit(1);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

runBrowserQA();
