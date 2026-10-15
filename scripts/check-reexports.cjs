const fs = require('fs');
const path = require('path');

const inv = JSON.parse(fs.readFileSync(path.join(__dirname, 'incomplete_routes_inventory.json'), 'utf8'));

const reexports = [];
const trueIncomplete = [];

for (const r of inv) {
  if (r.filePath && fs.existsSync(r.filePath)) {
    const c = fs.readFileSync(r.filePath, 'utf8');
    const lines = c.split('\n');
    
    // Check if it imports a page component from another route and exports it
    const importMatch = c.match(/import\s+([a-zA-Z0-9_{},\s*]+)\s+from\s+['"]([^'"]+)['"]/);
    const hasDefaultExport = /export\s+default\s+([a-zA-Z0-9_]+)/.test(c);
    
    if (lines.length <= 30 && importMatch && hasDefaultExport) {
      // Resolve the imported target file
      const dir = path.dirname(r.filePath);
      const targetRel = importMatch[2];
      let resolvedTarget = null;
      for (const ext of ['', '.tsx', '.ts', '/index.tsx', '/index.ts']) {
        const candidate = path.resolve(dir, targetRel + ext);
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          resolvedTarget = candidate;
          break;
        }
      }

      let targetSize = 0;
      if (resolvedTarget) {
        targetSize = fs.readFileSync(resolvedTarget, 'utf8').length;
      }

      reexports.push({
        routeId: r.routeId,
        filePath: r.filePath,
        targetRel,
        resolvedTarget: resolvedTarget ? path.relative(path.join(__dirname, '..'), resolvedTarget).replace(/\\/g, '/') : null,
        targetSize
      });
    } else {
      trueIncomplete.push(r);
    }
  }
}

console.log('Re-export wrapper routes count:', reexports.length);
reexports.forEach(re => console.log('  ', re.routeId, '->', re.resolvedTarget, `(${re.targetSize} bytes)`));
console.log('\nTrue standalone incomplete routes count:', trueIncomplete.length);

fs.writeFileSync(path.join(__dirname, 'reexports_analysis.json'), JSON.stringify({ reexports, trueIncomplete }, null, 2));
