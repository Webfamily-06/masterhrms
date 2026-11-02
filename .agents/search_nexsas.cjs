const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const ignoreDirs = new Set(['.git', 'node_modules', '.next', 'dist', 'build', '.cache']);

const searchTerms = [
  /nexsas/i,
  /automation\s+saas/i,
  /static\s*mania/i,
  /staticmania/i,
  /prismic\.io/i
];

const results = [];

function walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return;
  }
  for (const entry of entries) {
    if (ignoreDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      // Skip large binaries / lock files
      if (['.png', '.jpg', '.jpeg', '.webp', '.ico', '.pdf', '.woff', '.woff2', '.ttf', '.eot', '.lock', '.log'].includes(ext)) {
        continue;
      }
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          for (const term of searchTerms) {
            if (term.test(line)) {
              results.push({
                file: path.relative(rootDir, fullPath).replace(/\\/g, '/'),
                line: i + 1,
                term: term.toString(),
                snippet: line.trim().slice(0, 200)
              });
              break;
            }
          }
        }
      } catch (err) {
        // ignore unreadable
      }
    }
  }
}

walk(rootDir);
console.log(`Found ${results.length} occurrences across files:`);
const files = {};
for (const r of results) {
  files[r.file] = (files[r.file] || 0) + 1;
}
console.log(JSON.stringify(files, null, 2));

console.log('\nSample occurrences:');
results.slice(0, 40).forEach(r => console.log(`${r.file}:${r.line} [${r.term}] ${r.snippet}`));

