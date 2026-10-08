import { createFileRoute, Outlet, redirect, notFound } from "@tanstack/react-router";
import { isTenantWorkspaceHost } from "@/lib/platform-domain";
import { extractRolesFromToken } from "@/lib/auth-navigation";

/**
 * /_authenticated layout guard.
 *
 * Responsibilities:
 *  1. Block super-admin routes on tenant subdomains.
 *  2. Redirect unauthenticated users to /auth.
 *  3. After authentication, check server-authoritative onboarding state:
 *     - Tenant admin with no completed onboarding → redirect to /onboarding
 *     - Employees and non-admins NEVER get forced to onboarding wizard
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;

    const isTenant = isTenantWorkspaceHost();
    const path = location.pathname.toLowerCase();

    // Rule 1: Super-admin routes are invisible on tenant subdomains
    if (isTenant && path.startsWith("/super")) {
      throw notFound();
    }

    // Rule 2: Token gate
    const token = localStorage.getItem("hrms_auth_token");
    if (!token) {
      // Root domain /super redirects to dedicated /super06 login
      if (!isTenant && path.startsWith("/super")) {
        throw redirect({ to: "/super06" });
      }
      throw redirect({ to: "/auth" });
    }

    // Rule 3: Onboarding state (only for tenant admin sessions, skip the check on /onboarding itself)
    if (isTenant && !path.startsWith("/onboarding")) {
      try {
        const res = await fetch("/api/workspace/onboarding-status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          // hasTenant && not yet onboarded → send to wizard ONLY if user is a tenant admin
          if (data.hasTenant === true && data.isOnboarded === false) {
            const { roles } = extractRolesFromToken(token);
            const isTenantAdmin = roles.some((r) =>
              ["admin", "tenant_admin", "workspace_admin", "super_admin"].includes(r)
            );
            if (isTenantAdmin) {
              throw redirect({ to: "/onboarding" });
            }
          }
        }
      } catch (err: any) {
        // If it's a TanStack redirect, re-throw it; otherwise fail open
        if (err?.isRedirect) throw err;
      }
    }
  },
  component: () => <Outlet />,
});
