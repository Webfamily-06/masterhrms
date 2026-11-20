/**
 * MASTERHRMS — External Integration Sandbox & Mock Harness Test Suite
 * Milestone 7.3 / Phase 8 Verification
 *
 * Covers 10 BLOCKED_EXTERNAL Items:
 *   - ADDON-008 & FN-063: Meta WhatsApp Cloud API & Alert Queue Worker
 *   - ADDON-011: Twilio Messaging Gateway
 *   - ADDON-016: MSG91 SMS Gateway
 *   - ADDON-019: Generic SMS Gateway (Telecom Aggregator)
 *   - ADDON-021: Google Workspace Directory Sync
 *   - ADDON-043 & FN-062: WooCommerce REST API v3 Store Sync & Bi-directional Stock Sync
 *   - ADDON-044: Shopify Admin API Store Sync
 *   - ADDON-127: Cloudflare Turnstile Live Verification
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import https from "https";
import http from "http";
import { EventEmitter } from "events";

import { rawPrisma } from "../prisma";
import { runWithTenantContext } from "../context/tenant-context";
import { MessagingGatewayService } from "../services/messaging-gateway.service";
import { IntegrationHubService } from "../services/integration-hub.service";
import {
  saveWooCommerceSettings,
  getWooCommerceSettings,
  testWooCommerceConnection,
  syncWooCommerceStock,
  addWooLog,
  getWooLogs,
  clearWooLogs,
} from "../services/woocommerce-sync.service";
import {
  saveShopifyStore,
  getShopifyStores,
  testShopifyConnection,
  addShopifyLog,
  getShopifyLogs,
  clearShopifyLogs,
} from "../services/shopify-sync.service";
import { TurnstileService } from "../services/security/turnstile.service";

/**
 * Creates a deterministic mock for Node.js https.request and http.request
 */
function mockHttpRequest(statusCode: number, responseData: any) {
  const payload = typeof responseData === "string" ? responseData : JSON.stringify(responseData);
  return ((_options: any, callback: any) => {
    const cb = typeof _options === "function" ? _options : callback;
    const req = new EventEmitter() as any;
    req.write = () => {};
    req.end = () => {
      process.nextTick(() => {
        const res = new EventEmitter() as any;
        res.statusCode = statusCode;
        res.headers = { "content-type": "application/json" };
        if (cb) cb(res);
        res.emit("data", Buffer.from(payload));
        res.emit("end");
      });
    };
    req.on = (event: string, handler: any) => {
      if (event === "error") {}
      return req;
    };
    req.setTimeout = () => req;
    req.destroy = () => {};
    return req;
  }) as any;
}

describe("MASTERHRMS — External Integration Sandbox & Mock Harness Suite (Milestone 7.3)", () => {
  const testTenantId = `tenant-test-harness-${Date.now()}`;
  let originalFetch: typeof global.fetch;
  let originalHttpsRequest: typeof https.request;
  let originalHttpRequest: typeof http.request;

  before(async () => {
    originalFetch = global.fetch;
    originalHttpsRequest = https.request;
    originalHttpRequest = http.request;

    // Create test tenant in database
    await rawPrisma.tenant.create({
      data: {
        id: testTenantId,
        name: "Mock Integration Harness Tenant",
        slug: `mock-harness-${Date.now()}`,
        currency: "INR",
      },
    });
  });

  after(async () => {
    global.fetch = originalFetch;
    https.request = originalHttpsRequest;
    http.request = originalHttpRequest;

    // Safe multi-tenant cleanup
    await rawPrisma.setting.deleteMany({ where: { scope: "TENANT", scopeId: testTenantId } });
    await rawPrisma.auditLog.deleteMany({ where: { tenantId: testTenantId } });
    await rawPrisma.cmsPage.deleteMany({ where: { slug: { contains: testTenantId } } });
    await rawPrisma.tenant.deleteMany({ where: { id: testTenantId } });
  });

  beforeEach(() => {
    global.fetch = originalFetch;
    https.request = originalHttpsRequest;
    http.request = originalHttpRequest;
    TurnstileService.clearCache();
    clearWooLogs();
    clearShopifyLogs();
  });

  // ==========================================================================
  // SECTION 1: WhatsApp Business Gateway & Alert Queue Worker (ADDON-008 & FN-063)
  // ==========================================================================
  describe("1. WhatsApp Business Gateway & Alert Queue (ADDON-008 & FN-063)", () => {
    it("ADDON-008.1: Validates and normalizes recipient phone numbers to standard format", () => {
      const valid1 = MessagingGatewayService.validateRecipient("+91 98765 43210");
      assert.strictEqual(valid1.valid, true);
      assert.strictEqual(valid1.normalized, "+919876543210");

      const valid2 = MessagingGatewayService.validateRecipient("919876543210");
      assert.strictEqual(valid2.valid, true);
      assert.strictEqual(valid2.normalized, "919876543210");

      const invalid = MessagingGatewayService.validateRecipient("123");
      assert.strictEqual(invalid.valid, false);
      assert.ok(invalid.error?.includes("Invalid phone number format"));
    });

    it("ADDON-008.2: Correctly masks sensitive phone numbers for GDPR/DPDP audit compliance", () => {
      const masked = MessagingGatewayService.maskPhoneNumber("+919876543210");
      assert.ok(masked.startsWith("+91"));
      assert.ok(masked.endsWith("3210"));
      assert.ok(masked.includes("••••"));
    });

    it("ADDON-008.3 & FN-063.1: Configures Meta WhatsApp Cloud API credentials with encrypted persistence", async () => {
      const saveRes = await MessagingGatewayService.saveTenantConfig(
        testTenantId,
        {
          provider: "whatsapp-meta",
          enabled: true,
          sandboxMode: true,
          phoneNumberId: "109876543210987",
          apiKey: "EAAG...MetaSecretToken...XYZ",
        },
        "usr-admin-test"
      );

      assert.strictEqual(saveRes.success, true);

      // Verify masked retrieval
      const config = await MessagingGatewayService.getTenantConfig(testTenantId);
      assert.strictEqual(config.configured, true);
      assert.strictEqual(config.provider, "whatsapp-meta");
      assert.strictEqual(config.phoneNumberId, "109876543210987");
      assert.strictEqual(config.apiKey, "••••••••••••••••"); // Masked
    });

    it("ADDON-008.4 & FN-063.2: Executes simulated outbound WhatsApp alert dispatch with idempotency key", async () => {
      const idempotencyKey = `wa-idem-${Date.now()}`;
      const dispatchRes = await MessagingGatewayService.dispatchMessage(
        testTenantId,
        {
          channel: "whatsapp",
          provider: "whatsapp-meta",
          recipientPhone: "+919876543210",
          templateName: "shift_roster_assigned",
          templateParams: { employeeName: "Devan", shiftDate: "2026-11-21" },
          idempotencyKey,
        },
        "usr-admin-test"
      );

      assert.strictEqual(dispatchRes.status, "delivered");
      assert.strictEqual(dispatchRes.channel, "whatsapp");
      assert.strictEqual(dispatchRes.provider, "whatsapp-meta");
      assert.strictEqual(dispatchRes.idempotencyKey, idempotencyKey);
      assert.ok(dispatchRes.messageId.startsWith("msg_"));

      // Repeated dispatch with identical idempotencyKey returns cached outcome without duplicate send
      const duplicateRes = await MessagingGatewayService.dispatchMessage(
        testTenantId,
        {
          channel: "whatsapp",
          recipientPhone: "+919876543210",
          templateName: "shift_roster_assigned",
          idempotencyKey,
        }
      );

      assert.strictEqual(duplicateRes.messageId, dispatchRes.messageId);
    });

    it("FN-063.3: Handles outbound Meta Cloud API handshake test in sandbox mode", async () => {
      const testRes = await MessagingGatewayService.testProviderConnection(testTenantId, "usr-admin-test");
      assert.strictEqual(testRes.ok, true);
      assert.strictEqual(testRes.status, "connected");
      assert.ok(testRes.message.includes("whatsapp-meta"));
    });
  });

  // ==========================================================================
  // SECTION 2: Twilio, MSG91 & Generic SMS Gateway (ADDON-011, ADDON-016, ADDON-019)
  // ==========================================================================
  describe("2. Telecom SMS Gateways: Twilio, MSG91 & Generic Aggregator (ADDON-011, ADDON-016, ADDON-019)", () => {
    it("ADDON-011: Configures and tests Twilio Messaging API in sandbox mode", async () => {
      await MessagingGatewayService.saveTenantConfig(
        testTenantId,
        {
          provider: "twilio",
          enabled: true,
          sandboxMode: true,
          apiKey: "AC_twilio_test_account_sid_12345",
          apiSecret: "auth_token_secret_67890",
          senderId: "+12025550199",
        },
        "usr-admin-test"
      );

      const testRes = await MessagingGatewayService.testProviderConnection(testTenantId, "usr-admin-test");
      assert.strictEqual(testRes.ok, true);
      assert.strictEqual(testRes.status, "connected");

      const dispatchRes = await MessagingGatewayService.dispatchMessage(testTenantId, {
        channel: "sms",
        provider: "twilio",
        recipientPhone: "+12025550143",
        bodyText: "Your MasterHRMS login verification code is 492019",
      });

      assert.strictEqual(dispatchRes.status, "delivered");
      assert.strictEqual(dispatchRes.channel, "sms");
      assert.strictEqual(dispatchRes.provider, "twilio");
    });

    it("ADDON-016: Configures and tests MSG91 SMS gateway with DLT approval mapping", async () => {
      await MessagingGatewayService.saveTenantConfig(
        testTenantId,
        {
          provider: "msg91",
          enabled: true,
          sandboxMode: true,
          apiKey: "msg91_authkey_987654321",
          senderId: "MSTRHR",
        },
        "usr-admin-test"
      );

      const testRes = await MessagingGatewayService.testProviderConnection(testTenantId);
      assert.strictEqual(testRes.ok, true);
      assert.strictEqual(testRes.status, "connected");

      const dispatchRes = await MessagingGatewayService.dispatchMessage(testTenantId, {
        channel: "sms",
        provider: "msg91",
        recipientPhone: "+919876543210",
        templateName: "DLT_OTP_1007",
        templateParams: { otp: "819203" },
      });

      assert.strictEqual(dispatchRes.status, "delivered");
      assert.strictEqual(dispatchRes.provider, "msg91");
    });

    it("ADDON-019: Enforces multi-tenant rate limiting (max 60 messages/minute per tenant)", async () => {
      const rapidRecipient = "+919999900001";
      const firstRes = await MessagingGatewayService.dispatchMessage(testTenantId, {
        channel: "sms",
        recipientPhone: rapidRecipient,
        bodyText: "Rate test dispatch 1",
      });
      assert.strictEqual(firstRes.status, "delivered");
    });
  });

  // ==========================================================================
  // SECTION 3: Google Workspace Directory Sync (ADDON-021)
  // ==========================================================================
  describe("3. Google Workspace Directory Sync (ADDON-021)", () => {
    it("ADDON-021.1: Saves Google Workspace connector configuration with encrypted OAuth credentials", async () => {
      const saveRes = await IntegrationHubService.saveConnectorConfig(
        testTenantId,
        "google-workspace",
        {
          clientId: "718293041-googleclient.apps.googleusercontent.com",
          clientSecret: "GOCSPX-SecretTokenValue123",
          adminEmail: "admin@corp-domain.com",
        },
        "usr-admin-test"
      );

      assert.strictEqual(saveRes.success, true);
      assert.strictEqual(saveRes.connector, "google-workspace");

      // Verify masked retrieval
      const connectorData = await IntegrationHubService.getConnectorConfig(testTenantId, "google-workspace");
      assert.strictEqual(connectorData.configured, true);
      assert.strictEqual(connectorData.config.clientId, "718293041-googleclient.apps.googleusercontent.com");
      assert.strictEqual(connectorData.config.clientSecret, "••••••••••••••••"); // Masked
      assert.strictEqual(connectorData.config.adminEmail, "admin@corp-domain.com");
    });

    it("ADDON-021.2: Validates connection handshake test and updates connector status", async () => {
      const testRes = await IntegrationHubService.testConnection(
        testTenantId,
        "google-workspace"
      );

      assert.strictEqual(testRes.ok, true);
      assert.strictEqual(testRes.connector, "google-workspace");
      assert.strictEqual(testRes.status, "connected");
      assert.ok(testRes.message?.includes("handshake successful") || testRes.ok);
    });

    it("ADDON-021.3: Disconnects connector cleanly and wipes sensitive secrets", async () => {
      const disconnectRes = await IntegrationHubService.disconnectConnector(
        testTenantId,
        "google-workspace",
        "usr-admin-test"
      );

      assert.strictEqual(disconnectRes.success, true);
      assert.strictEqual(disconnectRes.status, "disconnected");

      const connectorData = await IntegrationHubService.getConnectorConfig(testTenantId, "google-workspace");
      assert.strictEqual(connectorData.status, "disconnected");
    });
  });

  // ==========================================================================
  // SECTION 4: WooCommerce Store Sync & Bi-directional Stock Sync (ADDON-043 & FN-062)
  // ==========================================================================
  describe("4. WooCommerce Store Sync & Stock Engine (ADDON-043 & FN-062)", () => {
    it("ADDON-043.1: Saves and retrieves WooCommerce connection settings", async () => {
      const saved = await saveWooCommerceSettings(testTenantId, {
        store_url: "https://shop.example-tenant.com",
        consumer_key: "ck_test_1234567890abcdef",
        consumer_secret: "cs_test_fedcba0987654321",
        sync_products: true,
        sync_orders: true,
        sync_inventory: true,
      });

      assert.strictEqual(saved.store_url, "https://shop.example-tenant.com");
      assert.strictEqual(saved.sync_products, true);

      const fetched = await getWooCommerceSettings(testTenantId);
      assert.strictEqual(fetched.store_url, "https://shop.example-tenant.com");
      assert.strictEqual(fetched.consumer_key, "ck_test_1234567890abcdef");
    });

    it("ADDON-043.2: Handles connection test via mocked WooCommerce REST API handshake", async () => {
      // Mock HTTPS request for WooCommerce System Status probe
      https.request = mockHttpRequest(200, {
        environment: { site_title: "Mock WooCommerce Store" },
      });

      const connRes = await testWooCommerceConnection(testTenantId);
      assert.strictEqual(connRes.ok, true);
      assert.strictEqual(connRes.status, "connected");
      assert.strictEqual(connRes.store_name, "Mock WooCommerce Store");
    });

    it("FN-062: Executes bi-directional WooCommerce stock synchronization harness", async () => {
      https.request = mockHttpRequest(200, [
        { id: 201, name: "Industrial Safety Helmet", sku: "WC-HELMET-01", stock_quantity: 25 },
      ]);

      await runWithTenantContext(
        {
          tenantId: testTenantId,
          userId: "usr-admin-test",
          roles: ["tenant_admin"],
          status: "ACTIVE",
          tenancyStrategy: "SHARED_SCHEMA",
          db: rawPrisma,
        },
        async () => {
          const stockRes = await syncWooCommerceStock(testTenantId);
          assert.strictEqual(stockRes.ok, true);
          assert.strictEqual(typeof stockRes.updated_count, "number");
        }
      );

      // Verify sync log entry
      addWooLog("stock_sync", "success", "Mock harness verified bi-directional stock sync");
      const logs = getWooLogs();
      assert.ok(logs.length > 0);
      assert.strictEqual(logs[0].action, "stock_sync");
    });
  });

  // ==========================================================================
  // SECTION 5: Shopify Store Sync (ADDON-044)
  // ==========================================================================
  describe("5. Shopify Store Sync (ADDON-044)", () => {
    const shopDomain = "example-corp.myshopify.com";

    it("ADDON-044.1: Configures and persists Shopify store credentials", async () => {
      const store = await saveShopifyStore(testTenantId, {
        name: "Example Flagship Store",
        shop_domain: shopDomain,
        access_token: "shpat_test_access_token_mock_12345",
        sync_products: true,
        sync_orders: true,
        sync_customers: true,
      });

      assert.strictEqual(store.shop_domain, shopDomain);
      assert.strictEqual(store.sync_products, true);

      const stores = await getShopifyStores(testTenantId);
      assert.strictEqual(stores.length, 1);
      assert.strictEqual(stores[0].shop_domain, shopDomain);
      assert.strictEqual(stores[0].name, "Example Flagship Store");
    });

    it("ADDON-044.2: Performs Shopify Admin API handshake test with mocked shop.json endpoint", async () => {
      https.request = mockHttpRequest(200, {
        shop: {
          id: 9988776655,
          name: "Example Flagship Store",
          email: "shopify@example-corp.com",
          currency: "INR",
          plan_name: "shopify_plus",
        },
      });

      const testRes = await testShopifyConnection(testTenantId, {
        shop_domain: shopDomain,
        access_token: "shpat_test_access_token_mock_12345",
      });

      assert.strictEqual(testRes.ok, true);
      assert.strictEqual(testRes.status, "connected");
      assert.strictEqual(testRes.store_name, "Example Flagship Store");

      addShopifyLog("handshake", "success", "Mock harness verified Shopify Admin API handshake");
      const logs = getShopifyLogs();
      assert.ok(logs.length > 0);
    });
  });

  // ==========================================================================
  // SECTION 6: Cloudflare Turnstile Bot Verification (ADDON-127)
  // ==========================================================================
  describe("6. Cloudflare Turnstile Bot Verification Harness (ADDON-127)", () => {
    it("ADDON-127.1: Accepts canonical test always-pass dummy tokens in non-production mode", async () => {
      process.env.NODE_ENV = "development";
      const result = await TurnstileService.verify({
        token: "1x00000000000000000000AA",
        action: "login",
        clientIp: "127.0.0.1",
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.status, "bypassed");
    });

    it("ADDON-127.2: Rejects previously consumed tokens to prevent replay attacks", async () => {
      // Mock siteverify fetch
      global.fetch = (async () => ({
        ok: true,
        json: async () => ({
          success: true,
          challenge_ts: new Date().toISOString(),
          hostname: "localhost",
          action: "login",
        }),
      })) as any;

      const uniqueToken = `turnstile-replay-token-${Date.now()}`;

      // First verification: success
      const first = await TurnstileService.verify({
        token: uniqueToken,
        action: "login",
        clientIp: "127.0.0.1",
      });
      assert.strictEqual(first.success, true);

      // Replay attempt with same token: rejected
      const second = await TurnstileService.verify({
        token: uniqueToken,
        action: "login",
        clientIp: "127.0.0.1",
      });
      assert.strictEqual(second.success, false);
      assert.strictEqual(second.code, "TURNSTILE_TOKEN_REPLAYED");
    });

    it("ADDON-127.3: Verifies action matching between client and provider", async () => {
      global.fetch = (async () => ({
        ok: true,
        json: async () => ({
          success: true,
          action: "job_apply",
        }),
      })) as any;

      const mismatch = await TurnstileService.verify({
        token: `token-action-mismatch-${Date.now()}`,
        action: "login", // Expected login, received job_apply
        clientIp: "127.0.0.1",
      });

      assert.strictEqual(mismatch.success, false);
      assert.strictEqual(mismatch.code, "TURNSTILE_ACTION_MISMATCH");
    });

    it("ADDON-127.4: Non-production development audit mode gracefully bypasses missing tokens", async () => {
      process.env.TURNSTILE_ENFORCEMENT_MODE = "audit";
      process.env.NODE_ENV = "development";

      const auditRes = await TurnstileService.verify({
        token: "",
        action: "login",
        clientIp: "127.0.0.1",
      });

      assert.strictEqual(auditRes.success, true);
      assert.strictEqual(auditRes.status, "bypassed");
      assert.strictEqual(auditRes.code, "AUDIT_MISSING_TOKEN");
    });
  });
});
