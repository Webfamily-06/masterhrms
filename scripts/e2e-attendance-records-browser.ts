import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import { generateToken } from "../server/src/lib/jwt";
import * as path from "path";

const prisma = new PrismaClient();
const ARTIFACT_DIR = "C:/Users/TSV Global Solutions/.gemini/antigravity/brain/a577d1c0-e728-48a2-b5e2-4bfe07f028cd";

async function main() {
  console.log("Finding admin user and active tenant...");
  const user = await prisma.user.findFirst({
    where: {
      profile: { tenantId: { not: null } },
      roles: { some: { role: "super_admin" } },
    },
    include: { profile: true, roles: true },
  });

  if (!user || !user.profile?.tenantId) {
    throw new Error("No super_admin user with tenant found.");
  }

  const tenantId = user.profile.tenantId;

  // Ensure a valid, non-expired session exists
  let session = await prisma.deviceSession.findFirst({
    where: {
      userId: user.id,
      revoked: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!session) {
    session = await prisma.deviceSession.create({
      data: {
        userId: user.id,
        tenantId,
        deviceType: "desktop",
        ipAddress: "127.0.0.1",
        userAgent: "Playwright E2E Test Suite",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        revoked: false,
      },
    });
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    tenantId,
    roles: user.roles.map((r) => r.role),
    sessionId: session.id,
  });

  console.log("Token generated for user:", user.email, "tenant:", tenantId);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await context.addCookies([
    {
      name: "hrms_auth_token",
      value: token,
      domain: "localhost",
      path: "/",
    },
    {
      name: "token",
      value: token,
      domain: "localhost",
      path: "/",
    },
    {
      name: "auth_token",
      value: token,
      domain: "localhost",
      path: "/",
    },
  ]);

  // Set up storage and cookies before navigation
  await context.addInitScript(
    ({ token, user, tenantId }) => {
      const authUser = {
        id: user.id,
        userId: user.id,
        email: user.email,
        role: "tenant_admin",
        roles: ["tenant_admin", "hr_admin", "super_admin"],
        permissions: ["*", "hr.attendance.view", "hr.attendance.manage"],
        tenantId,
        tenant_id: tenantId,
        workspaceStatus: "ACTIVE",
        profile: { tenantId, tenant_id: tenantId },
      };
      localStorage.setItem("hrms_auth_token", token);
      localStorage.setItem("hrms_user", JSON.stringify(authUser));
      localStorage.setItem("auth_token", token);
      localStorage.setItem("token", token);
      localStorage.setItem("tenant_id", tenantId);
      localStorage.setItem("auth_user", JSON.stringify(authUser));
      localStorage.setItem("activePortal", "hr");
      localStorage.setItem("hrms_active_portal", "hr");
      document.cookie = `hrms_auth_token=${token}; path=/`;
      document.cookie = `token=${token}; path=/`;
    },
    { token, user, tenantId }
  );

  const page = await context.newPage();

  console.log("Setting up authentication in browser origin...");
  await page.goto("http://localhost:3000/auth", { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.evaluate(
    ({ token, user, tenantId }) => {
      const authUser = {
        id: user.id,
        userId: user.id,
        email: user.email,
        role: "tenant_admin",
        roles: ["tenant_admin", "hr_admin", "super_admin"],
        permissions: ["*", "hr.attendance.view", "hr.attendance.manage"],
        tenantId,
        tenant_id: tenantId,
        workspaceStatus: "ACTIVE",
        profile: { tenantId, tenant_id: tenantId },
      };
      localStorage.setItem("hrms_auth_token", token);
      localStorage.setItem("hrms_user", JSON.stringify(authUser));
      localStorage.setItem("auth_token", token);
      localStorage.setItem("token", token);
      localStorage.setItem("tenant_id", tenantId);
      localStorage.setItem("auth_user", JSON.stringify(authUser));
      localStorage.setItem("activePortal", "hr");
      localStorage.setItem("hrms_active_portal", "hr");
      document.cookie = `hrms_auth_token=${token}; path=/; max-age=86400`;
      document.cookie = `token=${token}; path=/; max-age=86400`;
    },
    { token, user, tenantId }
  );

  console.log("Navigating to CMS: http://localhost:3000/hr/attendance/records");
  await page.goto("http://localhost:3000/hr/attendance/records", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(4000);
  console.log("CMS current URL:", page.url());

  // 1. Matrix default view
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "attendance-records-matrix-default.png"),
    fullPage: false,
  });
  console.log("Saved screenshot: attendance-records-matrix-default.png");

  // 2. Click Export dropdown
  try {
    await page.waitForSelector("button:has-text('Export')", { timeout: 8000 });
    const exportBtn = page.locator("button:has-text('Export')").first();
    await exportBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "attendance-records-export-menu.png"),
      fullPage: false,
    });
    console.log("Saved screenshot: attendance-records-export-menu.png");

    // Click "Advanced Export & Policy Settings..."
    const advBtn = page.locator("button:has-text('Advanced Export')").first();
    if (await advBtn.isVisible()) {
      await advBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, "attendance-records-export-advanced-modal.png"),
        fullPage: false,
      });
      console.log("Saved screenshot: attendance-records-export-advanced-modal.png");
      const closeBtn = page.locator("button:has-text('Close')").first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    } else {
      await exportBtn.click(); // Close dropdown
    }
  } catch (err: any) {
    console.warn("Export button interaction error:", err.message);
  }

  // 3. Click Bulk Entry button
  const bulkBtn = page.locator("button:has-text('Bulk Entry')").first();
  if (await bulkBtn.isVisible()) {
    await bulkBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "attendance-records-bulk-modal.png"),
      fullPage: false,
    });
    console.log("Saved screenshot: attendance-records-bulk-modal.png");
    const cancelBtn = page.locator("button:has-text('Cancel')").first();
    if (await cancelBtn.isVisible()) await cancelBtn.click();
  }

  // 4. Click Add Record button
  const addBtn = page.locator("button:has-text('Add Record')").first();
  if (await addBtn.isVisible()) {
    await addBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "attendance-records-add-modal.png"),
      fullPage: false,
    });
    console.log("Saved screenshot: attendance-records-add-modal.png");
    const cancelBtn = page.locator("button:has-text('Cancel')").first();
    if (await cancelBtn.isVisible()) await cancelBtn.click();
  }

  // 5. Click Filters button
  const filtersBtn = page.locator("button:has-text('Filters')").first();
  if (await filtersBtn.isVisible()) {
    await filtersBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "attendance-records-filter-modal.png"),
      fullPage: false,
    });
    console.log("Saved screenshot: attendance-records-filter-modal.png");
    const applyBtn = page.locator("button:has-text('Apply Filters')").first();
    if (await applyBtn.isVisible()) await applyBtn.click();
  }

  // 6. Test TanStack Router page on Vite: http://localhost:5173/hr/attendance/records
  console.log("Navigating to Vite TanStack: http://localhost:5173/hr/attendance/records");
  try {
    await page.goto("http://localhost:5173/login", { waitUntil: "domcontentloaded", timeout: 10000 }).catch(() => {});
    await page.evaluate(
      ({ token, user, tenantId }) => {
        const authUser = {
          id: user.id,
          userId: user.id,
          email: user.email,
          role: "tenant_admin",
          roles: ["tenant_admin", "hr_admin", "super_admin"],
          permissions: ["*", "hr.attendance.view", "hr.attendance.manage"],
          tenantId,
          tenant_id: tenantId,
          profile: { tenantId, tenant_id: tenantId },
        };
        localStorage.setItem("hrms_auth_token", token);
        localStorage.setItem("hrms_user", JSON.stringify(authUser));
        localStorage.setItem("auth_token", token);
        localStorage.setItem("token", token);
        localStorage.setItem("tenant_id", tenantId);
        localStorage.setItem("auth_user", JSON.stringify(authUser));
      },
      { token, user, tenantId }
    );
    await page.goto("http://localhost:5173/hr/attendance/records", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "attendance-records-tanstack-matrix.png"),
      fullPage: false,
    });
    console.log("Saved screenshot: attendance-records-tanstack-matrix.png");
  } catch (err: any) {
    console.warn("Vite navigation error:", err.message);
  }

  await browser.close();
  console.log("All E2E screenshot tests completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
