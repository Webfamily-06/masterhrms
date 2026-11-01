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
function getEndpointHash(endpoint) {
    return crypto_1.default.createHash("sha256").update(endpoint).digest("hex").slice(0, 32);
}
class PushSubscriptionStore {
    /**
     * Saves or updates a Web Push subscription for a user within a verified tenant.
     */
    static async saveSubscription(params) {
        const { tenantId, userId, subscription, userAgent } = params;
        const endpointHash = getEndpointHash(subscription.endpoint);
        const subId = `sub_${endpointHash}`;
        const record = {
            id: subId,
            tenantId,
            userId,
            endpoint: subscription.endpoint,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
            userAgent: userAgent || "Unknown Browser",
            createdAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
            status: "active",
        };
        // 1. Update in-memory map
        const userSubs = inMemorySubscriptions.get(userId) || [];
        const filtered = userSubs.filter((s) => s.endpoint !== subscription.endpoint);
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
            // Non-fatal: in-memory record ensures delivery even during database connection outages
            console.warn(`[PushSubscriptionStore] DB persistence skipped (${err.message}). Cached in-memory.`);
        }
        return record;
    }
    /**
     * Retrieves all active subscriptions for a user, verifying tenant isolation.
     */
    static async getActiveSubscriptions(tenantId, userId) {
        // 1. Check in-memory store first
        let userSubs = inMemorySubscriptions.get(userId);
        // 2. Fall back to database query if cache is empty
        if (!userSubs || userSubs.length === 0) {
            try {
                const db = prisma_1.rawPrisma || prisma_1.prisma;
                const rows = await db.setting.findMany({
                    where: {
                        scope: "USER",
                        scopeId: userId,
                        group: "web_push",
                    },
                });
                const loaded = [];
                for (const row of rows) {
                    if (row.valueJson && typeof row.valueJson === "object") {
                        const item = row.valueJson;
                        if (item.tenantId === tenantId && item.status === "active") {
                            loaded.push(item);
                        }
                    }
                }
                userSubs = loaded;
                inMemorySubscriptions.set(userId, loaded);
            }
            catch (err) {
                userSubs = inMemorySubscriptions.get(userId) || [];
            }
        }
        // 3. Strict tenant matching
        return (userSubs || []).filter((s) => s.tenantId === tenantId && s.status === "active");
    }
    /**
     * Marks a subscription as expired or removes it.
     */
    static async markExpired(userId, endpoint) {
        const userSubs = inMemorySubscriptions.get(userId) || [];
        const updated = userSubs.map((s) => (s.endpoint === endpoint ? { ...s, status: "expired" } : s));
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
        catch (err) {
            // In-memory update took effect
        }
    }
    /**
     * Removes all subscriptions for a specific user and endpoint.
     */
    static async removeSubscription(tenantId, userId, endpoint) {
        return this.unsubscribe(userId, endpoint);
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
