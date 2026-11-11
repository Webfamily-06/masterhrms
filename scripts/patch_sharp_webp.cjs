const fs = require('fs');
const path = require('path');

const filePath = path.resolve('server/src/services/certificate-studio.service.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. In resolveAssetBuffer
const oldSnippet = `if (imageBuffer && (cleaned.endsWith(".svg") || resolvedUrl.includes(".svg"))) {
          imageBuffer = await sharp(imageBuffer).png().toBuffer();
        }`;

const newSnippet = `if (imageBuffer) {
          const lower = (resolvedUrl || "").toLowerCase();
          if (lower.endsWith(".svg") || lower.endsWith(".webp") || lower.includes(".svg") || lower.includes(".webp")) {
            try {
              imageBuffer = await sharp(imageBuffer).png().toBuffer();
            } catch (sharpErr) {
              console.warn("[resolveAssetBuffer] sharp conversion to PNG failed:", sharpErr);
            }
          }
        }`;

if (content.includes(oldSnippet)) {
  content = content.replace(oldSnippet, newSnippet);
  console.log("Patched cleaned.endsWith(.svg) in resolveAssetBuffer");
} else {
  // Try CRLF-tolerant replacement
  content = content.replace(
    /if \(imageBuffer && \(cleaned\.endsWith\("\.svg"\) \|\| resolvedUrl\.includes\("\.svg"\)\)\) \{[\r\n\s]*imageBuffer = await sharp\(imageBuffer\)\.png\(\)\.toBuffer\(\);[\r\n\s]*\}/,
    newSnippet
  );
  console.log("Patched cleaned.endsWith(.svg) via regex in resolveAssetBuffer");
}

// 2. In default logo fallback
const oldDefault = `if (fs.existsSync(defaultLogo)) imageBuffer = fs.readFileSync(defaultLogo);`;
const newDefault = `if (fs.existsSync(defaultLogo)) {
                  imageBuffer = await sharp(fs.readFileSync(defaultLogo)).png().toBuffer();
                }`;

if (content.includes(oldDefault)) {
  content = content.replace(oldDefault, newDefault);
  console.log("Patched defaultLogo fallback with sharp .png() conversion");
} else {
  console.warn("Could not find defaultLogo snippet");
}

fs.writeFileSync(filePath, content, 'utf8');

