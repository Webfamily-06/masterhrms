import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { VapidService } from "../services/vapid.service";
import { PushSubscriptionStore } from "../services/push-subscription.store";

export const pushRouter = Router();

// GET /api/notifications/push/status - Get VAPID public key and subscription status
pushRouter.get("/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const keys = VapidService.getVapidKeys();
    const userId = req.user!.userId || (req.user as any).id;
    const tenantId = req.user!.tenantId!;

    const activeSubs = await PushSubscriptionStore.getActiveSubscriptions(tenantId, userId);

    return res.json({
      success: true,
      data: {
        vapidPublicKey: keys.publicKey,
        hasActiveSubscription: activeSubs.length > 0,
        subscriptionCount: activeSubs.length,
        serviceWorker: { path: "/sw.js", scope: "/" },
      },
    });
  } catch (error: any) {
    console.error("[PushRoutes] Status check error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to check push status" });
  }
});

// POST /api/notifications/push/subscribe - Register a Web Push subscription with device-level association
pushRouter.post("/subscribe", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { endpoint, keys, deviceId, platform, sessionTokenId } = req.body || {};
    const userId = req.user!.userId || (req.user as any).id;
    const tenantId = req.user!.tenantId!;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({
        success: false,
        error: "Missing required push subscription fields: endpoint, keys.p256dh, and keys.auth must all be provided.",
      });
    }

    const userAgent = req.headers["user-agent"] || "Web Browser";

    const stored = await PushSubscriptionStore.saveSubscription({
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
  } catch (error: any) {
    console.error("[PushRoutes] Subscription registration error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to register push subscription" });
  }
});

// POST & DELETE /api/notifications/push/unsubscribe - Device-specific de-registration
const handleUnsubscribe = async (req: AuthRequest, res: Response) => {
  try {
    const { endpoint, deviceId } = req.body || {};
    const userId = req.user!.userId || (req.user as any).id;
    const tenantId = req.user!.tenantId!;

    if (!endpoint && !deviceId) {
      return res.status(400).json({ success: false, error: "Missing required endpoint or deviceId in request body" });
    }

    const revoked = await PushSubscriptionStore.revokeDeviceSubscription(tenantId, userId, deviceId || endpoint);

    return res.json({
      success: true,
      revoked,
      message: "Device push subscription revoked successfully",
    });
  } catch (error: any) {
    console.error("[PushRoutes] Unsubscribe error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to remove push subscription" });
  }
};

pushRouter.delete("/unsubscribe", requireAuth, handleUnsubscribe);
pushRouter.post("/unsubscribe", requireAuth, handleUnsubscribe);

// GET /api/notifications/push/diagnostics - Secure, sanitized diagnostic status
pushRouter.get("/diagnostics", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const keys = VapidService.getVapidKeys();
    const userId = req.user!.userId || (req.user as any).id;
    const tenantId = req.user!.tenantId!;

    const activeSubs = await PushSubscriptionStore.getActiveSubscriptions(tenantId, userId);

    return res.json({
      success: true,
      data: {
        provider: "VAPID_WEB_PUSH",
        vapidConfigured: Boolean(keys.publicKey && keys.privateKey),
        vapidSubject: keys.subject,
        vapidPublicKey: keys.publicKey,
        hasActiveSubscription: activeSubs.length > 0,
        subscriptionCount: activeSubs.length,
        serviceWorker: { path: "/sw.js", scope: "/" },
        subscriptions: activeSubs.map((s) => ({
          id: s.id,
          deviceId: s.deviceId,
          platform: s.platform,
          userAgent: s.userAgent,
          createdAt: s.createdAt,
          lastSeenAt: s.lastSeenAt,
          status: s.status,
        })),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to load push diagnostics" });
  }
});

// POST /api/notifications/push/test - Dispatch test push to verify browser delivery
pushRouter.post("/test", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId || (req.user as any).id;
    const tenantId = req.user!.tenantId!;

    const activeSubs = await PushSubscriptionStore.getActiveSubscriptions(tenantId, userId);
    if (activeSubs.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No active push subscriptions found for current user. Please enable notifications in the browser first.",
      });
    }

    const notifType = req.body?.type || "general";
    const customTitle = req.body?.title || "MasterHRMS Platform Notification";
    const customBody = req.body?.body || req.body?.message || "This is a verified background Web Push notification from MasterHRMS.";
    const customUrl = req.body?.actionUrl || req.body?.url || req.body?.linkTo || "/hr/notifications";

    let testPayload: any;
    let ttl = 86400;
    let urgency: "high" | "normal" = "normal";
    let topic = "test_notification";

    if (notifType === "call") {
      testPayload = {
        type: "CALL_INCOMING",
        eventType: "CALL_INCOMING",
        schemaVersion: "1.0",
        callId: `test_call_${Date.now()}`,
        tenantId,
        callerId: "system",
        callerName: "MasterHRMS Test",
        callerAvatar: null,
        callType: "audio",
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        actionRoute: "/chat",
      };
      ttl = 45;
      urgency = "high";
      topic = "test_call";
    } else {
      testPayload = {
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
    }

    const results = await Promise.all(
      activeSubs.map((sub) =>
        VapidService.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          testPayload,
          { ttl, urgency, topic }
        )
      )
    );

    const successful = results.filter((r) => r.success).length;

    return res.json({
      success: true,
      message: `Test push dispatched to ${activeSubs.length} subscription(s). Successful: ${successful}`,
      data: { total: activeSubs.length, successful },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to dispatch test push" });
  }
});

