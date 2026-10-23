const { chromium } = require('playwright');
const http = require('http');
const path = require('path');
const fs = require('fs');

async function getAuthToken() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ email: 'gowthamtooquik@gmail.com', password: 'admin123' });
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
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.write(postData);
    req.end();
  });
}

async function capture() {
  const auth = await getAuthToken();
  const token = auth.token || (auth.data && auth.data.token);
  const user = auth.user || (auth.data && auth.data.user);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:5173/auth');
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('hrms_auth_token', token);
    localStorage.setItem('auth_token', token);
    localStorage.setItem('token', token);
    localStorage.setItem('hrms_user', JSON.stringify(user));
    localStorage.setItem('user', JSON.stringify(user));
  }, { token, user });

  const outDir = path.resolve(__dirname, '../docs/Saas/screenshots/classic-to-saas-migration');

  console.log('Capturing list view...');
  await page.goto('http://localhost:5173/apps/file-manager/list-view', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, 'saas-file-manager-list.png') });
  console.log('Recaptured saas-file-manager-list.png');

  console.log('Capturing grid view...');
  await page.goto('http://localhost:5173/apps/file-manager/grid-view', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, 'saas-file-manager-grid.png') });
  console.log('Recaptured saas-file-manager-grid.png');

  await browser.close();
  console.log('Recapture complete!');
}

capture().catch(console.error);
