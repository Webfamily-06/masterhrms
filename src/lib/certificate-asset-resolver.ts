/**
 * MASTERHRMS — Canonical Certificate Asset URL Resolver
 * Unified across TanStack SPA and Next.js CMS.
 */

export function getCertificateAssetPreviewUrl(
  assetId?: string,
  fileId?: string,
  storagePath?: string
): string {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("hrms_auth_token") || localStorage.getItem("token") || ""
      : "";
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : "";

  if (assetId) {
    return `/api/certificate-studio/branding/${assetId}/preview${tokenParam}`;
  }
  if (fileId) {
    return `/api/v1/files/${fileId}/stream?inline=true${token ? `&token=${encodeURIComponent(token)}` : ""}`;
  }
  if (storagePath) {
    const cleanPath = storagePath.replace(/^\/+/, "");
    return `/uploads/${cleanPath}${tokenParam}`;
  }
  return "";
}

export function getSignatorySignaturePreviewUrl(
  signatoryId?: string,
  signatureAssetId?: string
): string {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("hrms_auth_token") || localStorage.getItem("token") || ""
      : "";
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : "";

  if (signatoryId) {
    return `/api/certificate-studio/signatories/${signatoryId}/signature-preview${tokenParam}`;
  }
  if (signatureAssetId) {
    return `/api/certificate-studio/branding/${signatureAssetId}/preview${tokenParam}`;
  }
  return "";
}
