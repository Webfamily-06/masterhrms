const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const jwt = require('../server/node_modules/jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const scratchDir = path.join(__dirname, '..', 'scratch');
if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

async function verifyVisuals() {
  const browser = await chromium.launch({ headless: true });
  
  // 1. Test Super Admin /super/tenants Inactive tab
  console.log('1. Testing Super Admin /super/tenants Inactive tab...');
  const superContext = await browser.newContext();
  const superPage = await superContext.newPage();
  
  const superToken = jwt.sign(
    {
      userId: 'super-admin-user-id',
      email: 'superadmin@masterhrms.com',
      roles: ['super_admin']
    },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '1d' }
  );

  await superPage.goto('http://localhost:3000/login');
  await superPage.evaluate((t) => {
    localStorage.setItem('auth_token', t);
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify({
      id: 'super-admin-user-id',
      email: 'superadmin@masterhrms.com',
      roles: ['super_admin']
    }));
  }, superToken);

  await superPage.goto('http://localhost:3000/super/tenants');
  await superPage.waitForTimeout(3000);

  // Click 'Inactive' tab
  const inactiveBtn = superPage.locator('button:has-text("Inactive")');
  if (await inactiveBtn.count() > 0) {
    await inactiveBtn.first().click();
    await superPage.waitForTimeout(2000);
  }
  
  await superPage.screenshot({ path: path.join(scratchDir, 'super_tenants_inactive.png'), fullPage: true });
  console.log('Captured scratch/super_tenants_inactive.png');

  // 2. Test master.localhost:3000/login
  console.log('2. Testing master.localhost:3000/login...');
  const tenantContext = await browser.newContext();
  const tenantPage = await tenantContext.newPage();

  // Listen to response events
  tenantPage.on('response', async (res) => {
    if (res.url().includes('/api/auth/login')) {
      console.log('Login API response status:', res.status());
      try {
        const body = await res.json();
        console.log('Login API response body:', body);
      } catch (e) {}
    }
  });

  await tenantPage.goto('http://master.localhost:3000/login');
  await tenantPage.waitForTimeout(2000);

  await tenantPage.fill('input[type="email"]', 'gowthamtooquik@gmail.com');
  await tenantPage.fill('input[type="password"]', 'admin123');
  await tenantPage.screenshot({ path: path.join(scratchDir, 'master_login_filled.png') });

  await tenantPage.click('button[type="submit"]');
  await tenantPage.waitForTimeout(4000);

  await tenantPage.screenshot({ path: path.join(scratchDir, 'master_login_result.png'), fullPage: true });
  console.log('Current URL after login submit:', tenantPage.url());

  await browser.close();
}

verifyVisuals().catch((err) => {
  console.error(err);
  process.exit(1);
});
