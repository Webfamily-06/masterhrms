const fs = require('fs');

let code = fs.readFileSync('server/src/services/certificate-studio.service.ts', 'utf8');

if (!code.includes('import sharp from "sharp";')) {
  code = code.replace(
    'import PDFDocument from "pdfkit";',
    'import PDFDocument from "pdfkit";\r\nimport sharp from "sharp";'
  );
}

const targetPattern = /} else if \(el\.type === "logo" \|\| el\.type === "image"\) \{[\s\S]*?doc\.restore\(\);/;

const replacement = `} else if (el.type === "logo" || el.type === "image") {
              let imageBuffer: Buffer | null = null;
              let resolvedUrl = el.url;
              if (resolvedUrl && context[resolvedUrl]) {
                resolvedUrl = context[resolvedUrl];
              }

              // Check uploads folder or branding preview
              if (resolvedUrl && typeof resolvedUrl === "string") {
                if (resolvedUrl.includes("/branding/") && resolvedUrl.includes("/preview")) {
                  const assetIdMatch = resolvedUrl.match(/\\/branding\\/([^/?]+)/);
                  if (assetIdMatch) {
                    const brandingAsset = await prisma.organizationBrandingAsset.findUnique({
                      where: { id: assetIdMatch[1] }
                    });
                    if (brandingAsset && brandingAsset.storagePath) {
                      const uploadsRoot = getUploadsRoot();
                      const filePath = path.resolve(uploadsRoot, brandingAsset.storagePath.replace(/^\\/+/, ""));
                      if (fs.existsSync(filePath)) {
                        imageBuffer = fs.readFileSync(filePath);
                        if (brandingAsset.mimeType === "image/svg+xml" || filePath.endsWith(".svg")) {
                          imageBuffer = await sharp(imageBuffer).png().toBuffer();
                        }
                      }
                    }
                  }
                } else {
                  const cleaned = resolvedUrl.replace(/^\\//, "");
                  const candidatePublic = path.resolve(process.cwd(), "public", cleaned);
                  const candidateUploads = path.resolve(getUploadsRoot(), cleaned);
                  if (fs.existsSync(candidatePublic)) {
                    imageBuffer = fs.readFileSync(candidatePublic);
                  } else if (fs.existsSync(candidateUploads)) {
                    imageBuffer = fs.readFileSync(candidateUploads);
                  }
                  if (imageBuffer && (cleaned.endsWith(".svg") || resolvedUrl.includes(".svg"))) {
                    imageBuffer = await sharp(imageBuffer).png().toBuffer();
                  }
                }
              }

              if (!imageBuffer) {
                const defaultLogo = path.resolve(process.cwd(), "public", "logo.webp");
                if (fs.existsSync(defaultLogo)) imageBuffer = fs.readFileSync(defaultLogo);
              }

              if (imageBuffer) {
                doc.image(imageBuffer, el.x, el.y, { fit: [el.width, el.height], align: el.align || "center" });
              }
            }

            doc.restore();`;

if (targetPattern.test(code)) {
  code = code.replace(targetPattern, replacement);
  fs.writeFileSync('server/src/services/certificate-studio.service.ts', code, 'utf8');
  console.log('Successfully replaced logo block with sharp rendering support');
} else {
  console.error('Target pattern did not match');
}
