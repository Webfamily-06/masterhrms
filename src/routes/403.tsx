import { createFileRoute } from "@tanstack/react-router";
import { ForbiddenView } from "@/components/error-pages/forbidden-view";

export const Route = createFileRoute("/403")({
  component: () => <ForbiddenView />,
  head: () => ({
    meta: [{ title: "403 Forbidden - Access Denied - Master ERP" }],
  }),
});
