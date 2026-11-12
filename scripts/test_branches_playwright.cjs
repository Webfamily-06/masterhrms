const { chromium } = require('playwright');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const envContent = fs.readFileSync(path.resolve(__dirname, '../server/.env'), 'utf-8');
const jwtMatch = envContent.match(/^JWT_SECRET=["']?(.*?)["']?$/m);
const jwtSecret = jwtMatch ? jwtMatch[1].trim() : 'master-hrms-jwt-super-secret-key-change-this-in-production';

(async () => {
  const tenantId = '02bf4113-b100-4711-af94-d81165e9a2e1';
  const userId = 'user-admin-001';
  const email = 'admin@masterhrms.com';

  const session = await prisma.deviceSession.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      tenantId,
      ipAddress: '127.0.0.1',
      userAgent: 'PlaywrightAudit/1.0',
      revoked: false,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      lastActiveAt: new Date(),
    },
  });

  const authToken = jwt.sign(
    {
      userId: userId,
      email: email,
      roles: ['super_admin', 'hr_admin', 'manager'],
      tenantId: tenantId,
      sessionId: session.id,
      permissions: ['*'],
      is_super_admin: true
    },
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
  console.log('Navigating to http://localhost:5173/hr/organization/branches...');
  await page.goto('http://localhost:5173/hr/organization/branches', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  console.log('Current URL after load:', page.url());

  // 1. Verify Export Dropdown
  const exportBtn = page.locator('button:has-text("Export")').first();
  const isExportBtnVisible = await exportBtn.isVisible();
  console.log('Export button visible:', isExportBtnVisible);

  await exportBtn.click();
  await page.waitForTimeout(500);

  const excelOption = page.locator('[role="menuitem"]:has-text("Export as Excel")');
  const pdfOption = page.locator('[role="menuitem"]:has-text("Export as PDF")');
  const isExcelVisible = await excelOption.isVisible();
  const isPdfVisible = await pdfOption.isVisible();
  console.log('Excel option visible in menu:', isExcelVisible);
  console.log('PDF option visible in menu:', isPdfVisible);

  // Verify icons inside dropdown options
  const excelIconImg = excelOption.locator('img[src="/excel.svg"]');
  const pdfIconImg = pdfOption.locator('img[src="/pdf.svg"]');
  console.log('Excel SVG img inside option:', (await excelIconImg.count()) > 0);
  console.log('PDF SVG img inside option:', (await pdfIconImg.count()) > 0);

  // Test genuine Excel download
  const [downloadExcel] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
    excelOption.click()
  ]);
  if (downloadExcel) {
    const excelFilename = downloadExcel.suggestedFilename();
    console.log('Excel download suggested filename:', excelFilename);
    const savePath = path.join(__dirname, 'test_export.xlsx');
    await downloadExcel.saveAs(savePath);
    const stat = fs.statSync(savePath);
    console.log('Excel downloaded file size:', stat.size, 'bytes');
  }

  // 2. Test Row Selection Checkbox
  const rowCheckboxes = page.locator('tbody tr input[type="checkbox"], tbody tr button[role="checkbox"]');
  const rowCheckboxCount = await rowCheckboxes.count();
  console.log('Row checkboxes found:', rowCheckboxCount);

  if (rowCheckboxCount > 0) {
    console.log('Clicking first row checkbox...');
    await rowCheckboxes.first().click();
    await page.waitForTimeout(600);

    const selectionBadge = page.locator('text="1 selected"');
    console.log('Selection badge "1 selected" visible:', await selectionBadge.isVisible());

    const activateBtn = page.locator('button:has-text("Activate")');
    const deactivateBtn = page.locator('button:has-text("Deactivate")');
    const deleteBtn = page.locator('button:has-text("Delete")');
    console.log('Bulk Activate button visible:', await activateBtn.isVisible());
    console.log('Bulk Deactivate button visible:', await deactivateBtn.isVisible());
    console.log('Bulk Delete button visible:', await deleteBtn.isVisible());

    // Click Clear
    const clearBtn = page.locator('button:has-text("Clear")');
    await clearBtn.click();
    await page.waitForTimeout(400);
    console.log('After clear, selection badge visible:', await selectionBadge.isVisible());
  }

  // 3. Test Header Select All Checkbox
  const headerCheckbox = page.locator('thead tr input[type="checkbox"], thead tr button[role="checkbox"]').first();
  console.log('Clicking header select all checkbox...');
  await headerCheckbox.click();
  await page.waitForTimeout(600);
  const selectCountText = await page.locator('span:has-text("selected")').innerText().catch(() => '');
  console.log('Selection after Select All header click:', selectCountText);

  // 4. Test StandardPagination
  const pagination = page.locator('text="Showing"');
  console.log('StandardPagination showing text visible:', await pagination.isVisible());

  await browser.close();
  await prisma.$disconnect();
  console.log('Branches Playwright Test Complete!');
})();
