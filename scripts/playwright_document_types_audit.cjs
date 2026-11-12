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

const evidenceDir = path.resolve(__dirname, '../docs/hrms-audit/evidence/document-types');
if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

const artifactEvidenceDir = path.resolve('C:/Users/TSV Global Solutions/.gemini/antigravity/brain/a577d1c0-e728-48a2-b5e2-4bfe07f028cd/evidence-document-types');
if (!fs.existsSync(artifactEvidenceDir)) {
  fs.mkdirSync(artifactEvidenceDir, { recursive: true });
}

async function runAudit() {
  console.log('--- STARTING PLAYWRIGHT DOCUMENT TYPES AUDIT ---');

  // 1. Get database user and tenant
  const emp = await prisma.employee.findFirst({
    where: { NOT: { userId: null } },
    include: { user: true, tenant: true },
  });
  if (!emp || !emp.user || !emp.tenant) {
    throw new Error('No valid employee record found in database');
  }

  const tenant = emp.tenant;
  const user = emp.user;

  console.log(`Auditing with Tenant: ${tenant.name} (${tenant.id}), User: ${user.email}`);

  // Create active session in DB
  const session = await prisma.deviceSession.create({
    data: {
      id: crypto.randomUUID(),
      userId: user.id,
      tenantId: tenant.id,
      ipAddress: '127.0.0.1',
      userAgent: 'PlaywrightAudit/1.0',
      revoked: false,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      lastActiveAt: new Date(),
    },
  });

  const authToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      roles: ['ADMIN'],
      tenantId: tenant.id,
      sessionId: session.id,
      permissions: ['hrm.employees.view', 'hrm.employees.manage'],
    },
    jwtSecret,
    { algorithm: 'HS256', expiresIn: '2h' }
  );

  const authUser = {
    id: user.id,
    email: user.email,
    tenantId: tenant.id,
    roles: ['ADMIN'],
  };

  const browser = await chromium.launch({
    headless: true,
  });

  try {
    // ----------------------------------------------------
    // 1. DESKTOP 1440px FULL AUDIT & CRUD WORKFLOW
    // ----------------------------------------------------
    console.log('\n[1/5] Testing Desktop (1440x900) - Initial State & CRUD Flow...');
    const context1440 = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    await context1440.addInitScript(
      ({ token, u }) => {
        localStorage.setItem('hrms_auth_token', token);
        localStorage.setItem('token', token);
        localStorage.setItem('hrms_user', JSON.stringify(u));
        document.cookie = `hrms_auth_token=${encodeURIComponent(token)}; path=/; max-age=7200`;
        document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=7200`;
      },
      { token: authToken, u: authUser }
    );

    const page = await context1440.newPage();
    const targetUrl = 'http://localhost:5173/hr/organization/document-types';
    console.log(`Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Screenshot 1: Desktop Initial View
    const shot1Path = path.join(evidenceDir, '01_desktop_1440_initial.png');
    const artShot1Path = path.join(artifactEvidenceDir, '01_desktop_1440_initial.png');
    await page.screenshot({ path: shot1Path, fullPage: true });
    fs.copyFileSync(shot1Path, artShot1Path);
    console.log('Saved Screenshot 1: Initial Desktop View');

    // 2. Perform Creation via Left Form
    console.log('\n[2/5] Creating New Document Type via Left Form...');
    const testDocName = `Vaccination Certificate ${Date.now()}`;
    await page.fill('#create-doc-name', testDocName);
    await page.fill(
      '#create-doc-description',
      'Official COVID-19 or occupational health vaccination certificate verified by municipal authorities.'
    );

    // Select Required
    await page.click('#create-doc-required');
    await page.waitForTimeout(300);
    await page.click('div[role="option"]:has-text("Required")');
    await page.waitForTimeout(300);

    // Submit
    await page.click('button[type="submit"]:has-text("Add Document Type")');
    await page.waitForTimeout(1500);

    // Screenshot 2: After Creation
    const shot2Path = path.join(evidenceDir, '02_desktop_after_create.png');
    const artShot2Path = path.join(artifactEvidenceDir, '02_desktop_after_create.png');
    await page.screenshot({ path: shot2Path, fullPage: true });
    fs.copyFileSync(shot2Path, artShot2Path);
    console.log('Saved Screenshot 2: After Document Type Creation');

    // 3. Test Search & Filter Tabs
    console.log('\n[3/5] Testing Search & Filter Segmented Controls...');
    await page.fill('input[placeholder="Search document types..."]', 'Vaccination');
    await page.click('button:has-text("Search")');
    await page.waitForTimeout(1000);

    const shot3Path = path.join(evidenceDir, '03_desktop_search_result.png');
    const artShot3Path = path.join(artifactEvidenceDir, '03_desktop_search_result.png');
    await page.screenshot({ path: shot3Path, fullPage: true });
    fs.copyFileSync(shot3Path, artShot3Path);
    console.log('Saved Screenshot 3: Search Results Filtered');

    // Reset search
    await page.click('button[title="Clear search"]');
    await page.waitForTimeout(1000);

    // Filter by Required
    await page.click('button:has-text("Required (")');
    await page.waitForTimeout(1000);
    const shot4Path = path.join(evidenceDir, '04_desktop_filter_required.png');
    const artShot4Path = path.join(artifactEvidenceDir, '04_desktop_filter_required.png');
    await page.screenshot({ path: shot4Path, fullPage: true });
    fs.copyFileSync(shot4Path, artShot4Path);
    console.log('Saved Screenshot 4: Filter Required Only');

    // Filter by Optional
    await page.click('button:has-text("Optional (")');
    await page.waitForTimeout(1000);
    const shot5Path = path.join(evidenceDir, '05_desktop_filter_optional.png');
    const artShot5Path = path.join(artifactEvidenceDir, '05_desktop_filter_optional.png');
    await page.screenshot({ path: shot5Path, fullPage: true });
    fs.copyFileSync(shot5Path, artShot5Path);
    console.log('Saved Screenshot 5: Filter Optional Only');

    // Switch back to All
    await page.click('button:has-text("All (")');
    await page.waitForTimeout(1000);

    // 4. Test Edit Modal
    console.log('\n[4/5] Testing Edit Modal...');
    // Find row for our test doc
    const editBtn = page.locator(`tr:has-text("${testDocName}") button:has-text("Edit")`).first();
    await editBtn.click();
    await page.waitForTimeout(800);

    // Screenshot 6: Edit Modal Open
    const shot6Path = path.join(evidenceDir, '06_edit_modal.png');
    const artShot6Path = path.join(artifactEvidenceDir, '06_edit_modal.png');
    await page.screenshot({ path: shot6Path });
    fs.copyFileSync(shot6Path, artShot6Path);
    console.log('Saved Screenshot 6: Edit Modal');

    // Change requirement to Optional
    await page.click('#edit-doc-required');
    await page.waitForTimeout(300);
    await page.click('div[role="option"]:has-text("Optional")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(1500);

    // 5. Test Delete Modal
    console.log('\n[5/5] Testing Delete Confirmation Dialog...');
    const deleteBtn = page.locator(`tr:has-text("${testDocName}") button:has-text("Delete")`).first();
    await deleteBtn.click();
    await page.waitForTimeout(800);

    // Screenshot 7: Delete Dialog
    const shot7Path = path.join(evidenceDir, '07_delete_dialog.png');
    const artShot7Path = path.join(artifactEvidenceDir, '07_delete_dialog.png');
    await page.screenshot({ path: shot7Path });
    fs.copyFileSync(shot7Path, artShot7Path);
    console.log('Saved Screenshot 7: Delete Confirmation Dialog');

    // Confirm Delete
    await page.click('div[role="dialog"] button:has-text("Delete Document Type")');
    await page.waitForTimeout(1500);

    await context1440.close();

    // ----------------------------------------------------
    // RESPONSIVE VIEWPORT SCREENSHOTS (1280px, 768px, 390px)
    // ----------------------------------------------------
    const viewports = [
      { name: 'laptop_1280', width: 1280, height: 800 },
      { name: 'tablet_768', width: 768, height: 1024 },
      { name: 'mobile_390', width: 390, height: 844 },
    ];

    for (const vp of viewports) {
      console.log(`\nAuditing Viewport: ${vp.name} (${vp.width}x${vp.height})...`);
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
      });

      await ctx.addInitScript(
        ({ token, u }) => {
          localStorage.setItem('hrms_auth_token', token);
          localStorage.setItem('token', token);
          localStorage.setItem('hrms_user', JSON.stringify(u));
          document.cookie = `hrms_auth_token=${encodeURIComponent(token)}; path=/; max-age=7200`;
          document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=7200`;
        },
        { token: authToken, u: authUser }
      );

      const p = await ctx.newPage();
      await p.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await p.waitForTimeout(2000);

      const vpPath = path.join(evidenceDir, `08_${vp.name}.png`);
      const artVpPath = path.join(artifactEvidenceDir, `08_${vp.name}.png`);
      await p.screenshot({ path: vpPath, fullPage: true });
      fs.copyFileSync(vpPath, artVpPath);
      console.log(`Saved Screenshot: ${vp.name}`);
      await ctx.close();
    }

    // ----------------------------------------------------
    // CMS FRONTEND AUDIT (Port 3000)
    // ----------------------------------------------------
    console.log('\nAuditing Next.js CMS Route on port 3000...');
    const cmsCtx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    await cmsCtx.addInitScript(
      ({ token, u }) => {
        localStorage.setItem('hrms_auth_token', token);
        localStorage.setItem('token', token);
        localStorage.setItem('hrms_user', JSON.stringify(u));
        document.cookie = `hrms_auth_token=${encodeURIComponent(token)}; path=/; max-age=7200`;
        document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=7200`;
      },
      { token: authToken, u: authUser }
    );

    const cmsPage = await cmsCtx.newPage();
    const cmsUrl = 'http://localhost:3000/hr/organization/document-types';
    try {
      await cmsPage.goto(cmsUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await cmsPage.waitForTimeout(2000);
      const cmsPath = path.join(evidenceDir, '09_cms_1440.png');
      const artCmsPath = path.join(artifactEvidenceDir, '09_cms_1440.png');
      await cmsPage.screenshot({ path: cmsPath, fullPage: true });
      fs.copyFileSync(cmsPath, artCmsPath);
      console.log('Saved Screenshot: CMS Frontend View');
    } catch (e) {
      console.log('CMS note (may require session cookies or redirect):', e.message);
    }
    await cmsCtx.close();

    console.log('\n--- PLAYWRIGHT DOCUMENT TYPES AUDIT COMPLETED SUCCESSFULLY! ---');
  } finally {
    await browser.close();
    await prisma.deviceSession.delete({ where: { id: session.id } }).catch(() => {});
    await prisma.$disconnect();
  }
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});

