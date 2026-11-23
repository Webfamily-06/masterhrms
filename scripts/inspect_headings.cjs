const fs = require('fs');
const path = require('path');

const files = ['employee-dashboard.html', 'index.html', 'deals-dashboard.html', 'leads-dashboard.html'];

for (const f of files) {
  const p = path.join(__dirname, '..', 'SMARTHR', f);
  const content = fs.readFileSync(p, 'utf8');
  const startIdx = content.indexOf('<div class="page-wrapper">');
  const endIdx = content.indexOf('<!-- /Page Wrapper -->');
  const inner = startIdx !== -1 && endIdx !== -1 ? content.slice(startIdx, endIdx) : '';
  
  // Find all <h4, <h5, <h6 in inner
  const hRegex = /<(h[3-6])[^>]*>([\s\S]*?)<\/\1>/gi;
  const headings = [];
  let m;
  while ((m = hRegex.exec(inner)) !== null) {
    const text = m[2].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
    if (text && text.length < 60) {
      headings.push(text);
    }
  }
  console.log(`=== ${f} === Headings (${headings.length}):`);
  console.log(headings.slice(0, 15));
}
