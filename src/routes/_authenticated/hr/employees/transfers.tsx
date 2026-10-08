import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/hr/employees/transfers")({
  beforeLoad: () => {
    throw redirect({ to: "/hr/lifecycle/transfers" });
  },
});
