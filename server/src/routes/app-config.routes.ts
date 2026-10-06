import { Router, Response } from "express";
import crypto from "crypto";
import { SettingsService } from "../services/settings/settings.service";
import { SettingScopeType } from "../services/settings/settings-registry";
import { resolveBranding, resolveBrandingContext } from "../services/branding/branding-resolver.service";
import { WorkspaceHostRequest } from "../middleware/workspace-host.middleware";
import { getEffectiveRequestHost } from "../lib/workspace-host";
import { verifyToken } from "../lib/jwt";
import { prisma, rawPrisma } from "../prisma";

export const appConfigRouter = Router();

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
appConfigRouter.get("/app-config", async (req: WorkspaceHostRequest, res: Response) => {
  try {
    const rawHost = getEffectiveRequestHost(req.headers);

    // Path resolution from query parameter, header, or referer
    const requestedPath =
      (req.query.pathname as string) ||
      (req.query.path as string) ||
      (req.headers["x-app-path"] as string) ||
      (req.headers.referer
        ? (() => {
            try {
              return new URL(req.headers.referer as string).pathname;
            } catch {
              return "/";
            }
          })()
        : "/");

    let isTenantHost = Boolean(
      req.resolvedTenant ||
      (req.hostContext && (req.hostContext.type === "tenant" || req.hostContext.type === "custom_domain"))
    );
    let resolvedTenantId = req.resolvedTenant?.id || null;

    // Bearer token fallback for authenticated SPA context if not already tenant host
    if (!isTenantHost && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = verifyToken(token);
        if (decoded?.tenantId) {
          resolvedTenantId = decoded.tenantId;
        }
      } catch {
        // Expired or invalid token, fall back safely
      }
    }

    // Call single authoritative resolver
    const resolution = resolveBrandingContext({
      host: rawHost,
      pathname: requestedPath,
      tenantId: resolvedTenantId,
      isTenantHost: isTenantHost || Boolean(resolvedTenantId),
    });

    // Resolve branding from SettingsService using the resolved scope and tenantId
    const resolved = await resolveBranding({
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
      isWhiteLabeled: resolution.scope === "TENANT",
      version: resolved.version,
      timestamp: new Date().toISOString(),
    };

    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Vary", "Host, Authorization, X-App-Path");

    return res.json(config);
  } catch (err: any) {
    console.error("[app-config error]:", err);
    return res.status(500).json({ error: "Failed to generate app config" });
  }
});
