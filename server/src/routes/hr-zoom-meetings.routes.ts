import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { prisma } from "../prisma.js";

export const hrZoomMeetingsRouter = Router();

function computeEndTime(startTime: string, durationMinutes: number): string {
  const parts = String(startTime || "10:00").split(":");
  const h = parseInt(parts[0] || "10", 10) || 0;
  const m = parseInt(parts[1] || "0", 10) || 0;
  const total = h * 60 + m + (Number(durationMinutes) || 30);
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

function generatePasscode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function formatZoomMeeting(m: any, empMap: Map<string, any>) {
  const startDateStr = m.startDate
    ? new Date(m.startDate).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];
  const rawIds = Array.isArray(m.attendeeIds) ? m.attendeeIds : [];
  const attendees = rawIds
    .map((id: string) => empMap.get(String(id)))
    .filter(Boolean);

  return {
    id: m.id,
    topic: m.topic,
    title: m.topic,
    startDate: startDateStr,
    startTime: m.startTime || "10:00",
    endTime: computeEndTime(m.startTime || "10:00", m.durationMinutes || 30),
    durationMinutes: Number(m.durationMinutes || 30),
    passcode: m.passcode || "",
    description: m.description || "",
    status: String(m.status || "scheduled").toLowerCase(),
    attendeeIds: rawIds.map(String),
    attendees,
    hostName: m.hostName || "Company",
    hostEmail: m.hostEmail || "",
    hostAvatar: m.hostAvatar || null,
    zoomMeetingId: m.zoomMeetingId || "",
    joinUrl: m.joinUrl || "",
    startUrl: m.startUrl || "",
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

async function buildEmployeeMap(tenantId: string) {
  const employees = await prisma.employee.findMany({
    where: { tenantId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      user: { select: { profile: { select: { avatarUrl: true } } } },
    },
  });
  const map = new Map<string, any>();
  for (const e of employees) {
    map.set(e.id, {
      id: e.id,
      name: `${e.firstName} ${e.lastName}`.trim(),
      firstName: e.firstName,
      lastName: e.lastName,
      email: e.email,
      avatarUrl: e.user?.profile?.avatarUrl || null,
    });
  }
  return map;
}

hrZoomMeetingsRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const [meetings, empMap] = await Promise.all([
      prisma.zoomMeeting.findMany({
        where: { tenantId },
        orderBy: [{ startDate: "asc" }, { startTime: "asc" }],
      }),
      buildEmployeeMap(tenantId),
    ]);
    return res.json(meetings.map((m) => formatZoomMeeting(m, empMap)));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrZoomMeetingsRouter.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const {
      topic,
      title,
      startDate,
      startTime,
      durationMinutes,
      passcode,
      attendeeIds,
      description,
      status,
    } = req.body || {};

    const resolvedTopic = String(topic || title || "").trim();
    if (!resolvedTopic) return res.status(400).json({ error: "Meeting Title / Topic is required." });
    if (!startDate) return res.status(400).json({ error: "Start Date is required." });

    let hostName = req.user?.email?.split("@")[0] || "Company";
    let hostEmail = req.user?.email || "";
    let hostAvatar: string | null = null;
    if (req.user?.userId) {
      const me = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { email: true, profile: { select: { fullName: true, avatarUrl: true } } },
      });
      if (me) {
        hostName = me.profile?.fullName || hostName;
        hostEmail = me.email || hostEmail;
        hostAvatar = me.profile?.avatarUrl || null;
      }
    }

    const cleanPasscode = passcode ? String(passcode).trim() : generatePasscode();
    const generatedMeetingNum = String(Math.floor(10000000000 + Math.random() * 89999999999));

    const created = await prisma.zoomMeeting.create({
      data: {
        tenantId,
        topic: resolvedTopic,
        startDate: new Date(startDate),
        startTime: String(startTime || "10:00").trim(),
        durationMinutes: Math.max(5, Number(durationMinutes) || 30),
        passcode: cleanPasscode,
        description: description ? String(description).trim() : null,
        status: status ? String(status).toLowerCase() : "scheduled",
        attendeeIds: Array.isArray(attendeeIds) ? attendeeIds.map(String) : [],
        hostName,
        hostEmail,
        hostAvatar,
        zoomMeetingId: generatedMeetingNum,
        joinUrl: `https://zoom.us/j/${generatedMeetingNum}?pwd=${cleanPasscode}`,
        startUrl: `https://zoom.us/s/${generatedMeetingNum}?pwd=${cleanPasscode}`,
      },
    });

    const empMap = await buildEmployeeMap(tenantId);
    return res.status(201).json(formatZoomMeeting(created, empMap));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrZoomMeetingsRouter.put("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.zoomMeeting.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Zoom meeting not found." });

    const {
      topic,
      title,
      startDate,
      startTime,
      durationMinutes,
      passcode,
      attendeeIds,
      description,
      status,
    } = req.body || {};

    const updated = await prisma.zoomMeeting.update({
      where: { id: existing.id },
      data: {
        ...(topic || title ? { topic: String(topic || title).trim() } : {}),
        ...(startDate ? { startDate: new Date(startDate) } : {}),
        ...(startTime ? { startTime: String(startTime).trim() } : {}),
        ...(durationMinutes !== undefined
          ? { durationMinutes: Math.max(5, Number(durationMinutes) || 30) }
          : {}),
        ...(passcode !== undefined ? { passcode: String(passcode).trim() || null } : {}),
        ...(attendeeIds !== undefined
          ? { attendeeIds: Array.isArray(attendeeIds) ? attendeeIds.map(String) : [] }
          : {}),
        ...(description !== undefined
          ? { description: description ? String(description).trim() : null }
          : {}),
        ...(status ? { status: String(status).toLowerCase() } : {}),
      },
    });

    const empMap = await buildEmployeeMap(tenantId);
    return res.json(formatZoomMeeting(updated, empMap));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrZoomMeetingsRouter.patch("/:id/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.zoomMeeting.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Zoom meeting not found." });

    const nextStatus = String(req.body?.status || "scheduled").toLowerCase();
    if (!["scheduled", "started", "ended", "cancelled"].includes(nextStatus)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    const updated = await prisma.zoomMeeting.update({
      where: { id: existing.id },
      data: { status: nextStatus },
    });

    const empMap = await buildEmployeeMap(tenantId);
    return res.json(formatZoomMeeting(updated, empMap));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrZoomMeetingsRouter.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const existing = await prisma.zoomMeeting.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Zoom meeting not found." });
    await prisma.zoomMeeting.delete({ where: { id: existing.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});
