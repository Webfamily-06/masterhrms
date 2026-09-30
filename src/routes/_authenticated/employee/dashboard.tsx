import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/employee/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/employee-dashboard" });
  },
  component: () => null,
});
