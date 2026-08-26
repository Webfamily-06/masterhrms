import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("hrms_auth_token");
      if (!token) {
        throw redirect({ to: "/auth" });
      }
    }
  },
  component: () => <Outlet />,
});
