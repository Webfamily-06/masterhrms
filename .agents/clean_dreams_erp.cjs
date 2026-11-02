const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (['.git', 'node_modules', '.next', 'dist', 'build'].includes(f.name)) continue;
    if (f.isDirectory()) replaceInDir(full);
    else if (/\.(ts|tsx|js|jsx)$/.test(f.name)) {
      let c = fs.readFileSync(full, 'utf8');
      if (c.includes('| Dreams ERP') || c.includes('in Dreams ERP') || c.includes('Dreams ERP')) {
        let changed = false;
        if (c.includes('| Dreams ERP')) {
          c = c.replaceAll('| Dreams ERP', '— MasterHRMS');
          changed = true;
        }
        if (c.includes('in Dreams ERP.')) {
          c = c.replaceAll('in Dreams ERP.', 'in MasterHRMS.');
          changed = true;
        }
        if (c.includes('in Dreams ERP')) {
          c = c.replaceAll('in Dreams ERP', 'in MasterHRMS');
          changed = true;
        }
        if (c.includes('<h2 className="text-lg font-bold text-gray-900">Dreams ERP</h2>')) {
          c = c.replaceAll('<h2 className="text-lg font-bold text-gray-900">Dreams ERP</h2>', '<h2 className="text-lg font-bold text-gray-900">MasterHRMS</h2>');
          changed = true;
        }
        if (changed) {
          fs.writeFileSync(full, c, 'utf8');
          console.log(`Replaced Dreams ERP in: ${path.relative(process.cwd(), full).replace(/\\/g, '/')}`);
        }
      }
    }
  }
}

replaceInDir('CMS/src');
replaceInDir('src');
console.log('Dreams ERP cleanup done.');

