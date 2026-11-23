const fs = require('fs');

const html = fs.readFileSync('employee_dashboard_pw.html', 'utf8');
const lines = html.split('\n');
lines.forEach((l, i) => {
  if (l.includes('circle-bar') || l.includes('progress') || l.includes('chart')) {
    console.log(`Line ${i + 1}: ${l.trim()}`);
  }
});
