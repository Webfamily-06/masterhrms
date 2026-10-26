"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.integrationRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const tenant_1 = require("../lib/tenant");
const entitlements_1 = require("../middleware/entitlements");
const integration_hub_service_1 = require("../services/integration-hub.service");
exports.integrationRouter = (0, express_1.Router)();
// Middleware: all endpoints require authenticated tenant context
exports.integrationRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
/**
 * GET /api/integrations/status
 * Get status of all connectors for the current tenant
 */
exports.integrationRouter.get("/status", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const connectors = Object.keys(integration_hub_service_1.SUPPORTED_CONNECTORS);
        const statuses = await Promise.all(connectors.map((c) => integration_hub_service_1.IntegrationHubService.getConnectorConfig(tenantId, c)));
        const detailed = await integration_hub_service_1.IntegrationHubService.getConnectorsStatus(tenantId);
        return res.json({
            success: true,
            connectors: statuses,
            detailedStatuses: detailed,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch integrations status" });
    }
});
/**
 * GET /api/integrations/:connector/config
 * Get configuration and connection state for a specific connector
 */
exports.integrationRouter.get("/:connector/config", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const connector = req.params.connector;
        if (!integration_hub_service_1.SUPPORTED_CONNECTORS[connector]) {
            return res.status(404).json({ error: `Unsupported connector: ${connector}` });
        }
        const meta = integration_hub_service_1.SUPPORTED_CONNECTORS[connector];
        const isSuper = req.user?.roles?.includes("super_admin") || false;
        const check = await (0, entitlements_1.checkTenantEntitlement)(tenantId, meta.entitlementKey, isSuper);
        if (!check.entitled) {
            return res.status(403).json({
                error: `Add-on '${meta.entitlementKey}' is not active on this workspace`,
                code: "ADDON_REQUIRED",
                key: meta.entitlementKey,
            });
        }
        const config = await integration_hub_service_1.IntegrationHubService.getConnectorConfig(tenantId, connector);
        return res.json({ success: true, ...config });
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to fetch connector config" });
    }
});
/**
 * POST /api/integrations/:connector/config
 * Save configuration for a specific connector with AES-256-GCM encryption
 */
exports.integrationRouter.post("/:connector/config", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const connector = req.params.connector;
        if (!integration_hub_service_1.SUPPORTED_CONNECTORS[connector]) {
            return res.status(404).json({ error: `Unsupported connector: ${connector}` });
        }
        const meta = integration_hub_service_1.SUPPORTED_CONNECTORS[connector];
        const isSuper = req.user?.roles?.includes("super_admin") || false;
        const check = await (0, entitlements_1.checkTenantEntitlement)(tenantId, meta.entitlementKey, isSuper);
        if (!check.entitled) {
            return res.status(403).json({
                error: `Add-on '${meta.entitlementKey}' is not active on this workspace`,
                code: "ADDON_REQUIRED",
                key: meta.entitlementKey,
            });
        }
        const result = await integration_hub_service_1.IntegrationHubService.saveConnectorConfig(tenantId, connector, req.body, req.user?.userId);
        return res.json({ success: true, ...result });
    }
    catch (err) {
        return res.status(err.status || 400).json({ error: err.message || "Failed to save connector config" });
    }
});
/**
 * POST /api/integrations/:connector/test
 * Test connection handshake safely in sandbox mode
 */
exports.integrationRouter.post("/:connector/test", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const connector = req.params.connector;
        if (!integration_hub_service_1.SUPPORTED_CONNECTORS[connector]) {
            return res.status(404).json({ error: `Unsupported connector: ${connector}` });
        }
        const meta = integration_hub_service_1.SUPPORTED_CONNECTORS[connector];
        const isSuper = req.user?.roles?.includes("super_admin") || false;
        const check = await (0, entitlements_1.checkTenantEntitlement)(tenantId, meta.entitlementKey, isSuper);
        if (!check.entitled) {
            return res.status(403).json({
                error: `Add-on '${meta.entitlementKey}' is not active on this workspace`,
                code: "ADDON_REQUIRED",
                key: meta.entitlementKey,
            });
        }
        const customCreds = Object.keys(req.body).length > 0 ? req.body : undefined;
        const result = await integration_hub_service_1.IntegrationHubService.testConnection(tenantId, connector, customCreds, req.user?.userId);
        return res.json({ success: result.ok, ...result });
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to test connection" });
    }
});
/**
 * POST /api/integrations/:connector/disconnect
 * Disconnect connector and revoke credentials
 */
exports.integrationRouter.post("/:connector/disconnect", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const connector = req.params.connector;
        if (!integration_hub_service_1.SUPPORTED_CONNECTORS[connector]) {
            return res.status(404).json({ error: `Unsupported connector: ${connector}` });
        }
        const meta = integration_hub_service_1.SUPPORTED_CONNECTORS[connector];
        const isSuper = req.user?.roles?.includes("super_admin") || false;
        const check = await (0, entitlements_1.checkTenantEntitlement)(tenantId, meta.entitlementKey, isSuper);
        if (!check.entitled) {
            return res.status(403).json({
                error: `Add-on '${meta.entitlementKey}' is not active on this workspace`,
                code: "ADDON_REQUIRED",
                key: meta.entitlementKey,
            });
        }
        const result = await integration_hub_service_1.IntegrationHubService.disconnectConnector(tenantId, connector, req.user?.userId);
        return res.json({ success: true, ...result });
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to disconnect connector" });
    }
});
/**
 * POST /api/integrations/:connector/sync
 * Initiate a bounded, idempotent sync job
 */
exports.integrationRouter.post("/:connector/sync", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const connector = req.params.connector;
        if (!integration_hub_service_1.SUPPORTED_CONNECTORS[connector]) {
            return res.status(404).json({ error: `Unsupported connector: ${connector}` });
        }
        const meta = integration_hub_service_1.SUPPORTED_CONNECTORS[connector];
        const isSuper = req.user?.roles?.includes("super_admin") || false;
        const check = await (0, entitlements_1.checkTenantEntitlement)(tenantId, meta.entitlementKey, isSuper);
        if (!check.entitled) {
            return res.status(403).json({
                error: `Add-on '${meta.entitlementKey}' is not active on this workspace`,
                code: "ADDON_REQUIRED",
                key: meta.entitlementKey,
            });
        }
        const idempotencyKey = req.headers["x-idempotency-key"] || req.body?.idempotencyKey;
        const job = await integration_hub_service_1.IntegrationHubService.initiateSyncJob(tenantId, connector, idempotencyKey);
        return res.json({ success: true, job });
    }
    catch (err) {
        return res.status(err.status || 400).json({ error: err.message || "Failed to initiate sync job" });
    }
});
/**
 * GET /api/integrations/:connector/jobs
 * Get sync jobs history
 */
exports.integrationRouter.get("/:connector/jobs", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const connector = req.params.connector;
        const jobs = integration_hub_service_1.IntegrationHubService.getTenantSyncJobs(tenantId, connector);
        return res.json({ success: true, jobs });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch sync jobs" });
    }
});
/**
 * POST /api/integrations/:connector/webhook
 * Inbound webhook receiver with cryptographic signature & replay verification
 */
exports.integrationRouter.post("/:connector/webhook", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const connector = req.params.connector;
        const signature = (req.headers["x-webhook-signature"] || req.headers["x-hub-signature-256"]);
        const timestamp = req.headers["x-webhook-timestamp"];
        const nonce = req.headers["x-webhook-nonce"];
        const config = await integration_hub_service_1.IntegrationHubService.getConnectorConfig(tenantId, connector);
        if (config.status !== "connected") {
            return res.status(400).json({ error: "Connector is not actively connected" });
        }
        const secret = config.config?.secretKey || config.config?.consumerSecret;
        if (!secret) {
            return res.status(400).json({ error: "Connector secret configuration missing" });
        }
        const rawPayload = JSON.stringify(req.body);
        const verification = integration_hub_service_1.IntegrationHubService.verifyWebhookSignature({
            rawPayload,
            signature,
            secret,
            timestamp,
            nonce,
        });
        if (!verification.valid) {
            return res.status(401).json({ error: verification.error || "Invalid webhook signature" });
        }
        return res.json({ success: true, message: "Webhook accepted and verified." });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to process webhook" });
    }
});
