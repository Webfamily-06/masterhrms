const sharp = require('sharp');
const fs = require('fs');
const { execSync } = require('child_process');

async function patchHeroBanner() {
  console.log('Patching hero banner with pixel-perfect transparency and MasterHRMS branding...');
  execSync('git checkout public/images/ns-img-3.png CMS/public/images/ns-img-3.png');

  // Official emblem (trimmed)
  const emblemCrop = await sharp('CMS/public/white-logo.png')
    .extract({ left: 0, top: 0, width: 484, height: 484 })
    .toBuffer();
  const trimmedEmblem = await sharp(emblemCrop).trim().toBuffer();

  const iconEmblem = await sharp(trimmedEmblem)
    .resize(54, 54, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Exactly 76x76 rounded icon matching the original 76x76 purple icon
  const roundedIconSvg = Buffer.from(`
    <svg width="76" height="76">
      <rect x="0" y="0" width="76" height="76" rx="20" fill="#0f172a" stroke="#2563eb" stroke-width="1.5" />
    </svg>
  `);

  const brandedIcon = await sharp(roundedIconSvg)
    .composite([{ input: iconEmblem, gravity: 'center' }])
    .png()
    .toBuffer();

  // SVG text with clean typography
  const textSvg = Buffer.from(`
    <svg width="280" height="76" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="30" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="700" fill="#ffffff" letter-spacing="-0.3">MasterHRMS</text>
      <text x="0" y="56" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="500" fill="#93c5fd" opacity="0.9">Workforce &amp; Payroll</text>
    </svg>
  `);

  const targets = [
    'public/images/ns-img-3.png',
    'CMS/public/images/ns-img-3.png'
  ];

  for (const t of targets) {
    // Read raw pixels of original image
    const { data, info } = await sharp(t).raw().toBuffer({ resolveWithObject: true });
    
    // Clear the rectangle completely (left: 40, top: 110, width: 360, height: 110)
    const clearLeft = 40;
    const clearTop = 110;
    const clearWidth = 360;
    const clearHeight = 110;

    for (let y = clearTop; y < clearTop + clearHeight; y++) {
      for (let x = clearLeft; x < clearLeft + clearWidth; x++) {
        const idx = (y * info.width + x) * info.channels;
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0; // Transparent!
      }
    }

    const clearedImage = await sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: info.channels
      }
    }).png().toBuffer();

    const finalImage = await sharp(clearedImage)
      .composite([
        { input: brandedIcon, left: 45, top: 125 },
        { input: textSvg, left: 135, top: 125 },
      ])
      .png()
      .toBuffer();

    fs.writeFileSync(t, finalImage);
    console.log(`Saved pixel-perfect clean hero banner: ${t}`);
  }
}

patchHeroBanner().catch(console.error);
