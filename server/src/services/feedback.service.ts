import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
import crypto from "crypto";

const db = rawPrisma || proxiedPrisma;

export type FeedbackTarget = "CUSTOMER" | "EMPLOYEE" | "PRODUCT";
export type FeedbackCategory = "FEATURE_REQUEST" | "BUG_REPORT" | "SERVICE_QUALITY" | "GENERAL";
export type FeedbackSentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE";
export type FeedbackStatus = "NEW" | "IN_REVIEW" | "RESOLVED" | "ARCHIVED";

export interface FeedbackSubmission {
  id: string;
  tenantId: string;
  targetType: FeedbackTarget;
  category: FeedbackCategory;
  rating: number; // 1 - 5
  sentiment: FeedbackSentiment;
  title: string;
  comments: string;
  submitterName?: string;
  submitterEmail?: string;
  isAnonymous: boolean;
  status: FeedbackStatus;
  resolutionNotes?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export class FeedbackService {
  private static async getFeedbackList(tenantId: string): Promise<FeedbackSubmission[]> {
    const setting = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "customer_feedback", key: "submissions" },
    });
    if (setting && (setting.valueJson as any)?.items) {
      return (setting.valueJson as any).items;
    }
    return [];
  }

  private static async saveFeedbackList(tenantId: string, items: FeedbackSubmission[]): Promise<void> {
    const existing = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "customer_feedback", key: "submissions" },
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
          group: "customer_feedback",
          key: "submissions",
          valueJson: { items } as any,
          valueType: "json",
          version: 1,
        },
      });
    }
  }

  static async listSubmissions(
    tenantId: string,
    filters?: {
      targetType?: FeedbackTarget;
      category?: FeedbackCategory;
      status?: FeedbackStatus;
      rating?: number;
      search?: string;
    }
  ): Promise<FeedbackSubmission[]> {
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
      list = list.filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          f.comments.toLowerCase().includes(q) ||
          f.submitterName?.toLowerCase().includes(q)
      );
    }

    return list;
  }

  static async getSubmission(tenantId: string, id: string): Promise<FeedbackSubmission | null> {
    const list = await this.getFeedbackList(tenantId);
    return list.find((f) => f.id === id) || null;
  }

  static async submitFeedback(
    tenantId: string,
    data: {
      targetType?: FeedbackTarget;
      category?: FeedbackCategory;
      rating: number;
      title: string;
      comments: string;
      submitterName?: string;
      submitterEmail?: string;
      isAnonymous?: boolean;
    }
  ): Promise<FeedbackSubmission> {
    const list = await this.getFeedbackList(tenantId);
    const now = new Date().toISOString();

    const rating = Math.min(5, Math.max(1, Math.round(data.rating)));
    let sentiment: FeedbackSentiment = "NEUTRAL";
    if (rating >= 4) sentiment = "POSITIVE";
    else if (rating <= 2) sentiment = "NEGATIVE";

    const item: FeedbackSubmission = {
      id: crypto.randomUUID(),
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

  static async resolveFeedback(
    tenantId: string,
    id: string,
    data: { status: FeedbackStatus; resolutionNotes: string },
    userId: string
  ): Promise<FeedbackSubmission> {
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

  static async getMetrics(tenantId: string) {
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

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const sentimentDistribution: Record<string, number> = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };
    const statusDistribution: Record<string, number> = { NEW: 0, IN_REVIEW: 0, RESOLVED: 0, ARCHIVED: 0 };

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
