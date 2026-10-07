import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { getTenantDb } from "../context/tenant-context";

export const meRecruitmentRouter = Router();

// =========================================================================
// 1. INTERNAL JOB BOARD (/me/recruitment/job-postings)
// =========================================================================
meRecruitmentRouter.get("/job-postings", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();

    const jobs = await db.jobPosting.findMany({
      where: {
        tenantId,
        status: "published",
      },
      include: {
        department: true,
        designation: true,
        branch: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(jobs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch internal job postings." });
  }
});

// Apply internally
meRecruitmentRouter.post("/job-postings/:id/apply", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const user = req.user!;
    const userId = user.userId || (user as any).id;
    const db = getTenantDb();

    const employee = await db.employee.findFirst({
      where: { tenantId, userId },
    });

    const job = await db.jobPosting.findFirst({
      where: { id: req.params.id, tenantId, status: "published" },
    });
    if (!job) return res.status(404).json({ error: "Job posting not available for internal application." });

    const candidate = await db.jobCandidate.create({
      data: {
        tenantId,
        jobPostingId: job.id,
        fullName: employee ? `${employee.firstName} ${employee.lastName}` : (user.email.split("@")[0] || "Internal Applicant"),
        email: user.email,
        phone: employee?.phone || null,
        stage: "applied",
        currentCompany: "Internal Employee",
        interviewerNotes: `Internal application by Employee ID ${employee?.id || "N/A"}`,
      },
    });

    return res.status(201).json({ success: true, candidateId: candidate.id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// =========================================================================
// 2. MY INTERVIEWS PANEL (/me/recruitment/interviews)
// =========================================================================
meRecruitmentRouter.get("/interviews", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const userId = req.user?.userId || (req.user as any)?.id;
    const db = getTenantDb();

    const employee = await db.employee.findFirst({
      where: { tenantId, userId },
    });

    if (!employee) {
      return res.json([]);
    }

    const interviews = await db.jobCandidateInterview.findMany({
      where: {
        tenantId,
        interviewerId: employee.id,
      },
      include: {
        candidate: {
          select: {
            id: true,
            fullName: true,
            email: true,
            resumeUrl: true,
            yearsOfExperience: true,
            currentCompany: true,
            jobPosting: { select: { id: true, title: true, department: true } },
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });

    return res.json(interviews);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// =========================================================================
// 3. MY ONBOARDING TASKS (/me/recruitment/onboarding)
// =========================================================================
meRecruitmentRouter.get("/onboarding", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();

    const tasks = await db.candidateOnboardingTask.findMany({
      where: { tenantId },
      include: {
        onboarding: {
          include: {
            candidate: true,
          },
        },
      },
      orderBy: { sequence: "asc" },
      take: 50,
    });

    return res.json(tasks);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// =========================================================================
// 4. MY ASSESSMENTS (/me/recruitment/assessments)
// =========================================================================
meRecruitmentRouter.get("/assessments", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const db = getTenantDb();

    const assessments = await db.candidateAssessment.findMany({
      where: { tenantId },
      include: {
        template: true,
        candidate: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return res.json(assessments);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// =========================================================================
// 5. MY CAREER & REFERRALS (/me/recruitment/career)
// =========================================================================
meRecruitmentRouter.get("/career", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const userId = req.user?.userId || (req.user as any)?.id;
    const db = getTenantDb();

    const employee = await db.employee.findFirst({
      where: { tenantId, userId },
    });

    const referrals = employee
      ? await db.employeeReferral.findMany({
          where: { tenantId, referrerId: employee.id },
          orderBy: { createdAt: "desc" },
        })
      : [];

    return res.json({ employee, referrals });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
