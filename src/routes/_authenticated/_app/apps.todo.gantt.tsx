import { createFileRoute, redirect } from "@tanstack/react-router";
import { getClientAuthState } from "@/lib/route-guards";
import { UnifiedTodoApp } from "@/components/todo/unified-todo-app";

export const Route = createFileRoute("/_authenticated/_app/apps/todo/gantt")({
  beforeLoad: () => {
    const auth = getClientAuthState();
    if (auth.token) {
      if (auth.isTenantAdmin) throw redirect({ to: "/tenant/todo/gantt" as any });
      const hasHrRole = auth.roles.some((r) => ["hr_admin", "hr_manager", "manager", "hr", "admin"].includes(r));
      if (hasHrRole) throw redirect({ to: "/hr/todo/gantt" as any });
      throw redirect({ to: "/me/todo/gantt" as any });
    }
  },
  component: GanttAppPage,
  head: () => ({ meta: [{ title: "Todo Gantt Timeline — Master HRMS" }] }),
});

export function GanttAppPage() {
  return <UnifiedTodoApp initialView="gantt" mode="apps" title="Todo Gantt Timeline" />;
}

export default GanttAppPage;
