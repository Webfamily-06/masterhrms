const fs = require('fs');
const path = require('path');

// 1. Patch TanStack and CMS
const files = [
  path.resolve('src/routes/_authenticated/hr/organization/certificate-designer/$templateId.tsx'),
  path.resolve('CMS/src/app/(workspace)/hr/organization/certificate-designer/[templateId]/page.tsx')
];

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');

  // A. Add token aliases in computedData
  const oldTokens = `"{{award.title}}": awTitle,`;
  const newTokens = `"{{award.title}}": awTitle,
      "{{award.name}}": awTitle,`;
  if (content.includes(oldTokens) && !content.includes('"{{award.name}}"')) {
    content = content.replace(oldTokens, newTokens);
    console.log(`[${path.basename(filePath)}] Added {{award.name}} alias`);
  }

  const oldSigTokens = `"{{signatures.ceo}}": ceoSig?.name || "Chief Executive Officer",`;
  const newSigTokens = `"{{signatures.ceo}}": ceoSig?.name || "Chief Executive Officer",
      "{{signatures.hr.name}}": hrSig?.name || "Sarah Jenkins",
      "{{signatures.hr.title}}": hrSig?.designation || "Director of People & Culture",
      "{{signatures.director.name}}": dirSig?.name || "Managing Director",
      "{{signatures.director.title}}": dirSig?.designation || "Managing Director",
      "{{signatures.ceo.name}}": ceoSig?.name || "Marcus Sterling",
      "{{signatures.ceo.title}}": ceoSig?.designation || "Chief Executive Officer",`;
  if (content.includes(oldSigTokens) && !content.includes('"{{signatures.hr.name}}"')) {
    content = content.replace(oldSigTokens, newSigTokens);
    console.log(`[${path.basename(filePath)}] Added signature token aliases`);
  }

  // B. Patch Canvas Element Rendering
  // Search for the element rendering section
  const oldCanvasRenderRegex = /\{el\.type === "qrcode" && \([\s\S]*?\{isSelected && \(/;
  const match = content.match(oldCanvasRenderRegex);
  if (match) {
    const newCanvasRender = `{(el.type === "qrcode" || el.type === "qr" || el.id?.toLowerCase().includes("qr")) && (
                      <div className="w-full h-full bg-white border border-slate-300 flex items-center justify-center p-0.5 pointer-events-none overflow-hidden shadow-xs relative">
                        {qrCodeDataUrl ? (
                          <img
                            src={qrCodeDataUrl}
                            alt="Verification QR"
                            className="w-full h-full object-contain pointer-events-none select-none"
                          />
                        ) : (
                          <QrCode className="w-full h-full text-slate-800" />
                        )}
                        <div className="absolute bottom-0 right-0 bg-slate-900/80 text-[6px] text-white font-mono px-0.5 rounded-tl pointer-events-none">
                          LIVE QR
                        </div>
                      </div>
                    )}

                    {(el.type === "seal" || el.isSeal || el.id?.toLowerCase().includes("seal") || el.name?.toLowerCase().includes("seal")) && (
                      <div className="w-full h-full flex items-center justify-center pointer-events-none">
                        {(computedData.officialSealUrl || (el.url && !el.url.includes("{{"))) ? (
                          <img
                            src={computedData.officialSealUrl || el.url}
                            alt="Official Seal"
                            className="w-full h-full object-contain pointer-events-none"
                          />
                        ) : (
                          <div
                            className="w-full h-full rounded-full border-2 flex flex-col items-center justify-center text-[7px] font-bold text-center uppercase"
                            style={{ borderColor: el.fill || "#D97706", color: el.fill || "#D97706" }}
                          >
                            <span>OFFICIAL</span>
                            <span>SEAL</span>
                          </div>
                        )}
                      </div>
                    )}

                    {(el.type === "signature" || el.id?.toLowerCase().includes("sig") || el.name?.toLowerCase().includes("signature")) && (() => {
                      const effectiveSigType = el.signatoryType || (el.id?.toLowerCase().includes("hr") || el.name?.toLowerCase().includes("hr") ? "HR" : (el.id?.toLowerCase().includes("ceo") || el.name?.toLowerCase().includes("ceo")) ? "CEO" : (el.id?.toLowerCase().includes("dir") || el.name?.toLowerCase().includes("dir")) ? "DIRECTOR" : "HR");
                      const resolvedSigUrl = el.signatureUrl || (el.url && !el.url.includes("{{") ? el.url : null) || (effectiveSigType === "HR" ? computedData.hrSignatureUrl : effectiveSigType === "DIRECTOR" ? computedData.directorSignatureUrl : computedData.ceoSignatureUrl) || computedData.hrSignatureUrl || computedData.ceoSignatureUrl;
                      const resolvedSigName = el.signatoryName || (el.placeholder ? computedData[el.placeholder] : null) || (effectiveSigType === "HR" ? (previewContextData?.context?.signatoryRoles?.hr?.name || "Head of Human Resources") : (previewContextData?.context?.signatoryRoles?.ceo?.name || "Chief Executive Officer"));
                      const resolvedSigDesig = el.signatoryDesignation || (effectiveSigType === "HR" ? (previewContextData?.context?.signatoryRoles?.hr?.designation || "Director of People & Culture") : (previewContextData?.context?.signatoryRoles?.ceo?.designation || "Chief Executive Officer"));

                      return (
                        <div className="w-full h-full flex flex-col items-center justify-end pb-1 border-b border-foreground/40 pointer-events-none relative">
                          {resolvedSigUrl ? (
                            <div className="flex-1 w-full flex items-center justify-center overflow-hidden mb-0.5">
                              <img
                                src={resolvedSigUrl}
                                alt="Signature"
                                className="h-full max-h-12 object-contain pointer-events-none"
                              />
                            </div>
                          ) : (
                            <div className="flex-1" />
                          )}
                          <span className="text-[10px] font-semibold text-foreground/80 leading-none">
                            {resolvedSigName}
                          </span>
                          {resolvedSigDesig && (
                            <span className="text-[8px] text-muted-foreground leading-tight mt-0.5">
                              {resolvedSigDesig}
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    {(el.type === "logo" || el.type === "image" || el.isLogo || el.id?.toLowerCase().includes("logo") || el.placeholder === "{{organization.logo}}") && (() => {
                      const resolvedLogoUrl = (el.url && !el.url.includes("{{")) ? el.url : (computedData.primaryLogoUrl || primaryLogoAsset?.url || null);
                      return (
                        <div className="w-full h-full flex items-center justify-center p-1 border border-dashed border-slate-300 bg-slate-50/50 pointer-events-none overflow-hidden">
                          {resolvedLogoUrl ? (
                            <img
                              src={resolvedLogoUrl}
                              alt={el.name || "Organization Logo"}
                              className="w-full h-full object-contain pointer-events-none"
                            />
                          ) : (
                            <div className="flex items-center text-slate-500">
                              <ImageIcon className="h-5 w-5 mr-1 text-slate-400" />
                              <span className="text-[10px] font-medium truncate">{el.name || "Organization Logo"}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Active Selection Bounding Box & Canva-Style Resize Handles */}
                    {isSelected && (`;
    content = content.replace(match[0], newCanvasRender);
    console.log(`[${path.basename(filePath)}] Replaced canvas element rendering with robust handler`);
  } else {
    console.warn(`[${path.basename(filePath)}] Could not match canvas element rendering section`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

// 2. Patch server/src/services/certificate-studio.service.ts
const serverFile = path.resolve('server/src/services/certificate-studio.service.ts');
let serverContent = fs.readFileSync(serverFile, 'utf8');

const oldPdfElementsRegex = /\} else if \(el\.type === "qrcode"\) \{[\s\S]*?\} else if \(el\.type === "logo" \|\| el\.type === "image"\) \{[\s\S]*?doc\.restore\(\);/;
const matchServer = serverContent.match(oldPdfElementsRegex);
if (matchServer) {
  const newPdfElements = `} else if (el.type === "qrcode" || el.type === "qr" || el.id?.toLowerCase().includes("qr")) {
              const qrText = context["{{certificate.verificationUrl}}"] || el.placeholder || resolveCertificateVerificationUrl("VERIFY-CODE");
              const renderWidth = Math.max(256, Math.round((el.width || 45) * 4));
              const qrPngBuffer = await QRCode.toBuffer(qrText, {
                width: renderWidth,
                margin: 1,
                errorCorrectionLevel: "M",
                color: { dark: "#0F172A", light: "#FFFFFF" }
              });
              doc.image(qrPngBuffer, el.x, el.y, { width: el.width, height: el.height });
            } else if (el.type === "seal" || el.isSeal || el.id?.toLowerCase().includes("seal") || (el.name && el.name.toLowerCase().includes("seal"))) {
              const sealUrl = (el.url && !el.url.includes("{{") ? el.url : null) || context["{{organization.seal}}"] || context.officialSealUrl;
              let sealBuffer: Buffer | null = null;
              if (sealUrl) {
                sealBuffer = await CertificateStudioService.resolveAssetBuffer(sealUrl);
              }
              if (sealBuffer) {
                doc.image(sealBuffer, el.x, el.y, { fit: [el.width, el.height], align: "center" });
              } else {
                const sealColor = el.fill || canvas.secondaryColor || "#D97706";
                const cx = el.x + el.width / 2;
                const cy = el.y + el.height / 2;
                const r = el.width / 2;
                doc.circle(cx, cy, r).lineWidth(2).strokeColor(sealColor).stroke();
                doc.circle(cx, cy, r - 5).lineWidth(1).strokeColor(sealColor).stroke();
                doc.fontSize(7).font("Helvetica-Bold").fillColor(sealColor).text("OFFICIAL SEAL", el.x, cy - 4, {
                  width: el.width,
                  align: "center"
                });
              }
            } else if (el.type === "signature" || el.id?.toLowerCase().includes("sig") || (el.name && el.name.toLowerCase().includes("signature"))) {
              const lineY = el.y + el.height - 18;
              const effectiveSigType = el.signatoryType || (el.id?.toLowerCase().includes("hr") || el.name?.toLowerCase().includes("hr") ? "HR" : (el.id?.toLowerCase().includes("ceo") || el.name?.toLowerCase().includes("ceo")) ? "CEO" : (el.id?.toLowerCase().includes("dir") || el.name?.toLowerCase().includes("dir")) ? "DIRECTOR" : "HR");
              let sigUrl = el.signatureUrl || (el.url && !el.url.includes("{{") ? el.url : null);
              if (!sigUrl) {
                if (effectiveSigType.includes("HR")) sigUrl = context["{{signatures.hr.image}}"] || context.hrSignatureUrl;
                else if (effectiveSigType.includes("DIRECTOR")) sigUrl = context["{{signatures.director.image}}"] || context.directorSignatureUrl;
                else if (effectiveSigType.includes("CEO") || effectiveSigType.includes("MD")) sigUrl = context["{{signatures.ceo.image}}"] || context.ceoSignatureUrl;
                if (!sigUrl) sigUrl = context.hrSignatureUrl || context.ceoSignatureUrl;
              }
              let sigBuffer: Buffer | null = null;
              if (sigUrl) {
                sigBuffer = await CertificateStudioService.resolveAssetBuffer(sigUrl);
              }
              if (sigBuffer) {
                doc.image(sigBuffer, el.x, el.y, { fit: [el.width, Math.max(10, el.height - 20)], align: "center" });
              }
              doc.moveTo(el.x, lineY).lineTo(el.x + el.width, lineY).lineWidth(1).strokeColor(canvas.primaryColor || "#374151").stroke();
              const sigName = el.signatoryName || (el.placeholder ? context[el.placeholder] : "") || (effectiveSigType.includes("HR") ? (context["{{signatures.hr.name}}"] || "Sarah Jenkins") : (context["{{signatures.ceo.name}}"] || "Marcus Sterling")) || "Authorized Signatory";
              doc.fontSize(8.5).font("Helvetica-Bold").fillColor(canvas.primaryColor || "#374151").text(sigName, el.x, lineY + 3, {
                width: el.width,
                align: "center"
              });
              const sigDesig = el.signatoryDesignation || (effectiveSigType.includes("HR") ? (context["{{signatures.hr.title}}"] || "Director of People & Culture") : (context["{{signatures.ceo.title}}"] || "Chief Executive Officer"));
              if (sigDesig) {
                doc.fontSize(7).font("Helvetica").fillColor("#64748B").text(sigDesig, el.x, lineY + 12, {
                  width: el.width,
                  align: "center"
                });
              }
            } else if (el.type === "logo" || el.type === "image" || el.isLogo || el.id?.toLowerCase().includes("logo") || el.placeholder === "{{organization.logo}}") {
              let resolvedUrl = (el.url && !el.url.includes("{{")) ? el.url : (context["{{organization.logo}}"] || context.primaryLogoUrl || "/logo.webp");
              let imageBuffer = await CertificateStudioService.resolveAssetBuffer(resolvedUrl);
              if (!imageBuffer) {
                const defaultLogo = path.resolve(process.cwd(), "public", "logo.webp");
                if (fs.existsSync(defaultLogo)) imageBuffer = fs.readFileSync(defaultLogo);
              }
              if (imageBuffer) {
                doc.image(imageBuffer, el.x, el.y, { fit: [el.width, el.height], align: el.align || "center" });
              }
            }

            doc.restore();`;
  serverContent = serverContent.replace(matchServer[0], newPdfElements);
  console.log(`[certificate-studio.service.ts] Replaced PDFKit canvas rendering with robust handler`);
  fs.writeFileSync(serverFile, serverContent, 'utf8');
} else {
  console.warn(`[certificate-studio.service.ts] Could not match PDFKit element rendering section`);
}

