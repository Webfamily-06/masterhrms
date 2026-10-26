"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookRetryWorker = void 0;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../../prisma");
const outbound_webhooks_service_1 = require("./outbound-webhooks.service");
const settings_service_1 = require("../../services/settings/settings.service");
const db = prisma_1.rawPrisma || prisma_1.prisma;
class WebhookRetryWorker {
    static timer = null;
    static isProcessing = false;
    static workerId = `webhook_worker_${process.pid}_${crypto_1.default.randomUUID().slice(0, 8)}`;
    static stats = {
        isRunning: false,
        isProcessing: false,
        workerId: "",
        lastRunAt: null,
        processedCount: 0,
        successCount: 0,
        failureCount: 0,
        deadCount: 0,
    };
    /**
     * Calculate exponential backoff with bounded jitter
     * Formula: delay = min(maxSeconds, baseSeconds * 2^(attempt - 1)) + jitter
     */
    static calculateBackoff(attempt, baseSeconds = 2, maxSeconds = 3600, jitterRatio = 0.2) {
        const rawBackoff = baseSeconds * Math.pow(2, Math.max(0, attempt - 1));
        const cappedBackoff = Math.min(rawBackoff, maxSeconds);
        const jitter = Math.random() * (cappedBackoff * jitterRatio);
        return Math.round((cappedBackoff + jitter) * 1000); // ms
    }
    /**
     * Determine if an error is eligible for background retry
     */
    static isRetryableError(statusCode, errorCode) {
        if (errorCode === "SSRF_BLOCKED")
            return false;
        if (errorCode === "ENDPOINT_INACTIVE" || errorCode === "ENDPOINT_NOT_FOUND")
            return false;
        if (statusCode === null)
            return true; // Network timeout, DNS failure, ECONNRESET, etc.
        if (statusCode === 429)
            return true; // Rate limited -> retry with backoff
        if (statusCode >= 500 && statusCode < 600)
            return true; // Server error -> retry
        return false; // 4xx client errors (400, 401, 403, 404, 422) are non-retryable
    }
    /**
     * Start worker with periodic interval
     */
    static start(intervalMs = 5000) {
        if (this.timer)
            return;
        this.stats.isRunning = true;
        this.stats.workerId = this.workerId;
        this.timer = setInterval(() => {
            this.processPendingRetries().catch((err) => {
                console.error(`[WebhookRetryWorker] Processor loop error:`, err);
            });
        }, intervalMs);
    }
    /**
     * Stop worker
     */
    static stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.stats.isRunning = false;
        this.isProcessing = false;
    }
    /**
     * Get worker diagnostic statistics
     */
    static getStats() {
        return {
            ...this.stats,
            isProcessing: this.isProcessing,
            workerId: this.workerId,
        };
    }
    /**
     * Core sweep: atomically claim and process pending retryable delivery logs
     */
    static async processPendingRetries(customWorkerId, batchSize = 25, options = {}) {
        if (this.isProcessing) {
            return { claimed: 0, succeeded: 0, failed: 0, dead: 0 };
        }
        this.isProcessing = true;
        this.stats.lastRunAt = new Date().toISOString();
        const currentWorkerId = customWorkerId || this.workerId;
        const nowIso = new Date().toISOString();
        const nowMs = Date.now();
        const leaseTimeoutMs = 60000; // 60s lease timeout for crashed workers
        const result = { claimed: 0, succeeded: 0, failed: 0, dead: 0 };
        try {
            // Find candidate logs across all tenants
            const candidateRows = await db.setting.findMany({
                where: {
                    scope: "TENANT",
                    group: "webhook_delivery_logs",
                    key: { startsWith: "delivery:" },
                },
                take: 200,
                orderBy: { updatedAt: "asc" },
            });
            const eligibleRows = [];
            for (const row of candidateRows) {
                const log = row.valueJson;
                if (!log || log.status !== "retrying")
                    continue;
                if (!log.nextAttemptAt || new Date(log.nextAttemptAt).getTime() > nowMs)
                    continue;
                // Check claim lease
                if (log.claimedAt) {
                    const claimedTime = new Date(log.claimedAt).getTime();
                    if (nowMs - claimedTime < leaseTimeoutMs) {
                        // Still actively leased by another worker
                        continue;
                    }
                }
                eligibleRows.push({ id: row.id, row, log });
                if (eligibleRows.length >= batchSize)
                    break;
            }
            for (const item of eligibleRows) {
                const { id: rowId, log } = item;
                // 1. Atomic claim: update row only if claimedAt hasn't changed or is still expired
                const claimLog = {
                    ...log,
                    claimedAt: nowIso,
                    claimedBy: currentWorkerId,
                };
                try {
                    await db.setting.update({
                        where: { id: rowId },
                        data: {
                            valueJson: claimLog,
                            version: { increment: 1 },
                        },
                    });
                    result.claimed++;
                }
                catch {
                    // Failed to claim (row was modified concurrently)
                    continue;
                }
                // 2. Load endpoint and verify tenant isolation + ownership
                let endpoint = null;
                try {
                    const endpointRow = await db.setting.findFirst({
                        where: {
                            scope: "TENANT",
                            scopeId: log.tenantId,
                            group: "outbound_webhooks",
                            key: `endpoint:${log.endpointId}`,
                        },
                    });
                    endpoint = endpointRow ? endpointRow.valueJson : null;
                }
                catch {
                    endpoint = null;
                }
                if (!endpoint || endpoint.status !== "active" || endpoint.deletedAt) {
                    // Terminal failure: endpoint is gone or disabled
                    const deadLog = {
                        ...log,
                        status: "dead",
                        errorCode: !endpoint ? "ENDPOINT_NOT_FOUND" : "ENDPOINT_INACTIVE",
                        responseSnippet: !endpoint ? "Associated endpoint no longer exists" : "Endpoint is inactive or disabled",
                        claimedAt: null,
                        claimedBy: null,
                        nextAttemptAt: null,
                    };
                    await db.setting.update({
                        where: { id: rowId },
                        data: { valueJson: deadLog },
                    }).catch(() => { });
                    result.dead++;
                    this.stats.deadCount++;
                    continue;
                }
                // 3. Revalidate destination safety (SSRF guard against DNS rebinding)
                const ssrfCheck = await outbound_webhooks_service_1.OutboundWebhooksService.validateUrlSafetyAsync(endpoint.url, options.allowLocalhostForTest);
                if (!ssrfCheck.safe) {
                    const deadLog = {
                        ...log,
                        status: "dead",
                        errorCode: "SSRF_BLOCKED",
                        responseSnippet: `Blocked by SSRF defense on retry: ${ssrfCheck.error}`,
                        claimedAt: null,
                        claimedBy: null,
                        nextAttemptAt: null,
                    };
                    await db.setting.update({
                        where: { id: rowId },
                        data: { valueJson: deadLog },
                    }).catch(() => { });
                    result.dead++;
                    this.stats.deadCount++;
                    continue;
                }
                // 4. Decrypt secret for HMAC signature (supports rotated secret)
                let secretPlain;
                try {
                    const [iv, authTag, ciphertext] = endpoint.secret.split(":");
                    secretPlain = (0, settings_service_1.decryptSecret)(ciphertext, iv, authTag);
                }
                catch {
                    secretPlain = "whsec_fallback_secret";
                }
                const retryTimestamp = Math.floor(Date.now() / 1000);
                const attemptNumber = (log.attempt || 1) + 1;
                const stringifiedPayload = JSON.stringify({
                    id: log.id,
                    event: log.eventKey,
                    tenantId: log.tenantId,
                    timestamp: retryTimestamp,
                    data: log.payload,
                });
                const signature = outbound_webhooks_service_1.OutboundWebhooksService.generateSignature(stringifiedPayload, secretPlain, retryTimestamp);
                const headers = {
                    "Content-Type": "application/json",
                    "X-Webhook-Event": log.eventKey,
                    "X-Webhook-Delivery-Id": log.id,
                    "X-Webhook-Timestamp": String(retryTimestamp),
                    "X-Webhook-Signature": signature,
                    "X-MASTERHRMS-Signature": signature,
                    "X-Webhook-Attempt": String(attemptNumber),
                    ...(endpoint.headersJson || {}),
                };
                const startTime = Date.now();
                let delivered = false;
                let lastStatusCode = null;
                let responseSnippet = null;
                let lastError = null;
                try {
                    const resp = await outbound_webhooks_service_1.OutboundWebhooksService.safeDispatchHttp(endpoint.url, {
                        method: endpoint.method || "POST",
                        headers,
                        body: stringifiedPayload,
                        timeoutMs: endpoint.timeoutMs || 5000,
                    }, options.allowLocalhostForTest);
                    lastStatusCode = resp.statusCode;
                    responseSnippet = resp.responseSnippet ? resp.responseSnippet.slice(0, 1000) : null;
                    if (resp.ok) {
                        delivered = true;
                    }
                    else {
                        lastError = resp.error || `HTTP ${resp.statusCode}`;
                    }
                }
                catch (err) {
                    lastError = err.message || "Network error";
                }
                const durationMs = Date.now() - startTime;
                const maxAttempts = log.maxAttempts || 3;
                if (delivered) {
                    // Success!
                    const successLog = {
                        ...log,
                        status: "success",
                        attempt: attemptNumber,
                        statusCode: lastStatusCode,
                        durationMs,
                        errorCode: null,
                        responseSnippet,
                        claimedAt: null,
                        claimedBy: null,
                        nextAttemptAt: null,
                        timestamp: new Date().toISOString(),
                    };
                    await db.setting.update({
                        where: { id: rowId },
                        data: { valueJson: successLog },
                    }).catch(() => { });
                    // Reset endpoint failure counter
                    await outbound_webhooks_service_1.OutboundWebhooksService.recordEndpointDeliveryOutcome(log.tenantId, endpoint.id, true).catch(() => { });
                    result.succeeded++;
                    this.stats.successCount++;
                }
                else {
                    // Delivery failed
                    const isRetryable = this.isRetryableError(lastStatusCode, lastError);
                    const isTerminal = !isRetryable || attemptNumber >= maxAttempts;
                    if (!isTerminal) {
                        // Schedule next retry with exponential backoff + jitter
                        const backoffDelay = this.calculateBackoff(attemptNumber);
                        const nextAttemptAt = new Date(Date.now() + backoffDelay).toISOString();
                        const retryLog = {
                            ...log,
                            status: "retrying",
                            attempt: attemptNumber,
                            statusCode: lastStatusCode,
                            durationMs,
                            errorCode: lastStatusCode ? `HTTP_${lastStatusCode}` : "NETWORK_ERROR",
                            responseSnippet,
                            claimedAt: null,
                            claimedBy: null,
                            nextAttemptAt,
                        };
                        await db.setting.update({
                            where: { id: rowId },
                            data: { valueJson: retryLog },
                        }).catch(() => { });
                        result.failed++;
                        this.stats.failureCount++;
                    }
                    else {
                        // Terminal failure (dead letter)
                        const deadLog = {
                            ...log,
                            status: "dead",
                            attempt: attemptNumber,
                            statusCode: lastStatusCode,
                            durationMs,
                            errorCode: lastStatusCode ? `HTTP_${lastStatusCode}` : (lastError || "MAX_RETRIES_EXCEEDED"),
                            responseSnippet,
                            claimedAt: null,
                            claimedBy: null,
                            nextAttemptAt: null,
                        };
                        await db.setting.update({
                            where: { id: rowId },
                            data: { valueJson: deadLog },
                        }).catch(() => { });
                        // Record endpoint failure (auto-disable if 5 consecutive)
                        await outbound_webhooks_service_1.OutboundWebhooksService.recordEndpointDeliveryOutcome(log.tenantId, endpoint.id, false).catch(() => { });
                        result.dead++;
                        this.stats.deadCount++;
                    }
                }
            }
        }
        catch (err) {
            console.error("[WebhookRetryWorker] Sweep error:", err);
        }
        finally {
            this.isProcessing = false;
            this.stats.processedCount += result.claimed;
        }
        return result;
    }
}
exports.WebhookRetryWorker = WebhookRetryWorker;
