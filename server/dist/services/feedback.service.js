"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackService = void 0;
const prisma_1 = require("../prisma");
const crypto_1 = __importDefault(require("crypto"));
const db = prisma_1.rawPrisma || prisma_1.prisma;
class FeedbackService {
    static async getFeedbackList(tenantId) {
        const setting = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "customer_feedback", key: "submissions" },
        });
        if (setting && setting.valueJson?.items) {
            return setting.valueJson.items;
        }
        return [];
    }
    static async saveFeedbackList(tenantId, items) {
        const existing = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "customer_feedback", key: "submissions" },
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
                    group: "customer_feedback",
                    key: "submissions",
                    valueJson: { items },
                    valueType: "json",
                    version: 1,
                },
            });
        }
    }
    static async listSubmissions(tenantId, filters) {
        let list = await this.getFeedbackList(tenantId);
        if (filters?.targetType) {
            list = list.filter((f) => f.targetType === filters.targetType);
        }
        if (filters?.category) {
            list = list.filter((f) => f.category === filters.category);
        }
        if (filters?.status) {
            list = list.filter((f) => f.status === filters.status);
        }
        if (filters?.rating !== undefined) {
            list = list.filter((f) => f.rating === filters.rating);
        }
        if (filters?.search) {
            const q = filters.search.toLowerCase();
            list = list.filter((f) => f.title.toLowerCase().includes(q) ||
                f.comments.toLowerCase().includes(q) ||
                f.submitterName?.toLowerCase().includes(q));
        }
        return list;
    }
    static async getSubmission(tenantId, id) {
        const list = await this.getFeedbackList(tenantId);
        return list.find((f) => f.id === id) || null;
    }
    static async submitFeedback(tenantId, data) {
        const list = await this.getFeedbackList(tenantId);
        const now = new Date().toISOString();
        const rating = Math.min(5, Math.max(1, Math.round(data.rating)));
        let sentiment = "NEUTRAL";
        if (rating >= 4)
            sentiment = "POSITIVE";
        else if (rating <= 2)
            sentiment = "NEGATIVE";
        const item = {
            id: crypto_1.default.randomUUID(),
            tenantId,
            targetType: data.targetType || "CUSTOMER",
            category: data.category || "GENERAL",
            rating,
            sentiment,
            title: data.title.trim(),
            comments: data.comments.trim(),
            submitterName: data.isAnonymous ? "Anonymous" : data.submitterName?.trim(),
            submitterEmail: data.isAnonymous ? undefined : data.submitterEmail?.trim(),
            isAnonymous: Boolean(data.isAnonymous),
            status: "NEW",
            createdAt: now,
            updatedAt: now,
        };
        list.unshift(item);
        await this.saveFeedbackList(tenantId, list);
        return item;
    }
    static async resolveFeedback(tenantId, id, data, userId) {
        const list = await this.getFeedbackList(tenantId);
        const item = list.find((f) => f.id === id);
        if (!item) {
            throw new Error(`Feedback submission '${id}' not found`);
        }
        const now = new Date().toISOString();
        item.status = data.status;
        item.resolutionNotes = data.resolutionNotes;
        item.resolvedBy = userId;
        item.resolvedAt = now;
        item.updatedAt = now;
        await this.saveFeedbackList(tenantId, list);
        return item;
    }
    static async getMetrics(tenantId) {
        const list = await this.getFeedbackList(tenantId);
        const total = list.length;
        if (total === 0) {
            return {
                totalSubmissions: 0,
                averageRating: 0,
                ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                sentimentDistribution: { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 },
                statusDistribution: { NEW: 0, IN_REVIEW: 0, RESOLVED: 0, ARCHIVED: 0 },
            };
        }
        const sumRating = list.reduce((acc, f) => acc + f.rating, 0);
        const averageRating = Number((sumRating / total).toFixed(2));
        const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const sentimentDistribution = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };
        const statusDistribution = { NEW: 0, IN_REVIEW: 0, RESOLVED: 0, ARCHIVED: 0 };
        for (const f of list) {
            ratingDistribution[f.rating] = (ratingDistribution[f.rating] || 0) + 1;
            sentimentDistribution[f.sentiment] = (sentimentDistribution[f.sentiment] || 0) + 1;
            statusDistribution[f.status] = (statusDistribution[f.status] || 0) + 1;
        }
        return {
            totalSubmissions: total,
            averageRating,
            ratingDistribution,
            sentimentDistribution,
            statusDistribution,
        };
    }
}
exports.FeedbackService = FeedbackService;
