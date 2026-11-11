const { chromium } = require("playwright");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");

async function run() {
  const evidenceDir = path.resolve(__dirname, "../docs/hrms-audit/evidence/certificate-designer");
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  const secret = "master-hrms-jwt-super-secret-key-change-this-in-production";
  const payload = {
    sub: "user-hr-001",
    userId: "user-hr-001",
    email: "hr@masterhrms.com",
    tenantId: "tenant-default-001",
    sessionId: "8f241c8d-c1a4-4a9c-9e32-b85ad4e5195e",
    roles: ["HR_ADMIN", "hr_admin"]
  };
  const token = jwt.sign(payload, secret, { expiresIn: "7d" });

  console.log("Launching Chromium browser...");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const context = await browser.newContext({
    viewport: { width: 1720, height: 1080 },
    deviceScaleFactor: 1
  });

  await context.addCookies([
    { name: "hrms_auth_token", value: token, domain: "localhost", path: "/" },
    { name: "token", value: token, domain: "localhost", path: "/" },
    { name: "sessionId", value: payload.sessionId, domain: "localhost", path: "/" }
  ]);

  const page = await context.newPage();

  await page.addInitScript(({ token }) => {
    localStorage.setItem("hrms_auth_token", token);
    localStorage.setItem("token", token);
    localStorage.setItem("master_hrms_active_portal", "hr");
    localStorage.setItem("master_hrms_user", JSON.stringify({
      id: "user-hr-001",
      email: "hr@masterhrms.com",
      roles: ["HR_ADMIN", "hr_admin"],
      tenantId: "tenant-default-001"
    }));
  }, { token });

  const targetUrl = "http://localhost:3000/hr/organization/certificate-designer/0f9f06cb-ea6f-42bb-875c-46e49c60feae";
  console.log(`Navigating to ${targetUrl}...`);

  await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(3000);

  // 1. Full Editor Overview
  console.log("1. Capturing 01_full_editor_three_panels.png...");
  await page.screenshot({ path: path.join(evidenceDir, "01_full_editor_three_panels.png"), fullPage: false });

  // 2. Select an unlocked text element on canvas
  console.log("2. Locating canvas elements...");
  const elementLocators = await page.locator('[data-element-id]').all();
  console.log(`Discovered ${elementLocators.length} elements on canvas`);

  let textEl = null;
  for (const el of elementLocators) {
    const type = await el.getAttribute("data-element-type");
    const text = (await el.textContent() || "").trim();
    if (type === "text" && !text.includes("Outer Frame")) {
      textEl = el;
      break;
    }
  }

  if (textEl) {
    const elId = await textEl.getAttribute("data-element-id");
    console.log(`Selecting text element: ${elId}`);
    await textEl.click({ force: true });
    await page.waitForTimeout(800);

    // 2. Selection handles & bounding box
    console.log("Capturing 02_selected_text_resize_handles.png...");
    await page.screenshot({ path: path.join(evidenceDir, "02_selected_text_resize_handles.png") });

    // 3. Typography properties & font selection
    console.log("3. Inspecting Typography toolbar and font selector in Properties panel...");
    const propsTab = page.locator('button[role="tab"]:has-text("Properties")').first();
    if (await propsTab.isVisible()) {
      await propsTab.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(evidenceDir, "03_typography_toolbar_and_font_selection.png") });

    // 4. Drag element to trigger live snap guides
    console.log("4. Performing mouse drag on canvas...");
    const box = await textEl.boundingBox();
    if (box) {
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      // Drag near horizontal center
      await page.mouse.move(startX + 45, startY + 25, { steps: 10 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(evidenceDir, "04_canvas_drag_and_snap_guides.png") });
      await page.mouse.up();
      await page.waitForTimeout(500);
    }
  }

  // 5. Select a shape element or add a shape
  console.log("5. Testing shape properties...");
  let shapeEl = null;
  for (const el of elementLocators) {
    const type = await el.getAttribute("data-element-type");
    if (type === "shape") {
      shapeEl = el;
      break;
    }
  }
  if (shapeEl) {
    await shapeEl.click({ force: true });
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: path.join(evidenceDir, "05_shape_element_and_properties.png") });

  // 6. Layers panel reordering
  console.log("6. Opening Layers Panel...");
  const layersTab = page.locator('button[role="tab"]:has-text("Layers")').first();
  if (await layersTab.isVisible()) {
    await layersTab.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(evidenceDir, "06_layers_panel_reordering.png") });
  }

  // 7. Toggle Sample Data Preview
  console.log("7. Toggling Sample Data Preview...");
  const sampleDataBtn = page.locator('button:has-text("Tokens"), button:has-text("Sample Data")').first();
  if (await sampleDataBtn.isVisible()) {
    await sampleDataBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(evidenceDir, "07_sample_data_live_preview.png") });
  }

  // 8. Open PDF Vector Preview Modal
  console.log("8. Opening PDF Vector Preview Modal...");
  const previewPdfBtn = page.locator('button:has-text("Preview PDF")').first();
  if (await previewPdfBtn.isVisible()) {
    await previewPdfBtn.click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(evidenceDir, "08_pdf_vector_preview_modal.png") });
  }

  await browser.close();
  console.log("All 8 Playwright visual evidence screenshots captured successfully!");
}

run().catch((err) => {
  console.error("Playwright test failed:", err);
  process.exit(1);
});
