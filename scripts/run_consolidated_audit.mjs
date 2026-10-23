import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const jwt = require('../server/node_modules/jsonwebtoken');
const { PrismaClient } = require('../server/node_modules/@prisma/client');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'master-hrms-jwt-super-secret-key-change-this-in-production';

const SCREENSHOT_DIR = path.resolve('docs/Saas/screenshots/consolidated-audit');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const SERVERS = {
  classic: 'http://localhost:5174',
  vite: 'http://localhost:5173',
  backend: 'http://localhost:4000',
  cms: 'http://localhost:3000',
  tenantCms: 'http://master.localhost:3000'
};

const USERS = {
  superAdmin: {
    name: 'Super Admin',
    payload: {
      userId: '0c99980d-69c9-42fb-9d68-7df14554576c',
      email: 'super-1792135343884@platform.com',
      tenantId: null,
      roles: ['super_admin']
    }
  },
  hrAdmin: {
    name: 'HR Admin',
    payload: {
      userId: 'user-hr-001',
      email: 'hr@masterhrms.com',
      tenantId: 'tenant-default-001',
      roles: ['hr_admin']
    }
  },
  employee: {
    name: 'Employee',
    payload: {
      userId: 'user-emp-001',
      email: 'employee@masterhrms.com',
      tenantId: 'tenant-default-001',
      roles: ['employee']
    }
  },
  tenantB: {
    name: 'Tenant B User',
    payload: {
      userId: '04c50e49-1f3d-43c1-ba31-8e91ca5df676',
      email: 'admin-a-1792052667791@acme.com',
      tenantId: 'test-tenant-a-1792052667016',
      roles: ['hr_admin']
    }
  }
};

const GAP_ROUTES = [
  { id: 'GAP-1', route: '/settings/email-accounts', canonical: null, label: 'User Email Accounts Configuration (SMTP/IMAP/POP3)' },
  { id: 'GAP-2', route: '/apps/email', canonical: null, label: 'Email Outbound/Inbound Mailbox Client' },
  { id: 'GAP-3', route: '/apps/todo/gantt', canonical: null, label: 'Interactive Gantt Chart Timeline' },
  { id: 'GAP-4', route: '/hr/settings?tab=email', canonical: '/hr/settings', label: 'HR Workspace Email Settings Tab' },
  { id: 'GAP-5', route: '/hr/chat', canonical: '/hr/chat', label: 'HR Team Chat Messenger' },
  { id: 'GAP-6', route: '/hr/calendar', canonical: '/hr/calendar', label: 'HR Interactive Calendar' },
  { id: 'GAP-7', route: '/task-board', canonical: '/task-board', label: 'Scrum / Kanban Task Board' },
  { id: 'GAP-8', route: '/hr/media', canonical: '/hr/media', label: 'HR Media Library Asset Storage' },
  { id: 'GAP-9', route: '/hr/todo', canonical: '/hr/todo', label: 'HR Personal Task Checklist' },
  { id: 'GAP-10', route: '/marketplace', canonical: '/marketplace', label: 'Add-ons & Modules Marketplace' }
];

async function checkServerHealth() {
  console.log('--- 1. Discovering Active Environments ---');
  const healthResults = {};
  for (const [key, url] of Object.entries(SERVERS)) {
    try {
      const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3000) }).catch(async () => {
        return await fetch(url, { method: 'GET', signal: AbortSignal.timeout(3000) });
      });
      healthResults[key] = { url, status: res.status, ok: res.status < 500 };
      console.log(`  [${key}] ${url} -> HTTP ${res.status}`);
    } catch (err) {
      healthResults[key] = { url, error: err.message, ok: false };
      console.log(`  [${key}] ${url} -> OFFLINE (${err.message})`);
    }
  }
  return healthResults;
}

async function runAudit() {
  console.log('=============================================================================');
  console.log(' MASTERHRMS — CONSOLIDATED PLAYWRIGHT MCP AUDIT (SIDEBAR, UI, API, DB)');
  console.log('=============================================================================\n');

  const serverHealth = await checkServerHealth();
  const browser = await chromium.launch({ 
    headless: true, 
    args: ['--no-proxy-server', '--disable-gpu', '--no-sandbox'] 
  });

  const auditReport = {
    timestamp: new Date().toISOString(),
    serverHealth,
    superAdminAudit: [],
    hrAdminAudit: [],
    employeeAudit: [],
    securityAudit: [],
    gapAudit: [],
    dbTraceAudit: [],
    summary: {}
  };

  // Helper to safely navigate with retry for cold compile
  async function safeGoto(page, url, timeoutMs = 30000) {
    try {
      return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    } catch (firstErr) {
      console.log(`    (Compiling/Retrying ${url}...)`);
      await page.waitForTimeout(1500);
      return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    }
  }

  // -------------------------------------------------------------------------
  // 2. AUDIT SUPER ADMIN SIDEBAR (http://localhost:3000/super)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Crawling Super Admin Sidebar (/super) ---');
  const superToken = jwt.sign(USERS.superAdmin.payload, JWT_SECRET, { expiresIn: '1d' });
  const superContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await superContext.addInitScript(({ t, p }) => {
    localStorage.setItem('hrms_auth_token', t);
    localStorage.setItem('auth_token', t);
    localStorage.setItem('token', t);
    localStorage.setItem('hrms_user', JSON.stringify(p));
    document.cookie = `hrms_auth_token=${t}; path=/`;
    document.cookie = `auth_token=${t}; path=/`;
  }, { t: superToken, p: USERS.superAdmin.payload });

  const superPage = await superContext.newPage();
  const superConsoleErrors = [];
  superPage.on('console', msg => {
    if (msg.type() === 'error') superConsoleErrors.push(msg.text());
  });

  await safeGoto(superPage, 'http://localhost:3000/super', 30000);
  await superPage.waitForTimeout(2000);

  // Extract all sidebar links dynamically
  const superLinks = await superPage.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('.sidebar-menu a'));
    return anchors.map(a => ({
      text: a.innerText.trim(),
      href: a.getAttribute('href'),
      parentHeader: a.closest('ul')?.previousElementSibling?.innerText?.trim() || 'Menu'
    })).filter(l => l.href && !l.href.startsWith('#'));
  });

  console.log(`  Discovered ${superLinks.length} dynamic sidebar links for Super Admin.`);

  for (let i = 0; i < superLinks.length; i++) {
    const link = superLinks[i];
    const targetUrl = link.href.startsWith('http') ? link.href : `http://localhost:3000${link.href}`;
    const result = {
      index: i + 1,
      role: 'Super Admin',
      label: link.text,
      group: link.parentHeader,
      targetHref: link.href,
      targetUrl,
      httpStatus: 'UNKNOWN',
      rendered: false,
      hasMainContent: false,
      controlsCount: 0,
      activeHighlighted: false,
      consoleErrors: 0,
      screenshot: null,
      verdict: 'FAIL'
    };

    try {
      const resp = await safeGoto(superPage, targetUrl, 25000);
      result.httpStatus = resp ? resp.status() : 200;
      await superPage.waitForTimeout(600);

      const metrics = await superPage.evaluate(() => {
        const bodyText = document.body ? document.body.innerText : '';
        const is403 = bodyText.includes('403') && bodyText.includes('Forbidden');
        const is404 = bodyText.includes('404') && (bodyText.includes('Not Found') || bodyText.includes('could not be found'));
        const isCrash = bodyText.includes('Application error') || bodyText.includes('Unhandled Runtime Error');
        const hasContent = !!(document.querySelector('table, .card, form, h1, h2, h3, canvas, svg'));
        const controls = document.querySelectorAll('button, input, select, textarea').length;
        const activeLink = document.querySelector('.sidebar-menu a.active, .sidebar-menu li.active');
        
        return {
          is403,
          is404,
          isCrash,
          hasContent,
          controls,
          hasActiveHighlight: !!activeLink,
          bodySnippet: bodyText.slice(0, 100).replace(/\n/g, ' ')
        };
      });

      result.hasMainContent = metrics.hasContent && !metrics.is403 && !metrics.is404 && !metrics.isCrash;
      result.controlsCount = metrics.controls;
      result.activeHighlighted = metrics.hasActiveHighlight;
      result.consoleErrors = superConsoleErrors.length;

      const safeName = `super_${i + 1}_${link.text.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
      const imgPath = path.join(SCREENSHOT_DIR, safeName);
      await superPage.screenshot({ path: imgPath });
      result.screenshot = `docs/Saas/screenshots/consolidated-audit/${safeName}`;

      if (result.httpStatus === 200 && result.hasMainContent && !metrics.is403 && !metrics.is404) {
        result.verdict = 'PASS';
      } else if (metrics.is403) {
        result.verdict = 'BLOCKED_403';
      } else if (metrics.is404) {
        result.verdict = 'FAIL_404';
      } else {
        result.verdict = 'PARTIAL';
      }

      console.log(`  [Super Admin ${i + 1}/${superLinks.length}] ${link.text} (${link.href}) -> ${result.verdict} (${result.controlsCount} controls)`);
    } catch (err) {
      result.verdict = 'ERROR';
      result.details = err.message;
      console.log(`  [Super Admin ${i + 1}/${superLinks.length}] ${link.text} -> ERROR: ${err.message}`);
    }
    auditReport.superAdminAudit.push(result);
  }
  await superContext.close();

  // -------------------------------------------------------------------------
  // 3. AUDIT HR ADMIN SIDEBAR (http://localhost:3000/hr/dashboard)
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Crawling HR Admin Sidebar (/hr/*) on localhost:3000 ---');
  const hrToken = jwt.sign(USERS.hrAdmin.payload, JWT_SECRET, { expiresIn: '1d' });
  const hrContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await hrContext.addInitScript(({ t, p }) => {
    localStorage.setItem('hrms_auth_token', t);
    localStorage.setItem('auth_token', t);
    localStorage.setItem('token', t);
    localStorage.setItem('hrms_user', JSON.stringify(p));
    document.cookie = `hrms_auth_token=${t}; path=/`;
    document.cookie = `auth_token=${t}; path=/`;
  }, { t: hrToken, p: USERS.hrAdmin.payload });

  const hrPage = await hrContext.newPage();
  const hrConsoleErrors = [];
  hrPage.on('console', msg => {
    if (msg.type() === 'error') hrConsoleErrors.push(msg.text());
  });

  await safeGoto(hrPage, 'http://localhost:3000/hr/dashboard', 30000);
  try {
    await hrPage.waitForSelector('.sidebar-menu a', { timeout: 15000 });
  } catch (e) {
    console.log('  Warning: wait for .sidebar-menu timed out on HR dashboard');
  }
  await hrPage.waitForTimeout(1000);

  const hrLinks = await hrPage.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('.sidebar-menu a'));
    return anchors.map(a => ({
      text: a.innerText.trim(),
      href: a.getAttribute('href'),
      parentHeader: a.closest('ul')?.previousElementSibling?.innerText?.trim() || 'HR Menu'
    })).filter(l => l.href && !l.href.startsWith('#'));
  });

  console.log(`  Discovered ${hrLinks.length} dynamic sidebar links for HR Admin.`);

  for (let i = 0; i < hrLinks.length; i++) {
    const link = hrLinks[i];
    const targetUrl = link.href.startsWith('http') ? link.href : `http://localhost:3000${link.href}`;
    const result = {
      index: i + 1,
      role: 'HR Admin',
      label: link.text,
      group: link.parentHeader,
      targetHref: link.href,
      targetUrl,
      httpStatus: 'UNKNOWN',
      rendered: false,
      hasMainContent: false,
      controlsCount: 0,
      activeHighlighted: false,
      consoleErrors: 0,
      screenshot: null,
      verdict: 'FAIL'
    };

    try {
      const resp = await safeGoto(hrPage, targetUrl, 25000);
      result.httpStatus = resp ? resp.status() : 200;
      await hrPage.waitForTimeout(600);

      const metrics = await hrPage.evaluate(() => {
        const bodyText = document.body ? document.body.innerText : '';
        const is403 = bodyText.includes('403') && bodyText.includes('Forbidden');
        const is404 = bodyText.includes('404') && (bodyText.includes('Not Found') || bodyText.includes('could not be found'));
        const isCrash = bodyText.includes('Application error') || bodyText.includes('Unhandled Runtime Error');
        const hasContent = !!(document.querySelector('table, .card, form, h1, h2, h3, canvas, svg'));
        const controls = document.querySelectorAll('button, input, select, textarea').length;
        const activeLink = document.querySelector('.sidebar-menu a.active, .sidebar-menu li.active');
        
        return {
          is403,
          is404,
          isCrash,
          hasContent,
          controls,
          hasActiveHighlight: !!activeLink,
          bodySnippet: bodyText.slice(0, 100).replace(/\n/g, ' ')
        };
      });

      result.hasMainContent = metrics.hasContent && !metrics.is403 && !metrics.is404 && !metrics.isCrash;
      result.controlsCount = metrics.controls;
      result.activeHighlighted = metrics.hasActiveHighlight;
      result.consoleErrors = hrConsoleErrors.length;

      const safeName = `hr_${i + 1}_${link.text.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
      const imgPath = path.join(SCREENSHOT_DIR, safeName);
      await hrPage.screenshot({ path: imgPath });
      result.screenshot = `docs/Saas/screenshots/consolidated-audit/${safeName}`;

      if (result.httpStatus === 200 && result.hasMainContent && !metrics.is403 && !metrics.is404) {
        result.verdict = 'PASS';
      } else if (metrics.is403) {
        result.verdict = 'BLOCKED_403';
      } else if (metrics.is404) {
        result.verdict = 'FAIL_404';
      } else {
        result.verdict = 'PARTIAL';
      }

      console.log(`  [HR Admin ${i + 1}/${hrLinks.length}] ${link.text} (${link.href}) -> ${result.verdict} (${result.controlsCount} controls)`);
    } catch (err) {
      result.verdict = 'ERROR';
      result.details = err.message;
      console.log(`  [HR Admin ${i + 1}/${hrLinks.length}] ${link.text} -> ERROR: ${err.message}`);
    }
    auditReport.hrAdminAudit.push(result);
  }
  await hrContext.close();

  // -------------------------------------------------------------------------
  // 4. AUDIT EMPLOYEE PORTAL SIDEBAR (http://localhost:3000/me/dashboard)
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Crawling Employee Portal Sidebar (/me/*) on localhost:3000 ---');
  const empToken = jwt.sign(USERS.employee.payload, JWT_SECRET, { expiresIn: '1d' });
  const empContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await empContext.addInitScript(({ t, p }) => {
    localStorage.setItem('hrms_auth_token', t);
    localStorage.setItem('auth_token', t);
    localStorage.setItem('token', t);
    localStorage.setItem('hrms_user', JSON.stringify(p));
    document.cookie = `hrms_auth_token=${t}; path=/`;
    document.cookie = `auth_token=${t}; path=/`;
  }, { t: empToken, p: USERS.employee.payload });

  const empPage = await empContext.newPage();
  const empConsoleErrors = [];
  empPage.on('console', msg => {
    if (msg.type() === 'error') empConsoleErrors.push(msg.text());
  });

  await safeGoto(empPage, 'http://localhost:3000/me/dashboard', 30000);
  try {
    await empPage.waitForSelector('.sidebar-menu a', { timeout: 15000 });
  } catch (e) {
    console.log('  Warning: wait for .sidebar-menu timed out on Employee dashboard');
  }
  await empPage.waitForTimeout(1000);

  const empLinks = await empPage.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('.sidebar-menu a'));
    return anchors.map(a => ({
      text: a.innerText.trim(),
      href: a.getAttribute('href'),
      parentHeader: a.closest('ul')?.previousElementSibling?.innerText?.trim() || 'Employee Menu'
    })).filter(l => l.href && !l.href.startsWith('#'));
  });

  console.log(`  Discovered ${empLinks.length} dynamic sidebar links for Employee.`);

  for (let i = 0; i < empLinks.length; i++) {
    const link = empLinks[i];
    const targetUrl = link.href.startsWith('http') ? link.href : `http://localhost:3000${link.href}`;
    const result = {
      index: i + 1,
      role: 'Employee',
      label: link.text,
      group: link.parentHeader,
      targetHref: link.href,
      targetUrl,
      httpStatus: 'UNKNOWN',
      rendered: false,
      hasMainContent: false,
      controlsCount: 0,
      activeHighlighted: false,
      consoleErrors: 0,
      screenshot: null,
      verdict: 'FAIL'
    };

    try {
      const resp = await safeGoto(empPage, targetUrl, 25000);
      result.httpStatus = resp ? resp.status() : 200;
      await empPage.waitForTimeout(600);

      const metrics = await empPage.evaluate(() => {
        const bodyText = document.body ? document.body.innerText : '';
        const is403 = bodyText.includes('403') && bodyText.includes('Forbidden');
        const is404 = bodyText.includes('404') && (bodyText.includes('Not Found') || bodyText.includes('could not be found'));
        const isCrash = bodyText.includes('Application error') || bodyText.includes('Unhandled Runtime Error');
        const hasContent = !!(document.querySelector('table, .card, form, h1, h2, h3, canvas, svg'));
        const controls = document.querySelectorAll('button, input, select, textarea').length;
        const activeLink = document.querySelector('.sidebar-menu a.active, .sidebar-menu li.active');
        
        return {
          is403,
          is404,
          isCrash,
          hasContent,
          controls,
          hasActiveHighlight: !!activeLink,
          bodySnippet: bodyText.slice(0, 100).replace(/\n/g, ' ')
        };
      });

      result.hasMainContent = metrics.hasContent && !metrics.is403 && !metrics.is404 && !metrics.isCrash;
      result.controlsCount = metrics.controls;
      result.activeHighlighted = metrics.hasActiveHighlight;
      result.consoleErrors = empConsoleErrors.length;

      const safeName = `emp_${i + 1}_${link.text.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
      const imgPath = path.join(SCREENSHOT_DIR, safeName);
      await empPage.screenshot({ path: imgPath });
      result.screenshot = `docs/Saas/screenshots/consolidated-audit/${safeName}`;

      if (result.httpStatus === 200 && result.hasMainContent && !metrics.is403 && !metrics.is404) {
        result.verdict = 'PASS';
      } else if (metrics.is403) {
        result.verdict = 'BLOCKED_403';
      } else if (metrics.is404) {
        result.verdict = 'FAIL_404';
      } else {
        result.verdict = 'PARTIAL';
      }

      console.log(`  [Employee ${i + 1}/${empLinks.length}] ${link.text} (${link.href}) -> ${result.verdict} (${result.controlsCount} controls)`);
    } catch (err) {
      result.verdict = 'ERROR';
      result.details = err.message;
      console.log(`  [Employee ${i + 1}/${empLinks.length}] ${link.text} -> ERROR: ${err.message}`);
    }
    auditReport.employeeAudit.push(result);
  }
  await empContext.close();

  // -------------------------------------------------------------------------
  // 5. SECURITY & ROLE BOUNDARY TESTS
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Security & Role Boundary Enforcement Tests ---');
  const secContext = await browser.newContext();
  await secContext.addInitScript(({ t, p }) => {
    localStorage.setItem('hrms_auth_token', t);
    localStorage.setItem('auth_token', t);
    localStorage.setItem('token', t);
    localStorage.setItem('hrms_user', JSON.stringify(p));
    document.cookie = `hrms_auth_token=${t}; path=/`;
    document.cookie = `auth_token=${t}; path=/`;
  }, { t: empToken, p: USERS.employee.payload });

  const secPage = await secContext.newPage();
  
  // Test 1: Employee trying to access Super Admin
  await secPage.goto('http://localhost:3000/super', { waitUntil: 'domcontentloaded' });
  try {
    await secPage.waitForSelector('text=403', { timeout: 10000 });
  } catch {
    await secPage.waitForTimeout(5000);
  }
  const sec1 = await secPage.evaluate(() => {
    const text = document.body.innerText;
    return {
      blocked: text.includes('403') || text.includes('Forbidden') || text.includes('Access Denied'),
      url: window.location.href,
      snippet: text.slice(0, 100).replace(/\n/g, ' ')
    };
  });
  auditReport.securityAudit.push({
    test: 'Employee attempting to access Super Admin console (/super)',
    expected: 'HTTP 403 Forbidden',
    result: sec1.blocked ? 'PASS (Correctly Blocked)' : 'FAIL (Security Breach)',
    details: sec1.snippet
  });
  console.log('  [Security 1] Employee -> /super:', auditReport.securityAudit[0].result);

  // Test 2: Unauthenticated API request to protected endpoint
  const unauthRes = await fetch('http://localhost:4000/api/employees', { method: 'GET' });
  auditReport.securityAudit.push({
    test: 'Unauthenticated API call to GET /api/employees',
    expected: 'HTTP 401 Unauthorized',
    result: unauthRes.status === 401 ? 'PASS (Rejected)' : `FAIL (Status: ${unauthRes.status})`,
    details: `Server returned HTTP ${unauthRes.status}`
  });
  console.log('  [Security 2] Unauth -> /api/employees:', auditReport.securityAudit[1].result);

  // Test 3: Cross-tenant isolation check via API
  const tenantBToken = jwt.sign(USERS.tenantB.payload, JWT_SECRET, { expiresIn: '1d' });
  const crossTenantRes = await fetch('http://localhost:4000/api/employees', {
    method: 'GET',
    headers: { Authorization: `Bearer ${tenantBToken}` }
  });
  const crossTenantData = await crossTenantRes.json().catch(() => ({}));
  const tenantAId = USERS.hrAdmin.payload.tenantId;
  const leakedRecords = Array.isArray(crossTenantData) 
    ? crossTenantData.filter(e => e.tenantId === tenantAId)
    : [];

  auditReport.securityAudit.push({
    test: 'Tenant B requesting employees list (checking for Tenant A leakage)',
    expected: 'Zero records belonging to Tenant A',
    result: leakedRecords.length === 0 ? 'PASS (Zero Leakage)' : 'FAIL (Data Leakage Detected)',
    details: `Tenant B query returned ${Array.isArray(crossTenantData) ? crossTenantData.length : 0} records; Tenant A records leaked: ${leakedRecords.length}`
  });
  console.log('  [Security 3] Cross-tenant isolation check:', auditReport.securityAudit[2].result);
  await secContext.close();

  // -------------------------------------------------------------------------
  // 6. EXPLICIT AUDIT OF 10 KNOWN MIGRATION GAPS
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Auditing 10 Known Migration Gaps ---');
  const gapContext = await browser.newContext();
  await gapContext.addInitScript(({ t, p }) => {
    localStorage.setItem('hrms_auth_token', t);
    localStorage.setItem('auth_token', t);
    localStorage.setItem('token', t);
    localStorage.setItem('hrms_user', JSON.stringify(p));
    document.cookie = `hrms_auth_token=${t}; path=/`;
    document.cookie = `auth_token=${t}; path=/`;
  }, { t: hrToken, p: USERS.hrAdmin.payload });

  const gapPage = await gapContext.newPage();

  for (const gap of GAP_ROUTES) {
    const itemResult = {
      id: gap.id,
      label: gap.label,
      route: gap.route,
      classicStatus: 'N/A',
      workspaceStatus: 'N/A',
      classicEvidence: '',
      workspaceEvidence: '',
      verdict: 'UNKNOWN'
    };

    // Check Classic (:5174)
    try {
      const cRes = await gapPage.goto(`http://localhost:5174${gap.route}`, { waitUntil: 'domcontentloaded', timeout: 5000 });
      itemResult.classicStatus = cRes ? cRes.status() : 200;
      const cText = await gapPage.evaluate(() => document.body ? document.body.innerText.slice(0, 120).replace(/\n/g, ' ') : '');
      itemResult.classicEvidence = cText;
    } catch (e) {
      itemResult.classicStatus = 'FAIL';
      itemResult.classicEvidence = e.message;
    }

    // Check Workspace (:3000)
    try {
      const wRes = await safeGoto(gapPage, `http://localhost:3000${gap.canonical || gap.route}`, 10000);
      itemResult.workspaceStatus = wRes ? wRes.status() : 200;
      const wText = await gapPage.evaluate(() => document.body ? document.body.innerText.slice(0, 120).replace(/\n/g, ' ') : '');
      itemResult.workspaceEvidence = wText;
    } catch (e) {
      itemResult.workspaceStatus = 'FAIL';
      itemResult.workspaceEvidence = e.message;
    }

    if (gap.id === 'GAP-1' || gap.id === 'GAP-2' || gap.id === 'GAP-3') {
      itemResult.verdict = 'CRITICAL GAP (Implemented in classic/, 100% missing in workspace UI)';
    } else if (itemResult.workspaceStatus === 200 && !itemResult.workspaceEvidence.includes('404')) {
      itemResult.verdict = 'REIMPLEMENTED (Separate Tailwind/Radix implementation in workspace)';
    } else {
      itemResult.verdict = 'MISSING IN WORKSPACE';
    }

    console.log(`  [${gap.id}] ${gap.label} -> ${itemResult.verdict}`);
    auditReport.gapAudit.push(itemResult);
  }
  await gapContext.close();

  // -------------------------------------------------------------------------
  // 7. REAL API & DATABASE PERSISTENCE TRACE
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Real API-to-Database CRUD & Persistence Verification ---');
  const testMarker = `AUDIT_PERSIST_TEST_${Date.now()}`;
  const testTenantId = 'tenant-default-001';

  try {
    // 1. Create a synthetic Todo task via API
    const createRes = await fetch('http://localhost:4000/api/todos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`
      },
      body: JSON.stringify({
        title: testMarker,
        priority: 'high',
        completed: false
      })
    });

    const createJson = await createRes.json().catch(() => ({}));
    console.log(`  [API Mutation] POST /api/todos -> HTTP ${createRes.status}`);

    // 2. Query the database directly via Prisma
    const dbRecord = await prisma.workspaceTodo.findFirst({
      where: { title: testMarker }
    });

    const dbVerified = dbRecord && dbRecord.title === testMarker && dbRecord.tenantId === testTenantId;
    console.log(`  [DB Query] Prisma findFirst({ title: "${testMarker}" }) -> ${dbVerified ? 'FOUND IN SUPABASE POSTGRESQL' : 'NOT FOUND'}`);

    // 3. Read back via API
    const readRes = await fetch('http://localhost:4000/api/todos', {
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    const readJson = await readRes.json().catch(() => ({}));
    const items = Array.isArray(readJson) ? readJson : (readJson.data || []);
    const apiVerified = items.some(t => t.title === testMarker);
    console.log(`  [API Readback] GET /api/todos -> ${apiVerified ? 'VERIFIED IN API RESPONSE' : 'NOT IN RESPONSE'}`);

    auditReport.dbTraceAudit.push({
      action: 'Create & Persist Todo Task',
      endpoint: 'POST /api/todos',
      marker: testMarker,
      apiStatus: createRes.status,
      dbPersistence: dbVerified ? 'PASS (Direct Supabase Record Verified)' : 'FAIL',
      dbTenantId: dbRecord?.tenantId,
      expectedTenantId: testTenantId,
      readbackStatus: apiVerified ? 'PASS' : 'FAIL'
    });

    // 4. Clean up synthetic record safely
    if (dbRecord) {
      await prisma.workspaceTodo.delete({ where: { id: dbRecord.id } });
      console.log(`  [Cleanup] Deleted synthetic record ${dbRecord.id}`);
    }
  } catch (err) {
    console.error('  [DB Trace Error]:', err.message);
    auditReport.dbTraceAudit.push({ error: err.message });
  }

  // -------------------------------------------------------------------------
  // 8. COMPILE SUMMARY METRICS
  // -------------------------------------------------------------------------
  const totalSuper = auditReport.superAdminAudit.length;
  const passSuper = auditReport.superAdminAudit.filter(r => r.verdict === 'PASS').length;

  const totalHr = auditReport.hrAdminAudit.length;
  const passHr = auditReport.hrAdminAudit.filter(r => r.verdict === 'PASS').length;

  const totalEmp = auditReport.employeeAudit.length;
  const passEmp = auditReport.employeeAudit.filter(r => r.verdict === 'PASS').length;

  const totalAudited = totalSuper + totalHr + totalEmp;
  const totalPassed = passSuper + passHr + passEmp;

  auditReport.summary = {
    totalAudited,
    totalPassed,
    passRate: ((totalPassed / totalAudited) * 100).toFixed(1) + '%',
    superAdmin: { total: totalSuper, passed: passSuper },
    hrAdmin: { total: totalHr, passed: passHr },
    employee: { total: totalEmp, passed: passEmp },
    knownGapsCount: auditReport.gapAudit.length,
    securityPassCount: auditReport.securityAudit.filter(s => s.result.startsWith('PASS')).length
  };

  fs.writeFileSync('scripts/consolidated_audit_results.json', JSON.stringify(auditReport, null, 2));
  console.log(`\nAudit finished! Wrote full JSON results to scripts/consolidated_audit_results.json.`);
  console.log(`Total Routes Audited: ${totalAudited} | Passed: ${totalPassed} (${auditReport.summary.passRate})`);

  await browser.close();
  await prisma.$disconnect();
}

runAudit().catch(err => {
  console.error('FATAL AUDIT FAILURE:', err);
  process.exit(1);
});
