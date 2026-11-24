import { Router, Response } from "express";
import crypto from "crypto";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { MeetingService } from "../services/meeting.service.js";
import { prisma } from "../prisma.js";
import { getIO } from "../socket.js";

export const hrMeetingsRouter = Router();

// =========================================================================
// 1. OVERVIEW
// =========================================================================
hrMeetingsRouter.get("/overview", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const overview = await MeetingService.getOverview(tenantId);
    return res.json(overview);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load meetings overview" });
  }
});

// =========================================================================
// 2. MEETING ROOMS
// =========================================================================
function parseEquipmentList(raw?: string | string[] | null): string[] {
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function formatRoom(r: any) {
  const equipment = parseEquipmentList(r.amenities);
  return {
    id: r.id,
    name: r.name,
    description: r.description || "",
    roomType: String(r.roomType || "physical").toLowerCase(),
    type: String(r.roomType || "physical").toLowerCase(),
    location: r.location || "",
    bookingUrl: r.bookingUrl || "",
    capacity: Number(r.capacity || 0),
    amenities: equipment.join(", "),
    equipment,
    meetingsCount: Number(r._count?.meetings ?? 0),
    isActive: r.isActive !== false,
    status: r.isActive === false ? "inactive" : "active",
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

hrMeetingsRouter.get("/rooms", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const rooms = await prisma.meetingRoom.findMany({
      where: { tenantId },
      include: { _count: { select: { meetings: true } } },
      orderBy: { createdAt: "desc" },
    });
    return res.json(rooms.map(formatRoom));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrMeetingsRouter.post("/rooms", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const {
      name,
      description,
      roomType,
      type,
      location,
      bookingUrl,
      capacity,
      equipment,
      amenities,
      status,
      isActive,
    } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Room Name is required." });
    }

    const resolvedType = String(roomType || type || "physical").toLowerCase() === "virtual"
      ? "virtual"
      : "physical";
    const equipList = parseEquipmentList(equipment ?? amenities);
    const activeFlag =
      isActive !== undefined
        ? Boolean(isActive)
        : status !== undefined
        ? String(status).toLowerCase() !== "inactive"
        : true;

    const created = await prisma.meetingRoom.create({
      data: {
        tenantId,
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        roomType: resolvedType,
        location: location ? String(location).trim() : null,
        bookingUrl: bookingUrl ? String(bookingUrl).trim() : null,
        capacity: Math.max(1, Number(capacity) || 10),
        amenities: equipList.join(", ") || null,
        isActive: activeFlag,
      },
      include: { _count: { select: { meetings: true } } },
    });
    return res.status(201).json(formatRoom(created));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrMeetingsRouter.put("/rooms/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.meetingRoom.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Meeting room not found." });

    const {
      name,
      description,
      roomType,
      type,
      location,
      bookingUrl,
      capacity,
      equipment,
      amenities,
      status,
      isActive,
    } = req.body || {};

    const resolvedType =
      roomType !== undefined || type !== undefined
        ? String(roomType || type).toLowerCase() === "virtual"
          ? "virtual"
          : "physical"
        : undefined;
    const equipRaw = equipment !== undefined ? equipment : amenities;
    const activeFlag =
      isActive !== undefined
        ? Boolean(isActive)
        : status !== undefined
        ? String(status).toLowerCase() !== "inactive"
        : undefined;

    const updated = await prisma.meetingRoom.update({
      where: { id: existing.id },
      data: {
        ...(name ? { name: String(name).trim() } : {}),
        ...(description !== undefined
          ? { description: description ? String(description).trim() : null }
          : {}),
        ...(resolvedType ? { roomType: resolvedType } : {}),
        ...(location !== undefined ? { location: location ? String(location).trim() : null } : {}),
        ...(bookingUrl !== undefined
          ? { bookingUrl: bookingUrl ? String(bookingUrl).trim() : null }
          : {}),
        ...(capacity !== undefined ? { capacity: Math.max(1, Number(capacity) || 1) } : {}),
        ...(equipRaw !== undefined
          ? { amenities: parseEquipmentList(equipRaw).join(", ") || null }
          : {}),
        ...(activeFlag !== undefined ? { isActive: activeFlag } : {}),
      },
      include: { _count: { select: { meetings: true } } },
    });
    return res.json(formatRoom(updated));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrMeetingsRouter.patch("/rooms/:id/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.meetingRoom.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Meeting room not found." });

    const nextActive =
      req.body?.isActive !== undefined
        ? Boolean(req.body.isActive)
        : req.body?.status !== undefined
        ? String(req.body.status).toLowerCase() !== "inactive"
        : !existing.isActive;

    const updated = await prisma.meetingRoom.update({
      where: { id: existing.id },
      data: { isActive: nextActive },
      include: { _count: { select: { meetings: true } } },
    });
    return res.json(formatRoom(updated));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrMeetingsRouter.delete("/rooms/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.meetingRoom.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Meeting room not found." });
    await prisma.meetingRoom.delete({ where: { id: existing.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// =========================================================================
// 3. MEETING TYPES
// =========================================================================
function formatMeetingType(t: any) {
  return {
    id: t.id,
    name: t.name,
    description: t.description || "",
    color: t.color || "#6366f1",
    defaultDuration: Number(t.defaultDuration || 30),
    meetingsCount: Number(t._count?.meetings ?? 0),
    isActive: t.isActive !== false,
    status: t.isActive === false ? "inactive" : "active",
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

hrMeetingsRouter.get("/types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const types = await prisma.meetingTypeMaster.findMany({
      where: { tenantId },
      include: { _count: { select: { meetings: true } } },
      orderBy: { createdAt: "desc" },
    });
    return res.json(types.map(formatMeetingType));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrMeetingsRouter.post("/types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { name, description, color, defaultDuration, status, isActive } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Meeting Type name is required." });
    }
    const activeFlag =
      isActive !== undefined
        ? Boolean(isActive)
        : status !== undefined
        ? String(status).toLowerCase() !== "inactive"
        : true;

    const created = await prisma.meetingTypeMaster.create({
      data: {
        tenantId,
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        color: color ? String(color).trim() : "#6366f1",
        defaultDuration: Math.max(5, Number(defaultDuration) || 30),
        isActive: activeFlag,
      },
      include: { _count: { select: { meetings: true } } },
    });
    return res.status(201).json(formatMeetingType(created));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrMeetingsRouter.put("/types/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.meetingTypeMaster.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Meeting type not found." });

    const { name, description, color, defaultDuration, status, isActive } = req.body || {};
    const activeFlag =
      isActive !== undefined
        ? Boolean(isActive)
        : status !== undefined
        ? String(status).toLowerCase() !== "inactive"
        : undefined;

    const updated = await prisma.meetingTypeMaster.update({
      where: { id: existing.id },
      data: {
        ...(name ? { name: String(name).trim() } : {}),
        ...(description !== undefined
          ? { description: description ? String(description).trim() : null }
          : {}),
        ...(color ? { color: String(color).trim() } : {}),
        ...(defaultDuration !== undefined
          ? { defaultDuration: Math.max(5, Number(defaultDuration) || 15) }
          : {}),
        ...(activeFlag !== undefined ? { isActive: activeFlag } : {}),
      },
      include: { _count: { select: { meetings: true } } },
    });
    return res.json(formatMeetingType(updated));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrMeetingsRouter.patch("/types/:id/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.meetingTypeMaster.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Meeting type not found." });

    const nextActive =
      req.body?.isActive !== undefined
        ? Boolean(req.body.isActive)
        : req.body?.status !== undefined
        ? String(req.body.status).toLowerCase() !== "inactive"
        : !existing.isActive;

    const updated = await prisma.meetingTypeMaster.update({
      where: { id: existing.id },
      data: { isActive: nextActive },
      include: { _count: { select: { meetings: true } } },
    });
    return res.json(formatMeetingType(updated));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrMeetingsRouter.delete("/types/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.meetingTypeMaster.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Meeting type not found." });
    await prisma.meetingTypeMaster.delete({ where: { id: existing.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// =========================================================================
// 4. ACTION ITEMS (MUST BE BEFORE /:id)
// =========================================================================
function resolveEmployeeAvatar(emp: any): string | null {
  if (!emp) return null;
  return emp.user?.profile?.avatarUrl || null;
}

const ACTION_ITEM_INCLUDE = {
  meeting: { select: { id: true, title: true, startTime: true } },
  assignee: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      user: { select: { profile: { select: { avatarUrl: true } } } },
    },
  },
};

function formatActionItem(a: any) {
  const todayStr = new Date().toISOString().split("T")[0];
  const dueStr = a.dueDate ? new Date(a.dueDate).toISOString().split("T")[0] : "";
  const progress = Math.max(0, Math.min(100, Number(a.progress ?? (a.status === "completed" ? 100 : 0))));
  const rawStatus = String(a.status || "not_started").toLowerCase();

  let computedStatus: "not_started" | "in_progress" | "completed" | "overdue" = "not_started";
  let daysRemaining = 0;
  let daysOverdue = 0;

  if (rawStatus === "completed" || progress >= 100) {
    computedStatus = "completed";
  } else {
    if (dueStr) {
      const diffMs = new Date(dueStr).getTime() - new Date(todayStr).getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        computedStatus = "overdue";
        daysOverdue = Math.abs(diffDays);
      } else {
        daysRemaining = diffDays;
        computedStatus = progress > 0 || rawStatus === "in_progress" ? "in_progress" : "not_started";
      }
    } else {
      computedStatus = progress > 0 || rawStatus === "in_progress" ? "in_progress" : "not_started";
    }
  }

  return {
    id: a.id,
    meetingId: a.meetingId,
    meeting: a.meeting
      ? {
          id: a.meeting.id,
          title: a.meeting.title,
          startTime: a.meeting.startTime,
        }
      : null,
    title: a.title,
    description: a.description || "",
    assigneeId: a.assigneeId,
    assignee: a.assignee
      ? {
          id: a.assignee.id,
          firstName: a.assignee.firstName,
          lastName: a.assignee.lastName,
          email: a.assignee.email,
          avatarUrl: resolveEmployeeAvatar(a.assignee),
        }
      : null,
    dueDate: dueStr,
    daysRemaining,
    daysOverdue,
    priority: String(a.priority || "medium").toLowerCase(),
    status: computedStatus,
    progress,
    progressNotes: a.progressNotes || "",
    notes: a.progressNotes || "",
    completedAt: a.completedAt,
    createdAt: a.createdAt,
  };
}

hrMeetingsRouter.get("/action-items", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const items = await prisma.meetingActionItem.findMany({
      where: {
        tenantId,
        ...(req.query.meetingId && req.query.meetingId !== "all"
          ? { meetingId: String(req.query.meetingId) }
          : {}),
      },
      include: ACTION_ITEM_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return res.json(items.map(formatActionItem));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrMeetingsRouter.post("/action-items", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const { meetingId, title, description, assigneeId, dueDate, priority } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: "Action Item Title is required." });
    }
    if (!assigneeId) {
      return res.status(400).json({ error: "Assignee is required." });
    }

    const created = await prisma.meetingActionItem.create({
      data: {
        tenantId,
        meetingId: meetingId || null,
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        assigneeId,
        creatorId: req.user?.userId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: String(priority || "medium").toLowerCase(),
        status: "not_started",
        progress: 0,
      },
      include: ACTION_ITEM_INCLUDE,
    });
    return res.status(201).json(formatActionItem(created));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrMeetingsRouter.put("/action-items/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.meetingActionItem.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Action item not found." });

    const { meetingId, title, description, assigneeId, dueDate, priority } = req.body || {};
    const updated = await prisma.meetingActionItem.update({
      where: { id: existing.id },
      data: {
        ...(meetingId !== undefined ? { meetingId: meetingId || null } : {}),
        ...(title ? { title: String(title).trim() } : {}),
        ...(description !== undefined
          ? { description: description ? String(description).trim() : null }
          : {}),
        ...(assigneeId ? { assigneeId } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        ...(priority ? { priority: String(priority).toLowerCase() } : {}),
      },
      include: ACTION_ITEM_INCLUDE,
    });
    return res.json(formatActionItem(updated));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrMeetingsRouter.patch(
  "/action-items/:id/progress",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const existing = await prisma.meetingActionItem.findFirst({
        where: { id: req.params.id, tenantId },
      });
      if (!existing) return res.status(404).json({ error: "Action item not found." });

      const pct = Math.max(0, Math.min(100, Number(req.body?.progress ?? 0)));
      const notesVal = req.body?.progressNotes ?? req.body?.notes;
      const nextStatus = pct >= 100 ? "completed" : pct > 0 ? "in_progress" : "not_started";

      const updated = await prisma.meetingActionItem.update({
        where: { id: existing.id },
        data: {
          progress: pct,
          status: nextStatus,
          completedAt: pct >= 100 ? new Date() : null,
          ...(notesVal !== undefined
            ? { progressNotes: String(notesVal).trim() || null }
            : {}),
        },
        include: ACTION_ITEM_INCLUDE,
      });
      return res.json(formatActionItem(updated));
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

hrMeetingsRouter.patch("/action-items/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const updated = await MeetingService.updateActionItemStatus(
      tenantId,
      req.params.id,
      req.body.status
    );
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrMeetingsRouter.delete("/action-items/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.meetingActionItem.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Action item not found." });
    await prisma.meetingActionItem.delete({ where: { id: existing.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// =========================================================================
// 5. MEETINGS MANAGEMENT (/:id MUST STAY AT THE VERY BOTTOM)
// =========================================================================
const MEETING_INCLUDE = {
  room: { select: { id: true, name: true, roomType: true, location: true, bookingUrl: true } },
  type: { select: { id: true, name: true, color: true, defaultDuration: true } },
  organizer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      user: { select: { profile: { select: { avatarUrl: true } } } },
    },
  },
  attendees: {
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          user: { select: { profile: { select: { avatarUrl: true } } } },
        },
      },
    },
    orderBy: { respondedAt: "desc" as const },
  },
  minutes: {
    orderBy: { recordedAt: "desc" as const },
  },
};

function combineDateAndTime(dateStr: string, timeStr: string): Date {
  if (!timeStr) return new Date(`${dateStr}T09:00:00`);
  if (timeStr.includes("T")) return new Date(timeStr);
  const hhmm = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return new Date(`${dateStr}T${hhmm}`);
}

function formatTimeHHMM(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatMeetingRecord(m: any) {
  const start = new Date(m.startTime);
  const end = new Date(m.endTime);
  const meetingDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(start.getDate()).padStart(2, "0")}`;
  const durationMinutes = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60))
  );

  return {
    id: m.id,
    title: m.title,
    description: m.description || "",
    typeId: m.typeId,
    type: m.type || null,
    roomId: m.roomId,
    room: m.room || null,
    organizerId: m.organizerId,
    organizer: m.organizer
      ? {
          id: m.organizer.id,
          firstName: m.organizer.firstName,
          lastName: m.organizer.lastName,
          name: `${m.organizer.firstName} ${m.organizer.lastName}`.trim(),
          email: m.organizer.email,
          avatarUrl: resolveEmployeeAvatar(m.organizer),
        }
      : null,
    meetingDate,
    startTime: m.startTime,
    endTime: m.endTime,
    startTimeStr: formatTimeHHMM(start),
    endTimeStr: formatTimeHHMM(end),
    durationMinutes,
    recurrence: m.recurrence || "none",
    recurrenceEndDate: m.recurrenceEndDate
      ? new Date(m.recurrenceEndDate).toISOString().split("T")[0]
      : "",
    location: m.location || m.room?.name || "",
    meetingUrl: m.meetingUrl || m.room?.bookingUrl || "",
    agenda: m.agenda || "",
    status: String(m.status || "scheduled").toLowerCase(),
    attendees: (m.attendees || []).map((a: any) => ({
      id: a.id,
      meetingId: a.meetingId,
      employeeId: a.employeeId,
      rsvpStatus: String(a.rsvpStatus || "pending").toLowerCase(),
      attendanceStatus: String(a.attendanceStatus || "not_attended").toLowerCase(),
      declineReason: a.declineReason || "",
      respondedAt: a.respondedAt
        ? new Date(a.respondedAt).toISOString().split("T")[0]
        : "",
      employee: a.employee
        ? {
            id: a.employee.id,
            firstName: a.employee.firstName,
            lastName: a.employee.lastName,
            name: `${a.employee.firstName} ${a.employee.lastName}`.trim(),
            email: a.employee.email,
            avatarUrl: resolveEmployeeAvatar(a.employee),
          }
        : null,
    })),
    minutes: (m.minutes || []).map((min: any) => ({
      id: min.id,
      meetingId: min.meetingId,
      topic: min.topic,
      type: String(min.type || "discussion").toLowerCase(),
      content: min.content,
      recordedById: min.recordedById,
      recordedByName: min.recordedByName || "HR Manager",
      recordedByEmail: min.recordedByEmail || "",
      recordedByAvatar: min.recordedByAvatar || null,
      recordedAt: min.recordedAt
        ? new Date(min.recordedAt).toISOString().split("T")[0]
        : "",
      recordedTime: min.recordedAt ? formatTimeHHMM(new Date(min.recordedAt)) : "",
    })),
    attendeesCount: (m.attendees || []).length,
    minutesCount: (m.minutes || []).length,
    createdAt: m.createdAt,
  };
}

hrMeetingsRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const meetings = await prisma.meeting.findMany({
      where: {
        tenantId,
        ...(req.query.roomId && req.query.roomId !== "all"
          ? { roomId: String(req.query.roomId) }
          : {}),
        ...(req.query.typeId && req.query.typeId !== "all"
          ? { typeId: String(req.query.typeId) }
          : {}),
        ...(req.query.status && req.query.status !== "all"
          ? { status: String(req.query.status) }
          : {}),
      },
      include: MEETING_INCLUDE,
      orderBy: [{ startTime: "asc" }],
    });
    return res.json(meetings.map(formatMeetingRecord));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrMeetingsRouter.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const {
      title,
      description,
      typeId,
      roomId,
      meetingDate,
      startTime,
      endTime,
      organizerId,
      recurrence,
      recurrenceEndDate,
      agenda,
      status,
    } = req.body || {};

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: "Meeting Title is required." });
    }
    if (!organizerId) {
      return res.status(400).json({ error: "Organizer is required." });
    }

    const baseDate = meetingDate || new Date().toISOString().split("T")[0];
    const startDt = combineDateAndTime(baseDate, String(startTime || "09:00"));
    const endDt = combineDateAndTime(baseDate, String(endTime || "10:00"));
    const randomCode = crypto.randomBytes(4).toString("hex");
    const autoMeetingUrl =
      req.body?.meetingUrl ||
      `/hr/chat/calls?meeting=${randomCode.slice(0, 3)}-${randomCode.slice(3, 6)}-${randomCode.slice(6, 8)}`;

    const created = await prisma.meeting.create({
      data: {
        tenantId,
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        typeId: typeId || null,
        roomId: roomId || null,
        organizerId,
        startTime: startDt,
        endTime: endDt > startDt ? endDt : new Date(startDt.getTime() + 60 * 60 * 1000),
        meetingUrl: autoMeetingUrl,
        recurrence: String(recurrence || "none").toLowerCase(),
        recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null,
        agenda: agenda ? String(agenda).trim() : null,
        status: String(status || "scheduled").toLowerCase(),
      },
      include: MEETING_INCLUDE,
    });
    getIO()?.to(`tenant:${tenantId}`).emit("meeting:upcoming:sync", {
      meetingId: created.id,
      title: created.title,
      startTime: created.startTime,
      meetingUrl: autoMeetingUrl,
    });
    return res.status(201).json(formatMeetingRecord(created));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrMeetingsRouter.put("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.meeting.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Meeting not found." });

    const {
      title,
      description,
      typeId,
      roomId,
      meetingDate,
      startTime,
      endTime,
      organizerId,
      recurrence,
      recurrenceEndDate,
      agenda,
      status,
    } = req.body || {};

    const baseDate =
      meetingDate || new Date(existing.startTime).toISOString().split("T")[0];
    const startDt = startTime ? combineDateAndTime(baseDate, String(startTime)) : undefined;
    const endDt = endTime ? combineDateAndTime(baseDate, String(endTime)) : undefined;

    const updated = await prisma.meeting.update({
      where: { id: existing.id },
      data: {
        ...(title ? { title: String(title).trim() } : {}),
        ...(description !== undefined
          ? { description: description ? String(description).trim() : null }
          : {}),
        ...(typeId !== undefined ? { typeId: typeId || null } : {}),
        ...(roomId !== undefined ? { roomId: roomId || null } : {}),
        ...(organizerId ? { organizerId } : {}),
        ...(startDt ? { startTime: startDt } : {}),
        ...(endDt ? { endTime: endDt } : {}),
        ...(recurrence !== undefined ? { recurrence: String(recurrence).toLowerCase() } : {}),
        ...(recurrenceEndDate !== undefined
          ? { recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null }
          : {}),
        ...(agenda !== undefined ? { agenda: agenda ? String(agenda).trim() : null } : {}),
        ...(status ? { status: String(status).toLowerCase() } : {}),
      },
      include: MEETING_INCLUDE,
    });
    return res.json(formatMeetingRecord(updated));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrMeetingsRouter.patch("/:id/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.meeting.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Meeting not found." });
    const nextStatus = String(req.body?.status || "scheduled").toLowerCase();
    const updated = await prisma.meeting.update({
      where: { id: existing.id },
      data: { status: nextStatus },
      include: MEETING_INCLUDE,
    });
    return res.json(formatMeetingRecord(updated));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrMeetingsRouter.post("/:id/cancel", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const cancelled = await MeetingService.updateMeetingStatus(tenantId, req.params.id, "cancelled");
    return res.json(cancelled);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrMeetingsRouter.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.meeting.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Meeting not found." });
    await prisma.meeting.delete({ where: { id: existing.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Attendees CRUD
hrMeetingsRouter.post("/:id/attendees", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const meeting = await prisma.meeting.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!meeting) return res.status(404).json({ error: "Meeting not found." });

    const { employeeId, rsvpStatus, attendanceStatus, declineReason } = req.body || {};
    if (!employeeId) return res.status(400).json({ error: "Employee is required." });

    const created = await prisma.meetingAttendee.upsert({
      where: { meetingId_employeeId: { meetingId: meeting.id, employeeId } },
      create: {
        meetingId: meeting.id,
        employeeId,
        rsvpStatus: String(rsvpStatus || "pending").toLowerCase(),
        attendanceStatus: String(attendanceStatus || "not_attended").toLowerCase(),
        declineReason: declineReason ? String(declineReason).trim() : null,
        respondedAt: new Date(),
      },
      update: {
        rsvpStatus: String(rsvpStatus || "pending").toLowerCase(),
        attendanceStatus: String(attendanceStatus || "not_attended").toLowerCase(),
        declineReason: declineReason ? String(declineReason).trim() : null,
        respondedAt: new Date(),
      },
    });
    getIO()?.to(`tenant:${tenantId}`).emit("meeting:upcoming:sync", {
      meetingId: meeting.id,
      title: meeting.title,
      startTime: meeting.startTime,
      meetingUrl: meeting.meetingUrl || `/hr/chat/calls?meeting=${meeting.id}`,
    });
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrMeetingsRouter.put(
  "/:id/attendees/:attendeeId",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const meeting = await prisma.meeting.findFirst({
        where: { id: req.params.id, tenantId },
      });
      if (!meeting) return res.status(404).json({ error: "Meeting not found." });

      const { rsvpStatus, attendanceStatus, declineReason } = req.body || {};
      const updated = await prisma.meetingAttendee.update({
        where: { id: req.params.attendeeId },
        data: {
          ...(rsvpStatus ? { rsvpStatus: String(rsvpStatus).toLowerCase() } : {}),
          ...(attendanceStatus
            ? { attendanceStatus: String(attendanceStatus).toLowerCase() }
            : {}),
          ...(declineReason !== undefined
            ? { declineReason: declineReason ? String(declineReason).trim() : null }
            : {}),
          respondedAt: new Date(),
        },
      });
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

hrMeetingsRouter.delete(
  "/:id/attendees/:attendeeId",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const meeting = await prisma.meeting.findFirst({
        where: { id: req.params.id, tenantId },
      });
      if (!meeting) return res.status(404).json({ error: "Meeting not found." });
      await prisma.meetingAttendee.delete({ where: { id: req.params.attendeeId } });
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

// Minutes CRUD
hrMeetingsRouter.post("/:id/minutes", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const meeting = await prisma.meeting.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!meeting) return res.status(404).json({ error: "Meeting not found." });

    const { topic, type, content, recordedById, recordedDate, recordedTime } = req.body || {};
    if (!topic || !content) {
      return res.status(400).json({ error: "Topic and Content are required." });
    }

    let recordedByName = req.user?.email?.split("@")[0] || "HR Manager";
    let recordedByEmail = req.user?.email || "";
    let recordedByAvatar: string | null = null;
    if (recordedById) {
      const emp = await prisma.employee.findFirst({
        where: { id: recordedById, tenantId },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          user: { select: { profile: { select: { avatarUrl: true } } } },
        },
      });
      if (emp) {
        recordedByName = `${emp.firstName} ${emp.lastName}`.trim();
        recordedByEmail = emp.email || "";
        recordedByAvatar = resolveEmployeeAvatar(emp);
      }
    }

    const recordedAt = recordedDate
      ? combineDateAndTime(recordedDate, String(recordedTime || "10:00"))
      : new Date();

    const created = await prisma.meetingMinute.create({
      data: {
        tenantId,
        meetingId: meeting.id,
        topic: String(topic).trim(),
        type: String(type || "discussion").toLowerCase(),
        content: String(content).trim(),
        recordedById: recordedById || null,
        recordedByName,
        recordedByEmail,
        recordedByAvatar,
        recordedAt,
      },
    });
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrMeetingsRouter.put(
  "/:id/minutes/:minuteId",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const existing = await prisma.meetingMinute.findFirst({
        where: { id: req.params.minuteId, meetingId: req.params.id, tenantId },
      });
      if (!existing) return res.status(404).json({ error: "Meeting minute not found." });

      const { topic, type, content, recordedById, recordedDate, recordedTime } = req.body || {};
      let recorderUpdate: any = {};
      if (recordedById) {
        const emp = await prisma.employee.findFirst({
          where: { id: recordedById, tenantId },
          select: {
            firstName: true,
            lastName: true,
            email: true,
            user: { select: { profile: { select: { avatarUrl: true } } } },
          },
        });
        if (emp) {
          recorderUpdate = {
            recordedById,
            recordedByName: `${emp.firstName} ${emp.lastName}`.trim(),
            recordedByEmail: emp.email || "",
            recordedByAvatar: emp.user?.profile?.avatarUrl || null,
          };
        }
      }

      const updated = await prisma.meetingMinute.update({
        where: { id: existing.id },
        data: {
          ...(topic ? { topic: String(topic).trim() } : {}),
          ...(type ? { type: String(type).toLowerCase() } : {}),
          ...(content ? { content: String(content).trim() } : {}),
          ...(recordedDate
            ? { recordedAt: combineDateAndTime(recordedDate, String(recordedTime || "10:00")) }
            : {}),
          ...recorderUpdate,
        },
      });
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

hrMeetingsRouter.delete(
  "/:id/minutes/:minuteId",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const existing = await prisma.meetingMinute.findFirst({
        where: { id: req.params.minuteId, meetingId: req.params.id, tenantId },
      });
      if (!existing) return res.status(404).json({ error: "Meeting minute not found." });
      await prisma.meetingMinute.delete({ where: { id: existing.id } });
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

hrMeetingsRouter.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const meeting = await prisma.meeting.findFirst({
      where: { id: req.params.id, tenantId },
      include: MEETING_INCLUDE,
    });
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });
    return res.json(formatMeetingRecord(meeting));
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});
