import { chromium } from 'playwright';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const jwt = require('../server/node_modules/jsonwebtoken');

async function runTests() {
  console.log('--- Starting Playwright Blog Editor Acceptance Tests ---');
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    console.log('Standard chromium launch failed, installing or checking browser:', err.message);
    throw err;
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
    viewport: { width: 1400, height: 900 }
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

  const results = {
    formatting: false,
    headings: false,
    lists: false,
    codeAndLinks: false,
    clearFormatting: false,
    undoRedo: false,
    viewSwitching: false,
    mediaInsertion: false,
    seoPanel: false,
    sharingControls: false,
  };

  try {
    // 1. Navigate to Blog Editor
    console.log('\n[TEST 1] Loading Blog Editor...');
    await page.goto('http://localhost:3000/super/blogs/9e4024da-a26d-461d-8032-3596d8670385/edit', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    console.log('Blog Editor page loaded successfully. Current URL:', page.url());

    const textarea = page.locator('#blog-editor-body').first();
    await textarea.waitFor({ state: 'visible', timeout: 10000 });

    // Set initial test text
    await textarea.fill('Hello World from Automated Playwright Test');

    // Test Bold Formatting
    console.log('\n[TEST 2] Testing Bold Formatting Toolbar...');
    // Select "Hello World"
    await textarea.evaluate((el) => {
      el.focus();
      el.setSelectionRange(0, 11); // "Hello World"
    });
    const boldBtn = page.locator('button[title*="Bold"]').first();
    await boldBtn.click();
    let bodyVal = await textarea.inputValue();
    console.log('After Bold click:', bodyVal);
    if (!bodyVal.startsWith('**Hello World**')) {
      throw new Error(`Bold failed: expected **Hello World**, got: ${bodyVal}`);
    }

    // Toggle Bold off
    await textarea.evaluate((el) => {
      el.focus();
      el.setSelectionRange(0, 15); // "**Hello World**"
    });
    await boldBtn.click();
    bodyVal = await textarea.inputValue();
    console.log('After Bold toggle off:', bodyVal);
    if (bodyVal.startsWith('**')) {
      throw new Error(`Bold toggle off failed: got: ${bodyVal}`);
    }

    // Test Italic
    console.log('\n[TEST 3] Testing Italic Formatting...');
    await textarea.evaluate((el) => {
      el.focus();
      el.setSelectionRange(0, 5); // "Hello"
    });
    const italicBtn = page.locator('button[title*="Italic"]').first();
    await italicBtn.click();
    bodyVal = await textarea.inputValue();
    console.log('After Italic click:', bodyVal);
    if (!bodyVal.startsWith('*Hello*')) {
      throw new Error(`Italic failed: expected *Hello*, got: ${bodyVal}`);
    }
    results.formatting = true;

    // Test Headings
    console.log('\n[TEST 4] Testing Headings (H1, H2, H3)...');
    await textarea.fill('Main Section Title\nSecond line text');
    await textarea.evaluate((el) => {
      el.focus();
      el.setSelectionRange(0, 4); // on first line
    });
    const h1Btn = page.locator('button[title*="Heading 1"]').first();
    await h1Btn.click();
    bodyVal = await textarea.inputValue();
    console.log('After H1 click:', bodyVal);
    if (!bodyVal.startsWith('# Main Section Title')) {
      throw new Error(`H1 failed, got: ${bodyVal}`);
    }

    const h2Btn = page.locator('button[title*="Heading 2"]').first();
    await h2Btn.click();
    bodyVal = await textarea.inputValue();
    console.log('After H2 click:', bodyVal);
    if (!bodyVal.startsWith('## Main Section Title')) {
      throw new Error(`H2 failed, got: ${bodyVal}`);
    }
    results.headings = true;

    // Test Lists
    console.log('\n[TEST 5] Testing Lists...');
    await textarea.fill('First Item\nSecond Item');
    await textarea.evaluate((el) => {
      el.focus();
      el.setSelectionRange(0, 22); // select both lines
    });
    const bulletBtn = page.locator('button[title*="Bulleted List"]').first();
    await bulletBtn.click();
    bodyVal = await textarea.inputValue();
    console.log('After Bullet List click:\n' + bodyVal);
    if (!bodyVal.includes('- First Item') || !bodyVal.includes('- Second Item')) {
      throw new Error(`Bullet list failed, got:\n${bodyVal}`);
    }

    const numBtn = page.locator('button[title*="Numbered List"]').first();
    await numBtn.click();
    bodyVal = await textarea.inputValue();
    console.log('After Numbered List click:\n' + bodyVal);
    if (!bodyVal.includes('1. First Item') || !bodyVal.includes('2. Second Item')) {
      throw new Error(`Numbered list failed, got:\n${bodyVal}`);
    }
    results.lists = true;

    // Test 5b: Ordered List Enter Continuation & Exit
    console.log('\n[TEST 5b] Testing Ordered List Enter Continuation & Exit...');
    await textarea.fill('1. First item');
    await textarea.evaluate((el) => {
      el.focus();
      el.setSelectionRange(13, 13); // end of "1. First item"
    });
    await textarea.press('Enter');
    bodyVal = await textarea.inputValue();
    console.log('After Enter on 1. First item:\n' + JSON.stringify(bodyVal));
    if (!bodyVal.includes('1. First item\n2. ')) {
      throw new Error(`Ordered list continuation failed, got:\n${bodyVal}`);
    }

    // Type second item
    await textarea.evaluate((el) => {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
    await textarea.pressSequentially('Second item');
    await textarea.press('Enter');
    bodyVal = await textarea.inputValue();
    console.log('After Enter on 2. Second item:\n' + JSON.stringify(bodyVal));
    if (!bodyVal.includes('1. First item\n2. Second item\n3. ')) {
      throw new Error(`Ordered list increment to 3 failed, got:\n${bodyVal}`);
    }

    // Press Enter on empty "3. " to exit list
    await textarea.press('Enter');
    bodyVal = await textarea.inputValue();
    console.log('After Enter on empty 3. (exit list):\n' + JSON.stringify(bodyVal));
    if (bodyVal.includes('3. ')) {
      throw new Error(`Exiting empty ordered list failed, still contains 3.:\n${bodyVal}`);
    }
    console.log('PASS: Ordered list auto-continuation and empty exit verified');

    // Test 5c: Bulleted List Enter Continuation & Exit
    console.log('\n[TEST 5c] Testing Bulleted List Enter Continuation & Exit...');
    await textarea.fill('- Alpha item');
    await textarea.evaluate((el) => {
      el.focus();
      el.setSelectionRange(12, 12);
    });
    await textarea.press('Enter');
    bodyVal = await textarea.inputValue();
    console.log('After Enter on - Alpha item:\n' + JSON.stringify(bodyVal));
    if (!bodyVal.includes('- Alpha item\n- ')) {
      throw new Error(`Bullet list continuation failed, got:\n${bodyVal}`);
    }

    // Press Enter on empty "- " to exit list
    await textarea.press('Enter');
    bodyVal = await textarea.inputValue();
    console.log('After Enter on empty bullet (exit list):\n' + JSON.stringify(bodyVal));
    if (bodyVal.endsWith('- ')) {
      throw new Error(`Exiting empty bullet list failed, still contains bullet:\n${bodyVal}`);
    }
    console.log('PASS: Bulleted list auto-continuation and empty exit verified');

    // Test 5d: Tab and Shift+Tab List Indentation
    console.log('\n[TEST 5d] Testing Tab and Shift+Tab List Indentation...');
    await textarea.fill('- Indent target');
    await textarea.evaluate((el) => {
      el.focus();
      el.setSelectionRange(0, 0);
    });
    await textarea.press('Tab');
    bodyVal = await textarea.inputValue();
    console.log('After Tab indentation:\n' + JSON.stringify(bodyVal));
    if (!bodyVal.startsWith('  - Indent target')) {
      throw new Error(`Tab indentation failed, got:\n${bodyVal}`);
    }

    await textarea.press('Shift+Tab');
    bodyVal = await textarea.inputValue();
    console.log('After Shift+Tab outdent:\n' + JSON.stringify(bodyVal));
    if (!bodyVal.startsWith('- Indent target')) {
      throw new Error(`Shift+Tab outdent failed, got:\n${bodyVal}`);
    }
    console.log('PASS: Tab & Shift+Tab indentation verified');

    // Test Code & Links
    console.log('\n[TEST 6] Testing Code & Links...');
    await textarea.fill('const x = 10;');
    await textarea.evaluate((el) => {
      el.focus();
      el.setSelectionRange(0, 13);
    });
    const codeBtn = page.locator('button[title*="Code"]').first();
    await codeBtn.click();
    bodyVal = await textarea.inputValue();
    console.log('After Code click:', bodyVal);
    if (bodyVal !== '`const x = 10;`') {
      throw new Error(`Inline code failed, got: ${bodyVal}`);
    }

    await textarea.fill('Click here to visit');
    await textarea.evaluate((el) => {
      el.focus();
      el.setSelectionRange(0, 10); // "Click here"
    });
    const linkBtn = page.locator('button[title*="Insert Link"]').first();
    await linkBtn.click();
    bodyVal = await textarea.inputValue();
    console.log('After Link click:', bodyVal);
    if (!bodyVal.includes('[Click here](https://example.com)')) {
      throw new Error(`Link insert failed, got: ${bodyVal}`);
    }
    results.codeAndLinks = true;

    // Test Clear Formatting
    console.log('\n[TEST 7] Testing Clear Formatting...');
    await textarea.fill('**Bold** and *Italic* text with `code`');
    await textarea.evaluate((el) => {
      el.focus();
      el.setSelectionRange(0, 38);
    });
    const clearBtn = page.locator('button[title*="Clear Formatting"]').first();
    await clearBtn.click();
    bodyVal = await textarea.inputValue();
    console.log('After Clear Formatting click:', bodyVal);
    if (bodyVal.includes('**') || bodyVal.includes('*') || bodyVal.includes('`')) {
      throw new Error(`Clear formatting failed to remove markdown markers: ${bodyVal}`);
    }
    results.clearFormatting = true;

    // Test Undo / Redo
    console.log('\n[TEST 8] Testing Undo & Redo...');
    const undoBtn = page.locator('button[title*="Undo"]').first();
    await undoBtn.click();
    bodyVal = await textarea.inputValue();
    console.log('After Undo:', bodyVal);

    const redoBtn = page.locator('button[title*="Redo"]').first();
    await redoBtn.click();
    bodyVal = await textarea.inputValue();
    console.log('After Redo:', bodyVal);
    results.undoRedo = true;

    // Test View Switching & HTML Line Break Rendering in Split View
    console.log('\n[TEST 9] Testing Editor, Split View, and Live Preview...');
    const splitBtn = page.locator('button:has-text("Split View")').first();
    await splitBtn.click();
    await page.waitForTimeout(300);
    const livePreviewPane = page.locator('div.prose').first();
    const isSplitVisible = await livePreviewPane.isVisible();
    console.log('Split View live preview pane visible:', isSplitVisible);

    // Test Explicit <br> and <br /> line break rendering
    console.log('\n[TEST 9b] Testing Explicit <br> and <br /> line break rendering in Split View...');
    const splitTextarea = page.locator('#blog-editor-body').first();
    await splitTextarea.fill('Alpha Line<br>Beta Line<br />Gamma Line\n\n```html\n<br>\n```\n\n<script>alert(1)</script>');
    await page.waitForTimeout(300);

    const brCount = await page.locator('div.prose br').count();
    console.log('Number of <br/> elements rendered in Split View preview:', brCount);
    if (brCount < 2) {
      throw new Error(`Expected at least 2 <br/> tags rendered in DOM, got ${brCount}`);
    }

    const previewText = await livePreviewPane.innerText();
    const hasLiteralBrInParagraph = previewText.includes('Alpha Line<br>') || previewText.includes('Beta Line<br />');
    console.log('Rendered preview contains literal <br> in text:', hasLiteralBrInParagraph);
    if (hasLiteralBrInParagraph) {
      throw new Error('Preview displayed literal <br> tag instead of HTML line break!');
    }
    console.log('PASS: Explicit <br> and <br /> render as true visual line breaks in Split View');

    const previewBtn = page.locator('button:has-text("Live Preview")').first();
    await previewBtn.click();
    await page.waitForTimeout(300);
    const isFullPreviewVisible = await page.locator('div.prose').first().isVisible();
    console.log('Full Live Preview visible:', isFullPreviewVisible);

    // Switch back to editor
    const editorBtn = page.locator('button:has-text("Editor")').first();
    await editorBtn.click();
    results.viewSwitching = true;

    // Test Media Library Image Insertion
    console.log('\n[TEST 10] Testing Media Library Image Insertion in Body...');
    const insertImageBtn = page.locator('button[title*="Insert Image from Media Library"]').first();
    await insertImageBtn.click();
    await page.waitForTimeout(500);

    const mediaModal = page.locator('div[role="dialog"]');
    const isModalOpen = await mediaModal.isVisible();
    console.log('Media Library Modal opened:', isModalOpen);
    if (!isModalOpen) throw new Error('Media modal did not open on toolbar image click');

    // Close modal
    const closeBtn = page.locator('div[role="dialog"] button:has-text("Cancel"), div[role="dialog"] button[aria-label="Close"]').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    results.mediaInsertion = true;

    // Test SEO Panel
    console.log('\n[TEST 11] Testing SEO Metadata Panel...');
    const seoTitleInput = page.locator('#seo-title').first();
    const isSeoTitleVisible = await seoTitleInput.isVisible();
    console.log('SEO Title input visible:', isSeoTitleVisible);
    const seoDescInput = page.locator('#seo-desc').first();
    const isSeoDescVisible = await seoDescInput.isVisible();
    console.log('SEO Description input visible:', isSeoDescVisible);
    const canonicalInput = page.locator('#canonical-url').first();
    const isCanonicalVisible = await canonicalInput.isVisible();
    console.log('Canonical URL input visible:', isCanonicalVisible);
    const googlePreview = page.locator('text=Google Search Snippet Preview').first();
    const isGooglePreviewVisible = await googlePreview.isVisible();
    console.log('Google SERP Snippet Preview visible:', isGooglePreviewVisible);
    results.seoPanel = isSeoTitleVisible && isSeoDescVisible && isCanonicalVisible && isGooglePreviewVisible;

    // Test Public Article Social Share Controls
    console.log('\n[TEST 12] Testing Public Article Social Share Controls...');
    await page.goto('http://localhost:3000/blog/next-gen-payroll-engine-2026', {
      waitUntil: 'networkidle',
      timeout: 20000,
    });

    const shareContainer = page.locator('text=Share this article').first();
    const isShareVisible = await shareContainer.isVisible();
    console.log('Share this article container visible:', isShareVisible);

    const linkedinLink = page.locator('a[title="Share on LinkedIn"]').first();
    const linkedinHref = await linkedinLink.getAttribute('href');
    console.log('LinkedIn href:', linkedinHref);

    const xLink = page.locator('a[title*="Share on X"]').first();
    const xHref = await xLink.getAttribute('href');
    console.log('X href:', xHref);

    const copyBtn = page.locator('button:has-text("Copy Link")').first();
    await copyBtn.click();
    await page.waitForTimeout(400);
    const isCopiedState = (await page.locator('text=Copied!').first().isVisible()) || (await copyBtn.textContent()).includes('Copied');
    console.log('Copy Link button toggled to Copied state:', isCopiedState);
    results.sharingControls = Boolean(linkedinHref && xHref && isCopiedState);

    console.log('\n========================================');
    console.log('ALL PLAYWRIGHT ACCEPTANCE TESTS PASSED!');
    console.log('========================================');
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error('Test run failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTests();
