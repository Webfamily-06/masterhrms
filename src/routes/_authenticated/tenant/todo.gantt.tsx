import { createFileRoute } from "@tanstack/react-router";
import { UnifiedTodoApp } from "@/components/todo/unified-todo-app";

export const Route = createFileRoute("/_authenticated/tenant/todo/gantt")({
  component: TenantTodoGanttPage,
  head: () => ({ meta: [{ title: "Tenant Gantt Timeline — Master HRMS" }] }),
});

export function TenantTodoGanttPage() {
  return <UnifiedTodoApp mode="workspace" initialView="gantt" title="Tenant Gantt Timeline" />;
}

export default TenantTodoGanttPage;
