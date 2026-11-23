const fs = require('fs');
const path = require('path');

// 1. Gather all Next.js CMS pages
function getFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (item !== 'node_modules' && item !== '.next' && item !== '.git') {
        getFiles(full, files);
      }
    } else if (item.startsWith('page.') && (item.endsWith('.tsx') || item.endsWith('.jsx') || item.endsWith('.ts') || item.endsWith('.js'))) {
      files.push(full);
    }
  }
  return files;
}

const cmsPageFiles = getFiles('CMS/src/app');
console.log('CMS page files found:', cmsPageFiles.length);

// Convert page files to route URLs
function filePathToRoute(filePath) {
  // e.g. CMS/src/app/(workspace)/employees/page.tsx -> /employees
  let rel = filePath.replace(/\\/g, '/');
  rel = rel.replace(/^CMS\/src\/app/, '');
  rel = rel.replace(/\/page\.(tsx|jsx|ts|js)$/, '');
  // Remove route groups like (workspace), (auth), (public)
  const segments = rel.split('/').filter(s => s && !s.startsWith('(') || !s.endsWith(')'));
  const cleanRoute = '/' + segments.filter(s => !(s.startsWith('(') && s.endsWith(')'))).join('/');
  return cleanRoute === '' ? '/' : cleanRoute;
}

const cmsRoutes = cmsPageFiles.map(f => ({
  file: f.replace(/\\/g, '/'),
  route: filePathToRoute(f)
}));

// 2. Gather TanStack Start routes
function getTanstackFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      getTanstackFiles(full, files);
    } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

const tanstackFiles = getTanstackFiles('src/routes');
console.log('TanStack route files found:', tanstackFiles.length);

// 3. Extract all links from dreams-sidebar.tsx
const sidebarCode = fs.readFileSync('CMS/src/components/dreams-sidebar.tsx', 'utf8');
const sidebarLinkMatches = [...sidebarCode.matchAll(/to="([^"]+)"/g)].map(m => m[1]);
const sidebarHrefMatches = [...sidebarCode.matchAll(/href="([^"#][^"]*)"/g)].map(m => m[1]);
const allSidebarLinks = [...new Set([...sidebarLinkMatches, ...sidebarHrefMatches])];
console.log('Unique routes found in dreams-sidebar.tsx:', allSidebarLinks.length);

// 4. Extract from nav/registry.ts
const registryCode = fs.readFileSync('CMS/src/nav/registry.ts', 'utf8');
const registryPaths = [...registryCode.matchAll(/path:\s*([A-Za-z0-9_.]+|"[^"]+"|'[^']+')/g)].map(m => m[1]);
console.log('Registry paths count:', registryPaths.length);

// 5. Extract ROUTES from CMS/src/lib/routes.ts
const routesCode = fs.readFileSync('CMS/src/lib/routes.ts', 'utf8');
const definedRouteStrings = [...routesCode.matchAll(/:\s*"([^"]+)"/g)].map(m => m[1]);
console.log('Defined route strings in routes.ts:', definedRouteStrings.length);

const summary = {
  cmsPageFilesCount: cmsPageFiles.length,
  tanstackFilesCount: tanstackFiles.length,
  sidebarLinksCount: allSidebarLinks.length,
  definedRouteStringsCount: definedRouteStrings.length,
  allSidebarLinksSample: allSidebarLinks.slice(0, 30),
  cmsRoutesSample: cmsRoutes.slice(0, 30)
};

fs.writeFileSync('scripts/audit_summary_prelim.json', JSON.stringify(summary, null, 2));
console.log('Preliminary summary saved to scripts/audit_summary_prelim.json');
