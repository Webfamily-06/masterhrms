/**
 * MASTERHRMS — Frontend Certificate Verification URL Resolver
 * Unified across TanStack SPA and Next.js CMS.
 */

export function getClientAppBaseUrl(): string {
  if (typeof window !== "undefined") {
    // In browser, current origin is always canonical
    return window.location.origin.replace(/\/+$/, "");
  }
  return "";
}

export function getCertificateVerificationRoute(): string {
  return "/verify-certificate";
}

export function resolveClientCertificateVerificationUrl(codeOrNumber: string): string {
  const base = getClientAppBaseUrl();
  const route = getCertificateVerificationRoute();
  const safeParam = encodeURIComponent(codeOrNumber ? codeOrNumber.trim() : "");
  return `${base}${route}?code=${safeParam}`;
}

