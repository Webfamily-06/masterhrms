import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { CalendarService } from "../services/calendar.service.js";
import { TodoService } from "../services/todo.service.js";
import { NotificationService } from "../services/notification.service.js";
import { getTenantDb } from "../context/tenant-context.js";

export const meCollaborationRouter = Router();

async function resolveEmployee(req: AuthRequest) {
  const tenantId = req.user?.tenantId!;
  const user = req.user!;
  const userId = user.userId || (user as any).id;
  const db = getTenantDb();
  return await db.employee.findFirst({
    where: { tenantId, userId },
  });
}

// ==========================================
// 1. EMPLOYEE CALENDAR ENDPOINTS
// ==========================================

// GET /api/v1/me/calendar/events
meCollaborationRouter.get("/calendar/events", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const employee = await resolveEmployee(req);
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const category = req.query.category as string | undefined;

    const events = await CalendarService.getEvents(tenantId, {
      userId: req.user?.userId,
      employeeId: employee?.id,
      startDate,
      endDate,
      category,
      isHR: false, // Strict employee privacy filtering
    });

    return res.json(events);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch employee calendar events" });
  }
});

// POST /api/v1/me/calendar/events (Personal calendar event)
meCollaborationRouter.post("/calendar/events", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const userId = req.user?.userId!;
    const { title, description, startDate, endDate, allDay, category, location } = req.body;

    if (!title || !startDate || !endDate) {
      return res.status(400).json({ error: "Title, startDate, and endDate are required" });
    }

    const event = await CalendarService.createEvent(tenantId, userId, {
      title,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      allDay: Boolean(allDay),
      category: category || "personal",
      location,
    });

    return res.status(201).json(event);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create personal calendar event" });
  }
});

// DELETE /api/v1/me/calendar/events/:id
meCollaborationRouter.delete("/calendar/events/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const userId = req.user?.userId!;
    await CalendarService.deleteEvent(tenantId, req.params.id, userId, false);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete calendar event" });
  }
});

// ==========================================
// 2. EMPLOYEE TODO / ACTION ITEMS ENDPOINTS
// ==========================================

// GET /api/v1/me/todo/items
meCollaborationRouter.get("/todo/items", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const employee = await resolveEmployee(req);
    const statusFilter = (req.query.status as any) || "all";
    const items = await TodoService.getTodoItems(tenantId, {
      userId: req.user?.userId,
      employeeId: employee?.id,
      isHR: false, // Strict employee privacy filtering
      statusFilter,
    });

    return res.json(items);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch employee todo items" });
  }
});

// POST /api/v1/me/todo/items (Create personal todo)
meCollaborationRouter.post("/todo/items", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const userId = req.user?.userId!;
    const { title, description, priority, dueDate, tag } = req.body;

    if (!title) return res.status(400).json({ error: "Title is required" });

    const todo = await TodoService.createPersonalTodo(tenantId, userId, {
      title,
      description,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      tag,
    });

    return res.status(201).json(todo);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create personal todo" });
  }
});

// PATCH /api/v1/me/todo/items/status
meCollaborationRouter.patch("/todo/items/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const employee = await resolveEmployee(req);
    const { sourceDomain, sourceId, status, completed } = req.body;

    if (!sourceDomain || !sourceId) {
      return res.status(400).json({ error: "sourceDomain and sourceId required" });
    }

    const result = await TodoService.updateTaskStatus(tenantId, {
      sourceDomain,
      sourceId,
      status,
      completed,
      userId: req.user?.userId,
      employeeId: employee?.id,
    });

    return res.json({ success: true, result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update todo status" });
  }
});

// DELETE /api/v1/me/todo/items/:id
meCollaborationRouter.delete("/todo/items/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const userId = req.user?.userId!;
    await TodoService.deletePersonalTodo(tenantId, req.params.id, userId, false);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete personal todo" });
  }
});

// ==========================================
// 3. EMPLOYEE NOTIFICATIONS ENDPOINTS
// ==========================================

// GET /api/v1/me/notifications
meCollaborationRouter.get("/notifications", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const userId = req.user?.userId!;
    const unreadOnly = req.query.unread === "true";
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const offset = Number(req.query.offset) || 0;

    const result = await NotificationService.getUserNotifications(tenantId, userId, {
      unreadOnly,
      limit,
      offset,
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch employee notifications" });
  }
});
