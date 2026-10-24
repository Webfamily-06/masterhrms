const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const jwt = require(path.join(process.cwd(), 'server/node_modules/jsonwebtoken'));
const { PrismaClient } = require(path.join(process.cwd(), 'server/node_modules/@prisma/client'));

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'master-hrms-jwt-super-secret-key-change-this-in-production';
const SCREENSHOT_DIR = path.resolve(__dirname, '../docs/Saas/screenshots/ui-typography-emoji-cleanup');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function captureBirthdayPopup() {
  const userHR = await prisma.user.findFirst({ where: { email: 'hr@masterhrms.com' } });
  const token = jwt.sign({
    id: userHR.id,
    userId: userHR.id,
    email: userHR.email,
    tenantId: 'tenant-default-001',
    role: 'HR_ADMIN',
    roles: ['HR_ADMIN', 'COMPANY_ADMIN', 'EMPLOYEE']
  }, JWT_SECRET, { expiresIn: '1d' });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    baseURL: 'http://master.localhost:3000'
  });

  await context.addInitScript(({ t, u }) => {
    localStorage.setItem('hrms_auth_token', t);
    localStorage.setItem('auth_token', t);
    localStorage.setItem('token', t);
    localStorage.setItem('current_user', JSON.stringify(u));
    localStorage.setItem('user', JSON.stringify(u));
    localStorage.setItem('master_hrms_active_tenant', 'tenant-default-001');
  }, { t: token, u: userHR });

  const page = await context.newPage();

  console.log('Navigating to /hr/calendar...');
  await page.goto('/hr/calendar', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  const bodyText = await page.innerText('body');
  console.log('Page loaded, body text length:', bodyText.length);

  console.log('Clicking Samantha Birthday event...');
  const samanthaBday = page.locator('text="Birthday: Samantha BirthdayStar"').first();
  await samanthaBday.click();

  await page.waitForSelector('div[role="dialog"]', { timeout: 6000 });
  await page.waitForTimeout(1000);

  const modal = page.locator('div[role="dialog"]').first();
  const text = await modal.innerText();
  console.log('Modal Text:\n', text);

  // Assertions
  const hasCakeEmoji = text.includes('🎂');
  const cakeIcons = await modal.locator('svg.lucide-cake').count();
  console.log('Cake emoji present:', hasCakeEmoji);
  console.log('Lucide Cake outline icon count:', cakeIcons);

  const font = await modal.locator('h2, .text-sm.font-bold').first().evaluate(el => window.getComputedStyle(el).fontFamily);
  console.log('Modal title font:', font);

  const shotPath = path.join(SCREENSHOT_DIR, '01_calendar_birthday_popup_clean_typography.png');
  await modal.screenshot({ path: shotPath });
  console.log('Captured screenshot to:', shotPath);

  await browser.close();
  await prisma.$disconnect();
}

captureBirthdayPopup().catch(err => {
  console.error(err);
  process.exit(1);
});
