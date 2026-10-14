import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
import crypto from "crypto";
import { AuditService } from "./audit.service";
import { OutboxService } from "./outbox.service";

const db = rawPrisma || proxiedPrisma;

export interface StratCategory {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StratStage {
  id: string;
  name: string;
  sortOrder: number;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StratStatus {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ChallengePosition = "ongoing" | "on_hold" | "finished";

export interface StratChallenge {
  id: string;
  tenantId: string;
  name: string;
  categoryId: string;
  categoryName?: string;
  endAt: string;
  position: ChallengePosition;
  explanation?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type StratModelType =
  | "charter"
  | "swot"
  | "pestel"
  | "porter"
  | "mckinsey7s"
  | "business_model"
  | "business_plan"
  | "marketing_plan";

export interface StratModelMember {
  userId: string;
  userName?: string;
  userEmail?: string;
  roleId: string;
  roleName?: string;
}

export interface StratModelSection {
  sectionKey: string;
  content: string;
  version: number;
  updatedBy: string;
  updatedAt: string;
}

export interface StratModelRating {
  userId: string;
  value: number; // 1..5
  updatedAt: string;
}

export interface StratCommentAttachment {
  id: string;
  name: string;
  url: string;
  size?: number;
}

export interface StratComment {
  id: string;
  modelId: string;
  userId: string;
  userName: string;
  body: string;
  parentId?: string | null;
  attachments?: StratCommentAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface StratModel {
  id: string;
  tenantId: string;
  type: StratModelType;
  name: string;
  challengeId?: string | null;
  challengeName?: string;
  statusId: string;
  statusName?: string;
  statusColor?: string;
  stageId: string;
  stageName?: string;
  stageColor?: string;
  thumbnailMediaId?: string;
  videoMediaId?: string;
  description?: string;
  organisationalEffects?: string;
  goalDescription?: string;
  notes?: string;
  budgetAmount?: number;
  members: StratModelMember[];
  attachments: { id: string; name: string; url: string }[];
  sections: Record<string, StratModelSection>;
  ratings: Record<string, StratModelRating>;
  ratingAvg: number;
  ratingCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Neutral default seeds for Stages & Statuses
const DEFAULT_STAGES: Omit<StratStage, "id" | "createdAt" | "updatedAt">[] = [
  { name: "Draft", sortOrder: 1, color: "#94a3b8", isActive: true },
  { name: "In Progress", sortOrder: 2, color: "#3b82f6", isActive: true },
  { name: "Review", sortOrder: 3, color: "#f59e0b", isActive: true },
  { name: "Approved", sortOrder: 4, color: "#10b981", isActive: true },
];

const DEFAULT_STATUSES: Omit<StratStatus, "id" | "createdAt" | "updatedAt">[] = [
  { name: "Not Started", color: "#64748b", sortOrder: 1, isActive: true },
  { name: "Active", color: "#2563eb", sortOrder: 2, isActive: true },
  { name: "On Hold", color: "#eab308", sortOrder: 3, isActive: true },
  { name: "Completed", color: "#16a34a", sortOrder: 4, isActive: true },
];

const DEFAULT_CATEGORIES: Omit<StratCategory, "id" | "createdAt" | "updatedAt">[] = [
  { name: "Operational Excellence", sortOrder: 1, isActive: true },
  { name: "Market Expansion", sortOrder: 2, isActive: true },
  { name: "Digital Transformation", sortOrder: 3, isActive: true },
  { name: "Talent & Culture", sortOrder: 4, isActive: true },
];

export class PlanningStrategyService {
  // Helper to load or persist JSON settings
  private static async getSettingJson<T>(tenantId: string, key: string, fallback: T): Promise<T> {
    const setting = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "planning_strategy", key },
    });
    if (setting && (setting.valueJson as any)?.items) {
      return (setting.valueJson as any).items as T;
    }
    return fallback;
  }

  private static async saveSettingJson(tenantId: string, key: string, items: any[]): Promise<void> {
    await db.setting.upsert({
      where: {
        scope_scopeId_key: { scope: "TENANT", scopeId: tenantId, key },
      },
      update: { valueJson: { items } as any, updatedAt: new Date() },
      create: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "planning_strategy",
        key,
        valueJson: { items } as any,
        valueType: "json",
      },
    });
  }

  // ─── CATEGORIES ─────────────────────────────────────────────────────────────
  static async getCategories(tenantId: string): Promise<StratCategory[]> {
    let cats = await this.getSettingJson<StratCategory[]>(tenantId, "strat_categories", []);
    if (!cats || cats.length === 0) {
      const now = new Date().toISOString();
      cats = DEFAULT_CATEGORIES.map((c, idx) => ({
        ...c,
        id: `scat_${idx + 1}_${crypto.randomBytes(3).toString("hex")}`,
        createdAt: now,
        updatedAt: now,
      }));
      await this.saveSettingJson(tenantId, "strat_categories", cats);
    }
    return cats.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  static async saveCategory(
    tenantId: string,
    data: { id?: string; name: string; sortOrder?: number; isActive?: boolean },
    userId: string
  ): Promise<StratCategory> {
    const cats = await this.getCategories(tenantId);
    const now = new Date().toISOString();

    if (data.id) {
      const existing = cats.find((c) => c.id === data.id);
      if (!existing) throw new Error("Category not found");
      existing.name = data.name.trim();
      if (data.sortOrder !== undefined) existing.sortOrder = data.sortOrder;
      if (data.isActive !== undefined) existing.isActive = data.isActive;
      existing.updatedAt = now;
      await this.saveSettingJson(tenantId, "strat_categories", cats);
      await OutboxService.createOutboxEvent({
        tenantId,
        eventType: "lookup.changed",
        entityType: "StratCategory",
        entityId: existing.id,
        payload: { target: "categories" },
      });
      return existing;
    } else {
      const newCat: StratCategory = {
        id: `scat_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
        name: data.name.trim(),
        sortOrder: data.sortOrder ?? cats.length + 1,
        isActive: data.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      };
      cats.push(newCat);
      await this.saveSettingJson(tenantId, "strat_categories", cats);
      await OutboxService.createOutboxEvent({
        tenantId,
        eventType: "lookup.changed",
        entityType: "StratCategory",
        entityId: newCat.id,
        payload: { target: "categories" },
      });
      return newCat;
    }
  }

  static async deleteCategory(tenantId: string, id: string): Promise<void> {
    const challenges = await this.getChallenges(tenantId);
    const usageCount = challenges.filter((c) => c.categoryId === id).length;
    if (usageCount > 0) {
      throw new Error(`Category cannot be deleted because it is referenced by ${usageCount} challenge(s). Please reassign them first.`);
    }

    const cats = await this.getCategories(tenantId);
    const filtered = cats.filter((c) => c.id !== id);
    await this.saveSettingJson(tenantId, "strat_categories", filtered);
  }

  // ─── STAGES ─────────────────────────────────────────────────────────────────
  static async getStages(tenantId: string): Promise<StratStage[]> {
    let stages = await this.getSettingJson<StratStage[]>(tenantId, "strat_stages", []);
    if (!stages || stages.length === 0) {
      const now = new Date().toISOString();
      stages = DEFAULT_STAGES.map((s, idx) => ({
        ...s,
        id: `sstg_${idx + 1}_${crypto.randomBytes(3).toString("hex")}`,
        createdAt: now,
        updatedAt: now,
      }));
      await this.saveSettingJson(tenantId, "strat_stages", stages);
    }
    return stages.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  static async saveStage(
    tenantId: string,
    data: { id?: string; name: string; color?: string; sortOrder?: number; isActive?: boolean }
  ): Promise<StratStage> {
    const stages = await this.getStages(tenantId);
    const now = new Date().toISOString();

    if (data.id) {
      const existing = stages.find((s) => s.id === data.id);
      if (!existing) throw new Error("Stage not found");
      existing.name = data.name.trim();
      if (data.color) existing.color = data.color;
      if (data.sortOrder !== undefined) existing.sortOrder = data.sortOrder;
      if (data.isActive !== undefined) existing.isActive = data.isActive;
      existing.updatedAt = now;
      await this.saveSettingJson(tenantId, "strat_stages", stages);
      return existing;
    } else {
      const newStage: StratStage = {
        id: `sstg_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
        name: data.name.trim(),
        color: data.color || "#3b82f6",
        sortOrder: data.sortOrder ?? stages.length + 1,
        isActive: data.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      };
      stages.push(newStage);
      await this.saveSettingJson(tenantId, "strat_stages", stages);
      return newStage;
    }
  }

  static async reorderStages(tenantId: string, orderedIds: string[]): Promise<StratStage[]> {
    const stages = await this.getStages(tenantId);
    stages.forEach((s) => {
      const idx = orderedIds.indexOf(s.id);
      if (idx !== -1) {
        s.sortOrder = idx + 1;
      }
    });
    await this.saveSettingJson(tenantId, "strat_stages", stages);
    return stages.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  static async deleteStage(tenantId: string, id: string): Promise<void> {
    const models = await this.getModels(tenantId);
    const usageCount = models.filter((m) => m.stageId === id).length;
    if (usageCount > 0) {
      throw new Error(`Stage cannot be deleted because it is referenced by ${usageCount} strategic model(s).`);
    }

    const stages = await this.getStages(tenantId);
    const filtered = stages.filter((s) => s.id !== id);
    await this.saveSettingJson(tenantId, "strat_stages", filtered);
  }

  // ─── STATUSES ───────────────────────────────────────────────────────────────
  static async getStatuses(tenantId: string): Promise<StratStatus[]> {
    let statuses = await this.getSettingJson<StratStatus[]>(tenantId, "strat_statuses", []);
    if (!statuses || statuses.length === 0) {
      const now = new Date().toISOString();
      statuses = DEFAULT_STATUSES.map((s, idx) => ({
        ...s,
        id: `ssta_${idx + 1}_${crypto.randomBytes(3).toString("hex")}`,
        createdAt: now,
        updatedAt: now,
      }));
      await this.saveSettingJson(tenantId, "strat_statuses", statuses);
    }
    return statuses.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  static async saveStatus(
    tenantId: string,
    data: { id?: string; name: string; color?: string; sortOrder?: number; isActive?: boolean }
  ): Promise<StratStatus> {
    const statuses = await this.getStatuses(tenantId);
    const now = new Date().toISOString();

    if (data.id) {
      const existing = statuses.find((s) => s.id === data.id);
      if (!existing) throw new Error("Status not found");
      existing.name = data.name.trim();
      if (data.color) existing.color = data.color;
      if (data.sortOrder !== undefined) existing.sortOrder = data.sortOrder;
      if (data.isActive !== undefined) existing.isActive = data.isActive;
      existing.updatedAt = now;
      await this.saveSettingJson(tenantId, "strat_statuses", statuses);
      return existing;
    } else {
      const newStatus: StratStatus = {
        id: `ssta_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
        name: data.name.trim(),
        color: data.color || "#2563eb",
        sortOrder: data.sortOrder ?? statuses.length + 1,
        isActive: data.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      };
      statuses.push(newStatus);
      await this.saveSettingJson(tenantId, "strat_statuses", statuses);
      return newStatus;
    }
  }

  static async deleteStatus(tenantId: string, id: string): Promise<void> {
    const models = await this.getModels(tenantId);
    const usageCount = models.filter((m) => m.statusId === id).length;
    if (usageCount > 0) {
      throw new Error(`Status cannot be deleted because it is referenced by ${usageCount} strategic model(s).`);
    }

    const statuses = await this.getStatuses(tenantId);
    const filtered = statuses.filter((s) => s.id !== id);
    await this.saveSettingJson(tenantId, "strat_statuses", filtered);
  }

  // ─── CHALLENGES ─────────────────────────────────────────────────────────────
  static async getChallenges(
    tenantId: string,
    filters?: { position?: ChallengePosition; categoryId?: string; search?: string }
  ): Promise<StratChallenge[]> {
    let items = await this.getSettingJson<StratChallenge[]>(tenantId, "strat_challenges", []);
    const categories = await this.getCategories(tenantId);
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    items = items.map((c) => ({
      ...c,
      categoryName: catMap.get(c.categoryId) || "Uncategorized",
    }));

    if (filters?.position) {
      items = items.filter((c) => c.position === filters.position);
    }
    if (filters?.categoryId) {
      items = items.filter((c) => c.categoryId === filters.categoryId);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      items = items.filter((c) => c.name.toLowerCase().includes(q) || c.explanation?.toLowerCase().includes(q));
    }

    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static async getChallengeById(tenantId: string, id: string): Promise<StratChallenge | null> {
    const challenges = await this.getChallenges(tenantId);
    return challenges.find((c) => c.id === id) || null;
  }

  static async createChallenge(
    tenantId: string,
    data: { name: string; categoryId: string; endAt: string; position?: ChallengePosition; explanation?: string; notes?: string },
    userId: string
  ): Promise<StratChallenge> {
    const challenges = await this.getChallenges(tenantId);
    const now = new Date().toISOString();

    const newChallenge: StratChallenge = {
      id: `chal_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
      tenantId,
      name: data.name.trim(),
      categoryId: data.categoryId,
      endAt: data.endAt,
      position: data.position || "ongoing",
      explanation: data.explanation?.trim(),
      notes: data.notes?.trim(),
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };

    challenges.unshift(newChallenge);
    await this.saveSettingJson(tenantId, "strat_challenges", challenges);

    await AuditService.log({
      tenantId,
      userId,
      action: "PLANNING_CHALLENGE_CREATED",
      entityType: "StratChallenge",
      entityId: newChallenge.id,
      changes: { name: newChallenge.name, endAt: newChallenge.endAt },
    });

    await OutboxService.createOutboxEvent({
      tenantId,
      eventType: "planning.challenge.created",
      entityType: "StratChallenge",
      entityId: newChallenge.id,
      payload: { id: newChallenge.id, name: newChallenge.name, endAt: newChallenge.endAt },
    });

    return newChallenge;
  }

  static async updateChallenge(
    tenantId: string,
    id: string,
    data: { name?: string; categoryId?: string; endAt?: string; position?: ChallengePosition; explanation?: string; notes?: string },
    userId: string
  ): Promise<StratChallenge> {
    const challenges = await this.getChallenges(tenantId);
    const existing = challenges.find((c) => c.id === id);
    if (!existing) throw new Error("Challenge not found");

    if (data.name) existing.name = data.name.trim();
    if (data.categoryId) existing.categoryId = data.categoryId;
    if (data.endAt) existing.endAt = data.endAt;
    if (data.position) existing.position = data.position;
    if (data.explanation !== undefined) existing.explanation = data.explanation.trim();
    if (data.notes !== undefined) existing.notes = data.notes.trim();
    existing.updatedAt = new Date().toISOString();

    await this.saveSettingJson(tenantId, "strat_challenges", challenges);

    await AuditService.log({
      tenantId,
      userId,
      action: "PLANNING_CHALLENGE_UPDATED",
      entityType: "StratChallenge",
      entityId: id,
      changes: data,
    });

    await OutboxService.createOutboxEvent({
      tenantId,
      eventType: "planning.challenge.updated",
      entityType: "StratChallenge",
      entityId: id,
      payload: { id, name: existing.name },
    });

    return existing;
  }

  static async deleteChallenge(tenantId: string, id: string, userId: string): Promise<void> {
    const models = await this.getModels(tenantId);
    const linked = models.filter((m) => m.challengeId === id);
    if (linked.length > 0) {
      throw new Error(`Cannot delete challenge: it has ${linked.length} linked charter/strategy model(s).`);
    }

    const challenges = await this.getChallenges(tenantId);
    const filtered = challenges.filter((c) => c.id !== id);
    await this.saveSettingJson(tenantId, "strat_challenges", filtered);

    await AuditService.log({
      tenantId,
      userId,
      action: "PLANNING_CHALLENGE_DELETED",
      entityType: "StratChallenge",
      entityId: id,
      changes: { deleted: true },
    });

    await OutboxService.createOutboxEvent({
      tenantId,
      eventType: "planning.challenge.deleted",
      entityType: "StratChallenge",
      entityId: id,
      payload: { id },
    });
  }

  // ─── MODELS (CHARTERS & STRATEGY MATRICES) ──────────────────────────────────
  static async getModels(
    tenantId: string,
    filters?: { type?: StratModelType; challengeId?: string; stageId?: string; statusId?: string; search?: string }
  ): Promise<StratModel[]> {
    let items = await this.getSettingJson<StratModel[]>(tenantId, "strat_models", []);

    const [challenges, stages, statuses] = await Promise.all([
      this.getChallenges(tenantId),
      this.getStages(tenantId),
      this.getStatuses(tenantId),
    ]);

    const chalMap = new Map(challenges.map((c) => [c.id, c.name]));
    const stageMap = new Map(stages.map((s) => [s.id, s]));
    const statusMap = new Map(statuses.map((s) => [s.id, s]));

    items = items.map((m) => {
      const stg = stageMap.get(m.stageId);
      const sta = statusMap.get(m.statusId);
      return {
        ...m,
        challengeName: m.challengeId ? chalMap.get(m.challengeId) || "Untitled Challenge" : undefined,
        stageName: stg?.name || "Draft",
        stageColor: stg?.color || "#94a3b8",
        statusName: sta?.name || "Active",
        statusColor: sta?.color || "#2563eb",
      };
    });

    if (filters?.type) {
      items = items.filter((m) => m.type === filters.type);
    }
    if (filters?.challengeId) {
      items = items.filter((m) => m.challengeId === filters.challengeId);
    }
    if (filters?.stageId) {
      items = items.filter((m) => m.stageId === filters.stageId);
    }
    if (filters?.statusId) {
      items = items.filter((m) => m.statusId === filters.statusId);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q) ||
          m.challengeName?.toLowerCase().includes(q)
      );
    }

    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static async getModelById(tenantId: string, id: string): Promise<StratModel | null> {
    const models = await this.getModels(tenantId);
    return models.find((m) => m.id === id) || null;
  }

  static async createModel(
    tenantId: string,
    data: {
      type?: StratModelType;
      name: string;
      challengeId?: string | null;
      statusId?: string;
      stageId?: string;
      thumbnailMediaId?: string;
      videoMediaId?: string;
      description?: string;
      organisationalEffects?: string;
      goalDescription?: string;
      notes?: string;
      budgetAmount?: number;
      members?: StratModelMember[];
      attachments?: { id: string; name: string; url: string }[];
    },
    userId: string
  ): Promise<StratModel> {
    // RULE: A model cannot be created or cloned if its challenge end date is in the past!
    if (data.challengeId) {
      const challenge = await this.getChallengeById(tenantId, data.challengeId);
      if (challenge) {
        const endDate = new Date(challenge.endAt);
        if (endDate.getTime() < Date.now()) {
          throw new Error("Cannot create a charter or model linked to an expired challenge whose end date is in the past.");
        }
      }
    }

    const [stages, statuses] = await Promise.all([this.getStages(tenantId), this.getStatuses(tenantId)]);

    const stageId = data.stageId || stages[0]?.id || "sstg_default";
    const statusId = data.statusId || statuses[0]?.id || "ssta_default";

    const models = await this.getModels(tenantId);
    const now = new Date().toISOString();

    const newModel: StratModel = {
      id: `smod_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
      tenantId,
      type: data.type || "charter",
      name: data.name.trim(),
      challengeId: data.challengeId || null,
      statusId,
      stageId,
      thumbnailMediaId: data.thumbnailMediaId,
      videoMediaId: data.videoMediaId,
      description: data.description?.trim(),
      organisationalEffects: data.organisationalEffects?.trim(),
      goalDescription: data.goalDescription?.trim(),
      notes: data.notes?.trim(),
      budgetAmount: data.budgetAmount,
      members: data.members || [],
      attachments: data.attachments || [],
      sections: {},
      ratings: {},
      ratingAvg: 0,
      ratingCount: 0,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };

    models.unshift(newModel);
    await this.saveSettingJson(tenantId, "strat_models", models);

    await AuditService.log({
      tenantId,
      userId,
      action: "PLANNING_MODEL_CREATED",
      entityType: "StratModel",
      entityId: newModel.id,
      changes: { type: newModel.type, name: newModel.name, stageId, statusId },
    });

    await OutboxService.createOutboxEvent({
      tenantId,
      eventType: "planning.charter.created",
      entityType: "StratModel",
      entityId: newModel.id,
      payload: { id: newModel.id, name: newModel.name, type: newModel.type },
    });

    return newModel;
  }

  static async cloneModel(tenantId: string, id: string, userId: string): Promise<StratModel> {
    const existing = await this.getModelById(tenantId, id);
    if (!existing) throw new Error("Strategic model not found");

    if (existing.challengeId) {
      const challenge = await this.getChallengeById(tenantId, existing.challengeId);
      if (challenge) {
        const endDate = new Date(challenge.endAt);
        if (endDate.getTime() < Date.now()) {
          throw new Error("Cannot clone a charter or model linked to an expired challenge whose end date is in the past.");
        }
      }
    }

    return await this.createModel(
      tenantId,
      {
        type: existing.type,
        name: `${existing.name} (Copy)`,
        challengeId: existing.challengeId,
        statusId: existing.statusId,
        stageId: existing.stageId,
        thumbnailMediaId: existing.thumbnailMediaId,
        videoMediaId: existing.videoMediaId,
        description: existing.description,
        organisationalEffects: existing.organisationalEffects,
        goalDescription: existing.goalDescription,
        notes: existing.notes,
        budgetAmount: existing.budgetAmount,
        members: existing.members,
        attachments: existing.attachments,
      },
      userId
    );
  }

  static async updateModel(
    tenantId: string,
    id: string,
    data: Partial<StratModel>,
    userId: string
  ): Promise<StratModel> {
    const models = await this.getModels(tenantId);
    const existing = models.find((m) => m.id === id);
    if (!existing) throw new Error("Strategic model not found");

    if (data.challengeId && data.challengeId !== existing.challengeId) {
      const challenge = await this.getChallengeById(tenantId, data.challengeId);
      if (challenge && new Date(challenge.endAt).getTime() < Date.now()) {
        throw new Error("Cannot reassign to a challenge that has already ended.");
      }
      existing.challengeId = data.challengeId;
    }

    if (data.name) existing.name = data.name.trim();
    if (data.stageId) existing.stageId = data.stageId;
    if (data.statusId) existing.statusId = data.statusId;
    if (data.thumbnailMediaId !== undefined) existing.thumbnailMediaId = data.thumbnailMediaId;
    if (data.videoMediaId !== undefined) existing.videoMediaId = data.videoMediaId;
    if (data.description !== undefined) existing.description = data.description;
    if (data.organisationalEffects !== undefined) existing.organisationalEffects = data.organisationalEffects;
    if (data.goalDescription !== undefined) existing.goalDescription = data.goalDescription;
    if (data.notes !== undefined) existing.notes = data.notes;
    if (data.budgetAmount !== undefined) existing.budgetAmount = data.budgetAmount;
    if (data.members !== undefined) existing.members = data.members;
    if (data.attachments !== undefined) existing.attachments = data.attachments;
    existing.updatedAt = new Date().toISOString();

    await this.saveSettingJson(tenantId, "strat_models", models);

    await AuditService.log({
      tenantId,
      userId,
      action: "PLANNING_MODEL_UPDATED",
      entityType: "StratModel",
      entityId: id,
      changes: data,
    });

    await OutboxService.createOutboxEvent({
      tenantId,
      eventType: "planning.model.updated",
      entityType: "StratModel",
      entityId: id,
      payload: { id, name: existing.name },
    });

    return existing;
  }

  static async changeModelStage(
    tenantId: string,
    id: string,
    newStageId: string,
    userId: string
  ): Promise<StratModel> {
    const models = await this.getModels(tenantId);
    const existing = models.find((m) => m.id === id);
    if (!existing) throw new Error("Charter not found");

    const oldStageId = existing.stageId;
    existing.stageId = newStageId;
    existing.updatedAt = new Date().toISOString();

    await this.saveSettingJson(tenantId, "strat_models", models);

    await AuditService.log({
      tenantId,
      userId,
      action: "PLANNING_MODEL_STAGE_CHANGED",
      entityType: "StratModel",
      entityId: id,
      changes: { oldStageId, newStageId },
    });

    await OutboxService.createOutboxEvent({
      tenantId,
      eventType: "planning.charter.stage_changed",
      entityType: "StratModel",
      entityId: id,
      payload: { id, name: existing.name, oldStageId, newStageId },
    });

    return existing;
  }

  static async rateModel(
    tenantId: string,
    id: string,
    ratingValue: number,
    userId: string
  ): Promise<{ ratingAvg: number; ratingCount: number }> {
    if (ratingValue < 1 || ratingValue > 5) {
      throw new Error("Rating must be between 1 and 5 stars");
    }

    const models = await this.getModels(tenantId);
    const existing = models.find((m) => m.id === id);
    if (!existing) throw new Error("Model not found");

    if (!existing.ratings) existing.ratings = {};
    existing.ratings[userId] = {
      userId,
      value: ratingValue,
      updatedAt: new Date().toISOString(),
    };

    const ratingValues = Object.values(existing.ratings).map((r) => r.value);
    const sum = ratingValues.reduce((acc, v) => acc + v, 0);
    existing.ratingCount = ratingValues.length;
    existing.ratingAvg = parseFloat((sum / existing.ratingCount).toFixed(1));
    existing.updatedAt = new Date().toISOString();

    await this.saveSettingJson(tenantId, "strat_models", models);

    await OutboxService.createOutboxEvent({
      tenantId,
      eventType: "planning.rating.updated",
      entityType: "StratModel",
      entityId: id,
      payload: { id, ratingAvg: existing.ratingAvg, ratingCount: existing.ratingCount },
    });

    return { ratingAvg: existing.ratingAvg, ratingCount: existing.ratingCount };
  }

  static async updateModelSection(
    tenantId: string,
    id: string,
    sectionKey: string,
    content: string,
    userId: string
  ): Promise<StratModelSection> {
    const models = await this.getModels(tenantId);
    const existing = models.find((m) => m.id === id);
    if (!existing) throw new Error("Model not found");

    if (!existing.sections) existing.sections = {};
    const curSec = existing.sections[sectionKey];
    const newVersion = (curSec?.version || 0) + 1;

    const section: StratModelSection = {
      sectionKey,
      content,
      version: newVersion,
      updatedBy: userId,
      updatedAt: new Date().toISOString(),
    };

    existing.sections[sectionKey] = section;
    existing.updatedAt = new Date().toISOString();

    await this.saveSettingJson(tenantId, "strat_models", models);
    return section;
  }

  static async deleteModel(tenantId: string, id: string, userId: string): Promise<void> {
    const models = await this.getModels(tenantId);
    const filtered = models.filter((m) => m.id !== id);
    await this.saveSettingJson(tenantId, "strat_models", filtered);

    await AuditService.log({
      tenantId,
      userId,
      action: "PLANNING_MODEL_DELETED",
      entityType: "StratModel",
      entityId: id,
      changes: { deleted: true },
    });

    await OutboxService.createOutboxEvent({
      tenantId,
      eventType: "planning.model.deleted",
      entityType: "StratModel",
      entityId: id,
      payload: { id },
    });
  }

  // ─── COMMENTS ───────────────────────────────────────────────────────────────
  static async getComments(tenantId: string, modelId: string): Promise<StratComment[]> {
    const comments = await this.getSettingJson<StratComment[]>(tenantId, `strat_comments_${modelId}`, []);
    return comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  static async addComment(
    tenantId: string,
    modelId: string,
    data: { body: string; parentId?: string | null; attachments?: StratCommentAttachment[] },
    userId: string,
    userName: string
  ): Promise<StratComment> {
    const comments = await this.getComments(tenantId, modelId);
    const now = new Date().toISOString();

    const newComment: StratComment = {
      id: `scom_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
      modelId,
      userId,
      userName: userName || "User",
      body: data.body.trim(),
      parentId: data.parentId || null,
      attachments: data.attachments || [],
      createdAt: now,
      updatedAt: now,
    };

    comments.push(newComment);
    await this.saveSettingJson(tenantId, `strat_comments_${modelId}`, comments);

    await OutboxService.createOutboxEvent({
      tenantId,
      eventType: "planning.comment.created",
      entityType: "StratComment",
      entityId: newComment.id,
      payload: { modelId, commentId: newComment.id, author: userName },
    });

    return newComment;
  }

  // ─── DASHBOARD ANALYTICS ────────────────────────────────────────────────────
  static async getDashboard(tenantId: string) {
    const [challenges, models, stages] = await Promise.all([
      this.getChallenges(tenantId),
      this.getModels(tenantId),
      this.getStages(tenantId),
    ]);

    const positionTotals = {
      ongoing: challenges.filter((c) => c.position === "ongoing").length,
      on_hold: challenges.filter((c) => c.position === "on_hold").length,
      finished: challenges.filter((c) => c.position === "finished").length,
    };

    const modelsByStage = stages.map((s) => ({
      stageId: s.id,
      stageName: s.name,
      stageColor: s.color,
      count: models.filter((m) => m.stageId === s.id).length,
    }));

    // Ending soon challenges (within next 14 days)
    const now = Date.now();
    const fourteenDays = now + 14 * 24 * 60 * 60 * 1000;
    const endingSoon = challenges.filter((c) => {
      const end = new Date(c.endAt).getTime();
      return end >= now && end <= fourteenDays;
    });

    // Recent models
    const recentModels = models.slice(0, 5);

    return {
      totalChallenges: challenges.length,
      totalModels: models.length,
      positionTotals,
      modelsByStage,
      endingSoon,
      recentModels,
    };
  }
}
