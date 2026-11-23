const fs = require('fs');
const path = require('path');

const dir = 'CMS/src/app/(workspace)';
const dashboards = [
  'tenant/dashboard/page.tsx',
  'employee-dashboard/page.tsx',
  'me/dashboard/page.tsx',
  'deals-dashboard/page.tsx',
  'leads-dashboard/page.tsx',
  'hrm-dashboard/page.tsx',
  'payroll-dashboard/page.tsx',
  'recruitment-dashboard/page.tsx',
  'attendance-dashboard/page.tsx',
  'finance-dashboard/page.tsx',
  'it-admin-dashboard/page.tsx',
  'asset-dashboard/page.tsx',
  'support-dashboard/page.tsx'
];

for (const d of dashboards) {
  const fp = path.join(dir, d);
  if (!fs.existsSync(fp)) continue;
  const content = fs.readFileSync(fp, 'utf8');
  const matches = [];
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (/flag|country|payment-gateway|\/us\.svg|\/ae\.svg/i.test(line)) {
      matches.push(`Line ${idx + 1}: ${line.trim().slice(0, 80)}`);
    }
  });
  if (matches.length > 0) {
    console.log(`=== ${d} (${matches.length} matches) ===`);
    matches.slice(0, 10).forEach(m => console.log(' ', m));
  }
}
