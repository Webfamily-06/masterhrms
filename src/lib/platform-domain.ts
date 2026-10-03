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
