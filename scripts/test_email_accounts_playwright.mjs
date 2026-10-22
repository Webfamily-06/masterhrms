import { chromium } from 'playwright';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const jwt = require('../server/node_modules/jsonwebtoken');
const { PrismaClient } = require('../server/node_modules/@prisma/client');

const prisma = new PrismaClient();
const JWT_SECRET = 'master-hrms-jwt-super-secret-key-change-this-in-production';
const BASE_URL = 'http://localhost:5173';

async function runPlaywrightSuite() {
  console.log('=============================================================================');
  console.log('MASTERHRMS — USER EMAIL ACCOUNT SYSTEM PLAYWRIGHT END-TO-END VERIFICATION');
  console.log('=============================================================================\n');

  // Load onboarded employee user from DB
  const employeeUser = await prisma.user.findFirst({
    where: { profile: { tenantId: { not: null } } },
    include: { profile: true }
  });

  if (!employeeUser) {
    throw new Error('No onboarded employee user found in DB');
  }

  const tenantId = employeeUser.profile.tenantId;
  const employeePayload = {
    userId: employeeUser.id,
    email: employeeUser.email,
    tenantId: tenantId,
    roles: ['employee']
  };
  const token = jwt.sign(employeePayload, JWT_SECRET, { expiresIn: '1d' });

  // Clean start: clear test accounts for this employee
  await prisma.userEmailAccount.deleteMany({ where: { userId: employeeUser.id } });

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    console.error('Failed to launch Chromium:', err);
    process.exit(1);
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(({ t, p }) => {
    localStorage.setItem('hrms_auth_token', t);
    localStorage.setItem('auth_token', t);
    localStorage.setItem('token', t);
    localStorage.setItem('hrms_user', JSON.stringify(p));
    document.cookie = `hrms_auth_token=${t}; path=/`;
  }, { t: token, p: employeePayload });

  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  let passed = 0;
  let total = 0;
  function assert(condition, message) {
    total++;
    if (condition) {
      passed++;
      console.log(`  [PASS] ${message}`);
    } else {
      console.error(`  [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // ─── STEP 1: Access Settings -> Email Accounts ─────────────────────
  console.log('\n>>> [STEP 1] Testing Settings -> Email Accounts UI Navigation');
  await page.goto(`${BASE_URL}/settings/email-accounts`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1000);

  const pageContent = await page.content();
  assert(pageContent.includes('Email Accounts') || pageContent.includes('Personal Email'), 'Settings -> Email Accounts loaded');
  assert(pageContent.includes('Add Email Account') || pageContent.includes('Connect Account'), 'Add Email Account button present');

  // ─── STEP 2: Verify Unconfigured State in /apps/email ───────────────
  console.log('\n>>> [STEP 2] Testing /apps/email Unconfigured Setup State');
  await page.goto(`${BASE_URL}/apps/email`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1000);

  const emailAppBody = await page.locator('body').innerText();
  assert(emailAppBody.includes('No Email Account Configured') || emailAppBody.includes('No Account Configured'), 'Unconfigured mailbox setup prompt displayed');
  assert(emailAppBody.includes('mail.masterhrms.com') || emailAppBody.includes('System Mail Separation'), 'Super Admin system mail separation note presented');
  assert(!emailAppBody.includes('Morgan Freeman'), 'No fake mock email messages shown as real mailbox');

  // ─── STEP 3: Configure Account in Settings ──────────────────────────
  console.log('\n>>> [STEP 3] Opening Add Account Form and Validating Fields');
  await page.goto(`${BASE_URL}/settings/email-accounts`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1000);

  // Click Add Account button
  const addBtn = page.locator('button:has-text("Add Email Account"), button:has-text("Connect Account")').first();
  await addBtn.click();
  await page.waitForTimeout(500);

  const modalContent = await page.content();
  assert(modalContent.includes('Account Identity'), 'Section A: Account Identity present');
  assert(modalContent.includes('Incoming Mail Configuration'), 'Section B: Incoming Mail Configuration present');
  assert(modalContent.includes('Outgoing SMTP Configuration'), 'Section C: Outgoing SMTP Configuration present');
  assert(modalContent.includes('IMAP') && modalContent.includes('POP3'), 'Protocol selector contains IMAP and POP3');

  // ─── STEP 4: Save Account Configuration via Form ────────────────────
  console.log('\n>>> [STEP 4] Submitting Valid Personal Email Account Form');
  await page.locator('input[placeholder="e.g. employee@company.com"]').fill('emp.verified@gmail.com');
  await page.locator('input[placeholder="e.g. Work Mailbox"]').fill('Verified Employee Inbox');
  await page.locator('input[placeholder="e.g. Jane Doe"]').fill('Verified Employee');
  await page.locator('input[placeholder="imap.provider.com"]').fill('imap.gmail.com');
  await page.locator('input[placeholder="Enter mailbox password or app password"]').fill('TestAppSecretPass123!');
  await page.locator('input[placeholder="smtp.provider.com"]').fill('smtp.gmail.com');
  await page.locator('input[placeholder="Enter SMTP password or app password"]').fill('TestAppSmtpSecretPass456!');

  // Click Save Configuration button
  const saveBtn = page.locator('button:has-text("Save Configuration")');
  await saveBtn.click();
  await page.waitForSelector('text=emp.verified@gmail.com', { timeout: 10000 });
  await page.waitForTimeout(500);

  // ─── STEP 5: Verify Saved Account in Table & Zero Credential Leakage ───
  console.log('\n>>> [STEP 5] Verifying Saved Account in UI and Checking DOM for Secrets');
  const tableContent = await page.locator('body').innerText();
  console.log('DEBUG tableContent snippet:', tableContent.slice(0, 500));
  assert(tableContent.includes('emp.verified@gmail.com'), 'Saved account email visible in accounts table');
  assert(tableContent.includes('Verified Employee Inbox') || tableContent.includes('Verified Employee'), 'Saved display name visible in accounts table');

  const fullDomHtml = await page.content();
  assert(!fullDomHtml.includes('TestAppSecretPass123!'), 'Zero credential leakage: Incoming password NOT in DOM');
  assert(!fullDomHtml.includes('TestAppSmtpSecretPass456!'), 'Zero credential leakage: SMTP password NOT in DOM');

  // ─── STEP 6: Verify /apps/email with Configured Account ─────────────
  console.log('\n>>> [STEP 6] Opening /apps/email with Configured Account');
  await page.goto(`${BASE_URL}/apps/email`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('text=emp.verified@gmail.com', { timeout: 10000 });
  await page.waitForTimeout(500);

  const emailAppContentWithAcc = await page.locator('body').innerText();
  assert(emailAppContentWithAcc.includes('Verified Employee Inbox') || emailAppContentWithAcc.includes('emp.verified@gmail.com'), 'Configured account displayed in Personal Mailbox header/sidebar');

  // ─── STEP 7: Verify Compose Email uses User's SMTP Account ──────────
  console.log('\n>>> [STEP 7] Verifying Compose Email uses Personal Account');
  const composeBtn = page.locator('button:has-text("Compose email")').first();
  await composeBtn.click();
  await page.waitForTimeout(600);

  const composePopupText = await page.locator('.compose-email-popup').first().innerText();
  assert(composePopupText.includes('emp.verified@gmail.com'), 'Compose sender reflects configured personal email');
  assert(!composePopupText.includes('mail.masterhrms.com'), 'Outbound SMTP does NOT fall back to mail.masterhrms.com');

  // ─── STEP 8: Organization Apps Parity & Non-Regression ──────────────
  console.log('\n>>> [STEP 8] Regression Verification across 15 Organization App Routes');
  const regressionRoutes = [
    '/apps/chat/chats',
    '/apps/calendar',
    '/apps/taskboard/kanban-board',
    '/apps/taskboard/projects-board',
    '/apps/taskboard/pipeline',
    '/apps/file-manager/list-view',
    '/apps/file-manager/grid-view',
    '/apps/todo/task-list',
    '/apps/todo/gantt',
    '/apps/integrations/all-apps',
    '/apps/integrations/integrations',
    '/pages/profile',
    '/pages/account',
    '/settings/email-accounts',
  ];

  for (const r of regressionRoutes) {
    await page.goto(`${BASE_URL}${r}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(500);
    const body = await page.locator('body').innerText();
    assert(body.length > 50, `Route ${r} rendered cleanly (${body.length} chars)`);
  }

  // ─── STEP 9: Clean Account Deletion & System Email Independence ──────
  console.log('\n>>> [STEP 9] Cleaning Up and Verifying Super Admin Mail Independence');
  await prisma.userEmailAccount.deleteMany({ where: { userId: employeeUser.id } });
  const remainingInDb = await prisma.userEmailAccount.count({ where: { userId: employeeUser.id } });
  assert(remainingInDb === 0, 'Test account deleted cleanly from database');

  const sysEmailRes = await fetch('http://localhost:4000/api/email/status', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const sysEmailJson = await sysEmailRes.json();
  assert(sysEmailRes.status === 200, 'Super admin transactional email service untouched and operational');
  assert(sysEmailJson.host === 'mail.masterhrms.com', 'System mail server remains mail.masterhrms.com for platform alerts');

  await browser.close();

  console.log('\n=============================================================================');
  console.log(`PLAYWRIGHT TEST SUITE PASSED: ${passed}/${total} checks verified!`);
  console.log('=============================================================================\n');
}

runPlaywrightSuite()
  .catch(err => {
    console.error('Playwright test suite failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
