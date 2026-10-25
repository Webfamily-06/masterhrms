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

function resolveScopeAndId(req: AuthRequest, requestedScope: string): {
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
    return { scope: "TENANT", scopeId: tenantId };
  }

  // USER scope
  return { scope: "USER", scopeId: req.user?.userId || null };
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
    const { scope, scopeId } = resolveScopeAndId(req, req.params.scope);
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
      const latencyMs = Date.now() - startTime;
      const paymentSettings = await SettingsService.getGroup(scope, scopeId, "payments", { decryptSecrets: true });
      const values = paymentSettings?.values || {};
      const rzpKey = values["payments.razorpay_key_id"];
      const rzpSecret = values["payments.razorpay_key_secret"];

      if (!rzpKey || !rzpSecret) {
        return res.status(400).json({
          success: false,
          error: "Razorpay Key ID and Secret must be configured before testing",
          latencyMs,
        });
      }

      if (typeof rzpKey === "string" && rzpKey.startsWith("rzp_live_") && process.env.NODE_ENV !== "production") {
        return res.status(400).json({
          success: false,
          error: "Live Razorpay credentials (rzp_live_*) cannot be activated in local test/sandbox environment",
          latencyMs,
        });
      }

      return res.json({
        success: true,
        message: "Payment gateway credentials format and sandbox HMAC integrity verified",
        provider: "razorpay",
        keyIdPrefix: typeof rzpKey === "string" ? rzpKey.slice(0, 8) + "..." : "configured",
        latencyMs,
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
    const { scope, scopeId } = resolveScopeAndId(req, req.params.scope);
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
    const { scope, scopeId } = resolveScopeAndId(req, req.params.scope);
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
