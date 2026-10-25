"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentProfile } from "@/lib/session";
import { UnifiedTodoApp } from "@/components/todo/unified-todo-app";

export default function GanttTimelinePage() {
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
      router.replace(`/me/todo/gantt${query}`);
    } else if (isHrAdmin && !isTenantAdmin) {
      router.replace(`/hr/todo/gantt${query}`);
    } else if (isTenantAdmin) {
      router.replace(`/tenant/todo/gantt${query}`);
    }
  }, [profile, isLoading, router]);

  return <UnifiedTodoApp initialView="gantt" mode="apps" title="Todo Gantt Timeline" />;
}
