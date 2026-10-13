import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { requireEntitlement } from "../middleware/entitlements";
import { AiBusinessAdvisorService } from "../services/ai-business-advisor.service";

export const aiBusinessAdvisorRouter = Router();

// Guard with Authentication, Tenant Context & Add-on Entitlement
aiBusinessAdvisorRouter.use(requireAuth, resolveTenantContext, requireEntitlement("ai-business-advisor"));

// GET /api/ai-business-advisor/dashboard
aiBusinessAdvisorRouter.get("/dashboard", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const date = req.query.date as string | undefined;
    const data = await AiBusinessAdvisorService.getOrGenerateDailyAnalysis(tenantId, date, false);
    return res.json({ success: true, data });
  } catch (error: any) {
    console.error("AI Advisor Dashboard Error:", error);
    return res.status(500).json({ error: error.message || "Failed to load advisor dashboard" });
  }
});

// POST /api/ai-business-advisor/generate - "Generate Now" action
aiBusinessAdvisorRouter.post("/generate", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const force = req.body?.force === true;
    const date = req.body?.date as string | undefined;
    const data = await AiBusinessAdvisorService.getOrGenerateDailyAnalysis(tenantId, date, force || true);
    return res.json({ success: true, data, message: "Fresh AI Business Analysis generated successfully." });
  } catch (error: any) {
    console.error("AI Advisor Generate Error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate AI analysis" });
  }
});

// POST /api/ai-business-advisor/insights/:id/dismiss
aiBusinessAdvisorRouter.post("/insights/:id/dismiss", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const { id } = req.params;
    const date = req.body?.date as string | undefined;
    const data = await AiBusinessAdvisorService.dismissInsight(tenantId, id, date);
    return res.json({ success: true, data, message: "Insight dismissed." });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to dismiss insight" });
  }
});

// POST /api/ai-business-advisor/recommendations/:id/status
aiBusinessAdvisorRouter.post("/recommendations/:id/status", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const { id } = req.params;
    const status = req.body?.status as "completed" | "dismissed";
    const date = req.body?.date as string | undefined;
    if (!status || !["completed", "dismissed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status: must be 'completed' or 'dismissed'" });
    }
    const data = await AiBusinessAdvisorService.updateRecommendationStatus(tenantId, id, status, date);
    return res.json({ success: true, data, message: `Recommendation marked as ${status}.` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to update recommendation" });
  }
});

// POST /api/ai-business-advisor/alerts/:id/resolve
aiBusinessAdvisorRouter.post("/alerts/:id/resolve", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const { id } = req.params;
    const date = req.body?.date as string | undefined;
    const data = await AiBusinessAdvisorService.resolveAlert(tenantId, id, date);
    return res.json({ success: true, data, message: "Alert resolved." });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to resolve alert" });
  }
});

// GET /api/ai-business-advisor/config
aiBusinessAdvisorRouter.get("/config", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const config = await AiBusinessAdvisorService.getConfig(tenantId);
    return res.json({ success: true, config });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch AI configuration" });
  }
});

// POST /api/ai-business-advisor/config
aiBusinessAdvisorRouter.post("/config", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const { provider, model, apiKey, retentionDays } = req.body;
    await AiBusinessAdvisorService.saveConfig(tenantId, { provider, model, apiKey, retentionDays });
    return res.json({ success: true, message: "AI Business Advisor settings updated." });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to save AI configuration" });
  }
});
