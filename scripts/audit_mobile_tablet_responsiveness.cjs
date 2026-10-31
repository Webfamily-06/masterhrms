const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../server/.env") });
const { chromium } = require("playwright");
const { PrismaClient } = require("../server/node_modules/@prisma/client");
const jwt = require("../server/node_modules/jsonwebtoken");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "master-hrms-jwt-super-secret-key-change-this-in-production";
const SCREENSHOTS_DIR = path.join(__dirname, "../docs/Saas/screenshots/responsive_audit");

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });
}

async function auditResponsiveness() {
  console.log("================================================================================");
  console.log("MOBILE & TABLET RESPONSIVE AUDIT");
  console.log("Inspecting: File Manager, ToDo, Gantt, Personal Chat, Group Chat, Call Logs");
  console.log("================================================================================");

  const tenant = (await prisma.tenant.findFirst({ where: { id: "tenant-default-001" } })) || (await prisma.tenant.findFirst());
  const user =
    (await prisma.user.findFirst({ where: { email: "admin@masterhrms.com" } })) ||
    (await prisma.user.findFirst({ where: { profile: { tenantId: tenant.id } } })) ||
    (await prisma.user.findFirst());

  const token = generateToken({
    id: user.id,
    userId: user.id,
    email: user.email,
    tenantId: tenant.id,
    roles: ["admin", "tenant_admin", "hr_admin"],
  });

  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: "mobile_390x844", width: 390, height: 844 },
    { name: "tablet_768x1024", width: 768, height: 1024 },
  ];

  const pagesToAudit = [
    { name: "01_file_manager", url: "http://localhost:3000/tenant/files" },
    { name: "02_todo", url: "http://localhost:3000/tenant/todo" },
    { name: "03_gantt", url: "http://localhost:3000/tenant/todo/gantt" },
    { name: "04_personal_chat", url: "http://localhost:3000/tenant/chat" },
    { name: "05_group_chat", url: "http://localhost:3000/tenant/chat/groups" },
    { name: "06_chat_calls", url: "http://localhost:3000/tenant/chat/calls" },
    { name: "07_call_history", url: "http://localhost:3000/call-history" },
  ];

  for (const vp of viewports) {
    console.log(`\n--- Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1.5,
    });

    await context.addCookies([
      { name: "hrms_auth_token", value: token, domain: "localhost", path: "/" },
    ]);

    await context.addInitScript(
      ({ token, user, tenantId }) => {
        window.localStorage.setItem("hrms_auth_token", token);
        window.localStorage.setItem("token", token);
        window.localStorage.setItem("auth_token", token);
        window.localStorage.setItem("tenantId", tenantId);
        window.localStorage.setItem("user", JSON.stringify(user));
        document.cookie = `hrms_auth_token=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
      },
      {
        token,
        tenantId: tenant.id,
        user: { id: user.id, email: user.email, roles: ["admin", "tenant_admin", "hr_admin"] },
      }
    );

    const page = await context.newPage();

    for (const target of pagesToAudit) {
      try {
        console.log(`Navigating to ${target.name} (${target.url})...`);
        await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 25000 });
        await page.waitForTimeout(3000);

        const shotPath = path.join(SCREENSHOTS_DIR, `${target.name}_${vp.name}.png`);
        await page.screenshot({ path: shotPath, fullPage: false });
        console.log(`  ✓ Saved: ${shotPath}`);
      } catch (err) {
        console.error(`  ✗ Error capturing ${target.name} on ${vp.name}:`, err.message);
      }
    }

    await context.close();
  }

  await browser.close();
  await prisma.$disconnect();
  console.log("\nAudit capture completed! Screenshots stored in docs/Saas/screenshots/responsive_audit/");
}

auditResponsiveness().catch((e) => {
  console.error("Fatal audit error:", e);
  process.exit(1);
});
