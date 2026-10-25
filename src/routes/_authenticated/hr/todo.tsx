import { createFileRoute } from "@tanstack/react-router";
import { UnifiedTodoApp } from "@/components/todo/unified-todo-app";

export const Route = createFileRoute("/_authenticated/hr/todo")({
  component: HrTodoPage,
  head: () => ({ meta: [{ title: "Workplace Tasks & Action Items — Master HRMS" }] }),
});

export function HrTodoPage() {
  return <UnifiedTodoApp mode="hr" title="Workplace Tasks & Action Items" />;
}

export default HrTodoPage;
