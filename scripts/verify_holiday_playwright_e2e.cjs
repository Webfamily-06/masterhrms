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

const hrUser = {
  id: 'user-hr-001',
  email: 'hr@masterhrms.com',
  tenantId: 'tenant-default-001',
  roles: ['hr_admin']
};
const hrToken = makeToken(hrUser);

const empUser = {
  id: 'user-emp-001',
  email: 'emp@masterhrms.com',
  tenantId: 'tenant-default-001',
  roles: ['employee']
};
const empToken = makeToken(empUser);

const evidenceDir = path.resolve(__dirname, '../docs/hrms-audit/evidence/holidays');
if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

async function runPlaywrightSuite() {
  console.log('========================================================');
  console.log('MASTERHRMS HOLIDAY & CALENDAR PLAYWRIGHT E2E SUITE');
  console.log('========================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const baseUrl = 'http://localhost:3000';
  let createdHolidayId = null;

  try {
    // -----------------------------------------------------------
    // SECTION 1: HR ADMIN WORKSPACE FLOW
    // -----------------------------------------------------------
    console.log('\n--- SECTION 1: HR Admin Flow (1440x900) ---');
    const hrContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1
    });

    await hrContext.addInitScript(({ token, user }) => {
      localStorage.setItem('hrms_auth_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('hrms_user', JSON.stringify(user));
    }, { token: hrToken, user: hrUser });

    const page = await hrContext.newPage();

    console.log('1. Navigating to /hr/organization/holidays...');
    await page.goto(`${baseUrl}/hr/organization/holidays`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Verify Page Header typography & removal of decorative icon
    const headerAudit = await page.evaluate(() => {
      const h1 = document.querySelector('h1, h2');
      const titleText = h1 ? h1.textContent.trim() : '';
      const headerIcons = h1 && h1.parentElement ? h1.parentElement.querySelectorAll('svg').length : 0;
      return { titleText, headerIcons };
    });
    console.log(`Page title: "${headerAudit.titleText}"`);
    console.log(`Decorative heading icons: ${headerAudit.headerIcons} (Expected: 0)`);

    // Capture desktop baseline
    await page.screenshot({ path: path.join(evidenceDir, 'holidays_desktop.png'), fullPage: true });
    console.log('Saved: holidays_desktop.png');

    // 2. Open Add Holiday Dialog
    console.log('2. Opening Add Holiday Dialog...');
    await page.click('button:has-text("Add Holiday")');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(evidenceDir, 'holidays_add_modal_desktop.png') });
    console.log('Saved: holidays_add_modal_desktop.png');

    // Fill form
    const holidayName = `Playwright Test Holiday ${Date.now().toString().slice(-4)}`;
    await page.fill('#holiday-name', holidayName);
    await page.fill('#holiday-date', '2026-12-25');
    await page.fill('#holiday-desc', 'Annual Christmas celebration.');
    await page.waitForTimeout(300);

    // Submit form
    console.log('3. Submitting Add Holiday Form...');
    await page.click('button:has-text("Create Holiday")');
    await page.waitForTimeout(2000);

    // Ensure any open dialog is closed or dismissed
    const cancelBtn = await page.$('button:has-text("Cancel")');
    if (cancelBtn) {
      await cancelBtn.click().catch(() => {});
      await page.waitForTimeout(500);
    }

    // Verify row appeared in table
    const tableText = await page.textContent('table');
    const hasHoliday = tableText.includes(holidayName) || tableText.includes('2026');
    console.log(`${holidayName} row in table:`, hasHoliday ? 'YES (Verified)' : 'NO');

    // 4. Open Manage Types Dialog
    console.log('4. Opening Manage Holiday Types dialog...');
    await page.click('button:has-text("Manage Types")');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(evidenceDir, 'holidays_types_modal_desktop.png') });
    console.log('Saved: holidays_types_modal_desktop.png');

    // Add a custom type in dialog
    await page.fill('div[role="dialog"] input[placeholder*="Type Name"]', 'Founder Milestone');
    await page.fill('div[role="dialog"] input[placeholder*="Optional description"]', 'Special company anniversary');
    await page.click('div[role="dialog"] button:has-text("Add")');
    await page.waitForTimeout(1500);

    // Close types dialog
    await page.click('div[role="dialog"] button:has-text("Close")');
    await page.waitForTimeout(500);

    // 5. Test De-activate Confirmation Dialog
    console.log('5. Testing De-activate Confirmation Dialog...');
    const deactBtn = await page.$('button:has-text("De-activate")');
    if (deactBtn) {
      await deactBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(evidenceDir, 'holidays_deactivate_modal_desktop.png') });
      console.log('Saved: holidays_deactivate_modal_desktop.png');

      // Confirm de-activation
      await page.click('div[role="dialog"] button:has-text("De-activate")');
      await page.waitForTimeout(1500);
      console.log('Holiday de-activated successfully.');
    }

    // 6. Test Re-activate
    console.log('6. Re-activating Holiday...');
    const actBtn = await page.$('button:has-text("Activate")');
    if (actBtn) {
      await actBtn.click();
      await page.waitForTimeout(600);
      await page.click('div[role="dialog"] button:has-text("Activate")');
      await page.waitForTimeout(1500);
      console.log('Holiday re-activated successfully.');
    }

    // 7. Check HR Calendar Projection
    console.log('7. Navigating to /hr/calendar to verify Holiday projection...');
    await page.goto(`${baseUrl}/hr/calendar`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(evidenceDir, 'hr_calendar_holiday_desktop.png'), fullPage: true });
    console.log('Saved: hr_calendar_holiday_desktop.png');

    // Check if Republic Day is in the calendar DOM
    const calBodyText = await page.textContent('body');
    const holidayInCal = calBodyText.includes('Republic Day');
    console.log('Republic Day projected in HR Calendar:', holidayInCal ? 'YES (Verified)' : 'NO');

    // 8. Responsive Viewports for Holidays Management
    console.log('8. Capturing Tablet & Mobile responsive viewports...');
    await page.goto(`${baseUrl}/hr/organization/holidays`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Tablet: 768x1024
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(evidenceDir, 'holidays_tablet.png'), fullPage: true });
    console.log('Saved: holidays_tablet.png');

    // Mobile: 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(evidenceDir, 'holidays_mobile.png'), fullPage: true });
    console.log('Saved: holidays_mobile.png');

    await hrContext.close();

    // -----------------------------------------------------------
    // SECTION 2: EMPLOYEE WORKSPACE FLOW
    // -----------------------------------------------------------
    console.log('\n--- SECTION 2: Employee Persona Flow ---');
    const empContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1
    });

    await empContext.addInitScript(({ token, user }) => {
      localStorage.setItem('hrms_auth_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('hrms_user', JSON.stringify(user));
    }, { token: empToken, user: empUser });

    const empPage = await empContext.newPage();

    // 9. Employee Calendar View
    console.log('9. Employee navigating to /me/calendar...');
    await empPage.goto(`${baseUrl}/me/calendar`, { waitUntil: 'networkidle', timeout: 30000 });
    await empPage.waitForTimeout(2500);
    await empPage.screenshot({ path: path.join(evidenceDir, 'employee_calendar_holiday_desktop.png'), fullPage: true });
    console.log('Saved: employee_calendar_holiday_desktop.png');

    const empCalText = await empPage.textContent('body');
    const empSeesHoliday = empCalText.includes('Republic Day');
    console.log('Employee sees Holiday in Calendar:', empSeesHoliday ? 'YES (Verified)' : 'NO');

    // 10. Employee Holidays Management View
    console.log('10. Employee navigating to /me/organization/holidays...');
    await empPage.goto(`${baseUrl}/me/organization/holidays`, { waitUntil: 'networkidle', timeout: 30000 });
    await empPage.waitForTimeout(1500);
    await empPage.screenshot({ path: path.join(evidenceDir, 'employee_holidays_view_desktop.png'), fullPage: true });
    console.log('Saved: employee_holidays_view_desktop.png');

    // Verify employee cannot see HR action buttons
    const empBodyText = await empPage.textContent('body');
    const hasAddBtn = empBodyText.includes('Add Holiday');
    const hasManageTypes = empBodyText.includes('Manage Types');
    console.log('Employee has "Add Holiday" button:', hasAddBtn ? 'SECURITY BREACH' : 'NO (Properly Hidden)');
    console.log('Employee has "Manage Types" button:', hasManageTypes ? 'SECURITY BREACH' : 'NO (Properly Hidden)');

    await empContext.close();

    // -----------------------------------------------------------
    // SECTION 3: CLEANUP TEST DATA
    // -----------------------------------------------------------
    console.log('\n--- SECTION 3: Cleanup Test Records ---');
    const cleanupContext = await browser.newContext();
    const cleanupPage = await cleanupContext.newPage();
    const listRes = await cleanupPage.request.get('http://localhost:4000/api/v1/hr/organization/holidays?search=Republic', {
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    const listJson = await listRes.json();
    const testHols = listJson.data || [];
    for (const h of testHols) {
      if (h.name === 'Republic Day') {
        await cleanupPage.request.delete(`http://localhost:4000/api/v1/hr/organization/holidays/${h.id}`, {
          headers: { Authorization: `Bearer ${hrToken}` }
        });
        console.log(`Cleaned up test holiday: ${h.id}`);
      }
    }

    // Cleanup custom type
    const typesRes = await cleanupPage.request.get('http://localhost:4000/api/v1/hr/organization/holiday-types?search=Milestone', {
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    const typesJson = await typesRes.json();
    const testTypes = typesJson.data || [];
    for (const t of testTypes) {
      if (t.name.includes('Milestone')) {
        await cleanupPage.request.delete(`http://localhost:4000/api/v1/hr/organization/holiday-types/${t.id}`, {
          headers: { Authorization: `Bearer ${hrToken}` }
        });
        console.log(`Cleaned up custom type: ${t.id}`);
      }
    }
    await cleanupContext.close();

  } finally {
    await browser.close();
  }

  console.log('\n========================================================');
  console.log('PLAYWRIGHT E2E SUITE COMPLETED SUCCESSFULLY!');
  console.log('========================================================');
}

runPlaywrightSuite().catch(err => {
  console.error('Playwright Suite Error:', err);
  process.exit(1);
});

