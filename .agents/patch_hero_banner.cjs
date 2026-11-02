const sharp = require('sharp');
const fs = require('fs');

async function patchHeroBanner() {
  console.log('Patching Nexsas brand from hero banner (ns-img-3.png)...');

  // Load the official emblem (trimmed)
  const emblemCrop = await sharp('CMS/public/white-logo.png')
    .extract({ left: 0, top: 0, width: 484, height: 484 })
    .toBuffer();
  const trimmedEmblem = await sharp(emblemCrop).trim().toBuffer();

  // Create replacement brand pill
  // Icon: 64x64 with blue gradient background matching MasterHRMS
  const iconEmblem = await sharp(trimmedEmblem)
    .resize(46, 46, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const brandSquare = await sharp({
    create: {
      width: 66,
      height: 66,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 0.9 }
    }
  })
  .composite([{ input: iconEmblem, gravity: 'center' }])
  .png()
  .toBuffer();

  // Rounded icon with stroke
  const roundedIconSvg = Buffer.from(`
    <svg width="66" height="66">
      <rect x="0" y="0" width="66" height="66" rx="16" fill="#1e293b" stroke="#3b82f6" stroke-width="1.5" />
    </svg>
  `);

  const brandedIcon = await sharp(roundedIconSvg)
    .composite([{ input: iconEmblem, gravity: 'center' }])
    .png()
    .toBuffer();

  // SVG replacement text
  const textSvg = Buffer.from(`
    <svg width="300" height="70" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="300" height="70" fill="transparent" />
      <text x="0" y="28" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" fill="#ffffff" letter-spacing="-0.3">MasterHRMS</text>
      <text x="0" y="52" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="500" fill="#94a3b8">Workforce &amp; Payroll</text>
    </svg>
  `);

  // Mask area to wipe out old Nexsas icon & text in ns-img-3.png:
  // Wipe out rectangle from left: 50, top: 145, width: 320, height: 80
  const wipeMask = Buffer.from(`
    <svg width="340" height="85">
      <rect x="0" y="0" width="340" height="85" fill="#0b1120" opacity="0.4" rx="12" />
    </svg>
  `);

  // Patch in both public/images/ns-img-3.png and CMS/public/images/ns-img-3.png
  const targets = [
    'public/images/ns-img-3.png',
    'CMS/public/images/ns-img-3.png'
  ];

  for (const t of targets) {
    if (!fs.existsSync(t)) continue;
    const patched = await sharp(t)
      .composite([
        { input: wipeMask, left: 48, top: 142 },
        { input: brandedIcon, left: 54, top: 152 },
        { input: textSvg, left: 132, top: 150 },
      ])
      .png()
      .toBuffer();

    fs.writeFileSync(t, patched);
    console.log(`Successfully patched hero banner: ${t}`);
  }
}

patchHeroBanner().catch(console.error);

