const fs = require('fs');
const path = require('path');

const inv = JSON.parse(fs.readFileSync(path.join(__dirname, 'incomplete_routes_inventory.json'), 'utf8'));

const detailedAnalysis = [];

for (const r of inv) {
  let content = '';
  if (r.filePath && fs.existsSync(r.filePath)) {
    content = fs.readFileSync(r.filePath, 'utf8');
  }

  const lines = content.split('\n');
  
  // Find all imports in file
  const importMatches = Array.from(content.matchAll(/import\s+(?:\{[^}]+\}|[a-zA-Z0-9_]+)\s+from\s+['"]([^'"]+)['"]/g));
  const isWrapper = lines.length <= 30 && /export\s+default/.test(content);

  let actualComponentFile = r.filePath;
  let actualComponentSize = content.length;
  let actualLines = lines.length;
  let isProxy = false;
  let importedPath = null;

  if (isWrapper && importMatches.length > 0) {
    // Find the component import (usually the non-tanstack import)
    const compImport = importMatches.find(m => !m[1].includes('@tanstack'));
    if (compImport) {
      importedPath = compImport[1];
      isProxy = true;
      
      let candidateBase = null;
      if (importedPath.startsWith('@/')) {
        candidateBase = path.join(__dirname, '../src', importedPath.slice(2));
      } else {
        candidateBase = path.resolve(path.dirname(r.filePath), importedPath);
      }

      for (const ext of ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts']) {
        const candidate = candidateBase + ext;
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          actualComponentFile = path.relative(path.join(__dirname, '..'), candidate).replace(/\\/g, '/');
          const targetContent = fs.readFileSync(candidate, 'utf8');
          actualComponentSize = targetContent.length;
          actualLines = targetContent.split('\n').length;
          break;
        }
      }
    }
  }

  // Determine classification
  let trueStatus = 'INCOMPLETE';
  let functionalVerdict = '';

  if (isProxy && actualComponentSize > 5000) {
    trueStatus = 'FUNCTIONALLY IMPLEMENTED PROXY';
    functionalVerdict = `Production component re-exported from ${actualComponentFile} (${actualLines} lines, ${actualComponentSize} bytes)`;
  } else if (actualComponentSize < 600) {
    trueStatus = 'STUB VIEW';
    functionalVerdict = `Empty placeholder view (${actualComponentSize} bytes); needs UI layout and API`;
  } else {
    trueStatus = 'CLIENT STATE ONLY';
    functionalVerdict = `Interactive UI (${actualLines} lines) operating in client state; lacks DB persistence`;
  }

  detailedAnalysis.push({
    routeId: r.routeId,
    declaredFile: r.filePath,
    isProxy,
    actualComponentFile,
    actualLines,
    actualComponentSize,
    trueStatus,
    functionalVerdict,
    priority: r.priority,
    module: r.module
  });
}

console.log('Total analyzed:', detailedAnalysis.length);
const statusCounts = {};
for (const a of detailedAnalysis) {
  statusCounts[a.trueStatus] = (statusCounts[a.trueStatus] || 0) + 1;
}
console.log('Corrected status breakdown:');
console.table(statusCounts);

fs.writeFileSync(path.join(__dirname, 'incomplete_routes_deep_audit.json'), JSON.stringify(detailedAnalysis, null, 2));
