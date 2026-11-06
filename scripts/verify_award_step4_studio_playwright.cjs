const { chromium } = require('playwright');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const envContent = fs.readFileSync(path.resolve(__dirname, '../server/.env'), 'utf-8');
const jwtMatch = envContent.match(/^JWT_SECRET=["']?(.*?)["']?$/m);
const jwtSecret = jwtMatch ? jwtMatch[1] : 'masterhrms-super-secure-jwt-secret-key-2025-production-grade';

function makeToken(user, sessionId) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles || ['hr_manager', 'hr_admin'],
      permissions: ['*'],
      sessionId
    },
    jwtSecret,
    { algorithm: 'HS256', expiresIn: '2h' }
  );
}

const evidenceDir = path.resolve(__dirname, '../docs/hrms-audit/evidence/award-step4');
if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

async function runStudioPlaywrightSuite() {
  console.log('================================================================');
  console.log('MASTERHRMS — STEP 4 CERTIFICATE DESIGN STUDIO PLAYWRIGHT SUITE');
  console.log('================================================================\n');

  const tenant = await prisma.tenant.findFirst();
  const tenantId = tenant ? tenant.id : 'tenant-default-001';

  let hrUser = await prisma.user.findFirst({
    where: { employees: { some: { tenantId } } }
  }) || await prisma.user.findFirst();

  // Ensure hrUser has profile
  await prisma.profile.upsert({
    where: { userId: hrUser.id },
    create: { userId: hrUser.id, tenantId, fullName: 'HR Director', email: hrUser.email },
    update: { tenantId }
  }).catch(() => {});

  const hrSessionId = 'sess-studio-pw-' + Math.random().toString(36).substring(2, 9);
  await prisma.deviceSession.create({
    data: {
      id: hrSessionId,
      userId: hrUser.id,
      tenantId,
      revoked: false,
      ipAddress: '127.0.0.1',
      userAgent: 'Playwright Studio Chromium',
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
    }
  });

  const hrToken = makeToken({
    id: hrUser.id,
    email: hrUser.email,
    tenantId,
    roles: ['hr_admin', 'hr_manager', 'admin']
  }, hrSessionId);

  // Pick a system template for designer visual inspection
  const sampleTemplate = await prisma.certificateTemplate.findFirst({
    where: { isSystem: true, category: 'Employee Excellence' }
  }) || await prisma.certificateTemplate.findFirst();

  console.log(`[PLAYWRIGHT] Tenant: ${tenantId}`);
  console.log(`[PLAYWRIGHT] HR User: ${hrUser.email} (${hrUser.id})`);
  console.log(`[PLAYWRIGHT] Sample Template: ${sampleTemplate?.name} (${sampleTemplate?.id})`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const baseUrl = 'http://localhost:3000';

  try {
    const hrContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    
    // Inject auth token and mock tenant cookies into local storage
    await hrContext.addInitScript(({ token, user, tId }) => {
      localStorage.setItem('hrms_auth_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('tenantId', tId);
      localStorage.setItem('user', JSON.stringify({
        id: user.id,
        email: user.email,
        roles: ['hr_admin', 'hr_manager'],
        tenantId: tId
      }));
      document.cookie = `token=${token}; path=/; max-age=7200; SameSite=Lax`;
      document.cookie = `tenantId=${tId}; path=/; max-age=7200; SameSite=Lax`;
    }, { token: hrToken, user: hrUser, tId: tenantId });

    const page = await hrContext.newPage();

    // -------------------------------------------------------------------------
    // 1. Certificate Branding Management (/hr/organization/certificate-branding)
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Capturing Certificate Branding Management UI ---');
    await page.goto(`${baseUrl}/hr/organization/certificate-branding`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const brandingScreenshot = path.join(evidenceDir, '03_certificate_branding_assets.png');
    await page.screenshot({ path: brandingScreenshot, fullPage: true });
    console.log(`✔ Screenshot saved: ${brandingScreenshot}`);

    // Click "Signatories" tab if present
    try {
      const sigTab = page.locator('button:has-text("Signatories"), [role="tab"]:has-text("Signatories")').first();
      if (await sigTab.isVisible()) {
        await sigTab.click();
        await page.waitForTimeout(1000);
        const sigScreenshot = path.join(evidenceDir, '04_certificate_branding_signatories.png');
        await page.screenshot({ path: sigScreenshot, fullPage: true });
        console.log(`✔ Screenshot saved: ${sigScreenshot}`);
      }
    } catch (e) {
      console.warn('Could not switch to signatories tab:', e.message);
    }

    // -------------------------------------------------------------------------
    // 2. 50+ Template Library (/hr/organization/certificate-templates)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Capturing 50+ Certificate Template Library UI ---');
    await page.goto(`${baseUrl}/hr/organization/certificate-templates`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2500);

    const templatesScreenshot = path.join(evidenceDir, '05_certificate_templates_library.png');
    await page.screenshot({ path: templatesScreenshot, fullPage: true });
    console.log(`✔ Screenshot saved: ${templatesScreenshot}`);

    // Filter by "Leadership"
    try {
      const leadershipTab = page.locator('button:has-text("Leadership")').first();
      if (await leadershipTab.isVisible()) {
        await leadershipTab.click();
        await page.waitForTimeout(1000);
        const filteredScreenshot = path.join(evidenceDir, '06_certificate_templates_filtered_leadership.png');
        await page.screenshot({ path: filteredScreenshot, fullPage: true });
        console.log(`✔ Screenshot saved: ${filteredScreenshot}`);
      }
    } catch (e) {
      console.warn('Could not filter by leadership:', e.message);
    }

    // -------------------------------------------------------------------------
    // 3. Visual Certificate Designer Canvas (/hr/organization/certificate-designer/:templateId)
    // -------------------------------------------------------------------------
    if (sampleTemplate?.id) {
      console.log(`\n--- 3. Capturing Visual Certificate Designer Canvas (${sampleTemplate.id}) ---`);
      await page.goto(`${baseUrl}/hr/organization/certificate-designer/${sampleTemplate.id}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2500);

      const designerScreenshot = path.join(evidenceDir, '07_certificate_designer_studio.png');
      await page.screenshot({ path: designerScreenshot, fullPage: true });
      console.log(`✔ Screenshot saved: ${designerScreenshot}`);
    }

    // -------------------------------------------------------------------------
    // 4. Award Types Assignment Dropdown (/hr/organization/award-types)
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Capturing Award Types Template Assignment Dropdown ---');
    await page.goto(`${baseUrl}/hr/organization/award-types`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const awardTypesScreenshot = path.join(evidenceDir, '08_award_types_template_assignment.png');
    await page.screenshot({ path: awardTypesScreenshot, fullPage: true });
    console.log(`✔ Screenshot saved: ${awardTypesScreenshot}`);

    console.log('\n================================================================');
    console.log('ALL PLAYWRIGHT VISUAL ARTIFACTS CAPTURED & SAVED SUCCESSFULLY!');
    console.log('================================================================');

  } finally {
    await browser.close();
    await prisma.deviceSession.deleteMany({
      where: { id: hrSessionId }
    }).catch(() => {});
    await prisma.$disconnect();
  }
}

runStudioPlaywrightSuite().catch(err => {
  console.error('\n❌ Playwright execution error:', err);
  process.exit(1);
});

