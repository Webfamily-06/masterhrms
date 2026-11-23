const fs = require('fs');

const code = fs.readFileSync('SMARTHR/assets/plugins/apexchart/chart-data.js', 'utf8');
const lines = code.split('\n');

function findBlock(id) {
  const idx = lines.findIndex(l => l.includes(`'#${id}'`) || l.includes(`"#${id}"`) || l.includes(id));
  if (idx !== -1) {
    console.log(`=== Block for ${id} (around line ${idx + 1}) ===`);
    console.log(lines.slice(Math.max(0, idx - 5), Math.min(lines.length, idx + 45)).join('\n'));
  }
}

findBlock('leaves_chart');
findBlock('performance_chart2');
