export interface DomainValidationResult {
  valid: boolean;
  normalized?: string;
  subdomain?: string;
  apexDomain?: string;
  reason?: string;
  message?: string;
}

export function normalizeDomain(rawInput: string): string {
  if (!rawInput || typeof rawInput !== "string") {
    return "";
  }

  let cleaned = rawInput.trim();

  if (/^https?:\/\//i.test(cleaned)) {
    cleaned = cleaned.replace(/^https?:\/\//i, "");
  } else if (/^\/\//.test(cleaned)) {
    cleaned = cleaned.replace(/^\/\//, "");
  }

  cleaned = cleaned.split("/")[0].split("?")[0].split("#")[0];

  if (cleaned.endsWith(".")) {
    cleaned = cleaned.slice(0, -1);
  }

  return cleaned.toLowerCase().trim();
}

export function validateCustomDomain(rawInput: string, platformBaseDomain = "localhost"): DomainValidationResult {
  if (!rawInput || typeof rawInput !== "string") {
    return { valid: false, reason: "empty", message: "Domain name cannot be empty." };
  }

  const rawTrimmed = rawInput.trim();

  if (/^(javascript|data|vbscript|file):/i.test(rawTrimmed)) {
    return { valid: false, reason: "invalid_characters", message: "Invalid domain protocol scheme." };
  }

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

  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Pattern.test(normalized) || normalized.includes("::") || normalized === "127.0.0.1") {
    return { valid: false, reason: "is_ip_address", message: "IP addresses are not permitted as custom domains." };
  }

  if (!normalized.includes(".")) {
    return { valid: false, reason: "invalid_format", message: "Domain must include a valid top-level domain (e.g., example.com)." };
  }

  if (normalized.startsWith(".") || normalized.endsWith(".") || normalized.startsWith("-") || normalized.endsWith("-")) {
    return { valid: false, reason: "invalid_format", message: "Domain cannot start or end with a dot or hyphen." };
  }

  const labels = normalized.split(".");
  if (labels.length < 2) {
    return { valid: false, reason: "invalid_format", message: "Domain must have at least two labels (e.g., app.company.com)." };
  }

  for (const label of labels) {
    if (!label || label.length === 0) {
      return { valid: false, reason: "invalid_format", message: "Domain contains consecutive dots." };
    }
    if (label.length > 63) {
      return { valid: false, reason: "label_too_long", message: `Domain label "${label}" exceeds 63 characters.` };
    }
    if (label.startsWith("-") || label.endsWith("-")) {
      return { valid: false, reason: "label_invalid", message: `Domain label "${label}" cannot start or end with a hyphen.` };
    }
    if (!/^[a-z0-9-]+$/.test(label)) {
      return { valid: false, reason: "invalid_characters", message: `Domain contains invalid characters in label "${label}".` };
    }
  }

  const tld = labels[labels.length - 1];
  if (/^\d+$/.test(tld) || tld.length < 2) {
    return { valid: false, reason: "invalid_format", message: "Top-level domain (TLD) is invalid." };
  }

  const base = platformBaseDomain.toLowerCase();
  if (normalized === base || normalized === `www.${base}` || normalized === "localhost") {
    return { valid: false, reason: "is_platform_domain", message: "Cannot claim the platform root domain." };
  }

  if (base !== "localhost" && (normalized.endsWith(`.${base}`) || normalized === base)) {
    return {
      valid: false,
      reason: "is_platform_domain",
      message: `Domains ending in .${base} are reserved for default workspace subdomains.`,
    };
  }

  if (normalized === `super.${base}` || normalized === "super.localhost") {
    return { valid: false, reason: "is_reserved", message: "This hostname is reserved for platform governance." };
  }

  const subdomain = labels.length > 2 ? labels.slice(0, -2).join(".") : undefined;
  const apexDomain = labels.slice(-2).join(".");

  return {
    valid: true,
    normalized,
    subdomain,
    apexDomain,
  };
}
