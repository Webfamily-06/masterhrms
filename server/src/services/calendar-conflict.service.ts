import { prisma } from "../prisma";

export interface ConflictCheckParams {
  tenantId: string;
  callerUserId: string;
  eventId?: string; // Exclude when editing
  excludeEventId?: string; // Alias for exclude when editing
  startDate: Date;
  endDate: Date;
  attendeeIds?: string[];
  roomId?: string;
}

export interface AttendeeConflict {
  attendeeId: string;
  attendeeName: string;
  conflictingEventTitle: string;
  startDate: string;
  endDate: string;
}

export interface RoomConflict {
  roomId: string;
  roomName: string;
  conflictingTitle: string;
  startDate: string;
  endDate: string;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  hasConflicts: boolean;
  attendeeConflicts: AttendeeConflict[];
  roomConflict: RoomConflict | null;
}

export class CalendarConflictService {
  /**
   * Checks for overlapping events for requested attendees and rooms
   */
  public static async checkConflicts(params: ConflictCheckParams): Promise<ConflictCheckResult> {
    const { tenantId, callerUserId, eventId, excludeEventId, startDate, endDate, attendeeIds = [], roomId } = params;
    const effectiveExcludeId = eventId || excludeEventId;

    const attendeeConflicts: AttendeeConflict[] = [];
    let roomConflict: RoomConflict | null = null;

    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    // 1. CHECK ATTENDEE CONFLICTS
    if (attendeeIds.length > 0) {
      // Find all events overlapping for these attendees within tenant
      const overlappingEvents = await prisma.calendarEvent.findMany({
        where: {
          tenantId,
          status: { not: "cancelled" },
          id: effectiveExcludeId ? { not: effectiveExcludeId } : undefined,
          // Overlap condition: ev.startDate < targetEnd && ev.endDate > targetStart
          startDate: { lt: endDate },
          endDate: { gt: startDate },
          OR: [
            { userId: { in: attendeeIds } },
            {
              shares: {
                some: {
                  recipientId: { in: attendeeIds },
                  rsvpStatus: { not: "declined" },
                },
              },
            },
          ],
        },
        include: {
          user: {
            select: { id: true, email: true, profile: { select: { fullName: true } } },
          },
          shares: {
            where: { recipientId: { in: attendeeIds } },
          },
        },
      });

      // Map attendee IDs to names
      const attendeeUsers = await prisma.user.findMany({
        where: { id: { in: attendeeIds }, profile: { tenantId } },
        select: { id: true, email: true, profile: { select: { fullName: true } } },
      });
      const attendeeNameMap = new Map<string, string>();
      for (const u of attendeeUsers) {
        attendeeNameMap.set(u.id, u.profile?.fullName || u.email);
      }

      for (const ev of overlappingEvents) {
        // Find which requested attendees were involved in this conflicting event
        const involvedAttendees = new Set<string>();
        if (attendeeIds.includes(ev.userId)) {
          involvedAttendees.add(ev.userId);
        }
        for (const s of ev.shares) {
          if (attendeeIds.includes(s.recipientId) && s.rsvpStatus !== "declined") {
            involvedAttendees.add(s.recipientId);
          }
        }

        // Privacy rule: Only reveal real event title if caller is owner or event visibility is organization
        const canSeeTitle = ev.userId === callerUserId || ev.visibility === "organization";
        const sanitizedTitle = canSeeTitle ? ev.title : "Busy (Scheduled Commitment)";

        for (const attId of involvedAttendees) {
          attendeeConflicts.push({
            attendeeId: attId,
            attendeeName: attendeeNameMap.get(attId) || "Colleague",
            conflictingEventTitle: sanitizedTitle,
            startDate: ev.startDate.toISOString(),
            endDate: ev.endDate.toISOString(),
          });
        }
      }
    }

    // 2. CHECK ROOM CONFLICTS
    if (roomId) {
      const room = await prisma.meetingRoom.findFirst({
        where: { id: roomId, tenantId, isActive: true },
        select: { id: true, name: true },
      });

      if (room) {
        // A: Check CalendarEvent room bookings
        const conflictingCalendarEvent = await prisma.calendarEvent.findFirst({
          where: {
            tenantId,
            roomId,
            status: { not: "cancelled" },
            id: effectiveExcludeId ? { not: effectiveExcludeId } : undefined,
            startDate: { lt: endDate },
            endDate: { gt: startDate },
          },
          select: { id: true, title: true, startDate: true, endDate: true },
        });

        if (conflictingCalendarEvent) {
          roomConflict = {
            roomId: room.id,
            roomName: room.name,
            conflictingTitle: conflictingCalendarEvent.title,
            startDate: conflictingCalendarEvent.startDate.toISOString(),
            endDate: conflictingCalendarEvent.endDate.toISOString(),
          };
        } else {
          // B: Check Meeting table room bookings
          const conflictingMeeting = await prisma.meeting.findFirst({
            where: {
              tenantId,
              roomId,
              status: { not: "cancelled" },
              startTime: { lt: endDate },
              endTime: { gt: startDate },
            },
            select: { id: true, title: true, startTime: true, endTime: true },
          });

          if (conflictingMeeting) {
            roomConflict = {
              roomId: room.id,
              roomName: room.name,
              conflictingTitle: conflictingMeeting.title,
              startDate: conflictingMeeting.startTime.toISOString(),
              endDate: conflictingMeeting.endTime.toISOString(),
            };
          }
        }
      }
    }

    const hasAnyConflict = attendeeConflicts.length > 0 || roomConflict !== null;
    return {
      hasConflict: hasAnyConflict,
      hasConflicts: hasAnyConflict,
      attendeeConflicts,
      roomConflict,
    };
  }
}
