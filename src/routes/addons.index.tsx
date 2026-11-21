import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/addons/")({
  beforeLoad: () => {
    throw redirect({ to: "/tenant/addon" });
  },
  component: () => null,
});
