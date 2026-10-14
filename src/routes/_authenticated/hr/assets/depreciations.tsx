import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/hr/assets/depreciations")({
  beforeLoad: () => {
    throw redirect({ to: "/hr/assets/depreciation" as any });
  },
  component: () => null,
});
