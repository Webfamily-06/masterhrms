import { getTenantDb } from "../context/tenant-context";

export interface NormalizedCalendarEvent {
  id: string;
  title: string;
  description?: string;
  category: "meeting" | "training" | "leave" | "holiday" | "event";
  startDate: string; // ISO string
  endDate: string; // ISO string
  allDay: boolean;
  location?: string;
  sourceDomain: "meetings" | "training" | "leave" | "organization" | "calendar";
  sourceId: string;
  linkTo: string;
  status?: string;
  badgeColor?: string;
}

export interface GetCalendarEventsOptions {
  userId?: string;
  employeeId?: string;
  startDate?: Date;
  endDate?: Date;
  category?: string;
  isHR?: boolean;
}

export class CalendarService {
  /**
   * Projects a composite view of events across authoritative domain tables:
   * 1. Meetings (Phase P7)
   * 2. Training Sessions (Phase P7)
   * 3. Approved Leave Requests (Phase P3)
   * 4. Official Holidays (Phase P2)
   * 5. Ad-Hoc Calendar Events
   */
  public static async getEvents(
    tenantId: string,
    options: GetCalendarEventsOptions = {}
  ): Promise<NormalizedCalendarEvent[]> {
    const db = getTenantDb();
    const { userId, employeeId, startDate, endDate, category, isHR = false } = options;

    const startFilter = startDate || new Date(new Date().getFullYear(), 0, 1);
    const endFilter = endDate || new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);

    const events: NormalizedCalendarEvent[] = [];

    // 1. MEETINGS PROJECTION
    if (!category || category === "all" || category === "meeting") {
      try {
        const meetingWhere: any = {
          tenantId,
          status: { not: "cancelled" },
          startTime: { lte: endFilter },
          endTime: { gte: startFilter },
        };

        // If not HR, employee must be organizer or invited attendee
        if (!isHR) {
          if (employeeId) {
            meetingWhere.OR = [
              { organizerId: employeeId },
              { attendees: { some: { employeeId } } },
            ];
          } else {
            meetingWhere.id = "__none__";
          }
        }

        const meetings = await db.meeting.findMany({
          where: meetingWhere,
          include: {
            room: true,
          },
          take: 100,
        });

        for (const m of meetings) {
          events.push({
            id: `meeting-${m.id}`,
            title: m.title,
            description: m.agenda || undefined,
            category: "meeting",
            startDate: m.startTime.toISOString(),
            endDate: m.endTime.toISOString(),
            allDay: false,
            location: m.room?.name || (m.meetingUrl ? "Virtual" : m.location || undefined),
            sourceDomain: "meetings",
            sourceId: m.id,
            linkTo: isHR ? `/hr/meetings` : `/me/meetings`,
            status: m.status,
            badgeColor: "bg-blue-500/15 text-blue-700 border-blue-500/30",
          });
        }
      } catch (err) {
        console.warn("CalendarService: Failed to project meetings:", err);
      }
    }

    // 2. TRAINING SESSIONS PROJECTION
    if (!category || category === "all" || category === "training") {
      try {
        const sessionWhere: any = {
          tenantId,
          status: { not: "cancelled" },
          startDate: { lte: endFilter },
          endDate: { gte: startFilter },
        };

        const sessions = await db.trainingSession.findMany({
          where: sessionWhere,
          include: {
            course: true,
            attendances: employeeId ? { where: { employeeId } } : false,
          },
          take: 100,
        });

        for (const s of sessions) {
          // If not HR, show if session is scheduled/open or employee is registered
          if (!isHR && employeeId && s.attendances?.length === 0 && s.status !== "scheduled") {
            continue;
          }

          events.push({
            id: `training-${s.id}`,
            title: `Training: ${s.title || s.course?.title || "Cohort"}`,
            description: s.trainer ? `Trainer: ${s.trainer}` : undefined,
            category: "training",
            startDate: s.startDate.toISOString(),
            endDate: s.endDate.toISOString(),
            allDay: false,
            location: s.location || undefined,
            sourceDomain: "training",
            sourceId: s.id,
            linkTo: isHR ? `/hr/training/sessions` : `/me/training/sessions`,
            status: s.status,
            badgeColor: "bg-purple-500/15 text-purple-700 border-purple-500/30",
          });
        }
      } catch (err) {
        console.warn("CalendarService: Failed to project training sessions:", err);
      }
    }

    // 3. APPROVED LEAVES PROJECTION
    if (!category || category === "all" || category === "leave") {
      try {
        const leaveWhere: any = {
          tenantId,
          status: "approved",
          startDate: { lte: endFilter },
          endDate: { gte: startFilter },
        };

        // If not HR, strictly isolate to employee's own leave
        if (!isHR) {
          if (employeeId) {
            leaveWhere.employeeId = employeeId;
          } else {
            leaveWhere.id = "__none__"; // No employeeId, do not show colleague leaves
          }
        }

        const leaves = await db.leaveRequest.findMany({
          where: leaveWhere,
          include: {
            employee: true,
            leaveType: true,
          },
          take: 150,
        });

        for (const l of leaves) {
          const empName = l.employee ? `${l.employee.firstName} ${l.employee.lastName}` : "Employee";
          const title = isHR ? `Leave: ${empName} (${l.leaveType?.name || "Leave"})` : `My Leave: ${l.leaveType?.name || "Leave"}`;

          events.push({
            id: `leave-${l.id}`,
            title,
            description: l.reason || undefined,
            category: "leave",
            startDate: l.startDate.toISOString(),
            endDate: l.endDate.toISOString(),
            allDay: true,
            sourceDomain: "leave",
            sourceId: l.id,
            linkTo: isHR ? `/hr/leave/applications` : `/me/leave/applications`,
            status: l.status,
            badgeColor: "bg-amber-500/15 text-amber-700 border-amber-500/30",
          });
        }
      } catch (err) {
        console.warn("CalendarService: Failed to project leaves:", err);
      }
    }

    // 4. OFFICIAL HOLIDAYS PROJECTION
    if (!category || category === "all" || category === "holiday") {
      try {
        const holidays = await db.holiday.findMany({
          where: {
            tenantId,
            date: { gte: startFilter, lte: endFilter },
          },
          take: 50,
        });

        for (const h of holidays) {
          const hDate = new Date(h.date);
          events.push({
            id: `holiday-${h.id}`,
            title: `Holiday: ${h.name}`,
            description: h.description || undefined,
            category: "holiday",
            startDate: hDate.toISOString(),
            endDate: hDate.toISOString(),
            allDay: true,
            sourceDomain: "organization",
            sourceId: h.id,
            linkTo: isHR ? `/hr/organization/holidays` : `/me/organization/holidays`,
            status: "active",
            badgeColor: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
          });
        }
      } catch (err) {
        console.warn("CalendarService: Failed to project holidays:", err);
      }
    }

    // 5. AD-HOC CALENDAR EVENTS
    if (!category || category === "all" || category === "event") {
      try {
        const eventWhere: any = {
          tenantId,
          startDate: { lte: endFilter },
          endDate: { gte: startFilter },
        };

        if (!isHR && userId) {
          eventWhere.userId = userId;
        }

        const customEvents = await db.calendarEvent.findMany({
          where: eventWhere,
          take: 50,
        });

        for (const ce of customEvents) {
          events.push({
            id: `event-${ce.id}`,
            title: ce.title,
            description: ce.description || undefined,
            category: "event",
            startDate: ce.startDate.toISOString(),
            endDate: ce.endDate.toISOString(),
            allDay: ce.allDay,
            location: ce.location || undefined,
            sourceDomain: "calendar",
            sourceId: ce.id,
            linkTo: isHR ? `/hr/calendar` : `/me/calendar`,
            badgeColor: "bg-indigo-500/15 text-indigo-700 border-indigo-500/30",
          });
        }
      } catch (err) {
        console.warn("CalendarService: Failed to project custom events:", err);
      }
    }

    // Sort by startDate ascending
    return events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }

  /**
   * Creates an ad-hoc calendar event.
   */
  public static async createEvent(
    tenantId: string,
    userId: string,
    data: {
      title: string;
      description?: string;
      startDate: Date;
      endDate: Date;
      allDay?: boolean;
      category?: string;
      location?: string;
    }
  ) {
    const db = getTenantDb();
    return await db.calendarEvent.create({
      data: {
        tenantId,
        userId,
        title: data.title,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        allDay: data.allDay ?? false,
        category: data.category || "general",
        location: data.location,
      },
    });
  }

  /**
   * Deletes an ad-hoc calendar event.
   */
  public static async deleteEvent(tenantId: string, eventId: string, userId: string, isHR: boolean) {
    const db = getTenantDb();
    const where: any = { id: eventId, tenantId };
    if (!isHR) {
      where.userId = userId;
    }
    return await db.calendarEvent.deleteMany({ where });
  }
}
