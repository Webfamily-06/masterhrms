"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PusherService = void 0;
const pusher_1 = __importDefault(require("pusher"));
const prisma_1 = require("../prisma");
let pusherInstance = null;
let pusherConfigInitialized = false;
let lastConfigFingerprint = "";
class PusherService {
    /**
     * Resets the cached singleton instance to force re-instantiation on config changes.
     */
    static resetInstance() {
        pusherInstance = null;
        pusherConfigInitialized = false;
        lastConfigFingerprint = "";
    }
    /**
     * Resolves Pusher configuration from SettingsService, CMS Settings (system-platform-settings), or Environment.
     */
    static async getConfig() {
        let appId = process.env.PUSHER_APP_ID || process.env.VITE_PUSHER_APP_ID || "";
        let key = process.env.PUSHER_KEY || process.env.VITE_PUSHER_KEY || "";
        let secret = process.env.PUSHER_SECRET || process.env.VITE_PUSHER_SECRET || "";
        let cluster = process.env.PUSHER_CLUSTER || process.env.VITE_PUSHER_CLUSTER || "ap2";
        let enabled = process.env.VITE_PUSHER_ENABLED !== "false";
        try {
            // 1. Authoritative SettingsService check (PLATFORM scope)
            try {
                const { SettingsService } = await Promise.resolve().then(() => __importStar(require("./settings/settings.service")));
                const pusherGroup = await SettingsService.getGroup("pusher", "PLATFORM", null, { decryptSecrets: true });
                if (pusherGroup?.values) {
                    const pv = pusherGroup.values;
                    if (pv["pusher.app_id"])
                        appId = pv["pusher.app_id"];
                    if (pv["pusher.key"])
                        key = pv["pusher.key"];
                    if (pv["pusher.secret"] && !pv["pusher.secret"].includes("••••"))
                        secret = pv["pusher.secret"];
                    if (pv["pusher.cluster"])
                        cluster = pv["pusher.cluster"];
                    if (typeof pv["pusher.enabled"] === "boolean")
                        enabled = pv["pusher.enabled"];
                }
            }
            catch {
                // Fall through to cmsPage check
            }
            // 2. Canonical CMS platform settings page ("system-platform-settings", fallback "global-super-settings")
            const page = await prisma_1.prisma.cmsPage.findFirst({
                where: { slug: { in: ["system-platform-settings", "global-super-settings"] } },
                orderBy: { updatedAt: "desc" },
            });
            if (page?.content) {
                const c = typeof page.content === "string" ? JSON.parse(page.content) : page.content;
                if (c.pusherAppId)
                    appId = c.pusherAppId;
                if (c.pusherKey)
                    key = c.pusherKey;
                const secretCandidate = c.pusherSecret || c.pusherAppSecret;
                if (secretCandidate && secretCandidate !== "••••••••••••••••" && !secretCandidate.includes("••••")) {
                    secret = secretCandidate;
                }
                if (c.pusherCluster)
                    cluster = c.pusherCluster;
                if (typeof c.pusherEnabled === "boolean")
                    enabled = c.pusherEnabled;
            }
        }
        catch (err) {
            console.warn(`[PusherService] Error reading CMS Pusher config: ${err.message}`);
        }
        return {
            appId,
            key,
            secret,
            cluster,
            useTLS: true,
            enabled: Boolean(enabled && appId && key && secret),
        };
    }
    /**
     * Initializes or gets the singleton Pusher instance, re-creating if configuration has changed.
     */
    static async getInstance() {
        const config = await this.getConfig();
        if (!config.enabled) {
            pusherInstance = null;
            return null;
        }
        const currentFingerprint = `${config.appId}:${config.key}:${config.secret}:${config.cluster}:${config.enabled}`;
        if (!pusherInstance || !pusherConfigInitialized || currentFingerprint !== lastConfigFingerprint) {
            try {
                pusherInstance = new pusher_1.default({
                    appId: config.appId,
                    key: config.key,
                    secret: config.secret,
                    cluster: config.cluster,
                    useTLS: config.useTLS,
                });
                pusherConfigInitialized = true;
                lastConfigFingerprint = currentFingerprint;
            }
            catch (err) {
                console.warn(`[PusherService] Initialization failed: ${err.message}`);
                pusherInstance = null;
                return null;
            }
        }
        return pusherInstance;
    }
    /**
     * Authorizes a private channel subscription.
     * Format:
     *   private-user-{userId}
     *   private-tenant-{tenantId}
     */
    static async authorizeChannel(socketId, channelName, user) {
        if (!socketId || !channelName) {
            return { authorized: false, error: "Missing socket_id or channel_name" };
        }
        // 1. Channel authorization rules
        if (channelName.startsWith("private-user-")) {
            const targetUserId = channelName.replace("private-user-", "");
            if (targetUserId !== user.userId) {
                return { authorized: false, error: "UNAUTHORIZED_CHANNEL_SUBSCRIPTION: User ID mismatch" };
            }
        }
        else if (channelName.startsWith("private-tenant-")) {
            const targetTenantId = channelName.replace("private-tenant-", "");
            if (targetTenantId !== user.tenantId) {
                return { authorized: false, error: "UNAUTHORIZED_CHANNEL_SUBSCRIPTION: Tenant ID mismatch" };
            }
        }
        else {
            return { authorized: false, error: "UNAUTHORIZED_CHANNEL_SUBSCRIPTION: Channel format not permitted" };
        }
        // 2. Compute signature
        const pusher = await this.getInstance();
        if (!pusher) {
            // Mock authorization for local test environments without live internet Pusher credentials
            const crypto = await Promise.resolve().then(() => __importStar(require("crypto")));
            const config = await this.getConfig();
            const stringToSign = `${socketId}:${channelName}`;
            const secret = config.secret || "mock_pusher_secret_key_hrms";
            const signature = crypto.createHmac("sha256", secret).update(stringToSign).digest("hex");
            const key = config.key || "mock_pusher_key";
            return {
                authorized: true,
                authResponse: {
                    auth: `${key}:${signature}`,
                },
            };
        }
        try {
            const authResponse = pusher.authorizeChannel(socketId, channelName);
            return { authorized: true, authResponse };
        }
        catch (err) {
            return { authorized: false, error: err.message };
        }
    }
    /**
     * Triggers an in-app event on a user's private channel (private-user-{userId}).
     */
    static async triggerUserEvent(tenantId, userId, eventName, data) {
        const channel = `private-user-${userId}`;
        const payload = {
            ...data,
            tenantId,
            timestamp: new Date().toISOString(),
        };
        const pusher = await this.getInstance();
        if (!pusher) {
            // Log delivery attempt safely in development
            console.log(`[PusherService (Dev/Mock)] Event "${eventName}" dispatched to channel "${channel}":`, {
                title: data?.title,
                eventId: data?.eventId,
            });
            return { success: true, delivered: false };
        }
        try {
            await pusher.trigger(channel, eventName, payload);
            return { success: true, delivered: true };
        }
        catch (err) {
            console.warn(`[PusherService] Delivery error to ${channel}: ${err.message}`);
            return { success: false, delivered: false, error: err.message };
        }
    }
    /**
     * Triggers an in-app event on a tenant's private channel (private-tenant-{tenantId}).
     */
    static async triggerTenantEvent(tenantId, eventName, data) {
        const channel = `private-tenant-${tenantId}`;
        const payload = {
            ...data,
            tenantId,
            timestamp: new Date().toISOString(),
        };
        const pusher = await this.getInstance();
        if (!pusher) {
            console.log(`[PusherService (Dev/Mock)] Event "${eventName}" dispatched to tenant channel "${channel}"`);
            return { success: true, delivered: false };
        }
        try {
            await pusher.trigger(channel, eventName, payload);
            return { success: true, delivered: true };
        }
        catch (err) {
            console.warn(`[PusherService] Delivery error to ${channel}: ${err.message}`);
            return { success: false, delivered: false, error: err.message };
        }
    }
}
exports.PusherService = PusherService;
