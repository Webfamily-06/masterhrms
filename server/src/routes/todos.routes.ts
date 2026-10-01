import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";

export const todosRouter = Router();

todosRouter.use(requireAuth, resolveTenantContext);

// GET /api/todos - List todos for current tenant/user
todosRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId || (req.user as any).id;
    const { priority, tag, completed, search } = req.query;

    const whereClause: any = {
      tenantId,
      userId,
    };

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
      whereClause.OR = [
        { title: { contains: String(search) } },
        { description: { contains: String(search) } },
      ];
    }

    const todos = await prisma.workspaceTodo.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: todos });
  } catch (error: any) {
    console.error("Error fetching todos:", error);
    res.status(500).json({ error: error.message || "Failed to fetch todos" });
  }
});

// POST /api/todos - Create new todo
todosRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId || (req.user as any).id;
    const { title, description, priority, tag, dueDate, completed } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Todo title is required" });
    }

    const todo = await prisma.workspaceTodo.create({
      data: {
        tenantId,
        userId,
        title: title.trim(),
        description: description ? description.trim() : null,
        priority: priority || "medium",
        tag: tag || "internal",
        dueDate: dueDate ? new Date(dueDate) : null,
        completed: Boolean(completed),
      },
    });

    res.status(201).json({ success: true, data: todo });
  } catch (error: any) {
    console.error("Error creating todo:", error);
    res.status(500).json({ error: error.message || "Failed to create todo" });
  }
});

// PUT /api/todos/:id - Update todo
todosRouter.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { id } = req.params;
    const { title, description, priority, tag, dueDate, completed } = req.body;

    const existing = await prisma.workspaceTodo.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Todo not found" });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (priority !== undefined) updateData.priority = priority;
    if (tag !== undefined) updateData.tag = tag;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (completed !== undefined) updateData.completed = Boolean(completed);

    const updated = await prisma.workspaceTodo.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Error updating todo:", error);
    res.status(500).json({ error: error.message || "Failed to update todo" });
  }
});

// DELETE /api/todos/:id - Delete todo
todosRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { id } = req.params;

    const existing = await prisma.workspaceTodo.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Todo not found" });
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
