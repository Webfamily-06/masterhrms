const fs = require('fs');
const path = require('path');

const fileCounts = [];

function scanDir(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory() && !['node_modules', '.git', '.next'].includes(item.name)) {
      scanDir(full);
    } else if (item.isFile() && (item.name.endsWith('.tsx') || item.name.endsWith('.ts'))) {
      const code = fs.readFileSync(full, 'utf8');
      const matches = code.match(/#[0-9a-fA-F]{6}\b/g);
      if (matches && matches.length > 5) {
        fileCounts.push({ file: full, count: matches.length });
      }
    }
  }
}

scanDir('src');
fileCounts.sort((a, b) => b.count - a.count);
console.log(fileCounts.slice(0, 20));

