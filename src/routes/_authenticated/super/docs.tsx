import { createFileRoute } from "@tanstack/react-router";
import { DocsPortalPage } from "@/routes/docs";

export const Route = createFileRoute("/_authenticated/super/docs")({
  component: () => <DocsPortalPage embedded={true} />,
});
