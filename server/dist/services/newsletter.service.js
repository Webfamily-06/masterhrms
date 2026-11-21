"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsletterService = void 0;
const prisma_1 = require("../prisma");
const crypto_1 = __importDefault(require("crypto"));
const db = prisma_1.rawPrisma || prisma_1.prisma;
class NewsletterService {
    static async getSubscribers(tenantId) {
        const setting = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "newsletter", key: "subscribers" },
        });
        if (setting && setting.valueJson?.items) {
            return setting.valueJson.items;
        }
        return [];
    }
    static async saveSubscribers(tenantId, items) {
        const existing = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "newsletter", key: "subscribers" },
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
                    group: "newsletter",
                    key: "subscribers",
                    valueJson: { items },
                    valueType: "json",
                    version: 1,
                },
            });
        }
    }
    static async getCampaigns(tenantId) {
        const setting = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "newsletter", key: "campaigns" },
        });
        if (setting && setting.valueJson?.items) {
            return setting.valueJson.items;
        }
        return [];
    }
    static async saveCampaigns(tenantId, items) {
        const existing = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "newsletter", key: "campaigns" },
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
                    group: "newsletter",
                    key: "campaigns",
                    valueJson: { items },
                    valueType: "json",
                    version: 1,
                },
            });
        }
    }
    // --- SUBSCRIBER MANAGEMENT ---
    static async listSubscribers(tenantId, filters) {
        let list = await this.getSubscribers(tenantId);
        if (filters?.status) {
            list = list.filter((s) => s.status === filters.status);
        }
        if (filters?.tag) {
            list = list.filter((s) => s.tags?.includes(filters.tag));
        }
        if (filters?.search) {
            const q = filters.search.toLowerCase();
            list = list.filter((s) => s.email.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q));
        }
        return list;
    }
    static async addSubscriber(tenantId, data) {
        const list = await this.getSubscribers(tenantId);
        const normalizedEmail = data.email.trim().toLowerCase();
        const existingIndex = list.findIndex((s) => s.email.toLowerCase() === normalizedEmail);
        const now = new Date().toISOString();
        if (existingIndex >= 0) {
            const existing = list[existingIndex];
            existing.status = "SUBSCRIBED";
            existing.optInAt = now;
            if (data.name)
                existing.name = data.name;
            if (data.tags) {
                existing.tags = Array.from(new Set([...existing.tags, ...data.tags]));
            }
            existing.updatedAt = now;
            await this.saveSubscribers(tenantId, list);
            return existing;
        }
        const newSub = {
            id: crypto_1.default.randomUUID(),
            tenantId,
            email: normalizedEmail,
            name: data.name?.trim(),
            status: "SUBSCRIBED",
            tags: data.tags || [],
            source: data.source || "direct_signup",
            optInAt: now,
            createdAt: now,
            updatedAt: now,
        };
        list.unshift(newSub);
        await this.saveSubscribers(tenantId, list);
        return newSub;
    }
    static async unsubscribe(tenantId, email) {
        const list = await this.getSubscribers(tenantId);
        const normalizedEmail = email.trim().toLowerCase();
        const sub = list.find((s) => s.email.toLowerCase() === normalizedEmail);
        if (!sub)
            return false;
        sub.status = "UNSUBSCRIBED";
        sub.optOutAt = new Date().toISOString();
        sub.updatedAt = new Date().toISOString();
        await this.saveSubscribers(tenantId, list);
        return true;
    }
    // --- CAMPAIGN MANAGEMENT ---
    static async listCampaigns(tenantId, status) {
        const list = await this.getCampaigns(tenantId);
        if (status) {
            return list.filter((c) => c.status === status);
        }
        return list;
    }
    static async getCampaign(tenantId, id) {
        const list = await this.getCampaigns(tenantId);
        return list.find((c) => c.id === id) || null;
    }
    static async createCampaign(tenantId, data, userId) {
        const list = await this.getCampaigns(tenantId);
        const now = new Date().toISOString();
        const campaign = {
            id: crypto_1.default.randomUUID(),
            tenantId,
            title: data.title.trim(),
            subject: data.subject.trim(),
            previewText: data.previewText?.trim(),
            contentHtml: data.contentHtml,
            targetTags: data.targetTags || [],
            status: data.scheduledAt ? "SCHEDULED" : "DRAFT",
            scheduledAt: data.scheduledAt || null,
            recipientsCount: 0,
            openCount: 0,
            clickCount: 0,
            createdBy: userId,
            createdAt: now,
            updatedAt: now,
        };
        list.unshift(campaign);
        await this.saveCampaigns(tenantId, list);
        return campaign;
    }
    static async sendCampaign(tenantId, id) {
        const list = await this.getCampaigns(tenantId);
        const campaign = list.find((c) => c.id === id);
        if (!campaign) {
            throw new Error(`Campaign with id '${id}' not found`);
        }
        const subscribers = await this.getSubscribers(tenantId);
        let recipients = subscribers.filter((s) => s.status === "SUBSCRIBED");
        if (campaign.targetTags && campaign.targetTags.length > 0) {
            recipients = recipients.filter((s) => s.tags?.some((t) => campaign.targetTags?.includes(t)));
        }
        const now = new Date().toISOString();
        campaign.status = "SENT";
        campaign.sentAt = now;
        campaign.recipientsCount = recipients.length;
        campaign.updatedAt = now;
        await this.saveCampaigns(tenantId, list);
        return campaign;
    }
    static async getStats(tenantId) {
        const subscribers = await this.getSubscribers(tenantId);
        const campaigns = await this.getCampaigns(tenantId);
        const totalSubscribers = subscribers.length;
        const activeSubscribers = subscribers.filter((s) => s.status === "SUBSCRIBED").length;
        const unsubscribedCount = subscribers.filter((s) => s.status === "UNSUBSCRIBED").length;
        const sentCampaigns = campaigns.filter((c) => c.status === "SENT").length;
        return {
            totalSubscribers,
            activeSubscribers,
            unsubscribedCount,
            totalCampaigns: campaigns.length,
            sentCampaigns,
        };
    }
}
exports.NewsletterService = NewsletterService;
