"use client";

import { UnifiedTodoApp } from "@/components/todo/unified-todo-app";

export default function EmployeeTodoGanttPage() {
  return <UnifiedTodoApp mode="me" initialView="gantt" title="My Tasks Gantt Timeline" />;
}
