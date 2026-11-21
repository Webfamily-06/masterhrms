"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobBoardService = void 0;
const prisma_1 = require("../prisma");
const db = prisma_1.rawPrisma || prisma_1.prisma;
class JobBoardService {
    /**
     * List published job postings for candidate public discovery
     */
    static async listPublishedJobs(tenantId, filters) {
        const where = { tenantId, status: "published" };
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
    static async getJobDetails(tenantId, identifier) {
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
    static async submitApplication(tenantId, jobPostingId, data) {
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
    static async updateCandidateStage(tenantId, candidateId, stage, notes) {
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
    static async listApplications(tenantId, jobPostingId) {
        const where = { tenantId };
        if (jobPostingId) {
            where.jobPostingId = jobPostingId;
        }
        return await db.jobCandidate.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });
    }
}
exports.JobBoardService = JobBoardService;
