import { createFileRoute } from "@tanstack/react-router";
import { UnifiedTodoApp } from "@/components/todo/unified-todo-app";

export const Route = createFileRoute("/_authenticated/_app/apps/todo/gantt")({
  component: GanttAppPage,
  head: () => ({ meta: [{ title: "Todo Gantt Timeline — Master HRMS" }] }),
});

export function GanttAppPage() {
  return <UnifiedTodoApp initialView="gantt" mode="apps" title="Todo Gantt Timeline" />;
}

export default GanttAppPage;

