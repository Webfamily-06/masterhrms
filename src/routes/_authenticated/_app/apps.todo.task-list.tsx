import { createFileRoute } from "@tanstack/react-router";
import { ClassicTodoApp } from "@/components/apps/todo/classic-todo-app";

export const Route = createFileRoute("/_authenticated/_app/apps/todo/task-list")({
  component: TodoTaskListPage,
  head: () => ({ meta: [{ title: "Todo Task List — Master HRMS" }] }),
});

export function TodoTaskListPage() {
  return <ClassicTodoApp />;
}

export default TodoTaskListPage;
