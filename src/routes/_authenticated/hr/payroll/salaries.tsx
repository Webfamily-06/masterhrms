import { createFileRoute } from "@tanstack/react-router";
import HrEmployeeSalariesPage from "./employee-salaries";

export const Route = createFileRoute("/_authenticated/hr/payroll/salaries")({
  component: HrEmployeeSalariesPage,
  head: () => ({
    meta: [{ title: "Employee Salaries & Revisions — Master HRMS" }],
  }),
});

export default HrEmployeeSalariesPage;
