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

const evidenceDir = path.resolve(__dirname, '../docs/hrms-audit/evidence/org-tree');
if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

function normalizeFont(fontFamily) {
  if (!fontFamily) return '';
  return fontFamily.toLowerCase();
}

function isPublicSans(fontFamily) {
  const norm = normalizeFont(fontFamily);
  return norm.includes('public sans');
}

async function runTypographyAudit(baseUrl = 'http://localhost:3000') {
  console.log(`\n======================================================`);
  console.log(`🔤 MASTERHRMS — ORGANIZATION TREE TYPOGRAPHY & HEADING AUDIT`);
  console.log(`Target: ${baseUrl}/hr/organization/tree`);
  console.log(`======================================================`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const auditResults = {
    headingIconRemoved: false,
    headingTextMatches: false,
    desktopFonts: {},
    portalFonts: {},
    mobileFonts: {},
    screenshots: []
  };

  // 1. DESKTOP AUDIT (1280x800)
  console.log(`\n--- 1. Desktop Typography & Heading Icon Audit (1280x800) ---`);
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2
  });

  await desktopContext.addInitScript(({ token, user }) => {
    localStorage.setItem('hrms_auth_token', token);
    localStorage.setItem('token', token);
    localStorage.setItem('hrms_user', JSON.stringify(user));
  }, { token: defaultToken, user: defaultUser });

  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto(`${baseUrl}/hr/organization/tree`, { waitUntil: 'networkidle', timeout: 35000 });
  await desktopPage.waitForTimeout(2000);

  // Check Heading & Icon Removal
  const headingInfo = await desktopPage.evaluate(() => {
    const h1 = document.querySelector('h1');
    if (!h1) return { found: false };

    const parent = h1.parentElement;
    // Check if an icon wrapper exists inside the title container before h1
    const iconWrapper = parent?.querySelector('div.size-8, div.flex.size-8');
    const computed = window.getComputedStyle(h1);
    return {
      found: true,
      text: h1.textContent?.trim(),
      hasLeadingIcon: !!iconWrapper,
      fontFamily: computed.fontFamily,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight
    };
  });

  console.log(`Heading found:`, headingInfo.found ? 'YES' : 'NO');
  console.log(`Heading text: "${headingInfo.text}" (Expected: "Organization Tree")`);
  console.log(`Heading has leading decorative icon:`, headingInfo.hasLeadingIcon ? 'FAIL (Icon still present)' : 'PASS (Icon removed)');
  console.log(`Heading computed font-family: ${headingInfo.fontFamily}`);

  auditResults.headingTextMatches = headingInfo.text === 'Organization Tree';
  auditResults.headingIconRemoved = !headingInfo.hasLeadingIcon;
  auditResults.desktopFonts.heading = headingInfo.fontFamily;

  // Screenshot 1: Heading Area
  const headingEl = await desktopPage.$('h1');
  const headingContainer = await headingEl?.evaluateHandle(el => el.closest('.border-b') || el.parentElement);
  const headingScreenshot = path.join(evidenceDir, 'typography_heading.png');
  if (headingContainer) {
    await headingContainer.asElement()?.screenshot({ path: headingScreenshot });
  } else {
    await desktopPage.screenshot({ path: headingScreenshot, clip: { x: 0, y: 0, width: 800, height: 250 } });
  }
  console.log(`Saved heading screenshot: ${headingScreenshot}`);
  auditResults.screenshots.push('typography_heading.png');

  // Main Page Components Font Check
  const mainPageFonts = await desktopPage.evaluate(() => {
    const getFont = el => el ? window.getComputedStyle(el).fontFamily : 'NOT_FOUND';
    return {
      body: getFont(document.body),
      searchInput: getFont(document.querySelector('input[placeholder*="Search"]')),
      selectTrigger: getFont(document.querySelector('[role="combobox"]')),
      toolbarLabel: getFont(document.querySelector('.border-t span.font-medium')),
      empCardName: getFont(document.querySelector('[data-node-id] h4')),
      empCardTitle: getFont(document.querySelector('[data-node-id] p')),
      empCardCode: getFont(document.querySelector('[data-node-id] span.tracking-tight')),
      canvasRoot: getFont(document.querySelector('[data-testid="org-canvas-transform"]'))
    };
  });

  console.log(`\nMain Page Elements Font Check:`);
  Object.entries(mainPageFonts).forEach(([key, font]) => {
    const ok = isPublicSans(font);
    console.log(`  ${key}: ${ok ? 'PASS' : 'FAIL'} ("${font}")`);
    auditResults.desktopFonts[key] = font;
  });

  // Check 2: Filter Select Popup (Portal Rendering)
  console.log(`\nTesting Filter Dropdown Popup (Portal Rendering)...`);
  const firstSelect = await desktopPage.$('[role="combobox"]');
  if (firstSelect) {
    await firstSelect.click();
    await desktopPage.waitForTimeout(500);

    const popupFont = await desktopPage.evaluate(() => {
      const content = document.querySelector('[role="listbox"]') || document.querySelector('[data-radix-popper-content-wrapper]');
      const item = document.querySelector('[role="option"]');
      return {
        wrapper: content ? window.getComputedStyle(content).fontFamily : 'NOT_FOUND',
        item: item ? window.getComputedStyle(item).fontFamily : 'NOT_FOUND'
      };
    });

    console.log(`  Filter Popup Content Font: ${isPublicSans(popupFont.wrapper) ? 'PASS' : 'FAIL'} ("${popupFont.wrapper}")`);
    console.log(`  Filter Popup Option Font: ${isPublicSans(popupFont.item) ? 'PASS' : 'FAIL'} ("${popupFont.item}")`);
    auditResults.portalFonts.filterPopup = popupFont;

    // Screenshot 2: Filter Popup
    const filterPopupScreenshot = path.join(evidenceDir, 'typography_filter_popup.png');
    await desktopPage.screenshot({ path: filterPopupScreenshot });
    console.log(`Saved filter popup screenshot: ${filterPopupScreenshot}`);
    auditResults.screenshots.push('typography_filter_popup.png');

    // Close select (press Escape)
    await desktopPage.keyboard.press('Escape');
    await desktopPage.waitForTimeout(400);
  }

  // Check 3: Employee Details Drawer
  console.log(`\nTesting Employee Details Drawer...`);
  const empCard = await desktopPage.$('[data-node-id="emp-demo-001"]');
  if (empCard) {
    await empCard.scrollIntoViewIfNeeded();
    await empCard.click();
    await desktopPage.waitForSelector('text=Organizational Placement', { timeout: 8000 });
    await desktopPage.waitForTimeout(500);

    const drawerFonts = await desktopPage.evaluate(() => {
      const getFont = el => el ? window.getComputedStyle(el).fontFamily : 'NOT_FOUND';
      const drawer = document.querySelector('[role="dialog"]');
      return {
        drawerContainer: getFont(drawer),
        title: getFont(drawer?.querySelector('h2, [data-testid="sheet-title"]') || drawer?.querySelector('h4')),
        codeBadge: getFont(drawer?.querySelector('.tracking-tight')),
        actionBtn: getFont(drawer?.querySelector('a[href*="/hr/employees/"]'))
      };
    });

    console.log(`  Drawer Container Font: ${isPublicSans(drawerFonts.drawerContainer) ? 'PASS' : 'FAIL'} ("${drawerFonts.drawerContainer}")`);
    console.log(`  Drawer Title Font: ${isPublicSans(drawerFonts.title) ? 'PASS' : 'FAIL'} ("${drawerFonts.title}")`);
    console.log(`  Drawer Code Badge Font: ${isPublicSans(drawerFonts.codeBadge) ? 'PASS' : 'FAIL'} ("${drawerFonts.codeBadge}")`);
    console.log(`  Drawer Action Button Font: ${isPublicSans(drawerFonts.actionBtn) ? 'PASS' : 'FAIL'} ("${drawerFonts.actionBtn}")`);
    auditResults.portalFonts.employeeDrawer = drawerFonts;

    // Screenshot 3: Employee Drawer
    const employeeDrawerScreenshot = path.join(evidenceDir, 'typography_employee_drawer.png');
    await desktopPage.screenshot({ path: employeeDrawerScreenshot });
    console.log(`Saved employee drawer screenshot: ${employeeDrawerScreenshot}`);
    auditResults.screenshots.push('typography_employee_drawer.png');

    // Close drawer
    await desktopPage.keyboard.press('Escape');
    await desktopPage.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 5000 }).catch(() => {});
    await desktopPage.waitForTimeout(400);
  }

  // Check 4: Confirmation Modal
  console.log(`\nTesting Confirmation Modal (AlertDialog)...`);
  // Trigger filter to make activeFilterCount > 0
  const deptSelect = await desktopPage.$('[role="combobox"]');
  if (deptSelect) {
    await deptSelect.click();
    await desktopPage.waitForTimeout(400);
    const engineeringOption = await desktopPage.$('[role="option"]:has-text("Engineering")');
    if (engineeringOption) {
      await engineeringOption.click();
      await desktopPage.waitForTimeout(600);
    }
  }

  // Click "Reset All" to trigger Confirmation Dialog
  const resetAllBtn = await desktopPage.$('button:has-text("Reset All")');
  if (resetAllBtn) {
    await resetAllBtn.click();
    await desktopPage.waitForSelector('[role="alertdialog"]', { timeout: 6000 });
    await desktopPage.waitForTimeout(400);

    const modalFonts = await desktopPage.evaluate(() => {
      const getFont = el => el ? window.getComputedStyle(el).fontFamily : 'NOT_FOUND';
      const modal = document.querySelector('[role="alertdialog"]');
      const buttons = Array.from(modal?.querySelectorAll('button') || []);
      const confirmBtnEl = buttons.find(b => b.textContent.includes('Reset Filters'));
      const cancelBtnEl = buttons.find(b => b.textContent.includes('Keep Filters'));
      return {
        container: getFont(modal),
        title: getFont(modal?.querySelector('h2')),
        description: getFont(modal?.querySelector('p')),
        confirmBtn: getFont(confirmBtnEl),
        cancelBtn: getFont(cancelBtnEl)
      };
    });

    console.log(`  Modal Container Font: ${isPublicSans(modalFonts.container) ? 'PASS' : 'FAIL'} ("${modalFonts.container}")`);
    console.log(`  Modal Title Font: ${isPublicSans(modalFonts.title) ? 'PASS' : 'FAIL'} ("${modalFonts.title}")`);
    console.log(`  Modal Description Font: ${isPublicSans(modalFonts.description) ? 'PASS' : 'FAIL'} ("${modalFonts.description}")`);
    console.log(`  Modal Confirm Button Font: ${isPublicSans(modalFonts.confirmBtn) ? 'PASS' : 'FAIL'} ("${modalFonts.confirmBtn}")`);
    auditResults.portalFonts.confirmationModal = modalFonts;

    // Screenshot 4: Confirmation Modal
    const modalScreenshot = path.join(evidenceDir, 'typography_confirmation_modal.png');
    await desktopPage.screenshot({ path: modalScreenshot });
    console.log(`Saved confirmation modal screenshot: ${modalScreenshot}`);
    auditResults.screenshots.push('typography_confirmation_modal.png');

    // Confirm dialog
    const confirmBtn = await desktopPage.$('button:has-text("Reset Filters")');
    if (confirmBtn) {
      await confirmBtn.click();
      await desktopPage.waitForSelector('[role="alertdialog"]', { state: 'detached', timeout: 5000 }).catch(() => {});
      await desktopPage.waitForTimeout(500);
    }
  }

  // Check 5: Initial Loading State Screenshot
  console.log(`\nTesting Loading State Typography...`);
  // Trigger a fast simulated loading state by clicking Refresh
  const refreshBtn = await desktopPage.$('button:has-text("Refresh")');
  if (refreshBtn) {
    await refreshBtn.click();
    // Immediate capture during spin/loading state
    const loadingScreenshot = path.join(evidenceDir, 'typography_initial_loading.png');
    await desktopPage.screenshot({ path: loadingScreenshot });
    console.log(`Saved initial/refresh loading screenshot: ${loadingScreenshot}`);
    auditResults.screenshots.push('typography_initial_loading.png');
    await desktopPage.waitForTimeout(1500);
  }

  await desktopContext.close();

  // 2. MOBILE AUDIT (390x844)
  console.log(`\n--- 2. Mobile Typography & Bottom Sheet Audit (390x844) ---`);
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

  await mobileContext.addInitScript(({ token, user }) => {
    localStorage.setItem('hrms_auth_token', token);
    localStorage.setItem('token', token);
    localStorage.setItem('hrms_user', JSON.stringify(user));
  }, { token: defaultToken, user: defaultUser });

  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(`${baseUrl}/hr/organization/tree`, { waitUntil: 'networkidle', timeout: 35000 });
  await mobilePage.waitForTimeout(2000);

  // Mobile Heading check
  const mobileHeadingInfo = await mobilePage.evaluate(() => {
    const h1 = document.querySelector('h1');
    const parent = h1?.parentElement;
    const iconWrapper = parent?.querySelector('div.size-8, div.flex.size-8');
    return {
      text: h1?.textContent?.trim(),
      hasLeadingIcon: !!iconWrapper,
      fontFamily: h1 ? window.getComputedStyle(h1).fontFamily : 'NOT_FOUND'
    };
  });
  console.log(`Mobile Heading: "${mobileHeadingInfo.text}", hasLeadingIcon: ${mobileHeadingInfo.hasLeadingIcon}, font: ${mobileHeadingInfo.fontFamily}`);

  // Mobile Floating Toolbar font check
  const mobileToolbarFonts = await mobilePage.evaluate(() => {
    const toolbar = document.querySelector('[data-testid="mobile-chart-toolbar"]');
    const getFont = el => el ? window.getComputedStyle(el).fontFamily : 'NOT_FOUND';
    return {
      toolbar: getFont(toolbar),
      resetPercentBtn: getFont(toolbar?.querySelector('button[aria-label="Reset Zoom"]')),
      expandBtn: getFont(toolbar?.querySelector('button[aria-label*="Expand"], button[aria-label*="Collapse"]'))
    };
  });
  console.log(`Mobile Floating Toolbar Fonts:`, JSON.stringify(mobileToolbarFonts, null, 2));

  // Open Mobile Filter Sheet
  const mobileFilterBtn = await mobilePage.$('button[aria-label="Open Filters"]');
  if (mobileFilterBtn) {
    await mobileFilterBtn.click();
    await mobilePage.waitForSelector('text=Filter Organization Hierarchy', { timeout: 8000 });
    await mobilePage.waitForTimeout(500);

    const sheetFonts = await mobilePage.evaluate(() => {
      const sheet = document.querySelector('[role="dialog"]');
      const getFont = el => el ? window.getComputedStyle(el).fontFamily : 'NOT_FOUND';
      const buttons = Array.from(sheet?.querySelectorAll('button') || []);
      const applyBtnEl = buttons.find(b => b.textContent.includes('Apply Filters'));
      const resetBtnEl = buttons.find(b => b.textContent.includes('Reset'));
      return {
        container: getFont(sheet),
        title: getFont(sheet?.querySelector('h2')),
        label: getFont(sheet?.querySelector('label')),
        applyBtn: getFont(applyBtnEl),
        resetBtn: getFont(resetBtnEl)
      };
    });

    console.log(`Mobile Filter Sheet Fonts:`, JSON.stringify(sheetFonts, null, 2));
    auditResults.mobileFonts.filterSheet = sheetFonts;

    // Screenshot 5: Mobile Toolbar and Bottom Sheet
    const mobileScreenshot = path.join(evidenceDir, 'typography_mobile_toolbar_bottomsheet.png');
    await mobilePage.screenshot({ path: mobileScreenshot });
    console.log(`Saved mobile toolbar and bottom sheet screenshot: ${mobileScreenshot}`);
    auditResults.screenshots.push('typography_mobile_toolbar_bottomsheet.png');

    const applyBtn = await mobilePage.$('button:has-text("Apply Filters")');
    if (applyBtn) {
      await applyBtn.click();
      await mobilePage.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 5000 }).catch(() => {});
      await mobilePage.waitForTimeout(500);
    }
  }

  await mobileContext.close();
  await browser.close();

  console.log(`\n======================================================`);
  console.log(`✅ MASTERHRMS — TYPOGRAPHY & HEADING AUDIT COMPLETE`);
  console.log(`Screenshots captured: ${auditResults.screenshots.join(', ')}`);
  console.log(`======================================================`);
  return auditResults;
}

runTypographyAudit().catch(err => {
  console.error(`Typography Audit Error:`, err);
  process.exit(1);
});

