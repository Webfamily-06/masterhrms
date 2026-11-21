import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { resolveTenantId } from "../lib/tenant";
import {
  FeedbackService,
  FeedbackTarget,
  FeedbackCategory,
  FeedbackStatus,
} from "../services/feedback.service";

export const feedbackRouter = Router();

feedbackRouter.use(requireAuth, resolveTenantContext);

// GET /api/feedback/metrics
feedbackRouter.get("/metrics", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const metrics = await FeedbackService.getMetrics(tenantId);
    return res.json({ success: true, metrics });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/feedback
feedbackRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { targetType, category, status, rating, search } = req.query;
    const submissions = await FeedbackService.listSubmissions(tenantId, {
      targetType: targetType as FeedbackTarget,
      category: category as FeedbackCategory,
      status: status as FeedbackStatus,
      rating: rating ? parseInt(String(rating), 10) : undefined,
      search: search as string,
    });
    return res.json({ success: true, submissions });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/feedback/:id
feedbackRouter.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const submission = await FeedbackService.getSubmission(tenantId, req.params.id);
    if (!submission) {
      return res.status(404).json({ success: false, error: "Feedback submission not found" });
    }
    return res.json({ success: true, submission });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/feedback
feedbackRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { targetType, category, rating, title, comments, submitterName, submitterEmail, isAnonymous } =
      req.body;

    if (!rating || !title || !comments) {
      return res.status(400).json({
        success: false,
        error: "Rating (1-5), title, and comments are required",
      });
    }

    const submission = await FeedbackService.submitFeedback(tenantId, {
      targetType,
      category,
      rating,
      title,
      comments,
      submitterName,
      submitterEmail,
      isAnonymous,
    });
    return res.status(201).json({ success: true, submission });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/feedback/:id/resolve
feedbackRouter.put("/:id/resolve", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const userId = req.user?.userId || "user_system";
    const { status, resolutionNotes } = req.body;

    if (!status || !resolutionNotes) {
      return res.status(400).json({
        success: false,
        error: "Status and resolutionNotes are required",
      });
    }

    const updated = await FeedbackService.resolveFeedback(
      tenantId,
      req.params.id,
      { status: status as FeedbackStatus, resolutionNotes },
      userId
    );
    return res.json({ success: true, submission: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
