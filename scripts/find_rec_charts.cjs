const fs = require('fs');
const path = require('path');

function searchInDir(dir, pattern) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      searchInDir(full, pattern);
    } else if (f.endsWith('.js')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes(pattern)) {
        console.log(`Found "${pattern}" in ${full}`);
      }
    }
  }
}

searchInDir('SMARTHR/assets', 'recruitment');
searchInDir('SMARTHR/assets', 'avghiretime');
