import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { resolveTenantId } from "../lib/tenant";
import { NewsletterService, SubscriberStatus, CampaignStatus } from "../services/newsletter.service";

export const newsletterRouter = Router();

newsletterRouter.use(requireAuth, resolveTenantContext);

// GET /api/newsletter/stats
newsletterRouter.get("/stats", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const stats = await NewsletterService.getStats(tenantId);
    return res.json({ success: true, stats });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/newsletter/subscribers
newsletterRouter.get("/subscribers", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { status, tag, search } = req.query;
    const subscribers = await NewsletterService.listSubscribers(tenantId, {
      status: status as SubscriberStatus,
      tag: tag as string,
      search: search as string,
    });
    return res.json({ success: true, subscribers });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/newsletter/subscribers
newsletterRouter.post("/subscribers", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { email, name, tags, source } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ success: false, error: "Valid email address is required" });
    }

    const subscriber = await NewsletterService.addSubscriber(tenantId, { email, name, tags, source });
    return res.status(201).json({ success: true, subscriber });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/newsletter/unsubscribe
newsletterRouter.post("/unsubscribe", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email address is required" });
    }

    const unsubscribed = await NewsletterService.unsubscribe(tenantId, email);
    return res.json({ success: true, unsubscribed });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/newsletter/campaigns
newsletterRouter.get("/campaigns", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { status } = req.query;
    const campaigns = await NewsletterService.listCampaigns(tenantId, status as CampaignStatus);
    return res.json({ success: true, campaigns });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/newsletter/campaigns/:id
newsletterRouter.get("/campaigns/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const campaign = await NewsletterService.getCampaign(tenantId, req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, error: "Campaign not found" });
    }
    return res.json({ success: true, campaign });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/newsletter/campaigns
newsletterRouter.post("/campaigns", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const userId = req.user?.userId || "user_system";
    const { title, subject, previewText, contentHtml, targetTags, scheduledAt } = req.body;

    if (!title || !subject || !contentHtml) {
      return res.status(400).json({ success: false, error: "Title, subject, and contentHtml are required" });
    }

    const campaign = await NewsletterService.createCampaign(
      tenantId,
      { title, subject, previewText, contentHtml, targetTags, scheduledAt },
      userId
    );
    return res.status(201).json({ success: true, campaign });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/newsletter/campaigns/:id/send
newsletterRouter.post("/campaigns/:id/send", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const campaign = await NewsletterService.sendCampaign(tenantId, req.params.id);
    return res.json({ success: true, campaign });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
