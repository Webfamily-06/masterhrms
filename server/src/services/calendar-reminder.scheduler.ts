import { rawPrisma as prisma } from "../prisma";
import { NotificationService } from "./notification.service";
import { PusherService } from "./pusher.service";
import { sendCalendarNotificationEmail } from "../lib/email";

export interface CalendarReminder {
  id: string;
  minutesBefore: number;
  channel: "email" | "in_app" | "both";
  status: "pending" | "dispatched" | "failed";
  dispatchedAt?: string | null;
}

export interface CalendarShare {
  recipientId: string;
  permission: "view" | "edit";
  sharedBy: string;
  createdAt: string;
}

export interface CalendarMeta {
  cleanDescription: string;
  shares: CalendarShare[];
  reminders: CalendarReminder[];
}

export function parseCalendarMetadata(description: string | null): CalendarMeta {
  if (!description) return { cleanDescription: "", shares: [], reminders: [] };

  let clean = description;
  const shares: CalendarShare[] = [];
  const reminders: CalendarReminder[] = [];

  // Parse structured JSON metadata block: <!--META:{"shares":[...],"reminders":[...]}-->
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
    clean = clean.replace(/<!--META:.*?-->\s*/g, "");
  }

  // Also parse legacy [SharedWith:userId] tags
  const legacyMatches = clean.matchAll(/\[SharedWith:([^\]]+)\]/g);
  for (const m of legacyMatches) {
    const rId = m[1];
    if (!shares.some((s) => s.recipientId === rId)) {
      shares.push({
        recipientId: rId,
        permission: "view",
        sharedBy: "system",
        createdAt: new Date().toISOString(),
      });
    }
  }
  clean = clean.replace(/\[SharedWith:[^\]]+\]\s*/g, "");

  return { cleanDescription: clean.trim(), shares, reminders };
}

export function serializeCalendarMetadata(
  cleanDescription: string,
  sharesOrMeta: CalendarShare[] | CalendarMeta,
  remindersList?: CalendarReminder[]
): string {
  let result = (cleanDescription || "").trim();
  let shares: CalendarShare[] = [];
  let reminders: CalendarReminder[] = [];

  if (Array.isArray(sharesOrMeta)) {
    shares = sharesOrMeta || [];
    reminders = remindersList || [];
  } else if (sharesOrMeta && typeof sharesOrMeta === "object") {
    shares = (sharesOrMeta as any).shares || [];
    reminders = (sharesOrMeta as any).reminders || remindersList || [];
  }

  if (shares.length > 0 || reminders.length > 0) {
    const metaBlock = `<!--META:${JSON.stringify({ shares, reminders })}-->`;
    const legacyTags = shares.map((s) => `[SharedWith:${s.recipientId}]`).join(" ");
    result = result
      ? `${result}\n\n${metaBlock}${legacyTags ? `\n${legacyTags}` : ""}`
      : `${metaBlock}${legacyTags ? `\n${legacyTags}` : ""}`;
  }
  return result;
}

let schedulerTimer: NodeJS.Timeout | null = null;

export class CalendarReminderScheduler {
  /**
   * Starts periodic reminder runner (every 60 seconds).
   */
  public static start() {
    if (schedulerTimer) return;
    schedulerTimer = setInterval(async () => {
      try {
        await this.processDueReminders();
      } catch (err: any) {
        console.warn(`[CalendarReminderScheduler] Runner error: ${err.message}`);
      }
    }, 60000);
    schedulerTimer.unref();
    console.log("⏰ [CalendarReminderScheduler] Background reminder scheduler started.");
  }

  /**
   * Stops the periodic timer.
   */
  public static stop() {
    if (schedulerTimer) {
      clearInterval(schedulerTimer);
      schedulerTimer = null;
    }
  }

  /**
   * Evaluates events with pending reminders and dispatches notifications when due.
   */
  public static async processDueReminders(targetTenantId?: string): Promise<{
    evaluatedCount: number;
    dispatchedCount: number;
    details: Array<{ eventId: string; reminderId: string; minutesBefore: number; channel: string }>;
  }> {
    const now = new Date();
    // Check events from 24h ago up to 30 days in future
    const minStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const maxStart = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const where: any = {
      startDate: { gte: minStart, lte: maxStart },
      description: { contains: "<!--META:" },
    };
    if (targetTenantId) {
      where.tenantId = targetTenantId;
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true } },
          },
        },
      },
    });

    let dispatchedCount = 0;
    const details: Array<{ eventId: string; reminderId: string; minutesBefore: number; channel: string }> = [];

    for (const ev of events) {
      const meta = parseCalendarMetadata(ev.description);
      if (!meta.reminders || meta.reminders.length === 0) continue;

      let eventModified = false;
      const eventStartTime = ev.startDate.getTime();

      for (const r of meta.reminders) {
        if (r.status !== "pending") continue;

        // Due time = event.startDate minus minutesBefore
        const dueTime = eventStartTime - r.minutesBefore * 60 * 1000;
        if (now.getTime() >= dueTime) {
          // It's due! Determine target participants (owner + shared recipients)
          const targetUserIds = new Set<string>();
          targetUserIds.add(ev.userId);
          for (const s of meta.shares) {
            targetUserIds.add(s.recipientId);
          }

          const reminderText =
            r.minutesBefore === 0
              ? "Starting now!"
              : r.minutesBefore === 60
              ? "Starting in 1 hour"
              : r.minutesBefore === 390
              ? "Starting in 6.5 hours (390 minutes)"
              : `Starting in ${r.minutesBefore} minutes`;

          // 1. Dispatch In-App Notification & Pusher
          if (r.channel === "in_app" || r.channel === "both") {
            for (const uid of targetUserIds) {
              try {
                await NotificationService.createNotification({
                  tenantId: ev.tenantId,
                  userId: uid,
                  title: `Calendar Reminder: ${ev.title}`,
                  message: `${ev.title} is ${reminderText.toLowerCase()}.`,
                  type: "CALENDAR_REMINDER",
                  actionUrl: `/hr/calendar`,
                  metadata: {
                    eventId: ev.id,
                    minutesBefore: r.minutesBefore,
                  },
                });

                await PusherService.triggerUserEvent(ev.tenantId, uid, "calendar:reminder-due", {
                  eventId: ev.id,
                  title: ev.title,
                  reminderText,
                  minutesBefore: r.minutesBefore,
                  startDate: ev.startDate.toISOString(),
                });
              } catch (err: any) {
                console.warn(`[CalendarReminderScheduler] In-app notification error for user ${uid}:`, err);
              }
            }
          }

          // 2. Dispatch Email
          if (r.channel === "email" || r.channel === "both") {
            // Find emails of all target participants
            const users = await prisma.user.findMany({
              where: { id: { in: Array.from(targetUserIds) } },
              select: {
                id: true,
                email: true,
                profile: { select: { fullName: true } },
              },
            });

            for (const u of users) {
              if (u.email) {
                try {
                  await sendCalendarNotificationEmail({
                    toEmail: u.email,
                    recipientName: u.profile?.fullName || u.email.split("@")[0],
                    eventTitle: ev.title,
                    eventDate: ev.startDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }),
                    eventStartTime: ev.allDay ? "All Day" : ev.startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    eventEndTime: ev.allDay ? "" : ev.endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    eventLocation: ev.location || "Workspace",
                    eventCategory: ev.category,
                    organizerName: ev.user?.profile?.fullName || ev.user?.email || "Organizer",
                    eventDescription: meta.cleanDescription,
                    reminderText,
                    tenantId: ev.tenantId,
                  });
                } catch (err: any) {
                  console.warn(`[CalendarReminderScheduler] Email error for ${u.email}:`, err);
                }
              }
            }
          }

          // Mark reminder as dispatched to prevent duplicate processing
          r.status = "dispatched";
          r.dispatchedAt = new Date().toISOString();
          eventModified = true;
          dispatchedCount++;
          details.push({
            eventId: ev.id,
            reminderId: r.id,
            minutesBefore: r.minutesBefore,
            channel: r.channel,
          });
        }
      }

      if (eventModified) {
        const updatedDescription = serializeCalendarMetadata(meta.cleanDescription, meta.shares, meta.reminders);
        await prisma.calendarEvent.update({
          where: { id: ev.id },
          data: { description: updatedDescription },
        });
      }
    }

    return { evaluatedCount: events.length, dispatchedCount, details };
  }
}
