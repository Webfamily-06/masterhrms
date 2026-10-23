import { createFileRoute } from "@tanstack/react-router";
import { ClassicTaskboardApp } from "@/components/apps/taskboard/classic-taskboard-app";

export const Route = createFileRoute("/_authenticated/_app/apps/taskboard/pipeline")({
  component: PipelinePage,
  head: () => ({ meta: [{ title: "Sales Pipeline — Master HRMS" }] }),
});

export function PipelinePage() {
  return <ClassicTaskboardApp initialMode="pipeline" />;
}

export default PipelinePage;
