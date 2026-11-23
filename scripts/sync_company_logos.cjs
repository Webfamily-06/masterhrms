const fs = require('fs');
const path = require('path');

const targetDir = 'CMS/public/assets/img/company';
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copy company-01 through 10
for (let i = 1; i <= 10; i++) {
  const pad = String(i).padStart(2, '0');
  const src = 'CMS/public/ui-assets/company/company-' + pad + '.svg';
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(targetDir, 'company-' + pad + '.svg'));
    fs.copyFileSync(src, path.join(targetDir, 'company-' + i + '.svg'));
  }
}

// Copy icon 11 through 18
for (let i = 11; i <= 18; i++) {
  const src = 'CMS/public/ui-assets/icons/company-icon-' + i + '.svg';
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(targetDir, 'company-' + i + '.svg'));
  }
}

// For 19 through 35, map to existing company logos
for (let i = 19; i <= 35; i++) {
  const mod = ((i - 1) % 10) + 1;
  const modPad = String(mod).padStart(2, '0');
  const src = path.join(targetDir, 'company-' + modPad + '.svg');
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(targetDir, 'company-' + i + '.svg'));
  }
}

console.log('✅ Synchronized company logos in ' + targetDir);
