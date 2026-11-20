"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appConfigRouter = void 0;
const express_1 = require("express");
const settings_service_1 = require("../services/settings/settings.service");
const branding_resolver_service_1 = require("../services/branding/branding-resolver.service");
const workspace_host_1 = require("../lib/workspace-host");
const jwt_1 = require("../lib/jwt");
const maintenance_1 = require("../middleware/maintenance");
const pusher_service_1 = require("../services/pusher.service");
exports.appConfigRouter = (0, express_1.Router)();
/**
 * GET /api/v1/public/app-config
 * Authoritative bootstrap configuration endpoint with Workspace Branding Matrix resolution.
 *
 * Rules:
 *   PLATFORM HOST -> PLATFORM branding
 *   TENANT HOST + LOGIN -> TENANT branding
 *   TENANT HOST + CMS -> PLATFORM branding
 *   TENANT HOST + APPLICATION -> TENANT branding
 *
 * Exposes:
 *   {
 *     scope: "PLATFORM" | "TENANT",
 *     tenantId: string | null,
 *     context: "PLATFORM" | "TENANT_LOGIN" | "TENANT_APP" | "CMS",
 *     branding: { ... }
 *   }
 */
exports.appConfigRouter.get("/app-config", async (req, res) => {
    try {
        const rawHost = (0, workspace_host_1.getEffectiveRequestHost)(req.headers);
        // Path resolution from query parameter, header, or referer
        const requestedPath = req.query.pathname ||
            req.query.path ||
            req.headers["x-app-path"] ||
            (req.headers.referer
                ? (() => {
                    try {
                        return new URL(req.headers.referer).pathname;
                    }
                    catch {
                        return "/";
                    }
                })()
                : "/");
        let isTenantHost = Boolean(req.resolvedTenant ||
            (req.hostContext && (req.hostContext.type === "tenant" || req.hostContext.type === "custom_domain")));
        let resolvedTenantId = req.resolvedTenant?.id || null;
        let authenticatedUserId = null;
        // Decode Bearer token if present (works on both platform and tenant hosts)
        // to resolve tenant fallback AND per-employee USER scope preferences (color, timezone, theme).
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            try {
                const token = req.headers.authorization.split(" ")[1];
                const decoded = (0, jwt_1.verifyToken)(token);
                if (decoded?.userId) {
                    authenticatedUserId = decoded.userId;
                }
                if (!isTenantHost && decoded?.tenantId) {
                    resolvedTenantId = decoded.tenantId;
                }
            }
            catch {
                // Expired or invalid token, fall back safely
            }
        }
        // Call single authoritative resolver
        const resolution = (0, branding_resolver_service_1.resolveBrandingContext)({
            host: rawHost,
            pathname: requestedPath,
            tenantId: resolvedTenantId,
            isTenantHost: isTenantHost || Boolean(resolvedTenantId),
        });
        // Resolve branding, maintenance, user preferences, and public realtime/push client configs concurrently
        const [resolved, maintConfig, userGroupResult, pusherConfigResult, firebaseGroupResult] = await Promise.all([
            (0, branding_resolver_service_1.resolveBranding)({
                scope: resolution.scope,
                tenantId: resolution.scope === "TENANT" ? resolution.tenantId : null,
            }),
            (0, maintenance_1.getPlatformMaintenanceConfig)(),
            authenticatedUserId
                ? settings_service_1.SettingsService.getGroup("USER", authenticatedUserId, "user").catch(() => null)
                : Promise.resolve(null),
            pusher_service_1.PusherService.getConfig().catch(() => null),
            settings_service_1.SettingsService.getGroup("PLATFORM", null, "firebase").catch(() => null),
        ]);
        const isCmsOrAuth = resolution.context === "CMS" || resolution.context === "TENANT_LOGIN";
        const rawUserColor = !isCmsOrAuth && userGroupResult?.sources?.["user.primary_color"] === "USER"
            ? userGroupResult.values["user.primary_color"]
            : null;
        const userPrimaryColor = typeof rawUserColor === "string" && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(rawUserColor.trim())
            ? rawUserColor.trim()
            : null;
        const rawUserTimezone = !isCmsOrAuth && userGroupResult?.sources?.["user.timezone"] === "USER"
            ? userGroupResult.values["user.timezone"]
            : "";
        const userTimezoneOverride = typeof rawUserTimezone === "string" && rawUserTimezone.trim().length > 0
            ? rawUserTimezone.trim()
            : null;
        const userDateFormatOverride = !isCmsOrAuth &&
            userGroupResult?.sources?.["user.date_format"] === "USER" &&
            userGroupResult.values["user.date_format"]
            ? String(userGroupResult.values["user.date_format"])
            : null;
        const userTimeFormatOverride = !isCmsOrAuth &&
            userGroupResult?.sources?.["user.time_format"] === "USER" &&
            userGroupResult.values["user.time_format"]
            ? String(userGroupResult.values["user.time_format"])
            : null;
        const effectivePrimaryColor = userPrimaryColor || resolved.primaryColor;
        const branding = {
            logoLight: resolved.logoLightUrl,
            logoLightUrl: resolved.logoLightUrl,
            logoDark: resolved.logoDarkUrl,
            logoDarkUrl: resolved.logoDarkUrl,
            favicon: resolved.faviconUrl,
            faviconUrl: resolved.faviconUrl,
            primaryColor: effectivePrimaryColor,
            workspacePrimaryColor: resolved.primaryColor,
            userPrimaryColor,
            appName: resolved.appName,
            footerText: resolved.footerText,
            supportEmail: resolved.supportEmail,
        };
        const maintEvaluation = (0, maintenance_1.evaluateMaintenanceStatus)(maintConfig);
        // Public client-safe Firebase configuration (NEVER expose service_account_json)
        const fbVals = firebaseGroupResult?.values || {};
        const fbApiKey = fbVals["firebase.api_key"] ||
            process.env.VITE_FIREBASE_API_KEY ||
            process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
            "";
        const fbProjectId = fbVals["firebase.project_id"] ||
            process.env.VITE_FIREBASE_PROJECT_ID ||
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
            "";
        const fbEnabled = firebaseGroupResult?.sources?.["firebase.enabled"] === "PLATFORM"
            ? Boolean(fbVals["firebase.enabled"])
            : Boolean(fbApiKey && fbProjectId);
        const publicFirebase = {
            enabled: fbEnabled,
            apiKey: fbApiKey,
            authDomain: fbVals["firebase.auth_domain"] ||
                process.env.VITE_FIREBASE_AUTH_DOMAIN ||
                process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
                "",
            projectId: fbProjectId,
            storageBucket: fbVals["firebase.storage_bucket"] ||
                process.env.VITE_FIREBASE_STORAGE_BUCKET ||
                process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
                "",
            messagingSenderId: fbVals["firebase.messaging_sender_id"] ||
                process.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
                process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
                "",
            appId: fbVals["firebase.app_id"] ||
                process.env.VITE_FIREBASE_APP_ID ||
                process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
                "",
            measurementId: fbVals["firebase.measurement_id"] ||
                process.env.VITE_FIREBASE_MEASUREMENT_ID ||
                process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ||
                "",
            vapidKey: fbVals["firebase.vapid_key"] ||
                process.env.VITE_FIREBASE_VAPID_KEY ||
                process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ||
                process.env.VAPID_PUBLIC_KEY ||
                "",
        };
        // Public client-safe Pusher configuration (NEVER expose secret or appId)
        const publicPusher = {
            enabled: Boolean(pusherConfigResult?.enabled),
            key: pusherConfigResult?.key || "",
            cluster: pusherConfigResult?.cluster || "ap2",
        };
        const effectiveLocale = {
            ...resolved.locale,
            workspaceTimezone: resolved.locale.timezone,
            timezone: userTimezoneOverride || resolved.locale.timezone,
            dateFormat: userDateFormatOverride || resolved.locale.dateFormat,
            timeFormat: userTimeFormatOverride || resolved.locale.timeFormat,
        };
        const config = {
            scope: resolution.scope,
            tenantId: resolution.tenantId,
            context: resolution.context,
            branding,
            appName: resolved.appName,
            supportEmail: resolved.supportEmail,
            primaryColor: effectivePrimaryColor,
            workspacePrimaryColor: resolved.primaryColor,
            userPrimaryColor,
            logoLight: resolved.logoLightUrl,
            logoLightUrl: resolved.logoLightUrl,
            logoDark: resolved.logoDarkUrl,
            logoDarkUrl: resolved.logoDarkUrl,
            favicon: resolved.faviconUrl,
            faviconUrl: resolved.faviconUrl,
            footerText: resolved.footerText,
            locale: effectiveLocale,
            userPreferences: authenticatedUserId
                ? {
                    userId: authenticatedUserId,
                    primaryColor: userPrimaryColor,
                    themeMode: userGroupResult?.values?.["user.theme_mode"] || "system",
                    timezone: userTimezoneOverride,
                    locale: userGroupResult?.values?.["user.locale"] || "en-US",
                }
                : null,
            pusher: publicPusher,
            firebase: publicFirebase,
            maintenance: {
                active: maintEvaluation.isActive,
                message: maintConfig.maintenanceNoticeMessage || null,
            },
            isWhiteLabeled: resolution.scope === "TENANT",
            version: Math.max(resolved.version, userGroupResult?.version || 1),
            timestamp: new Date().toISOString(),
        };
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        res.setHeader("Vary", "Host, Authorization, X-App-Path");
        return res.json(config);
    }
    catch (err) {
        console.error("[app-config error]:", err);
        return res.status(500).json({ error: "Failed to generate app config" });
    }
});
