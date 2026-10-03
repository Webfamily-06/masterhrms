import { getBaseDomain, RESERVED_WORKSPACE_SLUGS } from "./workspace-host";

export interface DomainValidationResult {
  valid: boolean;
  normalized?: string;
  subdomain?: string;
  apexDomain?: string;
  reason?:
    | "empty"
    | "invalid_characters"
    | "invalid_format"
    | "too_short"
    | "too_long"
    | "label_too_long"
    | "label_invalid"
    | "has_port"
    | "has_path_or_query"
    | "is_ip_address"
    | "is_platform_domain"
    | "is_reserved";
  message?: string;
}

/**
 * Normalizes input domain string by:
 * - Trimming whitespace
 * - Removing protocol if present (http://, https://, //)
 * - Removing trailing slash or single trailing dot
 * - Converting to lowercase
 *
 * Examples:
 *   "HTTPS://APP.ACME.COM/" -> "app.acme.com"
 *   "  portal.mycorp.org.  " -> "portal.mycorp.org"
 */
export function normalizeDomain(rawInput: string): string {
  if (!rawInput || typeof rawInput !== "string") {
    return "";
  }

  let cleaned = rawInput.trim();

  // Strip protocol/scheme if provided
  if (/^https?:\/\//i.test(cleaned)) {
    cleaned = cleaned.replace(/^https?:\/\//i, "");
  } else if (/^\/\//.test(cleaned)) {
    cleaned = cleaned.replace(/^\/\//, "");
  }

  // If path or query string was attached (e.g. "app.acme.com/login?foo=1"), take only hostname portion
  // (We will still validate against paths in validateDomain)
  cleaned = cleaned.split("/")[0].split("?")[0].split("#")[0];

  // Strip trailing dot
  if (cleaned.endsWith(".")) {
    cleaned = cleaned.slice(0, -1);
  }

  return cleaned.toLowerCase().trim();
}

/**
 * Strictly validates and normalizes a custom domain for a tenant workspace.
 */
export function validateCustomDomain(rawInput: string, baseDomainOverride?: string): DomainValidationResult {
  if (!rawInput || typeof rawInput !== "string") {
    return { valid: false, reason: "empty", message: "Domain name cannot be empty." };
  }

  const rawTrimmed = rawInput.trim();

  // Reject malicious schemes immediately
  if (/^(javascript|data|vbscript|file):/i.test(rawTrimmed)) {
    return { valid: false, reason: "invalid_characters", message: "Invalid domain protocol scheme." };
  }

  // Check for paths, queries, fragments in raw input before normalization
  if (rawTrimmed.includes("/") && !/^https?:\/\/[^\/]+\/?$/i.test(rawTrimmed)) {
    return { valid: false, reason: "has_path_or_query", message: "Domain name cannot include paths or subdirectories." };
  }
  if (rawTrimmed.includes("?") || rawTrimmed.includes("#")) {
    return { valid: false, reason: "has_path_or_query", message: "Domain name cannot include query parameters or fragments." };
  }

  // Check for ports (e.g., "app.acme.com:8080" or "https://app.acme.com:8080/")
  const withoutScheme = rawTrimmed.replace(/^https?:\/\//i, "").replace(/^\/\//, "");
  if (withoutScheme.split("/")[0].includes(":")) {
    return { valid: false, reason: "has_port", message: "Custom domains cannot include port numbers." };
  }

  const normalized = normalizeDomain(rawInput);

  if (!normalized) {
    return { valid: false, reason: "empty", message: "Domain name cannot be empty." };
  }

  if (normalized.length > 253) {
    return { valid: false, reason: "too_long", message: "Domain name exceeds maximum length of 253 characters." };
  }

  // Check if it is an IPv4 or IPv6 address
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Pattern.test(normalized) || normalized.includes("::") || normalized === "127.0.0.1") {
    return { valid: false, reason: "is_ip_address", message: "IP addresses are not permitted as custom domains." };
  }

  // Domain must contain at least one dot (domain + TLD, e.g., "company.com" or "app.company.com")
  if (!normalized.includes(".")) {
    return { valid: false, reason: "invalid_format", message: "Domain must include a valid top-level domain (TLD)." };
  }

  // Cannot start or end with a dot or hyphen
  if (normalized.startsWith(".") || normalized.endsWith(".") || normalized.startsWith("-") || normalized.endsWith("-")) {
    return { valid: false, reason: "invalid_format", message: "Domain cannot start or end with a dot or hyphen." };
  }

  // Check labels separated by dots
  const labels = normalized.split(".");
  if (labels.length < 2) {
    return { valid: false, reason: "invalid_format", message: "Domain must have at least two labels (e.g., example.com)." };
  }

  for (const label of labels) {
    if (!label || label.length === 0) {
      return { valid: false, reason: "invalid_format", message: "Domain contains empty label (consecutive dots)." };
    }
    if (label.length > 63) {
      return { valid: false, reason: "label_too_long", message: `Domain label "${label}" exceeds 63 characters.` };
    }
    if (label.startsWith("-") || label.endsWith("-")) {
      return { valid: false, reason: "label_invalid", message: `Domain label "${label}" cannot start or end with a hyphen.` };
    }
    // Only lowercase letters, digits, and hyphens
    if (!/^[a-z0-9-]+$/.test(label)) {
      return { valid: false, reason: "invalid_characters", message: `Domain contains invalid characters in label "${label}".` };
    }
  }

  // Verify TLD (last label) is not purely numeric and has at least 2 chars
  const tld = labels[labels.length - 1];
  if (/^\d+$/.test(tld) || tld.length < 2) {
    return { valid: false, reason: "invalid_format", message: "Top-level domain (TLD) is invalid." };
  }

  // Platform Domain collision checks:
  const baseDomain = (baseDomainOverride || getBaseDomain()).toLowerCase();

  // Cannot be base domain itself or localhost
  if (normalized === baseDomain || normalized === `www.${baseDomain}` || normalized === "localhost") {
    return { valid: false, reason: "is_platform_domain", message: "Cannot claim the platform root domain." };
  }

  // Cannot be a subdomain of baseDomain (Flow 1 handles *.baseDomain, e.g. acme.masterhrms.com)
  if (baseDomain !== "localhost" && (normalized.endsWith(`.${baseDomain}`) || normalized === baseDomain)) {
    return {
      valid: false,
      reason: "is_platform_domain",
      message: `Domains ending in .${baseDomain} are reserved for Flow 1 default subdomains.`,
    };
  }

  // Cannot be super admin domain
  if (normalized === `super.${baseDomain}` || normalized === "super.localhost") {
    return { valid: false, reason: "is_reserved", message: "This hostname is reserved for platform governance." };
  }

  // Derive subdomain and apexDomain
  const subdomain = labels.length > 2 ? labels.slice(0, -2).join(".") : undefined;
  const apexDomain = labels.slice(-2).join(".");

  return {
    valid: true,
    normalized,
    subdomain,
    apexDomain,
  };
}
