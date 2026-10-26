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
Object.defineProperty(exports, "__esModule", { value: true });
exports.pusherRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const pusher_service_1 = require("../services/pusher.service");
exports.pusherRouter = (0, express_1.Router)();
// POST /api/pusher/auth - Authenticate private channel subscriptions
exports.pusherRouter.post("/auth", auth_1.requireAuth, async (req, res) => {
    try {
        const socketId = req.body.socket_id || req.body.socketId;
        const channelName = req.body.channel_name || req.body.channelName;
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        if (!socketId || !channelName) {
            return res.status(400).json({ error: "socket_id and channel_name are required" });
        }
        const authResult = await pusher_service_1.PusherService.authorizeChannel(socketId, channelName, {
            userId,
            tenantId,
        });
        if (!authResult.authorized) {
            return res.status(403).json({ error: authResult.error || "Channel authorization failed" });
        }
        return res.json(authResult.authResponse);
    }
    catch (error) {
        console.error("[PusherRoutes] Auth error:", error);
        return res.status(500).json({ error: error.message || "Pusher channel authentication failed" });
    }
});
// GET /api/pusher/config - Get client-safe Pusher credentials (never leak secret)
exports.pusherRouter.get("/config", auth_1.requireAuth, async (req, res) => {
    try {
        const config = await pusher_service_1.PusherService.getConfig();
        return res.json({
            success: true,
            data: {
                appId: config.appId,
                key: config.key,
                cluster: config.cluster,
                enabled: config.enabled,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || "Failed to load Pusher config" });
    }
});
// POST /api/pusher/test - Test Pusher connectivity (super admin or admin)
exports.pusherRouter.post("/test", auth_1.requireAuth, async (req, res) => {
    try {
        const isSuperOrAdmin = req.user?.roles.some((r) => ["super_admin", "admin", "tenant_admin"].includes(r));
        if (!isSuperOrAdmin) {
            return res.status(403).json({ error: "Access denied: Super Admin or Admin role required" });
        }
        const { appId: testAppId, key: testKey, secret: testSecret, cluster: testCluster } = req.body || {};
        const baseConfig = await pusher_service_1.PusherService.getConfig();
        const appId = testAppId || baseConfig.appId;
        const key = testKey || baseConfig.key;
        let secret = testSecret && !testSecret.includes("••••") ? testSecret : baseConfig.secret;
        const cluster = testCluster || baseConfig.cluster;
        if (!appId || !key || !secret) {
            return res.status(400).json({
                success: false,
                error: "Missing required Pusher credentials: App ID, Key, and Secret must all be configured.",
            });
        }
        const PusherClass = (await Promise.resolve().then(() => __importStar(require("pusher")))).default;
        const testClient = new PusherClass({
            appId,
            key,
            secret,
            cluster: cluster || "ap2",
            useTLS: true,
        });
        // Test real event trigger on diagnostic channel
        await testClient.trigger("system-test-channel", "test-connection", {
            message: "Pusher connection verified from MASTERHRMS Platform Settings",
            cluster,
            timestamp: new Date().toISOString(),
            testedBy: req.user?.userId,
        });
        return res.json({
            success: true,
            message: `Pusher connected and test event triggered successfully! (Cluster: ${cluster}, App ID: ${appId})`,
            data: {
                cluster,
                appId,
                key,
            },
        });
    }
    catch (error) {
        console.error("[PusherRoutes] Test error:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "Failed to connect to Pusher with provided credentials",
        });
    }
});
