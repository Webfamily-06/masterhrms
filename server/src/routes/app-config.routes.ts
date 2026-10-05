import { Router, Response } from "express";
import crypto from "crypto";
import { SettingsService } from "../services/settings/settings.service";
import { SettingScopeType } from "../services/settings/settings-registry";
import { resolveBranding } from "../services/branding/branding-resolver.service";
import { WorkspaceHostRequest } from "../middleware/workspace-host.middleware";
import { verifyToken } from "../lib/jwt";
import { prisma, rawPrisma } from "../prisma";

export const appConfigRouter = Router();

/**
 * GET /api/v1/public/app-config
 * Bootstrap configuration endpoint with scope-aware White-Label resolution.
 * Resolves tenant identity strictly via trusted architecture (subdomain/hostname or verified JWT token).
 * Client query parameter tenant spoofing is strictly rejected.
 * Cached with ETag and Vary: Host, Authorization for complete cache isolation.
 */
appConfigRouter.get("/app-config", async (req: WorkspaceHostRequest, res: Response) => {
  try {
    let scope: SettingScopeType = "PLATFORM";
    let scopeId: string | null = null;
    let tenantMeta: any = null;

    // 1. Host-based tenant resolution (subdomain or custom domain via workspaceHostMiddleware)
    if (req.resolvedTenant) {
      scope = "TENANT";
      scopeId = req.resolvedTenant.id;
      tenantMeta = req.resolvedTenant;
    }
    // 2. Authenticated bearer token resolution (for SPA / single-domain contexts)
    else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = verifyToken(token);
        if (decoded?.tenantId) {
          const tenant = await (rawPrisma || prisma).tenant.findUnique({
            where: { id: decoded.tenantId },
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              timezone: true,
            },
          });
          if (tenant) {
            scope = "TENANT";
            scopeId = tenant.id;
            tenantMeta = tenant;
          }
        }
      } catch {
        // Expired or invalid token, fall back safely to PLATFORM scope
      }
    }
    // Note: req.query.tenantId is deliberately NOT checked to prevent client spoofing

    // 3. Resolve branding and locale through authoritative BrandingResolverService precedence
    // Precedence: TENANT override -> PLATFORM fallback -> SYSTEM default
    const resolved = await resolveBranding({ scope, tenantId: scopeId });

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
      scope: resolved.scope,
      tenantId: resolved.tenantId,
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
      isWhiteLabeled: resolved.isWhiteLabeled,
      version: resolved.version,
      timestamp: new Date().toISOString(),
    };

    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Vary", "Host, Authorization");

    return res.json(config);
  } catch (err: any) {
    console.error("[app-config error]:", err);
    return res.status(500).json({ error: "Failed to generate app config" });
  }
});
