import { createFileRoute, redirect } from "@tanstack/react-router";
import { getClientAuthState } from "@/lib/route-guards";
import { ClassicCalendarApp } from "@/components/apps/calendar/classic-calendar-app";

export const Route = createFileRoute("/_authenticated/_app/apps/calendar")({
  beforeLoad: () => {
    const auth = getClientAuthState();
    if (auth.token) {
      if (auth.isTenantAdmin) throw redirect({ to: "/tenant/calendar" as any });
      const hasHrRole = auth.roles.some((r) => ["hr_admin", "hr_manager", "manager", "hr", "admin"].includes(r));
      if (hasHrRole) throw redirect({ to: "/hr/calendar" as any });
      throw redirect({ to: "/me/calendar" as any });
    }
  },
  component: AppsCalendarPage,
  head: () => ({ meta: [{ title: "Company Calendar — Master HRMS" }] }),
});

export function AppsCalendarPage() {
  return <ClassicCalendarApp />;
}

export default AppsCalendarPage;
