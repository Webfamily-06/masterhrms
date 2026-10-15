const fs = require('fs');
const path = require('path');

const treeContent = fs.readFileSync(path.join(__dirname, '../src/routeTree.gen.ts'), 'utf8');

// 1. Extract import map: importIdentifier -> relativeFilePath
// e.g. import { Route as R403RouteImport } from './routes/403'
const importMatches = treeContent.matchAll(/import\s*\{\s*(?:Route\s*as\s*)?([a-zA-Z0-9_]+)\s*\}\s*from\s*['"]([^'"]+)['"]/g);
const importMap = new Map();
for (const match of importMatches) {
  importMap.set(match[1], match[2]);
}

// 2. Extract variable declarations: routeIdentifier -> importIdentifier
// e.g. const R403Route = R403RouteImport.update({
// or const AuthenticatedSuperComplianceRoute = AuthenticatedSuperComplianceRouteImport.update({
const varMatches = treeContent.matchAll(/const\s+([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_]+)\.update/g);
const varMap = new Map();
for (const match of varMatches) {
  varMap.set(match[1], match[2]);
}

// 3. Extract FileRoutesById block
const fileRoutesByIdMatch = treeContent.match(/export interface FileRoutesById {([\s\S]*?)}/);
if (!fileRoutesByIdMatch) {
  console.error('FileRoutesById not found');
  process.exit(1);
}

const lines = fileRoutesByIdMatch[1].split('\n')
  .map(l => l.trim())
  .filter(l => l.startsWith("'") || l.startsWith("__root__"));

const routeEntries = [];

for (const line of lines) {
  // '__root__': typeof rootRouteImport
  // or '/403': typeof R403Route
  // or '/_authenticated': typeof AuthenticatedRouteRouteWithChildren
  let m = line.match(/^'([^']+)':\s*typeof\s*([a-zA-Z0-9_]+)/);
  let routeId = null;
  let typeIdentifier = null;
  if (m) {
    routeId = m[1];
    typeIdentifier = m[2];
  } else {
    let mRoot = line.match(/^__root__:\s*typeof\s*([a-zA-Z0-9_]+)/);
    if (mRoot) {
      routeId = '__root__';
      typeIdentifier = mRoot[1];
    }
  }

  if (routeId && typeIdentifier) {
    // Strip 'WithChildren' if present
    let baseIdent = typeIdentifier.replace(/WithChildren$/, '');
    let importIdent = varMap.get(baseIdent) || baseIdent;
    let relFile = importMap.get(importIdent) || importMap.get(typeIdentifier);
    
    // If not found directly, try appending 'Import' or 'RouteImport'
    if (!relFile) {
      relFile = importMap.get(baseIdent + 'Import') || importMap.get(baseIdent.replace(/Route$/, '') + 'RouteImport') || importMap.get(baseIdent + 'RouteImport');
    }

    routeEntries.push({
      routeId,
      typeIdentifier,
      baseIdent,
      importIdent,
      relFile
    });
  }
}

console.log('Total routes in FileRoutesById:', routeEntries.length);

// 4. Resolve file paths and inspect source code
const results = [];
let existingCount = 0;
let missingCount = 0;

const srcDir = path.join(__dirname, '../src');

for (const r of routeEntries) {
  let resolvedPath = null;
  let exists = false;
  let content = '';

  if (r.relFile) {
    const basePath = path.resolve(srcDir, r.relFile);
    for (const ext of ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/route.tsx', '/route.ts']) {
      const candidate = basePath + ext;
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        resolvedPath = candidate;
        exists = true;
        content = fs.readFileSync(candidate, 'utf8');
        break;
      }
    }
  }

  if (exists) {
    existingCount++;
  } else {
    missingCount++;
  }

  // Feature detection
  const hasUseQuery = /useQuery/i.test(content);
  const hasUseMutation = /useMutation/i.test(content);
  const hasApiClient = /apiClient|axios|fetch\(/i.test(content);
  const hasForm = /<form|useForm|onSubmit|handleSubmit/i.test(content);
  const hasMockOrPlaceholder = /mockData|mockEmployees|dummy|faker|placeholder/i.test(content) && !/node_modules/i.test(content);
  const isRedirectOnly = /Navigate\s+to=|redirect\(/i.test(content) && content.length < 500;
  const hasDialogOrModal = /Dialog|Modal|Sheet|Drawer/i.test(content);
  const hasExportOrDownload = /export|download|csv|pdf|xlsx/i.test(content);

  results.push({
    routeId: r.routeId,
    relImport: r.relFile,
    filePath: resolvedPath ? path.relative(path.join(__dirname, '..'), resolvedPath).replace(/\\/g, '/') : null,
    exists,
    fileSize: content.length,
    hasUseQuery,
    hasUseMutation,
    hasApiClient,
    hasForm,
    hasMockOrPlaceholder,
    isRedirectOnly,
    hasDialogOrModal,
    hasExportOrDownload
  });
}

console.log('Component files found:', existingCount);
console.log('Component files missing:', missingCount);

fs.writeFileSync(path.join(__dirname, 'route_deep_audit.json'), JSON.stringify(results, null, 2));

// Summary statistics
const withApi = results.filter(r => r.hasUseQuery || r.hasApiClient || r.hasUseMutation).length;
const withForm = results.filter(r => r.hasForm).length;
const withMock = results.filter(r => r.hasMockOrPlaceholder).length;
const redirectOnly = results.filter(r => r.isRedirectOnly).length;

console.log(`Statistics:
- Total: ${results.length}
- Files exist: ${existingCount}
- With API/Query: ${withApi}
- With Forms/Mutations: ${withForm}
- With Mocks/Placeholders: ${withMock}
- Redirect/Empty: ${redirectOnly}
`);
