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

    const testPayload = {
      eventType: "CALL_INCOMING",
      schemaVersion: "1.0",
      callId: `test_call_${Date.now()}`,
      tenantId,
      callerId: "system",
      callerName: "MasterHRMS Test",
      callerAvatar: null,
      callType: "audio",
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 45000).toISOString(),
      actionRoute: "/apps/chat/chats",
    };

    const results = await Promise.all(
      activeSubs.map((sub) =>
        VapidService.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          testPayload,
          { ttl: 45, urgency: "high", topic: "test_call" }
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

