const { chromium } = require('playwright');
const jwt = require('jsonwebtoken');

const JWT_SECRET = "master-hrms-jwt-super-secret-key-change-this-in-production";
const tenantId = "tenant-default-001";
const userId = "user-hr-001";
const sessionId = "850fb32a-0ced-4ebe-9220-3273f653f3fb";

const validToken = jwt.sign({
  userId,
  email: "hr@masterhrms.com",
  tenantId,
  roles: ["HR_MANAGER", "ADMIN"],
  sessionId
}, JWT_SECRET, { algorithm: "HS256", expiresIn: "2h" });

const userObj = {
  id: userId,
  email: "hr@masterhrms.com",
  firstName: "Sarah",
  lastName: "Jenkins",
  roles: ["HR_MANAGER", "ADMIN"],
  tenantId,
  organizationId: tenantId
};

async function testCanvasText() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.addInitScript(({ token, user }) => {
    localStorage.setItem("token", token);
    localStorage.setItem("hrms_auth_token", token);
    localStorage.setItem("hrms_user", JSON.stringify(user));
  }, { token: validToken, user: userObj });

  await page.goto("http://localhost:3000/hr/organization/certificate-designer/sys-tpl-apprec-01", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#certificate-canvas", { timeout: 15000 });
  await page.waitForTimeout(2000);

  const canvasText = await page.$eval('#certificate-canvas', el => el.innerText);
  console.log("ACTUAL CANVAS TEXT:\n---START---\n" + canvasText + "\n---END---");

  await browser.close();
}

testCanvasText().catch(console.error);

