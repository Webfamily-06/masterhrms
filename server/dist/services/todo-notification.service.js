"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TodoNotificationService = void 0;
const prisma_1 = require("../prisma");
const notification_service_1 = require("./notification.service");
const email_1 = require("../lib/email");
const workspace_host_1 = require("../lib/workspace-host");
const tenant_context_1 = require("../context/tenant-context");
class TodoNotificationService {
    /**
     * Helper to invoke NotificationService.createNotification within an explicit TenantContext
     */
    static async createInAppNotification(params) {
        await (0, tenant_context_1.runWithTenantContext)({
            tenantId: params.tenantId,
            userId: params.userId,
            roles: ["tenant_admin"],
            status: "ACTIVE",
            tenancyStrategy: "SHARED_SCHEMA",
            db: prisma_1.rawPrisma,
        }, async () => {
            await notification_service_1.NotificationService.createNotification(params);
        });
    }
    /**
     * Resolves canonical workspace URL for a given target user based on roles.
     * Preserves /hr/todo, /me/todo, and /tenant/todo routing conventions.
     */
    static async resolveTaskUrl(tenantId, targetUserId, taskId) {
        const tenant = await prisma_1.rawPrisma.tenant.findUnique({
            where: { id: tenantId },
            select: { slug: true },
        });
        const slug = tenant?.slug || "workspace";
        const workspaceBase = (0, workspace_host_1.getWorkspaceUrl)(slug);
        if (!targetUserId) {
            return `${workspaceBase}/hr/todo?taskId=${taskId}`;
        }
        try {
            const userRoles = await prisma_1.rawPrisma.userRole.findMany({
                where: { userId: targetUserId },
                select: { role: true },
            });
            const roles = userRoles.map((r) => r.role);
            if (roles.includes("hr_admin") || roles.includes("admin") || roles.includes("tenant_admin")) {
                return `${workspaceBase}/hr/todo?taskId=${taskId}`;
            }
            if (roles.includes("employee")) {
                return `${workspaceBase}/me/todo?taskId=${taskId}`;
            }
            return `${workspaceBase}/tenant/todo?taskId=${taskId}`;
        }
        catch {
            return `${workspaceBase}/hr/todo?taskId=${taskId}`;
        }
    }
    /**
     * Resolves full user/employee info (userId, email, name) for an assignee.
     */
    static async resolveAssigneeDetails(tenantId, assignee) {
        let resolvedUserId = assignee.userId || null;
        let resolvedEmail = assignee.email || null;
        let resolvedName = assignee.name || "Team Member";
        if (assignee.type === "employee" || (!resolvedUserId && assignee.id)) {
            const emp = await prisma_1.rawPrisma.employee.findFirst({
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
                if (!resolvedUserId && emp.userId)
                    resolvedUserId = emp.userId;
                if (!resolvedEmail && emp.email)
                    resolvedEmail = emp.email;
                if (!assignee.name)
                    resolvedName = `${emp.firstName} ${emp.lastName}`.trim();
            }
        }
        if (!resolvedEmail && resolvedUserId) {
            const user = await prisma_1.rawPrisma.user.findUnique({
                where: { id: resolvedUserId },
                select: { email: true, profile: { select: { fullName: true } } },
            });
            if (user) {
                resolvedEmail = user.email;
                if (!assignee.name && user.profile?.fullName)
                    resolvedName = user.profile.fullName;
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
    static async dispatchTaskCreated(params) {
        const { tenantId, creatorUserId, todo, assignees } = params;
        const creatorUser = await prisma_1.rawPrisma.user.findUnique({
            where: { id: creatorUserId },
            select: { email: true, profile: { select: { fullName: true } } },
        });
        const assignerName = creatorUser?.profile?.fullName || creatorUser?.email || "Workspace Lead";
        const notifiedUserIds = new Set();
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
                }
                catch (notifErr) {
                    console.warn("[TodoNotificationService] In-app notification creation error:", notifErr.message);
                }
            }
            if (details.email) {
                try {
                    await (0, email_1.sendTodoNotificationEmail)({
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
                }
                catch (emailErr) {
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
            }
            catch (err) {
                console.warn("[TodoNotificationService] Creator notification error:", err.message);
            }
        }
    }
    /**
     * Event B: Dispatched when an existing task has new assignees added.
     * Notifies only the newly assigned users without resending to unchanged assignees.
     */
    static async dispatchTaskAssigned(params) {
        const { tenantId, updaterUserId, todo, newAssignees } = params;
        if (newAssignees.length === 0)
            return;
        const updater = await prisma_1.rawPrisma.user.findUnique({
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
                }
                catch (notifErr) {
                    console.warn("[TodoNotificationService] In-app assignment error:", notifErr.message);
                }
            }
            if (details.email) {
                try {
                    await (0, email_1.sendTodoNotificationEmail)({
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
                }
                catch (emailErr) {
                    console.warn("[TodoNotificationService] Reassignment email error:", emailErr.message);
                }
            }
        }
    }
    /**
     * Event C: Dispatched when start date or due date changes.
     * Notifies affected assignees and creator (excluding the user who made the change).
     */
    static async dispatchScheduleUpdated(params) {
        const { tenantId, updaterUserId, todo, assignees } = params;
        const recipientUserIds = new Set();
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
            }
            catch (err) {
                console.warn("[TodoNotificationService] Schedule update notification error:", err.message);
            }
        }
    }
    /**
     * Event D: Dispatched when task is completed.
     * Notifies creator and participants (excluding the completer).
     */
    static async dispatchTaskCompleted(params) {
        const { tenantId, completerUserId, todo, assignees } = params;
        const recipientUserIds = new Set();
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
            }
            catch (err) {
                console.warn("[TodoNotificationService] Task completion notification error:", err.message);
            }
        }
    }
}
exports.TodoNotificationService = TodoNotificationService;
