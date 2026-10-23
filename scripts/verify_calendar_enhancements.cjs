/**
 * MASTERHRMS — CALENDAR RECIPIENT SELECTOR & BIRTHDAYS COMPREHENSIVE E2E VERIFICATION
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');
const jwt = require(path.join(process.cwd(), 'server/node_modules/jsonwebtoken'));
const { PrismaClient } = require(path.join(process.cwd(), 'server/node_modules/@prisma/client'));

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'master-hrms-jwt-super-secret-key-change-this-in-production';
const SCREENSHOT_DIR = path.resolve(__dirname, '../docs/Saas/screenshots/calendar-enhancements');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
}

function apiCall(pathName, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path: pathName,
      method,
      headers,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runEnhancementsVerification() {
  console.log('======================================================================');
  console.log('--- MASTERHRMS CALENDAR ENHANCEMENTS & SECURITY VERIFICATION SUITE ---');
  console.log('======================================================================\n');

  const tenantA = 'tenant-default-001';
  const tenantB = '02bf4113-b100-4711-af94-d81165e9a2e1';

  const userHR = await prisma.user.findFirst({ where: { email: 'hr@masterhrms.com' } });
  const userAlex = await prisma.user.findFirst({ where: { email: 'employee@masterhrms.com' } });

  if (!userHR || !userAlex) {
    throw new Error('Required test users (hr@masterhrms.com or employee@masterhrms.com) not found.');
  }

  const tokenHR = createToken({ userId: userHR.id, tenantId: tenantA, roles: ['hr_admin', 'hr'], email: userHR.email });
  const tokenAlex = createToken({ userId: userAlex.id, tenantId: tenantA, roles: ['employee'], email: userAlex.email });
  const tokenTenantB = createToken({ userId: 'user-b-adversary', tenantId: tenantB, roles: ['hr_admin'], email: 'b@adversary.com' });

  // Create disposable test employees for verified birthday testing
  console.log('[Setup] Creating disposable test employees for birthday testing...');
  const testEmpOct = await prisma.employee.create({
    data: {
      tenantId: tenantA,
      employeeCode: `EMP-BTEST-${Date.now()}`,
      firstName: 'Samantha',
      lastName: 'BirthdayStar',
      email: `samantha.bday.${Date.now()}@hrms.local`,
      dateOfBirth: new Date('1995-10-24T00:00:00.000Z'), // Oct 24
      status: 'active',
    }
  });

  const testEmpLeap = await prisma.employee.create({
    data: {
      tenantId: tenantA,
      employeeCode: `EMP-LEAP-${Date.now()}`,
      firstName: 'Leap',
      lastName: 'YearBaby',
      email: `leap.${Date.now()}@hrms.local`,
      dateOfBirth: new Date('2000-02-29T00:00:00.000Z'), // Feb 29
      status: 'active',
    }
  });

  const testEmpTenantB = await prisma.employee.create({
    data: {
      tenantId: tenantB,
      employeeCode: `EMP-ISO-${Date.now()}`,
      firstName: 'Isolated',
      lastName: 'TenantBEmployee',
      email: `isolated.${Date.now()}@tenantb.local`,
      dateOfBirth: new Date('1992-10-24T00:00:00.000Z'),
      status: 'active',
    }
  });

  console.log(`[Setup] Created Oct 24 employee (${testEmpOct.id}), Leap Year employee (${testEmpLeap.id}), Tenant B employee (${testEmpTenantB.id})\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--host-resolver-rules=MAP master.localhost 127.0.0.1']
  });

  const testResults = {
    memberSelectorRenders: false,
    memberSearchAndSelect: false,
    viewOnlyEventShared: false,
    viewOnlyPermissionsEnforced: false,
    editEventShared: false,
    editAllowedButDeleteBlocked: false,
    crossTenantSharingRejected: false,
    birthdayProjectionOct24: false,
    birthdayFeb29LeapYearPolicy: false,
    birthdayYearBoundaryDecJan: false,
    birthdayCategoryFilterToggle: false,
    birthdayCrossTenantIsolation: false,
    birthdayPrivacyNoDOBExposure: false,
    responsiveScreenshotsCaptured: false,
  };

  async function createAuthContext(token, user) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(({ token, user, tenantA }) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('hrms_auth_token', token);
      localStorage.setItem('tenant_id', tenantA);
      localStorage.setItem('hrms_user', JSON.stringify({
        id: user.id,
        userId: user.id,
        email: user.email,
        tenantId: tenantA,
        roles: token.includes('hr_admin') ? ['hr_admin', 'hr'] : ['employee'],
      }));
      document.cookie = `hrms_auth_token=${token}; path=/; max-age=86400`;
    }, { token, user, tenantA });
    return context;
  }

  let createdDisposableEventId = null;

  try {
    // =========================================================================
    // 1. TEST MEMBER SELECTOR & EVENT CREATION WITH VIEW-ONLY PERMISSION
    // =========================================================================
    console.log('--- TEST 1: Organization Member Selector in Create Modal ---');
    const hrContext = await createAuthContext(tokenHR, userHR);
    const hrPage = await hrContext.newPage();

    await hrPage.goto('http://master.localhost:3000/hr/calendar', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('  [+] Opened /hr/calendar');

    // Click "+ Create" dropdown button and select Schedule Event
    await hrPage.locator('button:has-text("Create")').first().click();
    await hrPage.waitForTimeout(400);
    await hrPage.locator('text=Schedule Event').or(hrPage.locator('text=New Event')).first().click();
    await hrPage.waitForSelector('div[role="dialog"]', { timeout: 10000 });
    console.log('  [+] Create modal opened');

    // Verify raw input is gone and combobox is present
    const rawInputCount = await hrPage.locator('input[placeholder="Recipient User ID"]').count();
    if (rawInputCount === 0) {
      console.log('  [+] Confirmed: Raw "Recipient User ID" text input is completely removed!');
      testResults.memberSelectorRenders = true;
    } else {
      console.error('  [-] FAILED: Raw User ID input still found!');
    }

    // Click member selector to open member dropdown
    const selectorButton = hrPage.locator('button[role="combobox"]:has-text("Select")').first();
    await selectorButton.click();
    await hrPage.waitForSelector('div[role="listbox"]', { timeout: 5000 });
    console.log('  [+] Member selector dropdown opened');

    // Search for Alex
    const searchInput = hrPage.locator('input[placeholder*="Search member"]').first();
    await searchInput.fill('Alex');
    await hrPage.waitForTimeout(500); // allow query update

    const alexOption = hrPage.locator('div[role="listbox"] button:has-text("Alex Morgan")').first();
    await alexOption.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  [+] Alex Morgan found in search results');

    await alexOption.click();
    await hrPage.waitForTimeout(300);

    // Verify Alex is now selected chip
    const selectedChip = hrPage.locator('div[role="combobox"]:has-text("Alex Morgan")').first();
    await selectedChip.waitFor({ state: 'visible', timeout: 3000 });
    console.log('  [+] Alex Morgan selected as sharing recipient');
    testResults.memberSearchAndSelect = true;

    // Fill Title
    const testTitle = `Quarterly Review - View Only Test - ${Date.now()}`;
    await hrPage.locator('label:has-text("Title") + input, input[placeholder*="meeting title"]').first().fill(testTitle);
    
    // Set permission to "View Only" (default)
    console.log('  [+] Submitting event creation with View Only share...');
    await hrPage.locator('button:has-text("Save Event")').first().click();
    await hrPage.waitForTimeout(2000);

    // Verify event in database
    const createdEvent = await prisma.calendarEvent.findFirst({
      where: { title: testTitle, tenantId: tenantA },
      orderBy: { createdAt: 'desc' }
    });

    if (createdEvent) {
      createdDisposableEventId = createdEvent.id;
      console.log(`  [+] Event persisted in database with ID: ${createdEvent.id}`);
      const desc = createdEvent.description || '';
      if (desc.includes(userAlex.id) && desc.includes('"permission":"view"')) {
        console.log('  [+] Verified structured share contains Alex Morgan userId with permission "view"!');
        testResults.viewOnlyEventShared = true;
      }
    }

    await hrContext.close();

    // =========================================================================
    // 2. VERIFY RECIPIENT ACCESS (VIEW-ONLY ENFORCEMENT)
    // =========================================================================
    console.log('\n--- TEST 2: Verifying Recipient View-Only Enforcement ---');
    const alexContext = await createAuthContext(tokenAlex, userAlex);
    const alexPage = await alexContext.newPage();

    await alexPage.goto('http://master.localhost:3000/apps/calendar', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('  [+] Alex opened /apps/calendar');

    // Confirm shared event appears for Alex
    const eventLocator = alexPage.locator(`text=${testTitle}`).first();
    await eventLocator.waitFor({ state: 'visible', timeout: 10000 });
    console.log(`  [+] Shared event "${testTitle}" is visible to Alex!`);

    // Click event to open details
    await eventLocator.click();
    await alexPage.waitForSelector('div[role="dialog"]', { timeout: 5000 });
    console.log('  [+] Event details modal opened');

    // Check that Edit and Delete buttons are absent
    const editBtnCount = await alexPage.locator('button:has-text("Edit")').count();
    const deleteBtnCount = await alexPage.locator('button:has-text("Delete")').count();
    console.log(`  [+] Edit buttons for view-only recipient: ${editBtnCount}, Delete buttons: ${deleteBtnCount}`);

    // Test API adversarial enforcement: Alex attempts PUT and DELETE
    const putRes = await apiCall(`/api/calendar/events/${createdDisposableEventId}`, 'PUT', { title: 'Hacked Title' }, tokenAlex);
    console.log(`  [+] Adversarial PUT status: ${putRes.status} (Expected 403)`);

    const delRes = await apiCall(`/api/calendar/events/${createdDisposableEventId}`, 'DELETE', null, tokenAlex);
    console.log(`  [+] Adversarial DELETE status: ${delRes.status} (Expected 403)`);

    if (editBtnCount === 0 && deleteBtnCount === 0 && putRes.status === 403 && delRes.status === 403) {
      console.log('  [+] View-only permissions strictly enforced both in UI and backend!');
      testResults.viewOnlyPermissionsEnforced = true;
    }

    await alexContext.close();

    // =========================================================================
    // 3. EDIT PERMISSION ALLOWED BUT DELETE BLOCKED
    // =========================================================================
    console.log('\n--- TEST 3: Verifying Can Edit Permission & Deletion Protection ---');
    // Share with Edit permission
    await apiCall(`/api/calendar/events/${createdDisposableEventId}/share`, 'POST', {
      recipientId: userAlex.id,
      permission: 'edit',
    }, tokenHR);

    // Alex attempts PUT now
    const editRes = await apiCall(`/api/calendar/events/${createdDisposableEventId}`, 'PUT', {
      title: `${testTitle} (Updated by Alex)`,
    }, tokenAlex);
    console.log(`  [+] Authorized PUT with "edit" permission status: ${editRes.status} (Expected 200)`);

    // Alex still cannot DELETE
    const delRes2 = await apiCall(`/api/calendar/events/${createdDisposableEventId}`, 'DELETE', null, tokenAlex);
    console.log(`  [+] Deletion attempt with "edit" permission status: ${delRes2.status} (Expected 403)`);

    if (editRes.status === 200 && delRes2.status === 403) {
      console.log('  [+] PASSED: Edit permission allows update, but deletion remains strictly protected for creator/admin only!');
      testResults.editEventShared = true;
      testResults.editAllowedButDeleteBlocked = true;
    }

    // =========================================================================
    // 4. CROSS-TENANT FORGED SHARING REJECTION
    // =========================================================================
    console.log('\n--- TEST 4: Cross-Tenant Sharing Security Verification ---');
    const forgedShareRes = await apiCall('/api/calendar/events', 'POST', {
      title: 'Forged Cross Tenant Share Event',
      startDate: '2026-10-23T10:00:00',
      endDate: '2026-10-23T11:00:00',
      sharedWith: [{ recipientId: 'user-b-adversary', permission: 'view' }]
    }, tokenHR);

    console.log(`  [+] Cross-tenant sharing response status: ${forgedShareRes.status}, code: ${forgedShareRes.data?.code}`);
    if (forgedShareRes.status === 400 && forgedShareRes.data?.code === 'CROSS_TENANT_SHARING_FORBIDDEN') {
      console.log('  [+] Cross-tenant recipient share request successfully rejected with HTTP 400 CROSS_TENANT_SHARING_FORBIDDEN!');
      testResults.crossTenantSharingRejected = true;
    }

    // =========================================================================
    // 5. BIRTHDAY PROJECTIONS (OCTOBER 24, LEAP YEAR, YEAR BOUNDARY)
    // =========================================================================
    console.log('\n--- TEST 5: Automatic Employee Birthday Projections ---');
    const bdayContext = await createAuthContext(tokenHR, userHR);
    const bdayPage = await bdayContext.newPage();

    // Fetch projected birthdays for 2026 via API
    const bdaysRes = await apiCall('/api/v1/hr/calendar/events?startDate=2026-01-01&endDate=2026-12-31', 'GET', null, tokenHR);
    const bdays = (Array.isArray(bdaysRes.data) ? bdaysRes.data : []).filter(e => e.category === 'birthday');
    console.log(`  [+] Total 2026 birthdays projected: ${bdays.length}`);

    // Verify Samantha BirthdayStar on Oct 24
    const octBday = bdays.find(b => b.title.includes('Samantha BirthdayStar'));
    if (octBday && octBday.startDate.startsWith('2026-10-24')) {
      console.log(`  [+] Verified Samantha BirthdayStar birthday projected on: ${octBday.startDate}`);
      testResults.birthdayProjectionOct24 = true;
    } else {
      console.error('  [-] FAILED to find Samantha BirthdayStar birthday on 2026-10-24');
    }

    // Verify Leap Year Baby policy (born Feb 29, in 2026 non-leap year -> Feb 28)
    const leapBday2026 = bdays.find(b => b.title.includes('Leap YearBaby'));
    if (leapBday2026 && leapBday2026.startDate.startsWith('2026-02-28')) {
      console.log(`  [+] Verified Leap Year Baby in 2026 (non-leap year) projected on: ${leapBday2026.startDate} (Feb 28)`);
      testResults.birthdayFeb29LeapYearPolicy = true;
    } else {
      console.error(`  [-] FAILED: Leap Year Baby date is ${leapBday2026?.startDate}`);
    }

    // Verify Year Boundary (Dec 15, 2025 to Jan 15, 2026 window)
    const boundaryRes = await apiCall('/api/v1/hr/calendar/events?startDate=2025-12-15&endDate=2026-01-15', 'GET', null, tokenHR);
    const boundaryBdays = (Array.isArray(boundaryRes.data) ? boundaryRes.data : []).filter(e => e.category === 'birthday');
    const janBday = boundaryBdays.find(b => b.startDate.startsWith('2026-01-01'));
    if (janBday) {
      console.log(`  [+] Year boundary test PASSED: Dec-Jan window correctly projected Jan 1, 2026 birthday (${janBday.title})`);
      testResults.birthdayYearBoundaryDecJan = true;
    }

    // Verify Cross-Tenant Isolation: Tenant B employee is NEVER projected in Tenant A
    const tenantBInTenantA = bdays.find(b => b.title.includes('Isolated TenantBEmployee'));
    if (!tenantBInTenantA) {
      console.log('  [+] Tenant isolation PASSED: Tenant B employee birthday is not present in Tenant A calendar');
      testResults.birthdayCrossTenantIsolation = true;
    }

    // Verify Privacy: No DOB or age exposed in response
    const hasExposedDOB = bdays.some(b => /19\d\d|200\d/.test(b.title) || /19\d\d|200\d/.test(b.description || ''));
    if (!hasExposedDOB) {
      console.log('  [+] Privacy PASSED: Birth years and employee ages are never exposed in title or description!');
      testResults.birthdayPrivacyNoDOBExposure = true;
    }

    // =========================================================================
    // 6. UI VERIFICATION: MONTH, WEEK, DAY, LIST, UPCOMING & CATEGORY TOGGLE
    // =========================================================================
    console.log('\n--- TEST 6: UI Calendar Views & Category Toggle ---');
    await bdayPage.goto('http://master.localhost:3000/hr/calendar', { waitUntil: 'networkidle', timeout: 30000 });
    await bdayPage.waitForTimeout(2000);

    // Verify Samantha's birthday appears in the calendar UI
    const bdayInUI = bdayPage.locator('text=Samantha BirthdayStar').first();
    const isBdayVisible = await bdayInUI.isVisible();
    console.log(`  [+] Birthday visible on October 2026 calendar grid: ${isBdayVisible}`);

    // Click Month pill
    await bdayPage.locator('button:has-text("Month")').first().click();
    await bdayPage.waitForTimeout(500);

    // Click Week pill
    await bdayPage.locator('button:has-text("Week")').first().click();
    await bdayPage.waitForTimeout(500);

    // Click Day pill
    await bdayPage.locator('button:has-text("Day")').first().click();
    await bdayPage.waitForTimeout(500);

    // Click List pill
    await bdayPage.locator('button:has-text("List")').first().click();
    await bdayPage.waitForTimeout(500);

    // Switch back to Month
    await bdayPage.locator('button:has-text("Month")').first().click();
    await bdayPage.waitForTimeout(500);

    // Test Category checkbox toggle for Birthdays
    const bdayCheckbox = bdayPage.locator('label:has-text("Birthdays") input[type="checkbox"]').first();
    if (await bdayCheckbox.isVisible()) {
      console.log('  [+] Birthdays checkbox found in sidebar. Unchecking...');
      await bdayCheckbox.click();
      await bdayPage.waitForTimeout(500);

      const bdayAfterUncheck = await bdayPage.locator('text=Samantha BirthdayStar').count();
      console.log(`  [+] Samantha birthday count after filter uncheck: ${bdayAfterUncheck} (Expected 0)`);

      // Re-check
      await bdayCheckbox.click();
      await bdayPage.waitForTimeout(500);
      const bdayAfterRecheck = await bdayPage.locator('text=Samantha BirthdayStar').count();
      console.log(`  [+] Samantha birthday count after filter re-check: ${bdayAfterRecheck} (Expected >= 1)`);

      if (bdayAfterUncheck === 0 && bdayAfterRecheck >= 1) {
        testResults.birthdayCategoryFilterToggle = true;
      }
    }

    // =========================================================================
    // 7. SCREENSHOT CAPTURES (DESKTOP & MOBILE)
    // =========================================================================
    console.log('\n--- TEST 7: Capturing Evidence Screenshots ---');
    const screenshotDesktopPath = path.join(SCREENSHOT_DIR, 'calendar_enhancements_desktop.png');
    await bdayPage.screenshot({ path: screenshotDesktopPath, fullPage: false });
    console.log(`  [+] Captured Desktop screenshot: ${screenshotDesktopPath}`);

    // Open Create modal to capture Member Selector in action
    await bdayPage.locator('button:has-text("Create")').first().click();
    await bdayPage.waitForTimeout(300);
    await bdayPage.locator('text=Schedule Event').or(bdayPage.locator('text=New Event')).first().click();
    await bdayPage.waitForSelector('div[role="dialog"]', { timeout: 8000 });
    const memberSelectorBtn = bdayPage.locator('button[role="combobox"]').first();
    await memberSelectorBtn.click();
    await bdayPage.waitForTimeout(500);
    const screenshotModalPath = path.join(SCREENSHOT_DIR, 'calendar_member_selector_modal.png');
    await bdayPage.screenshot({ path: screenshotModalPath, fullPage: false });
    console.log(`  [+] Captured Member Selector modal screenshot: ${screenshotModalPath}`);

    // Mobile viewport capture
    await bdayPage.setViewportSize({ width: 390, height: 844 });
    await bdayPage.goto('http://master.localhost:3000/hr/calendar', { waitUntil: 'networkidle', timeout: 30000 });
    await bdayPage.waitForTimeout(2000);
    const screenshotMobilePath = path.join(SCREENSHOT_DIR, 'calendar_enhancements_mobile.png');
    await bdayPage.screenshot({ path: screenshotMobilePath, fullPage: false });
    console.log(`  [+] Captured Mobile screenshot: ${screenshotMobilePath}`);

    testResults.responsiveScreenshotsCaptured = true;

    await bdayContext.close();

  } catch (err) {
    console.error('[-] Test suite error:', err);
  } finally {
    await browser.close();

    // Clean up disposable test data
    console.log('\n[Cleanup] Cleaning up disposable records...');
    try {
      if (createdDisposableEventId) {
        await prisma.calendarEvent.delete({ where: { id: createdDisposableEventId } });
      }
      await prisma.employee.deleteMany({
        where: { id: { in: [testEmpOct.id, testEmpLeap.id, testEmpTenantB.id] } }
      });
      console.log('  [+] Disposable records deleted cleanly.');
    } catch (cleanupErr) {
      console.warn('  [-] Cleanup warning:', cleanupErr.message);
    }
    await prisma.$disconnect();
  }

  console.log('\n======================================================================');
  console.log('--- TEST RESULTS SUMMARY ---');
  console.log('======================================================================');
  console.table(testResults);

  const allPassed = Object.values(testResults).every(v => v === true);
  console.log(allPassed ? '\n>>> ALL ENHANCEMENT TESTS PASSED 100%! <<<' : '\n>>> SOME TESTS FAILED <<<');
  return allPassed;
}

runEnhancementsVerification().then(success => {
  process.exit(success ? 0 : 1);
});
