import { prisma, rawPrisma } from "../../prisma";
import { SettingsService } from "../settings/settings.service";
import { SettingScopeType } from "../settings/settings-registry";
import { getRootUrl, resolveHostContext } from "../../lib/workspace-host";

export type BrandingContextType = "PLATFORM" | "TENANT_LOGIN" | "TENANT_APP" | "CMS";

export interface BrandingResolutionInput {
  host?: string | null;
  pathname?: string | null;
  tenantId?: string | null;
  isTenantHost?: boolean;
}

export interface BrandingResolutionResult {
  scope: SettingScopeType;
  context: BrandingContextType;
  tenantId: string | null;
}

export function isCmsPath(pathname?: string | null): boolean {
  if (!pathname) return false;
  const p = pathname.split("?")[0].toLowerCase().trim();
  return (
    p === "/cms" ||
    p.startsWith("/cms/") ||
    p === "/api/cms" ||
    p.startsWith("/api/cms/")
  );
}

export function isAuthPath(pathname?: string | null): boolean {
  if (!pathname) return false;
  const p = pathname.split("?")[0].toLowerCase().trim();
  return (
    p === "/login" ||
    p.startsWith("/login/") ||
    p === "/auth" ||
    p.startsWith("/auth/") ||
    p === "/super-login" ||
    p.startsWith("/super-login/") ||
    p === "/verify-2fa" ||
    p.startsWith("/verify-2fa/") ||
    p === "/lock-screen" ||
    p.startsWith("/lock-screen/") ||
    p === "/session-expired" ||
    p.startsWith("/session-expired/")
  );
}

/**
 * Authoritative Branding Context Resolver.
 * Implements the Workspace Branding Matrix:
 *
 * IF host is platform host:
 *     return PLATFORM
 *
 * IF host belongs to tenant:
 *     IF pathname is CMS:
 *         return PLATFORM (Context: CMS)
 *     IF pathname is login/auth:
 *         return TENANT (Context: TENANT_LOGIN)
 *     IF pathname is tenant application/workspace:
 *         return TENANT (Context: TENANT_APP)
 */
export function resolveBrandingContext(input: BrandingResolutionInput): BrandingResolutionResult {
  const { host = "", pathname = "", tenantId = null } = input;

  // Clean host (remove port)
  const cleanHost = (host || "").split(":")[0].toLowerCase().trim();

  // Determine if host belongs to tenant
  let isTenant = false;
  if (input.isTenantHost !== undefined) {
    isTenant = input.isTenantHost;
  } else if (cleanHost) {
    const ctx = resolveHostContext(cleanHost);
    isTenant = ctx.type === "tenant" || ctx.type === "custom_domain";
  }

  // 1. IF host is platform host: return PLATFORM
  if (!isTenant) {
    return {
      scope: "PLATFORM",
      context: "PLATFORM",
      tenantId: null,
    };
  }

  // 2. IF host belongs to tenant:
  // IF pathname is CMS: return PLATFORM
  if (isCmsPath(pathname)) {
    return {
      scope: "PLATFORM",
      context: "CMS",
      tenantId: tenantId || null,
    };
  }

  // IF pathname is login/auth: return TENANT
  if (isAuthPath(pathname)) {
    return {
      scope: "TENANT",
      context: "TENANT_LOGIN",
      tenantId: tenantId || null,
    };
  }

  // IF pathname is tenant application/workspace: return TENANT
  return {
    scope: "TENANT",
    context: "TENANT_APP",
    tenantId: tenantId || null,
  };
}

export interface ResolveBrandingOptions {
  scope?: SettingScopeType;
  tenantId?: string | null;
  baseUrl?: string;
}

export interface ResolvedBranding {
  scope: SettingScopeType;
  tenantId: string | null;
  appName: string;
  logoLightUrl: string;
  logoDarkUrl: string;
  faviconUrl: string;
  primaryColor: string;
  footerText: string;
  supportEmail: string;
  locale: {
    defaultCurrency: string;
    currencySymbol: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
  };
  // Absolute URLs for external delivery (emails, PDFs, notifications)
  absoluteLogoLightUrl: string;
  absoluteLogoDarkUrl: string;
  absoluteFaviconUrl: string;
  isWhiteLabeled: boolean;
  version: number;
  sources?: Record<string, "TENANT" | "PLATFORM" | "DEFAULT">;
  hasOverrides?: boolean;
}

/**
 * Ensures an asset URL is fully qualified with scheme and host for external consumers
 * (email clients, generated PDF invoices, push notifications).
 */
export function toAbsoluteUrl(url: string, baseUrl?: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const base = (baseUrl || process.env.APP_URL || getRootUrl()).replace(/\/+$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
}

/**
 * Authoritative Global White-Label Brand Identity Resolver.
 * Single source of truth for ALL branded application outputs:
 * Web UI, Emails, Invoices, PDFs, Notifications, Reports, and System Messages.
 *
 * Precedence Chain:
 *   TENANT override (per-key)
 *       ↓
 *   PLATFORM setting (per-key)
 *       ↓
 *   SYSTEM DEFAULT
 */
export class BrandingResolverService {
  static async resolve(options: ResolveBrandingOptions = {}): Promise<ResolvedBranding> {
    const db = rawPrisma || prisma;

    // Determine authoritative scope
    let scope: SettingScopeType = options.scope || "PLATFORM";
    let tenantId: string | null = options.tenantId || null;

    if (tenantId && tenantId.trim().length > 0) {
      scope = "TENANT";
    } else if (scope === "PLATFORM") {
      tenantId = null;
    }

    let tenantMeta: {
      id: string;
      name: string;
      slug: string;
      logoUrl: string | null;
      timezone: string | null;
    } | null = null;

    if (scope === "TENANT" && tenantId) {
      try {
        tenantMeta = await db.tenant.findUnique({
          where: { id: tenantId },
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            timezone: true,
          },
        });
      } catch (err) {
        console.warn(`[BrandingResolver] Failed to lookup tenant metadata for ${tenantId}:`, err);
      }
    }

    // Resolve branding and locale from authoritative SettingsService (with per-key inheritance)
    const brandingData = await SettingsService.getGroup(scope, tenantId, "branding");
    const localeData = await SettingsService.getGroup(scope, tenantId, "locale");

    const appName =
      brandingData.values["branding.app_name"] ||
      tenantMeta?.name ||
      "Master HRMS";

    const supportEmail =
      brandingData.values["branding.support_email"] ||
      "support@masterhrms.com";

    const primaryColor =
      brandingData.values["branding.primary_color"] ||
      "#2563EB";

    const logoLightUrl =
      brandingData.mediaUrls["branding.logo_light_id"] ||
      (typeof brandingData.values["branding.logo_light_id"] === "string" &&
      (brandingData.values["branding.logo_light_id"].startsWith("/") ||
        brandingData.values["branding.logo_light_id"].startsWith("http://") ||
        brandingData.values["branding.logo_light_id"].startsWith("https://") ||
        brandingData.values["branding.logo_light_id"].startsWith("data:"))
        ? brandingData.values["branding.logo_light_id"]
        : null) ||
      tenantMeta?.logoUrl ||
      "/logo.webp";

    const logoDarkUrl =
      brandingData.mediaUrls["branding.logo_dark_id"] ||
      (typeof brandingData.values["branding.logo_dark_id"] === "string" &&
      (brandingData.values["branding.logo_dark_id"].startsWith("/") ||
        brandingData.values["branding.logo_dark_id"].startsWith("http://") ||
        brandingData.values["branding.logo_dark_id"].startsWith("https://") ||
        brandingData.values["branding.logo_dark_id"].startsWith("data:"))
        ? brandingData.values["branding.logo_dark_id"]
        : null) ||
      tenantMeta?.logoUrl ||
      "/white-logo.webp";

    const faviconUrl =
      brandingData.mediaUrls["branding.favicon_id"] ||
      (typeof brandingData.values["branding.favicon_id"] === "string" &&
      (brandingData.values["branding.favicon_id"].startsWith("/") ||
        brandingData.values["branding.favicon_id"].startsWith("http://") ||
        brandingData.values["branding.favicon_id"].startsWith("https://") ||
        brandingData.values["branding.favicon_id"].startsWith("data:"))
        ? brandingData.values["branding.favicon_id"]
        : null) ||
      "/favicon.webp";

    const footerText =
      brandingData.values["branding.footer_text"] ||
      "© 2026 Master HRMS. All rights reserved.";

    const locale = {
      defaultCurrency: localeData.values["locale.default_currency"] || "INR",
      currencySymbol: localeData.values["locale.currency_symbol"] || "₹",
      timezone: localeData.values["locale.timezone"] || tenantMeta?.timezone || "Asia/Kolkata",
      dateFormat: localeData.values["locale.date_format"] || "DD/MM/YYYY",
      timeFormat: localeData.values["locale.time_format"] || "12",
    };

    const maxVersion = Math.max(brandingData.version, localeData.version);

    return {
      scope,
      tenantId,
      appName,
      logoLightUrl,
      logoDarkUrl,
      faviconUrl,
      primaryColor,
      footerText,
      supportEmail,
      locale,
      absoluteLogoLightUrl: toAbsoluteUrl(logoLightUrl, options.baseUrl),
      absoluteLogoDarkUrl: toAbsoluteUrl(logoDarkUrl, options.baseUrl),
      absoluteFaviconUrl: toAbsoluteUrl(faviconUrl, options.baseUrl),
      isWhiteLabeled: scope === "TENANT",
      version: maxVersion,
      sources: brandingData.sources,
      hasOverrides: Object.values(brandingData.overrides || {}).some(Boolean),
    };
  }
}

/**
 * Convenient procedural shorthand for resolveBranding
 */
export async function resolveBranding(options: ResolveBrandingOptions = {}): Promise<ResolvedBranding> {
  return BrandingResolverService.resolve(options);
}
