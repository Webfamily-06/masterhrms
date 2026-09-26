import { createFileRoute } from "@tanstack/react-router";
import { Employees } from "./employees";

export const Route = createFileRoute("/_authenticated/_app/employee-details")({
  component: Employees,
  head: () => ({ meta: [{ title: "Employee Details Passport — Master HRMS" }] }),
});
