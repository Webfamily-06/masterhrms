"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeetingSfuService = exports.SfuConfigurationError = void 0;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * MASTERHRMS — Meeting SFU & TURN Traversal Service
 *
 * Provides real multiparty media infrastructure integration using LiveKit SFU:
 * - Issues cryptographically signed, short-lived room tokens scoped to tenant, group, and user.
 * - Provides STUN/TURN server configurations with RFC 7635 ephemeral HMAC-SHA1 Coturn credentials.
 * - Enforces zero-trust server-authoritative role and permission scopes.
 * - Surfaces clear diagnostics and setup guides when deployment credentials are absent.
 */
class SfuConfigurationError extends Error {
    constructor(message) {
        super(message);
        this.name = "SfuConfigurationError";
    }
}
exports.SfuConfigurationError = SfuConfigurationError;
class MeetingSfuService {
    /**
     * Resolves the server-authoritative SFU and TURN configuration from environment.
     */
    static getConfig() {
        const url = process.env.LIVEKIT_URL || process.env.LIVEKIT_HOST || null;
        const apiKey = process.env.LIVEKIT_API_KEY || null;
        const apiSecret = process.env.LIVEKIT_API_SECRET || null;
        const turnUrl = process.env.TURN_SERVER_URL || process.env.TURN_URL || null;
        const turnUsername = process.env.TURN_USERNAME || null;
        const turnCredential = process.env.TURN_CREDENTIAL || null;
        const turnSharedSecret = process.env.TURN_SHARED_SECRET || process.env.COTURN_SHARED_SECRET || null;
        const configured = Boolean(url &&
            apiKey &&
            apiSecret &&
            apiKey.trim().length >= 4 &&
            apiSecret.trim().length >= 16);
        const isLiveKitCloud = Boolean(url && url.includes("livekit.cloud"));
        return {
            provider: isLiveKitCloud ? "livekit_cloud" : "livekit",
            configured,
            isLiveKitCloud,
            url: url ? url.trim() : null,
            apiKey: apiKey ? apiKey.trim() : null,
            apiSecret: apiSecret ? apiSecret.trim() : null,
            turnUrl: turnUrl ? turnUrl.trim() : null,
            turnUsername: turnUsername ? turnUsername.trim() : null,
            turnCredential: turnCredential ? turnCredential.trim() : null,
            turnSharedSecretConfigured: Boolean(turnSharedSecret && turnSharedSecret.trim().length > 0),
        };
    }
    /**
     * Generates ephemeral HMAC-SHA1 credentials for Coturn TURN REST API (RFC 7635).
     *
     * Username format: <expiry_timestamp>:<userId>
     * Credential: HMAC-SHA1(username, sharedSecret) in Base64
     *
     * Strictly keeps TURN_SHARED_SECRET segregated from LIVEKIT_API_SECRET.
     */
    static generateEphemeralTurnCredentials(userId, ttlSeconds = 86400) {
        const sharedSecret = process.env.TURN_SHARED_SECRET || process.env.COTURN_SHARED_SECRET;
        const turnHost = process.env.TURN_PUBLIC_HOST ||
            process.env.TURN_SERVER_HOST ||
            process.env.TURN_HOST ||
            "sfu-staging.masterhrms.com";
        const udpPort = parseInt(process.env.TURN_UDP_PORT || "3478", 10);
        const tcpPort = parseInt(process.env.TURN_TCP_PORT || "3478", 10);
        const tlsPort = parseInt(process.env.TURN_TLS_PORT || "5349", 10);
        if (!sharedSecret || !sharedSecret.trim()) {
            return [];
        }
        const expiryTimestamp = Math.floor(Date.now() / 1000) + ttlSeconds;
        const username = `${expiryTimestamp}:${userId}`;
        const credential = crypto_1.default
            .createHmac("sha1", sharedSecret.trim())
            .update(username)
            .digest("base64");
        const urls = [
            `turn:${turnHost}:${udpPort}?transport=udp`,
            `turn:${turnHost}:${tcpPort}?transport=tcp`,
            `turns:${turnHost}:${tlsPort}?transport=tcp`,
        ];
        return [
            {
                urls,
                username,
                credential,
            },
        ];
    }
    /**
     * Validates an ephemeral Coturn credential against the shared secret and timestamp.
     * Useful for unit testing, authentication verification, and diagnostics.
     */
    static verifyTurnCredentials(username, credential) {
        const sharedSecret = process.env.TURN_SHARED_SECRET || process.env.COTURN_SHARED_SECRET;
        if (!sharedSecret || !sharedSecret.trim()) {
            return { valid: false, reason: "TURN_SHARED_SECRET not configured on server" };
        }
        const parts = username.split(":");
        if (parts.length < 2) {
            return { valid: false, reason: "Malformed TURN username format (expected <timestamp>:<userId>)" };
        }
        const expiresAt = parseInt(parts[0], 10);
        if (isNaN(expiresAt)) {
            return { valid: false, reason: "Invalid timestamp in TURN username" };
        }
        const now = Math.floor(Date.now() / 1000);
        if (expiresAt < now) {
            return { valid: false, reason: "TURN credential has expired", expiresAt };
        }
        const expectedCredential = crypto_1.default
            .createHmac("sha1", sharedSecret.trim())
            .update(username)
            .digest("base64");
        // Constant-time buffer comparison to prevent timing attacks
        const credBuffer = Buffer.from(credential);
        const expectedBuffer = Buffer.from(expectedCredential);
        if (credBuffer.length !== expectedBuffer.length || !crypto_1.default.timingSafeEqual(credBuffer, expectedBuffer)) {
            return { valid: false, reason: "Invalid HMAC-SHA1 signature" };
        }
        const userId = parts.slice(1).join(":");
        return { valid: true, userId, expiresAt };
    }
    /**
     * Generates standard STUN/TURN ICE server configuration.
     * If ephemeral TURN credentials are enabled (TURN_SHARED_SECRET present and userId provided),
     * returns ephemeral credentials; otherwise falls back to static or STUN-only configuration.
     */
    static getIceServers(userId, ttlSeconds = 86400) {
        const servers = [
            { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
        ];
        // Priority 1: Ephemeral HMAC-SHA1 credentials for Coturn REST API (RFC 7635)
        const sharedSecret = process.env.TURN_SHARED_SECRET || process.env.COTURN_SHARED_SECRET;
        if (sharedSecret && userId) {
            const ephemeral = this.generateEphemeralTurnCredentials(userId, ttlSeconds);
            if (ephemeral.length > 0) {
                servers.push(...ephemeral);
                return servers;
            }
        }
        // Priority 2: Static TURN credentials if configured
        const config = this.getConfig();
        if (config.turnUrl) {
            const turnConfig = {
                urls: config.turnUrl.includes(",") ? config.turnUrl.split(",").map((u) => u.trim()) : config.turnUrl,
            };
            if (config.turnUsername)
                turnConfig.username = config.turnUsername;
            if (config.turnCredential)
                turnConfig.credential = config.turnCredential;
            servers.push(turnConfig);
        }
        return servers;
    }
    /**
     * Canonical room name formatting ensuring strict tenant and group boundary isolation.
     */
    static formatRoomName(tenantId, groupId, callId) {
        return `meeting_${tenantId}_${groupId}_${callId}`;
    }
    /**
     * Canonical room name formatting for direct/group calls upgrading to SFU.
     */
    static formatCallRoomName(tenantId, callId) {
        return `call_${tenantId}_${callId}`;
    }
    /**
     * Issues a short-lived (15 minutes default) LiveKit access token for an active call.
     */
    static generateCallToken(params) {
        const config = this.getConfig();
        if (!config.configured || !config.apiKey || !config.apiSecret || !config.url) {
            throw new SfuConfigurationError("LiveKit SFU is not configured on this server. LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET must be set.");
        }
        const { tenantId, callId, userId, name, avatarUrl, isHost, ttlSeconds = 900 } = params;
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = now + ttlSeconds;
        const room = this.formatCallRoomName(tenantId, callId);
        const payload = {
            sub: userId,
            name,
            iss: config.apiKey,
            nbf: now - 5,
            exp: expiresAt,
            video: {
                room,
                roomJoin: true,
                canPublish: true,
                canSubscribe: true,
                canPublishData: true,
                roomAdmin: Boolean(isHost),
                roomCreate: Boolean(isHost),
                hidden: false,
            },
            metadata: JSON.stringify({
                tenantId,
                callId,
                userId,
                role: isHost ? "host" : "participant",
                avatarUrl: avatarUrl || null,
            }),
        };
        const token = jsonwebtoken_1.default.sign(payload, config.apiSecret, { algorithm: "HS256" });
        return {
            token,
            room,
            url: config.url,
            expiresAt: expiresAt * 1000,
            iceServers: this.getIceServers(userId, ttlSeconds),
        };
    }
    /**
     * Issues a short-lived (15 minutes default) LiveKit-compliant JWT access token.
     */
    static generateMeetingToken(params) {
        const config = this.getConfig();
        if (!config.configured || !config.apiKey || !config.apiSecret || !config.url) {
            throw new SfuConfigurationError("LiveKit SFU is not configured on this server. LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET must be set.");
        }
        const { tenantId, groupId, callId, userId, name, avatarUrl, isHost, ttlSeconds = 900 } = params;
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = now + ttlSeconds;
        const room = this.formatRoomName(tenantId, groupId, callId);
        const payload = {
            sub: userId,
            name,
            iss: config.apiKey,
            nbf: now - 5,
            exp: expiresAt,
            video: {
                room,
                roomJoin: true,
                canPublish: true,
                canSubscribe: true,
                canPublishData: true,
                roomAdmin: Boolean(isHost),
                roomCreate: Boolean(isHost),
                hidden: false,
            },
            metadata: JSON.stringify({
                tenantId,
                groupId,
                userId,
                role: isHost ? "host" : "participant",
                avatarUrl: avatarUrl || null,
            }),
        };
        const token = jsonwebtoken_1.default.sign(payload, config.apiSecret, { algorithm: "HS256" });
        return {
            token,
            room,
            url: config.url,
            expiresAt: expiresAt * 1000,
            iceServers: this.getIceServers(userId, ttlSeconds),
        };
    }
    /**
     * Diagnostic summary for administrators and client verification.
     */
    static getDiagnosticInfo() {
        const config = this.getConfig();
        const missing = [];
        if (!config.url)
            missing.push("LIVEKIT_URL");
        if (!config.apiKey)
            missing.push("LIVEKIT_API_KEY");
        if (!config.apiSecret)
            missing.push("LIVEKIT_API_SECRET");
        const isLiveKitCloud = Boolean(config.url && config.url.includes("livekit.cloud"));
        const status = config.configured ? "ready" : "pending_configuration";
        return {
            configured: config.configured,
            provider: isLiveKitCloud ? "livekit_cloud" : "livekit",
            status,
            isLiveKitCloud,
            url: config.url,
            hasTurn: Boolean(config.turnUrl || config.turnSharedSecretConfigured || isLiveKitCloud),
            turnSharedSecretConfigured: config.turnSharedSecretConfigured,
            missing,
            setupGuide: "To enable real multi-party meetings via LiveKit Cloud: 1) Create a free project at cloud.livekit.io (masterhrms-staging). 2) Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in your backend environment variables. LiveKit Cloud includes built-in global TURN relays automatically.",
        };
    }
}
exports.MeetingSfuService = MeetingSfuService;
