import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
import crypto from "crypto";

const db = rawPrisma || proxiedPrisma;

export type RoadmapHorizon = "Q1" | "Q2" | "Q3" | "Q4" | "FUTURE";
export type RoadmapStatus = "PLANNED" | "IN_PROGRESS" | "DELIVERED" | "CANCELLED";
export type RoadmapPriority = "LOW" | "MEDIUM" | "HIGH";

export interface RoadmapItem {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  category: string;
  horizon: RoadmapHorizon;
  status: RoadmapStatus;
  priority: RoadmapPriority;
  upvotesCount: number;
  upvotedBy: string[];
  createdAt: string;
  updatedAt: string;
}

export class RoadmapCentralService {
  private static async getItems(tenantId: string): Promise<RoadmapItem[]> {
    const setting = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "roadmap_central", key: "roadmaps" },
    });
    if (setting && (setting.valueJson as any)?.items) {
      return (setting.valueJson as any).items;
    }
    return [];
  }

  private static async saveItems(tenantId: string, items: RoadmapItem[]): Promise<void> {
    const existing = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "roadmap_central", key: "roadmaps" },
    });

    if (existing) {
      await db.setting.update({
        where: { id: existing.id },
        data: { valueJson: { items } as any, version: { increment: 1 } },
      });
    } else {
      await db.setting.create({
        data: {
          scope: "TENANT",
          scopeId: tenantId,
          group: "roadmap_central",
          key: "roadmaps",
          valueType: "JSON",
          valueJson: { items } as any,
          version: 1,
        },
      });
    }
  }

  /**
   * List roadmap features / items
   */
  static async listItems(
    tenantId: string,
    filters?: { horizon?: RoadmapHorizon; status?: RoadmapStatus; category?: string }
  ): Promise<RoadmapItem[]> {
    let items = await this.getItems(tenantId);
    if (filters?.horizon) {
      items = items.filter((i) => i.horizon === filters.horizon);
    }
    if (filters?.status) {
      items = items.filter((i) => i.status === filters.status);
    }
    if (filters?.category) {
      items = items.filter((i) => i.category.toLowerCase() === filters.category!.toLowerCase());
    }
    return items;
  }

  /**
   * Create new roadmap epic / initiative
   */
  static async createItem(
    tenantId: string,
    data: {
      title: string;
      description?: string;
      category?: string;
      horizon?: RoadmapHorizon;
      priority?: RoadmapPriority;
    }
  ): Promise<RoadmapItem> {
    const items = await this.getItems(tenantId);
    const now = new Date().toISOString();

    const newItem: RoadmapItem = {
      id: `road_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`,
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
  static async updateStatus(
    tenantId: string,
    id: string,
    status: RoadmapStatus
  ): Promise<RoadmapItem> {
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
  static async toggleUpvote(tenantId: string, id: string, userId: string): Promise<RoadmapItem> {
    const items = await this.getItems(tenantId);
    const item = items.find((i) => i.id === id);
    if (!item) {
      throw new Error("Roadmap item not found.");
    }

    const idx = item.upvotedBy.indexOf(userId);
    if (idx > -1) {
      item.upvotedBy.splice(idx, 1);
    } else {
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
  static async deleteItem(tenantId: string, id: string): Promise<boolean> {
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
