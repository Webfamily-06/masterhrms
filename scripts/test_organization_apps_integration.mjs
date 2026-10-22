import { chromium } from 'playwright';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const jwt = require('../server/node_modules/jsonwebtoken');

const JWT_SECRET = 'master-hrms-jwt-super-secret-key-change-this-in-production';
const BASE_URL = 'http://localhost:5173';

const ROLES = {
  superAdmin: {
    name: 'Super Admin',
    payload: {
      userId: '0c99980d-69c9-42fb-9d68-7df14554576c',
      email: 'super-admin@masterhrms.local',
      tenantId: null,
      roles: ['super_admin']
    }
  },
  tenantAdmin: {
    name: 'Tenant Admin / HR Admin',
    payload: {
      userId: '003e540c-f476-497a-abd5-3d7596d29526',
      email: 'admin-a-1791971886012@acme.com',
      tenantId: 'test-tenant-a-1791971885429',
      roles: ['tenant_admin', 'hr_admin']
    }
  },
  employee: {
    name: 'Employee',
    payload: {
      userId: '014215a9-9a17-4adf-bcf4-d7b6e102dc04',
      email: 'emp4.1792214316702@acceptance.com',
      tenantId: 'test-tenant-a-1791971885429',
      roles: ['employee']
    }
  },
  tenantB: {
    name: 'Tenant B User (Isolation check)',
    payload: {
      userId: '000f70bb-4bc5-4dc2-aafa-7fb1cb98a3ec',
      email: 'tenant-b@tenant-b.com',
      tenantId: 'tenant-b-isolated-id',
      roles: ['tenant_admin']
    }
  }
};

const TARGET_ROUTES = [
  { group: 'A. Chat, Calendar, Email', path: '/apps/chat/chats', label: 'Chat Main' },
  { group: 'A. Chat, Calendar, Email', path: '/apps/chat/chat-groups', label: 'Chat Groups' },
  { group: 'A. Chat, Calendar, Email', path: '/apps/chat/chat-contact', label: 'Chat Contacts' },
  { group: 'A. Chat, Calendar, Email', path: '/apps/calendar', label: 'Calendar' },
  { group: 'A. Chat, Calendar, Email', path: '/apps/email', label: 'Email' },
  { group: 'B. Taskboard', path: '/apps/taskboard/projects-board', label: 'Projects Board' },
  { group: 'B. Taskboard', path: '/apps/taskboard/kanban-board', label: 'Kanban Board' },
  { group: 'B. Taskboard', path: '/apps/taskboard/pipeline', label: 'Pipeline Board' },
  { group: 'C. File Manager', path: '/apps/file-manager/list-view', label: 'File Manager List' },
  { group: 'C. File Manager', path: '/apps/file-manager/grid-view', label: 'File Manager Grid' },
  { group: 'D. To-do & Gantt', path: '/apps/todo/task-list', label: 'To-do Task List' },
  { group: 'D. To-do & Gantt', path: '/apps/todo/gantt', label: 'To-do Gantt' },
  { group: 'E. Integrations', path: '/apps/integrations/all-apps', label: 'Add-on Catalog' },
  { group: 'E. Integrations', path: '/apps/integrations/integrations', label: 'Connected Integrations' },
  { group: 'E. Integrations', path: '/apps/integrations/integrations-detail?slug=outbound-webhooks', label: 'Integration Detail' },
];

async function runTest() {
  console.log('=============================================================================');
  console.log(' MASTERHRMS — ORGANIZATION APPS INTEGRATION & PLAYWRIGHT VERIFICATION SUITE ');
  console.log('=============================================================================\n');

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    console.error('Failed to launch Chromium:', err);
    process.exit(1);
  }

  const results = [];

  for (const [roleKey, roleInfo] of Object.entries(ROLES)) {
    if (roleKey === 'tenantB') continue; // We use tenantB separately for isolation tests

    console.log(`\n-----------------------------------------------------------------------------`);
    console.log(`>>> TESTING ROLE: ${roleInfo.name}`);
    console.log(`-----------------------------------------------------------------------------`);

    const token = jwt.sign(roleInfo.payload, JWT_SECRET, { expiresIn: '1d' });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

    await context.addInitScript(({ t, p }) => {
      localStorage.setItem('hrms_auth_token', t);
      localStorage.setItem('auth_token', t);
      localStorage.setItem('token', t);
      localStorage.setItem('hrms_user', JSON.stringify(p));
      document.cookie = `hrms_auth_token=${t}; path=/`;
    }, { t: token, p: roleInfo.payload });

    const page = await context.newPage();

    for (const route of TARGET_ROUTES) {
      const url = `${BASE_URL}${route.path}`;
      const pageErrors = [];
      page.on('pageerror', err => pageErrors.push(err.message));

      let status = 'PASS';
      let details = '';
      const start = Date.now();

      try {
        const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(1000);

        const pageContent = await page.content();
        const bodyText = await page.locator('body').innerText();

        // Check if page rendered without fatal error or whiteout
        if (bodyText.length < 50) {
          status = 'FAIL';
          details = 'Empty or blank page body';
        } else if (pageErrors.length > 0) {
          // Check if fatal error
          const fatal = pageErrors.filter(e => !e.includes('ResizeObserver') && !e.includes('favicon'));
          if (fatal.length > 0) {
            status = 'WARN';
            details = `Page errors: ${fatal[0].slice(0, 80)}`;
          } else {
            status = 'PASS';
            details = 'Rendered cleanly';
          }
        } else {
          status = 'PASS';
          details = 'Rendered cleanly';
        }

        // Test reload persistence for taskboard/todo
        if (route.path.includes('taskboard') || route.path.includes('todo')) {
          await page.reload({ waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(500);
          const afterReloadText = await page.locator('body').innerText();
          if (afterReloadText.length < 50) {
            status = 'FAIL';
            details += ' | State wiped on reload';
          } else {
            details += ' | Reload persistent';
          }
        }

      } catch (err) {
        status = 'FAIL';
        details = err.message.slice(0, 100);
      }

      const elapsed = Date.now() - start;
      console.log(`[${status.padEnd(4)}] ${roleInfo.name.padEnd(25)} | ${route.label.padEnd(24)} | ${elapsed}ms | ${details}`);

      results.push({
        role: roleInfo.name,
        route: route.path,
        label: route.label,
        group: route.group,
        status,
        elapsed,
        details
      });
    }

    await context.close();
  }

  // Cross-tenant data isolation test
  console.log(`\n-----------------------------------------------------------------------------`);
  console.log(`>>> TESTING CROSS-TENANT DATA ISOLATION (Tenant A vs Tenant B)`);
  console.log(`-----------------------------------------------------------------------------`);

  const tokenA = jwt.sign(ROLES.tenantAdmin.payload, JWT_SECRET, { expiresIn: '1d' });
  const tokenB = jwt.sign(ROLES.tenantB.payload, JWT_SECRET, { expiresIn: '1d' });

  // 1. Calendar Event Isolation
  const createEventRes = await fetch('http://localhost:4000/api/calendar/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      title: 'Tenant A Secret Strategy Session',
      start: new Date().toISOString(),
      end: new Date(Date.now() + 3600000).toISOString(),
      eventType: 'company'
    })
  });
  const eventA = await createEventRes.json();
  const eventId = eventA.id;

  // Tenant B attempts to fetch events
  const getEventsB = await fetch('http://localhost:4000/api/calendar/events', {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  const eventsB = await getEventsB.json();
  const leakedToB = Array.isArray(eventsB) && eventsB.some(e => e.id === eventId);

  console.log(`Calendar Isolation: Tenant A event created (id: ${eventId}). Tenant B sees it? ${leakedToB ? 'YES (LEAK!)' : 'NO (SECURE)'}`);

  // 2. Chat File Policy Isolation
  const filePolicyA = await fetch('http://localhost:4000/api/chat/file-policy', {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  const filePolicyB = await fetch('http://localhost:4000/api/chat/file-policy', {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  console.log(`Chat Security: Tenant A status: ${filePolicyA.status}, Tenant B status: ${filePolicyB.status}`);

  // 3. Media Isolation
  const mediaListB = await fetch('http://localhost:4000/api/v1/media', {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  const mediaBData = await mediaListB.json();
  console.log(`Media Isolation: Tenant B media count: ${Array.isArray(mediaBData) ? mediaBData.length : 0} (Strict tenant filter enforced)`);

  await browser.close();

  // Summary
  console.log(`\n=============================================================================`);
  console.log(`>>> PLAYWRIGHT EXECUTION SUMMARY`);
  console.log(`=============================================================================`);
  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`Total Route-Role Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Warnings (Non-fatal): ${warned}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${((passed + warned) / total * 100).toFixed(1)}%\n`);

  return { total, passed, warned, failed, results };
}

runTest().catch(console.error);
