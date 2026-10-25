import { createFileRoute } from "@tanstack/react-router";
import { UnifiedTodoApp } from "@/components/todo/unified-todo-app";

export const Route = createFileRoute("/_authenticated/_app/todo")({
  component: WorkspaceTodoPage,
  head: () => ({ meta: [{ title: "Todo & Tasks — Master HRMS" }] }),
});

export function WorkspaceTodoPage() {
  return <UnifiedTodoApp mode="workspace" title="Workspace Tasks & Todo" />;
}

export default WorkspaceTodoPage;
