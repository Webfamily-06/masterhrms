import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
import crypto from "crypto";

const db = rawPrisma || proxiedPrisma;

export interface SuggestionCategory {
  id: string;
  name: string;
  color: string;
  displayOrder: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SuggestionStatus = "New" | "Under Review" | "Accepted" | "Rejected" | "Complete";

export interface SuggestionItem {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  submittedById: string;
  submittedByName: string;
  isAnonymous: boolean;
  status: SuggestionStatus;
  votes: string[]; // userIds who voted
  views: string[]; // userIds who viewed
  voteCount: number;
  viewCount: number;
  adminResponse?: {
    respondedBy: string;
    respondedAt: string;
    responseNotes: string;
    newStatus: SuggestionStatus;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface SuggestionStatusHistory {
  id: string;
  suggestionId: string;
  suggestionTitle: string;
  changedById: string;
  changedByName: string;
  oldStatus: SuggestionStatus;
  newStatus: SuggestionStatus;
  notes?: string;
  createdAt: string;
}

const DEFAULT_CATEGORIES: Omit<SuggestionCategory, "id" | "createdAt" | "updatedAt">[] = [
  { name: "Workplace & Facilities", color: "#10b981", displayOrder: 1, description: "Office amenities, environment & physical space", isActive: true },
  { name: "Process & Productivity", color: "#3b82f6", displayOrder: 2, description: "Streamlining workflows, operational efficiency & toolchains", isActive: true },
  { name: "Team Culture & Wellbeing", color: "#8b5cf6", displayOrder: 3, description: "Work-life balance, health initiatives & team events", isActive: true },
  { name: "Tools & Technology", color: "#f59e0b", displayOrder: 4, description: "Software, automation & hardware enhancement requests", isActive: true },
  { name: "Customer Experience", color: "#ec4899", displayOrder: 5, description: "Product quality, client feedback & service ideas", isActive: true },
];

export class SuggestionBoxService {
  // ─── CATEGORIES ─────────────────────────────────────────────────────────────

  static async getCategories(tenantId: string): Promise<SuggestionCategory[]> {
    const setting = await db.setting.findFirst({
      where: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "suggestion_box",
        key: "categories",
      },
    });

    if (setting && Array.isArray((setting.valueJson as any)?.items)) {
      return (setting.valueJson as any).items.sort((a: SuggestionCategory, b: SuggestionCategory) => a.displayOrder - b.displayOrder);
    }

    // Initialize default categories for the tenant
    const now = new Date().toISOString();
    const initialized: SuggestionCategory[] = DEFAULT_CATEGORIES.map((cat, idx) => ({
      ...cat,
      id: `cat_${idx + 1}_${crypto.randomBytes(4).toString("hex")}`,
      createdAt: now,
      updatedAt: now,
    }));

    await db.setting.upsert({
      where: {
        scope_scopeId_key: {
          scope: "TENANT",
          scopeId: tenantId,
          key: "categories",
        },
      },
      update: { valueJson: { items: initialized } as any, updatedAt: new Date() },
      create: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "suggestion_box",
        key: "categories",
        valueJson: { items: initialized } as any,
        valueType: "json",
      },
    });

    return initialized;
  }

  static async createCategory(
    tenantId: string,
    data: { name: string; color: string; displayOrder?: number; description?: string; isActive?: boolean },
    userId: string
  ): Promise<SuggestionCategory> {
    const categories = await this.getCategories(tenantId);
    const now = new Date().toISOString();

    const newCategory: SuggestionCategory = {
      id: `cat_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
      name: data.name.trim(),
      color: data.color || "#3b82f6",
      displayOrder: data.displayOrder ?? categories.length + 1,
      description: data.description?.trim(),
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    categories.push(newCategory);

    await db.setting.upsert({
      where: {
        scope_scopeId_key: {
          scope: "TENANT",
          scopeId: tenantId,
          key: "categories",
        },
      },
      update: { valueJson: { items: categories } as any, updatedAt: new Date(), updatedBy: userId },
      create: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "suggestion_box",
        key: "categories",
        valueJson: { items: categories } as any,
        valueType: "json",
        updatedBy: userId,
      },
    });

    return newCategory;
  }

  static async updateCategory(
    tenantId: string,
    categoryId: string,
    data: Partial<Omit<SuggestionCategory, "id" | "createdAt" | "updatedAt">>,
    userId: string
  ): Promise<SuggestionCategory> {
    const categories = await this.getCategories(tenantId);
    const idx = categories.findIndex((c) => c.id === categoryId);
    if (idx === -1) {
      throw new Error("Category not found");
    }

    const updated: SuggestionCategory = {
      ...categories[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    categories[idx] = updated;

    await db.setting.update({
      where: {
        scope_scopeId_key: {
          scope: "TENANT",
          scopeId: tenantId,
          key: "categories",
        },
      },
      data: { valueJson: { items: categories } as any, updatedAt: new Date(), updatedBy: userId },
    });

    return updated;
  }

  static async deleteCategory(tenantId: string, categoryId: string, userId: string): Promise<boolean> {
    const categories = await this.getCategories(tenantId);
    const filtered = categories.filter((c) => c.id !== categoryId);
    if (filtered.length === categories.length) return false;

    await db.setting.update({
      where: {
        scope_scopeId_key: {
          scope: "TENANT",
          scopeId: tenantId,
          key: "categories",
        },
      },
      data: { valueJson: { items: filtered } as any, updatedAt: new Date(), updatedBy: userId },
    });

    return true;
  }

  // ─── SUGGESTIONS ────────────────────────────────────────────────────────────

  private static async _getAllRawSuggestions(tenantId: string): Promise<SuggestionItem[]> {
    const setting = await db.setting.findFirst({
      where: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "suggestion_box",
        key: "suggestions_list",
      },
    });

    if (setting && Array.isArray((setting.valueJson as any)?.items)) {
      return (setting.valueJson as any).items;
    }
    return [];
  }

  private static async _saveAllRawSuggestions(tenantId: string, suggestions: SuggestionItem[], userId?: string): Promise<void> {
    const sanitized = suggestions.map((s) => ({
      ...s,
      submittedById: s.submittedById || "anonymous",
      submittedByName: s.submittedByName || "Employee",
      votes: (s.votes || []).filter(Boolean),
      views: (s.views || []).filter(Boolean),
      voteCount: (s.votes || []).filter(Boolean).length,
      viewCount: Math.max(1, (s.views || []).filter(Boolean).length),
    }));

    await db.setting.upsert({
      where: {
        scope_scopeId_key: {
          scope: "TENANT",
          scopeId: tenantId,
          key: "suggestions_list",
        },
      },
      update: { valueJson: { items: sanitized } as any, updatedAt: new Date(), updatedBy: userId || null },
      create: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "suggestion_box",
        key: "suggestions_list",
        valueJson: { items: sanitized } as any,
        valueType: "json",
        updatedBy: userId || null,
      },
    });
  }

  static async getSuggestions(
    tenantId: string,
    query: {
      search?: string;
      status?: string;
      categoryId?: string;
      mineOnly?: boolean;
      currentUserId?: string;
      isAdmin?: boolean;
    }
  ): Promise<SuggestionItem[]> {
    let suggestions = await this._getAllRawSuggestions(tenantId);

    // Filter by Mine Only
    if (query.mineOnly && query.currentUserId) {
      suggestions = suggestions.filter((s) => s.submittedById === query.currentUserId);
    }

    // Filter by Status
    if (query.status && query.status !== "all") {
      suggestions = suggestions.filter((s) => s.status.toLowerCase() === query.status?.toLowerCase());
    }

    // Filter by Category
    if (query.categoryId && query.categoryId !== "all") {
      suggestions = suggestions.filter((s) => s.categoryId === query.categoryId);
    }

    // Filter by Search Keyword
    if (query.search && query.search.trim()) {
      const q = query.search.toLowerCase().trim();
      suggestions = suggestions.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.categoryName.toLowerCase().includes(q) ||
          (!s.isAnonymous && s.submittedByName.toLowerCase().includes(q))
      );
    }

    // Sort newest first
    suggestions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Sanitize anonymous identity if viewed by non-admin and not author
    return suggestions.map((s) => {
      const isAuthor = query.currentUserId && s.submittedById === query.currentUserId;
      if (s.isAnonymous && !query.isAdmin && !isAuthor) {
        return {
          ...s,
          submittedByName: "Anonymous Employee",
          submittedById: "anonymous",
        };
      }
      return s;
    });
  }

  static async getSuggestionById(tenantId: string, id: string, currentUserId?: string, isAdmin?: boolean): Promise<SuggestionItem | null> {
    const suggestions = await this._getAllRawSuggestions(tenantId);
    const item = suggestions.find((s) => s.id === id);
    if (!item) return null;

    // Increment view count if currentUserId hasn't been recorded yet
    if (currentUserId && !item.views.includes(currentUserId)) {
      item.views.push(currentUserId);
      item.viewCount = item.views.length;
      await this._saveAllRawSuggestions(tenantId, suggestions, currentUserId);
    }

    const isAuthor = currentUserId && item.submittedById === currentUserId;
    if (item.isAnonymous && !isAdmin && !isAuthor) {
      return {
        ...item,
        submittedByName: "Anonymous Employee",
        submittedById: "anonymous",
      };
    }

    return item;
  }

  static async createSuggestion(
    tenantId: string,
    data: {
      title: string;
      description: string;
      categoryId: string;
      isAnonymous?: boolean;
    },
    userId: string,
    userName: string
  ): Promise<SuggestionItem> {
    const categories = await this.getCategories(tenantId);
    const category = categories.find((c) => c.id === data.categoryId) || categories[0];

    const suggestions = await this._getAllRawSuggestions(tenantId);
    const now = new Date().toISOString();
    const id = `sug_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    const newSuggestion: SuggestionItem = {
      id,
      title: data.title.trim(),
      description: data.description.trim(),
      categoryId: category.id,
      categoryName: category.name,
      categoryColor: category.color,
      submittedById: userId,
      submittedByName: userName || "Employee",
      isAnonymous: Boolean(data.isAnonymous),
      status: "New",
      votes: [],
      views: userId ? [userId] : [],
      voteCount: 0,
      viewCount: 1,
      adminResponse: null,
      createdAt: now,
      updatedAt: now,
    };

    suggestions.unshift(newSuggestion);
    await this._saveAllRawSuggestions(tenantId, suggestions, userId);

    // Record initial status history
    await this._recordStatusHistory(tenantId, {
      suggestionId: id,
      suggestionTitle: newSuggestion.title,
      changedById: userId,
      changedByName: newSuggestion.isAnonymous ? "Anonymous Employee" : userName,
      oldStatus: "New",
      newStatus: "New",
      notes: "Suggestion submitted",
    });

    return newSuggestion;
  }

  static async updateSuggestion(
    tenantId: string,
    id: string,
    data: { title?: string; description?: string; categoryId?: string; isAnonymous?: boolean },
    userId: string,
    isAdmin = false
  ): Promise<SuggestionItem> {
    const suggestions = await this._getAllRawSuggestions(tenantId);
    const idx = suggestions.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error("Suggestion not found");

    const item = suggestions[idx];
    if (!isAdmin && item.submittedById !== userId) {
      throw new Error("Forbidden: You can only edit your own suggestions");
    }

    if (!isAdmin && item.status !== "New") {
      throw new Error("Suggestions can only be edited while in 'New' status");
    }

    if (data.categoryId && data.categoryId !== item.categoryId) {
      const categories = await this.getCategories(tenantId);
      const cat = categories.find((c) => c.id === data.categoryId);
      if (cat) {
        item.categoryId = cat.id;
        item.categoryName = cat.name;
        item.categoryColor = cat.color;
      }
    }

    if (data.title) item.title = data.title.trim();
    if (data.description) item.description = data.description.trim();
    if (data.isAnonymous !== undefined) item.isAnonymous = Boolean(data.isAnonymous);
    item.updatedAt = new Date().toISOString();

    suggestions[idx] = item;
    await this._saveAllRawSuggestions(tenantId, suggestions, userId);
    return item;
  }

  static async deleteSuggestion(tenantId: string, id: string, userId: string, isAdmin = false): Promise<boolean> {
    const suggestions = await this._getAllRawSuggestions(tenantId);
    const item = suggestions.find((s) => s.id === id);
    if (!item) return false;

    if (!isAdmin && item.submittedById !== userId) {
      throw new Error("Forbidden: You can only delete your own suggestions");
    }

    if (!isAdmin && item.status !== "New") {
      throw new Error("Suggestions can only be deleted while in 'New' status");
    }

    const filtered = suggestions.filter((s) => s.id !== id);
    await this._saveAllRawSuggestions(tenantId, filtered, userId);
    return true;
  }

  static async toggleVote(tenantId: string, id: string, userId: string): Promise<{ voted: boolean; voteCount: number }> {
    const suggestions = await this._getAllRawSuggestions(tenantId);
    const item = suggestions.find((s) => s.id === id);
    if (!item) throw new Error("Suggestion not found");

    if (item.submittedById === userId) {
      throw new Error("Self-voting is not allowed on your own suggestions");
    }

    const voteIdx = item.votes.indexOf(userId);
    let voted = false;
    if (voteIdx >= 0) {
      item.votes.splice(voteIdx, 1);
      voted = false;
    } else {
      item.votes.push(userId);
      voted = true;
    }

    item.voteCount = item.votes.length;
    item.updatedAt = new Date().toISOString();

    await this._saveAllRawSuggestions(tenantId, suggestions, userId);
    return { voted, voteCount: item.voteCount };
  }

  static async adminRespond(
    tenantId: string,
    id: string,
    newStatus: SuggestionStatus,
    responseNotes: string,
    userId: string,
    userName: string
  ): Promise<SuggestionItem> {
    const suggestions = await this._getAllRawSuggestions(tenantId);
    const idx = suggestions.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error("Suggestion not found");

    const item = suggestions[idx];
    const oldStatus = item.status;
    const now = new Date().toISOString();

    item.status = newStatus;
    item.adminResponse = {
      respondedBy: userName || "Administrator",
      respondedAt: now,
      responseNotes: responseNotes.trim(),
      newStatus,
    };
    item.updatedAt = now;

    suggestions[idx] = item;
    await this._saveAllRawSuggestions(tenantId, suggestions, userId);

    // Record status history transition
    await this._recordStatusHistory(tenantId, {
      suggestionId: id,
      suggestionTitle: item.title,
      changedById: userId,
      changedByName: userName || "Administrator",
      oldStatus,
      newStatus,
      notes: responseNotes.trim(),
    });

    return item;
  }

  // ─── STATUS HISTORIES ───────────────────────────────────────────────────────

  private static async _recordStatusHistory(
    tenantId: string,
    entry: Omit<SuggestionStatusHistory, "id" | "createdAt">
  ): Promise<void> {
    const setting = await db.setting.findFirst({
      where: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "suggestion_box",
        key: "status_histories",
      },
    });

    const histories: SuggestionStatusHistory[] = (setting?.valueJson as any)?.items || [];
    histories.unshift({
      ...entry,
      id: `hist_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
      createdAt: new Date().toISOString(),
    });

    // Keep up to 500 history entries
    if (histories.length > 500) histories.length = 500;

    await db.setting.upsert({
      where: {
        scope_scopeId_key: {
          scope: "TENANT",
          scopeId: tenantId,
          key: "status_histories",
        },
      },
      update: { valueJson: { items: histories } as any, updatedAt: new Date() },
      create: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "suggestion_box",
        key: "status_histories",
        valueJson: { items: histories } as any,
        valueType: "json",
      },
    });
  }

  static async getStatusHistories(tenantId: string, suggestionId?: string): Promise<SuggestionStatusHistory[]> {
    const setting = await db.setting.findFirst({
      where: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "suggestion_box",
        key: "status_histories",
      },
    });

    let items: SuggestionStatusHistory[] = (setting?.valueJson as any)?.items || [];
    if (suggestionId) {
      items = items.filter((h) => h.suggestionId === suggestionId);
    }
    return items;
  }

  // ─── DASHBOARD STATS ────────────────────────────────────────────────────────

  static async getStats(tenantId: string): Promise<{
    total: number;
    new: number;
    underReview: number;
    accepted: number;
    rejected: number;
    complete: number;
    totalVotes: number;
    totalViews: number;
  }> {
    const suggestions = await this._getAllRawSuggestions(tenantId);
    const stats = {
      total: suggestions.length,
      new: 0,
      underReview: 0,
      accepted: 0,
      rejected: 0,
      complete: 0,
      totalVotes: 0,
      totalViews: 0,
    };

    for (const s of suggestions) {
      if (s.status === "New") stats.new++;
      else if (s.status === "Under Review") stats.underReview++;
      else if (s.status === "Accepted") stats.accepted++;
      else if (s.status === "Rejected") stats.rejected++;
      else if (s.status === "Complete") stats.complete++;

      stats.totalVotes += s.voteCount || 0;
      stats.totalViews += s.viewCount || 0;
    }

    return stats;
  }
}
