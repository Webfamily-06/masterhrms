import { describe, it, expect } from "vitest";
import { SuggestionBoxService } from "../services/suggestion-box.service";
import { AiDocumentService } from "../services/ai-document.service";

describe("Addon Modules Verification Test Suite", () => {
  const tenantId = `test-addon-${Date.now()}`;
  const userId = `user-${Date.now()}`;
  const otherUserId = `other-user-${Date.now()}`;

  describe("1. Suggestion Box Addon Verification", () => {
    it("should fetch and seed default categories", async () => {
      const categories = await SuggestionBoxService.getCategories(tenantId);
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
      expect(categories[0]).toHaveProperty("name");
      expect(categories[0]).toHaveProperty("color");
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

      expect(newCategory).toBeDefined();
      expect(newCategory.name).toBe("Sustainability & Green Initiatives");
      expect(newCategory.color).toBe("#10b981");

      const all = await SuggestionBoxService.getCategories(tenantId);
      expect(all.some((c) => c.name === "Sustainability & Green Initiatives")).toBe(true);
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

      expect(suggestion.id).toBeDefined();
      expect(suggestion.title).toBe("Install Solar Panels on Rooftop");
      expect(suggestion.isAnonymous).toBe(true);
      expect(suggestion.status).toBe("New");
      expect(suggestion.viewCount).toBeGreaterThanOrEqual(1);
      expect(suggestion.voteCount).toBe(0);
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
      await expect(
        SuggestionBoxService.toggleVote(tenantId, suggestion.id, userId)
      ).rejects.toThrow(/self-voting/i);

      // Other user can vote
      const voted = await SuggestionBoxService.toggleVote(tenantId, suggestion.id, otherUserId);
      expect(voted.voted).toBe(true);
      expect(voted.voteCount).toBe(1);

      // Other user voting again removes vote (toggle)
      const unvoted = await SuggestionBoxService.toggleVote(tenantId, suggestion.id, otherUserId);
      expect(unvoted.voted).toBe(false);
      expect(unvoted.voteCount).toBe(0);
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
      expect(retrieved).not.toBeNull();
      expect(retrieved?.viewCount).toBeGreaterThanOrEqual(1);
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

      expect(updated.status).toBe("Accepted");
      expect(updated.adminResponse?.responseNotes).toContain("Engineering leadership has approved");

      // Check status histories audit log
      const histories = await SuggestionBoxService.getStatusHistories(tenantId, suggestion.id);
      expect(histories.length).toBeGreaterThan(0);
      expect(histories[0].newStatus).toBe("Accepted");
      expect(histories[0].notes).toContain("Great idea");
    });

    it("should compute accurate KPI statistics", async () => {
      const stats = await SuggestionBoxService.getStats(tenantId);
      expect(stats.total).toBeGreaterThanOrEqual(4);
      expect(stats.accepted).toBeGreaterThanOrEqual(1);
      expect(typeof stats.totalVotes).toBe("number");
      expect(typeof stats.totalViews).toBe("number");
    });
  });

  describe("2. AI Document Studio Verification", () => {
    it("should fetch and seed default prompt templates", async () => {
      const templates = await AiDocumentService.getTemplates(tenantId);
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThanOrEqual(5);

      const blogTpl = templates.find((t) => t.category === "Blog");
      expect(blogTpl).toBeDefined();
      expect(blogTpl?.promptTemplate).toContain("{title}");
      expect(blogTpl?.promptTemplate).toContain("{keywords}");
    });

    it("should create custom prompt templates with placeholders", async () => {
      const customTpl = await AiDocumentService.createTemplate(tenantId, {
        title: "Quarterly Financial Executive Summary",
        category: "Content",
        status: "Active",
        description: "High-level summary for board members and investors.",
        promptTemplate: "Generate a quarterly financial summary for {title}. Keywords: {keywords}. Tone: {tone}. Language: {language}.",
      });

      expect(customTpl.id).toBeDefined();
      expect(customTpl.title).toBe("Quarterly Financial Executive Summary");
      expect(customTpl.status).toBe("Active");

      const all = await AiDocumentService.getTemplates(tenantId, { category: "Content" });
      expect(all.some((t) => t.id === customTpl.id)).toBe(true);
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
      expect(updated?.status).toBe("Active");
      expect(updated?.description).toBe("Updated description");

      const deleted = await AiDocumentService.deleteTemplate(tenantId, tpl.id);
      expect(deleted).toBe(true);

      const allAfter = await AiDocumentService.getTemplates(tenantId);
      expect(allAfter.some((t) => t.id === tpl.id)).toBe(false);
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

      expect(savedDoc.id).toBeDefined();
      expect(savedDoc.title).toBe("2026 AI Strategy Roadmap");
      expect(savedDoc.wordCount).toBeGreaterThan(10);
      expect(savedDoc.characterCount).toBeGreaterThan(50);
      expect(savedDoc.preview).toBeDefined();

      const history = await AiDocumentService.getHistory(tenantId);
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0].id).toBe(savedDoc.id);

      // Delete from history
      const deleted = await AiDocumentService.deleteHistoryItem(tenantId, savedDoc.id);
      expect(deleted).toBe(true);

      const historyAfter = await AiDocumentService.getHistory(tenantId);
      expect(historyAfter.some((h) => h.id === savedDoc.id)).toBe(false);
    });
  });
});
