"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebRtcIceService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const FREE_PUBLIC_STUN_SERVERS = [
    {
        urls: [
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302",
            "stun:stun2.l.google.com:19302",
            "stun:stun3.l.google.com:19302",
            "stun:stun4.l.google.com:19302",
        ],
    },
];
function buildTurnIceServer(userId, ttlSeconds = 3600) {
    const rawUrls = (process.env.TURN_SERVER_URLS || "").trim();
    if (!rawUrls)
        return null;
    const urls = rawUrls
        .split(",")
        .map((u) => u.trim())
        .filter((u) => u.startsWith("turn:") || u.startsWith("turns:"));
    if (urls.length === 0)
        return null;
    const sharedSecret = process.env.TURN_SHARED_SECRET?.trim();
    if (sharedSecret) {
        const expiry = Math.floor(Date.now() / 1000) + Math.max(60, ttlSeconds);
        const username = `${expiry}:${userId || "anon"}`;
        const credential = crypto_1.default
            .createHmac("sha1", sharedSecret)
            .update(username)
            .digest("base64");
        return { urls, username, credential };
    }
    const staticUser = process.env.TURN_USERNAME?.trim();
    const staticCred = process.env.TURN_CREDENTIAL?.trim();
    if (staticUser && staticCred) {
        return { urls, username: staticUser, credential: staticCred };
    }
    return null;
}
class WebRtcIceService {
    /**
     * Returns ICE servers for WebRTC 1:1 and mesh calls.
     * Always includes STUN servers; appends TURN/TURNS relay when configured via env vars.
     */
    static getIceServers(userId, ttlSeconds = 3600) {
        const servers = FREE_PUBLIC_STUN_SERVERS.map((s) => ({
            urls: Array.isArray(s.urls) ? [...s.urls] : s.urls,
        }));
        const turnServer = buildTurnIceServer(userId, ttlSeconds);
        if (turnServer) {
            servers.push(turnServer);
        }
        return servers;
    }
    /**
     * WebRTC mesh ICE diagnostics (indicates STUN-only vs TURN-enabled relay readiness).
     */
    static getDiagnostics(userId) {
        const turnServer = buildTurnIceServer(userId);
        const hasTurn = Boolean(turnServer);
        return {
            mode: "webrtc_mesh",
            configured: true,
            relay: hasTurn ? "turn" : "none",
            stunOnly: !hasTurn,
            iceServersCount: this.getIceServers(userId).length,
        };
    }
}
exports.WebRtcIceService = WebRtcIceService;
