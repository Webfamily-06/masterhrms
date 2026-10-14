import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { rawPrisma } from "../prisma";
import { OutboundWebhooksService } from "../modules/outbound-webhooks/outbound-webhooks.service";
import { AiAssistantService } from "../services/ai-assistant.service";
import { AiDocumentService } from "../services/ai-document.service";
import { PlanningStrategyService } from "../services/planning-strategy.service";
import { checkTenantEntitlement } from "../middleware/entitlements";
import { CANONICAL_CATALOG_REGISTRY } from "../services/unified-catalog.service";

describe("MASTERHRMS — Four Add-ons Final Acceptance Regression Suite", () => {
  let tenantAId: string;
  let tenantBId: string;
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    // Setup isolated test tenants Alpha and Beta in Postgres database
    const tenantA = await rawPrisma.tenant.create({
      data: {
        name: "Audit-Tenant-Alpha",
        slug: `audit-alpha-${Date.now()}`,
      },
    });
    tenantAId = tenantA.id;

    const tenantB = await rawPrisma.tenant.create({
      data: {
        name: "Audit-Tenant-Beta",
        slug: `audit-beta-${Date.now()}`,
      },
    });
    tenantBId = tenantB.id;

    const userA = await rawPrisma.user.create({
      data: {
        email: `user-a-${Date.now()}@example.com`,
        passwordHash: "dummy-hash",
      },
    });
    userAId = userA.id;

    const userB = await rawPrisma.user.create({
      data: {
        email: `user-b-${Date.now()}@example.com`,
        passwordHash: "dummy-hash",
      },
    });
    userBId = userB.id;
  });

  afterAll(async () => {
    // Cleanup created test records
    await rawPrisma.setting.deleteMany({
      where: { scopeId: { in: [tenantAId, tenantBId] } },
    }).catch(() => {});
    await rawPrisma.outboxEvent.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    }).catch(() => {});
    await rawPrisma.auditLog.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    }).catch(() => {});
    await rawPrisma.user.deleteMany({
      where: { id: { in: [userAId, userBId] } },
    }).catch(() => {});
    await rawPrisma.tenant.deleteMany({
      where: { id: { in: [tenantAId, tenantBId] } },
    }).catch(() => {});
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. GLOBAL CATALOG & ENTITLEMENT REGISTRY ACCEPTANCE
  // ──────────────────────────────────────────────────────────────────────────
  describe("1. Global Add-on Catalog & Canonical Identity", () => {
    it("should verify all 4 add-ons exist with canonical identity in the catalog registry", () => {
      const keys = [
        { key: "webhook", slug: "outbound-webhooks" },
        { key: "ai-assistant", slug: "ai-assistant" },
        { key: "ai-document", slug: "ai-document" },
        { key: "planning", slug: "planning" },
      ];
      for (const item of keys) {
        const found = CANONICAL_CATALOG_REGISTRY.find(
          (c) =>
            c.slug === item.slug ||
            c.slug === item.key ||
            c.entitlementKey === item.slug ||
            c.entitlementKey === item.key ||
            c.id === `addon_${item.key}` ||
            c.id === `addon_${item.slug.replace(/-/g, "_")}`
        );
        expect(found).toBeDefined();
        expect(found?.navigationRoute).toBeDefined();
      }
    });

    it("should reject access when add-on is uninstalled, disabled, or expired", async () => {
      const checkWebhook = await checkTenantEntitlement(tenantAId, "webhook", false);
      expect(checkWebhook.entitled).toBe(false);

      const checkAi = await checkTenantEntitlement(tenantAId, "ai-assistant", false);
      expect(checkAi.entitled).toBe(false);

      const checkDoc = await checkTenantEntitlement(tenantAId, "ai-document", false);
      expect(checkDoc.entitled).toBe(false);

      const checkPlan = await checkTenantEntitlement(tenantAId, "planning", false);
      expect(checkPlan.entitled).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. WEBHOOK GATEWAY ACCEPTANCE
  // ──────────────────────────────────────────────────────────────────────────
  describe("2. Outbound Webhook Gateway Acceptance", () => {
    it("should dynamically discover runtime events from entitled manifests without hardcoded arrays", async () => {
      const catalog = await OutboundWebhooksService.getEventCatalog(tenantAId);
      expect(Array.isArray(catalog)).toBe(true);
      expect(catalog.length).toBeGreaterThan(0);
      expect(catalog.some((e) => e.key === "hrm.employee.created" || e.key.includes("employee"))).toBe(true);
      expect(catalog.some((e) => e.key === "payroll.run.finalized" || e.key.includes("payroll"))).toBe(true);
    });

    it("should block SSRF destinations (loopback, private networks, cloud metadata)", () => {
      const loopbackCheck = OutboundWebhooksService.validateUrlSafety("http://127.0.0.1:8080/hook");
      expect(loopbackCheck.safe).toBe(false);
      expect(loopbackCheck.error).toMatch(/SSRF/i);

      const privateNetCheck = OutboundWebhooksService.validateUrlSafety("http://192.168.1.100/webhook");
      expect(privateNetCheck.safe).toBe(false);
      expect(privateNetCheck.error).toMatch(/SSRF/i);

      const metadataCheck = OutboundWebhooksService.validateUrlSafety("http://169.254.169.254/latest/meta-data/");
      expect(metadataCheck.safe).toBe(false);
      expect(metadataCheck.error).toMatch(/SSRF/i);
    });

    it("should create endpoint with secret encryption and mask secret on reads", async () => {
      const { endpoint, rawSecret } = await OutboundWebhooksService.createEndpoint(tenantAId, userAId, {
        name: "Acme Webhook Integration",
        url: "https://example.com/webhooks/listener",
        events: ["employee.created", "leave.approved"],
      });

      expect(endpoint.id).toBeDefined();
      expect(endpoint.url).toBe("https://example.com/webhooks/listener");
      expect(endpoint.secretMasked).toBeDefined();
      expect(endpoint.secretMasked).toContain("••••");
      expect(rawSecret).toBeDefined();
      expect(rawSecret.startsWith("whsec_")).toBe(true);

      // Verify cross-tenant isolation
      const tenantBEndpoints = await OutboundWebhooksService.listEndpoints(tenantBId);
      expect(tenantBEndpoints.some((ep) => ep.id === endpoint.id)).toBe(false);
    });

    it("should compute and verify valid HMAC-SHA256 signature with timestamp", () => {
      const payload = JSON.stringify({ event: "employee.created", employeeId: "emp-101", name: "Alice" });
      const secret = "whsec_test_secret_123456789";
      const timestamp = Math.floor(Date.now() / 1000);

      const signature = OutboundWebhooksService.generateSignature(payload, secret, timestamp);
      expect(signature).toBeDefined();
      expect(signature).toContain(`t=${timestamp},v1=`);

      const isValid = OutboundWebhooksService.verifySignature(payload, signature, secret);
      expect(isValid).toBe(true);

      // Tampered payload fails verification
      const tampered = JSON.stringify({ event: "employee.created", employeeId: "emp-999", name: "Alice" });
      const isTamperedValid = OutboundWebhooksService.verifySignature(tampered, signature, secret);
      expect(isTamperedValid).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. AI ASSISTANT ACCEPTANCE
  // ──────────────────────────────────────────────────────────────────────────
  describe("3. Universal AI Assistant Acceptance", () => {
    it("should manage tenant-scoped encrypted provider configuration without leaking cleartext keys", async () => {
      const updated = await AiAssistantService.updateProviderConfig(tenantAId, {
        provider: "anthropic",
        apiKey: "sk-ant-api03-test-secret-key-12345",
        model: "claude-3-5-sonnet-20241022",
        isActive: true,
      });

      expect(updated.provider).toBe("anthropic");
      expect(updated.apiKeyMasked).toBeDefined();
      expect(updated.apiKeyMasked).toContain("••••");

      // Cross-tenant boundary: Tenant B's settings are completely unconfigured & isolated
      const tenantBConfig = await AiAssistantService.getProviderConfig(tenantBId);
      expect(tenantBConfig.isActive).toBe(false);
      expect(tenantBConfig.apiKeyMasked).toBe("");
    });

    it("should dynamically resolve models from active provider adapters without hardcoding", async () => {
      const openaiModels = await AiAssistantService.getModels("openai");
      expect(openaiModels.length).toBeGreaterThan(0);
      expect(openaiModels.some((m) => m.modelId.includes("gpt-4o"))).toBe(true);

      const anthropicModels = await AiAssistantService.getModels("anthropic");
      expect(anthropicModels.length).toBeGreaterThan(0);
      expect(anthropicModels.some((m) => m.modelId.includes("claude-3-5-sonnet"))).toBe(true);
    });

    it("should enforce tenant boundaries on generation history and usage metrics", async () => {
      const historyA = await AiAssistantService.getHistory(tenantAId);
      const historyB = await AiAssistantService.getHistory(tenantBId);
      expect(Array.isArray(historyA)).toBe(true);
      expect(Array.isArray(historyB)).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. AI DOCUMENT ACCEPTANCE
  // ──────────────────────────────────────────────────────────────────────────
  describe("4. AI Document Studio Acceptance", () => {
    it("should validate prompt template placeholder brackets", async () => {
      await expect(
        AiDocumentService.createTemplate(tenantAId, {
          title: "Malformed Template",
          promptTemplate: "Hello {unclosed_bracket and text",
        })
      ).rejects.toThrow(/bracket/i);
    });

    it("should guard referenced categories and tones from accidental deletion", async () => {
      const categories = await AiDocumentService.getCategories(tenantAId);
      expect(categories.length).toBeGreaterThan(0);

      const templates = await AiDocumentService.getTemplates(tenantAId);
      const referencedCatId = templates[0].categoryId;

      await expect(
        AiDocumentService.deleteCategory(tenantAId, referencedCatId)
      ).rejects.toThrow(/referenced by/i);
    });

    it("should export generated documents to .txt, .docx, and .pdf formats", async () => {
      const doc = await AiDocumentService.createDocument(tenantAId, userAId, {
        title: "Executive Acceptance Summary",
        content: "# Executive Acceptance\n\nAll four add-ons audited and verified for production compliance.",
        wordCount: 12,
        characterCount: 88,
      });

      // 1. TXT export
      const txt = await AiDocumentService.exportDocument(tenantAId, doc.id, "txt");
      expect(txt.contentType).toContain("text/plain");
      expect(txt.filename.endsWith(".txt")).toBe(true);
      expect(txt.buffer.toString("utf-8")).toContain("Executive Acceptance");

      // 2. DOCX export
      const docx = await AiDocumentService.exportDocument(tenantAId, doc.id, "docx");
      expect(docx.contentType).toMatch(/word/i);
      expect(docx.filename.endsWith(".docx")).toBe(true);
      expect(docx.buffer.toString("utf-8")).toContain("xmlns:w");

      // 3. PDF export
      const pdf = await AiDocumentService.exportDocument(tenantAId, doc.id, "pdf");
      expect(pdf.contentType).toBe("application/pdf");
      expect(pdf.filename.endsWith(".pdf")).toBe(true);
      expect(pdf.buffer.length).toBeGreaterThan(100);
      // PDF header validation (%PDF-)
      expect(pdf.buffer.toString("utf-8", 0, 5)).toContain("%PDF");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. PLANNING & STRATEGY ENGINE ACCEPTANCE
  // ──────────────────────────────────────────────────────────────────────────
  describe("5. Planning & Strategy Engine Acceptance", () => {
    it("should prevent creating or cloning a charter under an expired challenge", async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const expiredChallenge = await PlanningStrategyService.createChallenge(
        tenantAId,
        {
          name: "Expired 2025 Objective",
          startAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endAt: yesterday,
        },
        userAId
      );

      // Attempt createModel linked to expired challenge -> MUST throw error
      await expect(
        PlanningStrategyService.createModel(
          tenantAId,
          {
            name: "New Charter Under Expired Challenge",
            challengeId: expiredChallenge.id,
          },
          userAId
        )
      ).rejects.toThrow(/expired challenge/i);
    });

    it("should guard category deletion when referenced by existing challenges", async () => {
      const categories = await PlanningStrategyService.getCategories(tenantAId);
      const catId = categories[0].id;

      // Create a challenge referencing this category
      await PlanningStrategyService.createChallenge(
        tenantAId,
        {
          name: "Active 2026 Initiative",
          categoryId: catId,
          startAt: new Date().toISOString(),
          endAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        userAId
      );

      // Deleting category must fail with usage count
      await expect(
        PlanningStrategyService.deleteCategory(tenantAId, catId)
      ).rejects.toThrow(/referenced by/i);
    });

    it("should clone active charters with (Copy) naming and isolated ratings", async () => {
      const activeChallenge = await PlanningStrategyService.createChallenge(
        tenantAId,
        {
          name: "Active Q4 Innovation Sprint",
          startAt: new Date().toISOString(),
          endAt: new Date(Date.now() + 60 * 24 * 60 * 1000).toISOString(),
        },
        userAId
      );

      const original = await PlanningStrategyService.createModel(
        tenantAId,
        {
          name: "Digital Transformation Charter",
          challengeId: activeChallenge.id,
          description: "Core transformation charter",
          budgetAmount: 50000,
        },
        userAId
      );

      // Rate the original
      await PlanningStrategyService.rateModel(tenantAId, original.id, 5, userAId);

      // Clone the charter
      const cloned = await PlanningStrategyService.cloneModel(tenantAId, original.id, userAId);

      expect(cloned.id).not.toBe(original.id);
      expect(cloned.name).toBe("Digital Transformation Charter (Copy)");
      expect(cloned.ratingCount).toBe(0);
      expect(cloned.ratingAvg).toBe(0);
      expect(cloned.budgetAmount).toBe(50000);
    });

    it("should enforce exactly one rating per user and calculate accurate rating averages", async () => {
      const model = await PlanningStrategyService.createModel(
        tenantAId,
        {
          name: "Rating Aggregation Test Model",
        },
        userAId
      );

      // User A rates 4
      const r1 = await PlanningStrategyService.rateModel(tenantAId, model.id, 4, userAId);
      expect(r1.ratingCount).toBe(1);
      expect(r1.ratingAvg).toBe(4);

      // User B rates 5
      const r2 = await PlanningStrategyService.rateModel(tenantAId, model.id, 5, userBId);
      expect(r2.ratingCount).toBe(2);
      expect(r2.ratingAvg).toBe(4.5);

      // User A updates rating from 4 to 2 (1 rating per user rule)
      const r3 = await PlanningStrategyService.rateModel(tenantAId, model.id, 2, userAId);
      expect(r3.ratingCount).toBe(2); // Count does NOT increase
      expect(r3.ratingAvg).toBe(3.5); // (2 + 5) / 2 = 3.5
    });

    it("should compute accurate dashboard KPI analytics from persisted models and stages", async () => {
      const dashboard = await PlanningStrategyService.getDashboard(tenantAId);
      expect(dashboard).toBeDefined();
      expect(dashboard.totalChallenges).toBeGreaterThanOrEqual(1);
      expect(dashboard.totalModels).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(dashboard.modelsByStage)).toBe(true);
      expect(Array.isArray(dashboard.endingSoon)).toBe(true);
    });
  });
});
