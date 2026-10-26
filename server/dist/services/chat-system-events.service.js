"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordSystemEvent = recordSystemEvent;
const prisma_1 = require("../prisma");
const socket_1 = require("../socket");
const pusher_service_1 = require("./pusher.service");
/**
 * Persists and broadcasts typed chat system events (group lifecycle, call history indications, etc.)
 */
async function recordSystemEvent(tenantId, threadId, actorId, eventType, content, metadata = {}, tx) {
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
    try {
        (0, socket_1.broadcastToTenant)(tenantId, "chat:message", { threadId, message: eventMsg });
        (0, socket_1.broadcastToTenant)(tenantId, "chat:system_event", { threadId, message: eventMsg, eventType });
        pusher_service_1.PusherService.triggerTenantEvent(tenantId, "chat:message", { threadId, message: eventMsg }).catch(() => { });
        pusher_service_1.PusherService.triggerTenantEvent(tenantId, "chat:system_event", { threadId, message: eventMsg, eventType }).catch(() => { });
    }
    catch (err) {
        console.warn("Realtime system event broadcast failed:", err.message);
    }
    return eventMsg;
}
