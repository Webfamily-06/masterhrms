const fs = require('fs');
const path = require('path');

const tanstackFile = path.resolve(__dirname, '../src/routes/_authenticated/hr/organization/certificate-designer/$templateId.tsx');
const cmsFile = path.resolve(__dirname, '../CMS/src/app/(workspace)/hr/organization/certificate-designer/[templateId]/page.tsx');

function search(file, label) {
  console.log(`\n=== SEARCHING ${label} ===`);
  const lines = fs.readFileSync(file, 'utf-8').split('\n');
  lines.forEach((l, i) => {
    if (
      l.toLowerCase().includes('real-time') ||
      l.toLowerCase().includes('binding') ||
      l.toLowerCase().includes('live qr') ||
      l.toLowerCase().includes('custom text') ||
      l.toLowerCase().includes('selectedelementid')
    ) {
      console.log(`${i + 1}: ${l.trim()}`);
    }
  });
}

search(tanstackFile, 'TanStack');
search(cmsFile, 'CMS');

