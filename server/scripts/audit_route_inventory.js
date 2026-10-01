const fs = require('fs');
const path = require('path');

const appDir = path.resolve(__dirname, '../../src/routes/_authenticated/_app');
const superDir = path.resolve(__dirname, '../../src/routes/_authenticated/super');
const rootRoutesDir = path.resolve(__dirname, '../../src/routes');

function scanDir(dir, prefix = '') {
  const items = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith('_') || entry.name === 'super' || entry.name === 'client' || entry.name === 'employee') {
        continue;
      }
      items.push(...scanDir(path.join(dir, entry.name), prefix + '/' + entry.name));
    } else if (entry.name.endsWith('.tsx')) {
      const filePath = path.join(dir, entry.name);
      const content = fs.readFileSync(filePath, 'utf8');
      
      const apiMatches = [];
      const apiRegex = /api\.(get|post|put|patch|delete)\(\s*[`'"]([^`'"]+)[`'"]/g;
      let match;
      while ((match = apiRegex.exec(content)) !== null) {
        apiMatches.push(`${match[1].toUpperCase()} ${match[2]}`);
      }

      const perms = [];
      const permRegex = /requiredPermission=["']([^"']+)["']/g;
      while ((match = permRegex.exec(content)) !== null) {
        perms.push(match[1]);
      }

      const roles = [];
      const roleRegex = /roles?\s*(?:includes|\.some)\s*\(\s*([^)]+)\)/g;
      while ((match = roleRegex.exec(content)) !== null) {
        roles.push(match[1].slice(0, 40));
      }

      const routeName = (prefix + '/' + entry.name.replace('.tsx', '')).replace(/\/\//g, '/');

      items.push({
        file: entry.name,
        relPath: path.relative(path.resolve(__dirname, '../../src/routes'), filePath).replace(/\\/g, '/'),
        route: routeName,
        apis: [...new Set(apiMatches)],
        perms: [...new Set(perms)],
        hasAccessDenied: content.includes('AccessDenied'),
        hasSuperAdminMention: content.includes('super_admin') || content.includes('Super Admin'),
      });
    }
  }
  return items;
}

const appPages = scanDir(appDir, '');
const superPages = scanDir(superDir, '/super');

console.log(`Audited ${appPages.length} app pages and ${superPages.length} super pages.`);

fs.writeFileSync(
  path.resolve(__dirname, 'route_inventory_audit.json'),
  JSON.stringify({ appPages, superPages }, null, 2)
);
console.log('Saved route_inventory_audit.json');
