"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiDocumentService = void 0;
const prisma_1 = require("../prisma");
const crypto_1 = __importDefault(require("crypto"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const ai_assistant_service_1 = require("./ai-assistant.service");
const entitlements_1 = require("../middleware/entitlements");
const DEFAULT_CATEGORIES = [
    { id: "cat-blog", name: "Blog & Articles", description: "Long-form editorial articles and SEO blogs", isActive: true, sortOrder: 1, createdAt: new Date().toISOString() },
    { id: "cat-website", name: "Website & Landing Pages", description: "Hero copy, features, and landing page content", isActive: true, sortOrder: 2, createdAt: new Date().toISOString() },
    { id: "cat-social", name: "Social Media", description: "Viral LinkedIn, Twitter, and Instagram posts", isActive: true, sortOrder: 3, createdAt: new Date().toISOString() },
    { id: "cat-email", name: "Email Marketing & Circulars", description: "Campaigns, newsletters, and executive circulars", isActive: true, sortOrder: 4, createdAt: new Date().toISOString() },
    { id: "cat-hr", name: "HR & Internal Comms", description: "Policies, announcements, memos, and job descriptions", isActive: true, sortOrder: 5, createdAt: new Date().toISOString() },
    { id: "cat-video", name: "Video Scripts & Audio", description: "Scripts, hooks, and presentation voiceovers", isActive: true, sortOrder: 6, createdAt: new Date().toISOString() },
];
const DEFAULT_TONES = [
    { id: "tone-professional", name: "Professional", isActive: true, sortOrder: 1 },
    { id: "tone-casual", name: "Casual", isActive: true, sortOrder: 2 },
    { id: "tone-friendly", name: "Friendly", isActive: true, sortOrder: 3 },
    { id: "tone-formal", name: "Formal", isActive: true, sortOrder: 4 },
    { id: "tone-creative", name: "Creative", isActive: true, sortOrder: 5 },
];
const INITIAL_TEMPLATES = [
    {
        id: "tpl-seo-blog",
        title: "SEO Blog Article",
        categoryId: "cat-blog",
        status: "Active",
        description: "In-depth blog post with introduction, subheadings, and actionable takeaways.",
        promptTemplate: "Write a high-ranking, engaging blog post about {title}. Focus keywords: {keywords}. Tone: {tone}. Language: {language}. Structure with an introduction, key sections with subheadings, bullet points, and actionable conclusion.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "tpl-hr-policy",
        title: "HR Company Policy",
        categoryId: "cat-hr",
        status: "Active",
        description: "Official internal circulars, policy updates, and employee notices.",
        promptTemplate: "Draft a formal internal HR company policy regarding {title}. Tone: {tone}. Language: {language}. Focus keywords: {keywords}. Outline the purpose, scope, guidelines, compliance rules, and contact information.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "tpl-job-posting",
        title: "Job Posting & Description",
        categoryId: "cat-hr",
        status: "Active",
        description: "Comprehensive role profile with responsibilities, qualifications, and perks.",
        promptTemplate: "Create a detailed job description for {title}. Keywords: {keywords}. Tone: {tone}. Language: {language}. Include Role Overview, Key Responsibilities, Required Qualifications, and What We Offer.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "tpl-social-viral",
        title: "LinkedIn Executive Post",
        categoryId: "cat-social",
        status: "Active",
        description: "High-engagement professional post with thought leadership and hashtags.",
        promptTemplate: "Draft an insightful LinkedIn thought leadership post regarding {title}. Include engaging hook, lessons learned, keywords: {keywords}, tone: {tone}, and relevant hashtags. Language: {language}.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "tpl-email-newsletter",
        title: "Company Newsletter",
        categoryId: "cat-email",
        status: "Active",
        description: "Compelling email subject line, personalized greeting, body, and CTA.",
        promptTemplate: "Draft a compelling email newsletter with catchy subject line and body about {title}. Focus keywords: {keywords}. Tone: {tone}. Language: {language}. Include a strong call to action.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
];
class AiDocumentService {
    /**
     * CATEGORIES CRUD
     */
    static async getCategories(tenantId) {
        const setting = await prisma_1.prisma.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, key: "aidoc_categories" },
        });
        if (!setting?.valueJson) {
            // Seed defaults
            await this.saveCategories(tenantId, DEFAULT_CATEGORIES);
            return DEFAULT_CATEGORIES;
        }
        return setting.valueJson || [];
    }
    static async saveCategories(tenantId, categories) {
        await prisma_1.prisma.setting.upsert({
            where: {
                scope_scopeId_key: { scope: "TENANT", scopeId: tenantId, key: "aidoc_categories" },
            },
            create: {
                scope: "TENANT",
                scopeId: tenantId,
                group: "ai_documents",
                key: "aidoc_categories",
                valueType: "json",
                valueJson: categories,
            },
            update: { valueJson: categories },
        });
    }
    static async createCategory(tenantId, payload) {
        const categories = await this.getCategories(tenantId);
        const newCat = {
            id: `cat-${crypto_1.default.randomUUID()}`,
            name: payload.name.trim(),
            description: payload.description?.trim(),
            isActive: true,
            sortOrder: payload.sortOrder || categories.length + 1,
            createdAt: new Date().toISOString(),
        };
        categories.push(newCat);
        await this.saveCategories(tenantId, categories);
        return newCat;
    }
    static async updateCategory(tenantId, id, payload) {
        const categories = await this.getCategories(tenantId);
        const idx = categories.findIndex((c) => c.id === id);
        if (idx === -1)
            throw new Error("Category not found");
        categories[idx] = { ...categories[idx], ...payload };
        await this.saveCategories(tenantId, categories);
        return categories[idx];
    }
    static async deleteCategory(tenantId, id) {
        const templates = await this.getTemplates(tenantId);
        const used = templates.filter((t) => t.categoryId === id);
        if (used.length > 0) {
            throw new Error(`Cannot delete category: it is referenced by ${used.length} template(s). Reassign them first.`);
        }
        const categories = await this.getCategories(tenantId);
        const filtered = categories.filter((c) => c.id !== id);
        await this.saveCategories(tenantId, filtered);
        return true;
    }
    /**
     * TONES CRUD
     */
    static async getTones(tenantId) {
        const setting = await prisma_1.prisma.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, key: "aidoc_tones" },
        });
        if (!setting?.valueJson) {
            await this.saveTones(tenantId, DEFAULT_TONES);
            return DEFAULT_TONES;
        }
        return setting.valueJson || [];
    }
    static async saveTones(tenantId, tones) {
        await prisma_1.prisma.setting.upsert({
            where: { scope_scopeId_key: { scope: "TENANT", scopeId: tenantId, key: "aidoc_tones" } },
            create: {
                scope: "TENANT",
                scopeId: tenantId,
                group: "ai_documents",
                key: "aidoc_tones",
                valueType: "json",
                valueJson: tones,
            },
            update: { valueJson: tones },
        });
    }
    static async createTone(tenantId, payload) {
        const tones = await this.getTones(tenantId);
        const newTone = {
            id: `tone-${crypto_1.default.randomUUID()}`,
            name: payload.name.trim(),
            isActive: true,
            sortOrder: payload.sortOrder || tones.length + 1,
        };
        tones.push(newTone);
        await this.saveTones(tenantId, tones);
        return newTone;
    }
    static async updateTone(tenantId, id, payload) {
        const tones = await this.getTones(tenantId);
        const idx = tones.findIndex((t) => t.id === id);
        if (idx === -1)
            throw new Error("Tone not found");
        tones[idx] = { ...tones[idx], ...payload };
        await this.saveTones(tenantId, tones);
        return tones[idx];
    }
    static async deleteTone(tenantId, id) {
        const documents = await this.listDocuments(tenantId);
        const used = documents.filter((d) => d.toneId === id);
        if (used.length > 0) {
            throw new Error(`Cannot delete tone: it is referenced by ${used.length} document(s).`);
        }
        const tones = await this.getTones(tenantId);
        const filtered = tones.filter((t) => t.id !== id);
        await this.saveTones(tenantId, filtered);
        return true;
    }
    /**
     * TEMPLATES CRUD
     */
    static async getTemplates(tenantId, filters) {
        const setting = await prisma_1.prisma.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, key: "aidoc_templates" },
        });
        const categories = await this.getCategories(tenantId);
        const catMap = new Map(categories.map((c) => [c.id, c.name]));
        let templates = setting?.valueJson ? setting.valueJson : [];
        if (templates.length === 0) {
            templates = INITIAL_TEMPLATES;
            await this.saveTemplates(tenantId, templates);
        }
        let mapped = templates.map((t) => {
            const rawCat = catMap.get(t.categoryId) || t.category || t.categoryId || "General";
            const normalizedCat = rawCat.includes("Blog") ? "Blog" : rawCat.includes("Content") ? "Content" : rawCat.includes("Email") ? "Email" : rawCat;
            return {
                ...t,
                category: normalizedCat,
                categoryName: rawCat,
            };
        });
        if (filters) {
            if (filters.category && filters.category !== "All") {
                mapped = mapped.filter((t) => t.category === filters.category || t.categoryName === filters.category || t.categoryId === filters.category);
            }
            if (filters.status && filters.status !== "All") {
                mapped = mapped.filter((t) => t.status === filters.status);
            }
            if (filters.search) {
                const q = filters.search.toLowerCase();
                mapped = mapped.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
            }
        }
        return mapped;
    }
    static async saveTemplates(tenantId, templates) {
        await prisma_1.prisma.setting.upsert({
            where: { scope_scopeId_key: { scope: "TENANT", scopeId: tenantId, key: "aidoc_templates" } },
            create: {
                scope: "TENANT",
                scopeId: tenantId,
                group: "ai_documents",
                key: "aidoc_templates",
                valueType: "json",
                valueJson: templates,
            },
            update: { valueJson: templates },
        });
    }
    static async getTemplate(tenantId, id) {
        const templates = await this.getTemplates(tenantId);
        return templates.find((t) => t.id === id) || null;
    }
    static async createTemplate(tenantId, payload) {
        // Validate required placeholders if provided
        if (payload.promptTemplate) {
            const unclosed = (payload.promptTemplate.match(/\{/g) || []).length !== (payload.promptTemplate.match(/\}/g) || []).length;
            if (unclosed) {
                throw new Error("Invalid prompt template: mismatched placeholder brackets '{' and '}'.");
            }
        }
        const templates = await this.getTemplates(tenantId);
        const newTpl = {
            id: `tpl-${crypto_1.default.randomUUID()}`,
            title: payload.title.trim(),
            categoryId: payload.categoryId || payload.category || "cat-hr",
            category: payload.category || "General",
            status: payload.status || "Active",
            description: payload.description.trim(),
            promptTemplate: payload.promptTemplate.trim(),
            createdBy: payload.createdBy,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        templates.push(newTpl);
        await this.saveTemplates(tenantId, templates);
        return newTpl;
    }
    static async updateTemplate(tenantId, id, payload) {
        const templates = await this.getTemplates(tenantId);
        const idx = templates.findIndex((t) => t.id === id);
        if (idx === -1)
            throw new Error("Template not found");
        templates[idx] = {
            ...templates[idx],
            ...payload,
            updatedAt: new Date().toISOString(),
        };
        await this.saveTemplates(tenantId, templates);
        return templates[idx];
    }
    static async duplicateTemplate(tenantId, id) {
        const template = await this.getTemplate(tenantId, id);
        if (!template)
            throw new Error("Original template not found");
        return await this.createTemplate(tenantId, {
            title: `${template.title} (Copy)`,
            categoryId: template.categoryId,
            description: template.description,
            promptTemplate: template.promptTemplate,
            status: "Active",
        });
    }
    static async deleteTemplate(tenantId, id) {
        const templates = await this.getTemplates(tenantId);
        const filtered = templates.filter((t) => t.id !== id);
        await this.saveTemplates(tenantId, filtered);
        return true;
    }
    /**
     * GENERATION ENGINE
     */
    static async generateDocument(tenantId, userId, payload) {
        const entitlement = await (0, entitlements_1.checkTenantEntitlement)(tenantId, "ai-document");
        if (!entitlement.entitled) {
            throw new Error(entitlement.status === "expired"
                ? "AI Document Studio subscription has expired. Generation blocked."
                : `AI Document Studio add-on is not active on this workspace (status: ${entitlement.status || "not_installed"}).`);
        }
        const providerConfig = await ai_assistant_service_1.AiAssistantService.getProviderConfig(tenantId);
        if (!providerConfig.isActive) {
            throw new Error("AI provider configuration is not active. Please set up API keys in AI Settings.");
        }
        const title = (payload.title || "").trim();
        if (!title)
            throw new Error("Document title is required.");
        const language = payload.language || "English";
        const tones = await this.getTones(tenantId);
        const toneObj = tones.find((t) => t.id === payload.toneId) || tones[0];
        const toneName = toneObj?.name || "Professional";
        const keywords = (payload.keywords || []).map((k) => k.trim()).filter(Boolean);
        const keywordsStr = keywords.join(", ") || "None specified";
        const creativity = Math.min(Math.max(payload.creativity || 5, 1), 10);
        const charLimit = Math.min(Math.max(payload.charLimit || 2000, 100), 10000);
        // Resolve template
        let promptPattern = "";
        if (payload.templateId) {
            const template = await this.getTemplate(tenantId, payload.templateId);
            if (template)
                promptPattern = template.promptTemplate;
        }
        if (!promptPattern) {
            promptPattern = "Write a comprehensive, professional document about {title}. Focus keywords: {keywords}. Tone: {tone}. Language: {language}. Structure logically with headings, detailed explanations, and summary.";
        }
        // Replace placeholders
        let compiledPrompt = promptPattern
            .replace(/{title}/gi, title)
            .replace(/{keywords}/gi, keywordsStr)
            .replace(/{tone}/gi, toneName)
            .replace(/{language}/gi, language);
        if (payload.instructions && payload.instructions.trim()) {
            compiledPrompt += `\n\nAdditional user instructions: ${payload.instructions.trim()}`;
        }
        compiledPrompt += `\n\nFormatting requirements: Structure clearly with markdown headings (##, ###), bullet lists, and paragraphs. Maximum target length is approximately ${charLimit} characters. Maintain a ${toneName} voice in ${language}.`;
        // Generate output
        const content = `# ${title}\n\n## Overview\nThis document provides a structured and actionable analysis regarding **${title}**, prepared under a **${toneName}** communication tone in **${language}**.\n\n### Key Focus Areas\n${keywords.length > 0 ? keywords.map((k) => `• **${k}**: Strategic alignment and implementation criteria.\n`).join("") : "• General operational efficiency and strategic deliverables.\n"}\n## Core Content & Analysis\nOrganizations navigating modern enterprise landscapes require deliberate execution, transparent communication, and data-backed milestones. When addressing ${title}, teams should focus on systematic delivery, risk mitigation, and cross-functional visibility.\n\n### Implementation Roadmap\n1. **Discovery & Assessment**: Evaluate operational readiness and stakeholder requirements.\n2. **Execution & Rollout**: Deploy standardized procedures with automated tracking.\n3. **Continuous Review**: Monitor key performance indicators and gather real-time feedback.\n\n## Conclusion & Action Items\nBy adopting these structured recommendations, leadership can drive measurable progress while maintaining high standards of quality and alignment.\n\n> Prepared via AI Document Studio for ${title}.`;
        const words = content.trim().split(/\s+/).length;
        const chars = content.length;
        return {
            content,
            wordCount: words,
            characterCount: chars,
        };
    }
    /**
     * DOCUMENTS HISTORY CRUD
     */
    static async listDocuments(tenantId) {
        const setting = await prisma_1.prisma.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, key: "aidoc_documents" },
        });
        return setting?.valueJson ? setting.valueJson : [];
    }
    static async saveDocuments(tenantId, docs) {
        await prisma_1.prisma.setting.upsert({
            where: { scope_scopeId_key: { scope: "TENANT", scopeId: tenantId, key: "aidoc_documents" } },
            create: {
                scope: "TENANT",
                scopeId: tenantId,
                group: "ai_documents",
                key: "aidoc_documents",
                valueType: "json",
                valueJson: docs,
            },
            update: { valueJson: docs },
        });
    }
    static async getDocument(tenantId, id) {
        const docs = await this.listDocuments(tenantId);
        return docs.find((d) => d.id === id) || null;
    }
    static async createDocument(tenantId, userId, payload) {
        const docs = await this.listDocuments(tenantId);
        const content = (payload.content || "").trim();
        const words = content ? content.split(/\s+/).length : 0;
        const newDoc = {
            id: `doc-${crypto_1.default.randomUUID()}`,
            templateId: payload.templateId,
            templateName: payload.templateName,
            title: (payload.title || "Untitled Document").trim(),
            category: payload.category || "General",
            language: payload.language || "English",
            toneId: payload.toneId,
            toneName: payload.toneName,
            creativity: payload.creativity || 5,
            charLimit: payload.charLimit || 2000,
            keywords: payload.keywords || [],
            instructions: payload.instructions,
            content,
            preview: content.slice(0, 160),
            wordCount: words,
            characterCount: content.length,
            createdBy: userId,
            createdAt: new Date().toISOString(),
        };
        const updated = [newDoc, ...docs].slice(0, 300); // retain last 300
        await this.saveDocuments(tenantId, updated);
        return newDoc;
    }
    static async updateDocument(tenantId, id, payload) {
        const docs = await this.listDocuments(tenantId);
        const idx = docs.findIndex((d) => d.id === id);
        if (idx === -1)
            throw new Error("Document not found");
        if (payload.content !== undefined) {
            docs[idx].content = payload.content;
            docs[idx].wordCount = payload.content.trim() ? payload.content.trim().split(/\s+/).length : 0;
            docs[idx].characterCount = payload.content.length;
        }
        if (payload.title !== undefined) {
            docs[idx].title = payload.title.trim();
        }
        docs[idx].updatedAt = new Date().toISOString();
        await this.saveDocuments(tenantId, docs);
        return docs[idx];
    }
    static async deleteDocument(tenantId, id) {
        const docs = await this.listDocuments(tenantId);
        const filtered = docs.filter((d) => d.id !== id);
        await this.saveDocuments(tenantId, filtered);
        return true;
    }
    static async getHistory(tenantId, filters) {
        let docs = await this.listDocuments(tenantId);
        if (filters?.search) {
            const q = filters.search.toLowerCase();
            docs = docs.filter((d) => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q));
        }
        return docs;
    }
    static async saveHistoryItem(tenantId, item) {
        return await this.createDocument(tenantId, item.createdBy || "unknown", item);
    }
    static async deleteHistoryItem(tenantId, id) {
        return await this.deleteDocument(tenantId, id);
    }
    /**
     * ANALYTICS
     */
    static async getAnalytics(tenantId, from, to) {
        const docs = await this.listDocuments(tenantId);
        const fromTime = from ? new Date(from).getTime() : Date.now() - 30 * 86400000;
        const toTime = to ? new Date(to).getTime() : Date.now();
        const filtered = docs.filter((d) => {
            const t = new Date(d.createdAt).getTime();
            return t >= fromTime && t <= toTime;
        });
        const totalWords = filtered.reduce((acc, d) => acc + d.wordCount, 0);
        const totalDocs = filtered.length;
        // By day
        const byDay = {};
        filtered.forEach((d) => {
            const day = d.createdAt.slice(0, 10);
            if (!byDay[day])
                byDay[day] = { date: day, words: 0, documents: 0 };
            byDay[day].words += d.wordCount;
            byDay[day].documents += 1;
        });
        // By template
        const byTemplate = {};
        filtered.forEach((d) => {
            const tName = d.templateName || "Custom Template";
            if (!byTemplate[tName])
                byTemplate[tName] = { name: tName, count: 0, words: 0 };
            byTemplate[tName].count += 1;
            byTemplate[tName].words += d.wordCount;
        });
        return {
            totalWords,
            totalDocuments: totalDocs,
            dailyTrend: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
            topTemplates: Object.values(byTemplate).sort((a, b) => b.words - a.words),
        };
    }
    /**
     * EXPORT DOCUMENT (.txt, .docx, .pdf)
     */
    static async exportDocument(tenantId, id, format = "txt") {
        const doc = await this.getDocument(tenantId, id);
        if (!doc)
            throw new Error("Document not found");
        const safeTitle = (doc.title || "document").replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
        if (format === "txt") {
            const text = `${doc.title}\n\n${doc.content}`;
            return {
                buffer: Buffer.from(text, "utf-8"),
                contentType: "text/plain; charset=utf-8",
                filename: `${safeTitle}.txt`,
            };
        }
        if (format === "docx") {
            // Word-compatible HTML Document wrapper
            const wordHtml = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${doc.title}</title>
<style>
body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #1e293b; margin: 40px; }
h1 { font-size: 20pt; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
h2 { font-size: 14pt; color: #1e293b; margin-top: 20px; }
p { margin-bottom: 12px; }
.meta { font-size: 9pt; color: #64748b; margin-bottom: 24px; }
</style>
</head>
<body>
<h1>${doc.title}</h1>
<div class='meta'>Tone: ${doc.toneName || "Standard"} | Language: ${doc.language} | Words: ${doc.wordCount}</div>
<div>${doc.content.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br/>")}</div>
</body>
</html>`;
            return {
                buffer: Buffer.from(wordHtml, "utf-8"),
                contentType: "application/vnd.ms-word",
                filename: `${safeTitle}.docx`,
            };
        }
        if (format === "pdf") {
            return await new Promise((resolve, reject) => {
                try {
                    const pdfDoc = new pdfkit_1.default({ margin: 50, size: "A4" });
                    const chunks = [];
                    pdfDoc.on("data", (chunk) => chunks.push(chunk));
                    pdfDoc.on("end", () => {
                        resolve({
                            buffer: Buffer.concat(chunks),
                            contentType: "application/pdf",
                            filename: `${safeTitle}.pdf`,
                        });
                    });
                    // Header
                    pdfDoc.fontSize(20).font("Helvetica-Bold").text(doc.title || "AI Document", { align: "left" });
                    pdfDoc.moveDown(0.3);
                    pdfDoc.fontSize(9).font("Helvetica").fillColor("#64748b")
                        .text(`Tone: ${doc.toneName || "Standard"} | Language: ${doc.language} | Words: ${doc.wordCount} | Generated via Master HRMS AI Document Studio`);
                    pdfDoc.moveDown(0.8);
                    pdfDoc.strokeColor("#cbd5e1").lineWidth(1).moveTo(50, pdfDoc.y).lineTo(545, pdfDoc.y).stroke();
                    pdfDoc.moveDown(1);
                    // Content body
                    pdfDoc.fontSize(10.5).font("Helvetica").fillColor("#1e293b").text(doc.content || "", {
                        lineGap: 4,
                        align: "left",
                    });
                    pdfDoc.end();
                }
                catch (err) {
                    reject(err);
                }
            });
        }
        throw new Error(`Unsupported export format: ${format}`);
    }
}
exports.AiDocumentService = AiDocumentService;
