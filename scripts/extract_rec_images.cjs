const fs = require('fs');

const html = fs.readFileSync('recruitment_dashboard_pw.html', 'utf8');
const imgs = [...html.matchAll(/src="([^"]+)"/g)].map(m => m[1]);
console.log('Images in recruitment_dashboard_pw.html:', [...new Set(imgs)]);
