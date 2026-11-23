const fs = require('fs');
const path = require('path');

const usersDir = 'CMS/public/assets/img/users';
const profilesDir = 'CMS/public/assets/img/profiles';
const socialDir = 'CMS/public/assets/img/social';

if (!fs.existsSync(socialDir)) fs.mkdirSync(socialDir, { recursive: true });

// PDF icon SVG placeholder if missing
const pdfIconPath = path.join(socialDir, 'pdf-icon.svg');
if (!fs.existsSync(pdfIconPath)) {
  const pdfSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e11d48" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M10 12a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1h-1"/></svg>`;
  fs.writeFileSync(pdfIconPath, pdfSvg);
  console.log('Created pdf-icon.svg');
}

// Find a valid avatar to use as fallback template
let fallbackAvatar = null;
const userFiles = fs.readdirSync(usersDir);
for (const f of userFiles) {
  if (f.endsWith('.jpg') || f.endsWith('.png')) {
    fallbackAvatar = path.join(usersDir, f);
    break;
  }
}

if (!fallbackAvatar) {
  const profileFiles = fs.readdirSync(profilesDir);
  for (const f of profileFiles) {
    if (f.endsWith('.jpg') || f.endsWith('.png')) {
      fallbackAvatar = path.join(profilesDir, f);
      break;
    }
  }
}

if (fallbackAvatar) {
  // Ensure user-01 to user-60 exist
  for (let i = 1; i <= 60; i++) {
    const num = String(i).padStart(2, '0');
    const target = path.join(usersDir, `user-${num}.jpg`);
    if (!fs.existsSync(target)) {
      fs.copyFileSync(fallbackAvatar, target);
    }
  }

  // Ensure avatar-01 to avatar-35 exist
  for (let i = 1; i <= 35; i++) {
    const num = String(i).padStart(2, '0');
    const target = path.join(profilesDir, `avatar-${num}.jpg`);
    if (!fs.existsSync(target)) {
      fs.copyFileSync(fallbackAvatar, target);
    }
  }
  console.log('Ensured all user and avatar image placeholders exist!');
}
