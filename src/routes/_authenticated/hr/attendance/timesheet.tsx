import { createFileRoute } from "@tanstack/react-router";
import HrAttendanceTimesheetsPage from "./timesheets";

export const Route = createFileRoute("/_authenticated/hr/attendance/timesheet")({
  component: HrAttendanceTimesheetsPage,
  head: () => ({
    meta: [{ title: "Timesheets Review — Master HRMS" }],
  }),
});

export default HrAttendanceTimesheetsPage;
