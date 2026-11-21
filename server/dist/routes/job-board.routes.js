"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobBoardRouter = void 0;
const express_1 = require("express");
const job_board_service_1 = require("../services/job-board.service");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
exports.jobBoardRouter = (0, express_1.Router)();
/**
 * GET /api/job-board/public/:tenantId
 * Public discovery endpoint for active job postings
 */
exports.jobBoardRouter.get("/public/:tenantId", async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { departmentId, location, search } = req.query;
        const jobs = await job_board_service_1.JobBoardService.listPublishedJobs(tenantId, {
            departmentId: departmentId ? String(departmentId) : undefined,
            location: location ? String(location) : undefined,
            search: search ? String(search) : undefined,
        });
        return res.json({ jobs, total: jobs.length });
    }
    catch (err) {
        console.error("[job-board:public:list] error:", err);
        return res.status(500).json({ error: err.message || "Failed to load public job postings." });
    }
});
/**
 * POST /api/job-board/public/:tenantId/apply/:jobPostingId
 * Public candidate application submission
 */
exports.jobBoardRouter.post("/public/:tenantId/apply/:jobPostingId", async (req, res) => {
    try {
        const { tenantId, jobPostingId } = req.params;
        const { fullName, email, phone, resumeUrl, coverLetter, portfolioUrl, yearsOfExperience, expectedSalary } = req.body;
        if (!fullName || !email) {
            return res.status(400).json({ error: "Full name and email are required to apply." });
        }
        const application = await job_board_service_1.JobBoardService.submitApplication(tenantId, jobPostingId, {
            fullName,
            email,
            phone,
            resumeUrl,
            coverLetter,
            portfolioUrl,
            yearsOfExperience: yearsOfExperience ? Number(yearsOfExperience) : 0,
            expectedSalary: expectedSalary ? Number(expectedSalary) : undefined,
        });
        return res.status(201).json({ application });
    }
    catch (err) {
        console.error("[job-board:apply] error:", err);
        return res.status(500).json({ error: err.message || "Failed to submit application." });
    }
});
exports.jobBoardRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
/**
 * PUT /api/job-board/candidates/:candidateId/stage
 * Recruiter updates candidate stage
 */
exports.jobBoardRouter.put("/candidates/:candidateId/stage", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { stage, notes } = req.body;
        if (!stage) {
            return res.status(400).json({ error: "Candidate stage is required." });
        }
        const candidate = await job_board_service_1.JobBoardService.updateCandidateStage(tenantId, req.params.candidateId, stage, notes);
        return res.json({ candidate });
    }
    catch (err) {
        console.error("[job-board:stage:update] error:", err);
        return res.status(500).json({ error: err.message || "Failed to update candidate stage." });
    }
});
