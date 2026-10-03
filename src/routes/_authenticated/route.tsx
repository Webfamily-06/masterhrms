import { createFileRoute, Outlet, redirect, notFound } from "@tanstack/react-router";
import { isTenantWorkspaceHost } from "@/lib/platform-domain";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (typeof window !== "undefined") {
      const isTenant = isTenantWorkspaceHost();
      if (isTenant && location.pathname.toLowerCase().startsWith("/super")) {
        throw notFound();
      }

      const token = localStorage.getItem("hrms_auth_token");
      if (!token) {
        // Do not redirect /super to /auth on ROOT domain — /super renders the Super Admin Login UI directly
        if (!isTenant && location.pathname.toLowerCase().startsWith("/super")) {
          return;
        }
        throw redirect({ to: "/auth" });
      }
    }
  },
  component: () => <Outlet />,
});
