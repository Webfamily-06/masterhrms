import { getTenantDb } from "../context/tenant-context";
import { getIO } from "../socket";

export interface CreateNotificationParams {
  tenantId: string;
  userId?: string;
  recipientUserId?: string;
  title: string;
  message: string;
  type?: string;
  actionUrl?: string;
  metadata?: any;
}

export class NotificationService {
  /**
   * Creates an in-app notification record and emits realtime event to user's authorized room.
   */
  public static async createNotification(params: CreateNotificationParams): Promise<any> {
    const db = getTenantDb();
    const targetUserId = params.userId || params.recipientUserId || "system";

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

    // Realtime push to the user's private room
    const io = getIO();
    if (io) {
      io.to(`user:${params.userId}`).emit("notification:new", notification);
      io.to(`tenant:${params.tenantId}`).emit("tenant:notification", {
        userId: params.userId,
        notificationId: notification.id,
      });
    }

    return notification;
  }

  public static async sendNotification(params: CreateNotificationParams): Promise<any> {
    return this.createNotification(params);
  }

  /**
   * Retrieves paginated notifications for an authenticated user.
   */
  public static async getUserNotifications(
    tenantId: string,
    userId: string,
    options: { unreadOnly?: boolean; limit?: number; offset?: number } = {}
  ): Promise<{ notifications: any[]; total: number; unreadCount: number }> {
    const db = getTenantDb();
    const { unreadOnly = false, limit = 20, offset = 0 } = options;

    const where: any = { tenantId, userId };
    if (unreadOnly) {
      where.readAt = null;
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
