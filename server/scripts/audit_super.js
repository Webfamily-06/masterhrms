const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../../src/routes/_authenticated/super');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'route.tsx');

const results = files.map(file => {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  const lines = content.split('\n').length;
  
  const apiRegex = /api\.(get|post|put|delete|patch)\((['"`])([^'"`]+)\2/g;
  const apiCalls = [];
  let match;
  while ((match = apiRegex.exec(content)) !== null) {
    apiCalls.push(`${match[1].toUpperCase()} ${match[3]}`);
  }

  const cmsCalls = apiCalls.filter(c => c.includes('/cms/'));
  const relCalls = apiCalls.filter(c => !c.includes('/cms/'));
  const uniqueEndpoints = [...new Set(relCalls.map(c => c.split('?')[0]))];

  return {
    file,
    lines,
    totalApis: apiCalls.length,
    cmsCount: cmsCalls.length,
    relCount: relCalls.length,
    endpoints: uniqueEndpoints
  };
});

results.sort((a, b) => b.lines - a.lines);
console.log(JSON.stringify(results, null, 2));
