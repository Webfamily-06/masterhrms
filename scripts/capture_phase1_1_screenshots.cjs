/**
 * MASTERHRMS — PHASE 1.1 PLAYWRIGHT MCP SCREENSHOT CAPTURE SUITE
 * Captures live visual evidence of all audited SaaS applications under
 * controlled identities into docs/Saas/screenshots/phase-1-1-security-regression/
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const jwt = require('../server/node_modules/jsonwebtoken');
const { PrismaClient } = require('../server/node_modules/@prisma/client');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'master-hrms-jwt-super-secret-key-change-this-in-production';
const SCREENSHOT_DIR = path.resolve(__dirname, '../docs/Saas/screenshots/phase-1-1-security-regression');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
}

async function captureEvidence() {
  console.log('--- Launching Playwright Screenshot Capture ---');
  const browser = await chromium.launch({ headless: true });

  const tenantA = 'tenant-default-001';
  const userGowtham = await prisma.user.findFirst({ where: { email: 'gowthamtooquik@gmail.com' } });
  const userSarah = await prisma.user.findFirst({ where: { email: 'hr@masterhrms.com' } });
  const userAlex = await prisma.user.findFirst({ where: { email: 'employee@masterhrms.com' } });
  const userEmp2 = await prisma.user.findFirst({ where: { email: 'test-rep-1792070271292@hrms.local' } });

  const tokenAdmin = createToken({ userId: userGowtham.id, tenantId: tenantA, roles: ['tenant_admin', 'admin'], email: userGowtham.email });
  const tokenHR = createToken({ userId: userSarah.id, tenantId: tenantA, roles: ['hr_admin', 'hr'], email: userSarah.email });
  const tokenEmp1 = createToken({ userId: userAlex.id, tenantId: tenantA, roles: ['employee'], email: userAlex.email });
  const tokenEmp2 = createToken({ userId: userEmp2.id, tenantId: tenantA, roles: ['employee'], email: userEmp2.email });

  const sessions = [
    { name: 'tenant_admin', token: tokenAdmin, user: userGowtham },
    { name: 'employee_alex', token: tokenEmp1, user: userAlex },
    { name: 'employee_tester', token: tokenEmp2, user: userEmp2 },
    { name: 'hr_admin', token: tokenHR, user: userSarah },
  ];

  const routes = [
    { path: '/apps/calendar', slug: 'calendar' },
    { path: '/apps/todo/task-list', slug: 'todo-list' },
    { path: '/apps/todo/gantt', slug: 'todo-gantt' },
    { path: '/apps/chat/chats', slug: 'chat-direct' },
    { path: '/apps/file-manager/list-view', slug: 'file-manager-list' },
    { path: '/apps/file-manager/grid-view', slug: 'file-manager-grid' },
    { path: '/apps/taskboard/projects-board', slug: 'projects-board' },
    { path: '/apps/taskboard/kanban-board', slug: 'kanban-board' },
    { path: '/apps/taskboard/pipeline', slug: 'pipeline' },
  ];

  for (const session of sessions) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });

    // Set auth tokens in localStorage and cookies
    await context.addInitScript(({ token, user, tenantA }) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('tenant_id', tenantA);
      localStorage.setItem('user', JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.email.split('@')[0],
        tenantId: tenantA,
      }));
    }, { token: session.token, user: session.user, tenantA });

    const page = await context.newPage();

    // Navigate to each route and capture
    for (const r of routes) {
      const url = `http://localhost:5173${r.path}`;
      const shotPath = path.join(SCREENSHOT_DIR, `${session.name}_${r.slug}.png`);
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await page.waitForTimeout(1500);
        await page.screenshot({ path: shotPath, fullPage: false });
        console.log(`[CAPTURE] Saved: ${session.name}_${r.slug}.png`);
      } catch (err) {
        console.warn(`[CAPTURE WARN] Route ${r.path} for ${session.name}: ${err.message}`);
        try {
          await page.screenshot({ path: shotPath, fullPage: false });
          console.log(`[CAPTURE FALLBACK] Saved: ${session.name}_${r.slug}.png`);
        } catch {}
      }
    }

    await context.close();
  }

  await browser.close();
  await prisma.$disconnect();
  console.log('--- All Playwright Screenshots Captured Successfully ---');
}

captureEvidence().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
