import { createFileRoute, redirect } from "@tanstack/react-router";
import { getClientAuthState } from "@/lib/route-guards";
import { ClassicTodoApp } from "@/components/apps/todo/classic-todo-app";

export const Route = createFileRoute("/_authenticated/_app/apps/todo/task-list")({
  beforeLoad: () => {
    const auth = getClientAuthState();
    if (auth.token) {
      if (auth.isTenantAdmin) throw redirect({ to: "/tenant/todo" as any });
      const hasHrRole = auth.roles.some((r) => ["hr_admin", "hr_manager", "manager", "hr", "admin"].includes(r));
      if (hasHrRole) throw redirect({ to: "/hr/todo" as any });
      throw redirect({ to: "/me/todo" as any });
    }
  },
  component: TodoTaskListPage,
  head: () => ({ meta: [{ title: "Todo Task List — Master HRMS" }] }),
});

export function TodoTaskListPage() {
  return <ClassicTodoApp />;
}

export default TodoTaskListPage;
