import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/hr/documents/requests")({
  beforeLoad: () => {
    throw redirect({ to: "/hr/documents/letters" as any });
  },
  component: () => null,
});
