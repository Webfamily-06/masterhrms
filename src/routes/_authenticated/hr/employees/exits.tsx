import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/hr/employees/exits")({
  beforeLoad: () => {
    throw redirect({ to: "/hr/lifecycle/terminations" });
  },
});
