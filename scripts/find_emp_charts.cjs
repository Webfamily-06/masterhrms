const fs = require('fs');

const html = fs.readFileSync('employee_dashboard_pw.html', 'utf8');
const ids = [...html.matchAll(/id="([^"]*chart[^"]*)"/gi)].map(m => m[1]);
console.log('Chart container IDs in employee-dashboard:', ids);
