const fs = require('fs');

const content = fs.readFileSync('server/src/services/files/files.service.ts', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.match(/^\s*(public\s+)?(static\s+)?(async\s+)?[a-zA-Z0-9_]+\s*\(/)) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
