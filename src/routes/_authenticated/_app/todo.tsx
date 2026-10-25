import { createFileRoute, redirect } from "@tanstack/react-router";
import { getClientAuthState } from "@/lib/route-guards";
import { UnifiedTodoApp } from "@/components/todo/unified-todo-app";

export const Route = createFileRoute("/_authenticated/_app/todo")({
  beforeLoad: () => {
    const auth = getClientAuthState();
    if (auth.token) {
      if (auth.isTenantAdmin) throw redirect({ to: "/tenant/todo" as any });
      const hasHrRole = auth.roles.some((r) => ["hr_admin", "hr_manager", "manager", "hr", "admin"].includes(r));
      if (hasHrRole) throw redirect({ to: "/hr/todo" as any });
      throw redirect({ to: "/me/todo" as any });
    }
  },
  component: TodoWorkspacePage,
  head: () => ({ meta: [{ title: "Todo & Tasks — Master HRMS" }] }),
});

export function TodoWorkspacePage() {
  return <UnifiedTodoApp mode="workspace" title="Todo & Tasks" />;
}

export default TodoWorkspacePage;
