const fs = require('fs');
const path = require('path');

const audit = JSON.parse(fs.readFileSync(path.join(__dirname, 'route_deep_audit.json'), 'utf8'));
const appRoutes = audit.filter(r => r.routeId !== '__root__');

// Extract all routes from navigation-registry.ts and nav/registry.ts
const navRegContent = fs.readFileSync(path.join(__dirname, '../src/lib/navigation-registry.ts'), 'utf8');
const tenantNavContent = fs.readFileSync(path.join(__dirname, '../src/nav/registry.ts'), 'utf8');

// Match route strings: "route": "/..." or path: ROUTES.... or "/..."
const directRoutes = new Set();

const matches1 = navRegContent.matchAll(/"route":\s*"([^"]+)"/g);
for (const m of matches1) directRoutes.add(m[1]);

const matches2 = tenantNavContent.matchAll(/path:\s*(?:ROUTES\.[a-zA-Z0-9_.]+|"([^"]+)")/g);
for (const m of matches2) {
  if (m[1]) directRoutes.add(m[1]);
}

// Also parse ROUTES from routes.ts to resolve ROUTES.x.y
const routesTs = fs.readFileSync(path.join(__dirname, '../src/lib/routes.ts'), 'utf8');
const routePathMatches = routesTs.matchAll(/:\s*"(\/[^"]+)"/g);
for (const m of routePathMatches) {
  directRoutes.add(m[1]);
}

console.log('Total known navigation paths extracted:', directRoutes.size);

// Reconcile each route
const reconciliation = [];

for (const r of appRoutes) {
  // Normalize routeId
  // e.g. /_authenticated/hr/dashboard -> /hr/dashboard
  // /_authenticated/super/compliance -> /super/compliance
  // /_authenticated/_app/payroll -> /payroll
  let publicPath = r.routeId
    .replace(/^\/_authenticated\/_app/, '')
    .replace(/^\/_authenticated/, '');
  if (!publicPath.startsWith('/')) publicPath = '/' + publicPath;
  if (publicPath.endsWith('/')) publicPath = publicPath.slice(0, -1);
  if (publicPath === '') publicPath = '/';

  const isDirectInNav = directRoutes.has(publicPath) || directRoutes.has(r.routeId);
  
  let navCategory = 'UNMAPPED';
  let navReason = '';

  if (isDirectInNav) {
    navCategory = 'DIRECT_SIDEBAR_LINK';
    navReason = 'Directly accessible via sidebar navigation item';
  } else if (publicPath.includes('$') || publicPath.includes('edit') || publicPath.includes('new') || publicPath.includes('detail') || publicPath.includes('settings') || publicPath.includes('view')) {
    navCategory = 'CONTEXTUAL_SUBPAGE_OR_MODAL';
    navReason = 'Deep link, parameterized entity page ($id), or edit/view drawer opened from parent list';
  } else if (r.routeId.startsWith('/login') || r.routeId.startsWith('/register') || r.routeId.startsWith('/auth') || r.routeId.startsWith('/about') || r.routeId.startsWith('/careers') || r.routeId.startsWith('/pricing') || r.routeId.startsWith('/contact') || r.routeId.startsWith('/portal') || r.routeId.startsWith('/store') || r.routeId.startsWith('/solutions') || r.routeId.startsWith('/resources') || r.routeId.startsWith('/docs') || r.routeId.startsWith('/developer')) {
    navCategory = 'PUBLIC_AUTH_OR_MARKETING';
    navReason = 'Public landing, authentication, customer portal, or marketing page';
  } else if (['/403', '/404', '/500', '/maintenance', '/session-expired', '/lock-screen', '/offline', '/og-preview', '/verify-2fa', '/customer-display'].includes(publicPath)) {
    navCategory = 'SYSTEM_UTILITY';
    navReason = 'System error boundary, fallback, lock screen, or utility view';
  } else if (r.routeId.startsWith('/_authenticated/hr/') || r.routeId.startsWith('/_authenticated/me/') || r.routeId.startsWith('/_authenticated/super/') || r.routeId.startsWith('/_authenticated/tenant/')) {
    navCategory = 'PORTAL_SUBMODULE';
    navReason = 'Accessible via tab, parent section, or role-gated portal workflow';
  } else {
    navCategory = 'STANDALONE_WORKSPACE_APP';
    navReason = 'Workspace domain module (POS, Accounting, Inventory, CRM, Addon) accessed via module switcher or app launcher';
  }

  reconciliation.push({
    routeId: r.routeId,
    publicPath,
    filePath: r.filePath,
    navCategory,
    navReason
  });
}

// Summary of reconciliation
const navSummary = {};
for (const item of reconciliation) {
  navSummary[item.navCategory] = (navSummary[item.navCategory] || 0) + 1;
}

console.log('=== SIDEBAR NAVIGATION RECONCILIATION SUMMARY ===');
console.table(navSummary);

fs.writeFileSync(path.join(__dirname, 'navigation_reconciliation.json'), JSON.stringify(reconciliation, null, 2));
