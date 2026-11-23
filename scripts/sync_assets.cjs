const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('Copying SMARTHR/assets/img to CMS/public/assets/img...');
copyDir('SMARTHR/assets/img', 'CMS/public/assets/img');

// Also copy fontawesome webfonts if any
if (fs.existsSync('SMARTHR/assets/plugins/fontawesome')) {
  copyDir('SMARTHR/assets/plugins/fontawesome', 'CMS/public/assets/plugins/fontawesome');
}

console.log('Copy complete!');
