import { getTenantDb } from "../context/tenant-context";
import { OutboxService } from "./outbox.service";
import { AuditService } from "./audit.service";

export class MeetingService {
  /**
   * 1. DASHBOARD OVERVIEW
   */
  static async getOverview(tenantId: string) {
    const db = getTenantDb();
    const now = new Date();
    const [upcomingMeetings, totalRooms, totalActionItems, openActionItems] = await Promise.all([
      db.meeting.count({ where: { tenantId, startTime: { gte: now }, status: "scheduled" } }),
      db.meetingRoom.count({ where: { tenantId, isActive: true } }),
      db.meetingActionItem.count({ where: { tenantId } }),
      db.meetingActionItem.count({ where: { tenantId, status: "open" } }),
    ]);

    return {
      upcomingMeetings,
      totalRooms,
      totalActionItems,
      openActionItems,
    };
  }

  /**
   * 2. MEETING ROOMS
   */
  static async listRooms(tenantId: string) {
    const db = getTenantDb();
    return await db.meetingRoom.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
  }

  static async createRoom(
    tenantId: string,
    data: { name: string; location?: string; capacity?: number; amenities?: string }
  ) {
    const db = getTenantDb();
    return await db.meetingRoom.create({
      data: {
        tenantId,
        name: data.name,
        location: data.location || null,
        capacity: data.capacity ?? 10,
        amenities: data.amenities || "Video Conferencing, Display Monitor, Whiteboard",
        isActive: true,
      },
    });
  }

  /**
   * 3. MEETING TYPES
   */
  static async listTypes(tenantId: string) {
    const db = getTenantDb();
    return await db.meetingTypeMaster.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
  }

  static async createType(
    tenantId: string,
    data: { name: string; color?: string; description?: string }
  ) {
    const db = getTenantDb();
    return await db.meetingTypeMaster.create({
      data: {
        tenantId,
        name: data.name,
        color: data.color || "#6366f1",
        description: data.description || null,
        isActive: true,
      },
    });
  }

  /**
   * 4. MEETINGS & CONFLICT DETECTION
   */
  static async listMeetings(
    tenantId: string,
    filters?: { startDate?: string; endDate?: string; roomId?: string; typeId?: string; status?: string }
  ) {
    const db = getTenantDb();
    const where: any = { tenantId };

    if (filters?.roomId) where.roomId = filters.roomId;
    if (filters?.typeId) where.typeId = filters.typeId;
    if (filters?.status) where.status = filters.status;
    if (filters?.startDate || filters?.endDate) {
      where.startTime = {};
      if (filters?.startDate) where.startTime.gte = new Date(filters.startDate);
      if (filters?.endDate) where.startTime.lte = new Date(filters.endDate);
    }

    return await db.meeting.findMany({
      where,
      include: {
        room: true,
        type: true,
        organizer: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true, email: true },
        },
        attendees: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, email: true } },
          },
        },
        actionItems: true,
      },
      orderBy: { startTime: "asc" },
    });
  }

  static async createMeeting(
    tenantId: string,
    organizerId: string,
    data: {
      title: string;
      typeId?: string;
      roomId?: string;
      startTime: string | Date;
      endTime: string | Date;
      location?: string;
      meetingUrl?: string;
      agenda?: string;
      attendeeIds?: string[];
    }
  ) {
    const db = getTenantDb();
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    if (end <= start) {
      throw new Error("Meeting end time must be after start time.");
    }

    // 1. Room conflict check
    if (data.roomId) {
      const roomConflict = await db.meeting.findFirst({
        where: {
          tenantId,
          roomId: data.roomId,
          status: { not: "cancelled" },
          startTime: { lt: end },
          endTime: { gt: start },
        },
        include: { room: true },
      });

      if (roomConflict) {
        throw new Error(
          `Room conflict: '${roomConflict.room?.name || "Selected Room"}' is already booked between ${new Date(roomConflict.startTime).toLocaleTimeString()} and ${new Date(roomConflict.endTime).toLocaleTimeString()} for meeting '${roomConflict.title}'.`
        );
      }
    }

    // 2. Organizer conflict check
    const organizerConflict = await db.meeting.findFirst({
      where: {
        tenantId,
        organizerId,
        status: { not: "cancelled" },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    if (organizerConflict) {
      throw new Error(
        `Schedule conflict: Organizer is already scheduled for meeting '${organizerConflict.title}' at this time.`
      );
    }

    const meeting = await db.meeting.create({
      data: {
        tenantId,
        title: data.title,
        typeId: data.typeId || null,
        roomId: data.roomId || null,
        organizerId,
        startTime: start,
        endTime: end,
        location: data.location || null,
        meetingUrl: data.meetingUrl || null,
        agenda: data.agenda || null,
        status: "scheduled",
      },
    });

    // Add attendees
    if (data.attendeeIds && data.attendeeIds.length > 0) {
      for (const empId of data.attendeeIds) {
        if (empId !== organizerId) {
          await db.meetingAttendee.create({
            data: {
              meetingId: meeting.id,
              employeeId: empId,
              rsvpStatus: "pending",
            },
          });
        }
      }
    }

    await AuditService.record({
      tenantId,
      actorId: organizerId,
      action: "meeting.created",
      entityType: "Meeting",
      entityId: meeting.id,
      newValues: { title: meeting.title, startTime: meeting.startTime },
    });

    await OutboxService.publish({
      tenantId,
      eventType: "meeting.created",
      entityType: "Meeting",
      entityId: meeting.id,
      payload: { title: meeting.title, startTime: meeting.startTime, attendeeCount: data.attendeeIds?.length || 0 },
    });

    return meeting;
  }

  static async updateMeetingStatus(tenantId: string, meetingId: string, status: string) {
    const db = getTenantDb();
    return await db.meeting.update({
      where: { id: meetingId },
      data: { status },
    });
  }

  static async respondRsvp(
    tenantId: string,
    meetingId: string,
    employeeId: string,
    rsvpStatus: string,
    notes?: string
  ) {
    const db = getTenantDb();
    return await db.meetingAttendee.upsert({
      where: {
        meetingId_employeeId: {
          meetingId,
          employeeId,
        },
      },
      create: {
        meetingId,
        employeeId,
        rsvpStatus,
        respondedAt: new Date(),
        notes,
      },
      update: {
        rsvpStatus,
        respondedAt: new Date(),
        notes,
      },
    });
  }

  /**
   * 5. MEETING ACTION ITEMS
   */
  static async listActionItems(tenantId: string, meetingId?: string, status?: string) {
    const db = getTenantDb();
    const where: any = { tenantId };
    if (meetingId) where.meetingId = meetingId;
    if (status) where.status = status;

    return await db.meetingActionItem.findMany({
      where,
      include: {
        meeting: { select: { id: true, title: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, email: true } },
      },
      orderBy: { dueDate: "asc" },
    });
  }

  static async createActionItem(
    tenantId: string,
    creatorId: string,
    data: {
      meetingId?: string;
      title: string;
      description?: string;
      assigneeId: string;
      dueDate?: string | Date;
      priority?: string;
    }
  ) {
    const db = getTenantDb();
    return await db.meetingActionItem.create({
      data: {
        tenantId,
        meetingId: data.meetingId || null,
        title: data.title,
        description: data.description || null,
        assigneeId: data.assigneeId,
        creatorId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        priority: data.priority || "medium",
        status: "open",
      },
    });
  }

  static async updateActionItemStatus(tenantId: string, itemId: string, status: string) {
    const db = getTenantDb();
    return await db.meetingActionItem.update({
      where: { id: itemId },
      data: {
        status,
        completedAt: status === "completed" ? new Date() : null,
      },
    });
  }

  static async getEmployeeMeetings(tenantId: string, employeeId: string) {
    const db = getTenantDb();
    return await db.meeting.findMany({
      where: {
        tenantId,
        OR: [
          { organizerId: employeeId },
          { attendees: { some: { employeeId } } },
        ],
      },
      include: {
        room: true,
        type: true,
        organizer: { select: { id: true, firstName: true, lastName: true } },
        attendees: {
          where: { employeeId },
          select: { rsvpStatus: true, respondedAt: true },
        },
      },
      orderBy: { startTime: "asc" },
    });
  }

  static async getEmployeeActionItems(tenantId: string, employeeId: string) {
    const db = getTenantDb();
    return await db.meetingActionItem.findMany({
      where: { tenantId, assigneeId: employeeId },
      include: {
        meeting: { select: { id: true, title: true } },
      },
      orderBy: { dueDate: "asc" },
    });
  }
}

export const meetingService = MeetingService;
