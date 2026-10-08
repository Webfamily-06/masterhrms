import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/media")({
  beforeLoad: () => {
    // Legacy route forward: redirect /media to canonical HR Media Library
    throw redirect({ to: "/hr/media" });
  },
});
