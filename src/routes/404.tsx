import { createFileRoute } from "@tanstack/react-router";
import { NotFoundView } from "@/components/error-pages/not-found-view";

export const Route = createFileRoute("/404")({
  component: () => <NotFoundView />,
  head: () => ({
    meta: [{ title: "404 Page Not Found - Master ERP" }],
  }),
});
