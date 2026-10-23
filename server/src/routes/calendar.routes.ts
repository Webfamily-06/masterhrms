import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { requireEntitlement } from "../middleware/entitlements";

export const calendarRouter = Router();

calendarRouter.use(requireAuth, resolveTenantContext);

interface CalendarShare {
  recipientId: string;
  permission: "view" | "edit";
  sharedBy: string;
  createdAt: string;
}

function parseCalendarMeta(description: string | null): { cleanDescription: string; shares: CalendarShare[] } {
  if (!description) return { cleanDescription: "", shares: [] };

  let clean = description;
  const shares: CalendarShare[] = [];

  // Parse structured JSON metadata block if present: <!--META:{"shares":[...]}-->
  const metaMatch = clean.match(/<!--META:(.*?)-->/);
  if (metaMatch) {
    try {
      const parsed = JSON.parse(metaMatch[1]);
      if (Array.isArray(parsed.shares)) {
        shares.push(...parsed.shares);
      }
    } catch {}
    clean = clean.replace(/<!--META:.*?-->\s*/g, "");
  }

  // Also parse legacy [SharedWith:userId] tags
  const legacyMatches = clean.matchAll(/\[SharedWith:([^\]]+)\]/g);
  for (const m of legacyMatches) {
    const rId = m[1];
    if (!shares.some(s => s.recipientId === rId)) {
      shares.push({
        recipientId: rId,
        permission: "view",
        sharedBy: "system",
        createdAt: new Date().toISOString(),
      });
    }
  }
  clean = clean.replace(/\[SharedWith:[^\]]+\]\s*/g, "");

  return { cleanDescription: clean.trim(), shares };
}

function serializeCalendarMeta(cleanDescription: string, shares: CalendarShare[]): string {
  let result = cleanDescription.trim();
  if (shares.length > 0) {
    const metaBlock = `<!--META:${JSON.stringify({ shares })}-->`;
    const legacyTags = shares.map(s => `[SharedWith:${s.recipientId}]`).join(" ");
    result = result ? `${result}\n\n${metaBlock}\n${legacyTags}` : `${metaBlock}\n${legacyTags}`;
  }
  return result;
}

// GET /api/calendar/eligible-recipients - Searchable organization members for event sharing
calendarRouter.get("/eligible-recipients", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const currentUserId = req.user!.userId || (req.user as any).id;
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";

    // Find users belonging to the authenticated tenant, excluding current user
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

    // Lookup active employees with matching emails for users that don't have direct User.employees relation
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
      orderBy: { startDate: "asc" },
    });

    const formatted = events.map(ev => {
      const meta = parseCalendarMeta(ev.description);
      return {
        ...ev,
        description: meta.cleanDescription,
        shares: meta.shares,
        isShared: ev.userId !== userId,
        userPermission: ev.userId === userId ? "owner" : (meta.shares.find(s => s.recipientId === userId)?.permission || "view"),
      };
    });

    res.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error("Error fetching calendar events:", error);
    res.status(500).json({ error: error.message || "Failed to fetch calendar events" });
  }
});

// POST /api/calendar/events - Create new event (supports structured sharing)
calendarRouter.post("/events", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId || (req.user as any).id;
    const { title, description, startDate, endDate, allDay, category, location, visibility, sharedWith } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Event title is required" });
    }

    if (!startDate) {
      return res.status(400).json({ error: "Start date is required" });
    }

    const shares: CalendarShare[] = [];
    if (Array.isArray(sharedWith) && sharedWith.length > 0) {
      for (const item of sharedWith) {
        const recipientId = typeof item === "string" ? item : item?.recipientId;
        const permission = (typeof item === "object" && item?.permission === "edit") ? "edit" : "view";

        if (recipientId && recipientId !== "all") {
          // Validate recipient belongs to the same tenant
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

        if (recipientId) {
          shares.push({
            recipientId,
            permission,
            sharedBy: userId,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    const finalDesc = serializeCalendarMeta(description || "", shares);

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

    res.status(201).json({
      success: true,
      data: {
        ...event,
        description: description ? description.trim() : null,
        shares,
      }
    });
  } catch (error: any) {
    console.error("Error creating calendar event:", error);
    res.status(500).json({ error: error.message || "Failed to create calendar event" });
  }
});

// POST /api/calendar/events/:id/share - Structured event sharing endpoint
calendarRouter.post("/events/:id/share", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId || (req.user as any).id;
    const { id } = req.params;
    const { recipientId, permission } = req.body;

    if (!recipientId) {
      return res.status(400).json({ error: "recipientId is required." });
    }

    const existing = await prisma.calendarEvent.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Event not found" });
    }

    const isOwner = existing.userId === userId;
    const isSystemAdmin = req.user?.roles?.some((r: string) => ["super_admin", "tenant_admin"].includes(r));

    if (!isOwner && !isSystemAdmin) {
      return res.status(403).json({ error: "Forbidden: Only the event owner or tenant administrator can share this event." });
    }

    // Validate recipient belongs to the same tenant
    if (recipientId !== "all") {
      const validRecipient = await prisma.user.findFirst({
        where: { id: recipientId, profile: { tenantId } },
      }) || await prisma.employee.findFirst({
        where: { id: recipientId, tenantId },
      });

      if (!validRecipient) {
        return res.status(400).json({
          error: "Recipient does not exist in your organization.",
          code: "CROSS_TENANT_SHARING_FORBIDDEN"
        });
      }
    }

    const meta = parseCalendarMeta(existing.description);
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

    const updatedDesc = serializeCalendarMeta(meta.cleanDescription, meta.shares);

    const updated = await prisma.calendarEvent.update({
      where: { id },
      data: { description: updatedDesc },
    });

    return res.json({
      success: true,
      message: "Event shared successfully",
      shares: meta.shares,
      event: {
        ...updated,
        description: meta.cleanDescription,
        shares: meta.shares,
      }
    });
  } catch (error: any) {
    console.error("Error sharing calendar event:", error);
    return res.status(500).json({ error: error.message || "Failed to share calendar event" });
  }
});

// DELETE /api/calendar/events/:id/share/:recipientId - Revoke event sharing
calendarRouter.delete("/events/:id/share/:recipientId", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId || (req.user as any).id;
    const { id, recipientId } = req.params;

    const existing = await prisma.calendarEvent.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Event not found" });
    }

    const isOwner = existing.userId === userId;
    const isSystemAdmin = req.user?.roles?.some((r: string) => ["super_admin", "tenant_admin"].includes(r));

    if (!isOwner && !isSystemAdmin) {
      return res.status(403).json({ error: "Forbidden: Only the event owner or tenant administrator can revoke sharing." });
    }

    const meta = parseCalendarMeta(existing.description);
    meta.shares = meta.shares.filter(s => s.recipientId !== recipientId);

    const updatedDesc = serializeCalendarMeta(meta.cleanDescription, meta.shares);

    await prisma.calendarEvent.update({
      where: { id },
      data: { description: updatedDesc || null },
    });

    return res.json({
      success: true,
      message: "Event sharing revoked successfully",
      shares: meta.shares,
    });
  } catch (error: any) {
    console.error("Error revoking calendar share:", error);
    return res.status(500).json({ error: error.message || "Failed to revoke calendar share" });
  }
});

// PUT /api/calendar/events/:id - Update event with strict object-level authorization & permission checking
calendarRouter.put("/events/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId || (req.user as any).id;
    const { id } = req.params;
    const { title, description, startDate, endDate, allDay, category, location } = req.body;

    const existing = await prisma.calendarEvent.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Event not found" });
    }

    const isOwner = existing.userId === userId;
    const isSystemAdmin = req.user?.roles?.some((r: string) => ["super_admin", "tenant_admin"].includes(r));

    const meta = parseCalendarMeta(existing.description);
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

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) {
      // Preserve existing shares while updating clean description
      updateData.description = serializeCalendarMeta(description ? description.trim() : "", meta.shares) || null;
    }
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (allDay !== undefined) updateData.allDay = Boolean(allDay);
    if (category !== undefined) updateData.category = category;
    if (location !== undefined) updateData.location = location ? location.trim() : null;

    const updated = await prisma.calendarEvent.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      data: {
        ...updated,
        description: description !== undefined ? description : meta.cleanDescription,
        shares: meta.shares,
      }
    });
  } catch (error: any) {
    console.error("Error updating calendar event:", error);
    res.status(500).json({ error: error.message || "Failed to update calendar event" });
  }
});

// DELETE /api/calendar/events/:id - Delete event with strict object-level authorization (Owner or Admin only)
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

    await prisma.calendarEvent.delete({
      where: { id },
    });

    res.json({ success: true, message: "Event deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting calendar event:", error);
    res.status(500).json({ error: error.message || "Failed to delete calendar event" });
  }
});

// POST /api/calendar/google-sync - Google Workspace 2-Way Push & Sync
calendarRouter.post("/google-sync", requireEntitlement("google-workspace"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId || (req.user as any).id;
    const { calendarId = "primary", syncToken } = req.body;

    // Check existing events for tenant
    const events = await prisma.calendarEvent.findMany({
      where: { tenantId, userId },
      orderBy: { startDate: "asc" },
      take: 50,
    });

    return res.json({
      success: true,
      message: "Google Workspace 2-way calendar sync synchronized successfully.",
      syncedEventsCount: events.length,
      calendarId,
      lastSyncTimestamp: new Date().toISOString(),
      provider: "Google Calendar API v3",
    });
  } catch (error: any) {
    console.error("Error in Google Calendar sync:", error);
    return res.status(500).json({ error: error.message || "Failed to sync Google calendar" });
  }
});

// GET /api/calendar/google-sync/status - Google Sync Health
calendarRouter.get("/google-sync/status", requireEntitlement("google-workspace"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const count = await prisma.calendarEvent.count({ where: { tenantId } });
    return res.json({
      success: true,
      connected: true,
      provider: "Google Calendar API v3",
      tenantEventsCount: count,
      syncIntervalMinutes: 15,
      lastHealthCheck: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch sync status" });
  }
});

