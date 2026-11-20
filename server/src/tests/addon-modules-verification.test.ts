import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { SuggestionBoxService } from "../services/suggestion-box.service";
import { AiDocumentService } from "../services/ai-document.service";

describe("Addon Modules Verification Test Suite", () => {
  const tenantId = `test-addon-${Date.now()}`;
  const userId = `user-${Date.now()}`;
  const otherUserId = `other-user-${Date.now()}`;

  before(async () => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await SuggestionBoxService.getCategories("warmup-tenant");
        break;
      } catch (e) {
        if (attempt === 3) throw e;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  });

  describe("1. Suggestion Box Addon Verification", () => {
    it("should fetch and seed default categories", async () => {
      const categories = await SuggestionBoxService.getCategories(tenantId);
      assert.equal(Array.isArray(categories), true);
      assert.ok(categories.length > 0);
      assert.ok("name" in categories[0]);
      assert.ok("color" in categories[0]);
    });

    it("should allow creating a custom category", async () => {
      const newCategory = await SuggestionBoxService.createCategory(
        tenantId,
        {
          name: "Sustainability & Green Initiatives",
          color: "#10b981",
          displayOrder: 10,
          description: "Eco-friendly office projects and recycling",
          isActive: true,
        },
        userId
      );

      assert.ok(newCategory !== undefined);
      assert.equal(newCategory.name, "Sustainability & Green Initiatives");
      assert.equal(newCategory.color, "#10b981");

      const all = await SuggestionBoxService.getCategories(tenantId);
      assert.ok(all.some((c) => c.name === "Sustainability & Green Initiatives"));
    });

    it("should create suggestions with anonymous toggle and persist them", async () => {
      const categories = await SuggestionBoxService.getCategories(tenantId);
      const catId = categories[0].id;

      const suggestion = await SuggestionBoxService.createSuggestion(
        tenantId,
        {
          title: "Install Solar Panels on Rooftop",
          description: "Reduce company carbon footprint and cut energy bills by 30%.",
          categoryId: catId,
          isAnonymous: true,
        },
        userId,
        "John Doe"
      );

      assert.ok(suggestion.id !== undefined);
      assert.equal(suggestion.title, "Install Solar Panels on Rooftop");
      assert.equal(suggestion.isAnonymous, true);
      assert.equal(suggestion.status, "New");
      assert.ok(suggestion.viewCount >= 1);
      assert.equal(suggestion.voteCount, 0);
    });

    it("should enforce vote toggle and prevent self-voting", async () => {
      const categories = await SuggestionBoxService.getCategories(tenantId);
      const catId = categories[0].id;

      const suggestion = await SuggestionBoxService.createSuggestion(
        tenantId,
        {
          title: "Flexible Remote Work Friday",
          description: "Allow hybrid employees to work from home every Friday.",
          categoryId: catId,
          isAnonymous: false,
        },
        userId,
        "Alice Smith"
      );

      // Self-voting should throw error
      await assert.rejects(
        async () => {
          await SuggestionBoxService.toggleVote(tenantId, suggestion.id, userId);
        },
        /self-voting/i
      );

      // Other user can vote
      const voted = await SuggestionBoxService.toggleVote(tenantId, suggestion.id, otherUserId);
      assert.equal(voted.voted, true);
      assert.equal(voted.voteCount, 1);

      // Other user voting again removes vote (toggle)
      const unvoted = await SuggestionBoxService.toggleVote(tenantId, suggestion.id, otherUserId);
      assert.equal(unvoted.voted, false);
      assert.equal(unvoted.voteCount, 0);
    });

    it("should track view counts when retrieved", async () => {
      const categories = await SuggestionBoxService.getCategories(tenantId);
      const catId = categories[0].id;

      const suggestion = await SuggestionBoxService.createSuggestion(
        tenantId,
        {
          title: "Ergonomic Chairs for Engineering",
          description: "Improve seating ergonomics to reduce back strain.",
          categoryId: catId,
          isAnonymous: false,
        },
        userId,
        "Bob"
      );

      const retrieved = await SuggestionBoxService.getSuggestionById(tenantId, suggestion.id, otherUserId);
      assert.ok(retrieved !== null);
      assert.ok((retrieved?.viewCount ?? 0) >= 1);
    });

    it("should add admin response and record status history log", async () => {
      const categories = await SuggestionBoxService.getCategories(tenantId);
      const catId = categories[0].id;

      const suggestion = await SuggestionBoxService.createSuggestion(
        tenantId,
        {
          title: "Weekly Tech Talk Sessions",
          description: "Share knowledge on AI, cloud architectures and security.",
          categoryId: catId,
          isAnonymous: false,
        },
        userId,
        "Charlie"
      );

      const updated = await SuggestionBoxService.adminRespond(
        tenantId,
        suggestion.id,
        "Accepted",
        "Great idea! Engineering leadership has approved budget for weekly tech snacks.",
        "admin-1",
        "HR Director"
      );

      assert.equal(updated.status, "Accepted");
      assert.ok(updated.adminResponse?.responseNotes?.includes("Engineering leadership has approved"));

      // Check status histories audit log
      const histories = await SuggestionBoxService.getStatusHistories(tenantId, suggestion.id);
      assert.ok(histories.length > 0);
      assert.equal(histories[0].newStatus, "Accepted");
      assert.ok(histories[0].notes.includes("Great idea"));
    });

    it("should compute accurate KPI statistics", async () => {
      const stats = await SuggestionBoxService.getStats(tenantId);
      assert.ok(stats.total >= 4);
      assert.ok(stats.accepted >= 1);
      assert.equal(typeof stats.totalVotes, "number");
      assert.equal(typeof stats.totalViews, "number");
    });
  });

  describe("2. AI Document Studio Verification", () => {
    it("should fetch and seed default prompt templates", async () => {
      const templates = await AiDocumentService.getTemplates(tenantId);
      assert.equal(Array.isArray(templates), true);
      assert.ok(templates.length >= 5);

      const blogTpl = templates.find((t) => t.category === "Blog");
      assert.ok(blogTpl !== undefined);
      assert.ok(blogTpl?.promptTemplate.includes("{title}"));
      assert.ok(blogTpl?.promptTemplate.includes("{keywords}"));
    });

    it("should create custom prompt templates with placeholders", async () => {
      const customTpl = await AiDocumentService.createTemplate(tenantId, {
        title: "Quarterly Financial Executive Summary",
        category: "Content",
        status: "Active",
        description: "High-level summary for board members and investors.",
        promptTemplate: "Generate a quarterly financial summary for {title}. Keywords: {keywords}. Tone: {tone}. Language: {language}.",
      });

      assert.ok(customTpl.id !== undefined);
      assert.equal(customTpl.title, "Quarterly Financial Executive Summary");
      assert.equal(customTpl.status, "Active");

      const all = await AiDocumentService.getTemplates(tenantId, { category: "Content" });
      assert.ok(all.some((t) => t.id === customTpl.id));
    });

    it("should update and delete prompt templates", async () => {
      const tpl = await AiDocumentService.createTemplate(tenantId, {
        title: "Draft for deletion",
        category: "Email",
        status: "Inactive",
        description: "Temporary",
        promptTemplate: "Test {title}",
      });

      const updated = await AiDocumentService.updateTemplate(tenantId, tpl.id, {
        status: "Active",
        description: "Updated description",
      });
      assert.equal(updated?.status, "Active");
      assert.equal(updated?.description, "Updated description");

      const deleted = await AiDocumentService.deleteTemplate(tenantId, tpl.id);
      assert.equal(deleted, true);

      const allAfter = await AiDocumentService.getTemplates(tenantId);
      assert.equal(allAfter.some((t) => t.id === tpl.id), false);
    });

    it("should save generated documents to history archive and calculate metrics", async () => {
      const savedDoc = await AiDocumentService.saveHistoryItem(tenantId, {
        title: "2026 AI Strategy Roadmap",
        templateName: "Executive Summary",
        category: "Content",
        language: "English",
        tone: "Professional",
        creativity: "Level 5",
        keywords: ["ai", "growth", "automation"],
        content: "Master ERP 2026 strategic vision focusing on enterprise workflows, zero mock data, and full tenant isolation.",
        createdBy: userId,
      });

      assert.ok(savedDoc.id !== undefined);
      assert.equal(savedDoc.title, "2026 AI Strategy Roadmap");
      assert.ok(savedDoc.wordCount > 10);
      assert.ok(savedDoc.characterCount > 50);
      assert.ok(savedDoc.preview !== undefined);

      const history = await AiDocumentService.getHistory(tenantId);
      assert.ok(history.length >= 1);
      assert.equal(history[0].id, savedDoc.id);

      // Delete from history
      const deleted = await AiDocumentService.deleteHistoryItem(tenantId, savedDoc.id);
      assert.equal(deleted, true);

      const historyAfter = await AiDocumentService.getHistory(tenantId);
      assert.equal(historyAfter.some((h) => h.id === savedDoc.id), false);
    });
  });
});
