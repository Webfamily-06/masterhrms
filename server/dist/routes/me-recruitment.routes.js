"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meRecruitmentRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_context_1 = require("../context/tenant-context");
exports.meRecruitmentRouter = (0, express_1.Router)();
// =========================================================================
// 1. INTERNAL JOB BOARD (/me/recruitment/job-postings)
// =========================================================================
exports.meRecruitmentRouter.get("/job-postings", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_1.getTenantDb)();
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch internal job postings." });
    }
});
// Apply internally
exports.meRecruitmentRouter.post("/job-postings/:id/apply", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const user = req.user;
        const userId = user.userId || user.id;
        const db = (0, tenant_context_1.getTenantDb)();
        const employee = await db.employee.findFirst({
            where: { tenantId, userId },
        });
        const job = await db.jobPosting.findFirst({
            where: { id: req.params.id, tenantId, status: "published" },
        });
        if (!job)
            return res.status(404).json({ error: "Job posting not available for internal application." });
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// =========================================================================
// 2. MY INTERVIEWS PANEL (/me/recruitment/interviews)
// =========================================================================
exports.meRecruitmentRouter.get("/interviews", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId || req.user?.id;
        const db = (0, tenant_context_1.getTenantDb)();
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// =========================================================================
// 3. MY ONBOARDING TASKS (/me/recruitment/onboarding)
// =========================================================================
exports.meRecruitmentRouter.get("/onboarding", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_1.getTenantDb)();
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// =========================================================================
// 4. MY ASSESSMENTS (/me/recruitment/assessments)
// =========================================================================
exports.meRecruitmentRouter.get("/assessments", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_1.getTenantDb)();
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// =========================================================================
// 5. MY CAREER & REFERRALS (/me/recruitment/career)
// =========================================================================
exports.meRecruitmentRouter.get("/career", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId || req.user?.id;
        const db = (0, tenant_context_1.getTenantDb)();
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
