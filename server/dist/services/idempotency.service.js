"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdempotencyService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../prisma");
const db = prisma_1.rawPrisma || prisma_1.prisma;
class IdempotencyService {
    // In-memory mutex locks for atomic concurrency protection (30s timeout)
    static inProgressLocks = new Map();
    static LOCK_TIMEOUT_MS = 30000;
    /**
     * Computes a deterministic SHA-256 hash of the request payload.
     */
    static computePayloadHash(payload) {
        const normalized = payload ? JSON.stringify(payload, Object.keys(payload).sort()) : "{}";
        return crypto_1.default.createHash("sha256").update(normalized).digest("hex");
    }
    static getLockKey(tenantId, idempotencyKey) {
        return `${tenantId}:${idempotencyKey}`;
    }
    static getSettingKey(idempotencyKey) {
        return `idemp:${idempotencyKey}`;
    }
    /**
     * Evaluates idempotency key state for a given tenant:
     * 1. Checks if a concurrent request is currently in progress.
     * 2. Checks if a previous response was already committed.
     * 3. Validates payload hash consistency.
     * 4. Acquires in-progress lock if eligible to execute.
     */
    static async checkAndLock(tenantId, idempotencyKey, payload) {
        if (!idempotencyKey || !idempotencyKey.trim()) {
            return { action: "EXECUTE" };
        }
        const trimmedKey = idempotencyKey.trim();
        const lockKey = this.getLockKey(tenantId, trimmedKey);
        const payloadHash = this.computePayloadHash(payload);
        const now = Date.now();
        // 1. Check in-memory concurrent lock
        const existingLock = this.inProgressLocks.get(lockKey);
        if (existingLock && now - existingLock.startedAt < this.LOCK_TIMEOUT_MS) {
            return {
                action: "CONFLICT_IN_PROGRESS",
                errorMessage: "A request with this idempotency key is currently in progress. Please retry.",
                errorCode: "CONCURRENT_REQUEST_IN_PROGRESS",
            };
        }
        // 2. Check committed database record in Setting table
        try {
            const settingKey = this.getSettingKey(trimmedKey);
            const record = await db.setting.findFirst({
                where: {
                    scope: "TENANT",
                    scopeId: tenantId,
                    group: "idempotency",
                    key: settingKey,
                },
            });
            if (record && record.valueJson) {
                const stored = record.valueJson;
                // Check payload hash match
                if (stored.payloadHash && stored.payloadHash !== payloadHash) {
                    return {
                        action: "CONFLICT_PAYLOAD_MISMATCH",
                        errorMessage: "Idempotency key previously used with a different request payload.",
                        errorCode: "IDEMPOTENCY_KEY_PAYLOAD_MISMATCH",
                    };
                }
                // Return committed cached response
                return {
                    action: "REPLAY",
                    cachedResponse: {
                        statusCode: stored.statusCode || 200,
                        responseBody: stored.responseBody,
                        headers: {
                            "X-Idempotent-Replay": "true",
                            "X-Original-Timestamp": stored.createdAt || "",
                        },
                    },
                };
            }
        }
        catch (err) {
            console.warn("[IdempotencyService] Failed to query existing idempotency record:", err.message);
        }
        // 3. Acquire atomic in-progress lock for execution
        this.inProgressLocks.set(lockKey, {
            startedAt: now,
            payloadHash,
        });
        return { action: "EXECUTE" };
    }
    /**
     * Commits the completed response under the idempotency key in tenant persistence.
     */
    static async commit(tenantId, idempotencyKey, payload, statusCode, responseBody) {
        if (!idempotencyKey || !idempotencyKey.trim())
            return;
        const trimmedKey = idempotencyKey.trim();
        const lockKey = this.getLockKey(tenantId, trimmedKey);
        const payloadHash = this.computePayloadHash(payload);
        const settingKey = this.getSettingKey(trimmedKey);
        try {
            await db.setting.upsert({
                where: {
                    scope_scopeId_key: {
                        scope: "TENANT",
                        scopeId: tenantId,
                        key: settingKey,
                    },
                },
                create: {
                    scope: "TENANT",
                    scopeId: tenantId,
                    group: "idempotency",
                    key: settingKey,
                    valueJson: {
                        payloadHash,
                        statusCode,
                        responseBody,
                        createdAt: new Date().toISOString(),
                    },
                    valueType: "json",
                    version: 1,
                },
                update: {
                    valueJson: {
                        payloadHash,
                        statusCode,
                        responseBody,
                        createdAt: new Date().toISOString(),
                    },
                },
            });
        }
        catch (err) {
            console.error("[IdempotencyService] Failed to commit idempotency record:", err.message);
        }
        finally {
            this.inProgressLocks.delete(lockKey);
        }
    }
    /**
     * Releases an in-progress lock (used when handler encounters a fatal error or aborts).
     */
    static unlock(tenantId, idempotencyKey) {
        if (!idempotencyKey)
            return;
        const lockKey = this.getLockKey(tenantId, idempotencyKey.trim());
        this.inProgressLocks.delete(lockKey);
    }
    /**
     * Test/Maintenance helper to clear locks.
     */
    static clearMemoryLocks() {
        this.inProgressLocks.clear();
    }
}
exports.IdempotencyService = IdempotencyService;
