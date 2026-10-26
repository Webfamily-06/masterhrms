"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SLUG_PATTERN = exports.SLUG_MAX_LENGTH = exports.SLUG_MIN_LENGTH = exports.RESERVED_WORKSPACE_SLUGS = void 0;
exports.getBaseDomain = getBaseDomain;
exports.getSuperAdminHost = getSuperAdminHost;
exports.validateWorkspaceSlug = validateWorkspaceSlug;
exports.suggestWorkspaceSlug = suggestWorkspaceSlug;
exports.resolveHostContext = resolveHostContext;
exports.getEffectiveRequestHost = getEffectiveRequestHost;
exports.getWorkspaceUrl = getWorkspaceUrl;
exports.getCustomDomainUrl = getCustomDomainUrl;
exports.getSuperAdminUrl = getSuperAdminUrl;
exports.getRootUrl = getRootUrl;
exports.getCachedWorkspace = getCachedWorkspace;
exports.setCachedWorkspace = setCachedWorkspace;
exports.invalidateWorkspaceCache = invalidateWorkspaceCache;
exports.getCachedCustomDomain = getCachedCustomDomain;
exports.setCachedCustomDomain = setCachedCustomDomain;
exports.invalidateCustomDomainCache = invalidateCustomDomainCache;
// ─────────────────────────────────────────────
// 1. CONFIGURATION HELPERS (DYNAMIC BASE_DOMAIN)
// ─────────────────────────────────────────────
/**
 * Returns the configured platform base domain.
 * Platform domain is configuration, NOT business logic.
 * Defaults to "localhost" in development if not explicitly configured.
 */
function getBaseDomain() {
    const configured = process.env.BASE_DOMAIN;
    if (configured && configured.trim().length > 0) {
        const trimmed = configured.trim().toLowerCase();
        if (process.env.NODE_ENV === "production" && (trimmed === "localhost" || trimmed === "127.0.0.1" || trimmed.endsWith(".localhost"))) {
            console.warn("[Production Security Warning] BASE_DOMAIN is set to loopback address in production. Falling back to canonical production domain.");
            return (process.env.PRODUCTION_FALLBACK_DOMAIN || "masterhrms.com").trim().toLowerCase();
        }
        return trimmed;
    }
    // Enforce production canonical domain when in production
    if (process.env.NODE_ENV === "production") {
        return (process.env.PRODUCTION_FALLBACK_DOMAIN || "masterhrms.com").trim().toLowerCase();
    }
    // Fallback to localhost if unset in development
    return "localhost";
}
/**
 * Returns the configured Super Admin host.
 * Defaults to super.{BASE_DOMAIN}.
 */
function getSuperAdminHost() {
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
exports.RESERVED_WORKSPACE_SLUGS = new Set([
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
exports.SLUG_MIN_LENGTH = 3;
exports.SLUG_MAX_LENGTH = 30;
// Lowercase alphanumeric and hyphens, cannot start or end with hyphen, no consecutive hyphens
exports.SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
function validateWorkspaceSlug(slug) {
    if (!slug || typeof slug !== "string") {
        return { valid: false, reason: "invalid" };
    }
    const trimmed = slug.trim();
    // Enforce lowercase
    if (trimmed !== trimmed.toLowerCase()) {
        return { valid: false, reason: "invalid" };
    }
    if (trimmed.length < exports.SLUG_MIN_LENGTH) {
        return { valid: false, reason: "too_short" };
    }
    if (trimmed.length > exports.SLUG_MAX_LENGTH) {
        return { valid: false, reason: "too_long" };
    }
    // No consecutive hyphens
    if (trimmed.includes("--")) {
        return { valid: false, reason: "consecutive_hyphens" };
    }
    // Regex check: lowercase letters, numbers, hyphens, cannot start/end with hyphen
    if (!exports.SLUG_PATTERN.test(trimmed)) {
        return { valid: false, reason: "invalid" };
    }
    // Reserved names blocked
    if (exports.RESERVED_WORKSPACE_SLUGS.has(trimmed.toLowerCase())) {
        return { valid: false, reason: "reserved" };
    }
    return { valid: true };
}
// ─────────────────────────────────────────────
// 4. SLUG SUGGESTION FROM COMPANY NAME
// ─────────────────────────────────────────────
function suggestWorkspaceSlug(companyName) {
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
    if (slug.length > exports.SLUG_MAX_LENGTH) {
        slug = slug.substring(0, exports.SLUG_MAX_LENGTH).replace(/-+$/, "");
    }
    // Pad if too short (minimum 3 chars)
    if (slug.length < exports.SLUG_MIN_LENGTH) {
        slug = (slug + "-co").substring(0, exports.SLUG_MAX_LENGTH).replace(/-+$/, "");
        if (slug.length < exports.SLUG_MIN_LENGTH) {
            slug = "workspace";
        }
    }
    // If suggested matches reserved word, append -org
    if (exports.RESERVED_WORKSPACE_SLUGS.has(slug)) {
        slug = (slug + "-org").substring(0, exports.SLUG_MAX_LENGTH);
    }
    return slug;
}
/**
 * Resolves the request context from the HTTP Host header.
 * Allows passing an optional baseDomainOverride (e.g. in tests).
 * Strips ports and normalizes case.
 */
function resolveHostContext(hostHeader, baseDomainOverride) {
    const baseDomain = (baseDomainOverride || getBaseDomain()).toLowerCase();
    const superHost = baseDomainOverride ? `super.${baseDomain}` : getSuperAdminHost();
    if (!hostHeader) {
        return { type: "public", baseDomain };
    }
    // Strip port from host header (e.g., "acme.localhost:5173" -> "acme.localhost")
    const hostname = hostHeader.split(":")[0].toLowerCase().trim();
    // ── Public / Root Hosts ────────────────────────────────────
    if (hostname === baseDomain ||
        hostname === `www.${baseDomain}` ||
        hostname === "127.0.0.1" ||
        hostname === "0.0.0.0") {
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
function getEffectiveRequestHost(headers) {
    const fwd = String(headers["x-forwarded-host"] || "").split(",")[0].trim();
    const host = fwd || String(headers.host || "");
    const ctx = resolveHostContext(host);
    const hostIsApiOwn = ctx.type === "public" ||
        ctx.type === "unknown" ||
        (ctx.type === "tenant" && exports.RESERVED_WORKSPACE_SLUGS.has(ctx.slug));
    if (!hostIsApiOwn)
        return host;
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
    if (!sourceUrl || sourceUrl === "null")
        return host;
    try {
        const sourceHost = new URL(sourceUrl).host;
        const octx = resolveHostContext(sourceHost);
        if (octx.type === "super")
            return sourceHost;
        if (octx.type === "tenant" && !exports.RESERVED_WORKSPACE_SLUGS.has(octx.slug))
            return sourceHost;
        if (octx.type === "custom_domain")
            return sourceHost;
    }
    catch {
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
function getWorkspaceUrl(slug, port, baseDomainOverride) {
    const base = (baseDomainOverride || getBaseDomain()).toLowerCase();
    const isDev = process.env.NODE_ENV !== "production";
    if (base === "localhost" || base.endsWith(".localhost")) {
        if (!isDev) {
            const prodDomain = (process.env.PRODUCTION_FALLBACK_DOMAIN || "masterhrms.com").trim().toLowerCase();
            return `https://${slug}.${prodDomain}`;
        }
        const defaultDevPort = process.env.FRONTEND_PORT ? parseInt(process.env.FRONTEND_PORT, 10) : 3000;
        const p = port || defaultDevPort;
        return p === 80 || p === 443 ? `http://${slug}.localhost` : `http://${slug}.localhost:${p}`;
    }
    const protocol = isDev ? "http" : "https";
    const portSuffix = isDev && port && port !== 80 && port !== 443 ? `:${port}` : "";
    return `${protocol}://${slug}.${base}${portSuffix}`;
}
/**
 * Returns the URL for a custom domain (Flow 2).
 */
function getCustomDomainUrl(domain, port) {
    const isDev = process.env.NODE_ENV !== "production";
    const protocol = isDev ? "http" : "https";
    const portSuffix = isDev && port && port !== 80 && port !== 443 ? `:${port}` : "";
    return `${protocol}://${domain}${portSuffix}`;
}
/**
 * Returns the Super Admin console URL on https://{BASE_DOMAIN}/super.
 */
function getSuperAdminUrl(port, baseDomainOverride) {
    const root = getRootUrl(port, baseDomainOverride);
    return `${root}/super`;
}
/**
 * Returns the root/public site URL.
 */
function getRootUrl(port, baseDomainOverride) {
    const base = (baseDomainOverride || getBaseDomain()).toLowerCase();
    const isDev = process.env.NODE_ENV !== "production";
    if (base === "localhost" || base.endsWith(".localhost")) {
        if (!isDev) {
            const prodDomain = (process.env.PRODUCTION_FALLBACK_DOMAIN || "masterhrms.com").trim().toLowerCase();
            return `https://${prodDomain}`;
        }
        const defaultDevPort = process.env.FRONTEND_PORT ? parseInt(process.env.FRONTEND_PORT, 10) : 3000;
        const p = port || defaultDevPort;
        return p === 80 || p === 443 ? `http://localhost` : `http://localhost:${p}`;
    }
    const protocol = isDev ? "http" : "https";
    const portSuffix = isDev && port && port !== 80 && port !== 443 ? `:${port}` : "";
    return `${protocol}://${base}${portSuffix}`;
}
const workspaceCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds
function getCachedWorkspace(slug) {
    const entry = workspaceCache.get(slug.toLowerCase());
    if (!entry)
        return null;
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
        workspaceCache.delete(slug.toLowerCase());
        return null;
    }
    return entry;
}
function setCachedWorkspace(slug, entry) {
    workspaceCache.set(slug.toLowerCase(), {
        ...entry,
        cachedAt: Date.now(),
    });
}
function invalidateWorkspaceCache(slug) {
    if (slug) {
        workspaceCache.delete(slug.toLowerCase());
    }
    else {
        workspaceCache.clear();
    }
}
const customDomainCache = new Map();
function getCachedCustomDomain(domain) {
    const entry = customDomainCache.get(domain.toLowerCase());
    if (!entry)
        return null;
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
        customDomainCache.delete(domain.toLowerCase());
        return null;
    }
    return entry;
}
function setCachedCustomDomain(domain, entry) {
    customDomainCache.set(domain.toLowerCase(), {
        ...entry,
        cachedAt: Date.now(),
    });
}
function invalidateCustomDomainCache(domain) {
    if (domain) {
        customDomainCache.delete(domain.toLowerCase());
    }
    else {
        customDomainCache.clear();
    }
}
