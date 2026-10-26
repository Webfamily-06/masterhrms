"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appConfigRouter = void 0;
const express_1 = require("express");
const branding_resolver_service_1 = require("../services/branding/branding-resolver.service");
const workspace_host_1 = require("../lib/workspace-host");
const jwt_1 = require("../lib/jwt");
const maintenance_1 = require("../middleware/maintenance");
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
        // Bearer token fallback for authenticated SPA context if not already tenant host
        if (!isTenantHost && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            try {
                const token = req.headers.authorization.split(" ")[1];
                const decoded = (0, jwt_1.verifyToken)(token);
                if (decoded?.tenantId) {
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
        // Resolve branding from SettingsService using the resolved scope and tenantId
        const resolved = await (0, branding_resolver_service_1.resolveBranding)({
            scope: resolution.scope,
            tenantId: resolution.scope === "TENANT" ? resolution.tenantId : null,
        });
        const branding = {
            logoLight: resolved.logoLightUrl,
            logoLightUrl: resolved.logoLightUrl,
            logoDark: resolved.logoDarkUrl,
            logoDarkUrl: resolved.logoDarkUrl,
            favicon: resolved.faviconUrl,
            faviconUrl: resolved.faviconUrl,
            primaryColor: resolved.primaryColor,
            appName: resolved.appName,
            footerText: resolved.footerText,
            supportEmail: resolved.supportEmail,
        };
        const maintConfig = await (0, maintenance_1.getPlatformMaintenanceConfig)();
        const maintEvaluation = (0, maintenance_1.evaluateMaintenanceStatus)(maintConfig);
        const config = {
            scope: resolution.scope,
            tenantId: resolution.tenantId,
            context: resolution.context,
            branding,
            appName: resolved.appName,
            supportEmail: resolved.supportEmail,
            primaryColor: resolved.primaryColor,
            logoLight: resolved.logoLightUrl,
            logoLightUrl: resolved.logoLightUrl,
            logoDark: resolved.logoDarkUrl,
            logoDarkUrl: resolved.logoDarkUrl,
            favicon: resolved.faviconUrl,
            faviconUrl: resolved.faviconUrl,
            footerText: resolved.footerText,
            locale: resolved.locale,
            maintenance: {
                active: maintEvaluation.isActive,
                message: maintConfig.maintenanceNoticeMessage || null,
            },
            isWhiteLabeled: resolution.scope === "TENANT",
            version: resolved.version,
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
