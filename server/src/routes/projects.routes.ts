import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const projectsRouter = Router();

// ==========================================
// PROJECTS API (Relational MySQL backed)
// ==========================================

// GET /api/projects - List all projects for tenant
projectsRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";

    const dbProjects = await prisma.project.findMany({
      where: { tenantId },
      include: {
        tasks: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (dbProjects.length > 0) {
      return res.json({
        projects: dbProjects.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description || "",
          status: p.status,
          priority: p.priority,
          progress: p.progress,
          clientName: p.clientName || "",
          color: "#3b82f6",
          createdAt: p.createdAt.toISOString(),
        })),
        tasks: dbProjects.flatMap((p) =>
          p.tasks.map((t) => ({
            id: t.id,
            projectId: t.projectId,
            title: t.title,
            description: t.description || "",
            status: t.status,
            priority: t.priority,
            assignee: t.assignedTo || "Unassigned",
            dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : "",
            createdAt: t.createdAt.toISOString(),
          }))
        ),
      });
    }

    // Auto-migrate from CMS legacy slug if exists
    const SLUG = `system-projects-kanban-${tenantId}`;
    const page = await prisma.cmsPage.findUnique({ where: { slug: SLUG } });
    if (page?.content) {
      const parsed = page.content as any;
      const legacyProjects: any[] = parsed.projects || [];
      const legacyTasks: any[] = parsed.tasks || [];

      if (legacyProjects.length > 0) {
        for (const lp of legacyProjects) {
          try {
            const prj = await prisma.project.create({
              data: {
                id: lp.id.startsWith("proj-") ? lp.id : undefined,
                tenantId,
                name: lp.name || "Default Project",
                description: lp.description || null,
                status: "in_progress",
              },
            });

            // Migrate tasks for this project
            const prjTasks = legacyTasks.filter((t) => t.projectId === lp.id);
            for (const lt of prjTasks) {
              await prisma.projectTask.create({
                data: {
                  tenantId,
                  projectId: prj.id,
                  title: lt.title || "Task",
                  description: lt.description || null,
                  status: lt.status || "todo",
                  priority: lt.priority || "medium",
                  assignedTo: lt.assignee || null,
                  dueDate: lt.dueDate ? new Date(lt.dueDate) : null,
                },
              });
            }
          } catch {}
        }

        const freshProjects = await prisma.project.findMany({
          where: { tenantId },
          include: { tasks: true },
          orderBy: { createdAt: "desc" },
        });

        return res.json({
          projects: freshProjects.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description || "",
            color: "#3b82f6",
            createdAt: p.createdAt.toISOString(),
          })),
          tasks: freshProjects.flatMap((p) =>
            p.tasks.map((t) => ({
              id: t.id,
              projectId: t.projectId,
              title: t.title,
              description: t.description || "",
              status: t.status,
              priority: t.priority,
              assignee: t.assignedTo || "Unassigned",
              dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : "",
              createdAt: t.createdAt.toISOString(),
            }))
          ),
        });
      }
    }

    return res.json({ projects: [], tasks: [] });
  } catch (err: any) {
    console.error("Projects GET error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch projects" });
  }
});

// POST /api/projects - Create project
projectsRouter.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Project name is required" });
    }

    const project = await prisma.project.create({
      data: {
        tenantId,
        name: name.trim(),
        description: description || null,
        status: "in_progress",
      },
    });

    return res.status(201).json({
      id: project.id,
      name: project.name,
      description: project.description || "",
      color: "#3b82f6",
      createdAt: project.createdAt.toISOString(),
    });
  } catch (err: any) {
    console.error("Projects POST error:", err);
    return res.status(500).json({ error: err.message || "Failed to create project" });
  }
});

// DELETE /api/projects/:id - Delete project & tasks
projectsRouter.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;

    await prisma.project.deleteMany({
      where: { id, tenantId },
    });

    return res.json({ success: true, message: "Project deleted" });
  } catch (err: any) {
    console.error("Projects DELETE error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete project" });
  }
});

// POST /api/projects/:id/tasks - Create task under project
projectsRouter.post("/:id/tasks", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id: projectId } = req.params;
    const body = req.body;

    if (!body.title || !body.title.trim()) {
      return res.status(400).json({ error: "Task title is required" });
    }

    const task = await prisma.projectTask.create({
      data: {
        tenantId,
        projectId,
        title: body.title.trim(),
        description: body.description || null,
        status: body.status || "todo",
        priority: body.priority || "medium",
        assignedTo: body.assignee || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      },
    });

    return res.status(201).json({
      id: task.id,
      projectId: task.projectId,
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      assignee: task.assignedTo || "Unassigned",
      dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "",
      createdAt: task.createdAt.toISOString(),
    });
  } catch (err: any) {
    console.error("Task POST error:", err);
    return res.status(500).json({ error: err.message || "Failed to create task" });
  }
});

// PUT /api/projects/tasks/:taskId - Update task
projectsRouter.put("/tasks/:taskId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { taskId } = req.params;
    const body = req.body;

    const dataToUpdate: any = {};
    if (body.title !== undefined) dataToUpdate.title = body.title;
    if (body.description !== undefined) dataToUpdate.description = body.description;
    if (body.status !== undefined) dataToUpdate.status = body.status;
    if (body.priority !== undefined) dataToUpdate.priority = body.priority;
    if (body.assignee !== undefined) dataToUpdate.assignedTo = body.assignee;
    if (body.dueDate !== undefined) dataToUpdate.dueDate = body.dueDate ? new Date(body.dueDate) : null;

    await prisma.projectTask.updateMany({
      where: { id: taskId, tenantId },
      data: dataToUpdate,
    });

    return res.json({ success: true, taskId });
  } catch (err: any) {
    console.error("Task PUT error:", err);
    return res.status(500).json({ error: err.message || "Failed to update task" });
  }
});

// DELETE /api/projects/tasks/:taskId - Delete task
projectsRouter.delete("/tasks/:taskId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { taskId } = req.params;

    await prisma.projectTask.deleteMany({
      where: { id: taskId, tenantId },
    });

    return res.json({ success: true, message: "Task deleted" });
  } catch (err: any) {
    console.error("Task DELETE error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete task" });
  }
});
