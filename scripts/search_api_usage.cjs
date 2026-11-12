const fs = require('fs');
const path = require('path');

function searchCalls(dir, label) {
  const results = [];
  function walk(curr) {
    const entries = fs.readdirSync(curr, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(curr, e.name);
      if (e.isDirectory()) {
        if (!['node_modules', '.next', 'dist', '.git', 'coverage'].includes(e.name)) {
          walk(full);
        }
      } else if (/\.(tsx|ts|jsx|js)$/.test(e.name)) {
        const text = fs.readFileSync(full, 'utf8');
        const hasLegacy = text.includes('"/api/employees"') || text.includes("'/api/employees'") || text.includes('api.get("/employees"') || text.includes("api.get('/employees'");
        const hasHr = text.includes('"/hr/employees"') || text.includes("'/hr/employees'") || text.includes('"/api/hr/employees"') || text.includes("'/api/hr/employees'");
        if (hasLegacy || hasHr) {
          results.push({ file: full.replace(process.cwd() + '\\', ''), legacy: hasLegacy, hr: hasHr });
        }
      }
    }
  }
  walk(dir);
  console.log(`=== ${label} (${results.length} files calling employee APIs) ===`);
  results.forEach(r => console.log(`${r.file} -> Legacy: ${r.legacy}, HR: ${r.hr}`));
}

searchCalls('src', 'TanStack Frontend');
searchCalls('CMS/src', 'CMS Frontend');

