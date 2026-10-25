import { rawPrisma as prisma } from "../prisma";
import { NotificationService } from "./notification.service";
import { PusherService } from "./pusher.service";
import { sendCalendarNotificationEmail, sendTodoNotificationEmail } from "../lib/email";
import { runWithTenantContext } from "../context/tenant-context";
import { parseTodoMeta } from "../routes/todos.routes";
import { TodoNotificationService } from "./todo-notification.service";

export interface CalendarReminder {
  id: string;
  minutesBefore: number;
  channel: "email" | "in_app" | "both";
  status: "pending" | "dispatched" | "failed";
  dispatchedAt?: string | null;
  customScheduledAt?: string | null;
  customLabel?: string | null;
}

export interface CalendarShare {
  recipientId: string;
  permission: "view" | "edit";
  rsvpStatus?: "pending" | "accepted" | "declined" | "tentative";
  sharedBy: string;
  createdAt: string;
  respondedAt?: string | null;
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
        rsvpStatus: "pending",
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
      try {
        await this.processDueTodoReminders();
      } catch (err: any) {
        console.warn(`[CalendarReminderScheduler] Todo runner error: ${err.message}`);
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
   * Utilizes relational CalendarEventReminder model with fallback to legacy description metadata.
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

    let dispatchedCount = 0;
    const details: Array<{ eventId: string; reminderId: string; minutesBefore: number; channel: string }> = [];

    // 0. Recover orphaned "processing" reminders from crashed scheduler workers (> 5 mins old)
    try {
      await prisma.calendarEventReminder.updateMany({
        where: {
          status: "processing",
          updatedAt: { lt: new Date(now.getTime() - 5 * 60 * 1000) },
        },
        data: {
          status: "retryable_failure",
          nextRetryAt: now,
        },
      });
    } catch (recoverErr: any) {
      console.warn("[CalendarReminderScheduler] Orphan recovery warning:", recoverErr.message);
    }

    // 1. Process relational reminders (pending or eligible retryable_failure)
    const relationalReminders = await prisma.calendarEventReminder.findMany({
      where: {
        OR: [
          { status: "pending" },
          { status: "retryable_failure", nextRetryAt: { lte: now } },
        ],
        event: {
          ...(targetTenantId ? { tenantId: targetTenantId } : {}),
          status: { not: "cancelled" },
          startDate: { gte: minStart, lte: maxStart },
        },
      },
      include: {
        event: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: { select: { fullName: true } },
              },
            },
            shares: true,
          },
        },
      },
      take: 50,
    });

    const processedEventIds = new Set<string>();

    for (const r of relationalReminders) {
      const ev = r.event;
      if (!ev) continue;
      processedEventIds.add(ev.id);

      const eventStartTime = ev.startDate.getTime();
      const dueTime = r.customScheduledAt
        ? new Date(r.customScheduledAt).getTime()
        : eventStartTime - r.minutesBefore * 60 * 1000;

      if (now.getTime() >= dueTime) {
        // Atomic claim: Mark processing to prevent concurrent worker execution
        try {
          const claimResult = await prisma.calendarEventReminder.updateMany({
            where: { id: r.id, status: { in: ["pending", "retryable_failure"] } },
            data: { status: "processing" },
          });
          if (claimResult.count === 0) {
            continue; // Claimed by another concurrent worker instance
          }
        } catch {
          continue; // Claimed by another worker
        }

        // Collect target users (organizer + shared recipients)
        const targetUserIds = new Set<string>();
        targetUserIds.add(ev.userId);
        for (const s of ev.shares) {
          targetUserIds.add(s.recipientId);
        }

        let reminderText: string;
        if (r.customScheduledAt) {
          const customDate = new Date(r.customScheduledAt);
          const formattedCustom = customDate.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
          reminderText = `Scheduled for ${formattedCustom}`;
        } else if (r.minutesBefore === 0) {
          reminderText = "Starting now!";
        } else if (r.minutesBefore === 5) {
          reminderText = "Starting in 5 minutes";
        } else if (r.minutesBefore === 15) {
          reminderText = "Starting in 15 minutes";
        } else if (r.minutesBefore === 30) {
          reminderText = "Starting in 30 minutes";
        } else if (r.minutesBefore === 60) {
          reminderText = "Starting in 1 hour";
        } else if (r.minutesBefore === 120) {
          reminderText = "Starting in 2 hours";
        } else if (r.minutesBefore === 300) {
          reminderText = "Starting in 5 hours";
        } else if (r.minutesBefore === 1440) {
          reminderText = "Starting in 1 day";
        } else if (r.minutesBefore === 390) {
          reminderText = "Starting in 6.5 hours (390 minutes)";
        } else {
          reminderText = `Starting in ${r.minutesBefore} minutes`;
        }

        let inAppSuccess = false;
        let emailSuccess = false;
        let lastErrorMsg: string | null = null;

        // Dispatch In-App Notification & Pusher
        if (r.channel === "in_app" || r.channel === "both") {
          for (const uid of targetUserIds) {
            try {
              await runWithTenantContext(
                {
                  tenantId: ev.tenantId,
                  userId: uid,
                  roles: ["employee"],
                  status: "ACTIVE",
                  tenancyStrategy: "SHARED_SCHEMA",
                  db: prisma,
                },
                async () => {
                  await NotificationService.createNotification({
                    tenantId: ev.tenantId,
                    userId: uid,
                    title: `Calendar Reminder: ${ev.title}`,
                    message: `${ev.title} is ${reminderText.toLowerCase()}.`,
                    type: "CALENDAR_REMINDER",
                    actionUrl: `/hr/calendar`,
                    metadata: {
                      eventId: ev.id,
                      reminderId: r.id,
                      minutesBefore: r.minutesBefore,
                      customScheduledAt: r.customScheduledAt?.toISOString() || null,
                    },
                  });
                }
              );

              await PusherService.triggerUserEvent(ev.tenantId, uid, "calendar:reminder-due", {
                eventId: ev.id,
                title: ev.title,
                reminderText,
                minutesBefore: r.minutesBefore,
                customScheduledAt: r.customScheduledAt?.toISOString() || null,
                startDate: ev.startDate.toISOString(),
              });
              inAppSuccess = true;
            } catch (err: any) {
              lastErrorMsg = `In-app error: ${err.message}`;
              console.warn(`[CalendarReminderScheduler] In-app notification error for user ${uid}:`, err.message);
            }
          }
        }

        // Dispatch Email
        if (r.channel === "email" || r.channel === "both") {
          const users = await prisma.user.findMany({
            where: { id: { in: Array.from(targetUserIds) } },
            select: {
              id: true,
              email: true,
              profile: { select: { fullName: true } },
            },
          });

          const meta = parseCalendarMetadata(ev.description);

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
                emailSuccess = true;
              } catch (err: any) {
                lastErrorMsg = `Email error: ${err.message}`;
                console.warn(`[CalendarReminderScheduler] Email error for ${u.email}:`, err.message);
              }
            }
          }
        }

        const isDispatched =
          r.channel === "both"
            ? inAppSuccess || emailSuccess
            : r.channel === "in_app"
            ? inAppSuccess
            : emailSuccess;

        // Channel isolated status tracking
        const channelStatus = {
          in_app: r.channel === "email" ? "n/a" : inAppSuccess ? "dispatched" : "failed",
          email: r.channel === "in_app" ? "n/a" : emailSuccess ? "dispatched" : "failed",
        };

        if (isDispatched) {
          // Exactly-once delivery success
          await prisma.calendarEventReminder.update({
            where: { id: r.id },
            data: {
              status: "dispatched",
              dispatchedAt: new Date(),
              lastError: null,
              channelStatus,
            },
          });
          dispatchedCount++;
        } else {
          // Transient delivery failure handling with exponential backoff
          const currentRetries = (r.retryCount || 0) + 1;
          const maxRetries = r.maxRetries || 3;
          if (currentRetries < maxRetries) {
            const backoffMs = Math.pow(2, currentRetries) * 60000; // 2m, 4m, 8m
            await prisma.calendarEventReminder.update({
              where: { id: r.id },
              data: {
                status: "retryable_failure",
                retryCount: currentRetries,
                nextRetryAt: new Date(now.getTime() + backoffMs),
                lastError: lastErrorMsg || "Transient delivery failure",
                channelStatus,
              },
            });
          } else {
            // Permanent failure after max retries
            await prisma.calendarEventReminder.update({
              where: { id: r.id },
              data: {
                status: "failed",
                retryCount: currentRetries,
                lastError: lastErrorMsg || "Maximum delivery retries exceeded",
                channelStatus,
              },
            });
          }
        }

        // Also sync description metadata if legacy block exists
        if (ev.description && ev.description.includes("<!--META:")) {
          const meta = parseCalendarMetadata(ev.description);
          const remInMeta = meta.reminders.find((m) => m.id === r.id);
          if (remInMeta) {
            remInMeta.status = isDispatched ? "dispatched" : "failed";
            remInMeta.dispatchedAt = new Date().toISOString();
            const updatedDesc = serializeCalendarMetadata(meta.cleanDescription, meta.shares, meta.reminders);
            await prisma.calendarEvent.update({
              where: { id: ev.id },
              data: { description: updatedDesc },
            });
          }
        }

        if (isDispatched) {
          dispatchedCount++;
        }

        details.push({
          eventId: ev.id,
          reminderId: r.id,
          minutesBefore: r.minutesBefore,
          channel: r.channel,
        });
      }
    }

    // 2. Fallback for any legacy events without relational reminder records
    const legacyEvents = await prisma.calendarEvent.findMany({
      where: {
        id: { notIn: Array.from(processedEventIds) },
        startDate: { gte: minStart, lte: maxStart },
        description: { contains: "<!--META:" },
        status: { not: "cancelled" },
        ...(targetTenantId ? { tenantId: targetTenantId } : {}),
      },
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

    for (const ev of legacyEvents) {
      const meta = parseCalendarMetadata(ev.description);
      if (!meta.reminders || meta.reminders.length === 0) continue;

      let eventModified = false;
      const eventStartTime = ev.startDate.getTime();

      for (const r of meta.reminders) {
        if (r.status !== "pending") continue;

        const dueTime = r.customScheduledAt
          ? new Date(r.customScheduledAt).getTime()
          : eventStartTime - r.minutesBefore * 60 * 1000;

        if (now.getTime() >= dueTime) {
          const targetUserIds = new Set<string>();
          targetUserIds.add(ev.userId);
          for (const s of meta.shares) {
            targetUserIds.add(s.recipientId);
          }

          let reminderText = `Starting in ${r.minutesBefore} minutes`;
          if (r.minutesBefore === 0) reminderText = "Starting now!";

          let inAppSuccess = false;
          let emailSuccess = false;

          if (r.channel === "in_app" || r.channel === "both") {
            for (const uid of targetUserIds) {
              try {
                await runWithTenantContext(
                  {
                    tenantId: ev.tenantId,
                    userId: uid,
                    roles: ["employee"],
                    status: "ACTIVE",
                    tenancyStrategy: "SHARED_SCHEMA",
                    db: prisma,
                  },
                  async () => {
                    await NotificationService.createNotification({
                      tenantId: ev.tenantId,
                      userId: uid,
                      title: `Calendar Reminder: ${ev.title}`,
                      message: `${ev.title} is ${reminderText.toLowerCase()}.`,
                      type: "CALENDAR_REMINDER",
                      actionUrl: `/hr/calendar`,
                      metadata: {
                        eventId: ev.id,
                        reminderId: r.id,
                        minutesBefore: r.minutesBefore,
                        customScheduledAt: r.customScheduledAt || null,
                      },
                    });
                  }
                );
                inAppSuccess = true;
              } catch (err: any) {
                console.warn(`[CalendarReminderScheduler] Legacy in-app notification error:`, err.message);
              }
            }
          }

          const isDispatched = inAppSuccess || emailSuccess;
          r.status = isDispatched ? "dispatched" : "failed";
          r.dispatchedAt = new Date().toISOString();
          eventModified = true;

          if (isDispatched) dispatchedCount++;
          details.push({
            eventId: ev.id,
            reminderId: r.id,
            minutesBefore: r.minutesBefore,
            channel: r.channel,
          });
        }
      }

      if (eventModified) {
        const updatedDesc = serializeCalendarMetadata(meta.cleanDescription, meta.shares, meta.reminders);
        await prisma.calendarEvent.update({
          where: { id: ev.id },
          data: { description: updatedDesc },
        });
      }
    }

    const totalEvaluated = relationalReminders.length + legacyEvents.length;
    return { evaluatedCount: totalEvaluated, dispatchedCount, details };
  }

  /**
   * Evaluates WorkspaceTodo items approaching 2-day or 1-day deadlines
   * and dispatches in-app notifications and transactional emails with idempotency guarantees.
   */
  public static async processDueTodoReminders(targetTenantId?: string): Promise<{
    evaluatedCount: number;
    dispatchedCount: number;
    details: Array<{ taskId: string; targetUserId: string; reminderType: string; idempotencyKey: string }>;
  }> {
    const now = new Date();
    // Scan tasks with due date in range: from 2 hours ago up to 50 hours in the future
    const minDue = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const maxDue = new Date(now.getTime() + 50 * 60 * 60 * 1000);

    let dispatchedCount = 0;
    const details: Array<{ taskId: string; targetUserId: string; reminderType: string; idempotencyKey: string }> = [];

    const tasks = await prisma.workspaceTodo.findMany({
      where: {
        completed: false,
        dueDate: {
          not: null,
          gte: minDue,
          lte: maxDue,
        },
        ...(targetTenantId ? { tenantId: targetTenantId } : {}),
      },
      take: 100,
    });

    for (const task of tasks) {
      if (!task.dueDate) continue;
      const diffMs = task.dueDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      let reminderType: "due-1d" | "due-2d" | null = null;
      let templateId: "todo-task-reminder-1-day" | "todo-task-reminder-2-days" | null = null;

      if (diffHours > 0 && diffHours <= 26) {
        reminderType = "due-1d";
        templateId = "todo-task-reminder-1-day";
      } else if (diffHours > 26 && diffHours <= 50) {
        reminderType = "due-2d";
        templateId = "todo-task-reminder-2-days";
      }

      if (!reminderType || !templateId) continue;

      const meta = parseTodoMeta(task.description);
      const assignees = meta.assignees.length > 0 ? meta.assignees : meta.assignee ? [meta.assignee] : [];

      // If no explicit assignees, notify creator
      const recipients: Array<{ id: string; type?: "user" | "employee" }> =
        assignees.length > 0 ? assignees : [{ id: task.userId, type: "user" }];

      for (const p of recipients) {
        const detailsObj = await TodoNotificationService.resolveAssigneeDetails(task.tenantId, p as any);
        const targetUserId = detailsObj.userId || p.id;
        if (!targetUserId) continue;

        const idempotencyKey = `todo:${task.id}:${targetUserId}:${reminderType}`;

        // Verify idempotency from recent notifications
        const recentNotifs = await prisma.notification.findMany({
          where: {
            tenantId: task.tenantId,
            userId: targetUserId,
            module: "TODO_REMINDER",
            createdAt: { gte: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000) },
          },
          select: { id: true, metadataJson: true },
          take: 50,
        });

        const alreadySent = recentNotifs.some(
          (n) => (n.metadataJson as any)?.idempotencyKey === idempotencyKey
        );

        if (alreadySent) continue;

        const taskUrl = await TodoNotificationService.resolveTaskUrl(task.tenantId, targetUserId, task.id);
        const title =
          reminderType === "due-1d"
            ? `Urgent: Task Due Tomorrow — ${task.title}`
            : `Reminder: Task Due in 2 Days — ${task.title}`;
        const message = `Task "${task.title}" is scheduled for completion on ${task.dueDate.toISOString().slice(0, 10)}.`;

        await TodoNotificationService.createInAppNotification({
          tenantId: task.tenantId,
          userId: targetUserId,
          title,
          message,
          type: "TODO_REMINDER",
          actionUrl: taskUrl,
          metadata: {
            taskId: task.id,
            idempotencyKey,
            reminderType,
            dueDate: task.dueDate.toISOString(),
          },
        });

        if (detailsObj.email) {
          try {
            await sendTodoNotificationEmail({
              templateId,
              toEmail: detailsObj.email,
              assigneeName: detailsObj.name,
              taskTitle: task.title,
              priority: task.priority,
              dueDate: task.dueDate.toISOString().slice(0, 10),
              taskUrl,
              tenantId: task.tenantId,
            });
          } catch (e: any) {
            console.warn("[CalendarReminderScheduler] Reminder email delivery warning:", e.message);
          }
        }

        dispatchedCount++;
        details.push({
          taskId: task.id,
          targetUserId,
          reminderType,
          idempotencyKey,
        });
      }
    }

    return { evaluatedCount: tasks.length, dispatchedCount, details };
  }
}
