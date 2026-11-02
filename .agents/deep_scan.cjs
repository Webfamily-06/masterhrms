const fs = require('fs');
const path = require('path');
const ignore = new Set(['.git', 'node_modules', '.next', 'dist', 'build', '.cache', '.playwright-mcp']);
const patterns = [
  { name: 'Nexsas', regex: /nexsas/i },
  { name: 'NextSaaS', regex: /nextsaas/i },
  { name: 'Automation SaaS', regex: /automation\s+saas/i },
  { name: 'Static Mania', regex: /static\s*mania/i },
  { name: 'Pixels71', regex: /pixels71/i },
  { name: 'Prismic', regex: /prismic\.io/i },
  { name: 'KW Generator', regex: /kw\s*generator/i },
  { name: 'Next-saas vercel', regex: /next-saas[^\s"']*/i }
];

const found = [];
function walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch(e) {
    return;
  }
  for (const f of entries) {
    if (ignore.has(f.name)) continue;
    const full = path.join(dir, f.name);
    if (f.isDirectory()) walk(full);
    else if (f.isFile() && !/\.(png|jpg|webp|ico|woff|woff2|ttf|pdf|lock)$/i.test(f.name)) {
      try {
        const lines = fs.readFileSync(full, 'utf8').split('\n');
        lines.forEach((line, i) => {
          patterns.forEach(p => {
            if (p.regex.test(line)) {
              found.push({ file: path.relative(process.cwd(), full).replace(/\\/g, '/'), line: i+1, pattern: p.name, text: line.trim() });
            }
          });
        });
      } catch(e) {}
    }
  }
}
walk(process.cwd());

const summary = {};
found.forEach(item => {
  summary[item.file] = summary[item.file] || [];
  summary[item.file].push(item);
});
for (const [file, items] of Object.entries(summary)) {
  console.log(`=== ${file} (${items.length}) ===`);
  items.forEach(it => console.log(`  L${it.line} [${it.pattern}]: ${it.text}`));
}

