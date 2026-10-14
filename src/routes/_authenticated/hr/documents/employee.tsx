import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/hr/documents/employee")({
  beforeLoad: () => {
    throw redirect({ to: "/hr/documents/contracts" as any });
  },
  component: () => null,
});
