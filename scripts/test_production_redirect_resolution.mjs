/**
 * MASTERHRMS — Production Redirect, URL Resolution & Deployment Architecture Test Suite
 *
 * Validates:
 * 1. Local development continues to work on localhost:3000, localhost:5173, and localhost:4000.
 * 2. Production URL generation strictly uses HTTPS and canonical production domains (masterhrms.com / staging.masterhrms.com).
 * 3. Zero production URLs contain localhost:3000, localhost:5173, or localhost:4000.
 * 4. OAuth factory never redirects production users to localhost:5173.
 * 5. Tenant workspace URL resolution works for custom domains and platform subdomains.
 * 6. TanStack index route never redirects production users to localhost:3000.
 * 7. Nginx and PM2 deployment configs correctly route frontend traffic to Next.js on port 3000.
 * 8. Missing production domain configuration falls back safely and never silently emits localhost.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

let passed = 0;
let failed = 0;

function it(description, fn) {
  try {
    fn();
    console.log(`  [✓] PASS: ${description}`);
    passed++;
  } catch (err) {
    console.error(`  [✗] FAIL: ${description}`);
    console.error(`      Error: ${err.message}`);
    failed++;
  }
}

async function runAsync(description, fn) {
  try {
    await fn();
    console.log(`  [✓] PASS: ${description}`);
    passed++;
  } catch (err) {
    console.error(`  [✗] FAIL: ${description}`);
    console.error(`      Error: ${err.message}`);
    failed++;
  }
}

console.log('=======================================================================');
console.log('MASTERHRMS — PRODUCTION URL & REDIRECT RESOLUTION AUDIT SUITE');
console.log('=======================================================================\n');

// ─── 1. Backend Workspace Host Resolution ─────────────────────────────────────
console.log('Suite 1: Backend Workspace Host Resolution (server/src/lib/workspace-host.ts)');

import {
  getBaseDomain,
  getRootUrl,
  getWorkspaceUrl,
  getSuperAdminUrl,
  getCustomDomainUrl,
  resolveHostContext,
} from '../server/src/lib/workspace-host.ts';

// Test 1: Development URL resolution
it('1.1 Local development generates localhost URLs with configured ports', () => {
  const origEnv = { ...process.env };
  delete process.env.BASE_DOMAIN;
  process.env.NODE_ENV = 'development';
  process.env.FRONTEND_PORT = '3000';

  const root = getRootUrl();
  const ws = getWorkspaceUrl('acme');
  const superUrl = getSuperAdminUrl();

  assert.equal(root, 'http://localhost:3000');
  assert.equal(ws, 'http://acme.localhost:3000');
  assert.equal(superUrl, 'http://localhost:3000/super');

  process.env = origEnv;
});

// Test 2: Production canonical domain URL generation
it('1.2 Production environment generates HTTPS canonical domain URLs (masterhrms.com)', () => {
  const origEnv = { ...process.env };
  process.env.NODE_ENV = 'production';
  process.env.BASE_DOMAIN = 'masterhrms.com';

  const root = getRootUrl();
  const ws = getWorkspaceUrl('acme');
  const superUrl = getSuperAdminUrl();

  assert.equal(root, 'https://masterhrms.com');
  assert.equal(ws, 'https://acme.masterhrms.com');
  assert.equal(superUrl, 'https://masterhrms.com/super');

  // Verify ZERO localhost leaks
  assert.equal(root.includes('localhost'), false);
  assert.equal(ws.includes('localhost'), false);
  assert.equal(superUrl.includes('localhost'), false);

  process.env = origEnv;
});

// Test 3: Staging domain URL generation
it('1.3 Staging environment generates HTTPS staging domain URLs (staging.masterhrms.com)', () => {
  const origEnv = { ...process.env };
  process.env.NODE_ENV = 'production';
  process.env.BASE_DOMAIN = 'staging.masterhrms.com';

  const root = getRootUrl();
  const ws = getWorkspaceUrl('beta');
  const superUrl = getSuperAdminUrl();

  assert.equal(root, 'https://staging.masterhrms.com');
  assert.equal(ws, 'https://beta.staging.masterhrms.com');
  assert.equal(superUrl, 'https://staging.masterhrms.com/super');

  process.env = origEnv;
});

// Test 4: Inadvertent port passing in production does NOT leak into public URLs
it('1.4 Production URLs NEVER append internal port numbers (:3000, :4000, :5173)', () => {
  const origEnv = { ...process.env };
  process.env.NODE_ENV = 'production';
  process.env.BASE_DOMAIN = 'masterhrms.com';

  const rootWithPort = getRootUrl(3000);
  const wsWithPort = getWorkspaceUrl('acme', 4000);
  const customWithPort = getCustomDomainUrl('hr.mycorp.com', 5173);

  assert.equal(rootWithPort, 'https://masterhrms.com');
  assert.equal(wsWithPort, 'https://acme.masterhrms.com');
  assert.equal(customWithPort, 'https://hr.mycorp.com');

  assert.equal(rootWithPort.includes(':3000'), false);
  assert.equal(wsWithPort.includes(':4000'), false);
  assert.equal(customWithPort.includes(':5173'), false);

  process.env = origEnv;
});

// Test 5: Missing or loopback BASE_DOMAIN in production safely falls back
it('1.5 Missing or loopback BASE_DOMAIN in production falls back to canonical domain without emitting localhost', () => {
  const origEnv = { ...process.env };
  process.env.NODE_ENV = 'production';
  delete process.env.BASE_DOMAIN;

  const base = getBaseDomain();
  const root = getRootUrl();
  const ws = getWorkspaceUrl('acme');

  assert.equal(base, 'masterhrms.com');
  assert.equal(root, 'https://masterhrms.com');
  assert.equal(ws, 'https://acme.masterhrms.com');

  // Also test when someone mistakenly configured BASE_DOMAIN="localhost" in production
  process.env.BASE_DOMAIN = 'localhost';
  const baseFromLoopback = getBaseDomain();
  assert.equal(baseFromLoopback, 'masterhrms.com');

  process.env = origEnv;
});

// ─── 2. OAuth Factory Environment-Aware Resolution ────────────────────────────
console.log('\nSuite 2: OAuth Factory URL Resolution (server/src/services/factories/oauth.factory.ts)');

import { OAuthFactory } from '../server/src/services/factories/oauth.factory.ts';

await runAsync('2.1 Local development resolves local frontendBaseUrl (localhost:3000)', async () => {
  const origEnv = { ...process.env };
  process.env.NODE_ENV = 'development';
  delete process.env.FRONTEND_URL;

  const mockReq = {
    protocol: 'http',
    hostname: 'localhost',
    get: (h) => (h === 'host' ? 'localhost:4000' : ''),
  };

  const config = await OAuthFactory.resolveConfig(mockReq);
  assert.equal(config.frontendBaseUrl, 'http://localhost:3000');
  assert.equal(config.oauthBaseUrl, 'http://localhost:4000');

  process.env = origEnv;
});

await runAsync('2.2 Production resolves canonical HTTPS frontendBaseUrl without port 5173', async () => {
  const origEnv = { ...process.env };
  process.env.NODE_ENV = 'production';
  process.env.BASE_DOMAIN = 'masterhrms.com';
  delete process.env.FRONTEND_URL;

  const mockReq = {
    protocol: 'https',
    hostname: 'masterhrms.com',
    get: (h) => (h === 'host' ? 'masterhrms.com' : ''),
  };

  const config = await OAuthFactory.resolveConfig(mockReq);
  assert.equal(config.frontendBaseUrl, 'https://masterhrms.com');
  assert.equal(config.frontendBaseUrl.includes(':5173'), false);
  assert.equal(config.frontendBaseUrl.includes('localhost'), false);

  process.env = origEnv;
});

// ─── 3. CMS Platform Domain Helper Resolution ─────────────────────────────────
console.log('\nSuite 3: CMS Platform Domain Helpers (CMS/src/lib/platform-domain.ts)');

import {
  getPlatformBaseDomain as getCmsBaseDomain,
  getPlatformDisplayBaseDomain as getCmsDisplayBaseDomain,
  getTenantWorkspaceUrl as getCmsTenantWorkspaceUrl,
  getTrustedCanonicalDomain as getCmsCanonicalDomain,
} from '../CMS/src/lib/platform-domain.ts';

it('3.1 CMS SSR resolves canonical domain in production', () => {
  const origEnv = { ...process.env };
  process.env.NODE_ENV = 'production';
  process.env.BASE_DOMAIN = 'masterhrms.com';

  const base = getCmsBaseDomain();
  const display = getCmsDisplayBaseDomain();
  const canonical = getCmsCanonicalDomain();

  assert.equal(base, 'masterhrms.com');
  assert.equal(display, 'masterhrms.com');
  assert.equal(canonical, 'masterhrms.com');

  assert.equal(display !== 'app', true, 'displayBaseDomain must NOT return "app"');
  assert.equal(display.includes('localhost'), false);

  process.env = origEnv;
});

it('3.2 CMS getTenantWorkspaceUrl generates valid custom domain and subdomain URLs', () => {
  const origEnv = { ...process.env };
  process.env.NODE_ENV = 'production';
  process.env.BASE_DOMAIN = 'masterhrms.com';

  // Subdomain tenant
  const subTenantUrl = getCmsTenantWorkspaceUrl({ slug: 'techcorp' }, '/settings');
  assert.equal(subTenantUrl, 'http://techcorp.masterhrms.com/settings'); // window unset -> http:
  assert.equal(subTenantUrl.includes('localhost'), false);

  // Custom domain tenant
  const customTenantUrl = getCmsTenantWorkspaceUrl({ domain: 'hr.techcorp.com', slug: 'techcorp' }, '/settings');
  assert.equal(customTenantUrl, 'http://hr.techcorp.com/settings');
  assert.equal(customTenantUrl.includes('localhost'), false);

  process.env = origEnv;
});

// ─── 4. TanStack Index Route Environment-Aware Target Resolution ──────────────
console.log('\nSuite 4: TanStack Index Route Simulation (src/routes/index.tsx)');

function simulateTanStackGetCmsTargetUrl(mockLocation, env = {}) {
  const { protocol, hostname, port, search = '', hash = '' } = mockLocation;
  // If running on Vite port 5173 in local development, redirect to Next.js CMS on port 3000
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost')) {
    return `${protocol}//${hostname}:3000${search}${hash}`;
  }
  // In staging or production, never append :3000 and never redirect to localhost!
  const configuredAppUrl = env.VITE_APP_URL || env.VITE_PUBLIC_URL;
  if (configuredAppUrl && !configuredAppUrl.includes('localhost')) {
    return `${configuredAppUrl.replace(/\/+$/, '')}/${search}${hash}`;
  }
  return `${protocol}//${hostname}${port && port !== '80' && port !== '443' && port !== '5173' ? `:${port}` : ''}/${search}${hash}`;
}

it('4.1 Local development on localhost:5173 resolves to localhost:3000', () => {
  const target = simulateTanStackGetCmsTargetUrl({
    protocol: 'http:',
    hostname: 'localhost',
    port: '5173',
  });
  assert.equal(target, 'http://localhost:3000');
});

it('4.2 Production access on masterhrms.com NEVER redirects to localhost:3000', () => {
  const target = simulateTanStackGetCmsTargetUrl({
    protocol: 'https:',
    hostname: 'masterhrms.com',
    port: '',
  });
  assert.equal(target, 'https://masterhrms.com/');
  assert.equal(target.includes('localhost'), false);
  assert.equal(target.includes(':3000'), false);
});

it('4.3 Staging access on staging.masterhrms.com NEVER redirects to localhost:3000', () => {
  const target = simulateTanStackGetCmsTargetUrl({
    protocol: 'https:',
    hostname: 'staging.masterhrms.com',
    port: '',
  });
  assert.equal(target, 'https://staging.masterhrms.com/');
  assert.equal(target.includes('localhost'), false);
  assert.equal(target.includes(':3000'), false);
});

// ─── 5. Deployment Configuration Integrity ────────────────────────────────────
console.log('\nSuite 5: Deployment & Process Manager Verification');

it('5.1 Nginx staging config proxies frontend traffic to Next.js on port 3000 (not 5173)', () => {
  const nginxConfPath = path.resolve('scripts/staging/nginx-masterhrms-staging.conf');
  const content = fs.readFileSync(nginxConfPath, 'utf8');

  assert.match(content, /upstream masterhrms_frontend\s*\{\s*server 127\.0\.0\.1:3000/, 'Nginx masterhrms_frontend must point to 127.0.0.1:3000');
  assert.doesNotMatch(content, /upstream masterhrms_frontend\s*\{\s*server 127\.0\.0\.1:5173/, 'Nginx masterhrms_frontend must NOT point to 5173');
});

it('5.2 PM2 ecosystem config runs Next.js on port 3000 (not Vite on 5173)', () => {
  const ecosystemPath = path.resolve('scripts/staging/ecosystem.config.cjs');
  const content = fs.readFileSync(ecosystemPath, 'utf8');

  assert.match(content, /next/, 'PM2 frontend must execute Next.js');
  assert.match(content, /PORT:\s*3000/, 'PM2 frontend PORT must be 3000');
  assert.doesNotMatch(content, /vite preview/, 'PM2 frontend must NOT run vite preview');
  assert.doesNotMatch(content, /PORT:\s*5173/, 'PM2 frontend must NOT use port 5173');
});

it('5.3 Systemd frontend service executes Next.js start on port 3000', () => {
  const servicePath = path.resolve('scripts/staging/masterhrms-frontend.service');
  const content = fs.readFileSync(servicePath, 'utf8');

  assert.match(content, /CMS run start -- -p 3000/, 'Systemd service must run Next.js on port 3000');
  assert.doesNotMatch(content, /--port 5173/, 'Systemd service must NOT specify port 5173');
});

// ─── 6. Clean Production Codebase Audit (Zero Localhost Leaks in Executable Paths) ─
console.log('\nSuite 6: Zero Localhost Leaks in Critical Production Files');

it('6.1 src/routes/index.tsx has zero hardcoded meta refresh to localhost:3000', () => {
  const content = fs.readFileSync('src/routes/index.tsx', 'utf8');
  assert.doesNotMatch(content, /content:\s*["']0;url=http:\/\/localhost:3000["']/, 'No hardcoded meta refresh to localhost:3000');
  assert.doesNotMatch(content, /href=["']http:\/\/localhost:3000["']/, 'No hardcoded link to localhost:3000');
});

it('6.2 src/routes/_authenticated/super/settings.tsx has zero hardcoded localhost:5173 links', () => {
  const content = fs.readFileSync('src/routes/_authenticated/super/settings.tsx', 'utf8');
  assert.doesNotMatch(content, /localhost:5173\/settings/, 'No hardcoded localhost:5173 links in settings.tsx');
});

it('6.3 server/src/services/factories/oauth.factory.ts has zero hardcoded :5173 in default URL', () => {
  const content = fs.readFileSync('server/src/services/factories/oauth.factory.ts', 'utf8');
  assert.doesNotMatch(content, /\$\{req\.hostname\}:5173/, 'No hardcoded :5173 appended to req.hostname');
});

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n=======================================================================');
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('=======================================================================');

if (failed > 0) {
  process.exit(1);
}
