import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
import crypto from "crypto";

const db = rawPrisma || proxiedPrisma;

export type ArticleStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface KnowledgeCategory {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeArticle {
  id: string;
  tenantId: string;
  categoryId: string;
  categoryName?: string;
  title: string;
  slug: string;
  summary?: string;
  content: string;
  tags: string[];
  status: ArticleStatus;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  authorId: string;
  authorName?: string;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_CATEGORIES: Omit<KnowledgeCategory, "id" | "tenantId" | "createdAt" | "updatedAt">[] = [
  { name: "Getting Started & Onboarding", slug: "getting-started", description: "Company introduction and initial setup guides", icon: "rocket", sortOrder: 1 },
  { name: "HR Policies & Leave", slug: "hr-policies", description: "Standard operating procedures, leaves, and workplace conduct", icon: "shield-check", sortOrder: 2 },
  { name: "Payroll & Benefits", slug: "payroll-benefits", description: "Salary disbursement, tax declarations, and insurance benefits", icon: "credit-card", sortOrder: 3 },
  { name: "IT, Security & Equipment", slug: "it-security", description: "Device issuance, VPN, passwords, and cybersecurity guidelines", icon: "lock", sortOrder: 4 },
];

export class KnowledgeBaseService {
  private static async getCategoriesList(tenantId: string): Promise<KnowledgeCategory[]> {
    const setting = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "knowledge_base", key: "categories" },
    });
    if (setting && (setting.valueJson as any)?.items) {
      return (setting.valueJson as any).items;
    }
    // Seed default categories
    const now = new Date().toISOString();
    const seeded: KnowledgeCategory[] = DEFAULT_CATEGORIES.map((cat) => ({
      ...cat,
      id: crypto.randomUUID(),
      tenantId,
      createdAt: now,
      updatedAt: now,
    }));
    await this.saveCategoriesList(tenantId, seeded);
    return seeded;
  }

  private static async saveCategoriesList(tenantId: string, items: KnowledgeCategory[]): Promise<void> {
    const existing = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "knowledge_base", key: "categories" },
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
          group: "knowledge_base",
          key: "categories",
          valueJson: { items } as any,
          valueType: "json",
          version: 1,
        },
      });
    }
  }

  private static async getArticlesList(tenantId: string): Promise<KnowledgeArticle[]> {
    const setting = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "knowledge_base", key: "articles" },
    });
    if (setting && (setting.valueJson as any)?.items) {
      return (setting.valueJson as any).items;
    }
    return [];
  }

  private static async saveArticlesList(tenantId: string, items: KnowledgeArticle[]): Promise<void> {
    const existing = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "knowledge_base", key: "articles" },
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
          group: "knowledge_base",
          key: "articles",
          valueJson: { items } as any,
          valueType: "json",
          version: 1,
        },
      });
    }
  }

  // --- CATEGORIES ---

  static async listCategories(tenantId: string): Promise<KnowledgeCategory[]> {
    const categories = await this.getCategoriesList(tenantId);
    return categories.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  static async createCategory(
    tenantId: string,
    data: { name: string; slug?: string; description?: string; icon?: string; sortOrder?: number }
  ): Promise<KnowledgeCategory> {
    const list = await this.getCategoriesList(tenantId);
    const now = new Date().toISOString();
    const slug = (data.slug || data.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const newCat: KnowledgeCategory = {
      id: crypto.randomUUID(),
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

  static async listArticles(
    tenantId: string,
    filters?: { categoryId?: string; status?: ArticleStatus; tag?: string; search?: string }
  ): Promise<KnowledgeArticle[]> {
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
      list = list.filter((a) => a.tags?.includes(filters.tag!));
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.summary?.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q) ||
          a.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    return list;
  }

  static async getArticle(tenantId: string, idOrSlug: string): Promise<KnowledgeArticle | null> {
    const list = await this.getArticlesList(tenantId);
    const article = list.find((a) => a.id === idOrSlug || a.slug === idOrSlug);
    if (!article) return null;

    const categories = await this.getCategoriesList(tenantId);
    const cat = categories.find((c) => c.id === article.categoryId);
    article.categoryName = cat?.name || "Uncategorized";
    return article;
  }

  static async createArticle(
    tenantId: string,
    data: {
      categoryId: string;
      title: string;
      slug?: string;
      summary?: string;
      content: string;
      tags?: string[];
      status?: ArticleStatus;
    },
    authorId: string,
    authorName?: string
  ): Promise<KnowledgeArticle> {
    const list = await this.getArticlesList(tenantId);
    const now = new Date().toISOString();
    const slug = (data.slug || data.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const article: KnowledgeArticle = {
      id: crypto.randomUUID(),
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

  static async incrementView(tenantId: string, id: string): Promise<number> {
    const list = await this.getArticlesList(tenantId);
    const article = list.find((a) => a.id === id || a.slug === id);
    if (!article) return 0;

    article.viewCount = (article.viewCount || 0) + 1;
    article.updatedAt = new Date().toISOString();
    await this.saveArticlesList(tenantId, list);
    return article.viewCount;
  }

  static async voteArticle(tenantId: string, id: string, helpful: boolean): Promise<KnowledgeArticle> {
    const list = await this.getArticlesList(tenantId);
    const article = list.find((a) => a.id === id || a.slug === id);
    if (!article) {
      throw new Error(`Article with id '${id}' not found`);
    }

    if (helpful) {
      article.helpfulCount = (article.helpfulCount || 0) + 1;
    } else {
      article.notHelpfulCount = (article.notHelpfulCount || 0) + 1;
    }
    article.updatedAt = new Date().toISOString();
    await this.saveArticlesList(tenantId, list);
    return article;
  }
}
