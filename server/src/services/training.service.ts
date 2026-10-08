import { getTenantDb } from "../context/tenant-context";
import { OutboxService } from "./outbox.service";
import { AuditService } from "./audit.service";

export class TrainingService {
  /**
   * 1. TRAINING TYPES (MASTER)
   */
  static async createType(tenantId: string, name: string, description?: string) {
    const db = getTenantDb();
    return await db.trainingTypeMaster.create({
      data: {
        tenantId,
        name,
        description,
        isActive: true,
      },
    });
  }

  static async listTypes(tenantId: string) {
    const db = getTenantDb();
    return await db.trainingTypeMaster.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
  }

  /**
   * 2. TRAINING PROGRAMS / COURSES
   */
  static async createProgram(
    tenantId: string,
    actorId: string,
    data: {
      title: string;
      category?: string;
      instructor?: string;
      durationHours?: number;
      isMandatory?: boolean;
      passingScore?: number;
      description?: string;
      bannerUrl?: string;
    }
  ) {
    const db = getTenantDb();
    const baseSlug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

    const program = await db.trainingCourse.create({
      data: {
        tenantId,
        title: data.title,
        slug,
        category: data.category || "Compliance & Security",
        instructor: data.instructor || "Internal Academy",
        durationHours: data.durationHours ?? 4.0,
        isMandatory: data.isMandatory ?? false,
        passingScore: data.passingScore ?? 80,
        description: data.description,
        bannerUrl: data.bannerUrl,
        status: "published",
      },
    });

    await AuditService.record({
      tenantId,
      actorId,
      action: "training.program_created",
      entityType: "TrainingCourse",
      entityId: program.id,
      newValues: { title: program.title, category: program.category },
    });

    await OutboxService.publish({
      tenantId,
      eventType: "training.program_created",
      entityType: "TrainingCourse",
      entityId: program.id,
      payload: { title: program.title, isMandatory: program.isMandatory },
    });

    return program;
  }

  static async listPrograms(tenantId: string, category?: string, search?: string) {
    const db = getTenantDb();
    const where: any = { tenantId };
    if (category && category !== "all") {
      where.category = category;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    return await db.trainingCourse.findMany({
      where,
      include: {
        modules: { orderBy: { orderIndex: "asc" } },
        sessions: { orderBy: { startDate: "asc" } },
        _count: { select: { enrollments: true, sessions: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * 3. TRAINING SESSIONS
   */
  static async createSession(
    tenantId: string,
    actorId: string,
    data: {
      courseId: string;
      title: string;
      trainer: string;
      startDate: string | Date;
      endDate: string | Date;
      location?: string;
      capacity?: number;
    }
  ) {
    const db = getTenantDb();
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    if (end <= start) {
      throw new Error("Session end date must be after start date.");
    }

    const sessionCode = `SES-${Date.now().toString().slice(-6)}`;
    const session = await db.trainingSession.create({
      data: {
        tenantId,
        courseId: data.courseId,
        sessionCode,
        title: data.title,
        trainer: data.trainer,
        startDate: start,
        endDate: end,
        location: data.location || "Main Training Room",
        capacity: data.capacity ?? 20,
        status: "scheduled",
      },
    });

    await AuditService.record({
      tenantId,
      actorId,
      action: "training.session_created",
      entityType: "TrainingSession",
      entityId: session.id,
      newValues: { sessionCode, title: session.title, capacity: session.capacity },
    });

    await OutboxService.publish({
      tenantId,
      eventType: "training.session_created",
      entityType: "TrainingSession",
      entityId: session.id,
      payload: { sessionCode, title: session.title },
    });

    return session;
  }

  static async listSessions(tenantId: string, courseId?: string, status?: string) {
    const db = getTenantDb();
    const where: any = { tenantId };
    if (courseId) where.courseId = courseId;
    if (status) where.status = status;

    return await db.trainingSession.findMany({
      where,
      include: {
        course: { select: { id: true, title: true, category: true } },
        attendances: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, email: true } },
          },
        },
        _count: { select: { attendances: true } },
      },
      orderBy: { startDate: "asc" },
    });
  }

  static async registerSession(tenantId: string, sessionId: string, employeeId: string) {
    const db = getTenantDb();
    const session = await db.trainingSession.findUnique({
      where: { id: sessionId },
      include: { _count: { select: { attendances: true } } },
    });

    if (!session || session.tenantId !== tenantId) {
      throw new Error("Training session not found.");
    }

    if (session.status === "cancelled" || session.status === "completed") {
      throw new Error(`Cannot register for session with status '${session.status}'.`);
    }

    if (session._count.attendances >= session.capacity) {
      throw new Error(`Session has reached its maximum capacity of ${session.capacity} participants.`);
    }

    // Check duplicate
    const existing = await db.sessionAttendance.findUnique({
      where: {
        tenantId_sessionId_employeeId: {
          tenantId,
          sessionId,
          employeeId,
        },
      },
    });

    if (existing) {
      throw new Error("Employee is already registered for this session.");
    }

    const attendance = await db.sessionAttendance.create({
      data: {
        tenantId,
        sessionId,
        employeeId,
        status: "registered",
      },
      include: {
        session: true,
        employee: true,
      },
    });

    await OutboxService.publish({
      tenantId,
      eventType: "training.registered",
      entityType: "SessionAttendance",
      entityId: attendance.id,
      payload: { sessionId, employeeId },
    });

    return attendance;
  }

  static async markSessionAttendance(
    tenantId: string,
    attendanceId: string,
    status: string,
    feedback?: string,
    rating?: number
  ) {
    const db = getTenantDb();
    const attendance = await db.sessionAttendance.findUnique({
      where: { id: attendanceId },
    });

    if (!attendance || attendance.tenantId !== tenantId) {
      throw new Error("Attendance record not found.");
    }

    return await db.sessionAttendance.update({
      where: { id: attendanceId },
      data: {
        status,
        attendedAt: status === "attended" ? new Date() : attendance.attendedAt,
        feedback,
        rating,
      },
    });
  }

  /**
   * 4. EMPLOYEE ENROLLMENTS & COMPLETION
   */
  static async assignTraining(
    tenantId: string,
    actorId: string,
    courseId: string,
    employeeId: string
  ) {
    const db = getTenantDb();
    const course = await db.trainingCourse.findUnique({ where: { id: courseId } });
    if (!course || course.tenantId !== tenantId) {
      throw new Error("Training course not found.");
    }

    const enrollment = await db.courseEnrollment.upsert({
      where: {
        tenantId_courseId_employeeId: {
          tenantId,
          courseId,
          employeeId,
        },
      },
      create: {
        tenantId,
        courseId,
        employeeId,
        progressPercent: 0,
        status: "not_started",
      },
      update: {
        status: "in_progress",
      },
      include: {
        course: true,
        employee: true,
      },
    });

    await AuditService.record({
      tenantId,
      actorId,
      action: "training.assigned",
      entityType: "CourseEnrollment",
      entityId: enrollment.id,
      newValues: { courseId, employeeId, courseTitle: course.title },
    });

    await OutboxService.publish({
      tenantId,
      eventType: "training.assigned",
      entityType: "CourseEnrollment",
      entityId: enrollment.id,
      payload: { courseId, employeeId, courseTitle: course.title },
    });

    return enrollment;
  }

  static async updateProgress(
    tenantId: string,
    enrollmentId: string,
    progressPercent: number,
    score?: number
  ) {
    const db = getTenantDb();
    const enrollment = await db.courseEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { course: true },
    });

    if (!enrollment || enrollment.tenantId !== tenantId) {
      throw new Error("Enrollment record not found.");
    }

    const safeProgress = Math.min(100, Math.max(0, progressPercent));
    let status = enrollment.status;
    let certificateId = enrollment.certificateId;
    let certifiedAt = enrollment.certifiedAt;

    if (safeProgress > 0 && safeProgress < 100) {
      status = "in_progress";
    } else if (safeProgress === 100) {
      const passingScore = enrollment.course?.passingScore || 80;
      const achievedScore = score ?? (enrollment.score || 100);
      if (achievedScore >= passingScore) {
        status = "completed";
        if (!certificateId) {
          certificateId = `CERT-${Math.floor(100000 + Math.random() * 900000)}`;
          certifiedAt = new Date();
        }
      } else {
        status = "failed";
      }
    }

    const updated = await db.courseEnrollment.update({
      where: { id: enrollmentId },
      data: {
        progressPercent: safeProgress,
        score: score ?? enrollment.score,
        status,
        certificateId,
        certifiedAt,
      },
      include: {
        course: true,
        employee: true,
      },
    });

    if (status === "completed") {
      await OutboxService.publish({
        tenantId,
        eventType: "training.completed",
        entityType: "CourseEnrollment",
        entityId: updated.id,
        payload: {
          employeeId: updated.employeeId,
          courseTitle: updated.course.title,
          certificateId,
        },
      });
    }

    return updated;
  }

  static async getEmployeeTrainings(tenantId: string, employeeId: string) {
    const db = getTenantDb();
    return await db.courseEnrollment.findMany({
      where: { tenantId, employeeId },
      include: {
        course: {
          include: { modules: { orderBy: { orderIndex: "asc" } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getEmployeeSessions(tenantId: string, employeeId: string) {
    const db = getTenantDb();
    return await db.sessionAttendance.findMany({
      where: { tenantId, employeeId },
      include: {
        session: {
          include: { course: true },
        },
      },
      orderBy: { registeredAt: "desc" },
    });
  }

  static async getOverview(tenantId: string) {
    const db = getTenantDb();
    const [totalCourses, totalSessions, totalEnrollments, completedEnrollments] = await Promise.all([
      db.trainingCourse.count({ where: { tenantId } }),
      db.trainingSession.count({ where: { tenantId, status: "scheduled" } }),
      db.courseEnrollment.count({ where: { tenantId } }),
      db.courseEnrollment.count({ where: { tenantId, status: "completed" } }),
    ]);

    return {
      totalCourses,
      activeSessions: totalSessions,
      totalEnrollments,
      completedEnrollments,
      completionRate: totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0,
    };
  }
}

export const trainingService = TrainingService;
