import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { requireEntitlement } from "../middleware/entitlements";
import {
  parseCalendarMetadata,
  serializeCalendarMetadata,
  CalendarShare,
  CalendarReminder,
  CalendarReminderScheduler,
} from "../services/calendar-reminder.scheduler";
import { NotificationService } from "../services/notification.service";
import { PusherService } from "../services/pusher.service";
import { sendCalendarNotificationEmail } from "../lib/email";

export const calendarRouter = Router();

calendarRouter.use(requireAuth, resolveTenantContext);

// System default categories
export const SYSTEM_CATEGORIES = [
  { id: "meeting", name: "Meetings", color: "#3b82f6", badgeClass: "bg-blue-500/15 text-blue-700 border-blue-500/30", isSystem: true },
  { id: "training", name: "Training", color: "#8b5cf6", badgeClass: "bg-purple-500/15 text-purple-700 border-purple-500/30", isSystem: true },
  { id: "leave", name: "Leave & Time Off", color: "#f59e0b", badgeClass: "bg-amber-500/15 text-amber-700 border-amber-500/30", isSystem: true },
  { id: "holiday", name: "Holidays", color: "#10b981", badgeClass: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", isSystem: true },
  { id: "birthday", name: "Birthdays", color: "#f43f5e", badgeClass: "bg-rose-500/15 text-rose-700 border-rose-500/30", isSystem: true },
  { id: "event", name: "General Events", color: "#6366f1", badgeClass: "bg-indigo-500/15 text-indigo-700 border-indigo-500/30", isSystem: true },
];

// Helper to get custom tenant categories from Setting
async function getTenantCustomCategories(tenantId: string): Promise<any[]> {
  try {
    const setting = await prisma.setting.findFirst({
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
  } catch (err: any) {
    console.warn(`[calendar.routes] Failed to load tenant custom categories:`, err.message);
  }
  return [];
}

// Helper to save custom tenant categories
async function saveTenantCustomCategories(tenantId: string, categories: any[], updatedBy?: string) {
  const existing = await prisma.setting.findFirst({
    where: {
      scope: "TENANT",
      scopeId: tenantId,
      group: "calendar",
      key: "categories",
    },
  });

  if (existing) {
    return await prisma.setting.update({
      where: { id: existing.id },
      data: {
        valueJson: categories,
        updatedBy: updatedBy || null,
        updatedAt: new Date(),
      },
    });
  } else {
    return await prisma.setting.create({
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
calendarRouter.get("/categories", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const custom = await getTenantCustomCategories(tenantId);
    const all = [...SYSTEM_CATEGORIES, ...custom];
    return res.json({ success: true, data: all });
  } catch (error: any) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch categories" });
  }
});

// POST /api/calendar/categories - Create custom category
calendarRouter.post("/categories", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId || (req.user as any).id;
    const { name, color, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const trimmedName = name.trim();
    const custom = await getTenantCustomCategories(tenantId);

    // Prevent duplicates against system or custom categories
    const existsInSystem = SYSTEM_CATEGORIES.some(c => c.name.toLowerCase() === trimmedName.toLowerCase());
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
  } catch (error: any) {
    console.error("Error creating category:", error);
    return res.status(500).json({ error: error.message || "Failed to create category" });
  }
});

// PUT /api/calendar/categories/:id - Update custom category
calendarRouter.put("/categories/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId || (req.user as any).id;
    const { id } = req.params;
    const { name, color, description } = req.body;

    if (SYSTEM_CATEGORIES.some(c => c.id === id)) {
      return res.status(403).json({ error: "System default categories cannot be modified." });
    }

    const custom = await getTenantCustomCategories(tenantId);
    const index = custom.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Category not found." });
    }

    if (name) {
      const trimmedName = name.trim();
      const duplicate =
        SYSTEM_CATEGORIES.some(c => c.name.toLowerCase() === trimmedName.toLowerCase()) ||
        custom.some(c => c.id !== id && c.name.toLowerCase() === trimmedName.toLowerCase());
      if (duplicate) {
        return res.status(400).json({ error: `Category name '${trimmedName}' is already taken.` });
      }
      custom[index].name = trimmedName;
    }

    if (color) custom[index].color = color;
    if (description !== undefined) custom[index].description = description.trim();
    custom[index].updatedAt = new Date().toISOString();

    await saveTenantCustomCategories(tenantId, custom, userId);
    return res.json({ success: true, data: custom[index] });
  } catch (error: any) {
    console.error("Error updating category:", error);
    return res.status(500).json({ error: error.message || "Failed to update category" });
  }
});

// DELETE /api/calendar/categories/:id - Delete custom category
calendarRouter.delete("/categories/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId || (req.user as any).id;
    const { id } = req.params;

    if (SYSTEM_CATEGORIES.some(c => c.id === id)) {
      return res.status(403).json({ error: "System default categories cannot be deleted." });
    }

    const custom = await getTenantCustomCategories(tenantId);
    const filtered = custom.filter(c => c.id !== id);
    if (filtered.length === custom.length) {
      return res.status(404).json({ error: "Category not found." });
    }

    await saveTenantCustomCategories(tenantId, filtered, userId);
    return res.json({ success: true, message: "Category deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting category:", error);
    return res.status(500).json({ error: error.message || "Failed to delete category" });
  }
});

// ==========================================
// ELIGIBLE RECIPIENTS ENDPOINT (Phase 1 & 4)
// ==========================================

// GET /api/calendar/eligible-recipients - Searchable organization members for event sharing
calendarRouter.get("/eligible-recipients", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const currentUserId = req.user!.userId || (req.user as any).id;
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";

    const users = await prisma.user.findMany({
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
    let extraEmployees: Record<string, { name?: string; department?: string; position?: string }> = {};
    if (emailsMissingEmp.length > 0) {
      const emps = await prisma.employee.findMany({
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
  } catch (error: any) {
    console.error("Error fetching eligible recipients:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch eligible recipients" });
  }
});

// ==========================================
// EVENT CRUD & MULTI-MEMBER SHARING (Phase 4 & 5)
// ==========================================

// GET /api/calendar/events - List events (personal + shared/organization)
calendarRouter.get("/events", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId || (req.user as any).id;
    const { startDate, endDate, category } = req.query;

    const whereClause: any = {
      tenantId,
      OR: [
        { userId },
        { category: { in: ["organization", "company", "all-hands", "holiday", "general"] } },
        { description: { contains: `[SharedWith:${userId}]` } },
        { description: { contains: `"${userId}"` } },
      ],
    };

    if (category && category !== "all") {
      whereClause.category = String(category);
    }

    if (startDate && endDate) {
      whereClause.startDate = {
        gte: new Date(String(startDate)),
        lte: new Date(String(endDate)),
      };
    }

    const events = await prisma.calendarEvent.findMany({
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
      },
      orderBy: { startDate: "asc" },
    });

    const isSystemAdmin = req.user?.roles?.some((r: string) => ["super_admin", "tenant_admin"].includes(r));

    const accessible = events.filter(ev => {
      const isOwner = ev.userId === userId;
      if (isOwner) return true;
      if (isSystemAdmin) return true;
      const isOrgCategory = ["organization", "company", "all-hands", "holiday"].includes((ev.category || "").toLowerCase());
      if (isOrgCategory) return true;
      const meta = parseCalendarMetadata(ev.description);
      return meta.shares.some(s => s.recipientId === userId);
    });

    const formatted = accessible.map(ev => {
      const meta = parseCalendarMetadata(ev.description);
      const isOwner = ev.userId === userId;
      const share = meta.shares.find(s => s.recipientId === userId);
      return {
        ...ev,
        description: meta.cleanDescription,
        shares: meta.shares,
        reminders: meta.reminders,
        isShared: !isOwner,
        userPermission: isOwner ? "owner" : (share?.permission || "view"),
        organizerName: ev.user?.profile?.fullName || ev.user?.email || "Organizer",
      };
    });

    res.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error("Error fetching calendar events:", error);
    res.status(500).json({ error: error.message || "Failed to fetch calendar events" });
  }
});

// POST /api/calendar/events - Create new event (multi-member sharing + configurable reminders)
calendarRouter.post("/events", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId || (req.user as any).id;
    const { title, description, startDate, endDate, allDay, category, location, visibility, sharedWith, reminders } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Event title is required" });
    }

    if (!startDate) {
      return res.status(400).json({ error: "Start date is required" });
    }

    // 1. Process Multi-Member Sharing
    const shares: CalendarShare[] = [];
    if (Array.isArray(sharedWith) && sharedWith.length > 0) {
      for (const item of sharedWith) {
        const recipientId = typeof item === "string" ? item : item?.recipientId;
        const permission: "view" | "edit" = (typeof item === "object" && item?.permission === "edit") ? "edit" : "view";

        if (recipientId && recipientId !== "all") {
          const validUser = await prisma.user.findFirst({
            where: { id: recipientId, profile: { tenantId } },
          }) || await prisma.employee.findFirst({
            where: { id: recipientId, tenantId },
          });

          if (!validUser) {
            return res.status(400).json({
              error: `Recipient '${recipientId}' does not belong to your organization.`,
              code: "CROSS_TENANT_SHARING_FORBIDDEN"
            });
          }
        }

        if (recipientId && !shares.some(s => s.recipientId === recipientId)) {
          shares.push({
            recipientId,
            permission,
            sharedBy: userId,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    // 2. Process Reminders
    const validatedReminders: CalendarReminder[] = [];
    if (Array.isArray(reminders)) {
      for (const rem of reminders) {
        const minutes = typeof rem?.minutesBefore === "number" ? rem.minutesBefore : parseInt(rem?.minutesBefore, 10);
        if (!isNaN(minutes) && minutes >= 0) {
          const channel = ["email", "in_app", "both"].includes(rem.channel) ? rem.channel : "both";
          validatedReminders.push({
            id: rem.id || `rem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            minutesBefore: minutes,
            channel,
            status: "pending",
          });
        }
      }
    }

    const finalDesc = serializeCalendarMetadata(description || "", shares, validatedReminders);

    const event = await prisma.calendarEvent.create({
      data: {
        tenantId,
        userId,
        title: title.trim(),
        description: finalDesc || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : new Date(startDate),
        allDay: Boolean(allDay),
        category: visibility === "organization" ? "organization" : (category || "team"),
        location: location ? location.trim() : null,
      },
    });

    // 3. Dispatch in-app notifications and Pusher alerts to invited recipients
    const creatorName = req.user?.email?.split("@")[0] || "A colleague";
    for (const s of shares) {
      try {
        await NotificationService.createNotification({
          tenantId,
          userId: s.recipientId,
          title: `New Calendar Invitation: ${event.title}`,
          message: `${creatorName} shared an event with you (${s.permission === "edit" ? "Can Edit" : "View Only"}).`,
          type: "CALENDAR_INVITE",
          actionUrl: `/hr/calendar`,
          metadata: {
            eventId: event.id,
            permission: s.permission,
          },
        });

        await PusherService.triggerUserEvent(tenantId, s.recipientId, "calendar:event-shared", {
          eventId: event.id,
          title: event.title,
          permission: s.permission,
          organizer: creatorName,
          startDate: event.startDate.toISOString(),
        });
      } catch (notifyErr: any) {
        console.warn(`[calendar.routes] Notification error for recipient ${s.recipientId}:`, notifyErr.message);
      }
    }

    res.status(201).json({
      success: true,
      data: {
        ...event,
        description: description ? description.trim() : null,
        shares,
        reminders: validatedReminders,
      }
    });
  } catch (error: any) {
    console.error("Error creating calendar event:", error);
    res.status(500).json({ error: error.message || "Failed to create calendar event" });
  }
});

// PUT /api/calendar/events/:id - Update event (with per-recipient permissions & reminders)
calendarRouter.put("/events/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId || (req.user as any).id;
    const { id } = req.params;
    const { title, description, startDate, endDate, allDay, category, location, sharedWith, reminders } = req.body;

    const existing = await prisma.calendarEvent.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Event not found" });
    }

    const isOwner = existing.userId === userId;
    const isSystemAdmin = req.user?.roles?.some((r: string) => ["super_admin", "tenant_admin"].includes(r));

    const meta = parseCalendarMetadata(existing.description);
    const userShare = meta.shares.find(s => s.recipientId === userId);
    const isEditAuthorizedShare = userShare && userShare.permission === "edit";

    if (!isOwner && !isSystemAdmin) {
      if (userShare && userShare.permission === "view") {
        return res.status(403).json({ error: "Access Denied: You have view-only access to this shared event." });
      }
      if (!isEditAuthorizedShare) {
        return res.status(403).json({ error: "Access Denied: You do not own this calendar event." });
      }
    }

    // Process updated shares if provided and user is owner/admin
    let newShares = meta.shares;
    const oldRecipientIds = new Set(meta.shares.map(s => s.recipientId));
    const addedRecipients: CalendarShare[] = [];
    const revokedRecipientIds: string[] = [];

    if (Array.isArray(sharedWith) && (isOwner || isSystemAdmin)) {
      newShares = [];
      const updatedRecipientIds = new Set<string>();

      for (const item of sharedWith) {
        const recipientId = typeof item === "string" ? item : item?.recipientId;
        const permission: "view" | "edit" = (typeof item === "object" && item?.permission === "edit") ? "edit" : "view";

        if (recipientId && recipientId !== "all") {
          const validUser = await prisma.user.findFirst({
            where: { id: recipientId, profile: { tenantId } },
          }) || await prisma.employee.findFirst({
            where: { id: recipientId, tenantId },
          });

          if (!validUser) {
            return res.status(400).json({
              error: `Recipient '${recipientId}' does not belong to your organization.`,
              code: "CROSS_TENANT_SHARING_FORBIDDEN"
            });
          }
        }

        if (recipientId && !newShares.some(s => s.recipientId === recipientId)) {
          const shareObj: CalendarShare = {
            recipientId,
            permission,
            sharedBy: userId,
            createdAt: new Date().toISOString(),
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

    // Process updated reminders if provided
    let newReminders = meta.reminders;
    if (Array.isArray(reminders)) {
      newReminders = [];
      for (const rem of reminders) {
        const minutes = typeof rem?.minutesBefore === "number" ? rem.minutesBefore : parseInt(rem?.minutesBefore, 10);
        if (!isNaN(minutes) && minutes >= 0) {
          const channel = ["email", "in_app", "both"].includes(rem.channel) ? rem.channel : "both";
          newReminders.push({
            id: rem.id || `rem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            minutesBefore: minutes,
            channel,
            status: "pending", // Reset status on edit
          });
        }
      }
    }

    const cleanDesc = description !== undefined ? (description ? description.trim() : "") : meta.cleanDescription;
    const finalDesc = serializeCalendarMetadata(cleanDesc, newShares, newReminders);

    const updateData: any = {
      description: finalDesc || null,
    };
    if (title !== undefined) updateData.title = title.trim();
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (allDay !== undefined) updateData.allDay = Boolean(allDay);
    if (category !== undefined) updateData.category = category;
    if (location !== undefined) updateData.location = location ? location.trim() : null;

    const updated = await prisma.calendarEvent.update({
      where: { id },
      data: updateData,
    });

    // Notify added recipients
    for (const s of addedRecipients) {
      await NotificationService.createNotification({
        tenantId,
        userId: s.recipientId,
        title: `Calendar Event Shared: ${updated.title}`,
        message: `You were granted ${s.permission === "edit" ? "Edit" : "View"} access to "${updated.title}".`,
        type: "CALENDAR_INVITE",
        actionUrl: `/hr/calendar`,
        metadata: { eventId: id, permission: s.permission },
      });
      await PusherService.triggerUserEvent(tenantId, s.recipientId, "calendar:event-shared", {
        eventId: id,
        title: updated.title,
        permission: s.permission,
      });
    }

    // Notify revoked recipients
    for (const rId of revokedRecipientIds) {
      await NotificationService.createNotification({
        tenantId,
        userId: rId,
        title: `Calendar Access Revoked: ${updated.title}`,
        message: `Your access to "${updated.title}" has been revoked.`,
        type: "CALENDAR_REVOKE",
        actionUrl: `/hr/calendar`,
        metadata: { eventId: id },
      });
      await PusherService.triggerUserEvent(tenantId, rId, "calendar:event-revoked", {
        eventId: id,
        title: updated.title,
      });
    }

    // Notify remaining shared members of update
    for (const s of newShares) {
      if (!addedRecipients.some(a => a.recipientId === s.recipientId)) {
        await PusherService.triggerUserEvent(tenantId, s.recipientId, "calendar:event-updated", {
          eventId: id,
          title: updated.title,
        });
      }
    }

    res.json({
      success: true,
      data: {
        ...updated,
        description: cleanDesc,
        shares: newShares,
        reminders: newReminders,
      }
    });
  } catch (error: any) {
    console.error("Error updating calendar event:", error);
    res.status(500).json({ error: error.message || "Failed to update calendar event" });
  }
});

// DELETE /api/calendar/events/:id - Delete event (Owner or Admin only)
calendarRouter.delete("/events/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId || (req.user as any).id;
    const { id } = req.params;

    const existing = await prisma.calendarEvent.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Event not found" });
    }

    const isOwner = existing.userId === userId;
    const isSystemAdmin = req.user?.roles?.some((r: string) => ["super_admin", "tenant_admin"].includes(r));

    if (!isOwner && !isSystemAdmin) {
      return res.status(403).json({ error: "Access Denied: You do not own this calendar event." });
    }

    const meta = parseCalendarMetadata(existing.description);

    await prisma.calendarEvent.delete({
      where: { id },
    });

    // Notify all participants of event deletion
    for (const s of meta.shares) {
      try {
        await NotificationService.createNotification({
          tenantId,
          userId: s.recipientId,
          title: `Calendar Event Cancelled: ${existing.title}`,
          message: `The event "${existing.title}" has been removed from the calendar.`,
          type: "CALENDAR_CANCEL",
          actionUrl: `/hr/calendar`,
          metadata: { eventId: id },
        });

        await PusherService.triggerUserEvent(tenantId, s.recipientId, "calendar:event-deleted", {
          eventId: id,
          title: existing.title,
        });
      } catch (err: any) {
        console.warn(`[calendar.routes] Delete notification error:`, err.message);
      }
    }

    res.json({ success: true, message: "Event deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting calendar event:", error);
    res.status(500).json({ error: error.message || "Failed to delete calendar event" });
  }
});

// POST /api/calendar/events/:id/share - Add/update recipient share
calendarRouter.post("/events/:id/share", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId || (req.user as any).id;
    const { id } = req.params;
    const { recipientId, permission = "view" } = req.body;

    if (!recipientId || !recipientId.trim()) {
      return res.status(400).json({ error: "recipientId is required" });
    }

    const event = await prisma.calendarEvent.findFirst({
      where: { id, tenantId },
    });
    if (!event) {
      return res.status(404).json({ error: "Calendar event not found" });
    }

    const isOwner = event.userId === userId;
    const isSystemAdmin = req.user?.roles?.some((r: string) => ["super_admin", "admin", "hr_admin"].includes(r));
    if (!isOwner && !isSystemAdmin) {
      return res.status(403).json({ error: "Access Denied: Only event organizer or administrator can share this event." });
    }

    // Tenant boundary validation
    const validUser = await prisma.user.findFirst({
      where: { id: recipientId, profile: { tenantId } },
    }) || await prisma.employee.findFirst({
      where: { id: recipientId, tenantId },
    });

    if (!validUser) {
      return res.status(400).json({
        error: `Recipient '${recipientId}' does not belong to your organization.`,
        code: "CROSS_TENANT_SHARING_FORBIDDEN"
      });
    }

    const meta = parseCalendarMetadata(event.description);
    const existingIndex = meta.shares.findIndex(s => s.recipientId === recipientId);
    const perm: "view" | "edit" = permission === "edit" ? "edit" : "view";

    if (existingIndex >= 0) {
      meta.shares[existingIndex].permission = perm;
    } else {
      meta.shares.push({
        recipientId,
        permission: perm,
        sharedBy: userId,
        createdAt: new Date().toISOString(),
      });
    }

    const newDescription = serializeCalendarMetadata(meta.cleanDescription, meta);
    await prisma.calendarEvent.update({
      where: { id },
      data: { description: newDescription },
    });

    // Send notifications to added recipient
    try {
      await NotificationService.createNotification({
        tenantId,
        userId: recipientId,
        title: `Calendar Event Shared: ${event.title}`,
        message: `You were granted ${perm === "edit" ? "Edit" : "View"} access to "${event.title}".`,
        type: "CALENDAR_SHARE",
        actionUrl: `/hr/calendar`,
        metadata: { eventId: id, permission: perm },
      });

      await PusherService.triggerUserEvent(tenantId, recipientId, "calendar:event-shared", {
        eventId: id,
        title: event.title,
        permission: perm,
      });
    } catch (notifErr: any) {
      console.warn(`[calendar.routes] Share notification error:`, notifErr.message);
    }

    return res.json({ success: true, message: "Event shared successfully", shares: meta.shares });
  } catch (error: any) {
    console.error("Error sharing calendar event:", error);
    return res.status(500).json({ error: error.message || "Failed to share calendar event" });
  }
});

// DELETE /api/calendar/events/:id/share/:recipientId - Revoke recipient access
calendarRouter.delete("/events/:id/share/:recipientId", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId || (req.user as any).id;
    const { id, recipientId } = req.params;

    const event = await prisma.calendarEvent.findFirst({
      where: { id, tenantId },
    });
    if (!event) {
      return res.status(404).json({ error: "Calendar event not found" });
    }

    const isOwner = event.userId === userId;
    const isSystemAdmin = req.user?.roles?.some((r: string) => ["super_admin", "admin", "hr_admin"].includes(r));
    if (!isOwner && !isSystemAdmin) {
      return res.status(403).json({ error: "Access Denied: Only event organizer or administrator can revoke sharing." });
    }

    const meta = parseCalendarMetadata(event.description);
    const initialCount = meta.shares.length;
    meta.shares = meta.shares.filter(s => s.recipientId !== recipientId);

    if (meta.shares.length === initialCount) {
      return res.status(404).json({ error: "Share record not found for this recipient" });
    }

    const newDescription = serializeCalendarMetadata(meta.cleanDescription, meta);
    await prisma.calendarEvent.update({
      where: { id },
      data: { description: newDescription },
    });

    try {
      await PusherService.triggerUserEvent(tenantId, recipientId, "calendar:event-unshared", {
        eventId: id,
        title: event.title,
      });
    } catch (notifErr: any) {
      console.warn(`[calendar.routes] Revoke share notification error:`, notifErr.message);
    }

    return res.json({ success: true, message: "Share revoked successfully", shares: meta.shares });
  } catch (error: any) {
    console.error("Error revoking calendar share:", error);
    return res.status(500).json({ error: error.message || "Failed to revoke calendar share" });
  }
});

// ==========================================
// REMINDER TRIGGER ENDPOINT (Phase 5 Testing)
// ==========================================

// POST /api/calendar/reminders/process-due - Manually trigger due reminder processing
calendarRouter.post("/reminders/process-due", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const result = await CalendarReminderScheduler.processDueReminders(tenantId);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error processing due reminders:", error);
    return res.status(500).json({ error: error.message || "Failed to process due reminders" });
  }
});

// Google sync placeholders preserved
calendarRouter.post("/google-sync", requireEntitlement("google-workspace"), async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: "Google Calendar sync triggered" });
});

calendarRouter.get("/google-sync/status", requireEntitlement("google-workspace"), async (req: AuthRequest, res: Response) => {
  res.json({ success: true, status: "idle", lastSyncedAt: null });
});
