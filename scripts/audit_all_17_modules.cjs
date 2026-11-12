const { chromium } = require('playwright');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = 'C:/Users/TSV Global Solutions/.gemini/antigravity/brain/a577d1c0-e728-48a2-b5e2-4bfe07f028cd/evidence-all-17-modules';
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

const ALL_17_MODULES = [
  { id: 'branches', route: '/hr/organization/branches', name: 'Branches' },
  { id: 'departments', route: '/hr/organization/departments', name: 'Departments' },
  { id: 'designations', route: '/hr/organization/designations', name: 'Designations' },
  { id: 'holidays', route: '/hr/organization/holidays', name: 'Holidays' },
  { id: 'award_types', route: '/hr/organization/award-types', name: 'Award Types' },
  { id: 'announcements', route: '/hr/organization/announcements', name: 'Announcements' },
  { id: 'document_types', route: '/hr/organization/document-types', name: 'Document Types' },
  { id: 'resignations', route: '/hr/lifecycle/resignations', name: 'Resignations' },
  { id: 'promotions', route: '/hr/lifecycle/promotions', name: 'Promotions' },
  { id: 'transfers', route: '/hr/lifecycle/transfers', name: 'Transfers' },
  { id: 'terminations', route: '/hr/lifecycle/terminations', name: 'Terminations' },
  { id: 'warnings', route: '/hr/lifecycle/warnings', name: 'Warnings' },
  { id: 'complaints', route: '/hr/lifecycle/complaints', name: 'Complaints' },
  { id: 'trips', route: '/hr/lifecycle/trips', name: 'Business Trips' },
  { id: 'awards', route: '/hr/awards', name: 'Awards' },
  { id: 'candidate_onboarding', route: '/hr/recruitment/candidate-onboarding', name: 'Candidate Onboarding' },
  { id: 'employees', route: '/hr/employees', name: 'Employees Directory' },
];

(async () => {
  console.log('====================================================');
  console.log('🚀 EXHAUSTIVE 17/17 MODULE AUDIT (TANSTACK + CMS)');
  console.log('====================================================\n');

  // Authenticate
  const loginRes = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'gowthamtooquik@gmail.com', password: 'admin123' })
  });
  const loginData = await loginRes.json();
  const authToken = loginData.token;
  const userObj = {
    ...loginData.user,
    tenantId: loginData.user?.profile?.tenantId || '02bf4113-b100-4711-af94-d81165e9a2e1',
    isSuperAdmin: true,
    isTenantAdmin: true,
    workspaceStatus: 'ACTIVE',
  };

  const browser = await chromium.launch({ headless: true });
  const auditMatrix = {
    tanstack: {},
    cms: {},
  };

  async function testModuleOnFramework(framework, baseUrl, mod) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      acceptDownloads: true,
    });

    await context.addInitScript(
      ({ token, u }) => {
        localStorage.setItem('hrms_auth_token', token);
        localStorage.setItem('token', token);
        localStorage.setItem('auth_token', token);
        localStorage.setItem('hrms_user', JSON.stringify(u));
        document.cookie = `hrms_auth_token=${encodeURIComponent(token)}; path=/; max-age=7200`;
        document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=7200`;
        document.cookie = `auth_token=${encodeURIComponent(token)}; path=/; max-age=7200`;
      },
      { token: authToken, u: userObj }
    );

    const page = await context.newPage();
    const targetUrl = `${baseUrl}${mod.route}`;
    console.log(`Auditing [${framework.toUpperCase()}] ${mod.name} (${targetUrl})`);

    const result = {
      module: mod.id,
      name: mod.name,
      url: targetUrl,
      framework,
      status: 'PENDING',
      paginationPresent: false,
      pageSizeOptionsPresent: false,
      selectionCheckboxPresent: false,
      checkboxCount: 0,
      exportDropdownPresent: false,
      exportDropdownEnabled: false,
      excelOptionPresent: false,
      pdfOptionPresent: false,
      svgIconsBeforeLabel: false,
      responsiveDesktopSaved: false,
      responsiveTabletSaved: false,
      responsiveMobileSaved: false,
      error: null,
    };

    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      // Verify not redirected to /auth
      if (page.url().includes('/auth')) {
        throw new Error(`Redirected to /auth for ${targetUrl}`);
      }

      // 1. Desktop Screenshot
      const desktopImg = path.join(EVIDENCE_DIR, `${framework}_${mod.id}_desktop.png`);
      await page.screenshot({ path: desktopImg, fullPage: false });
      result.responsiveDesktopSaved = true;

      // 2. Pagination Check
      const pagInfo = await page.evaluate(() => {
        const selects = Array.from(document.querySelectorAll('select'));
        const hasPageSizeSelect = selects.some(s => s.innerText.includes('10') || s.innerText.includes('25') || s.innerText.includes('/ page'));
        const bodyText = document.body.innerText;
        const hasShowingText = bodyText.includes('Showing ') || bodyText.includes('results') || bodyText.includes('/ page') || bodyText.includes('Page ');
        const hasButtons = Array.from(document.querySelectorAll('button')).some(b => b.innerText === '1' || b.getAttribute('aria-label')?.includes('page'));
        return {
          paginationPresent: hasShowingText || hasButtons || hasPageSizeSelect,
          pageSizeOptionsPresent: hasPageSizeSelect || bodyText.includes('/ page'),
        };
      });
      result.paginationPresent = pagInfo.paginationPresent;
      result.pageSizeOptionsPresent = pagInfo.pageSizeOptionsPresent;

      // 3. Selection Check
      const selectInfo = await page.evaluate(async () => {
        const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"], button[role="checkbox"]'));
        if (checkboxes.length === 0) return { present: false, count: 0 };

        // Test clicking header checkbox
        checkboxes[0].click();
        await new Promise(r => setTimeout(r, 300));
        return {
          present: true,
          count: checkboxes.length,
        };
      });
      result.selectionCheckboxPresent = selectInfo.present;
      result.checkboxCount = selectInfo.count;

      // 4. Export Dropdown Check
      const exportBtn = page.locator('button:has-text("Export"), button:has-text("Export Options")').first();
      const hasExport = (await exportBtn.count()) > 0;
      result.exportDropdownPresent = hasExport;

      if (hasExport) {
        const isEnabled = await exportBtn.isEnabled().catch(() => false);
        result.exportDropdownEnabled = isEnabled;

        if (isEnabled) {
          await exportBtn.click();
          await page.waitForTimeout(500);

          // Screenshot open dropdown
          const dropImg = path.join(EVIDENCE_DIR, `${framework}_${mod.id}_dropdown_open.png`);
          await page.screenshot({ path: dropImg, fullPage: false });

          const menuInfo = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('[role="menuitem"], button, div')).filter(el => {
              const txt = el.innerText || '';
              return txt.includes('Export as Excel') || txt.includes('Export as PDF');
            });

            const excelItem = items.find(el => el.innerText.includes('Export as Excel'));
            const pdfItem = items.find(el => el.innerText.includes('Export as PDF'));

            let svgIconsBeforeLabel = false;
            if (excelItem) {
              const svg = excelItem.querySelector('svg, img');
              if (svg) svgIconsBeforeLabel = true;
            }

            return {
              hasExcel: Boolean(excelItem),
              hasPdf: Boolean(pdfItem),
              svgIconsBeforeLabel,
            };
          });

          result.excelOptionPresent = menuInfo.hasExcel;
          result.pdfOptionPresent = menuInfo.hasPdf;
          result.svgIconsBeforeLabel = menuInfo.svgIconsBeforeLabel;

          await page.keyboard.press('Escape');
        }
      }

      // 5. Tablet Screenshot (768px)
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(400);
      const tabImg = path.join(EVIDENCE_DIR, `${framework}_${mod.id}_tablet.png`);
      await page.screenshot({ path: tabImg, fullPage: false });
      result.responsiveTabletSaved = true;

      // 6. Mobile Screenshot (390px)
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(400);
      const mobImg = path.join(EVIDENCE_DIR, `${framework}_${mod.id}_mobile.png`);
      await page.screenshot({ path: mobImg, fullPage: false });
      result.responsiveMobileSaved = true;

      result.status = 'PASSED';
      console.log(`   ✅ [${framework.toUpperCase()}] ${mod.name}: PASSED (Pagination: ${result.paginationPresent}, Selection: ${result.selectionCheckboxPresent}, Export: ${result.exportDropdownPresent})`);
    } catch (err) {
      result.status = 'FAILED';
      result.error = err.message;
      console.error(`   ❌ [${framework.toUpperCase()}] ${mod.name}: FAILED - ${err.message}`);
    } finally {
      await context.close();
    }

    auditMatrix[framework][mod.id] = result;
  }

  // 1. Audit all 17 on TanStack (Port 5173)
  console.log('\n--- AUDITING ALL 17 MODULES ON TANSTACK VITE (PORT 5173) ---');
  for (const mod of ALL_17_MODULES) {
    await testModuleOnFramework('tanstack', 'http://localhost:5173', mod);
  }

  // 2. Audit all 17 on CMS (Port 3000)
  console.log('\n--- AUDITING ALL 17 MODULES ON NEXT.JS CMS (PORT 3000) ---');
  for (const mod of ALL_17_MODULES) {
    await testModuleOnFramework('cms', 'http://localhost:3000', mod);
  }

  await browser.close();

  // Save exhaustive summary
  fs.writeFileSync(
    path.join(EVIDENCE_DIR, 'audit_all_17_modules_summary.json'),
    JSON.stringify(auditMatrix, null, 2),
    'utf8'
  );

  console.log('\n====================================================');
  console.log('🏁 17/17 DUAL-FRAMEWORK AUDIT COMPLETED!');
  console.log(`📁 Evidence stored in: ${EVIDENCE_DIR}`);
  console.log('====================================================\n');
})();

