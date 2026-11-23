const fs = require('fs');

const html = fs.readFileSync('recruitment_dashboard_pw.html', 'utf8');
const ids = [...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
console.log('All IDs in recruitment_dashboard_pw.html:', ids);
const canvases = [...html.matchAll(/<canvas[^>]*id="([^"]+)"/g)].map(m => m[1]);
console.log('Canvases:', canvases);
