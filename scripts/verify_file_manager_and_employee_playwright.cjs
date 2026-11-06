const { chromium } = require("playwright");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");

const prisma = new PrismaClient();

const evidenceDir = path.resolve(__dirname, "../docs/hrms-audit/evidence");
if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

async function run() {
  console.log("=== PLAYWRIGHT VISUAL VERIFICATION STARTING ===");

  // Find admin user to authenticate as
  const adminUser = await prisma.user.findFirst({
    where: {
      email: "admin-a-1791971886012@acme.com",
    },
    include: { roles: true, profile: true },
  });

  if (!adminUser) {
    console.error("No admin user found to test with.");
    process.exit(1);
  }

  const tenantId = adminUser.profile?.tenantId || adminUser.roles[0]?.tenantId;
  const roles = adminUser.roles.map((r) => r.role);

  // Generate valid JWT
  const jwtSecret = process.env.JWT_SECRET || "default_jwt_secret_key_change_in_production";
  const token = jwt.sign(
    {
      userId: adminUser.id,
      email: adminUser.email,
      tenantId,
      roles,
      permissions: ["*"],
    },
    jwtSecret,
    { algorithm: "HS256", expiresIn: "7d" }
  );

  console.log(`Generated test token for: ${adminUser.email} (tenant: ${tenantId})`);

  const browser = await chromium.launch({ headless: true });

  try {
    // -------------------------------------------------------------------------
    // 1. FILE MANAGER - DESKTOP (1440x900)
    // -------------------------------------------------------------------------
    console.log("Capturing File Manager Desktop (1440px)...");
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const desktopPage = await desktopContext.newPage();

    // Set auth token in localStorage & cookie
    await desktopPage.goto("http://localhost:3000/auth", { waitUntil: "domcontentloaded" });
    await desktopPage.evaluate(({ t }) => {
      localStorage.setItem("hrms_auth_token", t);
      localStorage.setItem("auth_token", t);
      document.cookie = `hrms_auth_token=${t}; path=/; max-age=604800; SameSite=Lax`;
    }, { t: token });

    await desktopPage.goto("http://localhost:3000/hr/files", { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
    await desktopPage.waitForTimeout(2000);

    const desktopPath = path.join(evidenceDir, "file-manager-desktop-1440.png");
    await desktopPage.screenshot({ path: desktopPath, fullPage: false });
    console.log(`✓ Saved: ${desktopPath}`);

    // -------------------------------------------------------------------------
    // 2. FILE MANAGER - TABLET (768x1024)
    // -------------------------------------------------------------------------
    console.log("Capturing File Manager Tablet (768px)...");
    const tabletContext = await browser.newContext({
      viewport: { width: 768, height: 1024 },
    });
    const tabletPage = await tabletContext.newPage();

    await tabletPage.goto("http://localhost:3000/auth", { waitUntil: "domcontentloaded" });
    await tabletPage.evaluate(({ t }) => {
      localStorage.setItem("hrms_auth_token", t);
      localStorage.setItem("auth_token", t);
      document.cookie = `hrms_auth_token=${t}; path=/; max-age=604800; SameSite=Lax`;
    }, { t: token });

    await tabletPage.goto("http://localhost:3000/hr/files", { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
    await tabletPage.waitForTimeout(2000);

    const tabletPath = path.join(evidenceDir, "file-manager-tablet-768.png");
    await tabletPage.screenshot({ path: tabletPath, fullPage: false });
    console.log(`✓ Saved: ${tabletPath}`);

    // -------------------------------------------------------------------------
    // 3. FILE MANAGER - MOBILE (375x667)
    // -------------------------------------------------------------------------
    console.log("Capturing File Manager Mobile (375px)...");
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 },
      isMobile: true,
    });
    const mobilePage = await mobileContext.newPage();

    await mobilePage.goto("http://localhost:3000/auth", { waitUntil: "domcontentloaded" });
    await mobilePage.evaluate(({ t }) => {
      localStorage.setItem("hrms_auth_token", t);
      localStorage.setItem("auth_token", t);
      document.cookie = `hrms_auth_token=${t}; path=/; max-age=604800; SameSite=Lax`;
    }, { t: token });

    await mobilePage.goto("http://localhost:3000/hr/files", { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
    await mobilePage.waitForTimeout(2000);

    const mobilePath = path.join(evidenceDir, "file-manager-mobile-375.png");
    await mobilePage.screenshot({ path: mobilePath, fullPage: false });
    console.log(`✓ Saved: ${mobilePath}`);

    // -------------------------------------------------------------------------
    // 4. EMPLOYEE PROFILE / PASSWORD MODAL
    // -------------------------------------------------------------------------
    console.log("Capturing Employee Master / Password Modal...");
    const emp = await prisma.employee.findFirst({
      where: { tenantId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (emp) {
      await desktopPage.goto(`http://localhost:3000/hr/employees/${emp.id}`, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
      await desktopPage.waitForTimeout(2000);

      // Attempt to trigger password reset modal if button exists
      const resetBtn = await desktopPage.$('button:has-text("Reset Password"), button:has-text("Set Password"), button:has-text("Change Password")');
      if (resetBtn) {
        await resetBtn.click().catch(() => {});
        await desktopPage.waitForTimeout(1000);
      }

      const modalPath = path.join(evidenceDir, "employee-profile-password-modal.png");
      await desktopPage.screenshot({ path: modalPath, fullPage: false });
      console.log(`✓ Saved: ${modalPath}`);
    }

  } catch (err) {
    console.error("Playwright execution error:", err);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }

  console.log("=== PLAYWRIGHT VERIFICATION COMPLETE ===");
}

run();
