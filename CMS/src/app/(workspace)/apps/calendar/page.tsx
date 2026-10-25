"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentProfile } from "@/lib/session";
import { UnifiedCalendarApp } from "@/components/calendar/unified-calendar-app";

export default function CalendarAppPage() {
  const router = useRouter();
  const { data: profile, isLoading } = useCurrentProfile();

  useEffect(() => {
    if (isLoading || !profile) return;
    const roles: string[] = Array.isArray(profile.roles) ? profile.roles : [];
    const normalized = roles.map((r) => String(r).toLowerCase().replace(/[-_ ]/g, ""));
    const isTenantAdmin = normalized.some((r) =>
      ["admin", "tenantadmin", "workspaceadmin", "organizationadmin", "owner", "superadmin"].includes(r)
    );
    const isHrAdmin = isTenantAdmin || normalized.some((r) => ["hradmin", "hr", "hrmanager", "manager"].includes(r));
    const isEmployeeOnly = !isHrAdmin && !isTenantAdmin;

    const query = typeof window !== "undefined" ? window.location.search : "";
    if (isEmployeeOnly) {
      router.replace(`/me/calendar${query}`);
    } else if (isHrAdmin && !isTenantAdmin) {
      router.replace(`/hr/calendar${query}`);
    } else if (isTenantAdmin) {
      router.replace(`/tenant/calendar${query}`);
    }
  }, [profile, isLoading, router]);

  return <UnifiedCalendarApp mode="apps" title="Applications Calendar" />;
}
