const fs = require('fs');
const path = require('path');

const files = [
  'recruitment-dashboard.html',
  'employee-dashboard.html',
  'index.html',
  'deals-dashboard.html',
  'leads-dashboard.html',
  'hr-dashboard.html',
  'payroll-dashboard.html',
  'attendance-dashboard.html',
  'finance-dashboard.html',
  'it-admin-dashboard.html',
  'asset-dashboard.html',
  'help-desk-dashboard.html'
];

for (const f of files) {
  const p = path.join('SMARTHR', f);
  if (!fs.existsSync(p)) continue;
  const html = fs.readFileSync(p, 'utf8');
  const chartMatches = [...html.matchAll(/id="([^"]*(?:chart|graph|circle)[^"]*)"/gi)].map(m => m[1]);
  console.log(`${f}:`, [...new Set(chartMatches)]);
}
