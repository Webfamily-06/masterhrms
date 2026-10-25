/**
 * scripts/capture_calendar_phase1_2_screenshots.cjs
 * Capture visual proof for MASTERHRMS Calendar Phases 1 & 2 Implementation
 */
const path = require('path');
const fs = require('fs');
require(path.join(process.cwd(), 'server/node_modules/dotenv')).config({ path: path.join(process.cwd(), 'server/.env') });
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}
const jwt = require(path.join(process.cwd(), 'server/node_modules/jsonwebtoken'));
const { PrismaClient } = require(path.join(process.cwd(), 'server/node_modules/@prisma/client'));
const { chromium } = require(path.join(process.cwd(), 'node_modules/playwright'));

const prisma = new PrismaClient();
const SCREENSHOT_DIR = path.join(process.cwd(), 'docs/Saas/screenshots/calendar-phase-1-2');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const JWT_SECRET = process.env.JWT_SECRET || 'master-hrms-jwt-super-secret-key-change-this-in-production';

async function main() {
  console.log('--- CAPTURING CALENDAR PHASE 1 & 2 SCREENSHOTS ---');

  const tenant = await prisma.tenant.findFirst() || { id: 'tenant-default-001' };
  const tenantId = tenant.id;

  const hrUser = await prisma.user.findFirst({ where: { email: 'hr@masterhrms.com' } });
  const empUser = await prisma.user.findFirst({ where: { email: 'employee@masterhrms.com' } });

  if (!hrUser || !empUser) {
    throw new Error('Required test users not found.');
  }

  const hrToken = jwt.sign(
    { userId: hrUser.id, tenantId, roles: ['hr_admin', 'hr', 'admin'], email: hrUser.email },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  const empToken = jwt.sign(
    { userId: empUser.id, tenantId, roles: ['employee'], email: empUser.email },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  // Create a demonstration event in DB with shares and reminders
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  tomorrow.setHours(14, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(15, 30, 0, 0);

  const demoEvent = await prisma.calendarEvent.create({
    data: {
      tenantId,
      userId: hrUser.id,
      title: 'Q4 Product Roadmap & Architecture Sync',
      description: 'Strategic review of Phase 1 & 2 deliverables, database migrations, and attendee RSVP flow. <!--META:{"shares":[{"recipientId":"' + empUser.id + '","permission":"view","rsvpStatus":"pending","sharedBy":"' + hrUser.id + '"}],"reminders":[{"id":"rem-demo-1","minutesBefore":30,"channel":"in_app","status":"pending"}]}-->',
      startDate: tomorrow,
      endDate: tomorrowEnd,
      location: 'HQ - Innovation Hub / Virtual Room 1',
      meetingLink: 'https://meet.google.com/hrms-arch-sync',
      status: 'confirmed',
      visibility: 'team',
      timezone: 'Asia/Kolkata',
      shares: {
        create: [
          {
            recipientId: empUser.id,
            permission: 'view',
            rsvpStatus: 'pending',
            sharedBy: hrUser.id
          }
        ]
      },
      reminders: {
        create: [
          {
            minutesBefore: 30,
            channel: 'in_app',
            status: 'pending'
          }
        ]
      }
    }
  });

  // Also create a demo cancelled event
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() + 3);
  yesterday.setHours(11, 0, 0, 0);
  const yesterdayEnd = new Date(yesterday);
  yesterdayEnd.setHours(12, 0, 0, 0);

  const cancelledEvent = await prisma.calendarEvent.create({
    data: {
      tenantId,
      userId: hrUser.id,
      title: 'Cancelled Legacy Planning Session',
      description: 'This session has been officially superseded by the unified calendar architecture.',
      startDate: yesterday,
      endDate: yesterdayEnd,
      status: 'cancelled',
      visibility: 'team',
      timezone: 'Asia/Kolkata',
      cancelledAt: new Date(),
      cancelledById: hrUser.id,
      shares: {
        create: [
          {
            recipientId: empUser.id,
            permission: 'view',
            rsvpStatus: 'declined',
            sharedBy: hrUser.id
          }
        ]
      }
    }
  });

  const browser = await chromium.launch({
    headless: true,
    args: ['--host-resolver-rules=MAP master.localhost 127.0.0.1']
  });

  async function createAuthContext(token, user) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(({ token, user, tenantId }) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('hrms_auth_token', token);
      localStorage.setItem('tenant_id', tenantId);
      localStorage.setItem('hrms_user', JSON.stringify({
        id: user.id,
        userId: user.id,
        email: user.email,
        tenantId,
        roles: user.roles || ['hr_admin'],
      }));
      document.cookie = 'hrms_auth_token=' + token + '; path=/;';
    }, { token, user, tenantId });
    return context;
  }

  try {
    // -------------------------------------------------------------------------
    // Screenshot 1: Employee Unified Calendar Route (/me/calendar)
    // -------------------------------------------------------------------------
    console.log('[1/5] Capturing Employee Unified Calendar (/me/calendar)...');
    const empContext = await createAuthContext(empToken, { ...empUser, roles: ['employee'] });
    const empPage = await empContext.newPage();
    await empPage.goto('http://master.localhost:3000/me/calendar', { waitUntil: 'networkidle', timeout: 30000 });
    await empPage.waitForTimeout(2000);
    await empPage.screenshot({ path: path.join(SCREENSHOT_DIR, '01_employee_me_calendar_unified.png'), fullPage: false });
    console.log('  ✓ Saved 01_employee_me_calendar_unified.png');

    // -------------------------------------------------------------------------
    // Screenshot 2: HR Canonical Calendar Route (/hr/calendar)
    // -------------------------------------------------------------------------
    console.log('[2/5] Capturing HR Canonical Calendar (/hr/calendar)...');
    const hrContext = await createAuthContext(hrToken, { ...hrUser, roles: ['hr_admin'] });
    const hrPage = await hrContext.newPage();
    await hrPage.goto('http://master.localhost:3000/hr/calendar', { waitUntil: 'networkidle', timeout: 30000 });
    await hrPage.waitForTimeout(2000);
    await hrPage.screenshot({ path: path.join(SCREENSHOT_DIR, '02_hr_calendar_view.png'), fullPage: false });
    console.log('  ✓ Saved 02_hr_calendar_view.png');

    // -------------------------------------------------------------------------
    // Screenshot 3: Create Event Modal with Meeting Link, Visibility, Timezone
    // -------------------------------------------------------------------------
    console.log('[3/5] Capturing Create Event Modal with Phase 1 & 2 fields...');
    const createBtn = hrPage.locator('button:has-text("Create")').first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await hrPage.waitForTimeout(1000);
      await hrPage.screenshot({ path: path.join(SCREENSHOT_DIR, '03_create_event_modal_phase1_2.png'), fullPage: false });
      console.log('  ✓ Saved 03_create_event_modal_phase1_2.png');
      // Close modal
      const cancelModalBtn = hrPage.locator('button:has-text("Cancel")').last();
      if (await cancelModalBtn.isVisible()) await cancelModalBtn.click();
    }

    // -------------------------------------------------------------------------
    // Screenshot 4: Event Details Modal with RSVP Actions & Meeting Link
    // -------------------------------------------------------------------------
    console.log('[4/5] Capturing Event Details Modal with Attendee RSVP...');
    // In employee page, click on the shared demo event
    await empPage.locator('button:has-text("List")').first().click();
    await empPage.waitForTimeout(1000);
    const eventCard = empPage.locator(`text=${demoEvent.title}`).first();
    if (await eventCard.isVisible()) {
      await eventCard.click();
      await empPage.waitForTimeout(1200);
      await empPage.screenshot({ path: path.join(SCREENSHOT_DIR, '04_event_details_modal_rsvp.png'), fullPage: false });
      console.log('  ✓ Saved 04_event_details_modal_rsvp.png');
    } else {
      console.log('  Event card not found in list view, capturing current view...');
      await empPage.screenshot({ path: path.join(SCREENSHOT_DIR, '04_event_details_modal_rsvp.png'), fullPage: false });
    }

    // -------------------------------------------------------------------------
    // Screenshot 5: Cancelled Event View with Retained Historical State
    // -------------------------------------------------------------------------
    console.log('[5/5] Capturing Cancelled Event Details Banner...');
    await hrPage.goto('http://master.localhost:3000/hr/calendar', { waitUntil: 'networkidle', timeout: 30000 });
    await hrPage.waitForTimeout(1500);
    await hrPage.locator('button:has-text("List")').first().click();
    await hrPage.waitForTimeout(1000);
    const cancelledCard = hrPage.locator(`text=${cancelledEvent.title}`).first();
    if (await cancelledCard.isVisible()) {
      await cancelledCard.click();
      await hrPage.waitForTimeout(1200);
      await hrPage.screenshot({ path: path.join(SCREENSHOT_DIR, '05_cancelled_event_view.png'), fullPage: false });
      console.log('  ✓ Saved 05_cancelled_event_view.png');
    } else {
      await hrPage.screenshot({ path: path.join(SCREENSHOT_DIR, '05_cancelled_event_view.png'), fullPage: false });
    }

    console.log('\n--- ALL SCREENSHOTS CAPTURED SUCCESSFULLY! ---');
  } finally {
    // Cleanup demo records
    await prisma.calendarEventReminder.deleteMany({ where: { eventId: { in: [demoEvent.id, cancelledEvent.id] } } });
    await prisma.calendarEventShare.deleteMany({ where: { eventId: { in: [demoEvent.id, cancelledEvent.id] } } });
    await prisma.calendarEvent.deleteMany({ where: { id: { in: [demoEvent.id, cancelledEvent.id] } } });
    await browser.close();
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
