const fs = require('fs');
const path = require('path');

function searchFiles(dir, filter, matches = []) {
  if (!fs.existsSync(dir)) return matches;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        searchFiles(fullPath, filter, matches);
      }
    } else if (entry.isFile() && /\.(tsx|jsx|ts|js)$/.test(entry.name)) {
      if (filter(fullPath, entry.name)) {
        matches.push(fullPath);
      }
    }
  }
  return matches;
}

const found = searchFiles('CMS/src', (fp, name) => {
  const content = fs.readFileSync(fp, 'utf8');
  return /dialCode|phone|phone_number|country_code|country/i.test(content) &&
         /select|dropdown|<input/i.test(content);
});

console.log('Found', found.length, 'files with country/phone/dialCode inputs:');
found.slice(0, 30).forEach(f => console.log(' ', f));
