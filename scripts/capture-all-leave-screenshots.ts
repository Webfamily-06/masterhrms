import { chromium } from "playwright";
import * as path from "path";

const AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLWhyLTAwMSIsImVtYWlsIjoiaHJAbWFzdGVyaHJtcy5jb20iLCJ0ZW5hbnRJZCI6InRlbmFudC1kZWZhdWx0LTAwMSIsInJvbGVzIjpbImhyX2FkbWluIl0sInNlc3Npb25JZCI6ImM1N2RkNGMxLTE3MDItNGIyNi1hY2NkLWNlMzMzYTEwYjQ0OSIsImlhdCI6MTc5NDU5MDg3MCwiZXhwIjoxNzk1MTk1NjcwfQ.uShD6MX0szn0P5QSUIkLjjHkCPPYrEMXbmU8SZE8FWE";
const ARTIFACTS_DIR = "/Users/apple/.gemini/antigravity/brain/049ca62f-54ae-41db-8e33-56592f9d43cc";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await context.addInitScript(({ token }) => {
    localStorage.setItem("token", token);
    localStorage.setItem("auth_token", token);
    localStorage.setItem("hrms_auth_token", token);
    localStorage.setItem("theme", "light");
    localStorage.setItem("tenantId", "tenant-default-001");
    localStorage.setItem("user", JSON.stringify({
      id: "user-hr-001",
      email: "hr@masterhrms.com",
      name: "HR Manager",
      roles: ["hr_admin"],
      tenantId: "tenant-default-001"
    }));
    document.documentElement.classList.remove("dark");
    document.documentElement.setAttribute("data-theme", "light");
  }, { token: AUTH_TOKEN });

  const page = await context.newPage();

  const ensureLight = async () => {
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("theme", "light");
    });
  };

  const pages = [
    { route: "/hr/leave/applications", name: "leave-applications" },
    { route: "/hr/leave/balances", name: "leave-balances" },
    { route: "/hr/leave/types", name: "leave-types" },
    { route: "/hr/leave/policies", name: "leave-policies" },
  ];

  // TanStack Start
  for (const p of pages) {
    try {
      console.log(`Navigating to TanStack: http://localhost:5173${p.route}`);
      await page.goto(`http://localhost:5173${p.route}`, { waitUntil: "domcontentloaded", timeout: 15000 });
      await ensureLight();
      await page.waitForTimeout(2500);
      const outPath = path.join(ARTIFACTS_DIR, `current-tanstack-${p.name}.png`);
      await page.screenshot({ path: outPath, fullPage: true });
      console.log(`Saved: ${outPath}`);
    } catch (e) {
      console.error(`Error capturing TanStack ${p.route}:`, e);
    }
  }

  // Next.js CMS
  for (const p of pages) {
    try {
      console.log(`Navigating to CMS: http://localhost:3000${p.route}`);
      await page.goto(`http://localhost:3000${p.route}`, { waitUntil: "domcontentloaded", timeout: 15000 });
      await ensureLight();
      await page.waitForTimeout(2500);
      const outPath = path.join(ARTIFACTS_DIR, `current-cms-${p.name}.png`);
      await page.screenshot({ path: outPath, fullPage: true });
      console.log(`Saved: ${outPath}`);
    } catch (e) {
      console.error(`Error capturing CMS ${p.route}:`, e);
    }
  }

  await browser.close();
  console.log("All screenshots captured successfully.");
}

main().catch(console.error);
