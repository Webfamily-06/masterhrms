import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { TrainingService } from "../services/training.service.js";
import { getTenantDb } from "../context/tenant-context.js";

export const hrTrainingRouter = Router();

// Overview
hrTrainingRouter.get("/overview", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const overview = await TrainingService.getOverview(tenantId);
    return res.json(overview);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load training overview" });
  }
});

// Meta Dropdowns (Branches, Departments, Types, Trainers, Courses, Employees)
hrTrainingRouter.get("/meta", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const [branches, departments, types, trainers, courses, employees] = await Promise.all([
      db.branch.findMany({ where: { tenantId }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
      db.department.findMany({ where: { tenantId }, select: { id: true, name: true, branchId: true }, orderBy: { name: "asc" } }),
      db.trainingTypeMaster.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
      db.trainer.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
      db.trainingCourse.findMany({ where: { tenantId }, select: { id: true, title: true, category: true }, orderBy: { title: "asc" } }),
      db.employee.findMany({ where: { tenantId }, select: { id: true, firstName: true, lastName: true, employeeCode: true, departmentId: true, branchId: true }, orderBy: { firstName: "asc" } }),
    ]);
    return res.json({ branches, departments, types, trainers, courses, employees });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── TRAINING TYPES ───────────────────────────────────────────
function parseDepartmentIds(raw: any, fallbackId?: string | null): string[] {
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x)).filter(Boolean);
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x)).filter(Boolean);
    } catch {}
  }
  return fallbackId ? [fallbackId] : [];
}

hrTrainingRouter.get("/types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { branchId, departmentId, search } = req.query;

    const [types, allDepts, allBranches] = await Promise.all([
      db.trainingTypeMaster.findMany({
        where: { tenantId },
        include: {
          branch: { select: { id: true, name: true } },
          department: { select: { id: true, name: true, branchId: true } },
          _count: { select: { courses: true, sessions: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.department.findMany({
        where: { tenantId },
        select: { id: true, name: true, branchId: true },
      }),
      db.branch.findMany({
        where: { tenantId },
        select: { id: true, name: true },
      }),
    ]);

    const branchMap = new Map(allBranches.map((b) => [b.id, b.name]));
    const deptMap = new Map(
      allDepts.map((d) => [
        d.id,
        { id: d.id, name: d.name, branchId: d.branchId, branchName: d.branchId ? branchMap.get(d.branchId) || "" : "" },
      ])
    );

    let formatted = types.map((t) => {
      const deptIds = parseDepartmentIds(t.departmentIds, t.departmentId);
      const departments = deptIds
        .map((id) => deptMap.get(id))
        .filter(Boolean)
        .map((d: any) => ({
          id: d.id,
          name: d.name,
          branchId: d.branchId,
          branchName: d.branchName || t.branch?.name || "",
        }));

      return {
        id: t.id,
        name: t.name,
        description: t.description || "",
        isActive: t.isActive,
        branchId: t.branchId,
        branch: t.branch || null,
        departmentId: t.departmentId,
        departmentIds: deptIds,
        departments,
        programsCount: t._count?.courses ?? 0,
        sessionsCount: t._count?.sessions ?? 0,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      };
    });

    if (branchId && branchId !== "all") {
      formatted = formatted.filter((t) => t.branchId === String(branchId));
    }
    if (departmentId && departmentId !== "all") {
      const dId = String(departmentId);
      formatted = formatted.filter((t) => t.departmentIds.includes(dId));
    }
    if (search && String(search).trim()) {
      const q = String(search).trim().toLowerCase();
      formatted = formatted.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          (t.branch?.name || "").toLowerCase().includes(q) ||
          t.departments.some((d) => d.name.toLowerCase().includes(q))
      );
    }

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrTrainingRouter.post("/types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { name, description, branchId, departmentId, departmentIds } = req.body || {};
    if (!name?.trim()) {
      return res.status(400).json({ error: "Training type name is required." });
    }
    const resolvedDeptIds = parseDepartmentIds(departmentIds, departmentId);
    const created = await db.trainingTypeMaster.create({
      data: {
        tenantId,
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        branchId: branchId || null,
        departmentId: resolvedDeptIds[0] || null,
        departmentIds: resolvedDeptIds,
        isActive: true,
      },
      include: {
        branch: { select: { id: true, name: true } },
        _count: { select: { courses: true } },
      },
    });
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.put("/types/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.trainingTypeMaster.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Training type not found." });

    const { name, description, branchId, departmentId, departmentIds } = req.body || {};
    const deptIdsUpdate =
      departmentIds !== undefined
        ? parseDepartmentIds(departmentIds)
        : departmentId !== undefined
        ? parseDepartmentIds(undefined, departmentId)
        : undefined;

    const updated = await db.trainingTypeMaster.update({
      where: { id: existing.id },
      data: {
        ...(name ? { name: String(name).trim() } : {}),
        ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
        ...(branchId !== undefined ? { branchId: branchId || null } : {}),
        ...(deptIdsUpdate !== undefined
          ? { departmentIds: deptIdsUpdate, departmentId: deptIdsUpdate[0] || null }
          : {}),
      },
      include: {
        branch: { select: { id: true, name: true } },
        _count: { select: { courses: true } },
      },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.patch("/types/:id/departments", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.trainingTypeMaster.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Training type not found." });

    const deptIds = parseDepartmentIds(req.body?.departmentIds);
    const updated = await db.trainingTypeMaster.update({
      where: { id: existing.id },
      data: {
        departmentIds: deptIds,
        departmentId: deptIds[0] || null,
      },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.delete("/types/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.trainingTypeMaster.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Training type not found." });
    await db.trainingTypeMaster.delete({ where: { id: existing.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── TRAINERS ─────────────────────────────────────────────────
hrTrainingRouter.get("/trainers", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const trainers = await TrainingService.listTrainers(tenantId, {
      branchId: req.query.branchId as string,
      departmentId: req.query.departmentId as string,
      trainerType: req.query.trainerType as string,
      search: req.query.search as string,
    });
    return res.json(trainers);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrTrainingRouter.get("/trainers/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const trainer = await TrainingService.getTrainer(tenantId, req.params.id);
    if (!trainer) return res.status(404).json({ error: "Trainer not found" });
    return res.json(trainer);
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});

hrTrainingRouter.post("/trainers", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const trainer = await TrainingService.createTrainer(tenantId, actorId, req.body);
    return res.status(201).json(trainer);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.put("/trainers/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const trainer = await TrainingService.updateTrainer(tenantId, actorId, req.params.id, req.body);
    return res.json(trainer);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.delete("/trainers/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    await TrainingService.deleteTrainer(tenantId, req.params.id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── TRAINING SESSIONS / LIST ─────────────────────────────────
function normalizeSessionStatus(raw?: string | null): "scheduled" | "in_progress" | "completed" | "cancelled" {
  const s = String(raw || "scheduled").toLowerCase().trim();
  if (s === "in_progress" || s === "in progress" || s === "ongoing") return "in_progress";
  if (s === "completed") return "completed";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  return "scheduled";
}

function parseJsonStringArray(raw: any): string[] {
  if (Array.isArray(raw)) return raw.map((x) => String(x)).filter(Boolean);
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) return p.map((x) => String(x)).filter(Boolean);
    } catch {}
  }
  return [];
}

async function syncTrainingSessionToCalendar(
  tenantId: string,
  actorUserId: string,
  session: any,
  programTitle: string,
  trainerEmployeeIds: string[],
  attendeeEmployeeIds: string[]
) {
  try {
    const db = getTenantDb();
    const allEmpIds = Array.from(new Set([...trainerEmployeeIds, ...attendeeEmployeeIds].filter(Boolean)));
    const employees = allEmpIds.length
      ? await db.employee.findMany({
          where: { tenantId, id: { in: allEmpIds } },
          select: { id: true, userId: true },
        })
      : [];
    const participantUserIds = Array.from(
      new Set(employees.map((e) => e.userId).filter((uid): uid is string => Boolean(uid)))
    );

    const ownerUserId = actorUserId || participantUserIds[0];
    if (!ownerUserId) return;

    const eventTitle = session.title
      ? `${session.title} — ${programTitle}`
      : `Training: ${programTitle}`;
    const eventStatus = session.status === "cancelled" ? "cancelled" : "confirmed";
    const startDt = new Date(session.startDate);
    const endDt = new Date(session.endDate || session.startDate);

    let eventId = session.calendarEventId as string | null;
    if (eventId) {
      const existingEv = await db.calendarEvent.findUnique({ where: { id: eventId } });
      if (existingEv) {
        await db.calendarEvent.update({
          where: { id: eventId },
          data: {
            title: eventTitle,
            description: session.notes || session.description || `Training session for ${programTitle}`,
            startDate: startDt,
            endDate: endDt,
            allDay: true,
            category: "training",
            location: session.location || null,
            meetingLink: session.meetingLink || null,
            status: eventStatus,
            visibility: "team",
          },
        });
      } else {
        eventId = null;
      }
    }

    if (!eventId) {
      const createdEv = await db.calendarEvent.create({
        data: {
          tenantId,
          userId: ownerUserId,
          title: eventTitle,
          description: session.notes || session.description || `Training session for ${programTitle}`,
          startDate: startDt,
          endDate: endDt,
          allDay: true,
          category: "training",
          location: session.location || null,
          meetingLink: session.meetingLink || null,
          status: eventStatus,
          visibility: "team",
        },
      });
      eventId = createdEv.id;
      await db.trainingSession.update({
        where: { id: session.id },
        data: { calendarEventId: eventId },
      });
    }

    // Sync CalendarEventShare for all trainers & attending employees so it shows on both Employee & Trainer calendars
    const recipientIds = participantUserIds.filter((uid) => uid !== ownerUserId);
    for (const recipientId of recipientIds) {
      await db.calendarEventShare.upsert({
        where: { eventId_recipientId: { eventId, recipientId } },
        update: { permission: "view" },
        create: {
          eventId,
          recipientId,
          permission: "view",
          rsvpStatus: "accepted",
          sharedBy: ownerUserId,
        },
      });
    }
  } catch (err: any) {
    console.warn("[hr-training] Calendar sync warning:", err?.message || err);
  }
}

hrTrainingRouter.get("/sessions", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { courseId, locationType, status, dateFrom, dateTo, search } = req.query;

    const [sessions, allEmployees] = await Promise.all([
      db.trainingSession.findMany({
        where: {
          tenantId,
          ...(courseId && courseId !== "all" ? { courseId: String(courseId) } : {}),
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              durationHours: true,
              cost: true,
              capacity: true,
              trainingType: { select: { id: true, name: true } },
            },
          },
          attendances: { select: { id: true, employeeId: true, status: true } },
        },
        orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      }),
      db.employee.findMany({
        where: { tenantId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          user: { select: { profile: { select: { avatarUrl: true } } } },
        },
      }),
    ]);

    const empMap = new Map(
      allEmployees.map((e) => [
        e.id,
        {
          id: e.id,
          firstName: e.firstName,
          lastName: e.lastName,
          email: e.email,
          avatarUrl: e.user?.profile?.avatarUrl || null,
        },
      ])
    );

    let formatted = sessions.map((s) => {
      const tIds = parseJsonStringArray(s.trainerIds);
      const trainers = tIds.map((id) => empMap.get(id)).filter(Boolean);
      const startStr = new Date(s.startDate).toISOString().split("T")[0];
      const endStr = new Date(s.endDate).toISOString().split("T")[0];
      return {
        id: s.id,
        courseId: s.courseId,
        course: s.course
          ? {
              id: s.course.id,
              title: s.course.title,
              name: s.course.title,
              durationHours: Number(s.course.durationHours || 0),
              cost: Number(s.course.cost || 0),
              capacity: Number(s.course.capacity || 20),
            }
          : null,
        title: s.title,
        sessionName: s.title,
        startDate: startStr,
        endDate: endStr,
        location: s.location || "",
        locationType: (s.locationType || "physical").toLowerCase() === "virtual" ? "virtual" : "physical",
        meetingLink: s.meetingLink || "",
        notes: s.notes || s.description || "",
        status: normalizeSessionStatus(s.status),
        trainerIds: tIds,
        trainers,
        isRecurring: Boolean(s.isRecurring),
        createdByName: s.createdByName || "Company",
        attendanceCount: s.attendances.length,
        createdAt: s.createdAt,
      };
    });

    if (locationType && locationType !== "all") {
      formatted = formatted.filter((s) => s.locationType === String(locationType).toLowerCase());
    }
    if (status && status !== "all") {
      formatted = formatted.filter((s) => s.status === normalizeSessionStatus(String(status)));
    }
    if (dateFrom) {
      formatted = formatted.filter((s) => s.startDate >= String(dateFrom));
    }
    if (dateTo) {
      formatted = formatted.filter((s) => s.startDate <= String(dateTo));
    }
    if (search && String(search).trim()) {
      const q = String(search).trim().toLowerCase();
      formatted = formatted.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.course?.title || "").toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q)
      );
    }

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrTrainingRouter.get("/sessions/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const session = await db.trainingSession.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            durationHours: true,
            cost: true,
            capacity: true,
          },
        },
        attendances: {
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
          orderBy: { registeredAt: "asc" },
        },
      },
    });
    if (!session) return res.status(404).json({ error: "Session not found" });

    const tIds = parseJsonStringArray(session.trainerIds);
    const trainerEmps = tIds.length
      ? await db.employee.findMany({
          where: { tenantId, id: { in: tIds } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            user: { select: { profile: { select: { avatarUrl: true } } } },
          },
        })
      : [];

    const trainers = trainerEmps.map((e) => ({
      id: e.id,
      firstName: e.firstName,
      lastName: e.lastName,
      email: e.email,
      avatarUrl: e.user?.profile?.avatarUrl || null,
    }));

    return res.json({
      id: session.id,
      courseId: session.courseId,
      course: session.course
        ? {
            id: session.course.id,
            title: session.course.title,
            name: session.course.title,
            durationHours: Number(session.course.durationHours || 0),
            cost: Number(session.course.cost || 0),
            capacity: Number(session.course.capacity || 20),
          }
        : null,
      title: session.title,
      sessionName: session.title,
      startDate: new Date(session.startDate).toISOString().split("T")[0],
      endDate: new Date(session.endDate).toISOString().split("T")[0],
      location: session.location || "",
      locationType: (session.locationType || "physical").toLowerCase() === "virtual" ? "virtual" : "physical",
      meetingLink: session.meetingLink || "",
      notes: session.notes || session.description || "",
      status: normalizeSessionStatus(session.status),
      trainerIds: tIds,
      trainers,
      isRecurring: Boolean(session.isRecurring),
      createdByName: session.createdByName || "Company",
      attendances: session.attendances.map((a) => ({
        id: a.id,
        employeeId: a.employeeId,
        status: String(a.status || "absent").toLowerCase() === "present" || String(a.status || "").toLowerCase() === "attended"
          ? "present"
          : "absent",
        notes: a.feedback || "",
        employee: a.employee
          ? {
              id: a.employee.id,
              firstName: a.employee.firstName,
              lastName: a.employee.lastName,
              email: a.employee.email,
              avatarUrl: a.employee.user?.profile?.avatarUrl || null,
            }
          : null,
      })),
    });
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});

hrTrainingRouter.post("/sessions", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "";
    const db = getTenantDb();
    const {
      courseId,
      sessionName,
      title,
      startDate,
      endDate,
      locationType,
      location,
      meetingLink,
      status,
      notes,
      trainerIds,
      isRecurring,
    } = req.body || {};

    if (!courseId || !startDate || !endDate) {
      return res.status(400).json({ error: "Training Program, Start Date, and End Date are required." });
    }

    const course = await db.trainingCourse.findFirst({
      where: { id: courseId, tenantId },
      select: { id: true, title: true, capacity: true, trainingTypeId: true },
    });
    if (!course) return res.status(404).json({ error: "Training program not found." });

    const resolvedTrainerIds = parseJsonStringArray(trainerIds);
    let trainerNames = "Internal Trainer";
    if (resolvedTrainerIds.length > 0) {
      const tEmps = await db.employee.findMany({
        where: { tenantId, id: { in: resolvedTrainerIds } },
        select: { firstName: true, lastName: true },
      });
      if (tEmps.length > 0) {
        trainerNames = tEmps.map((e) => `${e.firstName} ${e.lastName}`.trim()).join(", ").slice(0, 145);
      }
    }

    const created = await db.trainingSession.create({
      data: {
        tenantId,
        courseId: course.id,
        trainingTypeId: course.trainingTypeId || null,
        sessionCode: `SES-${Date.now().toString(36).toUpperCase()}`,
        title: String(sessionName || title || course.title).trim(),
        trainer: trainerNames,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location: location ? String(location).trim() : null,
        locationType: String(locationType || "physical").toLowerCase(),
        meetingLink: meetingLink ? String(meetingLink).trim() : null,
        notes: notes ? String(notes).trim() : null,
        description: notes ? String(notes).trim() : null,
        trainerIds: resolvedTrainerIds,
        isRecurring: Boolean(isRecurring),
        capacity: course.capacity || 20,
        status: normalizeSessionStatus(status || "scheduled"),
        createdByName: req.user?.email ? req.user.email.split("@")[0] : "Company",
      },
    });

    // Also pull currently enrolled employees for this program so they get the session on their Calendar
    const enrolled = await db.courseEnrollment.findMany({
      where: { tenantId, courseId: course.id },
      select: { employeeId: true },
    });
    await syncTrainingSessionToCalendar(
      tenantId,
      actorId,
      created,
      course.title,
      resolvedTrainerIds,
      enrolled.map((e) => e.employeeId)
    );

    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.put("/sessions/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "";
    const db = getTenantDb();
    const existing = await db.trainingSession.findFirst({
      where: { id: req.params.id, tenantId },
      include: { course: { select: { title: true } }, attendances: { select: { employeeId: true } } },
    });
    if (!existing) return res.status(404).json({ error: "Training session not found." });

    const {
      courseId,
      sessionName,
      title,
      startDate,
      endDate,
      locationType,
      location,
      meetingLink,
      status,
      notes,
      trainerIds,
      isRecurring,
    } = req.body || {};

    const resolvedTrainerIds =
      trainerIds !== undefined ? parseJsonStringArray(trainerIds) : parseJsonStringArray(existing.trainerIds);

    let trainerNames = existing.trainer;
    if (trainerIds !== undefined && resolvedTrainerIds.length > 0) {
      const tEmps = await db.employee.findMany({
        where: { tenantId, id: { in: resolvedTrainerIds } },
        select: { firstName: true, lastName: true },
      });
      if (tEmps.length > 0) {
        trainerNames = tEmps.map((e) => `${e.firstName} ${e.lastName}`.trim()).join(", ").slice(0, 145);
      }
    }

    const updated = await db.trainingSession.update({
      where: { id: existing.id },
      data: {
        ...(courseId ? { courseId } : {}),
        ...(sessionName || title ? { title: String(sessionName || title).trim() } : {}),
        ...(startDate ? { startDate: new Date(startDate) } : {}),
        ...(endDate ? { endDate: new Date(endDate) } : {}),
        ...(locationType ? { locationType: String(locationType).toLowerCase() } : {}),
        ...(location !== undefined ? { location: location ? String(location).trim() : null } : {}),
        ...(meetingLink !== undefined ? { meetingLink: meetingLink ? String(meetingLink).trim() : null } : {}),
        ...(status ? { status: normalizeSessionStatus(status) } : {}),
        ...(notes !== undefined ? { notes: notes ? String(notes).trim() : null, description: notes ? String(notes).trim() : null } : {}),
        ...(trainerIds !== undefined ? { trainerIds: resolvedTrainerIds, trainer: trainerNames } : {}),
        ...(isRecurring !== undefined ? { isRecurring: Boolean(isRecurring) } : {}),
      },
      include: { course: { select: { title: true } } },
    });

    const enrolled = await db.courseEnrollment.findMany({
      where: { tenantId, courseId: updated.courseId },
      select: { employeeId: true },
    });
    const attendeeIds = Array.from(
      new Set([...existing.attendances.map((a) => a.employeeId), ...enrolled.map((e) => e.employeeId)])
    );

    await syncTrainingSessionToCalendar(
      tenantId,
      actorId,
      updated,
      updated.course?.title || "Training Session",
      resolvedTrainerIds,
      attendeeIds
    );

    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.put("/sessions/:id/attendance", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "";
    const db = getTenantDb();
    const session = await db.trainingSession.findFirst({
      where: { id: req.params.id, tenantId },
      include: { course: { select: { title: true } } },
    });
    if (!session) return res.status(404).json({ error: "Training session not found." });

    const records: Array<{ employeeId: string; status: string; notes?: string }> = Array.isArray(req.body?.records)
      ? req.body.records
      : [];

    for (const rec of records) {
      if (!rec.employeeId) continue;
      const normalized = String(rec.status || "absent").toLowerCase() === "present" ? "present" : "absent";
      await db.sessionAttendance.upsert({
        where: {
          tenantId_sessionId_employeeId: {
            tenantId,
            sessionId: session.id,
            employeeId: rec.employeeId,
          },
        },
        update: {
          status: normalized,
          feedback: rec.notes?.trim() || null,
          attendedAt: normalized === "present" ? new Date() : null,
        },
        create: {
          tenantId,
          sessionId: session.id,
          employeeId: rec.employeeId,
          status: normalized,
          feedback: rec.notes?.trim() || null,
          attendedAt: normalized === "present" ? new Date() : null,
        },
      });
    }

    // Re-sync Calendar so newly added employees see this Training Session on their Calendar
    const allAttendances = await db.sessionAttendance.findMany({
      where: { tenantId, sessionId: session.id },
      select: { employeeId: true },
    });
    await syncTrainingSessionToCalendar(
      tenantId,
      actorId,
      session,
      session.course?.title || "Training Session",
      parseJsonStringArray(session.trainerIds),
      allAttendances.map((a) => a.employeeId)
    );

    return res.json({ success: true, count: records.length });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.delete("/sessions/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.trainingSession.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Training session not found." });
    if (existing.calendarEventId) {
      await db.calendarEvent.deleteMany({ where: { id: existing.calendarEventId, tenantId } });
    }
    await db.trainingSession.delete({ where: { id: existing.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── TASKS WITHIN A TRAINING ──────────────────────────────────
hrTrainingRouter.get("/sessions/:id/tasks", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const tasks = await TrainingService.listTasks(tenantId, req.params.id, req.query.search as string);
    return res.json(tasks);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrTrainingRouter.post("/sessions/:id/tasks", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const actorId = req.user?.userId || "system";
    const task = await TrainingService.createTask(tenantId, actorId, req.params.id, req.body);
    return res.status(201).json(task);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.put("/tasks/:taskId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const updated = await TrainingService.updateTask(tenantId, req.params.taskId, req.body);
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.patch("/tasks/:taskId/complete", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const completed = await TrainingService.markTaskComplete(tenantId, req.params.taskId);
    return res.json(completed);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.delete("/tasks/:taskId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    await TrainingService.deleteTask(tenantId, req.params.taskId);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── TASK FEEDBACKS ───────────────────────────────────────────
hrTrainingRouter.get("/tasks/:taskId/feedbacks", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const feedbacks = await TrainingService.listFeedbacks(tenantId, req.params.taskId, req.query.search as string);
    return res.json(feedbacks);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrTrainingRouter.post("/tasks/:taskId/feedbacks", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const feedback = await TrainingService.createFeedback(tenantId, req.params.taskId, {
      ...req.body,
      userId: req.user?.userId,
      userName: req.user?.email || "HR Reviewer",
    });
    return res.status(201).json(feedback);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.delete("/feedbacks/:feedbackId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    await TrainingService.deleteFeedback(tenantId, req.params.feedbackId);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── ATTENDANCE & REGISTRATION ────────────────────────────────
hrTrainingRouter.post("/sessions/:id/register", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const reg = await TrainingService.registerSession(tenantId, req.params.id, req.body.employeeId);
    return res.status(201).json(reg);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.post("/sessions/:id/attendance", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    let attendance = await db.sessionAttendance.findFirst({
      where: { tenantId, sessionId: req.params.id, employeeId: req.body.employeeId },
    });
    if (!attendance) {
      attendance = await db.sessionAttendance.create({
        data: {
          tenantId,
          sessionId: req.params.id,
          employeeId: req.body.employeeId,
          status: req.body.status || "attended",
        },
      });
    }

    const result = await TrainingService.markSessionAttendance(
      tenantId,
      attendance.id,
      req.body.status,
      req.body.feedback,
      req.body.rating
    );
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── PROGRAMS / COURSES ───────────────────────────────────────
function normalizeProgramStatus(raw?: string | null): "draft" | "active" | "completed" | "cancelled" {
  const s = String(raw || "draft").toLowerCase().trim();
  if (s === "active" || s === "published") return "active";
  if (s === "completed") return "completed";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  return "draft";
}

function formatProgramRecord(p: any) {
  const sessions = Array.isArray(p.sessions) ? p.sessions : [];
  const enrollments = Array.isArray(p.enrollments) ? p.enrollments : [];
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(
    (s: any) => String(s.status || "").toLowerCase() === "completed"
  ).length;
  const totalEmployees = enrollments.length;
  const completedTrainings = enrollments.filter(
    (e: any) => String(e.status || "").toLowerCase() === "completed" || Number(e.progress || 0) >= 100
  ).length;

  return {
    id: p.id,
    tenantId: p.tenantId,
    trainingTypeId: p.trainingTypeId || null,
    trainingType: p.trainingType
      ? { id: p.trainingType.id, name: p.trainingType.name }
      : p.category
      ? { id: p.trainingTypeId || "", name: p.category }
      : null,
    name: p.title,
    title: p.title,
    slug: p.slug,
    category: p.trainingType?.name || p.category || "General",
    instructor: p.instructor,
    durationHours: Number(p.durationHours || 0),
    cost: p.cost !== null && p.cost !== undefined ? Number(p.cost) : 0,
    capacity: p.capacity !== null && p.capacity !== undefined ? Number(p.capacity) : 20,
    isMandatory: Boolean(p.isMandatory),
    allowSelfEnrollment: Boolean(p.allowSelfEnrollment),
    passingScore: p.passingScore,
    description: p.description || "",
    prerequisites: p.prerequisites || "",
    materialsUrl: p.materialsUrl || "",
    materialsName: p.materialsName || "",
    bannerUrl: p.bannerUrl || "",
    status: normalizeProgramStatus(p.status),
    totalSessions,
    completedSessions,
    totalEmployees,
    completedTrainings,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

hrTrainingRouter.get("/programs", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { trainingTypeId, status, search } = req.query;

    const programs = await db.trainingCourse.findMany({
      where: {
        tenantId,
        ...(trainingTypeId && trainingTypeId !== "all" ? { trainingTypeId: String(trainingTypeId) } : {}),
      },
      include: {
        trainingType: { select: { id: true, name: true } },
        sessions: { select: { id: true, status: true } },
        enrollments: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    let formatted = programs.map(formatProgramRecord);
    if (status && status !== "all") {
      const target = normalizeProgramStatus(String(status));
      formatted = formatted.filter((p) => p.status === target);
    }
    if (search && String(search).trim()) {
      const q = String(search).trim().toLowerCase();
      formatted = formatted.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }
    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrTrainingRouter.get("/programs/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const program = await db.trainingCourse.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        trainingType: { select: { id: true, name: true } },
        sessions: { orderBy: { startDate: "desc" } },
        enrollments: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!program) return res.status(404).json({ error: "Program not found" });
    return res.json({
      ...formatProgramRecord(program),
      sessions: program.sessions,
      enrollments: program.enrollments,
    });
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});

hrTrainingRouter.post("/programs", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const {
      name,
      title,
      trainingTypeId,
      description,
      durationHours,
      cost,
      capacity,
      status,
      materialsUrl,
      materialsName,
      prerequisites,
      isMandatory,
      allowSelfEnrollment,
    } = req.body || {};

    const programTitle = String(name || title || "").trim();
    if (!programTitle) {
      return res.status(400).json({ error: "Program name is required." });
    }

    let categoryName = "General";
    if (trainingTypeId) {
      const tt = await db.trainingTypeMaster.findFirst({
        where: { id: trainingTypeId, tenantId },
        select: { name: true },
      });
      if (tt) categoryName = tt.name;
    }

    const baseSlug = programTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 140);
    const uniqueSlug = `${baseSlug || "program"}-${Date.now().toString(36)}`;

    const created = await db.trainingCourse.create({
      data: {
        tenantId,
        trainingTypeId: trainingTypeId || null,
        title: programTitle,
        slug: uniqueSlug,
        category: categoryName,
        durationHours: durationHours !== undefined && durationHours !== "" ? Number(durationHours) : 0,
        cost: cost !== undefined && cost !== "" ? Number(cost) : 0,
        capacity: capacity !== undefined && capacity !== "" ? Number(capacity) : 20,
        status: normalizeProgramStatus(status || "draft"),
        description: description ? String(description).trim() : null,
        prerequisites: prerequisites ? String(prerequisites).trim() : null,
        materialsUrl: materialsUrl ? String(materialsUrl).trim() : null,
        materialsName: materialsName ? String(materialsName).trim() : null,
        isMandatory: Boolean(isMandatory),
        allowSelfEnrollment: Boolean(allowSelfEnrollment),
      },
      include: {
        trainingType: { select: { id: true, name: true } },
        sessions: { select: { id: true, status: true } },
        enrollments: { select: { id: true, status: true } },
      },
    });
    return res.status(201).json(formatProgramRecord(created));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.put("/programs/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.trainingCourse.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Training program not found." });

    const {
      name,
      title,
      trainingTypeId,
      description,
      durationHours,
      cost,
      capacity,
      status,
      materialsUrl,
      materialsName,
      prerequisites,
      isMandatory,
      allowSelfEnrollment,
    } = req.body || {};

    let categoryName = existing.category;
    if (trainingTypeId) {
      const tt = await db.trainingTypeMaster.findFirst({
        where: { id: trainingTypeId, tenantId },
        select: { name: true },
      });
      if (tt) categoryName = tt.name;
    }

    const updated = await db.trainingCourse.update({
      where: { id: existing.id },
      data: {
        ...(name || title ? { title: String(name || title).trim() } : {}),
        ...(trainingTypeId !== undefined ? { trainingTypeId: trainingTypeId || null, category: categoryName } : {}),
        ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
        ...(prerequisites !== undefined ? { prerequisites: prerequisites ? String(prerequisites).trim() : null } : {}),
        ...(durationHours !== undefined && durationHours !== "" ? { durationHours: Number(durationHours) } : {}),
        ...(cost !== undefined && cost !== "" ? { cost: Number(cost) } : {}),
        ...(capacity !== undefined && capacity !== "" ? { capacity: Number(capacity) } : {}),
        ...(status ? { status: normalizeProgramStatus(status) } : {}),
        ...(materialsUrl !== undefined ? { materialsUrl: materialsUrl ? String(materialsUrl).trim() : null } : {}),
        ...(materialsName !== undefined ? { materialsName: materialsName ? String(materialsName).trim() : null } : {}),
        ...(isMandatory !== undefined ? { isMandatory: Boolean(isMandatory) } : {}),
        ...(allowSelfEnrollment !== undefined ? { allowSelfEnrollment: Boolean(allowSelfEnrollment) } : {}),
      },
      include: {
        trainingType: { select: { id: true, name: true } },
        sessions: { select: { id: true, status: true } },
        enrollments: { select: { id: true, status: true } },
      },
    });
    return res.json(formatProgramRecord(updated));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.patch("/programs/:id/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.trainingCourse.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Training program not found." });
    const updated = await db.trainingCourse.update({
      where: { id: existing.id },
      data: { status: normalizeProgramStatus(req.body?.status) },
      include: {
        trainingType: { select: { id: true, name: true } },
        sessions: { select: { id: true, status: true } },
        enrollments: { select: { id: true, status: true } },
      },
    });
    return res.json(formatProgramRecord(updated));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.delete("/programs/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.trainingCourse.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Training program not found." });
    await db.trainingCourse.delete({ where: { id: existing.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── EMPLOYEE TRAININGS (ENROLLMENTS) ─────────────────────────
function normalizeEnrollmentStatus(raw?: string | null): "assigned" | "in_progress" | "completed" | "failed" {
  const s = String(raw || "assigned").toLowerCase().trim();
  if (s === "completed") return "completed";
  if (s === "in_progress" || s === "in progress") return "in_progress";
  if (s === "failed") return "failed";
  return "assigned";
}

function formatEnrollmentRecord(e: any) {
  const empAvatar = e.employee?.user?.profile?.avatarUrl || null;
  const status = normalizeEnrollmentStatus(e.status);
  const scoreVal = e.score !== null && e.score !== undefined ? Number(e.score) : null;
  const passedVal =
    e.isPassed !== null && e.isPassed !== undefined
      ? Boolean(e.isPassed)
      : status === "completed"
      ? true
      : status === "failed"
      ? false
      : null;

  return {
    id: e.id,
    tenantId: e.tenantId,
    courseId: e.courseId,
    employeeId: e.employeeId,
    status,
    progressPercent: e.progressPercent ?? 0,
    assignedDate: e.assignedDate
      ? new Date(e.assignedDate).toISOString().split("T")[0]
      : new Date(e.createdAt).toISOString().split("T")[0],
    completionDate: e.completionDate
      ? new Date(e.completionDate).toISOString().split("T")[0]
      : e.certifiedAt
      ? new Date(e.certifiedAt).toISOString().split("T")[0]
      : "",
    assignedByName: e.assignedByName || "HR Admin",
    score: scoreVal,
    isPassed: passedVal,
    result: passedVal === true ? "Passed" : passedVal === false ? "Failed" : null,
    feedback: e.feedback || "",
    notes: e.notes || "",
    certificationUrl: e.certificationUrl || "",
    certificationName: e.certificationName || "",
    assessments: Array.isArray(e.assessments) ? e.assessments : [],
    employee: e.employee
      ? {
          id: e.employee.id,
          firstName: e.employee.firstName,
          lastName: e.employee.lastName,
          email: e.employee.email,
          phone: e.employee.phone || "",
          employeeCode: e.employee.employeeCode || "",
          position: e.employee.position || "",
          departmentName: e.employee.department?.name || "",
          designationName: e.employee.designation?.name || e.employee.position || "",
          avatarUrl: empAvatar,
        }
      : null,
    course: e.course
      ? {
          id: e.course.id,
          title: e.course.title,
          name: e.course.title,
          category: e.course.trainingType?.name || e.course.category || "General",
          trainingTypeName: e.course.trainingType?.name || e.course.category || "General",
          durationHours: Number(e.course.durationHours || 0),
          cost: Number(e.course.cost || 0),
          capacity: Number(e.course.capacity || 20),
          status: e.course.status || "active",
          description: e.course.description || "",
          prerequisites: e.course.prerequisites || "",
          isMandatory: Boolean(e.course.isMandatory),
          allowSelfEnrollment: Boolean(e.course.allowSelfEnrollment),
          materialsUrl: e.course.materialsUrl || "",
          materialsName: e.course.materialsName || "",
          passingScore: e.course.passingScore ?? 70,
        }
      : null,
    createdAt: e.createdAt,
  };
}

const ENROLLMENT_INCLUDE = {
  employee: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      employeeCode: true,
      position: true,
      department: { select: { name: true } },
      designation: { select: { name: true } },
      user: { select: { profile: { select: { avatarUrl: true } } } },
    },
  },
  course: {
    include: {
      trainingType: { select: { id: true, name: true } },
    },
  },
};

hrTrainingRouter.get("/employee-trainings/dashboard", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const enrollments = await db.courseEnrollment.findMany({
      where: { tenantId },
      include: ENROLLMENT_INCLUDE,
      orderBy: { createdAt: "desc" },
    });

    const formatted = enrollments.map(formatEnrollmentRecord);
    const totalTrainings = formatted.length;
    const completedList = formatted.filter((e) => e.status === "completed");
    const inProgressList = formatted.filter((e) => e.status === "in_progress");
    const assignedList = formatted.filter((e) => e.status === "assigned");
    const failedList = formatted.filter((e) => e.status === "failed");
    const completionRate = totalTrainings > 0 ? Math.round((completedList.length / totalTrainings) * 100) : 0;

    // Group by program
    const byProgram = new Map<string, { courseId: string; name: string; total: number; completed: number }>();
    for (const item of formatted) {
      const cid = item.courseId;
      const entry = byProgram.get(cid) || {
        courseId: cid,
        name: item.course?.title || "Program",
        total: 0,
        completed: 0,
      };
      entry.total += 1;
      if (item.status === "completed") entry.completed += 1;
      byProgram.set(cid, entry);
    }

    const programCompletionRates = Array.from(byProgram.values()).map((p) => ({
      ...p,
      rate: p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0,
    }));

    const recentCompletions = completedList
      .sort((a, b) => (b.completionDate || "").localeCompare(a.completionDate || ""))
      .slice(0, 8);

    const upcomingTrainings = [...assignedList, ...inProgressList].slice(0, 9);

    return res.json({
      stats: {
        totalTrainings,
        completed: completedList.length,
        inProgress: inProgressList.length,
        assigned: assignedList.length,
        failed: failedList.length,
        completionRate,
      },
      programCompletionRates,
      recentCompletions,
      upcomingTrainings,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrTrainingRouter.get("/employee-trainings", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { employeeId, courseId, status, dateFrom, dateTo } = req.query;

    const enrollments = await db.courseEnrollment.findMany({
      where: {
        tenantId,
        ...(employeeId && employeeId !== "all" ? { employeeId: String(employeeId) } : {}),
        ...(courseId && courseId !== "all" ? { courseId: String(courseId) } : {}),
      },
      include: ENROLLMENT_INCLUDE,
      orderBy: [{ assignedDate: "desc" }, { createdAt: "desc" }],
    });

    let formatted = enrollments.map(formatEnrollmentRecord);
    if (status && status !== "all") {
      formatted = formatted.filter((e) => e.status === normalizeEnrollmentStatus(String(status)));
    }
    if (dateFrom) {
      formatted = formatted.filter((e) => e.assignedDate >= String(dateFrom));
    }
    if (dateTo) {
      formatted = formatted.filter((e) => e.assignedDate <= String(dateTo));
    }

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrTrainingRouter.get("/employee-trainings/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const enrollment = await db.courseEnrollment.findFirst({
      where: { id: req.params.id, tenantId },
      include: ENROLLMENT_INCLUDE,
    });
    if (!enrollment) return res.status(404).json({ error: "Training assignment not found." });
    return res.json(formatEnrollmentRecord(enrollment));
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});

hrTrainingRouter.post("/employee-trainings", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const {
      employeeId,
      courseId,
      status,
      assignedDate,
      completionDate,
      certificationUrl,
      certificationName,
      score,
      isPassed,
      feedback,
      notes,
    } = req.body || {};

    if (!employeeId || !courseId) {
      return res.status(400).json({ error: "Employee and Training Program are required." });
    }

    const existing = await db.courseEnrollment.findFirst({
      where: { tenantId, courseId, employeeId },
    });
    if (existing) {
      return res.status(409).json({ error: "This employee is already assigned to the selected training program." });
    }

    const normalizedStatus = normalizeEnrollmentStatus(status || "assigned");
    const created = await db.courseEnrollment.create({
      data: {
        tenantId,
        courseId,
        employeeId,
        status: normalizedStatus,
        progressPercent: normalizedStatus === "completed" ? 100 : normalizedStatus === "in_progress" ? 50 : 0,
        assignedDate: assignedDate ? new Date(assignedDate) : new Date(),
        completionDate: completionDate ? new Date(completionDate) : null,
        assignedByName: req.user?.email ? req.user.email.split("@")[0] : "HR Admin",
        score: score !== undefined && score !== "" && score !== null ? Number(score) : null,
        isPassed: isPassed !== undefined && isPassed !== null ? Boolean(isPassed) : null,
        feedback: feedback ? String(feedback).trim() : null,
        notes: notes ? String(notes).trim() : null,
        certificationUrl: certificationUrl ? String(certificationUrl).trim() : null,
        certificationName: certificationName ? String(certificationName).trim() : null,
      },
      include: ENROLLMENT_INCLUDE,
    });
    return res.status(201).json(formatEnrollmentRecord(created));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.post("/employee-trainings/bulk", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const { employeeIds, courseId, assignedDate, notes } = req.body || {};
    const ids = parseJsonStringArray(employeeIds);
    if (ids.length === 0 || !courseId) {
      return res.status(400).json({ error: "At least one employee and a training program are required." });
    }

    let createdCount = 0;
    let skippedCount = 0;
    const assignedBy = req.user?.email ? req.user.email.split("@")[0] : "HR Admin";
    const assignedDt = assignedDate ? new Date(assignedDate) : new Date();

    for (const empId of ids) {
      const exists = await db.courseEnrollment.findFirst({
        where: { tenantId, courseId, employeeId: empId },
        select: { id: true },
      });
      if (exists) {
        skippedCount += 1;
        continue;
      }
      await db.courseEnrollment.create({
        data: {
          tenantId,
          courseId,
          employeeId: empId,
          status: "assigned",
          progressPercent: 0,
          assignedDate: assignedDt,
          assignedByName: assignedBy,
          notes: notes ? String(notes).trim() : null,
        },
      });
      createdCount += 1;
    }

    return res.status(201).json({ success: true, createdCount, skippedCount });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.put("/employee-trainings/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.courseEnrollment.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Training assignment not found." });

    const {
      employeeId,
      courseId,
      status,
      assignedDate,
      completionDate,
      certificationUrl,
      certificationName,
      score,
      isPassed,
      feedback,
      notes,
    } = req.body || {};

    const nextStatus = status ? normalizeEnrollmentStatus(status) : existing.status;
    const updated = await db.courseEnrollment.update({
      where: { id: existing.id },
      data: {
        ...(employeeId ? { employeeId } : {}),
        ...(courseId ? { courseId } : {}),
        status: nextStatus,
        progressPercent: nextStatus === "completed" ? 100 : nextStatus === "in_progress" ? 50 : existing.progressPercent,
        ...(assignedDate ? { assignedDate: new Date(assignedDate) } : {}),
        ...(completionDate !== undefined ? { completionDate: completionDate ? new Date(completionDate) : null } : {}),
        ...(score !== undefined ? { score: score !== "" && score !== null ? Number(score) : null } : {}),
        ...(isPassed !== undefined ? { isPassed: isPassed === null ? null : Boolean(isPassed) } : {}),
        ...(feedback !== undefined ? { feedback: feedback ? String(feedback).trim() : null } : {}),
        ...(notes !== undefined ? { notes: notes ? String(notes).trim() : null } : {}),
        ...(certificationUrl !== undefined ? { certificationUrl: certificationUrl ? String(certificationUrl).trim() : null } : {}),
        ...(certificationName !== undefined ? { certificationName: certificationName ? String(certificationName).trim() : null } : {}),
      },
      include: ENROLLMENT_INCLUDE,
    });
    return res.json(formatEnrollmentRecord(updated));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.post("/employee-trainings/:id/assessments", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.courseEnrollment.findFirst({
      where: { id: req.params.id, tenantId },
      include: { course: { select: { passingScore: true } } },
    });
    if (!existing) return res.status(404).json({ error: "Training assignment not found." });

    const { assessmentName, score, feedback, assessmentDate, updateTrainingStatus } = req.body || {};
    const numScore = Number(score);
    if (Number.isNaN(numScore)) {
      return res.status(400).json({ error: "Valid score (%) is required." });
    }
    const passingScore = existing.course?.passingScore ?? 70;
    const passed = numScore >= passingScore;

    const currentList = Array.isArray(existing.assessments) ? (existing.assessments as any[]) : [];
    const newEntry = {
      id: `asm-${Date.now().toString(36)}`,
      assessmentName: String(assessmentName || "Final Assessment").trim(),
      score: numScore,
      passed,
      result: passed ? "Passed" : "Failed",
      feedback: feedback ? String(feedback).trim() : "",
      assessmentDate: assessmentDate || new Date().toISOString().split("T")[0],
    };
    const nextList = [newEntry, ...currentList];

    const updated = await db.courseEnrollment.update({
      where: { id: existing.id },
      data: {
        assessments: nextList,
        ...(updateTrainingStatus
          ? {
              score: numScore,
              isPassed: passed,
              status: passed ? "completed" : "failed",
              progressPercent: passed ? 100 : existing.progressPercent,
              completionDate: assessmentDate ? new Date(assessmentDate) : new Date(),
              feedback: feedback ? String(feedback).trim() : existing.feedback,
            }
          : {}),
      },
      include: ENROLLMENT_INCLUDE,
    });
    return res.status(201).json(formatEnrollmentRecord(updated));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.patch("/employee-trainings/:id/progress", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const updated = await TrainingService.updateProgress(
      tenantId,
      req.params.id,
      req.body.progress,
      req.body.score
    );
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrTrainingRouter.delete("/employee-trainings/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();
    const existing = await db.courseEnrollment.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Training assignment not found." });
    await db.courseEnrollment.delete({ where: { id: existing.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});
