import { createFileRoute } from "@tanstack/react-router";
import HrEmployeeTrainingsPage from "./employee-trainings";

export const Route = createFileRoute("/_authenticated/hr/training/trainings")({
  component: HrEmployeeTrainingsPage,
  head: () => ({
    meta: [{ title: "Employee Trainings — Master HRMS" }],
  }),
});

export default HrEmployeeTrainingsPage;
