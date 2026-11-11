const fs = require('fs');
const content = fs.readFileSync('CMS/src/app/(workspace)/hr/organization/certificate-designer/[templateId]/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('previewSampleData')) {
    console.log(`Line ${i + 1}: ${l}`);
  }
});

