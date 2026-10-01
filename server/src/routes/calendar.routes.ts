import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";

export const calendarRouter = Router();

calendarRouter.use(requireAuth, resolveTenantContext);

// GET /api/calendar/events - List events
calendarRouter.get("/events", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId || (req.user as any).id;
    const { startDate, endDate, category } = req.query;

    const whereClause: any = {
      tenantId,
      userId,
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

    res.json({ success: true, data: events });
  } catch (error: any) {
    console.error("Error fetching calendar events:", error);
    res.status(500).json({ error: error.message || "Failed to fetch calendar events" });
  }
});

// POST /api/calendar/events - Create new event
calendarRouter.post("/events", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId || (req.user as any).id;
    const { title, description, startDate, endDate, allDay, category, location } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Event title is required" });
    }

    if (!startDate) {
      return res.status(400).json({ error: "Start date is required" });
    }

    const event = await prisma.calendarEvent.create({
      data: {
        tenantId,
        userId,
        title: title.trim(),
        description: description ? description.trim() : null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : new Date(startDate),
        allDay: Boolean(allDay),
        category: category || "team",
        location: location ? location.trim() : null,
      },
    });

    res.status(201).json({ success: true, data: event });
  } catch (error: any) {
    console.error("Error creating calendar event:", error);
    res.status(500).json({ error: error.message || "Failed to create calendar event" });
  }
});

// PUT /api/calendar/events/:id - Update event
calendarRouter.put("/events/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { id } = req.params;
    const { title, description, startDate, endDate, allDay, category, location } = req.body;

    const existing = await prisma.calendarEvent.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Event not found" });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (allDay !== undefined) updateData.allDay = Boolean(allDay);
    if (category !== undefined) updateData.category = category;
    if (location !== undefined) updateData.location = location ? location.trim() : null;

    const updated = await prisma.calendarEvent.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Error updating calendar event:", error);
    res.status(500).json({ error: error.message || "Failed to update calendar event" });
  }
});

// DELETE /api/calendar/events/:id - Delete event
calendarRouter.delete("/events/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { id } = req.params;

    const existing = await prisma.calendarEvent.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Event not found" });
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
