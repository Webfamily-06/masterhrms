import { createFileRoute } from "@tanstack/react-router";
import { ServerErrorView } from "@/components/error-pages/server-error-view";

export const Route = createFileRoute("/500")({
  component: () => (
    <ServerErrorView
      error={new Error("Simulated 500 Server Error: Application database connection pool interrupted.")}
      customTitle="500 - Internal Server Error"
      customMessage="Our server encountered an unexpected error or database interruption while processing your request."
    />
  ),
  head: () => ({
    meta: [{ title: "500 Internal Server Error - Master ERP" }],
  }),
});
