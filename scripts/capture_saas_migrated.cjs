const { chromium } = require('playwright');
const http = require('http');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.resolve(__dirname, '../docs/Saas/screenshots/classic-to-saas-migration');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function getAuthToken() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: 'gowthamtooquik@gmail.com',
      password: 'admin123'
    });

    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

const SAAS_PAGES = [
  { url: '/apps/chat/chats', file: 'saas-chat-personal.png', title: 'Personal Chat' },
  { url: '/apps/chat/chat-groups', file: 'saas-chat-groups.png', title: 'Chat Groups' },
  { url: '/apps/chat/chat-contact', file: 'saas-chat-contact.png', title: 'Chat Contact' },
  { url: '/apps/calendar', file: 'saas-calendar.png', title: 'Calendar' },
  { url: '/apps/email', file: 'saas-email.png', title: 'Email Mailbox' },
  { url: '/apps/taskboard/projects-board', file: 'saas-projects-board.png', title: 'Projects Board' },
  { url: '/apps/taskboard/kanban-board', file: 'saas-kanban-board.png', title: 'Kanban Board' },
  { url: '/apps/taskboard/pipeline', file: 'saas-pipeline.png', title: 'Pipeline' },
  { url: '/apps/file-manager/list-view', file: 'saas-file-manager-list.png', title: 'File Manager List' },
  { url: '/apps/file-manager/grid-view', file: 'saas-file-manager-grid.png', title: 'File Manager Grid' },
  { url: '/apps/todo/task-list', file: 'saas-todo-task-list.png', title: 'Todo Task List' },
  { url: '/apps/todo/gantt', file: 'saas-todo-gantt.png', title: 'Todo Gantt' },
  { url: '/apps/integrations/all-apps', file: 'saas-tenant-all-apps.png', title: 'Tenant All Apps' }
];

async function main() {
  console.log('Authenticating with backend...');
  const auth = await getAuthToken();
  const token = auth.token || (auth.data && auth.data.token);
  const user = auth.user || (auth.data && auth.data.user) || { email: 'gowthamtooquik@gmail.com', name: 'Gowtham' };
  console.log('Obtained token:', token ? `${token.slice(0, 15)}...` : 'None');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  // Initialize localStorage on localhost:5173
  await page.goto('http://localhost:5173/auth', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('hrms_auth_token', token);
    localStorage.setItem('auth_token', token);
    localStorage.setItem('token', token);
    localStorage.setItem('hrms_user', JSON.stringify(user));
    localStorage.setItem('user', JSON.stringify(user));
  }, { token, user });

  console.log('\n--- Capturing SaaS Migrated Screenshots (http://localhost:5173) ---');
  for (const item of SAAS_PAGES) {
    const fullUrl = `http://localhost:5173${item.url}`;
    try {
      console.log(`Navigating to ${fullUrl} [${item.title}]...`);
      await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 15000 }).catch(async () => {
        await page.waitForTimeout(2500);
      });
      await page.waitForTimeout(1200);

      const outPath = path.join(OUT_DIR, item.file);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`  Saved ${item.file} (${fs.statSync(outPath).size} bytes)`);
    } catch (err) {
      console.error(`  Error on ${item.url}:`, err.message);
    }
  }

  await browser.close();
  console.log('\nSaaS migrated capture completed successfully!');
}

main().catch(err => {
  console.error('Fatal error in main:', err);
  process.exit(1);
});
