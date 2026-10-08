import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { MeetingService } from "../services/meeting.service.js";
import { getTenantDb } from "../context/tenant-context.js";

export const hrMeetingsRouter = Router();

// Overview
hrMeetingsRouter.get("/overview", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const overview = await MeetingService.getOverview(tenantId);
    return res.json(overview);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load meetings overview" });
  }
});

// Rooms
hrMeetingsRouter.get("/rooms", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const rooms = await MeetingService.listRooms(tenantId);
    return res.json(rooms);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrMeetingsRouter.post("/rooms", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const room = await MeetingService.createRoom(tenantId, req.body);
    return res.status(201).json(room);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrMeetingsRouter.put("/rooms/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const db = getTenantDb();
    const room = await db.meetingRoom.update({
      where: { id: req.params.id },
      data: req.body,
    });
    return res.json(room);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrMeetingsRouter.delete("/rooms/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const db = getTenantDb();
    await db.meetingRoom.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Meeting Types
hrMeetingsRouter.get("/types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const types = await MeetingService.listTypes(tenantId);
    return res.json(types);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrMeetingsRouter.post("/types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const type = await MeetingService.createType(tenantId, req.body);
    return res.status(201).json(type);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrMeetingsRouter.put("/types/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const db = getTenantDb();
    const type = await db.meetingTypeMaster.update({
      where: { id: req.params.id },
      data: req.body,
    });
    return res.json(type);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrMeetingsRouter.delete("/types/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const db = getTenantDb();
    await db.meetingTypeMaster.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Meetings Management (Conflict Engine Enforcement)
hrMeetingsRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const meetings = await MeetingService.listMeetings(tenantId, {
      roomId: req.query.roomId as string,
      typeId: req.query.typeId as string,
      status: req.query.status as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    });
    return res.json(meetings);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrMeetingsRouter.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const organizerId = req.body.organizerId || req.user?.userId;
    const meeting = await MeetingService.createMeeting(tenantId, organizerId, req.body);
    return res.status(201).json(meeting);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrMeetingsRouter.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const meeting = await db.meeting.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        room: true,
        type: true,
        attendees: { include: { employee: true } },
        actionItems: { include: { assignee: true } },
      },
    });
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });
    return res.json(meeting);
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
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

// Action Items
hrMeetingsRouter.get("/action-items", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const items = await MeetingService.listActionItems(
      tenantId,
      req.query.meetingId as string,
      req.query.status as string
    );
    return res.json(items);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrMeetingsRouter.post("/action-items", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const creatorId = req.user?.userId || "system";
    const item = await MeetingService.createActionItem(tenantId, creatorId, req.body);
    return res.status(201).json(item);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

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
