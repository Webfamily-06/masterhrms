const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  console.log('Extracting official MasterHRMS emblem from CMS/public/white-logo.png...');
  
  // Crop the emblem square (left 484x484)
  const emblemCropBuffer = await sharp('CMS/public/white-logo.png')
    .extract({ left: 0, top: 0, width: 484, height: 484 })
    .toBuffer();

  // Trim transparent padding to get tight bounding box (396x428)
  const trimmedEmblemBuffer = await sharp(emblemCropBuffer).trim().toBuffer();

  // Helper to place trimmed emblem in a square canvas with proportional padding
  async function createSquareIcon(size, paddingRatio = 0.08) {
    const pad = Math.round(size * paddingRatio);
    const contentSize = size - pad * 2;
    
    const resizedEmblem = await sharp(trimmedEmblemBuffer)
      .resize(contentSize, contentSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();

    return sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([{ input: resizedEmblem, gravity: 'center' }])
    .png()
    .toBuffer();
  }

  // 1. Generate PNGs of various sizes
  console.log('Generating standardized brand PNGs...');
  const png16 = await createSquareIcon(16, 0.05);
  const png32 = await createSquareIcon(32, 0.05);
  const png48 = await createSquareIcon(48, 0.06);
  const png80Webp = await sharp(await createSquareIcon(80, 0.06)).webp({ quality: 95 }).toBuffer();
  const png96 = await createSquareIcon(96, 0.08);
  const png128 = await createSquareIcon(128, 0.08);
  const png180 = await createSquareIcon(180, 0.08); // Apple touch icon
  const png192 = await createSquareIcon(192, 0.08); // PWA manifest
  const png512 = await createSquareIcon(512, 0.08); // High-res PWA manifest

  // 2. Generate multi-resolution ICO (16x16, 32x32, 48x48)
  console.log('Building multi-resolution ICO...');
  const icoImages = [
    { w: 16, h: 16, buf: png16 },
    { w: 32, h: 32, buf: png32 },
    { w: 48, h: 48, buf: png48 },
  ];
  const count = icoImages.length;
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // reserved
  icoHeader.writeUInt16LE(1, 2); // ICO format
  icoHeader.writeUInt16LE(count, 4);

  let offset = 6 + count * 16;
  const entries = [];
  for (const img of icoImages) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.w >= 256 ? 0 : img.w, 0);
    entry.writeUInt8(img.h >= 256 ? 0 : img.h, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(img.buf.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset
    entries.push(entry);
    offset += img.buf.length;
  }
  const icoBuffer = Buffer.concat([icoHeader, ...entries, ...icoImages.map(i => i.buf)]);

  // 3. Write icons to destination locations
  const writes = [
    { path: 'CMS/src/app/favicon.ico', buf: icoBuffer },
    { path: 'CMS/public/favicon.ico', buf: icoBuffer },
    { path: 'public/favicon.ico', buf: icoBuffer },
    
    { path: 'CMS/src/app/favicon-96x96.png', buf: png96 },
    { path: 'CMS/public/favicon-96x96.png', buf: png96 },

    { path: 'CMS/src/app/apple-touch-icon.png', buf: png180 },
    { path: 'CMS/public/apple-touch-icon.png', buf: png180 },
    { path: 'CMS/public/assets/img/apple-icon.png', buf: png180 },

    { path: 'CMS/public/favicon.webp', buf: png80Webp },
    { path: 'public/favicon.webp', buf: png80Webp },

    { path: 'CMS/public/assets/img/favicon.png', buf: png128 },
    { path: 'CMS/public/ui-assets/img/favicon.png', buf: png128 },
    { path: 'public/assets/img/favicon.png', buf: png128 },

    { path: 'CMS/src/app/web-app-manifest-192x192.png', buf: png192 },
    { path: 'src/app/web-app-manifest-192x192.png', buf: png192 },

    { path: 'CMS/src/app/web-app-manifest-512x512.png', buf: png512 },
    { path: 'src/app/web-app-manifest-512x512.png', buf: png512 },
  ];

  for (const w of writes) {
    const dir = path.dirname(w.path);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(w.path, w.buf);
    console.log(`Saved: ${w.path} (${w.buf.length} bytes)`);
  }

  // 4. Generate SVG icon
  console.log('Generating favicon.svg with embedded high-resolution emblem...');
  const base64Emblem = png512.toString('base64');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <image href="data:image/png;base64,${base64Emblem}" x="0" y="0" width="512" height="512" />
</svg>`;
  fs.writeFileSync('CMS/src/app/favicon.svg', svgContent, 'utf8');
  console.log('Saved: CMS/src/app/favicon.svg');

  // 5. Generate high-impact 1200x630 Open Graph Image (og-image.png)
  console.log('Generating 1200x630 Open Graph preview image (og-image.png)...');
  
  // Resize logo for OG card
  const ogLogo = await sharp('CMS/public/white-logo.png')
    .resize(760, null, { fit: 'inside' })
    .toBuffer();

  const svgOgText = Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0a0f1d" />
          <stop offset="50%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#1e1b4b" />
        </linearGradient>
        <linearGradient id="cardGlow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.3" />
          <stop offset="50%" stop-color="#6366f1" stop-opacity="0.5" />
          <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.3" />
        </linearGradient>
      </defs>

      <!-- Background -->
      <rect width="1200" height="630" fill="url(#bgGradient)" />

      <!-- Top Accent Bar -->
      <rect x="0" y="0" width="1200" height="6" fill="url(#cardGlow)" />

      <!-- Subtle background tech grid lines -->
      <g stroke="#ffffff" stroke-opacity="0.04" stroke-width="1">
        <line x1="100" y1="0" x2="100" y2="630" />
        <line x1="300" y1="0" x2="300" y2="630" />
        <line x1="500" y1="0" x2="500" y2="630" />
        <line x1="700" y1="0" x2="700" y2="630" />
        <line x1="900" y1="0" x2="900" y2="630" />
        <line x1="1100" y1="0" x2="1100" y2="630" />
        <line x1="0" y1="150" x2="1200" y2="150" />
        <line x1="0" y1="300" x2="1200" y2="300" />
        <line x1="0" y1="450" x2="1200" y2="450" />
      </g>

      <!-- Badge -->
      <g transform="translate(600, 110)">
        <rect x="-140" y="-18" width="280" height="36" rx="18" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
        <text x="0" y="6" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#38bdf8" letter-spacing="1.5">ENTERPRISE CLOUD PLATFORM</text>
      </g>

      <!-- Bottom Headline & Subtitle -->
      <g transform="translate(600, 430)">
        <text x="0" y="0" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="700" fill="#ffffff" letter-spacing="-0.5">Enterprise HRMS, Payroll &amp; Workforce Management</text>
        <text x="0" y="42" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="400" fill="#94a3b8">Biometric Sync • Global Compliance • Multi-Tenant Architecture</text>
      </g>

      <!-- Domain footer badge -->
      <g transform="translate(600, 550)">
        <text x="0" y="0" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="#64748b" letter-spacing="1">WWW.MASTERHRMS.COM</text>
      </g>
    </svg>
  `);

  const ogImage = await sharp(svgOgText)
    .composite([
      {
        input: ogLogo,
        top: 175,
        left: Math.round((1200 - 760) / 2),
      }
    ])
    .png()
    .toBuffer();

  fs.writeFileSync('CMS/public/og-image.png', ogImage);
  fs.writeFileSync('public/og-image.png', ogImage);
  console.log(`Saved: CMS/public/og-image.png (${ogImage.length} bytes)`);
  console.log(`Saved: public/og-image.png (${ogImage.length} bytes)`);

  console.log('Brand asset generation complete.');
}

main().catch(err => {
  console.error('Asset generation failed:', err);
  process.exit(1);
});

