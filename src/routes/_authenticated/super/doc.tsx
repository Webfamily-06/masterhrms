import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/super/doc")({
  beforeLoad: () => {
    throw redirect({ to: "/super/docs" });
  },
  component: () => null,
});
