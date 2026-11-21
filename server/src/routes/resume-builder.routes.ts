import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { resolveTenantId } from "../lib/tenant";
import { ResumeBuilderService } from "../services/resume-builder.service";

export const resumeBuilderRouter = Router();

resumeBuilderRouter.use(requireAuth, resolveTenantContext);

// GET /api/resume-builder
resumeBuilderRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { candidateId, employeeId, search } = req.query;
    const resumes = await ResumeBuilderService.listResumes(tenantId, {
      candidateId: candidateId as string,
      employeeId: employeeId as string,
      search: search as string,
    });
    return res.json({ success: true, resumes });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/resume-builder/:id
resumeBuilderRouter.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const resume = await ResumeBuilderService.getResume(tenantId, req.params.id);
    if (!resume) {
      return res.status(404).json({ success: false, error: "Resume not found" });
    }
    return res.json({ success: true, resume });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/resume-builder
resumeBuilderRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const userId = req.user?.userId || "user_system";
    const { title, fullName, email, summary } = req.body;

    if (!title || !fullName || !email || !summary) {
      return res.status(400).json({
        success: false,
        error: "title, fullName, email, and summary are required",
      });
    }

    const resume = await ResumeBuilderService.createResume(tenantId, req.body, userId);
    return res.status(201).json({ success: true, resume });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/resume-builder/:id
resumeBuilderRouter.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const updated = await ResumeBuilderService.updateResume(tenantId, req.params.id, req.body);
    return res.json({ success: true, resume: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/resume-builder/:id
resumeBuilderRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const deleted = await ResumeBuilderService.deleteResume(tenantId, req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Resume not found" });
    }
    return res.json({ success: true, message: "Resume deleted" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
