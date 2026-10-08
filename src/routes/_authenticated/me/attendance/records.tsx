import { createFileRoute } from "@tanstack/react-router";
import { EmployeeAttendancePage } from "../../_app/attendance-employee";

export const Route = createFileRoute("/_authenticated/me/attendance/records")({
  component: EmployeeAttendancePage,
  head: () => ({ meta: [{ title: "My Attendance Matrix — Master HRMS" }] }),
});

export default EmployeeAttendancePage;
