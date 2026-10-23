const { chromium } = require('playwright');
const http = require('http');

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

const TEST_ROUTES = [
  { path: '/apps/chat/chats', name: 'Personal Chat', selector: 'input[placeholder*="Type your message"]' },
  { path: '/apps/chat/chat-groups', name: 'Chat Groups', selector: 'input[placeholder="Search Groups"]' },
  { path: '/apps/chat/chat-contact', name: 'Chat Contact', selector: 'text=Contacts' },
  { path: '/apps/calendar', name: 'Calendar', selector: 'button:has-text("Create")' },
  { path: '/apps/email', name: 'Email Mailbox', selector: 'button:has-text("Compose")' },
  { path: '/apps/taskboard/projects-board', name: 'Projects Board', selector: 'text=All Boards' },
  { path: '/apps/taskboard/kanban-board', name: 'Kanban Board', selector: 'text=To Do List' },
  { path: '/apps/taskboard/pipeline', name: 'Pipeline', selector: 'text=Sales Pipeline' },
  { path: '/apps/file-manager/list-view', name: 'File Manager List', selector: 'input[placeholder="Search files and folders"]' },
  { path: '/apps/file-manager/grid-view', name: 'File Manager Grid', selector: 'input[placeholder="Search files and folders"]' },
  { path: '/apps/todo/task-list', name: 'Todo Task List', selector: 'text=Recently Assigned' },
  { path: '/apps/todo/gantt', name: 'Todo Gantt', selector: 'text=Gantt' },
  { path: '/apps/integrations/all-apps', name: 'All Apps Catalog', selector: 'text=All Apps' }
];

async function runRegressionSuite() {
  console.log('--- MASTERHRMS Classic-to-SaaS Regression Suite ---');
  const auth = await getAuthToken();
  const token = auth.token || (auth.data && auth.data.token);
  const user = auth.user || (auth.data && auth.data.user) || { email: 'gowthamtooquik@gmail.com', name: 'Gowtham' };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Login
  await page.goto('http://localhost:5173/auth', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('hrms_auth_token', token);
    localStorage.setItem('auth_token', token);
    localStorage.setItem('token', token);
    localStorage.setItem('hrms_user', JSON.stringify(user));
    localStorage.setItem('user', JSON.stringify(user));
  }, { token, user });

  let passed = 0;
  let failed = 0;
  const results = [];

  for (const item of TEST_ROUTES) {
    const fullUrl = `http://localhost:5173${item.path}`;
    try {
      const pageErrors = [];
      page.on('pageerror', err => pageErrors.push(err.message));

      const resp = await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 10000 }).catch(async () => {
        await page.waitForTimeout(2000);
      });

      // Check if target selector exists
      const element = await page.waitForSelector(item.selector, { timeout: 5000 }).catch(() => null);
      const isVisible = element ? await element.isVisible() : false;

      if (element && isVisible && pageErrors.length === 0) {
        console.log(`PASS: ${item.name} (${item.path}) - Loaded with element "${item.selector}"`);
        passed++;
        results.push({ name: item.name, path: item.path, status: 'PASS' });
      } else if (element && isVisible) {
        console.log(`PASS (warnings): ${item.name} (${item.path}) - Errors: ${pageErrors.join('; ')}`);
        passed++;
        results.push({ name: item.name, path: item.path, status: 'PASS_WITH_WARNINGS', errors: pageErrors });
      } else {
        console.log(`FAIL: ${item.name} (${item.path}) - Selector "${item.selector}" not found. Errors: ${pageErrors.join('; ')}`);
        failed++;
        results.push({ name: item.name, path: item.path, status: 'FAIL', errors: pageErrors });
      }
    } catch (err) {
      console.log(`FAIL: ${item.name} (${item.path}) - Exception: ${err.message}`);
      failed++;
      results.push({ name: item.name, path: item.path, status: 'FAIL', error: err.message });
    }
  }

  await browser.close();
  console.log(`\nRegression Suite Complete: ${passed} Passed, ${failed} Failed out of ${TEST_ROUTES.length} routes.`);

  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionSuite().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
