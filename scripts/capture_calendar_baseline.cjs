const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const jwt = require('../server/node_modules/jsonwebtoken');
const { PrismaClient } = require('../server/node_modules/@prisma/client');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'master-hrms-jwt-super-secret-key-change-this-in-production';
const OUT_DIR = path.resolve(__dirname, '../docs/Saas/screenshots/calendar-consolidation');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  const userHR = await prisma.user.findFirst({ where: { email: 'hr@masterhrms.com' } });
  const token = jwt.sign({ userId: userHR.id, tenantId: 'tenant-default-001', roles: ['hr_admin', 'hr'], email: userHR.email }, JWT_SECRET, { expiresIn: '1d' });

  const browser = await chromium.launch({
    headless: true,
    args: ['--host-resolver-rules=MAP master.localhost 127.0.0.1']
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(({ token, userHR }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('token', token);
    localStorage.setItem('hrms_auth_token', token);
    localStorage.setItem('tenant_id', 'tenant-default-001');
    localStorage.setItem('hrms_user', JSON.stringify({
      id: userHR.id,
      userId: userHR.id,
      email: userHR.email,
      tenantId: 'tenant-default-001',
      roles: ['hr_admin', 'hr']
    }));
    document.cookie = 'hrms_auth_token=' + token + '; path=/;';
  }, { token, userHR });

  const page = await context.newPage();
  
  // 1. Visit /hr/calendar
  await page.goto('http://master.localhost:3000/hr/calendar', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT_DIR, 'before_hr_calendar.png') });
  console.log('Saved before_hr_calendar.png');

  // 2. Visit /apps/calendar
  await page.goto('http://master.localhost:3000/apps/calendar', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT_DIR, 'before_apps_calendar.png') });
  console.log('Saved before_apps_calendar.png');

  await browser.close();
  await prisma.$disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
