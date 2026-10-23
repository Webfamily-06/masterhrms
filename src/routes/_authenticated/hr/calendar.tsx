import { createFileRoute } from "@tanstack/react-router";
import { UnifiedCalendarApp } from "@/components/calendar/unified-calendar-app";

export const Route = createFileRoute("/_authenticated/hr/calendar")({
  component: HrCalendarPage,
  head: () => ({ meta: [{ title: "Company Calendar & Schedules — Master HRMS" }] }),
});

export function HrCalendarPage() {
  return <UnifiedCalendarApp mode="hr" title="Company Calendar" />;
}

export default HrCalendarPage;
