"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativePushStore = void 0;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../prisma");
// In-memory cache & fallback directory for instant lookup and zero-latency retrieval
const inMemoryDeviceTokens = new Map();
const lastDbSyncByUser = new Map();
function getTokenHash(token) {
    return crypto_1.default.createHash("sha256").update(token).digest("hex").slice(0, 32);
}
class NativePushStore {
    /**
     * Saves or updates a native device push token (FCM, Expo, or APNs) for a user within a verified tenant.
     * Associating with deviceId, platform, and tenant isolation.
     */
    static async saveDeviceToken(params) {
        const { tenantId, userId, token, appVersion, userAgent } = params;
        const tokenHash = getTokenHash(token);
        const resolvedPlatform = (params.platform || "android").toLowerCase();
        // Detect token type if not explicitly provided
        let resolvedTokenType = params.tokenType;
        if (!resolvedTokenType) {
            if (token.startsWith("ExponentPushToken") || token.startsWith("ExpoPushToken")) {
                resolvedTokenType = "expo";
            }
            else if (resolvedPlatform === "ios" && /^[a-fA-F0-9]{64}$/.test(token)) {
                resolvedTokenType = "apns";
            }
            else {
                resolvedTokenType = "fcm";
            }
        }
        const resolvedDeviceId = params.deviceId || `dev_${tokenHash.slice(0, 16)}`;
        const tokenId = `dtoken_${tokenHash}`;
        const record = {
            id: tokenId,
            tenantId,
            userId,
            token,
            platform: resolvedPlatform,
            tokenType: resolvedTokenType,
            deviceId: resolvedDeviceId,
            appVersion: appVersion || "1.0.0",
            userAgent: userAgent || "MasterHRMS Mobile",
            createdAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
            revokedAt: null,
            status: "active",
        };
        // 1. Update in-memory map (match by token or (userId + deviceId))
        const userTokens = inMemoryDeviceTokens.get(userId) || [];
        const filtered = userTokens.filter((t) => t.token !== token && t.deviceId !== resolvedDeviceId);
        filtered.push(record);
        inMemoryDeviceTokens.set(userId, filtered);
        // 2. Persist to Setting table (USER scope) for robust cross-instance persistence without schema migrations
        try {
            const db = prisma_1.rawPrisma || prisma_1.prisma;
            const key = `native_push_${tokenHash}`;
            // Clean up any stale records for this user that have the same token or the same deviceId
            const existingRows = await db.setting.findMany({
                where: {
                    scope: "USER",
                    scopeId: userId,
                    group: "native_push",
                },
            });
            const keysToDelete = [];
            for (const row of existingRows) {
                if (row.valueJson && typeof row.valueJson === "object") {
                    const item = row.valueJson;
                    if ((item.token && item.token === token) ||
                        (resolvedDeviceId && item.deviceId === resolvedDeviceId)) {
                        keysToDelete.push(row.key);
                    }
                }
            }
            if (keysToDelete.length > 0) {
                await db.setting.deleteMany({
                    where: {
                        scope: "USER",
                        scopeId: userId,
                        key: { in: keysToDelete },
                    },
                });
            }
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
                    group: "native_push",
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
            console.warn(`[NativePushStore] DB persistence skipped (${err.message}). Cached in-memory.`);
        }
        return record;
    }
    /**
     * Retrieves all currently active and non-revoked native device tokens for a user, verifying tenant isolation.
     * Reconciles with database on serverless warm instances (2s cache) so newly added mobile devices are never missed.
     */
    static async getActiveDeviceTokens(tenantId, userId) {
        const now = Date.now();
        const lastSync = lastDbSyncByUser.get(userId) || 0;
        let userTokens = inMemoryDeviceTokens.get(userId) || [];
        if (userTokens.length === 0 || now - lastSync > 2000) {
            try {
                const db = prisma_1.rawPrisma || prisma_1.prisma;
                const rows = await db.setting.findMany({
                    where: {
                        scope: "USER",
                        scopeId: userId,
                        group: "native_push",
                    },
                });
                const byDeviceOrToken = new Map();
                for (const existing of userTokens) {
                    if (existing.status === "active" && !existing.revokedAt) {
                        const dedupKey = existing.deviceId || existing.token;
                        byDeviceOrToken.set(dedupKey, existing);
                    }
                }
                for (const row of rows) {
                    if (row.valueJson && typeof row.valueJson === "object") {
                        const item = row.valueJson;
                        if (item.token && item.status === "active" && !item.revokedAt) {
                            const dedupKey = item.deviceId || item.token;
                            const prev = byDeviceOrToken.get(dedupKey);
                            if (!prev || new Date(item.updatedAt || 0) >= new Date(prev.updatedAt || 0)) {
                                byDeviceOrToken.set(dedupKey, item);
                            }
                        }
                    }
                }
                userTokens = Array.from(byDeviceOrToken.values());
                inMemoryDeviceTokens.set(userId, userTokens);
                lastDbSyncByUser.set(userId, now);
            }
            catch {
                userTokens = inMemoryDeviceTokens.get(userId) || [];
            }
        }
        // Strict tenant matching & status filter: only 'active' devices eligible for push
        return (userTokens || []).filter((t) => t.tenantId === tenantId && t.status === "active" && !t.revokedAt);
    }
    /**
     * Device-specific revocation (called on logout or app uninstall).
     * Revokes ONLY the specified device/token for this user.
     */
    static async revokeDeviceToken(tenantId, userId, tokenOrDeviceId) {
        const userTokens = inMemoryDeviceTokens.get(userId) || [];
        let modified = false;
        const updated = userTokens.map((t) => {
            if (t.tenantId === tenantId &&
                (t.token === tokenOrDeviceId || t.deviceId === tokenOrDeviceId)) {
                modified = true;
                return {
                    ...t,
                    status: "revoked",
                    revokedAt: new Date().toISOString(),
                };
            }
            return t;
        });
        inMemoryDeviceTokens.set(userId, updated);
        try {
            const db = prisma_1.rawPrisma || prisma_1.prisma;
            const existingRows = await db.setting.findMany({
                where: {
                    scope: "USER",
                    scopeId: userId,
                    group: "native_push",
                },
            });
            const keysToDelete = [];
            for (const row of existingRows) {
                if (row.valueJson && typeof row.valueJson === "object") {
                    const item = row.valueJson;
                    if (item.tenantId === tenantId &&
                        (item.token === tokenOrDeviceId || item.deviceId === tokenOrDeviceId)) {
                        keysToDelete.push(row.key);
                    }
                }
            }
            const tokenHash = getTokenHash(tokenOrDeviceId);
            keysToDelete.push(`native_push_${tokenHash}`);
            await db.setting.deleteMany({
                where: {
                    scope: "USER",
                    scopeId: userId,
                    key: { in: keysToDelete },
                },
            });
        }
        catch { }
        return modified;
    }
    /**
     * Marks a token as expired after FCM/Expo gateway reports NotRegistered or DeviceNotRegistered.
     */
    static async markExpired(userId, token) {
        const userTokens = inMemoryDeviceTokens.get(userId) || [];
        const updated = userTokens.map((t) => t.token === token
            ? { ...t, status: "expired", revokedAt: new Date().toISOString() }
            : t);
        inMemoryDeviceTokens.set(userId, updated);
        try {
            const db = prisma_1.rawPrisma || prisma_1.prisma;
            const existingRows = await db.setting.findMany({
                where: {
                    scope: "USER",
                    scopeId: userId,
                    group: "native_push",
                },
            });
            const keysToDelete = [];
            for (const row of existingRows) {
                if (row.valueJson && typeof row.valueJson === "object") {
                    const item = row.valueJson;
                    if (item.token === token) {
                        keysToDelete.push(row.key);
                    }
                }
            }
            const tokenHash = getTokenHash(token);
            keysToDelete.push(`native_push_${tokenHash}`);
            await db.setting.deleteMany({
                where: {
                    scope: "USER",
                    scopeId: userId,
                    key: { in: keysToDelete },
                },
            });
        }
        catch { }
    }
    /**
     * For testing & maintenance: clears in-memory state.
     */
    static clearMemoryCache() {
        inMemoryDeviceTokens.clear();
        lastDbSyncByUser.clear();
    }
}
exports.NativePushStore = NativePushStore;
