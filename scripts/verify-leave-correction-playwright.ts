import { chromium } from "playwright";
import * as path from "path";

const AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLWhyLTAwMSIsImVtYWlsIjoiaHJAbWFzdGVyaHJtcy5jb20iLCJ0ZW5hbnRJZCI6InRlbmFudC1kZWZhdWx0LTAwMSIsInJvbGVzIjpbImhyX2FkbWluIl0sInNlc3Npb25JZCI6ImM1N2RkNGMxLTE3MDItNGIyNi1hY2NkLWNlMzMzYTEwYjQ0OSIsImlhdCI6MTc5NDU5MDg3MCwiZXhwIjoxNzk1MTk1NjcwfQ.uShD6MX0szn0P5QSUIkLjjHkCPPYrEMXbmU8SZE8FWE";

const ARTIFACTS_DIR = "/Users/apple/.gemini/antigravity/brain/049ca62f-54ae-41db-8e33-56592f9d43cc";

async function run() {
  console.log("Starting Browser Verification with Playwright...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  // Inject authentication and light theme into localStorage
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

  // Test 1: TanStack Leave Applications (Port 5173)
  console.log("Verifying TanStack /hr/leave/applications...");
  await page.goto("http://localhost:5173/hr/leave/applications", { waitUntil: "networkidle" });
  await ensureLight();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, "tanstack-leave-applications.png"), fullPage: false });
  console.log("  Saved tanstack-leave-applications.png");

  // Verify Add Leave Application modal & employee dropdown & file input
  const addAppBtn = page.locator("button:has-text('Add Leave Application')");
  if (await addAppBtn.isVisible()) {
    await addAppBtn.click();
    await page.waitForTimeout(800);
    console.log("  Add Leave Application modal opened");
    // Verify search input
    const empSearch = page.locator("input[placeholder*='Search employee']");
    console.log("  Employee search input visible:", await empSearch.isVisible());
    // Verify file input
    const fileInput = page.locator("input#leave-attachment-input");
    console.log("  Attachment file input present:", (await fileInput.count()) > 0);
    // Close modal
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }

  // Test 2: TanStack Leave Balances (Port 5173)
  console.log("Verifying TanStack /hr/leave/balances...");
  await page.goto("http://localhost:5173/hr/leave/balances", { waitUntil: "networkidle" });
  await ensureLight();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, "tanstack-leave-balances.png"), fullPage: false });
  console.log("  Saved tanstack-leave-balances.png");

  // Test 3: TanStack Leave Types (Port 5173)
  console.log("Verifying TanStack /hr/leave/types...");
  await page.goto("http://localhost:5173/hr/leave/types", { waitUntil: "networkidle" });
  await ensureLight();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, "tanstack-leave-types.png"), fullPage: false });
  console.log("  Saved tanstack-leave-types.png");

  // Test 4: TanStack Leave Policies (Port 5173)
  console.log("Verifying TanStack /hr/leave/policies...");
  await page.goto("http://localhost:5173/hr/leave/policies", { waitUntil: "networkidle" });
  await ensureLight();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, "tanstack-leave-policies.png"), fullPage: false });
  console.log("  Saved tanstack-leave-policies.png");

  // Verify Add Leave Policy modal with 8 fields
  const addPolBtn = page.locator("button:has-text('Add Leave Policy')");
  if (await addPolBtn.isVisible()) {
    await addPolBtn.click();
    await page.waitForTimeout(800);
    console.log("  Add Leave Policy modal opened");
    console.log("  Policy Name visible:", await page.locator("label:has-text('Policy Name')").isVisible());
    console.log("  Description visible:", await page.locator("label:has-text('Description')").isVisible());
    console.log("  Leave Type visible:", await page.locator("label:has-text('Leave Type')").isVisible());
    console.log("  Carry Forward visible:", await page.locator("label:has-text('Carry Forward')").isVisible());
    console.log("  Min Days visible:", await page.locator("label:has-text('Min Days')").isVisible());
    console.log("  Max Days visible:", await page.locator("label:has-text('Max Days')").isVisible());
    console.log("  Requires Approval visible:", await page.locator("label:has-text('Requires Approval')").isVisible());
    console.log("  Status visible:", await page.locator("label:has-text('Status')").isVisible());
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }

  // Next.js CMS Front-End Tests (Port 3000)
  console.log("\nVerifying Next.js CMS Pages...");

  // Test 5: CMS Leave Applications (Port 3000)
  console.log("Verifying CMS /hr/leave/applications...");
  await page.goto("http://localhost:3000/hr/leave/applications", { waitUntil: "networkidle" });
  await ensureLight();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, "cms-leave-applications.png"), fullPage: false });
  console.log("  Saved cms-leave-applications.png");

  // Test 6: CMS Leave Balances (Port 3000)
  console.log("Verifying CMS /hr/leave/balances...");
  await page.goto("http://localhost:3000/hr/leave/balances", { waitUntil: "networkidle" });
  await ensureLight();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, "cms-leave-balances.png"), fullPage: false });
  console.log("  Saved cms-leave-balances.png");

  // Test 7: CMS Leave Types (Port 3000)
  console.log("Verifying CMS /hr/leave/types...");
  await page.goto("http://localhost:3000/hr/leave/types", { waitUntil: "networkidle" });
  await ensureLight();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, "cms-leave-types.png"), fullPage: false });
  console.log("  Saved cms-leave-types.png");

  // Test 8: CMS Leave Policies (Port 3000)
  console.log("Verifying CMS /hr/leave/policies...");
  await page.goto("http://localhost:3000/hr/leave/policies", { waitUntil: "networkidle" });
  await ensureLight();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, "cms-leave-policies.png"), fullPage: false });
  console.log("  Saved cms-leave-policies.png");

  await browser.close();
  console.log("Browser Verification Complete! All screenshots successfully captured.");
}

run().catch((err) => {
  console.error("Playwright error:", err);
  process.exit(1);
});
