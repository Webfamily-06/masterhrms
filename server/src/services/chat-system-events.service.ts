import { prisma, rawPrisma } from "../prisma";
import { broadcastToTenant } from "../socket";
import { PusherService } from "./pusher.service";

/**
 * Persists and broadcasts typed chat system events (group lifecycle, call history indications, etc.)
 */
export async function recordSystemEvent(
  tenantId: string,
  threadId: string,
  actorId: string,
  eventType: string,
  content: string,
  metadata: any = {},
  tx?: any
) {
  const db = tx || rawPrisma || prisma;
  let actorName = "System";
  let actorAvatar: string | null = null;
  if (actorId && actorId !== "system") {
    try {
      const prof = await db.profile.findFirst({
        where: { userId: actorId, tenantId },
        select: { fullName: true, avatarUrl: true },
      });
      actorName = prof?.fullName || "User";
      actorAvatar = prof?.avatarUrl || null;
    } catch {
      // Ignore profile lookup error
    }
  }

  const eventMsg = await db.chatMessage.create({
    data: {
      tenantId,
      threadId,
      senderId: "system",
      senderName: "System",
      content,
      isSystemEvent: true,
      eventType,
      eventMetadata: {
        actorId,
        actorName,
        actorAvatar,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
      deliveryStatus: "delivered",
    },
  });

  try {
    broadcastToTenant(tenantId, "chat:message", { threadId, message: eventMsg });
    broadcastToTenant(tenantId, "chat:system_event", { threadId, message: eventMsg, eventType });
    PusherService.triggerTenantEvent(tenantId, "chat:message", { threadId, message: eventMsg }).catch(() => {});
    PusherService.triggerTenantEvent(tenantId, "chat:system_event", { threadId, message: eventMsg, eventType }).catch(() => {});
  } catch (err: any) {
    console.warn("Realtime system event broadcast failed:", err.message);
  }

  return eventMsg;
}
