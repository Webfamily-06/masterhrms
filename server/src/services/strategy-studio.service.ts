import crypto from "crypto";
import { prisma } from "../prisma";
import { AuditService } from "./audit.service";
import { OutboxService } from "./outbox.service";

export type StrategyMatrixType = "swot" | "pestel" | "porter-five-forces" | "mckinsey-7s";

export interface StrategySectionItem {
  id: string;
  category: string; // e.g., 'strengths', 'weaknesses', 'opportunities', 'threats'
  text: string;
  impactScore?: number; // 1-5
  tags?: string[];
}

export interface StrategyDocument {
  id: string;
  tenantId: string;
  matrixType: StrategyMatrixType;
  title: string;
  description?: string;
  sections: Record<string, StrategySectionItem[]>;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// In-memory tenant strategy document store (using existing models / persistent structures)
const strategyDocStore = new Map<string, StrategyDocument[]>();

export class StrategyStudioService {
  /**
   * Get default template structure for a matrix type
   */
  static getTemplate(matrixType: StrategyMatrixType) {
    if (matrixType === "swot") {
      return {
        matrixType: "swot",
        title: "Standard SWOT Analysis",
        categories: [
          { key: "strengths", label: "Strengths (Internal)", placeholder: "Key competitive advantages..." },
          { key: "weaknesses", label: "Weaknesses (Internal)", placeholder: "Areas needing improvement..." },
          { key: "opportunities", label: "Opportunities (External)", placeholder: "Market growth avenues..." },
          { key: "threats", label: "Threats (External)", placeholder: "Competitive and regulatory risks..." },
        ],
      };
    } else if (matrixType === "pestel") {
      return {
        matrixType: "pestel",
        title: "Standard PESTEL Analysis",
        categories: [
          { key: "political", label: "Political", placeholder: "Tax policies, trade tariffs, stability..." },
          { key: "economic", label: "Economic", placeholder: "Inflation, interest rates, exchange rates..." },
          { key: "social", label: "Social", placeholder: "Demographics, consumer attitudes..." },
          { key: "technological", label: "Technological", placeholder: "R&D, automation, disruptive tech..." },
          { key: "environmental", label: "Environmental", placeholder: "Sustainability, climate policies..." },
          { key: "legal", label: "Legal", placeholder: "Employment laws, consumer protection..." },
        ],
      };
    }

    return {
      matrixType,
      title: `${matrixType.toUpperCase()} Matrix`,
      categories: [],
    };
  }

  /**
   * List strategy documents for a tenant
   */
  static listDocuments(tenantId: string, matrixType?: StrategyMatrixType): StrategyDocument[] {
    const docs = strategyDocStore.get(tenantId) || [];
    if (matrixType) {
      return docs.filter((d) => d.matrixType === matrixType);
    }
    return docs;
  }

  /**
   * Create a strategy matrix document from template
   */
  static async createDocument(
    tenantId: string,
    data: { matrixType: StrategyMatrixType; title: string; description?: string; initialItems?: Record<string, StrategySectionItem[]> },
    actorId?: string
  ): Promise<StrategyDocument> {
    const docId = `strat_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const template = this.getTemplate(data.matrixType);

    const sections: Record<string, StrategySectionItem[]> = {};
    template.categories.forEach((c) => {
      sections[c.key] = data.initialItems?.[c.key] || [];
    });

    const doc: StrategyDocument = {
      id: docId,
      tenantId,
      matrixType: data.matrixType,
      title: data.title,
      description: data.description,
      sections,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const tenantDocs = strategyDocStore.get(tenantId) || [];
    tenantDocs.unshift(doc);
    strategyDocStore.set(tenantId, tenantDocs);

    await AuditService.log({
      tenantId,
      userId: actorId || "system",
      action: "STRATEGY_DOCUMENT_CREATED",
      entityType: "StrategyDocument",
      entityId: docId,
      changes: { matrixType: data.matrixType, title: data.title },
    });

    await OutboxService.createOutboxEvent({
      tenantId,
      eventType: "STRATEGY_DOCUMENT_CREATED",
      entityType: "StrategyDocument",
      entityId: docId,
      payload: { tenantId, matrixType: data.matrixType, title: data.title },
    });

    return doc;
  }

  /**
   * Add or update an item within a matrix category
   */
  static async updateCategoryItem(
    tenantId: string,
    docId: string,
    category: string,
    item: { text: string; impactScore?: number },
    actorId?: string
  ) {
    const docs = strategyDocStore.get(tenantId) || [];
    const doc = docs.find((d) => d.id === docId);
    if (!doc) throw new Error("Strategy document not found.");

    if (!doc.sections[category]) {
      doc.sections[category] = [];
    }

    const newItem: StrategySectionItem = {
      id: `item_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`,
      category,
      text: item.text,
      impactScore: item.impactScore || 3,
    };

    doc.sections[category].push(newItem);
    doc.version += 1;
    doc.updatedAt = new Date().toISOString();

    await AuditService.log({
      tenantId,
      userId: actorId || "system",
      action: "STRATEGY_ITEM_ADDED",
      entityType: "StrategyDocument",
      entityId: docId,
      changes: { category, text: item.text },
    });

    return doc;
  }

  /**
   * Export strategy matrix document to structured JSON / export format
   */
  static exportDocument(tenantId: string, docId: string) {
    const docs = strategyDocStore.get(tenantId) || [];
    const doc = docs.find((d) => d.id === docId);
    if (!doc) throw new Error("Strategy document not found.");

    let totalItems = 0;
    Object.values(doc.sections).forEach((arr) => {
      totalItems += arr.length;
    });

    return {
      exportFormat: "JSON",
      exportedAt: new Date().toISOString(),
      document: doc,
      summary: {
        matrixType: doc.matrixType,
        totalItems,
        version: doc.version,
      },
    };
  }
}
