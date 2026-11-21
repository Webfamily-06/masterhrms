"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeBaseService = void 0;
const prisma_1 = require("../prisma");
const crypto_1 = __importDefault(require("crypto"));
const db = prisma_1.rawPrisma || prisma_1.prisma;
const DEFAULT_CATEGORIES = [
    { name: "Getting Started & Onboarding", slug: "getting-started", description: "Company introduction and initial setup guides", icon: "rocket", sortOrder: 1 },
    { name: "HR Policies & Leave", slug: "hr-policies", description: "Standard operating procedures, leaves, and workplace conduct", icon: "shield-check", sortOrder: 2 },
    { name: "Payroll & Benefits", slug: "payroll-benefits", description: "Salary disbursement, tax declarations, and insurance benefits", icon: "credit-card", sortOrder: 3 },
    { name: "IT, Security & Equipment", slug: "it-security", description: "Device issuance, VPN, passwords, and cybersecurity guidelines", icon: "lock", sortOrder: 4 },
];
class KnowledgeBaseService {
    static async getCategoriesList(tenantId) {
        const setting = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "knowledge_base", key: "categories" },
        });
        if (setting && setting.valueJson?.items) {
            return setting.valueJson.items;
        }
        // Seed default categories
        const now = new Date().toISOString();
        const seeded = DEFAULT_CATEGORIES.map((cat) => ({
            ...cat,
            id: crypto_1.default.randomUUID(),
            tenantId,
            createdAt: now,
            updatedAt: now,
        }));
        await this.saveCategoriesList(tenantId, seeded);
        return seeded;
    }
    static async saveCategoriesList(tenantId, items) {
        const existing = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "knowledge_base", key: "categories" },
        });
        if (existing) {
            await db.setting.update({
                where: { id: existing.id },
                data: { valueJson: { items }, version: { increment: 1 } },
            });
        }
        else {
            await db.setting.create({
                data: {
                    scope: "TENANT",
                    scopeId: tenantId,
                    group: "knowledge_base",
                    key: "categories",
                    valueJson: { items },
                    valueType: "json",
                    version: 1,
                },
            });
        }
    }
    static async getArticlesList(tenantId) {
        const setting = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "knowledge_base", key: "articles" },
        });
        if (setting && setting.valueJson?.items) {
            return setting.valueJson.items;
        }
        return [];
    }
    static async saveArticlesList(tenantId, items) {
        const existing = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "knowledge_base", key: "articles" },
        });
        if (existing) {
            await db.setting.update({
                where: { id: existing.id },
                data: { valueJson: { items }, version: { increment: 1 } },
            });
        }
        else {
            await db.setting.create({
                data: {
                    scope: "TENANT",
                    scopeId: tenantId,
                    group: "knowledge_base",
                    key: "articles",
                    valueJson: { items },
                    valueType: "json",
                    version: 1,
                },
            });
        }
    }
    // --- CATEGORIES ---
    static async listCategories(tenantId) {
        const categories = await this.getCategoriesList(tenantId);
        return categories.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    static async createCategory(tenantId, data) {
        const list = await this.getCategoriesList(tenantId);
        const now = new Date().toISOString();
        const slug = (data.slug || data.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const newCat = {
            id: crypto_1.default.randomUUID(),
            tenantId,
            name: data.name.trim(),
            slug,
            description: data.description?.trim(),
            icon: data.icon || "folder",
            sortOrder: data.sortOrder ?? list.length + 1,
            createdAt: now,
            updatedAt: now,
        };
        list.push(newCat);
        await this.saveCategoriesList(tenantId, list);
        return newCat;
    }
    // --- ARTICLES ---
    static async listArticles(tenantId, filters) {
        let list = await this.getArticlesList(tenantId);
        const categories = await this.getCategoriesList(tenantId);
        const catMap = new Map(categories.map((c) => [c.id, c.name]));
        for (const art of list) {
            art.categoryName = catMap.get(art.categoryId) || "Uncategorized";
        }
        if (filters?.categoryId) {
            list = list.filter((a) => a.categoryId === filters.categoryId);
        }
        if (filters?.status) {
            list = list.filter((a) => a.status === filters.status);
        }
        if (filters?.tag) {
            list = list.filter((a) => a.tags?.includes(filters.tag));
        }
        if (filters?.search) {
            const q = filters.search.toLowerCase();
            list = list.filter((a) => a.title.toLowerCase().includes(q) ||
                a.summary?.toLowerCase().includes(q) ||
                a.content.toLowerCase().includes(q) ||
                a.tags?.some((t) => t.toLowerCase().includes(q)));
        }
        return list;
    }
    static async getArticle(tenantId, idOrSlug) {
        const list = await this.getArticlesList(tenantId);
        const article = list.find((a) => a.id === idOrSlug || a.slug === idOrSlug);
        if (!article)
            return null;
        const categories = await this.getCategoriesList(tenantId);
        const cat = categories.find((c) => c.id === article.categoryId);
        article.categoryName = cat?.name || "Uncategorized";
        return article;
    }
    static async createArticle(tenantId, data, authorId, authorName) {
        const list = await this.getArticlesList(tenantId);
        const now = new Date().toISOString();
        const slug = (data.slug || data.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const article = {
            id: crypto_1.default.randomUUID(),
            tenantId,
            categoryId: data.categoryId,
            title: data.title.trim(),
            slug,
            summary: data.summary?.trim(),
            content: data.content,
            tags: data.tags || [],
            status: data.status || "DRAFT",
            viewCount: 0,
            helpfulCount: 0,
            notHelpfulCount: 0,
            authorId,
            authorName,
            publishedAt: data.status === "PUBLISHED" ? now : null,
            createdAt: now,
            updatedAt: now,
        };
        list.unshift(article);
        await this.saveArticlesList(tenantId, list);
        return article;
    }
    static async incrementView(tenantId, id) {
        const list = await this.getArticlesList(tenantId);
        const article = list.find((a) => a.id === id || a.slug === id);
        if (!article)
            return 0;
        article.viewCount = (article.viewCount || 0) + 1;
        article.updatedAt = new Date().toISOString();
        await this.saveArticlesList(tenantId, list);
        return article.viewCount;
    }
    static async voteArticle(tenantId, id, helpful) {
        const list = await this.getArticlesList(tenantId);
        const article = list.find((a) => a.id === id || a.slug === id);
        if (!article) {
            throw new Error(`Article with id '${id}' not found`);
        }
        if (helpful) {
            article.helpfulCount = (article.helpfulCount || 0) + 1;
        }
        else {
            article.notHelpfulCount = (article.notHelpfulCount || 0) + 1;
        }
        article.updatedAt = new Date().toISOString();
        await this.saveArticlesList(tenantId, list);
        return article;
    }
}
exports.KnowledgeBaseService = KnowledgeBaseService;
