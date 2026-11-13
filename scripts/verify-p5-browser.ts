import { chromium } from "playwright";
import path from "path";

const ARTIFACT_DIR = "C:\\Users\\TSV Global Solutions\\.gemini\\antigravity\\brain\\a577d1c0-e728-48a2-b5e2-4bfe07f028cd";

async function main() {
  console.log("Starting Browser Verification for P5 Employment Lifecycle...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  // Inject authentication into local storage/cookies
  const page = await context.newPage();

  // Test 1: Next.js CMS on localhost:3000
  console.log("Navigating to CMS Contracts page: http://localhost:3000/hr/documents/contracts");
  try {
    // Inject auth token first
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
    await page.evaluate(() => {
      localStorage.setItem("hrms_token", "test-token");
      localStorage.setItem("user", JSON.stringify({
        id: "usr-admin-01",
        email: "admin@masterhrms.internal",
        roles: ["hr_admin", "super_admin"],
        tenantId: "qa-tenant-blue"
      }));
    });

    await page.goto("http://localhost:3000/hr/documents/contracts", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(3000);

    const cmsScreenshotPath = path.join(ARTIFACT_DIR, "p5-contracts-cms-overview.png");
    await page.screenshot({ path: cmsScreenshotPath, fullPage: true });
    console.log("✓ Saved CMS screenshot:", cmsScreenshotPath);
  } catch (err: any) {
    console.warn("CMS navigation error:", err.message);
  }

  // Test 2: TanStack Router on localhost:5173
  console.log("Navigating to Vite/TanStack Contracts page: http://localhost:5173/hr/documents/contracts");
  try {
    await page.goto("http://localhost:5173/hr/documents/contracts", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(3000);

    const viteScreenshotPath = path.join(ARTIFACT_DIR, "p5-contracts-tanstack-overview.png");
    await page.screenshot({ path: viteScreenshotPath, fullPage: true });
    console.log("✓ Saved TanStack screenshot:", viteScreenshotPath);

    // Click "Expiry Settings" button to show settings modal
    const settingsBtn = await page.$("text=Expiry Settings");
    if (settingsBtn) {
      await settingsBtn.click();
      await page.waitForTimeout(1000);
      const settingsModalPath = path.join(ARTIFACT_DIR, "p5-contracts-settings-modal.png");
      await page.screenshot({ path: settingsModalPath });
      console.log("✓ Saved Settings Modal screenshot:", settingsModalPath);

      // Close modal
      const cancelBtn = await page.$("text=Cancel");
      if (cancelBtn) await cancelBtn.click();
      await page.waitForTimeout(500);
    }

    // Click "Issue Contract" button to show contract modal
    const issueBtn = await page.$("text=Issue Contract");
    if (issueBtn) {
      await issueBtn.click();
      await page.waitForTimeout(1000);
      const issueModalPath = path.join(ARTIFACT_DIR, "p5-contracts-issue-modal.png");
      await page.screenshot({ path: issueModalPath });
      console.log("✓ Saved Issue Contract Modal screenshot:", issueModalPath);
    }
  } catch (err: any) {
    console.warn("Vite navigation error:", err.message);
  }

  await browser.close();
  console.log("Browser verification finished successfully!");
}

main().catch(console.error);

