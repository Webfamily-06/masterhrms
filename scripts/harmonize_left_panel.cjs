const fs = require('fs');

function standardizeLeftPanel(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');

  // Replace Left Panel markup with cleanly standardized two-column grid & unified button styles
  const oldPanelStart = `{/* ── LEFT PANEL: Element Insertion Library ── */}
        <div className="w-64 border-r bg-background p-4 flex flex-col gap-6 overflow-y-auto shrink-0 z-10">`;

  const newPanelStart = `{/* ── LEFT PANEL: Canva-Style Design Elements Library ── */}
        <div className="w-64 border-r bg-background p-3.5 flex flex-col gap-5 overflow-y-auto shrink-0 z-10">`;

  code = code.replace(oldPanelStart, newPanelStart);

  // Add draggable to other elements in left panel
  const replacements = [
    {
      target: `onClick={() =>
                  addElement("text", {
                    name: "Certificate Title",
                    text: "CERTIFICATE OF RECOGNITION",
                    fontSize: 22,
                    fontFamily: "Cinzel",
                    fontWeight: "bold",
                    color: "#1E3A8A",
                    width: 450,
                    height: 40
                  })
                }`,
      replace: `draggable
                onDragStart={(e) =>
                  handleDragStartFromPanel(e, "text", {
                    name: "Certificate Title",
                    text: "CERTIFICATE OF RECOGNITION",
                    fontSize: 22,
                    fontFamily: "Cinzel",
                    fontWeight: "bold",
                    color: "#1E3A8A",
                    width: 450,
                    height: 40
                  })
                }
                onClick={() =>
                  addElement("text", {
                    name: "Certificate Title",
                    text: "CERTIFICATE OF RECOGNITION",
                    fontSize: 22,
                    fontFamily: "Cinzel",
                    fontWeight: "bold",
                    color: "#1E3A8A",
                    width: 450,
                    height: 40
                  })
                }`
    },
    {
      target: `onClick={() =>
                  addElement("text", {
                    name: "Custom Text Block",
                    text: "This certificate is awarded to honour outstanding achievements and sustained dedication.",
                    fontSize: 11,
                    fontFamily: "Inter",
                    color: "#334155",
                    width: 400,
                    height: 35
                  })
                }`,
      replace: `draggable
                onDragStart={(e) =>
                  handleDragStartFromPanel(e, "text", {
                    name: "Custom Text Block",
                    text: "This certificate is awarded to honour outstanding achievements and sustained dedication.",
                    fontSize: 11,
                    fontFamily: "Inter",
                    color: "#334155",
                    width: 400,
                    height: 35
                  })
                }
                onClick={() =>
                  addElement("text", {
                    name: "Custom Text Block",
                    text: "This certificate is awarded to honour outstanding achievements and sustained dedication.",
                    fontSize: 11,
                    fontFamily: "Inter",
                    color: "#334155",
                    width: 400,
                    height: 35
                  })
                }`
    },
    {
      target: `onClick={() =>
                  addElement("text", {
                    name: "Recipient Full Name",
                    text: "{{employee.name}}",
                    fontSize: 28,
                    fontFamily: "Playfair Display",
                    fontWeight: "bold",
                    color: "#D97706",
                    underline: true,
                    width: 400,
                    height: 45
                  })
                }`,
      replace: `draggable
                onDragStart={(e) =>
                  handleDragStartFromPanel(e, "text", {
                    name: "Recipient Full Name",
                    text: "{{employee.name}}",
                    fontSize: 28,
                    fontFamily: "Playfair Display",
                    fontWeight: "bold",
                    color: "#D97706",
                    underline: true,
                    width: 400,
                    height: 45
                  })
                }
                onClick={() =>
                  addElement("text", {
                    name: "Recipient Full Name",
                    text: "{{employee.name}}",
                    fontSize: 28,
                    fontFamily: "Playfair Display",
                    fontWeight: "bold",
                    color: "#D97706",
                    underline: true,
                    width: 400,
                    height: 45
                  })
                }`
    },
    {
      target: `onClick={() =>
                  addElement("seal", {
                    name: "Official Seal",
                    width: 65,
                    height: 65,
                    fill: "#D97706"
                  })
                }`,
      replace: `draggable
                onDragStart={(e) =>
                  handleDragStartFromPanel(e, "seal", {
                    name: "Official Seal",
                    width: 65,
                    height: 65,
                    fill: "#D97706"
                  })
                }
                onClick={() =>
                  addElement("seal", {
                    name: "Official Seal",
                    width: 65,
                    height: 65,
                    fill: "#D97706"
                  })
                }`
    },
    {
      target: `onClick={() =>
                  addElement("qrcode", {
                    name: "Verification QR",
                    width: 45,
                    height: 45,
                    placeholder: "{{certificate.verificationUrl}}"
                  })
                }`,
      replace: `draggable
                onDragStart={(e) =>
                  handleDragStartFromPanel(e, "qrcode", {
                    name: "Verification QR",
                    width: 45,
                    height: 45,
                    placeholder: "{{certificate.verificationUrl}}"
                  })
                }
                onClick={() =>
                  addElement("qrcode", {
                    name: "Verification QR",
                    width: 45,
                    height: 45,
                    placeholder: "{{certificate.verificationUrl}}"
                  })
                }`
    },
    {
      target: `onClick={() =>
                  addElement("shape", {
                    shapeType: "rectangle",
                    name: "Rectangle",
                    width: 200,
                    height: 120,
                    stroke: "#1E3A8A",
                    strokeWidth: 2,
                    borderRadius: 0,
                    fill: "transparent"
                  })
                }`,
      replace: `draggable
                onDragStart={(e) =>
                  handleDragStartFromPanel(e, "shape", {
                    shapeType: "rectangle",
                    name: "Rectangle",
                    width: 200,
                    height: 120,
                    stroke: "#1E3A8A",
                    strokeWidth: 2,
                    borderRadius: 0,
                    fill: "transparent"
                  })
                }
                onClick={() =>
                  addElement("shape", {
                    shapeType: "rectangle",
                    name: "Rectangle",
                    width: 200,
                    height: 120,
                    stroke: "#1E3A8A",
                    strokeWidth: 2,
                    borderRadius: 0,
                    fill: "transparent"
                  })
                }`
    }
  ];

  replacements.forEach(r => {
    if (code.includes(r.target)) {
      code = code.replace(r.target, r.replace);
    }
  });

  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`Standardized left panel & added drag-and-drop to ${filePath}`);
}

standardizeLeftPanel('src/routes/_authenticated/hr/organization/certificate-designer/$templateId.tsx');
standardizeLeftPanel('CMS/src/app/(workspace)/hr/organization/certificate-designer/[templateId]/page.tsx');

