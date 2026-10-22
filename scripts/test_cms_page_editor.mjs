import { chromium } from 'playwright';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const jwt = require('../server/node_modules/jsonwebtoken');

async function runTestSuite() {
  console.log('================================================================');
  console.log(' MASTERHRMS — Playwright Dynamic CMS Page & HTML Editor Test');
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true });

  const superToken = jwt.sign(
    {
      userId: '0c99980d-69c9-42fb-9d68-7df14554576c',
      email: 'super-admin@masterhrms.internal',
      roles: ['super_admin'],
    },
    process.env.JWT_SECRET || 'master-hrms-jwt-super-secret-key-change-this-in-production',
    { expiresIn: '2h' }
  );

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  // Inject Super Admin credentials into localStorage and cookies before any page loads
  await context.addInitScript(({ token, user }) => {
    localStorage.setItem('hrms_auth_token', token);
    localStorage.setItem('auth_token', token);
    localStorage.setItem('token', token);
    localStorage.setItem('hrms_user', JSON.stringify(user));
    localStorage.setItem('active_portal', 'super_admin');
  }, {
    token: superToken,
    user: {
      id: '0c99980d-69c9-42fb-9d68-7df14554576c',
      email: 'super-admin@masterhrms.internal',
      roles: ['super_admin'],
      isSuperAdmin: true,
      workspaceStatus: 'ACTIVE',
    }
  });

  await context.addCookies([
    {
      name: 'hrms_auth_token',
      value: superToken,
      domain: 'localhost',
      path: '/',
    }
  ]);

  const page = await context.newPage();

  const testReport = {
    test1_listing: false,
    test2_persistent_id: false,
    test3_dedicated_route: false,
    test4_editor_modes: false,
    test5_html_source_editing: false,
    test6_xss_sandbox_isolation: false,
    test7_persistence_save_reload: false,
    test8_concurrency_conflict: false,
    test9_create_new_page: false,
    test10_public_route_rendering: false,
  };

  try {
    // -------------------------------------------------------------
    // TEST 1: CMS Page Listing on /super/cms
    // -------------------------------------------------------------
    console.log('--> TEST 1: Verifying Dynamic CMS Page Listing at /super/cms...');
    await page.goto('http://localhost:3000/super/cms', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const headingText = await page.textContent('h1');
    console.log('    Header Text:', headingText);

    // Verify table has rows and dynamic count
    const tableRows = await page.$$('table tbody tr');
    console.log(`    Loaded table rows in listing: ${tableRows.length}`);

    if (tableRows.length > 0) {
      testReport.test1_listing = true;
      console.log('    [PASS] Listing loaded dynamically from authoritative database.');
    } else {
      console.error('    [FAIL] No table rows found in listing.');
    }

    // -------------------------------------------------------------
    // TEST 2: Persistent ID Verification & Copy Action
    // -------------------------------------------------------------
    console.log('\n--> TEST 2: Verifying Persistent IDs and Copy Action...');
    const firstRowIdButton = await page.$('table tbody tr:first-child button[title="Copy Persistent ID"]');
    const firstRowIdSpan = await page.$('table tbody tr:first-child td:nth-child(2) span');
    let capturedId = '';
    if (firstRowIdSpan) {
      capturedId = (await firstRowIdSpan.getAttribute('title')) || (await firstRowIdSpan.textContent()) || '';
    }
    console.log('    First page persistent ID:', capturedId);

    if (capturedId && capturedId.length > 5) {
      testReport.test2_persistent_id = true;
      console.log('    [PASS] Page has a valid persistent ID.');
    } else {
      console.error('    [FAIL] Persistent ID missing or invalid.');
    }

    // -------------------------------------------------------------
    // TEST 3: Edit Action Opens Dedicated Editor by ID (/super/cms/[id]/edit)
    // -------------------------------------------------------------
    console.log('\n--> TEST 3: Verifying Edit Action Navigates to /super/cms/[id]/edit...');
    const editBtn = await page.$('table tbody tr:first-child button:has-text("Edit")');
    if (editBtn) {
      await editBtn.click();
      await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      console.log('    Navigated to URL:', currentUrl);

      if (currentUrl.includes('/super/cms/') && currentUrl.endsWith('/edit')) {
        testReport.test3_dedicated_route = true;
        console.log('    [PASS] Successfully opened dedicated editor route by persistent ID.');
      } else {
        console.error('    [FAIL] URL did not match /super/cms/[id]/edit:', currentUrl);
      }
    }

    // -------------------------------------------------------------
    // TEST 4: Editor Modes Toggle (Visual, HTML/Source, Split, Preview)
    // -------------------------------------------------------------
    console.log('\n--> TEST 4: Verifying Editor Modes (Visual, HTML/Source, Split View, Live Preview)...');
    
    // Check mode buttons
    const visualBtn = await page.$('button:has-text("Visual Editor")');
    const sourceBtn = await page.$('button:has-text("HTML / Source")');
    const splitBtn = await page.$('button:has-text("Split View")');
    const liveBtn = await page.$('button:has-text("Live Preview")');

    if (visualBtn && sourceBtn && splitBtn && liveBtn) {
      console.log('    Found all 4 editor mode buttons. Testing mode transitions...');
      
      // Click HTML / Source
      await sourceBtn.click();
      await page.waitForTimeout(500);
      const isSourceVisible = await page.isVisible('textarea[placeholder*="HTML"]');

      // Click Split View
      await splitBtn.click();
      await page.waitForTimeout(500);
      const isSplitIframeVisible = await page.isVisible('iframe[title="Live Sandboxed Preview"]');

      // Click Live Preview
      await liveBtn.click();
      await page.waitForTimeout(500);
      const isLiveIframeVisible = await page.isVisible('iframe[title="Full Live Preview"]');

      // Click back to Split View
      await splitBtn.click();
      await page.waitForTimeout(500);

      if (isSourceVisible && isSplitIframeVisible && isLiveIframeVisible) {
        testReport.test4_editor_modes = true;
        console.log('    [PASS] All 4 editor modes switch smoothly and render expected controls.');
      } else {
        console.error('    [FAIL] Mode transition element visibility failure:', {
          isSourceVisible,
          isSplitIframeVisible,
          isLiveIframeVisible,
        });
      }
    }

    // -------------------------------------------------------------
    // TEST 5: HTML Source Editing & Live Preview Sync
    // -------------------------------------------------------------
    console.log('\n--> TEST 5: Testing HTML Source Editing and Live Sandboxed Preview Sync...');
    const sourceTextarea = await page.$('textarea[placeholder*="HTML"]');
    if (sourceTextarea) {
      const testHtmlPayload = `
        <section class="test-custom-section">
          <h1 id="test-hero-title">Automated Enterprise HR Suite 2026</h1>
          <p class="lead"><strong>Engineered</strong> for multi-tenant scalability and biometric automation.</p>
          <ul class="feature-list">
            <li>Zero-latency attendance sync</li>
            <li>Automated statutory deductions</li>
          </ul>
          <a href="/pricing" class="btn btn-primary">Explore Packages</a>
        </section>
      `;

      await sourceTextarea.fill(testHtmlPayload);
      await page.waitForTimeout(1000);

      // Inspect sandboxed iframe content
      const iframeElement = await page.$('iframe[title="Live Sandboxed Preview"]');
      if (iframeElement) {
        const frame = await iframeElement.contentFrame();
        if (frame) {
          const frameH1 = await frame.textContent('#test-hero-title');
          const frameStrong = await frame.textContent('strong');
          console.log('    Rendered in sandboxed iframe -> H1:', frameH1, '| strong:', frameStrong);

          if (frameH1?.includes('Automated Enterprise HR Suite 2026') && frameStrong?.includes('Engineered')) {
            testReport.test5_html_source_editing = true;
            console.log('    [PASS] HTML source edit synchronized immediately to sandboxed iframe.');
          }
        }
      }
    }

    // -------------------------------------------------------------
    // TEST 6: XSS Script Neutralization in Sandboxed Iframe
    // -------------------------------------------------------------
    console.log('\n--> TEST 6: Verifying XSS Script Neutralization and DOM Isolation...');
    if (sourceTextarea) {
      const maliciousPayload = `
        <h2>Safe Heading</h2>
        <script>window.__XSS_TRIGGERED = true; alert('xss');</script>
        <img src="invalid-image" onerror="window.__XSS_IMG_TRIGGERED = true;" />
        <p>Verified safe content.</p>
      `;
      await sourceTextarea.fill(maliciousPayload);
      await page.waitForTimeout(1000);

      // Check if main window DOM was contaminated
      const parentContaminated = await page.evaluate(() => Boolean(window.__XSS_TRIGGERED || window.__XSS_IMG_TRIGGERED));

      // Check iframe attributes
      const iframeAttrs = await page.$eval('iframe[title="Live Sandboxed Preview"]', el => ({
        sandbox: el.getAttribute('sandbox'),
        srcDoc: el.getAttribute('srcdoc')?.includes('<script>') || false,
      }));

      console.log('    Parent DOM contaminated:', !!parentContaminated);
      console.log('    Iframe sandbox attribute:', iframeAttrs.sandbox);
      console.log('    Raw script in iframe srcdoc:', iframeAttrs.srcDoc);

      if (!parentContaminated && iframeAttrs.sandbox && !iframeAttrs.srcDoc) {
        testReport.test6_xss_sandbox_isolation = true;
        console.log('    [PASS] XSS payload successfully neutralized and isolated.');
      } else {
        console.error('    [FAIL] XSS sanitization or sandbox protection check failed.');
      }
    }

    // -------------------------------------------------------------
    // TEST 7: Persistence — Save and Reload Verification
    // -------------------------------------------------------------
    console.log('\n--> TEST 7: Testing Full Save and Reload Workflow by Persistent ID...');
    const uniqueTitle = `Enterprise AI Suite - Run ${Date.now()}`;
    const titleInput = await page.$('#page-title-input');
    if (titleInput) {
      await titleInput.fill(uniqueTitle);
    }

    // Restore clean valid HTML
    const validTestHtml = `
      <div class="verified-block">
        <h1>${uniqueTitle}</h1>
        <p>Persisted via MASTERHRMS Dedicated Page Editor.</p>
      </div>
    `;
    await sourceTextarea?.fill(validTestHtml);
    await page.waitForTimeout(500);

    // Click "Save Page"
    const saveBtn = await page.$('#page-save-button');
    if (saveBtn) {
      await saveBtn.click();
      await page.waitForTimeout(2500);

      // Reload the page
      console.log('    Reloading editor URL to verify persistence...');
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      // Verify title input has persisted value
      const reloadedTitle = await page.$eval('#page-title-input', (el) => el.value);
      console.log('    Title after reload:', reloadedTitle);

      if (reloadedTitle === uniqueTitle) {
        testReport.test7_persistence_save_reload = true;
        console.log('    [PASS] Content persisted and reloaded successfully by ID.');
      } else {
        console.error('    [FAIL] Title did not persist after reload:', { expected: uniqueTitle, actual: reloadedTitle });
      }
    }

    // -------------------------------------------------------------
    // TEST 8: Optimistic Concurrency Conflict Handling
    // -------------------------------------------------------------
    console.log('\n--> TEST 8: Verifying Optimistic Concurrency Conflict Handling (409)...');
    // Simulate concurrent modification in backend directly
    const currentUrl = page.url();
    const pageIdMatch = currentUrl.match(/\/super\/cms\/([a-zA-Z0-9_-]+)\/edit/);
    if (pageIdMatch && pageIdMatch[1]) {
      const pageId = pageIdMatch[1];
      // Make direct API put with newer timestamp to simulate third-party edit
      const conflictRes = await fetch(`http://localhost:4000/api/cms/pages/by-id/${pageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${superToken}`,
        },
        body: JSON.stringify({
          title: `${uniqueTitle} - Conflicting Update`,
          expectedUpdatedAt: '2020-01-01T00:00:00.000Z', // intentionally stale timestamp
        })
      });

      console.log('    Stale update API response status:', conflictRes.status);
      if (conflictRes.status === 409) {
        testReport.test8_concurrency_conflict = true;
        console.log('    [PASS] Optimistic concurrency safely rejected stale write with 409 Conflict.');
      } else {
        console.warn('    Note: Concurrency response status was:', conflictRes.status);
      }
    }

    // -------------------------------------------------------------
    // TEST 9: Create New Page at /super/cms/new
    // -------------------------------------------------------------
    console.log('\n--> TEST 9: Testing Create New Page Flow at /super/cms/new...');
    await page.goto('http://localhost:3000/super/cms/new', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const newPageTitle = `New Landing Page ${Date.now()}`;
    const newPageSlug = `test-page-${Date.now()}`;

    await page.fill('#page-title-input', newPageTitle);
    const slugInput = await page.$('#page-slug-input');
    if (slugInput) {
      await slugInput.fill(newPageSlug);
    }

    // Switch to HTML mode and add content
    const splitBtnNew = await page.$('button:has-text("Split View")');
    if (splitBtnNew) await splitBtnNew.click();
    await page.waitForTimeout(500);

    const newSourceTextarea = await page.$('textarea[placeholder*="HTML"]');
    if (newSourceTextarea) {
      await newSourceTextarea.fill(`<h1>${newPageTitle}</h1><p>Created by automated acceptance test suite.</p>`);
    }

    // Click "Create Page"
    const createBtn = await page.$('#page-save-button');
    if (createBtn) {
      await createBtn.click();
      await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);

      const afterCreateUrl = page.url();
      console.log('    URL after creation:', afterCreateUrl);

      if (afterCreateUrl.includes('/super/cms/') && afterCreateUrl.endsWith('/edit') && !afterCreateUrl.includes('/new')) {
        testReport.test9_create_new_page = true;
        console.log('    [PASS] New page successfully created with persistent UUID and redirected to dedicated edit route.');
      } else {
        console.error('    [FAIL] Did not redirect to dedicated edit route after creation.');
      }
    }

    // -------------------------------------------------------------
    // TEST 10: Public Route Rendering of Published Page
    // -------------------------------------------------------------
    console.log('\n--> TEST 10: Testing Public Route Rendering (/p/[slug])...');
    // Publish the newly created page
    const publishSwitch = await page.$('button[id="publish-toggle"], button[role="switch"]');
    if (publishSwitch) {
      const isChecked = await publishSwitch.getAttribute('data-state');
      if (isChecked !== 'checked') {
        await publishSwitch.click();
        await page.waitForTimeout(500);
      }
    }

    // Click Save Page
    const savePublishedBtn = await page.$('#page-save-button');
    if (savePublishedBtn) {
      await savePublishedBtn.click();
      await page.waitForTimeout(2000);
    }

    // Navigate to public page
    const publicUrl = `http://localhost:3000/p/${newPageSlug}`;
    console.log('    Navigating to public page:', publicUrl);
    await page.goto(publicUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const publicContent = await page.textContent('body');
    if (publicContent?.includes(newPageTitle)) {
      testReport.test10_public_route_rendering = true;
      console.log('    [PASS] Public route renders the published HTML and title correctly.');
    } else {
      console.warn('    Note: Public page body check. Page title present:', publicContent?.includes(newPageTitle));
    }

  } catch (error) {
    console.error('Error during test execution:', error);
  } finally {
    await browser.close();
  }

  console.log('\n================================================================');
  console.log(' FINAL PLAYWRIGHT ACCEPTANCE TEST SUMMARY:');
  console.log('================================================================');
  for (const [test, passed] of Object.entries(testReport)) {
    console.log(`  ${passed ? '[PASS]' : '[FAIL]'} ${test}`);
  }
  console.log('================================================================\n');

  const allPassed = Object.values(testReport).every(Boolean);
  process.exit(allPassed ? 0 : 1);
}

runTestSuite();
