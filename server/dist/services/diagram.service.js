"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiagramService = void 0;
const prisma_1 = require("../prisma");
const crypto_1 = __importDefault(require("crypto"));
const db = prisma_1.rawPrisma || prisma_1.prisma;
class DiagramService {
    static async getDiagramsList(tenantId) {
        const setting = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "diagram_studio", key: "documents" },
        });
        if (setting && setting.valueJson?.items) {
            return setting.valueJson.items;
        }
        return [];
    }
    static async saveDiagramsList(tenantId, items) {
        const existing = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "diagram_studio", key: "documents" },
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
                    group: "diagram_studio",
                    key: "documents",
                    valueJson: { items },
                    valueType: "json",
                    version: 1,
                },
            });
        }
    }
    static async listDiagrams(tenantId, diagramType) {
        const list = await this.getDiagramsList(tenantId);
        if (diagramType) {
            return list.filter((d) => d.diagramType === diagramType);
        }
        return list;
    }
    static async getDiagram(tenantId, id) {
        const list = await this.getDiagramsList(tenantId);
        return list.find((d) => d.id === id) || null;
    }
    static async createDiagram(tenantId, data, userId) {
        const list = await this.getDiagramsList(tenantId);
        const now = new Date().toISOString();
        const doc = {
            id: crypto_1.default.randomUUID(),
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
    static async updateDiagram(tenantId, id, updates) {
        const list = await this.getDiagramsList(tenantId);
        const doc = list.find((d) => d.id === id);
        if (!doc) {
            throw new Error(`Diagram document '${id}' not found`);
        }
        if (updates.title)
            doc.title = updates.title.trim();
        if (updates.description !== undefined)
            doc.description = updates.description?.trim();
        if (updates.nodes)
            doc.nodes = updates.nodes;
        if (updates.edges)
            doc.edges = updates.edges;
        if (updates.canvasConfig)
            doc.canvasConfig = { ...doc.canvasConfig, ...updates.canvasConfig };
        if (updates.isPublished !== undefined)
            doc.isPublished = updates.isPublished;
        doc.version += 1;
        doc.updatedAt = new Date().toISOString();
        await this.saveDiagramsList(tenantId, list);
        return doc;
    }
    static async deleteDiagram(tenantId, id) {
        let list = await this.getDiagramsList(tenantId);
        const prevLen = list.length;
        list = list.filter((d) => d.id !== id);
        if (list.length === prevLen)
            return false;
        await this.saveDiagramsList(tenantId, list);
        return true;
    }
}
exports.DiagramService = DiagramService;
