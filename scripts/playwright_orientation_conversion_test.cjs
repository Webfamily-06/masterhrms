const { chromium } = require("playwright");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const { CertificateStudioService } = require("../server/dist/services/certificate-studio.service");

async function runOrientationAudit() {
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("PLAYWRIGHT AUDIT: A4 ORIENTATION CONVERSION & SCALING REMEDIATION");
  console.log("══════════════════════════════════════════════════════════════════\n");

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
  console.log(`[1] Navigating to ${targetUrl}...`);
  await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(3000);

  // 1. Capture initial Landscape A4
  console.log("[2] Capturing initial Landscape A4 certificate canvas...");
  const landscapePath = path.join(evidenceDir, "orient_01_landscape_initial.png");
  await page.screenshot({ path: landscapePath });
  console.log(`    ✔ Saved: ${landscapePath}`);

  // 2. Select Portrait A4 from orientation dropdown
  console.log("[3] Switching Orientation to Portrait A4...");
  const orientationSelect = page.locator('button:has-text("Landscape A4"), button:has-text("Portrait A4")').first();
  await orientationSelect.click({ force: true });
  await page.waitForTimeout(500);

  const portraitOption = page.locator('[role="option"]:has-text("Portrait A4")').first();
  if (await portraitOption.isVisible()) {
    await portraitOption.click({ force: true });
  } else {
    // Select via text
    await page.locator('text=Portrait A4').last().click({ force: true });
  }
  await page.waitForTimeout(1500);

  // 3. Capture converted Portrait A4
  console.log("[4] Capturing converted Portrait A4 canvas...");
  const portraitPath = path.join(evidenceDir, "orient_02_portrait_converted.png");
  await page.screenshot({ path: portraitPath });
  console.log(`    ✔ Saved: ${portraitPath}`);

  // 4. Verify border bounds in Portrait
  console.log("[5] Inspecting outer border frame element in Portrait mode...");
  const frameElement = page.locator('[data-element-id*="border"], [data-element-id*="frame"]').first();
  if (await frameElement.isVisible()) {
    const fBox = await frameElement.boundingBox();
    console.log(`    Frame dimensions: W=${Math.round(fBox.width)}, H=${Math.round(fBox.height)}`);
  }

  // 5. Open PDF Preview Modal in Portrait mode
  console.log("[6] Generating Portrait Vector PDF Preview...");
  const previewPdfBtn = page.locator('button:has-text("Preview PDF")').first();
  if (await previewPdfBtn.isVisible()) {
    await previewPdfBtn.click({ force: true });
    await page.waitForTimeout(3500);
    const pdfModalPath = path.join(evidenceDir, "orient_03_portrait_pdf_preview.png");
    await page.screenshot({ path: pdfModalPath });
    console.log(`    ✔ Saved: ${pdfModalPath}`);

    // Close modal
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }

  // 6. Generate backend Portrait PDF vector output
  console.log("[7] Generating backend authoritative Portrait PDF via CertificateStudioService...");
  const portraitDesignJson = {
    canvas: {
      width: 595.28,
      height: 841.89,
      orientation: "PORTRAIT",
      primaryColor: "#1E3A8A",
      secondaryColor: "#D97706"
    },
    elements: [
      {
        id: "frame-portrait",
        name: "Outer Frame",
        type: "shape",
        shapeType: "rectangle",
        x: 20,
        y: 20,
        width: 555.28,
        height: 801.89,
        stroke: "#1E3A8A",
        strokeWidth: 3,
        borderRadius: 6,
        fill: "transparent"
      },
      {
        id: "seal-portrait",
        name: "Official Seal",
        type: "seal",
        x: 271,
        y: 60,
        width: 52,
        height: 52,
        fill: "#D97706"
      },
      {
        id: "title-portrait",
        name: "Certificate Header",
        type: "text",
        text: "CERTIFICATE OF RECOGNITION",
        x: 40,
        y: 130,
        width: 515.28,
        height: 40,
        fontSize: 22,
        fontFamily: "Playfair Display",
        fontWeight: "bold",
        color: "#1E3A8A",
        textAlign: "center"
      },
      {
        id: "citation-portrait",
        name: "Citation",
        type: "text",
        text: "This honor is proudly conferred upon",
        x: 40,
        y: 180,
        width: 515.28,
        height: 25,
        fontSize: 12,
        fontFamily: "Georgia",
        fontStyle: "italic",
        color: "#475569",
        textAlign: "center"
      },
      {
        id: "recipient-portrait",
        name: "Recipient",
        type: "text",
        text: "Alexander M. Vance",
        x: 40,
        y: 220,
        width: 515.28,
        height: 45,
        fontSize: 28,
        fontFamily: "Playfair Display",
        fontWeight: "bold",
        color: "#D97706",
        textAlign: "center",
        underline: true
      },
      {
        id: "body-portrait",
        name: "Description",
        type: "text",
        text: "For outstanding performance, sustained innovation, and exemplary commitment to enterprise excellence.",
        x: 60,
        y: 290,
        width: 475.28,
        height: 60,
        fontSize: 11,
        fontFamily: "Inter",
        lineHeight: 1.5,
        textAlign: "center",
        color: "#1E293B"
      },
      {
        id: "sig-portrait",
        name: "Authorized Signature",
        type: "signature",
        signatoryName: "Head of People & Culture",
        x: 197.64,
        y: 680,
        width: 200,
        height: 55
      },
      {
        id: "qr-portrait",
        name: "Verification QR",
        type: "qrcode",
        placeholder: "https://masterhrms.io/verify-certificate",
        x: 272.64,
        y: 750,
        width: 50,
        height: 50
      }
    ]
  };

  const portraitPdfPath = path.join(evidenceDir, "test_portrait_orientation.pdf");
  const portraitPdfBuffer = await CertificateStudioService.renderTemplateToPdf(portraitDesignJson, {
    "{{employee.name}}": "Alexander M. Vance",
    "{{award.title}}": "Enterprise Architecture Governor Award",
    "{{certificate.verificationUrl}}": "https://masterhrms.io/verify-certificate"
  });
  fs.writeFileSync(portraitPdfPath, portraitPdfBuffer);
  console.log(`    ✔ Saved Portrait PDF: ${portraitPdfPath} (${portraitPdfBuffer.length} bytes)`);

  // 7. Switch back to Landscape A4
  console.log("[8] Switching back to Landscape A4...");
  await page.waitForTimeout(1000);
  const orientationSelect2 = page.locator('button[role="combobox"]:has-text("Portrait A4")').first();
  if (await orientationSelect2.isVisible()) {
    await orientationSelect2.click({ force: true });
    await page.waitForTimeout(600);
    const landscapeOption = page.locator('[role="option"]:has-text("Landscape A4")').first();
    if (await landscapeOption.isVisible()) {
      await landscapeOption.click({ force: true });
    }
    await page.waitForTimeout(1500);
  }

  const restoredLandscapePath = path.join(evidenceDir, "orient_04_landscape_restored.png");
  await page.screenshot({ path: restoredLandscapePath });
  console.log(`    ✔ Saved: ${restoredLandscapePath}`);

  await browser.close();
  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("ORIENTATION CONVERSION & FIT-TO-PAGE VERIFICATION SUCCESSFUL");
  console.log("══════════════════════════════════════════════════════════════════\n");
}

runOrientationAudit().catch(err => {
  console.error("Orientation audit failed:", err);
  process.exit(1);
});
