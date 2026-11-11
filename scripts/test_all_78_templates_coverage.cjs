const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

async function runCoverageTest() {
  console.log("================================================================================");
  console.log("MASTERHRMS: 78 CERTIFICATE TEMPLATES DYNAMIC BINDING & ASSET COVERAGE TEST SUITE");
  console.log("================================================================================\n");

  const templates = await prisma.certificateTemplate.findMany({
    include: { versions: { orderBy: { versionNumber: 'desc' } } },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Total Templates Discovered: ${templates.length}`);

  let passedTemplates = 0;
  let failedTemplates = 0;
  const failureDetails = [];
  const categoryStats = {};

  for (const t of templates) {
    const cat = t.category || 'Uncategorized';
    if (!categoryStats[cat]) {
      categoryStats[cat] = { total: 0, passed: 0, failed: 0 };
    }
    categoryStats[cat].total++;

    const version = t.versions?.[0];
    if (!version || !version.designJson) {
      failedTemplates++;
      categoryStats[cat].failed++;
      failureDetails.push({ id: t.id, name: t.name, reason: "No version or designJson found" });
      continue;
    }

    const design = version.designJson;
    const elements = Array.isArray(design.elements) ? design.elements : [];

    if (elements.length === 0) {
      failedTemplates++;
      categoryStats[cat].failed++;
      failureDetails.push({ id: t.id, name: t.name, reason: "Zero elements in designJson" });
      continue;
    }

    // Check mandatory element capabilities
    const hasEmployee = elements.some(e => e.type === "text" && (e.text || "").includes("{{employee.name}}"));
    const hasAward = elements.some(e => e.type === "text" && ((e.text || "").includes("{{award.title}}") || (e.text || "").includes("{{award.name}}")));
    const hasOrgName = elements.some(e => e.type === "text" && (e.text || "").includes("{{organization.name}}"));
    const hasQr = elements.some(e => e.type === "qrcode" || e.type === "qr" || e.id?.toLowerCase().includes("qr"));
    const hasLogo = elements.some(e => e.type === "logo" || e.type === "image" || e.isLogo || e.id?.toLowerCase().includes("logo"));
    const hasSeal = elements.some(e => e.type === "seal" || e.isSeal || e.id?.toLowerCase().includes("seal"));
    const hasSig = elements.some(e => e.type === "signature" || e.id?.toLowerCase().includes("sig"));

    const missing = [];
    if (!hasEmployee) missing.push("Employee Name token ({{employee.name}})");
    if (!hasAward) missing.push("Award Title token ({{award.title}})");
    if (!hasOrgName) missing.push("Organization Name token ({{organization.name}})");
    if (!hasQr) missing.push("QR Code element");
    if (!hasLogo) missing.push("Logo element");
    if (!hasSeal) missing.push("Official Seal element");
    if (!hasSig) missing.push("Authorized Signature element");

    if (missing.length > 0) {
      failedTemplates++;
      categoryStats[cat].failed++;
      failureDetails.push({ id: t.id, name: t.name, category: cat, reason: `Missing: ${missing.join(", ")}` });
    } else {
      passedTemplates++;
      categoryStats[cat].passed++;
    }
  }

  console.log("CATEGORY AUDIT SUMMARY:\n");
  for (const [cat, data] of Object.entries(categoryStats)) {
    const rate = ((data.passed / data.total) * 100).toFixed(1);
    console.log(` - Category: [${cat}] -> ${data.passed} / ${data.total} PASSED (${rate}%)`);
  }

  console.log("\n--------------------------------------------------------------------------------");
  console.log(`TOTAL TEMPLATES AUDITED : ${templates.length}`);
  console.log(`TOTAL PASSED           : ${passedTemplates} / ${templates.length} (${((passedTemplates / templates.length) * 100).toFixed(1)}%)`);
  console.log(`TOTAL FAILED           : ${failedTemplates}`);
  console.log("--------------------------------------------------------------------------------\n");

  if (failureDetails.length > 0) {
    console.error("FAILURES DETECTED:");
    console.error(JSON.stringify(failureDetails, null, 2));
    process.exit(1);
  }

  // Next: PDFKit vector rendering verification for 1 representative template per category
  console.log("Testing PDFKit vector rendering for 1 representative template per category...\n");
  const { CertificateStudioService } = require('../server/dist/services/certificate-studio.service.js');

  const sampleContext = {
    "{{organization.name}}": "Acme Global Enterprise Inc.",
    "{{organization.logo}}": "/logo.webp",
    "{{organization.seal}}": "",
    "{{employee.name}}": "Jane Doe",
    "{{employee.employeeCode}}": "EMP-2026-9001",
    "{{employee.designation}}": "Principal Staff Engineer",
    "{{employee.department}}": "Core Systems",
    "{{award.title}}": "President's Medal of Innovation 2026",
    "{{award.description}}": "For game-changing platform architecture and sustained excellence.",
    "{{award.category}}": "Innovation & Excellence",
    "{{award.date}}": "November 11, 2026",
    "{{certificate.number}}": "CERT-2026-TEST-ALL",
    "{{certificate.verificationCode}}": "CODE-VERIFY-78-TPL",
    "{{certificate.verificationUrl}}": "http://localhost:3000/verify-certificate?code=CODE-VERIFY-78-TPL",
    "{{signatures.hr.name}}": "Sarah Jenkins",
    "{{signatures.hr.title}}": "Director of People & Culture",
    "{{signatures.ceo.name}}": "Marcus Sterling",
    "{{signatures.ceo.title}}": "Chief Executive Officer",
    hrSignatureUrl: "",
    ceoSignatureUrl: "",
    officialSealUrl: "",
    primaryLogoUrl: "/logo.webp"
  };

  const categories = Object.keys(categoryStats);
  let pdfRenderCount = 0;

  for (const cat of categories) {
    const rep = templates.find(t => t.category === cat && t.versions?.[0]?.designJson?.elements?.length > 0);
    if (!rep) continue;

    const design = rep.versions[0].designJson;
    const pdfBuffer = await CertificateStudioService.renderTemplateToPdf(design, sampleContext);

    if (!pdfBuffer || pdfBuffer.length < 5000) {
      throw new Error(`PDF generation failed or output too small for template ${rep.id} (${rep.name}): ${pdfBuffer?.length} bytes`);
    }

    const header = pdfBuffer.slice(0, 5).toString('ascii');
    if (header !== '%PDF-') {
      throw new Error(`Invalid PDF header for template ${rep.id}: ${header}`);
    }

    console.log(` [PDF PASS] Category: "${cat}" | Template: "${rep.name}" | Size: ${pdfBuffer.length} bytes`);
    pdfRenderCount++;
  }

  console.log(`\nAll ${pdfRenderCount} category representative PDFs successfully rendered and validated!`);
  console.log("================================================================================");
}

runCoverageTest()
  .catch(err => {
    console.error("Test failed with error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

