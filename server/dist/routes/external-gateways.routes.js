"use strict";
/**
 * MASTERHRMS — Phase 15 / Milestone 8.2: External Gateways Routes
 *
 * REST Endpoints for Social Channels, Telephony & Video Meeting Gateways:
 *   - ADDON-006: Instagram
 *   - ADDON-007: Facebook
 *   - ADDON-009: YouTube
 *   - ADDON-010: Telegram
 *   - ADDON-012: Slack Channel
 *   - ADDON-013: Discord
 *   - ADDON-014: HubSpot
 *   - ADDON-015: Nexmo SMS
 *   - ADDON-017: Vonage
 *   - ADDON-018: ClickSend SMS
 *   - ADDON-020: Google Meet
 *   - ADDON-022: Zoom
 *   - ADDON-023: Zoho
 *   - ADDON-024: Livestorm
 *   - ADDON-025: Amazon SES
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.externalGatewaysRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_1 = require("../lib/tenant");
const external_gateways_service_1 = require("../services/external-gateways.service");
exports.externalGatewaysRouter = (0, express_1.Router)();
const VALID_GATEWAYS = new Set([
    "instagram",
    "facebook",
    "youtube",
    "telegram",
    "slack",
    "discord",
    "hubspot",
    "nexmo",
    "vonage",
    "clicksend",
    "google_meet",
    "zoom",
    "zoho",
    "livestorm",
    "amazon_ses",
    // Phase 16: Automation, Calendars & Collaboration Webhooks
    "google_calendar",
    "outlook_calendar",
    "zapier",
    "make",
    "n8n",
    "indiamart",
    "sendinblue",
    "onenote",
    "trello",
    "jira",
    "google_analytics",
    // Phase 17: Workspace Cloud, E-Commerce & Service Desks
    "google_slides",
    "whmcs",
    "google_forms",
    "google_wallet",
    "mailchimp",
    "salesforce",
    "onedrive",
    "zendesk",
    // Phase 18: Enterprise Finance, Banking & International E-Invoicing
    "quickbooks",
    "sage",
    "xero",
    "plaid",
    "zatca",
    "european_einvoice",
    "outlook_mail",
]);
function validateGatewayParam(gateway) {
    const normalized = gateway.toLowerCase();
    return VALID_GATEWAYS.has(normalized) ? normalized : null;
}
/**
 * GET /api/external-gateways/config
 * Retrieve configuration status across all 15 gateways (secrets masked)
 */
exports.externalGatewaysRouter.get("/config", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const configs = await external_gateways_service_1.ExternalGatewaysService.getAllConfigs(tenantId);
        return res.json({ success: true, configs });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to retrieve gateway configurations." });
    }
});
/**
 * POST /api/external-gateways/config/:gateway
 * Save credentials and toggle settings for a gateway
 */
exports.externalGatewaysRouter.post("/config/:gateway", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const gateway = validateGatewayParam(req.params.gateway);
        if (!gateway) {
            return res.status(400).json({ error: `Invalid or unsupported gateway: ${req.params.gateway}` });
        }
        const result = await external_gateways_service_1.ExternalGatewaysService.saveConfig(tenantId, gateway, req.body, req.user?.id);
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to save gateway configuration." });
    }
});
/**
 * POST /api/external-gateways/test/:gateway
 * Test connectivity in sandbox or live mode
 */
exports.externalGatewaysRouter.post("/test/:gateway", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const gateway = validateGatewayParam(req.params.gateway);
        if (!gateway) {
            return res.status(400).json({ error: `Invalid or unsupported gateway: ${req.params.gateway}` });
        }
        const result = await external_gateways_service_1.ExternalGatewaysService.testConnection(tenantId, gateway, req.user?.id);
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Gateway connectivity test failed." });
    }
});
/**
 * POST /api/external-gateways/dispatch/:gateway
 * Execute outbound dispatch to external gateway
 */
exports.externalGatewaysRouter.post("/dispatch/:gateway", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const gateway = validateGatewayParam(req.params.gateway);
        if (!gateway) {
            return res.status(400).json({ error: `Invalid or unsupported gateway: ${req.params.gateway}` });
        }
        let result = null;
        switch (gateway) {
            case "instagram":
                result = await external_gateways_service_1.ExternalGatewaysService.publishInstagramMedia(tenantId, req.body);
                break;
            case "facebook":
                result = await external_gateways_service_1.ExternalGatewaysService.publishFacebookFeedPost(tenantId, req.body);
                break;
            case "youtube":
                result = await external_gateways_service_1.ExternalGatewaysService.broadcastYouTubeNotification(tenantId, req.body);
                break;
            case "telegram":
                result = await external_gateways_service_1.ExternalGatewaysService.sendTelegramMessage(tenantId, req.body);
                break;
            case "slack":
                result = await external_gateways_service_1.ExternalGatewaysService.sendSlackChannelAlert(tenantId, req.body);
                break;
            case "discord":
                result = await external_gateways_service_1.ExternalGatewaysService.sendDiscordWebhook(tenantId, req.body);
                break;
            case "hubspot":
                result = await external_gateways_service_1.ExternalGatewaysService.syncHubSpotContact(tenantId, req.body);
                break;
            case "nexmo":
                result = await external_gateways_service_1.ExternalGatewaysService.sendNexmoSms(tenantId, req.body);
                break;
            case "vonage":
                result = await external_gateways_service_1.ExternalGatewaysService.triggerVonageVerification(tenantId, req.body);
                break;
            case "clicksend":
                result = await external_gateways_service_1.ExternalGatewaysService.sendClickSendSms(tenantId, req.body);
                break;
            case "google_meet":
                result = await external_gateways_service_1.ExternalGatewaysService.generateGoogleMeetLink(tenantId, req.body);
                break;
            case "zoom":
                result = await external_gateways_service_1.ExternalGatewaysService.createZoomMeetingSession(tenantId, req.body);
                break;
            case "zoho":
                result = await external_gateways_service_1.ExternalGatewaysService.syncZohoLeadRecord(tenantId, req.body);
                break;
            case "livestorm":
                result = await external_gateways_service_1.ExternalGatewaysService.createLivestormSession(tenantId, req.body);
                break;
            case "amazon_ses":
                result = await external_gateways_service_1.ExternalGatewaysService.sendAmazonSesEmail(tenantId, req.body);
                break;
            // Phase 16: Automation, Calendars & Collaboration Webhooks
            case "google_calendar":
                result = await external_gateways_service_1.ExternalGatewaysService.createGoogleCalendarEvent(tenantId, req.body);
                break;
            case "outlook_calendar":
                result = await external_gateways_service_1.ExternalGatewaysService.createOutlookCalendarEvent(tenantId, req.body);
                break;
            case "zapier":
                result = await external_gateways_service_1.ExternalGatewaysService.triggerZapierWebhook(tenantId, req.body);
                break;
            case "make":
                result = await external_gateways_service_1.ExternalGatewaysService.triggerMakeScenario(tenantId, req.body);
                break;
            case "n8n":
                result = await external_gateways_service_1.ExternalGatewaysService.triggerN8nWorkflow(tenantId, req.body);
                break;
            case "indiamart":
                result = await external_gateways_service_1.ExternalGatewaysService.ingestIndiaMartLead(tenantId, req.body);
                break;
            case "sendinblue":
                result = await external_gateways_service_1.ExternalGatewaysService.sendSendinblueEmail(tenantId, req.body);
                break;
            case "onenote":
                result = await external_gateways_service_1.ExternalGatewaysService.createOneNotePage(tenantId, req.body);
                break;
            case "trello":
                result = await external_gateways_service_1.ExternalGatewaysService.createTrelloCard(tenantId, req.body);
                break;
            case "jira":
                result = await external_gateways_service_1.ExternalGatewaysService.createJiraIssue(tenantId, req.body);
                break;
            case "google_analytics":
                result = await external_gateways_service_1.ExternalGatewaysService.trackGoogleAnalyticsEvent(tenantId, req.body);
                break;
            // Phase 17: Workspace Cloud, E-Commerce & Service Desks
            case "google_slides":
                result = await external_gateways_service_1.ExternalGatewaysService.createGoogleSlidesPresentation(tenantId, req.body);
                break;
            case "whmcs":
                result = await external_gateways_service_1.ExternalGatewaysService.createWhmcsInvoice(tenantId, req.body);
                break;
            case "google_forms":
                result = await external_gateways_service_1.ExternalGatewaysService.ingestGoogleFormsResponse(tenantId, req.body);
                break;
            case "google_wallet":
                result = await external_gateways_service_1.ExternalGatewaysService.issueGoogleWalletPass(tenantId, req.body);
                break;
            case "mailchimp":
                result = await external_gateways_service_1.ExternalGatewaysService.syncMailchimpSubscriber(tenantId, req.body);
                break;
            case "salesforce":
                result = await external_gateways_service_1.ExternalGatewaysService.syncSalesforceLead(tenantId, req.body);
                break;
            case "onedrive":
                result = await external_gateways_service_1.ExternalGatewaysService.syncOneDriveFile(tenantId, req.body);
                break;
            case "zendesk":
                result = await external_gateways_service_1.ExternalGatewaysService.createZendeskTicket(tenantId, req.body);
                break;
            // Phase 18: Enterprise Finance, Banking & International E-Invoicing
            case "quickbooks":
                result = await external_gateways_service_1.ExternalGatewaysService.createQuickBooksInvoice(tenantId, req.body);
                break;
            case "sage":
                result = await external_gateways_service_1.ExternalGatewaysService.createSageInvoice(tenantId, req.body);
                break;
            case "xero":
                result = await external_gateways_service_1.ExternalGatewaysService.createXeroInvoice(tenantId, req.body);
                break;
            case "plaid":
                if (req.body?.action === "fetch_accounts") {
                    result = await external_gateways_service_1.ExternalGatewaysService.fetchPlaidAccounts(tenantId, req.body);
                }
                else {
                    result = await external_gateways_service_1.ExternalGatewaysService.createPlaidLinkToken(tenantId, req.body);
                }
                break;
            case "zatca":
                result = await external_gateways_service_1.ExternalGatewaysService.generateZatcaEInvoice(tenantId, req.body);
                break;
            case "european_einvoice":
                result = await external_gateways_service_1.ExternalGatewaysService.generateEuropeanEInvoice(tenantId, req.body);
                break;
            case "outlook_mail":
                result = await external_gateways_service_1.ExternalGatewaysService.sendOutlookMail(tenantId, req.body);
                break;
            default:
                return res.status(400).json({ error: `No handler implemented for gateway ${gateway}` });
        }
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to execute gateway dispatch." });
    }
});
/**
 * GET /api/external-gateways/logs
 * Retrieve recent dispatch logs for tenant
 */
exports.externalGatewaysRouter.get("/logs", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const logs = external_gateways_service_1.ExternalGatewaysService.getLogs(tenantId);
        return res.json({ success: true, count: logs.length, logs });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to retrieve gateway logs." });
    }
});
