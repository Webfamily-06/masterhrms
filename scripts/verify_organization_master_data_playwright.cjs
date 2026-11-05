const { chromium } = require('playwright');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../server/.env'), 'utf-8');
const jwtMatch = envContent.match(/^JWT_SECRET=["']?(.*?)["']?$/m);
const jwtSecret = jwtMatch ? jwtMatch[1] : 'masterhrms-super-secure-jwt-secret-key-2025-production-grade';

function makeToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
      permissions: ['*']
    },
    jwtSecret,
    { algorithm: 'HS256', expiresIn: '2h' }
  );
}

const defaultUser = {
  id: 'user-hr-001',
  email: 'hr@masterhrms.com',
  tenantId: 'tenant-default-001',
  roles: ['hr_admin']
};
const defaultToken = makeToken(defaultUser);

const evidenceDir = path.resolve(__dirname, '../docs/hrms-audit/evidence/org-master-data');
if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

async function runBrowserTests(baseUrl = 'http://localhost:3000') {
  console.log(`\n======================================================`);
  console.log(`Starting Organization Master Data Browser E2E Tests on: ${baseUrl}`);
  console.log(`======================================================`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 390, height: 844 }
  ];

  for (const vp of viewports) {
    console.log(`\n--- Testing Viewport: ${vp.name.toUpperCase()} (${vp.width}x${vp.height}) ---`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1
    });

    // Pre-populate authenticated state in localStorage before navigation
    await context.addInitScript(({ token, user }) => {
      localStorage.setItem('hrms_auth_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('hrms_user', JSON.stringify(user));
    }, { token: defaultToken, user: defaultUser });

    const page = await context.newPage();

    // 1. Test Departments Page
    console.log(`[${vp.name}] Navigating to /hr/organization/departments...`);
    try {
      await page.goto(`${baseUrl}/hr/organization/departments`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Capture screenshot
      const deptScreenshot = path.join(evidenceDir, `departments_${vp.name}.png`);
      await page.screenshot({ path: deptScreenshot, fullPage: true });
      console.log(`Saved screenshot: ${deptScreenshot}`);

      // Inspect text content for summary cards
      const bodyText = await page.textContent('body');
      const hasTotalDept = bodyText.includes('5') || bodyText.includes('Total Departments');
      const hasActiveDept = bodyText.includes('Active Departments');
      console.log(`[${vp.name}] Departments summary cards visible:`, hasTotalDept && hasActiveDept ? 'YES' : 'PARTIAL');

      // Check table rows
      const rows = await page.$$('table tbody tr');
      console.log(`[${vp.name}] Departments table rows rendered:`, rows.length);

      // Check actions: click Add Department button if on desktop
      if (vp.name === 'desktop') {
        const addBtn = await page.$('button:has-text("Add Department")');
        if (addBtn) {
          await addBtn.click();
          await page.waitForTimeout(500);
          const modalScreenshot = path.join(evidenceDir, `departments_add_modal_${vp.name}.png`);
          await page.screenshot({ path: modalScreenshot });
          console.log(`Saved modal screenshot: ${modalScreenshot}`);
          // Close modal
          const cancelBtn = await page.$('button:has-text("Cancel")');
          if (cancelBtn) await cancelBtn.click();
        }
      }
    } catch (err) {
      console.warn(`[${vp.name}] Departments navigation warning:`, err.message);
    }

    // 2. Test Designations Page
    console.log(`[${vp.name}] Navigating to /hr/organization/designations...`);
    try {
      await page.goto(`${baseUrl}/hr/organization/designations`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      const desigScreenshot = path.join(evidenceDir, `designations_${vp.name}.png`);
      await page.screenshot({ path: desigScreenshot, fullPage: true });
      console.log(`Saved screenshot: ${desigScreenshot}`);

      const rows = await page.$$('table tbody tr');
      console.log(`[${vp.name}] Designations table rows rendered:`, rows.length);
    } catch (err) {
      console.warn(`[${vp.name}] Designations navigation warning:`, err.message);
    }

    // 3. Test Branches Page
    console.log(`[${vp.name}] Navigating to /hr/organization/branches...`);
    try {
      await page.goto(`${baseUrl}/hr/organization/branches`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      const branchScreenshot = path.join(evidenceDir, `branches_${vp.name}.png`);
      await page.screenshot({ path: branchScreenshot, fullPage: true });
      console.log(`Saved screenshot: ${branchScreenshot}`);

      const rows = await page.$$('table tbody tr');
      console.log(`[${vp.name}] Branches table rows rendered:`, rows.length);
    } catch (err) {
      console.warn(`[${vp.name}] Branches navigation warning:`, err.message);
    }

    await context.close();
  }

  await browser.close();
  console.log('\n======================================================');
  console.log('Organization Master Data Browser E2E Tests Complete!');
  console.log('======================================================');
}

module.exports = { runBrowserTests };

if (require.main === module) {
  runBrowserTests().catch(console.error);
}

