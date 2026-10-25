import { createFileRoute } from "@tanstack/react-router";
import { UnifiedTodoApp } from "@/components/todo/unified-todo-app";

export const Route = createFileRoute("/_authenticated/me/todo/gantt")({
  component: EmployeeTodoGanttPage,
  head: () => ({ meta: [{ title: "My Tasks Gantt Timeline — Master HRMS" }] }),
});

export function EmployeeTodoGanttPage() {
  return <UnifiedTodoApp mode="me" initialView="gantt" title="My Tasks Gantt Timeline" />;
}

export default EmployeeTodoGanttPage;
