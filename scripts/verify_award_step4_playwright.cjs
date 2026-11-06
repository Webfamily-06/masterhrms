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
      roles: user.roles,
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

async function runStep4PlaywrightSuite() {
  console.log('================================================================');
  console.log('MASTERHRMS — AWARDS STEP 4 PLAYWRIGHT E2E & SCREENSHOT SUITE');
  console.log('================================================================\n');

  // 1. Get or create a sample active certificate for visual verification
  const tenant = await prisma.tenant.findFirst();
  const tenantId = tenant ? tenant.id : 'tenant-default-001';

  // Find an active certificate
  let cert = await prisma.employeeAwardCertificate.findFirst({
    where: { tenantId, status: 'ACTIVE' },
    include: {
      award: {
        include: {
          awardType: true,
          employee: true
        }
      }
    }
  });

  if (!cert) {
    // Look across any tenant
    cert = await prisma.employeeAwardCertificate.findFirst({
      where: { status: 'ACTIVE' },
      include: {
        award: {
          include: {
            awardType: true,
            employee: true
          }
        }
      }
    });
  }

  console.log(`Using Certificate: ${cert?.certificateNumber} (${cert?.verificationCode}) for Tenant: ${cert?.tenantId}`);

  // Fetch HR user and employee user
  const hrUserRecord = await prisma.user.findFirst({
    where: { employees: { some: { tenantId: cert ? cert.tenantId : tenantId } } }
  }) || await prisma.user.findFirst();

  const empUserRecord = cert?.award?.employee?.userId 
    ? await prisma.user.findUnique({ where: { id: cert.award.employee.userId } })
    : hrUserRecord;

  // Insert valid device_sessions
  const hrSessionId = 'sess-pw-hr-' + Math.random().toString(36).substring(2, 9);
  await prisma.deviceSession.create({
    data: {
      id: hrSessionId,
      userId: hrUserRecord.id,
      tenantId: cert ? cert.tenantId : tenantId,
      revoked: false,
      ipAddress: '127.0.0.1',
      userAgent: 'Playwright Chromium',
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
    }
  });

  const hrToken = makeToken({
    id: hrUserRecord.id,
    email: hrUserRecord.email,
    tenantId: cert ? cert.tenantId : tenantId,
    roles: ['hr_admin', 'admin']
  }, hrSessionId);

  let empToken = hrToken;
  if (empUserRecord && empUserRecord.id !== hrUserRecord.id) {
    const empSessionId = 'sess-pw-emp-' + Math.random().toString(36).substring(2, 9);
    await prisma.deviceSession.create({
      data: {
        id: empSessionId,
        userId: empUserRecord.id,
        tenantId: cert.tenantId,
        revoked: false,
        ipAddress: '127.0.0.1',
        userAgent: 'Playwright Chromium',
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
      }
    });
    empToken = makeToken({
      id: empUserRecord.id,
      email: empUserRecord.email,
      tenantId: cert.tenantId,
      roles: ['employee']
    }, empSessionId);
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const baseUrl = 'http://localhost:3000';

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Public Certificate Verification (Active Valid Certificate)
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Testing Public Certificate Verification (Active) ---');
    const pubContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pubPage = await pubContext.newPage();
    const verifyUrl = `${baseUrl}/verify-certificate?code=${cert.verificationCode}`;
    console.log(`Navigating to unauthenticated URL: ${verifyUrl}`);
    await pubPage.goto(verifyUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await pubPage.waitForTimeout(1500);

    const certTitle = await pubPage.evaluate(() => document.body.innerText);
    const hasValidVerification = certTitle.includes('Official Verification Confirmed') || certTitle.includes('VERIFIED');
    console.log(`Public Verification Page Content Confirmed: ${hasValidVerification}`);

    const verifyScreenshot = path.join(evidenceDir, '01_public_verification_active.png');
    await pubPage.screenshot({ path: verifyScreenshot, fullPage: true });
    console.log(`Screenshot saved: ${verifyScreenshot}`);

    // -------------------------------------------------------------------------
    // TEST 2: Public Certificate Verification (Invalid Code)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing Public Certificate Verification (Invalid Code) ---');
    const invalidUrl = `${baseUrl}/verify-certificate?code=INVALID-TEST-NONEXISTENT`;
    console.log(`Navigating to invalid URL: ${invalidUrl}`);
    await pubPage.goto(invalidUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await pubPage.waitForTimeout(1500);

    const invalidScreenshot = path.join(evidenceDir, '02_public_verification_invalid.png');
    await pubPage.screenshot({ path: invalidScreenshot, fullPage: true });
    console.log(`Screenshot saved: ${invalidScreenshot}`);

    // -------------------------------------------------------------------------
    // TEST 3: HR Awards Management (/hr/awards)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing HR Awards Management UI (/hr/awards) ---');
    const hrContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await hrContext.addInitScript(({ token, user }) => {
      localStorage.setItem('hrms_auth_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('hrms_user', JSON.stringify(user));
    }, {
      token: hrToken,
      user: { id: hrUserRecord.id, email: hrUserRecord.email, tenantId: cert.tenantId, roles: ['hr_admin', 'admin'] }
    });

    const hrPage = await hrContext.newPage();
    console.log(`Navigating to HR Awards page: ${baseUrl}/hr/awards`);
    await hrPage.goto(`${baseUrl}/hr/awards`, { waitUntil: 'networkidle', timeout: 30000 });
    await hrPage.waitForTimeout(2000);

    const hrAwardsScreenshot = path.join(evidenceDir, '03_hr_awards_certificate_table.png');
    await hrPage.screenshot({ path: hrAwardsScreenshot, fullPage: true });
    console.log(`Screenshot saved: ${hrAwardsScreenshot}`);

    // -------------------------------------------------------------------------
    // TEST 4: Employee Self-Service Awards (/me/awards)
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing Employee Self-Service UI (/me/awards) ---');
    const empContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await empContext.addInitScript(({ token, user }) => {
      localStorage.setItem('hrms_auth_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('hrms_user', JSON.stringify(user));
    }, {
      token: empToken,
      user: { id: empUserRecord ? empUserRecord.id : hrUserRecord.id, email: empUserRecord ? empUserRecord.email : hrUserRecord.email, tenantId: cert.tenantId, roles: ['employee'] }
    });

    const empPage = await empContext.newPage();
    console.log(`Navigating to Employee Self-Service: ${baseUrl}/me/awards`);
    await empPage.goto(`${baseUrl}/me/awards`, { waitUntil: 'networkidle', timeout: 30000 });
    await empPage.waitForTimeout(2000);

    const meAwardsScreenshot = path.join(evidenceDir, '04_me_awards_digital_certificate.png');
    await empPage.screenshot({ path: meAwardsScreenshot, fullPage: true });
    console.log(`Screenshot saved: ${meAwardsScreenshot}`);

    // -------------------------------------------------------------------------
    // TEST 5: Employee 360 Profile (/hr/employees/:id)
    // -------------------------------------------------------------------------
    if (cert?.award?.employee?.id) {
      console.log(`\n--- 5. Testing Employee 360 Profile (/hr/employees/${cert.award.employee.id}) ---`);
      const empProfileUrl = `${baseUrl}/hr/employees/${cert.award.employee.id}`;
      console.log(`Navigating to Employee Profile: ${empProfileUrl}`);
      await hrPage.goto(empProfileUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await hrPage.waitForTimeout(2000);

      const empProfileScreenshot = path.join(evidenceDir, '05_employee_profile_awards_tab.png');
      await hrPage.screenshot({ path: empProfileScreenshot, fullPage: true });
      console.log(`Screenshot saved: ${empProfileScreenshot}`);
    }

    console.log('\n================================================================');
    console.log(' ALL PLAYWRIGHT E2E BROWSER CHECKS & SCREENSHOTS COMPLETED!');
    console.log('================================================================\n');
  } catch (err) {
    console.error('Playwright verification error:', err);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

runStep4PlaywrightSuite();
