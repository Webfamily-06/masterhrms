const fs = require('fs');

function searchFile(filepath, term) {
  if (!fs.existsSync(filepath)) return;
  const content = fs.readFileSync(filepath, 'utf8');
  if (content.includes(term)) {
    console.log(`Found "${term}" in ${filepath}`);
  }
}

['SMARTHR/assets/plugins/apexchart/chart-data.js', 'SMARTHR/assets/plugins/chartjs/chart-data.js'].forEach(p => {
  searchFile(p, 'mySemiDonutChart');
  searchFile(p, 'attendance');
});
