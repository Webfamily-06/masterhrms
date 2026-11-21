"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleLeadsRouter = void 0;
const express_1 = require("express");
const google_leads_service_1 = require("../services/google-leads.service");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
exports.googleLeadsRouter = (0, express_1.Router)();
/**
 * POST /api/google-leads/webhook/:tenantId
 * Webhook endpoint for Google Ads Lead Form webhook delivery
 */
exports.googleLeadsRouter.post("/webhook/:tenantId", async (req, res) => {
    try {
        const { tenantId } = req.params;
        const payload = req.body;
        if (!payload || !payload.leadId) {
            return res.status(400).json({ error: "Invalid Google lead form payload: missing leadId" });
        }
        const result = await google_leads_service_1.GoogleLeadsService.ingestLead(tenantId, payload);
        return res.status(200).json(result);
    }
    catch (err) {
        console.error("[google-leads:webhook] error:", err);
        return res.status(500).json({ error: err.message || "Failed to ingest Google lead." });
    }
});
exports.googleLeadsRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
/**
 * GET /api/google-leads
 * List ingested leads for tenant
 */
exports.googleLeadsRouter.get("/", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const leads = await google_leads_service_1.GoogleLeadsService.listLeads(tenantId);
        return res.json({ leads, total: leads.length });
    }
    catch (err) {
        console.error("[google-leads:list] error:", err);
        return res.status(500).json({ error: err.message || "Failed to load Google leads." });
    }
});
