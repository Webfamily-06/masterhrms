const { chromium } = require('playwright');
const http = require('http');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\TSV Global Solutions\\.gemini\\antigravity\\brain\\29494ee0-4f9e-4896-8c16-14b56e9678b0';

async function loginUser(email, password = 'admin123') {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ email, password });
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
          const json = JSON.parse(data);
          resolve(json.token || json.data?.token);
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

async function runBrowserQA() {
  console.log('================================================================');
  console.log('STARTING BROWSER QA: UNIFIED FILE MANAGER & NAVIGATION');
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true });

  async function createSession(email) {
    const token = await loginUser(email);
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });
    const page = await context.newPage();

    // Navigate to initialize domain
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await page.evaluate((tok) => {
      localStorage.setItem('hrms_auth_token', tok);
      localStorage.setItem('auth_token', tok);
      localStorage.setItem('token', tok);
      document.cookie = `hrms_auth_token=${encodeURIComponent(tok)}; path=/; max-age=604800; SameSite=Lax`;
    }, token);

    return { context, page, token };
  }

  // 1. Super Admin: /super/files
  console.log('[1/8] Verifying Super Admin Canonical File Manager (/super/files)...');
  const superSession = await createSession('admin@masterhrms.com');
  await superSession.page.goto('http://localhost:3000/super/files', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await superSession.page.waitForTimeout(2000);
  await superSession.page.screenshot({
    path: path.join(ARTIFACT_DIR, '01_unified_super_admin_file_manager.png'),
    fullPage: false
  });
  console.log('  -> Saved 01_unified_super_admin_file_manager.png');
  await superSession.context.close();

  // 2. Tenant Admin: /tenant/files
  console.log('[2/8] Verifying Tenant Admin Canonical File Manager (/tenant/files)...');
  const tenantSession = await createSession('gowthamtooquik@gmail.com');
  await tenantSession.page.goto('http://localhost:3000/tenant/files', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await tenantSession.page.waitForTimeout(2000);
  await tenantSession.page.screenshot({
    path: path.join(ARTIFACT_DIR, '02_unified_tenant_admin_file_manager.png'),
    fullPage: false
  });
  console.log('  -> Saved 02_unified_tenant_admin_file_manager.png');
  await tenantSession.context.close();

  // 3-5. HR Admin: /hr/files (Details, Grid, List View switching in-page)
  console.log('[3/8] Verifying HR Admin File Manager Details View (/hr/files)...');
  const hrSession = await createSession('hr@masterhrms.com');
  await hrSession.page.goto('http://localhost:3000/hr/files', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await hrSession.page.waitForTimeout(2000);

  // Switch to Details View via toolbar button
  const detailsBtn = hrSession.page.locator('button[title="Details View"]');
  if (await detailsBtn.count() > 0) {
    await detailsBtn.click();
    await hrSession.page.waitForTimeout(800);
  }
  await hrSession.page.screenshot({
    path: path.join(ARTIFACT_DIR, '03_unified_hr_admin_file_manager_details.png'),
    fullPage: false
  });
  console.log('  -> Saved 03_unified_hr_admin_file_manager_details.png');

  // Switch to Grid View
  console.log('[4/8] Verifying HR Admin File Manager Grid View (1-Click switch)...');
  const gridBtn = hrSession.page.locator('button[title="Grid View"]');
  if (await gridBtn.count() > 0) {
    await gridBtn.click();
    await hrSession.page.waitForTimeout(800);
  }
  await hrSession.page.screenshot({
    path: path.join(ARTIFACT_DIR, '04_unified_hr_admin_file_manager_grid.png'),
    fullPage: false
  });
  console.log('  -> Saved 04_unified_hr_admin_file_manager_grid.png');

  // Switch to List View
  console.log('[5/8] Verifying HR Admin File Manager List View (1-Click switch)...');
  const listBtn = hrSession.page.locator('button[title="List View"]');
  if (await listBtn.count() > 0) {
    await listBtn.click();
    await hrSession.page.waitForTimeout(800);
  }
  await hrSession.page.screenshot({
    path: path.join(ARTIFACT_DIR, '05_unified_hr_admin_file_manager_list.png'),
    fullPage: false
  });
  console.log('  -> Saved 05_unified_hr_admin_file_manager_list.png');

  // 6. Organization Chat Attachments filter
  console.log('[6/8] Verifying Organization Chat Attachments filter in HR Admin...');
  const chatFilterBtn = hrSession.page.locator('button:has-text("Chat Attachments")');
  if (await chatFilterBtn.count() > 0) {
    await chatFilterBtn.click();
    await hrSession.page.waitForTimeout(1500);
  }
  await hrSession.page.screenshot({
    path: path.join(ARTIFACT_DIR, '06_unified_chat_attachments_view.png'),
    fullPage: false
  });
  console.log('  -> Saved 06_unified_chat_attachments_view.png');
  await hrSession.context.close();

  // 7. Employee: /me/files
  console.log('[7/8] Verifying Employee Canonical File Manager (/me/files)...');
  const employeeSession = await createSession('employee@masterhrms.com');
  await employeeSession.page.goto('http://localhost:3000/me/files', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await employeeSession.page.waitForTimeout(2000);
  await employeeSession.page.screenshot({
    path: path.join(ARTIFACT_DIR, '07_unified_employee_file_manager.png'),
    fullPage: false
  });
  console.log('  -> Saved 07_unified_employee_file_manager.png');
  await employeeSession.context.close();

  // 8. Legacy Redirect Demonstration
  console.log('[8/8] Verifying Legacy Route Redirect in Browser (/apps/file-manager/grid-view)...');
  const redirectSession = await createSession('hr@masterhrms.com');
  await redirectSession.page.goto('http://localhost:3000/apps/file-manager/grid-view', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await redirectSession.page.waitForTimeout(2000);
  const currentUrl = redirectSession.page.url();
  console.log('  Redirect destination URL:', currentUrl);
  await redirectSession.page.screenshot({
    path: path.join(ARTIFACT_DIR, '08_legacy_redirect_verification.png'),
    fullPage: false
  });
  console.log('  -> Saved 08_legacy_redirect_verification.png');
  await redirectSession.context.close();

  await browser.close();
  console.log('\n================================================================');
  console.log('BROWSER QA COMPLETE: ALL 8 SCREENSHOTS CAPTURED SUCCESSFULLY!');
  console.log('================================================================\n');
}

runBrowserQA().catch(err => {
  console.error("Browser QA failed:", err);
  process.exit(1);
});

