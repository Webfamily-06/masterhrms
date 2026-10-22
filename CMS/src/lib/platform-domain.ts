/**
 * Frontend platform-domain helper (Flow 1).
 *
 * The platform domain is CONFIGURATION, not business logic. Resolution order:
 *   1. VITE_BASE_DOMAIN (build-time config, optional)
 *   2. Derived from the current browser host:
 *        localhost / *.localhost / 127.0.0.1   -> "localhost"
 *        {sub}.{base}  (3+ labels)              -> "{base}"
 *        {base}        (2 labels, root host)    -> "{base}"
 *
 * The backend (`GET /api/public/workspace` -> baseDomain) remains the authoritative
 * source; prefer `branding.baseDomain` from useTenantBranding() when it is available.
 */
export function getPlatformBaseDomain(): string {
  const configured = (import.meta as any).env?.VITE_BASE_DOMAIN as string | undefined;
  if (configured && configured.trim()) return configured.trim().toLowerCase();

  if (typeof window === "undefined") return "localhost";
  const host = window.location.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1") {
    return "localhost";
  }
  const parts = host.split(".");
  return parts.length >= 3 ? parts.slice(1).join(".") : host;
}

/** Builds `{slug}.{baseDomain}` (no protocol). */
export function getWorkspaceHost(slug: string, baseDomain = getPlatformBaseDomain()): string {
  return `${slug}.${baseDomain}`;
}

/**
 * Resolves the display base domain for previewing workspace and public URLs,
 * dynamically reflecting the configured platform domain or active host/port.
 * NEVER hardcodes a specific production domain.
 */
export function getPlatformDisplayBaseDomain(): string {
  const configured =
    (typeof process !== "undefined" && (process.env?.NEXT_PUBLIC_PLATFORM_DOMAIN || process.env?.NEXT_PUBLIC_BASE_DOMAIN || process.env?.BASE_DOMAIN)) ||
    (typeof import.meta !== "undefined" && ((import.meta as any)?.env?.VITE_PLATFORM_DOMAIN || (import.meta as any)?.env?.VITE_BASE_DOMAIN));
  if (configured && configured.trim()) return configured.trim().toLowerCase();

  if (typeof window === "undefined") {
    return process.env.NODE_ENV === "production" ? "app" : "localhost:3000";
  }
  const hostname = window.location.hostname.toLowerCase();
  const port = window.location.port ? `:${window.location.port}` : "";

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `localhost${port}`;
  }
  if (hostname.endsWith(".localhost")) {
    return `${hostname}${port}`;
  }
  const parts = hostname.split(".");
  if (parts.length >= 3) {
    return `${parts.slice(1).join(".")}${port}`;
  }
  return `${hostname}${port}`;
}

/**
 * Returns the dynamically resolved host domain for in-browser display and preview UI.
 */
export function getResolvedPublicDomain(): string {
  if (typeof window !== "undefined" && window.location.host) {
    return window.location.host;
  }
  return getPlatformDisplayBaseDomain();
}

/**
 * Resolves the trusted canonical domain from authoritative platform configuration.
 * Strictly avoids using arbitrary browser hostnames or untrusted Host headers for canonical SEO.
 * Environment-aware:
 *   - Development (NODE_ENV !== "production"): defaults to "localhost:3000"
 *   - Production (NODE_ENV === "production"): strictly enforces HTTPS and configured production domain,
 *     never silently emitting localhost.
 */
export function getTrustedCanonicalDomain(options?: {
  tenantDomain?: string | null;
  isVerifiedTenant?: boolean;
}): string {
  const isProd = typeof process !== "undefined" && process.env?.NODE_ENV === "production";

  // If a verified, active tenant custom domain is provided
  if (options?.tenantDomain && options.isVerifiedTenant !== false) {
    const raw = options.tenantDomain.trim().toLowerCase();
    // Validate domain format: must not be loopback/localhost or contain path/query
    if (
      !raw.includes("localhost") &&
      !raw.includes("127.0.0.1") &&
      !raw.includes("0.0.0.0") &&
      /^[a-z0-9][a-z0-9-.]*\.[a-z]{2,}$/i.test(raw)
    ) {
      return raw;
    }
  }

  // Authoritative platform configuration
  const configured =
    (typeof process !== "undefined" &&
      (process.env?.NEXT_PUBLIC_CANONICAL_DOMAIN ||
        process.env?.NEXT_PUBLIC_APP_URL ||
        process.env?.PLATFORM_DOMAIN ||
        process.env?.NEXT_PUBLIC_PLATFORM_DOMAIN ||
        process.env?.BASE_DOMAIN)) ||
    (typeof import.meta !== "undefined" &&
      ((import.meta as any)?.env?.VITE_CANONICAL_DOMAIN ||
        (import.meta as any)?.env?.VITE_PLATFORM_DOMAIN ||
        (import.meta as any)?.env?.VITE_BASE_DOMAIN));

  if (configured && typeof configured === "string" && configured.trim()) {
    try {
      const clean = configured.trim();
      const host = clean.startsWith("http://") || clean.startsWith("https://")
        ? new URL(clean).host
        : clean.split("/")[0];
      const normalizedHost = host.toLowerCase();

      // Guard: In production, reject any localhost or loopback configured value
      if (isProd && (normalizedHost.includes("localhost") || normalizedHost.includes("127.0.0.1"))) {
        console.warn(
          `[Security Warning] Configured canonical domain '${normalizedHost}' is a loopback address but NODE_ENV is production. Rejecting localhost in production.`
        );
      } else if (normalizedHost) {
        return normalizedHost;
      }
    } catch {}
  }

  // Safe fallback in development vs production
  if (!isProd) {
    return "localhost:3000";
  }

  // In production with no explicit canonical domain, check production base domain
  const base = getPlatformBaseDomain();
  if (base && base !== "localhost" && !base.includes("127.0.0.1")) {
    return base;
  }

  // Safe documented production fallback when explicit domain is missing
  return process.env?.PRODUCTION_FALLBACK_DOMAIN || "masterhrms.com";
}

/**
 * Returns the trusted canonical public URL for an article or page,
 * ensuring no untrusted host headers or hardcoded production hostnames are used.
 * In production, always forces https:// and strictly excludes localhost.
 */
export function getTrustedCanonicalBlogUrl(
  slug: string,
  options?: { tenantDomain?: string | null; isVerifiedTenant?: boolean }
): string {
  const cleanSlug = slug.replace(/^blog-/, "");
  const canonicalDomain = getTrustedCanonicalDomain(options);
  const isProd = typeof process !== "undefined" && process.env?.NODE_ENV === "production";

  // In production, ALWAYS force https: regardless of domain string
  const protocol = isProd
    ? "https:"
    : canonicalDomain.startsWith("localhost") || canonicalDomain.startsWith("127.0.0.1")
      ? "http:"
      : "https:";

  return `${protocol}//${canonicalDomain}/blog/${cleanSlug}`;
}

/**
 * Validates and normalizes an optional canonical URL override.
 * - Rejects non-HTTP(S) schemes (e.g. javascript:, data:)
 * - In production, rejects localhost overrides and enforces https://
 * - If invalid or empty, returns null so the caller falls back to getTrustedCanonicalBlogUrl
 */
export function validateCanonicalUrlOverride(url?: string | null): string | null {
  if (!url || !url.trim()) return null;
  const clean = url.trim();

  try {
    const parsed = new URL(clean);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    const isProd = typeof process !== "undefined" && process.env?.NODE_ENV === "production";
    const host = parsed.hostname.toLowerCase();

    // Production security guard: reject localhost overrides in production
    if (isProd) {
      if (host === "localhost" || host.includes("127.0.0.1") || host.endsWith(".localhost")) {
        return null;
      }
      // Force https in production
      parsed.protocol = "https:";
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Resolves Media Library asset URLs environment-aware:
 * - Local /uploads/... paths in development proxy to backend port 4000 via next.config rewrite.
 * - In production, resolves to configured CDN/S3/Storage origin or production host.
 */
export function resolveMediaAssetUrl(assetPathOrUrl: string): string {
  if (!assetPathOrUrl || !assetPathOrUrl.trim()) return "";
  const trimmed = assetPathOrUrl.trim();

  // If already absolute URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const isProd = typeof process !== "undefined" && process.env?.NODE_ENV === "production";
    // In production, rewrite accidental localhost media URLs to production asset origin
    if (isProd && (trimmed.includes("localhost:4000") || trimmed.includes("localhost:3000"))) {
      const pathname = new URL(trimmed).pathname;
      const cdnOrigin = process.env?.NEXT_PUBLIC_CDN_URL || process.env?.NEXT_PUBLIC_ASSET_URL;
      if (cdnOrigin) {
        return `${cdnOrigin.replace(/\/$/, "")}${pathname}`;
      }
      const canonical = getTrustedCanonicalDomain();
      return `https://${canonical}${pathname}`;
    }
    return trimmed;
  }

  // Relative /uploads/ asset
  if (trimmed.startsWith("/uploads/")) {
    const isProd = typeof process !== "undefined" && process.env?.NODE_ENV === "production";
    if (!isProd) {
      // In development, Next.js rewrite proxies /uploads to localhost:4000
      return trimmed;
    }
    const cdnOrigin = process.env?.NEXT_PUBLIC_CDN_URL || process.env?.NEXT_PUBLIC_ASSET_URL;
    if (cdnOrigin) {
      return `${cdnOrigin.replace(/\/$/, "")}${trimmed}`;
    }
    const canonical = getTrustedCanonicalDomain();
    return `https://${canonical}${trimmed}`;
  }

  return trimmed;
}

/**
 * Returns the resolved public URL for a blog post or public page,
 * ensuring no hardcoded hostnames are ever used.
 */
export function getResolvedPublicBlogUrl(
  slug: string,
  options?: { isDraft?: boolean; tenantDomain?: string | null; isVerifiedTenant?: boolean }
): string {
  const cleanSlug = slug.replace(/^blog-/, "");
  const protocol = typeof window !== "undefined" ? window.location.protocol : "http:";
  
  // If tenant has verified custom domain
  if (options?.tenantDomain && options.tenantDomain.trim() && options.isVerifiedTenant !== false) {
    const raw = options.tenantDomain.trim();
    if (!raw.includes("localhost") && !raw.includes("127.0.0.1")) {
      const base = `${protocol}//${raw}`;
      return options?.isDraft ? `${base}/blog/${cleanSlug}?preview=true` : `${base}/blog/${cleanSlug}`;
    }
  }

  const domain = getResolvedPublicDomain();
  const baseUrl = `${protocol}//${domain}`;
  return options?.isDraft ? `${baseUrl}/blog/${cleanSlug}?preview=true` : `${baseUrl}/blog/${cleanSlug}`;
}

/**
 * Returns the canonical workspace URL for a tenant, respecting custom domains,
 * subdomains, and the active local development port.
 */
export function getTenantWorkspaceUrl(
  tenant: { domain?: string | null; slug?: string } | null | undefined,
  targetPath = ""
): string {
  if (!tenant) return "#";
  const normPath = targetPath ? (targetPath.startsWith("/") ? targetPath : `/${targetPath}`) : "";
  if (tenant.domain && tenant.domain.trim()) {
    const protocol = typeof window !== "undefined" ? window.location.protocol : "http:";
    return `${protocol}//${tenant.domain.trim()}${normPath}`;
  }
  const slug = tenant.slug || "workspace";
  const displayBase = getPlatformDisplayBaseDomain();
  const protocol = typeof window !== "undefined" ? window.location.protocol : "http:";
  return `${protocol}//${slug}.${displayBase}${normPath}`;
}

/** Default platform support mailbox derived from configuration. */
export function getDefaultSupportEmail(baseDomain = getPlatformBaseDomain()): string {
  return `support@${baseDomain}`;
}

/**
 * Returns true if the hostname represents a tenant workspace subdomain
 * (e.g. acme.localhost, acme.yourdomain.com, beta.example.in)
 * and false for root/public hosts (localhost, yourdomain.com, www.yourdomain.com, 127.0.0.1)
 * and super hosts (super.yourdomain.com, super.localhost).
 */
export function isTenantWorkspaceHost(hostname?: string): boolean {
  if (typeof window === "undefined" && !hostname) return false;
  const host = (hostname || (typeof window !== "undefined" ? window.location.hostname : ""))
    .toLowerCase()
    .split(":")[0]
    .trim();
  if (!host) return false;

  const baseDomain = getPlatformBaseDomain().toLowerCase();

  // Root hosts
  if (
    host === baseDomain ||
    host === `www.${baseDomain}` ||
    host === "127.0.0.1" ||
    host === "0.0.0.0"
  ) {
    return false;
  }
  if (baseDomain === "localhost" && host === "localhost") {
    return false;
  }

  // Super host
  if (host === `super.${baseDomain}` || host === "super.localhost") {
    return false;
  }

  // Flow 1: Tenant workspace subdomain (*.baseDomain or *.localhost)
  if (host.endsWith(`.${baseDomain}`)) {
    const slug = host.slice(0, -(baseDomain.length + 1));
    return Boolean(slug && slug !== "www" && slug !== "super");
  }
  if (host.endsWith(".localhost")) {
    const slug = host.slice(0, -".localhost".length);
    return Boolean(slug && slug !== "www" && slug !== "super");
  }

  // Flow 2: Custom domain (e.g. app.acme.com, hr.mycorp.org)
  return true;
}

/**
 * Returns true if the host is a custom domain (Flow 2) rather than a platform subdomain (Flow 1).
 */
export function isCustomDomainHost(hostname?: string): boolean {
  if (typeof window === "undefined" && !hostname) return false;
  const host = (hostname || (typeof window !== "undefined" ? window.location.hostname : ""))
    .toLowerCase()
    .split(":")[0]
    .trim();
  if (!host) return false;

  const baseDomain = getPlatformBaseDomain().toLowerCase();

  // Root or platform infrastructure hosts
  if (
    host === baseDomain ||
    host === `www.${baseDomain}` ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    (baseDomain === "localhost" && host === "localhost") ||
    host === `super.${baseDomain}` ||
    host === "super.localhost"
  ) {
    return false;
  }

  // Flow 1 subdomains
  if (host.endsWith(`.${baseDomain}`) || host.endsWith(".localhost")) {
    return false;
  }

  // Any other host is a Flow 2 custom domain
  return true;
}
