import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/tenet")({
  beforeLoad: () => {
    throw redirect({ to: "/tenant/dashboard" });
  },
  component: () => null,
});
