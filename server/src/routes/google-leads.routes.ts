import { Router, Request, Response } from "express";
import { GoogleLeadsService } from "../services/google-leads.service";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";

export const googleLeadsRouter = Router();

/**
 * POST /api/google-leads/webhook/:tenantId
 * Webhook endpoint for Google Ads Lead Form webhook delivery
 */
googleLeadsRouter.post("/webhook/:tenantId", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const payload = req.body;

    if (!payload || !payload.leadId) {
      return res.status(400).json({ error: "Invalid Google lead form payload: missing leadId" });
    }

    const result = await GoogleLeadsService.ingestLead(tenantId, payload);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error("[google-leads:webhook] error:", err);
    return res.status(500).json({ error: err.message || "Failed to ingest Google lead." });
  }
});

googleLeadsRouter.use(requireAuth, resolveTenantContext as any);

/**
 * GET /api/google-leads
 * List ingested leads for tenant
 */
googleLeadsRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const leads = await GoogleLeadsService.listLeads(tenantId);
    return res.json({ leads, total: leads.length });
  } catch (err: any) {
    console.error("[google-leads:list] error:", err);
    return res.status(500).json({ error: err.message || "Failed to load Google leads." });
  }
});
