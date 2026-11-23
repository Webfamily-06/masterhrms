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
  const p = path.join(__dirname, '..', 'SMARTHR', f);
  if (!fs.existsSync(p)) {
    console.log(`FILE NOT FOUND: ${f}`);
    continue;
  }
  const content = fs.readFileSync(p, 'utf8');
  const startIdx = content.indexOf('<div class="page-wrapper">');
  const endIdx = content.indexOf('<!-- /Page Wrapper -->');
  const inner = startIdx !== -1 && endIdx !== -1 ? content.slice(startIdx, endIdx) : '';
  
  // Extract major card headers or section titles
  const titles = [];
  const regex = /<(?:h[4-6]|h3|h5)\s+class="[^"]*card-title[^"]*"[^>]*>([\s\S]*?)<\/(?:h[4-6]|h3|h5)>/gi;
  let m;
  while ((m = regex.exec(inner)) !== null) {
    titles.push(m[1].replace(/<[^>]+>/g, '').trim());
  }

  // Also check general card-titles
  const regex2 = /class="[^"]*card-title[^"]*"[^>]*>([\s\S]*?)<\//gi;
  const generalTitles = [];
  while ((m = regex2.exec(inner)) !== null) {
    const t = m[1].replace(/<[^>]+>/g, '').trim();
    if (!titles.includes(t) && !generalTitles.includes(t)) {
      generalTitles.push(t);
    }
  }

  console.log(`=== ${f} === (size: ${content.length}, inner: ${inner.length})`);
  console.log('Card titles:', titles.length ? titles : generalTitles);
}
