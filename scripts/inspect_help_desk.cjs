const fs = require('fs');

const html = fs.readFileSync('SMARTHR/help-desk-dashboard.html', 'utf8');
const canvases = [...html.matchAll(/<canvas[^>]*id="([^"]+)"/g)].map(m => m[1]);
console.log('Canvases in help-desk-dashboard:', canvases);
const divs = [...html.matchAll(/<div[^>]*id="([^"]+)"/g)].map(m => m[1]);
console.log('Div IDs in help-desk-dashboard:', divs);
