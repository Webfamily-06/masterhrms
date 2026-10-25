import { createFileRoute } from "@tanstack/react-router";
import { UnifiedCalendarApp } from "@/components/calendar/unified-calendar-app";

export const Route = createFileRoute("/_authenticated/me/calendar")({
  component: EmployeeCalendarPage,
  head: () => ({ meta: [{ title: "My Schedules & Calendar — Master HRMS" }] }),
});

export function EmployeeCalendarPage() {
  return <UnifiedCalendarApp mode="hr" title="My Schedules & Calendar" />;
}

export default EmployeeCalendarPage;
