import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
import crypto from "crypto";

const db = rawPrisma || proxiedPrisma;

export type PortfolioCategory = "WEB" | "MOBILE" | "CLOUD" | "CONSULTING" | "ENTERPRISE" | "OTHER";
export type PortfolioStatus = "DRAFT" | "PUBLISHED" | "FEATURED";

export interface PortfolioTestimonial {
  clientQuote: string;
  clientAuthor: string;
  clientPosition?: string;
  clientCompany?: string;
  avatarUrl?: string;
}

export interface PortfolioItem {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  clientName: string;
  category: PortfolioCategory;
  description: string;
  caseStudyHtml?: string;
  completedDate?: string;
  coverImageUrl?: string;
  galleryUrls?: string[];
  technologies: string[];
  projectUrl?: string;
  testimonial?: PortfolioTestimonial | null;
  status: PortfolioStatus;
  sortOrder: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export class PortfolioService {
  private static async getItemsList(tenantId: string): Promise<PortfolioItem[]> {
    const setting = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "portfolio_hub", key: "items" },
    });
    if (setting && (setting.valueJson as any)?.items) {
      return (setting.valueJson as any).items;
    }
    return [];
  }

  private static async saveItemsList(tenantId: string, items: PortfolioItem[]): Promise<void> {
    const existing = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "portfolio_hub", key: "items" },
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
          group: "portfolio_hub",
          key: "items",
          valueJson: { items } as any,
          valueType: "json",
          version: 1,
        },
      });
    }
  }

  static async listItems(
    tenantId: string,
    filters?: { category?: PortfolioCategory; status?: PortfolioStatus; tech?: string; search?: string }
  ): Promise<PortfolioItem[]> {
    let list = await this.getItemsList(tenantId);

    if (filters?.category) {
      list = list.filter((p) => p.category === filters.category);
    }
    if (filters?.status) {
      list = list.filter((p) => p.status === filters.status);
    }
    if (filters?.tech) {
      list = list.filter((p) => p.technologies?.includes(filters.tech!));
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.clientName.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  static async getItem(tenantId: string, idOrSlug: string): Promise<PortfolioItem | null> {
    const list = await this.getItemsList(tenantId);
    return list.find((p) => p.id === idOrSlug || p.slug === idOrSlug) || null;
  }

  static async createItem(
    tenantId: string,
    data: {
      title: string;
      slug?: string;
      clientName: string;
      category?: PortfolioCategory;
      description: string;
      caseStudyHtml?: string;
      completedDate?: string;
      coverImageUrl?: string;
      galleryUrls?: string[];
      technologies?: string[];
      projectUrl?: string;
      testimonial?: PortfolioTestimonial;
      status?: PortfolioStatus;
      sortOrder?: number;
    },
    userId: string
  ): Promise<PortfolioItem> {
    const list = await this.getItemsList(tenantId);
    const now = new Date().toISOString();
    const slug = (data.slug || data.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const item: PortfolioItem = {
      id: crypto.randomUUID(),
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

  static async updateItem(
    tenantId: string,
    id: string,
    updates: Partial<Omit<PortfolioItem, "id" | "tenantId" | "createdAt" | "createdBy">>
  ): Promise<PortfolioItem> {
    const list = await this.getItemsList(tenantId);
    const item = list.find((p) => p.id === id);
    if (!item) {
      throw new Error(`Portfolio item '${id}' not found`);
    }

    Object.assign(item, updates, { updatedAt: new Date().toISOString() });
    await this.saveItemsList(tenantId, list);
    return item;
  }

  static async deleteItem(tenantId: string, id: string): Promise<boolean> {
    let list = await this.getItemsList(tenantId);
    const prevLen = list.length;
    list = list.filter((p) => p.id !== id);
    if (list.length === prevLen) return false;

    await this.saveItemsList(tenantId, list);
    return true;
  }
}
