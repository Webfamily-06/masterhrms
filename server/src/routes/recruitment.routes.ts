import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { provisionEmployeeUser } from "../lib/auth-helpers";

export const recruitmentRouter = Router();
export const publicJobsRouter = Router();

/**
 * =============================================================
 * TENANT RECRUITMENT ENDPOINTS (Protected with requireAuth)
 * =============================================================
 */

// GET /api/recruitment/jobs (List job postings for tenant)
recruitmentRouter.get("/jobs", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context is required." });
    }

    const { status, departmentId, search } = req.query;

    const where: any = { tenantId };
    if (status && status !== "all") {
      where.status = String(status);
    }
    if (departmentId && departmentId !== "all") {
      where.departmentId = String(departmentId);
    }
    if (search) {
      where.OR = [
        { title: { contains: String(search) } },
        { location: { contains: String(search) } },
      ];
    }

    const jobs = await prisma.jobPosting.findMany({
      where,
      include: {
        department: true,
        _count: {
          select: {
            candidates: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(jobs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list job postings." });
  }
});

// POST /api/recruitment/jobs (Create new job posting)
recruitmentRouter.post("/jobs", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context is required." });
    }

    const {
      title,
      departmentId,
      description,
      requirements,
      benefits,
      location,
      employmentType,
      experienceLevel,
      salaryMin,
      salaryMax,
      openingsCount,
      status,
      closingDate,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: "Job title and description are required." });
    }

    // Auto-generate clean URL slug
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

    const job = await prisma.jobPosting.create({
      data: {
        tenantId,
        departmentId: departmentId || null,
        title,
        slug,
        description,
        requirements: requirements || null,
        benefits: benefits || null,
        location: location || "Remote",
        employmentType: employmentType || "full_time",
        experienceLevel: experienceLevel || "Mid-Level",
        salaryMin: salaryMin ? Number(salaryMin) : null,
        salaryMax: salaryMax ? Number(salaryMax) : null,
        openingsCount: openingsCount ? Number(openingsCount) : 1,
        status: status || "published",
        closingDate: closingDate ? new Date(closingDate) : null,
      },
      include: {
        department: true,
      },
    });

    return res.status(201).json(job);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create job posting." });
  }
});

// GET /api/recruitment/jobs/:id (Single job details + candidates breakdown)
recruitmentRouter.get("/jobs/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const job = await prisma.jobPosting.findUnique({
      where: { id },
      include: {
        department: true,
        candidates: {
          include: {
            interviews: {
              include: {
                interviewer: {
                  select: { id: true, firstName: true, lastName: true, email: true },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!job || (tenantId && job.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Job posting not found." });
    }

    return res.json(job);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to get job posting." });
  }
});

// PUT /api/recruitment/jobs/:id (Update job specifications)
recruitmentRouter.put("/jobs/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const existing = await prisma.jobPosting.findUnique({ where: { id } });
    if (!existing || (tenantId && existing.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Job posting not found." });
    }

    const {
      title,
      departmentId,
      description,
      requirements,
      benefits,
      location,
      employmentType,
      experienceLevel,
      salaryMin,
      salaryMax,
      openingsCount,
      status,
      closingDate,
    } = req.body;

    const updated = await prisma.jobPosting.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(departmentId !== undefined && { departmentId: departmentId || null }),
        ...(description && { description }),
        ...(requirements !== undefined && { requirements }),
        ...(benefits !== undefined && { benefits }),
        ...(location !== undefined && { location }),
        ...(employmentType && { employmentType }),
        ...(experienceLevel && { experienceLevel }),
        ...(salaryMin !== undefined && { salaryMin: salaryMin ? Number(salaryMin) : null }),
        ...(salaryMax !== undefined && { salaryMax: salaryMax ? Number(salaryMax) : null }),
        ...(openingsCount !== undefined && { openingsCount: Number(openingsCount) }),
        ...(status && { status }),
        ...(closingDate !== undefined && { closingDate: closingDate ? new Date(closingDate) : null }),
      },
      include: {
        department: true,
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update job posting." });
  }
});

// DELETE /api/recruitment/jobs/:id
recruitmentRouter.delete("/jobs/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const existing = await prisma.jobPosting.findUnique({ where: { id } });
    if (!existing || (tenantId && existing.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Job posting not found." });
    }

    await prisma.jobPosting.delete({ where: { id } });
    return res.json({ success: true, message: "Job posting deleted successfully." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete job posting." });
  }
});

// GET /api/recruitment/candidates (List & filter pipeline candidates)
recruitmentRouter.get("/candidates", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context is required." });
    }

    const { jobPostingId, stage, search } = req.query;

    const where: any = { tenantId };
    if (jobPostingId && jobPostingId !== "all") {
      where.jobPostingId = String(jobPostingId);
    }
    if (stage && stage !== "all") {
      where.stage = String(stage);
    }
    if (search) {
      where.OR = [
        { fullName: { contains: String(search) } },
        { email: { contains: String(search) } },
        { currentCompany: { contains: String(search) } },
      ];
    }

    const candidates = await prisma.jobCandidate.findMany({
      where,
      include: {
        jobPosting: {
          include: {
            department: true,
          },
        },
        interviews: {
          include: {
            interviewer: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(candidates);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list candidates." });
  }
});

// POST /api/recruitment/candidates (Manual candidate addition)
recruitmentRouter.post("/candidates", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context is required." });
    }

    const {
      jobPostingId,
      fullName,
      email,
      phone,
      resumeUrl,
      portfolioUrl,
      coverLetter,
      yearsOfExperience,
      currentCompany,
      expectedSalary,
      stage,
      rating,
      interviewerNotes,
    } = req.body;

    if (!jobPostingId || !fullName || !email) {
      return res.status(400).json({ error: "Job posting, full name, and email are required." });
    }

    const candidate = await prisma.jobCandidate.create({
      data: {
        tenantId,
        jobPostingId,
        fullName,
        email,
        phone: phone || null,
        resumeUrl: resumeUrl || null,
        portfolioUrl: portfolioUrl || null,
        coverLetter: coverLetter || null,
        yearsOfExperience: yearsOfExperience ? Number(yearsOfExperience) : 0,
        currentCompany: currentCompany || null,
        expectedSalary: expectedSalary ? Number(expectedSalary) : null,
        stage: stage || "applied",
        rating: rating ? Number(rating) : 0,
        interviewerNotes: interviewerNotes || null,
      },
      include: {
        jobPosting: {
          include: {
            department: true,
          },
        },
      },
    });

    return res.status(201).json(candidate);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create candidate." });
  }
});

// PUT /api/recruitment/candidates/:id/stage (Update Kanban Stage)
recruitmentRouter.put("/candidates/:id/stage", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;
    const tenantId = req.user?.tenantId;

    const existing = await prisma.jobCandidate.findUnique({ where: { id } });
    if (!existing || (tenantId && existing.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Candidate not found." });
    }

    const validStages = ["applied", "screening", "interview", "offered", "hired", "rejected"];
    if (!validStages.includes(stage)) {
      return res.status(400).json({ error: "Invalid recruitment stage." });
    }

    const updated = await prisma.jobCandidate.update({
      where: { id },
      data: { stage },
      include: {
        jobPosting: {
          include: { department: true },
        },
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update candidate stage." });
  }
});

// PUT /api/recruitment/candidates/:id/scorecard (Update Rating & Notes)
recruitmentRouter.put("/candidates/:id/scorecard", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, interviewerNotes } = req.body;
    const tenantId = req.user?.tenantId;

    const existing = await prisma.jobCandidate.findUnique({ where: { id } });
    if (!existing || (tenantId && existing.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Candidate not found." });
    }

    const updated = await prisma.jobCandidate.update({
      where: { id },
      data: {
        ...(rating !== undefined && { rating: Number(rating) }),
        ...(interviewerNotes !== undefined && { interviewerNotes }),
      },
      include: {
        jobPosting: { include: { department: true } },
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update scorecard." });
  }
});

// POST /api/recruitment/candidates/:id/convert-to-employee (1-Click Hired to Staff Onboarding)
recruitmentRouter.post("/candidates/:id/convert-to-employee", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const candidate = await prisma.jobCandidate.findUnique({
      where: { id },
      include: {
        jobPosting: {
          include: { department: true },
        },
      },
    });

    if (!candidate || (tenantId && candidate.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Candidate not found." });
    }

    if (candidate.isConvertedToEmployee) {
      return res.status(400).json({ error: "This candidate has already been converted to an employee." });
    }

    // Split candidate name into First and Last name
    const nameParts = candidate.fullName.trim().split(" ");
    const firstName = nameParts[0] || "Staff";
    const lastName = nameParts.slice(1).join(" ") || "Member";

    // Auto-generate employee code (e.g. EMP-9821)
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const employeeCode = `EMP-${randomCode}`;

    // Execute Prisma Transaction: Create Employee, auto-provision User, and mark candidate converted
    const result = await prisma.$transaction(async (tx: any) => {
      const cleanEmail = candidate.email.toLowerCase().trim();
      let userId: string | undefined;
      try {
        userId = await provisionEmployeeUser(tx, {
          tenantId: candidate.tenantId,
          email: cleanEmail,
          firstName,
          lastName,
          phone: candidate.phone,
          password: "Password@123",
        });
      } catch (e) {}

      const employee = await tx.employee.create({
        data: {
          tenantId: candidate.tenantId,
          userId: userId || null,
          firstName,
          lastName,
          email: cleanEmail,
          phone: candidate.phone,
          position: candidate.jobPosting?.title || "Team Member",
          employeeCode,
          departmentId: candidate.jobPosting?.departmentId || null,
          salary: candidate.expectedSalary || candidate.jobPosting?.salaryMin || 35000,
          status: "active",
          employmentType: (candidate.jobPosting?.employmentType as any) || "full_time",
          joinedAt: new Date(),
        },
        include: {
          department: true,
        },
      });

      const updatedCandidate = await tx.jobCandidate.update({
        where: { id: candidate.id },
        data: {
          stage: "hired",
          isConvertedToEmployee: true,
        },
      });

      return { employee, updatedCandidate };
    });

    return res.status(201).json({
      success: true,
      message: `Candidate ${candidate.fullName} successfully converted to Employee (${result.employee.employeeCode})!`,
      employee: result.employee,
      candidate: result.updatedCandidate,
    });
  } catch (err: any) {
    console.error("[convert-to-employee] error:", err);
    return res.status(500).json({ error: err.message || "Failed to convert candidate to employee." });
  }
});

// POST /api/recruitment/candidates/:id/interviews (Schedule Interview)
recruitmentRouter.post("/candidates/:id/interviews", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { interviewerId, interviewType, scheduledAt, meetingLink, feedback } = req.body;
    const tenantId = req.user?.tenantId;

    const candidate = await prisma.jobCandidate.findUnique({ where: { id } });
    if (!candidate || (tenantId && candidate.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Candidate not found." });
    }

    const interview = await prisma.jobCandidateInterview.create({
      data: {
        candidateId: id,
        interviewerId: interviewerId || null,
        interviewType: interviewType || "Technical Round",
        scheduledAt: new Date(scheduledAt),
        meetingLink: meetingLink || null,
        feedback: feedback || null,
        status: "scheduled",
      },
      include: {
        interviewer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Automatically advance stage to "interview" if currently in applied/screening
    if (["applied", "screening"].includes(candidate.stage)) {
      await prisma.jobCandidate.update({
        where: { id },
        data: { stage: "interview" },
      });
    }

    return res.status(201).json(interview);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to schedule interview." });
  }
});

/**
 * =============================================================
 * PUBLIC CAREERS PORTAL ENDPOINTS (Public - No requireAuth)
 * =============================================================
 */

// GET /api/public/jobs/:tenantSlug (List published openings for a company)
publicJobsRouter.get("/:tenantSlug", async (req, res) => {
  try {
    const { tenantSlug } = req.params;

    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [{ slug: tenantSlug }, { id: tenantSlug }],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: "Company careers portal not found." });
    }

    const jobs = await prisma.jobPosting.findMany({
      where: {
        tenantId: tenant.id,
        status: "published",
      },
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      tenant,
      jobs,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch careers." });
  }
});

// GET /api/public/jobs/:tenantSlug/:jobSlug (Single public job details)
publicJobsRouter.get("/:tenantSlug/:jobSlug", async (req, res) => {
  try {
    const { tenantSlug, jobSlug } = req.params;

    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [{ slug: tenantSlug }, { id: tenantSlug }],
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: "Company not found." });
    }

    const job = await prisma.jobPosting.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [{ slug: jobSlug }, { id: jobSlug }],
        status: "published",
      },
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ error: "Job opening not found or no longer active." });
    }

    return res.json({
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, logoUrl: tenant.logoUrl },
      job,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch job details." });
  }
});

// POST /api/public/jobs/:jobId/apply (Public candidate application submission)
publicJobsRouter.post("/:jobId/apply", async (req, res) => {
  try {
    const { jobId } = req.params;
    const {
      fullName,
      email,
      phone,
      resumeUrl,
      portfolioUrl,
      coverLetter,
      yearsOfExperience,
      currentCompany,
      expectedSalary,
    } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({ error: "Your full name and email are required to apply." });
    }

    const job = await prisma.jobPosting.findUnique({
      where: { id: jobId },
    });

    if (!job || job.status !== "published") {
      return res.status(400).json({ error: "This job opening is no longer accepting applications." });
    }

    // Check if duplicate application
    const existing = await prisma.jobCandidate.findFirst({
      where: {
        jobPostingId: job.id,
        email: email.trim().toLowerCase(),
      },
    });

    if (existing) {
      return res.status(400).json({ error: "You have already submitted an application for this position." });
    }

    const candidate = await prisma.jobCandidate.create({
      data: {
        tenantId: job.tenantId,
        jobPostingId: job.id,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : null,
        resumeUrl: resumeUrl ? resumeUrl.trim() : null,
        portfolioUrl: portfolioUrl ? portfolioUrl.trim() : null,
        coverLetter: coverLetter ? coverLetter.trim() : null,
        yearsOfExperience: yearsOfExperience ? Number(yearsOfExperience) : 0,
        currentCompany: currentCompany ? currentCompany.trim() : null,
        expectedSalary: expectedSalary ? Number(expectedSalary) : null,
        stage: "applied",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully! Our hiring team will review your profile.",
      candidateId: candidate.id,
    });
  } catch (err: any) {
    console.error("[public/jobs/apply] error:", err);
    return res.status(500).json({ error: err.message || "Failed to submit application." });
  }
});
