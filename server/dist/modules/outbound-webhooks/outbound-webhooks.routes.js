"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.outboundWebhooksRouter = void 0;
const express_1 = require("express");
const outbound_webhooks_service_1 = require("./outbound-webhooks.service");
const webhook_retry_worker_1 = require("./webhook-retry.worker");
const auth_1 = require("../../middleware/auth");
const entitlements_1 = require("../../middleware/entitlements");
const tenant_1 = require("../../lib/tenant");
exports.outboundWebhooksRouter = (0, express_1.Router)();
// Public signature verification
exports.outboundWebhooksRouter.post("/verify-signature", (req, res) => {
    const { payload, signature, secret, toleranceSeconds } = req.body;
    if (!payload || !signature || !secret) {
        return res.status(400).json({ error: "payload, signature, and secret are required" });
    }
    const valid = outbound_webhooks_service_1.OutboundWebhooksService.verifySignature(payload, signature, secret, toleranceSeconds);
    res.json({ valid });
});
// Authenticated management endpoints guarded by auth & add-on entitlement
exports.outboundWebhooksRouter.use(auth_1.requireAuth);
exports.outboundWebhooksRouter.use((0, entitlements_1.requireAddon)("webhook"));
// 1. List Endpoints
exports.outboundWebhooksRouter.get("/endpoints", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { module, event, status, search } = req.query;
        const endpoints = await outbound_webhooks_service_1.OutboundWebhooksService.listEndpoints(tenantId, {
            module: module ? String(module) : undefined,
            event: event ? String(event) : undefined,
            status: status ? String(status) : undefined,
            search: search ? String(search) : undefined,
        });
        res.json({ success: true, endpoints });
    }
    catch (err) {
        res.status(500).json({ error: err.message || "Failed to list webhook endpoints" });
    }
});
// 2. Create Endpoint
exports.outboundWebhooksRouter.post("/endpoints", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const userId = req.user?.userId || "user";
        const { name, module, eventKey, events, method, url, headersJson, timeoutMs, maxRetries, allowLocalhostForTest } = req.body;
        if (!url) {
            return res.status(400).json({ error: "Destination URL is required" });
        }
        const result = await outbound_webhooks_service_1.OutboundWebhooksService.createEndpoint(tenantId, userId, {
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
    }
    catch (err) {
        res.status(400).json({ error: err.message || "Failed to create webhook endpoint" });
    }
});
// 3. Get Endpoint Detail
exports.outboundWebhooksRouter.get("/endpoints/:id", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const result = await outbound_webhooks_service_1.OutboundWebhooksService.getEndpointDetail(tenantId, req.params.id);
        res.json({ success: true, ...result });
    }
    catch (err) {
        res.status(404).json({ error: err.message || "Webhook endpoint not found" });
    }
});
// 4. Update Endpoint
exports.outboundWebhooksRouter.put("/endpoints/:id", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const userId = req.user?.userId || "user";
        const updated = await outbound_webhooks_service_1.OutboundWebhooksService.updateEndpoint(tenantId, req.params.id, userId, req.body);
        res.json({ success: true, endpoint: updated });
    }
    catch (err) {
        res.status(400).json({ error: err.message || "Failed to update webhook endpoint" });
    }
});
// 5. Toggle Endpoint Active/Disabled
exports.outboundWebhooksRouter.patch("/endpoints/:id/toggle", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const userId = req.user?.userId || "user";
        const updated = await outbound_webhooks_service_1.OutboundWebhooksService.toggleEndpoint(tenantId, req.params.id, userId);
        res.json({ success: true, endpoint: updated });
    }
    catch (err) {
        res.status(400).json({ error: err.message || "Failed to toggle endpoint status" });
    }
});
// 6. Rotate Secret
exports.outboundWebhooksRouter.post("/endpoints/:id/rotate-secret", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const userId = req.user?.userId || "user";
        const result = await outbound_webhooks_service_1.OutboundWebhooksService.rotateSecret(tenantId, req.params.id, userId);
        res.json({ success: true, ...result });
    }
    catch (err) {
        res.status(400).json({ error: err.message || "Failed to rotate secret" });
    }
});
// 7. Delete Endpoint
exports.outboundWebhooksRouter.delete("/endpoints/:id", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const userId = req.user?.userId || "user";
        await outbound_webhooks_service_1.OutboundWebhooksService.deleteEndpoint(tenantId, req.params.id, userId);
        res.json({ success: true, message: "Webhook endpoint deleted successfully" });
    }
    catch (err) {
        res.status(400).json({ error: err.message || "Failed to delete webhook endpoint" });
    }
});
// 8. Test Endpoint
exports.outboundWebhooksRouter.post("/endpoints/:id/test", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const userId = req.user?.userId || "user";
        const { allowLocalhostForTest } = req.body;
        const deliveryLog = await outbound_webhooks_service_1.OutboundWebhooksService.testEndpoint(tenantId, req.params.id, userId, allowLocalhostForTest);
        res.json({ success: true, delivery: deliveryLog });
    }
    catch (err) {
        res.status(400).json({ error: err.message || "Failed to test webhook endpoint" });
    }
});
// 9. Event Catalog (dynamically resolved from installed & entitled module manifests)
exports.outboundWebhooksRouter.get("/events", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        const events = await outbound_webhooks_service_1.OutboundWebhooksService.getEventCatalog(tenantId);
        res.json({ success: true, events });
    }
    catch (err) {
        res.json({ success: true, events: outbound_webhooks_service_1.EVENT_CATALOG });
    }
});
// 10. List Delivery Logs
exports.outboundWebhooksRouter.get("/logs", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { endpointId, eventKey, status, limit } = req.query;
        const logs = await outbound_webhooks_service_1.OutboundWebhooksService.listDeliveryLogs(tenantId, Number(limit) || 100, {
            endpointId: endpointId ? String(endpointId) : undefined,
            eventKey: eventKey ? String(eventKey) : undefined,
            status: status ? String(status) : undefined,
        });
        res.json({ success: true, logs });
    }
    catch (err) {
        res.status(500).json({ error: err.message || "Failed to fetch delivery logs" });
    }
});
// 11. Get Delivery Log Detail
exports.outboundWebhooksRouter.get("/logs/:id", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const log = await outbound_webhooks_service_1.OutboundWebhooksService.getLogDetail(tenantId, req.params.id);
        if (!log)
            return res.status(404).json({ error: "Delivery log not found" });
        res.json({ success: true, log });
    }
    catch (err) {
        res.status(500).json({ error: err.message || "Failed to fetch delivery log" });
    }
});
// 12. Retry Delivery
exports.outboundWebhooksRouter.post("/logs/:id/retry", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const userId = req.user?.userId || "user";
        const log = await outbound_webhooks_service_1.OutboundWebhooksService.retryDelivery(tenantId, req.params.id, userId);
        res.json({ success: true, delivery: log });
    }
    catch (err) {
        res.status(400).json({ error: err.message || "Failed to retry delivery" });
    }
});
// 13. Settings
exports.outboundWebhooksRouter.get("/settings", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const settings = await outbound_webhooks_service_1.OutboundWebhooksService.getSettings(tenantId);
        res.json({ success: true, settings });
    }
    catch (err) {
        res.status(500).json({ error: err.message || "Failed to fetch webhook settings" });
    }
});
exports.outboundWebhooksRouter.put("/settings", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const userId = req.user?.userId || "user";
        const settings = await outbound_webhooks_service_1.OutboundWebhooksService.updateSettings(tenantId, req.body, userId);
        res.json({ success: true, settings });
    }
    catch (err) {
        res.status(400).json({ error: err.message || "Failed to update webhook settings" });
    }
});
// 14. Backward compatibility dispatch endpoint
exports.outboundWebhooksRouter.post("/test-dispatch", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { event, payload, allowLocalhostForTest } = req.body;
        const logs = await outbound_webhooks_service_1.OutboundWebhooksService.dispatchEvent(tenantId, event || "test.ping", payload || { message: "Test webhook dispatch" }, { allowLocalhostForTest });
        res.json({ success: true, deliveries: logs });
    }
    catch (err) {
        res.status(400).json({ error: err.message || "Failed to dispatch test webhook" });
    }
});
// 15. Retry Worker Status
exports.outboundWebhooksRouter.get("/retry-worker/status", async (_req, res) => {
    try {
        const stats = webhook_retry_worker_1.WebhookRetryWorker.getStats();
        res.json({ success: true, stats });
    }
    catch (err) {
        res.status(500).json({ error: err.message || "Failed to fetch retry worker status" });
    }
});
// 16. Manual Retry Sweep Trigger
exports.outboundWebhooksRouter.post("/retry-worker/sweep", async (req, res) => {
    try {
        const { batchSize, allowLocalhostForTest } = req.body || {};
        const result = await webhook_retry_worker_1.WebhookRetryWorker.processPendingRetries(undefined, batchSize ? Number(batchSize) : 25, { allowLocalhostForTest: Boolean(allowLocalhostForTest) });
        res.json({ success: true, result });
    }
    catch (err) {
        res.status(500).json({ error: err.message || "Failed to execute retry sweep" });
    }
});
