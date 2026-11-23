import { Router, Response, NextFunction } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { parsePaginationParams, formatPaginatedResponse } from "../lib/pagination";
import { enforceIdempotency } from "../middleware/idempotency.middleware";

export const projectsRouter = Router();

// Enforce Request-Scoped Tenant Context on all project endpoints
projectsRouter.use(requireAuth, resolveTenantContext);

// ==========================================
// PROJECTS API (Relational MySQL backed)
// ==========================================

// GET /api/projects - List all projects for tenant
projectsRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const pagination = parsePaginationParams(req, "createdAt", 20);

    const [total, dbProjects] = await Promise.all([
      prisma.project.count({ where: { tenantId } }),
      prisma.project.findMany({
        where: { tenantId },
        include: {
          tasks: true,
        },
        orderBy: { createdAt: "desc" },
        ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
      }),
    ]);

    if (dbProjects.length > 0) {
      const formattedProjects = dbProjects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description || "",
        status: p.status,
        priority: p.priority,
        progress: p.progress,
        clientName: p.clientName || "",
        color: "#3b82f6",
        createdAt: p.createdAt.toISOString(),
      }));

      const formattedTasks = dbProjects.flatMap((p) =>
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
      );

      if (pagination.isPaginated) {
        const paginated = formatPaginatedResponse(formattedProjects, total, pagination);
        return res.json({
          ...paginated,
          projects: formattedProjects,
          tasks: formattedTasks,
        });
      }

      res.setHeader("X-Total-Count", String(total));
      return res.json({
        projects: formattedProjects,
        tasks: formattedTasks,
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

        const [migratedTotal, freshProjects] = await Promise.all([
          prisma.project.count({ where: { tenantId } }),
          prisma.project.findMany({
            where: { tenantId },
            include: { tasks: true },
            orderBy: { createdAt: "desc" },
            ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
          }),
        ]);

        const formattedProjects = freshProjects.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description || "",
          color: "#3b82f6",
          createdAt: p.createdAt.toISOString(),
        }));

        const formattedTasks = freshProjects.flatMap((p) =>
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
        );

        if (pagination.isPaginated) {
          const paginated = formatPaginatedResponse(formattedProjects, migratedTotal, pagination);
          return res.json({
            ...paginated,
            projects: formattedProjects,
            tasks: formattedTasks,
          });
        }

        res.setHeader("X-Total-Count", String(migratedTotal));
        return res.json({
          projects: formattedProjects,
          tasks: formattedTasks,
        });
      }
    }

    // If no projects exist in database or CMS legacy, seed the canonical enterprise reference project
    const defaultPrj = await prisma.project.create({
      data: {
        tenantId,
        name: "Hospital Administration System",
        description: "The Enhanced Patient Management System (EPMS) project aims to modernize and streamline the patient management processes within healthcare networks. By integrating advanced technologies and optimizing existing workflows, the project seeks to improve patient care, enhance operational efficiency, and ensure compliance with regulatory standards.",
        status: "in_progress",
        priority: "high",
        clientName: "EcoVision Enterprises",
        budget: 1400.00,
        startDate: new Date("2026-01-15"),
        dueDate: new Date("2026-11-15"),
        progress: 45,
        tasks: {
          create: [
            {
              tenantId,
              title: "Patient appointment booking",
              description: "Online scheduling interface and calendar sync.",
              status: "on_hold",
              priority: "medium",
              assignedTo: "Lewis",
              dueDate: new Date("2026-10-15"),
            },
            {
              tenantId,
              title: "Appointment booking with payment gateway",
              description: "Stripe and UPI payment reconciliation for appointments.",
              status: "in_progress",
              priority: "high",
              assignedTo: "Leona",
              dueDate: new Date("2026-10-20"),
            },
            {
              tenantId,
              title: "Patient and Doctor video conferencing",
              description: "WebRTC encrypted telemedicine consultations.",
              status: "completed",
              priority: "critical",
              assignedTo: "Pineiro",
              dueDate: new Date("2026-09-25"),
            },
            {
              tenantId,
              title: "Private chat module",
              description: "Secure HIPAA compliant staff messaging.",
              status: "in_progress",
              priority: "medium",
              assignedTo: "Moseley",
              dueDate: new Date("2026-11-01"),
            },
            {
              tenantId,
              title: "Go-Live and Post-Implementation Support",
              description: "UAT signoff, training docs, and cutover monitoring.",
              status: "todo",
              priority: "high",
              assignedTo: "Cameron",
              dueDate: new Date("2026-11-15"),
            },
          ],
        },
      },
      include: { tasks: true },
    });

    const formattedProjects = [
      {
        id: defaultPrj.id,
        name: defaultPrj.name,
        description: defaultPrj.description || "",
        status: defaultPrj.status,
        priority: defaultPrj.priority,
        progress: defaultPrj.progress,
        clientName: defaultPrj.clientName || "",
        color: "#3b82f6",
        createdAt: defaultPrj.createdAt.toISOString(),
      },
    ];

    const formattedTasks = defaultPrj.tasks.map((t) => ({
      id: t.id,
      projectId: t.projectId,
      title: t.title,
      description: t.description || "",
      status: t.status,
      priority: t.priority,
      assignee: t.assignedTo || "Unassigned",
      dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : "",
      createdAt: t.createdAt.toISOString(),
    }));

    if (pagination.isPaginated) {
      return res.json({
        ...formatPaginatedResponse(formattedProjects, 1, pagination),
        projects: formattedProjects,
        tasks: formattedTasks,
      });
    }

    res.setHeader("X-Total-Count", "1");
    return res.json({ projects: formattedProjects, tasks: formattedTasks });
  } catch (err: any) {
    console.error("Projects GET error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch projects" });
  }
});

// GET /api/projects/kanban-state - Retrieve shared board state for tenant
projectsRouter.get("/kanban-state", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const slug = `system-kanban-state-${tenantId}`;
    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    if (!page?.content) {
      return res.json({ success: true, state: null, boardData: null });
    }
    const state = typeof page.content === "string" ? JSON.parse(page.content) : page.content;
    return res.json({ success: true, state, boardData: state });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load kanban state" });
  }
});

// PUT /api/projects/kanban-state - Persist shared board state for tenant
projectsRouter.put("/kanban-state", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const slug = `system-kanban-state-${tenantId}`;
    const state = req.body.state ?? req.body.boardData;
    if (!state) {
      return res.status(400).json({ error: "State or boardData payload is required" });
    }
    const contentJson = typeof state === "object" ? state : JSON.parse(state);
    await prisma.cmsPage.upsert({
      where: { slug },
      create: {
        slug,
        title: `Kanban State (${tenantId})`,
        content: contentJson,
        published: true,
      },
      update: {
        content: contentJson,
        updatedAt: new Date(),
      },
    });
    return res.json({ success: true, message: "Kanban state persisted to database" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to save kanban state" });
  }
});

// GET /api/projects/pipeline-state - Retrieve shared pipeline state for tenant
projectsRouter.get("/pipeline-state", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const slug = `system-pipeline-state-${tenantId}`;
    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    if (!page?.content) {
      return res.json({ success: true, state: null, pipelineData: null });
    }
    const state = typeof page.content === "string" ? JSON.parse(page.content) : page.content;
    return res.json({ success: true, state, pipelineData: state });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load pipeline state" });
  }
});

// PUT /api/projects/pipeline-state - Persist shared pipeline state for tenant
projectsRouter.put("/pipeline-state", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const slug = `system-pipeline-state-${tenantId}`;
    const state = req.body.state ?? req.body.pipelineData;
    if (!state) {
      return res.status(400).json({ error: "State or pipelineData payload is required" });
    }
    const contentJson = typeof state === "object" ? state : JSON.parse(state);
    await prisma.cmsPage.upsert({
      where: { slug },
      create: {
        slug,
        title: `Pipeline State (${tenantId})`,
        content: contentJson,
        published: true,
      },
      update: {
        content: contentJson,
        updatedAt: new Date(),
      },
    });
    return res.json({ success: true, message: "Pipeline state persisted to database" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to save pipeline state" });
  }
});

export const STANDARD_PROJECT_TEMPLATES = [
  {
    id: "template-epms",
    code: "EPMS_HEALTHCARE",
    name: "Hospital Administration System (EPMS)",
    category: "Healthcare & Operations",
    description: "End-to-end hospital administration, patient management, doctor scheduling, and compliance framework.",
    estimatedDays: 120,
    tasks: [
      { title: "Patient appointment booking", status: "todo", priority: "medium", assignee: "Lewis" },
      { title: "Appointment booking with payment gateway", status: "todo", priority: "high", assignee: "Leona" },
      { title: "Patient and Doctor video conferencing", status: "todo", priority: "critical", assignee: "Pineiro" },
      { title: "Private chat module", status: "todo", priority: "medium", assignee: "Moseley" },
      { title: "Go-Live and Post-Implementation Support", status: "todo", priority: "high", assignee: "Cameron" },
    ],
    milestones: [
      { title: "Architecture & HIPAA Compliance Review", status: "not_started", targetDateOffsetDays: 30 },
      { title: "Core Patient Telehealth & Booking Modules", status: "not_started", targetDateOffsetDays: 60 },
      { title: "UAT Sign-off & Production Cutover", status: "not_started", targetDateOffsetDays: 120 },
    ],
  },
  {
    id: "template-software-agile",
    code: "SOFTWARE_AGILE",
    name: "Enterprise Software Agile Sprint",
    category: "Engineering & IT",
    description: "Full-stack software development lifecycle template covering sprint planning, CI/CD setup, API development, and QA testing.",
    estimatedDays: 60,
    tasks: [
      { title: "CI/CD Pipeline & Infrastructure Setup", status: "todo", priority: "high", assignee: "DevOps Lead" },
      { title: "Core Data Models & Prisma Schema Migration", status: "todo", priority: "critical", assignee: "Backend Engineer" },
      { title: "RESTful API Routes & RBAC Middleware", status: "todo", priority: "high", assignee: "API Developer" },
      { title: "Responsive Frontend UI & Component Library", status: "todo", priority: "medium", assignee: "Frontend Engineer" },
      { title: "Automated Integration Test Verification", status: "todo", priority: "high", assignee: "QA Engineer" },
    ],
    milestones: [
      { title: "Foundation & Database Migration", status: "not_started", targetDateOffsetDays: 14 },
      { title: "Backend API Feature Freeze", status: "not_started", targetDateOffsetDays: 35 },
      { title: "QA Certification & Release", status: "not_started", targetDateOffsetDays: 60 },
    ],
  },
  {
    id: "template-hr-transformation",
    code: "HR_ONBOARDING",
    name: "HR Digital Transformation & Employee Onboarding",
    category: "Human Resources",
    description: "Enterprise HR workflow template for policy rollout, digital document collection, biometric enrollment, and shift scheduling.",
    estimatedDays: 45,
    tasks: [
      { title: "Company Document Vault & Policy Seed", status: "todo", priority: "medium", assignee: "HR Ops" },
      { title: "Biometric Device Enrollment & Shift Mapping", status: "todo", priority: "high", assignee: "HR Admin" },
      { title: "Statutory Payroll & Tax Slabs Configuration", status: "todo", priority: "critical", assignee: "Payroll Manager" },
      { title: "Staff Onboarding & 2FA Security Verification", status: "todo", priority: "high", assignee: "IT Security" },
    ],
    milestones: [
      { title: "Policy & Master Data Ingestion", status: "not_started", targetDateOffsetDays: 15 },
      { title: "Payroll & Biometric Operational Pilot", status: "not_started", targetDateOffsetDays: 30 },
      { title: "Full Organization Go-Live", status: "not_started", targetDateOffsetDays: 45 },
    ],
  },
];

// GET /api/projects/templates - Return pre-configured project templates
projectsRouter.get("/templates", requireAuth, async (req: AuthRequest, res: Response) => {
  return res.json({ success: true, templates: STANDARD_PROJECT_TEMPLATES });
});

// POST /api/projects/from-template - Instantiate a new project from a selected template
projectsRouter.post("/from-template", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { templateCode, name, clientName, budget, startDate } = req.body;

    const template = STANDARD_PROJECT_TEMPLATES.find((t) => t.code === templateCode || t.id === templateCode);
    if (!template) {
      return res.status(404).json({
        error: `Project template not found. Available templates: ${STANDARD_PROJECT_TEMPLATES.map((t) => t.code).join(", ")}`,
      });
    }

    const projectName = name?.trim() || template.name;
    const projectStartDate = startDate ? new Date(startDate) : new Date();
    const dueDate = new Date(projectStartDate.getTime() + template.estimatedDays * 86400000);

    const project = await prisma.project.create({
      data: {
        tenantId,
        name: projectName,
        description: template.description,
        status: "in_progress",
        priority: "high",
        clientName: clientName?.trim() || null,
        budget: budget ? Number(budget) : null,
        startDate: projectStartDate,
        dueDate,
        progress: 0,
        tasks: {
          create: template.tasks.map((task) => ({
            tenantId,
            title: task.title,
            description: `Generated from template: ${template.name}`,
            status: task.status,
            priority: task.priority,
            assignedTo: task.assignee,
          })),
        },
        milestones: {
          create: template.milestones.map((m) => ({
            tenantId,
            title: m.title,
            status: m.status,
            dueDate: new Date(projectStartDate.getTime() + m.targetDateOffsetDays * 86400000),
          })),
        },
      },
      include: {
        tasks: true,
        milestones: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Project "${project.name}" instantiated from template "${template.name}" successfully.`,
      project,
    });
  } catch (err: any) {
    console.error("Projects from-template POST error:", err);
    return res.status(500).json({ error: err.message || "Failed to create project from template" });
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

    const result = await prisma.project.deleteMany({
      where: { id, tenantId },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: "Project not found in this workspace." });
    }

    return res.json({ success: true, message: "Project deleted" });
  } catch (err: any) {
    console.error("Projects DELETE error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete project" });
  }
});

// GET /api/projects/tasks - List tasks across projects with filtering
projectsRouter.get("/tasks", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { status, priority, assignedTo, search } = req.query;

    const where: any = { tenantId };
    if (status && status !== "all") where.status = String(status);
    if (priority && priority !== "all") where.priority = String(priority);
    if (assignedTo && assignedTo !== "all") where.assignedTo = String(assignedTo);
    if (search) {
      where.OR = [
        { title: { contains: String(search) } },
        { description: { contains: String(search) } },
      ];
    }

    const tasks = await prisma.projectTask.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(
      tasks.map((t: any) => ({
        id: t.id,
        projectId: t.projectId,
        projectName: t.project?.name || "General Project",
        title: t.title,
        description: t.description || "",
        status: t.status,
        priority: t.priority,
        assignee: t.assignedTo || "Unassigned",
        dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : "",
        createdAt: t.createdAt.toISOString(),
      }))
    );
  } catch (err: any) {
    console.error("Tasks GET error:", err);
    return res.status(500).json({ error: err.message || "Failed to list tasks" });
  }
});

// POST /api/projects/tasks - Create task directly (for global task board)
projectsRouter.post("/tasks", requireAuth, enforceIdempotency, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { title, description, priority, assignee, dueDate, status, projectId } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Task title is required." });
    }

    let targetProjectId = projectId;
    if (!targetProjectId) {
      let defaultPrj = await prisma.project.findFirst({ where: { tenantId } });
      if (!defaultPrj) {
        defaultPrj = await prisma.project.create({
          data: {
            tenantId,
            name: "Hospital Administration System",
            status: "in_progress",
            priority: "high",
          },
        });
      }
      targetProjectId = defaultPrj.id;
    }

    const task = await prisma.projectTask.create({
      data: {
        tenantId,
        projectId: targetProjectId,
        title: title.trim(),
        description: description || null,
        status: status || "todo",
        priority: priority || "medium",
        assignedTo: assignee || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    });

    return res.status(201).json({
      id: task.id,
      projectId: task.projectId,
      projectName: task.project?.name || "General Project",
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

// GET /api/projects/:id - Retrieve project details by ID with tasks, team, stats
projectsRouter.get("/:id", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.params.id === "teams") return next();
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;

    let project = await prisma.project.findFirst({
      where: { id, tenantId },
      include: {
        tasks: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!project && id === "default") {
      project = await prisma.project.findFirst({
        where: { tenantId },
        include: {
          tasks: {
            orderBy: { createdAt: "desc" },
          },
        },
      });
    }

    if (!project) {
      return res.status(404).json({ error: "Project not found in this workspace." });
    }

    const tasks = project.tasks.map((t) => ({
      id: t.id,
      projectId: t.projectId,
      title: t.title,
      description: t.description || "",
      status: t.status,
      priority: t.priority,
      assignee: t.assignedTo || "Unassigned",
      dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : "",
      createdAt: t.createdAt.toISOString(),
    }));

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "completed" || t.status === "done").length;
    const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
    const onHoldTasks = tasks.filter((t) => t.status === "on_hold" || t.status === "onhold").length;
    const todoTasks = tasks.filter((t) => t.status === "todo").length;

    // Distinct team members from assignees
    const assignees = Array.from(new Set(tasks.map((t) => t.assignee).filter((a) => a && a !== "Unassigned")));
    const team = assignees.map((name, idx) => ({
      id: `member-${idx + 1}`,
      name,
      role: idx === 0 ? "Project Lead" : "Contributor",
    }));

    // Default enterprise files if empty
    const files = (project.files as any[]) || [
      {
        id: "file-1",
        name: "Project_Architecture_Spec.docx",
        size: "7.6 MB",
        type: "docx",
        uploadedAt: project.createdAt.toISOString(),
        uploadedBy: team[0]?.name || "Project Lead",
      },
      {
        id: "file-2",
        name: "Commercial_Scope_Proposal.pdf",
        size: "12.6 MB",
        type: "pdf",
        uploadedAt: project.createdAt.toISOString(),
        uploadedBy: "Cameron",
      },
      {
        id: "file-3",
        name: "Design_Assets_Tokens.zip",
        size: "6.2 MB",
        type: "zip",
        uploadedAt: project.createdAt.toISOString(),
        uploadedBy: "Lewis",
      },
    ];

    // Default enterprise notes if empty
    const notes = (project.notes as any[]) || [
      {
        id: "note-1",
        title: "Architecture & Design Review",
        date: new Date().toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }),
        content: "Enterprise modular app project streamlines operational workflows by integrating tools for scheduling, communication, and milestone sign-off.",
        author: team[0]?.name || "Lead Architect",
      },
    ];

    // Default enterprise activities if empty
    const activities = (project.activities as any[]) || [
      {
        id: "act-1",
        actor: "Andrew",
        action: "added a new task",
        target: tasks[0]?.title || "Core Architecture Setup",
        timestamp: "Today, 10:30 AM",
        icon: "task",
      },
      {
        id: "act-2",
        actor: "Jermai",
        action: "updated task status to",
        target: "In Progress",
        timestamp: "Yesterday, 04:15 PM",
        icon: "move",
      },
    ];

    const computedProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : (project.progress || 0);

    return res.json({
      id: project.id,
      name: project.name,
      description: project.description || "",
      status: project.status,
      priority: project.priority,
      progress: computedProgress,
      clientName: project.clientName || "Corporate Account",
      budget: Number(project.budget || 0),
      startDate: project.startDate ? project.startDate.toISOString().slice(0, 10) : "",
      dueDate: project.dueDate ? project.dueDate.toISOString().slice(0, 10) : "",
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      tasksCount: {
        total: totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks,
        onHold: onHoldTasks,
        todo: todoTasks,
      },
      team,
      tasks,
      files,
      notes,
      activities,
    });
  } catch (err: any) {
    console.error("Project GET by ID error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch project details" });
  }
});

// PUT /api/projects/:id - Update project fields
projectsRouter.put("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;
    const body = req.body;

    const dataToUpdate: any = {};
    if (body.name !== undefined) dataToUpdate.name = body.name.trim();
    if (body.description !== undefined) dataToUpdate.description = body.description;
    if (body.status !== undefined) dataToUpdate.status = body.status;
    if (body.priority !== undefined) dataToUpdate.priority = body.priority;
    if (body.clientName !== undefined) dataToUpdate.clientName = body.clientName;
    if (body.budget !== undefined) dataToUpdate.budget = Number(body.budget) || 0;
    if (body.progress !== undefined) dataToUpdate.progress = Number(body.progress) || 0;
    if (body.startDate !== undefined) dataToUpdate.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.dueDate !== undefined) dataToUpdate.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.files !== undefined) dataToUpdate.files = body.files;
    if (body.notes !== undefined) dataToUpdate.notes = body.notes;
    if (body.activities !== undefined) dataToUpdate.activities = body.activities;

    const existing = await prisma.project.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Project not found in this workspace." });
    }

    const updated = await prisma.project.update({
      where: { id: existing.id },
      data: dataToUpdate,
      include: { tasks: true },
    });

    return res.json({
      id: updated.id,
      name: updated.name,
      description: updated.description || "",
      status: updated.status,
      priority: updated.priority,
      clientName: updated.clientName || "",
      budget: Number(updated.budget || 0),
      progress: updated.progress,
      startDate: updated.startDate ? updated.startDate.toISOString().slice(0, 10) : "",
      dueDate: updated.dueDate ? updated.dueDate.toISOString().slice(0, 10) : "",
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      tasks: updated.tasks,
    });
  } catch (err: any) {
    console.error("Project PUT error:", err);
    return res.status(500).json({ error: err.message || "Failed to update project" });
  }
});

// POST /api/projects/:id/notes - Add a note to project
projectsRouter.post("/:id/notes", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;
    const { title, content } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Note title is required" });
    }

    const project = await prisma.project.findFirst({ where: { id, tenantId } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const existingNotes = (project.notes as any[]) || [];
    const newNote = {
      id: `note-${Date.now()}`,
      title: title.trim(),
      content: content || "",
      date: new Date().toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }),
      author: (req.user as any)?.name || req.user?.email || "Team Member",
    };

    const updated = await prisma.project.update({
      where: { id },
      data: {
        notes: [newNote, ...existingNotes],
      },
    });

    return res.status(201).json(newNote);
  } catch (err: any) {
    console.error("Project Add Note error:", err);
    return res.status(500).json({ error: err.message || "Failed to add note" });
  }
});

// POST /api/projects/:id/files - Add a document/file record
projectsRouter.post("/:id/files", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;
    const { name, size = "2.4 MB", type = "pdf" } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "File name is required" });
    }

    const project = await prisma.project.findFirst({ where: { id, tenantId } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const existingFiles = (project.files as any[]) || [];
    const newFile = {
      id: `file-${Date.now()}`,
      name: name.trim(),
      size,
      type,
      uploadedAt: new Date().toISOString(),
      uploadedBy: (req.user as any)?.name || req.user?.email || "Team Member",
    };

    await prisma.project.update({
      where: { id },
      data: {
        files: [newFile, ...existingFiles],
      },
    });

    return res.status(201).json(newFile);
  } catch (err: any) {
    console.error("Project Add File error:", err);
    return res.status(500).json({ error: err.message || "Failed to add file" });
  }
});

// GET /api/projects/:id/tasks - Get tasks under a specific project
projectsRouter.get("/:id/tasks", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id: projectId } = req.params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId },
    });
    if (!project) {
      return res.status(404).json({ error: "Project not found in this workspace." });
    }

    const tasks = await prisma.projectTask.findMany({
      where: { projectId: project.id, tenantId },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      tasks: tasks.map((t) => ({
        id: t.id,
        projectId: t.projectId,
        title: t.title,
        description: t.description || "",
        status: t.status,
        priority: t.priority,
        category: (t as any).category || "Web Layout",
        progress: (t as any).progress || 0,
        assignee: t.assignedTo || "Unassigned",
        dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : "",
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (err: any) {
    console.error("Project GET tasks error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch project tasks" });
  }
});

// POST /api/projects/:id/tasks - Create task under project
projectsRouter.post("/:id/tasks", requireAuth, enforceIdempotency, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id: projectId } = req.params;
    const body = req.body;

    if (!body.title || !body.title.trim()) {
      return res.status(400).json({ error: "Task title is required" });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId },
    });
    if (!project) {
      return res.status(404).json({ error: "Project not found in this workspace." });
    }

    const task = await prisma.projectTask.create({
      data: {
        tenantId,
        projectId: project.id,
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
projectsRouter.put("/tasks/:taskId", requireAuth, enforceIdempotency, async (req: AuthRequest, res: Response) => {
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

    const result = await prisma.projectTask.updateMany({
      where: { id: taskId, tenantId },
      data: dataToUpdate,
    });

    if (result.count === 0) {
      return res.status(404).json({ error: "Task not found in this workspace." });
    }

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

    const result = await prisma.projectTask.deleteMany({
      where: { id: taskId, tenantId },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: "Task not found in this workspace." });
    }

    return res.json({ success: true, message: "Task deleted" });
  } catch (err: any) {
    console.error("Task DELETE error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete task" });
  }
});

// -------------------------------------------------------------
// TIMESHEETS & PROJECT AUTO-INVOICE BATCH ENGINE
// -------------------------------------------------------------

// POST /api/projects/:id/generate-invoice
projectsRouter.post("/:id/generate-invoice", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;
    const {
      hourlyRate = 1500,
      customHours,
      taxPercent = 18,
      notes = "Consulting services rendered as per project timesheet",
      dueDateDays = 30,
    } = req.body;

    const project = await prisma.project.findFirst({
      where: { id, tenantId },
      include: { tasks: true },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found in this workspace." });
    }

    // Determine billable hours
    const totalHours = customHours !== undefined
      ? Number(customHours)
      : Math.max(project.tasks.length * 8, 40); // default 8 hours per completed milestone/task or 40h

    const subtotal = totalHours * Number(hourlyRate);
    const taxAmt = Math.round((subtotal * (Number(taxPercent) / 100)) * 100) / 100;
    const total = subtotal + taxAmt;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Number(dueDateDays));

    // Fallback warehouse
    let defaultWh = await prisma.warehouse.findFirst({ where: { tenantId } });
    if (!defaultWh) {
      defaultWh = await prisma.warehouse.create({
        data: { tenantId, name: "Consulting Operations HQ", location: "Main HQ" },
      });
    }

    // Match or create fallback service product for timesheet/milestone billing
    let serviceProduct = await prisma.product.findFirst({
      where: { tenantId, name: "Consulting & Professional Services" },
    });
    if (!serviceProduct) {
      serviceProduct = await prisma.product.findFirst({ where: { tenantId } });
    }
    if (!serviceProduct) {
      serviceProduct = await prisma.product.create({
        data: {
          tenantId,
          name: "Consulting & Professional Services",
          sku: `SRV-${Date.now().toString().slice(-6)}`,
          purchasePrice: 0,
          salePrice: Number(hourlyRate),
          lowStockThreshold: 0,
        },
      });
    }

    // Match or create client customer
    let customer = null;
    if (project.clientName) {
      customer = await prisma.customer.findFirst({
        where: { tenantId, name: project.clientName },
      });
      if (!customer) {
        try {
          customer = await prisma.customer.create({
            data: {
              tenantId,
              name: project.clientName,
              email: `billing@${project.clientName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
            },
          });
        } catch {}
      }
    }

    // Generate formal invoice
    const count = await prisma.sale.count({ where: { tenantId, type: "invoice" } });
    const invoiceNo = `INV-PRJ-${Date.now().toString().slice(-4)}-${count + 1}`;

    const invoice = await prisma.sale.create({
      data: {
        tenantId,
        invoiceNo,
        type: "invoice",
        warehouseId: defaultWh.id,
        customerId: customer?.id || null,
        customerName: project.clientName || "Project Client",
        paymentStatus: "unpaid",
        subtotal,
        taxMode: "sgst_cgst",
        cgst: taxAmt / 2,
        sgst: taxAmt / 2,
        igst: 0,
        totalTax: taxAmt,
        total,
        paidAmount: 0,
        date: new Date(),
        dueDate,
        notes: `[Project: ${project.name}] ${notes}`,
        details: {
          create: [
            {
              productId: serviceProduct.id,
              productName: `${project.name} - Timesheet & Milestones (${totalHours} hrs @ ₹${hourlyRate}/hr)`,
              quantity: totalHours,
              price: Number(hourlyRate),
              taxRate: Number(taxPercent),
              taxAmount: taxAmt,
              subtotal,
              hsnSac: "998311", // IT Consulting Services SAC Code
            },
          ],
        },
      },
      include: {
        details: true,
      },
    });

    return res.status(201).json({
      success: true,
      id: invoice.id,
      invoiceNo: invoice.invoiceNo,
      subtotal,
      total,
      invoice: {
        id: invoice.id,
        invoiceNo: invoice.invoiceNo,
        projectName: project.name,
        clientName: invoice.customerName,
        totalHours,
        hourlyRate,
        subtotal,
        tax: taxAmt,
        total,
        dueDate: invoice.dueDate,
        status: invoice.paymentStatus,
      },
      message: `Successfully converted timesheets to formal Invoice ${invoice.invoiceNo} for project '${project.name}'!`,
    });
  } catch (err: any) {
    console.error("Generate invoice error:", err);
    return res.status(500).json({ error: err.message || "Failed to generate project invoice" });
  }
});

// -------------------------------------------------------------
// PROJECT MILESTONES (RELATIONAL DB BACKED)
// -------------------------------------------------------------

// GET /api/projects/:id/milestones
projectsRouter.get("/:id/milestones", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;

    const milestones = await prisma.projectMilestone.findMany({
      where: { projectId: id, tenantId },
      orderBy: { createdAt: "asc" },
    });

    return res.json(
      milestones.map((m) => ({
        id: m.id,
        projectId: m.projectId,
        title: m.title,
        description: m.description || "",
        cost: Number(m.cost),
        status: m.status,
        dueDate: m.dueDate ? m.dueDate.toISOString().split("T")[0] : null,
        completedAt: m.completedAt ? m.completedAt.toISOString() : null,
        createdAt: m.createdAt.toISOString(),
      }))
    );
  } catch (err: any) {
    console.error("Milestones GET error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch milestones" });
  }
});

// POST /api/projects/:id/milestones
projectsRouter.post("/:id/milestones", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;
    const { title, description, cost, dueDate, status } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Milestone title is required" });
    }

    const project = await prisma.project.findFirst({
      where: { id, tenantId },
    });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const milestone = await prisma.projectMilestone.create({
      data: {
        tenantId,
        projectId: id,
        title: title.trim(),
        description: description || null,
        cost: Number(cost || 0),
        dueDate: dueDate ? new Date(dueDate) : null,
        status: status || "pending",
        completedAt: status === "completed" ? new Date() : null,
      },
    });

    return res.status(201).json({
      id: milestone.id,
      projectId: milestone.projectId,
      title: milestone.title,
      description: milestone.description,
      cost: Number(milestone.cost),
      status: milestone.status,
      dueDate: milestone.dueDate ? milestone.dueDate.toISOString().split("T")[0] : null,
      createdAt: milestone.createdAt.toISOString(),
    });
  } catch (err: any) {
    console.error("Milestone POST error:", err);
    return res.status(500).json({ error: err.message || "Failed to create milestone" });
  }
});

// PATCH /api/projects/:id/milestones/:mid
projectsRouter.patch("/:id/milestones/:mid", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id, mid } = req.params;
    const { status, title, description, cost, dueDate } = req.body;

    const existing = await prisma.projectMilestone.findFirst({
      where: { id: mid, projectId: id, tenantId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Milestone not found" });
    }

    const dataToUpdate: any = {};
    if (status !== undefined) {
      dataToUpdate.status = status;
      if (status === "completed") {
        dataToUpdate.completedAt = new Date();
      } else {
        dataToUpdate.completedAt = null;
      }
    }
    if (title !== undefined) dataToUpdate.title = title;
    if (description !== undefined) dataToUpdate.description = description;
    if (cost !== undefined) dataToUpdate.cost = Number(cost);
    if (dueDate !== undefined) dataToUpdate.dueDate = dueDate ? new Date(dueDate) : null;

    const updated = await prisma.projectMilestone.update({
      where: { id: mid },
      data: dataToUpdate,
    });

    // Update project progress percentage based on completed milestones
    const allMilestones = await prisma.projectMilestone.findMany({
      where: { projectId: id, tenantId },
    });
    if (allMilestones.length > 0) {
      const completed = allMilestones.filter((m) => m.status === "completed").length;
      const progress = Math.round((completed / allMilestones.length) * 100);
      await prisma.project.update({
        where: { id },
        data: { progress },
      });
    }

    return res.json({ success: true, milestone: updated });
  } catch (err: any) {
    console.error("Milestone PATCH error:", err);
    return res.status(500).json({ error: err.message || "Failed to update milestone" });
  }
});

// DELETE /api/projects/:id/milestones/:mid
projectsRouter.delete("/:id/milestones/:mid", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id, mid } = req.params;

    const existing = await prisma.projectMilestone.findFirst({
      where: { id: mid, projectId: id, tenantId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Milestone not found" });
    }

    await prisma.projectMilestone.delete({ where: { id: mid } });

    return res.json({ success: true, message: "Milestone deleted" });
  } catch (err: any) {
    console.error("Milestone DELETE error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete milestone" });
  }
});

// ==========================================
// TEAMS & PROJECTS HUB API (Tenant-scoped)
// ==========================================

const getTeamsSlug = (tenantId: string) => `system-teams-hub-${tenantId}`;

async function loadTenantTeams(tenantId: string): Promise<any[]> {
  const slug = getTeamsSlug(tenantId);
  const page = await prisma.cmsPage.findUnique({ where: { slug } }).catch(() => null);
  const stored = (page?.content as any)?.teams;
  if (Array.isArray(stored) && stored.length > 0) {
    return stored;
  }

  // Bootstrap initial teams from relational Prisma projects & departments
  const [projects, departments] = await Promise.all([
    prisma.project.findMany({ where: { tenantId }, take: 12, orderBy: { createdAt: "desc" } }).catch(() => []),
    prisma.department.findMany({ where: { tenantId }, take: 6 }).catch(() => []),
  ]);

  const colors = ["#4F46E5", "#10B981", "#F59E0B", "#0EA5E9", "#EC4899", "#8B5CF6"];
  const seeded =
    departments.length > 0
      ? departments.map((dept: any, idx: number) => ({
          id: `team-${dept.id}`,
          name: dept.name,
          department: dept.name,
          description: dept.description || `${dept.name} collaborative workspace team.`,
          color: colors[idx % colors.length],
          inviteCode: `${dept.name.slice(0, 3).toUpperCase()}-${1000 + idx * 111}`,
          memberUserIds: [],
          members: [],
          projects:
            idx === 0
              ? projects.map((p: any) => ({
                  id: p.id,
                  name: p.name,
                  client: p.clientName || "Internal",
                  priority: p.priority || "High",
                  progress: Number(p.progress || 0),
                  tasksCount: 0,
                }))
              : [],
        }))
      : [
          {
            id: `team-core-${tenantId}`,
            name: "Core Workspace Team",
            department: "Engineering",
            description: "Default cross-functional team for projects & deliverables.",
            color: "#4F46E5",
            inviteCode: "CORE-2026",
            memberUserIds: [],
            members: [],
            projects: projects.map((p: any) => ({
              id: p.id,
              name: p.name,
              client: p.clientName || "Internal",
              priority: p.priority || "High",
              progress: Number(p.progress || 0),
              tasksCount: 0,
            })),
          },
        ];

  return seeded;
}

async function saveTenantTeams(tenantId: string, teams: any[]) {
  const slug = getTeamsSlug(tenantId);
  await prisma.cmsPage.upsert({
    where: { slug },
    create: {
      slug,
      title: `Teams Hub (${tenantId})`,
      content: { teams } as any,
    },
    update: {
      content: { teams } as any,
    },
  });
}

// GET /api/projects/teams
projectsRouter.get("/teams", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const userId = req.user?.userId || (req.user as any)?.id || "";
    const teams = await loadTenantTeams(tenantId);
    const enriched = teams.map((t: any) => ({
      ...t,
      isJoined:
        Array.isArray(t.memberUserIds) && t.memberUserIds.length > 0
          ? t.memberUserIds.includes(userId)
          : true,
    }));
    return res.json({ success: true, data: enriched, teams: enriched });
  } catch (err: any) {
    console.error("GET /projects/teams error:", err);
    return res.status(500).json({ error: err.message || "Failed to load teams" });
  }
});

// POST /api/projects/teams
projectsRouter.post("/teams", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const userId = req.user?.userId || (req.user as any)?.id || "";
    const userEmail = req.user?.email || "Team Lead";
    const { name, department, description, color } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Team name is required" });
    }

    const teams = await loadTenantTeams(tenantId);
    const code = `${String(name).trim().slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const created = {
      id: `team-${Date.now()}`,
      name: String(name).trim(),
      department: String(department || "General").trim(),
      description: String(description || "Collaborative workspace team.").trim(),
      color: String(color || "#4F46E5"),
      inviteCode: code,
      isJoined: true,
      memberUserIds: [userId],
      members: [
        {
          id: userId || `mem-${Date.now()}`,
          name: userEmail.split("@")[0],
          role: "Lead",
          designation: "Team Creator",
          online: true,
        },
      ],
      projects: [],
    };

    await saveTenantTeams(tenantId, [created, ...teams]);
    return res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    console.error("POST /projects/teams error:", err);
    return res.status(500).json({ error: err.message || "Failed to create team" });
  }
});

// POST /api/projects/teams/join
projectsRouter.post("/teams/join", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const userId = req.user?.userId || (req.user as any)?.id || "";
    const userEmail = req.user?.email || "Member";
    const code = String(req.body?.inviteCode || "").trim().toUpperCase();

    if (!code) {
      return res.status(400).json({ error: "Invite code is required" });
    }

    const teams = await loadTenantTeams(tenantId);
    const idx = teams.findIndex((t: any) => String(t.inviteCode || "").toUpperCase() === code);
    if (idx === -1) {
      return res.status(404).json({ error: "Invalid team invite code" });
    }

    const target = teams[idx];
    const memberUserIds: string[] = Array.isArray(target.memberUserIds) ? target.memberUserIds : [];
    if (userId && !memberUserIds.includes(userId)) {
      memberUserIds.push(userId);
    }
    const members: any[] = Array.isArray(target.members) ? target.members : [];
    if (!members.some((m: any) => m.id === userId)) {
      members.push({
        id: userId || `mem-${Date.now()}`,
        name: userEmail.split("@")[0],
        role: "Member",
        designation: "Team Member",
        online: true,
      });
    }

    teams[idx] = { ...target, memberUserIds, members, isJoined: true };
    await saveTenantTeams(tenantId, teams);
    return res.json({ success: true, data: teams[idx] });
  } catch (err: any) {
    console.error("POST /projects/teams/join error:", err);
    return res.status(500).json({ error: err.message || "Failed to join team" });
  }
});

// POST /api/projects/teams/:teamId/members
projectsRouter.post("/teams/:teamId/members", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { teamId } = req.params;
    const { name, role, designation } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Member name or email is required" });
    }

    const teams = await loadTenantTeams(tenantId);
    const idx = teams.findIndex((t: any) => t.id === teamId);
    if (idx === -1) {
      return res.status(404).json({ error: "Team not found" });
    }

    const member = {
      id: `mem-${Date.now()}`,
      name: String(name).trim(),
      role: role === "Lead" || role === "Reviewer" ? role : "Member",
      designation: String(designation || "Workspace Contributor"),
      online: true,
    };

    const members = Array.isArray(teams[idx].members) ? [...teams[idx].members, member] : [member];
    teams[idx] = { ...teams[idx], members };
    await saveTenantTeams(tenantId, teams);
    return res.status(201).json({ success: true, data: member, team: teams[idx] });
  } catch (err: any) {
    console.error("POST /projects/teams/:teamId/members error:", err);
    return res.status(500).json({ error: err.message || "Failed to invite team member" });
  }
});

// PATCH /api/projects/:id - Update project progress cleanly
projectsRouter.patch("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;
    const progress = req.body?.progress !== undefined ? Math.max(0, Math.min(100, Number(req.body.progress))) : undefined;

    if (progress !== undefined) {
      await prisma.project
        .updateMany({
          where: { id, tenantId },
          data: { progress },
        })
        .catch(() => {});

      const teams = await loadTenantTeams(tenantId);
      const updatedTeams = teams.map((t: any) => ({
        ...t,
        projects: Array.isArray(t.projects)
          ? t.projects.map((p: any) => (p.id === id ? { ...p, progress } : p))
          : [],
      }));
      await saveTenantTeams(tenantId, updatedTeams);
    }

    return res.json({ success: true, projectId: id, progress });
  } catch (err: any) {
    console.error("PATCH /projects/:id error:", err);
    return res.status(500).json({ error: err.message || "Failed to update project" });
  }
});

// PATCH /api/projects/:id/archive - Archive project cleanly
projectsRouter.patch("/:id/archive", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;

    await prisma.project
      .updateMany({
        where: { id, tenantId },
        data: { status: "archived" },
      })
      .catch(() => {});

    const teams = await loadTenantTeams(tenantId);
    const updatedTeams = teams.map((t: any) => ({
      ...t,
      projects: Array.isArray(t.projects) ? t.projects.filter((p: any) => p.id !== id) : [],
    }));
    await saveTenantTeams(tenantId, updatedTeams);

    return res.json({ success: true, message: "Project archived", projectId: id });
  } catch (err: any) {
    console.error("PATCH /projects/:id/archive error:", err);
    return res.status(500).json({ error: err.message || "Failed to archive project" });
  }
});

