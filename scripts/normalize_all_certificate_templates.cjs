const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function normalize() {
  console.log("Starting normalization of all 78 certificate templates...\n");

  const templates = await prisma.certificateTemplate.findMany({
    include: { versions: { orderBy: { versionNumber: 'desc' } } }
  });

  let emptyCount = 0;
  let sparseCount = 0;
  let standardCount = 0;

  for (const t of templates) {
    const version = t.versions?.[0];
    let design = version?.designJson || {};
    let elements = Array.isArray(design.elements) ? JSON.parse(JSON.stringify(design.elements)) : [];
    let canvas = design.canvas || {
      width: 841.89,
      height: 595.28,
      orientation: "LANDSCAPE",
      unit: "pt",
      backgroundColor: "#FFFFFF",
      primaryColor: "#1E3A8A",
      secondaryColor: "#D97706"
    };

    if (elements.length === 0) {
      // 1. Populating 8 empty templates
      emptyCount++;
      elements = [
        {
          id: "el-border-outer",
          type: "shape",
          name: "Outer Frame",
          shapeType: "rectangle",
          x: 20,
          y: 20,
          width: 801.89,
          height: 555.28,
          stroke: "#1E3A8A",
          strokeWidth: 3,
          fill: "transparent",
          zIndex: 1
        },
        {
          id: "el-border-inner",
          type: "shape",
          name: "Inner Accent Line",
          shapeType: "rectangle",
          x: 28,
          y: 28,
          width: 785.89,
          height: 539.28,
          stroke: "#D97706",
          strokeWidth: 1,
          fill: "transparent",
          zIndex: 2
        },
        {
          id: "el-org-logo",
          type: "logo",
          name: "Organization Logo",
          isLogo: true,
          placeholder: "{{organization.logo}}",
          x: 395.94,
          y: 45,
          width: 50,
          height: 50,
          zIndex: 10
        },
        {
          id: "el-org-name",
          type: "text",
          name: "Organization Name",
          text: "{{organization.name}}",
          x: 120,
          y: 105,
          width: 601.89,
          height: 26,
          fontSize: 14,
          fontFamily: "Cinzel",
          fontWeight: "bold",
          color: "#1E3A8A",
          textAlign: "center",
          letterSpacing: 2,
          textTransform: "uppercase",
          zIndex: 11
        },
        {
          id: "el-cert-title",
          type: "text",
          name: "Certificate Header",
          text: "CERTIFICATE OF EXCELLENCE",
          x: 100,
          y: 138,
          width: 641.89,
          height: 44,
          fontSize: 30,
          fontFamily: "Playfair Display",
          fontWeight: "bold",
          color: "#D97706",
          textAlign: "center",
          letterSpacing: 3,
          zIndex: 12
        },
        {
          id: "el-cert-pres",
          type: "text",
          name: "Presentation Text",
          text: "This prestigious recognition is proudly presented to",
          x: 150,
          y: 192,
          width: 541.89,
          height: 20,
          fontSize: 12,
          fontFamily: "Inter",
          color: "#64748B",
          textAlign: "center",
          zIndex: 13
        },
        {
          id: "el-recip-name",
          type: "text",
          name: "Recipient Name",
          text: "{{employee.name}}",
          x: 100,
          y: 220,
          width: 641.89,
          height: 48,
          fontSize: 32,
          fontFamily: "Playfair Display",
          fontWeight: "bold",
          color: "#0F172A",
          textAlign: "center",
          underline: true,
          zIndex: 14
        },
        {
          id: "el-award-title",
          type: "text",
          name: "Award Title",
          text: "for extraordinary dedication & excellence in {{award.title}} as {{employee.designation}}",
          x: 100,
          y: 280,
          width: 641.89,
          height: 32,
          fontSize: 13,
          fontFamily: "Inter",
          fontWeight: "600",
          color: "#1E3A8A",
          textAlign: "center",
          zIndex: 15
        },
        {
          id: "el-award-desc",
          type: "text",
          name: "Citation Paragraph",
          text: "In recognition of outstanding performance, leadership, and exemplary contributions to the mission and growth of {{organization.name}}.",
          x: 140,
          y: 320,
          width: 561.89,
          height: 55,
          fontSize: 11,
          fontFamily: "Inter",
          lineHeight: 1.4,
          color: "#475569",
          textAlign: "center",
          zIndex: 16
        },
        {
          id: "el-sig-hr",
          type: "signature",
          name: "HR Authority Signature",
          signatoryType: "HR",
          signatoryName: "Sarah Jenkins",
          signatoryDesignation: "Director of People & Culture",
          placeholder: "{{signatures.hr.name}}",
          x: 110,
          y: 420,
          width: 170,
          height: 65,
          zIndex: 17
        },
        {
          id: "el-seal",
          type: "seal",
          name: "Official Seal",
          isSeal: true,
          placeholder: "{{organization.seal}}",
          fill: "#D97706",
          x: 385.94,
          y: 410,
          width: 70,
          height: 70,
          zIndex: 18
        },
        {
          id: "el-sig-ceo",
          type: "signature",
          name: "Executive Leadership Signature",
          signatoryType: "CEO",
          signatoryName: "Marcus Sterling",
          signatoryDesignation: "Chief Executive Officer",
          placeholder: "{{signatures.ceo.name}}",
          x: 561.89,
          y: 420,
          width: 170,
          height: 65,
          zIndex: 19
        },
        {
          id: "el-qr",
          type: "qrcode",
          name: "Verification QR",
          placeholder: "{{certificate.verificationUrl}}",
          x: 750,
          y: 505,
          width: 45,
          height: 45,
          zIndex: 20
        },
        {
          id: "el-cert-meta",
          type: "text",
          name: "Certificate ID & Date",
          text: "Certificate ID: {{certificate.number}}  •  Issued: {{award.date}}  •  Authenticity: {{certificate.verificationCode}}",
          x: 100,
          y: 520,
          width: 641.89,
          height: 18,
          fontSize: 8.5,
          fontFamily: "Inter",
          color: "#94A3B8",
          textAlign: "center",
          zIndex: 21
        }
      ];
    } else if (elements.length <= 5) {
      // 2. Enriching 7 sparse templates
      sparseCount++;
      const hasLogo = elements.some(e => e.type === "logo" || e.id === "el-org-logo");
      if (!hasLogo) {
        elements.unshift({
          id: "el-org-logo",
          type: "logo",
          name: "Organization Logo",
          isLogo: true,
          placeholder: "{{organization.logo}}",
          x: 395.94,
          y: 40,
          width: 45,
          height: 45,
          zIndex: 9
        });
      }

      const hasOrgName = elements.some(e => (e.text || "").includes("{{organization.name}}"));
      if (!hasOrgName) {
        elements.push({
          id: "el-org-name",
          type: "text",
          name: "Organization Name",
          text: "{{organization.name}}",
          x: 120,
          y: 95,
          width: 601.89,
          height: 24,
          fontSize: 13,
          fontFamily: "Cinzel",
          fontWeight: "bold",
          color: "#1E3A8A",
          textAlign: "center",
          letterSpacing: 2,
          textTransform: "uppercase",
          zIndex: 10
        });
      }

      // Update citation or award text
      const awardEl = elements.find(e => e.id === "el-award-title" || (e.text || "").includes("dedication") || (e.text || "").includes("recognition"));
      if (awardEl && !(awardEl.text || "").includes("{{award.title}}")) {
        awardEl.text = "In recognition of outstanding dedication in {{award.title}} as {{employee.designation}}.";
      }

      const hasSigHr = elements.some(e => e.id === "el-sig-hr");
      if (!hasSigHr) {
        elements.push({
          id: "el-sig-hr",
          type: "signature",
          name: "HR Authority Signature",
          signatoryType: "HR",
          signatoryName: "Sarah Jenkins",
          signatoryDesignation: "Director of People & Culture",
          placeholder: "{{signatures.hr.name}}",
          x: 110,
          y: 420,
          width: 170,
          height: 65,
          zIndex: 17
        });
      }

      const hasSeal = elements.some(e => e.type === "seal" || e.id === "el-seal");
      if (!hasSeal) {
        elements.push({
          id: "el-seal",
          type: "seal",
          name: "Official Seal",
          isSeal: true,
          placeholder: "{{organization.seal}}",
          fill: "#D97706",
          x: 385.94,
          y: 410,
          width: 70,
          height: 70,
          zIndex: 18
        });
      }

      const hasSigCeo = elements.some(e => e.id === "el-sig-ceo");
      if (!hasSigCeo) {
        elements.push({
          id: "el-sig-ceo",
          type: "signature",
          name: "Executive Leadership Signature",
          signatoryType: "CEO",
          signatoryName: "Marcus Sterling",
          signatoryDesignation: "Chief Executive Officer",
          placeholder: "{{signatures.ceo.name}}",
          x: 561.89,
          y: 420,
          width: 170,
          height: 65,
          zIndex: 19
        });
      }

      const hasMeta = elements.some(e => e.id === "el-cert-meta");
      if (!hasMeta) {
        elements.push({
          id: "el-cert-meta",
          type: "text",
          name: "Certificate ID & Date",
          text: "Certificate ID: {{certificate.number}}  •  Issued: {{award.date}}  •  Authenticity: {{certificate.verificationCode}}",
          x: 100,
          y: 520,
          width: 641.89,
          height: 18,
          fontSize: 8.5,
          fontFamily: "Inter",
          color: "#94A3B8",
          textAlign: "center",
          zIndex: 21
        });
      }
    } else {
      // 3. Normalizing standard templates (63)
      standardCount++;
      elements.forEach(el => {
        // Normalize Award Title
        if (el.id === "el-award-title" || el.name === "Award Title") {
          if (el.text && !el.text.includes("{{award.title}}") && !el.text.includes("{{award.name}}")) {
            if (el.text.includes("for extraordinary dedication & excellence as {{employee.designation}}")) {
              el.text = "for extraordinary dedication & excellence in {{award.title}} as {{employee.designation}}";
            } else if (el.text.includes("{{employee.designation}}")) {
              el.text = `for extraordinary achievement in {{award.title}} as {{employee.designation}}`;
            } else {
              el.text = `in {{award.title}}`;
            }
          }
        }

        // Normalize HR Signature
        if (el.id === "el-sig-hr" || (el.name && el.name.toLowerCase().includes("hr authority"))) {
          el.type = "signature";
          el.signatoryType = "HR";
          el.placeholder = "{{signatures.hr.name}}";
          el.signatoryName = el.signatoryName || "Sarah Jenkins";
          el.signatoryDesignation = el.signatoryDesignation || "Director of People & Culture";
        }

        // Normalize CEO Signature
        if (el.id === "el-sig-ceo" || (el.name && el.name.toLowerCase().includes("executive leadership"))) {
          el.type = "signature";
          el.signatoryType = "CEO";
          el.placeholder = "{{signatures.ceo.name}}";
          el.signatoryName = el.signatoryName || "Marcus Sterling";
          el.signatoryDesignation = el.signatoryDesignation || "Chief Executive Officer";
        }

        // Normalize Director Signature
        if (el.id === "el-sig-dir" || (el.name && el.name.toLowerCase().includes("director"))) {
          el.type = "signature";
          el.signatoryType = "DIRECTOR";
          el.placeholder = "{{signatures.director.name}}";
        }

        // Normalize Logo
        if (el.id === "el-org-logo" || el.name === "Organization Logo" || el.type === "logo") {
          el.type = "logo";
          el.isLogo = true;
          el.placeholder = "{{organization.logo}}";
        }

        // Normalize Seal
        if (el.id === "el-seal" || el.name === "Official Seal" || el.type === "seal") {
          el.type = "seal";
          el.isSeal = true;
          el.placeholder = "{{organization.seal}}";
        }

        // Normalize QR Code
        if (el.id === "el-qr" || el.name === "Verification QR" || el.type === "qrcode") {
          el.type = "qrcode";
          el.placeholder = "{{certificate.verificationUrl}}";
        }
      });
    }

    const updatedDesign = {
      ...design,
      canvas,
      elements
    };

    if (version) {
      await prisma.certificateTemplateVersion.update({
        where: { id: version.id },
        data: { designJson: updatedDesign }
      });
    } else {
      await prisma.certificateTemplateVersion.create({
        data: {
          templateId: t.id,
          versionNumber: 1,
          designJson: updatedDesign
        }
      });
    }
  }

  console.log(`Normalization complete:`);
  console.log(` - Populated empty templates: ${emptyCount}`);
  console.log(` - Enriched sparse templates: ${sparseCount}`);
  console.log(` - Normalized standard templates: ${standardCount}`);
  console.log(` - Total updated: ${emptyCount + sparseCount + standardCount} / ${templates.length}`);
}

normalize().catch(console.error).finally(() => prisma.$disconnect());
