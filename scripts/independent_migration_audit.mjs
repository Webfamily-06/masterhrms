import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const jwt = require('../server/node_modules/jsonwebtoken');
const { PrismaClient } = require('../server/node_modules/@prisma/client');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'master-hrms-jwt-super-secret-key-change-this-in-production';
const WORKSPACE_URL = 'http://localhost:5173';
const CLASSIC_URL = 'http://localhost:5174';
const SCREENSHOT_DIR = path.resolve('docs/Saas/screenshots/migration-audit');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// User credentials for testing
const USERS = {
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
  }
};

// Route mapping between Classic and Workspace
const COMPARISON_MAP = [
  {
    domain: 'Email & Email Accounts',
    classicRoute: '/apps/email',
    workspaceRoute: '/apps/email',
    workspaceCanonical: null, // missing in workspace
    label: 'Outbound & Inbound Email App'
  },
  {
    domain: 'Email & Email Accounts',
    classicRoute: '/settings/email-accounts',
    workspaceRoute: '/settings/email-accounts',
    workspaceCanonical: '/hr/settings?tab=email', // check if email tab exists
    label: 'User Email Accounts Configuration (SMTP/IMAP/POP3)'
  },
  {
    domain: 'Chat Application',
    classicRoute: '/apps/chat/chats',
    workspaceRoute: '/apps/chat/chats',
    workspaceCanonical: '/hr/chat',
    label: 'Direct Messaging & Conversations'
  },
  {
    domain: 'Chat Application',
    classicRoute: '/apps/chat/chat-groups',
    workspaceRoute: '/apps/chat/chat-groups',
    workspaceCanonical: '/hr/chat',
    label: 'Group Chat Channels'
  },
  {
    domain: 'Chat Application',
    classicRoute: '/apps/chat/chat-contact',
    workspaceRoute: '/apps/chat/chat-contact',
    workspaceCanonical: '/hr/employees',
    label: 'Chat Contacts & Employee Roster'
  },
  {
    domain: 'Calendar',
    classicRoute: '/apps/calendar',
    workspaceRoute: '/apps/calendar',
    workspaceCanonical: '/hr/calendar',
    label: 'Interactive FullCalendar / Event Schedule'
  },
  {
    domain: 'Taskboard & Scrumboard',
    classicRoute: '/apps/taskboard/projects-board',
    workspaceRoute: '/apps/taskboard/projects-board',
    workspaceCanonical: '/projects',
    label: 'All Project Boards'
  },
  {
    domain: 'Taskboard & Scrumboard',
    classicRoute: '/apps/taskboard/kanban-board',
    workspaceRoute: '/apps/taskboard/kanban-board',
    workspaceCanonical: '/task-board',
    label: 'Interactive Kanban Board'
  },
  {
    domain: 'Taskboard & Scrumboard',
    classicRoute: '/apps/taskboard/pipeline',
    workspaceRoute: '/apps/taskboard/pipeline',
    workspaceCanonical: '/pipeline',
    label: 'Pipeline Kanban / Deal Stages'
  },
  {
    domain: 'File Manager & Media',
    classicRoute: '/apps/file-manager/list-view',
    workspaceRoute: '/apps/file-manager/list-view',
    workspaceCanonical: '/hr/media',
    label: 'File Manager Table View'
  },
  {
    domain: 'File Manager & Media',
    classicRoute: '/apps/file-manager/grid-view',
    workspaceRoute: '/apps/file-manager/grid-view',
    workspaceCanonical: '/hr/media',
    label: 'File Manager Grid View'
  },
  {
    domain: 'To-do & Gantt',
    classicRoute: '/apps/todo/task-list',
    workspaceRoute: '/apps/todo/task-list',
    workspaceCanonical: '/hr/todo',
    label: 'Personal & Workspace To-do List'
  },
  {
    domain: 'To-do & Gantt',
    classicRoute: '/apps/todo/gantt',
    workspaceRoute: '/apps/todo/gantt',
    workspaceCanonical: null, // missing in workspace
    label: 'Interactive Frappe Gantt Chart'
  },
  {
    domain: 'Integrations & Add-ons',
    classicRoute: '/apps/integrations/all-apps',
    workspaceRoute: '/apps/integrations/all-apps',
    workspaceCanonical: '/marketplace',
    label: 'Add-on Catalog & Marketplace'
  },
  {
    domain: 'Integrations & Add-ons',
    classicRoute: '/apps/integrations/integrations',
    workspaceRoute: '/apps/integrations/integrations',
    workspaceCanonical: '/integrations',
    label: 'Connected Integrations Manager'
  },
  {
    domain: 'Invoices',
    classicRoute: '/apps/invoices/invoice-list',
    workspaceRoute: '/apps/invoices/invoice-list',
    workspaceCanonical: '/invoices',
    label: 'Invoices Table & History'
  },
  {
    domain: 'Invoices',
    classicRoute: '/apps/invoices/create-invoice',
    workspaceRoute: '/apps/invoices/create-invoice',
    workspaceCanonical: '/invoice/create',
    label: 'Create Invoice Builder'
  }
];

async function runAudit() {
  console.log('=============================================================================');
  console.log(' MASTERHRMS — INDEPENDENT ORIGINAL UI VS WORKSPACE MIGRATION AUDIT (BROWSER)');
  console.log('=============================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const auditResults = [];

  const tokenAdmin = jwt.sign(USERS.tenantAdmin.payload, JWT_SECRET, { expiresIn: '1d' });

  for (const item of COMPARISON_MAP) {
    console.log(`\n-----------------------------------------------------------------------------`);
    console.log(`DOMAIN: [${item.domain}] — ${item.label}`);
    console.log(`-----------------------------------------------------------------------------`);

    const result = {
      domain: item.domain,
      label: item.label,
      classicRoute: item.classicRoute,
      workspaceRoute: item.workspaceRoute,
      workspaceCanonical: item.workspaceCanonical,
      classicStatus: 'UNKNOWN',
      workspaceStatus: 'UNKNOWN',
      workspaceCanonicalStatus: 'UNKNOWN',
      classicScreenshot: null,
      workspaceScreenshot: null,
      workspaceCanonicalScreenshot: null,
      classicElements: [],
      workspaceElements: [],
      verdict: 'NOT TESTED',
      details: ''
    };

    // 1. Audit Classic Reference App (port 5174)
    const contextClassic = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await contextClassic.addInitScript(({ t, p }) => {
      localStorage.setItem('hrms_auth_token', t);
      localStorage.setItem('auth_token', t);
      localStorage.setItem('token', t);
      localStorage.setItem('hrms_user', JSON.stringify(p));
      document.cookie = `hrms_auth_token=${t}; path=/`;
    }, { t: tokenAdmin, p: USERS.tenantAdmin.payload });

    const pageClassic = await contextClassic.newPage();
    const classicConsoleErrors = [];
    pageClassic.on('console', msg => {
      if (msg.type() === 'error') classicConsoleErrors.push(msg.text());
    });

    try {
      const resp = await pageClassic.goto(`${CLASSIC_URL}${item.classicRoute}`, { waitUntil: 'networkidle', timeout: 8000 });
      result.classicStatus = resp ? resp.status() : 'OK';
      
      const fileSafe = item.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const classicImgPath = path.join(SCREENSHOT_DIR, `classic_${fileSafe}.png`);
      await pageClassic.screenshot({ path: classicImgPath, fullPage: true });
      result.classicScreenshot = `docs/Saas/screenshots/migration-audit/classic_${fileSafe}.png`;

      // Inspect elements
      const bodyText = await pageClassic.evaluate(() => document.body.innerText.substring(0, 500));
      const hasHeading = await pageClassic.locator('h1, h2, h3, h4, .page-header, .app-header').count() > 0;
      const cardCount = await pageClassic.locator('.card').count();
      const tableCount = await pageClassic.locator('table').count();
      const buttonCount = await pageClassic.locator('button').count();

      result.classicElements = { hasHeading, cardCount, tableCount, buttonCount, snippet: bodyText.substring(0, 100).replace(/\n/g, ' ') };
      console.log(`  [CLASSIC :5174] ${item.classicRoute} -> Loaded (HTTP ${result.classicStatus}), ${cardCount} cards, ${tableCount} tables, ${buttonCount} buttons`);
    } catch (err) {
      result.classicStatus = `ERROR: ${err.message.split('\n')[0]}`;
      console.log(`  [CLASSIC :5174] ${item.classicRoute} -> FAILED: ${result.classicStatus}`);
    } finally {
      await contextClassic.close();
    }

    // 2. Audit Workspace Direct Route (port 5173 with classicRoute path)
    const contextWorkspace = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await contextWorkspace.addInitScript(({ t, p }) => {
      localStorage.setItem('hrms_auth_token', t);
      localStorage.setItem('auth_token', t);
      localStorage.setItem('token', t);
      localStorage.setItem('hrms_user', JSON.stringify(p));
      document.cookie = `hrms_auth_token=${t}; path=/`;
    }, { t: tokenAdmin, p: USERS.tenantAdmin.payload });

    const pageWorkspace = await contextWorkspace.newPage();
    const wsConsoleErrors = [];
    pageWorkspace.on('console', msg => {
      if (msg.type() === 'error') wsConsoleErrors.push(msg.text());
    });

    try {
      const resp = await pageWorkspace.goto(`${WORKSPACE_URL}${item.workspaceRoute}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await pageWorkspace.waitForTimeout(1500);
      const currentUrl = pageWorkspace.url();
      const bodyText = await pageWorkspace.evaluate(() => document.body.innerText);
      const is404 = bodyText.includes('404') || bodyText.includes('Page Not Found') || bodyText.includes('not found') || currentUrl.includes('/404');

      if (is404) {
        result.workspaceStatus = '404 NOT_FOUND';
      } else {
        result.workspaceStatus = resp ? resp.status() : 'OK';
      }

      const fileSafe = item.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const wsImgPath = path.join(SCREENSHOT_DIR, `workspace_direct_${fileSafe}.png`);
      await pageWorkspace.screenshot({ path: wsImgPath, fullPage: true });
      result.workspaceScreenshot = `docs/Saas/screenshots/migration-audit/workspace_direct_${fileSafe}.png`;

      console.log(`  [WORKSPACE :5173 Direct Route] ${item.workspaceRoute} -> Result: ${result.workspaceStatus} (Final URL: ${currentUrl})`);
    } catch (err) {
      result.workspaceStatus = `ERROR: ${err.message.split('\n')[0]}`;
      console.log(`  [WORKSPACE :5173 Direct Route] ${item.workspaceRoute} -> FAILED: ${result.workspaceStatus}`);
    } finally {
      await contextWorkspace.close();
    }

    // 3. Audit Workspace Canonical Route (if different)
    if (item.workspaceCanonical) {
      const contextCanonical = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await contextCanonical.addInitScript(({ t, p }) => {
        localStorage.setItem('hrms_auth_token', t);
        localStorage.setItem('auth_token', t);
        localStorage.setItem('token', t);
        localStorage.setItem('hrms_user', JSON.stringify(p));
        document.cookie = `hrms_auth_token=${t}; path=/`;
      }, { t: tokenAdmin, p: USERS.tenantAdmin.payload });

      const pageCanonical = await contextCanonical.newPage();
      try {
        const resp = await pageCanonical.goto(`${WORKSPACE_URL}${item.workspaceCanonical}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await pageCanonical.waitForTimeout(1500);
        const currentUrl = pageCanonical.url();
        const bodyText = await pageCanonical.evaluate(() => document.body.innerText);
        const is404 = bodyText.includes('404') || bodyText.includes('Page Not Found') || currentUrl.includes('/404');

        if (is404) {
          result.workspaceCanonicalStatus = '404 NOT_FOUND';
        } else {
          result.workspaceCanonicalStatus = resp ? resp.status() : 'OK';
        }

        const fileSafe = item.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const canonImgPath = path.join(SCREENSHOT_DIR, `workspace_canon_${fileSafe}.png`);
        await pageCanonical.screenshot({ path: canonImgPath, fullPage: true });
        result.workspaceCanonicalScreenshot = `docs/Saas/screenshots/migration-audit/workspace_canon_${fileSafe}.png`;

        console.log(`  [WORKSPACE :5173 Canonical] ${item.workspaceCanonical} -> Result: ${result.workspaceCanonicalStatus}`);
      } catch (err) {
        result.workspaceCanonicalStatus = `ERROR: ${err.message.split('\n')[0]}`;
        console.log(`  [WORKSPACE :5173 Canonical] ${item.workspaceCanonical} -> FAILED: ${result.workspaceCanonicalStatus}`);
      } finally {
        await contextCanonical.close();
      }
    } else {
      result.workspaceCanonicalStatus = 'NO_CANONICAL_ROUTE';
      console.log(`  [WORKSPACE :5173 Canonical] None defined (Feature missing from root workspace)`);
    }

    // Determine verdict
    if (item.domain === 'Email & Email Accounts') {
      result.verdict = 'MISSING_IN_WORKSPACE';
      result.details = 'UI implemented exclusively in classic/src/views/Email and classic/src/views/Settings/EmailAccounts using React-Bootstrap. Root workspace has NO matching route or components in src/routes.';
    } else if (item.label.includes('Gantt')) {
      result.verdict = 'MISSING_IN_WORKSPACE';
      result.details = 'Gantt chart implemented in classic/src/views/Todo/Gantt using frappe-gantt. Root workspace src/routes/_authenticated/_app/todo only has Todo list; no Gantt route exists.';
    } else if (result.workspaceStatus === '404 NOT_FOUND' && result.workspaceCanonicalStatus === 200) {
      result.verdict = 'PARTIALLY_MIGRATED_DIFFERENT_ROUTE';
      result.details = `Route ${item.workspaceRoute} returns 404 in workspace, but workspace has independent Tailwind/Radix implementation at ${item.workspaceCanonical}. Original Jampack layout not imported.`;
    } else if (result.workspaceStatus === 200) {
      result.verdict = 'FULLY_MIGRATED';
      result.details = 'Route matches and renders in workspace.';
    } else {
      result.verdict = 'DIVERGENT';
      result.details = `Workspace direct route: ${result.workspaceStatus}, Canonical: ${result.workspaceCanonicalStatus}`;
    }

    auditResults.push(result);
  }

  await browser.close();

  fs.writeFileSync('scripts/migration_audit_results.json', JSON.stringify(auditResults, null, 2));
  console.log('\nAudit complete! Saved detailed raw results to scripts/migration_audit_results.json');
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
