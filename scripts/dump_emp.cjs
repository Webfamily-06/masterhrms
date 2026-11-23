const fs = require('fs');

const html = fs.readFileSync('SMARTHR/employee-dashboard.html', 'utf8');
const startTag = '<div class="content">';
const startIdx = html.indexOf(startTag);
const endIdx = html.indexOf('<!-- /Page Wrapper -->');
if (startIdx !== -1 && endIdx !== -1) {
  // Extract up to the last </div> before /Page Wrapper or footer
  const sub = html.slice(startIdx + startTag.length, endIdx);
  // find footer if any
  const footerIdx = sub.indexOf('<div class="footer');
  const content = footerIdx !== -1 ? sub.slice(0, footerIdx) : sub;
  fs.writeFileSync('employee_dashboard_pw.html', content.trim());
  console.log('Saved employee_dashboard_pw.html, size:', content.length);
} else {
  console.log('Could not find start/end tags');
}
