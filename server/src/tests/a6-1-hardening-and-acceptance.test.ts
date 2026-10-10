import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { rawPrisma } from "../prisma";
import { IntegrationHubService, SUPPORTED_CONNECTORS } from "../services/integration-hub.service";
import { SettingsService } from "../services/settings/settings.service";
import { AiAutomationService } from "../services/ai-automation.service";
import { StrategyStudioService } from "../services/strategy-studio.service";
import crypto from "crypto";

describe("MASTERHRMS — Phase A6.1 Hardening & Acceptance Suite", () => {
  let tenantAlphaId: string;
  let tenantBetaId: string;
  let userAlphaId: string;
  let userBetaId: string;

  beforeAll(async () => {
    // Setup isolated test tenants Alpha and Beta using rawPrisma
    const tenantAlpha = await rawPrisma.tenant.create({
      data: {
        name: "A61-Hardening-Alpha",
        slug: `a61-alpha-${Date.now()}`,
      },
    });
    tenantAlphaId = tenantAlpha.id;

    const tenantBeta = await rawPrisma.tenant.create({
      data: {
        name: "A61-Hardening-Beta",
        slug: `a61-beta-${Date.now()}`,
      },
    });
    tenantBetaId = tenantBeta.id;

    const userAlpha = await rawPrisma.user.create({
      data: {
        email: `admin-a61-alpha-${Date.now()}@example.com`,
        passwordHash: "dummy-hash",
      },
    });
    userAlphaId = userAlpha.id;

    const userBeta = await rawPrisma.user.create({
      data: {
        email: `admin-a61-beta-${Date.now()}@example.com`,
        passwordHash: "dummy-hash",
      },
    });
    userBetaId = userBeta.id;
  });

  afterAll(async () => {
    try {
      if (tenantAlphaId) {
        await rawPrisma.tenantAddon.deleteMany({ where: { tenantId: tenantAlphaId } });
        await rawPrisma.setting.deleteMany({ where: { tenantId: tenantAlphaId } });
        await rawPrisma.journalItem.deleteMany({ where: { journalEntry: { tenantId: tenantAlphaId } } });
        await rawPrisma.journalEntry.deleteMany({ where: { tenantId: tenantAlphaId } });
        await rawPrisma.chartOfAccount.deleteMany({ where: { tenantId: tenantAlphaId } });
        if (userAlphaId) await rawPrisma.user.delete({ where: { id: userAlphaId } }).catch(() => {});
        await rawPrisma.tenant.delete({ where: { id: tenantAlphaId } }).catch(() => {});
      }
      if (tenantBetaId) {
        await rawPrisma.tenantAddon.deleteMany({ where: { tenantId: tenantBetaId } });
        await rawPrisma.setting.deleteMany({ where: { tenantId: tenantBetaId } });
        if (userBetaId) await rawPrisma.user.delete({ where: { id: userBetaId } }).catch(() => {});
        await rawPrisma.tenant.delete({ where: { id: tenantBetaId } }).catch(() => {});
      }
    } catch {
      // Best-effort cleanup in sandbox
    }
  });

  describe("1. Integration Hub 7-State Connector Inventory", () => {
    it("reports all 6 canonical connectors with explicit 7-state attributes", async () => {
      // Assign woocommerce-sync to tenantAlpha
      await rawPrisma.tenantAddon.create({
        data: {
          tenantId: tenantAlphaId,
          addonSlug: "woocommerce-sync",
          status: "active",
        },
      });

      const statuses = await IntegrationHubService.getConnectorsStatus(tenantAlphaId);
      expect(Array.isArray(statuses)).toBe(true);

      const requiredConnectors = [
        "woocommerce",
        "shopify",
        "google-workspace",
        "razorpay",
        "whatsapp",
        "tally",
      ];

      for (const reqConn of requiredConnectors) {
        const found = statuses.find((s) => s.connector === reqConn);
        expect(found, `Expected connector ${reqConn} in status inventory`).toBeDefined();
        // Check 7 explicit states
        expect(found?.catalogEntryExists).toBe(true);
        expect(typeof found?.isAssigned).toBe("boolean");
        expect(typeof found?.isConfigured).toBe("boolean");
        expect(typeof found?.credentialsValidated).toBe("boolean");
        expect(typeof found?.connectivityTestSucceeded).toBe("boolean");
        expect(typeof found?.syncActionSucceeded).toBe("boolean");
        expect(found?.lastExecutionResult !== undefined).toBe(true);
      }

      // WooCommerce should be assigned
      const woo = statuses.find((s) => s.connector === "woocommerce");
      expect(woo?.isAssigned).toBe(true);

      // Shopify was not assigned
      const shopify = statuses.find((s) => s.connector === "shopify");
      expect(shopify?.isAssigned).toBe(false);
    });

    it("masks secrets in connector configuration and safely handles sandbox test handshakes", async () => {
      // Configure razorpay connector
      await IntegrationHubService.saveConnectorConfig(
        tenantAlphaId,
        "razorpay",
        {
          keyId: "rzp_test_sampleKey12345",
          keySecret: "secretKeySuperSecret999",
        },
        userAlphaId
      );

      const config = await IntegrationHubService.getConnectorConfig(tenantAlphaId, "razorpay");
      expect(config.configured).toBe(true);
      expect(config.config.keyId).toBe("rzp_test_sampleKey12345");
      expect(config.config.keySecret).toBe("••••••••••••••••");

      // Test sandbox handshake
      const testResult = await IntegrationHubService.testConnection(tenantAlphaId, "razorpay", undefined, userAlphaId);
      expect(testResult.ok).toBe(true);
      expect(testResult.status).toBe("connected");
    });

    it("prohibits live credentials in sandbox environment", async () => {
      const testResult = await IntegrationHubService.testConnection(
        tenantAlphaId,
        "razorpay",
        {
          keyId: "rzp_live_unauthorizedProductionKey",
          keySecret: "liveSecret",
        },
        userAlphaId
      );

      expect(testResult.ok).toBe(false);
      expect(testResult.message).toContain("prohibited in sandbox");
    });
  });

  describe("2. Tally Importer Hardening", () => {
    it("validateTallyHandshake succeeds with valid company name", async () => {
      const result = await IntegrationHubService.testConnection(
        tenantAlphaId,
        "tally",
        { companyName: "Apex Global Enterprises Ltd" },
        userAlphaId
      );
      expect(result.ok).toBe(true);
      expect(result.status).toBe("connected");
    });

    it("validateTallyHandshake fails when companyName is missing", async () => {
      const result = await IntegrationHubService.testConnection(
        tenantAlphaId,
        "tally",
        { companyName: "" },
        userAlphaId
      );
      expect(result.ok).toBe(false);
      expect(result.message).toContain("Missing or invalid Tally companyName");
    });
  });

  describe("3. Webhook Replay & HMAC-SHA256 Verification", () => {
    const webhookSecret = "whsec_test_secret_for_hardening_2026";
    const payload = JSON.stringify({ event: "order.paid", orderId: "ord_1001" });

    it("verifies authentic HMAC-SHA256 signature", () => {
      const signature = crypto.createHmac("sha256", webhookSecret).update(payload).digest("hex");
      const result = IntegrationHubService.verifyWebhookSignature({
        rawPayload: payload,
        signature,
        secret: webhookSecret,
      });
      expect(result.valid).toBe(true);
    });

    it("rejects invalid HMAC-SHA256 signature", () => {
      const result = IntegrationHubService.verifyWebhookSignature({
        rawPayload: payload,
        signature: "invalid_hex_signature_deadbeef",
        secret: webhookSecret,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("signature");
    });

    it("enforces replay prevention by rejecting reused nonces", () => {
      const signature = crypto.createHmac("sha256", webhookSecret).update(payload).digest("hex");
      const nonce = `nonce-${Date.now()}-${Math.random()}`;

      const firstAttempt = IntegrationHubService.verifyWebhookSignature({
        rawPayload: payload,
        signature,
        secret: webhookSecret,
        nonce,
      });
      expect(firstAttempt.valid).toBe(true);

      const replayAttempt = IntegrationHubService.verifyWebhookSignature({
        rawPayload: payload,
        signature,
        secret: webhookSecret,
        nonce,
      });
      expect(replayAttempt.valid).toBe(false);
      expect(replayAttempt.error).toContain("replay");
    });

    it("enforces timestamp tolerance window (rejects stale webhooks)", () => {
      const signature = crypto.createHmac("sha256", webhookSecret).update(payload).digest("hex");
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago (> 300s tolerance)

      const result = IntegrationHubService.verifyWebhookSignature({
        rawPayload: payload,
        signature,
        secret: webhookSecret,
        timestamp: oldTimestamp,
        toleranceSeconds: 300,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("tolerance");
    });
  });

  describe("4. AI OCR Document Validation & Human Review Flags", () => {
    it("rejects unsupported MIME types safely", async () => {
      await expect(
        AiAutomationService.processDocumentOcr({
          tenantId: tenantAlphaId,
          fileName: "malicious.exe",
          mimeType: "application/x-msdownload",
          fileSizeBytes: 1024,
        })
      ).rejects.toThrow(/Unsupported document MIME type/i);
    });

    it("rejects files exceeding 10MB limit safely", async () => {
      await expect(
        AiAutomationService.processDocumentOcr({
          tenantId: tenantAlphaId,
          fileName: "giant_invoice.pdf",
          mimeType: "application/pdf",
          fileSizeBytes: 15 * 1024 * 1024, // 15MB
        })
      ).rejects.toThrow(/exceeds maximum size of 10MB/i);
    });

    it("flags mandatory human review for high-value financial amounts", async () => {
      const job = await AiAutomationService.processDocumentOcr({
        tenantId: tenantAlphaId,
        fileName: "enterprise_server_invoice.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 250000,
        overrideTotal: 250000, // ₹2,50,000 (> ₹1,00,000 threshold)
        overrideConfidence: 0.95,
      });

      expect(job.status).toBe("completed");
      expect(job.extractedData?.totalAmount).toBe(250000);
      expect(job.extractedData?.requiresHumanReview).toBe(true);
      expect(job.extractedData?.reviewReason).toContain("exceeds review threshold");
    });
  });

  describe("5. Strategy Studio Persistence & Tenant Isolation", () => {
    let createdDocId: string;

    it("creates a SWOT analysis document and persists category items", async () => {
      const doc = await StrategyStudioService.createDocument(
        tenantAlphaId,
        {
          matrixType: "swot",
          title: "Q4 Market Expansion Matrix",
          description: "Analysis for domestic enterprise growth",
        },
        userAlphaId
      );

      expect(doc.id).toBeDefined();
      expect(doc.matrixType).toBe("swot");
      expect(doc.sections.strengths).toEqual([]);
      createdDocId = doc.id;

      // Add item to strengths
      const updated = await StrategyStudioService.updateCategoryItem(
        tenantAlphaId,
        createdDocId,
        "strengths",
        { text: "Strong direct-sales pipeline in Bangalore and Mumbai", impactScore: 5 },
        userAlphaId
      );

      expect(updated.sections.strengths.length).toBe(1);
      expect(updated.sections.strengths[0].text).toContain("Bangalore");
      expect(updated.sections.strengths[0].impactScore).toBe(5);
    });

    it("strictly isolates strategy documents: Tenant Beta cannot export Tenant Alpha document", () => {
      expect(() => {
        StrategyStudioService.exportDocument(tenantBetaId, createdDocId);
      }).toThrow("not found");
    });

    it("exports authorized strategy matrix for Tenant Alpha with metrics", () => {
      const exported = StrategyStudioService.exportDocument(tenantAlphaId, createdDocId);
      expect(exported.document.title).toBe("Q4 Market Expansion Matrix");
      expect(exported.document.matrixType).toBe("swot");
      expect(exported.summary.totalItems).toBe(1);
    });
  });
});
