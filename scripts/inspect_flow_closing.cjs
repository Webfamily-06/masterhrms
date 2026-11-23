const fs = require('fs');

const full = fs.readFileSync('SMARTHR/employee-dashboard.html', 'utf8');
const idx = full.indexOf('Update of Project Flow');
console.log(full.slice(idx, idx + 500));
