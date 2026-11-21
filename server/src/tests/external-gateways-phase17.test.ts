/**
 * MASTERHRMS — Phase 17 / Milestone 8.4: Workspace Cloud, E-Commerce & Service Desks Test Suite
 *
 * Comprehensive empirical verification for:
 *   - ADDON-039: Google Slides
 *   - ADDON-040: WHMCS
 *   - ADDON-041: Google Forms
 *   - ADDON-042: Google Wallet
 *   - ADDON-045: Mailchimp
 *   - ADDON-046: Salesforce
 *   - ADDON-059: OneDrive
 *   - ADDON-071: Zendesk
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { rawPrisma } from "../prisma";
import { ExternalGatewaysService } from "../services/external-gateways.service";

describe("Phase 17 / Milestone 8.4 — Workspace Cloud, E-Commerce & Service Desks Test Suite", () => {
  const testTenantIdA = `tenant-p17-test-a-${Date.now()}`;
  const testTenantIdB = `tenant-p17-test-b-${Date.now()}`;
  let originalFetch: typeof global.fetch;

  before(async () => {
    originalFetch = global.fetch;

    // Create test tenants
    await rawPrisma.tenant.create({
      data: {
        id: testTenantIdA,
        name: "Cloud Workspace Tenant Alpha",
        slug: `cloud-tenant-a-${Date.now()}`,
        currency: "USD",
      },
    });

    await rawPrisma.tenant.create({
      data: {
        id: testTenantIdB,
        name: "Cloud Workspace Tenant Beta",
        slug: `cloud-tenant-b-${Date.now()}`,
        currency: "GBP",
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
  it("should list all Phase 17 gateways with defaults and zero secret leakage", async () => {
    const configs = await ExternalGatewaysService.getAllConfigs(testTenantIdA);
    const expectedKeys = [
      "google_slides",
      "whmcs",
      "google_forms",
      "google_wallet",
      "mailchimp",
      "salesforce",
      "onedrive",
      "zendesk",
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
  it("should encrypt and mask saved credentials for Salesforce and Zendesk", async () => {
    await ExternalGatewaysService.saveConfig(testTenantIdA, "salesforce", {
      enabled: true,
      sandboxMode: true,
      accessToken: "sf-access-token-live-secret-9999",
      endpointUrl: "https://masterhrms.my.salesforce.com",
    });

    await ExternalGatewaysService.saveConfig(testTenantIdA, "zendesk", {
      enabled: true,
      sandboxMode: true,
      apiKey: "zd-api-token-supersecret-8888",
      identifier: "support@masterhrms.com",
      endpointUrl: "https://masterhrms.zendesk.com",
    });

    const configs = await ExternalGatewaysService.getAllConfigs(testTenantIdA);

    assert.equal(configs.salesforce.enabled, true);
    assert.equal(configs.salesforce.hasAccessToken, true);
    assert.equal(configs.salesforce.endpointUrl, "https://masterhrms.my.salesforce.com");
    assert.equal(configs.salesforce.accessToken, undefined, "Raw token must not be exposed");

    assert.equal(configs.zendesk.enabled, true);
    assert.equal(configs.zendesk.hasApiKey, true);
    assert.equal(configs.zendesk.identifier, "support@masterhrms.com");
    assert.equal(configs.zendesk.apiKey, undefined, "Raw API key must not be exposed");
  });

  // 3. Connectivity Verification
  it("should verify connection in sandbox mode for all 8 Phase 17 gateways", async () => {
    const gateways = [
      "google_slides",
      "whmcs",
      "google_forms",
      "google_wallet",
      "mailchimp",
      "salesforce",
      "onedrive",
      "zendesk",
    ] as const;

    for (const gw of gateways) {
      const res = await ExternalGatewaysService.testConnection(testTenantIdA, gw);
      assert.equal(res.success, true);
      assert.equal(res.gateway, gw);
      assert.equal(res.mode, "sandbox");
    }
  });

  // 4. ADDON-039: Google Slides
  it("ADDON-039: should generate Google Slides presentation in sandbox", async () => {
    const res = await ExternalGatewaysService.createGoogleSlidesPresentation(testTenantIdA, {
      title: "Q4 FY27 Corporate Strategy Deck",
      slides: [
        { title: "Executive Overview", subtitle: "Record Year Growth" },
        { title: "Global Talent Distribution", body: "5,000+ Distributed Employees" },
      ],
    });

    assert.equal(res.success, true);
    assert.equal(res.gateway, "google_slides");
    assert.equal(res.simulated, true);
    assert.ok(res.presentationId.startsWith("gslides_sim_"));
    assert.ok(res.presentationUrl?.includes(res.presentationId));
  });

  // 5. ADDON-040: WHMCS
  it("ADDON-040: should create WHMCS billing invoice with line items", async () => {
    const res = await ExternalGatewaysService.createWhmcsInvoice(testTenantIdA, {
      userId: 1042,
      date: "2026-11-01",
      dueDate: "2026-11-15",
      items: [
        { description: "Dedicated Enterprise HRMS Cluster", amount: 1500.0 },
        { description: "Managed PostgreSQL High Availability", amount: 350.0 },
      ],
      paymentMethod: "stripe",
    });

    assert.equal(res.success, true);
    assert.equal(res.gateway, "whmcs");
    assert.equal(res.status, "created");
    assert.equal(res.simulated, true);
    assert.ok(res.invoiceId.startsWith("whmcs_inv_"));
    assert.ok(res.paymentUrl?.includes(res.invoiceId));
  });

  // 6. ADDON-041: Google Forms
  it("ADDON-041: should ingest Google Forms survey response into feedback pipeline", async () => {
    const res = await ExternalGatewaysService.ingestGoogleFormsResponse(testTenantIdA, {
      formId: "form_pulse_survey_2026",
      respondentEmail: "employee@subsidiary.org",
      responses: {
        "Overall Satisfaction": "5/5",
        "Work-Life Balance": "High",
        "Suggestions": "Love the Antigravity automation features!",
      },
    });

    assert.equal(res.success, true);
    assert.equal(res.gateway, "google_forms");
    assert.equal(res.simulated, true);
    assert.equal(res.formId, "form_pulse_survey_2026");
    assert.equal(res.respondentEmail, "employee@subsidiary.org");
    assert.equal(res.mappedFeedback["Overall Satisfaction"], "5/5");
  });

  // 7. ADDON-042: Google Wallet
  it("ADDON-042: should issue digital employee badge pass object with save URL", async () => {
    const res = await ExternalGatewaysService.issueGoogleWalletPass(testTenantIdA, {
      issuerId: "3388000000022",
      employeeId: "EMP-9002",
      employeeName: "Elena Rostova",
      department: "Cloud Engineering",
    });

    assert.equal(res.success, true);
    assert.equal(res.gateway, "google_wallet");
    assert.equal(res.simulated, true);
    assert.equal(res.classId, "3388000000022.hrms_badge_class");
    assert.equal(res.objectId, "3388000000022.hrms_badge_class.EMP-9002");
    assert.ok(res.saveUrl.startsWith("https://pay.google.com/gp/v/save/"));
    assert.equal(res.badgeDetails.employeeName, "Elena Rostova");
  });

  // 8. ADDON-045: Mailchimp
  it("ADDON-045: should synchronize subscriber to Mailchimp marketing audience", async () => {
    const res = await ExternalGatewaysService.syncMailchimpSubscriber(testTenantIdA, {
      listId: "mc_list_global_leads",
      email: "subscriber@clientcorp.com",
      firstName: "Marcus",
      lastName: "Vance",
      tags: ["Enterprise Lead", "APAC Region"],
    });

    assert.equal(res.success, true);
    assert.equal(res.gateway, "mailchimp");
    assert.equal(res.simulated, true);
    assert.equal(res.email, "subscriber@clientcorp.com");
    assert.equal(res.status, "subscribed");
    assert.ok(res.tags?.includes("Enterprise Lead"));
  });

  // 9. ADDON-046: Salesforce
  it("ADDON-046: should synchronize enterprise lead to Salesforce CRM", async () => {
    const res = await ExternalGatewaysService.syncSalesforceLead(testTenantIdA, {
      firstName: "David",
      lastName: "O'Connor",
      company: "Acme Industrial Technologies",
      email: "doconnor@acmeind.com",
      phone: "+14155552671",
      leadSource: "Direct Enterprise Inquiry",
    });

    assert.equal(res.success, true);
    assert.equal(res.gateway, "salesforce");
    assert.equal(res.simulated, true);
    assert.ok(res.leadId.startsWith("00Q"));
    assert.equal(res.successStatus, "created");
  });

  // 10. ADDON-059: OneDrive
  it("ADDON-059: should synchronize document to Microsoft OneDrive cloud storage", async () => {
    const res = await ExternalGatewaysService.syncOneDriveFile(testTenantIdA, {
      path: "HRMS/ExecutiveReports",
      fileName: "AnnualAudit_FY26.pdf",
      mimeType: "application/pdf",
      contentBase64: Buffer.from("PDF DUMMY CONTENT").toString("base64"),
    });

    assert.equal(res.success, true);
    assert.equal(res.gateway, "onedrive");
    assert.equal(res.simulated, true);
    assert.equal(res.fileName, "AnnualAudit_FY26.pdf");
    assert.ok(res.webUrl?.includes(res.itemId));
  });

  // 11. ADDON-071: Zendesk
  it("ADDON-071: should create support ticket in Zendesk Service Desk", async () => {
    const res = await ExternalGatewaysService.createZendeskTicket(testTenantIdA, {
      subject: "VPN Gateway Connectivity Issue — Tokyo Office",
      comment: "Employees cannot connect to internal payroll servers via Tokyo edge VPN.",
      requesterEmail: "tokyo-it@company.jp",
      requesterName: "Kenji Sato",
      priority: "high",
    });

    assert.equal(res.success, true);
    assert.equal(res.gateway, "zendesk");
    assert.equal(res.simulated, true);
    assert.equal(res.priority, "high");
    assert.equal(res.status, "new");
    assert.ok(res.ticketUrl?.includes(String(res.ticketId)));
  });

  // 12. Strict Tenant Boundary Isolation
  it("should ensure strict tenant credential and dispatch isolation", async () => {
    await ExternalGatewaysService.saveConfig(testTenantIdB, "zendesk", {
      enabled: false,
      identifier: "support-beta@masterhrms.com",
    });

    const tenantAConfigs = await ExternalGatewaysService.getAllConfigs(testTenantIdA);
    const tenantBConfigs = await ExternalGatewaysService.getAllConfigs(testTenantIdB);

    assert.equal(tenantAConfigs.zendesk.enabled, true);
    assert.equal(tenantAConfigs.zendesk.identifier, "support@masterhrms.com");

    assert.equal(tenantBConfigs.zendesk.enabled, false);
    assert.equal(tenantBConfigs.zendesk.identifier, "support-beta@masterhrms.com");
  });

  // 13. In-Memory Gateway Audit Logging
  it("should record and query tenant-scoped gateway dispatch audit logs", async () => {
    const tenantLogs = ExternalGatewaysService.getLogs(testTenantIdA);
    assert.ok(tenantLogs.length >= 8, "Should have logged dispatches for all executed tests");

    const events = tenantLogs.map((l) => l.action);
    assert.ok(events.includes("CREATE_PRESENTATION"));
    assert.ok(events.includes("CREATE_INVOICE"));
    assert.ok(events.includes("INGEST_RESPONSE"));
    assert.ok(events.includes("ISSUE_PASS"));
    assert.ok(events.includes("SYNC_SUBSCRIBER"));
    assert.ok(events.includes("SYNC_LEAD"));
    assert.ok(events.includes("SYNC_FILE"));
    assert.ok(events.includes("CREATE_TICKET"));
  });
});
