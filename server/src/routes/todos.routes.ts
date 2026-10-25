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

export interface TodoAssignee {
  id: string;
  name?: string;
  email?: string;
  avatar?: string | null;
  role?: string;
  type?: "user" | "employee";
  assignedBy?: string;
  assignedAt?: string;
}

export interface TodoMeta {
  cleanDescription: string;
  assignee: TodoAssignee | null;
  assignees: TodoAssignee[];
  progress: number;
  startDate?: string;
  starred: boolean;
  checklist: TodoChecklistItem[];
  comments: TodoCommentItem[];
  attachments: TodoAttachmentItem[];
  activity: TodoActivityItem[];
}

export function parseTodoMeta(description: string | null): TodoMeta {
  if (!description) {
    return {
      cleanDescription: "",
      assignee: null,
      assignees: [],
      progress: 0,
      starred: false,
      checklist: [],
      comments: [],
      attachments: [],
      activity: [],
    };
  }

  let clean = description;
  let assignee: TodoAssignee | null = null;
  let assignees: TodoAssignee[] = [];
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
      if (Array.isArray(parsed.assignees) && parsed.assignees.length > 0) {
        assignees = parsed.assignees;
        assignee = parsed.assignee || assignees[0] || null;
      } else if (parsed.assignee) {
        assignee = parsed.assignee;
        assignees = [parsed.assignee];
      } else if (parsed.assigneeId) {
        assignee = {
          id: parsed.assigneeId,
          name: parsed.assigneeName,
          type: parsed.assigneeType || "user",
          assignedBy: parsed.assignedBy,
          assignedAt: parsed.assignedAt,
        };
        assignees = [assignee];
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
        if (assignees.length === 0) {
          assignees = [assignee];
        }
      }
      if (Array.isArray(parsed.assignees) && assignees.length === 0) {
        assignees = parsed.assignees.map((id: string) => ({
          id,
          type: "user",
        }));
      }
      if (typeof parsed.progress === "number" && progress === 0) {
        progress = parsed.progress;
      }
    } catch {}
    clean = clean.replace(/<!--ASSIGN:.*?-->\s*/g, "");
  }

  // 3. Check legacy [Assignee:...] tags
  const legacyMatches = Array.from(clean.matchAll(/\[Assignee:([^\]]+)\]/g));
  if (legacyMatches.length > 0 && assignees.length === 0) {
    for (const match of legacyMatches) {
      const aId = match[1];
      if (!assignees.some((a) => a.id === aId)) {
        assignees.push({
          id: aId,
          type: "user",
          assignedBy: "system",
          assignedAt: new Date().toISOString(),
        });
      }
    }
    if (!assignee) {
      assignee = assignees[0] || null;
    }
  }
  clean = clean.replace(/\[Assignee:[^\]]+\]\s*/g, "");

  return {
    cleanDescription: clean.trim(),
    assignee,
    assignees,
    progress,
    startDate,
    starred,
    checklist,
    comments,
    attachments,
    activity,
  };
}

export function serializeTodoMeta(
  cleanDescription: string,
  meta: {
    assignee?: TodoAssignee | null;
    assignees?: TodoAssignee[];
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
  const resolvedAssignees = Array.isArray(meta.assignees) && meta.assignees.length > 0
    ? meta.assignees
    : meta.assignee
    ? [meta.assignee]
    : [];
  const primaryAssignee = meta.assignee || resolvedAssignees[0] || null;

  const envelope = {
    assignee: primaryAssignee,
    assigneeId: primaryAssignee?.id || null,
    assigneeType: primaryAssignee?.type || "user",
    assignees: resolvedAssignees,
    assignedBy: primaryAssignee?.assignedBy,
    assignedAt: primaryAssignee?.assignedAt,
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

  if (resolvedAssignees.length > 0) {
    const legacyTags = resolvedAssignees.map((a) => `[Assignee:${a.id}]`).join(" ");
    const legacyAssign = `<!--ASSIGN:${JSON.stringify({
      assigneeId: primaryAssignee?.id,
      assigneeType: primaryAssignee?.type || "user",
      assignedBy: primaryAssignee?.assignedBy,
      assignedAt: primaryAssignee?.assignedAt || new Date().toISOString(),
      progress: envelope.progress,
      assignees: resolvedAssignees.map((a) => a.id),
    })}-->`;
    prefix = `${legacyTags} ${legacyAssign} ${fullMetaBlock}`;
  }

  return clean ? `${prefix}\n${clean}` : prefix;
}

// ============================================================================
// TENANT CATEGORIES (CRUD via tenant settings configuration pattern)
// ============================================================================
export interface TodoCategory {
  id: string;
  name: string;
  color: string;
  isSystem?: boolean;
}

export const DEFAULT_TODO_CATEGORIES: TodoCategory[] = [
  { id: "internal", name: "Internal", color: "#3b82f6", isSystem: true },
  { id: "projects", name: "Projects", color: "#8b5cf6", isSystem: true },
  { id: "meetings", name: "Meetings", color: "#ec4899", isSystem: true },
  { id: "reminder", name: "Reminder", color: "#f59e0b", isSystem: true },
  { id: "research", name: "Research", color: "#10b981", isSystem: true },
  { id: "operations", name: "Operations", color: "#06b6d4", isSystem: true },
];

export async function getTenantTodoCategories(tenantId: string): Promise<TodoCategory[]> {
  try {
    const setting = await prisma.setting.findFirst({
      where: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "todos",
        key: "categories",
      },
    });

    if (!setting || !Array.isArray(setting.valueJson) || setting.valueJson.length === 0) {
      return DEFAULT_TODO_CATEGORIES;
    }
    return setting.valueJson as unknown as TodoCategory[];
  } catch (err) {
    console.error("Error reading tenant todo categories:", err);
    return DEFAULT_TODO_CATEGORIES;
  }
}

export async function saveTenantTodoCategories(tenantId: string, categories: TodoCategory[]) {
  const existing = await prisma.setting.findFirst({
    where: {
      scope: "TENANT",
      scopeId: tenantId,
      group: "todos",
      key: "categories",
    },
  });

  if (existing) {
    return await prisma.setting.update({
      where: { id: existing.id },
      data: {
        valueJson: categories as any,
        version: { increment: 1 },
      },
    });
  } else {
    return await prisma.setting.create({
      data: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "todos",
        key: "categories",
        valueJson: categories as any,
        valueType: "json",
      },
    });
  }
}

// GET /api/todos/categories - List categories for this tenant
todosRouter.get("/categories", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const categories = await getTenantTodoCategories(tenantId);
    res.json({ success: true, data: categories });
  } catch (error: any) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: error.message || "Failed to fetch categories" });
  }
});

// POST /api/todos/categories - Create a new category
todosRouter.post("/categories", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { name, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Category name is required", code: "NAME_REQUIRED" });
    }

    const trimmedName = name.trim();
    const categories = await getTenantTodoCategories(tenantId);

    // Prevent duplicate category names within tenant
    if (categories.some((c) => c.name.toLowerCase() === trimmedName.toLowerCase())) {
      return res.status(400).json({
        error: `Category '${trimmedName}' already exists.`,
        code: "CATEGORY_ALREADY_EXISTS",
      });
    }

    const id = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, "-") || `cat_${Date.now()}`;
    const newCategory: TodoCategory = {
      id,
      name: trimmedName,
      color: color || "#3b82f6",
      isSystem: false,
    };

    const updated = [...categories, newCategory];
    await saveTenantTodoCategories(tenantId, updated);

    res.status(201).json({ success: true, data: newCategory });
  } catch (error: any) {
    console.error("Error creating category:", error);
    res.status(500).json({ error: error.message || "Failed to create category" });
  }
});

// PUT /api/todos/categories/:id - Edit an existing category
todosRouter.put("/categories/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { id } = req.params;
    const { name, color } = req.body;

    const categories = await getTenantTodoCategories(tenantId);
    const existingIndex = categories.findIndex((c) => c.id === id);

    if (existingIndex === -1) {
      return res.status(404).json({ error: "Category not found", code: "NOT_FOUND" });
    }

    const existingCat = categories[existingIndex];
    const newName = name && name.trim() ? name.trim() : existingCat.name;
    const newColor = color || existingCat.color;

    // Check duplicate name if changing name
    if (
      name &&
      categories.some(
        (c) => c.id !== id && c.name.toLowerCase() === newName.toLowerCase()
      )
    ) {
      return res.status(400).json({
        error: `Category '${newName}' already exists.`,
        code: "CATEGORY_ALREADY_EXISTS",
      });
    }

    const updatedCategory: TodoCategory = {
      ...existingCat,
      name: newName,
      color: newColor,
    };

    categories[existingIndex] = updatedCategory;
    await saveTenantTodoCategories(tenantId, categories);

    // Update existing tasks if tag changed
    if (existingCat.id !== id || existingCat.name !== newName) {
      await prisma.workspaceTodo.updateMany({
        where: {
          tenantId,
          tag: { in: [existingCat.id, existingCat.name] },
        },
        data: {
          tag: updatedCategory.id,
        },
      });
    }

    res.json({ success: true, data: updatedCategory });
  } catch (error: any) {
    console.error("Error updating category:", error);
    res.status(500).json({ error: error.message || "Failed to update category" });
  }
});

// DELETE /api/todos/categories/:id - Delete category with safe task reassignment
todosRouter.delete("/categories/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { id } = req.params;

    const categories = await getTenantTodoCategories(tenantId);
    const existing = categories.find((c) => c.id === id);

    if (!existing) {
      return res.status(404).json({ error: "Category not found", code: "NOT_FOUND" });
    }

    // Safe reference behavior: Reset referencing tasks to 'internal' without deleting tasks!
    await prisma.workspaceTodo.updateMany({
      where: {
        tenantId,
        tag: { in: [existing.id, existing.name] },
      },
      data: {
        tag: "internal",
      },
    });

    const filtered = categories.filter((c) => c.id !== id);
    await saveTenantTodoCategories(tenantId, filtered);

    res.json({ success: true, message: "Category deleted and referencing tasks preserved." });
  } catch (error: any) {
    console.error("Error deleting category:", error);
    res.status(500).json({ error: error.message || "Failed to delete category" });
  }
});

// ============================================================================
// STRICT TENANT-SCOPED ASSIGNEE DIRECTORY
// ============================================================================

// GET /api/todos/assignees - List authorized users & employees for assignment in this tenant
todosRouter.get("/assignees", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;

    // 1. Fetch active employees strictly within this tenant
    const employees = await prisma.employee.findMany({
      where: {
        tenantId,
        status: "active",
      },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        email: true,
        position: true,
        designation: { select: { name: true } },
        department: { select: { name: true } },
        user: {
          select: {
            id: true,
            profile: {
              select: {
                avatarUrl: true,
                fullName: true,
              },
            },
            roles: { select: { role: true } },
          },
        },
      },
      orderBy: { firstName: "asc" },
    });

    // 2. Fetch users strictly belonging to this tenant, excluding super_admin
    const users = await prisma.user.findMany({
      where: {
        profile: { tenantId },
        roles: {
          none: { role: "super_admin" },
          some: { tenantId },
        },
      },
      select: {
        id: true,
        email: true,
        profile: { select: { fullName: true, avatarUrl: true } },
        roles: { select: { role: true } },
      },
    });

    // 3. Deduplicate by email and userId, build clean sanitized assignee records
    const seenEmails = new Set<string>();
    const seenUserIds = new Set<string>();
    const assignees: any[] = [];

    for (const e of employees) {
      // Exclude employee if linked user is super_admin
      const isSuper = e.user?.roles?.some((r) => r.role === "super_admin");
      if (isSuper) continue;

      const emailLower = (e.email || "").toLowerCase().trim();
      if (emailLower) seenEmails.add(emailLower);
      if (e.userId) seenUserIds.add(e.userId);

      const fullName = `${e.firstName} ${e.lastName}`.trim() || e.email;
      const avatar = e.user?.profile?.avatarUrl || null;
      const roleName = e.designation?.name || e.position || "Employee";

      assignees.push({
        id: e.id,
        userId: e.userId || null,
        name: fullName,
        email: e.email,
        type: "employee" as const,
        role: roleName,
        department: e.department?.name || undefined,
        avatar,
      });
    }

    for (const u of users) {
      const emailLower = (u.email || "").toLowerCase().trim();
      if (seenEmails.has(emailLower) || seenUserIds.has(u.id)) {
        continue;
      }
      seenEmails.add(emailLower);
      seenUserIds.add(u.id);

      const fullName = u.profile?.fullName?.trim() || u.email;
      const roleName = u.roles?.[0]?.role ? String(u.roles[0].role).toUpperCase() : "User";

      assignees.push({
        id: u.id,
        userId: u.id,
        name: fullName,
        email: u.email,
        type: "user" as const,
        role: roleName,
        department: undefined,
        avatar: u.profile?.avatarUrl || null,
      });
    }

    res.json({ success: true, data: assignees });
  } catch (error: any) {
    console.error("Error fetching assignees:", error);
    res.status(500).json({ error: error.message || "Failed to fetch assignees" });
  }
});

// Helper: validate and resolve multiple assignees with strict tenant isolation
export async function resolveAndValidateAssignees(
  assigneeInput: any,
  tenantId: string,
  assignerUserId: string
): Promise<{ primaryAssignee: TodoAssignee | null; assignees: TodoAssignee[] }> {
  let targetIds: string[] = [];

  if (Array.isArray(assigneeInput)) {
    targetIds = assigneeInput
      .map((item) => (typeof item === "string" ? item : item?.id))
      .filter(Boolean);
  } else if (typeof assigneeInput === "string" && assigneeInput.trim()) {
    targetIds = [assigneeInput.trim()];
  }

  // Deduplicate
  targetIds = Array.from(new Set(targetIds));

  if (targetIds.length === 0) {
    return { primaryAssignee: null, assignees: [] };
  }

  const validAssignees: TodoAssignee[] = [];

  for (const targetId of targetIds) {
    // 1. Try finding User in tenant (cannot be super_admin)
    const validUser = await prisma.user.findFirst({
      where: {
        id: targetId,
        profile: { tenantId },
        roles: { none: { role: "super_admin" } },
      },
      select: {
        id: true,
        email: true,
        profile: { select: { fullName: true, avatarUrl: true } },
      },
    });

    // 2. Try finding Employee in tenant
    const validEmp = !validUser
      ? await prisma.employee.findFirst({
          where: { id: targetId, tenantId, status: "active" },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            position: true,
            designation: { select: { name: true } },
            user: { select: { profile: { select: { avatarUrl: true } } } },
          },
        })
      : null;

    if (!validUser && !validEmp) {
      throw new Error(`CROSS_TENANT_ASSIGNMENT_FORBIDDEN:${targetId}`);
    }

    if (validUser) {
      validAssignees.push({
        id: validUser.id,
        name: validUser.profile?.fullName?.trim() || validUser.email,
        email: validUser.email,
        avatar: validUser.profile?.avatarUrl || null,
        type: "user",
        assignedBy: assignerUserId,
        assignedAt: new Date().toISOString(),
      });
    } else if (validEmp) {
      validAssignees.push({
        id: validEmp.id,
        name: `${validEmp.firstName} ${validEmp.lastName}`.trim() || validEmp.email,
        email: validEmp.email,
        role: validEmp.designation?.name || validEmp.position || "Employee",
        avatar: validEmp.user?.profile?.avatarUrl || null,
        type: "employee",
        assignedBy: assignerUserId,
        assignedAt: new Date().toISOString(),
      });
    }
  }

  return {
    primaryAssignee: validAssignees[0] || null,
    assignees: validAssignees,
  };
}

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
        (currentEmpId && meta.assignee?.id === currentEmpId) ||
        meta.assignees.some((a) => a.id === userId || (currentEmpId && a.id === currentEmpId));

      return {
        ...t,
        description: meta.cleanDescription,
        assignedTo: meta.assignee?.id || null,
        assigneeId: meta.assignee?.id || null,
        assignee: meta.assignee,
        assignees: meta.assignees,
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

// POST /api/todos - Create new todo (supports multi-assignment with tenant boundary check)
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
      assignees: rawAssigneesList,
      assigneeIds,
      progress,
      starred,
      checklist,
      comments,
      attachments,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Todo title is required" });
    }

    // Server-side date validation
    if (startDate && isNaN(new Date(startDate).getTime())) {
      return res.status(400).json({ error: "Invalid startDate format", code: "INVALID_DATE" });
    }
    if (dueDate && isNaN(new Date(dueDate).getTime())) {
      return res.status(400).json({ error: "Invalid dueDate format", code: "INVALID_DATE" });
    }
    if (startDate && dueDate) {
      const s = new Date(startDate).getTime();
      const d = new Date(dueDate).getTime();
      if (s > d) {
        return res.status(400).json({
          error: "Invalid date range: dueDate cannot be earlier than startDate",
          code: "INVALID_DATE_RANGE",
        });
      }
    }

    // Multi-assignee resolution and validation
    const candidateAssignees = rawAssigneesList || assigneeIds || assigneeId || assignedTo;
    let resolvedAssignees: TodoAssignee[] = [];
    let primaryAssignee: TodoAssignee | null = null;

    if (candidateAssignees) {
      try {
        const resAssign = await resolveAndValidateAssignees(candidateAssignees, tenantId, userId);
        resolvedAssignees = resAssign.assignees;
        primaryAssignee = resAssign.primaryAssignee;
      } catch (err: any) {
        if (err.message?.startsWith("CROSS_TENANT_ASSIGNMENT_FORBIDDEN")) {
          return res.status(400).json({
            error: "Assigned employee or user does not exist in your organization.",
            code: "CROSS_TENANT_ASSIGNMENT_FORBIDDEN",
          });
        }
        throw err;
      }
    }

    const initialActivity: TodoActivityItem[] = [
      {
        id: `act_${Date.now()}_init`,
        text: "Task created",
        timestamp: new Date().toISOString(),
      },
    ];

    if (resolvedAssignees.length > 0) {
      const names = resolvedAssignees.map((a) => a.name || a.id).join(", ");
      initialActivity.push({
        id: `act_${Date.now()}_assign`,
        text: `Assigned to ${names}`,
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
      assignee: primaryAssignee,
      assignees: resolvedAssignees,
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
        assignedTo: primaryAssignee?.id || null,
        assigneeId: primaryAssignee?.id || null,
        assignee: primaryAssignee,
        assignees: resolvedAssignees,
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

    // Server-side date validation
    const candidateStartDate = startDate !== undefined ? startDate : undefined;
    const candidateDueDate = dueDate !== undefined ? dueDate : existing.dueDate;

    if (startDate !== undefined && startDate !== null && isNaN(new Date(startDate).getTime())) {
      return res.status(400).json({ error: "Invalid startDate format", code: "INVALID_DATE" });
    }
    if (dueDate !== undefined && dueDate !== null && isNaN(new Date(dueDate).getTime())) {
      return res.status(400).json({ error: "Invalid dueDate format", code: "INVALID_DATE" });
    }
    if (candidateStartDate && candidateDueDate) {
      const s = new Date(candidateStartDate).getTime();
      const d = new Date(candidateDueDate).getTime();
      if (!isNaN(s) && !isNaN(d) && s > d) {
        return res.status(400).json({
          error: "Invalid date range: dueDate cannot be earlier than startDate",
          code: "INVALID_DATE_RANGE",
        });
      }
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

    // Multi-assignee updates
    let targetAssignee = meta.assignee;
    let targetAssignees = meta.assignees;
    const requestedAssignee =
      req.body.assignees !== undefined
        ? req.body.assignees
        : req.body.assigneeIds !== undefined
        ? req.body.assigneeIds
        : req.body.assigneeId !== undefined
        ? req.body.assigneeId
        : req.body.assignedTo;

    if (requestedAssignee !== undefined && (isOwner || isAdmin)) {
      if (
        requestedAssignee === null ||
        requestedAssignee === "" ||
        (Array.isArray(requestedAssignee) && requestedAssignee.length === 0)
      ) {
        targetAssignee = null;
        targetAssignees = [];
        activityLog.push({
          id: `act_${Date.now()}_unassign`,
          text: "Task unassigned",
          timestamp: new Date().toISOString(),
        });
      } else {
        try {
          const resAssign = await resolveAndValidateAssignees(requestedAssignee, tenantId, userId);
          targetAssignee = resAssign.primaryAssignee;
          targetAssignees = resAssign.assignees;
          const names = targetAssignees.map((a) => a.name || a.id).join(", ");
          activityLog.push({
            id: `act_${Date.now()}_reassign`,
            text: `Assigned to ${names}`,
            timestamp: new Date().toISOString(),
          });
        } catch (err: any) {
          if (err.message?.startsWith("CROSS_TENANT_ASSIGNMENT_FORBIDDEN")) {
            return res.status(400).json({
              error: "Assigned employee or user does not exist in your organization.",
              code: "CROSS_TENANT_ASSIGNMENT_FORBIDDEN",
            });
          }
          throw err;
        }
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
      assignees: targetAssignees,
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
        assignees: finalMeta.assignees,
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

// PATCH /api/todos/:id/checklist/:itemId - Fast atomic toggle/update of checklist item
todosRouter.patch("/:id/checklist/:itemId", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { id, itemId } = req.params;
    const { done, text } = req.body;

    const existing = await prisma.workspaceTodo.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Todo not found" });

    const meta = parseTodoMeta(existing.description);
    const itemIndex = meta.checklist.findIndex((c) => c.id === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: "Checklist item not found" });
    }

    const updatedChecklist = [...meta.checklist];
    updatedChecklist[itemIndex] = {
      ...updatedChecklist[itemIndex],
      done: done !== undefined ? Boolean(done) : updatedChecklist[itemIndex].done,
      text: text !== undefined ? String(text).trim() : updatedChecklist[itemIndex].text,
    };

    const doneCount = updatedChecklist.filter((c) => c.done).length;
    const progress = Math.round((doneCount / updatedChecklist.length) * 100);
    const allDone = doneCount === updatedChecklist.length && updatedChecklist.length > 0;

    const desc = serializeTodoMeta(meta.cleanDescription, {
      ...meta,
      checklist: updatedChecklist,
      progress,
    });

    const updated = await prisma.workspaceTodo.update({
      where: { id },
      data: {
        description: desc,
        completed: allDone,
      },
    });

    const finalMeta = parseTodoMeta(updated.description);
    res.json({
      success: true,
      data: {
        checklist: finalMeta.checklist,
        progress: finalMeta.progress,
        completed: updated.completed,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to toggle checklist item" });
  }
});

// DELETE /api/todos/:id/checklist/:itemId - Delete a checklist item
todosRouter.delete("/:id/checklist/:itemId", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { id, itemId } = req.params;

    const existing = await prisma.workspaceTodo.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Todo not found" });

    const meta = parseTodoMeta(existing.description);
    const filteredChecklist = meta.checklist.filter((c) => c.id !== itemId);
    const doneCount = filteredChecklist.filter((c) => c.done).length;
    const progress =
      filteredChecklist.length > 0
        ? Math.round((doneCount / filteredChecklist.length) * 100)
        : meta.progress;

    const desc = serializeTodoMeta(meta.cleanDescription, {
      ...meta,
      checklist: filteredChecklist,
      progress,
    });

    await prisma.workspaceTodo.update({
      where: { id },
      data: { description: desc },
    });

    res.json({ success: true, data: { checklist: filteredChecklist, progress } });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete checklist item" });
  }
});

// POST /api/todos/:id/comments - Add a comment with author avatar
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
        profile: { select: { fullName: true, avatarUrl: true } },
      },
    });
    const authorName = user?.profile?.fullName || user?.email || "Team Member";

    const meta = parseTodoMeta(existing.description);
    const newCommentItem: TodoCommentItem = {
      id: `cmt_${Date.now()}`,
      author: authorName,
      authorId: userId,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };

    const newComments: TodoCommentItem[] = [...meta.comments, newCommentItem];

    const desc = serializeTodoMeta(meta.cleanDescription, {
      ...meta,
      comments: newComments,
    });

    await prisma.workspaceTodo.update({
      where: { id },
      data: { description: desc },
    });

    res.json({ success: true, data: newCommentItem, comments: newComments });
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
