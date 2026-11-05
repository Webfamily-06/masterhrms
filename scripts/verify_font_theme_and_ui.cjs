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

async function runAudit() {
  console.log('========================================================');
  console.log('Auditing Root Font, Root Theme & UI Refinements via Browser');
  console.log('========================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const baseUrl = 'http://localhost:3000';
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });

  await context.addInitScript(({ token, user }) => {
    localStorage.setItem('hrms_auth_token', token);
    localStorage.setItem('token', token);
    localStorage.setItem('hrms_user', JSON.stringify(user));
  }, { token: defaultToken, user: defaultUser });

  const page = await context.newPage();

  // Test Departments
  console.log('1. Navigating to /hr/organization/departments...');
  await page.goto(`${baseUrl}/hr/organization/departments`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Measure Root Font & Theme Properties
  const fontAndThemeReport = await page.evaluate(() => {
    const bodyStyle = window.getComputedStyle(document.body);
    const htmlStyle = window.getComputedStyle(document.documentElement);
    
    // Page Title
    const h1 = document.querySelector('h1, h2');
    const h1Style = h1 ? window.getComputedStyle(h1) : null;
    
    // Page Header icon container check
    const headerTitleParent = h1 ? h1.parentElement : null;
    const headerIcons = headerTitleParent ? headerTitleParent.querySelectorAll('svg') : [];

    // KPI Cards
    const kpiCards = Array.from(document.querySelectorAll('[data-slot="card"], .rounded-xl, .border.bg-card')).filter(el => {
      const text = el.textContent || '';
      return text.includes('Departments') || text.includes('Designations') || text.includes('Branches');
    });

    const firstKpiStyle = kpiCards[0] ? window.getComputedStyle(kpiCards[0]) : null;

    // Table Font
    const th = document.querySelector('th');
    const thStyle = th ? window.getComputedStyle(th) : null;
    const td = document.querySelector('td');
    const tdStyle = td ? window.getComputedStyle(td) : null;

    // Action buttons
    const deactBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('De-activate'));
    const deactBtnStyle = deactBtn ? window.getComputedStyle(deactBtn) : null;

    return {
      bodyFont: bodyStyle.fontFamily,
      bodyBg: bodyStyle.backgroundColor,
      bodyColor: bodyStyle.color,
      h1Font: h1Style ? h1Style.fontFamily : 'N/A',
      h1Size: h1Style ? h1Style.fontSize : 'N/A',
      h1Weight: h1Style ? h1Style.fontWeight : 'N/A',
      h1Text: h1 ? h1.textContent.trim() : 'N/A',
      headerIconsCount: headerIcons.length,
      kpiCount: kpiCards.length,
      firstKpiFont: firstKpiStyle ? firstKpiStyle.fontFamily : 'N/A',
      thFont: thStyle ? thStyle.fontFamily : 'N/A',
      tdFont: tdStyle ? tdStyle.fontFamily : 'N/A',
      deactBtnFont: deactBtnStyle ? deactBtnStyle.fontFamily : 'N/A',
      deactBtnVisible: !!deactBtn,
      archiveFound: document.body.innerText.includes('Archive')
    };
  });

  console.log('\n--- ROOT FONT & THEME AUDIT RESULTS ---');
  console.log('Body font-family:   ', fontAndThemeReport.bodyFont);
  console.log('Body background:    ', fontAndThemeReport.bodyBg);
  console.log('Body text color:    ', fontAndThemeReport.bodyColor);
  console.log('Page Title Text:    ', fontAndThemeReport.h1Text);
  console.log('Page Title Font:    ', fontAndThemeReport.h1Font);
  console.log('Page Title Size:    ', fontAndThemeReport.h1Size);
  console.log('Page Title Weight:  ', fontAndThemeReport.h1Weight);
  console.log('Header Icon Count:  ', fontAndThemeReport.headerIconsCount, '(0 expected - icon container removed)');
  console.log('Table TH Font:      ', fontAndThemeReport.thFont);
  console.log('Table TD Font:      ', fontAndThemeReport.tdFont);
  console.log('De-activate Action: ', fontAndThemeReport.deactBtnVisible ? 'YES (Present)' : 'NO');
  console.log('De-activate Font:   ', fontAndThemeReport.deactBtnFont);
  console.log('Archive Keyword:    ', fontAndThemeReport.archiveFound ? 'WARNING: Found "Archive"' : 'CLEAN: No "Archive" found');

  // Capture Desktop Screenshot
  await page.screenshot({ path: path.join(evidenceDir, 'departments_desktop.png'), fullPage: true });
  console.log('Saved: departments_desktop.png');

  // Test De-activate modal
  const deactBtn = await page.$('button:has-text("De-activate")');
  if (deactBtn) {
    await deactBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(evidenceDir, 'departments_deactivate_modal_desktop.png') });
    console.log('Saved: departments_deactivate_modal_desktop.png');
    const cancelBtn = await page.$('button:has-text("Cancel")');
    if (cancelBtn) await cancelBtn.click();
    await page.waitForTimeout(300);
  }

  // Tablet Viewport
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(evidenceDir, 'departments_tablet.png'), fullPage: true });
  console.log('Saved: departments_tablet.png');

  // Mobile Viewport
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(evidenceDir, 'departments_mobile.png'), fullPage: true });
  console.log('Saved: departments_mobile.png');

  // 2. Designations
  console.log('\n2. Testing /hr/organization/designations...');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseUrl}/hr/organization/designations`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(evidenceDir, 'designations_desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(evidenceDir, 'designations_tablet.png'), fullPage: true });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(evidenceDir, 'designations_mobile.png'), fullPage: true });
  console.log('Saved: designations (desktop, tablet, mobile)');

  // 3. Branches
  console.log('\n3. Testing /hr/organization/branches...');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseUrl}/hr/organization/branches`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(evidenceDir, 'branches_desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(evidenceDir, 'branches_tablet.png'), fullPage: true });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(evidenceDir, 'branches_mobile.png'), fullPage: true });
  console.log('Saved: branches (desktop, tablet, mobile)');

  await browser.close();
  console.log('\n========================================================');
  console.log('Audit Completed Successfully!');
  console.log('========================================================');
}

runAudit().catch(console.error);

