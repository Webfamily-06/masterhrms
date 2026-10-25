import { createFileRoute } from "@tanstack/react-router";
import { UnifiedTodoApp } from "@/components/todo/unified-todo-app";

export const Route = createFileRoute("/_authenticated/me/todo")({
  component: EmployeeTodoPage,
  head: () => ({ meta: [{ title: "My Tasks & Deliverables — Master HRMS" }] }),
});

export function EmployeeTodoPage() {
  return <UnifiedTodoApp mode="me" title="My Tasks & Deliverables" />;
}

export default EmployeeTodoPage;
