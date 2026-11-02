const fs = require('fs');
const path = require('path');
const ignore = new Set(['.git', 'node_modules', '.next', 'dist', 'build', '.cache', '.playwright-mcp']);
const terms = [/dreams\s*erp/i, /apex\s*hrms/i, /tsv\s*global/i, /master\s*workspace\s*erp/i];

const matches = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignore.has(f.name)) continue;
    const full = path.join(dir, f.name);
    if (f.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js|jsx|json|html|md)$/i.test(f.name)) {
      try {
        const lines = fs.readFileSync(full, 'utf8').split('\n');
        lines.forEach((l, i) => {
          terms.forEach(t => {
            if (t.test(l)) {
              matches.push({ file: path.relative(process.cwd(), full).replace(/\\/g, '/'), line: i+1, text: l.trim() });
            }
          });
        });
      } catch(e) {}
    }
  }
}
walk(process.cwd());
console.log('Found brand matches count:', matches.length);
const files = {};
matches.forEach(m => files[m.file] = (files[m.file] || 0) + 1);
console.log(JSON.stringify(files, null, 2));
matches.filter(m => !m.file.endsWith('.md')).forEach(m => console.log(m.file + ':' + m.line + ' | ' + m.text));

