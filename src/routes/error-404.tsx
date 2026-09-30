import { createFileRoute } from "@tanstack/react-router";
import { NotFoundView } from "@/components/error-pages/not-found-view";

export const Route = createFileRoute("/error-404")({
  component: () => <NotFoundView />,
  head: () => ({
    meta: [{ title: "Error 404 - Page Not Found" }],
  }),
});
