const fs = require('fs');
const path = require('path');

const srcDir = 'public/flags';
const targetDir1 = 'CMS/public/flags';
const targetDir2 = 'CMS/public/assets/img/flags';
const targetDir3 = 'CMS/public/assets/img/payment-gateway';

[targetDir1, targetDir2, targetDir3].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 1. Copy all flags to CMS/public/flags and CMS/public/assets/img/flags
const files = fs.readdirSync(srcDir);
let copied = 0;

for (const file of files) {
  if (file.endsWith('.svg') || file.endsWith('.png')) {
    fs.copyFileSync(path.join(srcDir, file), path.join(targetDir1, file));
    fs.copyFileSync(path.join(srcDir, file), path.join(targetDir2, file));
    copied++;
  }
}
console.log(`Copied ${copied} flags to ${targetDir1} and ${targetDir2}`);

// 2. Map country-01.svg .. country-05.svg in payment-gateway for SmartHR compatibility
// In SmartHR:
// country-01: USA (us.svg)
// country-02: UAE (ae.svg)
// country-03: Singapore (sg.svg)
// country-04: France (fr.svg)
// country-05: Norway (no.svg)
const mapping = {
  'country-01.svg': 'us.svg',
  'country-02.svg': 'ae.svg',
  'country-03.svg': 'sg.svg',
  'country-04.svg': 'fr.svg',
  'country-05.svg': 'no.svg'
};

for (const [targetName, srcFlag] of Object.entries(mapping)) {
  const srcPath = path.join(srcDir, srcFlag);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, path.join(targetDir3, targetName));
    console.log(`Mapped ${targetDir3}/${targetName} <- ${srcFlag}`);
  } else {
    console.warn(`Source flag not found: ${srcFlag}`);
  }
}

console.log('Flag synchronization complete!');
