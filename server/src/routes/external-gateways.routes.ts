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

import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantId } from "../lib/tenant";
import { ExternalGatewaysService, GatewayKey } from "../services/external-gateways.service";

export const externalGatewaysRouter = Router();

const VALID_GATEWAYS = new Set<GatewayKey>([
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
]);

function validateGatewayParam(gateway: string): GatewayKey | null {
  const normalized = gateway.toLowerCase() as GatewayKey;
  return VALID_GATEWAYS.has(normalized) ? normalized : null;
}

/**
 * GET /api/external-gateways/config
 * Retrieve configuration status across all 15 gateways (secrets masked)
 */
externalGatewaysRouter.get("/config", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const configs = await ExternalGatewaysService.getAllConfigs(tenantId);
    return res.json({ success: true, configs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to retrieve gateway configurations." });
  }
});

/**
 * POST /api/external-gateways/config/:gateway
 * Save credentials and toggle settings for a gateway
 */
externalGatewaysRouter.post("/config/:gateway", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const gateway = validateGatewayParam(req.params.gateway);
    if (!gateway) {
      return res.status(400).json({ error: `Invalid or unsupported gateway: ${req.params.gateway}` });
    }

    const result = await ExternalGatewaysService.saveConfig(tenantId, gateway, req.body, req.user?.id);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to save gateway configuration." });
  }
});

/**
 * POST /api/external-gateways/test/:gateway
 * Test connectivity in sandbox or live mode
 */
externalGatewaysRouter.post("/test/:gateway", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const gateway = validateGatewayParam(req.params.gateway);
    if (!gateway) {
      return res.status(400).json({ error: `Invalid or unsupported gateway: ${req.params.gateway}` });
    }

    const result = await ExternalGatewaysService.testConnection(tenantId, gateway, req.user?.id);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Gateway connectivity test failed." });
  }
});

/**
 * POST /api/external-gateways/dispatch/:gateway
 * Execute outbound dispatch to external gateway
 */
externalGatewaysRouter.post("/dispatch/:gateway", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const gateway = validateGatewayParam(req.params.gateway);
    if (!gateway) {
      return res.status(400).json({ error: `Invalid or unsupported gateway: ${req.params.gateway}` });
    }

    let result: any = null;

    switch (gateway) {
      case "instagram":
        result = await ExternalGatewaysService.publishInstagramMedia(tenantId, req.body);
        break;
      case "facebook":
        result = await ExternalGatewaysService.publishFacebookFeedPost(tenantId, req.body);
        break;
      case "youtube":
        result = await ExternalGatewaysService.broadcastYouTubeNotification(tenantId, req.body);
        break;
      case "telegram":
        result = await ExternalGatewaysService.sendTelegramMessage(tenantId, req.body);
        break;
      case "slack":
        result = await ExternalGatewaysService.sendSlackChannelAlert(tenantId, req.body);
        break;
      case "discord":
        result = await ExternalGatewaysService.sendDiscordWebhook(tenantId, req.body);
        break;
      case "hubspot":
        result = await ExternalGatewaysService.syncHubSpotContact(tenantId, req.body);
        break;
      case "nexmo":
        result = await ExternalGatewaysService.sendNexmoSms(tenantId, req.body);
        break;
      case "vonage":
        result = await ExternalGatewaysService.triggerVonageVerification(tenantId, req.body);
        break;
      case "clicksend":
        result = await ExternalGatewaysService.sendClickSendSms(tenantId, req.body);
        break;
      case "google_meet":
        result = await ExternalGatewaysService.generateGoogleMeetLink(tenantId, req.body);
        break;
      case "zoom":
        result = await ExternalGatewaysService.createZoomMeetingSession(tenantId, req.body);
        break;
      case "zoho":
        result = await ExternalGatewaysService.syncZohoLeadRecord(tenantId, req.body);
        break;
      case "livestorm":
        result = await ExternalGatewaysService.createLivestormSession(tenantId, req.body);
        break;
      case "amazon_ses":
        result = await ExternalGatewaysService.sendAmazonSesEmail(tenantId, req.body);
        break;
      // Phase 16: Automation, Calendars & Collaboration Webhooks
      case "google_calendar":
        result = await ExternalGatewaysService.createGoogleCalendarEvent(tenantId, req.body);
        break;
      case "outlook_calendar":
        result = await ExternalGatewaysService.createOutlookCalendarEvent(tenantId, req.body);
        break;
      case "zapier":
        result = await ExternalGatewaysService.triggerZapierWebhook(tenantId, req.body);
        break;
      case "make":
        result = await ExternalGatewaysService.triggerMakeScenario(tenantId, req.body);
        break;
      case "n8n":
        result = await ExternalGatewaysService.triggerN8nWorkflow(tenantId, req.body);
        break;
      case "indiamart":
        result = await ExternalGatewaysService.ingestIndiaMartLead(tenantId, req.body);
        break;
      case "sendinblue":
        result = await ExternalGatewaysService.sendSendinblueEmail(tenantId, req.body);
        break;
      case "onenote":
        result = await ExternalGatewaysService.createOneNotePage(tenantId, req.body);
        break;
      case "trello":
        result = await ExternalGatewaysService.createTrelloCard(tenantId, req.body);
        break;
      case "jira":
        result = await ExternalGatewaysService.createJiraIssue(tenantId, req.body);
        break;
      case "google_analytics":
        result = await ExternalGatewaysService.trackGoogleAnalyticsEvent(tenantId, req.body);
        break;
      // Phase 17: Workspace Cloud, E-Commerce & Service Desks
      case "google_slides":
        result = await ExternalGatewaysService.createGoogleSlidesPresentation(tenantId, req.body);
        break;
      case "whmcs":
        result = await ExternalGatewaysService.createWhmcsInvoice(tenantId, req.body);
        break;
      case "google_forms":
        result = await ExternalGatewaysService.ingestGoogleFormsResponse(tenantId, req.body);
        break;
      case "google_wallet":
        result = await ExternalGatewaysService.issueGoogleWalletPass(tenantId, req.body);
        break;
      case "mailchimp":
        result = await ExternalGatewaysService.syncMailchimpSubscriber(tenantId, req.body);
        break;
      case "salesforce":
        result = await ExternalGatewaysService.syncSalesforceLead(tenantId, req.body);
        break;
      case "onedrive":
        result = await ExternalGatewaysService.syncOneDriveFile(tenantId, req.body);
        break;
      case "zendesk":
        result = await ExternalGatewaysService.createZendeskTicket(tenantId, req.body);
        break;
      default:
        return res.status(400).json({ error: `No handler implemented for gateway ${gateway}` });
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to execute gateway dispatch." });
  }
});

/**
 * GET /api/external-gateways/logs
 * Retrieve recent dispatch logs for tenant
 */
externalGatewaysRouter.get("/logs", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const logs = ExternalGatewaysService.getLogs(tenantId);
    return res.json({ success: true, count: logs.length, logs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to retrieve gateway logs." });
  }
});
