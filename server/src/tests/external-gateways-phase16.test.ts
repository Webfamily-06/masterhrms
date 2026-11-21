/**
 * MASTERHRMS — Phase 16 / Milestone 8.3: Automation, Calendars & Collaboration Webhooks Test Suite
 *
 * Comprehensive empirical verification for:
 *   - ADDON-026: Google Calendar
 *   - ADDON-027: Outlook Calendar
 *   - ADDON-028: Zapier
 *   - ADDON-029: Make (Integromat)
 *   - ADDON-031: n8n
 *   - ADDON-032: IndiaMART
 *   - ADDON-033: Sendinblue (Brevo)
 *   - ADDON-034: OneNote
 *   - ADDON-035: Trello
 *   - ADDON-037: Jira
 *   - ADDON-038: Google Analytics
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { rawPrisma } from "../prisma";
import { ExternalGatewaysService } from "../services/external-gateways.service";

describe("Phase 16 / Milestone 8.3 — Automation, Calendars & Collaboration Webhooks Test Suite", () => {
  const testTenantIdA = `tenant-p16-test-a-${Date.now()}`;
  const testTenantIdB = `tenant-p16-test-b-${Date.now()}`;
  let originalFetch: typeof global.fetch;

  before(async () => {
    originalFetch = global.fetch;

    // Create test tenants
    await rawPrisma.tenant.create({
      data: {
        id: testTenantIdA,
        name: "Automation Tenant Alpha",
        slug: `auto-tenant-a-${Date.now()}`,
        currency: "USD",
      },
    });

    await rawPrisma.tenant.create({
      data: {
        id: testTenantIdB,
        name: "Automation Tenant Beta",
        slug: `auto-tenant-b-${Date.now()}`,
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

  // 1. Initial Listing & Masking
  it("should list all Phase 16 gateways with defaults and zero secret leakage", async () => {
    const configs = await ExternalGatewaysService.getAllConfigs(testTenantIdA);
    const expectedKeys = [
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
    ];

    for (const key of expectedKeys) {
      assert.ok(configs[key], `Gateway config missing for ${key}`);
      assert.equal(configs[key].enabled, false);
      assert.equal(configs[key].sandboxMode, true);
      assert.equal(configs[key].hasApiKey, false);
      assert.equal(configs[key].hasApiSecret, false);
      assert.equal(configs[key].hasAccessToken, false);
      assert.equal(configs[key]._status, "not_configured");
    }
  });

  // 2. Save Config with Masking
  it("should encrypt and mask saved credentials for Jira and Zapier", async () => {
    await ExternalGatewaysService.saveConfig(testTenantIdA, "jira", {
      enabled: true,
      sandboxMode: true,
      apiKey: "super-secret-jira-token-xyz123456",
      apiSecret: "jira-client-secret-987654321",
      endpointUrl: "https://masterhrms.atlassian.net",
      identifier: "HRMS",
    });

    await ExternalGatewaysService.saveConfig(testTenantIdA, "zapier", {
      enabled: true,
      sandboxMode: true,
      webhookUrl: "https://hooks.zapier.com/hooks/catch/123456/abcdef/",
    });

    const configs = await ExternalGatewaysService.getAllConfigs(testTenantIdA);

    assert.equal(configs.jira.enabled, true);
    assert.equal(configs.jira.hasApiKey, true);
    assert.equal(configs.jira.hasApiSecret, true);
    assert.equal(configs.jira.endpointUrl, "https://masterhrms.atlassian.net");
    assert.equal(configs.jira.identifier, "HRMS");
    assert.equal(configs.jira.apiKey, undefined, "Raw apiKey must not be exposed in public config");

    assert.equal(configs.zapier.enabled, true);
    assert.equal(configs.zapier.webhookUrl, "https://hooks.zapier.com/hooks/catch/123456/abcdef/");
  });

  // 3. Connectivity Verification
  it("should verify connection in sandbox mode for all 11 Phase 16 gateways", async () => {
    const gateways = [
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
    ] as const;

    for (const gw of gateways) {
      const res = await ExternalGatewaysService.testConnection(testTenantIdA, gw);
      assert.equal(res.success, true);
      assert.equal(res.gateway, gw);
      assert.equal(res.mode, "sandbox");
    }
  });

  // 4. ADDON-026: Google Calendar
  it("ADDON-026: should create and synchronize Google Calendar event with attendees", async () => {
    const res = await ExternalGatewaysService.createGoogleCalendarEvent(testTenantIdA, {
      title: "Quarterly Performance Review — Engineering",
      startTime: "2026-12-01T10:00:00Z",
      endTime: "2026-12-01T11:00:00Z",
      attendees: ["lead@company.com", "developer@company.com"],
      description: "Discussing Q4 OKRs and promotion roadmap.",
      location: "Virtual Room Alpha",
    });

    assert.equal(res.success, true);
    assert.equal(res.gateway, "google_calendar");
    assert.equal(res.simulated, true);
    assert.ok(res.eventId.startsWith("gcal_sim_"));
    assert.ok(res.htmlLink?.includes(res.eventId));
  });

  // 5. ADDON-027: Outlook Calendar
  it("ADDON-027: should schedule and synchronize Outlook Calendar event", async () => {
    const res = await ExternalGatewaysService.createOutlookCalendarEvent(testTenantIdA, {
      subject: "Executive Leadership All-Hands",
      start: "2026-12-05T14:00:00Z",
      end: "2026-12-05T15:30:00Z",
      attendees: ["ceo@company.com", "cto@company.com"],
      body: "<p>Agenda: FY27 Budget and Global Expansion.</p>",
    });

    assert.equal(res.success, true);
    assert.equal(res.gateway, "outlook_calendar");
    assert.equal(res.simulated, true);
    assert.ok(res.eventId.startsWith("outlook_cal_sim_"));
    assert.ok(res.webLink?.includes(res.eventId));
  });

  // 6. ADDON-028: Zapier
  it("ADDON-028: should trigger Zapier REST hook automation with payload", async () => {
    const res = await ExternalGatewaysService.triggerZapierWebhook(testTenantIdA, {
      event: "employee.onboarded",
      payload: { employeeId: "EMP-1001", name: "Alice Zhang", department: "Finance" },
    });

    assert.equal(res.success, true);
    assert.equal(res.gateway, "zapier");
    assert.equal(res.simulated, true);
    assert.equal(res.status, "dispatched");
    assert.ok(res.attemptId.startsWith("zap_dispatch_sim_"));
  });

  // 7. ADDON-029: Make (Integromat)
  it("ADDON-029: should trigger Make scenario automation bridge", async () => {
    const res = await ExternalGatewaysService.triggerMakeScenario(testTenantIdA, {
      event: "leave.approved",
      payload: { leaveId: "LV-808", employeeId: "EMP-1002", days: 3 },
    });

    assert.equal(res.success, true);
    assert.equal(res.gateway, "make");
    assert.equal(res.simulated, true);
    assert.equal(res.status, "accepted");
    assert.ok(res.executionId.startsWith("make_scenario_sim_"));
  });

  // 8. ADDON-031: n8n
  it("ADDON-031: should dispatch webhook to n8n self-hosted workflow automation", async () => {
    const res = await ExternalGatewaysService.triggerN8nWorkflow(testTenantIdA, {
      workflowId: "wf_payroll_batch_v2",
      data: { batchId: "PAY-2026-11", totalGross: 1450000 },
    });

    assert.equal(res.success, true);
    assert.equal(res.gateway, "n8n");
    assert.equal(res.simulated, true);
    assert.equal(res.status, "queued");
    assert.ok(res.executionId.startsWith("n8n_exec_sim_"));
  });

  // 9. ADDON-032: IndiaMART
  it("ADDON-032: should ingest IndiaMART B2B inquiry and transform to CRM lead", async () => {
    const res = await ExternalGatewaysService.ingestIndiaMartLead(testTenantIdA, {
      leadId: "im_lead_987654321",
      senderName: "Rajesh Kumar",
      senderMobile: "+919876543210",
      senderEmail: "rajesh.kumar@vendorcorp.in",
      productName: "Enterprise HRMS Cloud License",
      queryMessage: "Need pricing for 500 employee enterprise tier.",
    });

    assert.equal(res.success, true);
    assert.equal(res.gateway, "indiamart");
    assert.equal(res.status, "ingested");
    assert.equal(res.leadId, "im_lead_987654321");
    assert.equal(res.mappedRecord.phone, "+919876543210");
    assert.equal(res.mappedRecord.source, "INDIAMART_B2B");
  });

  // 10. ADDON-033: Sendinblue / Brevo
  it("ADDON-033: should dispatch transactional email via Sendinblue / Brevo", async () => {
    const res = await ExternalGatewaysService.sendSendinblueEmail(testTenantIdA, {
      to: "candidate@talentpool.io",
      subject: "Offer Letter — Senior Backend Engineer",
      htmlContent: "<h1>Welcome to MASTERHRMS!</h1><p>Your offer has been approved.</p>",
    });

    assert.equal(res.success, true);
    assert.equal(res.gateway, "sendinblue");
    assert.equal(res.simulated, true);
    assert.ok(res.messageId.startsWith("brevo_sim_"));
  });

  // 11. ADDON-034: OneNote
  it("ADDON-034: should create and sync page to OneNote notebook section", async () => {
    const res = await ExternalGatewaysService.createOneNotePage(testTenantIdA, {
      sectionId: "sec_engineering_docs",
      title: "Antigravity Cloud Migration Architecture",
      htmlContent: "<p>Architectural notes on microservice decoupling and Redis caching.</p>",
    });

    assert.equal(res.success, true);
    assert.equal(res.gateway, "onenote");
    assert.equal(res.simulated, true);
    assert.ok(res.pageId.startsWith("onenote_page_sim_"));
    assert.ok(res.clientUrl?.includes(res.pageId));
  });

  // 12. ADDON-035: Trello
  it("ADDON-035: should create Agile card on Trello kanban list", async () => {
    const res = await ExternalGatewaysService.createTrelloCard(testTenantIdA, {
      name: "Implement ZATCA E-Invoicing Phase 2",
      desc: "Prepare XML schema validation with Saudi tax authority specs.",
      due: "2026-12-15T18:00:00Z",
    });

    assert.equal(res.success, true);
    assert.equal(res.gateway, "trello");
    assert.equal(res.simulated, true);
    assert.ok(res.cardId.startsWith("trello_card_sim_"));
    assert.ok(res.url?.includes(res.cardId));
  });

  // 13. ADDON-037: Jira
  it("ADDON-037: should create sprint issue in Jira Cloud", async () => {
    const res = await ExternalGatewaysService.createJiraIssue(testTenantIdA, {
      projectKey: "HRMS",
      summary: "Add bi-directional webhook handler for attendance biometric terminals",
      description: "Support ZKTeco and Hikvision biometric sync protocols.",
      issueType: "Story",
    });

    assert.equal(res.success, true);
    assert.equal(res.gateway, "jira");
    assert.equal(res.simulated, true);
    assert.ok(res.issueKey.startsWith("HRMS-"));
    assert.ok(res.url?.includes(res.issueKey));
  });

  // 14. ADDON-038: Google Analytics
  it("ADDON-038: should track GA4 Measurement Protocol event", async () => {
    const res = await ExternalGatewaysService.trackGoogleAnalyticsEvent(testTenantIdA, {
      eventName: "payroll_run_completed",
      params: { employeesCount: 450, totalDisbursed: 2150000, currency: "USD" },
    });

    assert.equal(res.success, true);
    assert.equal(res.gateway, "google_analytics");
    assert.equal(res.simulated, true);
    assert.ok(res.trackingId.startsWith("ga4_evt_"));
    assert.equal(res.event, "payroll_run_completed");
  });

  // 15. Strict Tenant Boundary Isolation
  it("should ensure strict tenant credential and dispatch isolation", async () => {
    await ExternalGatewaysService.saveConfig(testTenantIdB, "jira", {
      enabled: false,
      identifier: "BETA",
    });

    const tenantAConfigs = await ExternalGatewaysService.getAllConfigs(testTenantIdA);
    const tenantBConfigs = await ExternalGatewaysService.getAllConfigs(testTenantIdB);

    assert.equal(tenantAConfigs.jira.enabled, true);
    assert.equal(tenantAConfigs.jira.identifier, "HRMS");

    assert.equal(tenantBConfigs.jira.enabled, false);
    assert.equal(tenantBConfigs.jira.identifier, "BETA");
  });

  // 16. In-Memory Gateway Audit Logging
  it("should record and query tenant-scoped gateway dispatch audit logs", async () => {
    const tenantLogs = ExternalGatewaysService.getLogs(testTenantIdA);
    assert.ok(tenantLogs.length >= 10, "Should have logged dispatches for all executed tests");

    const events = tenantLogs.map((l) => l.action);
    assert.ok(events.includes("CREATE_EVENT"));
    assert.ok(events.includes("TRIGGER_WEBHOOK"));
    assert.ok(events.includes("TRIGGER_SCENARIO"));
    assert.ok(events.includes("TRIGGER_WORKFLOW"));
    assert.ok(events.includes("INGEST_LEAD"));
    assert.ok(events.includes("SEND_TRANSACTIONAL"));
    assert.ok(events.includes("CREATE_PAGE"));
    assert.ok(events.includes("CREATE_CARD"));
    assert.ok(events.includes("CREATE_ISSUE"));
    assert.ok(events.includes("TRACK_EVENT"));
  });
});
