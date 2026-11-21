/**
 * MASTERHRMS — Phase 15 / Milestone 8.2: External Communication & Meeting Gateways Test Suite
 *
 * Comprehensive empirical verification for:
 *   - ADDON-006: Instagram Media Publisher & Webhook
 *   - ADDON-007: Facebook Page Feed Publisher
 *   - ADDON-009: YouTube Live Broadcast Notifier
 *   - ADDON-010: Telegram Bot Message Dispatcher
 *   - ADDON-012: Slack Channel Webhook & Notifier
 *   - ADDON-013: Discord Webhook Alert Dispatcher
 *   - ADDON-014: HubSpot CRM Contact & Deal Sync
 *   - ADDON-015: Nexmo SMS Gateway
 *   - ADDON-017: Vonage Telephony & Verification
 *   - ADDON-018: ClickSend SMS Gateway
 *   - ADDON-020: Google Meet Video Conference Bridge
 *   - ADDON-022: Zoom Video Conferencing Session Adapter
 *   - ADDON-023: Zoho CRM Lead & Contact Adapter
 *   - ADDON-024: Livestorm Webinar & Session Bridge
 *   - ADDON-025: Amazon SES Enterprise Email Gateway
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { rawPrisma } from "../prisma";
import { ExternalGatewaysService } from "../services/external-gateways.service";

describe("Phase 15 / Milestone 8.2 — External Communication & Meeting Gateways Test Suite", () => {
  const testTenantIdA = `tenant-gw-test-a-${Date.now()}`;
  const testTenantIdB = `tenant-gw-test-b-${Date.now()}`;
  let originalFetch: typeof global.fetch;

  before(async () => {
    originalFetch = global.fetch;

    // Create test tenants
    await rawPrisma.tenant.create({
      data: {
        id: testTenantIdA,
        name: "Gateway Test Tenant Alpha",
        slug: `gw-tenant-a-${Date.now()}`,
        currency: "USD",
      },
    });

    await rawPrisma.tenant.create({
      data: {
        id: testTenantIdB,
        name: "Gateway Test Tenant Beta",
        slug: `gw-tenant-b-${Date.now()}`,
        currency: "EUR",
      },
    });
  });

  after(async () => {
    global.fetch = originalFetch;

    await rawPrisma.setting.deleteMany({
      where: { scope: "TENANT", scopeId: { in: [testTenantIdA, testTenantIdB] } },
    });
    await rawPrisma.auditLog.deleteMany({
      where: { tenantId: { in: [testTenantIdA, testTenantIdB] } },
    });
    await rawPrisma.tenant.deleteMany({
      where: { id: { in: [testTenantIdA, testTenantIdB] } },
    });
  });

  beforeEach(() => {
    global.fetch = originalFetch;
  });

  // ==========================================================================
  // SECTION 1: Social Media & Channel Notifiers (ADDON-006, 007, 009, 010, 012, 013)
  // ==========================================================================
  describe("1. Social Media & Bot Channel Gateways", () => {
    it("ADDON-006: Instagram Media Publisher handles sandbox & live Graph API media creation", async () => {
      // 1. Save config
      await ExternalGatewaysService.saveConfig(testTenantIdA, "instagram", {
        enabled: true,
        sandboxMode: false,
        accessToken: "EAAG_mock_instagram_token_123",
        identifier: "17841400000000001",
      });

      // 2. Mock Graph API
      global.fetch = async (url: any, init?: any): Promise<any> => {
        const urlStr = String(url);
        if (urlStr.includes("graph.facebook.com/v19.0/17841400000000001/media")) {
          return {
            ok: true,
            json: async () => ({ id: "17900000000000001" }),
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      };

      const result = await ExternalGatewaysService.publishInstagramMedia(testTenantIdA, {
        caption: "Exciting new enterprise product launch! #MasterHRMS",
        imageUrl: "https://masterhrms.com/assets/product-launch.jpg",
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.gateway, "instagram");
      assert.strictEqual(result.simulated, false);
      assert.strictEqual(result.mediaId, "17900000000000001");

      // Verify sandbox fallback
      await ExternalGatewaysService.saveConfig(testTenantIdA, "instagram", { sandboxMode: true });
      const sandResult = await ExternalGatewaysService.publishInstagramMedia(testTenantIdA, {
        caption: "Sandbox test post",
        imageUrl: "https://masterhrms.com/test.jpg",
      });
      assert.strictEqual(sandResult.simulated, true);
      assert.ok(sandResult.mediaId.startsWith("ig_sim_"));
    });

    it("ADDON-007: Facebook Page Feed Publisher creates feed post with links", async () => {
      await ExternalGatewaysService.saveConfig(testTenantIdA, "facebook", {
        enabled: true,
        sandboxMode: false,
        accessToken: "EAAG_mock_facebook_page_token_456",
        identifier: "102030405060",
      });

      global.fetch = async (url: any): Promise<any> => {
        const urlStr = String(url);
        if (urlStr.includes("graph.facebook.com/v19.0/102030405060/feed")) {
          return {
            ok: true,
            json: async () => ({ id: "102030405060_987654321" }),
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      };

      const result = await ExternalGatewaysService.publishFacebookFeedPost(testTenantIdA, {
        message: "Check out our latest quarterly performance report!",
        link: "https://masterhrms.com/reports/q4",
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.gateway, "facebook");
      assert.strictEqual(result.simulated, false);
      assert.strictEqual(result.postId, "102030405060_987654321");
    });

    it("ADDON-009: YouTube Live Broadcast Notifier creates live stream session", async () => {
      await ExternalGatewaysService.saveConfig(testTenantIdA, "youtube", {
        enabled: true,
        sandboxMode: false,
        apiKey: "AIzaSyMockYouTubeKey_789",
      });

      global.fetch = async (url: any): Promise<any> => {
        const urlStr = String(url);
        if (urlStr.includes("googleapis.com/youtube/v3/liveBroadcasts")) {
          return {
            ok: true,
            json: async () => ({ id: "yt_broadcast_live_xyz987" }),
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      };

      const result = await ExternalGatewaysService.broadcastYouTubeNotification(testTenantIdA, {
        title: "All-Hands Town Hall Q4",
        description: "Company-wide quarterly review and awards ceremony.",
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.gateway, "youtube");
      assert.strictEqual(result.simulated, false);
      assert.strictEqual(result.broadcastId, "yt_broadcast_live_xyz987");
    });

    it("ADDON-010: Telegram Bot Message Dispatcher sends HTML notifications", async () => {
      await ExternalGatewaysService.saveConfig(testTenantIdA, "telegram", {
        enabled: true,
        sandboxMode: false,
        apiKey: "123456789:ABCdefGHIjklMNOpqrSTUvwxYZ",
        identifier: "-1001234567890",
      });

      global.fetch = async (url: any): Promise<any> => {
        const urlStr = String(url);
        if (urlStr.includes("api.telegram.org/bot")) {
          return {
            ok: true,
            json: async () => ({
              ok: true,
              result: { message_id: 45678 },
            }),
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      };

      const result = await ExternalGatewaysService.sendTelegramMessage(testTenantIdA, {
        text: "<b>Urgent:</b> Server load threshold exceeded (89%).",
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.gateway, "telegram");
      assert.strictEqual(result.simulated, false);
      assert.strictEqual(result.messageId, "45678");
    });

    it("ADDON-012: Slack Channel Webhook & Notifier dispatches structured blocks", async () => {
      await ExternalGatewaysService.saveConfig(testTenantIdA, "slack", {
        enabled: true,
        sandboxMode: false,
        webhookUrl: "https://hooks.slack.com/services/T00/B00/XXXXX",
        identifier: "#devops-alerts",
      });

      global.fetch = async (url: any): Promise<any> => {
        const urlStr = String(url);
        if (urlStr.includes("hooks.slack.com")) {
          return { ok: true, text: async () => "ok" };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      };

      const result = await ExternalGatewaysService.sendSlackChannelAlert(testTenantIdA, {
        text: "Deployment pipeline succeeded for release v2.4.0",
        channel: "#devops-alerts",
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.gateway, "slack");
      assert.strictEqual(result.simulated, false);
      assert.strictEqual(result.status, "dispatched");
    });

    it("ADDON-013: Discord Webhook Alert Dispatcher delivers rich embed payloads", async () => {
      await ExternalGatewaysService.saveConfig(testTenantIdA, "discord", {
        enabled: true,
        sandboxMode: false,
        webhookUrl: "https://discord.com/api/webhooks/123456789/abcdefgh",
      });

      global.fetch = async (url: any): Promise<any> => {
        const urlStr = String(url);
        if (urlStr.includes("discord.com/api/webhooks")) {
          return { ok: true, status: 204 };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      };

      const result = await ExternalGatewaysService.sendDiscordWebhook(testTenantIdA, {
        content: "New lead converted: ACME Enterprise Corp ($50,000 ARR)",
        username: "Sales Bot",
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.gateway, "discord");
      assert.strictEqual(result.simulated, false);
      assert.strictEqual(result.status, "delivered");
    });
  });

  // ==========================================================================
  // SECTION 2: CRM & Lead Sync Adapters (ADDON-014, ADDON-023)
  // ==========================================================================
  describe("2. CRM & Lead Sync Gateways", () => {
    it("ADDON-014: HubSpot CRM Contact & Deal Sync creates contact record", async () => {
      await ExternalGatewaysService.saveConfig(testTenantIdA, "hubspot", {
        enabled: true,
        sandboxMode: false,
        accessToken: "pat-na1-mock-hubspot-token-321",
        identifier: "19827364",
      });

      global.fetch = async (url: any): Promise<any> => {
        const urlStr = String(url);
        if (urlStr.includes("api.hubapi.com/crm/v3/objects/contacts")) {
          return {
            ok: true,
            json: async () => ({ id: "hs_contact_987654" }),
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      };

      const result = await ExternalGatewaysService.syncHubSpotContact(testTenantIdA, {
        email: "alice.smith@enterprise.com",
        firstName: "Alice",
        lastName: "Smith",
        company: "Enterprise Corp",
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.gateway, "hubspot");
      assert.strictEqual(result.simulated, false);
      assert.strictEqual(result.contactId, "hs_contact_987654");
    });

    it("ADDON-023: Zoho CRM Lead & Contact Adapter creates lead record", async () => {
      await ExternalGatewaysService.saveConfig(testTenantIdA, "zoho", {
        enabled: true,
        sandboxMode: false,
        accessToken: "1000.mockZohoAccessToken123",
      });

      global.fetch = async (url: any): Promise<any> => {
        const urlStr = String(url);
        if (urlStr.includes("zohoapis.com/crm/v2/Leads")) {
          return {
            ok: true,
            json: async () => ({
              data: [{ details: { id: "zoho_lead_555444333" } }],
            }),
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      };

      const result = await ExternalGatewaysService.syncZohoLeadRecord(testTenantIdA, {
        lastName: "Patel",
        firstName: "Rohan",
        email: "rohan.patel@techsolutions.com",
        company: "Tech Solutions India",
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.gateway, "zoho");
      assert.strictEqual(result.simulated, false);
      assert.strictEqual(result.recordId, "zoho_lead_555444333");
    });
  });

  // ==========================================================================
  // SECTION 3: Telephony, SMS & Email Gateways (ADDON-015, 017, 018, 025)
  // ==========================================================================
  describe("3. Telephony, SMS & Email Gateways", () => {
    it("ADDON-015: Nexmo SMS Gateway sends outbound SMS", async () => {
      await ExternalGatewaysService.saveConfig(testTenantIdA, "nexmo", {
        enabled: true,
        sandboxMode: false,
        apiKey: "nexmo_key_123",
        apiSecret: "nexmo_secret_456",
        identifier: "MasterHRMS",
      });

      global.fetch = async (url: any): Promise<any> => {
        const urlStr = String(url);
        if (urlStr.includes("rest.nexmo.com/sms/json")) {
          return {
            ok: true,
            json: async () => ({
              messages: [{ "message-id": "nexmo_msg_998877", status: "0" }],
            }),
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      };

      const result = await ExternalGatewaysService.sendNexmoSms(testTenantIdA, {
        to: "+14155552671",
        text: "Your security verification code is 482910.",
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.gateway, "nexmo");
      assert.strictEqual(result.simulated, false);
      assert.strictEqual(result.messageId, "nexmo_msg_998877");
    });

    it("ADDON-017: Vonage Telephony & Verification initiates 2FA verification flow", async () => {
      await ExternalGatewaysService.saveConfig(testTenantIdA, "vonage", {
        enabled: true,
        sandboxMode: false,
        apiKey: "vonage_api_key_789",
        apiSecret: "vonage_api_secret_012",
      });

      global.fetch = async (url: any): Promise<any> => {
        const urlStr = String(url);
        if (urlStr.includes("api.nexmo.com/v2/verify")) {
          return {
            ok: true,
            json: async () => ({ request_id: "vonage_verify_req_abc123" }),
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      };

      const result = await ExternalGatewaysService.triggerVonageVerification(testTenantIdA, {
        number: "+14155550199",
        brand: "MasterHRMS",
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.gateway, "vonage");
      assert.strictEqual(result.simulated, false);
      assert.strictEqual(result.requestId, "vonage_verify_req_abc123");
    });

    it("ADDON-018: ClickSend SMS Gateway dispatches SMS payload", async () => {
      await ExternalGatewaysService.saveConfig(testTenantIdA, "clicksend", {
        enabled: true,
        sandboxMode: false,
        identifier: "clicksend_user_admin",
        apiKey: "clicksend_api_key_xyz",
      });

      global.fetch = async (url: any): Promise<any> => {
        const urlStr = String(url);
        if (urlStr.includes("rest.clicksend.com/v3/sms/send")) {
          return {
            ok: true,
            json: async () => ({ response_msg: "SUCCESS", response_code: "SUCCESS" }),
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      };

      const result = await ExternalGatewaysService.sendClickSendSms(testTenantIdA, {
        to: "+61411112222",
        body: "Your appointment has been confirmed for 3:00 PM.",
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.gateway, "clicksend");
      assert.strictEqual(result.simulated, false);
      assert.strictEqual(result.responseStatus, "SUCCESS");
    });

    it("ADDON-025: Amazon SES Enterprise Email Gateway delivers outbound mail", async () => {
      await ExternalGatewaysService.saveConfig(testTenantIdA, "amazon_ses", {
        enabled: true,
        sandboxMode: false,
        apiKey: "AKIA_MOCK_SES_ACCESS_KEY",
        apiSecret: "mock_ses_secret_key_abcdef",
        identifier: "support@masterhrms.com",
        extraConfig: { region: "us-east-1" },
      });

      global.fetch = async (url: any): Promise<any> => {
        const urlStr = String(url);
        if (urlStr.includes("amazonaws.com/v2/email/outbound-emails")) {
          return {
            ok: true,
            json: async () => ({ MessageId: "0100018f-ses-mock-message-id-999" }),
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      };

      const result = await ExternalGatewaysService.sendAmazonSesEmail(testTenantIdA, {
        to: "employee@enterprise.com",
        subject: "Monthly Payslip & Tax Summary",
        htmlBody: "<h1>Your Monthly Payslip</h1><p>Please find attached your payslip.</p>",
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.gateway, "amazon_ses");
      assert.strictEqual(result.simulated, false);
      assert.strictEqual(result.messageId, "0100018f-ses-mock-message-id-999");
    });
  });

  // ==========================================================================
  // SECTION 4: Video Meeting Gateways (ADDON-020, ADDON-022, ADDON-024)
  // ==========================================================================
  describe("4. Video Meeting Conferencing Gateways", () => {
    it("ADDON-020: Google Meet Video Conference Bridge creates calendar conference link", async () => {
      await ExternalGatewaysService.saveConfig(testTenantIdA, "google_meet", {
        enabled: true,
        sandboxMode: false,
        accessToken: "ya29.mock-google-calendar-token",
      });

      global.fetch = async (url: any): Promise<any> => {
        const urlStr = String(url);
        if (urlStr.includes("googleapis.com/calendar/v3/calendars/primary/events")) {
          return {
            ok: true,
            json: async () => ({
              id: "google_cal_event_123",
              hangoutLink: "https://meet.google.com/abc-defg-hij",
              conferenceData: {
                entryPoints: [{ entryPointType: "video", uri: "https://meet.google.com/abc-defg-hij" }],
              },
            }),
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      };

      const result = await ExternalGatewaysService.generateGoogleMeetLink(testTenantIdA, {
        summary: "Sprint Retrospective & Demo",
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.gateway, "google_meet");
      assert.strictEqual(result.simulated, false);
      assert.strictEqual(result.meetUrl, "https://meet.google.com/abc-defg-hij");
    });

    it("ADDON-022: Zoom Video Conferencing Session Adapter authenticates via OAuth and creates meeting", async () => {
      await ExternalGatewaysService.saveConfig(testTenantIdA, "zoom", {
        enabled: true,
        sandboxMode: false,
        identifier: "zoom_account_id_123",
        apiKey: "zoom_client_id_456",
        apiSecret: "zoom_client_secret_789",
      });

      global.fetch = async (url: any): Promise<any> => {
        const urlStr = String(url);
        if (urlStr.includes("zoom.us/oauth/token")) {
          return {
            ok: true,
            json: async () => ({
              access_token: "mock_zoom_bearer_token_xyz",
              token_type: "bearer",
              expires_in: 3599,
            }),
          };
        }
        if (urlStr.includes("api.zoom.us/v2/users/me/meetings")) {
          return {
            ok: true,
            json: async () => ({
              id: 81920394857,
              join_url: "https://zoom.us/j/81920394857?pwd=mockPassword123",
              start_url: "https://zoom.us/s/81920394857?pwd=mockPassword123",
            }),
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      };

      const result = await ExternalGatewaysService.createZoomMeetingSession(testTenantIdA, {
        topic: "Client Strategy Sync",
        startTime: new Date().toISOString(),
        durationMinutes: 45,
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.gateway, "zoom");
      assert.strictEqual(result.simulated, false);
      assert.strictEqual(result.meetingId, "81920394857");
      assert.ok(result.joinUrl.includes("81920394857"));
    });

    it("ADDON-024: Livestorm Webinar & Session Bridge provisions webinar session", async () => {
      await ExternalGatewaysService.saveConfig(testTenantIdA, "livestorm", {
        enabled: true,
        sandboxMode: false,
        apiKey: "livestorm_token_xyz987",
        identifier: "ls_event_12345",
      });

      global.fetch = async (url: any): Promise<any> => {
        const urlStr = String(url);
        if (urlStr.includes("api.livestorm.co/v1/events")) {
          return {
            ok: true,
            json: async () => ({
              data: { id: "session_live_998877", type: "sessions" },
            }),
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      };

      const result = await ExternalGatewaysService.createLivestormSession(testTenantIdA, {
        eventId: "ls_event_12345",
        estimatedDuration: 5400,
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.gateway, "livestorm");
      assert.strictEqual(result.simulated, false);
      assert.strictEqual(result.sessionId, "session_live_998877");
    });
  });

  // ==========================================================================
  // SECTION 5: Cross-Tenant Boundary Enforcement & Secret Masking
  // ==========================================================================
  describe("5. Multi-Tenant Isolation & Audit Governance", () => {
    it("Strict Tenant Isolation: Tenant B cannot read or modify Tenant A's gateway credentials", async () => {
      // Configure Zoom for Tenant A
      await ExternalGatewaysService.saveConfig(testTenantIdA, "zoom", {
        enabled: true,
        sandboxMode: false,
        identifier: "tenant_a_zoom_account",
        apiKey: "tenant_a_client_id",
        apiSecret: "tenant_a_secret_key",
      });

      // Tenant B queries all configs
      const tenantBConfigs = await ExternalGatewaysService.getAllConfigs(testTenantIdB);
      assert.strictEqual(tenantBConfigs.zoom.enabled, false);
      assert.strictEqual(tenantBConfigs.zoom.hasApiKey, false);
      assert.strictEqual(tenantBConfigs.zoom.hasApiSecret, false);

      // Tenant A queries configs — secrets are masked
      const tenantAConfigs = await ExternalGatewaysService.getAllConfigs(testTenantIdA);
      assert.strictEqual(tenantAConfigs.zoom.enabled, true);
      assert.strictEqual(tenantAConfigs.zoom.hasApiKey, true);
      assert.strictEqual(tenantAConfigs.zoom.hasApiSecret, true);
      assert.strictEqual(tenantAConfigs.zoom.identifier, "tenant_a_zoom_account");
      assert.strictEqual((tenantAConfigs.zoom as any).apiKey, undefined, "apiKey must not be leaked");
      assert.strictEqual((tenantAConfigs.zoom as any).apiSecret, undefined, "apiSecret must not be leaked");
    });

    it("Audit Logging: Actions across all gateways record audit entries in log buffer", () => {
      const logs = ExternalGatewaysService.getLogs(testTenantIdA);
      assert.ok(logs.length > 5, "Audit buffer should have captured gateway actions");
      const sample = logs[0];
      assert.strictEqual(sample.tenantId, testTenantIdA);
      assert.ok(sample.action);
      assert.ok(sample.timestamp);
    });
  });
});
