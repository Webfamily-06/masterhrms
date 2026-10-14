import { Router, Request, Response } from "express";
import { OutboundWebhooksService, EVENT_CATALOG } from "./outbound-webhooks.service";
import { requireAuth, AuthRequest } from "../../middleware/auth";
import { requireAddon } from "../../middleware/entitlements";
import { resolveTenantId } from "../../lib/tenant";

export const outboundWebhooksRouter = Router();

// Public signature verification
outboundWebhooksRouter.post("/verify-signature", (req: Request, res: Response) => {
  const { payload, signature, secret, toleranceSeconds } = req.body;
  if (!payload || !signature || !secret) {
    return res.status(400).json({ error: "payload, signature, and secret are required" });
  }

  const valid = OutboundWebhooksService.verifySignature(payload, signature, secret, toleranceSeconds);
  res.json({ valid });
});

// Authenticated management endpoints guarded by auth & add-on entitlement
outboundWebhooksRouter.use(requireAuth as any);
outboundWebhooksRouter.use(requireAddon("webhook") as any);

// 1. List Endpoints
outboundWebhooksRouter.get("/endpoints", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { module, event, status, search } = req.query;
    const endpoints = await OutboundWebhooksService.listEndpoints(tenantId, {
      module: module ? String(module) : undefined,
      event: event ? String(event) : undefined,
      status: status ? String(status) : undefined,
      search: search ? String(search) : undefined,
    });

    res.json({ success: true, endpoints });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to list webhook endpoints" });
  }
});

// 2. Create Endpoint
outboundWebhooksRouter.post("/endpoints", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const userId = req.user?.userId || "user";

    const { name, module, eventKey, events, method, url, headersJson, timeoutMs, maxRetries, allowLocalhostForTest } = req.body;
    if (!url) {
      return res.status(400).json({ error: "Destination URL is required" });
    }

    const result = await OutboundWebhooksService.createEndpoint(tenantId, userId, {
      name,
      module,
      eventKey,
      events,
      method,
      url,
      headersJson,
      timeoutMs,
      maxRetries,
      allowLocalhostForTest,
    });

    res.status(201).json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to create webhook endpoint" });
  }
});

// 3. Get Endpoint Detail
outboundWebhooksRouter.get("/endpoints/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const result = await OutboundWebhooksService.getEndpointDetail(tenantId, req.params.id);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(404).json({ error: err.message || "Webhook endpoint not found" });
  }
});

// 4. Update Endpoint
outboundWebhooksRouter.put("/endpoints/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const userId = req.user?.userId || "user";

    const updated = await OutboundWebhooksService.updateEndpoint(tenantId, req.params.id, userId, req.body);
    res.json({ success: true, endpoint: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to update webhook endpoint" });
  }
});

// 5. Toggle Endpoint Active/Disabled
outboundWebhooksRouter.patch("/endpoints/:id/toggle", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const userId = req.user?.userId || "user";

    const updated = await OutboundWebhooksService.toggleEndpoint(tenantId, req.params.id, userId);
    res.json({ success: true, endpoint: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to toggle endpoint status" });
  }
});

// 6. Rotate Secret
outboundWebhooksRouter.post("/endpoints/:id/rotate-secret", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const userId = req.user?.userId || "user";

    const result = await OutboundWebhooksService.rotateSecret(tenantId, req.params.id, userId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to rotate secret" });
  }
});

// 7. Delete Endpoint
outboundWebhooksRouter.delete("/endpoints/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const userId = req.user?.userId || "user";

    await OutboundWebhooksService.deleteEndpoint(tenantId, req.params.id, userId);
    res.json({ success: true, message: "Webhook endpoint deleted successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to delete webhook endpoint" });
  }
});

// 8. Test Endpoint
outboundWebhooksRouter.post("/endpoints/:id/test", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const userId = req.user?.userId || "user";
    const { allowLocalhostForTest } = req.body;

    const deliveryLog = await OutboundWebhooksService.testEndpoint(
      tenantId,
      req.params.id,
      userId,
      allowLocalhostForTest
    );

    res.json({ success: true, delivery: deliveryLog });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to test webhook endpoint" });
  }
});

// 9. Event Catalog (dynamically resolved from installed & entitled module manifests)
outboundWebhooksRouter.get("/events", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    const events = await OutboundWebhooksService.getEventCatalog(tenantId);
    res.json({ success: true, events });
  } catch (err: any) {
    res.json({ success: true, events: EVENT_CATALOG });
  }
});

// 10. List Delivery Logs
outboundWebhooksRouter.get("/logs", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { endpointId, eventKey, status, limit } = req.query;
    const logs = await OutboundWebhooksService.listDeliveryLogs(tenantId, Number(limit) || 100, {
      endpointId: endpointId ? String(endpointId) : undefined,
      eventKey: eventKey ? String(eventKey) : undefined,
      status: status ? String(status) : undefined,
    });

    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch delivery logs" });
  }
});

// 11. Get Delivery Log Detail
outboundWebhooksRouter.get("/logs/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const log = await OutboundWebhooksService.getLogDetail(tenantId, req.params.id);
    if (!log) return res.status(404).json({ error: "Delivery log not found" });

    res.json({ success: true, log });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch delivery log" });
  }
});

// 12. Retry Delivery
outboundWebhooksRouter.post("/logs/:id/retry", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const userId = req.user?.userId || "user";

    const log = await OutboundWebhooksService.retryDelivery(tenantId, req.params.id, userId);
    res.json({ success: true, delivery: log });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to retry delivery" });
  }
});

// 13. Settings
outboundWebhooksRouter.get("/settings", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const settings = await OutboundWebhooksService.getSettings(tenantId);
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch webhook settings" });
  }
});

outboundWebhooksRouter.put("/settings", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const userId = req.user?.userId || "user";

    const settings = await OutboundWebhooksService.updateSettings(tenantId, req.body, userId);
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to update webhook settings" });
  }
});

// 14. Backward compatibility dispatch endpoint
outboundWebhooksRouter.post("/test-dispatch", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

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
