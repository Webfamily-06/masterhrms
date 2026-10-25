import { createFileRoute } from "@tanstack/react-router";
import { UnifiedTodoApp } from "@/components/todo/unified-todo-app";

export const Route = createFileRoute("/_authenticated/hr/todo/gantt")({
  component: HrTodoGanttPage,
  head: () => ({ meta: [{ title: "HR Gantt Timeline — Master HRMS" }] }),
});

export function HrTodoGanttPage() {
  return <UnifiedTodoApp mode="hr" initialView="gantt" title="HR Gantt Timeline" />;
}

export default HrTodoGanttPage;
