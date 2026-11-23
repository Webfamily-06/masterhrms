const fs = require('fs');
const path = require('path');

// 1. Addons in CMS/src/app/(workspace)/addons
const addonDirs = fs.readdirSync('CMS/src/app/(workspace)/addons').filter(f => {
  return fs.statSync(path.join('CMS/src/app/(workspace)/addons', f)).isDirectory();
});
console.log('Addon directories in CMS:', addonDirs);

// 2. Addon subpages
const addonPages = [];
function getAddonPages(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      getAddonPages(full);
    } else if (item.startsWith('page.')) {
      addonPages.push(full.replace(/\\/g, '/'));
    }
  }
}
getAddonPages('CMS/src/app/(workspace)/addons');
console.log('Total addon page.tsx files:', addonPages.length);

// 3. Navigation resolver aliases
const navResCode = fs.readFileSync('CMS/src/lib/navigation-resolver.ts', 'utf8');
const aliasMatch = navResCode.match(/ADDON_ALIASES:\s*Record<string,\s*string\[\]>\s*=\s*{([\s\S]*?)};/);
let aliases = {};
if (aliasMatch) {
  try {
    eval('aliases = {' + aliasMatch[1] + '}');
  } catch (e) {
    console.log('Error parsing aliases');
  }
}
console.log('Registered addon aliases in navigation-resolver.ts:', Object.keys(aliases));

// 4. Prisma Addon seeds/models
const prismaCode = fs.readFileSync('server/prisma/schema.prisma', 'utf8');
const addonModelMatch = prismaCode.match(/model Addon {([\s\S]*?)}/);

fs.writeFileSync('scripts/addon_audit.json', JSON.stringify({
  addonDirs,
  addonPagesCount: addonPages.length,
  addonPages: addonPages.slice(0, 30),
  registeredAddonAliases: Object.keys(aliases)
}, null, 2));
