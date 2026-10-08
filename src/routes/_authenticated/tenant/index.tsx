import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/tenant/")({
  beforeLoad: () => {
    throw redirect({ to: "/tenant/dashboard" });
  },
  component: () => null,
});
