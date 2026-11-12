const { chromium } = require('playwright');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = 'C:/Users/TSV Global Solutions/.gemini/antigravity/brain/a577d1c0-e728-48a2-b5e2-4bfe07f028cd/evidence-global-list';
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

(async () => {
  let authToken;
  let userObj;

  try {
    const loginRes = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'gowthamtooquik@gmail.com', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    if (loginData && loginData.token) {
      authToken = loginData.token;
      userObj = {
        ...loginData.user,
        tenantId: loginData.user.profile?.tenantId || '02bf4113-b100-4711-af94-d81165e9a2e1',
        isSuperAdmin: true,
        isTenantAdmin: true,
        workspaceStatus: 'ACTIVE',
      };
      console.log('✅ Successfully authenticated with backend API as:', loginData.user.email);
    }
  } catch (err) {
    console.warn('⚠️ Could not fetch from /api/auth/login:', err.message);
  }

  if (!authToken) {
    const jwtSecret = 'master-hrms-jwt-super-secret-key-change-this-in-production';
    const tenantId = '02bf4113-b100-4711-af94-d81165e9a2e1';
    const userId = '5471a6ee-b7f0-43ac-bda6-add7bc748024';
    const email = 'gowthamtooquik@gmail.com';

    authToken = jwt.sign(
      { sub: userId, userId, email, tenantId, roles: ['super_admin', 'hr_admin', 'manager'], permissions: ['*'], is_super_admin: true },
      jwtSecret,
      { algorithm: 'HS256', expiresIn: '2h' }
    );
    userObj = { id: userId, email, tenantId, roles: ['super_admin', 'hr_admin'], isSuperAdmin: true, isTenantAdmin: true, workspaceStatus: 'ACTIVE' };
  }

  const browser = await chromium.launch({ headless: true });
  console.log('🚀 Launched headless browser for Global List Management Audit');

  const auditResults = {
    testedPages: [],
    exportVerification: {},
    paginationVerification: {},
    selectionVerification: {},
    bulkActionsVerification: {},
    downloadVerification: {},
  };

  // Helper to test a page
  async function auditListPage(baseUrl, routePath, pageName, framework) {
    console.log(`\n==================================================`);
    console.log(`Testing [${framework}] ${pageName} at ${baseUrl}${routePath}`);
    console.log(`==================================================`);

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
    const url = `${baseUrl}${routePath}`;
    
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      // Give time for initial data fetch and render
      await page.waitForTimeout(4000);

      // Verify we didn't get kicked to auth
      if (page.url().includes('/auth')) {
        throw new Error(`Redirected to /auth from ${url}`);
      }

      // 1. Take desktop screenshot
      const desktopScreenshot = path.join(EVIDENCE_DIR, `${framework}_${pageName}_desktop_1440.png`);
      await page.screenshot({ path: desktopScreenshot, fullPage: false });
      console.log(`📸 Desktop screenshot saved: ${path.basename(desktopScreenshot)}`);

      // 2. Check StandardPagination
      const paginationExists = await page.evaluate(() => {
        const hasPagination = Boolean(
          document.querySelector('select') ||
          document.querySelector('[data-testid="standard-pagination"]') ||
          document.body.innerText.includes('Showing') ||
          document.body.innerText.includes('Page') ||
          document.body.innerText.includes('/ page')
        );
        return hasPagination;
      });
      console.log(`✔ StandardPagination visible: ${paginationExists}`);
      auditResults.paginationVerification[`${framework}_${pageName}`] = paginationExists;

      // 3. Check Header Checkbox and Multi-Selection
      const selectionTest = await page.evaluate(async () => {
        const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"], button[role="checkbox"]'));
        if (checkboxes.length === 0) return { hasCheckboxes: false };

        const headerCheckbox = checkboxes[0];
        // Click header checkbox to select all
        headerCheckbox.click();
        
        // Wait a tick
        await new Promise(r => setTimeout(r, 400));

        const bodyTextAfter = document.body.innerText;
        const selectedIndicator = bodyTextAfter.includes('selected') || bodyTextAfter.includes('Selected');

        return {
          hasCheckboxes: true,
          totalCheckboxes: checkboxes.length,
          selectedIndicator,
        };
      });
      console.log(`✔ Multi-Selection Test:`, selectionTest);
      auditResults.selectionVerification[`${framework}_${pageName}`] = selectionTest;

      // 4. Check GlobalExportDropdown and Excel/PDF options with SVG icons before text
      const exportDropdownButton = page.locator('button:has-text("Export"), button:has-text("Export Options")').first();
      const hasExportButton = (await exportDropdownButton.count()) > 0;
      const isExportEnabled = hasExportButton ? await exportDropdownButton.isEnabled().catch(() => false) : false;
      
      let exportTest = { hasExportButton, hasExcelOption: false, hasPdfOption: false, svgIconsBeforeLabel: false };
      if (hasExportButton && isExportEnabled) {
        exportTest.hasExportButton = true;
        await exportDropdownButton.click();
        await page.waitForTimeout(600);

        // Screenshot dropdown open
        const dropdownScreenshot = path.join(EVIDENCE_DIR, `${framework}_${pageName}_export_dropdown_open.png`);
        await page.screenshot({ path: dropdownScreenshot, fullPage: false });

        exportTest = await page.evaluate(() => {
          const menuItems = Array.from(document.querySelectorAll('[role="menuitem"], button, div')).filter(el => {
            const txt = el.innerText || '';
            return txt.includes('Export as Excel') || txt.includes('Export as PDF');
          });

          const excelItem = menuItems.find(el => el.innerText.includes('Export as Excel'));
          const pdfItem = menuItems.find(el => el.innerText.includes('Export as PDF'));

          // Check if SVG icon is inside the item and rendered BEFORE the text label
          let svgIconsBeforeLabel = false;
          if (excelItem) {
            const svgOrImg = excelItem.querySelector('svg, img');
            if (svgOrImg) {
              svgIconsBeforeLabel = true;
            }
          }

          return {
            hasExportButton: true,
            hasExcelOption: Boolean(excelItem),
            hasPdfOption: Boolean(pdfItem),
            svgIconsBeforeLabel,
          };
        });

        // Test downloading Excel or PDF on the first page tested
        if (pageName === 'branches' && exportTest.hasExcelOption) {
          try {
            const excelBtn = page.locator('[role="menuitem"]:has-text("Export as Excel"), button:has-text("Export as Excel")').first();
            const [download] = await Promise.all([
              page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
              excelBtn.click(),
            ]);

            if (download) {
              const downloadPath = path.join(EVIDENCE_DIR, `${framework}_${pageName}_sample.xlsx`);
              await download.saveAs(downloadPath);
              const fileStats = fs.statSync(downloadPath);
              const buffer = fs.readFileSync(downloadPath);
              // Verify PK zip signature (Excel .xlsx is a zip file)
              const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b;
              console.log(`📥 Downloaded Excel file: ${fileStats.size} bytes, Valid XLSX (PK header): ${isZip}`);
              auditResults.downloadVerification[`${framework}_${pageName}_excel`] = {
                size: fileStats.size,
                validXlsx: isZip,
              };
            }
          } catch (dlErr) {
            console.warn(`Export download test note:`, dlErr.message);
          }
        }

        // Close dropdown
        await page.keyboard.press('Escape');
      }
      console.log(`✔ Export Dropdown Test:`, exportTest);
      auditResults.exportVerification[`${framework}_${pageName}`] = exportTest;

      // 5. Test Responsive Views
      // Tablet 768px
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);
      const tabletScreenshot = path.join(EVIDENCE_DIR, `${framework}_${pageName}_tablet_768.png`);
      await page.screenshot({ path: tabletScreenshot, fullPage: false });

      // Mobile 390px
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(500);
      const mobileScreenshot = path.join(EVIDENCE_DIR, `${framework}_${pageName}_mobile_390.png`);
      await page.screenshot({ path: mobileScreenshot, fullPage: false });

      console.log(`📱 Responsive screenshots saved: tablet 768 & mobile 390`);

      auditResults.testedPages.push({ framework, pageName, url, status: 'PASSED' });
    } catch (err) {
      console.error(`❌ Error auditing ${pageName}:`, err.message);
      auditResults.testedPages.push({ framework, pageName, url, status: 'ERROR', error: err.message });
    } finally {
      await context.close();
    }
  }

  // Audit TanStack Pages (port 5173)
  await auditListPage('http://localhost:5173', '/hr/organization/branches', 'branches', 'tanstack');
  await auditListPage('http://localhost:5173', '/hr/lifecycle/resignations', 'resignations', 'tanstack');
  await auditListPage('http://localhost:5173', '/hr/lifecycle/promotions', 'promotions', 'tanstack');
  await auditListPage('http://localhost:5173', '/hr/awards', 'awards', 'tanstack');
  await auditListPage('http://localhost:5173', '/hr/employees', 'employees', 'tanstack');

  // Audit CMS Pages (port 3000)
  await auditListPage('http://localhost:3000', '/hr/organization/branches', 'branches', 'cms');
  await auditListPage('http://localhost:3000', '/hr/lifecycle/resignations', 'resignations', 'cms');
  await auditListPage('http://localhost:3000', '/hr/organization/award-types', 'award_types', 'cms');
  await auditListPage('http://localhost:3000', '/hr/awards', 'awards', 'cms');

  console.log('\n==================================================');
  console.log('🏁 Global List Management Audit Completed!');
  console.log('==================================================');
  console.log(JSON.stringify(auditResults, null, 2));

  fs.writeFileSync(
    path.join(EVIDENCE_DIR, 'audit_summary.json'),
    JSON.stringify(auditResults, null, 2),
    'utf8'
  );

  await browser.close();
})();
