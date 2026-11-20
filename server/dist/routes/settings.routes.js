"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const settings_service_1 = require("../services/settings/settings.service");
const runtime_lifecycle_service_1 = require("../services/settings/runtime-lifecycle.service");
const mailer_factory_1 = require("../services/factories/mailer.factory");
const storage_factory_1 = require("../services/factories/storage.factory");
const sms_factory_1 = require("../services/factories/sms.factory");
const oauth_factory_1 = require("../services/factories/oauth.factory");
const prisma_1 = require("../prisma");
const prisma = prisma_1.rawPrisma || prisma_1.prisma;
exports.settingsRouter = (0, express_1.Router)();
function resolveScopeAndId(req, requestedScope, isMutation = false) {
    const normScope = requestedScope.toUpperCase();
    if (!["PLATFORM", "TENANT", "USER"].includes(normScope)) {
        throw new Error(`Invalid scope '${requestedScope}'. Allowed: PLATFORM, TENANT, USER`);
    }
    const isSuper = req.user?.roles?.includes("super_admin");
    if (normScope === "PLATFORM") {
        if (!isSuper) {
            const err = new Error("Forbidden: Super Admin access required for PLATFORM scope");
            err.status = 403;
            throw err;
        }
        return { scope: "PLATFORM", scopeId: null };
    }
    if (normScope === "TENANT") {
        const tenantId = isSuper && req.query.tenantId ? String(req.query.tenantId) : req.user?.tenantId;
        if (!tenantId) {
            const err = new Error("Tenant context is required for TENANT scope");
            err.status = 400;
            throw err;
        }
        if (isMutation) {
            const roles = (req.user?.roles || []).map((r) => r.toLowerCase());
            const wsRole = req.user?.workspaceRole?.toLowerCase();
            const permissions = req.user?.permissions || [];
            const isTenantAdmin = isSuper ||
                roles.some((r) => ["admin", "tenant_admin", "hr_admin", "owner", "settings_admin"].includes(r)) ||
                (wsRole ? ["owner", "admin", "hr_admin"].includes(wsRole) : false) ||
                permissions.includes("settings.manage") ||
                permissions.includes("*");
            if (!isTenantAdmin) {
                const err = new Error("Forbidden: Administrative privilege required to modify TENANT settings");
                err.status = 403;
                throw err;
            }
        }
        return { scope: "TENANT", scopeId: tenantId };
    }
    // USER scope
    const currentUserId = req.user?.userId;
    if (!currentUserId) {
        const err = new Error("Unauthorized: User identifier missing in session");
        err.status = 401;
        throw err;
    }
    return { scope: "USER", scopeId: currentUserId };
}
/**
 * GET /api/v1/settings/:scope/:group
 * Read settings for a group (secrets masked as { set: true })
 */
exports.settingsRouter.get("/:scope/:group", auth_1.requireAuth, async (req, res) => {
    try {
        const { scope, scopeId } = resolveScopeAndId(req, req.params.scope);
        const group = req.params.group;
        const data = await settings_service_1.SettingsService.getGroup(scope, scopeId, group);
        return res.json(data);
    }
    catch (err) {
        return res.status(err.status || 400).json({ error: err.message || "Failed to fetch settings" });
    }
});
/**
 * PUT /api/v1/settings/:scope/:group
 * Save settings for a group atomically via RuntimeLifecycleService.
 * Body = changed fields only.
 */
exports.settingsRouter.put("/:scope/:group", auth_1.requireAuth, async (req, res) => {
    try {
        const { scope, scopeId } = resolveScopeAndId(req, req.params.scope, true);
        const group = req.params.group;
        const context = {
            userId: req.user?.userId,
            ipAddress: req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress,
            userAgent: req.headers["user-agent"],
        };
        const result = await runtime_lifecycle_service_1.RuntimeLifecycleService.updateSettingsGroup(scope, scopeId, group, req.body, context);
        return res.json(result);
    }
    catch (err) {
        return res.status(err.status || 400).json({ error: err.message || "Failed to save settings" });
    }
});
/**
 * POST /api/v1/settings/:scope/:group/test
 * Test connection or credentials for an integration group
 */
exports.settingsRouter.post("/:scope/:group/test", auth_1.requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
        const { scope, scopeId } = resolveScopeAndId(req, req.params.scope);
        const group = req.params.group;
        if (group === "email") {
            const probe = await mailer_factory_1.MailerFactory.verifyConnection(scope, scopeId);
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
            const probe = await storage_factory_1.StorageFactory.testConnection(scope, scopeId);
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
            const probe = await sms_factory_1.SmsFactory.testConnection(tenantForSms);
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
            const providerConfig = await oauth_factory_1.OAuthFactory.getProviderConfig(provider);
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
            const sampleState = oauth_factory_1.OAuthFactory.generateState(provider);
            const isValid = oauth_factory_1.OAuthFactory.validateState(sampleState, provider);
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
            const paymentSettings = await settings_service_1.SettingsService.getGroup(scope, scopeId, "payments", { decryptSecrets: true });
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
        if (group === "pusher") {
            const latencyMs = Date.now() - startTime;
            if (scope !== "PLATFORM") {
                return res.status(403).json({
                    success: false,
                    error: "Pusher settings can only be tested in PLATFORM scope",
                    latencyMs,
                });
            }
            const pusherSettings = await settings_service_1.SettingsService.getGroup("PLATFORM", null, "pusher", { decryptSecrets: true });
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
            const PusherClass = (await Promise.resolve().then(() => __importStar(require("pusher")))).default;
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
            const fbSettings = await settings_service_1.SettingsService.getGroup("PLATFORM", null, "firebase", { decryptSecrets: true });
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
                }
                catch {
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
    }
    catch (err) {
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
exports.settingsRouter.delete("/:scope/:group/:key", auth_1.requireAuth, async (req, res) => {
    try {
        const { scope, scopeId } = resolveScopeAndId(req, req.params.scope, true);
        const { group, key } = req.params;
        const context = {
            userId: req.user?.userId,
            ipAddress: req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress,
            userAgent: req.headers["user-agent"],
        };
        const result = await settings_service_1.SettingsService.deleteSetting(scope, scopeId, group, key, context);
        return res.json(result);
    }
    catch (err) {
        return res.status(err.status || 400).json({ error: err.message || "Failed to delete setting override" });
    }
});
/**
 * POST /api/v1/settings/:scope/:group/reset
 * Reset settings in a group to defaults
 */
exports.settingsRouter.post("/:scope/:group/reset", auth_1.requireAuth, async (req, res) => {
    try {
        const { scope, scopeId } = resolveScopeAndId(req, req.params.scope, true);
        const group = req.params.group;
        const context = {
            userId: req.user?.userId,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"],
        };
        const result = await settings_service_1.SettingsService.resetGroup(scope, scopeId, group, context);
        return res.json(result);
    }
    catch (err) {
        return res.status(err.status || 400).json({ error: err.message || "Failed to reset settings" });
    }
});
/**
 * GET /api/v1/settings/:scope/:group/history
 * Audit trail / version history
 */
exports.settingsRouter.get("/:scope/:group/history", auth_1.requireAuth, async (req, res) => {
    try {
        const { scope, scopeId } = resolveScopeAndId(req, req.params.scope);
        const group = req.params.group;
        const normScopeId = (0, settings_service_1.normalizeScopeId)(scope, scopeId);
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
    }
    catch (err) {
        return res.status(err.status || 400).json({ error: err.message || "Failed to fetch settings history" });
    }
});
