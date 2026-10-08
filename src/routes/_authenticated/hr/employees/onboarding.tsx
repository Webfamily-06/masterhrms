import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/hr/employees/onboarding")({
  beforeLoad: () => {
    throw redirect({ to: "/hr/recruitment/onboarding" });
  },
});
