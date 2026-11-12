const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = 'C:/Users/TSV Global Solutions/.gemini/antigravity/brain/a577d1c0-e728-48a2-b5e2-4bfe07f028cd/evidence-all-17-modules';

(async () => {
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

  async function verifyPage(framework, url, name, id) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(({ token, u }) => {
      localStorage.setItem('hrms_auth_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('auth_token', token);
      localStorage.setItem('hrms_user', JSON.stringify(u));
      document.cookie = `hrms_auth_token=${encodeURIComponent(token)}; path=/; max-age=7200`;
      document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=7200`;
    }, { token: authToken, u: userObj });

    const page = await ctx.newPage();
    console.log(`Verifying [${framework.toUpperCase()}] ${name} at ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    const hasTable = (await page.$$('table')).length > 0;
    const chks = await page.$$('input[type="checkbox"]');
    const hasPagination = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Showing ') || text.includes('/ page') || text.includes('Page ') || text.includes('of ');
    });
    const exportBtn = await page.$('button:has-text("Export")');

    // Click export button to verify dropdown opens
    let hasExcel = false;
    let hasPdf = false;
    if (exportBtn) {
      await exportBtn.click();
      await page.waitForTimeout(500);
      hasExcel = (await page.$$('text="Export as Excel"')).length > 0 || (await page.$$('text="Excel"')).length > 0;
      hasPdf = (await page.$$('text="Export as PDF"')).length > 0 || (await page.$$('text="PDF"')).length > 0;
    }

    const screenshotPath = path.join(EVIDENCE_DIR, `${framework}_${id}_verified.png`);
    await page.screenshot({ path: screenshotPath });

    console.log(`  -> Table: ${hasTable}, Checkboxes: ${chks.length}, Pagination: ${hasPagination}, Export: ${!!exportBtn}, Excel: ${hasExcel}, PDF: ${hasPdf}`);
    await ctx.close();
    return { hasTable, chks: chks.length, hasPagination, hasExport: !!exportBtn, hasExcel, hasPdf };
  }

  const tanstackBranches = await verifyPage('tanstack', 'http://localhost:5173/hr/organization/branches', 'Branches', 'branches');
  const cmsEmployees = await verifyPage('cms', 'http://localhost:3000/hr/employees', 'Employees Directory', 'employees');

  // Update summary JSON
  const summaryPath = path.join(EVIDENCE_DIR, 'audit_all_17_modules_summary.json');
  if (fs.existsSync(summaryPath)) {
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    if (summary.tanstack && summary.tanstack.branches) {
      summary.tanstack.branches.paginationPresent = tanstackBranches.hasPagination;
      summary.tanstack.branches.selectionCheckboxPresent = tanstackBranches.chks > 0;
      summary.tanstack.branches.checkboxCount = tanstackBranches.chks;
      summary.tanstack.branches.exportDropdownPresent = tanstackBranches.hasExport;
      summary.tanstack.branches.excelOptionPresent = tanstackBranches.hasExcel;
      summary.tanstack.branches.pdfOptionPresent = tanstackBranches.hasPdf;
    }
    if (summary.cms && summary.cms.employees) {
      summary.cms.employees.paginationPresent = cmsEmployees.hasPagination;
      summary.cms.employees.selectionCheckboxPresent = cmsEmployees.chks > 0;
      summary.cms.employees.checkboxCount = cmsEmployees.chks;
      summary.cms.employees.exportDropdownPresent = cmsEmployees.hasExport;
      summary.cms.employees.excelOptionPresent = cmsEmployees.hasExcel;
      summary.cms.employees.pdfOptionPresent = cmsEmployees.hasPdf;
    }
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log('Updated summary JSON with verified results!');
  }

  await browser.close();
})();

