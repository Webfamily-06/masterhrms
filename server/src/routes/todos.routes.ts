import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";

export const todosRouter = Router();

todosRouter.use(requireAuth, resolveTenantContext);

export interface TodoChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface TodoCommentItem {
  id: string;
  author: string;
  authorId?: string;
  text: string;
  createdAt: string;
}

export interface TodoAttachmentItem {
  id: string;
  name: string;
  url: string;
  size?: string;
  uploadedAt?: string;
}

export interface TodoActivityItem {
  id: string;
  text: string;
  timestamp: string;
}

export interface TodoMeta {
  cleanDescription: string;
  assignee: {
    id: string;
    name?: string;
    type?: "user" | "employee";
    assignedBy?: string;
    assignedAt?: string;
  } | null;
  progress: number;
  startDate?: string;
  starred: boolean;
  checklist: TodoChecklistItem[];
  comments: TodoCommentItem[];
  attachments: TodoAttachmentItem[];
  activity: TodoActivityItem[];
}

function parseTodoMeta(description: string | null): TodoMeta {
  if (!description) {
    return {
      cleanDescription: "",
      assignee: null,
      progress: 0,
      starred: false,
      checklist: [],
      comments: [],
      attachments: [],
      activity: [],
    };
  }

  let clean = description;
  let assignee: TodoMeta["assignee"] = null;
  let progress = 0;
  let startDate: string | undefined = undefined;
  let starred = false;
  let checklist: TodoChecklistItem[] = [];
  let comments: TodoCommentItem[] = [];
  let attachments: TodoAttachmentItem[] = [];
  let activity: TodoActivityItem[] = [];

  // 1. Check full structured envelope: <!--TODO_META:{...}-->
  const fullMetaMatch = clean.match(/<!--TODO_META:(.*?)-->/);
  if (fullMetaMatch) {
    try {
      const parsed = JSON.parse(fullMetaMatch[1]);
      if (parsed.assignee) {
        assignee = parsed.assignee;
      } else if (parsed.assigneeId) {
        assignee = {
          id: parsed.assigneeId,
          name: parsed.assigneeName,
          type: parsed.assigneeType || "user",
          assignedBy: parsed.assignedBy,
          assignedAt: parsed.assignedAt,
        };
      }
      if (typeof parsed.progress === "number") progress = parsed.progress;
      if (parsed.startDate) startDate = parsed.startDate;
      if (typeof parsed.starred === "boolean") starred = parsed.starred;
      if (Array.isArray(parsed.checklist)) checklist = parsed.checklist;
      if (Array.isArray(parsed.comments)) comments = parsed.comments;
      if (Array.isArray(parsed.attachments)) attachments = parsed.attachments;
      if (Array.isArray(parsed.activity)) activity = parsed.activity;
    } catch {}
    clean = clean.replace(/<!--TODO_META:.*?-->\s*/g, "");
  }

  // 2. Check legacy assign envelope: <!--ASSIGN:{...}-->
  const assignMatch = clean.match(/<!--ASSIGN:(.*?)-->/);
  if (assignMatch) {
    try {
      const parsed = JSON.parse(assignMatch[1]);
      if (parsed.assigneeId && !assignee) {
        assignee = {
          id: parsed.assigneeId,
          type: parsed.assigneeType || "user",
          assignedBy: parsed.assignedBy,
          assignedAt: parsed.assignedAt,
        };
      }
      if (typeof parsed.progress === "number" && progress === 0) {
        progress = parsed.progress;
      }
    } catch {}
    clean = clean.replace(/<!--ASSIGN:.*?-->\s*/g, "");
  }

  // 3. Check legacy [Assignee:...] tag
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

  return {
    cleanDescription: clean.trim(),
    assignee,
    progress,
    startDate,
    starred,
    checklist,
    comments,
    attachments,
    activity,
  };
}

function serializeTodoMeta(
  cleanDescription: string,
  meta: {
    assignee?: TodoMeta["assignee"];
    progress?: number;
    startDate?: string;
    starred?: boolean;
    checklist?: TodoChecklistItem[];
    comments?: TodoCommentItem[];
    attachments?: TodoAttachmentItem[];
    activity?: TodoActivityItem[];
  }
): string {
  const clean = cleanDescription.trim();
  const envelope = {
    assignee: meta.assignee || null,
    assigneeId: meta.assignee?.id || null,
    assigneeType: meta.assignee?.type || "user",
    assignedBy: meta.assignee?.assignedBy,
    assignedAt: meta.assignee?.assignedAt,
    progress: typeof meta.progress === "number" ? meta.progress : 0,
    startDate: meta.startDate,
    starred: Boolean(meta.starred),
    checklist: meta.checklist || [],
    comments: meta.comments || [],
    attachments: meta.attachments || [],
    activity: meta.activity || [],
  };

  const fullMetaBlock = `<!--TODO_META:${JSON.stringify(envelope)}-->`;
  let prefix = fullMetaBlock;

  if (meta.assignee?.id) {
    const legacyAssign = `<!--ASSIGN:${JSON.stringify({
      assigneeId: meta.assignee.id,
      assigneeType: meta.assignee.type || "user",
      assignedBy: meta.assignee.assignedBy,
      assignedAt: meta.assignee.assignedAt || new Date().toISOString(),
      progress: envelope.progress,
    })}-->`;
    const legacyTag = `[Assignee:${meta.assignee.id}]`;
    prefix = `${legacyTag} ${legacyAssign} ${fullMetaBlock}`;
  }

  return clean ? `${prefix}\n${clean}` : prefix;
}

// GET /api/todos/assignees - List authorized users & employees for assignment in this tenant
todosRouter.get("/assignees", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;

    const [employees, users] = await Promise.all([
      prisma.employee.findMany({
        where: { tenantId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          designation: { select: { name: true } },
          department: { select: { name: true } },
        },
        orderBy: { firstName: "asc" },
      }),
      prisma.user.findMany({
        where: { profile: { tenantId } },
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true } },
        },
      }),
    ]);

    const assignees = [
      ...employees.map((e) => ({
        id: e.id,
        name: `${e.firstName} ${e.lastName}`.trim() || e.email,
        email: e.email,
        type: "employee" as const,
        role: e.designation?.name || "Employee",
        department: e.department?.name,
      })),
      ...users
        .filter((u) => !employees.some((e) => e.email === u.email))
        .map((u) => ({
          id: u.id,
          name: u.profile?.fullName || u.email,
          email: u.email,
          type: "user" as const,
          role: "User",
          department: undefined,
        })),
    ];

    res.json({ success: true, data: assignees });
  } catch (error: any) {
    console.error("Error fetching assignees:", error);
    res.status(500).json({ error: error.message || "Failed to fetch assignees" });
  }
});

// GET /api/todos - List todos for current tenant/user (creator + assignee scoping)
todosRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId || (req.user as any).id;
    const { priority, tag, completed, search, scope, starred } = req.query;

    const isAdmin = req.user?.roles?.some((r: string) =>
      ["super_admin", "tenant_admin", "hr_admin", "admin"].includes(r)
    );

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

    // Format response and extract metadata
    let formatted = todos.map((t) => {
      const meta = parseTodoMeta(t.description);
      const isCreator = t.userId === userId;
      const isAssignee =
        meta.assignee?.id === userId ||
        (currentEmpId && meta.assignee?.id === currentEmpId);

      return {
        ...t,
        description: meta.cleanDescription,
        assignedTo: meta.assignee?.id || null,
        assigneeId: meta.assignee?.id || null,
        assignee: meta.assignee,
        progress: meta.progress || (t.completed ? 100 : 0),
        startDate: meta.startDate || t.createdAt.toISOString(),
        starred: Boolean(meta.starred),
        checklist: meta.checklist || [],
        comments: meta.comments || [],
        attachments: meta.attachments || [],
        activity: meta.activity || [],
        isCreator,
        isAssignee: Boolean(isAssignee),
      };
    });

    if (starred === "true") {
      formatted = formatted.filter((t) => t.starred);
    }

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
    const {
      title,
      description,
      priority,
      tag,
      dueDate,
      startDate,
      completed,
      assignedTo,
      assigneeId,
      progress,
      starred,
      checklist,
      comments,
      attachments,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Todo title is required" });
    }

    const targetAssignee = assigneeId || assignedTo;
    let assigneeMeta: TodoMeta["assignee"] = null;

    if (targetAssignee) {
      // Validate assignee belongs to the caller's tenant
      const validUser = await prisma.user.findFirst({
        where: { id: targetAssignee, profile: { tenantId } },
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true } },
        },
      });
      const validEmp = !validUser
        ? await prisma.employee.findFirst({
            where: { id: targetAssignee, tenantId },
            select: { id: true, firstName: true, lastName: true, email: true },
          })
        : null;

      if (!validUser && !validEmp) {
        return res.status(400).json({
          error: "Assigned employee or user does not exist in your organization.",
          code: "CROSS_TENANT_ASSIGNMENT_FORBIDDEN",
        });
      }

      const assigneeName = validUser
        ? validUser.profile?.fullName || validUser.email
        : `${validEmp!.firstName} ${validEmp!.lastName}`.trim();

      assigneeMeta = {
        id: targetAssignee,
        name: assigneeName,
        type: validUser ? "user" : "employee",
        assignedBy: userId,
        assignedAt: new Date().toISOString(),
      };
    }

    const initialActivity: TodoActivityItem[] = [
      {
        id: `act_${Date.now()}_init`,
        text: "Task created",
        timestamp: new Date().toISOString(),
      },
    ];

    if (assigneeMeta?.name) {
      initialActivity.push({
        id: `act_${Date.now()}_assign`,
        text: `Assigned to ${assigneeMeta.name}`,
        timestamp: new Date().toISOString(),
      });
    }

    const initialChecklist: TodoChecklistItem[] = Array.isArray(checklist)
      ? checklist.map((c: any, idx: number) => ({
          id: c.id || `chk_${Date.now()}_${idx}`,
          text: c.text || "",
          done: Boolean(c.done),
        }))
      : [];

    const calculatedProgress =
      typeof progress === "number"
        ? progress
        : completed
        ? 100
        : initialChecklist.length > 0
        ? Math.round(
            (initialChecklist.filter((c) => c.done).length /
              initialChecklist.length) *
              100
          )
        : 0;

    const finalDesc = serializeTodoMeta(description || "", {
      assignee: assigneeMeta,
      progress: calculatedProgress,
      startDate: startDate || new Date().toISOString(),
      starred: Boolean(starred),
      checklist: initialChecklist,
      comments: Array.isArray(comments) ? comments : [],
      attachments: Array.isArray(attachments) ? attachments : [],
      activity: initialActivity,
    });

    const todo = await prisma.workspaceTodo.create({
      data: {
        tenantId,
        userId,
        title: title.trim(),
        description: finalDesc,
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
        progress: calculatedProgress,
        startDate: startDate || todo.createdAt.toISOString(),
        starred: Boolean(starred),
        checklist: initialChecklist,
        comments: Array.isArray(comments) ? comments : [],
        attachments: Array.isArray(attachments) ? attachments : [],
        activity: initialActivity,
      },
    });
  } catch (error: any) {
    console.error("Error creating todo:", error);
    res.status(500).json({ error: error.message || "Failed to create todo" });
  }
});

// PUT /api/todos/:id - Update todo with object-level authorization & rich metadata persistence
todosRouter.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId || (req.user as any).id;
    const { id } = req.params;
    const {
      title,
      description,
      priority,
      tag,
      dueDate,
      startDate,
      completed,
      assignedTo,
      assigneeId,
      progress,
      starred,
      checklist,
      comments,
      attachments,
    } = req.body;

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
    const isAssignee =
      meta.assignee?.id === userId ||
      (currentEmpId && meta.assignee?.id === currentEmpId) ||
      existing.description?.includes(`[Assignee:${userId}]`) ||
      (currentEmpId && existing.description?.includes(`[Assignee:${currentEmpId}]`));
    const isAdmin = req.user?.roles?.some((r: string) =>
      ["super_admin", "tenant_admin", "hr_admin", "admin"].includes(r)
    );

    if (!isOwner && !isAssignee && !isAdmin) {
      return res.status(403).json({
        error: "Access Denied: You do not have permission to modify this task.",
      });
    }

    const updateData: any = {};
    const activityLog = [...(meta.activity || [])];

    // Status change logging
    if (completed !== undefined && Boolean(completed) !== existing.completed) {
      activityLog.push({
        id: `act_${Date.now()}_status`,
        text: `Status changed to ${completed ? "Completed" : "In Progress"}`,
        timestamp: new Date().toISOString(),
      });
    }

    // Assignee updates
    let targetAssignee = meta.assignee;
    const requestedAssignee = assigneeId !== undefined ? assigneeId : assignedTo;
    if (requestedAssignee !== undefined && (isOwner || isAdmin)) {
      if (requestedAssignee === null || requestedAssignee === "") {
        targetAssignee = null;
        activityLog.push({
          id: `act_${Date.now()}_unassign`,
          text: "Task unassigned",
          timestamp: new Date().toISOString(),
        });
      } else {
        const validUser = await prisma.user.findFirst({
          where: { id: requestedAssignee, profile: { tenantId } },
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true } },
          },
        });
        const validEmp = !validUser
          ? await prisma.employee.findFirst({
              where: { id: requestedAssignee, tenantId },
              select: { id: true, firstName: true, lastName: true, email: true },
            })
          : null;

        if (!validUser && !validEmp) {
          return res.status(400).json({
            error: "Assigned employee or user does not exist in your organization.",
            code: "CROSS_TENANT_ASSIGNMENT_FORBIDDEN",
          });
        }

        const newName = validUser
          ? validUser.profile?.fullName || validUser.email
          : `${validEmp!.firstName} ${validEmp!.lastName}`.trim();
        targetAssignee = {
          id: requestedAssignee,
          name: newName,
          type: validUser ? "user" : "employee",
          assignedBy: userId,
          assignedAt: new Date().toISOString(),
        };
        activityLog.push({
          id: `act_${Date.now()}_reassign`,
          text: `Assigned to ${newName}`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Checklist updates
    let updatedChecklist = meta.checklist;
    if (Array.isArray(checklist)) {
      updatedChecklist = checklist.map((c: any, idx: number) => ({
        id: c.id || `chk_${Date.now()}_${idx}`,
        text: c.text || "",
        done: Boolean(c.done),
      }));
    }

    // Progress computation
    let updatedProgress =
      progress !== undefined
        ? Number(progress)
        : completed !== undefined
        ? completed
          ? 100
          : 0
        : meta.progress;

    if (updatedChecklist.length > 0 && progress === undefined) {
      const doneCount = updatedChecklist.filter((c) => c.done).length;
      updatedProgress = Math.round((doneCount / updatedChecklist.length) * 100);
    }

    if (completed !== undefined) {
      updateData.completed = Boolean(completed);
    }
    if ((isOwner || isAdmin) && title !== undefined) {
      updateData.title = title.trim();
    }
    if ((isOwner || isAdmin) && priority !== undefined) {
      updateData.priority = priority;
    }
    if ((isOwner || isAdmin) && tag !== undefined) {
      updateData.tag = tag;
    }
    if ((isOwner || isAdmin) && dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }

    const cleanDesc =
      description !== undefined ? description.trim() : meta.cleanDescription;
    const finalStartDate = startDate || meta.startDate || existing.createdAt.toISOString();
    const finalStarred = starred !== undefined ? Boolean(starred) : meta.starred;

    updateData.description = serializeTodoMeta(cleanDesc, {
      assignee: targetAssignee,
      progress: updatedProgress,
      startDate: finalStartDate,
      starred: finalStarred,
      checklist: updatedChecklist,
      comments: Array.isArray(comments) ? comments : meta.comments,
      attachments: Array.isArray(attachments) ? attachments : meta.attachments,
      activity: activityLog,
    });

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
        startDate: finalMeta.startDate || updated.createdAt.toISOString(),
        starred: Boolean(finalMeta.starred),
        checklist: finalMeta.checklist || [],
        comments: finalMeta.comments || [],
        attachments: finalMeta.attachments || [],
        activity: finalMeta.activity || [],
      },
    });
  } catch (error: any) {
    console.error("Error updating todo:", error);
    res.status(500).json({ error: error.message || "Failed to update todo" });
  }
});

// POST /api/todos/:id/checklist - Add a checklist subtask
todosRouter.post("/:id/checklist", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { id } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Checklist text is required" });
    }

    const existing = await prisma.workspaceTodo.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Todo not found" });

    const meta = parseTodoMeta(existing.description);
    const newChecklist: TodoChecklistItem[] = [
      ...meta.checklist,
      {
        id: `chk_${Date.now()}`,
        text: text.trim(),
        done: false,
      },
    ];

    const doneCount = newChecklist.filter((c) => c.done).length;
    const progress = Math.round((doneCount / newChecklist.length) * 100);

    const desc = serializeTodoMeta(meta.cleanDescription, {
      ...meta,
      checklist: newChecklist,
      progress,
    });

    const updated = await prisma.workspaceTodo.update({
      where: { id },
      data: { description: desc },
    });

    const finalMeta = parseTodoMeta(updated.description);
    res.json({ success: true, data: finalMeta });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to add checklist item" });
  }
});

// POST /api/todos/:id/comments - Add a comment
todosRouter.post("/:id/comments", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId || (req.user as any).id;
    const { id } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Comment text is required" });
    }

    const existing = await prisma.workspaceTodo.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Todo not found" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        profile: { select: { fullName: true } },
      },
    });
    const authorName = user?.profile?.fullName || user?.email || "Team Member";

    const meta = parseTodoMeta(existing.description);
    const newComments: TodoCommentItem[] = [
      ...meta.comments,
      {
        id: `cmt_${Date.now()}`,
        author: authorName,
        authorId: userId,
        text: text.trim(),
        createdAt: new Date().toISOString(),
      },
    ];

    const desc = serializeTodoMeta(meta.cleanDescription, {
      ...meta,
      comments: newComments,
    });

    const updated = await prisma.workspaceTodo.update({
      where: { id },
      data: { description: desc },
    });

    const finalMeta = parseTodoMeta(updated.description);
    res.json({ success: true, data: finalMeta });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to add comment" });
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
    const isAdmin = req.user?.roles?.some((r: string) =>
      ["super_admin", "tenant_admin", "hr_admin", "admin"].includes(r)
    );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: "Access Denied: You do not have permission to delete this task.",
      });
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
