const fs = require('fs');

const html = fs.readFileSync('SMARTHR/employee-dashboard.html', 'utf8');
const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1]);
console.log('Script sources:', scripts);

// Also look in SMARTHR/assets/js for employee dashboard chart logic
const jsFiles = ['assets/js/employee-dashboard.js', 'assets/js/theme-charts.js', 'assets/js/chart.js'];
jsFiles.forEach(f => {
  const p = 'SMARTHR/' + f;
  if (fs.existsSync(p)) {
    console.log(`Found ${f}`);
  }
});
