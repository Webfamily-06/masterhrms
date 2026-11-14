import { chromium } from "playwright";

const AUTH_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLWhyLTAwMSIsImVtYWlsIjoiaHJAbWFzdGVyaHJtcy5jb20iLCJ0ZW5hbnRJZCI6InRlbmFudC1kZWZhdWx0LTAwMSIsInJvbGVzIjpbImhyX2FkbWluIl0sInNlc3Npb25JZCI6ImM1N2RkNGMxLTE3MDItNGIyNi1hY2NkLWNlMzMzYTEwYjQ0OSIsImlhdCI6MTc5NDU5MDg3MCwiZXhwIjoxNzk1MTk1NjcwfQ.uShD6MX0szn0P5QSUIkLjjHkCPPYrEMXbmU8SZE8FWE";

const ARTIFACT_DIR = "/Users/apple/.gemini/antigravity/brain/049ca62f-54ae-41db-8e33-56592f9d43cc";

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  await context.addInitScript((token) => {
    localStorage.setItem("hrms_auth_token", token);
    localStorage.setItem("theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.setAttribute("data-theme", "light");
  }, AUTH_TOKEN);

  const page = await context.newPage();

  const pages = [
    { url: "http://localhost:5173/hr/leave/applications", name: "crud-tanstack-leave-applications.png" },
    { url: "http://localhost:5173/hr/leave/balances", name: "crud-tanstack-leave-balances.png" },
    { url: "http://localhost:5173/hr/leave/types", name: "crud-tanstack-leave-types.png" },
    { url: "http://localhost:5173/hr/leave/policies", name: "crud-tanstack-leave-policies.png" },
    { url: "http://localhost:3000/hr/leave/applications", name: "crud-cms-leave-applications.png" },
    { url: "http://localhost:3000/hr/leave/balances", name: "crud-cms-leave-balances.png" },
    { url: "http://localhost:3000/hr/leave/types", name: "crud-cms-leave-types.png" },
    { url: "http://localhost:3000/hr/leave/policies", name: "crud-cms-leave-policies.png" },
  ];

  for (const p of pages) {
    console.log(`Capturing ${p.name}...`);
    await page.goto(p.url, { waitUntil: "networkidle" });
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("theme", "light");
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${ARTIFACT_DIR}/${p.name}`, fullPage: false });
  }

  await browser.close();
  console.log("All screenshots captured successfully.");
}

capture().catch(console.error);

