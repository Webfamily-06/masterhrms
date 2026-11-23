const fs = require('fs');

const raw = fs.readFileSync('employee_dashboard_pw.html', 'utf8');
const lines = raw.split('\n');
console.log('First 10 lines:');
console.log(lines.slice(0, 10).join('\n'));
console.log('--- Last 10 lines: ---');
console.log(lines.slice(-10).join('\n'));
