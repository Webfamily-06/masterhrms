import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";

export const todosRouter = Router();

todosRouter.use(requireAuth, resolveTenantContext);

interface TodoMeta {
  cleanDescription: string;
  assignee: {
    id: string;
    type?: "user" | "employee";
    assignedBy?: string;
    assignedAt?: string;
  } | null;
  progress?: number;
}

function parseTodoMeta(description: string | null): TodoMeta {
  if (!description) return { cleanDescription: "", assignee: null, progress: 0 };
  let clean = description;
  let assignee: TodoMeta["assignee"] = null;
  let progress = 0;

  // Check structured envelope: <!--ASSIGN:{"assigneeId":"...","assigneeType":"...","assignedBy":"...","assignedAt":"...","progress":0}-->
  const metaMatch = clean.match(/<!--ASSIGN:(.*?)-->/);
  if (metaMatch) {
    try {
      const parsed = JSON.parse(metaMatch[1]);
      if (parsed.assigneeId) {
        assignee = {
          id: parsed.assigneeId,
          type: parsed.assigneeType || "user",
          assignedBy: parsed.assignedBy,
          assignedAt: parsed.assignedAt,
        };
      }
      if (typeof parsed.progress === "number") {
        progress = parsed.progress;
      }
    } catch {}
    clean = clean.replace(/<!--ASSIGN:.*?-->\s*/g, "");
  }

  // Also check legacy [Assignee:...] tag
  const legacyMatch = clean.match(/\[Assignee:([^\]]+)\]/);
  if (legacyMatch) {
    if (!assignee) {
      assignee = {
        id: legacyMatch[1],
        type: "user",
        assignedBy: "system",
        assignedAt: new Date().toISOString(),
      };
    }
    clean = clean.replace(/\[Assignee:[^\]]+\]\s*/g, "");
  }

  return { cleanDescription: clean.trim(), assignee, progress };
}

function serializeTodoMeta(cleanDescription: string, assignee: TodoMeta["assignee"], progress?: number): string {
  let result = cleanDescription.trim();
  if (assignee) {
    const metaBlock = `<!--ASSIGN:${JSON.stringify({
      assigneeId: assignee.id,
      assigneeType: assignee.type || "user",
      assignedBy: assignee.assignedBy,
      assignedAt: assignee.assignedAt || new Date().toISOString(),
      progress: typeof progress === "number" ? progress : 0,
    })}-->`;
    const legacyTag = `[Assignee:${assignee.id}]`;
    result = result ? `${legacyTag} ${metaBlock}\n${result}` : `${legacyTag} ${metaBlock}`;
  }
  return result;
}

// GET /api/todos - List todos for current tenant/user (creator + assignee scoping)
todosRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId || (req.user as any).id;
    const { priority, tag, completed, search, scope } = req.query;

    const isAdmin = req.user?.roles?.some((r: string) => ["super_admin", "tenant_admin", "hr_admin"].includes(r));

    // Resolve employee id if available
    let currentEmpId: string | undefined;
    const emp = await prisma.employee.findFirst({
      where: { tenantId, userId },
      select: { id: true },
    });
    currentEmpId = emp?.id;

    const whereClause: any = {
      tenantId,
    };

    if (!(isAdmin && scope === "all")) {
      const orConditions: any[] = [
        { userId },
        { description: { contains: `[Assignee:${userId}]` } },
        { description: { contains: `"${userId}"` } },
      ];
      if (currentEmpId) {
        orConditions.push({ description: { contains: `[Assignee:${currentEmpId}]` } });
        orConditions.push({ description: { contains: `"${currentEmpId}"` } });
      }
      whereClause.OR = orConditions;
    }

    if (priority && priority !== "all") {
      whereClause.priority = String(priority);
    }

    if (tag && tag !== "all") {
      whereClause.tag = String(tag);
    }

    if (completed !== undefined && completed !== "all") {
      whereClause.completed = String(completed) === "true";
    }

    if (search) {
      const searchCondition = [
        { title: { contains: String(search) } },
        { description: { contains: String(search) } },
      ];
      if (whereClause.OR) {
        whereClause.AND = [{ OR: searchCondition }];
      } else {
        whereClause.OR = searchCondition;
      }
    }

    const todos = await prisma.workspaceTodo.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    // Format response and extract assignee metadata
    const formatted = todos.map(t => {
      const meta = parseTodoMeta(t.description);
      const isCreator = t.userId === userId;
      const isAssignee = meta.assignee?.id === userId || (currentEmpId && meta.assignee?.id === currentEmpId);

      return {
        ...t,
        description: meta.cleanDescription,
        assignedTo: meta.assignee?.id || null,
        assigneeId: meta.assignee?.id || null,
        assignee: meta.assignee,
        progress: meta.progress || (t.completed ? 100 : 0),
        isCreator,
        isAssignee: Boolean(isAssignee),
      };
    });

    res.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error("Error fetching todos:", error);
    res.status(500).json({ error: error.message || "Failed to fetch todos" });
  }
});

// POST /api/todos - Create new todo (supports assignment with tenant boundary check)
todosRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId || (req.user as any).id;
    const { title, description, priority, tag, dueDate, completed, assignedTo, assigneeId, progress } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Todo title is required" });
    }

    const targetAssignee = assigneeId || assignedTo;
    let assigneeMeta: TodoMeta["assignee"] = null;

    if (targetAssignee) {
      // Validate assignee belongs to the caller's tenant
      const validAssignee = await prisma.user.findFirst({
        where: { id: targetAssignee, profile: { tenantId } },
      }) || await prisma.employee.findFirst({
        where: { id: targetAssignee, tenantId },
      });

      if (!validAssignee) {
        return res.status(400).json({
          error: "Assigned employee or user does not exist in your organization.",
          code: "CROSS_TENANT_ASSIGNMENT_FORBIDDEN"
        });
      }

      assigneeMeta = {
        id: targetAssignee,
        type: "user",
        assignedBy: userId,
        assignedAt: new Date().toISOString(),
      };
    }

    const finalDesc = serializeTodoMeta(description || "", assigneeMeta, progress);

    const todo = await prisma.workspaceTodo.create({
      data: {
        tenantId,
        userId,
        title: title.trim(),
        description: finalDesc || null,
        priority: priority || "medium",
        tag: tag || "internal",
        dueDate: dueDate ? new Date(dueDate) : null,
        completed: Boolean(completed),
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...todo,
        description: description ? description.trim() : null,
        assignedTo: targetAssignee || null,
        assigneeId: targetAssignee || null,
        assignee: assigneeMeta,
        progress: progress || (completed ? 100 : 0),
      }
    });
  } catch (error: any) {
    console.error("Error creating todo:", error);
    res.status(500).json({ error: error.message || "Failed to create todo" });
  }
});

// PUT /api/todos/:id - Update todo with strict object-level authorization & role-scoped field protection
todosRouter.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId || (req.user as any).id;
    const { id } = req.params;
    const { title, description, priority, tag, dueDate, completed, assignedTo, assigneeId, progress } = req.body;

    const existing = await prisma.workspaceTodo.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Todo not found" });
    }

    // Resolve employee id if available
    const emp = await prisma.employee.findFirst({
      where: { tenantId, userId },
      select: { id: true },
    });
    const currentEmpId = emp?.id;

    const meta = parseTodoMeta(existing.description);
    const isOwner = existing.userId === userId;
    const isAssignee = meta.assignee?.id === userId || (currentEmpId && meta.assignee?.id === currentEmpId) ||
                       existing.description?.includes(`[Assignee:${userId}]`) ||
                       (currentEmpId && existing.description?.includes(`[Assignee:${currentEmpId}]`));
    const isAdmin = req.user?.roles?.some((r: string) => ["super_admin", "tenant_admin", "hr_admin"].includes(r));

    if (!isOwner && !isAssignee && !isAdmin) {
      return res.status(403).json({ error: "Access Denied: You do not have permission to modify this task." });
    }

    const updateData: any = {};

    // If caller is assignee (and not creator or admin), restrict editable fields
    if (isAssignee && !isOwner && !isAdmin) {
      // Assignees can ONLY update completion status, progress, or task notes
      if (completed !== undefined) {
        updateData.completed = Boolean(completed);
      }
      const updatedProgress = progress !== undefined ? Number(progress) : (completed ? 100 : meta.progress);
      updateData.description = serializeTodoMeta(description !== undefined ? description.trim() : meta.cleanDescription, meta.assignee, updatedProgress);
    } else {
      // Owners and Admins have full field modification privileges
      if (title !== undefined) updateData.title = title.trim();
      if (priority !== undefined) updateData.priority = priority;
      if (tag !== undefined) updateData.tag = tag;
      if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
      if (completed !== undefined) updateData.completed = Boolean(completed);

      let targetAssignee = meta.assignee;
      const requestedAssignee = assigneeId !== undefined ? assigneeId : assignedTo;
      if (requestedAssignee !== undefined) {
        if (requestedAssignee === null || requestedAssignee === "") {
          targetAssignee = null;
        } else {
          // Validate new assignee belongs to tenant
          const validAssignee = await prisma.user.findFirst({
            where: { id: requestedAssignee, profile: { tenantId } },
          }) || await prisma.employee.findFirst({
            where: { id: requestedAssignee, tenantId },
          });

          if (!validAssignee) {
            return res.status(400).json({
              error: "Assigned employee or user does not exist in your organization.",
              code: "CROSS_TENANT_ASSIGNMENT_FORBIDDEN"
            });
          }

          targetAssignee = {
            id: requestedAssignee,
            type: "user",
            assignedBy: userId,
            assignedAt: new Date().toISOString(),
          };
        }
      }

      const updatedProgress = progress !== undefined ? Number(progress) : (completed ? 100 : meta.progress);
      const cleanDesc = description !== undefined ? description.trim() : meta.cleanDescription;
      updateData.description = serializeTodoMeta(cleanDesc, targetAssignee, updatedProgress);
    }

    const updated = await prisma.workspaceTodo.update({
      where: { id },
      data: updateData,
    });

    const finalMeta = parseTodoMeta(updated.description);

    res.json({
      success: true,
      data: {
        ...updated,
        description: finalMeta.cleanDescription,
        assignedTo: finalMeta.assignee?.id || null,
        assigneeId: finalMeta.assignee?.id || null,
        assignee: finalMeta.assignee,
        progress: finalMeta.progress || (updated.completed ? 100 : 0),
      }
    });
  } catch (error: any) {
    console.error("Error updating todo:", error);
    res.status(500).json({ error: error.message || "Failed to update todo" });
  }
});

// DELETE /api/todos/:id - Delete todo with strict object-level authorization (Owner or Admin only)
todosRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId || (req.user as any).id;
    const { id } = req.params;

    const existing = await prisma.workspaceTodo.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Todo not found" });
    }

    const isOwner = existing.userId === userId;
    const isAdmin = req.user?.roles?.some((r: string) => ["super_admin", "tenant_admin", "hr_admin"].includes(r));

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Access Denied: You do not have permission to delete this task." });
    }

    await prisma.workspaceTodo.delete({
      where: { id },
    });

    res.json({ success: true, message: "Todo deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting todo:", error);
    res.status(500).json({ error: error.message || "Failed to delete todo" });
  }
});
