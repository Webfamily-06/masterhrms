const fs = require('fs');

const code = fs.readFileSync('SMARTHR/assets/plugins/chartjs/chart-data.js', 'utf8');
const lines = code.split('\n');

function findBlock(keyword) {
  const idx = lines.findIndex(l => l.includes(keyword));
  if (idx !== -1) {
    console.log(`=== Block for ${keyword} (around line ${idx + 1}) ===`);
    console.log(lines.slice(Math.max(0, idx - 2), Math.min(lines.length, idx + 35)).join('\n'));
  }
}

findBlock('mySemiDonutChart');
findBlock("'attendance'");
