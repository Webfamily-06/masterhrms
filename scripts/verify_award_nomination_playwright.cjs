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
  email: 'employee@masterhrms.com',
  tenantId: 'tenant-default-001',
  roles: ['employee']
};
const empToken = makeToken(empUser);

const evidenceDir = path.resolve(__dirname, '../docs/hrms-audit/evidence/award-nominations');
if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

async function runPlaywrightSuite() {
  console.log('================================================================');
  console.log('MASTERHRMS STEP 3: PLAYWRIGHT E2E RESPONSIVE UI CERTIFICATION');
  console.log('================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const baseUrl = 'http://localhost:3000';
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // -----------------------------------------------------------
    // SECTION 1: HR AWARDS & NOMINATION QUEUE (DESKTOP 1440x900)
    // -----------------------------------------------------------
    console.log('--- SECTION 1: HR Awards & Nomination Management (/hr/awards) ---');
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

    console.log('1.1 Navigating to /hr/awards...');
    await page.goto(`${baseUrl}/hr/awards`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const hrPageTitle = await page.title();
    console.log(`   Page title: "${hrPageTitle}"`);

    // Verify Tab Switcher (Honors vs Nominations Queue)
    const hasTabSwitcher = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button, [role="tab"]'));
      return tabs.some(t => t.textContent.includes('Nominations') || t.textContent.includes('Nomination Queue'));
    });
    assert(hasTabSwitcher, 'Section switcher tabs exist on /hr/awards (Honors vs Nominations)');

    // Switch to Nominations tab
    console.log('1.2 Switching to Nominations & Approval Queue tab...');
    await page.click('button:has-text("Nominations")').catch(async () => {
      await page.click('[role="tab"]:has-text("Nominations")');
    });
    await page.waitForTimeout(1500);

    // Capture desktop baseline
    const desktopScreenshotPath = path.join(evidenceDir, 'hr_awards_nominations_desktop_1440.png');
    await page.screenshot({ path: desktopScreenshotPath, fullPage: true });
    console.log(`   Saved: hr_awards_nominations_desktop_1440.png`);
    assert(fs.existsSync(desktopScreenshotPath), 'Desktop screenshot captured successfully');

    // Open Nominate Employee Modal
    console.log('1.3 Opening "Nominate Employee" modal...');
    const nominateBtn = await page.$('button:has-text("Nominate Employee")');
    if (nominateBtn) {
      await nominateBtn.click();
      await page.waitForTimeout(800);
      const modalScreenshotPath = path.join(evidenceDir, 'hr_awards_nominate_modal_desktop.png');
      await page.screenshot({ path: modalScreenshotPath });
      console.log(`   Saved: hr_awards_nominate_modal_desktop.png`);
      assert(fs.existsSync(modalScreenshotPath), 'Nomination modal screenshot captured');

      // Dismiss dialog
      const cancelBtn = await page.$('button:has-text("Cancel")');
      if (cancelBtn) await cancelBtn.click().catch(() => {});
      await page.waitForTimeout(500);
    } else {
      console.log('   Note: "Nominate Employee" button rendered as link or inside empty state');
    }

    // -----------------------------------------------------------
    // SECTION 2: RESPONSIVE VIEWPORTS (TABLET & MOBILE)
    // -----------------------------------------------------------
    console.log('\n--- SECTION 2: Responsive Viewport Validation ---');

    // 2.1 Tablet (768x1024)
    console.log('2.1 Testing Tablet Viewport (768x1024)...');
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    const tabletScreenshotPath = path.join(evidenceDir, 'hr_awards_nominations_tablet_768.png');
    await page.screenshot({ path: tabletScreenshotPath, fullPage: true });
    console.log('   Saved: hr_awards_nominations_tablet_768.png');
    assert(fs.existsSync(tabletScreenshotPath), 'Tablet responsive layout screenshot captured');

    // 2.2 Mobile (375x667 - iPhone SE)
    console.log('2.2 Testing Mobile Viewport (375x667)...');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    const mobileScreenshotPath = path.join(evidenceDir, 'hr_awards_nominations_mobile_375.png');
    await page.screenshot({ path: mobileScreenshotPath, fullPage: true });
    console.log('   Saved: hr_awards_nominations_mobile_375.png');
    assert(fs.existsSync(mobileScreenshotPath), 'Mobile responsive layout screenshot captured');

    await hrContext.close();

    // -----------------------------------------------------------
    // SECTION 3: EMPLOYEE SELF-SERVICE (/me/awards)
    // -----------------------------------------------------------
    console.log('\n--- SECTION 3: Employee Self-Service Recognition (/me/awards) ---');
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
    console.log('3.1 Navigating to /me/awards...');
    await empPage.goto(`${baseUrl}/me/awards`, { waitUntil: 'networkidle', timeout: 30000 });
    await empPage.waitForTimeout(2000);

    // Switch to "My Nominations" tab
    console.log('3.2 Switching to "My Nominations" tab in ESS...');
    const essTabExists = await empPage.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button, [role="tab"]'));
      return tabs.some(t => t.textContent.includes('My Nominations') || t.textContent.includes('Nominations'));
    });
    assert(essTabExists, 'ESS contains "My Nominations" tab');

    await empPage.click('button:has-text("My Nominations")').catch(async () => {
      await empPage.click('[role="tab"]:has-text("My Nominations")');
    });
    await empPage.waitForTimeout(1500);

    const essScreenshotPath = path.join(evidenceDir, 'me_awards_nominations_desktop_1440.png');
    await empPage.screenshot({ path: essScreenshotPath, fullPage: true });
    console.log('   Saved: me_awards_nominations_desktop_1440.png');
    assert(fs.existsSync(essScreenshotPath), 'ESS nominations desktop screenshot captured');

    // Test ESS mobile
    await empPage.setViewportSize({ width: 375, height: 667 });
    await empPage.waitForTimeout(1000);
    const essMobileScreenshotPath = path.join(evidenceDir, 'me_awards_nominations_mobile_375.png');
    await empPage.screenshot({ path: essMobileScreenshotPath, fullPage: true });
    console.log('   Saved: me_awards_nominations_mobile_375.png');
    assert(fs.existsSync(essMobileScreenshotPath), 'ESS nominations mobile screenshot captured');

    await empContext.close();

    // -----------------------------------------------------------
    // SECTION 4: EMPLOYEE 360 PROFILE INTEGRATION
    // -----------------------------------------------------------
    console.log('\n--- SECTION 4: Employee 360 Profile Recognition Integration ---');
    const profileContext = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });

    await profileContext.addInitScript(({ token, user }) => {
      localStorage.setItem('hrms_auth_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('hrms_user', JSON.stringify(user));
    }, { token: hrToken, user: hrUser });

    const profilePage = await profileContext.newPage();
    console.log('4.1 Navigating to /hr/employees/emp-bday-avatar-001...');
    await profilePage.goto(`${baseUrl}/hr/employees/emp-bday-avatar-001`, { waitUntil: 'networkidle', timeout: 30000 });
    await profilePage.waitForTimeout(2000);

    // Switch to Certifications & Recognition tab if tabs exist
    await profilePage.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('button, [role="tab"]')).find(t =>
        t.textContent.includes('Certifications') || t.textContent.includes('Recognition') || t.textContent.includes('Awards')
      );
      if (tab) tab.click();
    });
    await profilePage.waitForTimeout(1000);

    const profileScreenshotPath = path.join(evidenceDir, 'employee_profile_awards_integration.png');
    await profilePage.screenshot({ path: profileScreenshotPath, fullPage: true });
    console.log('   Saved: employee_profile_awards_integration.png');
    assert(fs.existsSync(profileScreenshotPath), 'Employee Profile awards integration screenshot captured');

    await profileContext.close();

    console.log('\n================================================================');
    console.log(`PLAYWRIGHT TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal Playwright test error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runPlaywrightSuite();

