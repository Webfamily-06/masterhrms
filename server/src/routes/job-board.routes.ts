import { Router, Request, Response } from "express";
import { JobBoardService } from "../services/job-board.service";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";

export const jobBoardRouter = Router();

/**
 * GET /api/job-board/public/:tenantId
 * Public discovery endpoint for active job postings
 */
jobBoardRouter.get("/public/:tenantId", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { departmentId, location, search } = req.query;

    const jobs = await JobBoardService.listPublishedJobs(tenantId, {
      departmentId: departmentId ? String(departmentId) : undefined,
      location: location ? String(location) : undefined,
      search: search ? String(search) : undefined,
    });

    return res.json({ jobs, total: jobs.length });
  } catch (err: any) {
    console.error("[job-board:public:list] error:", err);
    return res.status(500).json({ error: err.message || "Failed to load public job postings." });
  }
});

/**
 * POST /api/job-board/public/:tenantId/apply/:jobPostingId
 * Public candidate application submission
 */
jobBoardRouter.post("/public/:tenantId/apply/:jobPostingId", async (req: Request, res: Response) => {
  try {
    const { tenantId, jobPostingId } = req.params;
    const { fullName, email, phone, resumeUrl, coverLetter, portfolioUrl, yearsOfExperience, expectedSalary } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({ error: "Full name and email are required to apply." });
    }

    const application = await JobBoardService.submitApplication(tenantId, jobPostingId, {
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
  } catch (err: any) {
    console.error("[job-board:apply] error:", err);
    return res.status(500).json({ error: err.message || "Failed to submit application." });
  }
});

jobBoardRouter.use(requireAuth, resolveTenantContext as any);

/**
 * PUT /api/job-board/candidates/:candidateId/stage
 * Recruiter updates candidate stage
 */
jobBoardRouter.put("/candidates/:candidateId/stage", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { stage, notes } = req.body;

    if (!stage) {
      return res.status(400).json({ error: "Candidate stage is required." });
    }

    const candidate = await JobBoardService.updateCandidateStage(tenantId, req.params.candidateId, stage, notes);
    return res.json({ candidate });
  } catch (err: any) {
    console.error("[job-board:stage:update] error:", err);
    return res.status(500).json({ error: err.message || "Failed to update candidate stage." });
  }
});
