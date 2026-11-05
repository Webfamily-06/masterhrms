"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const tenant_context_1 = require("../context/tenant-context");
const prisma_1 = require("../prisma");
const socket_1 = require("../socket");
const pusher_service_1 = require("./pusher.service");
const vapid_service_1 = require("./vapid.service");
const push_subscription_store_1 = require("./push-subscription.store");
class NotificationService {
    /**
     * Creates an in-app notification record and emits realtime event to user's authorized room.
     * Includes idempotency check to prevent duplicate dispatches for the same event and reminder.
     */
    static async createNotification(params) {
        const tenantCtx = (0, tenant_context_1.getTenantContext)();
        const db = tenantCtx?.db || prisma_1.rawPrisma;
        const targetUserId = params.userId || params.recipientUserId || "system";
        // 1. Idempotency check for event reminders to prevent duplicate DB records
        if (params.metadata?.eventId && params.metadata?.reminderId) {
            try {
                const recentNotifications = await db.notification.findMany({
                    where: {
                        tenantId: params.tenantId,
                        userId: targetUserId,
                        module: params.type || "CALENDAR_REMINDER",
                        createdAt: {
                            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                        },
                    },
                    select: {
                        id: true,
                        tenantId: true,
                        userId: true,
                        title: true,
                        body: true,
                        module: true,
                        channel: true,
                        linkTo: true,
                        readAt: true,
                        metadataJson: true,
                        createdAt: true,
                    },
                    take: 50,
                });
                const existingDuplicate = recentNotifications.find((n) => {
                    const meta = n.metadataJson;
                    return (meta &&
                        meta.eventId === params.metadata.eventId &&
                        meta.reminderId === params.metadata.reminderId);
                });
                if (existingDuplicate) {
                    return existingDuplicate;
                }
            }
            catch (checkErr) {
                // Fallback to insertion if idempotency check encounters an issue
                console.warn("[NotificationService] Idempotency check skipped:", checkErr);
            }
        }
        const notification = await db.notification.create({
            data: {
                tenantId: params.tenantId,
                userId: targetUserId,
                title: params.title,
                body: params.message,
                module: params.type || "SYSTEM",
                channel: "IN_APP",
                linkTo: params.actionUrl ?? null,
                metadataJson: params.metadata ?? null,
            },
        });
        // Realtime push to the user's private room with comprehensive payload.
        // Pusher remains available when this process does not own a Socket.IO
        // instance (for example a scheduler/worker process).
        const payload = {
            id: notification.id,
            tenantId: notification.tenantId,
            userId: notification.userId,
            title: notification.title,
            body: notification.body,
            description: notification.body,
            module: notification.module,
            type: notification.module,
            channel: notification.channel,
            linkTo: notification.linkTo,
            metadataJson: notification.metadataJson,
            createdAt: notification.createdAt,
            timestamp: notification.createdAt,
            read: Boolean(notification.readAt),
        };
        const io = (0, socket_1.getIO)();
        if (io) {
            io.to(`user:${targetUserId}`).emit("notification:new", payload);
            io.to(`tenant:${params.tenantId}`).emit("tenant:notification", {
                userId: targetUserId,
                notificationId: notification.id,
            });
        }
        // Socket.IO is the primary in-app transport. Pusher is the resilient
        // secondary transport used by clients that are subscribed to the private
        // user channel (for example after a transient Socket.IO disconnect).
        // Delivery must never make notification persistence fail.
        void pusher_service_1.PusherService.triggerUserEvent(params.tenantId, targetUserId, "notification:new", payload)
            .catch(() => { });
        // Web Push (RFC 8291 / RFC 8292) delivery to user's registered browser/device subscriptions
        void this.dispatchWebPush(params.tenantId, targetUserId, {
            id: notification.id,
            title: notification.title,
            body: notification.body,
            type: notification.module,
            module: notification.module,
            linkTo: notification.linkTo,
            actionUrl: notification.linkTo || (params.metadata?.actionUrl) || "/",
            metadata: notification.metadataJson,
            createdAt: notification.createdAt,
        }).catch((err) => {
            console.warn("[NotificationService] Web Push dispatch failed:", err?.message || err);
        });
        return notification;
    }
    static async sendNotification(params) {
        return this.createNotification(params);
    }
    /**
     * Dispatches standard RFC 8291 Web Push notifications to all active device subscriptions of recipient.
     */
    static async dispatchWebPush(tenantId, userId, payload) {
        try {
            const subscriptions = await push_subscription_store_1.PushSubscriptionStore.getActiveSubscriptions(tenantId, userId);
            if (!subscriptions || subscriptions.length === 0) {
                return { sent: 0, failed: 0 };
            }
            const pushPayload = {
                type: "NOTIFICATION_NEW",
                eventType: "NOTIFICATION_NEW",
                schemaVersion: "1.0",
                id: payload.id,
                notificationId: payload.id,
                tenantId,
                title: payload.title || "MasterHRMS Alert",
                body: payload.body || "",
                message: payload.body || "",
                module: payload.module || "SYSTEM",
                linkTo: payload.linkTo || "/",
                actionUrl: payload.actionUrl || payload.linkTo || "/",
                icon: "/assets/img/logo-small.svg",
                badge: "/assets/img/favicon.png",
                tag: `notif_${payload.id}`,
                timestamp: payload.createdAt || new Date().toISOString(),
                metadata: payload.metadata || null,
            };
            let sent = 0;
            let failed = 0;
            await Promise.allSettled(subscriptions.map(async (sub) => {
                const res = await vapid_service_1.VapidService.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, pushPayload, { ttl: 86400, urgency: "normal", topic: `notif_${payload.module?.toLowerCase() || "system"}` });
                if (res.success) {
                    sent++;
                }
                else {
                    failed++;
                    if (res.isExpired) {
                        await push_subscription_store_1.PushSubscriptionStore.markExpired(userId, sub.endpoint);
                    }
                }
            }));
            return { sent, failed };
        }
        catch (err) {
            console.warn(`[NotificationService] Web Push delivery error for user ${userId}:`, err?.message);
            return { sent: 0, failed: 0 };
        }
    }
    /**
     * Retrieves paginated notifications for an authenticated user with category/module filtering.
     */
    static async getUserNotifications(tenantId, userId, options = {}) {
        const db = (0, tenant_context_1.getTenantDb)();
        const { unreadOnly = false, limit = 20, offset = 0, module } = options;
        const where = { tenantId, userId };
        if (unreadOnly) {
            where.readAt = null;
        }
        if (module && module !== "all") {
            const mod = module.toUpperCase();
            if (mod === "CALENDAR") {
                where.module = {
                    in: [
                        "CALENDAR",
                        "CALENDAR_REMINDER",
                        "CALENDAR_INVITE",
                        "CALENDAR_SHARE",
                        "CALENDAR_CANCEL",
                        "CALENDAR_REVOKE",
                        "MEETINGS",
                    ],
                };
            }
            else if (mod === "PUNCH" || mod === "ATTENDANCE") {
                where.module = { in: ["PUNCH", "ATTENDANCE"] };
            }
            else if (mod === "LEAVE") {
                where.module = { in: ["LEAVE"] };
            }
            else if (mod === "PAYROLL") {
                where.module = { in: ["PAYROLL", "INVOICE", "BILLING"] };
            }
            else if (mod === "CHAT") {
                where.module = { in: ["CHAT", "MESSAGE"] };
            }
            else if (mod === "SYSTEM") {
                where.module = { in: ["SYSTEM", "GENERAL", "SECURITY"] };
            }
            else {
                where.module = { equals: mod };
            }
        }
        const [notifications, total, unreadCount] = await Promise.all([
            db.notification.findMany({
                where,
                orderBy: { createdAt: "desc" },
                take: limit,
                skip: offset,
            }),
            db.notification.count({ where }),
            db.notification.count({ where: { tenantId, userId, readAt: null } }),
        ]);
        return { notifications, total, unreadCount };
    }
    /**
     * Marks a specific notification as read.
     */
    static async markAsRead(tenantId, notificationId, userId) {
        const db = (0, tenant_context_1.getTenantDb)();
        return await db.notification.updateMany({
            where: {
                id: notificationId,
                tenantId,
                userId,
            },
            data: {
                readAt: new Date(),
            },
        });
    }
    /**
     * Marks all notifications as read for a user.
     */
    static async markAllAsRead(tenantId, userId) {
        const db = (0, tenant_context_1.getTenantDb)();
        return await db.notification.updateMany({
            where: {
                tenantId,
                userId,
                readAt: null,
            },
            data: {
                readAt: new Date(),
            },
        });
    }
}
exports.NotificationService = NotificationService;
