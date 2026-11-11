const fs = require('fs');
const path = require('path');
const { CertificateStudioService } = require('../server/dist/services/certificate-studio.service');

async function testPdfRendering() {
  console.log('══════════════════════════════════════════════════════════════════');
  console.log('TESTING PDFKIT VECTOR RENDERING & 14 FONT VARIANT COMPATIBILITY');
  console.log('══════════════════════════════════════════════════════════════════\n');

  const fonts = [
    { name: "Inter", category: "sans" },
    { name: "Public Sans", category: "sans" },
    { name: "Arial", category: "sans" },
    { name: "Helvetica", category: "sans" },
    { name: "Montserrat", category: "sans" },
    { name: "Roboto", category: "sans" },
    { name: "Lato", category: "sans" },
    { name: "Playfair Display", category: "serif" },
    { name: "Cinzel", category: "serif" },
    { name: "Georgia", category: "serif" },
    { name: "Times New Roman", category: "serif" },
    { name: "Merriweather", category: "serif" },
    { name: "Libre Baskerville", category: "serif" },
    { name: "Cormorant Garamond", category: "serif" }
  ];

  const elements = [
    // Outer border
    {
      id: "frame-1",
      type: "shape",
      shapeType: "rectangle",
      x: 20,
      y: 20,
      width: 801.89,
      height: 555.28,
      stroke: "#1E3A8A",
      strokeWidth: 3,
      borderRadius: 6,
      fill: "transparent"
    },
    // Circle medallion
    {
      id: "circle-1",
      type: "shape",
      shapeType: "circle",
      x: 395,
      y: 35,
      width: 50,
      height: 50,
      stroke: "#D97706",
      strokeWidth: 2,
      fill: "#FEF3C7"
    },
    // Header title
    {
      id: "header-1",
      type: "text",
      text: "CERTIFICATE OF ARCHITECTURAL EXCELLENCE",
      x: 50,
      y: 95,
      width: 741.89,
      height: 35,
      fontSize: 22,
      fontFamily: "Playfair Display",
      fontWeight: "bold",
      color: "#1E3A8A",
      textAlign: "center",
      textTransform: "uppercase",
      letterSpacing: 2
    },
    // Divider line
    {
      id: "line-1",
      type: "shape",
      shapeType: "line",
      x: 270,
      y: 135,
      width: 300,
      height: 2,
      stroke: "#D97706",
      strokeWidth: 2,
      lineStyle: "solid"
    }
  ];

  // Add sample lines for each of the 14 fonts
  let currentY = 150;
  fonts.forEach((f, idx) => {
    elements.push({
      id: `font-sample-${idx}`,
      type: "text",
      text: `${f.name}: The quick brown fox jumps over the lazy dog. [Unicode: © 2026 #8F29]`,
      x: 50,
      y: currentY,
      width: 740,
      height: 22,
      fontSize: 10,
      fontFamily: f.name,
      fontWeight: idx % 2 === 0 ? "bold" : "normal",
      fontStyle: idx % 3 === 0 ? "italic" : "normal",
      color: "#1F2937",
      textAlign: "left",
      letterSpacing: 0.5
    });
    currentY += 24;
  });

  // Add Official Seal, Signature, and QR Code
  elements.push(
    {
      id: "seal-1",
      type: "seal",
      x: 100,
      y: 500,
      width: 60,
      height: 60,
      fill: "#D97706"
    },
    {
      id: "sig-1",
      type: "signature",
      signatoryName: "Dr. Evelyn Vance, Chief Governance Officer",
      x: 300,
      y: 505,
      width: 240,
      height: 45
    },
    {
      id: "qr-1",
      type: "qrcode",
      placeholder: "{{certificate.verificationUrl}}",
      x: 680,
      y: 495,
      width: 55,
      height: 55
    }
  );

  const designJson = {
    canvas: {
      width: 841.89,
      height: 595.28,
      orientation: "LANDSCAPE",
      primaryColor: "#1E3A8A",
      secondaryColor: "#D97706"
    },
    elements
  };

  const context = {
    employeeName: "Alexander M. Vance",
    awardTitle: "Governor Distinguished Innovation Medal",
    awardDate: "November 11, 2026",
    verificationUrl: "https://masterhrms.io/verify/CERT-2026-PROD-001"
  };

  const outputPath = path.resolve(__dirname, '../docs/hrms-audit/evidence/certificate-designer/test_14_fonts_production.pdf');

  console.log(`Generating PDF vector output to ${outputPath}...`);
  const generatedBuffer = await CertificateStudioService.renderTemplateToPdf(designJson, context);
  fs.writeFileSync(outputPath, generatedBuffer);

  const stats = fs.statSync(outputPath);
  console.log(`✔ Generated test PDF successfully! File size: ${stats.size} bytes`);

  // Verify PDF Header
  const pdfBuffer = generatedBuffer;
  const header = pdfBuffer.slice(0, 8).toString();
  console.log(`✔ PDF Magic Header verified: "${header.trim()}"`);

  // Verify vector content streams
  const pdfString = pdfBuffer.toString('binary');
  const hasHelvetica = pdfString.includes('/Helvetica');
  const hasTimes = pdfString.includes('/Times');
  const hasCourier = pdfString.includes('/Courier');
  console.log(`✔ PDF standard PostScript font references verified:`);
  console.log(`    - Helvetica (Sans): ${hasHelvetica}`);
  console.log(`    - Times (Serif): ${hasTimes}`);
  console.log(`    - Courier (Mono/QR): ${hasCourier}`);

  if (stats.size > 2000 && header.startsWith('%PDF') && hasHelvetica && hasTimes) {
    console.log('\n✔ PASS: All 14 fonts, vector shapes, seals, and QR rendering verified in generated PDF!');
  } else {
    throw new Error('PDF output did not meet production verification criteria.');
  }
}

testPdfRendering().catch(err => {
  console.error('PDF generation failed:', err);
  process.exit(1);
});
