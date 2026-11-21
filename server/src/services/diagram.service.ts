import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
import crypto from "crypto";

const db = rawPrisma || proxiedPrisma;

export type DiagramType = "FLOWCHART" | "ERD" | "UML" | "ARCHITECTURE" | "MINDMAP" | "NETWORK";

export interface DiagramNode {
  id: string;
  type: string; // 'rect', 'circle', 'diamond', 'database', 'actor', etc.
  label: string;
  position: { x: number; y: number };
  dimensions?: { width: number; height: number };
  style?: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    textColor?: string;
  };
  data?: Record<string, any>;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: "straight" | "curved" | "orthogonal";
  style?: {
    stroke?: string;
    strokeWidth?: number;
    dashed?: boolean;
    arrowEnd?: boolean;
  };
}

export interface DiagramCanvasConfig {
  width?: number;
  height?: number;
  background?: string;
  gridSnap?: boolean;
  zoom?: number;
}

export interface DiagramDocument {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  diagramType: DiagramType;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  canvasConfig: DiagramCanvasConfig;
  version: number;
  isPublished: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export class DiagramService {
  private static async getDiagramsList(tenantId: string): Promise<DiagramDocument[]> {
    const setting = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "diagram_studio", key: "documents" },
    });
    if (setting && (setting.valueJson as any)?.items) {
      return (setting.valueJson as any).items;
    }
    return [];
  }

  private static async saveDiagramsList(tenantId: string, items: DiagramDocument[]): Promise<void> {
    const existing = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "diagram_studio", key: "documents" },
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
          group: "diagram_studio",
          key: "documents",
          valueJson: { items } as any,
          valueType: "json",
          version: 1,
        },
      });
    }
  }

  static async listDiagrams(tenantId: string, diagramType?: DiagramType): Promise<DiagramDocument[]> {
    const list = await this.getDiagramsList(tenantId);
    if (diagramType) {
      return list.filter((d) => d.diagramType === diagramType);
    }
    return list;
  }

  static async getDiagram(tenantId: string, id: string): Promise<DiagramDocument | null> {
    const list = await this.getDiagramsList(tenantId);
    return list.find((d) => d.id === id) || null;
  }

  static async createDiagram(
    tenantId: string,
    data: {
      title: string;
      description?: string;
      diagramType: DiagramType;
      nodes?: DiagramNode[];
      edges?: DiagramEdge[];
      canvasConfig?: DiagramCanvasConfig;
    },
    userId: string
  ): Promise<DiagramDocument> {
    const list = await this.getDiagramsList(tenantId);
    const now = new Date().toISOString();

    const doc: DiagramDocument = {
      id: crypto.randomUUID(),
      tenantId,
      title: data.title.trim(),
      description: data.description?.trim(),
      diagramType: data.diagramType,
      nodes: data.nodes || [],
      edges: data.edges || [],
      canvasConfig: data.canvasConfig || { width: 1920, height: 1080, background: "#ffffff", gridSnap: true, zoom: 1 },
      version: 1,
      isPublished: false,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };

    list.unshift(doc);
    await this.saveDiagramsList(tenantId, list);
    return doc;
  }

  static async updateDiagram(
    tenantId: string,
    id: string,
    updates: {
      title?: string;
      description?: string;
      nodes?: DiagramNode[];
      edges?: DiagramEdge[];
      canvasConfig?: DiagramCanvasConfig;
      isPublished?: boolean;
    }
  ): Promise<DiagramDocument> {
    const list = await this.getDiagramsList(tenantId);
    const doc = list.find((d) => d.id === id);
    if (!doc) {
      throw new Error(`Diagram document '${id}' not found`);
    }

    if (updates.title) doc.title = updates.title.trim();
    if (updates.description !== undefined) doc.description = updates.description?.trim();
    if (updates.nodes) doc.nodes = updates.nodes;
    if (updates.edges) doc.edges = updates.edges;
    if (updates.canvasConfig) doc.canvasConfig = { ...doc.canvasConfig, ...updates.canvasConfig };
    if (updates.isPublished !== undefined) doc.isPublished = updates.isPublished;

    doc.version += 1;
    doc.updatedAt = new Date().toISOString();

    await this.saveDiagramsList(tenantId, list);
    return doc;
  }

  static async deleteDiagram(tenantId: string, id: string): Promise<boolean> {
    let list = await this.getDiagramsList(tenantId);
    const prevLen = list.length;
    list = list.filter((d) => d.id !== id);
    if (list.length === prevLen) return false;

    await this.saveDiagramsList(tenantId, list);
    return true;
  }
}
