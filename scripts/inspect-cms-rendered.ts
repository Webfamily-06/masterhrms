import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import { generateToken } from "../server/src/lib/jwt";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { profile: { tenantId: { not: null } } },
    include: { profile: true, roles: true },
  });

  const tenantId = user!.profile!.tenantId!;

  let session = await prisma.deviceSession.findFirst({
    where: { userId: user!.id, revoked: false, expiresAt: { gt: new Date() } },
  });
  if (!session) {
    session = await prisma.deviceSession.create({
      data: {
        userId: user!.id,
        tenantId,
        deviceType: "desktop",
        expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    });
  }

  const token = generateToken({
    userId: user!.id,
    email: user!.email,
    tenantId,
    roles: user!.roles.map((r) => r.role),
    sessionId: session.id,
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addCookies([
    { name: "hrms_auth_token", value: token, domain: "localhost", path: "/" },
    { name: "token", value: token, domain: "localhost", path: "/" },
  ]);

  const page = await context.newPage();
  await page.goto("http://localhost:3000/auth", { waitUntil: "domcontentloaded" });
  await page.evaluate(({ token, user, tenantId }) => {
    localStorage.setItem("hrms_auth_token", token);
    localStorage.setItem("token", token);
    localStorage.setItem("tenant_id", tenantId);
    document.cookie = `hrms_auth_token=${token}; path=/; max-age=86400`;
  }, { token, user, tenantId });

  await page.goto("http://localhost:3000/hr/attendance/records", { waitUntil: "networkidle" });
  console.log("URL:", page.url());
  console.log("Title:", await page.title());
  const bodyText = await page.innerText("body");
  console.log("Body text snippet:\n", bodyText.slice(0, 400));

  await browser.close();
}

main().catch(console.error).finally(() => prisma.$disconnect());
