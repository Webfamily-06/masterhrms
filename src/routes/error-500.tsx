import { createFileRoute } from "@tanstack/react-router";
import { ServerErrorView } from "@/components/error-pages/server-error-view";

export const Route = createFileRoute("/error-500")({
  component: () => (
    <ServerErrorView
      customTitle="Oops, something went wrong"
      customMessage="Server Error 500. We apologise and are fixing the problem. Please try again at a later stage"
    />
  ),
  head: () => ({
    meta: [{ title: "Error 500 - Server Error" }],
  }),
});
