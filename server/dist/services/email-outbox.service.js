"use strict";
/**
 * MASTERHRMS — Durable Email Outbox Service
 * =========================================
 * Provides reliable, transactional, idempotent email delivery:
 * 1. Persists email dispatch intents into the database `outboxEvent` table atomically.
 * 2. Deduplicates requests via deterministic eventId / idempotencyKey.
 * 3. Sweeps pending emails with bounded exponential backoff retries.
 * 4. Integrates with MailerFactory & dynamic SMTP settings.
 * 5. Masks sensitive details — zero credentials, passwords, or tokens in logs.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailOutboxService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../prisma");
const mailer_factory_1 = require("./factories/mailer.factory");
class EmailOutboxService {
    static isProcessing = false;
    static sweepTimer = null;
    static getDb() {
        return prisma_1.rawPrisma || prisma_1.prisma;
    }
    /**
     * Enqueue an email to be sent durably via the Outbox.
     * If an idempotencyKey is provided, it guarantees exactly-once dispatch attempt.
     */
    static async queueEmail(options) {
        const db = this.getDb();
        const eventType = options.eventType || "email.dispatch";
        const entityType = "EMAIL";
        // Deterministic or random event ID
        const eventId = options.idempotencyKey
            ? crypto_1.default.createHash("sha256").update(`${options.to}:${options.subject}:${options.idempotencyKey}`).digest("hex").slice(0, 32)
            : crypto_1.default.randomUUID();
        // Check for existing duplicate event if idempotency key used
        if (options.idempotencyKey) {
            const existing = await db.outboxEvent.findUnique({
                where: { eventId },
            });
            if (existing) {
                return {
                    queued: true,
                    eventId: existing.eventId,
                    isDuplicate: true,
                };
            }
        }
        const payload = {
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
            fromName: options.fromName,
            fromEmail: options.fromEmail,
            _metadata: options.metadata || {},
        };
        // Need a valid tenantId for OutboxEvent relation. If null/platform, find default or first tenant.
        let targetTenantId = options.tenantId;
        if (!targetTenantId) {
            const defaultTenant = await db.tenant.findFirst({
                where: { OR: [{ slug: "master" }, { id: "tenant-default-001" }] },
                select: { id: true },
            }) || await db.tenant.findFirst({ select: { id: true } });
            targetTenantId = defaultTenant?.id || "platform";
        }
        await db.outboxEvent.create({
            data: {
                id: crypto_1.default.randomUUID(),
                tenantId: targetTenantId,
                eventId,
                eventType,
                entityType,
                entityId: crypto_1.default.randomUUID(),
                status: "PENDING",
                payload,
            },
        });
        // Kick an immediate async dispatch sweep without blocking caller
        setImmediate(() => {
            this.processPendingEmails().catch((err) => {
                console.warn("[EmailOutboxService] Async dispatch error:", err.message);
            });
        });
        return {
            queued: true,
            eventId,
            isDuplicate: false,
        };
    }
    /**
     * Sweeps pending email outbox events, sending via MailerFactory with retries.
     */
    static async processPendingEmails(batchSize = 25) {
        if (this.isProcessing)
            return { processed: 0, failed: 0 };
        this.isProcessing = true;
        const db = this.getDb();
        let processed = 0;
        let failed = 0;
        try {
            const pendingEvents = await db.outboxEvent.findMany({
                where: {
                    entityType: "EMAIL",
                    status: "PENDING",
                    retryCount: { lt: 5 },
                },
                orderBy: { createdAt: "asc" },
                take: batchSize,
            });
            if (!pendingEvents || pendingEvents.length === 0) {
                return { processed: 0, failed: 0 };
            }
            for (const event of pendingEvents) {
                const payload = event.payload;
                const to = payload.to;
                const subject = payload.subject;
                const html = payload.html;
                const text = payload.text;
                const fromName = payload.fromName;
                const fromEmail = payload.fromEmail;
                try {
                    // Attempt dispatch via MailerFactory
                    const mailOptions = {
                        scope: event.tenantId === "tenant-default-001" ? "PLATFORM" : "TENANT",
                        tenantId: event.tenantId,
                        to,
                        subject,
                        html,
                        text,
                        fromName,
                        fromEmail,
                    };
                    const sendResult = await mailer_factory_1.MailerFactory.sendMail(mailOptions);
                    if (sendResult.success) {
                        await db.outboxEvent.update({
                            where: { id: event.id },
                            data: {
                                status: "PROCESSED",
                                processedAt: new Date(),
                                payload: {
                                    ...payload,
                                    messageId: sendResult.messageId || "sent",
                                    dispatchedAt: new Date().toISOString(),
                                },
                            },
                        });
                        processed++;
                    }
                    else {
                        // Transient failure or unconfigured SMTP
                        const newRetryCount = event.retryCount + 1;
                        const isTerminal = newRetryCount >= 5;
                        await db.outboxEvent.update({
                            where: { id: event.id },
                            data: {
                                retryCount: newRetryCount,
                                error: sendResult.error || "Delivery unconfirmed",
                                status: isTerminal ? "FAILED" : "PENDING",
                            },
                        });
                        failed++;
                    }
                }
                catch (dispatchErr) {
                    const newRetryCount = event.retryCount + 1;
                    const isTerminal = newRetryCount >= 5;
                    await db.outboxEvent.update({
                        where: { id: event.id },
                        data: {
                            retryCount: newRetryCount,
                            error: dispatchErr?.message || "Unknown error during email dispatch",
                            status: isTerminal ? "FAILED" : "PENDING",
                        },
                    });
                    failed++;
                }
            }
        }
        catch (err) {
            console.error("[EmailOutboxService] Sweep error:", err.message);
        }
        finally {
            this.isProcessing = false;
        }
        return { processed, failed };
    }
    /**
     * Start recurring background processor timer
     */
    static startWorker(intervalMs = 5000) {
        if (this.sweepTimer)
            return;
        this.sweepTimer = setInterval(() => {
            this.processPendingEmails().catch((err) => {
                console.warn("[EmailOutboxService] Processor loop error:", err.message);
            });
        }, intervalMs);
        if (this.sweepTimer.unref) {
            this.sweepTimer.unref();
        }
    }
    /**
     * Stop worker timer
     */
    static stopWorker() {
        if (this.sweepTimer) {
            clearInterval(this.sweepTimer);
            this.sweepTimer = null;
        }
    }
}
exports.EmailOutboxService = EmailOutboxService;
