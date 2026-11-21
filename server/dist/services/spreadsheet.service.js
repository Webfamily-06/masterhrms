"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpreadsheetService = void 0;
const prisma_1 = require("../prisma");
const crypto_1 = __importDefault(require("crypto"));
const db = prisma_1.rawPrisma || prisma_1.prisma;
class SpreadsheetService {
    static async getWorkbooksList(tenantId) {
        const setting = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "spreadsheet_studio", key: "workbooks" },
        });
        if (setting && setting.valueJson?.items) {
            return setting.valueJson.items;
        }
        return [];
    }
    static async saveWorkbooksList(tenantId, items) {
        const existing = await db.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "spreadsheet_studio", key: "workbooks" },
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
                    group: "spreadsheet_studio",
                    key: "workbooks",
                    valueJson: { items },
                    valueType: "json",
                    version: 1,
                },
            });
        }
    }
    static async listWorkbooks(tenantId) {
        return await this.getWorkbooksList(tenantId);
    }
    static async getWorkbook(tenantId, id) {
        const list = await this.getWorkbooksList(tenantId);
        return list.find((w) => w.id === id) || null;
    }
    static async createWorkbook(tenantId, data, userId) {
        const list = await this.getWorkbooksList(tenantId);
        const now = new Date().toISOString();
        const firstSheet = {
            id: crypto_1.default.randomUUID(),
            name: data.initialSheetName || "Sheet1",
            rowCount: 100,
            columnCount: 26,
            cells: data.initialCells || {},
        };
        const workbook = {
            id: crypto_1.default.randomUUID(),
            tenantId,
            title: data.title.trim(),
            description: data.description?.trim(),
            sheets: [firstSheet],
            version: 1,
            createdBy: userId,
            createdAt: now,
            updatedAt: now,
        };
        list.unshift(workbook);
        await this.saveWorkbooksList(tenantId, list);
        return workbook;
    }
    static async updateCells(tenantId, workbookId, sheetId, cellsToUpdate) {
        const list = await this.getWorkbooksList(tenantId);
        const wb = list.find((w) => w.id === workbookId);
        if (!wb) {
            throw new Error(`Workbook '${workbookId}' not found`);
        }
        const sheet = wb.sheets.find((s) => s.id === sheetId || s.name === sheetId);
        if (!sheet) {
            throw new Error(`Sheet '${sheetId}' not found in workbook '${workbookId}'`);
        }
        for (const [coord, cellData] of Object.entries(cellsToUpdate)) {
            const normalizedCoord = coord.toUpperCase();
            let computed = cellData.computedValue ?? cellData.rawValue;
            // Basic formula parser for simple sums e.g. "=SUM(10, 20)"
            if (cellData.formula && cellData.formula.startsWith("=")) {
                const sumMatch = cellData.formula.match(/^=SUM\(([\d,\s.]+)\)$/i);
                if (sumMatch) {
                    const numbers = sumMatch[1].split(",").map((n) => parseFloat(n.trim()) || 0);
                    computed = numbers.reduce((a, b) => a + b, 0);
                }
            }
            sheet.cells[normalizedCoord] = {
                ...sheet.cells[normalizedCoord],
                ...cellData,
                computedValue: computed,
            };
        }
        wb.version += 1;
        wb.updatedAt = new Date().toISOString();
        await this.saveWorkbooksList(tenantId, list);
        return wb;
    }
    static async addSheet(tenantId, workbookId, name) {
        const list = await this.getWorkbooksList(tenantId);
        const wb = list.find((w) => w.id === workbookId);
        if (!wb) {
            throw new Error(`Workbook '${workbookId}' not found`);
        }
        const newSheet = {
            id: crypto_1.default.randomUUID(),
            name: name.trim(),
            rowCount: 100,
            columnCount: 26,
            cells: {},
        };
        wb.sheets.push(newSheet);
        wb.version += 1;
        wb.updatedAt = new Date().toISOString();
        await this.saveWorkbooksList(tenantId, list);
        return newSheet;
    }
    static async deleteWorkbook(tenantId, id) {
        let list = await this.getWorkbooksList(tenantId);
        const prevLen = list.length;
        list = list.filter((w) => w.id !== id);
        if (list.length === prevLen)
            return false;
        await this.saveWorkbooksList(tenantId, list);
        return true;
    }
}
exports.SpreadsheetService = SpreadsheetService;
