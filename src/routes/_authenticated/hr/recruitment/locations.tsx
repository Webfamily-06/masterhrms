import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/hr/recruitment/locations")({
  beforeLoad: () => {
    throw redirect({ to: "/hr/recruitment/job-locations" as any });
  },
  component: () => null,
});
