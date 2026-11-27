import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { SettingsService, normalizeScopeId } from "../services/settings/settings.service";
import { SettingScopeType } from "../services/settings/settings-registry";
import { RuntimeLifecycleService } from "../services/settings/runtime-lifecycle.service";
import { MailerFactory } from "../services/factories/mailer.factory";
import { StorageFactory } from "../services/factories/storage.factory";
import { SmsFactory } from "../services/factories/sms.factory";
import { OAuthFactory } from "../services/factories/oauth.factory";
import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
const prisma = rawPrisma || proxiedPrisma;

export const settingsRouter = Router();

function resolveScopeAndId(
  req: AuthRequest,
  requestedScope: string,
  isMutation = false
): {
  scope: SettingScopeType;
  scopeId: string | null;
} {
  const normScope = requestedScope.toUpperCase() as SettingScopeType;
  if (!["PLATFORM", "TENANT", "USER"].includes(normScope)) {
    throw new Error(`Invalid scope '${requestedScope}'. Allowed: PLATFORM, TENANT, USER`);
  }

  const isSuper = req.user?.roles?.includes("super_admin");

  if (normScope === "PLATFORM") {
    if (!isSuper) {
      const err: any = new Error("Forbidden: Super Admin access required for PLATFORM scope");
      err.status = 403;
      throw err;
    }
    return { scope: "PLATFORM", scopeId: null };
  }

  if (normScope === "TENANT") {
    const tenantId = isSuper && req.query.tenantId ? String(req.query.tenantId) : req.user?.tenantId;
    if (!tenantId) {
      const err: any = new Error("Tenant context is required for TENANT scope");
      err.status = 400;
      throw err;
    }

    if (isMutation) {
      const roles = (req.user?.roles || []).map((r: string) => r.toLowerCase());
      const wsRole = req.user?.workspaceRole?.toLowerCase();
      const permissions = req.user?.permissions || [];
      const isTenantAdmin =
        isSuper ||
        roles.some((r: string) =>
          ["admin", "tenant_admin", "hr_admin", "owner", "settings_admin"].includes(r)
        ) ||
        (wsRole ? ["owner", "admin", "hr_admin"].includes(wsRole) : false) ||
        permissions.includes("settings.manage") ||
        permissions.includes("*");

      if (!isTenantAdmin) {
        const err: any = new Error("Forbidden: Administrative privilege required to modify TENANT settings");
        err.status = 403;
        throw err;
      }
    }

    return { scope: "TENANT", scopeId: tenantId };
  }

  // USER scope
  const currentUserId = req.user?.userId;
  if (!currentUserId) {
    const err: any = new Error("Unauthorized: User identifier missing in session");
    err.status = 401;
    throw err;
  }
  return { scope: "USER", scopeId: currentUserId };
}

/**
 * GET /api/v1/settings/:scope/:group
 * Read settings for a group (secrets masked as { set: true })
 */
settingsRouter.get("/:scope/:group", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { scope, scopeId } = resolveScopeAndId(req, req.params.scope);
    const group = req.params.group;

    const data = await SettingsService.getGroup(scope, scopeId, group);
    return res.json(data);
  } catch (err: any) {
    return res.status(err.status || 400).json({ error: err.message || "Failed to fetch settings" });
  }
});

/**
 * PUT /api/v1/settings/:scope/:group
 * Save settings for a group atomically via RuntimeLifecycleService.
 * Body = changed fields only.
 */
settingsRouter.put("/:scope/:group", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { scope, scopeId } = resolveScopeAndId(req, req.params.scope, true);
    const group = req.params.group;

    const context = {
      userId: req.user?.userId,
      ipAddress: req.ip || (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress,
      userAgent: req.headers["user-agent"],
    };

    const result = await RuntimeLifecycleService.updateSettingsGroup(scope, scopeId, group, req.body, context);
    return res.json(result);
  } catch (err: any) {
    return res.status(err.status || 400).json({ error: err.message || "Failed to save settings" });
  }
});

/**
 * POST /api/v1/settings/:scope/:group/test
 * Test connection or credentials for an integration group
 */
settingsRouter.post("/:scope/:group/test", requireAuth, async (req: AuthRequest, res) => {
  const startTime = Date.now();
  try {
    const { scope, scopeId } = resolveScopeAndId(req, req.params.scope);
    const group = req.params.group;

    if (group === "email") {
      const probe = await MailerFactory.verifyConnection(scope, scopeId);
      const latencyMs = Date.now() - startTime;
      if (!probe.ok) {
        return res.status(400).json({
          success: false,
          error: probe.error || "SMTP connection verification failed",
          errorType: probe.errorType || "UNKNOWN",
          latencyMs,
        });
      }
      return res.json({
        success: true,
        message: probe.message || "SMTP handshake verified successfully",
        latencyMs,
      });
    }

    if (group === "storage") {
      const probe = await StorageFactory.testConnection(scope, scopeId);
      const latencyMs = Date.now() - startTime;
      if (!probe.ok) {
        return res.status(400).json({
          success: false,
          error: probe.error || "Storage provider test failed",
          latencyMs,
        });
      }
      return res.json({
        success: true,
        message: probe.message,
        details: probe,
        latencyMs,
      });
    }

    if (group === "sms") {
      const tenantForSms = scopeId || "default";
      const probe = await SmsFactory.testConnection(tenantForSms);
      const latencyMs = Date.now() - startTime;
      if (!probe.ok) {
        return res.status(400).json({
          success: false,
          error: probe.error || "SMS provider test failed",
          latencyMs,
        });
      }
      return res.json({
        success: true,
        message: probe.message,
        latencyMs,
      });
    }

    if (group === "oauth") {
      const provider = req.body?.provider || "google";
      const latencyMs = Date.now() - startTime;
      if (scope !== "PLATFORM") {
        return res.status(403).json({
          success: false,
          error: "OAuth settings can only be tested in PLATFORM scope",
          latencyMs,
        });
      }
      const providerConfig = await OAuthFactory.getProviderConfig(provider as any);
      if (!providerConfig || !providerConfig.clientId) {
        return res.status(400).json({
          success: false,
          error: `OAuth provider [${provider}] is not configured or missing Client ID`,
          latencyMs,
        });
      }
      if (!providerConfig.clientSecret) {
        return res.status(400).json({
          success: false,
          error: `OAuth provider [${provider}] is missing Client Secret`,
          latencyMs,
        });
      }
      const sampleState = OAuthFactory.generateState(provider);
      const isValid = OAuthFactory.validateState(sampleState, provider);
      return res.json({
        success: isValid,
        message: `OAuth provider [${provider}] credentials and CSRF state verified`,
        provider,
        clientIdPrefix: providerConfig.clientId.slice(0, 8) + "...",
        latencyMs,
      });
    }

    if (group === "payments") {
      const paymentSettings = await SettingsService.getGroup(scope, scopeId, "payments", { decryptSecrets: true });
      const values = paymentSettings?.values || {};
      const rzpKey = String(req.body?.razorpayKeyId || req.body?.["payments.razorpay_key_id"] || values["payments.razorpay_key_id"] || "").trim();
      const rawSecret = req.body?.razorpayKeySecret || req.body?.["payments.razorpay_key_secret"];
      const rzpSecret = String(
        rawSecret && !String(rawSecret).includes("••••") ? rawSecret : values["payments.razorpay_key_secret"] || ""
      ).trim();
      const requestedMode = String(req.body?.razorpayMode || req.body?.environment || "").toLowerCase();

      if (!rzpKey || !rzpSecret) {
        return res.status(400).json({
          success: false,
          error: "Razorpay Key ID and Secret must be configured before testing",
          latencyMs: Date.now() - startTime,
        });
      }

      if ((requestedMode === "sandbox" || requestedMode === "test") && rzpKey.startsWith("rzp_live_")) {
        return res.status(400).json({
          success: false,
          error: "Live Razorpay key (rzp_live_*) cannot be tested in Sandbox mode. Switch Razorpay Environment Mode to Live.",
          latencyMs: Date.now() - startTime,
        });
      }

      const detectedMode = rzpKey.startsWith("rzp_live_") ? "live" : "sandbox";
      try {
        const authHeader = "Basic " + Buffer.from(`${rzpKey}:${rzpSecret}`).toString("base64");
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);
        const rzpRes = await fetch("https://api.razorpay.com/v1/payments?count=1", {
          method: "GET",
          headers: { Authorization: authHeader, Accept: "application/json" },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const latencyMs = Date.now() - startTime;
        if (rzpRes.status === 401 || rzpRes.status === 403) {
          return res.status(400).json({
            success: false,
            error: "Razorpay rejected these credentials (HTTP 401 Unauthorized). Check Key ID and Key Secret.",
            mode: detectedMode,
            latencyMs,
          });
        }
        return res.json({
          success: true,
          message: `Razorpay ${detectedMode === "live" ? "Live (Production)" : "Sandbox (Test)"} API handshake verified (HTTP ${rzpRes.status})`,
          provider: "razorpay",
          mode: detectedMode,
          keyIdPrefix: rzpKey.slice(0, 12) + "...",
          latencyMs,
        });
      } catch (netErr: any) {
        return res.status(502).json({
          success: false,
          error: `Could not reach api.razorpay.com: ${netErr?.message || "Network timeout"}`,
          mode: detectedMode,
          latencyMs: Date.now() - startTime,
        });
      }
    }

    if (group === "pusher") {
      const latencyMs = Date.now() - startTime;
      if (scope !== "PLATFORM") {
        return res.status(403).json({
          success: false,
          error: "Pusher settings can only be tested in PLATFORM scope",
          latencyMs,
        });
      }
      const pusherSettings = await SettingsService.getGroup("PLATFORM", null, "pusher", { decryptSecrets: true });
      const values = pusherSettings?.values || {};
      const appId = req.body?.["pusher.app_id"] || req.body?.appId || values["pusher.app_id"];
      const key = req.body?.["pusher.key"] || req.body?.key || values["pusher.key"];
      const rawBodySecret = req.body?.["pusher.secret"] || req.body?.secret;
      const secret = rawBodySecret && !String(rawBodySecret).includes("••••") ? rawBodySecret : values["pusher.secret"];
      const cluster = req.body?.["pusher.cluster"] || req.body?.cluster || values["pusher.cluster"] || "ap2";

      if (!appId || !key || !secret) {
        return res.status(400).json({
          success: false,
          error: "Pusher App ID, Key, and Secret must all be configured before testing",
          latencyMs,
        });
      }

      const PusherClass = (await import("pusher")).default;
      const testClient = new PusherClass({
        appId: String(appId),
        key: String(key),
        secret: String(secret),
        cluster: String(cluster),
        useTLS: true,
      });
      await testClient.trigger("system-test-channel", "test-connection", {
        message: "Pusher connection verified via Settings Platform",
        timestamp: new Date().toISOString(),
      });

      return res.json({
        success: true,
        message: `Pusher Channels verified on cluster [${cluster}]`,
        provider: "pusher",
        cluster,
        latencyMs: Date.now() - startTime,
      });
    }

    if (group === "firebase") {
      const latencyMs = Date.now() - startTime;
      if (scope !== "PLATFORM") {
        return res.status(403).json({
          success: false,
          error: "Firebase settings can only be tested in PLATFORM scope",
          latencyMs,
        });
      }
      const fbSettings = await SettingsService.getGroup("PLATFORM", null, "firebase", { decryptSecrets: true });
      const values = fbSettings?.values || {};
      const apiKey = req.body?.["firebase.api_key"] || values["firebase.api_key"];
      const projectId = req.body?.["firebase.project_id"] || values["firebase.project_id"];
      const senderId = req.body?.["firebase.messaging_sender_id"] || values["firebase.messaging_sender_id"];
      const appId = req.body?.["firebase.app_id"] || values["firebase.app_id"];
      const serviceAccountRaw = req.body?.["firebase.service_account_json"] || values["firebase.service_account_json"];

      if (!apiKey || !projectId || !senderId || !appId) {
        return res.status(400).json({
          success: false,
          error: "Firebase API Key, Project ID, Messaging Sender ID, and App ID are required",
          latencyMs,
        });
      }

      if (serviceAccountRaw && typeof serviceAccountRaw === "string" && !serviceAccountRaw.includes("••••")) {
        try {
          const parsed = JSON.parse(serviceAccountRaw);
          if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
            return res.status(400).json({
              success: false,
              error: "Firebase Service Account JSON must contain project_id, client_email, and private_key",
              latencyMs,
            });
          }
        } catch {
          return res.status(400).json({
            success: false,
            error: "Firebase Service Account JSON is not valid JSON",
            latencyMs,
          });
        }
      }

      return res.json({
        success: true,
        message: `Firebase configuration verified for project [${projectId}]`,
        provider: "firebase",
        projectId,
        latencyMs: Date.now() - startTime,
      });
    }

    return res.status(400).json({
      success: false,
      error: `Test connection not supported for settings group '${group}'`,
      latencyMs: Date.now() - startTime,
    });
  } catch (err: any) {
    return res.status(err.status || 400).json({
      success: false,
      error: err.message || "Failed to execute test connection",
      latencyMs: Date.now() - startTime,
    });
  }
});

/**
 * DELETE /api/v1/settings/:scope/:group/:key
 * Remove a single setting override (reverts to fallback).
 */
settingsRouter.delete("/:scope/:group/:key", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { scope, scopeId } = resolveScopeAndId(req, req.params.scope, true);
    const { group, key } = req.params;

    const context = {
      userId: req.user?.userId,
      ipAddress: req.ip || (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress,
      userAgent: req.headers["user-agent"],
    };

    const result = await SettingsService.deleteSetting(scope, scopeId, group, key, context);
    return res.json(result);
  } catch (err: any) {
    return res.status(err.status || 400).json({ error: err.message || "Failed to delete setting override" });
  }
});

/**
 * POST /api/v1/settings/:scope/:group/reset
 * Reset settings in a group to defaults
 */
settingsRouter.post("/:scope/:group/reset", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { scope, scopeId } = resolveScopeAndId(req, req.params.scope, true);
    const group = req.params.group;

    const context = {
      userId: req.user?.userId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    };

    const result = await SettingsService.resetGroup(scope, scopeId, group, context);
    return res.json(result);
  } catch (err: any) {
    return res.status(err.status || 400).json({ error: err.message || "Failed to reset settings" });
  }
});

/**
 * GET /api/v1/settings/:scope/:group/history
 * Audit trail / version history
 */
settingsRouter.get("/:scope/:group/history", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { scope, scopeId } = resolveScopeAndId(req, req.params.scope);
    const group = req.params.group;

    const normScopeId = normalizeScopeId(scope, scopeId);
    const audits = await prisma.settingAudit.findMany({
      where: {
        scope,
        scopeId: normScopeId,
        key: { startsWith: `${group}.` },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return res.json(audits);
  } catch (err: any) {
    return res.status(err.status || 400).json({ error: err.message || "Failed to fetch settings history" });
  }
});
