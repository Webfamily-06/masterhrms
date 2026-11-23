const fs = require('fs');

const files = [
  'deals-dashboard.html',
  'leads-dashboard.html',
  'hr-dashboard.html',
  'payroll-dashboard.html',
  'attendance-dashboard.html',
  'finance-dashboard.html',
  'it-admin-dashboard.html',
  'asset-dashboard.html',
  'help-desk-dashboard.html'
];

const apexJs = fs.readFileSync('SMARTHR/assets/plugins/apexchart/chart-data.js', 'utf8');
const chartJs = fs.readFileSync('SMARTHR/assets/plugins/chartjs/chart-data.js', 'utf8');

for (const f of files) {
  const html = fs.readFileSync('SMARTHR/' + f, 'utf8');
  // find canvas IDs
  const canvases = [...html.matchAll(/<canvas[^>]*id="([^"]+)"/g)].map(m => m[1]);
  // find div IDs with chart
  const divCharts = [...html.matchAll(/<div[^>]*id="([^"]*(?:chart|graph|trend|report|status|category|compliance|growth|cost|reimbr)[^"]*)"/gi)].map(m => m[1]);
  
  console.log(`=== ${f} ===`);
  console.log('Canvases:', canvases);
  console.log('Div charts:', divCharts);
}
