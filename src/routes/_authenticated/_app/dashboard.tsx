import { createFileRoute, redirect } from "@tanstack/react-router";
import { extractRolesFromToken, resolveDefaultRoute } from "@/lib/auth-navigation";

export const Route = createFileRoute("/_authenticated/_app/dashboard")({
  beforeLoad: () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("hrms_auth_token") : null;
    const { roles } = extractRolesFromToken(token);
    const target = resolveDefaultRoute(roles);
    throw redirect({ to: target as any, replace: true });
  },
  component: () => null,
});
