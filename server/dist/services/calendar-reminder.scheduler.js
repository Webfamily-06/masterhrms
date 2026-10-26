"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarReminderScheduler = void 0;
exports.parseCalendarMetadata = parseCalendarMetadata;
exports.serializeCalendarMetadata = serializeCalendarMetadata;
const prisma_1 = require("../prisma");
const notification_service_1 = require("./notification.service");
const pusher_service_1 = require("./pusher.service");
const email_1 = require("../lib/email");
const tenant_context_1 = require("../context/tenant-context");
const todos_routes_1 = require("../routes/todos.routes");
const todo_notification_service_1 = require("./todo-notification.service");
function parseCalendarMetadata(description) {
    if (!description)
        return { cleanDescription: "", shares: [], reminders: [] };
    let clean = description;
    const shares = [];
    const reminders = [];
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
        }
        catch { }
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
function serializeCalendarMetadata(cleanDescription, sharesOrMeta, remindersList) {
    let result = (cleanDescription || "").trim();
    let shares = [];
    let reminders = [];
    if (Array.isArray(sharesOrMeta)) {
        shares = sharesOrMeta || [];
        reminders = remindersList || [];
    }
    else if (sharesOrMeta && typeof sharesOrMeta === "object") {
        shares = sharesOrMeta.shares || [];
        reminders = sharesOrMeta.reminders || remindersList || [];
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
let schedulerTimer = null;
class CalendarReminderScheduler {
    /**
     * Starts periodic reminder runner (every 60 seconds).
     */
    static start() {
        if (schedulerTimer)
            return;
        schedulerTimer = setInterval(async () => {
            try {
                await this.processDueReminders();
            }
            catch (err) {
                console.warn(`[CalendarReminderScheduler] Runner error: ${err.message}`);
            }
            try {
                await this.processDueTodoReminders();
            }
            catch (err) {
                console.warn(`[CalendarReminderScheduler] Todo runner error: ${err.message}`);
            }
        }, 60000);
        schedulerTimer.unref();
        console.log("⏰ [CalendarReminderScheduler] Background reminder scheduler started.");
    }
    /**
     * Stops the periodic timer.
     */
    static stop() {
        if (schedulerTimer) {
            clearInterval(schedulerTimer);
            schedulerTimer = null;
        }
    }
    /**
     * Evaluates events with pending reminders and dispatches notifications when due.
     * Utilizes relational CalendarEventReminder model with fallback to legacy description metadata.
     */
    static async processDueReminders(targetTenantId) {
        const now = new Date();
        // Check events from 24h ago up to 30 days in future
        const minStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const maxStart = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        let dispatchedCount = 0;
        const details = [];
        // 0. Recover orphaned "processing" reminders from crashed scheduler workers (> 5 mins old)
        try {
            await prisma_1.rawPrisma.calendarEventReminder.updateMany({
                where: {
                    status: "processing",
                    updatedAt: { lt: new Date(now.getTime() - 5 * 60 * 1000) },
                },
                data: {
                    status: "retryable_failure",
                    nextRetryAt: now,
                },
            });
        }
        catch (recoverErr) {
            console.warn("[CalendarReminderScheduler] Orphan recovery warning:", recoverErr.message);
        }
        // 1. Process relational reminders (pending or eligible retryable_failure)
        const relationalReminders = await prisma_1.rawPrisma.calendarEventReminder.findMany({
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
        const processedEventIds = new Set();
        for (const r of relationalReminders) {
            const ev = r.event;
            if (!ev)
                continue;
            processedEventIds.add(ev.id);
            const eventStartTime = ev.startDate.getTime();
            const dueTime = r.customScheduledAt
                ? new Date(r.customScheduledAt).getTime()
                : eventStartTime - r.minutesBefore * 60 * 1000;
            if (now.getTime() >= dueTime) {
                // Atomic claim: Mark processing to prevent concurrent worker execution
                try {
                    const claimResult = await prisma_1.rawPrisma.calendarEventReminder.updateMany({
                        where: { id: r.id, status: { in: ["pending", "retryable_failure"] } },
                        data: { status: "processing" },
                    });
                    if (claimResult.count === 0) {
                        continue; // Claimed by another concurrent worker instance
                    }
                }
                catch {
                    continue; // Claimed by another worker
                }
                // Collect target users (organizer + shared recipients)
                const targetUserIds = new Set();
                targetUserIds.add(ev.userId);
                for (const s of ev.shares) {
                    targetUserIds.add(s.recipientId);
                }
                let reminderText;
                if (r.customScheduledAt) {
                    const customDate = new Date(r.customScheduledAt);
                    const formattedCustom = customDate.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    });
                    reminderText = `Scheduled for ${formattedCustom}`;
                }
                else if (r.minutesBefore === 0) {
                    reminderText = "Starting now!";
                }
                else if (r.minutesBefore === 5) {
                    reminderText = "Starting in 5 minutes";
                }
                else if (r.minutesBefore === 15) {
                    reminderText = "Starting in 15 minutes";
                }
                else if (r.minutesBefore === 30) {
                    reminderText = "Starting in 30 minutes";
                }
                else if (r.minutesBefore === 60) {
                    reminderText = "Starting in 1 hour";
                }
                else if (r.minutesBefore === 120) {
                    reminderText = "Starting in 2 hours";
                }
                else if (r.minutesBefore === 300) {
                    reminderText = "Starting in 5 hours";
                }
                else if (r.minutesBefore === 1440) {
                    reminderText = "Starting in 1 day";
                }
                else if (r.minutesBefore === 390) {
                    reminderText = "Starting in 6.5 hours (390 minutes)";
                }
                else {
                    reminderText = `Starting in ${r.minutesBefore} minutes`;
                }
                let inAppSuccess = false;
                let emailSuccess = false;
                let lastErrorMsg = null;
                // Dispatch In-App Notification & Pusher
                if (r.channel === "in_app" || r.channel === "both") {
                    for (const uid of targetUserIds) {
                        try {
                            await (0, tenant_context_1.runWithTenantContext)({
                                tenantId: ev.tenantId,
                                userId: uid,
                                roles: ["employee"],
                                status: "ACTIVE",
                                tenancyStrategy: "SHARED_SCHEMA",
                                db: prisma_1.rawPrisma,
                            }, async () => {
                                await notification_service_1.NotificationService.createNotification({
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
                            });
                            await pusher_service_1.PusherService.triggerUserEvent(ev.tenantId, uid, "calendar:reminder-due", {
                                eventId: ev.id,
                                title: ev.title,
                                reminderText,
                                minutesBefore: r.minutesBefore,
                                customScheduledAt: r.customScheduledAt?.toISOString() || null,
                                startDate: ev.startDate.toISOString(),
                            });
                            inAppSuccess = true;
                        }
                        catch (err) {
                            lastErrorMsg = `In-app error: ${err.message}`;
                            console.warn(`[CalendarReminderScheduler] In-app notification error for user ${uid}:`, err.message);
                        }
                    }
                }
                // Dispatch Email
                if (r.channel === "email" || r.channel === "both") {
                    const users = await prisma_1.rawPrisma.user.findMany({
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
                                await (0, email_1.sendCalendarNotificationEmail)({
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
                            }
                            catch (err) {
                                lastErrorMsg = `Email error: ${err.message}`;
                                console.warn(`[CalendarReminderScheduler] Email error for ${u.email}:`, err.message);
                            }
                        }
                    }
                }
                const isDispatched = r.channel === "both"
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
                    await prisma_1.rawPrisma.calendarEventReminder.update({
                        where: { id: r.id },
                        data: {
                            status: "dispatched",
                            dispatchedAt: new Date(),
                            lastError: null,
                            channelStatus,
                        },
                    });
                    dispatchedCount++;
                }
                else {
                    // Transient delivery failure handling with exponential backoff
                    const currentRetries = (r.retryCount || 0) + 1;
                    const maxRetries = r.maxRetries || 3;
                    if (currentRetries < maxRetries) {
                        const backoffMs = Math.pow(2, currentRetries) * 60000; // 2m, 4m, 8m
                        await prisma_1.rawPrisma.calendarEventReminder.update({
                            where: { id: r.id },
                            data: {
                                status: "retryable_failure",
                                retryCount: currentRetries,
                                nextRetryAt: new Date(now.getTime() + backoffMs),
                                lastError: lastErrorMsg || "Transient delivery failure",
                                channelStatus,
                            },
                        });
                    }
                    else {
                        // Permanent failure after max retries
                        await prisma_1.rawPrisma.calendarEventReminder.update({
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
                        await prisma_1.rawPrisma.calendarEvent.update({
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
        const legacyEvents = await prisma_1.rawPrisma.calendarEvent.findMany({
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
            if (!meta.reminders || meta.reminders.length === 0)
                continue;
            let eventModified = false;
            const eventStartTime = ev.startDate.getTime();
            for (const r of meta.reminders) {
                if (r.status !== "pending")
                    continue;
                const dueTime = r.customScheduledAt
                    ? new Date(r.customScheduledAt).getTime()
                    : eventStartTime - r.minutesBefore * 60 * 1000;
                if (now.getTime() >= dueTime) {
                    const targetUserIds = new Set();
                    targetUserIds.add(ev.userId);
                    for (const s of meta.shares) {
                        targetUserIds.add(s.recipientId);
                    }
                    let reminderText = `Starting in ${r.minutesBefore} minutes`;
                    if (r.minutesBefore === 0)
                        reminderText = "Starting now!";
                    let inAppSuccess = false;
                    let emailSuccess = false;
                    if (r.channel === "in_app" || r.channel === "both") {
                        for (const uid of targetUserIds) {
                            try {
                                await (0, tenant_context_1.runWithTenantContext)({
                                    tenantId: ev.tenantId,
                                    userId: uid,
                                    roles: ["employee"],
                                    status: "ACTIVE",
                                    tenancyStrategy: "SHARED_SCHEMA",
                                    db: prisma_1.rawPrisma,
                                }, async () => {
                                    await notification_service_1.NotificationService.createNotification({
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
                                });
                                inAppSuccess = true;
                            }
                            catch (err) {
                                console.warn(`[CalendarReminderScheduler] Legacy in-app notification error:`, err.message);
                            }
                        }
                    }
                    const isDispatched = inAppSuccess || emailSuccess;
                    r.status = isDispatched ? "dispatched" : "failed";
                    r.dispatchedAt = new Date().toISOString();
                    eventModified = true;
                    if (isDispatched)
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
                const updatedDesc = serializeCalendarMetadata(meta.cleanDescription, meta.shares, meta.reminders);
                await prisma_1.rawPrisma.calendarEvent.update({
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
    static async processDueTodoReminders(targetTenantId) {
        const now = new Date();
        // Scan tasks with due date in range: from 2 hours ago up to 50 hours in the future
        const minDue = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        const maxDue = new Date(now.getTime() + 50 * 60 * 60 * 1000);
        let dispatchedCount = 0;
        const details = [];
        const tasks = await prisma_1.rawPrisma.workspaceTodo.findMany({
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
            if (!task.dueDate)
                continue;
            const diffMs = task.dueDate.getTime() - now.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            let reminderType = null;
            let templateId = null;
            if (diffHours > 0 && diffHours <= 26) {
                reminderType = "due-1d";
                templateId = "todo-task-reminder-1-day";
            }
            else if (diffHours > 26 && diffHours <= 50) {
                reminderType = "due-2d";
                templateId = "todo-task-reminder-2-days";
            }
            if (!reminderType || !templateId)
                continue;
            const meta = (0, todos_routes_1.parseTodoMeta)(task.description);
            const assignees = meta.assignees.length > 0 ? meta.assignees : meta.assignee ? [meta.assignee] : [];
            // If no explicit assignees, notify creator
            const recipients = assignees.length > 0 ? assignees : [{ id: task.userId, type: "user" }];
            for (const p of recipients) {
                const detailsObj = await todo_notification_service_1.TodoNotificationService.resolveAssigneeDetails(task.tenantId, p);
                const targetUserId = detailsObj.userId || p.id;
                if (!targetUserId)
                    continue;
                const idempotencyKey = `todo:${task.id}:${targetUserId}:${reminderType}`;
                // Verify idempotency from recent notifications
                const recentNotifs = await prisma_1.rawPrisma.notification.findMany({
                    where: {
                        tenantId: task.tenantId,
                        userId: targetUserId,
                        module: "TODO_REMINDER",
                        createdAt: { gte: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000) },
                    },
                    select: { id: true, metadataJson: true },
                    take: 50,
                });
                const alreadySent = recentNotifs.some((n) => n.metadataJson?.idempotencyKey === idempotencyKey);
                if (alreadySent)
                    continue;
                const taskUrl = await todo_notification_service_1.TodoNotificationService.resolveTaskUrl(task.tenantId, targetUserId, task.id);
                const title = reminderType === "due-1d"
                    ? `Urgent: Task Due Tomorrow — ${task.title}`
                    : `Reminder: Task Due in 2 Days — ${task.title}`;
                const message = `Task "${task.title}" is scheduled for completion on ${task.dueDate.toISOString().slice(0, 10)}.`;
                await todo_notification_service_1.TodoNotificationService.createInAppNotification({
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
                        await (0, email_1.sendTodoNotificationEmail)({
                            templateId,
                            toEmail: detailsObj.email,
                            assigneeName: detailsObj.name,
                            taskTitle: task.title,
                            priority: task.priority,
                            dueDate: task.dueDate.toISOString().slice(0, 10),
                            taskUrl,
                            tenantId: task.tenantId,
                        });
                    }
                    catch (e) {
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
exports.CalendarReminderScheduler = CalendarReminderScheduler;
