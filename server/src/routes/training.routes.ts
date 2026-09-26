import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const trainingRouter = Router();



// GET /api/training/courses (List courses)
trainingRouter.get("/courses", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    // seed disabled

    const { category, search } = req.query;
    const where: any = { tenantId };
    if (category && category !== "all") {
      where.category = String(category);
    }
    if (search) {
      where.OR = [
        { title: { contains: String(search) } },
        { description: { contains: String(search) } },
        { instructor: { contains: String(search) } },
      ];
    }

    const courses = await prisma.trainingCourse.findMany({
      where,
      include: {
        modules: {
          orderBy: { orderIndex: "asc" },
        },
        _count: {
          select: { enrollments: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(courses);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list courses." });
  }
});

// POST /api/training/courses (Create course)
trainingRouter.post("/courses", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { title, category, instructor, durationHours, isMandatory, passingScore, description, bannerUrl, modules } = req.body;

    if (!title) return res.status(400).json({ error: "Course title is required." });

    const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

    const course = await prisma.trainingCourse.create({
      data: {
        tenantId,
        title,
        slug,
        category: category || "Compliance & Security",
        instructor: instructor || "Internal Academy",
        durationHours: durationHours ? Number(durationHours) : 4.0,
        isMandatory: isMandatory !== undefined ? Boolean(isMandatory) : false,
        passingScore: passingScore ? Number(passingScore) : 80,
        description: description || null,
        bannerUrl: bannerUrl || null,
        status: "published",
      },
    });

    if (modules && Array.isArray(modules)) {
      for (let i = 0; i < modules.length; i++) {
        const m = modules[i];
        await prisma.courseModule.create({
          data: {
            courseId: course.id,
            orderIndex: m.orderIndex || i + 1,
            title: m.title || `Lesson ${i + 1}`,
            durationMinutes: m.durationMinutes ? Number(m.durationMinutes) : 30,
            content: m.content || null,
            videoUrl: m.videoUrl || null,
          },
        });
      }
    }

    const created = await prisma.trainingCourse.findUnique({
      where: { id: course.id },
      include: { modules: { orderBy: { orderIndex: "asc" } } },
    });

    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create course." });
  }
});

// GET /api/training/courses/:id (Course details + curriculum + enrollments)
trainingRouter.get("/courses/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const course = await prisma.trainingCourse.findUnique({
      where: { id },
      include: {
        modules: { orderBy: { orderIndex: "asc" } },
        enrollments: {
          include: {
            employee: {
              include: { department: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!course || (tenantId && course.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Course not found." });
    }

    return res.json(course);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch course details." });
  }
});

// PUT /api/training/courses/:id (Update course)
trainingRouter.put("/courses/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const existing = await prisma.trainingCourse.findUnique({ where: { id } });
    if (!existing || (tenantId && existing.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Course not found." });
    }

    const { title, category, instructor, durationHours, isMandatory, passingScore, description, status } = req.body;

    const updated = await prisma.trainingCourse.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(category && { category }),
        ...(instructor && { instructor }),
        ...(durationHours !== undefined && { durationHours: Number(durationHours) }),
        ...(isMandatory !== undefined && { isMandatory: Boolean(isMandatory) }),
        ...(passingScore !== undefined && { passingScore: Number(passingScore) }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
      },
      include: { modules: true },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update course." });
  }
});

// DELETE /api/training/courses/:id
trainingRouter.delete("/courses/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const existing = await prisma.trainingCourse.findUnique({ where: { id } });
    if (!existing || (tenantId && existing.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Course not found." });
    }

    await prisma.trainingCourse.delete({ where: { id } });
    return res.json({ success: true, message: "Course deleted." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete course." });
  }
});

// GET /api/training/enrollments (List student enrollments across tenant)
trainingRouter.get("/enrollments", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { courseId, employeeId, status, search } = req.query;

    const where: any = { tenantId };
    if (courseId && courseId !== "all") {
      where.courseId = String(courseId);
    }
    if (employeeId && employeeId !== "all") {
      where.employeeId = String(employeeId);
    }
    if (status && status !== "all") {
      where.status = String(status);
    }
    if (search) {
      where.OR = [
        { course: { title: { contains: String(search) } } },
        { employee: { firstName: { contains: String(search) } } },
        { employee: { lastName: { contains: String(search) } } },
        { certificateId: { contains: String(search) } },
      ];
    }

    const enrollments = await prisma.courseEnrollment.findMany({
      where,
      include: {
        course: true,
        employee: {
          include: { department: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(enrollments);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list enrollments." });
  }
});

// POST /api/training/enrollments (Enroll employee or bulk-enroll department)
trainingRouter.post("/enrollments", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { courseId, employeeIds } = req.body;

    if (!courseId || !employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ error: "Course ID and at least one employee are required." });
    }

    let enrolledCount = 0;

    for (const empId of employeeIds) {
      await prisma.courseEnrollment.upsert({
        where: {
          tenantId_courseId_employeeId: {
            tenantId,
            courseId,
            employeeId: empId,
          },
        },
        create: {
          tenantId,
          courseId,
          employeeId: empId,
          status: "not_started",
          progressPercent: 0,
        },
        update: {},
      });
      enrolledCount++;
    }

    return res.status(201).json({
      success: true,
      message: `Successfully enrolled ${enrolledCount} staff member(s) into course!`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to enroll staff." });
  }
});

// PUT /api/training/enrollments/:id/progress (Update student progress & generate certificate)
trainingRouter.put("/enrollments/:id/progress", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { progressPercent, score } = req.body;
    const tenantId = req.user?.tenantId;

    const existing = await prisma.courseEnrollment.findUnique({
      where: { id },
      include: { course: true },
    });

    if (!existing || (tenantId && existing.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Enrollment record not found." });
    }

    const progress = Math.min(100, Math.max(0, Number(progressPercent)));
    const examScore = score !== undefined ? Number(score) : existing.score;

    let status = existing.status;
    let certificateId = existing.certificateId;
    let certifiedAt = existing.certifiedAt;
    let expiryDate = existing.expiryDate;

    if (progress > 0 && progress < 100) {
      status = "in_progress";
    } else if (progress === 100) {
      const isPassed = examScore !== null && examScore >= existing.course.passingScore;
      if (isPassed) {
        status = "completed";
        if (!certificateId) {
          const rand = Math.floor(1000 + Math.random() * 9000);
          certificateId = `CERT-${rand}`;
          certifiedAt = new Date();
          const exp = new Date();
          exp.setFullYear(exp.getFullYear() + 1);
          expiryDate = exp;
        }
      } else {
        status = "in_progress";
      }
    }

    const updated = await prisma.courseEnrollment.update({
      where: { id },
      data: {
        progressPercent: progress,
        score: examScore,
        status,
        certificateId,
        certifiedAt,
        expiryDate,
      },
      include: {
        course: true,
        employee: { include: { department: true } },
      },
    });

    return res.json({
      success: true,
      message: status === "completed" ? `Course completed & Certificate issued (${certificateId})!` : "Learning progress updated.",
      enrollment: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update progress." });
  }
});

// GET /api/training/summary (Academy analytics)
trainingRouter.get("/summary", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const totalCourses = await prisma.trainingCourse.count({ where: { tenantId } });
    const allEnrollments = await prisma.courseEnrollment.findMany({ where: { tenantId } });

    const totalEnrolled = allEnrollments.length;
    const completedCount = allEnrollments.filter((e) => e.status === "completed").length;
    const inProgressCount = allEnrollments.filter((e) => e.status === "in_progress").length;

    const complianceRate = totalEnrolled > 0 ? Math.round((completedCount / totalEnrolled) * 100) : 100;

    return res.json({
      totalCourses,
      totalEnrolled,
      completedCount,
      inProgressCount,
      complianceRate,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to generate academy summary." });
  }
});
