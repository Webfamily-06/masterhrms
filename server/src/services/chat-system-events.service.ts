import { prisma, rawPrisma } from "../prisma";
import { ChatService } from "./chat.service";

/**
 * Persists and broadcasts typed chat system events (group lifecycle, call history indications, etc.)
 * strictly to authorized conversation participants — never to tenant-wide channels.
 */
export async function recordSystemEvent(
  tenantId: string,
  threadId: string,
  actorId: string,
  eventType: string,
  content: string,
  metadata: any = {},
  tx?: any,
  explicitParticipantIds?: string[]
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

  // Only emit after persistence; if inside an uncommitted transaction (`tx`), defer emit to next tick
  const emitFn = async () => {
    try {
      await ChatService.emitToAuthorizedThread({
        tenantId,
        threadId,
        event: "chat:message",
        payload: { threadId, message: eventMsg },
        participantUserIds: explicitParticipantIds,
      });
      await ChatService.emitToAuthorizedThread({
        tenantId,
        threadId,
        event: "chat:system_event",
        payload: { threadId, message: eventMsg, eventType },
        participantUserIds: explicitParticipantIds,
      });
    } catch (err: any) {
      console.warn("Realtime system event broadcast failed:", err.message);
    }
  };

  if (tx) {
    setImmediate(() => {
      void emitFn();
    });
  } else {
    await emitFn();
  }

  return eventMsg;
}
