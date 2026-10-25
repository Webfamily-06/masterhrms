"use client";

import { UnifiedTodoApp } from "@/components/todo/unified-todo-app";

export default function TenantTodoGanttPage() {
  return <UnifiedTodoApp mode="workspace" initialView="gantt" title="Tenant Gantt Timeline" />;
}
