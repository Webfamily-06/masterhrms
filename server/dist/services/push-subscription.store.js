"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushSubscriptionStore = void 0;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../prisma");
// In-memory cache & fallback directory for instant lookup and hermetic offline testing
const inMemorySubscriptions = new Map();
const lastDbSyncByUser = new Map();
function getEndpointHash(endpoint) {
    return crypto_1.default.createHash("sha256").update(endpoint).digest("hex").slice(0, 32);
}
class PushSubscriptionStore {
    /**
     * Saves or updates a device-level Web Push subscription for a user within a verified tenant.
     * Explicitly associates deviceId, platform, and session ownership.
     */
    static async saveSubscription(params) {
        const { tenantId, userId, subscription, userAgent, deviceId, platform, sessionTokenId } = params;
        const endpointHash = getEndpointHash(subscription.endpoint);
        const resolvedDeviceId = deviceId || `dev_${endpointHash.slice(0, 16)}`;
        const subId = `sub_${endpointHash}`;
        const record = {
            id: subId,
            tenantId,
            userId,
            deviceId: resolvedDeviceId,
            endpoint: subscription.endpoint,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
            userAgent: userAgent || "Unknown Browser",
            platform: platform || "web",
            sessionTokenId,
            createdAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
            revokedAt: null,
            status: "active",
        };
        // 1. Update in-memory map: match by endpoint or (userId + deviceId)
        const userSubs = inMemorySubscriptions.get(userId) || [];
        const filtered = userSubs.filter((s) => s.endpoint !== subscription.endpoint && s.deviceId !== resolvedDeviceId);
        filtered.push(record);
        inMemorySubscriptions.set(userId, filtered);
        // 2. Persist to Setting table (USER scope) if database is accessible
        try {
            const db = prisma_1.rawPrisma || prisma_1.prisma;
            const key = `push_sub_${endpointHash}`;
            await db.setting.upsert({
                where: {
                    scope_scopeId_key: {
                        scope: "USER",
                        scopeId: userId,
                        key,
                    },
                },
                create: {
                    scope: "USER",
                    scopeId: userId,
                    group: "web_push",
                    key,
                    valueJson: record,
                    valueType: "JSON",
                    isSecret: false,
                },
                update: {
                    valueJson: record,
                    updatedAt: new Date(),
                },
            });
        }
        catch (err) {
            console.warn(`[PushSubscriptionStore] DB persistence skipped (${err.message}). Cached in-memory.`);
        }
        return record;
    }
    /**
     * Retrieves all currently active and non-revoked subscriptions for a user, verifying tenant isolation.
     * Always reconciles with PostgreSQL on serverless warm instances (2s cache) so newly added mobile devices are never missed.
     */
    static async getActiveSubscriptions(tenantId, userId) {
        const now = Date.now();
        const lastSync = lastDbSyncByUser.get(userId) || 0;
        let userSubs = inMemorySubscriptions.get(userId) || [];
        if (userSubs.length === 0 || now - lastSync > 2000) {
            try {
                const db = prisma_1.rawPrisma || prisma_1.prisma;
                const rows = await db.setting.findMany({
                    where: {
                        scope: "USER",
                        scopeId: userId,
                        group: "web_push",
                    },
                });
                const byEndpoint = new Map();
                for (const existing of userSubs) {
                    if (existing.status === "active" && !existing.revokedAt) {
                        byEndpoint.set(existing.endpoint, existing);
                    }
                }
                for (const row of rows) {
                    if (row.valueJson && typeof row.valueJson === "object") {
                        const item = row.valueJson;
                        if (item.endpoint && item.status === "active" && !item.revokedAt) {
                            byEndpoint.set(item.endpoint, item);
                        }
                    }
                }
                userSubs = Array.from(byEndpoint.values());
                inMemorySubscriptions.set(userId, userSubs);
                lastDbSyncByUser.set(userId, now);
            }
            catch {
                userSubs = inMemorySubscriptions.get(userId) || [];
            }
        }
        // Strict tenant matching & status filter: only 'active' devices eligible for push
        return (userSubs || []).filter((s) => s.tenantId === tenantId && s.status === "active" && !s.revokedAt);
    }
    /**
     * Device-Specific Revocation (Called on device logout).
     * Revokes ONLY the specified device/endpoint for this user.
     * Other active devices of the user remain authenticated and eligible for incoming calls.
     */
    static async revokeDeviceSubscription(tenantId, userId, deviceIdOrEndpoint) {
        const userSubs = inMemorySubscriptions.get(userId) || [];
        let modified = false;
        const updated = userSubs.map((s) => {
            if (s.tenantId === tenantId &&
                (s.endpoint === deviceIdOrEndpoint || s.deviceId === deviceIdOrEndpoint)) {
                modified = true;
                return {
                    ...s,
                    status: "revoked",
                    revokedAt: new Date().toISOString(),
                };
            }
            return s;
        });
        inMemorySubscriptions.set(userId, updated);
        try {
            const db = prisma_1.rawPrisma || prisma_1.prisma;
            const endpointHash = getEndpointHash(deviceIdOrEndpoint);
            const key = `push_sub_${endpointHash}`;
            // Update in DB setting or delete record
            await db.setting.deleteMany({
                where: {
                    scope: "USER",
                    scopeId: userId,
                    key,
                },
            });
        }
        catch { }
        return modified;
    }
    /**
     * Marks a subscription as expired after gateway HTTP 404/410.
     */
    static async markExpired(userId, endpoint) {
        const userSubs = inMemorySubscriptions.get(userId) || [];
        const updated = userSubs.map((s) => s.endpoint === endpoint
            ? { ...s, status: "expired", revokedAt: new Date().toISOString() }
            : s);
        inMemorySubscriptions.set(userId, updated);
        try {
            const db = prisma_1.rawPrisma || prisma_1.prisma;
            const endpointHash = getEndpointHash(endpoint);
            const key = `push_sub_${endpointHash}`;
            await db.setting.deleteMany({
                where: {
                    scope: "USER",
                    scopeId: userId,
                    key,
                },
            });
        }
        catch { }
    }
    /**
     * Removes all subscriptions for a specific user and endpoint.
     */
    static async removeSubscription(tenantId, userId, endpoint) {
        return this.revokeDeviceSubscription(tenantId, userId, endpoint);
    }
    static async unsubscribe(userId, endpoint) {
        const userSubs = inMemorySubscriptions.get(userId) || [];
        const remaining = userSubs.filter((s) => s.endpoint !== endpoint);
        inMemorySubscriptions.set(userId, remaining);
        try {
            const db = prisma_1.rawPrisma || prisma_1.prisma;
            const endpointHash = getEndpointHash(endpoint);
            const key = `push_sub_${endpointHash}`;
            await db.setting.deleteMany({
                where: {
                    scope: "USER",
                    scopeId: userId,
                    key,
                },
            });
            return true;
        }
        catch {
            return true;
        }
    }
}
exports.PushSubscriptionStore = PushSubscriptionStore;
