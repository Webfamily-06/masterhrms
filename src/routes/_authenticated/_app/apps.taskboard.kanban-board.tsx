import { createFileRoute } from "@tanstack/react-router";
import { ClassicTaskboardApp } from "@/components/apps/taskboard/classic-taskboard-app";

export const Route = createFileRoute("/_authenticated/_app/apps/taskboard/kanban-board")({
  component: KanbanBoardPage,
  head: () => ({ meta: [{ title: "Project Kanban Board — Master HRMS" }] }),
});

export function KanbanBoardPage() {
  return <ClassicTaskboardApp initialMode="kanban" />;
}

export default KanbanBoardPage;
