const fs = require('fs');

const html = fs.readFileSync('tenant_dashboard_pw.html', 'utf8');
const ids = [...html.matchAll(/id="([^"]*chart[^"]*)"/gi)].map(m => m[1]);
console.log('Chart container IDs in index.html:', ids);
const canvases = [...html.matchAll(/<canvas[^>]*id="([^"]+)"/g)].map(m => m[1]);
console.log('Canvases:', canvases);

// Also look for card headers/titles
const headers = [...html.matchAll(/<(?:h[3-6]|h5)[^>]*>([\s\S]*?)<\/(?:h[3-6]|h5)>/gi)]
  .map(m => m[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' '))
  .filter(t => t.length > 2 && t.length < 50);
console.log('Headers in tenant_dashboard_pw.html (first 20):', headers.slice(0, 20));
