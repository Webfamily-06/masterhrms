import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/media")({
  beforeLoad: () => {
    // Legacy route forward: redirect /media to canonical HR File Manager
    throw redirect({ to: "/hr/files" });
  },
});
