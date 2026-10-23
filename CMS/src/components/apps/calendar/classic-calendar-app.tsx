"use client";

import { UnifiedCalendarApp, CalendarEventItem } from "@/components/calendar/unified-calendar-app";

export { UnifiedCalendarApp };
export type { CalendarEventItem };

export function ClassicCalendarApp() {
  return <UnifiedCalendarApp mode="apps" title="Applications Calendar" />;
}

export default ClassicCalendarApp;
