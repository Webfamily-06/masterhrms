import { Router, Request, Response } from "express";
import { OutboundWebhooksService } from "./outbound-webhooks.service";
import { requireAuth, AuthRequest } from "../../middleware/auth";

export const outboundWebhooksRouter = Router();

// Public utility to verify signatures
outboundWebhooksRouter.post("/verify-signature", (req: Request, res: Response) => {
  const { payload, signature, secret, toleranceSeconds } = req.body;
  if (!payload || !signature || !secret) {
    return res.status(400).json({ error: "payload, signature, and secret are required" });
  }

  const valid = OutboundWebhooksService.verifySignature(payload, signature, secret, toleranceSeconds);
  res.json({ valid });
});

// Authenticated management endpoints
outboundWebhooksRouter.use(requireAuth as any);

// 1. List endpoints
outboundWebhooksRouter.get("/endpoints", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });

    const endpoints = await OutboundWebhooksService.listEndpoints(tenantId);
    res.json({ endpoints });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to list webhook endpoints" });
  }
});

// 2. Create endpoint (returns rawSecret ONCE)
outboundWebhooksRouter.post("/endpoints", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      return res.status(400).json({ error: "Tenant and user context required" });
    }

    const { url, events, allowLocalhostForTest } = req.body;
    const result = await OutboundWebhooksService.createEndpoint(tenantId, userId, {
      url,
      events,
      allowLocalhostForTest,
    });

    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to create webhook endpoint" });
  }
});

// 3. Delete endpoint
outboundWebhooksRouter.delete("/endpoints/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!tenantId || !userId) {
      return res.status(400).json({ error: "Tenant and user context required" });
    }

    await OutboundWebhooksService.deleteEndpoint(tenantId, id, userId);
    res.json({ success: true, message: "Webhook endpoint deleted" });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to delete webhook endpoint" });
  }
});

// 4. List delivery logs
outboundWebhooksRouter.get("/logs", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });

    const logs = await OutboundWebhooksService.listDeliveryLogs(tenantId);
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch delivery logs" });
  }
});

// 5. Test dispatch event
outboundWebhooksRouter.post("/test-dispatch", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });

    const { event, payload, allowLocalhostForTest } = req.body;
    const logs = await OutboundWebhooksService.dispatchEvent(
      tenantId,
      event || "test.ping",
      payload || { message: "Test webhook dispatch" },
      { allowLocalhostForTest }
    );

    res.json({ success: true, deliveries: logs });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to dispatch test webhook" });
  }
});
