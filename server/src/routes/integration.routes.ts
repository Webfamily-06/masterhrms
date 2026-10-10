import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { resolveTenantId } from "../lib/tenant";
import { checkTenantEntitlement } from "../middleware/entitlements";
import {
  IntegrationHubService,
  SUPPORTED_CONNECTORS,
  ConnectorType,
} from "../services/integration-hub.service";

export const integrationRouter = Router();

// Middleware: all endpoints require authenticated tenant context
integrationRouter.use(requireAuth, resolveTenantContext);

/**
 * GET /api/integrations/status
 * Get status of all connectors for the current tenant
 */
integrationRouter.get("/status", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const connectors = Object.keys(SUPPORTED_CONNECTORS) as ConnectorType[];
    const statuses = await Promise.all(
      connectors.map((c) => IntegrationHubService.getConnectorConfig(tenantId, c))
    );
    const detailed = await IntegrationHubService.getConnectorsStatus(tenantId);

    return res.json({
      success: true,
      connectors: statuses,
      detailedStatuses: detailed,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch integrations status" });
  }
});

/**
 * GET /api/integrations/:connector/config
 * Get configuration and connection state for a specific connector
 */
integrationRouter.get("/:connector/config", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const connector = req.params.connector as ConnectorType;
    if (!SUPPORTED_CONNECTORS[connector]) {
      return res.status(404).json({ error: `Unsupported connector: ${connector}` });
    }

    const meta = SUPPORTED_CONNECTORS[connector];
    const isSuper = req.user?.roles?.includes("super_admin") || false;
    const check = await checkTenantEntitlement(tenantId, meta.entitlementKey, isSuper);
    if (!check.entitled) {
      return res.status(403).json({
        error: `Add-on '${meta.entitlementKey}' is not active on this workspace`,
        code: "ADDON_REQUIRED",
        key: meta.entitlementKey,
      });
    }

    const config = await IntegrationHubService.getConnectorConfig(tenantId, connector);
    return res.json({ success: true, ...config });
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || "Failed to fetch connector config" });
  }
});

/**
 * POST /api/integrations/:connector/config
 * Save configuration for a specific connector with AES-256-GCM encryption
 */
integrationRouter.post("/:connector/config", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const connector = req.params.connector as ConnectorType;
    if (!SUPPORTED_CONNECTORS[connector]) {
      return res.status(404).json({ error: `Unsupported connector: ${connector}` });
    }

    const meta = SUPPORTED_CONNECTORS[connector];
    const isSuper = req.user?.roles?.includes("super_admin") || false;
    const check = await checkTenantEntitlement(tenantId, meta.entitlementKey, isSuper);
    if (!check.entitled) {
      return res.status(403).json({
        error: `Add-on '${meta.entitlementKey}' is not active on this workspace`,
        code: "ADDON_REQUIRED",
        key: meta.entitlementKey,
      });
    }

    const result = await IntegrationHubService.saveConnectorConfig(
      tenantId,
      connector,
      req.body,
      req.user?.id
    );

    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(err.status || 400).json({ error: err.message || "Failed to save connector config" });
  }
});

/**
 * POST /api/integrations/:connector/test
 * Test connection handshake safely in sandbox mode
 */
integrationRouter.post("/:connector/test", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const connector = req.params.connector as ConnectorType;
    if (!SUPPORTED_CONNECTORS[connector]) {
      return res.status(404).json({ error: `Unsupported connector: ${connector}` });
    }

    const meta = SUPPORTED_CONNECTORS[connector];
    const isSuper = req.user?.roles?.includes("super_admin") || false;
    const check = await checkTenantEntitlement(tenantId, meta.entitlementKey, isSuper);
    if (!check.entitled) {
      return res.status(403).json({
        error: `Add-on '${meta.entitlementKey}' is not active on this workspace`,
        code: "ADDON_REQUIRED",
        key: meta.entitlementKey,
      });
    }

    const customCreds = Object.keys(req.body).length > 0 ? req.body : undefined;
    const result = await IntegrationHubService.testConnection(
      tenantId,
      connector,
      customCreds,
      req.user?.id
    );

    return res.json({ success: result.ok, ...result });
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || "Failed to test connection" });
  }
});

/**
 * POST /api/integrations/:connector/disconnect
 * Disconnect connector and revoke credentials
 */
integrationRouter.post("/:connector/disconnect", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const connector = req.params.connector as ConnectorType;
    if (!SUPPORTED_CONNECTORS[connector]) {
      return res.status(404).json({ error: `Unsupported connector: ${connector}` });
    }

    const meta = SUPPORTED_CONNECTORS[connector];
    const isSuper = req.user?.roles?.includes("super_admin") || false;
    const check = await checkTenantEntitlement(tenantId, meta.entitlementKey, isSuper);
    if (!check.entitled) {
      return res.status(403).json({
        error: `Add-on '${meta.entitlementKey}' is not active on this workspace`,
        code: "ADDON_REQUIRED",
        key: meta.entitlementKey,
      });
    }

    const result = await IntegrationHubService.disconnectConnector(
      tenantId,
      connector,
      req.user?.id
    );

    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || "Failed to disconnect connector" });
  }
});

/**
 * POST /api/integrations/:connector/sync
 * Initiate a bounded, idempotent sync job
 */
integrationRouter.post("/:connector/sync", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const connector = req.params.connector as ConnectorType;
    if (!SUPPORTED_CONNECTORS[connector]) {
      return res.status(404).json({ error: `Unsupported connector: ${connector}` });
    }

    const meta = SUPPORTED_CONNECTORS[connector];
    const isSuper = req.user?.roles?.includes("super_admin") || false;
    const check = await checkTenantEntitlement(tenantId, meta.entitlementKey, isSuper);
    if (!check.entitled) {
      return res.status(403).json({
        error: `Add-on '${meta.entitlementKey}' is not active on this workspace`,
        code: "ADDON_REQUIRED",
        key: meta.entitlementKey,
      });
    }

    const idempotencyKey = (req.headers["x-idempotency-key"] as string) || req.body?.idempotencyKey;
    const job = await IntegrationHubService.initiateSyncJob(tenantId, connector, idempotencyKey);

    return res.json({ success: true, job });
  } catch (err: any) {
    return res.status(err.status || 400).json({ error: err.message || "Failed to initiate sync job" });
  }
});

/**
 * GET /api/integrations/:connector/jobs
 * Get sync jobs history
 */
integrationRouter.get("/:connector/jobs", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const connector = req.params.connector as ConnectorType;
    const jobs = IntegrationHubService.getTenantSyncJobs(tenantId, connector);

    return res.json({ success: true, jobs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch sync jobs" });
  }
});

/**
 * POST /api/integrations/:connector/webhook
 * Inbound webhook receiver with cryptographic signature & replay verification
 */
integrationRouter.post("/:connector/webhook", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const connector = req.params.connector as ConnectorType;
    const signature = (req.headers["x-webhook-signature"] || req.headers["x-hub-signature-256"]) as string;
    const timestamp = req.headers["x-webhook-timestamp"] as string;
    const nonce = req.headers["x-webhook-nonce"] as string;

    const config = await IntegrationHubService.getConnectorConfig(tenantId, connector);

    if (config.status !== "connected") {
      return res.status(400).json({ error: "Connector is not actively connected" });
    }

    const secret = (config.config as any)?.secretKey || (config.config as any)?.consumerSecret || "mock-secret";
    const rawPayload = JSON.stringify(req.body);

    const verification = IntegrationHubService.verifyWebhookSignature({
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to process webhook" });
  }
});
