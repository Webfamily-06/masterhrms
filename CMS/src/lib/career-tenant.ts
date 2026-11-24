"use client";

/**
 * Resolves the tenant slug for the public Careers portal from:
 *  1. ?tenant=<slug> query parameter
 *  2. Subdomain of window.location.hostname (e.g. acme.masterhrms.com -> "acme", acme.localhost -> "acme")
 *  3. Fallback to "default" (backend resolves the active default tenant)
 */
const RESERVED_SUBDOMAINS = new Set(["www", "app", "super", "api", "admin", "localhost"]);

export function resolveCareerTenantSlug(searchTenant?: string | null): string {
  if (searchTenant && searchTenant.trim() && searchTenant !== "default") {
    return searchTenant.trim().toLowerCase();
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    // Skip IP addresses
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return "default";
    const parts = host.split(".");
    // e.g. acme.localhost (2 parts ending in localhost)
    if (parts.length === 2 && parts[1] === "localhost" && !RESERVED_SUBDOMAINS.has(parts[0])) {
      return parts[0];
    }
    // e.g. acme.masterhrms.com (3+ parts)
    if (parts.length >= 3 && !RESERVED_SUBDOMAINS.has(parts[0])) {
      return parts[0];
    }
  }
  return "default";
}

export function buildTenantCareerUrl(tenantSlug?: string | null, path = "/careers"): string {
  if (typeof window === "undefined") return path;
  const { protocol, hostname, port } = window.location;
  const portSuffix = port ? `:${port}` : "";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  if (!tenantSlug || tenantSlug === "default") {
    return `${protocol}//${hostname}${portSuffix}${cleanPath}`;
  }

  const slug = tenantSlug.trim().toLowerCase();
  const hostLower = hostname.toLowerCase();

  // Already on this tenant's subdomain
  if (hostLower.startsWith(`${slug}.`)) {
    return `${protocol}//${hostname}${portSuffix}${cleanPath}`;
  }

  // Localhost dev -> {slug}.localhost:3000/careers
  if (hostLower === "localhost" || hostLower === "127.0.0.1") {
    return `${protocol}//${slug}.localhost${portSuffix}${cleanPath}`;
  }

  // Production domain -> {slug}.{rootDomain}/careers
  const parts = hostLower.split(".");
  const baseDomain = parts.length >= 3 ? parts.slice(1).join(".") : hostLower;
  return `${protocol}//${slug}.${baseDomain}${portSuffix}${cleanPath}`;
}

export function formatCareerSalary(min?: number | string | null, max?: number | string | null): string {
  const nMin = Number(min || 0);
  const nMax = Number(max || 0);
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  if (nMin > 0 && nMax > 0) return `${fmt(nMin)} - ${fmt(nMax)}`;
  if (nMin > 0) return `From ${fmt(nMin)}`;
  if (nMax > 0) return `Up to ${fmt(nMax)}`;
  return "Competitive";
}
