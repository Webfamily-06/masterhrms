"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hrCollaborationRouter = void 0;
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const calendar_service_js_1 = require("../services/calendar.service.js");
const todo_service_js_1 = require("../services/todo.service.js");
const notification_service_js_1 = require("../services/notification.service.js");
const tenant_context_js_1 = require("../context/tenant-context.js");
exports.hrCollaborationRouter = (0, express_1.Router)();
async function resolveEmployee(req) {
    const tenantId = req.user?.tenantId;
    const user = req.user;
    const userId = user.userId || user.id;
    const db = (0, tenant_context_js_1.getTenantDb)();
    return await db.employee.findFirst({
        where: { tenantId, userId },
    });
}
// ==========================================
// 1. HR CALENDAR ENDPOINTS
// ==========================================
// GET /api/v1/hr/calendar/events
exports.hrCollaborationRouter.get("/calendar/events", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
        const category = req.query.category;
        const events = await calendar_service_js_1.CalendarService.getEvents(tenantId, {
            userId: req.user?.userId,
            startDate,
            endDate,
            category,
            isHR: true,
        });
        return res.json(events);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch calendar events" });
    }
});
// POST /api/v1/hr/calendar/events (Ad-hoc company/admin event)
exports.hrCollaborationRouter.post("/calendar/events", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        const { title, description, startDate, endDate, allDay, category, location } = req.body;
        if (!title || !startDate || !endDate) {
            return res.status(400).json({ error: "Title, startDate, and endDate are required" });
        }
        const event = await calendar_service_js_1.CalendarService.createEvent(tenantId, userId, {
            title,
            description,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            allDay: Boolean(allDay),
            category: category || "company",
            location,
        });
        return res.status(201).json(event);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to create calendar event" });
    }
});
// DELETE /api/v1/hr/calendar/events/:id
exports.hrCollaborationRouter.delete("/calendar/events/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        await calendar_service_js_1.CalendarService.deleteEvent(tenantId, req.params.id, userId, true);
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to delete calendar event" });
    }
});
// ==========================================
// 2. HR TODO / ACTION ITEMS ENDPOINTS
// ==========================================
// GET /api/v1/hr/todo/items
exports.hrCollaborationRouter.get("/todo/items", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const employee = await resolveEmployee(req);
        const statusFilter = req.query.status || "all";
        const items = await todo_service_js_1.TodoService.getTodoItems(tenantId, {
            userId: req.user?.userId,
            employeeId: employee?.id,
            isHR: true,
            statusFilter,
        });
        return res.json(items);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch todo items" });
    }
});
// POST /api/v1/hr/todo/items (Create ad-hoc todo)
exports.hrCollaborationRouter.post("/todo/items", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        const { title, description, priority, dueDate, tag } = req.body;
        if (!title)
            return res.status(400).json({ error: "Title is required" });
        const todo = await todo_service_js_1.TodoService.createPersonalTodo(tenantId, userId, {
            title,
            description,
            priority,
            dueDate: dueDate ? new Date(dueDate) : undefined,
            tag,
        });
        return res.status(201).json(todo);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to create todo item" });
    }
});
// PATCH /api/v1/hr/todo/items/status
exports.hrCollaborationRouter.patch("/todo/items/status", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        const { sourceDomain, sourceId, status, completed } = req.body;
        if (!sourceDomain || !sourceId) {
            return res.status(400).json({ error: "sourceDomain and sourceId required" });
        }
        const result = await todo_service_js_1.TodoService.updateTaskStatus(tenantId, {
            sourceDomain,
            sourceId,
            status,
            completed,
            userId: req.user?.userId,
            employeeId: employee?.id,
        });
        return res.json({ success: true, result });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to update todo status" });
    }
});
// DELETE /api/v1/hr/todo/items/:id
exports.hrCollaborationRouter.delete("/todo/items/:id", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        await todo_service_js_1.TodoService.deletePersonalTodo(tenantId, req.params.id, userId, true);
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to delete todo item" });
    }
});
// ==========================================
// 3. HR NOTIFICATIONS ENDPOINTS
// ==========================================
// GET /api/v1/hr/notifications
exports.hrCollaborationRouter.get("/notifications", auth_js_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        const unreadOnly = req.query.unread === "true";
        const limit = Math.min(Number(req.query.limit) || 30, 100);
        const offset = Number(req.query.offset) || 0;
        const moduleParam = req.query.module ? String(req.query.module) : undefined;
        const result = await notification_service_js_1.NotificationService.getUserNotifications(tenantId, userId, {
            unreadOnly,
            limit,
            offset,
            module: moduleParam,
        });
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch notifications" });
    }
});
