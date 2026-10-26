"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const tenant_context_1 = require("../context/tenant-context");
const prisma_1 = require("../prisma");
const socket_1 = require("../socket");
class NotificationService {
    /**
     * Creates an in-app notification record and emits realtime event to user's authorized room.
     * Includes idempotency check to prevent duplicate dispatches for the same event and reminder.
     */
    static async createNotification(params) {
        let db;
        try {
            db = (0, tenant_context_1.getTenantDb)();
        }
        catch {
            db = prisma_1.rawPrisma;
        }
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
        // Realtime push to the user's private room with comprehensive payload
        const io = (0, socket_1.getIO)();
        if (io) {
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
            io.to(`user:${targetUserId}`).emit("notification:new", payload);
            io.to(`tenant:${params.tenantId}`).emit("tenant:notification", {
                userId: targetUserId,
                notificationId: notification.id,
            });
        }
        return notification;
    }
    static async sendNotification(params) {
        return this.createNotification(params);
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
