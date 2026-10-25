import { getTenantDb } from "../context/tenant-context";

export interface NormalizedCalendarEvent {
  id: string;
  title: string;
  description?: string;
  category: "meeting" | "training" | "leave" | "holiday" | "event" | "birthday" | "anniversary" | "interview" | "onboarding" | string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  allDay: boolean;
  location?: string;
  meetingLink?: string;
  sourceDomain: "meetings" | "training" | "leave" | "organization" | "calendar" | "recruitment";
  sourceId: string;
  linkTo: string;
  status?: string;
  badgeColor?: string;
  avatarUrl?: string | null;
  employeeName?: string;
  employeeInitials?: string;
  isRecurringInstance?: boolean;
  originalStartTime?: string;
  recurringSeriesId?: string | null;
  recurrenceRule?: string | null;
  roomId?: string | null;
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

    // 5. EMPLOYEE BIRTHDAYS PROJECTION
    if (!category || category === "all" || category === "birthday" || category === "Birthday") {
      try {
        const employees = await db.employee.findMany({
          where: {
            tenantId,
            status: "active",
            dateOfBirth: { not: null },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            dateOfBirth: true,
            position: true,
            department: {
              select: { name: true },
            },
            user: {
              select: {
                id: true,
                profile: {
                  select: {
                    avatarUrl: true,
                  },
                },
              },
            },
          },
          take: 300,
        });

        // Also fetch profile avatars for employees by email if user relation is not directly linked
        const emailsNeedingAvatar = employees
          .filter((e) => !e.user?.profile?.avatarUrl && e.email)
          .map((e) => e.email.toLowerCase());
        const emailAvatarMap: Record<string, string> = {};
        if (emailsNeedingAvatar.length > 0) {
          const profiles = await db.profile.findMany({
            where: {
              tenantId,
              email: { in: emailsNeedingAvatar },
              avatarUrl: { not: null },
            },
            select: { email: true, avatarUrl: true },
          });
          for (const p of profiles) {
            if (p.email && p.avatarUrl) {
              emailAvatarMap[p.email.toLowerCase()] = p.avatarUrl;
            }
          }
        }

        const startYear = startFilter.getFullYear();
        const endYear = endFilter.getFullYear();

        for (const emp of employees) {
          if (!emp.dateOfBirth) continue;
          const dob = new Date(emp.dateOfBirth);
          const dobMonth = dob.getUTCMonth(); // 0-11
          const dobDate = dob.getUTCDate();   // 1-31

          const avatarUrl = emp.user?.profile?.avatarUrl || (emp.email ? emailAvatarMap[emp.email.toLowerCase()] : null) || null;
          const initials = ((emp.firstName?.[0] || "") + (emp.lastName?.[0] || "")).toUpperCase() || "BD";

          // Generate birthday occurrences for each year in the requested range
          for (let yr = startYear; yr <= endYear; yr++) {
            let occMonth = dobMonth;
            let occDay = dobDate;

            // Leap-year policy: if born on Feb 29 and yr is not a leap year, celebrate on Feb 28
            if (dobMonth === 1 && dobDate === 29) {
              const isLeap = (yr % 4 === 0 && yr % 100 !== 0) || (yr % 400 === 0);
              occDay = isLeap ? 29 : 28;
            }

            const yyyy = String(yr);
            const mm = String(occMonth + 1).padStart(2, "0");
            const dd = String(occDay).padStart(2, "0");
            const dateStr = `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
            const occDate = new Date(dateStr);

            if (occDate >= startFilter && occDate <= endFilter) {
              const fullName = `${emp.firstName} ${emp.lastName}`.trim();
              const deptInfo = emp.department?.name ? ` (${emp.department.name})` : (emp.position ? ` (${emp.position})` : "");
              events.push({
                id: `birthday-${emp.id}-${yr}`,
                title: `Birthday: ${fullName}${deptInfo}`,
                description: `Annual birthday celebration for ${fullName}.${emp.department?.name ? ` Department: ${emp.department.name}.` : ""}`,
                category: "birthday",
                startDate: dateStr,
                endDate: dateStr,
                allDay: true,
                sourceDomain: "organization",
                sourceId: emp.id,
                linkTo: isHR ? `/hr/employees` : `/me/organization`,
                status: "active",
                badgeColor: "bg-rose-500/15 text-rose-700 border-rose-500/30",
                avatarUrl,
                employeeName: fullName,
                employeeInitials: initials,
              });
            }
          }
        }
      } catch (err) {
        console.warn("CalendarService: Failed to project employee birthdays:", err);
      }
    }

    // 6. EMPLOYEE WORK ANNIVERSARIES PROJECTION
    if (!category || category === "all" || category === "anniversary" || category === "Anniversary") {
      try {
        const employees = await db.employee.findMany({
          where: {
            tenantId,
            status: "active",
            joinedAt: { not: null },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            joinedAt: true,
            position: true,
            department: {
              select: { name: true },
            },
            user: {
              select: {
                id: true,
                profile: {
                  select: {
                    avatarUrl: true,
                  },
                },
              },
            },
          },
          take: 300,
        });

        const startYear = startFilter.getFullYear();
        const endYear = endFilter.getFullYear();

        for (const emp of employees) {
          if (!emp.joinedAt) continue;
          const joined = new Date(emp.joinedAt);
          const joinYear = joined.getFullYear();
          const joinMonth = joined.getUTCMonth();
          const joinDate = joined.getUTCDate();

          const avatarUrl = emp.user?.profile?.avatarUrl || null;
          const initials = ((emp.firstName?.[0] || "") + (emp.lastName?.[0] || "")).toUpperCase() || "WA";

          for (let yr = Math.max(startYear, joinYear + 1); yr <= endYear; yr++) {
            const yearsCount = yr - joinYear;
            if (yearsCount <= 0) continue;

            let occDay = joinDate;
            // Leap-year rule: if joined on Feb 29 and yr is not a leap year, celebrate on Feb 28
            if (joinMonth === 1 && joinDate === 29) {
              const isLeap = (yr % 4 === 0 && yr % 100 !== 0) || (yr % 400 === 0);
              occDay = isLeap ? 29 : 28;
            }

            const yyyy = String(yr);
            const mm = String(joinMonth + 1).padStart(2, "0");
            const dd = String(occDay).padStart(2, "0");
            const dateStr = `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
            const occDate = new Date(dateStr);

            if (occDate >= startFilter && occDate <= endFilter) {
              const fullName = `${emp.firstName} ${emp.lastName}`.trim();
              const suffix = ["th", "st", "nd", "rd"][(yearsCount % 100 - 20) % 10] || ["th", "st", "nd", "rd"][yearsCount % 100] || "th";
              const milestoneLabel = isHR || emp.id === employeeId ? `${yearsCount}${suffix} Work Anniversary (Joined ${joinYear})` : `${yearsCount}${suffix} Work Anniversary`;

              events.push({
                id: `anniversary-${emp.id}-${yr}`,
                title: `Work Anniversary: ${fullName} (${yearsCount}${suffix})`,
                description: `${fullName} is celebrating their ${milestoneLabel}.${emp.department?.name ? ` Department: ${emp.department.name}.` : ""}`,
                category: "anniversary",
                startDate: dateStr,
                endDate: dateStr,
                allDay: true,
                sourceDomain: "organization",
                sourceId: emp.id,
                linkTo: isHR ? `/hr/employees` : `/me/organization`,
                status: "active",
                badgeColor: "bg-teal-500/15 text-teal-700 border-teal-500/30",
                avatarUrl,
                employeeName: fullName,
                employeeInitials: initials,
              });
            }
          }
        }
      } catch (err) {
        console.warn("CalendarService: Failed to project employee work anniversaries:", err);
      }
    }

    // 7. CANDIDATE INTERVIEWS PROJECTION
    if (!category || category === "all" || category === "interview" || category === "Interview") {
      try {
        const interviewWhere: any = {
          tenantId,
          status: { notIn: ["cancelled", "deleted"] },
          scheduledAt: { gte: startFilter, lte: endFilter },
        };

        if (!isHR) {
          if (employeeId) {
            interviewWhere.interviewerId = employeeId;
          } else {
            interviewWhere.id = "__none__";
          }
        }

        const interviews = await db.jobCandidateInterview.findMany({
          where: interviewWhere,
          include: {
            candidate: {
              select: {
                id: true,
                fullName: true,
                email: true,
                jobPosting: { select: { title: true } },
              },
            },
            interviewer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          take: 100,
        });

        for (const intv of interviews) {
          const candName = intv.candidate?.fullName || "Candidate";
          const jobTitle = intv.candidate?.jobPosting?.title ? ` - ${intv.candidate.jobPosting.title}` : "";
          const interviewerName = intv.interviewer ? `${intv.interviewer.firstName} ${intv.interviewer.lastName}`.trim() : "Unassigned";
          const startTime = new Date(intv.scheduledAt);
          const endTime = new Date(startTime.getTime() + (intv.durationMinutes || 45) * 60000);

          events.push({
            id: `interview-${intv.id}`,
            title: `Interview: ${candName} (${intv.roundName || intv.interviewType})${jobTitle}`,
            description: `Candidate: ${candName}\nStage: ${intv.roundName || intv.interviewType} (Round ${intv.roundNumber})\nInterviewer: ${interviewerName}\nMode: ${intv.mode}${intv.notes ? `\nNotes: ${intv.notes}` : ""}`,
            category: "interview",
            startDate: startTime.toISOString(),
            endDate: endTime.toISOString(),
            allDay: false,
            location: intv.meetingLink || intv.mode || "Virtual",
            meetingLink: intv.meetingLink || undefined,
            sourceDomain: "recruitment",
            sourceId: intv.id,
            linkTo: isHR ? `/hr/recruitment/interviews` : `/me/interviews`,
            status: intv.status,
            badgeColor: "bg-cyan-500/15 text-cyan-700 border-cyan-500/30",
          });
        }
      } catch (err) {
        console.warn("CalendarService: Failed to project candidate interviews:", err);
      }
    }

    // 8. CANDIDATE ONBOARDING PROJECTION
    if (!category || category === "all" || category === "onboarding" || category === "Onboarding") {
      try {
        const onboardingWhere: any = {
          tenantId,
          status: { notIn: ["dropped", "cancelled"] },
          joiningDate: { gte: startFilter, lte: endFilter },
        };

        if (!isHR) {
          if (employeeId) {
            onboardingWhere.OR = [
              { buddyId: employeeId },
              { hrOwnerId: employeeId },
            ];
          } else {
            onboardingWhere.id = "__none__";
          }
        }

        const onboardings = await db.candidateOnboarding.findMany({
          where: onboardingWhere,
          include: {
            candidate: {
              select: {
                id: true,
                fullName: true,
                email: true,
                jobPosting: { select: { title: true } },
              },
            },
            hrOwner: {
              select: { firstName: true, lastName: true },
            },
            buddy: {
              select: { firstName: true, lastName: true },
            },
          },
          take: 100,
        });

        for (const ob of onboardings) {
          const candName = ob.candidate?.fullName || "Candidate";
          const jobTitle = ob.candidate?.jobPosting?.title ? ` - ${ob.candidate.jobPosting.title}` : "";
          const joinDate = new Date(ob.joiningDate);
          const isCompleted = ob.status === "completed";

          events.push({
            id: `onboarding-${ob.id}`,
            title: isCompleted ? `Joined: ${candName}${jobTitle}` : `Onboarding Joining: ${candName}${jobTitle}`,
            description: `Candidate Joining Date: ${joinDate.toISOString().split("T")[0]}\nStatus: ${ob.status}${ob.buddy ? `\nAssigned Buddy: ${ob.buddy.firstName} ${ob.buddy.lastName}` : ""}${ob.hrOwner ? `\nHR Owner: ${ob.hrOwner.firstName} ${ob.hrOwner.lastName}` : ""}`,
            category: "onboarding",
            startDate: joinDate.toISOString(),
            endDate: joinDate.toISOString(),
            allDay: true,
            sourceDomain: "recruitment",
            sourceId: ob.id,
            linkTo: isHR ? `/hr/recruitment/onboarding` : `/me/onboarding`,
            status: ob.status,
            badgeColor: "bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-500/30",
          });
        }
      } catch (err) {
        console.warn("CalendarService: Failed to project candidate onboardings:", err);
      }
    }

    // 9. AD-HOC CALENDAR EVENTS
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
