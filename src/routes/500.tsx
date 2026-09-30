import { createFileRoute } from "@tanstack/react-router";
import { ServerErrorView } from "@/components/error-pages/server-error-view";

export const Route = createFileRoute("/500")({
  component: () => (
    <ServerErrorView
      customTitle="Oops, something went wrong"
      customMessage="Server Error 500. We apologise and are fixing the problem. Please try again at a later stage"
    />
  ),
  head: () => ({
    meta: [{ title: "500 Internal Server Error - Master ERP" }],
  }),
});
