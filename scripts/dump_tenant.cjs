const fs = require('fs');

const html = fs.readFileSync('SMARTHR/index.html', 'utf8');
const startTag = '<div class="content">';
const startIdx = html.indexOf(startTag);
const endIdx = html.indexOf('<!-- /Page Wrapper -->');
if (startIdx !== -1 && endIdx !== -1) {
  const sub = html.slice(startIdx + startTag.length, endIdx);
  const footerIdx = sub.indexOf('<div class="footer');
  const content = footerIdx !== -1 ? sub.slice(0, footerIdx) : sub;
  fs.writeFileSync('tenant_dashboard_pw.html', content.trim());
  console.log('Saved tenant_dashboard_pw.html, size:', content.length);
} else {
  console.log('Could not find start/end tags');
}
