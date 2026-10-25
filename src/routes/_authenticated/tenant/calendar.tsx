import { createFileRoute } from "@tanstack/react-router";
import { UnifiedCalendarApp } from "@/components/calendar/unified-calendar-app";

export const Route = createFileRoute("/_authenticated/tenant/calendar")({
  component: TenantCalendarPage,
  head: () => ({ meta: [{ title: "Workspace Calendar — Master HRMS" }] }),
});

export function TenantCalendarPage() {
  return <UnifiedCalendarApp mode="canonical" title="Workspace Calendar" />;
}

export default TenantCalendarPage;
