"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortfolioService = void 0;
const prisma_1 = require("../prisma");
const crypto_1 = __importDefault(require("crypto"));
const db = prisma_1.rawPrisma || prisma_1.prisma;
class PortfolioService {
    static async getItemsList(tenantId) {
        const setting = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "portfolio_hub", key: "items" },
        });
        if (setting && setting.valueJson?.items) {
            return setting.valueJson.items;
        }
        return [];
    }
    static async saveItemsList(tenantId, items) {
        const existing = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "portfolio_hub", key: "items" },
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
                    group: "portfolio_hub",
                    key: "items",
                    valueJson: { items },
                    valueType: "json",
                    version: 1,
                },
            });
        }
    }
    static async listItems(tenantId, filters) {
        let list = await this.getItemsList(tenantId);
        if (filters?.category) {
            list = list.filter((p) => p.category === filters.category);
        }
        if (filters?.status) {
            list = list.filter((p) => p.status === filters.status);
        }
        if (filters?.tech) {
            list = list.filter((p) => p.technologies?.includes(filters.tech));
        }
        if (filters?.search) {
            const q = filters.search.toLowerCase();
            list = list.filter((p) => p.title.toLowerCase().includes(q) ||
                p.clientName.toLowerCase().includes(q) ||
                p.description.toLowerCase().includes(q));
        }
        return list.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    static async getItem(tenantId, idOrSlug) {
        const list = await this.getItemsList(tenantId);
        return list.find((p) => p.id === idOrSlug || p.slug === idOrSlug) || null;
    }
    static async createItem(tenantId, data, userId) {
        const list = await this.getItemsList(tenantId);
        const now = new Date().toISOString();
        const slug = (data.slug || data.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const item = {
            id: crypto_1.default.randomUUID(),
            tenantId,
            title: data.title.trim(),
            slug,
            clientName: data.clientName.trim(),
            category: data.category || "WEB",
            description: data.description.trim(),
            caseStudyHtml: data.caseStudyHtml,
            completedDate: data.completedDate,
            coverImageUrl: data.coverImageUrl,
            galleryUrls: data.galleryUrls || [],
            technologies: data.technologies || [],
            projectUrl: data.projectUrl,
            testimonial: data.testimonial || null,
            status: data.status || "DRAFT",
            sortOrder: data.sortOrder ?? list.length + 1,
            createdBy: userId,
            createdAt: now,
            updatedAt: now,
        };
        list.unshift(item);
        await this.saveItemsList(tenantId, list);
        return item;
    }
    static async updateItem(tenantId, id, updates) {
        const list = await this.getItemsList(tenantId);
        const item = list.find((p) => p.id === id);
        if (!item) {
            throw new Error(`Portfolio item '${id}' not found`);
        }
        Object.assign(item, updates, { updatedAt: new Date().toISOString() });
        await this.saveItemsList(tenantId, list);
        return item;
    }
    static async deleteItem(tenantId, id) {
        let list = await this.getItemsList(tenantId);
        const prevLen = list.length;
        list = list.filter((p) => p.id !== id);
        if (list.length === prevLen)
            return false;
        await this.saveItemsList(tenantId, list);
        return true;
    }
}
exports.PortfolioService = PortfolioService;
