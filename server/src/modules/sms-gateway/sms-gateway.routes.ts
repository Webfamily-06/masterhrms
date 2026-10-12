import { Router, Response } from "express";
import { SmsGatewayService } from "./sms-gateway.service";
import { requireAuth, AuthRequest } from "../../middleware/auth";

export const smsGatewayRouter = Router();

smsGatewayRouter.use(requireAuth as any);

// 1. Get SMS configuration (credentials masked)
smsGatewayRouter.get("/config", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required" });

    const config = await SmsGatewayService.getConfig(tenantId);
    res.json({ config });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch SMS configuration" });
  }
});

// 2. Update SMS configuration
smsGatewayRouter.put("/config", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      return res.status(400).json({ error: "Tenant and user context required" });
    }

    const { provider, enabled, sandboxMode, senderId, apiKey, apiSecret, authKey, templateId, route, dltEntityId } = req.body;
    const effectiveApiKey = apiKey !== undefined ? apiKey : authKey;
    const updated = await SmsGatewayService.updateConfig(tenantId, userId, {
      provider,
      enabled,
      sandboxMode,
      senderId,
      apiKey: effectiveApiKey,
      apiSecret,
      ...(templateId !== undefined ? { templateId } : {}),
      ...(route !== undefined ? { route } : {}),
      ...(dltEntityId !== undefined ? { dltEntityId } : {}),
    } as any);

    res.json({ success: true, config: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to update SMS configuration" });
  }
});

// 3. Test SMS provider connection
smsGatewayRouter.post("/test", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required" });

    const result = await SmsGatewayService.testConnection(tenantId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "SMS connection test failed" });
  }
});

// 4. Send SMS (sandbox / simulated) & /test-send alias
const handleSendSms = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      return res.status(400).json({ error: "Tenant and user context required" });
    }

    const recipientPhone = req.body.recipientPhone || req.body.recipient;
    const messageText = req.body.messageText || req.body.message;
    const senderId = req.body.senderId;
    const idempotencyKey = req.body.idempotencyKey;

    if (!recipientPhone || !messageText) {
      return res.status(400).json({ error: "Recipient phone and message text are required" });
    }

    const result = await SmsGatewayService.sendSms({
      tenantId,
      recipientPhone,
      messageText,
      senderId,
      idempotencyKey,
      actorId: userId,
    });

    res.json({
      success: true,
      result,
      messageId: (result as any).messageId || (result as any).externalId || `sms_${Date.now()}`,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to dispatch SMS" });
  }
};

smsGatewayRouter.post("/send", handleSendSms);
smsGatewayRouter.post("/test-send", handleSendSms);
