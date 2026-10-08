import { createFileRoute } from "@tanstack/react-router";
import { AttendancePage } from "../../_app/attendance";

export const Route = createFileRoute("/_authenticated/hr/attendance/")({
  component: AttendancePage,
  head: () => ({ meta: [{ title: "Attendance & Biometric Logs — Master HRMS" }] }),
});

export default AttendancePage;
