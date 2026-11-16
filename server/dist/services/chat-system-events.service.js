"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordSystemEvent = recordSystemEvent;
const prisma_1 = require("../prisma");
const chat_service_1 = require("./chat.service");
/**
 * Persists and broadcasts typed chat system events (group lifecycle, call history indications, etc.)
 * strictly to authorized conversation participants — never to tenant-wide channels.
 */
async function recordSystemEvent(tenantId, threadId, actorId, eventType, content, metadata = {}, tx, explicitParticipantIds) {
    const db = tx || prisma_1.rawPrisma || prisma_1.prisma;
    let actorName = "System";
    let actorAvatar = null;
    if (actorId && actorId !== "system") {
        try {
            const prof = await db.profile.findFirst({
                where: { userId: actorId, tenantId },
                select: { fullName: true, avatarUrl: true },
            });
            actorName = prof?.fullName || "User";
            actorAvatar = prof?.avatarUrl || null;
        }
        catch {
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
            await chat_service_1.ChatService.emitToAuthorizedThread({
                tenantId,
                threadId,
                event: "chat:message",
                payload: { threadId, message: eventMsg },
                participantUserIds: explicitParticipantIds,
            });
            await chat_service_1.ChatService.emitToAuthorizedThread({
                tenantId,
                threadId,
                event: "chat:system_event",
                payload: { threadId, message: eventMsg, eventType },
                participantUserIds: explicitParticipantIds,
            });
        }
        catch (err) {
            console.warn("Realtime system event broadcast failed:", err.message);
        }
    };
    if (tx) {
        setImmediate(() => {
            void emitFn();
        });
    }
    else {
        await emitFn();
    }
    return eventMsg;
}
