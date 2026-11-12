const { chromium } = require('playwright');
const jwt = require('jsonwebtoken');

(async () => {
  const jwtSecret = 'master-hrms-jwt-super-secret-key-change-this-in-production';
  const tenantId = '02bf4113-b100-4711-af94-d81165e9a2e1';
  const userId = '00000000-0000-0000-0000-000000000001';
  const email = 'superadmin@masterhrms.com';

  const authToken = jwt.sign(
    { sub: userId, userId, email, tenantId, roles: ['super_admin', 'hr_admin', 'manager'], permissions: ['*'], is_super_admin: true },
    jwtSecret,
    { algorithm: 'HS256', expiresIn: '2h' }
  );

  const authUser = {
    id: userId,
    email: email,
    tenantId: tenantId,
    roles: ['super_admin', 'hr_admin', 'manager'],
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  await context.addInitScript(
    ({ token, u }) => {
      localStorage.setItem('hrms_auth_token', token);
      localStorage.setItem('auth_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('hrms_user', JSON.stringify(u));
      document.cookie = `hrms_auth_token=${encodeURIComponent(token)}; path=/; max-age=7200`;
      document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=7200`;
    },
    { token: authToken, u: authUser }
  );

  const page = await context.newPage();
  page.on('response', async res => {
    if (res.status() >= 400) {
      console.log(`HTTP ${res.status()} ${res.url()}`);
      try {
        console.log('Response body:', await res.text());
      } catch (e) {}
    }
  });

  await page.goto('http://localhost:5173/hr/organization/branches', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  await browser.close();
})();
