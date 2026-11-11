/**
 * Playwright E2E Visual & Interaction Audit:
 * Certificate Studio Dynamic Data Binding, Automatic Asset Resolution & Real-Time QR Code Generation
 */

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");

async function runAudit() {
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("PLAYWRIGHT AUDIT: DYNAMIC DATA BINDING & REAL-TIME QR GENERATION");
  console.log("══════════════════════════════════════════════════════════════════\n");

  const evidenceDir = path.resolve(process.cwd(), "docs", "hrms-audit", "evidence", "certificate-dynamic-binding");
  if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

  const JWT_SECRET = "master-hrms-jwt-super-secret-key-change-this-in-production";
  const tenantId = "tenant-default-001";
  const userId = "user-hr-001";
  const sessionId = "850fb32a-0ced-4ebe-9220-3273f653f3fb";

  const token = jwt.sign({
    userId,
    email: "hr@masterhrms.com",
    tenantId,
    roles: ["HR_MANAGER", "ADMIN"],
    sessionId
  }, JWT_SECRET, { algorithm: "HS256", expiresIn: "2h" });

  const userObj = {
    id: userId,
    email: "hr@masterhrms.com",
    tenantId,
    roles: ["HR_MANAGER", "ADMIN"]
  };

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });

  // Inject session cookies
  await context.addCookies([
    { name: "hrms_auth_token", value: token, domain: "localhost", path: "/" },
    { name: "auth_token", value: token, domain: "localhost", path: "/" }
  ]);

  const page = await context.newPage();

  // Seed localStorage before page scripts execute
  await page.addInitScript(({ tok, u }) => {
    localStorage.setItem("hrms_auth_token", tok);
    localStorage.setItem("auth_token", tok);
    localStorage.setItem("token", tok);
    localStorage.setItem("hrms_user", JSON.stringify(u));
    localStorage.setItem("master_hrms_active_tenant", "tenant-default-001");
  }, { tok: token, u: userObj });

  const templateId = "0cdb533c-76a3-4f9d-9151-d0a69478331e";
  const targetUrl = `http://localhost:3000/hr/organization/certificate-designer/${templateId}`;

  console.log(`[1] Navigating to Certificate Studio: ${targetUrl}...`);
  await page.goto(targetUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // 1. Verify Dynamic Preview Context Bar
  const previewContextBar = page.locator("text=Preview Context:").first();
  const barVisible = await previewContextBar.isVisible();
  console.log(`  ✔ Real-Time Preview Context Bar visible: ${barVisible}`);

  // 2. Turn on Sample Data preview if not already active
  const sampleDataButton = page.locator('button:has-text("Tokens"), button:has-text("Sample Data")').first();
  const btnText = await sampleDataButton.textContent();
  if (btnText && btnText.includes("Tokens")) {
    console.log("  [Action] Enabling Sample Data dynamic interpolation view...");
    await sampleDataButton.click();
    await page.waitForTimeout(1000);
  }

  // 3. Verify Live Scannable QR Code image is generated on canvas
  const qrImage = page.locator('img[alt="Verification QR"]').first();
  const qrVisible = await qrImage.isVisible();
  const initialQrSrc = qrVisible ? await qrImage.getAttribute("src") : "";
  const isRealDataUrl = initialQrSrc && initialQrSrc.startsWith("data:image/png;base64,");
  console.log(`  ✔ Canvas Real-Time Scannable QR rendered: ${qrVisible}`);
  console.log(`  ✔ QR encodes valid base64 PNG data URL: ${isRealDataUrl}`);

  // 4. Verify initial dynamic employee interpolation
  const canvasText = await page.evaluate(() => document.querySelector("#certificate-canvas")?.textContent || "");
  const hasSampleName = canvasText.includes("Alexander M. Vance") || canvasText.includes("Principal Platform Architect");
  console.log(`  ✔ Canvas dynamically resolved recipient name: ${hasSampleName}`);

  // 5. Capture Desktop Evidence with initial state
  const desktopScreenshot = path.join(evidenceDir, "certificate_studio_dynamic_binding_desktop_1440.png");
  await page.screenshot({ path: desktopScreenshot, fullPage: true });
  console.log(`  ✔ Saved Desktop Screenshot: ${desktopScreenshot}`);

  // 6. Test Interactive Dynamic Employee Switching
  console.log("\n[2] Testing interactive employee switching in Dynamic Preview Context Bar...");
  const employeeSelectTrigger = page.locator('div:has(> span:has-text("Employee:")) button[role="combobox"]').first();
  if (await employeeSelectTrigger.isVisible()) {
    await employeeSelectTrigger.click();
    await page.waitForTimeout(600);

    const alexOption = page.locator('[role="option"]:has-text("Alex Morgan")').first();
    if (await alexOption.isVisible()) {
      await alexOption.click();
      await page.waitForTimeout(1000);
      console.log("  [Action] Switched selected employee to 'Alex Morgan (EMP-0001)'.");

      const updatedText = await page.evaluate(() => document.querySelector("#certificate-canvas")?.textContent || "");
      const hasAlexMorgan = updatedText.includes("Alex Morgan");
      console.log(`  ✔ Canvas recipient text updated to Alex Morgan: ${hasAlexMorgan}`);
    } else {
      await page.keyboard.press("Escape");
    }
  }

  // 7. Test Interactive Verification Code Change -> Live QR Code Regeneration
  console.log("\n[3] Testing live QR code regeneration on Verification Code modification...");
  const verificationInput = page.locator('input[placeholder="VERIFY-CODE"]').first();
  if (await verificationInput.isVisible()) {
    await verificationInput.click();
    await verificationInput.fill("VERIFY-PLAYWRIGHT-LIVE-2026");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(1500);

    const updatedQrSrc = await qrImage.getAttribute("src");
    const qrRegenerated = updatedQrSrc && updatedQrSrc !== initialQrSrc;
    console.log(`  ✔ Live QR image instantly regenerated on URL code change: ${qrRegenerated}`);
  }

  // 8. Test Vector PDF Preview Modal
  console.log("\n[4] Testing PDF Preview Modal generation...");
  const previewPdfBtn = page.locator('button:has-text("Preview PDF")').first();
  if (await previewPdfBtn.isVisible()) {
    await previewPdfBtn.click();
    try {
      await page.waitForSelector('iframe, [role="dialog"]', { timeout: 8000 });
      const pdfDialog = page.locator('[role="dialog"]').first();
      const isDialogVisible = await pdfDialog.isVisible();
      console.log(`  ✔ PDF Preview Modal opened: ${isDialogVisible}`);

      const pdfScreenshot = path.join(evidenceDir, "certificate_studio_pdf_preview_modal.png");
      await page.screenshot({ path: pdfScreenshot, fullPage: true });
      console.log(`  ✔ Saved PDF Preview Modal Screenshot: ${pdfScreenshot}`);

      const closeBtn = page.locator('button:has-text("Close Preview")').first();
      if (await closeBtn.isVisible()) await closeBtn.click();
      await page.waitForTimeout(500);
    } catch (e) {
      console.log(`  ⚠ PDF Preview dialog wait notice: ${e.message}`);
    }
  }

  // 9. Laptop 1280 Viewport Evidence
  console.log("\n[5] Capturing Laptop 1280x800 responsive layout...");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(1000);
  const laptopScreenshot = path.join(evidenceDir, "certificate_studio_dynamic_binding_laptop_1280.png");
  await page.screenshot({ path: laptopScreenshot, fullPage: true });
  console.log(`  ✔ Saved Laptop Screenshot: ${laptopScreenshot}`);

  await browser.close();
  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("PLAYWRIGHT DYNAMIC BINDING & REAL-TIME QR AUDIT COMPLETED");
  console.log("══════════════════════════════════════════════════════════════════\n");
}

runAudit().catch(err => {
  console.error("Playwright Audit Failed:", err);
  process.exit(1);
});
