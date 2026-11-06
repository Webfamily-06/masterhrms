import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCurrentProfile } from "@/lib/session";
import { LoadingState } from "@/components/system-states/loading-state";

export const Route = createFileRoute("/_authenticated/_app/awards")({
  component: AwardsRoleAwareRedirectPage,
  head: () => ({ meta: [{ title: "Awards & Recognitions — Master HRMS" }] }),
});

export function AwardsRoleAwareRedirectPage() {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useCurrentProfile();

  useEffect(() => {
    if (isLoading) return;

    if (!profile) {
      navigate({ to: "/login", replace: true });
      return;
    }

    const roles = profile.roles || [];
    const permissions = profile.permissions || [];
    const isHRAuthorized =
      permissions.includes("*") ||
      permissions.includes("hrm.awards.manage") ||
      permissions.includes("hrm.awards.view") ||
      permissions.includes("hrm.employees.view") ||
      roles.some((r: string) =>
        ["admin", "super_admin", "tenant_admin", "hr_admin", "hr_manager", "manager", "Workspace Admin"].includes(r)
      );

    if (isHRAuthorized) {
      navigate({ to: "/hr/awards", replace: true });
    } else {
      navigate({ to: "/me/awards", replace: true });
    }
  }, [profile, isLoading, navigate]);

  return <LoadingState message="Redirecting to your role-specific awards workspace..." />;
}