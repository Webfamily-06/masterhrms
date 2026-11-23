const fs = require('fs');

const raw = fs.readFileSync('tenant_dashboard_pw.html', 'utf8');
const lines = raw.split('\n');
console.log(lines.slice(0, 100).join('\n'));
