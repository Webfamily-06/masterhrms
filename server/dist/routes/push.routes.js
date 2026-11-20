"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const vapid_service_1 = require("../services/vapid.service");
const push_subscription_store_1 = require("../services/push-subscription.store");
const native_push_store_1 = require("../services/native-push.store");
const native_push_dispatcher_service_1 = require("../services/native-push-dispatcher.service");
exports.pushRouter = (0, express_1.Router)();
// GET /api/notifications/push/status - Get VAPID key and combined Web/Mobile push status
exports.pushRouter.get("/status", auth_1.requireAuth, async (req, res) => {
    try {
        const keys = vapid_service_1.VapidService.getVapidKeys();
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        const [activeSubs, activeDevices] = await Promise.all([
            push_subscription_store_1.PushSubscriptionStore.getActiveSubscriptions(tenantId, userId),
            native_push_store_1.NativePushStore.getActiveDeviceTokens(tenantId, userId),
        ]);
        return res.json({
            success: true,
            data: {
                vapidPublicKey: keys.publicKey,
                hasActiveSubscription: activeSubs.length > 0 || activeDevices.length > 0,
                webPushCount: activeSubs.length,
                nativeDeviceCount: activeDevices.length,
                totalActiveCount: activeSubs.length + activeDevices.length,
                serviceWorker: { path: "/sw.js", scope: "/" },
            },
        });
    }
    catch (error) {
        console.error("[PushRoutes] Status check error:", error);
        return res.status(500).json({ success: false, error: error.message || "Failed to check push status" });
    }
});
// ── NATIVE MOBILE DEVICE TOKEN REGISTRATION (FCM / EXPO / APNS) ─────────────
// POST /api/notifications/push/device-token - Register a native mobile device token
const handleRegisterDeviceToken = async (req, res) => {
    try {
        const { token, platform, tokenType, deviceId, appVersion } = req.body || {};
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        if (!token || typeof token !== "string" || token.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: "Missing required 'token' string field in request body.",
            });
        }
        const userAgent = req.headers["user-agent"] || "MasterHRMS Mobile";
        const stored = await native_push_store_1.NativePushStore.saveDeviceToken({
            tenantId,
            userId,
            token: token.trim(),
            platform,
            tokenType,
            deviceId,
            appVersion,
            userAgent,
        });
        console.log(`[PushRoutes] Successfully registered native device token for user ${userId} on device ${stored.deviceId} (${stored.platform}/${stored.tokenType}) in tenant ${tenantId}`);
        return res.status(201).json({
            success: true,
            message: "Native device push token registered successfully",
            data: {
                id: stored.id,
                deviceId: stored.deviceId,
                platform: stored.platform,
                tokenType: stored.tokenType,
                createdAt: stored.createdAt,
            },
        });
    }
    catch (error) {
        console.error("[PushRoutes] Device token registration error:", error);
        return res.status(500).json({ success: false, error: error.message || "Failed to register device token" });
    }
};
exports.pushRouter.post("/device-token", auth_1.requireAuth, handleRegisterDeviceToken);
exports.pushRouter.post("/register-device", auth_1.requireAuth, handleRegisterDeviceToken);
// DELETE & POST /api/notifications/push/device-token - Revoke native device token
const handleRevokeDeviceToken = async (req, res) => {
    try {
        const { token, deviceId } = req.body || {};
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        if (!token && !deviceId) {
            return res.status(400).json({
                success: false,
                error: "Missing required 'token' or 'deviceId' in request body.",
            });
        }
        const revoked = await native_push_store_1.NativePushStore.revokeDeviceToken(tenantId, userId, token || deviceId);
        return res.json({
            success: true,
            revoked,
            message: "Native device push token revoked successfully",
        });
    }
    catch (error) {
        console.error("[PushRoutes] Revoke device token error:", error);
        return res.status(500).json({ success: false, error: error.message || "Failed to revoke device token" });
    }
};
exports.pushRouter.delete("/device-token", auth_1.requireAuth, handleRevokeDeviceToken);
exports.pushRouter.post("/device-token/revoke", auth_1.requireAuth, handleRevokeDeviceToken);
// GET /api/notifications/push/device-tokens - List registered native devices
exports.pushRouter.get("/device-tokens", auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        const activeDevices = await native_push_store_1.NativePushStore.getActiveDeviceTokens(tenantId, userId);
        return res.json({
            success: true,
            data: activeDevices.map((d) => ({
                id: d.id,
                deviceId: d.deviceId,
                platform: d.platform,
                tokenType: d.tokenType,
                appVersion: d.appVersion,
                createdAt: d.createdAt,
                lastSeenAt: d.lastSeenAt,
                status: d.status,
            })),
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message || "Failed to fetch device tokens" });
    }
});
// ── BROWSER WEB PUSH SUBSCRIPTIONS (VAPID) ──────────────────────────────────
// POST /api/notifications/push/subscribe - Register a Web Push subscription with device-level association
exports.pushRouter.post("/subscribe", auth_1.requireAuth, async (req, res) => {
    try {
        const { endpoint, keys, deviceId, platform, sessionTokenId } = req.body || {};
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return res.status(400).json({
                success: false,
                error: "Missing required push subscription fields: endpoint, keys.p256dh, and keys.auth must all be provided.",
            });
        }
        const userAgent = req.headers["user-agent"] || "Web Browser";
        const stored = await push_subscription_store_1.PushSubscriptionStore.saveSubscription({
            tenantId,
            userId,
            subscription: { endpoint, keys },
            userAgent,
            deviceId,
            platform,
            sessionTokenId,
        });
        console.log(`[PushRoutes] Successfully registered push subscription for user ${userId} on device ${stored.deviceId} in tenant ${tenantId}`);
        return res.status(201).json({
            success: true,
            message: "Push subscription registered successfully",
            data: {
                subscriptionId: stored.id,
                deviceId: stored.deviceId,
                createdAt: stored.createdAt,
            },
        });
    }
    catch (error) {
        console.error("[PushRoutes] Subscription registration error:", error);
        return res.status(500).json({ success: false, error: error.message || "Failed to register push subscription" });
    }
});
// POST & DELETE /api/notifications/push/unsubscribe - Device-specific de-registration
const handleUnsubscribe = async (req, res) => {
    try {
        const { endpoint, deviceId } = req.body || {};
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        if (!endpoint && !deviceId) {
            return res.status(400).json({ success: false, error: "Missing required endpoint or deviceId in request body" });
        }
        const revoked = await push_subscription_store_1.PushSubscriptionStore.revokeDeviceSubscription(tenantId, userId, deviceId || endpoint);
        return res.json({
            success: true,
            revoked,
            message: "Device push subscription revoked successfully",
        });
    }
    catch (error) {
        console.error("[PushRoutes] Unsubscribe error:", error);
        return res.status(500).json({ success: false, error: error.message || "Failed to remove push subscription" });
    }
};
exports.pushRouter.delete("/unsubscribe", auth_1.requireAuth, handleUnsubscribe);
exports.pushRouter.post("/unsubscribe", auth_1.requireAuth, handleUnsubscribe);
// ── DIAGNOSTICS & TESTING ───────────────────────────────────────────────────
// GET /api/notifications/push/diagnostics - Secure, sanitized diagnostic status
exports.pushRouter.get("/diagnostics", auth_1.requireAuth, async (req, res) => {
    try {
        const keys = vapid_service_1.VapidService.getVapidKeys();
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        const [activeSubs, activeDevices] = await Promise.all([
            push_subscription_store_1.PushSubscriptionStore.getActiveSubscriptions(tenantId, userId),
            native_push_store_1.NativePushStore.getActiveDeviceTokens(tenantId, userId),
        ]);
        return res.json({
            success: true,
            data: {
                provider: "HYBRID_WEB_AND_NATIVE_FCM",
                vapidConfigured: Boolean(keys.publicKey && keys.privateKey),
                vapidSubject: keys.subject,
                vapidPublicKey: keys.publicKey,
                hasActiveSubscription: activeSubs.length > 0 || activeDevices.length > 0,
                webPushCount: activeSubs.length,
                nativeDeviceCount: activeDevices.length,
                serviceWorker: { path: "/sw.js", scope: "/" },
                webSubscriptions: activeSubs.map((s) => ({
                    id: s.id,
                    deviceId: s.deviceId,
                    platform: s.platform,
                    userAgent: s.userAgent,
                    createdAt: s.createdAt,
                    lastSeenAt: s.lastSeenAt,
                    status: s.status,
                })),
                nativeDevices: activeDevices.map((d) => ({
                    id: d.id,
                    deviceId: d.deviceId,
                    platform: d.platform,
                    tokenType: d.tokenType,
                    appVersion: d.appVersion,
                    createdAt: d.createdAt,
                    lastSeenAt: d.lastSeenAt,
                    status: d.status,
                })),
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message || "Failed to load push diagnostics" });
    }
});
// POST /api/notifications/push/test - Dispatch test push to verify web and/or native delivery
exports.pushRouter.post("/test", auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const tenantId = req.user.tenantId;
        const target = req.body?.target || "all"; // 'all' | 'web' | 'mobile'
        const [activeSubs, activeDevices] = await Promise.all([
            push_subscription_store_1.PushSubscriptionStore.getActiveSubscriptions(tenantId, userId),
            native_push_store_1.NativePushStore.getActiveDeviceTokens(tenantId, userId),
        ]);
        if (activeSubs.length === 0 && activeDevices.length === 0) {
            return res.status(400).json({
                success: false,
                error: "No active push subscriptions or mobile device tokens found for current user. Please register a device first.",
            });
        }
        const customTitle = req.body?.title || "MasterHRMS Platform Notification";
        const customBody = req.body?.body || req.body?.message || "This is a verified test push notification from MasterHRMS.";
        const customUrl = req.body?.actionUrl || req.body?.url || req.body?.linkTo || "/hr/notifications";
        const testPayload = {
            type: "NOTIFICATION_NEW",
            eventType: "NOTIFICATION_NEW",
            schemaVersion: "1.0",
            id: `test_notif_${Date.now()}`,
            notificationId: `test_notif_${Date.now()}`,
            tenantId,
            title: customTitle,
            body: customBody,
            message: customBody,
            module: req.body?.module || "SYSTEM",
            linkTo: customUrl,
            actionUrl: customUrl,
            icon: "/assets/img/logo-small.svg",
            badge: "/assets/img/favicon.png",
            tag: `notif_test_${Date.now()}`,
            timestamp: new Date().toISOString(),
        };
        let webSuccessful = 0;
        let mobileSuccessful = 0;
        // 1. Web Push dispatch
        if ((target === "all" || target === "web") && activeSubs.length > 0) {
            const results = await Promise.all(activeSubs.map((sub) => vapid_service_1.VapidService.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, testPayload, { ttl: 86400, urgency: "normal", topic: "test_notification" })));
            webSuccessful = results.filter((r) => r.success).length;
        }
        // 2. Native Mobile Push dispatch
        if ((target === "all" || target === "mobile") && activeDevices.length > 0) {
            const nativeRes = await native_push_dispatcher_service_1.NativePushDispatcher.dispatch(activeDevices, testPayload);
            mobileSuccessful = nativeRes.sent;
        }
        return res.json({
            success: true,
            message: `Test push dispatched. Web: ${webSuccessful}/${activeSubs.length}, Mobile: ${mobileSuccessful}/${activeDevices.length}`,
            data: {
                web: { total: activeSubs.length, successful: webSuccessful },
                mobile: { total: activeDevices.length, successful: mobileSuccessful },
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message || "Failed to dispatch test push" });
    }
});
