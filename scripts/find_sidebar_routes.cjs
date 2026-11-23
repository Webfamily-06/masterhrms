const fs = require('fs');

const code = fs.readFileSync('CMS/src/components/dreams-sidebar.tsx', 'utf8');
const lines = code.split('\n');
lines.forEach((l, i) => {
  if (l.includes('tenant/dashboard') || l.includes('hrm-dashboard') || l.includes('deals-dashboard')) {
    console.log(`Line ${i + 1}: ${l.trim()}`);
  }
});
