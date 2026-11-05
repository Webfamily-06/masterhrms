import { getTenantDb, getTenantContext } from "../context/tenant-context";
import { rawPrisma } from "../prisma";
import { getIO } from "../socket";
import { PusherService } from "./pusher.service";
import { VapidService } from "./vapid.service";
import { PushSubscriptionStore } from "./push-subscription.store";

export interface CreateNotificationParams {
  tenantId: string;
  userId?: string;
  recipientUserId?: string;
  title: string;
  message: string;
  type?: string;
  actionUrl?: string;
  metadata?: any;
  idempotencyKey?: string;
}

export class NotificationService {
  /**
   * Creates an in-app notification record and emits realtime event to user's authorized room.
   * Includes idempotency check to prevent duplicate dispatches for the same event and reminder.
   */
  public static async createNotification(params: CreateNotificationParams): Promise<any> {
    const tenantCtx = getTenantContext();
    const db: any = tenantCtx?.db || rawPrisma;
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

        const existingDuplicate = recentNotifications.find((n: any) => {
          const meta = n.metadataJson;
          return (
            meta &&
            meta.eventId === params.metadata.eventId &&
            meta.reminderId === params.metadata.reminderId
          );
        });

        if (existingDuplicate) {
          return existingDuplicate;
        }
      } catch (checkErr) {
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

    const io = getIO();
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
    void PusherService.triggerUserEvent(params.tenantId, targetUserId, "notification:new", payload)
      .catch(() => {});

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

  public static async sendNotification(params: CreateNotificationParams): Promise<any> {
    return this.createNotification(params);
  }

  /**
   * Dispatches standard RFC 8291 Web Push notifications to all active device subscriptions of recipient.
   */
  public static async dispatchWebPush(tenantId: string, userId: string, payload: any): Promise<{ sent: number; failed: number }> {
    try {
      const subscriptions = await PushSubscriptionStore.getActiveSubscriptions(tenantId, userId);
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
      await Promise.allSettled(
        subscriptions.map(async (sub) => {
          const res = await VapidService.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            pushPayload,
            { ttl: 86400, urgency: "normal", topic: `notif_${payload.module?.toLowerCase() || "system"}` }
          );
          if (res.success) {
            sent++;
          } else {
            failed++;
            if (res.isExpired) {
              await PushSubscriptionStore.markExpired(userId, sub.endpoint);
            }
          }
        })
      );
      return { sent, failed };
    } catch (err: any) {
      console.warn(`[NotificationService] Web Push delivery error for user ${userId}:`, err?.message);
      return { sent: 0, failed: 0 };
    }
  }

  /**
   * Retrieves paginated notifications for an authenticated user with category/module filtering.
   */
  public static async getUserNotifications(
    tenantId: string,
    userId: string,
    options: { unreadOnly?: boolean; limit?: number; offset?: number; module?: string } = {}
  ): Promise<{ notifications: any[]; total: number; unreadCount: number }> {
    const db = getTenantDb();
    const { unreadOnly = false, limit = 20, offset = 0, module } = options;

    const where: any = { tenantId, userId };
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
      } else if (mod === "PUNCH" || mod === "ATTENDANCE") {
        where.module = { in: ["PUNCH", "ATTENDANCE"] };
      } else if (mod === "LEAVE") {
        where.module = { in: ["LEAVE"] };
      } else if (mod === "PAYROLL") {
        where.module = { in: ["PAYROLL", "INVOICE", "BILLING"] };
      } else if (mod === "CHAT") {
        where.module = { in: ["CHAT", "MESSAGE"] };
      } else if (mod === "SYSTEM") {
        where.module = { in: ["SYSTEM", "GENERAL", "SECURITY"] };
      } else {
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
  public static async markAsRead(
    tenantId: string,
    notificationId: string,
    userId: string
  ): Promise<any> {
    const db = getTenantDb();
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
  public static async markAllAsRead(tenantId: string, userId: string): Promise<any> {
    const db = getTenantDb();
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
