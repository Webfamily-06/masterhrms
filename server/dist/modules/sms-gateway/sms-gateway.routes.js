"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smsGatewayRouter = void 0;
const express_1 = require("express");
const sms_gateway_service_1 = require("./sms-gateway.service");
const auth_1 = require("../../middleware/auth");
exports.smsGatewayRouter = (0, express_1.Router)();
exports.smsGatewayRouter.use(auth_1.requireAuth);
// 1. Get SMS configuration (credentials masked)
exports.smsGatewayRouter.get("/config", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required" });
        const config = await sms_gateway_service_1.SmsGatewayService.getConfig(tenantId);
        res.json({ config });
    }
    catch (err) {
        res.status(500).json({ error: err.message || "Failed to fetch SMS configuration" });
    }
});
// 2. Update SMS configuration
exports.smsGatewayRouter.put("/config", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
            return res.status(400).json({ error: "Tenant and user context required" });
        }
        const { provider, enabled, sandboxMode, senderId, apiKey, apiSecret, authKey, templateId, route, dltEntityId } = req.body;
        const effectiveApiKey = apiKey !== undefined ? apiKey : authKey;
        const updated = await sms_gateway_service_1.SmsGatewayService.updateConfig(tenantId, userId, {
            provider,
            enabled,
            sandboxMode,
            senderId,
            apiKey: effectiveApiKey,
            apiSecret,
            ...(templateId !== undefined ? { templateId } : {}),
            ...(route !== undefined ? { route } : {}),
            ...(dltEntityId !== undefined ? { dltEntityId } : {}),
        });
        res.json({ success: true, config: updated });
    }
    catch (err) {
        res.status(400).json({ error: err.message || "Failed to update SMS configuration" });
    }
});
// 3. Test SMS provider connection
exports.smsGatewayRouter.post("/test", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required" });
        const result = await sms_gateway_service_1.SmsGatewayService.testConnection(tenantId);
        res.json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message || "SMS connection test failed" });
    }
});
// 4. Send SMS (sandbox / simulated) & /test-send alias
const handleSendSms = async (req, res) => {
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
        const result = await sms_gateway_service_1.SmsGatewayService.sendSms({
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
            messageId: result.messageId || result.externalId || `sms_${Date.now()}`,
        });
    }
    catch (err) {
        res.status(400).json({ error: err.message || "Failed to dispatch SMS" });
    }
};
exports.smsGatewayRouter.post("/send", handleSendSms);
exports.smsGatewayRouter.post("/test-send", handleSendSms);
