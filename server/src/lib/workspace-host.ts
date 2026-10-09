/**
 * Workspace Host Resolution Utilities
 * ====================================
 * Single authoritative source of truth for:
 *  - Reserved workspace slug list
 *  - Workspace slug validation rules (3-30 chars, lowercase alphanumeric + hyphens)
 *  - Host -> tenant resolution (dynamic BASE_DOMAIN, *.localhost, and SUPER_ADMIN_HOST)
 *  - Dynamic workspace / super / root URL generation
 *  - Workspace routing cache with explicit invalidation
 *
 * Flow 1: Default Subdomain  -> {slug}.{BASE_DOMAIN}
 * Flow 2: Custom Domain      -> PLANNED / NOT IMPLEMENTED (Untouched)
 */

// ─────────────────────────────────────────────
// 1. CONFIGURATION HELPERS (DYNAMIC BASE_DOMAIN)
// ─────────────────────────────────────────────

/**
 * Returns the configured platform base domain.
 * Platform domain is configuration, NOT business logic.
 * Defaults to "localhost" in development if not explicitly configured.
 */
export function getBaseDomain(): string {
  const configured = process.env.BASE_DOMAIN;
  if (configured && configured.trim().length > 0) {
    return configured.trim().toLowerCase();
  }
  // Fallback to localhost if unset
  return "localhost";
}

/**
 * Returns the configured Super Admin host.
 * Defaults to super.{BASE_DOMAIN}.
 */
export function getSuperAdminHost(): string {
  const configured = process.env.SUPER_ADMIN_HOST;
  if (configured && configured.trim().length > 0) {
    return configured.trim().toLowerCase();
  }
  return `super.${getBaseDomain()}`;
}

// ─────────────────────────────────────────────
// 2. RESERVED WORKSPACE SLUGS
//    Add here — DO NOT hardcode elsewhere.
// ─────────────────────────────────────────────
export const RESERVED_WORKSPACE_SLUGS = new Set([
  // Platform infrastructure
  "www",
  "app",
  "api",
  "admin",
  "super",
  "mail",
  "smtp",
  "ftp",
  // Platform services
  "status",
  "docs",
  "cdn",
  "static",
  "assets",
  "billing",
  "support",
  "help",
  "blog",
  "portal",
  "dashboard",
  "developer",
  // Auth-related
  "login",
  "auth",
  "signup",
  "register",
  "logout",
  "oauth",
  "sso",
  // Dev/test
  "dev",
  "test",
  "staging",
  "demo",
  "sandbox",
  "default",
  "localhost",
  "root",
]);

// ─────────────────────────────────────────────
// 3. SLUG VALIDATION RULES (3–30 CHARS STRICT)
// ─────────────────────────────────────────────
export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 30;

// Lowercase alphanumeric and hyphens, cannot start or end with hyphen, no consecutive hyphens
export const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export type SlugValidationResult =
  | { valid: true; reason?: undefined }
  | { valid: false; reason: "invalid" | "reserved" | "too_short" | "too_long" | "consecutive_hyphens" };

export function validateWorkspaceSlug(slug: string): SlugValidationResult {
  if (!slug || typeof slug !== "string") {
    return { valid: false, reason: "invalid" };
  }

  const trimmed = slug.trim();

  // Enforce lowercase
  if (trimmed !== trimmed.toLowerCase()) {
    return { valid: false, reason: "invalid" };
  }

  if (trimmed.length < SLUG_MIN_LENGTH) {
    return { valid: false, reason: "too_short" };
  }

  if (trimmed.length > SLUG_MAX_LENGTH) {
    return { valid: false, reason: "too_long" };
  }

  // No consecutive hyphens
  if (trimmed.includes("--")) {
    return { valid: false, reason: "consecutive_hyphens" };
  }

  // Regex check: lowercase letters, numbers, hyphens, cannot start/end with hyphen
  if (!SLUG_PATTERN.test(trimmed)) {
    return { valid: false, reason: "invalid" };
  }

  // Reserved names blocked
  if (RESERVED_WORKSPACE_SLUGS.has(trimmed.toLowerCase())) {
    return { valid: false, reason: "reserved" };
  }

  return { valid: true };
}

// ─────────────────────────────────────────────
// 4. SLUG SUGGESTION FROM COMPANY NAME
// ─────────────────────────────────────────────
export function suggestWorkspaceSlug(companyName: string): string {
  if (!companyName || typeof companyName !== "string") {
    return "workspace";
  }

  let slug = companyName
    .toLowerCase()
    // Replace unsupported chars (spaces, dots, underscores, special) with hyphens
    .replace(/[^a-z0-9]+/g, "-")
    // Collapse repeated hyphens
    .replace(/-{2,}/g, "-")
    // Trim leading/trailing hyphens
    .replace(/^-+|-+$/g, "");

  // Truncate to 30 characters max (without ending hyphen)
  if (slug.length > SLUG_MAX_LENGTH) {
    slug = slug.substring(0, SLUG_MAX_LENGTH).replace(/-+$/, "");
  }

  // Pad if too short (minimum 3 chars)
  if (slug.length < SLUG_MIN_LENGTH) {
    slug = (slug + "-co").substring(0, SLUG_MAX_LENGTH).replace(/-+$/, "");
    if (slug.length < SLUG_MIN_LENGTH) {
      slug = "workspace";
    }
  }

  // If suggested matches reserved word, append -org
  if (RESERVED_WORKSPACE_SLUGS.has(slug)) {
    slug = (slug + "-org").substring(0, SLUG_MAX_LENGTH);
  }

  return slug;
}

// ─────────────────────────────────────────────
// 5. HOST RESOLUTION
// ─────────────────────────────────────────────
// 5. HOST RESOLUTION
// ─────────────────────────────────────────────
export type HostContext =
  | { type: "public"; baseDomain: string }
  | { type: "super"; baseDomain: string }
  | { type: "tenant"; slug: string; baseDomain: string }
  | { type: "custom_domain"; domain: string; tenantId: string; baseDomain: string }
  | { type: "unknown"; host: string; baseDomain: string };

/**
 * Resolves the request context from the HTTP Host header.
 * Allows passing an optional baseDomainOverride (e.g. in tests).
 * Strips ports and normalizes case.
 */
export function resolveHostContext(hostHeader: string, baseDomainOverride?: string): HostContext {
  const baseDomain = (baseDomainOverride || getBaseDomain()).toLowerCase();
  const superHost = baseDomainOverride ? `super.${baseDomain}` : getSuperAdminHost();

  if (!hostHeader) {
    return { type: "public", baseDomain };
  }

  // Strip port from host header (e.g., "acme.localhost:5173" -> "acme.localhost")
  const hostname = hostHeader.split(":")[0].toLowerCase().trim();

  // ── Public / Root Hosts ────────────────────────────────────
  if (
    hostname === baseDomain ||
    hostname === `www.${baseDomain}` ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0"
  ) {
    return { type: "public", baseDomain };
  }

  // Special development root hostname when baseDomain is localhost
  if (baseDomain === "localhost" && hostname === "localhost") {
    return { type: "public", baseDomain };
  }

  // ── Super Admin Host ───────────────────────────────────────
  if (hostname === superHost || hostname === `super.${baseDomain}`) {
    return { type: "super", baseDomain };
  }
  // Local development super alias
  if (hostname === "super.localhost") {
    return { type: "super", baseDomain: "localhost" };
  }

  // ── Tenant Workspace Host (Flow 1) ─────────────────────────
  // Check if hostname ends with .${baseDomain}
  if (hostname.endsWith(`.${baseDomain}`)) {
    const slug = hostname.slice(0, -(baseDomain.length + 1));
    if (slug && slug !== "www" && slug !== "super") {
      return { type: "tenant", slug, baseDomain };
    }
  }

  // Local development tenant fallback: *.localhost
  if (hostname.endsWith(".localhost")) {
    const slug = hostname.slice(0, -".localhost".length);
    if (slug && slug !== "www" && slug !== "super") {
      return { type: "tenant", slug, baseDomain: "localhost" };
    }
  }

  // ── Check Cached Active Custom Domain (Flow 2) ─────────────
  const cachedDomain = getCachedCustomDomain(hostname);
  if (cachedDomain && cachedDomain.status === "approved" && cachedDomain.dnsStatus === "verified") {
    return {
      type: "custom_domain",
      domain: cachedDomain.domain,
      tenantId: cachedDomain.tenantId,
      baseDomain,
    };
  }

  // ── Unknown Host ───────────────────────────────────────────
  return { type: "unknown", host: hostname, baseDomain };
}

/**
 * Determines the workspace host a request originates from.
 *
 * Priority:
 *  1. X-Forwarded-Host (set by the reverse proxy in production)
 *  2. Host header
 *  3. Origin header — ONLY when (1)/(2) point at the API's own host
 *     (root/public, unknown, or a reserved label such as `api.{BASE_DOMAIN}`).
 */
export function getEffectiveRequestHost(headers: Record<string, any>): string {
  const fwd = String(headers["x-forwarded-host"] || "").split(",")[0].trim();
  const host = fwd || String(headers.host || "");
  const ctx = resolveHostContext(host);

  const hostIsApiOwn =
    ctx.type === "public" ||
    ctx.type === "unknown" ||
    (ctx.type === "tenant" && RESERVED_WORKSPACE_SLUGS.has(ctx.slug));

  if (!hostIsApiOwn) return host;

  const appHost = headers["x-app-host"] ? String(headers["x-app-host"]).trim() : "";
  if (appHost) {
    const actx = resolveHostContext(appHost);
    if (actx.type === "super" || actx.type === "tenant" || actx.type === "custom_domain") {
      return appHost;
    }
  }

  const origin = headers.origin ? String(headers.origin) : "";
  const referer = headers.referer ? String(headers.referer) : "";
  const sourceUrl = origin || referer;
  if (!sourceUrl || sourceUrl === "null") return host;

  try {
    const sourceHost = new URL(sourceUrl).host;
    const octx = resolveHostContext(sourceHost);
    if (octx.type === "super") return sourceHost;
    if (octx.type === "tenant" && !RESERVED_WORKSPACE_SLUGS.has(octx.slug)) return sourceHost;
    if (octx.type === "custom_domain") return sourceHost;
  } catch {
    /* malformed Origin or Referer — ignore */
  }
  return host;
}

// ─────────────────────────────────────────────
// 6. WORKSPACE URL GENERATION
// ─────────────────────────────────────────────

/**
 * Returns the primary workspace URL for a tenant (Flow 1).
 * Uses configured BASE_DOMAIN or custom port for local dev.
 */
export function getWorkspaceUrl(slug: string, port?: number, baseDomainOverride?: string): string {
  const base = (baseDomainOverride || getBaseDomain()).toLowerCase();
  const isDev = process.env.NODE_ENV !== "production";

  if (base === "localhost") {
    const p = port || (isDev ? 5173 : 80);
    return p === 80 || p === 443 ? `http://${slug}.localhost` : `http://${slug}.localhost:${p}`;
  }

  const protocol = isDev ? "http" : "https";
  const portSuffix = port && port !== 80 && port !== 443 ? `:${port}` : "";
  return `${protocol}://${slug}.${base}${portSuffix}`;
}

/**
 * Returns the URL for a custom domain (Flow 2).
 */
export function getCustomDomainUrl(domain: string, port?: number): string {
  const isDev = process.env.NODE_ENV !== "production";
  const protocol = isDev ? "http" : "https";
  const portSuffix = port && port !== 80 && port !== 443 ? `:${port}` : "";
  return `${protocol}://${domain}${portSuffix}`;
}

/**
 * Returns the Super Admin console URL on https://{BASE_DOMAIN}/super.
 */
export function getSuperAdminUrl(port?: number, baseDomainOverride?: string): string {
  const root = getRootUrl(port, baseDomainOverride);
  return `${root}/super`;
}

/**
 * Returns the root/public site URL.
 */
export function getRootUrl(port?: number, baseDomainOverride?: string): string {
  const base = (baseDomainOverride || getBaseDomain()).toLowerCase();
  const isDev = process.env.NODE_ENV !== "production";

  if (base === "localhost") {
    const p = port || (isDev ? 5173 : 80);
    return p === 80 || p === 443 ? `http://localhost` : `http://localhost:${p}`;
  }

  const protocol = isDev ? "http" : "https";
  const portSuffix = port && port !== 80 && port !== 443 ? `:${port}` : "";
  return `${protocol}://${base}${portSuffix}`;
}

// ─────────────────────────────────────────────
// 7. WORKSPACE ROUTING CACHE (1-MINUTE TTL)
// ─────────────────────────────────────────────
interface CachedWorkspace {
  tenantId: string;
  slug: string;
  name: string;
  status: string;
  isRedirect: boolean;
  targetSlug?: string;
  cachedAt: number;
}

const workspaceCache = new Map<string, CachedWorkspace>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function getCachedWorkspace(slug: string): CachedWorkspace | null {
  const entry = workspaceCache.get(slug.toLowerCase());
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    workspaceCache.delete(slug.toLowerCase());
    return null;
  }
  return entry;
}

export function setCachedWorkspace(slug: string, entry: Omit<CachedWorkspace, "cachedAt">): void {
  workspaceCache.set(slug.toLowerCase(), {
    ...entry,
    cachedAt: Date.now(),
  });
}

export function invalidateWorkspaceCache(slug?: string): void {
  if (slug) {
    workspaceCache.delete(slug.toLowerCase());
  } else {
    workspaceCache.clear();
  }
}

// ─────────────────────────────────────────────
// 8. CUSTOM DOMAIN ROUTING CACHE (Flow 2)
// ─────────────────────────────────────────────
export interface CachedCustomDomain {
  id: string;
  domain: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  status: string;
  dnsStatus: string;
  sslStatus: string;
  isPrimary: boolean;
  cachedAt: number;
}

const customDomainCache = new Map<string, CachedCustomDomain>();

export function getCachedCustomDomain(domain: string): CachedCustomDomain | null {
  const entry = customDomainCache.get(domain.toLowerCase());
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    customDomainCache.delete(domain.toLowerCase());
    return null;
  }
  return entry;
}

export function setCachedCustomDomain(domain: string, entry: Omit<CachedCustomDomain, "cachedAt">): void {
  customDomainCache.set(domain.toLowerCase(), {
    ...entry,
    cachedAt: Date.now(),
  });
}

export function invalidateCustomDomainCache(domain?: string): void {
  if (domain) {
    customDomainCache.delete(domain.toLowerCase());
  } else {
    customDomainCache.clear();
  }
}

