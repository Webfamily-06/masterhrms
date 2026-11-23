const fs = require('fs');
const content = fs.readFileSync('employee_dashboard_pw.html', 'utf8');

// Find all card headers and structure
const lines = content.split('\n');
console.log('Total lines:', lines.length);

// Print all card-header, card-title, or significant blocks
const blocks = [];
lines.forEach((line, idx) => {
  if (line.includes('card-title') || line.includes('page-breadcrumb') || line.includes('card-header') || line.includes('id="attendance_chart"') || line.includes('id="performance_chart"')) {
    blocks.push({ line: idx + 1, text: line.trim() });
  }
});

console.log('Key markers:', blocks);
