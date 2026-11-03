"use strict";
/**
 * MASTERHRMS — Device Session Service
 *
 * Provides secure per-device session management:
 * - Session creation on login
 * - Refresh token hashing and rotation
 * - Concurrency-safe atomic token exchange
 * - Reuse attack detection and session invalidation
 * - Individual device logout
 * - Logout from all devices
 * - Session listing for security UI
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSecureRefreshToken = generateSecureRefreshToken;
exports.hashRefreshToken = hashRefreshToken;
exports.createDeviceSession = createDeviceSession;
exports.rotateRefreshToken = rotateRefreshToken;
exports.revokeSession = revokeSession;
exports.revokeAllSessions = revokeAllSessions;
exports.getActiveSessions = getActiveSessions;
exports.touchSession = touchSession;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../prisma");
const login_history_service_1 = require("./login-history.service");
const SESSION_EXPIRY_DAYS = 30;
const REFRESH_TOKEN_BYTES = 48;
function generateSecureRefreshToken() {
    return crypto_1.default.randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
}
function hashRefreshToken(token) {
    return crypto_1.default.createHash("sha256").update(token).digest("hex");
}
async function createDeviceSession(options) {
    const { userId, tenantId, ipAddress, userAgent } = options;
    const { browser_name, os_name, device_type } = (0, login_history_service_1.parseUserAgent)(userAgent);
    const refreshToken = generateSecureRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);
    const session = await prisma_1.rawPrisma.deviceSession.create({
        data: {
            userId,
            tenantId: tenantId || null,
            deviceType: device_type,
            browser: browser_name,
            operatingSystem: os_name,
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            refreshTokenHash,
            lastActiveAt: new Date(),
            expiresAt,
            revoked: false,
        },
    });
    return { sessionId: session.id, refreshToken };
}
async function rotateRefreshToken(sessionId, currentTokenHash) {
    const session = await prisma_1.rawPrisma.deviceSession.findUnique({
        where: { id: sessionId },
        include: {
            user: {
                include: {
                    profile: true,
                    roles: true,
                    workspaceRoleAssignments: true,
                },
            },
        },
    });
    if (!session || session.revoked || !session.refreshTokenHash)
        return null;
    if (session.expiresAt && session.expiresAt < new Date())
        return null;
    // Reuse attack detection — hash mismatch means token was already rotated or compromised
    if (session.refreshTokenHash !== currentTokenHash) {
        // Revoke session immediately to protect against token theft
        await prisma_1.rawPrisma.deviceSession.update({
            where: { id: sessionId },
            data: { revoked: true, revokedAt: new Date() },
        });
        return null;
    }
    const newToken = generateSecureRefreshToken();
    const newHash = hashRefreshToken(newToken);
    // Concurrency-safe atomic rotation:
    // Using updateMany with where matching both id AND refreshTokenHash ensures that
    // if two concurrent refresh requests arrive with the same hash, exactly ONE succeeds.
    const updateResult = await prisma_1.rawPrisma.deviceSession.updateMany({
        where: {
            id: sessionId,
            refreshTokenHash: currentTokenHash,
            revoked: false,
        },
        data: {
            refreshTokenHash: newHash,
            lastActiveAt: new Date(),
        },
    });
    if (updateResult.count === 0) {
        // Another concurrent request rotated the token or revoked the session in that microsecond
        await prisma_1.rawPrisma.deviceSession.update({
            where: { id: sessionId },
            data: { revoked: true, revokedAt: new Date() },
        }).catch(() => { });
        return null;
    }
    return { refreshToken: newToken, session };
}
async function revokeSession(sessionId, userId) {
    const session = await prisma_1.rawPrisma.deviceSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId)
        return false;
    await prisma_1.rawPrisma.deviceSession.update({
        where: { id: sessionId },
        data: { revoked: true, revokedAt: new Date() },
    });
    return true;
}
async function revokeAllSessions(userId, tenantId) {
    try {
        const result = await prisma_1.rawPrisma.deviceSession.updateMany({
            where: {
                userId,
                ...(tenantId ? { tenantId } : {}),
                revoked: false,
            },
            data: { revoked: true, revokedAt: new Date() },
        });
        return result.count;
    }
    catch (err) {
        console.warn("[DeviceSession] revokeAllSessions fallback:", err?.message);
        return 0;
    }
}
async function getActiveSessions(userId, tenantId) {
    return prisma_1.rawPrisma.deviceSession.findMany({
        where: {
            userId,
            ...(tenantId ? { tenantId } : {}),
            revoked: false,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: { lastActiveAt: "desc" },
        select: {
            id: true,
            deviceType: true,
            browser: true,
            operatingSystem: true,
            ipAddress: true,
            country: true,
            city: true,
            createdAt: true,
            lastActiveAt: true,
            expiresAt: true,
            // Never expose refreshTokenHash
        },
    });
}
async function touchSession(sessionId) {
    await prisma_1.rawPrisma.deviceSession.updateMany({
        where: { id: sessionId, revoked: false },
        data: { lastActiveAt: new Date() },
    }).catch(() => { });
}
