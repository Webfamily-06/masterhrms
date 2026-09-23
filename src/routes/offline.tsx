import { createFileRoute } from "@tanstack/react-router";
import { OfflineView } from "@/components/error-pages/offline-view";

export const Route = createFileRoute("/offline")({
  component: () => <OfflineView />,
  head: () => ({
    meta: [{ title: "Offline Mode - Master ERP" }],
  }),
});
