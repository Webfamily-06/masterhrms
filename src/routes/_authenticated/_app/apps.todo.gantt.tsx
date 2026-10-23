import { createFileRoute } from "@tanstack/react-router";
import { GanttTimelineView } from "@/components/todo/gantt-timeline-view";
import { PageHeader } from "@/components/ui/page-header";

export const Route = createFileRoute("/_authenticated/_app/apps/todo/gantt")({
  component: GanttAppPage,
  head: () => ({ meta: [{ title: "Interactive Gantt Timeline — Master HRMS" }] }),
});

export function GanttAppPage() {
  return (
    <div className="space-y-6 max-w-full pb-16">
      <PageHeader
        title="Todo Gantt Timeline"
        description="Visualize task schedules, update deadlines, and track execution progress interactively."
        breadcrumbs={[
          { label: "Dashboard", href: "/hr/dashboard" },
          { label: "Apps" },
          { label: "Todo", href: "/hr/todo" },
          { label: "Gantt Timeline" },
        ]}
      />
      <GanttTimelineView />
    </div>
  );
}

export default GanttAppPage;
