const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

function parseCalendarMetadata(description) {
  if (!description) return { cleanDescription: '', shares: [], reminders: [] };

  let clean = description;
  const shares = [];
  const reminders = [];

  const metaMatch = clean.match(/<!--META:(.*?)-->/);
  if (metaMatch) {
    try {
      const parsed = JSON.parse(metaMatch[1]);
      if (Array.isArray(parsed.shares)) {
        shares.push(...parsed.shares);
      }
      if (Array.isArray(parsed.reminders)) {
        reminders.push(...parsed.reminders);
      }
    } catch {}
  }

  const legacyMatches = clean.matchAll(/\[SharedWith:([^\]]+)\]/g);
  for (const m of legacyMatches) {
    const rId = m[1];
    if (!shares.some((s) => s.recipientId === rId)) {
      shares.push({
        recipientId: rId,
        permission: 'view',
        sharedBy: 'system',
        createdAt: new Date().toISOString(),
      });
    }
  }

  clean = clean.replace(/<!--META:.*?-->\s*/g, '').replace(/\[SharedWith:[^\]]+\]\s*/g, '');
  return { cleanDescription: clean.trim(), shares, reminders };
}

async function migrateCalendarMetadata() {
  console.log('=== STARTING IDEMPOTENT CALENDAR METADATA MIGRATION ===');
  const events = await prisma.calendarEvent.findMany({
    include: {
      shares: true,
      reminders: true,
    },
  });

  console.log(`Auditing ${events.length} total calendar events for metadata migration...`);

  let migratedSharesCount = 0;
  let migratedRemindersCount = 0;
  let untouchedEventsCount = 0;

  for (const ev of events) {
    const meta = parseCalendarMetadata(ev.description);

    // 1. Migrate Shares
    if (meta.shares && meta.shares.length > 0) {
      for (const s of meta.shares) {
        if (!s.recipientId) continue;
        const existingShare = ev.shares.find((ex) => ex.recipientId === s.recipientId);
        if (!existingShare) {
          try {
            await prisma.calendarEventShare.create({
              data: {
                eventId: ev.id,
                recipientId: s.recipientId,
                permission: s.permission === 'edit' ? 'edit' : 'view',
                rsvpStatus: 'pending',
                sharedBy: s.sharedBy || ev.userId,
                createdAt: s.createdAt ? new Date(s.createdAt) : ev.createdAt,
              },
            });
            migratedSharesCount++;
          } catch (err) {
            console.warn(`  Warning: Could not create share for event ${ev.id} and recipient ${s.recipientId}:`, err.message);
          }
        }
      }
    }

    // 2. Migrate Reminders
    if (meta.reminders && meta.reminders.length > 0) {
      for (const r of meta.reminders) {
        const existingReminder = ev.reminders.find(
          (ex) => ex.id === r.id || (ex.minutesBefore === r.minutesBefore && ex.channel === r.channel)
        );
        if (!existingReminder) {
          try {
            const customDate = r.customScheduledAt ? new Date(r.customScheduledAt) : null;
            const validCustomDate = customDate && !isNaN(customDate.getTime()) ? customDate : null;
            const dispatchedDate = r.dispatchedAt ? new Date(r.dispatchedAt) : null;
            const validDispatchedDate = dispatchedDate && !isNaN(dispatchedDate.getTime()) ? dispatchedDate : null;

            let reminderId = undefined;
            if (r.id && r.id.length <= 36) {
              const exists = await prisma.calendarEventReminder.findUnique({ where: { id: r.id } });
              if (!exists) {
                reminderId = r.id;
              }
            }

            await prisma.calendarEventReminder.create({
              data: {
                id: reminderId,
                eventId: ev.id,
                minutesBefore: typeof r.minutesBefore === 'number' ? r.minutesBefore : 15,
                channel: ['email', 'in_app', 'both'].includes(r.channel) ? r.channel : 'both',
                status: r.status === 'dispatched' ? 'dispatched' : r.status === 'failed' ? 'failed' : 'pending',
                dispatchedAt: validDispatchedDate,
                customScheduledAt: validCustomDate,
                customLabel: r.customLabel || null,
              },
            });
            migratedRemindersCount++;
          } catch (err) {
            console.warn(`  Warning: Could not create reminder for event ${ev.id}:`, err.message);
          }
        }
      }
    }

    if ((!meta.shares || meta.shares.length === 0) && (!meta.reminders || meta.reminders.length === 0)) {
      untouchedEventsCount++;
    }
  }

  // 3. Reconcile counts
  const totalSharesInDb = await prisma.calendarEventShare.count();
  const totalRemindersInDb = await prisma.calendarEventReminder.count();

  console.log('\n--- MIGRATION RECONCILIATION SUMMARY ---');
  console.log(`Newly Migrated Shares:    ${migratedSharesCount}`);
  console.log(`Newly Migrated Reminders: ${migratedRemindersCount}`);
  console.log(`Total Shares in DB:       ${totalSharesInDb}`);
  console.log(`Total Reminders in DB:    ${totalRemindersInDb}`);
  console.log(`Events without metadata:  ${untouchedEventsCount}`);
  console.log('=== IDEMPOTENT MIGRATION COMPLETE ===\n');
}

migrateCalendarMetadata()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
