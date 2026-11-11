const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (['node_modules', '.next', 'dist', 'public', '.git', 'build', 'tests', '__tests__'].includes(file)) continue;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) walk(filePath, fileList);
    else if (/\.(tsx|jsx|ts|js)$/.test(file)) fileList.push(filePath);
  }
  return fileList;
}

const files = [...walk('src'), ...walk('CMS/src')];
console.log(`Auditing ${files.length} production frontend files for console statements...\n`);

const consoleMatches = [];

for (const file of files) {
  // Exclude test files
  if (file.endsWith('.test.ts') || file.endsWith('.spec.ts') || file.includes('scratch')) continue;

  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    if (/\bconsole\.(log|debug|info)\s*\(/.test(line)) {
      consoleMatches.push({
        file,
        line: idx + 1,
        text: line.trim()
      });
    }
  });
}

console.log(`Total production console.log/debug/info found: ${consoleMatches.length}\n`);

const byFile = {};
consoleMatches.forEach(m => {
  byFile[m.file] = (byFile[m.file] || []).concat(m);
});

for (const [file, items] of Object.entries(byFile)) {
  console.log(`[FILE] ${file} (${items.length} logs)`);
  items.slice(0, 3).forEach(i => console.log(`   L${i.line}: ${i.text.slice(0, 90)}`));
}

