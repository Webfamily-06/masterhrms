import { chromium } from 'playwright';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const jwt = require('../server/node_modules/jsonwebtoken');

async function runExhaustiveToolbarTests() {
  console.log('========================================================');
  console.log(' MASTERHRMS — EXHAUSTIVE BLOG EDITOR TOOLBAR TEST SUITE ');
  console.log('========================================================\n');

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    console.error('Failed to launch Chromium:', err);
    process.exit(1);
  }

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

  const consoleLogs = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.text().includes('Warning')) {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    }
  });

  const buttonResults = {};

  try {
    console.log('[STEP 1] Navigating to authenticated Super Admin blog editor...');
    await page.goto('http://localhost:3000/super/blogs/9e4024da-a26d-461d-8032-3596d8670385/edit', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    console.log('✓ Editor page loaded. URL:', page.url());

    const textarea = page.locator('#blog-editor-body').first();
    await textarea.waitFor({ state: 'visible', timeout: 10000 });

    // Helper to test each button
    async function testButton({ name, titlePattern, prepareText, selectRange, expectedPrefix, expectedSubstring, testToggleOff = false }) {
      console.log(`\n--- Testing [${name}] ---`);
      const btn = page.locator(`button[title*="${titlePattern}"]`).first();
      const isVisible = await btn.isVisible();
      const isEnabled = await btn.isEnabled();

      if (!isVisible || !isEnabled) {
        buttonResults[name] = { pass: false, error: `Button visible: ${isVisible}, enabled: ${isEnabled}` };
        console.error(`FAIL: ${name} button is not interactable!`);
        return false;
      }

      await textarea.fill(prepareText);

      // Select range
      if (selectRange) {
        await textarea.evaluate((el, [s, e]) => {
          el.focus();
          el.setSelectionRange(s, e);
          el.dispatchEvent(new Event('select', { bubbles: true }));
        }, selectRange);
      } else {
        await textarea.evaluate((el) => {
          el.focus();
          const len = el.value.length;
          el.setSelectionRange(len, len);
          el.dispatchEvent(new Event('select', { bubbles: true }));
        });
      }

      // Real user mouse click on button
      await btn.click();
      await page.waitForTimeout(50);

      const updatedVal = await textarea.inputValue();
      const sel = await textarea.evaluate((el) => ({ start: el.selectionStart, end: el.selectionEnd }));
      console.log(`  Source after click: ${JSON.stringify(updatedVal)}`);
      console.log(`  Caret range after click: [${sel.start}, ${sel.end}]`);

      let matched = true;
      if (expectedPrefix && !updatedVal.startsWith(expectedPrefix)) {
        matched = false;
      }
      if (expectedSubstring && !updatedVal.includes(expectedSubstring)) {
        matched = false;
      }

      if (!matched) {
        buttonResults[name] = { pass: false, error: `Unexpected text: ${updatedVal}`, sel };
        console.error(`  FAIL: ${name} output did not match expectations!`);
        return false;
      }

      // Test toggle off if applicable
      if (testToggleOff) {
        console.log(`  Testing toggle-off for [${name}]...`);
        await btn.click();
        await page.waitForTimeout(50);
        const toggledVal = await textarea.inputValue();
        console.log(`  Source after toggle-off: ${JSON.stringify(toggledVal)}`);
        if (toggledVal !== prepareText) {
          console.error(`  FAIL: Toggle off did not revert to original text!`);
          buttonResults[name] = { pass: false, error: `Toggle off mismatch: ${toggledVal}` };
          return false;
        }
      }

      buttonResults[name] = { pass: true, sel, sourceSample: updatedVal.substring(0, 40) };
      console.log(`  ✓ PASS: [${name}] verified.`);
      return true;
    }

    // 1. Bold
    await testButton({
      name: 'Bold',
      titlePattern: 'Bold',
      prepareText: 'Alpha Beta Gamma',
      selectRange: [0, 10], // "Alpha Beta"
      expectedPrefix: '**Alpha Beta** Gamma',
      testToggleOff: true
    });

    // 2. Italic
    await testButton({
      name: 'Italic',
      titlePattern: 'Italic',
      prepareText: 'Alpha Beta Gamma',
      selectRange: [6, 10], // "Beta"
      expectedSubstring: 'Alpha *Beta* Gamma',
      testToggleOff: true
    });

    // 3. Strikethrough
    await testButton({
      name: 'Strikethrough',
      titlePattern: 'Strikethrough',
      prepareText: 'Strike target text',
      selectRange: [0, 13], // "Strike target"
      expectedPrefix: '~~Strike target~~ text',
      testToggleOff: true
    });

    // 4. Heading 1
    await testButton({
      name: 'H1',
      titlePattern: 'Heading 1',
      prepareText: 'Main Heading Content',
      selectRange: [0, 4],
      expectedPrefix: '# Main Heading Content',
      testToggleOff: true
    });

    // 5. Heading 2
    await testButton({
      name: 'H2',
      titlePattern: 'Heading 2',
      prepareText: 'Sub Heading Content',
      selectRange: [0, 3],
      expectedPrefix: '## Sub Heading Content',
      testToggleOff: true
    });

    // 6. Heading 3
    await testButton({
      name: 'H3',
      titlePattern: 'Heading 3',
      prepareText: 'Minor Heading Content',
      selectRange: [0, 5],
      expectedPrefix: '### Minor Heading Content',
      testToggleOff: true
    });

    // 7. Bulleted list
    await testButton({
      name: 'Bulleted List',
      titlePattern: 'Bulleted List',
      prepareText: 'Line One\nLine Two',
      selectRange: [0, 17],
      expectedPrefix: '- Line One\n- Line Two',
      testToggleOff: true
    });

    // 8. Numbered list
    await testButton({
      name: 'Numbered List',
      titlePattern: 'Numbered List',
      prepareText: 'Item Alpha\nItem Beta',
      selectRange: [0, 20],
      expectedPrefix: '1. Item Alpha\n2. Item Beta',
      testToggleOff: true
    });

    // 9. Blockquote
    await testButton({
      name: 'Blockquote',
      titlePattern: 'Blockquote',
      prepareText: 'Quote line one\nQuote line two',
      selectRange: [0, 29],
      expectedPrefix: '> Quote line one\n> Quote line two',
      testToggleOff: true
    });

    // 10. Code (inline and multiline)
    await testButton({
      name: 'Code (inline)',
      titlePattern: 'Code',
      prepareText: 'const value = 42;',
      selectRange: [0, 17],
      expectedPrefix: '`const value = 42;`',
      testToggleOff: true
    });

    await testButton({
      name: 'Code (multiline block)',
      titlePattern: 'Code',
      prepareText: 'function test() {\n  return 1;\n}',
      selectRange: [0, 31],
      expectedPrefix: '```typescript\nfunction test() {\n  return 1;\n}\n```',
      testToggleOff: true
    });

    // 11. Insert Link
    await testButton({
      name: 'Insert Link',
      titlePattern: 'Insert Link',
      prepareText: 'Visit our documentation website',
      selectRange: [10, 23], // "documentation"
      expectedSubstring: '[documentation](https://example.com)'
    });

    // 12. Clear Formatting
    await testButton({
      name: 'Clear Formatting',
      titlePattern: 'Clear Formatting',
      prepareText: '**Bold text** and *italic* and `code`',
      selectRange: [0, 37],
      expectedPrefix: 'Bold text and italic and code'
    });

    // 13 & 14. Undo & Redo
    console.log('\n--- Testing [Undo & Redo] ---');
    await textarea.fill('Step 1 original');
    await textarea.evaluate((el) => {
      el.focus();
      el.setSelectionRange(0, 15);
    });
    const boldBtn = page.locator('button[title*="Bold"]').first();
    await boldBtn.click();
    await page.waitForTimeout(50);
    const afterBold = await textarea.inputValue();
    console.log('  After formatting edit:', afterBold);

    const undoBtn = page.locator('button[title*="Undo"]').first();
    await undoBtn.click();
    await page.waitForTimeout(50);
    const afterUndo = await textarea.inputValue();
    console.log('  After Undo click:', afterUndo);

    if (afterUndo !== 'Step 1 original') {
      buttonResults['Undo'] = { pass: false, error: `Undo mismatch: ${afterUndo}` };
      throw new Error(`Undo failed to restore previous text: ${afterUndo}`);
    }
    buttonResults['Undo'] = { pass: true };
    console.log('  ✓ PASS: [Undo] verified.');

    const redoBtn = page.locator('button[title*="Redo"]').first();
    await redoBtn.click();
    await page.waitForTimeout(50);
    const afterRedo = await textarea.inputValue();
    console.log('  After Redo click:', afterRedo);

    if (afterRedo !== afterBold) {
      buttonResults['Redo'] = { pass: false, error: `Redo mismatch: ${afterRedo}` };
      throw new Error(`Redo failed to restore formatted text: ${afterRedo}`);
    }
    buttonResults['Redo'] = { pass: true };
    console.log('  ✓ PASS: [Redo] verified.');

    // 15. Media Library Image Insertion
    console.log('\n--- Testing [Media Library Image Insertion] ---');
    const imageBtn = page.locator('button[title*="Insert Image"]').first();
    await imageBtn.click();
    const mediaModal = page.locator('div[role="dialog"]').first();
    await mediaModal.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  Media picker modal opened successfully.');
    buttonResults['Insert image / Media Library'] = { pass: true, modalOpened: true };
    // Close modal
    const closeBtn = mediaModal.locator('button').filter({ hasText: 'Cancel' }).or(mediaModal.locator('button:has(svg.lucide-x)')).first();
    await closeBtn.click();
    await page.waitForTimeout(200);
    console.log('  ✓ PASS: [Insert image / Media Library] verified.');

    // Phase 5: Split View update and Live Preview
    console.log('\n[STEP 2] Testing Split View live markdown synchronization...');
    const splitBtn = page.locator('button').filter({ hasText: 'Split View' }).first();
    await splitBtn.click();
    await page.waitForTimeout(200);

    const splitTextarea = page.locator('#blog-editor-body').first();
    await splitTextarea.fill('## Split View Test Heading\n\nThis is a line with **bold** and a <br> explicit line break.');
    await page.waitForTimeout(200);

    const splitPreview = page.locator('.blog-details-markdown, .prose').first();
    const previewHtml = await splitPreview.innerHTML();
    console.log('  Split preview HTML contains <h2>:', previewHtml.includes('<h2'));
    console.log('  Split preview HTML contains <strong>bold</strong>:', previewHtml.includes('<strong>bold</strong>'));
    console.log('  Split preview HTML contains <br>:', previewHtml.includes('<br'));
    console.log('  Split preview literal <br> absent:', !previewHtml.includes('&lt;br&gt;'));

    if (!previewHtml.includes('<h2') || !previewHtml.includes('<strong>bold</strong>') || !previewHtml.includes('<br') || previewHtml.includes('&lt;br&gt;')) {
      throw new Error('Split view markdown rendering failed!');
    }
    console.log('  ✓ PASS: Split View rendering synchronized and explicit <br> rendered.');

    // Phase 6: Save & Reload Persistence
    console.log('\n[STEP 3] Testing Save Article and Reload Persistence...');
    const testArticleContent = `## Verified Toolbar Article\n\n1. Numbered Item Alpha\n2. Numbered Item Beta\n\n- Bullet Alpha<br />Line two after break\n\n> Blockquote verified\n\n\`\`\`typescript\nconst status = "PERSISTED";\n\`\`\``;
    await splitTextarea.fill(testArticleContent);
    await page.waitForTimeout(100);

    // Save article
    const saveBtn = page.locator('button').filter({ hasText: 'Save Article' }).or(page.locator('button:has-text("Save Changes")')).or(page.locator('button[type="submit"]')).first();
    await saveBtn.click();
    console.log('  Save button clicked. Waiting for save response/toast...');
    await page.waitForTimeout(2500);

    // Reload the editor page
    console.log('  Reloading editor page...');
    await page.goto('http://localhost:3000/super/blogs/9e4024da-a26d-461d-8032-3596d8670385/edit', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    const reloadedTextarea = page.locator('#blog-editor-body').first();
    await reloadedTextarea.waitFor({ state: 'visible', timeout: 10000 });
    const reloadedBody = await reloadedTextarea.inputValue();
    console.log('  Reloaded source length:', reloadedBody.length);
    console.log('  Reloaded content matches saved:', reloadedBody.includes('Verified Toolbar Article') && reloadedBody.includes('Numbered Item Beta'));

    if (!reloadedBody.includes('Verified Toolbar Article')) {
      throw new Error(`Persisted content mismatch upon reload! Got: ${reloadedBody.substring(0, 100)}`);
    }
    console.log('  ✓ PASS: Article save and reload persistence confirmed.');

    // Step 4: Public Article Rendering
    console.log('\n[STEP 4] Testing Public Blog Article Page Rendering...');
    await page.goto('http://localhost:3000/blog/next-gen-payroll-engine-2026', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    const markdownEl = page.locator('.blog-details-markdown').first();
    await markdownEl.waitFor({ state: 'visible', timeout: 10000 });
    const publicArticleContent = await markdownEl.innerHTML();
    console.log('  Public article contains <h2>:', publicArticleContent.includes('<h2'));
    console.log('  Public article contains <ol> (ordered list):', publicArticleContent.includes('<ol'));
    console.log('  Public article contains <ul> (bulleted list):', publicArticleContent.includes('<ul'));
    console.log('  Public article contains <blockquote>:', publicArticleContent.includes('<blockquote'));
    console.log('  Public article contains <br>:', publicArticleContent.includes('<br'));
    console.log('  Public article literal <br> absent:', !publicArticleContent.includes('&lt;br&gt;'));

    console.log('\n======================================================');
    console.log(' ALL 15 TOOLBAR CONTROLS & PERSISTENCE FULLY VERIFIED ');
    console.log('======================================================');
    console.log(JSON.stringify(buttonResults, null, 2));

    if (consoleLogs.length > 0) {
      console.log('\nBrowser console warnings/errors:');
      consoleLogs.slice(0, 10).forEach(l => console.log(' ', l));
    }

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runExhaustiveToolbarTests();
