"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const tenant_context_1 = require("../context/tenant-context");
const socket_1 = require("../socket");
const prisma_1 = require("../prisma");
class OutboxService {
    static processorTimer = null;
    static isProcessing = false;
    /**
     * Persists an event into the transactional outbox table.
     * Can be passed an interactive Prisma transaction ($transaction) to ensure
     * atomic database persistence alongside the business mutation.
     */
    static async createOutboxEvent(params, tx) {
        const db = tx || ((0, tenant_context_1.getTenantContext)()?.db ? (0, tenant_context_1.getTenantDb)() : (prisma_1.rawPrisma || prisma_1.prisma));
        const eventId = crypto_1.default.randomUUID();
        return await db.outboxEvent.create({
            data: {
                tenantId: params.tenantId,
                eventId,
                eventType: params.eventType,
                entityType: params.entityType,
                entityId: params.entityId,
                actorId: params.actorId ?? null,
                status: "PENDING",
                payload: {
                    ...params.payload,
                    ...(params.metadata ? { _metadata: params.metadata } : {}),
                },
            },
        });
    }
    static async createEvent(paramsOrTenantId, arg2, arg3, arg4, arg5) {
        if (typeof paramsOrTenantId === "string") {
            return this.createOutboxEvent({
                tenantId: paramsOrTenantId,
                eventType: arg2,
                entityType: arg3,
                entityId: arg4,
                payload: arg5 || {},
            });
        }
        return this.createOutboxEvent(paramsOrTenantId, arg2);
    }
    static async publish(params, tx) {
        return this.createOutboxEvent({
            tenantId: params.tenantId,
            eventType: params.eventType,
            entityType: params.entityType || "RECRUITMENT",
            entityId: params.entityId,
            actorId: params.actorId,
            payload: params.payload,
            metadata: params.metadata,
        }, tx);
    }
    /**
     * Sweeps pending outbox events and dispatches them to authorized Realtime rooms.
     */
    static async processPendingEvents(batchSize = 25) {
        if (this.isProcessing)
            return 0;
        this.isProcessing = true;
        let processedCount = 0;
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        try {
            const pendingEvents = await db.outboxEvent.findMany({
                where: {
                    status: "PENDING",
                    retryCount: { lt: 5 },
                    eventType: { notIn: ["COMMERCE_ORDER_PAID"] },
                },
                orderBy: { createdAt: "asc" },
                take: batchSize,
            });
            if (!pendingEvents || pendingEvents.length === 0) {
                this.isProcessing = false;
                return 0;
            }
            const io = (0, socket_1.getIO)();
            for (const event of pendingEvents) {
                try {
                    const metadata = event.payload?._metadata;
                    // Standard Event Envelope
                    const envelope = {
                        eventId: event.eventId,
                        eventType: event.eventType,
                        tenantId: event.tenantId,
                        entityType: event.entityType,
                        entityId: event.entityId,
                        actorId: event.actorId,
                        occurredAt: event.occurredAt || event.createdAt,
                        payload: event.payload,
                        metadata,
                    };
                    if (io) {
                        // 1. Dispatch to tenant room
                        io.to(`tenant:${event.tenantId}`).emit("domain:event", envelope);
                        io.to(`tenant:${event.tenantId}`).emit(event.eventType, envelope);
                        // 2. Dispatch to specific record room if subscribed
                        io.to(`record:${event.entityType}:${event.entityId}`).emit(event.eventType, envelope);
                        // 3. Dispatch to targeted user room if present in metadata/payload
                        const recipientUserId = metadata?.targetUserId ||
                            event.payload?.recipientId ||
                            event.payload?.requesterId;
                        if (recipientUserId) {
                            io.to(`user:${recipientUserId}`).emit(event.eventType, envelope);
                        }
                    }
                    // Mark event as processed
                    try {
                        await db.outboxEvent.update({
                            where: { id: event.id },
                            data: {
                                status: "PROCESSED",
                                processedAt: new Date(),
                            },
                        });
                        processedCount++;
                    }
                    catch (updateErr) {
                        if (updateErr.code !== "P2025")
                            throw updateErr;
                    }
                }
                catch (err) {
                    if (err.code === "P2025")
                        continue;
                    console.error(`[OutboxService] Failed processing event ${event.id}:`, err.message);
                    try {
                        await db.outboxEvent.update({
                            where: { id: event.id },
                            data: {
                                retryCount: { increment: 1 },
                                error: err.message,
                                status: event.retryCount >= 4 ? "FAILED" : "PENDING",
                            },
                        });
                    }
                    catch (e) {
                        if (e.code !== "P2025") {
                            console.error("[OutboxService] Failed updating retry status:", e.message);
                        }
                    }
                }
            }
        }
        catch (err) {
            console.error("[OutboxService] Processing sweep error:", err.message);
        }
        finally {
            this.isProcessing = false;
        }
        return processedCount;
    }
    /**
     * Starts the background outbox event processor.
     */
    static startProcessor(intervalMs = 3000) {
        if (this.processorTimer)
            return;
        this.processorTimer = setInterval(() => {
            this.processPendingEvents().catch((err) => console.error("[OutboxService] Unhandled processor loop error:", err));
        }, intervalMs);
    }
    /**
     * Stops the background outbox processor.
     */
    static stopProcessor() {
        if (this.processorTimer) {
            clearInterval(this.processorTimer);
            this.processorTimer = null;
        }
    }
}
exports.OutboxService = OutboxService;
