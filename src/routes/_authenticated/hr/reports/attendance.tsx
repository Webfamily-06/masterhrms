import { createFileRoute } from "@tanstack/react-router";
import { AttendanceReportPage } from "@/routes/_authenticated/_app/attendance-report";

export const Route = createFileRoute("/_authenticated/hr/reports/attendance")({
  component: AttendanceReportPage,
  head: () => ({
    meta: [{ title: "Attendance Report — HR Management — Master HRMS" }],
  }),
});

export default AttendanceReportPage;
