import { createFileRoute, redirect } from "@tanstack/react-router";
import { extractRolesFromToken } from "@/lib/auth-navigation";

export const Route = createFileRoute("/_authenticated/_app/chat")({
  beforeLoad: () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("hrms_auth_token") : null;
    const { roles } = extractRolesFromToken(token);
    const isHrOrAdmin = roles.some((r) => ["admin", "super_admin", "tenant_admin", "hr_admin", "hr"].includes(r));
    throw redirect({ to: isHrOrAdmin ? "/hr/chat" : "/me/chat" });
  },
});
