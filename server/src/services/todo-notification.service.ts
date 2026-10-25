import { rawPrisma } from "../prisma";
import { NotificationService } from "./notification.service";
import { sendTodoNotificationEmail } from "../lib/email";
import { getWorkspaceUrl } from "../lib/workspace-host";
import { TodoAssignee } from "../routes/todos.routes";
import { runWithTenantContext } from "../context/tenant-context";

export class TodoNotificationService {
  /**
   * Helper to invoke NotificationService.createNotification within an explicit TenantContext
   */
  public static async createInAppNotification(params: {
    tenantId: string;
    userId: string;
    title: string;
    message: string;
    type: string;
    actionUrl: string;
    metadata: any;
  }): Promise<void> {
    await runWithTenantContext(
      {
        tenantId: params.tenantId,
        userId: params.userId,
        roles: ["tenant_admin"],
        status: "ACTIVE",
        tenancyStrategy: "SHARED_SCHEMA",
        db: rawPrisma,
      },
      async () => {
        await NotificationService.createNotification(params);
      }
    );
  }

  /**
   * Resolves canonical workspace URL for a given target user based on roles.
   * Preserves /hr/todo, /me/todo, and /tenant/todo routing conventions.
   */
  public static async resolveTaskUrl(
    tenantId: string,
    targetUserId: string | null | undefined,
    taskId: string
  ): Promise<string> {
    const tenant = await rawPrisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });
    const slug = tenant?.slug || "workspace";
    const workspaceBase = getWorkspaceUrl(slug);

    if (!targetUserId) {
      return `${workspaceBase}/hr/todo?taskId=${taskId}`;
    }

    try {
      const userRoles = await rawPrisma.userRole.findMany({
        where: { userId: targetUserId },
        select: { role: true },
      });
      const roles = userRoles.map((r) => r.role);

      if (roles.includes("hr_admin" as any) || roles.includes("admin" as any) || roles.includes("tenant_admin" as any)) {
        return `${workspaceBase}/hr/todo?taskId=${taskId}`;
      }
      if (roles.includes("employee" as any)) {
        return `${workspaceBase}/me/todo?taskId=${taskId}`;
      }
      return `${workspaceBase}/tenant/todo?taskId=${taskId}`;
    } catch {
      return `${workspaceBase}/hr/todo?taskId=${taskId}`;
    }
  }

  /**
   * Resolves full user/employee info (userId, email, name) for an assignee.
   */
  public static async resolveAssigneeDetails(
    tenantId: string,
    assignee: TodoAssignee
  ): Promise<{ userId: string | null; email: string | null; name: string }> {
    let resolvedUserId: string | null = assignee.userId || null;
    let resolvedEmail: string | null = assignee.email || null;
    let resolvedName: string = assignee.name || "Team Member";

    if (assignee.type === "employee" || (!resolvedUserId && assignee.id)) {
      const emp = await rawPrisma.employee.findFirst({
        where: { id: assignee.id, tenantId },
        select: {
          id: true,
          userId: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });
      if (emp) {
        if (!resolvedUserId && emp.userId) resolvedUserId = emp.userId;
        if (!resolvedEmail && emp.email) resolvedEmail = emp.email;
        if (!assignee.name) resolvedName = `${emp.firstName} ${emp.lastName}`.trim();
      }
    }

    if (!resolvedEmail && resolvedUserId) {
      const user = await rawPrisma.user.findUnique({
        where: { id: resolvedUserId },
        select: { email: true, profile: { select: { fullName: true } } },
      });
      if (user) {
        resolvedEmail = user.email;
        if (!assignee.name && user.profile?.fullName) resolvedName = user.profile.fullName;
      }
    }

    return {
      userId: resolvedUserId,
      email: resolvedEmail,
      name: resolvedName,
    };
  }

  /**
   * Event A: Dispatched when a task is created.
   * Persists task first, notifies each assigned user (in-app + email),
   * and notifies creator once without double-notifying if creator is also assigned.
   */
  public static async dispatchTaskCreated(params: {
    tenantId: string;
    creatorUserId: string;
    todo: {
      id: string;
      title: string;
      priority: string;
      dueDate?: Date | null;
      startDate?: string | null;
      description?: string | null;
    };
    assignees: TodoAssignee[];
  }): Promise<void> {
    const { tenantId, creatorUserId, todo, assignees } = params;

    const creatorUser = await rawPrisma.user.findUnique({
      where: { id: creatorUserId },
      select: { email: true, profile: { select: { fullName: true } } },
    });
    const assignerName = creatorUser?.profile?.fullName || creatorUser?.email || "Workspace Lead";

    const notifiedUserIds = new Set<string>();

    for (const a of assignees) {
      const details = await this.resolveAssigneeDetails(tenantId, a);
      const taskUrl = await this.resolveTaskUrl(tenantId, details.userId, todo.id);

      if (details.userId) {
        notifiedUserIds.add(details.userId);
        try {
          await this.createInAppNotification({
            tenantId,
            userId: details.userId,
            title: "New Task Assigned",
            message: `${assignerName} assigned you to "${todo.title}"`,
            type: "TODO_ASSIGNED",
            actionUrl: taskUrl,
            metadata: {
              taskId: todo.id,
              eventType: "TASK_CREATED",
              priority: todo.priority,
              dueDate: todo.dueDate ? todo.dueDate.toISOString() : null,
            },
          });
        } catch (notifErr: any) {
          console.warn("[TodoNotificationService] In-app notification creation error:", notifErr.message);
        }
      }

      if (details.email) {
        try {
          await sendTodoNotificationEmail({
            templateId: "todo-task-created",
            toEmail: details.email,
            assigneeName: details.name,
            taskTitle: todo.title,
            assignerName,
            taskDescription: todo.description || "",
            priority: todo.priority,
            startDate: todo.startDate || undefined,
            dueDate: todo.dueDate ? todo.dueDate.toISOString().slice(0, 10) : undefined,
            taskUrl,
            tenantId,
          });
        } catch (emailErr: any) {
          console.warn("[TodoNotificationService] Email delivery warning:", emailErr.message);
        }
      }
    }

    // Notify creator of task creation if not already notified as an assignee
    if (!notifiedUserIds.has(creatorUserId)) {
      try {
        const creatorUrl = await this.resolveTaskUrl(tenantId, creatorUserId, todo.id);
        const countText = `${assignees.length} team member${assignees.length === 1 ? "" : "s"}`;
        await this.createInAppNotification({
          tenantId,
          userId: creatorUserId,
          title: "Task Created Successfully",
          message: `You created task "${todo.title}" with ${countText} assigned.`,
          type: "TODO_CREATED",
          actionUrl: creatorUrl,
          metadata: {
            taskId: todo.id,
            eventType: "TASK_CREATED",
          },
        });
      } catch (err: any) {
        console.warn("[TodoNotificationService] Creator notification error:", err.message);
      }
    }
  }

  /**
   * Event B: Dispatched when an existing task has new assignees added.
   * Notifies only the newly assigned users without resending to unchanged assignees.
   */
  public static async dispatchTaskAssigned(params: {
    tenantId: string;
    updaterUserId: string;
    todo: {
      id: string;
      title: string;
      priority: string;
      dueDate?: Date | null;
      startDate?: string | null;
      description?: string | null;
    };
    newAssignees: TodoAssignee[];
  }): Promise<void> {
    const { tenantId, updaterUserId, todo, newAssignees } = params;
    if (newAssignees.length === 0) return;

    const updater = await rawPrisma.user.findUnique({
      where: { id: updaterUserId },
      select: { email: true, profile: { select: { fullName: true } } },
    });
    const assignerName = updater?.profile?.fullName || updater?.email || "Workspace Lead";

    for (const a of newAssignees) {
      const details = await this.resolveAssigneeDetails(tenantId, a);
      const taskUrl = await this.resolveTaskUrl(tenantId, details.userId, todo.id);

      if (details.userId) {
        try {
          await this.createInAppNotification({
            tenantId,
            userId: details.userId,
            title: "Task Assigned",
            message: `${assignerName} assigned you to "${todo.title}"`,
            type: "TODO_ASSIGNED",
            actionUrl: taskUrl,
            metadata: {
              taskId: todo.id,
              eventType: "TASK_ASSIGNED",
              priority: todo.priority,
              dueDate: todo.dueDate ? todo.dueDate.toISOString() : null,
            },
          });
        } catch (notifErr: any) {
          console.warn("[TodoNotificationService] In-app assignment error:", notifErr.message);
        }
      }

      if (details.email) {
        try {
          await sendTodoNotificationEmail({
            templateId: "todo-task-assigned",
            toEmail: details.email,
            assigneeName: details.name,
            taskTitle: todo.title,
            assignerName,
            taskDescription: todo.description || "",
            priority: todo.priority,
            startDate: todo.startDate || undefined,
            dueDate: todo.dueDate ? todo.dueDate.toISOString().slice(0, 10) : undefined,
            taskUrl,
            tenantId,
          });
        } catch (emailErr: any) {
          console.warn("[TodoNotificationService] Reassignment email error:", emailErr.message);
        }
      }
    }
  }

  /**
   * Event C: Dispatched when start date or due date changes.
   * Notifies affected assignees and creator (excluding the user who made the change).
   */
  public static async dispatchScheduleUpdated(params: {
    tenantId: string;
    updaterUserId: string;
    todo: {
      id: string;
      title: string;
      creatorUserId: string;
      dueDate?: Date | null;
      startDate?: string | null;
    };
    assignees: TodoAssignee[];
  }): Promise<void> {
    const { tenantId, updaterUserId, todo, assignees } = params;

    const recipientUserIds = new Set<string>();
    if (todo.creatorUserId && todo.creatorUserId !== updaterUserId) {
      recipientUserIds.add(todo.creatorUserId);
    }

    for (const a of assignees) {
      const details = await this.resolveAssigneeDetails(tenantId, a);
      if (details.userId && details.userId !== updaterUserId) {
        recipientUserIds.add(details.userId);
      }
    }

    const dueDateText = todo.dueDate ? todo.dueDate.toISOString().slice(0, 10) : "No Due Date";

    for (const uid of recipientUserIds) {
      try {
        const taskUrl = await this.resolveTaskUrl(tenantId, uid, todo.id);
        await this.createInAppNotification({
          tenantId,
          userId: uid,
          title: "Task Schedule Updated",
          message: `The schedule for task "${todo.title}" was updated. Due date: ${dueDateText}.`,
          type: "TODO_SCHEDULE_UPDATED",
          actionUrl: taskUrl,
          metadata: {
            taskId: todo.id,
            eventType: "SCHEDULE_UPDATED",
            dueDate: todo.dueDate ? todo.dueDate.toISOString() : null,
          },
        });
      } catch (err: any) {
        console.warn("[TodoNotificationService] Schedule update notification error:", err.message);
      }
    }
  }

  /**
   * Event D: Dispatched when task is completed.
   * Notifies creator and participants (excluding the completer).
   */
  public static async dispatchTaskCompleted(params: {
    tenantId: string;
    completerUserId: string;
    todo: {
      id: string;
      title: string;
      creatorUserId: string;
    };
    assignees: TodoAssignee[];
  }): Promise<void> {
    const { tenantId, completerUserId, todo, assignees } = params;

    const recipientUserIds = new Set<string>();
    if (todo.creatorUserId && todo.creatorUserId !== completerUserId) {
      recipientUserIds.add(todo.creatorUserId);
    }

    for (const a of assignees) {
      const details = await this.resolveAssigneeDetails(tenantId, a);
      if (details.userId && details.userId !== completerUserId) {
        recipientUserIds.add(details.userId);
      }
    }

    for (const uid of recipientUserIds) {
      try {
        const taskUrl = await this.resolveTaskUrl(tenantId, uid, todo.id);
        await this.createInAppNotification({
          tenantId,
          userId: uid,
          title: "Task Completed",
          message: `Task "${todo.title}" has been marked as completed.`,
          type: "TODO_COMPLETED",
          actionUrl: taskUrl,
          metadata: {
            taskId: todo.id,
            eventType: "TASK_COMPLETED",
          },
        });
      } catch (err: any) {
        console.warn("[TodoNotificationService] Task completion notification error:", err.message);
      }
    }
  }
}
