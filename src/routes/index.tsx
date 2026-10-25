import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // The authoritative public CMS and landing page is owned by CMS/ (Next.js).
    // Within the Vite/TanStack workspace application, root "/" resolves directly
    // to the workspace dashboard for authenticated sessions, or /auth for login.
    const token = typeof window !== "undefined" ? localStorage.getItem("hrms_auth_token") : null;
    if (token) {
      throw redirect({ to: "/_authenticated/_app/hrm-dashboard" });
    }
    throw redirect({ to: "/auth" });
  },
  component: () => null,
});
