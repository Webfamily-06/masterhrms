/**
 * Role-Based Portal Redirection & Navigation Engine
 * Resolves the authenticated user's landing page based on verified server-side roles.
 */

export function extractRolesFromToken(token?: string | null): { roles: string[]; isImpersonating?: boolean } {
  if (!token) return { roles: [] };
  try {
    const parts = token.split(".");
    if (parts.length < 2) return { roles: [] };
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    return {
      roles: Array.isArray(payload.roles) ? payload.roles : [],
      isImpersonating: Boolean(payload.isImpersonating),
    };
  } catch {
    return { roles: [] };
  }
}

export function resolveDefaultRoute(
  roles: string[] = [],
  redirect?: string | null,
  options?: { isImpersonating?: boolean }
): string {
  // If an explicit intended redirect path was provided (e.g. following a deep-link), respect it
  // unless it points back to an authentication screen or root
  if (
    redirect &&
    redirect !== "/" &&
    redirect !== "/auth" &&
    redirect !== "/login" &&
    redirect !== "/super-login" &&
    !redirect.startsWith("/auth")
  ) {
    return redirect;
  }

  // If super admin is impersonating a tenant, preserve tenant landing (/hrm-dashboard)
  const isImpersonating =
    options?.isImpersonating ??
    (typeof window !== "undefined" && localStorage.getItem("hrms_impersonation_active") === "true");

  if (isImpersonating) {
    return "/hrm-dashboard";
  }

  // Super Admin Portal
  if (roles.includes("super_admin")) {
    return "/super";
  }

  // Client Portal (B2B Customers)
  if (roles.includes("client")) {
    return "/client-dashboard";
  }

  // Employee Self-Service (Workforce)
  if (roles.includes("employee")) {
    return "/me/dashboard";
  }

  // Tenant / Vendor Admin (Default ERP Command Center)
  return "/hrm-dashboard";
}
