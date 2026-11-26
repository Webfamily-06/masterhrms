/**
 * Workspace Resolution Engine (Host-Based / Subdomain & Custom Domain)
 * 
 * Flow 1: {workspace}.{BASE_DOMAIN} (Subdomain)
 * Flow 2: {custom-domain} (Verified Custom Domain)
 */

import { getPlatformBaseDomain, isTenantWorkspaceHost } from "./platform-domain";
import { api } from "./api";

export interface WorkspacePublicConfig {
  resolved: boolean;
  id?: string;
  name: string;
  slug: string;
  logoUrl?: string;
  logoDark?: string;
  faviconUrl?: string;
  primaryColor?: string;
  timezone?: string;
  isDemo?: boolean;
  status?: string;
  authMethods?: {
    emailPassword: boolean;
    googleSso: boolean;
    samlSso: boolean;
  };
}

/**
 * Extracts the workspace slug from the hostname.
 * Strips .{BASE_DOMAIN} or .localhost.
 */
export function extractWorkspaceSlug(hostname?: string): string | null {
  if (typeof window === "undefined" && !hostname) return null;
  const host = (hostname || (typeof window !== "undefined" ? window.location.hostname : ""))
    .toLowerCase()
    .split(":")[0]
    .trim();

  if (!host) return null;
  const baseDomain = getPlatformBaseDomain().toLowerCase();

  // Root or platform hosts
  if (
    host === baseDomain ||
    host === `www.${baseDomain}` ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    (baseDomain === "localhost" && host === "localhost") ||
    host === `super.${baseDomain}` ||
    host === "super.localhost"
  ) {
    return null;
  }

  // Subdomain matching
  if (host.endsWith(`.${baseDomain}`)) {
    const slug = host.slice(0, -(baseDomain.length + 1));
    return slug && slug !== "www" && slug !== "super" ? slug : null;
  }
  if (host.endsWith(".localhost")) {
    const slug = host.slice(0, -".localhost".length);
    return slug && slug !== "www" && slug !== "super" ? slug : null;
  }

  // Custom domain: returns the host itself
  return host;
}