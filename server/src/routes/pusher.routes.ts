import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { PusherService } from "../services/pusher.service";

export const pusherRouter = Router();

// POST /api/pusher/auth - Authenticate private channel subscriptions
pusherRouter.post("/auth", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const socketId = req.body.socket_id || req.body.socketId;
    const channelName = req.body.channel_name || req.body.channelName;
    const userId = req.user!.userId || (req.user as any).id;
    const tenantId = req.user!.tenantId!;

    if (!socketId || !channelName) {
      return res.status(400).json({ error: "socket_id and channel_name are required" });
    }

    const authResult = await PusherService.authorizeChannel(socketId, channelName, {
      userId,
      tenantId,
    });

    if (!authResult.authorized) {
      return res.status(403).json({ error: authResult.error || "Channel authorization failed" });
    }

    return res.json(authResult.authResponse);
  } catch (error: any) {
    console.error("[PusherRoutes] Auth error:", error);
    return res.status(500).json({ error: error.message || "Pusher channel authentication failed" });
  }
});

// GET /api/pusher/config - Get client-safe Pusher credentials (never leak secret)
pusherRouter.get("/config", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const config = await PusherService.getConfig();
    return res.json({
      success: true,
      data: {
        appId: config.appId,
        key: config.key,
        cluster: config.cluster,
        enabled: config.enabled,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to load Pusher config" });
  }
});

// POST /api/pusher/test - Test Pusher connectivity (super admin or admin)
pusherRouter.post("/test", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isSuperOrAdmin = req.user?.roles.some((r) =>
      ["super_admin", "admin", "tenant_admin"].includes(r)
    );
    if (!isSuperOrAdmin) {
      return res.status(403).json({ error: "Access denied: Super Admin or Admin role required" });
    }

    const { appId: testAppId, key: testKey, secret: testSecret, cluster: testCluster } = req.body || {};
    const baseConfig = await PusherService.getConfig();

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

    const PusherClass = (await import("pusher")).default;
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
  } catch (error: any) {
    console.error("[PusherRoutes] Test error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to connect to Pusher with provided credentials",
    });
  }
});
