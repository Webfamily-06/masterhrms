import { createFileRoute } from "@tanstack/react-router";
import { ClassicCalendarApp } from "@/components/apps/calendar/classic-calendar-app";

export const Route = createFileRoute("/_authenticated/_app/apps/calendar")({
  component: AppsCalendarPage,
  head: () => ({ meta: [{ title: "Company Calendar — Master HRMS" }] }),
});

export function AppsCalendarPage() {
  return <ClassicCalendarApp />;
}

export default AppsCalendarPage;
