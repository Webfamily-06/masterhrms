import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
import crypto from "crypto";

const db = rawPrisma || proxiedPrisma;

export type SubscriberStatus = "SUBSCRIBED" | "UNSUBSCRIBED" | "PENDING";
export type CampaignStatus = "DRAFT" | "SCHEDULED" | "SENT" | "CANCELLED";

export interface NewsletterSubscriber {
  id: string;
  tenantId: string;
  email: string;
  name?: string;
  status: SubscriberStatus;
  tags: string[];
  source: string; // e.g., 'website_footer', 'checkout', 'import'
  optInAt: string;
  optOutAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewsletterCampaign {
  id: string;
  tenantId: string;
  title: string;
  subject: string;
  previewText?: string;
  contentHtml: string;
  targetTags?: string[];
  status: CampaignStatus;
  scheduledAt?: string | null;
  sentAt?: string | null;
  recipientsCount: number;
  openCount: number;
  clickCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export class NewsletterService {
  private static async getSubscribers(tenantId: string): Promise<NewsletterSubscriber[]> {
    const setting = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "newsletter", key: "subscribers" },
    });
    if (setting && (setting.valueJson as any)?.items) {
      return (setting.valueJson as any).items;
    }
    return [];
  }

  private static async saveSubscribers(tenantId: string, items: NewsletterSubscriber[]): Promise<void> {
    const existing = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "newsletter", key: "subscribers" },
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
          group: "newsletter",
          key: "subscribers",
          valueJson: { items } as any,
          valueType: "json",
          version: 1,
        },
      });
    }
  }

  private static async getCampaigns(tenantId: string): Promise<NewsletterCampaign[]> {
    const setting = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "newsletter", key: "campaigns" },
    });
    if (setting && (setting.valueJson as any)?.items) {
      return (setting.valueJson as any).items;
    }
    return [];
  }

  private static async saveCampaigns(tenantId: string, items: NewsletterCampaign[]): Promise<void> {
    const existing = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "newsletter", key: "campaigns" },
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
          group: "newsletter",
          key: "campaigns",
          valueJson: { items } as any,
          valueType: "json",
          version: 1,
        },
      });
    }
  }

  // --- SUBSCRIBER MANAGEMENT ---

  static async listSubscribers(
    tenantId: string,
    filters?: { status?: SubscriberStatus; tag?: string; search?: string }
  ): Promise<NewsletterSubscriber[]> {
    let list = await this.getSubscribers(tenantId);
    if (filters?.status) {
      list = list.filter((s) => s.status === filters.status);
    }
    if (filters?.tag) {
      list = list.filter((s) => s.tags?.includes(filters.tag!));
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((s) => s.email.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q));
    }
    return list;
  }

  static async addSubscriber(
    tenantId: string,
    data: { email: string; name?: string; tags?: string[]; source?: string }
  ): Promise<NewsletterSubscriber> {
    const list = await this.getSubscribers(tenantId);
    const normalizedEmail = data.email.trim().toLowerCase();
    const existingIndex = list.findIndex((s) => s.email.toLowerCase() === normalizedEmail);

    const now = new Date().toISOString();
    if (existingIndex >= 0) {
      const existing = list[existingIndex];
      existing.status = "SUBSCRIBED";
      existing.optInAt = now;
      if (data.name) existing.name = data.name;
      if (data.tags) {
        existing.tags = Array.from(new Set([...existing.tags, ...data.tags]));
      }
      existing.updatedAt = now;
      await this.saveSubscribers(tenantId, list);
      return existing;
    }

    const newSub: NewsletterSubscriber = {
      id: crypto.randomUUID(),
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

  static async unsubscribe(tenantId: string, email: string): Promise<boolean> {
    const list = await this.getSubscribers(tenantId);
    const normalizedEmail = email.trim().toLowerCase();
    const sub = list.find((s) => s.email.toLowerCase() === normalizedEmail);
    if (!sub) return false;

    sub.status = "UNSUBSCRIBED";
    sub.optOutAt = new Date().toISOString();
    sub.updatedAt = new Date().toISOString();
    await this.saveSubscribers(tenantId, list);
    return true;
  }

  // --- CAMPAIGN MANAGEMENT ---

  static async listCampaigns(tenantId: string, status?: CampaignStatus): Promise<NewsletterCampaign[]> {
    const list = await this.getCampaigns(tenantId);
    if (status) {
      return list.filter((c) => c.status === status);
    }
    return list;
  }

  static async getCampaign(tenantId: string, id: string): Promise<NewsletterCampaign | null> {
    const list = await this.getCampaigns(tenantId);
    return list.find((c) => c.id === id) || null;
  }

  static async createCampaign(
    tenantId: string,
    data: {
      title: string;
      subject: string;
      previewText?: string;
      contentHtml: string;
      targetTags?: string[];
      scheduledAt?: string;
    },
    userId: string
  ): Promise<NewsletterCampaign> {
    const list = await this.getCampaigns(tenantId);
    const now = new Date().toISOString();

    const campaign: NewsletterCampaign = {
      id: crypto.randomUUID(),
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

  static async sendCampaign(tenantId: string, id: string): Promise<NewsletterCampaign> {
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

  static async getStats(tenantId: string) {
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
