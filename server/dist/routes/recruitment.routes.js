"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicJobsRouter = exports.recruitmentRouter = void 0;
const workspace_policy_service_1 = require("../services/workspace-policy.service");
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const auth_helpers_1 = require("../lib/auth-helpers");
const pagination_1 = require("../lib/pagination");
const audit_service_1 = require("../services/audit.service");
const outbox_service_1 = require("../services/outbox.service");
const turnstile_middleware_1 = require("../middleware/turnstile.middleware");
exports.recruitmentRouter = (0, express_1.Router)();
exports.publicJobsRouter = (0, express_1.Router)();
/**
 * =============================================================
 * TENANT RECRUITMENT ENDPOINTS (Protected with requireAuth)
 * =============================================================
 */
// GET /api/recruitment/jobs (List job postings for tenant)
exports.recruitmentRouter.get("/jobs", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: "Tenant context is required." });
        }
        const { status, departmentId, search } = req.query;
        const where = { tenantId };
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
        const pagination = (0, pagination_1.parsePaginationParams)(req, "createdAt", 20);
        const [total, jobs] = await Promise.all([
            prisma_1.prisma.jobPosting.count({ where }),
            prisma_1.prisma.jobPosting.findMany({
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
                ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
            }),
        ]);
        if (pagination.isPaginated) {
            return res.json((0, pagination_1.formatPaginatedResponse)(jobs, total, pagination));
        }
        res.setHeader("X-Total-Count", String(total));
        return res.json(jobs);
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to list job postings." });
    }
});
// POST /api/recruitment/jobs (Create new job posting)
exports.recruitmentRouter.post("/jobs", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: "Tenant context is required." });
        }
        const { title, departmentId, description, requirements, benefits, location, employmentType, experienceLevel, salaryMin, salaryMax, openingsCount, status, closingDate, } = req.body;
        if (!title || !description) {
            return res.status(400).json({ error: "Job title and description are required." });
        }
        // Auto-generate clean URL slug
        const baseSlug = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
        const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
        const job = await prisma_1.prisma.jobPosting.create({
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
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "recruitment.job.created",
            entityType: "JobPosting",
            entityId: job.id,
            newState: { title: job.title, status: job.status, location: job.location },
        }).catch(() => { });
        await outbox_service_1.OutboxService.createOutboxEvent({
            tenantId,
            eventType: "recruitment.job.created",
            entityType: "job_posting",
            entityId: job.id,
            actorId: req.user?.userId || req.user?.id,
            payload: { title: job.title, status: job.status },
        }).catch(() => { });
        return res.status(201).json(job);
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to create job posting." });
    }
});
// GET /api/recruitment/jobs/:id (Single job details + candidates breakdown)
exports.recruitmentRouter.get("/jobs/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        const job = await prisma_1.prisma.jobPosting.findUnique({
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
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to get job posting." });
    }
});
// PUT /api/recruitment/jobs/:id (Update job specifications)
exports.recruitmentRouter.put("/jobs/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        const existing = await prisma_1.prisma.jobPosting.findUnique({ where: { id } });
        if (!existing || (tenantId && existing.tenantId !== tenantId)) {
            return res.status(404).json({ error: "Job posting not found." });
        }
        const { title, departmentId, description, requirements, benefits, location, employmentType, experienceLevel, salaryMin, salaryMax, openingsCount, status, closingDate, } = req.body;
        const updated = await prisma_1.prisma.jobPosting.update({
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
        await audit_service_1.AuditService.logMutation({
            tenantId: existing.tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "recruitment.job.updated",
            entityType: "JobPosting",
            entityId: id,
            oldState: { title: existing.title, status: existing.status },
            newState: { title: updated.title, status: updated.status },
        }).catch(() => { });
        await outbox_service_1.OutboxService.createOutboxEvent({
            tenantId: existing.tenantId,
            eventType: "recruitment.job.updated",
            entityType: "job_posting",
            entityId: id,
            actorId: req.user?.userId || req.user?.id,
            payload: { title: updated.title, status: updated.status },
        }).catch(() => { });
        return res.json(updated);
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to update job posting." });
    }
});
// DELETE /api/recruitment/jobs/:id
exports.recruitmentRouter.delete("/jobs/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        const existing = await prisma_1.prisma.jobPosting.findUnique({ where: { id } });
        if (!existing || (tenantId && existing.tenantId !== tenantId)) {
            return res.status(404).json({ error: "Job posting not found." });
        }
        await prisma_1.prisma.jobPosting.delete({ where: { id } });
        await audit_service_1.AuditService.logMutation({
            tenantId: existing.tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "recruitment.job.deleted",
            entityType: "JobPosting",
            entityId: id,
            oldState: { title: existing.title },
        }).catch(() => { });
        await outbox_service_1.OutboxService.createOutboxEvent({
            tenantId: existing.tenantId,
            eventType: "recruitment.job.deleted",
            entityType: "job_posting",
            entityId: id,
            actorId: req.user?.userId || req.user?.id,
            payload: { title: existing.title },
        }).catch(() => { });
        return res.json({ success: true, message: "Job posting deleted successfully." });
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to delete job posting." });
    }
});
// GET /api/recruitment/candidates (List & filter pipeline candidates)
exports.recruitmentRouter.get("/candidates", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: "Tenant context is required." });
        }
        const { jobPostingId, stage, search } = req.query;
        const where = { tenantId };
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
        const pagination = (0, pagination_1.parsePaginationParams)(req, "createdAt", 20);
        const [total, candidates] = await Promise.all([
            prisma_1.prisma.jobCandidate.count({ where }),
            prisma_1.prisma.jobCandidate.findMany({
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
                ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
            }),
        ]);
        if (pagination.isPaginated) {
            return res.json((0, pagination_1.formatPaginatedResponse)(candidates, total, pagination));
        }
        res.setHeader("X-Total-Count", String(total));
        return res.json(candidates);
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to list candidates." });
    }
});
// POST /api/recruitment/candidates (Manual candidate addition)
exports.recruitmentRouter.post("/candidates", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: "Tenant context is required." });
        }
        const { jobPostingId, fullName, email, phone, resumeUrl, portfolioUrl, coverLetter, yearsOfExperience, currentCompany, expectedSalary, stage, rating, interviewerNotes, } = req.body;
        if (!jobPostingId || !fullName || !email) {
            return res.status(400).json({ error: "Job posting, full name, and email are required." });
        }
        const candidate = await prisma_1.prisma.jobCandidate.create({
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
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "recruitment.candidate.created",
            entityType: "JobCandidate",
            entityId: candidate.id,
            newState: { fullName: candidate.fullName, email: candidate.email, jobPostingId: candidate.jobPostingId },
        }).catch(() => { });
        await outbox_service_1.OutboxService.createOutboxEvent({
            tenantId,
            eventType: "recruitment.candidate.created",
            entityType: "candidate",
            entityId: candidate.id,
            actorId: req.user?.userId || req.user?.id,
            payload: { fullName: candidate.fullName, email: candidate.email, stage: candidate.stage },
        }).catch(() => { });
        return res.status(201).json(candidate);
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to create candidate." });
    }
});
// GET /api/recruitment/candidates/:id (Single candidate details)
exports.recruitmentRouter.get("/candidates/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        const candidate = await prisma_1.prisma.jobCandidate.findUnique({
            where: { id },
            include: {
                jobPosting: {
                    include: { department: true },
                },
                interviews: {
                    include: {
                        interviewer: {
                            select: { id: true, firstName: true, lastName: true, email: true },
                        },
                    },
                },
            },
        });
        if (!candidate || (tenantId && candidate.tenantId !== tenantId)) {
            return res.status(404).json({ error: "Candidate not found." });
        }
        return res.json(candidate);
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to get candidate." });
    }
});
// PUT /api/recruitment/candidates/:id (Update candidate details)
exports.recruitmentRouter.put("/candidates/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        const existing = await prisma_1.prisma.jobCandidate.findUnique({ where: { id } });
        if (!existing || (tenantId && existing.tenantId !== tenantId)) {
            return res.status(404).json({ error: "Candidate not found." });
        }
        const { fullName, email, phone, resumeUrl, portfolioUrl, coverLetter, yearsOfExperience, currentCompany, expectedSalary, interviewerNotes, stage, rating, } = req.body;
        const updated = await prisma_1.prisma.jobCandidate.update({
            where: { id },
            data: {
                ...(fullName && { fullName }),
                ...(email && { email }),
                ...(phone !== undefined && { phone: phone || null }),
                ...(resumeUrl !== undefined && { resumeUrl: resumeUrl || null }),
                ...(portfolioUrl !== undefined && { portfolioUrl: portfolioUrl || null }),
                ...(coverLetter !== undefined && { coverLetter: coverLetter || null }),
                ...(yearsOfExperience !== undefined && { yearsOfExperience: Number(yearsOfExperience) }),
                ...(currentCompany !== undefined && { currentCompany: currentCompany || null }),
                ...(expectedSalary !== undefined && { expectedSalary: expectedSalary ? Number(expectedSalary) : null }),
                ...(interviewerNotes !== undefined && { interviewerNotes: interviewerNotes || null }),
                ...(stage && { stage }),
                ...(rating !== undefined && { rating: Number(rating) }),
            },
            include: {
                jobPosting: { include: { department: true } },
            },
        });
        await audit_service_1.AuditService.logMutation({
            tenantId: existing.tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "recruitment.candidate.updated",
            entityType: "JobCandidate",
            entityId: id,
            oldState: { fullName: existing.fullName, email: existing.email },
            newState: { fullName: updated.fullName, email: updated.email },
        }).catch(() => { });
        await outbox_service_1.OutboxService.createOutboxEvent({
            tenantId: existing.tenantId,
            eventType: "recruitment.candidate.updated",
            entityType: "candidate",
            entityId: id,
            actorId: req.user?.userId || req.user?.id,
            payload: { fullName: updated.fullName, email: updated.email },
        }).catch(() => { });
        return res.json(updated);
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to update candidate." });
    }
});
// DELETE /api/recruitment/candidates/:id (Delete candidate)
exports.recruitmentRouter.delete("/candidates/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        const existing = await prisma_1.prisma.jobCandidate.findUnique({ where: { id } });
        if (!existing || (tenantId && existing.tenantId !== tenantId)) {
            return res.status(404).json({ error: "Candidate not found." });
        }
        await prisma_1.prisma.jobCandidate.delete({ where: { id } });
        await audit_service_1.AuditService.logMutation({
            tenantId: existing.tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "recruitment.candidate.deleted",
            entityType: "JobCandidate",
            entityId: id,
            oldState: { fullName: existing.fullName, email: existing.email },
        }).catch(() => { });
        await outbox_service_1.OutboxService.createOutboxEvent({
            tenantId: existing.tenantId,
            eventType: "recruitment.candidate.deleted",
            entityType: "candidate",
            entityId: id,
            actorId: req.user?.userId || req.user?.id,
            payload: { fullName: existing.fullName },
        }).catch(() => { });
        return res.json({ success: true, message: "Candidate deleted successfully." });
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to delete candidate." });
    }
});
// PUT /api/recruitment/candidates/:id/stage (Update Kanban Stage)
exports.recruitmentRouter.put("/candidates/:id/stage", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { stage } = req.body;
        const tenantId = req.user?.tenantId;
        const existing = await prisma_1.prisma.jobCandidate.findUnique({ where: { id } });
        if (!existing || (tenantId && existing.tenantId !== tenantId)) {
            return res.status(404).json({ error: "Candidate not found." });
        }
        const validStages = ["applied", "screening", "interview", "offered", "hired", "rejected"];
        if (!validStages.includes(stage)) {
            return res.status(400).json({ error: "Invalid recruitment stage." });
        }
        const updated = await prisma_1.prisma.jobCandidate.update({
            where: { id },
            data: { stage },
            include: {
                jobPosting: {
                    include: { department: true },
                },
            },
        });
        await audit_service_1.AuditService.logMutation({
            tenantId: existing.tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "recruitment.candidate.stage_changed",
            entityType: "JobCandidate",
            entityId: id,
            oldState: { stage: existing.stage },
            newState: { stage: updated.stage },
        }).catch(() => { });
        await outbox_service_1.OutboxService.createOutboxEvent({
            tenantId: existing.tenantId,
            eventType: "recruitment.candidate.stage_changed",
            entityType: "candidate",
            entityId: id,
            actorId: req.user?.userId || req.user?.id,
            payload: { fullName: updated.fullName, oldStage: existing.stage, newStage: updated.stage },
        }).catch(() => { });
        return res.json(updated);
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to update candidate stage." });
    }
});
// PUT /api/recruitment/candidates/:id/scorecard (Update Rating & Notes)
exports.recruitmentRouter.put("/candidates/:id/scorecard", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, interviewerNotes } = req.body;
        const tenantId = req.user?.tenantId;
        const existing = await prisma_1.prisma.jobCandidate.findUnique({ where: { id } });
        if (!existing || (tenantId && existing.tenantId !== tenantId)) {
            return res.status(404).json({ error: "Candidate not found." });
        }
        const updated = await prisma_1.prisma.jobCandidate.update({
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
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to update scorecard." });
    }
});
// POST /api/recruitment/candidates/:id/convert-to-employee (1-Click Hired to Staff Onboarding)
exports.recruitmentRouter.post("/candidates/:id/convert-to-employee", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        const candidate = await prisma_1.prisma.jobCandidate.findUnique({
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
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            await (0, workspace_policy_service_1.lockWorkspaceCapacity)(tx, candidate.tenantId, "employees");
            const cleanEmail = candidate.email.toLowerCase().trim();
            let userId;
            try {
                userId = await (0, auth_helpers_1.provisionEmployeeUser)(tx, {
                    tenantId: candidate.tenantId,
                    email: cleanEmail,
                    firstName,
                    lastName,
                    phone: candidate.phone,
                    password: "Password@123",
                });
            }
            catch (e) {
                throw e;
            }
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
                    employmentType: candidate.jobPosting?.employmentType || "full_time",
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
    }
    catch (err) {
        console.error("[convert-to-employee] error:", err);
        return res.status(err.status || 500).json({
            error: err.message || "Failed to convert candidate to employee.",
            code: err.code || (err.status === 409 ? "QUOTA_EXCEEDED" : "INTERNAL_ERROR"),
        });
    }
});
// POST /api/recruitment/candidates/:id/interviews (Schedule Interview)
exports.recruitmentRouter.post("/candidates/:id/interviews", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { interviewerId, interviewType, scheduledAt, meetingLink, feedback } = req.body;
        const tenantId = req.user?.tenantId;
        const candidate = await prisma_1.prisma.jobCandidate.findUnique({ where: { id } });
        if (!candidate || (tenantId && candidate.tenantId !== tenantId)) {
            return res.status(404).json({ error: "Candidate not found." });
        }
        const interview = await prisma_1.prisma.jobCandidateInterview.create({
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
            await prisma_1.prisma.jobCandidate.update({
                where: { id },
                data: { stage: "interview" },
            });
        }
        return res.status(201).json(interview);
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to schedule interview." });
    }
});
/**
 * =============================================================
 * PUBLIC CAREERS PORTAL ENDPOINTS (Public - No requireAuth)
 * =============================================================
 */
// GET /api/public/jobs/:tenantSlug (List published openings for a company)
exports.publicJobsRouter.get("/:tenantSlug", async (req, res) => {
    try {
        const { tenantSlug } = req.params;
        const tenant = await prisma_1.prisma.tenant.findFirst({
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
        const jobs = await prisma_1.prisma.jobPosting.findMany({
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
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to fetch careers." });
    }
});
// GET /api/public/jobs/:tenantSlug/:jobSlug (Single public job details)
exports.publicJobsRouter.get("/:tenantSlug/:jobSlug", async (req, res) => {
    try {
        const { tenantSlug, jobSlug } = req.params;
        const tenant = await prisma_1.prisma.tenant.findFirst({
            where: {
                OR: [{ slug: tenantSlug }, { id: tenantSlug }],
            },
        });
        if (!tenant) {
            return res.status(404).json({ error: "Company not found." });
        }
        const job = await prisma_1.prisma.jobPosting.findFirst({
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
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to fetch job details." });
    }
});
// POST /api/public/jobs/:jobId/apply (Public candidate application submission)
exports.publicJobsRouter.post("/:jobId/apply", (0, turnstile_middleware_1.requireTurnstile)("job_apply"), async (req, res) => {
    try {
        const { jobId } = req.params;
        const { fullName, email, phone, resumeUrl, portfolioUrl, coverLetter, yearsOfExperience, currentCompany, expectedSalary, } = req.body;
        if (!fullName || !email) {
            return res.status(400).json({ error: "Your full name and email are required to apply." });
        }
        const job = await prisma_1.prisma.jobPosting.findUnique({
            where: { id: jobId },
        });
        if (!job || job.status !== "published") {
            return res.status(400).json({ error: "This job opening is no longer accepting applications." });
        }
        // Check if duplicate application
        const existing = await prisma_1.prisma.jobCandidate.findFirst({
            where: {
                jobPostingId: job.id,
                email: email.trim().toLowerCase(),
            },
        });
        if (existing) {
            return res.status(400).json({ error: "You have already submitted an application for this position." });
        }
        const candidate = await prisma_1.prisma.jobCandidate.create({
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
    }
    catch (err) {
        console.error("[public/jobs/apply] error:", err);
        return res.status(err.status || 500).json({ error: err.message || "Failed to submit application." });
    }
});
/**
 * =============================================================
 * CAMPUS HIRING & DRIVES (Tenant isolated)
 * =============================================================
 */
// GET /api/recruitment/campus-candidates
exports.recruitmentRouter.get("/campus-candidates", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const { search, status, role, graduationYear } = req.query;
        const where = { tenantId };
        if (status && status !== "all") {
            where.status = String(status);
        }
        if (role && role !== "all") {
            where.jobRole = { contains: String(role) };
        }
        if (graduationYear && graduationYear !== "all") {
            where.graduationYear = String(graduationYear);
        }
        if (search) {
            where.OR = [
                { studentName: { contains: String(search) } },
                { email: { contains: String(search) } },
                { branch: { contains: String(search) } },
                { jobRole: { contains: String(search) } },
                { recruiterName: { contains: String(search) } },
            ];
        }
        const candidates = await prisma_1.prisma.campusCandidate.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });
        return res.json(candidates);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to list campus candidates." });
    }
});
// POST /api/recruitment/campus-candidates
exports.recruitmentRouter.post("/campus-candidates", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const roles = req.user?.roles || [];
        const isAuthorized = roles.some((r) => ["admin", "super_admin", "tenant_admin", "hr_admin"].includes(r));
        if (!isAuthorized) {
            return res.status(403).json({ error: "Forbidden: Insufficient privileges to add campus candidates." });
        }
        const { studentName, email, phone, avatarUrl, collegeName, branch, graduationYear, jobRole, recruiterName, recruiterId, status, } = req.body;
        if (!studentName || !graduationYear) {
            return res.status(400).json({ error: "Student Name and Graduation Year are required." });
        }
        // Verify recruiter if specified
        if (recruiterId) {
            const rec = await prisma_1.prisma.employee.findUnique({
                where: { id: recruiterId },
                select: { id: true, tenantId: true },
            });
            if (!rec || rec.tenantId !== tenantId) {
                return res.status(400).json({ error: "Invalid recruiter or cross-tenant recruiter rejected." });
            }
        }
        const candidate = await prisma_1.prisma.campusCandidate.create({
            data: {
                tenantId,
                studentName: studentName.trim(),
                email: email ? email.trim().toLowerCase() : "",
                phone: phone ? phone.trim() : null,
                avatarUrl: avatarUrl ? avatarUrl.trim() : null,
                collegeName: collegeName ? collegeName.trim() : null,
                branch: branch ? branch.trim() : "B.E/CSE",
                graduationYear: String(graduationYear).trim(),
                jobRole: jobRole ? jobRole.trim() : "Software Engineer",
                recruiterName: recruiterName ? recruiterName.trim() : null,
                recruiterId: recruiterId || null,
                status: status || "Applied",
            },
        });
        return res.status(201).json({
            success: true,
            message: "Campus candidate added successfully!",
            candidate,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to add campus candidate." });
    }
});
// PUT /api/recruitment/campus-candidates/:id
exports.recruitmentRouter.put("/campus-candidates/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const { id } = req.params;
        const existing = await prisma_1.prisma.campusCandidate.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== tenantId) {
            return res.status(404).json({ error: "Campus candidate not found." });
        }
        const { studentName, email, phone, avatarUrl, collegeName, branch, graduationYear, jobRole, recruiterName, status, } = req.body;
        const updated = await prisma_1.prisma.campusCandidate.update({
            where: { id },
            data: {
                ...(studentName && { studentName: studentName.trim() }),
                ...(email !== undefined && { email: email.trim().toLowerCase() }),
                ...(phone !== undefined && { phone: phone ? phone.trim() : null }),
                ...(avatarUrl !== undefined && { avatarUrl }),
                ...(collegeName !== undefined && { collegeName }),
                ...(branch && { branch: branch.trim() }),
                ...(graduationYear && { graduationYear: String(graduationYear).trim() }),
                ...(jobRole && { jobRole: jobRole.trim() }),
                ...(recruiterName !== undefined && { recruiterName }),
                ...(status && { status }),
            },
        });
        return res.json({
            success: true,
            message: "Candidate updated successfully.",
            candidate: updated,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to update candidate." });
    }
});
// DELETE /api/recruitment/campus-candidates/:id
exports.recruitmentRouter.delete("/campus-candidates/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const roles = req.user?.roles || [];
        const isAuthorized = roles.some((r) => ["admin", "super_admin", "tenant_admin", "hr_admin"].includes(r));
        if (!isAuthorized) {
            return res.status(403).json({ error: "Forbidden: Insufficient privileges to delete campus candidates." });
        }
        const { id } = req.params;
        const existing = await prisma_1.prisma.campusCandidate.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== tenantId) {
            return res.status(404).json({ error: "Campus candidate not found." });
        }
        await prisma_1.prisma.campusCandidate.delete({ where: { id } });
        return res.json({ success: true, message: "Campus candidate record deleted." });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to delete candidate." });
    }
});
/**
 * =============================================================
 * EMPLOYEE REFERRALS SYSTEM (Tenant isolated)
 * =============================================================
 */
// GET /api/recruitment/referrals
exports.recruitmentRouter.get("/referrals", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const { search, role, status } = req.query;
        const where = { tenantId };
        if (status && status !== "all") {
            where.status = String(status);
        }
        if (role && role !== "all") {
            where.jobTitle = { contains: String(role) };
        }
        if (search) {
            where.OR = [
                { referralCode: { contains: String(search) } },
                { jobTitle: { contains: String(search) } },
                { refereeName: { contains: String(search) } },
                { refereeEmail: { contains: String(search) } },
                { referrer: { firstName: { contains: String(search) } } },
                { referrer: { lastName: { contains: String(search) } } },
            ];
        }
        const referrals = await prisma_1.prisma.employeeReferral.findMany({
            where,
            include: {
                referrer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        position: true,
                        department: {
                            select: { id: true, name: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        return res.json(referrals);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to list employee referrals." });
    }
});
// POST /api/recruitment/referrals
exports.recruitmentRouter.post("/referrals", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const { referrerId, jobTitle, refereeName, refereeEmail, refereePhone, refereeAvatarUrl, bonusAmount, notes, } = req.body;
        if (!referrerId || !jobTitle || !refereeName || !refereeEmail) {
            return res.status(400).json({ error: "Referrer, Job Title, Referee Name, and Email are required." });
        }
        // Verify referrer employee belongs to tenant
        const referrer = await prisma_1.prisma.employee.findUnique({
            where: { id: referrerId },
            select: { id: true, tenantId: true },
        });
        if (!referrer || referrer.tenantId !== tenantId) {
            return res.status(400).json({ error: "Invalid referring employee or cross-tenant assignment rejected." });
        }
        const totalCount = await prisma_1.prisma.employeeReferral.count({ where: { tenantId } });
        const referralCode = `Reff-${String(totalCount + 1).padStart(3, "0")}`;
        const referral = await prisma_1.prisma.employeeReferral.create({
            data: {
                tenantId,
                referralCode,
                referrerId,
                jobTitle: jobTitle.trim(),
                refereeName: refereeName.trim(),
                refereeEmail: refereeEmail.trim().toLowerCase(),
                refereePhone: refereePhone ? refereePhone.trim() : null,
                refereeAvatarUrl: refereeAvatarUrl || null,
                bonusAmount: bonusAmount !== undefined ? Number(bonusAmount) : 100,
                status: "pending",
                notes: notes ? notes.trim() : null,
            },
            include: {
                referrer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        position: true,
                        department: { select: { id: true, name: true } },
                    },
                },
            },
        });
        return res.status(201).json({
            success: true,
            message: `Referral registered successfully (${referralCode})`,
            referral,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to create referral." });
    }
});
// PUT /api/recruitment/referrals/:id
exports.recruitmentRouter.put("/referrals/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const { id } = req.params;
        const existing = await prisma_1.prisma.employeeReferral.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== tenantId) {
            return res.status(404).json({ error: "Referral record not found." });
        }
        const { jobTitle, refereeName, refereeEmail, refereePhone, bonusAmount, status, notes } = req.body;
        const updated = await prisma_1.prisma.employeeReferral.update({
            where: { id },
            data: {
                ...(jobTitle && { jobTitle: jobTitle.trim() }),
                ...(refereeName && { refereeName: refereeName.trim() }),
                ...(refereeEmail && { refereeEmail: refereeEmail.trim().toLowerCase() }),
                ...(refereePhone !== undefined && { refereePhone }),
                ...(bonusAmount !== undefined && { bonusAmount: Number(bonusAmount) }),
                ...(status && { status }),
                ...(notes !== undefined && { notes }),
            },
            include: {
                referrer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        position: true,
                        department: true,
                    },
                },
            },
        });
        return res.json({
            success: true,
            message: "Referral updated successfully.",
            referral: updated,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to update referral." });
    }
});
// DELETE /api/recruitment/referrals/:id
exports.recruitmentRouter.delete("/referrals/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const roles = req.user?.roles || [];
        const isAuthorized = roles.some((r) => ["admin", "super_admin", "tenant_admin", "hr_admin"].includes(r));
        if (!isAuthorized) {
            return res.status(403).json({ error: "Forbidden: Insufficient privileges to delete referrals." });
        }
        const { id } = req.params;
        const existing = await prisma_1.prisma.employeeReferral.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== tenantId) {
            return res.status(404).json({ error: "Referral record not found." });
        }
        await prisma_1.prisma.employeeReferral.delete({ where: { id } });
        return res.json({ success: true, message: "Referral record deleted." });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to delete referral." });
    }
});
