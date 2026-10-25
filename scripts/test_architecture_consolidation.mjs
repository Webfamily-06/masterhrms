/**
 * Automated Verification Suite for MASTERHRMS Architecture Consolidation
 * Tests:
 * 1. Single Authoritative CMS Ownership (CMS/ owns /, marketing routes pruned from Vite)
 * 2. TanStack Router Integrity (Vite root redirects to workspace/auth, authenticated routes intact)
 * 3. Dynamic Domain & Tenant Resolution (Centralized, no hardcoded localhost fallbacks)
 * 4. Elimination of Hardcoded Mock Arrays & Silent Fallbacks in Dashboards
 * 5. Server Startup & Seeder Safety (No automated mock data injection on startup)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔\x1b[0m ${message}`);
  } else {
    failedTests++;
    failures.push(message);
    console.error(`  \x1b[31m✘\x1b[0m ${message}`);
  }
}

console.log('\n============================================================');
console.log(' MASTERHRMS ARCHITECTURE CONSOLIDATION VERIFICATION SUITE');
console.log('============================================================\n');

// ------------------------------------------------------------
// PILLAR 1: SINGLE AUTHORITATIVE NEXT.JS CMS OWNERSHIP
// ------------------------------------------------------------
console.log('--- Pillar 1: Single Authoritative Next.js CMS Ownership ---');

// 1.1 CMS/src/app/page.tsx must exist and contain the authoritative landing page
const cmsLandingPath = path.join(ROOT, 'CMS/src/app/page.tsx');
assert(fs.existsSync(cmsLandingPath), 'CMS/src/app/page.tsx exists as authoritative root landing page');
if (fs.existsSync(cmsLandingPath)) {
  const content = fs.readFileSync(cmsLandingPath, 'utf8');
  assert(content.includes('Hero') || content.includes('Features') || content.includes('Landing') || content.includes('export default'), 'CMS/src/app/page.tsx exports valid React landing page component');
}

// 1.2 Competing marketing routes must NOT exist in Vite src/routes/
const prunedViteRoutes = [
  'src/routes/cms.index.tsx',
  'src/routes/cms.$.tsx',
  'src/routes/about.tsx',
  'src/routes/pricing.tsx',
  'src/routes/careers.tsx',
  'src/routes/contact.tsx',
  'src/routes/product.tsx',
  'src/routes/solutions.tsx',
  'src/routes/resources.tsx',
  'src/routes/store.tsx'
];

prunedViteRoutes.forEach(routePath => {
  const fullPath = path.join(ROOT, routePath);
  assert(!fs.existsSync(fullPath), `Pruned duplicate CMS marketing route from Vite: ${routePath}`);
});

// 1.3 src/routeTree.gen.ts must not contain deleted marketing routes as root paths
const routeTreePath = path.join(ROOT, 'src/routeTree.gen.ts');
if (fs.existsSync(routeTreePath)) {
  const routeTree = fs.readFileSync(routeTreePath, 'utf8');
  assert(!routeTree.includes("fullPath: '/about'"), "Vite routeTree.gen.ts does not register fullPath: '/about'");
  assert(!routeTree.includes("fullPath: '/pricing'"), "Vite routeTree.gen.ts does not register fullPath: '/pricing'");
  assert(!routeTree.includes("fullPath: '/careers'"), "Vite routeTree.gen.ts does not register fullPath: '/careers'");
  assert(!routeTree.includes("fullPath: '/contact'"), "Vite routeTree.gen.ts does not register fullPath: '/contact'");
  assert(!routeTree.includes("fullPath: '/cms'"), "Vite routeTree.gen.ts does not register fullPath: '/cms'");
} else {
  assert(false, 'src/routeTree.gen.ts exists');
}

// ------------------------------------------------------------
// PILLAR 2: TANSTACK ROUTER ROOT & WORKSPACE PRESERVATION
// ------------------------------------------------------------
console.log('\n--- Pillar 2: TanStack Router Root & Authenticated Routes ---');

// 2.1 src/routes/index.tsx must redirect internally, with NO meta refresh and NO localhost redirect
const viteIndexPath = path.join(ROOT, 'src/routes/index.tsx');
assert(fs.existsSync(viteIndexPath), 'src/routes/index.tsx exists');
if (fs.existsSync(viteIndexPath)) {
  const viteIndex = fs.readFileSync(viteIndexPath, 'utf8');
  assert(!viteIndex.includes('http-equiv="refresh"'), 'src/routes/index.tsx contains no meta-refresh tag');
  assert(!viteIndex.includes(':3000'), 'src/routes/index.tsx contains no port 3000 redirect');
  assert(!viteIndex.includes('window.location.replace'), 'src/routes/index.tsx contains no window.location.replace');
  assert(viteIndex.includes('redirect({') || viteIndex.includes('throw redirect'), 'src/routes/index.tsx uses standard TanStack Router redirect');
  assert(viteIndex.includes('/_authenticated/_app/hrm-dashboard'), 'src/routes/index.tsx redirects authenticated users to workspace dashboard');
}

// 2.2 Core authenticated HRMS workspace routes in Vite must remain intact
const preservedAuthenticatedRoutes = [
  'src/routes/_authenticated/_app/hrm-dashboard.tsx',
  'src/routes/_authenticated/_app/payroll-dashboard.tsx',
  'src/routes/_authenticated/_app/employees.tsx',
  'src/routes/_authenticated/_app/attendance.tsx',
  'src/routes/_authenticated/_app/leave.tsx',
  'src/routes/_authenticated/_app/biometric.tsx',
  'src/routes/_authenticated/super/index.tsx',
  'src/routes/auth.tsx',
  'src/routes/customer-display.tsx'
];

preservedAuthenticatedRoutes.forEach(routePath => {
  const fullPath = path.join(ROOT, routePath);
  assert(fs.existsSync(fullPath), `Preserved authenticated enterprise route: ${routePath}`);
});

// ------------------------------------------------------------
// PILLAR 3: DYNAMIC DOMAIN & TENANT RESOLUTION
// ------------------------------------------------------------
console.log('\n--- Pillar 3: Dynamic Domain & Tenant Resolution ---');

// 3.1 Check platform-domain.ts libraries exist in both Vite and CMS
const cmsDomainLib = path.join(ROOT, 'CMS/src/lib/platform-domain.ts');
const viteDomainLib = path.join(ROOT, 'src/lib/platform-domain.ts');
assert(fs.existsSync(cmsDomainLib), 'CMS/src/lib/platform-domain.ts exists');
assert(fs.existsSync(viteDomainLib), 'src/lib/platform-domain.ts exists');

if (fs.existsSync(cmsDomainLib)) {
  const cmsDomainContent = fs.readFileSync(cmsDomainLib, 'utf8');
  assert(cmsDomainContent.includes('getPlatformBaseDomain'), 'CMS platform-domain.ts exports getPlatformBaseDomain');
  assert(cmsDomainContent.includes('getTenantWorkspaceUrl'), 'CMS platform-domain.ts exports getTenantWorkspaceUrl');
  assert(cmsDomainContent.includes('isTenantWorkspaceHost'), 'CMS platform-domain.ts exports isTenantWorkspaceHost');
}

// 3.2 Verify runtime files have no hardcoded localhost/master.localhost fallbacks
const dynamicDomainAuditFiles = [
  {
    path: 'CMS/src/app/super/email-templates/page.tsx',
    forbidden: ['http://master.localhost:3000'],
    desc: 'CMS email-templates'
  },
  {
    path: 'CMS/src/components/auth/login-form.tsx',
    forbidden: ['http://localhost:4000/api/auth/login'],
    desc: 'CMS login-form'
  },
  {
    path: 'CMS/src/app/blog/page.tsx',
    forbidden: ['const res = await fetch("http://localhost:4000/api/blogs'],
    desc: 'CMS blog page'
  },
  {
    path: 'CMS/src/app/blog/[slug]/page.tsx',
    forbidden: ['http://localhost:4000/api/blogs'],
    desc: 'CMS blog post slug page'
  },
  {
    path: 'CMS/src/app/(workspace)/biometric/page.tsx',
    forbidden: ['http://localhost:4000/iclock/cdata'],
    desc: 'CMS biometric page'
  },
  {
    path: 'CMS/src/app/(workspace)/biometric-sync/page.tsx',
    forbidden: ['API_URL = "http://localhost:4000"'],
    desc: 'CMS biometric-sync generator'
  },
  {
    path: 'src/routes/_authenticated/_app/biometric-sync.tsx',
    forbidden: ['API_URL = "http://localhost:4000"'],
    desc: 'Vite biometric-sync generator'
  },
  {
    path: 'server/src/routes/super.routes.ts',
    forbidden: ['platformUrl: process.env.VITE_API_URL || "http://localhost:4000"'],
    desc: 'Server super.routes.ts platformUrl'
  }
];

dynamicDomainAuditFiles.forEach(({ path: relPath, forbidden, desc }) => {
  const fullPath = path.join(ROOT, relPath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    forbidden.forEach(str => {
      assert(!content.includes(str), `${desc} does not contain hardcoded '${str}'`);
    });
  } else {
    assert(false, `${desc} file exists at ${relPath}`);
  }
});

// ------------------------------------------------------------
// PILLAR 4: ELIMINATION OF HARDCODED MOCK DATA IN USER DASHBOARDS
// ------------------------------------------------------------
console.log('\n--- Pillar 4: Elimination of Hardcoded Mock Data ---');

const mockDataAuditFiles = [
  {
    path: 'CMS/src/app/(workspace)/payroll-dashboard/page.tsx',
    forbidden: ['INITIAL_PAYROLL', 'Ethan Walker', 'Madison Clark'],
    desc: 'CMS payroll-dashboard'
  },
  {
    path: 'src/routes/_authenticated/_app/payroll-dashboard.tsx',
    forbidden: ['INITIAL_PAYROLL', 'Ethan Walker', 'Madison Clark'],
    desc: 'Vite payroll-dashboard'
  },
  {
    path: 'CMS/src/app/(workspace)/leads-dashboard/page.tsx',
    forbidden: ['INITIAL_LEADS', 'Apex Global', 'Zenith Corp'],
    desc: 'CMS leads-dashboard'
  },
  {
    path: 'src/routes/_authenticated/_app/leads-dashboard.tsx',
    forbidden: ['INITIAL_LEADS', 'Apex Global', 'Zenith Corp'],
    desc: 'Vite leads-dashboard'
  },
  {
    path: 'CMS/src/app/(workspace)/deals-dashboard/page.tsx',
    forbidden: ['INITIAL_DEALS'],
    desc: 'CMS deals-dashboard'
  },
  {
    path: 'src/routes/_authenticated/_app/deals-dashboard.tsx',
    forbidden: ['INITIAL_DEALS'],
    desc: 'Vite deals-dashboard'
  },
  {
    path: 'CMS/src/app/(workspace)/help-desk-dashboard/page.tsx',
    forbidden: ['INITIAL_TICKETS', 'VPN Connection Drops Frequently'],
    desc: 'CMS help-desk-dashboard'
  },
  {
    path: 'src/routes/_authenticated/_app/help-desk-dashboard.tsx',
    forbidden: ['INITIAL_TICKETS', 'VPN Connection Drops Frequently'],
    desc: 'Vite help-desk-dashboard'
  },
  {
    path: 'CMS/src/components/assets/asset-dashboard-view.tsx',
    forbidden: ['INITIAL_ASSETS', 'AST-1001', 'MacBook Pro 16" M3'],
    desc: 'CMS asset-dashboard-view'
  },
  {
    path: 'src/components/assets/asset-dashboard-view.tsx',
    forbidden: ['INITIAL_ASSETS', 'AST-1001', 'MacBook Pro 16" M3'],
    desc: 'Vite asset-dashboard-view'
  },
  {
    path: 'CMS/src/app/(workspace)/tenant/audit-logs/page.tsx',
    forbidden: ['fallbackLogs', '127.0.0.1'],
    desc: 'CMS tenant audit-logs'
  },
  {
    path: 'src/routes/_authenticated/tenant/audit-logs.tsx',
    forbidden: ['fallbackLogs', '127.0.0.1'],
    desc: 'Vite tenant audit-logs'
  }
];

mockDataAuditFiles.forEach(({ path: relPath, forbidden, desc }) => {
  const fullPath = path.join(ROOT, relPath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    forbidden.forEach(str => {
      assert(!content.includes(str), `${desc} does not contain mock token '${str}'`);
    });
  } else {
    assert(false, `${desc} file exists at ${relPath}`);
  }
});

// ------------------------------------------------------------
// PILLAR 5: SEEDER & SERVER STARTUP AUDIT
// ------------------------------------------------------------
console.log('\n--- Pillar 5: Seeder & Server Startup Safety ---');

const serverIndexPath = path.join(ROOT, 'server/src/index.ts');
if (fs.existsSync(serverIndexPath)) {
  const serverIndex = fs.readFileSync(serverIndexPath, 'utf8');
  assert(!serverIndex.includes('seed()') && !serverIndex.includes('seedAuthoritative') && !serverIndex.includes('seedCanonical'), 'server/src/index.ts does not automatically trigger seed scripts on boot');
} else {
  assert(false, 'server/src/index.ts exists');
}

// ------------------------------------------------------------
// SUMMARY
// ------------------------------------------------------------
console.log('\n============================================================');
console.log(` RESULTS: ${passedTests} PASSED, ${failedTests} FAILED out of ${totalTests} assertions`);
console.log('============================================================\n');

if (failedTests > 0) {
  console.error('Failed assertions:');
  failures.forEach(f => console.error(`  - ${f}`));
  process.exit(1);
} else {
  console.log('\x1b[32mAll architecture consolidation checks passed successfully!\x1b[0m\n');
  process.exit(0);
}
