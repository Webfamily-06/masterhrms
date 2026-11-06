'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentProfile } from "@/lib/session";
import { LoadingState } from "@/components/system-states/loading-state";

export default function AwardsRoleAwareRedirectPage() {
  const router = useRouter();
  const { data: profile, isLoading } = useCurrentProfile();

  useEffect(() => {
    if (isLoading) return;

    if (!profile) {
      router.replace("/login");
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
      router.replace("/hr/awards");
    } else {
      router.replace("/me/awards");
    }
  }, [profile, isLoading, router]);

  return <LoadingState message="Redirecting to your role-specific awards workspace..." />;
}