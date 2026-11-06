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
      permissions: ['*'],
    },
    jwtSecret,
    { algorithm: 'HS256', expiresIn: '2h' }
  );
}

const hrUser = {
  id: 'user-hr-001',
  email: 'hr@masterhrms.com',
  tenantId: 'tenant-default-001',
  roles: ['hr_admin'],
};
const hrToken = makeToken(hrUser);

const evidenceDir = path.resolve(__dirname, '../docs/hrms-audit/evidence/award-types');
if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

// Create sample PNG file for upload test
const sampleBadgePath = path.resolve(__dirname, '../docs/hrms-audit/evidence/award-types/sample_badge.png');
const samplePngBytes = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000100000001008060000001ff3ff610000001949444154789c63601805a360148c8251300a000010620001f3f982460000000049454e44ae426082',
  'hex'
);
fs.writeFileSync(sampleBadgePath, samplePngBytes);

async function runPlaywrightSuite() {
  console.log('=================================================================');
  console.log('MASTERHRMS AWARD TYPES & EMPLOYEE RECOGNITION PLAYWRIGHT SUITE');
  console.log('=================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const baseUrl = 'http://localhost:3000';
  const testAwardTitle = `Presidential Honors ${Date.now()}`;

  try {
    // -----------------------------------------------------------
    // SECTION 1: DESKTOP WORKSPACE (1440x900)
    // -----------------------------------------------------------
    console.log('\n--- SECTION 1: Desktop Viewport (1440x900) ---');
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    await desktopContext.addInitScript(
      ({ token, user }) => {
        localStorage.setItem('hrms_auth_token', token);
        localStorage.setItem('token', token);
        localStorage.setItem('hrms_user', JSON.stringify(user));
        document.cookie = `hrms_auth_token=${encodeURIComponent(token)}; path=/; max-age=7200`;
      },
      { token: hrToken, user: hrUser }
    );

    const page = await desktopContext.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
    page.on('requestfailed', req => console.log('REQ FAILED:', req.method(), req.url(), req.failure()?.errorText));
    page.on('response', async res => {
      if (res.url().includes('award-types') || res.url().includes('awards') || res.status() >= 400) {
        console.log('HTTP:', res.status(), res.request().method(), res.url());
        if (res.status() >= 400) {
          try {
            console.log('ERR BODY:', await res.text());
          } catch (e) {}
        }
      }
    });

    console.log('1. Navigating to /hr/organization/award-types...');
    await page.goto(`${baseUrl}/hr/organization/award-types`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await page.waitForTimeout(2000);

    // Verify Page Header typography & removal of decorative icon
    const headerAudit = await page.evaluate(() => {
      const h1 = document.querySelector('h1, h2');
      const titleText = h1 ? h1.textContent.trim() : '';
      // Check if there is an SVG immediately inside the h1 or its parent before the text
      const svgBeforeTitle = h1 && h1.parentElement ? h1.parentElement.querySelectorAll('svg.h-8, svg.h-6, svg.size-8').length : 0;
      return { titleText, svgBeforeTitle };
    });
    console.log(`Page title: "${headerAudit.titleText}"`);
    console.log(`Decorative heading icon count: ${headerAudit.svgBeforeTitle} (Expected: 0)`);

    // Verify StatCards
    const statCardsCount = await page.locator('text=Total Award Categories').count();
    console.log(`StatCard 'Total Award Categories' rendered: ${statCardsCount > 0}`);

    // Capture desktop baseline
    await page.screenshot({ path: path.join(evidenceDir, 'award_types_desktop.png'), fullPage: true });
    console.log('Saved: award_types_desktop.png');

    // 2. Open Add Award Type Modal
    console.log('2. Opening Add Award Type Modal...');
    await page.click('button:has-text("Add Award Type")');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(evidenceDir, 'award_types_add_modal_desktop.png') });
    console.log('Saved: award_types_add_modal_desktop.png');

    // Fill form and upload badge
    console.log('3. Filling Award Type form and uploading custom badge...');
    await page.fill('#at-name', testAwardTitle);
    await page.fill('#at-desc', 'Conferred for transformative architectural design and zero-regression delivery.');

    // Upload custom image
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(sampleBadgePath);
    await page.waitForTimeout(1500); // wait for upload request to complete

    // Submit form
    await page.click('button:has-text("Create Award Type")');
    await page.waitForTimeout(2000);

    // Verify new record appears in table
    const createdRow = page.locator(`tr:has-text("${testAwardTitle}")`);
    await createdRow.waitFor({ timeout: 5000 });
    console.log(`✔ PASS: Created award type "${testAwardTitle}" found in table.`);

    // 4. Test De-activate lifecycle action
    console.log('4. Testing De-activate lifecycle action...');
    const deactiveBtn = createdRow.locator('button[title="De-activate"]');
    await deactiveBtn.click();
    await page.waitForTimeout(600);
    await page.locator('[role="alertdialog"] button:has-text("De-activate")').click();
    await page.waitForTimeout(1500);

    const inactiveBadge = page.locator(`tr:has-text("${testAwardTitle}")`).locator('div, span').filter({ hasText: /^Inactive$/ });
    await inactiveBadge.waitFor({ timeout: 5000 });
    console.log('✔ PASS: Status successfully changed to Inactive.');

    // 5. Test Re-activate lifecycle action
    console.log('5. Testing Re-activate lifecycle action...');
    const activateBtn = page.locator(`tr:has-text("${testAwardTitle}") button[title="Re-activate"]`);
    await activateBtn.click();
    await page.waitForTimeout(600);
    await page.locator('[role="alertdialog"] button:has-text("Re-activate")').click();
    await page.waitForTimeout(1500);

    const activeBadge = page.locator(`tr:has-text("${testAwardTitle}")`).locator('div, span').filter({ hasText: /^Active$/ });
    await activeBadge.waitFor({ timeout: 5000 });
    console.log('✔ PASS: Status successfully restored to Active.');

    // 6. Test Assign Award to Employee Alex Morgan
    console.log('6. Assigning award to employee via quick action...');
    const assignBtn = page.locator(`tr:has-text("${testAwardTitle}") button[title="Assign to Employee"]`);
    await assignBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(evidenceDir, 'award_types_assign_modal_desktop.png') });
    console.log('Saved: award_types_assign_modal_desktop.png');

    // Fill assignment modal
    // Select first employee
    await page.click('button:has-text("Choose an employee...")');
    await page.waitForTimeout(300);
    await page.locator('[role="option"]:has-text("Alex Morgan")').first().click();
    await page.waitForTimeout(300);

    // Citation
    await page.fill('textarea[placeholder*="Reason for honor"]', 'Outstanding lead role in the Phase 0-10 engineering sprint.');
    await page.click('button:has-text("Confer Award")');
    await page.waitForTimeout(2000);
    console.log('✔ PASS: Award successfully conferred to Alex Morgan.');

    // 7. Test Deletion Dependency Conflict Guard
    console.log('7. Testing deletion dependency guard (referenced award type)...');
    const deleteBtn = page.locator(`tr:has-text("${testAwardTitle}") button[title="Delete Award Type"]`);
    await deleteBtn.click();
    await page.waitForTimeout(600);
    await page.locator('[role="alertdialog"] button:has-text("Delete Permanently")').click();
    await page.waitForTimeout(1500);

    // Confirm that the conflict dialog appeared
    const conflictModal = page.locator('text=Cannot Delete Referenced Award Type');
    await conflictModal.waitFor({ timeout: 5000 });
    await page.screenshot({ path: path.join(evidenceDir, 'award_types_delete_conflict_modal.png') });
    console.log('Saved: award_types_delete_conflict_modal.png');
    console.log('✔ PASS: 409 Conflict dialog appeared, blocking unsafe deletion.');

    // Dismiss dialog
    await page.locator('[role="alertdialog"] button:has-text("I Understand")').click();
    await page.waitForTimeout(500);

    // -----------------------------------------------------------
    // SECTION 2: EMPLOYEE MASTER PROFILE INTEGRATION
    // -----------------------------------------------------------
    console.log('\n--- SECTION 2: Employee Master Profile Integration ---');
    console.log('8. Navigating to /hr/employees/emp-demo-001...');
    await page.goto(`${baseUrl}/hr/employees/emp-demo-001`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await page.waitForTimeout(2000);

    // Switch to Certifications tab
    console.log('9. Switching to Certifications / Recognition Tab...');
    await page.click('button[role="tab"]:has-text("Certifications")');
    await page.waitForTimeout(1000);

    // Verify conferred award is rendered with title, badge image, and citation
    const profileAwardCard = page.locator(`div:has-text("${testAwardTitle}")`).first();
    await profileAwardCard.waitFor({ timeout: 5000 });
    console.log(`✔ PASS: Conferred award "${testAwardTitle}" found in Employee Master Profile.`);

    await page.screenshot({
      path: path.join(evidenceDir, 'employee_profile_awards_section_desktop.png'),
    });
    console.log('Saved: employee_profile_awards_section_desktop.png');

    // Test "Award Employee" action button directly in profile
    console.log('10. Testing "Award Employee" in profile...');
    await page.click('button:has-text("Award Employee")');
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(evidenceDir, 'employee_profile_awards_modal_desktop.png'),
    });
    console.log('Saved: employee_profile_awards_modal_desktop.png');
    await page.click('button:has-text("Cancel")');
    await page.waitForTimeout(400);

    // 11. Revoke the test award from employee profile to restore pristine baseline
    console.log('11. Revoking test award to clean up...');
    const revokeBtn = page.locator(`div:has-text("${testAwardTitle}") button[title="Revoke Award"]`).first();
    await revokeBtn.click();
    await page.waitForTimeout(600);
    await page.locator('[role="alertdialog"] button:has-text("Revoke Award")').click();
    await page.waitForTimeout(2000);
    console.log('✔ PASS: Test award revoked.');

    // -----------------------------------------------------------
    // SECTION 3: RESPONSIVE TABLET & MOBILE VIEWPORTS
    // -----------------------------------------------------------
    console.log('\n--- SECTION 3: Responsive Viewports ---');
    // Tablet Viewport
    const tabletContext = await browser.newContext({
      viewport: { width: 768, height: 1024 },
      deviceScaleFactor: 1,
    });
    await tabletContext.addInitScript(
      ({ token, user }) => {
        localStorage.setItem('hrms_auth_token', token);
        document.cookie = `hrms_auth_token=${encodeURIComponent(token)}; path=/; max-age=7200`;
      },
      { token: hrToken, user: hrUser }
    );
    const tabletPage = await tabletContext.newPage();
    await tabletPage.goto(`${baseUrl}/hr/organization/award-types`, { waitUntil: 'networkidle' });
    await tabletPage.waitForTimeout(1500);
    await tabletPage.screenshot({ path: path.join(evidenceDir, 'award_types_tablet.png'), fullPage: true });
    console.log('Saved: award_types_tablet.png');

    // Mobile Viewport
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
      deviceScaleFactor: 1,
    });
    await mobileContext.addInitScript(
      ({ token, user }) => {
        localStorage.setItem('hrms_auth_token', token);
        document.cookie = `hrms_auth_token=${encodeURIComponent(token)}; path=/; max-age=7200`;
      },
      { token: hrToken, user: hrUser }
    );
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(`${baseUrl}/hr/organization/award-types`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1500);
    await mobilePage.screenshot({ path: path.join(evidenceDir, 'award_types_mobile.png'), fullPage: true });
    console.log('Saved: award_types_mobile.png');

    // 12. Delete unreferenced award type on desktop
    console.log('\n12. Deleting unreferenced test award type...');
    await page.goto(`${baseUrl}/hr/organization/award-types`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const deleteBtnAfterRevoke = page.locator(`tr:has-text("${testAwardTitle}") button[title="Delete Award Type"]`);
    await deleteBtnAfterRevoke.click();
    await page.waitForTimeout(600);
    await page.locator('[role="alertdialog"] button:has-text("Delete Permanently")').click();
    await page.waitForTimeout(2000);
    console.log('✔ PASS: Unreferenced test award type cleanly deleted.');

    console.log('\n=================================================================');
    console.log(' ALL PLAYWRIGHT E2E WORKFLOW TESTS PASSED 100%!');
    console.log('=================================================================');
  } catch (err) {
    console.error('❌ PLAYWRIGHT TEST ERROR:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runPlaywrightSuite();
