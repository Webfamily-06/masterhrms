import { createFileRoute } from "@tanstack/react-router";
import { UnifiedTodoApp } from "@/components/todo/unified-todo-app";

export const Route = createFileRoute("/_authenticated/tenant/todo")({
  component: TenantTodoPage,
  head: () => ({ meta: [{ title: "Tenant Workspace Tasks — Master HRMS" }] }),
});

export function TenantTodoPage() {
  return <UnifiedTodoApp mode="workspace" title="Tenant Workspace Tasks" />;
}

export default TenantTodoPage;
