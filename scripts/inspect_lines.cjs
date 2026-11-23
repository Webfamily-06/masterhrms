const fs = require('fs');

const code = fs.readFileSync('CMS/src/app/(workspace)/employee-dashboard/page.tsx', 'utf8');
const lines = code.split('\n');

// Check lines 1515-1540 with exact characters
for (let i = 1515; i < Math.min(lines.length, 1540); i++) {
  console.log(`${i+1}: ${JSON.stringify(lines[i])}`);
}
