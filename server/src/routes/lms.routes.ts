import { Router, Response } from "express";
import { LmsService } from "../services/lms.service";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";

export const lmsRouter = Router();

lmsRouter.use(requireAuth, resolveTenantContext as any);

/**
 * POST /api/lms/courses
 * Create new course
 */
lmsRouter.post("/courses", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { title, category, instructor, durationHours, isMandatory, passingScore, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Course title is required." });
    }

    const course = await LmsService.createCourse(tenantId, {
      title,
      category,
      instructor,
      durationHours,
      isMandatory,
      passingScore,
      description,
    });

    return res.status(201).json({ course });
  } catch (err: any) {
    console.error("[lms:course:create] error:", err);
    return res.status(500).json({ error: err.message || "Failed to create course." });
  }
});

/**
 * POST /api/lms/courses/:courseId/enroll
 * Enroll employee into course
 */
lmsRouter.post("/courses/:courseId/enroll", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({ error: "Employee ID is required." });
    }

    const enrollment = await LmsService.enrollEmployee(tenantId, req.params.courseId, employeeId);
    return res.status(201).json({ enrollment });
  } catch (err: any) {
    console.error("[lms:course:enroll] error:", err);
    return res.status(500).json({ error: err.message || "Failed to enroll employee." });
  }
});

/**
 * POST /api/lms/enrollments/:enrollmentId/progress
 * Record course lesson progress
 */
lmsRouter.post("/enrollments/:enrollmentId/progress", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { progressPercentage, score } = req.body;

    const enrollment = await LmsService.updateProgress(
      tenantId,
      req.params.enrollmentId,
      Number(progressPercentage),
      score !== undefined ? Number(score) : undefined
    );

    return res.json({ enrollment });
  } catch (err: any) {
    console.error("[lms:progress:update] error:", err);
    return res.status(500).json({ error: err.message || "Failed to update progress." });
  }
});

/**
 * GET /api/lms/enrollments/:enrollmentId/certificate
 * Get completion certificate
 */
lmsRouter.get("/enrollments/:enrollmentId/certificate", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const cert = await LmsService.getCertificate(tenantId, req.params.enrollmentId);
    return res.json({ certificate: cert });
  } catch (err: any) {
    console.error("[lms:certificate] error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch certificate." });
  }
});
