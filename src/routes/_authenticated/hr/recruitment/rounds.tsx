import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/hr/recruitment/rounds")({
  beforeLoad: () => {
    throw redirect({ to: "/hr/recruitment/interview-rounds" as any });
  },
  component: () => null,
});
