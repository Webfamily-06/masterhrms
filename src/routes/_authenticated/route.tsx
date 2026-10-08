import { createFileRoute, Outlet, redirect, notFound } from "@tanstack/react-router";
import { isTenantWorkspaceHost } from "@/lib/platform-domain";

/**
 * /_authenticated layout guard.
 *
 * Responsibilities:
 *  1. Block super-admin routes on tenant subdomains.
 *  2. Redirect unauthenticated users to /auth.
 *  3. After authentication, check server-authoritative onboarding state:
 *     - Tenant user with no completed onboarding  → redirect to /onboarding
 *     - Tenant user already onboarded on /onboarding → redirect to /hrm-dashboard
 *
 * NOTE: The onboarding status check is intentionally lightweight (GET) and
 * only runs on pages other than /auth and /onboarding to avoid loops.
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
      // Root domain /super renders the Super Admin Login UI directly — do not redirect
      if (!isTenant && path.startsWith("/super")) return;
      throw redirect({ to: "/auth" });
    }

    // Rule 3: Onboarding state (only for tenant sessions, skip the check on /onboarding itself)
    // The /onboarding page does its own server check and handles the already-onboarded case.
    // Here we only enforce the forward-guard: tenant + no onboarding → send to wizard.
    if (isTenant && !path.startsWith("/onboarding")) {
      try {
        const res = await fetch("/api/workspace/onboarding-status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          // hasTenant && not yet onboarded → send to wizard
          if (data.hasTenant === true && data.isOnboarded === false) {
            throw redirect({ to: "/onboarding" });
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
