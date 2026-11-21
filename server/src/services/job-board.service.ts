import { rawPrisma, prisma as proxiedPrisma } from "../prisma";

const db = rawPrisma || proxiedPrisma;

export class JobBoardService {
  /**
   * List published job postings for candidate public discovery
   */
  static async listPublishedJobs(
    tenantId: string,
    filters?: { departmentId?: string; location?: string; search?: string }
  ) {
    const where: any = { tenantId, status: "published" };

    if (filters?.departmentId) {
      where.departmentId = filters.departmentId;
    }
    if (filters?.location) {
      where.location = { contains: filters.location, mode: "insensitive" };
    }
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const jobs = await db.jobPosting.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        location: true,
        employmentType: true,
        experienceLevel: true,
        salaryMin: true,
        salaryMax: true,
        description: true,
        requirements: true,
        benefits: true,
        createdAt: true,
      },
    });

    return jobs;
  }

  /**
   * Get single job posting details by slug or ID
   */
  static async getJobDetails(tenantId: string, identifier: string) {
    const job = await db.jobPosting.findFirst({
      where: {
        tenantId,
        status: "published",
        OR: [{ id: identifier }, { slug: identifier }],
      },
    });

    return job;
  }

  /**
   * Submit job application as an external candidate
   */
  static async submitApplication(
    tenantId: string,
    jobPostingId: string,
    data: {
      fullName: string;
      email: string;
      phone?: string;
      resumeUrl?: string;
      coverLetter?: string;
      portfolioUrl?: string;
      yearsOfExperience?: number;
      expectedSalary?: number;
    }
  ) {
    const job = await db.jobPosting.findFirst({
      where: { id: jobPostingId, tenantId, status: "published" },
    });
    if (!job) {
      throw new Error("Job posting not found or no longer accepting applications.");
    }

    const candidate = await db.jobCandidate.create({
      data: {
        tenantId,
        jobPostingId,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || null,
        resumeUrl: data.resumeUrl || null,
        coverLetter: data.coverLetter || null,
        portfolioUrl: data.portfolioUrl || null,
        yearsOfExperience: data.yearsOfExperience || 0,
        expectedSalary: data.expectedSalary ? Number(data.expectedSalary) : null,
        stage: "applied",
      },
    });

    return candidate;
  }

  /**
   * Update candidate application stage (HR Admin / Recruiter review)
   */
  static async updateCandidateStage(
    tenantId: string,
    candidateId: string,
    stage: string,
    notes?: string
  ) {
    const candidate = await db.jobCandidate.findFirst({
      where: { id: candidateId, tenantId },
    });
    if (!candidate) {
      throw new Error("Job candidate application not found.");
    }

    const updated = await db.jobCandidate.update({
      where: { id: candidateId },
      data: {
        stage,
        interviewerNotes: notes || candidate.interviewerNotes,
      },
    });

    return updated;
  }

  /**
   * List candidate applications for a job posting
   */
  static async listApplications(tenantId: string, jobPostingId?: string) {
    const where: any = { tenantId };
    if (jobPostingId) {
      where.jobPostingId = jobPostingId;
    }
    return await db.jobCandidate.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }
}
