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
        key: config.key,
        cluster: config.cluster,
        enabled: config.enabled,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to load Pusher config" });
  }
});
