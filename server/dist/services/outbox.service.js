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
const EXCLUDED_ENTITY_TYPES = ["EMAIL"];
const EXCLUDED_EVENT_TYPES = ["COMMERCE_ORDER_PAID"];
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
     * QUEUE-001 / PENTEST-003:
     * Atomically claims a batch of non-email, non-commerce PENDING outbox events using PostgreSQL
     * `FOR UPDATE SKIP LOCKED` so horizontally scaled instances never duplicate events,
     * and strictly excludes `entity_type = 'EMAIL'` and `email.%` events so private OTP/reset emails
     * are NEVER broadcast over Socket.IO or stolen from EmailOutboxService.
     */
    static async claimBatch(db, batchSize) {
        // 1. Recover any stale PROCESSING rows orphaned by a crashed worker (>5 min)
        if (typeof db.$executeRawUnsafe === "function") {
            await db
                .$executeRawUnsafe(`UPDATE outbox_events
           SET status = 'PENDING', retry_count = retry_count + 1, error = COALESCE(error, 'Recovered stale PROCESSING lock')
           WHERE status = 'PROCESSING'
             AND entity_type <> 'EMAIL'
             AND event_type <> 'COMMERCE_ORDER_PAID'
             AND event_type NOT LIKE 'email.%'
             AND retry_count < 5
             AND occurred_at < NOW() - INTERVAL '5 minutes'`)
                .catch(() => { });
        }
        // 2. Atomic claim with FOR UPDATE SKIP LOCKED (multi-worker safe)
        if (typeof db.$queryRawUnsafe === "function") {
            try {
                const rows = await db.$queryRawUnsafe(`WITH claimed AS (
             SELECT id
             FROM outbox_events
             WHERE status = 'PENDING'
               AND retry_count < 5
               AND entity_type <> 'EMAIL'
               AND event_type <> 'COMMERCE_ORDER_PAID'
               AND event_type NOT LIKE 'email.%'
             ORDER BY created_at ASC
             FOR UPDATE SKIP LOCKED
             LIMIT $1
           )
           UPDATE outbox_events o
           SET status = 'PROCESSING'
           FROM claimed
           WHERE o.id = claimed.id
           RETURNING
             o.id,
             o.tenant_id AS "tenantId",
             o.event_id AS "eventId",
             o.event_type AS "eventType",
             o.entity_type AS "entityType",
             o.entity_id AS "entityId",
             o.actor_id AS "actorId",
             o.payload,
             o.status,
             o.retry_count AS "retryCount",
             o.error,
             o.occurred_at AS "occurredAt",
             o.created_at AS "createdAt"`, batchSize);
                return rows || [];
            }
            catch {
                // Fallback for non-Postgres or mocked clients
            }
        }
        return await db.outboxEvent.findMany({
            where: {
                status: "PENDING",
                retryCount: { lt: 5 },
                entityType: { notIn: EXCLUDED_ENTITY_TYPES },
                eventType: { notIn: EXCLUDED_EVENT_TYPES },
                NOT: { eventType: { startsWith: "email." } },
            },
            orderBy: { createdAt: "asc" },
            take: batchSize,
        });
    }
    /**
     * Sweeps pending domain outbox events and dispatches them to authorized Realtime rooms.
     */
    static async processPendingEvents(batchSize = 25) {
        if (this.isProcessing)
            return 0;
        this.isProcessing = true;
        let processedCount = 0;
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        try {
            const pendingEvents = await this.claimBatch(db, batchSize);
            if (!pendingEvents || pendingEvents.length === 0) {
                return 0;
            }
            const io = (0, socket_1.getIO)();
            for (const event of pendingEvents) {
                try {
                    // Defense-in-depth guard: never broadcast EMAIL / OTP / Password Reset events over Socket.IO
                    const evtTypeLower = String(event.eventType || "").toLowerCase();
                    if (String(event.entityType || "").toUpperCase() === "EMAIL" ||
                        evtTypeLower.startsWith("email.") ||
                        evtTypeLower.includes("otp") ||
                        evtTypeLower.includes("password_reset")) {
                        await db.outboxEvent
                            .update({ where: { id: event.id }, data: { status: "PENDING" } })
                            .catch(() => { });
                        continue;
                    }
                    const metadata = event.payload?._metadata;
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
                        const isPrivateCommEvent = event.eventType.startsWith("CHAT_") ||
                            event.eventType.startsWith("chat:") ||
                            event.eventType.startsWith("CALL_") ||
                            event.eventType.startsWith("call:") ||
                            event.entityType === "ChatMessage" ||
                            event.entityType === "Call";
                        if (!isPrivateCommEvent && event.tenantId) {
                            io.to(`tenant:${event.tenantId}`).emit("domain:event", envelope);
                            io.to(`tenant:${event.tenantId}`).emit(event.eventType, envelope);
                        }
                        if (!isPrivateCommEvent && event.tenantId && event.entityType && event.entityId) {
                            io.to(`tenant:${event.tenantId}:record:${event.entityType}:${event.entityId}`).emit(event.eventType, envelope);
                        }
                        const recipientUserId = metadata?.targetUserId ||
                            event.payload?.recipientId ||
                            event.payload?.requesterId;
                        if (recipientUserId) {
                            io.to(`user:${recipientUserId}`).emit(event.eventType, envelope);
                        }
                        if (event.eventType.startsWith("storage.") ||
                            event.eventType.startsWith("storage:") ||
                            event.eventType.startsWith("quota.") ||
                            event.eventType.startsWith("quota:") ||
                            event.eventType.startsWith("file.") ||
                            event.eventType.startsWith("file:")) {
                            io.to("platform:admin").emit("storage:platform:update", {
                                tenantId: event.tenantId,
                                eventType: event.eventType,
                                payload: event.payload,
                                occurredAt: event.occurredAt || event.createdAt,
                            });
                            io.to("platform:admin").emit(event.eventType, envelope);
                        }
                    }
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
     * Returns non-PII queue depth counts for health & ops monitoring.
     */
    static async getQueueMetrics() {
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        try {
            const grouped = await db.outboxEvent.groupBy({
                by: ["entityType", "status"],
                _count: { id: true },
            });
            const summary = {
                domain: { pending: 0, processing: 0, processed: 0, failed: 0 },
                email: { pending: 0, processing: 0, processed: 0, failed: 0 },
            };
            for (const row of grouped || []) {
                const bucket = String(row.entityType || "").toUpperCase() === "EMAIL" ? summary.email : summary.domain;
                const st = String(row.status || "").toLowerCase();
                if (st in bucket)
                    bucket[st] += Number(row._count?.id || 0);
            }
            return summary;
        }
        catch {
            return {
                domain: { pending: 0, processing: 0, processed: 0, failed: 0 },
                email: { pending: 0, processing: 0, processed: 0, failed: 0 },
            };
        }
    }
    static startProcessor(intervalMs = 3000) {
        if (this.processorTimer)
            return;
        this.processorTimer = setInterval(() => {
            this.processPendingEvents().catch((err) => console.error("[OutboxService] Unhandled processor loop error:", err));
        }, intervalMs);
        if (this.processorTimer.unref)
            this.processorTimer.unref();
    }
    static stopProcessor() {
        if (this.processorTimer) {
            clearInterval(this.processorTimer);
            this.processorTimer = null;
        }
    }
}
exports.OutboxService = OutboxService;
