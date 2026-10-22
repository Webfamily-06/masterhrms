import { chromium } from 'playwright';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const jwt = require('../server/node_modules/jsonwebtoken');

async function runColorHighlightTests() {
  console.log('================================================================');
  console.log(' MASTERHRMS — TEXT COLOR & BACKGROUND HIGHLIGHT ACCEPTANCE SUITE ');
  console.log('================================================================');

  const browser = await chromium.launch({ headless: true });

  const superToken = jwt.sign(
    {
      userId: '0c99980d-69c9-42fb-9d68-7df14554576c',
      email: 'super-1792135343884@platform.com',
      roles: ['super_admin'],
    },
    process.env.JWT_SECRET || 'master-hrms-jwt-super-secret-key-change-this-in-production',
    { expiresIn: '2h' }
  );

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

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
      email: 'super-1792135343884@platform.com',
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

  const results = {};

  try {
    const editUrl = 'http://localhost:3000/super/blogs/9e4024da-a26d-461d-8032-3596d8670385/edit';
    console.log(`\n[STEP 1] Navigating to editor: ${editUrl}`);
    await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#blog-editor-body', { state: 'visible', timeout: 15000 });
    console.log('✓ Editor loaded in Split View.');

    const textarea = page.locator('#blog-editor-body').first();
    const preview = page.locator('.blog-details-markdown, .prose').first();

    const setEditorContent = async (text, start, end) => {
      await textarea.evaluate((el, { text, start, end }) => {
        el.focus();
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeSetter.call(el, text);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.setSelectionRange(start, end);
        el.dispatchEvent(new Event('select', { bubbles: true }));
      }, { text, start, end });
      await page.waitForTimeout(50);
    };

    // Test 1: Apply text color to a selected word
    console.log('\n--- 1. Testing Apply Text Color ---');
    await setEditorContent('Welcome to MasterHRMS Payroll System', 11, 21); // "MasterHRMS"
    const colorBtn = page.locator('button[aria-label="Text Color"]').first();
    await colorBtn.click();
    await page.waitForTimeout(100);

    // Click Red preset (#e11d48)
    const redPreset = page.locator('button[title="Rose / Red"]').first();
    await redPreset.click();
    await page.waitForTimeout(100);

    const val1 = await textarea.inputValue();
    console.log('  Source after applying text color:', val1);
    const hasColorTag = val1.includes('<span style="color: #e11d48">MasterHRMS</span>');
    const span1 = preview.locator('span[style*="color: rgb(225, 29, 72)"], span[style*="color: #e11d48"]').first();
    const span1Visible = await span1.isVisible();
    const span1Color = await span1.evaluate(el => window.getComputedStyle(el).color);
    console.log(`  Preview span computed color: ${span1Color}`);
    results['Apply Text Color'] = { pass: hasColorTag && span1Visible, computedColor: span1Color };
    console.log(hasColorTag && span1Visible ? '  ✓ PASS: Text color applied and rendered.' : '  ❌ FAIL: Text color application failed.');

    // Test 2: Apply highlight color to selected text
    console.log('\n--- 2. Testing Apply Background Highlight ---');
    await setEditorContent('Welcome to MasterHRMS Payroll System', 22, 29); // "Payroll"
    const highlightBtn = page.locator('button[aria-label="Text Highlight"]').first();
    await highlightBtn.click();
    await page.waitForTimeout(100);

    // Click Yellow highlight preset (#fef08a)
    const yellowPreset = page.locator('button[title="Yellow"]').first();
    await yellowPreset.click();
    await page.waitForTimeout(100);

    const val2 = await textarea.inputValue();
    console.log('  Source after applying highlight:', val2);
    const hasHighlightTag = val2.includes('<span style="background-color: #fef08a">Payroll</span>');
    const span2 = preview.locator('span[style*="background-color"]').first();
    const span2Visible = await span2.isVisible();
    const span2Bg = await span2.evaluate(el => window.getComputedStyle(el).backgroundColor);
    console.log(`  Preview span computed background-color: ${span2Bg}`);
    results['Apply Highlight'] = { pass: hasHighlightTag && span2Visible, computedBg: span2Bg };
    console.log(hasHighlightTag && span2Visible ? '  ✓ PASS: Background highlight applied and rendered.' : '  ❌ FAIL: Highlight application failed.');

    // Test 3: Change existing color
    console.log('\n--- 3. Testing Change Existing Color ---');
    const colorSpanText = 'Text with <span style="color: #e11d48">Target Word</span> here';
    const cStart = colorSpanText.indexOf('<span');
    const cEnd = colorSpanText.indexOf('</span>') + 7;
    await setEditorContent(colorSpanText, cStart, cEnd);
    await colorBtn.click();
    await page.waitForTimeout(100);
    // Click Blue preset (#2563eb)
    const bluePreset = page.locator('button[title="Blue"]').first();
    await bluePreset.click();
    await page.waitForTimeout(100);

    const val3 = await textarea.inputValue();
    console.log('  Source after changing color:', val3);
    const hasBlue = val3.includes('<span style="color: #2563eb">Target Word</span>');
    results['Change Existing Color'] = { pass: hasBlue };
    console.log(hasBlue ? '  ✓ PASS: Color successfully changed to blue.' : '  ❌ FAIL: Color change failed.');

    // Test 4: Remove text color
    console.log('\n--- 4. Testing Remove Text Color ---');
    const removeColorText = 'Text with <span style="color: #2563eb">Target Word</span> here';
    const rcStart = removeColorText.indexOf('<span');
    const rcEnd = removeColorText.indexOf('</span>') + 7;
    await setEditorContent(removeColorText, rcStart, rcEnd);
    await colorBtn.click();
    await page.waitForTimeout(100);
    const resetColorBtn = page.locator('button:has-text("Reset Color")').first();
    await resetColorBtn.click();
    await page.waitForTimeout(100);

    const val4 = await textarea.inputValue();
    console.log('  Source after removing color:', val4);
    const colorRemoved = val4 === 'Text with Target Word here';
    results['Remove Text Color'] = { pass: colorRemoved };
    console.log(colorRemoved ? '  ✓ PASS: Text color removed (span cleanly unwrapped).' : '  ❌ FAIL: Remove color failed.');

    // Test 5: Remove highlight
    console.log('\n--- 5. Testing Remove Highlight ---');
    const hlSpanText = 'Text with <span style="background-color: #fef08a">Target Word</span> here';
    const hlStart = hlSpanText.indexOf('<span');
    const hlEnd = hlSpanText.indexOf('</span>') + 7;
    await setEditorContent(hlSpanText, hlStart, hlEnd);
    await highlightBtn.click();
    await page.waitForTimeout(100);
    const resetHlBtn = page.locator('button:has-text("Reset Highlight")').first();
    await resetHlBtn.click();
    await page.waitForTimeout(100);

    const val5 = await textarea.inputValue();
    console.log('  Source after removing highlight:', val5);
    const hlRemoved = val5 === 'Text with Target Word here';
    results['Remove Highlight'] = { pass: hlRemoved };
    console.log(hlRemoved ? '  ✓ PASS: Highlight removed (span cleanly unwrapped).' : '  ❌ FAIL: Remove highlight failed.');

    // Test 6: Apply color & highlight to markdown formatted text (**bold** & *italic*)
    console.log('\n--- 6. Testing Styling over Formatted Markdown (**bold**) ---');
    const mdText = 'Notice: **Crucial Alert** in system';
    const mStart = mdText.indexOf('**Crucial Alert**');
    const mEnd = mStart + '**Crucial Alert**'.length;
    await setEditorContent(mdText, mStart, mEnd);
    await colorBtn.click();
    await page.waitForTimeout(100);
    const greenPreset = page.locator('button[title="Green"]').first();
    await greenPreset.click();
    await page.waitForTimeout(100);

    const val6 = await textarea.inputValue();
    console.log('  Source with color over bold:', val6);
    const strongInSpan = preview.locator('span[style*="color"] strong').first();
    const strongFound = await strongInSpan.isVisible();
    const strongColor = await strongInSpan.evaluate(el => window.getComputedStyle(el).color);
    console.log(`  Rendered strong tag computed color: ${strongColor}`);
    results['Color over Markdown Formatting'] = { pass: strongFound, strongColor };
    console.log(strongFound ? '  ✓ PASS: Text color cleanly wraps **bold** markdown and renders strong.' : '  ❌ FAIL');

    // Test 7: Selection preservation
    console.log('\n--- 7. Testing Selection Preservation after Toolbar Actions ---');
    await setEditorContent('Alpha Beta Gamma Delta', 6, 10); // "Beta"
    await colorBtn.click();
    await page.waitForTimeout(100);
    await redPreset.click();
    await page.waitForTimeout(100);
    const sel = await textarea.evaluate(el => ({ start: el.selectionStart, end: el.selectionEnd, selected: el.value.substring(el.selectionStart, el.selectionEnd) }));
    console.log(`  Selected text after action: "${sel.selected}" [${sel.start}, ${sel.end}]`);
    const selPreserved = sel.selected === 'Beta';
    results['Selection Preservation'] = { pass: selPreserved, sel };
    console.log(selPreserved ? '  ✓ PASS: Exact selection preserved on target text.' : '  ❌ FAIL');

    // Test 8: Undo and Redo
    console.log('\n--- 8. Testing Undo and Redo ---');
    const undoBtn = page.locator('button[aria-label="Undo"]').first();
    const redoBtn = page.locator('button[aria-label="Redo"]').first();
    await undoBtn.click();
    await page.waitForTimeout(100);
    const afterUndo = await textarea.inputValue();
    console.log('  Source after Undo:', afterUndo);
    const undoPassed = afterUndo === 'Alpha Beta Gamma Delta';

    await redoBtn.click();
    await page.waitForTimeout(100);
    const afterRedo = await textarea.inputValue();
    console.log('  Source after Redo:', afterRedo);
    const redoPassed = afterRedo.includes('<span style="color: #e11d48">Beta</span>');
    results['Undo & Redo for Colors'] = { pass: undoPassed && redoPassed };
    console.log(undoPassed && redoPassed ? '  ✓ PASS: Undo and Redo work flawlessly with color spans.' : '  ❌ FAIL');

    // Test 9: Save & Reload Persistence
    console.log('\n--- 9. Testing Article Save & Reload Persistence ---');
    const persistentContent = `## Dual Color & Highlight Verification\n\nHere is <span style="color: #2563eb">Blue Text</span> and <span style="background-color: #fef08a">Highlighted Yellow Text</span> and <span style="color: #e11d48; background-color: #bbf7d0">Combined Red on Green</span>.\n\nLegacy paragraph continues unaffected.`;
    await setEditorContent(persistentContent, 0, 0);

    const saveBtn = page.locator('button').filter({ hasText: 'Save Article' }).or(page.locator('button:has-text("Save Changes")')).or(page.locator('button[type="submit"]')).first();
    await saveBtn.click();
    console.log('  Save button clicked. Waiting for save response/toast...');
    await page.waitForTimeout(2500);

    console.log('  Reloading editor page...');
    await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#blog-editor-body', { state: 'visible', timeout: 10000 });

    const reloadedVal = await textarea.inputValue();
    console.log('  Reloaded source length:', reloadedVal.length);
    const persistPassed = reloadedVal.includes('<span style="color: #2563eb">Blue Text</span>') &&
                          reloadedVal.includes('<span style="background-color: #fef08a">Highlighted Yellow Text</span>');
    results['Save & Reload Persistence'] = { pass: persistPassed };
    console.log(persistPassed ? '  ✓ PASS: Color & highlight spans persisted across reload.' : '  ❌ FAIL');

    // Test 10: Split View & Live Preview Rendering
    console.log('\n--- 10. Testing Split View Live Rendering ---');
    const previewBlue = preview.locator('span[style*="color"]').first();
    const previewHl = preview.locator('span[style*="background-color"]').first();
    const splitViewPassed = (await previewBlue.isVisible()) && (await previewHl.isVisible());
    results['Split View Rendering'] = { pass: splitViewPassed };
    console.log(splitViewPassed ? '  ✓ PASS: Split View renders styled spans.' : '  ❌ FAIL');

    // Test 11: Public Blog Page Rendering
    console.log('\n--- 11. Testing Public Blog Page Rendering ---');
    await page.goto('http://localhost:3000/blog/next-gen-payroll-engine-2026', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const publicMarkdown = page.locator('.blog-details-markdown').first();
    await publicMarkdown.waitFor({ state: 'visible', timeout: 10000 });
    const pubBlue = publicMarkdown.locator('span[style*="color"]').first();
    const pubHl = publicMarkdown.locator('span[style*="background-color"]').first();
    const pubPassed = (await pubBlue.isVisible()) && (await pubHl.isVisible());
    results['Public Blog Page Rendering'] = { pass: pubPassed };
    console.log(pubPassed ? '  ✓ PASS: Public blog article renders color and highlight.' : '  ❌ FAIL');

    // Test 12: Malicious input rejection
    console.log('\n--- 12. Testing Malicious / Invalid Value Rejection ---');
    await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await setEditorContent('Secure Test Content', 7, 11); // "Test"
    await colorBtn.click();
    await page.waitForTimeout(100);
    // Fill custom hex input with malicious payload
    const customHexInput = page.locator('input[placeholder="#e11d48"]').first();
    await customHexInput.fill('red; position: fixed; background: url(javascript:alert(1))');
    const applyBtn = page.locator('button:has-text("Apply")').first();
    await applyBtn.click();
    await page.waitForTimeout(100);

    const valMalicious = await textarea.inputValue();
    console.log('  Source after malicious attempt:', valMalicious);
    const rejected = valMalicious === 'Secure Test Content';
    results['Malicious Value Rejection'] = { pass: rejected };
    console.log(rejected ? '  ✓ PASS: Malicious injection payload strictly rejected.' : '  ❌ FAIL');

    console.log('\n================================================================');
    console.log(' ALL ACCEPTANCE TESTS COMPLETE ');
    console.log('================================================================');
    console.log(JSON.stringify(results, null, 2));

    const allPassed = Object.values(results).every(r => r.pass);
    if (!allPassed) {
      throw new Error('One or more acceptance tests failed!');
    }

  } finally {
    await browser.close();
  }
}

runColorHighlightTests().catch(err => {
  console.error('\n❌ ACCEPTANCE SUITE FAILED:', err);
  process.exit(1);
});
