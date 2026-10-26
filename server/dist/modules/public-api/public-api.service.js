"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicApiService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../../prisma");
const audit_service_1 = require("../../services/audit.service");
const outbox_service_1 = require("../../services/outbox.service");
const db = prisma_1.rawPrisma || prisma_1.prisma;
const rateLimitStore = new Map();
class PublicApiService {
    /**
     * Reset the rate limiter cache (useful for tests)
     */
    static resetRateLimiter() {
        rateLimitStore.clear();
    }
    /**
     * Generate SHA-256 hash of a raw key
     */
    static hashKey(rawKey) {
        return crypto_1.default.createHash("sha256").update(rawKey).digest("hex");
    }
    /**
     * Create a new tenant API key.
     * Generates a high-entropy key prefixed with mhr_live_.
     * Returns raw key ONCE and stores only SHA-256 hash in DB.
     */
    static async createApiKey(tenantId, userId, input) {
        if (!input.name || input.name.trim().length === 0) {
            throw new Error("API key name is required");
        }
        const keyId = crypto_1.default.randomUUID();
        const entropy = crypto_1.default.randomBytes(24).toString("hex");
        const rawKey = `mhr_live_${entropy}`;
        const keyHash = this.hashKey(rawKey);
        const keyPrefix = `mhr_live_${entropy.slice(0, 8)}...`;
        const scopes = input.scopes && input.scopes.length > 0
            ? input.scopes
            : ["employees:read", "attendance:read"];
        const rateLimit = input.rateLimit && input.rateLimit > 0 ? input.rateLimit : 60;
        const record = {
            id: keyId,
            name: input.name.trim(),
            keyPrefix,
            keyHash,
            scopes,
            rateLimit,
            status: "active",
            createdAt: new Date().toISOString(),
            createdBy: userId,
            lastUsedAt: null,
            revokedAt: null,
        };
        // Store in settings table scoped to TENANT
        await db.setting.create({
            data: {
                scope: "TENANT",
                scopeId: tenantId,
                group: "public_api_keys",
                key: `api_key:${keyId}`,
                valueJson: record,
                valueType: "json",
                isSecret: false,
                version: 1,
                updatedBy: userId,
            },
        });
        // Record audit log
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: userId,
            action: "public_api.key.created",
            entityType: "ApiKey",
            entityId: keyId,
            newState: { keyId, name: record.name, scopes, rateLimit },
        }).catch(() => { });
        // Record outbox event
        await outbox_service_1.OutboxService.createOutboxEvent({
            tenantId,
            eventType: "public-api.key.created",
            entityType: "ApiKey",
            entityId: keyId,
            actorId: userId,
            payload: { keyId, name: record.name, scopes },
        }).catch(() => { });
        // Strip keyHash from response
        const { keyHash: _, ...safeKey } = record;
        return {
            rawKey,
            key: safeKey,
        };
    }
    /**
     * List all API keys for a tenant (never exposes raw keys or hashes).
     */
    static async listApiKeys(tenantId) {
        const rows = await db.setting.findMany({
            where: {
                scope: "TENANT",
                scopeId: tenantId,
                group: "public_api_keys",
                key: { startsWith: "api_key:" },
            },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => {
            const data = r.valueJson;
            const { keyHash: _, ...safeKey } = data;
            return safeKey;
        });
    }
    /**
     * Revoke an API key.
     */
    static async revokeApiKey(tenantId, keyId, userId) {
        const row = await db.setting.findFirst({
            where: {
                scope: "TENANT",
                scopeId: tenantId,
                group: "public_api_keys",
                key: `api_key:${keyId}`,
            },
        });
        if (!row) {
            throw new Error("API key not found");
        }
        const data = row.valueJson;
        data.status = "revoked";
        data.revokedAt = new Date().toISOString();
        await db.setting.update({
            where: { id: row.id },
            data: {
                valueJson: data,
                updatedBy: userId,
            },
        });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: userId,
            action: "public_api.key.revoked",
            entityType: "ApiKey",
            entityId: keyId,
            newState: { keyId, name: data.name },
        }).catch(() => { });
        await outbox_service_1.OutboxService.createOutboxEvent({
            tenantId,
            eventType: "public-api.key.revoked",
            entityType: "ApiKey",
            entityId: keyId,
            actorId: userId,
            payload: { keyId, name: data.name },
        }).catch(() => { });
        const { keyHash: _, ...safeKey } = data;
        return safeKey;
    }
    /**
     * Permanently delete an API key record.
     */
    static async deleteApiKey(tenantId, keyId, userId) {
        const row = await db.setting.findFirst({
            where: {
                scope: "TENANT",
                scopeId: tenantId,
                group: "public_api_keys",
                key: `api_key:${keyId}`,
            },
        });
        if (!row) {
            throw new Error("API key not found");
        }
        await db.setting.delete({ where: { id: row.id } });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: userId,
            action: "public_api.key.deleted",
            entityType: "ApiKey",
            entityId: keyId,
        }).catch(() => { });
        return true;
    }
    /**
     * Verify an incoming raw API key against tenant keys, enforce rate limits, and check scopes.
     */
    static async verifyApiKey(rawKey, requiredScope) {
        if (!rawKey || !rawKey.startsWith("mhr_live_")) {
            return { valid: false, error: "INVALID_KEY" };
        }
        const keyHash = this.hashKey(rawKey);
        // Look for matching key across active tenant settings
        const rows = await db.setting.findMany({
            where: {
                scope: "TENANT",
                group: "public_api_keys",
                key: { startsWith: "api_key:" },
            },
        });
        let matchedRow = null;
        let matchedRecord = null;
        for (const r of rows) {
            const data = r.valueJson;
            if (data && data.keyHash === keyHash) {
                matchedRow = r;
                matchedRecord = data;
                break;
            }
        }
        if (!matchedRow || !matchedRecord) {
            return { valid: false, error: "INVALID_KEY" };
        }
        if (matchedRecord.status !== "active") {
            return { valid: false, error: "REVOKED_KEY" };
        }
        // Check scope permissions if requested
        if (requiredScope && !matchedRecord.scopes.includes(requiredScope) && !matchedRecord.scopes.includes("*")) {
            return { valid: false, error: "INSUFFICIENT_SCOPE" };
        }
        // Enforce rate limiting (sliding 60-second window)
        const now = Date.now();
        const windowDurationMs = 60 * 1000;
        let bucket = rateLimitStore.get(keyHash);
        if (!bucket || now - bucket.windowStart > windowDurationMs) {
            bucket = { count: 1, windowStart: now };
            rateLimitStore.set(keyHash, bucket);
        }
        else {
            if (bucket.count >= matchedRecord.rateLimit) {
                const resetSeconds = Math.ceil((bucket.windowStart + windowDurationMs - now) / 1000);
                return {
                    valid: false,
                    error: "RATE_LIMIT_EXCEEDED",
                    rateLimitRemaining: 0,
                    rateLimitResetSeconds: resetSeconds,
                };
            }
            bucket.count += 1;
        }
        // Update lastUsedAt asynchronously
        matchedRecord.lastUsedAt = new Date().toISOString();
        db.setting.update({
            where: { id: matchedRow.id },
            data: { valueJson: matchedRecord },
        }).catch(() => { });
        return {
            valid: true,
            tenantId: matchedRow.scopeId || undefined,
            keyId: matchedRecord.id,
            name: matchedRecord.name,
            scopes: matchedRecord.scopes,
            rateLimitRemaining: Math.max(0, matchedRecord.rateLimit - bucket.count),
            rateLimitResetSeconds: Math.ceil((bucket.windowStart + windowDurationMs - now) / 1000),
        };
    }
    /**
     * Return the OpenAPI 3.0 documentation specification for the Public Developer API.
     */
    static getOpenApiSpec() {
        return {
            openapi: "3.0.3",
            info: {
                title: "MASTERHRMS Public Developer API",
                version: "1.0.0",
                description: "Official REST API for integrating with MASTERHRMS. Authenticate using Bearer <api_key> or X-API-Key.",
            },
            servers: [
                {
                    url: "/api/v1/public-api",
                    description: "Tenant Public API Gateway",
                },
            ],
            components: {
                securitySchemes: {
                    ApiKeyAuth: {
                        type: "apiKey",
                        in: "header",
                        name: "X-API-Key",
                    },
                    BearerAuth: {
                        type: "http",
                        scheme: "bearer",
                    },
                },
            },
            security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
            paths: {
                "/employees": {
                    get: {
                        summary: "List Employees",
                        description: "Retrieve a paginated list of active employees for the tenant.",
                        responses: {
                            200: { description: "Successful response" },
                            401: { description: "Unauthorized - Invalid API key" },
                            403: { description: "Forbidden - Missing employees:read scope" },
                            429: { description: "Rate limit exceeded" },
                        },
                    },
                },
                "/attendance": {
                    get: {
                        summary: "List Attendance Logs",
                        description: "Retrieve attendance logs within a date range.",
                        responses: {
                            200: { description: "Successful response" },
                            401: { description: "Unauthorized" },
                            429: { description: "Rate limit exceeded" },
                        },
                    },
                },
                "/invoices": {
                    get: {
                        summary: "List Invoices",
                        description: "Retrieve billing invoices and commercial records.",
                        responses: {
                            200: { description: "Successful response" },
                            401: { description: "Unauthorized" },
                            429: { description: "Rate limit exceeded" },
                        },
                    },
                },
            },
        };
    }
}
exports.PublicApiService = PublicApiService;
