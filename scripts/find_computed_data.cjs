const fs = require('fs');
const content = fs.readFileSync('src/routes/_authenticated/hr/organization/certificate-designer/$templateId.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('computedData')) {
    console.log(`Line ${i + 1}: ${l.trim()}`);
  }
});
