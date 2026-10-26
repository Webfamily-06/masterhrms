"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYSTEM_CATEGORIES = exports.calendarRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const entitlements_1 = require("../middleware/entitlements");
const calendar_reminder_scheduler_1 = require("../services/calendar-reminder.scheduler");
const notification_service_1 = require("../services/notification.service");
const pusher_service_1 = require("../services/pusher.service");
const calendar_recurrence_service_1 = require("../services/calendar-recurrence.service");
const calendar_conflict_service_1 = require("../services/calendar-conflict.service");
const calendar_audit_service_1 = require("../services/calendar-audit.service");
const calendar_export_service_1 = require("../services/calendar-export.service");
const todos_routes_1 = require("./todos.routes");
exports.calendarRouter = (0, express_1.Router)();
exports.calendarRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
// System default categories
exports.SYSTEM_CATEGORIES = [
    { id: "meeting", name: "Meetings", color: "#3b82f6", badgeClass: "bg-blue-500/15 text-blue-700 border-blue-500/30", isSystem: true },
    { id: "training", name: "Training", color: "#8b5cf6", badgeClass: "bg-purple-500/15 text-purple-700 border-purple-500/30", isSystem: true },
    { id: "leave", name: "Leave & Time Off", color: "#f59e0b", badgeClass: "bg-amber-500/15 text-amber-700 border-amber-500/30", isSystem: true },
    { id: "holiday", name: "Holidays", color: "#10b981", badgeClass: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", isSystem: true },
    { id: "birthday", name: "Birthdays", color: "#f43f5e", badgeClass: "bg-rose-500/15 text-rose-700 border-rose-500/30", isSystem: true },
    { id: "anniversary", name: "Work Anniversaries", color: "#14b8a6", badgeClass: "bg-teal-500/15 text-teal-700 border-teal-500/30", isSystem: true },
    { id: "interview", name: "Candidate Interviews", color: "#06b6d4", badgeClass: "bg-cyan-500/15 text-cyan-700 border-cyan-500/30", isSystem: true },
    { id: "onboarding", name: "Candidate Onboarding", color: "#d946ef", badgeClass: "bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-500/30", isSystem: true },
    { id: "event", name: "General Events", color: "#6366f1", badgeClass: "bg-indigo-500/15 text-indigo-700 border-indigo-500/30", isSystem: true },
    { id: "todo", name: "Todo & Tasks", color: "#0ea5e9", badgeClass: "bg-sky-500/15 text-sky-700 border-sky-500/30", isSystem: true },
];
// Helper to get custom tenant categories from Setting
async function getTenantCustomCategories(tenantId) {
    try {
        const setting = await prisma_1.prisma.setting.findFirst({
            where: {
                scope: "TENANT",
                scopeId: tenantId,
                group: "calendar",
                key: "categories",
            },
        });
        if (setting?.valueJson && Array.isArray(setting.valueJson)) {
            return setting.valueJson;
        }
    }
    catch (err) {
        console.warn(`[calendar.routes] Failed to load tenant custom categories:`, err.message);
    }
    return [];
}
// Helper to save custom tenant categories
async function saveTenantCustomCategories(tenantId, categories, updatedBy) {
    const existing = await prisma_1.prisma.setting.findFirst({
        where: {
            scope: "TENANT",
            scopeId: tenantId,
            group: "calendar",
            key: "categories",
        },
    });
    if (existing) {
        return await prisma_1.prisma.setting.update({
            where: { id: existing.id },
            data: {
                valueJson: categories,
                updatedBy: updatedBy || null,
                updatedAt: new Date(),
            },
        });
    }
    else {
        return await prisma_1.prisma.setting.create({
            data: {
                scope: "TENANT",
                scopeId: tenantId,
                group: "calendar",
                key: "categories",
                valueJson: categories,
                valueType: "JSON",
                isSecret: false,
                updatedBy: updatedBy || null,
            },
        });
    }
}
// ==========================================
// CATEGORY MANAGEMENT ENDPOINTS (Phase 3)
// ==========================================
// GET /api/calendar/categories - List available categories (system + custom tenant)
exports.calendarRouter.get("/categories", async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const custom = await getTenantCustomCategories(tenantId);
        const all = [...exports.SYSTEM_CATEGORIES, ...custom];
        return res.json({ success: true, data: all });
    }
    catch (error) {
        console.error("Error fetching categories:", error);
        return res.status(500).json({ error: error.message || "Failed to fetch categories" });
    }
});
// POST /api/calendar/categories - Create custom category
exports.calendarRouter.post("/categories", async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.userId || req.user.id;
        const { name, color, description } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: "Category name is required" });
        }
        const trimmedName = name.trim();
        const custom = await getTenantCustomCategories(tenantId);
        // Prevent duplicates against system or custom categories
        const existsInSystem = exports.SYSTEM_CATEGORIES.some(c => c.name.toLowerCase() === trimmedName.toLowerCase());
        const existsInCustom = custom.some(c => c.name.toLowerCase() === trimmedName.toLowerCase());
        if (existsInSystem || existsInCustom) {
            return res.status(400).json({ error: `A category named '${trimmedName}' already exists.` });
        }
        const id = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const newCategory = {
            id,
            name: trimmedName,
            color: color || "#6366f1",
            description: description ? description.trim() : "",
            badgeClass: "bg-primary/15 text-primary border-primary/30",
            isSystem: false,
            createdById: userId,
            createdAt: new Date().toISOString(),
        };
        custom.push(newCategory);
        await saveTenantCustomCategories(tenantId, custom, userId);
        return res.status(201).json({ success: true, data: newCategory });
    }
    catch (error) {
        console.error("Error creating category:", error);
        return res.status(500).json({ error: error.message || "Failed to create category" });
    }
});
// PUT /api/calendar/categories/:id - Update custom category
exports.calendarRouter.put("/categories/:id", async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.userId || req.user.id;
        const { id } = req.params;
        const { name, color, description } = req.body;
        if (exports.SYSTEM_CATEGORIES.some(c => c.id === id)) {
            return res.status(403).json({ error: "System default categories cannot be modified." });
        }
        const custom = await getTenantCustomCategories(tenantId);
        const index = custom.findIndex(c => c.id === id);
        if (index === -1) {
            return res.status(404).json({ error: "Category not found." });
        }
        if (name) {
            const trimmedName = name.trim();
            const duplicate = exports.SYSTEM_CATEGORIES.some(c => c.name.toLowerCase() === trimmedName.toLowerCase()) ||
                custom.some(c => c.id !== id && c.name.toLowerCase() === trimmedName.toLowerCase());
            if (duplicate) {
                return res.status(400).json({ error: `Category name '${trimmedName}' is already taken.` });
            }
            custom[index].name = trimmedName;
        }
        if (color)
            custom[index].color = color;
        if (description !== undefined)
            custom[index].description = description.trim();
        custom[index].updatedAt = new Date().toISOString();
        await saveTenantCustomCategories(tenantId, custom, userId);
        return res.json({ success: true, data: custom[index] });
    }
    catch (error) {
        console.error("Error updating category:", error);
        return res.status(500).json({ error: error.message || "Failed to update category" });
    }
});
// DELETE /api/calendar/categories/:id - Delete custom category
exports.calendarRouter.delete("/categories/:id", async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.userId || req.user.id;
        const { id } = req.params;
        if (exports.SYSTEM_CATEGORIES.some(c => c.id === id)) {
            return res.status(403).json({ error: "System default categories cannot be deleted." });
        }
        const custom = await getTenantCustomCategories(tenantId);
        const filtered = custom.filter(c => c.id !== id);
        if (filtered.length === custom.length) {
            return res.status(404).json({ error: "Category not found." });
        }
        await saveTenantCustomCategories(tenantId, filtered, userId);
        return res.json({ success: true, message: "Category deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting category:", error);
        return res.status(500).json({ error: error.message || "Failed to delete category" });
    }
});
// ==========================================
// ELIGIBLE RECIPIENTS ENDPOINT (Phase 1 & 4)
// ==========================================
// GET /api/calendar/eligible-recipients - Searchable organization members for event sharing
exports.calendarRouter.get("/eligible-recipients", async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const currentUserId = req.user.userId || req.user.id;
        const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
        const users = await prisma_1.prisma.user.findMany({
            where: {
                id: { not: currentUserId },
                profile: {
                    tenantId,
                },
                ...(query ? {
                    OR: [
                        { email: { contains: query, mode: "insensitive" } },
                        { profile: { fullName: { contains: query, mode: "insensitive" } } },
                        {
                            employees: {
                                some: {
                                    tenantId,
                                    status: "active",
                                    OR: [
                                        { firstName: { contains: query, mode: "insensitive" } },
                                        { lastName: { contains: query, mode: "insensitive" } },
                                        { email: { contains: query, mode: "insensitive" } },
                                    ],
                                },
                            },
                        },
                    ],
                } : {}),
            },
            select: {
                id: true,
                email: true,
                profile: {
                    select: {
                        fullName: true,
                        avatarUrl: true,
                    },
                },
                employees: {
                    where: { tenantId, status: "active" },
                    select: {
                        firstName: true,
                        lastName: true,
                        position: true,
                        department: {
                            select: { name: true },
                        },
                    },
                    take: 1,
                },
            },
            take: 50,
            orderBy: { createdAt: "asc" },
        });
        const emailsMissingEmp = users.filter(u => u.employees.length === 0).map(u => u.email);
        let extraEmployees = {};
        if (emailsMissingEmp.length > 0) {
            const emps = await prisma_1.prisma.employee.findMany({
                where: {
                    tenantId,
                    email: { in: emailsMissingEmp },
                    status: "active",
                },
                select: {
                    email: true,
                    firstName: true,
                    lastName: true,
                    position: true,
                    department: { select: { name: true } },
                },
            });
            for (const e of emps) {
                extraEmployees[e.email.toLowerCase()] = {
                    name: `${e.firstName} ${e.lastName}`.trim(),
                    department: e.department?.name,
                    position: e.position || undefined,
                };
            }
        }
        const members = users.map(u => {
            const emp = u.employees?.[0];
            const fallbackEmp = extraEmployees[u.email.toLowerCase()];
            const name = u.profile?.fullName || (emp ? `${emp.firstName} ${emp.lastName}`.trim() : fallbackEmp?.name || u.email.split("@")[0]);
            const department = emp?.department?.name || fallbackEmp?.department || emp?.position || fallbackEmp?.position || undefined;
            return {
                id: u.id,
                name,
                email: u.email,
                department,
                avatarUrl: u.profile?.avatarUrl || undefined,
            };
        });
        return res.json({ success: true, data: members });
    }
    catch (error) {
        console.error("Error fetching eligible recipients:", error);
        return res.status(500).json({ error: error.message || "Failed to fetch eligible recipients" });
    }
});
// ==========================================
// EVENT CRUD & MULTI-MEMBER SHARING (Phase 4 & 5)
// ==========================================
// GET /api/calendar/events - List events (personal + shared/organization + search + recurring)
exports.calendarRouter.get("/events", async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.userId || req.user.id;
        const { startDate, endDate, category, visibility, status, search, organizerId, attendeeId, roomId } = req.query;
        const whereClause = {
            tenantId,
            OR: [
                { userId },
                { visibility: "organization" },
                { category: { in: ["organization", "company", "all-hands", "holiday", "general"] } },
                { shares: { some: { recipientId: userId } } },
                { description: { contains: `[SharedWith:${userId}]` } },
                { description: { contains: `"${userId}"` } },
            ],
        };
        if (category && category !== "all") {
            whereClause.category = String(category);
        }
        if (visibility && typeof visibility === "string" && ["private", "team", "organization"].includes(visibility)) {
            whereClause.visibility = visibility;
        }
        if (status && status !== "all") {
            whereClause.status = String(status);
        }
        if (organizerId) {
            whereClause.userId = String(organizerId);
        }
        if (attendeeId) {
            whereClause.shares = { some: { recipientId: String(attendeeId) } };
        }
        if (roomId) {
            whereClause.roomId = String(roomId);
        }
        // Advanced search across title, description, and location
        if (search && typeof search === "string" && search.trim()) {
            const q = search.trim();
            whereClause.AND = [
                ...(whereClause.AND || []),
                {
                    OR: [
                        { title: { contains: q, mode: "insensitive" } },
                        { description: { contains: q, mode: "insensitive" } },
                        { location: { contains: q, mode: "insensitive" } },
                    ],
                },
            ];
        }
        // Server-enforced start/end date filters and date range validation
        let windowStart;
        let windowEnd;
        if (startDate || endDate) {
            if (startDate && isNaN(new Date(String(startDate)).getTime())) {
                return res.status(400).json({ error: "Invalid startDate format", code: "INVALID_DATE" });
            }
            if (endDate && isNaN(new Date(String(endDate)).getTime())) {
                return res.status(400).json({ error: "Invalid endDate format", code: "INVALID_DATE" });
            }
            windowStart = startDate ? new Date(String(startDate)) : undefined;
            windowEnd = endDate ? new Date(String(endDate)) : undefined;
            if (windowStart && windowEnd) {
                if (windowEnd.getTime() < windowStart.getTime()) {
                    return res.status(400).json({
                        error: "endDate must be greater than or equal to startDate",
                        code: "INVALID_DATE_RANGE",
                    });
                }
                // Guard against excessive range window (> 730 days / 2 years) to prevent server DoS
                const diffDays = (windowEnd.getTime() - windowStart.getTime()) / (1000 * 60 * 60 * 24);
                if (diffDays > 730) {
                    return res.status(400).json({
                        error: "Requested date window cannot exceed 730 days (2 years)",
                        code: "DATE_RANGE_TOO_LARGE",
                    });
                }
                // Proper calendar overlap: event starts on or before windowEnd and ends on or after windowStart
                whereClause.startDate = { lte: windowEnd };
                whereClause.endDate = { gte: windowStart };
            }
            else if (windowStart) {
                whereClause.endDate = { gte: windowStart };
            }
            else if (windowEnd) {
                whereClause.startDate = { lte: windowEnd };
            }
        }
        const events = await prisma_1.prisma.calendarEvent.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        profile: {
                            select: {
                                fullName: true,
                                avatarUrl: true,
                            },
                        },
                    },
                },
                room: {
                    select: { id: true, name: true, location: true },
                },
                shares: true,
                reminders: true,
            },
            orderBy: { startDate: "asc" },
        });
        const isSystemAdmin = req.user?.roles?.some((r) => ["super_admin", "tenant_admin"].includes(r));
        const accessible = events.filter((ev) => {
            const isOwner = ev.userId === userId;
            if (isOwner)
                return true;
            if (isSystemAdmin)
                return true;
            if (ev.visibility === "organization")
                return true;
            const isOrgCategory = ["organization", "company", "all-hands", "holiday"].includes((ev.category || "").toLowerCase());
            if (isOrgCategory && ev.visibility !== "private")
                return true;
            // Check relational shares first
            if (ev.shares && ev.shares.some((s) => s.recipientId === userId))
                return true;
            // Fallback to legacy description
            const meta = (0, calendar_reminder_scheduler_1.parseCalendarMetadata)(ev.description);
            return meta.shares.some((s) => s.recipientId === userId);
        });
        const formatted = accessible.map((ev) => {
            const isOwner = ev.userId === userId;
            const meta = (0, calendar_reminder_scheduler_1.parseCalendarMetadata)(ev.description);
            // Relational shares take precedence over description metadata
            const shares = ev.shares && ev.shares.length > 0
                ? ev.shares.map((s) => ({
                    id: s.id,
                    recipientId: s.recipientId,
                    permission: s.permission,
                    rsvpStatus: (s.rsvpStatus || "pending"),
                    sharedBy: s.sharedBy,
                    respondedAt: s.respondedAt ? s.respondedAt.toISOString() : null,
                    createdAt: s.createdAt.toISOString(),
                }))
                : meta.shares.map((s) => ({
                    recipientId: s.recipientId,
                    permission: s.permission,
                    rsvpStatus: (s.rsvpStatus || "pending"),
                    sharedBy: s.sharedBy,
                    respondedAt: s.respondedAt || null,
                    createdAt: s.createdAt,
                }));
            // Relational reminders take precedence over description metadata
            const reminders = ev.reminders && ev.reminders.length > 0
                ? ev.reminders.map((r) => ({
                    id: r.id,
                    minutesBefore: r.minutesBefore,
                    channel: r.channel,
                    status: r.status,
                    dispatchedAt: r.dispatchedAt ? r.dispatchedAt.toISOString() : null,
                    customScheduledAt: r.customScheduledAt ? r.customScheduledAt.toISOString() : null,
                    customLabel: r.customLabel || null,
                }))
                : meta.reminders;
            const userShare = shares.find((s) => s.recipientId === userId);
            return {
                id: ev.id,
                tenantId: ev.tenantId,
                userId: ev.userId,
                title: ev.title,
                description: meta.cleanDescription,
                startDate: ev.startDate.toISOString(),
                endDate: ev.endDate.toISOString(),
                allDay: ev.allDay,
                category: ev.category,
                location: ev.location,
                meetingLink: ev.meetingLink || null,
                status: ev.status || "confirmed",
                visibility: ev.visibility || "team",
                timezone: ev.timezone || "Asia/Kolkata",
                recurrenceRule: ev.recurrenceRule || null,
                recurringSeriesId: ev.recurringSeriesId || null,
                originalStartTime: ev.originalStartTime ? ev.originalStartTime.toISOString() : null,
                roomId: ev.roomId || null,
                room: ev.room || null,
                cancelledAt: ev.cancelledAt ? ev.cancelledAt.toISOString() : null,
                cancelledById: ev.cancelledById || null,
                createdAt: ev.createdAt.toISOString(),
                updatedAt: ev.updatedAt.toISOString(),
                shares,
                reminders,
                isShared: !isOwner,
                userPermission: isOwner ? "owner" : (userShare?.permission || "view"),
                userRsvp: isOwner ? "accepted" : (userShare?.rsvpStatus || "pending"),
                organizerName: ev.user?.profile?.fullName || ev.user?.email || "Organizer",
            };
        });
        // Expand recurring series events within window if window is defined
        if (windowStart && windowEnd) {
            const recurringSeries = accessible.filter((e) => e.recurrenceRule && !e.recurringSeriesId);
            if (recurringSeries.length > 0) {
                const seriesIds = recurringSeries.map((s) => s.id);
                const exceptions = await prisma_1.prisma.calendarEvent.findMany({
                    where: {
                        tenantId,
                        recurringSeriesId: { in: seriesIds },
                    },
                    include: { shares: true, reminders: true },
                });
                for (const series of recurringSeries) {
                    const seriesExceptions = exceptions.filter((ex) => ex.recurringSeriesId === series.id);
                    const expanded = calendar_recurrence_service_1.CalendarRecurrenceService.expandSeries(series, windowStart, windowEnd, seriesExceptions);
                    // Replace base series in formatted list with expanded occurrences
                    const rootIndex = formatted.findIndex((f) => f.id === series.id);
                    if (rootIndex !== -1) {
                        formatted.splice(rootIndex, 1);
                    }
                    for (const occ of expanded) {
                        formatted.push({
                            ...series,
                            id: occ.id,
                            title: occ.title,
                            description: occ.description || series.description,
                            startDate: occ.startDate,
                            endDate: occ.endDate,
                            allDay: occ.allDay,
                            location: occ.location || series.location,
                            meetingLink: occ.meetingLink || series.meetingLink,
                            status: occ.status,
                            originalStartTime: occ.originalStartTime,
                            recurringSeriesId: occ.recurringSeriesId,
                            isRecurringInstance: true,
                        });
                    }
                }
            }
        }
        // Project Todo & Tasks into Calendar
        if (!category || category === "all" || category === "todo" || category === "task") {
            try {
                const isHR = req.user?.roles?.some((r) => ["super_admin", "tenant_admin", "hr_admin", "admin"].includes(r));
                let currentEmpId;
                const emp = await prisma_1.prisma.employee.findFirst({
                    where: { tenantId, userId },
                    select: { id: true },
                });
                currentEmpId = emp?.id;
                const todoWhere = { tenantId };
                if (windowStart && windowEnd) {
                    todoWhere.OR = [
                        { dueDate: { gte: windowStart, lte: windowEnd } },
                        { dueDate: null },
                    ];
                }
                if (!isHR && !isSystemAdmin) {
                    const participantFilters = [
                        { userId },
                        { description: { contains: `[Assignee:${userId}]` } },
                        { description: { contains: `"${userId}"` } },
                    ];
                    if (currentEmpId) {
                        participantFilters.push({ description: { contains: `[Assignee:${currentEmpId}]` } }, { description: { contains: `"${currentEmpId}"` } });
                    }
                    todoWhere.AND = [
                        ...(todoWhere.AND || []),
                        { OR: participantFilters },
                    ];
                }
                const todos = await prisma_1.prisma.workspaceTodo.findMany({
                    where: todoWhere,
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                profile: {
                                    select: { fullName: true, avatarUrl: true },
                                },
                            },
                        },
                    },
                    take: 200,
                });
                for (const t of todos) {
                    const meta = (0, todos_routes_1.parseTodoMeta)(t.description);
                    if (!isHR && !isSystemAdmin) {
                        const isCreator = t.userId === userId;
                        const isPrimaryAssignee = meta.assignee?.id === userId ||
                            (currentEmpId && meta.assignee?.id === currentEmpId);
                        const isMultiAssignee = Array.isArray(meta.assignees) && meta.assignees.some((a) => a.id === userId || (currentEmpId && a.id === currentEmpId));
                        if (!isCreator && !isPrimaryAssignee && !isMultiAssignee) {
                            continue;
                        }
                    }
                    let taskStartDate = null;
                    let taskEndDate = null;
                    if (meta.startDate) {
                        const parsedStart = new Date(meta.startDate);
                        if (!isNaN(parsedStart.getTime())) {
                            taskStartDate = parsedStart;
                        }
                    }
                    if (t.dueDate) {
                        const parsedDue = new Date(t.dueDate);
                        if (!isNaN(parsedDue.getTime())) {
                            taskEndDate = parsedDue;
                        }
                    }
                    // Rule: If task has no valid schedule (neither start date nor due date), do not generate fabricated dates!
                    if (!taskStartDate && !taskEndDate) {
                        continue;
                    }
                    // Rule: If only dueDate exists, start date = dueDate (all-day event on dueDate)
                    if (!taskStartDate && taskEndDate) {
                        taskStartDate = taskEndDate;
                    }
                    // Rule: If only startDate exists, end date = startDate (all-day event on startDate)
                    if (taskStartDate && !taskEndDate) {
                        taskEndDate = taskStartDate;
                    }
                    // In case startDate > endDate, skip invalid range
                    if (taskStartDate.getTime() > taskEndDate.getTime()) {
                        continue;
                    }
                    // Window filtering if defined
                    if (windowStart && taskEndDate.getTime() < windowStart.getTime()) {
                        continue;
                    }
                    if (windowEnd && taskStartDate.getTime() > windowEnd.getTime()) {
                        continue;
                    }
                    const assigneeName = meta.assignee?.name || undefined;
                    const status = t.completed ? "completed" : "pending";
                    const linkTo = isHR ? `/hr/todo?taskId=${t.id}` : `/me/todo?taskId=${t.id}`;
                    formatted.push({
                        id: `todo-${t.id}`,
                        tenantId: t.tenantId,
                        userId: t.userId,
                        title: `Task: ${t.title}`,
                        description: meta.cleanDescription || "",
                        startDate: taskStartDate.toISOString(),
                        endDate: taskEndDate.toISOString(),
                        allDay: true,
                        category: "todo",
                        color: "bg-sky-600 text-white",
                        location: "",
                        meetingLink: null,
                        status,
                        visibility: "team",
                        timezone: "Asia/Kolkata",
                        recurrenceRule: null,
                        recurringSeriesId: null,
                        originalStartTime: null,
                        roomId: null,
                        room: null,
                        cancelledAt: null,
                        cancelledById: null,
                        createdAt: t.createdAt.toISOString(),
                        updatedAt: t.updatedAt.toISOString(),
                        shares: [],
                        reminders: [],
                        isShared: t.userId !== userId,
                        userPermission: "view",
                        userRsvp: "accepted",
                        organizerName: t.user?.profile?.fullName || t.user?.email || "Assigner",
                        sourceDomain: "todo",
                        sourceId: t.id,
                        linkTo,
                        priority: t.priority,
                        progress: meta.progress || (t.completed ? 100 : 0),
                        completed: t.completed,
                        employeeName: assigneeName,
                    });
                }
            }
            catch (todoErr) {
                console.warn("Failed to project todos in /api/calendar/events:", todoErr);
            }
        }
        return res.json({ success: true, data: formatted });
    }
    catch (error) {
        console.error("Error fetching calendar events:", error);
        return res.status(500).json({ error: error.message || "Failed to fetch calendar events" });
    }
});
// POST /api/calendar/events - Create new event (multi-member sharing + configurable reminders + relational persistence)
exports.calendarRouter.post("/events", async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.userId || req.user.id;
        const { title, description, startDate, endDate, allDay, category, location, meetingLink, status, visibility, timezone, sharedWith, reminders, recurrenceRule, recurrenceEndType, recurrenceCount, recurrenceUntil, roomId, ignoreConflicts, } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ error: "Event title is required" });
        }
        if (!startDate) {
            return res.status(400).json({ error: "Start date is required" });
        }
        const eventStartDate = new Date(startDate);
        if (isNaN(eventStartDate.getTime())) {
            return res.status(400).json({ error: "Invalid start date format", code: "INVALID_DATE" });
        }
        // 0a. Authoritative date validation: event date cannot be before today in the application/tenant timezone
        const now = new Date();
        const todayDateStr = now.toISOString().split("T")[0];
        const eventDateStr = eventStartDate.toISOString().split("T")[0];
        const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const eventStartMs = eventStartDate.getTime();
        if (eventStartMs < startOfTodayMs && eventDateStr < todayDateStr) {
            return res.status(400).json({
                error: "Event date cannot be scheduled before today.",
                code: "EVENT_DATE_IN_PAST",
            });
        }
        // 0b. Start Time & End Time Validation
        if (!allDay && endDate) {
            const eventEndDate = new Date(endDate);
            if (isNaN(eventEndDate.getTime())) {
                return res.status(400).json({ error: "Invalid end date format", code: "INVALID_DATE" });
            }
            if (eventEndDate.getTime() <= eventStartMs) {
                return res.status(400).json({
                    error: "End time must be later than start time.",
                    code: "INVALID_TIME_RANGE",
                });
            }
        }
        // 0c. Validate Category is Database-Backed / Known System Category
        const selectedCategory = category ? String(category).trim() : "Meetings";
        const tenantCategories = await getTenantCustomCategories(tenantId);
        const validCatNames = [
            ...exports.SYSTEM_CATEGORIES.map((c) => c.name.toLowerCase()),
            ...exports.SYSTEM_CATEGORIES.map((c) => c.id.toLowerCase()),
            ...tenantCategories.map((c) => c.name.toLowerCase()),
            ...tenantCategories.map((c) => c.id.toLowerCase()),
            "organization",
            "company",
            "team",
            "general",
            "leave",
            "holiday",
            "birthday",
            "meeting",
            "meetings",
            "training",
        ];
        if (selectedCategory && !validCatNames.includes(selectedCategory.toLowerCase())) {
            return res.status(400).json({
                error: `Category '${selectedCategory}' is not recognized or does not belong to your organization.`,
                code: "INVALID_CATEGORY",
            });
        }
        // Resolve tenant authoritative timezone
        const tenantRecord = await prisma_1.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { timezone: true },
        });
        const effectiveTimezone = timezone ? String(timezone).trim() : (tenantRecord?.timezone || "Asia/Kolkata");
        const effectiveVisibility = ["private", "team", "organization"].includes(visibility)
            ? visibility
            : (category === "organization" ? "organization" : "team");
        const effectiveStatus = ["confirmed", "tentative", "cancelled"].includes(status) ? status : "confirmed";
        // 1. Process Multi-Member Sharing
        const shares = [];
        const rawShares = Array.isArray(sharedWith) ? sharedWith : (Array.isArray(req.body.shares) ? req.body.shares : null);
        if (Array.isArray(rawShares) && rawShares.length > 0) {
            for (const item of rawShares) {
                const recipientId = typeof item === "string" ? item : item?.recipientId;
                const permission = typeof item === "object" && item?.permission === "edit" ? "edit" : "view";
                if (recipientId && recipientId !== "all") {
                    const validUser = (await prisma_1.prisma.user.findFirst({
                        where: { id: recipientId, profile: { tenantId } },
                    })) ||
                        (await prisma_1.prisma.employee.findFirst({
                            where: { id: recipientId, tenantId },
                        }));
                    if (!validUser) {
                        return res.status(400).json({
                            error: `Recipient '${recipientId}' does not belong to your organization.`,
                            code: "CROSS_TENANT_SHARING_FORBIDDEN",
                        });
                    }
                }
                if (recipientId && !shares.some((s) => s.recipientId === recipientId)) {
                    shares.push({
                        recipientId,
                        permission,
                        rsvpStatus: "pending",
                        sharedBy: userId,
                        createdAt: new Date().toISOString(),
                    });
                }
            }
        }
        // 2. Process Reminders
        const validatedReminders = [];
        if (Array.isArray(reminders)) {
            const seenSignatures = new Set();
            for (const rem of reminders) {
                if (!rem)
                    continue;
                const channel = ["email", "in_app", "both"].includes(rem.channel) ? rem.channel : "both";
                let customScheduledAt = null;
                let minutes = typeof rem?.minutesBefore === "number" ? rem.minutesBefore : parseInt(rem?.minutesBefore, 10);
                if (rem.customScheduledAt) {
                    const customDate = new Date(rem.customScheduledAt);
                    if (isNaN(customDate.getTime())) {
                        return res.status(400).json({
                            error: "Invalid custom reminder date/time.",
                            code: "INVALID_REMINDER_TIME",
                        });
                    }
                    if (customDate.getTime() > eventStartMs) {
                        return res.status(400).json({
                            error: "Custom reminder cannot be scheduled after the event start time.",
                            code: "REMINDER_AFTER_EVENT_START",
                        });
                    }
                    // Reject past custom reminder if more than 1 minute in the past
                    if (customDate.getTime() < Date.now() - 60000) {
                        return res.status(400).json({
                            error: "Custom reminder cannot be scheduled in the past.",
                            code: "REMINDER_IN_PAST",
                        });
                    }
                    customScheduledAt = customDate.toISOString();
                    minutes = Math.max(0, Math.round((eventStartMs - customDate.getTime()) / 60000));
                }
                else {
                    if (isNaN(minutes) || minutes < 0) {
                        continue;
                    }
                }
                const signature = `${customScheduledAt || minutes}:${channel}`;
                if (seenSignatures.has(signature)) {
                    continue; // Deduplicate identical reminder
                }
                seenSignatures.add(signature);
                validatedReminders.push({
                    id: rem.id || `rem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                    minutesBefore: minutes,
                    channel,
                    status: "pending",
                    customScheduledAt,
                    customLabel: rem.customLabel || null,
                });
            }
        }
        const cleanDesc = description ? description.trim() : "";
        const finalDesc = (0, calendar_reminder_scheduler_1.serializeCalendarMetadata)(cleanDesc, shares, validatedReminders);
        // 2a. Validate Room Tenant Scope
        if (roomId) {
            const room = await prisma_1.prisma.meetingRoom.findFirst({
                where: { id: String(roomId).trim(), tenantId },
            });
            if (!room) {
                return res.status(400).json({
                    error: "Selected meeting room does not exist or does not belong to your organization.",
                    code: "INVALID_ROOM",
                });
            }
        }
        // 2b. Conflict Detection for Attendees and Rooms
        const targetEnd = endDate ? new Date(endDate) : new Date(eventStartMs + 3600000);
        const attendeeIds = shares.map((s) => s.recipientId);
        const conflictCheck = await calendar_conflict_service_1.CalendarConflictService.checkConflicts({
            tenantId,
            callerUserId: userId,
            startDate: eventStartDate,
            endDate: targetEnd,
            attendeeIds,
            roomId: roomId || undefined,
        });
        const isAuthorizedToOverride = Boolean(req.user?.roles?.some((r) => ["super_admin", "tenant_admin", "hr_admin", "admin", "manager"].includes(r)));
        if (conflictCheck.hasConflict) {
            if (ignoreConflicts) {
                if (!isAuthorizedToOverride) {
                    return res.status(403).json({
                        error: "Access Denied: Only administrators and managers are authorized to override scheduling conflicts.",
                        code: "CONFLICT_OVERRIDE_FORBIDDEN",
                    });
                }
            }
            else {
                return res.status(409).json({
                    error: "Scheduling conflict detected for attendee or meeting room.",
                    code: "SCHEDULING_CONFLICT",
                    conflicts: conflictCheck,
                });
            }
        }
        // 3. Atomically write Event, Relational Shares, and Relational Reminders with Advisory Lock
        const event = await prisma_1.prisma.$transaction(async (tx) => {
            if (roomId) {
                // Advisory transaction-level lock to prevent concurrent double-booking
                await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `calendar_room_${tenantId}_${roomId}`);
                // Re-check room conflict inside locked transaction
                const conflictingEvent = await tx.calendarEvent.findFirst({
                    where: {
                        tenantId,
                        roomId: String(roomId).trim(),
                        status: { not: "cancelled" },
                        startDate: { lt: targetEnd },
                        endDate: { gt: eventStartDate },
                    },
                    select: { id: true, title: true, startDate: true, endDate: true },
                });
                const conflictingMeeting = await tx.meeting.findFirst({
                    where: {
                        tenantId,
                        roomId: String(roomId).trim(),
                        status: { not: "cancelled" },
                        startTime: { lt: targetEnd },
                        endTime: { gt: eventStartDate },
                    },
                    select: { id: true, title: true, startTime: true, endTime: true },
                });
                if (conflictingEvent || conflictingMeeting) {
                    if (!ignoreConflicts || !isAuthorizedToOverride) {
                        const conflictErr = new Error("Scheduling conflict detected for meeting room.");
                        conflictErr.code = "SCHEDULING_CONFLICT";
                        conflictErr.status = 409;
                        conflictErr.conflicts = {
                            hasConflict: true,
                            hasConflicts: true,
                            attendeeConflicts: [],
                            roomConflict: {
                                roomId,
                                roomName: "Meeting Room",
                                conflictingTitle: conflictingEvent?.title || conflictingMeeting?.title || "Busy",
                                startDate: (conflictingEvent?.startDate || conflictingMeeting?.startTime).toISOString(),
                                endDate: (conflictingEvent?.endDate || conflictingMeeting?.endTime).toISOString(),
                            },
                        };
                        throw conflictErr;
                    }
                }
            }
            const created = await tx.calendarEvent.create({
                data: {
                    tenantId,
                    userId,
                    title: title.trim(),
                    description: finalDesc || null,
                    startDate: new Date(startDate),
                    endDate: endDate ? new Date(endDate) : new Date(startDate),
                    allDay: Boolean(allDay),
                    category: category ? String(category).trim() : (effectiveVisibility === "organization" ? "organization" : "team"),
                    location: location ? location.trim() : null,
                    meetingLink: meetingLink ? String(meetingLink).trim() : null,
                    status: effectiveStatus,
                    visibility: effectiveVisibility,
                    timezone: effectiveTimezone,
                    recurrenceRule: recurrenceRule ? String(recurrenceRule).trim() : null,
                    recurrenceEndType: recurrenceEndType ? String(recurrenceEndType).trim() : null,
                    recurrenceCount: typeof recurrenceCount === "number" ? recurrenceCount : null,
                    recurrenceUntil: recurrenceUntil ? new Date(recurrenceUntil) : null,
                    roomId: roomId ? String(roomId).trim() : null,
                },
            });
            if (shares.length > 0) {
                await tx.calendarEventShare.createMany({
                    data: shares.map((s) => ({
                        eventId: created.id,
                        recipientId: s.recipientId,
                        permission: s.permission,
                        rsvpStatus: "pending",
                        sharedBy: userId,
                    })),
                });
            }
            if (validatedReminders.length > 0) {
                await tx.calendarEventReminder.createMany({
                    data: validatedReminders.map((r) => ({
                        id: r.id,
                        eventId: created.id,
                        minutesBefore: r.minutesBefore,
                        channel: r.channel,
                        status: r.status,
                        customScheduledAt: r.customScheduledAt ? new Date(r.customScheduledAt) : null,
                        customLabel: r.customLabel || null,
                    })),
                });
            }
            return created;
        });
        // 3b. Record Audit Log for Event Creation
        await calendar_audit_service_1.CalendarAuditService.record({
            tenantId,
            actorId: userId,
            actorEmail: req.user?.email,
            action: "EVENT_CREATE",
            entityId: event.id,
            afterJson: {
                id: event.id,
                title: event.title,
                startDate: event.startDate,
                endDate: event.endDate,
                recurrenceRule: event.recurrenceRule,
                roomId: event.roomId,
                visibility: event.visibility,
                status: event.status,
                conflictOverride: Boolean(ignoreConflicts && conflictCheck.hasConflict),
                overriddenConflicts: ignoreConflicts && conflictCheck.hasConflict ? conflictCheck : undefined,
            },
            ipAddress: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip,
            userAgent: req.headers["user-agent"],
        });
        // 4. Dispatch in-app notifications and Pusher alerts to invited recipients
        const creatorName = req.user?.email?.split("@")[0] || "A colleague";
        for (const s of shares) {
            try {
                await notification_service_1.NotificationService.createNotification({
                    tenantId,
                    userId: s.recipientId,
                    title: `New Calendar Invitation: ${event.title}`,
                    message: `${creatorName} invited you to an event (${s.permission === "edit" ? "Can Edit" : "View Only"}).`,
                    type: "CALENDAR_INVITE",
                    actionUrl: `/hr/calendar`,
                    metadata: {
                        eventId: event.id,
                        permission: s.permission,
                    },
                });
                await pusher_service_1.PusherService.triggerUserEvent(tenantId, s.recipientId, "calendar:event-shared", {
                    eventId: event.id,
                    title: event.title,
                    permission: s.permission,
                    organizer: creatorName,
                    startDate: event.startDate.toISOString(),
                });
            }
            catch (notifyErr) {
                console.warn(`[calendar.routes] Notification error for recipient ${s.recipientId}:`, notifyErr.message);
            }
        }
        return res.status(201).json({
            success: true,
            data: {
                ...event,
                description: cleanDesc || null,
                shares,
                reminders: validatedReminders,
            },
        });
    }
    catch (error) {
        if (error.status === 409 || error.code === "SCHEDULING_CONFLICT") {
            return res.status(409).json({
                error: error.message || "Scheduling conflict detected for attendee or meeting room.",
                code: "SCHEDULING_CONFLICT",
                conflicts: error.conflicts,
            });
        }
        console.error("Error creating calendar event:", error);
        return res.status(500).json({ error: error.message || "Failed to create calendar event" });
    }
});
// PUT /api/calendar/events/:id - Update event (with per-recipient permissions, recurrence scopes, conflict detection & audit logging)
exports.calendarRouter.put("/events/:id", async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.userId || req.user.id;
        const { id } = req.params;
        const { title, description, startDate, endDate, allDay, category, location, meetingLink, status, visibility, timezone, sharedWith, reminders, recurrenceRule, recurrenceEndType, recurrenceCount, recurrenceUntil, roomId, ignoreConflicts, recurrenceScope, occurrenceDate, } = req.body;
        let masterId = id;
        let derivedOccurrenceDate;
        if (id.startsWith("rec-")) {
            const lastDashIdx = id.lastIndexOf("-");
            if (lastDashIdx > 4) {
                masterId = id.slice(4, lastDashIdx);
                const ts = parseInt(id.slice(lastDashIdx + 1), 10);
                if (!isNaN(ts)) {
                    derivedOccurrenceDate = new Date(ts);
                }
            }
        }
        const existing = await prisma_1.prisma.calendarEvent.findFirst({
            where: { id: masterId, tenantId },
            include: {
                shares: true,
                reminders: true,
            },
        });
        if (!existing) {
            return res.status(404).json({ error: "Event not found" });
        }
        const isOwner = existing.userId === userId;
        const isSystemAdmin = req.user?.roles?.some((r) => ["super_admin", "tenant_admin"].includes(r));
        // Check permissions
        const meta = (0, calendar_reminder_scheduler_1.parseCalendarMetadata)(existing.description);
        const relationalUserShare = existing.shares.find((s) => s.recipientId === userId);
        const metaUserShare = meta.shares.find((s) => s.recipientId === userId);
        const userPermission = relationalUserShare?.permission || metaUserShare?.permission;
        if (!isOwner && !isSystemAdmin) {
            if (userPermission === "view") {
                return res.status(403).json({ error: "Access Denied: You have view-only access to this shared event." });
            }
            if (userPermission !== "edit") {
                return res.status(403).json({ error: "Access Denied: You do not own this calendar event." });
            }
        }
        // 0a. Time Range Validation
        const targetStartDate = startDate !== undefined ? new Date(startDate) : existing.startDate;
        const targetEndDate = endDate !== undefined ? new Date(endDate) : existing.endDate;
        const isAllDay = allDay !== undefined ? Boolean(allDay) : existing.allDay;
        if (startDate !== undefined && isNaN(targetStartDate.getTime())) {
            return res.status(400).json({ error: "Invalid start date format", code: "INVALID_DATE" });
        }
        if (endDate !== undefined && isNaN(targetEndDate.getTime())) {
            return res.status(400).json({ error: "Invalid end date format", code: "INVALID_DATE" });
        }
        if (!isAllDay && targetStartDate && targetEndDate && targetEndDate.getTime() <= targetStartDate.getTime()) {
            return res.status(400).json({
                error: "End time must be later than start time.",
                code: "INVALID_TIME_RANGE",
            });
        }
        // 0b. Historical vs New Date Preservation
        if (startDate !== undefined) {
            const now = new Date();
            const todayDateStr = now.toISOString().split("T")[0];
            const targetDateStr = targetStartDate.toISOString().split("T")[0];
            const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            const wasHistorical = existing.startDate.getTime() < startOfTodayMs;
            if (!wasHistorical && targetStartDate.getTime() < startOfTodayMs && targetDateStr < todayDateStr) {
                return res.status(400).json({
                    error: "Event date cannot be moved to before today.",
                    code: "EVENT_DATE_IN_PAST",
                });
            }
        }
        // 0c. Validate Category
        if (category !== undefined) {
            const tenantCategories = await getTenantCustomCategories(tenantId);
            const validCatNames = [
                ...exports.SYSTEM_CATEGORIES.map((c) => c.name.toLowerCase()),
                ...exports.SYSTEM_CATEGORIES.map((c) => c.id.toLowerCase()),
                ...tenantCategories.map((c) => c.name.toLowerCase()),
                ...tenantCategories.map((c) => c.id.toLowerCase()),
                "organization",
                "company",
                "team",
                "general",
                "leave",
                "holiday",
                "birthday",
                "anniversary",
                "interview",
                "onboarding",
                "meeting",
                "meetings",
                "training",
            ];
            if (!validCatNames.includes(String(category).toLowerCase())) {
                return res.status(400).json({
                    error: `Category '${category}' is not recognized or does not belong to your organization.`,
                    code: "INVALID_CATEGORY",
                });
            }
        }
        // Process updated shares if provided and caller is owner/admin
        let newShares = existing.shares.length > 0
            ? existing.shares.map((s) => ({
                recipientId: s.recipientId,
                permission: s.permission,
                rsvpStatus: s.rsvpStatus,
                sharedBy: s.sharedBy,
                createdAt: s.createdAt.toISOString(),
                respondedAt: s.respondedAt ? s.respondedAt.toISOString() : null,
            }))
            : meta.shares;
        const oldRecipientIds = new Set(newShares.map((s) => s.recipientId));
        const addedRecipients = [];
        const revokedRecipientIds = [];
        let updatedRecipientIds = new Set();
        const rawShares = Array.isArray(sharedWith) ? sharedWith : (Array.isArray(req.body.shares) ? req.body.shares : null);
        if (Array.isArray(rawShares) && (isOwner || isSystemAdmin)) {
            const existingShareMap = new Map(newShares.map((s) => [s.recipientId, s]));
            newShares = [];
            updatedRecipientIds = new Set();
            for (const item of rawShares) {
                const recipientId = typeof item === "string" ? item : item?.recipientId;
                const permission = typeof item === "object" && item?.permission === "edit" ? "edit" : "view";
                if (recipientId && recipientId !== "all") {
                    const validUser = (await prisma_1.prisma.user.findFirst({
                        where: { id: recipientId, profile: { tenantId } },
                    })) ||
                        (await prisma_1.prisma.employee.findFirst({
                            where: { id: recipientId, tenantId },
                        }));
                    if (!validUser) {
                        return res.status(400).json({
                            error: `Recipient '${recipientId}' does not belong to your organization.`,
                            code: "CROSS_TENANT_SHARING_FORBIDDEN",
                        });
                    }
                }
                if (recipientId && !newShares.some((s) => s.recipientId === recipientId)) {
                    const prevShare = existingShareMap.get(recipientId);
                    const shareObj = {
                        recipientId,
                        permission,
                        rsvpStatus: prevShare?.rsvpStatus || "pending",
                        sharedBy: prevShare?.sharedBy || userId,
                        createdAt: prevShare?.createdAt || new Date().toISOString(),
                        respondedAt: prevShare?.respondedAt || null,
                    };
                    newShares.push(shareObj);
                    updatedRecipientIds.add(recipientId);
                    if (!oldRecipientIds.has(recipientId)) {
                        addedRecipients.push(shareObj);
                    }
                }
            }
            for (const oldId of oldRecipientIds) {
                if (!updatedRecipientIds.has(oldId)) {
                    revokedRecipientIds.push(oldId);
                }
            }
        }
        else {
            updatedRecipientIds = new Set(newShares.map((s) => s.recipientId));
        }
        // Process updated reminders if provided
        let newReminders = existing.reminders.length > 0
            ? existing.reminders.map((r) => ({
                id: r.id,
                minutesBefore: r.minutesBefore,
                channel: r.channel,
                status: r.status,
                dispatchedAt: r.dispatchedAt ? r.dispatchedAt.toISOString() : null,
                customScheduledAt: r.customScheduledAt ? r.customScheduledAt.toISOString() : null,
                customLabel: r.customLabel || null,
            }))
            : meta.reminders;
        if (Array.isArray(reminders)) {
            newReminders = [];
            const seenSignatures = new Set();
            const eventStartMs = new Date(startDate !== undefined ? startDate : existing.startDate).getTime();
            for (const rem of reminders) {
                if (!rem)
                    continue;
                const channel = ["email", "in_app", "both"].includes(rem.channel) ? rem.channel : "both";
                let customScheduledAt = null;
                let minutes = typeof rem?.minutesBefore === "number" ? rem.minutesBefore : parseInt(rem?.minutesBefore, 10);
                if (rem.customScheduledAt) {
                    const customDate = new Date(rem.customScheduledAt);
                    if (isNaN(customDate.getTime())) {
                        return res.status(400).json({
                            error: "Invalid custom reminder date/time.",
                            code: "INVALID_REMINDER_TIME",
                        });
                    }
                    if (customDate.getTime() > eventStartMs) {
                        return res.status(400).json({
                            error: "Custom reminder cannot be scheduled after the event start time.",
                            code: "REMINDER_AFTER_EVENT_START",
                        });
                    }
                    const prevRem = (existing.reminders.length > 0 ? existing.reminders : meta.reminders).find((r) => r.id === rem.id);
                    const isPrevUnchanged = prevRem && prevRem.customScheduledAt === customDate.toISOString();
                    if (!isPrevUnchanged && customDate.getTime() < Date.now() - 60000) {
                        return res.status(400).json({
                            error: "Custom reminder cannot be scheduled in the past.",
                            code: "REMINDER_IN_PAST",
                        });
                    }
                    customScheduledAt = customDate.toISOString();
                    minutes = Math.max(0, Math.round((eventStartMs - customDate.getTime()) / 60000));
                }
                else {
                    if (isNaN(minutes) || minutes < 0) {
                        continue;
                    }
                }
                const signature = `${customScheduledAt || minutes}:${channel}`;
                if (seenSignatures.has(signature)) {
                    continue;
                }
                seenSignatures.add(signature);
                const existingRem = (existing.reminders.length > 0 ? existing.reminders : meta.reminders).find((r) => r.id === rem.id);
                const existingCustomStr = existingRem?.customScheduledAt
                    ? existingRem.customScheduledAt instanceof Date
                        ? existingRem.customScheduledAt.toISOString()
                        : existingRem.customScheduledAt
                    : null;
                const isUnchanged = existingRem &&
                    existingRem.minutesBefore === minutes &&
                    existingRem.channel === channel &&
                    existingCustomStr === customScheduledAt;
                newReminders.push({
                    id: rem.id || `rem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                    minutesBefore: minutes,
                    channel,
                    status: isUnchanged ? existingRem.status : "pending",
                    dispatchedAt: isUnchanged
                        ? existingRem.dispatchedAt instanceof Date
                            ? existingRem.dispatchedAt.toISOString()
                            : existingRem.dispatchedAt
                        : null,
                    customScheduledAt,
                    customLabel: rem.customLabel || null,
                });
            }
        }
        const cleanDesc = description !== undefined ? (description ? description.trim() : "") : meta.cleanDescription;
        const finalDesc = (0, calendar_reminder_scheduler_1.serializeCalendarMetadata)(cleanDesc, newShares, newReminders);
        const targetRoomId = roomId !== undefined ? (roomId ? String(roomId).trim() : null) : existing.roomId;
        const effectiveScope = recurrenceScope || (id.startsWith("rec-") ? "this_occurrence" : undefined);
        const effectiveOccurrenceDate = occurrenceDate ? new Date(occurrenceDate) : derivedOccurrenceDate;
        const isAuthorizedToOverride = Boolean(req.user?.roles?.some((r) => ["super_admin", "tenant_admin", "hr_admin", "admin", "manager"].includes(r)));
        if (targetRoomId) {
            const room = await prisma_1.prisma.meetingRoom.findFirst({
                where: { id: targetRoomId, tenantId },
            });
            if (!room) {
                return res.status(400).json({
                    error: "Selected meeting room does not exist or does not belong to your organization.",
                    code: "INVALID_ROOM",
                });
            }
        }
        // Handle "this_occurrence" edit scope for recurring events
        if (effectiveScope === "this_occurrence" && (effectiveOccurrenceDate || existing.originalStartTime || existing.startDate)) {
            const origDate = effectiveOccurrenceDate || existing.originalStartTime || existing.startDate;
            // Single occurrence conflict detection
            const occConflict = await calendar_conflict_service_1.CalendarConflictService.checkConflicts({
                tenantId,
                callerUserId: userId,
                startDate: targetStartDate,
                endDate: targetEndDate,
                attendeeIds: Array.from(updatedRecipientIds),
                roomId: targetRoomId || undefined,
                excludeEventId: id,
            });
            if (occConflict.hasConflict) {
                if (ignoreConflicts) {
                    if (!isAuthorizedToOverride) {
                        return res.status(403).json({
                            error: "Access Denied: Only administrators and managers are authorized to override scheduling conflicts.",
                            code: "CONFLICT_OVERRIDE_FORBIDDEN",
                        });
                    }
                }
                else {
                    return res.status(409).json({
                        error: "Scheduling conflict detected for attendee or meeting room on this occurrence.",
                        code: "SCHEDULING_CONFLICT",
                        conflicts: occConflict,
                    });
                }
            }
            // Check if exception already exists
            const existingException = await prisma_1.prisma.calendarEvent.findFirst({
                where: {
                    tenantId,
                    recurringSeriesId: existing.id,
                    originalStartTime: origDate,
                },
            });
            let exceptionEvent;
            if (existingException) {
                exceptionEvent = await prisma_1.prisma.calendarEvent.update({
                    where: { id: existingException.id },
                    data: {
                        title: title !== undefined ? title.trim() : existingException.title,
                        description: finalDesc || null,
                        startDate: targetStartDate,
                        endDate: targetEndDate,
                        allDay: isAllDay,
                        category: category !== undefined ? category : existingException.category,
                        location: location !== undefined ? (location ? location.trim() : null) : existingException.location,
                        meetingLink: meetingLink !== undefined ? (meetingLink ? String(meetingLink).trim() : null) : existingException.meetingLink,
                        status: status !== undefined ? status : existingException.status,
                        visibility: visibility !== undefined ? visibility : existingException.visibility,
                        timezone: timezone !== undefined ? String(timezone).trim() : existingException.timezone,
                        roomId: targetRoomId,
                    },
                });
            }
            else {
                exceptionEvent = await prisma_1.prisma.calendarEvent.create({
                    data: {
                        tenantId,
                        userId: existing.userId,
                        title: title !== undefined ? title.trim() : existing.title,
                        description: finalDesc || null,
                        startDate: targetStartDate,
                        endDate: targetEndDate,
                        allDay: isAllDay,
                        category: category !== undefined ? category : existing.category,
                        location: location !== undefined ? (location ? location.trim() : null) : existing.location,
                        meetingLink: meetingLink !== undefined ? (meetingLink ? String(meetingLink).trim() : null) : existing.meetingLink,
                        status: status !== undefined ? status : existing.status,
                        visibility: visibility !== undefined ? visibility : existing.visibility,
                        timezone: timezone !== undefined ? String(timezone).trim() : existing.timezone,
                        recurringSeriesId: existing.id,
                        originalStartTime: origDate,
                        roomId: targetRoomId,
                    },
                });
            }
            // Record audit log for occurrence modification
            await calendar_audit_service_1.CalendarAuditService.record({
                tenantId,
                actorId: userId,
                actorEmail: req.user?.email,
                action: "OCCURRENCE_EXCEPTION",
                entityId: exceptionEvent.id,
                beforeJson: { seriesId: existing.id, originalStartTime: origDate.toISOString() },
                afterJson: {
                    id: exceptionEvent.id,
                    seriesId: existing.id,
                    title: exceptionEvent.title,
                    startDate: exceptionEvent.startDate,
                    endDate: exceptionEvent.endDate,
                    roomId: exceptionEvent.roomId,
                },
                ipAddress: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip,
                userAgent: req.headers["user-agent"],
            });
            return res.json({
                success: true,
                data: {
                    ...exceptionEvent,
                    isRecurringInstance: true,
                    originalStartTime: origDate.toISOString(),
                    recurringSeriesId: existing.id,
                },
            });
        }
        // Conflict detection for entire event or series
        const conflictCheck = await calendar_conflict_service_1.CalendarConflictService.checkConflicts({
            tenantId,
            callerUserId: userId,
            startDate: targetStartDate,
            endDate: targetEndDate,
            attendeeIds: Array.from(updatedRecipientIds),
            roomId: targetRoomId || undefined,
            excludeEventId: existing.id,
        });
        if (conflictCheck.hasConflict) {
            if (ignoreConflicts) {
                if (!isAuthorizedToOverride) {
                    return res.status(403).json({
                        error: "Access Denied: Only administrators and managers are authorized to override scheduling conflicts.",
                        code: "CONFLICT_OVERRIDE_FORBIDDEN",
                    });
                }
            }
            else {
                return res.status(409).json({
                    error: "Scheduling conflict detected for attendee or meeting room.",
                    code: "SCHEDULING_CONFLICT",
                    conflicts: conflictCheck,
                });
            }
        }
        const updateData = {
            description: finalDesc || null,
        };
        if (title !== undefined)
            updateData.title = title.trim();
        if (startDate !== undefined)
            updateData.startDate = new Date(startDate);
        if (endDate !== undefined)
            updateData.endDate = new Date(endDate);
        if (allDay !== undefined)
            updateData.allDay = Boolean(allDay);
        if (category !== undefined)
            updateData.category = category;
        if (location !== undefined)
            updateData.location = location ? location.trim() : null;
        if (meetingLink !== undefined)
            updateData.meetingLink = meetingLink ? String(meetingLink).trim() : null;
        if (status !== undefined && ["confirmed", "tentative", "cancelled"].includes(status))
            updateData.status = status;
        if (visibility !== undefined && ["private", "team", "organization"].includes(visibility))
            updateData.visibility = visibility;
        if (timezone !== undefined)
            updateData.timezone = String(timezone).trim();
        if (recurrenceRule !== undefined)
            updateData.recurrenceRule = recurrenceRule ? String(recurrenceRule).trim() : null;
        if (recurrenceEndType !== undefined)
            updateData.recurrenceEndType = recurrenceEndType ? String(recurrenceEndType).trim() : null;
        if (recurrenceCount !== undefined)
            updateData.recurrenceCount = typeof recurrenceCount === "number" ? recurrenceCount : null;
        if (recurrenceUntil !== undefined)
            updateData.recurrenceUntil = recurrenceUntil ? new Date(recurrenceUntil) : null;
        if (roomId !== undefined)
            updateData.roomId = targetRoomId;
        // Execute atomic update for Event + Relational Shares + Relational Reminders with Advisory Lock
        const updated = await prisma_1.prisma.$transaction(async (tx) => {
            if (targetRoomId) {
                await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `calendar_room_${tenantId}_${targetRoomId}`);
                // Re-check room conflict inside locked transaction
                const conflictingEvent = await tx.calendarEvent.findFirst({
                    where: {
                        tenantId,
                        roomId: targetRoomId,
                        status: { not: "cancelled" },
                        id: { not: existing.id },
                        startDate: { lt: targetEndDate },
                        endDate: { gt: targetStartDate },
                    },
                    select: { id: true, title: true, startDate: true, endDate: true },
                });
                const conflictingMeeting = await tx.meeting.findFirst({
                    where: {
                        tenantId,
                        roomId: targetRoomId,
                        status: { not: "cancelled" },
                        startTime: { lt: targetEndDate },
                        endTime: { gt: targetStartDate },
                    },
                    select: { id: true, title: true, startTime: true, endTime: true },
                });
                if (conflictingEvent || conflictingMeeting) {
                    if (!ignoreConflicts || !isAuthorizedToOverride) {
                        const err = new Error("Scheduling conflict detected for meeting room.");
                        err.code = "SCHEDULING_CONFLICT";
                        err.status = 409;
                        err.conflicts = {
                            hasConflict: true,
                            hasConflicts: true,
                            attendeeConflicts: [],
                            roomConflict: {
                                roomId: targetRoomId,
                                roomName: "Meeting Room",
                                conflictingTitle: conflictingEvent?.title || conflictingMeeting?.title || "Busy",
                                startDate: (conflictingEvent?.startDate || conflictingMeeting?.startTime).toISOString(),
                                endDate: (conflictingEvent?.endDate || conflictingMeeting?.endTime).toISOString(),
                            },
                        };
                        throw err;
                    }
                }
            }
            const ev = await tx.calendarEvent.update({
                where: { id },
                data: updateData,
            });
            // Update relational shares if sharedWith was supplied by owner/admin
            if (Array.isArray(sharedWith) && (isOwner || isSystemAdmin)) {
                await tx.calendarEventShare.deleteMany({
                    where: {
                        eventId: id,
                        recipientId: { notIn: Array.from(updatedRecipientIds) },
                    },
                });
                for (const s of newShares) {
                    await tx.calendarEventShare.upsert({
                        where: {
                            eventId_recipientId: { eventId: id, recipientId: s.recipientId },
                        },
                        update: {
                            permission: s.permission,
                        },
                        create: {
                            eventId: id,
                            recipientId: s.recipientId,
                            permission: s.permission,
                            rsvpStatus: s.rsvpStatus || "pending",
                            sharedBy: userId,
                        },
                    });
                }
            }
            // Update relational reminders if reminders array was supplied
            if (Array.isArray(reminders)) {
                await tx.calendarEventReminder.deleteMany({
                    where: { eventId: id },
                });
                if (newReminders.length > 0) {
                    await tx.calendarEventReminder.createMany({
                        data: newReminders.map((r) => ({
                            id: r.id,
                            eventId: id,
                            minutesBefore: r.minutesBefore,
                            channel: r.channel,
                            status: r.status,
                            dispatchedAt: r.dispatchedAt ? new Date(r.dispatchedAt) : null,
                            customScheduledAt: r.customScheduledAt ? new Date(r.customScheduledAt) : null,
                            customLabel: r.customLabel || null,
                        })),
                    });
                }
            }
            return ev;
        });
        // Record audit log for Event or Series Update
        await calendar_audit_service_1.CalendarAuditService.record({
            tenantId,
            actorId: userId,
            actorEmail: req.user?.email,
            action: existing.recurrenceRule ? "RECURRENCE_SERIES_UPDATE" : "EVENT_UPDATE",
            entityId: updated.id,
            beforeJson: {
                title: existing.title,
                startDate: existing.startDate,
                endDate: existing.endDate,
                status: existing.status,
                roomId: existing.roomId,
                recurrenceRule: existing.recurrenceRule,
            },
            afterJson: {
                title: updated.title,
                startDate: updated.startDate,
                endDate: updated.endDate,
                status: updated.status,
                roomId: updated.roomId,
                recurrenceRule: updated.recurrenceRule,
                conflictOverride: Boolean(ignoreConflicts && conflictCheck.hasConflict),
                overriddenConflicts: ignoreConflicts && conflictCheck.hasConflict ? conflictCheck : undefined,
            },
            ipAddress: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip,
            userAgent: req.headers["user-agent"],
        });
        // Notify added recipients
        for (const s of addedRecipients) {
            await notification_service_1.NotificationService.createNotification({
                tenantId,
                userId: s.recipientId,
                title: `Calendar Event Shared: ${updated.title}`,
                message: `You were granted ${s.permission === "edit" ? "Edit" : "View"} access to "${updated.title}".`,
                type: "CALENDAR_INVITE",
                actionUrl: `/hr/calendar`,
                metadata: { eventId: id, permission: s.permission },
            });
            await pusher_service_1.PusherService.triggerUserEvent(tenantId, s.recipientId, "calendar:event-shared", {
                eventId: id,
                title: updated.title,
                permission: s.permission,
            });
        }
        // Notify revoked recipients
        for (const rId of revokedRecipientIds) {
            await notification_service_1.NotificationService.createNotification({
                tenantId,
                userId: rId,
                title: `Calendar Access Revoked: ${updated.title}`,
                message: `Your access to "${updated.title}" has been revoked.`,
                type: "CALENDAR_REVOKE",
                actionUrl: `/hr/calendar`,
                metadata: { eventId: id },
            });
            await pusher_service_1.PusherService.triggerUserEvent(tenantId, rId, "calendar:event-revoked", {
                eventId: id,
                title: updated.title,
            });
        }
        // Notify remaining shared members of update
        for (const s of newShares) {
            if (!addedRecipients.some((a) => a.recipientId === s.recipientId)) {
                await pusher_service_1.PusherService.triggerUserEvent(tenantId, s.recipientId, "calendar:event-updated", {
                    eventId: id,
                    title: updated.title,
                });
            }
        }
        return res.json({
            success: true,
            data: {
                ...updated,
                description: cleanDesc,
                shares: newShares,
                reminders: newReminders,
            },
        });
    }
    catch (error) {
        if (error.status === 409 || error.code === "SCHEDULING_CONFLICT") {
            return res.status(409).json({
                error: error.message || "Scheduling conflict detected for attendee or meeting room.",
                code: "SCHEDULING_CONFLICT",
                conflicts: error.conflicts,
            });
        }
        console.error("Error updating calendar event:", error);
        return res.status(500).json({ error: error.message || "Failed to update calendar event" });
    }
});
// POST /api/calendar/events/:id/cancel - Soft cancellation with retained historical state & recurrence scope
exports.calendarRouter.post("/events/:id/cancel", async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.userId || req.user.id;
        const { id } = req.params;
        const { recurrenceScope, occurrenceDate } = req.body;
        let masterId = id;
        let derivedOccurrenceDate;
        if (id.startsWith("rec-")) {
            const lastDashIdx = id.lastIndexOf("-");
            if (lastDashIdx > 4) {
                masterId = id.slice(4, lastDashIdx);
                const ts = parseInt(id.slice(lastDashIdx + 1), 10);
                if (!isNaN(ts)) {
                    derivedOccurrenceDate = new Date(ts);
                }
            }
        }
        const existing = await prisma_1.prisma.calendarEvent.findFirst({
            where: { id: masterId, tenantId },
            include: {
                shares: true,
                user: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
            },
        });
        if (!existing) {
            return res.status(404).json({ error: "Event not found" });
        }
        const isOwner = existing.userId === userId;
        const isSystemAdmin = req.user?.roles?.some((r) => ["super_admin", "tenant_admin", "hr_admin"].includes(r));
        if (!isOwner && !isSystemAdmin) {
            return res.status(403).json({ error: "Access Denied: Only event organizer or administrator can cancel this event." });
        }
        const effectiveScope = recurrenceScope || (id.startsWith("rec-") ? "this_occurrence" : undefined);
        const effectiveOccurrenceDate = occurrenceDate ? new Date(occurrenceDate) : derivedOccurrenceDate;
        // Handle single occurrence cancellation in a recurring series
        if (effectiveScope === "this_occurrence" && (effectiveOccurrenceDate || existing.originalStartTime || existing.startDate)) {
            const origDate = effectiveOccurrenceDate || existing.originalStartTime || existing.startDate;
            // Check if exception already exists
            const existingException = await prisma_1.prisma.calendarEvent.findFirst({
                where: {
                    tenantId,
                    recurringSeriesId: existing.id,
                    originalStartTime: origDate,
                },
            });
            let cancelledException;
            if (existingException) {
                cancelledException = await prisma_1.prisma.calendarEvent.update({
                    where: { id: existingException.id },
                    data: {
                        status: "cancelled",
                        cancelledAt: new Date(),
                        cancelledById: userId,
                    },
                });
            }
            else {
                const occDurationMs = existing.endDate.getTime() - existing.startDate.getTime();
                cancelledException = await prisma_1.prisma.calendarEvent.create({
                    data: {
                        tenantId,
                        userId: existing.userId,
                        title: existing.title,
                        description: existing.description,
                        startDate: origDate,
                        endDate: new Date(origDate.getTime() + (occDurationMs > 0 ? occDurationMs : 3600000)),
                        allDay: existing.allDay,
                        category: existing.category,
                        location: existing.location,
                        meetingLink: existing.meetingLink,
                        status: "cancelled",
                        visibility: existing.visibility,
                        timezone: existing.timezone,
                        recurringSeriesId: existing.id,
                        originalStartTime: origDate,
                        cancelledAt: new Date(),
                        cancelledById: userId,
                    },
                });
            }
            // Record audit log for occurrence cancellation
            await calendar_audit_service_1.CalendarAuditService.record({
                tenantId,
                actorId: userId,
                actorEmail: req.user?.email,
                action: "OCCURRENCE_CANCEL",
                entityId: cancelledException.id,
                beforeJson: { seriesId: existing.id, originalStartTime: origDate.toISOString(), status: "confirmed" },
                afterJson: { seriesId: existing.id, originalStartTime: origDate.toISOString(), status: "cancelled" },
                ipAddress: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip,
                userAgent: req.headers["user-agent"],
            });
            return res.json({
                success: true,
                message: "Occurrence cancelled successfully",
                data: cancelledException,
            });
        }
        if (existing.status === "cancelled") {
            return res.status(400).json({ error: "Event is already cancelled." });
        }
        const cancelledEvent = await prisma_1.prisma.$transaction(async (tx) => {
            const updated = await tx.calendarEvent.update({
                where: { id: existing.id },
                data: {
                    status: "cancelled",
                    cancelledAt: new Date(),
                    cancelledById: userId,
                },
            });
            // Invalidate pending reminders so scheduler does not dispatch alerts for cancelled event
            await tx.calendarEventReminder.updateMany({
                where: { eventId: existing.id, status: "pending" },
                data: { status: "failed" },
            });
            return updated;
        });
        // Record audit log for entire event/series cancellation
        await calendar_audit_service_1.CalendarAuditService.record({
            tenantId,
            actorId: userId,
            actorEmail: req.user?.email,
            action: "EVENT_CANCEL",
            entityId: cancelledEvent.id,
            beforeJson: { status: existing.status },
            afterJson: { status: "cancelled", cancelledAt: cancelledEvent.cancelledAt },
            ipAddress: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip,
            userAgent: req.headers["user-agent"],
        });
        // Notify all participants of event cancellation
        const actorName = req.user?.email?.split("@")[0] || "Organizer";
        const meta = (0, calendar_reminder_scheduler_1.parseCalendarMetadata)(existing.description);
        const recipientIds = new Set();
        existing.shares.forEach((s) => recipientIds.add(s.recipientId));
        meta.shares.forEach((s) => recipientIds.add(s.recipientId));
        if (!isOwner) {
            recipientIds.add(existing.userId);
        }
        for (const rId of recipientIds) {
            try {
                await notification_service_1.NotificationService.createNotification({
                    tenantId,
                    userId: rId,
                    title: `Calendar Event Cancelled: ${existing.title}`,
                    message: `The event "${existing.title}" has been cancelled by ${actorName}.`,
                    type: "CALENDAR_CANCEL",
                    actionUrl: `/hr/calendar`,
                    metadata: { eventId: id, cancelledById: userId },
                });
                await pusher_service_1.PusherService.triggerUserEvent(tenantId, rId, "calendar:event-cancelled", {
                    eventId: id,
                    title: existing.title,
                    cancelledBy: actorName,
                });
            }
            catch (err) {
                console.warn(`[calendar.routes] Cancel notification error:`, err.message);
            }
        }
        return res.json({
            success: true,
            message: "Event cancelled successfully",
            data: cancelledEvent,
        });
    }
    catch (error) {
        console.error("Error cancelling calendar event:", error);
        return res.status(500).json({ error: error.message || "Failed to cancel calendar event" });
    }
});
// POST /api/calendar/events/:id/rsvp - Attendee RSVP response (Phase D)
exports.calendarRouter.post("/events/:id/rsvp", async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.userId || req.user.id;
        const { id } = req.params;
        const { rsvpStatus } = req.body;
        const validStatuses = ["pending", "accepted", "declined", "tentative"];
        if (!rsvpStatus || !validStatuses.includes(rsvpStatus)) {
            return res.status(400).json({
                error: `Invalid rsvpStatus. Must be one of: ${validStatuses.join(", ")}`,
                code: "INVALID_RSVP_STATUS",
            });
        }
        const event = await prisma_1.prisma.calendarEvent.findFirst({
            where: { id, tenantId },
            include: {
                shares: true,
                user: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
            },
        });
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }
        if (event.status === "cancelled") {
            return res.status(400).json({ error: "Cannot RSVP to a cancelled event." });
        }
        if (event.userId === userId) {
            return res.status(400).json({
                error: "Event organizer is automatically confirmed and cannot submit an attendee RSVP.",
            });
        }
        // Verify caller is an invited attendee
        const relationalShare = event.shares.find((s) => s.recipientId === userId);
        const meta = (0, calendar_reminder_scheduler_1.parseCalendarMetadata)(event.description);
        const metaShare = meta.shares.find((s) => s.recipientId === userId);
        if (!relationalShare && !metaShare) {
            return res.status(403).json({
                error: "Access Denied: You are not an invited attendee for this event.",
                code: "NOT_AN_ATTENDEE",
            });
        }
        const updatedShare = await prisma_1.prisma.$transaction(async (tx) => {
            const share = await tx.calendarEventShare.upsert({
                where: {
                    eventId_recipientId: { eventId: id, recipientId: userId },
                },
                update: {
                    rsvpStatus,
                    respondedAt: new Date(),
                },
                create: {
                    eventId: id,
                    recipientId: userId,
                    permission: metaShare?.permission || "view",
                    rsvpStatus,
                    sharedBy: event.userId,
                    respondedAt: new Date(),
                },
            });
            // Also update description metadata if legacy block exists
            if (event.description && event.description.includes("<!--META:")) {
                const parsed = (0, calendar_reminder_scheduler_1.parseCalendarMetadata)(event.description);
                const sIndex = parsed.shares.findIndex((s) => s.recipientId === userId);
                if (sIndex >= 0) {
                    parsed.shares[sIndex].rsvpStatus = rsvpStatus;
                    parsed.shares[sIndex].respondedAt = new Date().toISOString();
                }
                else {
                    parsed.shares.push({
                        recipientId: userId,
                        permission: "view",
                        rsvpStatus,
                        sharedBy: event.userId,
                        createdAt: new Date().toISOString(),
                        respondedAt: new Date().toISOString(),
                    });
                }
                const updatedDesc = (0, calendar_reminder_scheduler_1.serializeCalendarMetadata)(parsed.cleanDescription, parsed.shares, parsed.reminders);
                await tx.calendarEvent.update({
                    where: { id },
                    data: { description: updatedDesc },
                });
            }
            return share;
        });
        // Notify event organizer of attendee RSVP
        const respondentName = req.user?.email?.split("@")[0] || "An attendee";
        try {
            await notification_service_1.NotificationService.createNotification({
                tenantId,
                userId: event.userId,
                title: `Calendar RSVP: ${event.title}`,
                message: `${respondentName} responded "${rsvpStatus}" to "${event.title}".`,
                type: "CALENDAR_RSVP",
                actionUrl: `/hr/calendar`,
                metadata: {
                    eventId: id,
                    attendeeId: userId,
                    rsvpStatus,
                },
            });
            await pusher_service_1.PusherService.triggerUserEvent(tenantId, event.userId, "calendar:rsvp-updated", {
                eventId: id,
                recipientId: userId,
                rsvpStatus,
                attendeeName: respondentName,
            });
        }
        catch (notifErr) {
            console.warn(`[calendar.routes] RSVP notification error:`, notifErr.message);
        }
        // Record audit log for RSVP update
        await calendar_audit_service_1.CalendarAuditService.record({
            tenantId,
            actorId: userId,
            actorEmail: req.user?.email,
            action: "RSVP_UPDATE",
            entityId: event.id,
            beforeJson: { attendeeId: userId, rsvpStatus: relationalShare?.rsvpStatus || "pending" },
            afterJson: { attendeeId: userId, rsvpStatus },
            ipAddress: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip,
            userAgent: req.headers["user-agent"],
        });
        return res.json({
            success: true,
            message: `RSVP updated to ${rsvpStatus}`,
            data: updatedShare,
        });
    }
    catch (error) {
        console.error("Error submitting RSVP:", error);
        return res.status(500).json({ error: error.message || "Failed to submit RSVP" });
    }
});
// DELETE /api/calendar/events/:id - Delete event (Owner or Admin only)
exports.calendarRouter.delete("/events/:id", async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.userId || req.user.id;
        const { id } = req.params;
        const existing = await prisma_1.prisma.calendarEvent.findFirst({
            where: { id, tenantId },
            include: { shares: true },
        });
        if (!existing) {
            return res.status(404).json({ error: "Event not found" });
        }
        const isOwner = existing.userId === userId;
        const isSystemAdmin = req.user?.roles?.some((r) => ["super_admin", "tenant_admin"].includes(r));
        if (!isOwner && !isSystemAdmin) {
            return res.status(403).json({ error: "Access Denied: You do not own this calendar event." });
        }
        const meta = (0, calendar_reminder_scheduler_1.parseCalendarMetadata)(existing.description);
        await prisma_1.prisma.calendarEvent.delete({
            where: { id },
        });
        // Record audit log for Event Deletion
        await calendar_audit_service_1.CalendarAuditService.record({
            tenantId,
            actorId: userId,
            actorEmail: req.user?.email,
            action: "EVENT_DELETE",
            entityId: existing.id,
            beforeJson: {
                id: existing.id,
                title: existing.title,
                startDate: existing.startDate,
                endDate: existing.endDate,
                recurrenceRule: existing.recurrenceRule,
                roomId: existing.roomId,
            },
            afterJson: null,
            ipAddress: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip,
            userAgent: req.headers["user-agent"],
        });
        // Notify all participants of event deletion
        const recipientIds = new Set();
        existing.shares.forEach((s) => recipientIds.add(s.recipientId));
        meta.shares.forEach((s) => recipientIds.add(s.recipientId));
        for (const rId of recipientIds) {
            try {
                await notification_service_1.NotificationService.createNotification({
                    tenantId,
                    userId: rId,
                    title: `Calendar Event Deleted: ${existing.title}`,
                    message: `The event "${existing.title}" has been permanently removed from the calendar.`,
                    type: "CALENDAR_CANCEL",
                    actionUrl: `/hr/calendar`,
                    metadata: { eventId: id },
                });
                await pusher_service_1.PusherService.triggerUserEvent(tenantId, rId, "calendar:event-deleted", {
                    eventId: id,
                    title: existing.title,
                });
            }
            catch (err) {
                console.warn(`[calendar.routes] Delete notification error:`, err.message);
            }
        }
        return res.json({ success: true, message: "Event deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting calendar event:", error);
        return res.status(500).json({ error: error.message || "Failed to delete calendar event" });
    }
});
// POST /api/calendar/events/:id/share - Add/update recipient share
exports.calendarRouter.post("/events/:id/share", async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.userId || req.user.id;
        const { id } = req.params;
        const { recipientId, permission = "view" } = req.body;
        if (!recipientId || !recipientId.trim()) {
            return res.status(400).json({ error: "recipientId is required" });
        }
        const event = await prisma_1.prisma.calendarEvent.findFirst({
            where: { id, tenantId },
        });
        if (!event) {
            return res.status(404).json({ error: "Calendar event not found" });
        }
        const isOwner = event.userId === userId;
        const isSystemAdmin = req.user?.roles?.some((r) => ["super_admin", "admin", "hr_admin"].includes(r));
        if (!isOwner && !isSystemAdmin) {
            return res.status(403).json({ error: "Access Denied: Only event organizer or administrator can share this event." });
        }
        // Tenant boundary validation
        const validUser = (await prisma_1.prisma.user.findFirst({
            where: { id: recipientId, profile: { tenantId } },
        })) ||
            (await prisma_1.prisma.employee.findFirst({
                where: { id: recipientId, tenantId },
            }));
        if (!validUser) {
            return res.status(400).json({
                error: `Recipient '${recipientId}' does not belong to your organization.`,
                code: "CROSS_TENANT_SHARING_FORBIDDEN",
            });
        }
        const perm = permission === "edit" ? "edit" : "view";
        // Atomically upsert relational share and update description metadata
        const meta = (0, calendar_reminder_scheduler_1.parseCalendarMetadata)(event.description);
        const existingIndex = meta.shares.findIndex((s) => s.recipientId === recipientId);
        if (existingIndex >= 0) {
            meta.shares[existingIndex].permission = perm;
        }
        else {
            meta.shares.push({
                recipientId,
                permission: perm,
                rsvpStatus: "pending",
                sharedBy: userId,
                createdAt: new Date().toISOString(),
            });
        }
        const newDescription = (0, calendar_reminder_scheduler_1.serializeCalendarMetadata)(meta.cleanDescription, meta);
        await prisma_1.prisma.$transaction(async (tx) => {
            await tx.calendarEventShare.upsert({
                where: {
                    eventId_recipientId: { eventId: id, recipientId },
                },
                update: {
                    permission: perm,
                },
                create: {
                    eventId: id,
                    recipientId,
                    permission: perm,
                    rsvpStatus: "pending",
                    sharedBy: userId,
                },
            });
            await tx.calendarEvent.update({
                where: { id },
                data: { description: newDescription },
            });
        });
        // Record audit log for share addition
        await calendar_audit_service_1.CalendarAuditService.record({
            tenantId,
            actorId: userId,
            actorEmail: req.user?.email,
            action: "SHARE_ADD",
            entityId: event.id,
            afterJson: { recipientId, permission: perm },
            ipAddress: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip,
            userAgent: req.headers["user-agent"],
        });
        // Send notifications to added recipient
        try {
            await notification_service_1.NotificationService.createNotification({
                tenantId,
                userId: recipientId,
                title: `Calendar Event Shared: ${event.title}`,
                message: `You were granted ${perm === "edit" ? "Edit" : "View"} access to "${event.title}".`,
                type: "CALENDAR_SHARE",
                actionUrl: `/hr/calendar`,
                metadata: { eventId: id, permission: perm },
            });
            await pusher_service_1.PusherService.triggerUserEvent(tenantId, recipientId, "calendar:event-shared", {
                eventId: id,
                title: event.title,
                permission: perm,
            });
        }
        catch (notifErr) {
            console.warn(`[calendar.routes] Share notification error:`, notifErr.message);
        }
        return res.json({ success: true, message: "Event shared successfully", shares: meta.shares });
    }
    catch (error) {
        console.error("Error sharing calendar event:", error);
        return res.status(500).json({ error: error.message || "Failed to share calendar event" });
    }
});
// DELETE /api/calendar/events/:id/share/:recipientId - Revoke recipient access
exports.calendarRouter.delete("/events/:id/share/:recipientId", async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.userId || req.user.id;
        const { id, recipientId } = req.params;
        const event = await prisma_1.prisma.calendarEvent.findFirst({
            where: { id, tenantId },
        });
        if (!event) {
            return res.status(404).json({ error: "Calendar event not found" });
        }
        const isOwner = event.userId === userId;
        const isSystemAdmin = req.user?.roles?.some((r) => ["super_admin", "admin", "hr_admin"].includes(r));
        if (!isOwner && !isSystemAdmin) {
            return res.status(403).json({ error: "Access Denied: Only event organizer or administrator can revoke sharing." });
        }
        const meta = (0, calendar_reminder_scheduler_1.parseCalendarMetadata)(event.description);
        meta.shares = meta.shares.filter((s) => s.recipientId !== recipientId);
        const newDescription = (0, calendar_reminder_scheduler_1.serializeCalendarMetadata)(meta.cleanDescription, meta);
        await prisma_1.prisma.$transaction(async (tx) => {
            await tx.calendarEventShare.deleteMany({
                where: { eventId: id, recipientId },
            });
            await tx.calendarEvent.update({
                where: { id },
                data: { description: newDescription },
            });
        });
        // Record audit log for share revocation
        await calendar_audit_service_1.CalendarAuditService.record({
            tenantId,
            actorId: userId,
            actorEmail: req.user?.email,
            action: "SHARE_REVOKE",
            entityId: event.id,
            beforeJson: { recipientId },
            ipAddress: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip,
            userAgent: req.headers["user-agent"],
        });
        try {
            await pusher_service_1.PusherService.triggerUserEvent(tenantId, recipientId, "calendar:event-unshared", {
                eventId: id,
                title: event.title,
            });
        }
        catch (notifErr) {
            console.warn(`[calendar.routes] Revoke share notification error:`, notifErr.message);
        }
        return res.json({ success: true, message: "Share revoked successfully", shares: meta.shares });
    }
    catch (error) {
        console.error("Error revoking calendar share:", error);
        return res.status(500).json({ error: error.message || "Failed to revoke calendar share" });
    }
});
// ==========================================
// PHASE 3 EXTENSIONS: ROOMS, CONFLICTS, RECURRENCE PREVIEW, AUDIT LOGS, ICS EXPORT
// ==========================================
// GET /api/calendar/rooms - Active meeting rooms for booking and conflict check
exports.calendarRouter.get("/rooms", async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        let rooms = await prisma_1.prisma.meetingRoom.findMany({
            where: { tenantId, isActive: true },
            orderBy: { name: "asc" },
        });
        if (rooms.length === 0) {
            // Seed initial default rooms if none exist
            const defaults = [
                { name: "Executive Boardroom", capacity: 20, location: "Floor 4, West Wing", amenities: "Video Conferencing, 4K Display, Whiteboard, Polycom" },
                { name: "Conference Room Alpha", capacity: 12, location: "Floor 3, East Wing", amenities: "Smart TV, Web camera, Conference Phone" },
                { name: "Focus & Huddle Room 1", capacity: 4, location: "Floor 2, Pod B", amenities: "Display Screen, Whiteboard" },
            ];
            for (const d of defaults) {
                await prisma_1.prisma.meetingRoom.create({
                    data: {
                        tenantId,
                        name: d.name,
                        capacity: d.capacity,
                        location: d.location,
                        amenities: d.amenities,
                        isActive: true,
                    },
                });
            }
            rooms = await prisma_1.prisma.meetingRoom.findMany({
                where: { tenantId, isActive: true },
                orderBy: { name: "asc" },
            });
        }
        return res.json({ success: true, data: rooms });
    }
    catch (error) {
        console.error("Error fetching meeting rooms:", error);
        return res.status(500).json({ error: error.message || "Failed to fetch meeting rooms" });
    }
});
// POST /api/calendar/check-conflicts - Validate attendee and room availability
exports.calendarRouter.post("/check-conflicts", async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.userId || req.user.id;
        const { startDate, endDate, attendeeIds, roomId, excludeEventId } = req.body;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: "startDate and endDate are required" });
        }
        const conflicts = await calendar_conflict_service_1.CalendarConflictService.checkConflicts({
            tenantId,
            callerUserId: userId,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            attendeeIds: Array.isArray(attendeeIds) ? attendeeIds : [],
            roomId: roomId || undefined,
            excludeEventId: excludeEventId || undefined,
        });
        return res.json({ success: true, data: conflicts });
    }
    catch (error) {
        console.error("Error checking calendar conflicts:", error);
        return res.status(500).json({ error: error.message || "Failed to check calendar conflicts" });
    }
});
// POST /api/calendar/recurrence/preview - Preview occurrence dates for recurrence rules
exports.calendarRouter.post("/recurrence/preview", async (req, res) => {
    try {
        const { startDate, recurrenceRule, rule, recurrenceEndType, recurrenceCount, recurrenceUntil, count, maxOccurrences } = req.body;
        const effectiveRule = recurrenceRule || rule;
        if (!startDate || !effectiveRule) {
            return res.status(400).json({ error: "startDate and recurrenceRule are required" });
        }
        const occurrences = calendar_recurrence_service_1.CalendarRecurrenceService.previewOccurrences({
            startDate: new Date(startDate),
            recurrenceRule: String(effectiveRule),
            recurrenceEndType: recurrenceEndType || undefined,
            recurrenceCount: recurrenceCount ? Number(recurrenceCount) : undefined,
            recurrenceUntil: recurrenceUntil ? new Date(recurrenceUntil) : undefined,
            count: maxOccurrences ? Number(maxOccurrences) : (count ? Number(count) : 20),
        });
        return res.json({ success: true, data: { occurrences, count: occurrences.length } });
    }
    catch (error) {
        console.error("Error previewing recurrence:", error);
        return res.status(500).json({ error: error.message || "Failed to preview recurrence" });
    }
});
// GET /api/calendar/events/:id/audit-logs - Retrieve audit trail for an event
exports.calendarRouter.get("/events/:id/audit-logs", async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.userId || req.user.id;
        const { id } = req.params;
        // Resolve master series if virtual occurrence ID passed
        let masterId = id;
        if (id.startsWith("rec-")) {
            const lastDashIdx = id.lastIndexOf("-");
            if (lastDashIdx > 4) {
                masterId = id.slice(4, lastDashIdx);
            }
        }
        const event = await prisma_1.prisma.calendarEvent.findFirst({
            where: { id: masterId, tenantId },
            include: { shares: true },
        });
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }
        const isOwner = event.userId === userId;
        const isSystemAdmin = req.user?.roles?.some((r) => ["super_admin", "tenant_admin", "hr_admin"].includes(r));
        const userShare = event.shares.find((s) => s.recipientId === userId);
        const canEdit = userShare?.permission === "edit";
        if (!isOwner && !isSystemAdmin && !canEdit) {
            return res.status(403).json({ error: "Access Denied: Only event organizer or administrator can inspect audit history." });
        }
        const auditLogs = await calendar_audit_service_1.CalendarAuditService.getEventAuditLogs(tenantId, masterId);
        return res.json({ success: true, data: auditLogs });
    }
    catch (error) {
        console.error("Error fetching event audit logs:", error);
        return res.status(500).json({ error: error.message || "Failed to fetch event audit logs" });
    }
});
// GET /api/calendar/export/ics - Export authorized calendar events to RFC 5545 .ics
exports.calendarRouter.get("/export/ics", async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.userId || req.user.id;
        const { startDate, endDate, category } = req.query;
        const windowStart = startDate ? new Date(String(startDate)) : new Date(Date.now() - 30 * 86400000);
        const windowEnd = endDate ? new Date(String(endDate)) : new Date(Date.now() + 180 * 86400000);
        const whereClause = {
            tenantId,
            status: { not: "cancelled" },
            startDate: { lte: windowEnd },
            endDate: { gte: windowStart },
            OR: [
                { userId },
                { visibility: "organization" },
                { shares: { some: { recipientId: userId } } },
            ],
        };
        if (category && category !== "all") {
            whereClause.category = String(category);
        }
        const events = await prisma_1.prisma.calendarEvent.findMany({
            where: whereClause,
            include: {
                shares: true,
                user: { select: { email: true, profile: { select: { fullName: true } } } },
                room: { select: { name: true, location: true } },
            },
        });
        const exportEvents = [...events];
        if (!category || category === "all" || category === "todo" || category === "task") {
            try {
                const isHR = req.user?.roles?.some((r) => ["super_admin", "tenant_admin", "hr_admin", "admin"].includes(r));
                let currentEmpId;
                const emp = await prisma_1.prisma.employee.findFirst({
                    where: { tenantId, userId },
                    select: { id: true },
                });
                currentEmpId = emp?.id;
                const todoWhere = { tenantId };
                if (!isHR) {
                    const participantFilters = [
                        { userId },
                        { description: { contains: `[Assignee:${userId}]` } },
                        { description: { contains: `"${userId}"` } },
                    ];
                    if (currentEmpId) {
                        participantFilters.push({ description: { contains: `[Assignee:${currentEmpId}]` } }, { description: { contains: `"${currentEmpId}"` } });
                    }
                    todoWhere.AND = [{ OR: participantFilters }];
                }
                const todos = await prisma_1.prisma.workspaceTodo.findMany({
                    where: todoWhere,
                    include: {
                        user: { select: { email: true, profile: { select: { fullName: true } } } },
                    },
                    take: 100,
                });
                for (const t of todos) {
                    const meta = (0, todos_routes_1.parseTodoMeta)(t.description);
                    let taskStartDate = meta.startDate ? new Date(meta.startDate) : null;
                    let taskEndDate = t.dueDate ? new Date(t.dueDate) : null;
                    if (taskStartDate && isNaN(taskStartDate.getTime()))
                        taskStartDate = null;
                    if (taskEndDate && isNaN(taskEndDate.getTime()))
                        taskEndDate = null;
                    if (!taskStartDate && !taskEndDate)
                        continue;
                    if (!taskStartDate && taskEndDate)
                        taskStartDate = taskEndDate;
                    if (taskStartDate && !taskEndDate)
                        taskEndDate = taskStartDate;
                    if (taskStartDate.getTime() > taskEndDate.getTime())
                        continue;
                    if (taskEndDate.getTime() < windowStart.getTime() || taskStartDate.getTime() > windowEnd.getTime())
                        continue;
                    exportEvents.push({
                        id: `todo-${t.id}`,
                        title: `Task: ${t.title}`,
                        description: meta.cleanDescription || undefined,
                        startDate: taskStartDate,
                        endDate: taskEndDate,
                        allDay: true,
                        organizerName: t.user?.profile?.fullName || t.user?.email || "Assigner",
                        organizerEmail: t.user?.email,
                    });
                }
            }
            catch (err) { }
        }
        const icsContent = calendar_export_service_1.CalendarExportService.generateIcs(exportEvents, {
            calendarName: "MasterHRMS Calendar",
            tenantId,
        });
        res.setHeader("Content-Type", "text/calendar; charset=utf-8");
        res.setHeader("Content-Disposition", 'attachment; filename="masterhrms-calendar.ics"');
        return res.send(icsContent);
    }
    catch (error) {
        console.error("Error exporting calendar ics:", error);
        return res.status(500).json({ error: error.message || "Failed to export calendar" });
    }
});
// GET /api/calendar/events/:id/export/ics - Export single event to RFC 5545 .ics
exports.calendarRouter.get("/events/:id/export/ics", async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.userId || req.user.id;
        const { id } = req.params;
        const event = await prisma_1.prisma.calendarEvent.findFirst({
            where: {
                id,
                tenantId,
                OR: [
                    { userId },
                    { visibility: "organization" },
                    { shares: { some: { recipientId: userId } } },
                ],
            },
            include: {
                shares: true,
                user: { select: { email: true, profile: { select: { fullName: true } } } },
                room: { select: { name: true, location: true } },
            },
        });
        if (!event) {
            return res.status(404).json({ error: "Event not found or access denied" });
        }
        const icsContent = calendar_export_service_1.CalendarExportService.generateIcs([event], {
            calendarName: event.title,
            tenantId,
        });
        res.setHeader("Content-Type", "text/calendar; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="event-${event.id}.ics"`);
        return res.send(icsContent);
    }
    catch (error) {
        console.error("Error exporting single event ics:", error);
        return res.status(500).json({ error: error.message || "Failed to export event" });
    }
});
// ==========================================
// REMINDER TRIGGER ENDPOINT (Phase 5 Testing)
// ==========================================
// POST /api/calendar/reminders/process-due - Manually trigger due reminder processing
exports.calendarRouter.post("/reminders/process-due", async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const result = await calendar_reminder_scheduler_1.CalendarReminderScheduler.processDueReminders(tenantId);
        return res.json({ success: true, data: result });
    }
    catch (error) {
        console.error("Error processing due reminders:", error);
        return res.status(500).json({ error: error.message || "Failed to process due reminders" });
    }
});
// Google sync placeholders preserved
exports.calendarRouter.post("/google-sync", (0, entitlements_1.requireEntitlement)("google-workspace"), async (req, res) => {
    res.json({ success: true, message: "Google Calendar sync triggered" });
});
exports.calendarRouter.get("/google-sync/status", (0, entitlements_1.requireEntitlement)("google-workspace"), async (req, res) => {
    res.json({ success: true, status: "idle", lastSyncedAt: null });
});
