/**
 * MASTERHRMS — Phase 18 / Milestone 8.5: Enterprise Finance, Banking & International E-Invoicing Test Suite
 *
 * Comprehensive empirical verification for:
 *   - ADDON-075: QuickBooks
 *   - ADDON-076: Sage
 *   - ADDON-077: Xero
 *   - ADDON-085: Plaid
 *   - ADDON-086: ZATCA (Saudi e-invoice)
 *   - ADDON-087: European E-Invoice
 *   - ADDON-103: Outlook Mail
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { rawPrisma } from "../prisma";
import { ExternalGatewaysService } from "../services/external-gateways.service";

describe("Phase 18 / Milestone 8.5 — Enterprise Finance, Banking & International E-Invoicing Test Suite", () => {
  const testTenantIdA = `tenant-p18-test-a-${Date.now()}`;
  const testTenantIdB = `tenant-p18-test-b-${Date.now()}`;
  let originalFetch: typeof global.fetch;

  before(async () => {
    originalFetch = global.fetch;

    // Create test tenants
    await rawPrisma.tenant.create({
      data: {
        id: testTenantIdA,
        name: "Enterprise Finance Tenant Alpha",
        slug: `fin-tenant-a-${Date.now()}`,
        currency: "USD",
      },
    });

    await rawPrisma.tenant.create({
      data: {
        id: testTenantIdB,
        name: "Enterprise Finance Tenant Beta",
        slug: `fin-tenant-b-${Date.now()}`,
        currency: "SAR",
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
  it("should list all Phase 18 gateways with defaults and zero secret leakage", async () => {
    const configs = await ExternalGatewaysService.getAllConfigs(testTenantIdA);
    const expectedKeys = [
      "quickbooks",
      "sage",
      "xero",
      "plaid",
      "zatca",
      "european_einvoice",
      "outlook_mail",
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
  it("should encrypt and mask saved credentials for QuickBooks, Xero, and Plaid", async () => {
    await ExternalGatewaysService.saveConfig(testTenantIdA, "quickbooks", {
      enabled: true,
      sandboxMode: true,
      apiKey: "qbo-client-id-abc123456",
      apiSecret: "qbo-client-secret-xyz987654",
      accessToken: "qbo-bearer-token-secret-token",
      identifier: "913035123456789",
    });

    await ExternalGatewaysService.saveConfig(testTenantIdA, "xero", {
      enabled: true,
      sandboxMode: true,
      accessToken: "xero-oauth-access-token-9999",
      identifier: "xero-tenant-guid-1111-2222",
    });

    await ExternalGatewaysService.saveConfig(testTenantIdA, "plaid", {
      enabled: true,
      sandboxMode: true,
      apiKey: "plaid-secret-key-live-token",
      identifier: "plaid-client-id-001122",
    });

    const configs = await ExternalGatewaysService.getAllConfigs(testTenantIdA);

    assert.equal(configs.quickbooks.enabled, true);
    assert.equal(configs.quickbooks.hasApiKey, true);
    assert.equal(configs.quickbooks.hasApiSecret, true);
    assert.equal(configs.quickbooks.hasAccessToken, true);
    assert.equal(configs.quickbooks.identifier, "913035123456789");
    assert.equal(configs.quickbooks.apiKey, undefined, "Raw apiKey must not be exposed");

    assert.equal(configs.xero.enabled, true);
    assert.equal(configs.xero.hasAccessToken, true);
    assert.equal(configs.xero.identifier, "xero-tenant-guid-1111-2222");

    assert.equal(configs.plaid.enabled, true);
    assert.equal(configs.plaid.hasApiKey, true);
    assert.equal(configs.plaid.identifier, "plaid-client-id-001122");
  });

  // 3. Connectivity Verification
  it("should verify connection in sandbox mode for all 7 Phase 18 gateways", async () => {
    const gateways = [
      "quickbooks",
      "sage",
      "xero",
      "plaid",
      "zatca",
      "european_einvoice",
      "outlook_mail",
    ] as const;

    for (const gw of gateways) {
      const res = await ExternalGatewaysService.testConnection(testTenantIdA, gw);
      assert.equal(res.success, true);
      assert.equal(res.gateway, gw);
      assert.equal(res.mode, "sandbox");
    }
  });

  // 4. ADDON-075: QuickBooks
  it("ADDON-075: should create and synchronize invoice with QuickBooks Online API", async () => {
    const res = await ExternalGatewaysService.createQuickBooksInvoice(testTenantIdA, {
      customerId: "cust_9011",
      customerName: "Global Logistics Partners",
      customerEmail: "finance@globallogistics.com",
      docNumber: "QBO-2026-881",
      lines: [
        { description: "HRMS SaaS Cloud Annual Subscription", amount: 4800, qty: 1 },
        { description: "Automated Payroll Integration Service", amount: 1200, qty: 1 },
      ],
    });

    assert.equal(res.success, true);
    assert.equal(res.gateway, "quickbooks");
    assert.equal(res.simulated, true);
    assert.equal(res.docNumber, "QBO-2026-881");
    assert.equal(res.totalAmount, 6000);
    assert.equal(res.status, "synced");
    assert.ok(res.invoiceId.startsWith("qbo_inv_"));
  });

  // 5. ADDON-076: Sage
  it("ADDON-076: should create sales invoice in Sage Business Cloud Accounting", async () => {
    const res = await ExternalGatewaysService.createSageInvoice(testTenantIdA, {
      contactName: "Apex Manufacturing Ltd",
      date: "2026-11-20",
      dueDate: "2026-12-20",
      lines: [
        { description: "Workforce Shift Scheduling Module", unitPrice: 850, quantity: 2 },
        { description: "Biometric Attendance Connector", unitPrice: 400, quantity: 1 },
      ],
    });

    assert.equal(res.success, true);
    assert.equal(res.gateway, "sage");
    assert.equal(res.simulated, true);
    assert.equal(res.contactName, "Apex Manufacturing Ltd");
    assert.equal(res.total, 2100);
    assert.equal(res.status, "posted");
    assert.ok(res.invoiceId.startsWith("sage_inv_"));
  });

  // 6. ADDON-077: Xero
  it("ADDON-077: should create sales invoice in Xero Accounting API", async () => {
    const res = await ExternalGatewaysService.createXeroInvoice(testTenantIdA, {
      contactName: "Borealis BioTech Corp",
      contactEmail: "invoices@borealisbio.ca",
      date: "2026-11-21",
      dueDate: "2026-12-21",
      lineItems: [
        { description: "Enterprise HRMS Cloud License — Tier 3", unitAmount: 3200, quantity: 1, accountCode: "200" },
      ],
    });

    assert.equal(res.success, true);
    assert.equal(res.gateway, "xero");
    assert.equal(res.simulated, true);
    assert.equal(res.contactName, "Borealis BioTech Corp");
    assert.equal(res.status, "DRAFT");
    assert.ok(res.invoiceNumber.startsWith("INV-"));
    assert.ok(res.invoiceId.startsWith("xero_inv_"));
  });

  // 7. ADDON-085: Plaid
  it("ADDON-085: should create Plaid link token and query depository account balances", async () => {
    const tokenRes = await ExternalGatewaysService.createPlaidLinkToken(testTenantIdA, {
      clientUserId: "usr_fin_controller_01",
      clientName: "MASTERHRMS Banking Portal",
    });

    assert.equal(tokenRes.success, true);
    assert.equal(tokenRes.gateway, "plaid");
    assert.equal(tokenRes.simulated, true);
    assert.ok(tokenRes.linkToken.startsWith("link-sandbox-"));
    assert.equal(tokenRes.status, "active");

    const accountsRes = await ExternalGatewaysService.fetchPlaidAccounts(testTenantIdA, {
      accessToken: "access-sandbox-fake-token",
    });

    assert.equal(accountsRes.success, true);
    assert.equal(accountsRes.gateway, "plaid");
    assert.equal(accountsRes.simulated, true);
    assert.ok(accountsRes.accounts.length >= 2);
    assert.equal(accountsRes.accounts[0].balances.currency, "USD");
  });

  // 8. ADDON-086: ZATCA Saudi Arabia E-Invoicing (Phase 2)
  it("ADDON-086: should generate ZATCA Phase 2 compliant UBL 2.1 XML, SHA-256 hash, and Base64 TLV QR code", async () => {
    const res = await ExternalGatewaysService.generateZatcaEInvoice(testTenantIdA, {
      invoiceNumber: "INV-ZATCA-2026-0042",
      issueDate: "2026-11-21",
      issueTime: "14:30:00Z",
      sellerName: "MASTERHRMS Saudi Arabia LLC",
      sellerVatNumber: "310123456700003",
      buyerName: "Riyadh Logistics Co.",
      buyerVatNumber: "310987654300003",
      lineItems: [
        { name: "Cloud HRMS Subscription", quantity: 1, unitPrice: 10000, vatRate: 0.15 },
      ],
    });

    assert.equal(res.success, true);
    assert.equal(res.gateway, "zatca");
    assert.equal(res.simulated, true);
    assert.equal(res.invoiceNumber, "INV-ZATCA-2026-0042");
    assert.equal(res.totalAmount, 11500);
    assert.equal(res.vatAmount, 1500);
    assert.equal(res.complianceStatus, "CLEARED");
    assert.equal(res.zatcaStage, "PHASE_2_INTEGRATION");

    // Cryptographic validation
    assert.ok(res.invoiceHash, "Must contain base64 SHA-256 invoice digest");
    assert.ok(res.qrCodeBase64, "Must contain Base64 TLV QR code");
    assert.ok(res.ublXml.includes("urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"));
    assert.ok(res.ublXml.includes("<cbc:ID>INV-ZATCA-2026-0042</cbc:ID>"));

    // Verify TLV decoding
    const tlvBuffer = Buffer.from(res.qrCodeBase64, "base64");
    assert.equal(tlvBuffer[0], 1, "First TLV tag must be 1 (Seller Name)");
    const tag1Len = tlvBuffer[1];
    const sellerNameDecoded = tlvBuffer.subarray(2, 2 + tag1Len).toString("utf8");
    assert.equal(sellerNameDecoded, "MASTERHRMS Saudi Arabia LLC");
  });

  // 9. ADDON-087: European E-Invoice (Peppol BIS Billing 3.0 / EN 16931)
  it("ADDON-087: should generate EN 16931 and Peppol BIS Billing 3.0 compliant electronic invoice", async () => {
    const res = await ExternalGatewaysService.generateEuropeanEInvoice(testTenantIdA, {
      invoiceNumber: "EU-PEPPOL-2026-789",
      issueDate: "2026-11-21",
      dueDate: "2026-12-21",
      sellerName: "MASTERHRMS Europe B.V.",
      sellerVatNumber: "NL889977665B01",
      buyerName: "Nordic Engineering AS",
      buyerVatNumber: "NO987654321MVA",
      buyerReference: "PO-NOR-2026-99",
      lineItems: [
        { description: "HR Core Cloud Platform", quantity: 1, unitPrice: 2000, vatRatePercent: 21 },
      ],
    });

    assert.equal(res.success, true);
    assert.equal(res.gateway, "european_einvoice");
    assert.equal(res.simulated, true);
    assert.equal(res.invoiceNumber, "EU-PEPPOL-2026-789");
    assert.equal(res.standard, "PEPPOL_BIS_BILLING_3.0");
    assert.equal(res.en16931Compliant, true);
    assert.equal(res.subtotal, 2000);
    assert.equal(res.vatTotal, 420);
    assert.equal(res.totalAmount, 2420);

    // Schema & digest check
    assert.ok(res.digest.length === 64, "Digest must be 64-char SHA-256 hex string");
    assert.ok(res.xmlContent.includes("urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0"));
  });

  // 10. ADDON-103: Outlook Mail
  it("ADDON-103: should dispatch email via Microsoft Graph Outlook Mail", async () => {
    const res = await ExternalGatewaysService.sendOutlookMail(testTenantIdA, {
      to: "auditor@deloitte.com",
      subject: "MASTERHRMS Platform SOC 2 Type II Compliance Report",
      htmlBody: "<p>Please find attached the signed audit certification report.</p>",
      cc: ["ciso@masterhrms.com"],
      saveToSentItems: true,
    });

    assert.equal(res.success, true);
    assert.equal(res.gateway, "outlook_mail");
    assert.equal(res.simulated, true);
    assert.equal(res.status, "sent");
    assert.ok(res.to.includes("auditor@deloitte.com"));
    assert.ok(res.messageId.startsWith("msg_outlook_sim_"));
  });

  // 11. Strict Tenant Boundary Isolation
  it("should ensure strict tenant credential and dispatch isolation", async () => {
    await ExternalGatewaysService.saveConfig(testTenantIdB, "quickbooks", {
      enabled: false,
      identifier: "qbo_beta_comp_999",
    });

    const tenantAConfigs = await ExternalGatewaysService.getAllConfigs(testTenantIdA);
    const tenantBConfigs = await ExternalGatewaysService.getAllConfigs(testTenantIdB);

    assert.equal(tenantAConfigs.quickbooks.enabled, true);
    assert.equal(tenantAConfigs.quickbooks.identifier, "913035123456789");

    assert.equal(tenantBConfigs.quickbooks.enabled, false);
    assert.equal(tenantBConfigs.quickbooks.identifier, "qbo_beta_comp_999");
  });

  // 12. In-Memory Gateway Audit Logging
  it("should record and query tenant-scoped gateway dispatch audit logs", async () => {
    const tenantLogs = ExternalGatewaysService.getLogs(testTenantIdA);
    assert.ok(tenantLogs.length >= 7, "Should have logged dispatches for all executed tests");

    const events = tenantLogs.map((l) => l.action);
    assert.ok(events.includes("CREATE_INVOICE"));
    assert.ok(events.includes("CREATE_LINK_TOKEN"));
    assert.ok(events.includes("GENERATE_EINVOICE"));
    assert.ok(events.includes("GENERATE_PEPPOL_INVOICE"));
    assert.ok(events.includes("SEND_MAIL"));
  });
});
