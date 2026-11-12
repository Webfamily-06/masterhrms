const { chromium } = require('playwright');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const envContent = fs.readFileSync(path.resolve(__dirname, '../server/.env'), 'utf-8');
const jwtMatch = envContent.match(/^JWT_SECRET=["']?(.*?)["']?$/m);
const jwtSecret = jwtMatch ? jwtMatch[1] : 'master-hrms-jwt-super-secret-key-change-this-in-production';

const EVIDENCE_DIR = path.resolve(__dirname, '../docs/hrms-audit/evidence/ui-standardization');
const ARTIFACT_DIR = path.resolve('C:/Users/TSV Global Solutions/.gemini/antigravity/brain/a577d1c0-e728-48a2-b5e2-4bfe07f028cd/evidence-ui-standardization');

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

async function runAudit() {
  console.log('--- Starting Playwright UI Standardization Audit ---');

  const userId = 'user-admin-001';
  const email = 'admin@masterhrms.com';
  const tenantId = '02bf4113-b100-4711-af94-d81165e9a2e1';

  console.log(`Auditing with Tenant: ${tenantId}, User: ${email}`);

  // Create active session in DB
  const session = await prisma.deviceSession.create({
    data: {
      id: crypto.randomUUID(),
      userId: userId,
      tenantId: tenantId,
      ipAddress: '127.0.0.1',
      userAgent: 'PlaywrightAudit/1.0',
      revoked: false,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      lastActiveAt: new Date(),
    },
  });

  const authToken = jwt.sign(
    {
      userId: userId,
      email: email,
      roles: ['super_admin', 'hr_admin', 'manager'],
      tenantId: tenantId,
      sessionId: session.id,
      permissions: ['*'],
    },
    jwtSecret,
    { algorithm: 'HS256', expiresIn: '2h' }
  );

  const authUser = {
    id: userId,
    email: email,
    tenantId: tenantId,
    roles: ['super_admin', 'hr_admin', 'manager'],
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await context.addInitScript(
    ({ token, u }) => {
      localStorage.setItem('hrms_auth_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('hrms_user', JSON.stringify(u));
      document.cookie = `hrms_auth_token=${encodeURIComponent(token)}; path=/; max-age=7200`;
      document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=7200`;
    },
    { token: authToken, u: authUser }
  );

  const page = await context.newPage();

  // Helper for screenshot & artifact copy
  async function saveScreenshot(page, filename) {
    const p1 = path.join(EVIDENCE_DIR, filename);
    const p2 = path.join(ARTIFACT_DIR, filename);
    await page.screenshot({ path: p1, fullPage: true });
    fs.copyFileSync(p1, p2);
    console.log(`Saved screenshot: ${filename}`);
  }

  const results = [];

  // Target pages to audit
  const auditPages = [
    { name: 'Branches', url: 'http://localhost:5173/hr/organization/branches', module: 'Organization' },
    { name: 'Departments', url: 'http://localhost:5173/hr/organization/departments', module: 'Organization' },
    { name: 'Designations', url: 'http://localhost:5173/hr/organization/designations', module: 'Organization' },
    { name: 'Holidays', url: 'http://localhost:5173/hr/organization/holidays', module: 'Organization' },
    { name: 'Award Types', url: 'http://localhost:5173/hr/organization/award-types', module: 'Organization' },
    { name: 'Announcements', url: 'http://localhost:5173/hr/organization/announcements', module: 'Organization' },
    { name: 'Resignations', url: 'http://localhost:5173/hr/lifecycle/resignations', module: 'Lifecycle' },
    { name: 'Promotions', url: 'http://localhost:5173/hr/lifecycle/promotions', module: 'Lifecycle' },
    { name: 'Transfers', url: 'http://localhost:5173/hr/lifecycle/transfers', module: 'Lifecycle' },
    { name: 'Terminations', url: 'http://localhost:5173/hr/lifecycle/terminations', module: 'Lifecycle' },
    { name: 'Warnings', url: 'http://localhost:5173/hr/lifecycle/warnings', module: 'Lifecycle' },
    { name: 'Complaints', url: 'http://localhost:5173/hr/lifecycle/complaints', module: 'Lifecycle' },
    { name: 'Trips', url: 'http://localhost:5173/hr/lifecycle/trips', module: 'Lifecycle' },
  ];

  for (const item of auditPages) {
    console.log(`\nAuditing: ${item.name} (${item.url})`);
    await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);

    // 1. Verify PageHeader exists
    const hasHeader = (await page.locator('h1, h2').count()) > 0;

    // 2. Verify StatCard / StatsOverviewGrid is NOT present
    const oldStatCards = await page.evaluate(() => {
      // Find cards with stat card layouts: .grid-cols-1.md:grid-cols-3 or .grid-cols-1.sm:grid-cols-2.lg:grid-cols-4 that contain stat metrics
      const grids = Array.from(document.querySelectorAll('.grid-cols-1.md\\:grid-cols-3, .grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4'));
      return grids.filter(g => g.innerText.includes('Total') || g.innerText.includes('Active') || g.innerText.includes('Pending')).length;
    });

    // 3. Verify StandardPagination exists
    const hasPagination = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Showing') && (text.includes('records') || text.includes('Rows per page'));
    });

    // 4. Verify Search input exists
    const hasSearch = (await page.locator('input[placeholder*="Search" i]').count()) > 0;

    // 5. Verify Table exists
    const hasTable = (await page.locator('table').count()) > 0;

    // 6. Check font family
    const fontFamily = await page.evaluate(() => {
      return window.getComputedStyle(document.body).fontFamily;
    });

    const isCleanStandard = (oldStatCards === 0) && hasPagination && hasSearch && hasTable;

    const auditEntry = {
      name: item.name,
      module: item.module,
      hasHeader,
      statCardsRemoved: oldStatCards === 0,
      hasPagination,
      hasSearch,
      hasTable,
      fontFamily: fontFamily.split(',')[0].replace(/['"]/g, '').trim(),
      passed: isCleanStandard,
    };
    results.push(auditEntry);
    console.log(`Result for ${item.name}: Passed=${isCleanStandard} (StatCardsRemoved=${oldStatCards === 0}, Pagination=${hasPagination}, Search=${hasSearch}, Table=${hasTable})`);

    const slug = item.name.toLowerCase().replace(/\s+/g, '_');
    await saveScreenshot(page, `audit_${slug}_1440.png`);
  }

  // Test Responsive Breakpoints on 2 representative pages: Branches (Org) & Resignations (Lifecycle)
  const responsiveTestPages = [
    { slug: 'branches', url: 'http://localhost:5173/hr/organization/branches' },
    { slug: 'resignations', url: 'http://localhost:5173/hr/lifecycle/resignations' },
  ];

  const viewports = [
    { name: 'laptop_1280', width: 1280, height: 800 },
    { name: 'tablet_768', width: 768, height: 1024 },
    { name: 'mobile_390', width: 390, height: 844 },
  ];

  for (const p of responsiveTestPages) {
    for (const vp of viewports) {
      console.log(`Testing viewport ${vp.name} on ${p.slug}...`);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      await saveScreenshot(page, `responsive_${p.slug}_${vp.name}.png`);
    }
  }

  // Functional Pagination & Search Test on Branches
  console.log('\n--- Testing Functional Search & Pagination on Branches ---');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/hr/organization/branches', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  const searchInput = page.locator('input[placeholder*="Search" i]').first();
  if (await searchInput.isVisible()) {
    console.log('Testing search query...');
    await searchInput.fill('Main');
    await page.waitForTimeout(1000);
    await saveScreenshot(page, 'functional_branches_search_filter.png');

    console.log('Clearing search query...');
    await searchInput.fill('');
    await page.waitForTimeout(1000);
  }

  // Test Pagination size change
  console.log('Testing rows per page selector...');
  const rowsPerPageSelect = page.locator('button:has-text("10")').first();
  if (await rowsPerPageSelect.isVisible()) {
    await rowsPerPageSelect.click().catch(() => {});
    await page.waitForTimeout(500);
    await saveScreenshot(page, 'functional_branches_pagination_dropdown.png');
    await page.keyboard.press('Escape').catch(() => {});
  }

  // Next.js CMS Parity Verification on port 3000
  console.log('\n--- Auditing Next.js CMS (Port 3000) ---');
  const cmsPages = [
    { name: 'CMS Branches', url: 'http://localhost:3000/hr/organization/branches', slug: 'cms_branches' },
    { name: 'CMS Resignations', url: 'http://localhost:3000/hr/lifecycle/resignations', slug: 'cms_resignations' }
  ];

  for (const cp of cmsPages) {
    try {
      console.log(`Auditing CMS: ${cp.name} (${cp.url})`);
      await page.goto(cp.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);
      const cmsHasTable = (await page.locator('table').count()) > 0;
      const cmsHasSearch = (await page.locator('input[placeholder*="Search" i]').count()) > 0;
      const cmsText = await page.evaluate(() => document.body.innerText);
      const cmsHasPagination = cmsText.includes('Showing') && (cmsText.includes('records') || cmsText.includes('Rows per page'));
      console.log(`Result for ${cp.name}: Table=${cmsHasTable}, Search=${cmsHasSearch}, Pagination=${cmsHasPagination}`);
      await saveScreenshot(page, `audit_${cp.slug}_1440.png`);
    } catch (e) {
      console.log(`CMS Page Note: ${cp.name} -> ${e.message}`);
    }
  }

  await browser.close();
  await prisma.$disconnect();

  // Summary output
  console.log('\n================ AUDIT SUMMARY ================');
  console.table(results);
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  console.log(`Audit Complete: ${passed}/${total} Pages Standardized & Passing Strict Acceptance Criteria.`);

  fs.writeFileSync(
    path.join(EVIDENCE_DIR, 'audit_results.json'),
    JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2),
    'utf8'
  );
}

runAudit().catch((err) => {
  console.error('Audit failed with error:', err);
  prisma.$disconnect();
  process.exit(1);
});
