"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoadmapCentralService = void 0;
const prisma_1 = require("../prisma");
const crypto_1 = __importDefault(require("crypto"));
const db = prisma_1.rawPrisma || prisma_1.prisma;
class RoadmapCentralService {
    static async getItems(tenantId) {
        const setting = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "roadmap_central", key: "roadmaps" },
        });
        if (setting && setting.valueJson?.items) {
            return setting.valueJson.items;
        }
        return [];
    }
    static async saveItems(tenantId, items) {
        const existing = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "roadmap_central", key: "roadmaps" },
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
                    group: "roadmap_central",
                    key: "roadmaps",
                    valueType: "JSON",
                    valueJson: { items },
                    version: 1,
                },
            });
        }
    }
    /**
     * List roadmap features / items
     */
    static async listItems(tenantId, filters) {
        let items = await this.getItems(tenantId);
        if (filters?.horizon) {
            items = items.filter((i) => i.horizon === filters.horizon);
        }
        if (filters?.status) {
            items = items.filter((i) => i.status === filters.status);
        }
        if (filters?.category) {
            items = items.filter((i) => i.category.toLowerCase() === filters.category.toLowerCase());
        }
        return items;
    }
    /**
     * Create new roadmap epic / initiative
     */
    static async createItem(tenantId, data) {
        const items = await this.getItems(tenantId);
        const now = new Date().toISOString();
        const newItem = {
            id: `road_${Date.now()}_${crypto_1.default.randomBytes(2).toString("hex")}`,
            tenantId,
            title: data.title,
            description: data.description,
            category: data.category || "Core Product",
            horizon: data.horizon || "Q1",
            status: "PLANNED",
            priority: data.priority || "MEDIUM",
            upvotesCount: 0,
            upvotedBy: [],
            createdAt: now,
            updatedAt: now,
        };
        items.unshift(newItem);
        await this.saveItems(tenantId, items);
        return newItem;
    }
    /**
     * Update roadmap item delivery status
     */
    static async updateStatus(tenantId, id, status) {
        const items = await this.getItems(tenantId);
        const item = items.find((i) => i.id === id);
        if (!item) {
            throw new Error("Roadmap item not found.");
        }
        item.status = status;
        item.updatedAt = new Date().toISOString();
        await this.saveItems(tenantId, items);
        return item;
    }
    /**
     * Toggle community / team upvote on roadmap item
     */
    static async toggleUpvote(tenantId, id, userId) {
        const items = await this.getItems(tenantId);
        const item = items.find((i) => i.id === id);
        if (!item) {
            throw new Error("Roadmap item not found.");
        }
        const idx = item.upvotedBy.indexOf(userId);
        if (idx > -1) {
            item.upvotedBy.splice(idx, 1);
        }
        else {
            item.upvotedBy.push(userId);
        }
        item.upvotesCount = item.upvotedBy.length;
        item.updatedAt = new Date().toISOString();
        await this.saveItems(tenantId, items);
        return item;
    }
    /**
     * Delete roadmap item
     */
    static async deleteItem(tenantId, id) {
        let items = await this.getItems(tenantId);
        const countBefore = items.length;
        items = items.filter((i) => i.id !== id);
        if (items.length === countBefore) {
            throw new Error("Roadmap item not found.");
        }
        await this.saveItems(tenantId, items);
        return true;
    }
}
exports.RoadmapCentralService = RoadmapCentralService;
