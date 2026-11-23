const fs = require('fs');

const html = fs.readFileSync('SMARTHR/employee-dashboard.html', 'utf8');
const headMatch = html.match(/<head>([\s\S]*?)<\/head>/);
if (headMatch) {
  const cssLinks = [...headMatch[1].matchAll(/href="([^"]+\.css)"/g)].map(m => m[1]);
  console.log('CSS links in SMARTHR/employee-dashboard.html:', cssLinks);
}
