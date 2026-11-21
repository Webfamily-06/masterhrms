import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
import crypto from "crypto";

const db = rawPrisma || proxiedPrisma;

export interface SpreadsheetCell {
  rawValue?: any;
  formula?: string;
  computedValue?: any;
  style?: {
    bold?: boolean;
    italic?: boolean;
    textColor?: string;
    backgroundColor?: string;
    align?: "left" | "center" | "right";
  };
}

export interface SpreadsheetSheet {
  id: string;
  name: string;
  rowCount: number;
  columnCount: number;
  cells: Record<string, SpreadsheetCell>;
}

export interface SpreadsheetWorkbook {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  sheets: SpreadsheetSheet[];
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export class SpreadsheetService {
  private static async getWorkbooksList(tenantId: string): Promise<SpreadsheetWorkbook[]> {
    const setting = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "spreadsheet_studio", key: "workbooks" },
    });
    if (setting && (setting.valueJson as any)?.items) {
      return (setting.valueJson as any).items;
    }
    return [];
  }

  private static async saveWorkbooksList(tenantId: string, items: SpreadsheetWorkbook[]): Promise<void> {
    const existing = await db.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "spreadsheet_studio", key: "workbooks" },
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
          group: "spreadsheet_studio",
          key: "workbooks",
          valueJson: { items } as any,
          valueType: "json",
          version: 1,
        },
      });
    }
  }

  static async listWorkbooks(tenantId: string): Promise<SpreadsheetWorkbook[]> {
    return await this.getWorkbooksList(tenantId);
  }

  static async getWorkbook(tenantId: string, id: string): Promise<SpreadsheetWorkbook | null> {
    const list = await this.getWorkbooksList(tenantId);
    return list.find((w) => w.id === id) || null;
  }

  static async createWorkbook(
    tenantId: string,
    data: {
      title: string;
      description?: string;
      initialSheetName?: string;
      initialCells?: Record<string, SpreadsheetCell>;
    },
    userId: string
  ): Promise<SpreadsheetWorkbook> {
    const list = await this.getWorkbooksList(tenantId);
    const now = new Date().toISOString();

    const firstSheet: SpreadsheetSheet = {
      id: crypto.randomUUID(),
      name: data.initialSheetName || "Sheet1",
      rowCount: 100,
      columnCount: 26,
      cells: data.initialCells || {},
    };

    const workbook: SpreadsheetWorkbook = {
      id: crypto.randomUUID(),
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

  static async updateCells(
    tenantId: string,
    workbookId: string,
    sheetId: string,
    cellsToUpdate: Record<string, SpreadsheetCell>
  ): Promise<SpreadsheetWorkbook> {
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

  static async addSheet(tenantId: string, workbookId: string, name: string): Promise<SpreadsheetSheet> {
    const list = await this.getWorkbooksList(tenantId);
    const wb = list.find((w) => w.id === workbookId);
    if (!wb) {
      throw new Error(`Workbook '${workbookId}' not found`);
    }

    const newSheet: SpreadsheetSheet = {
      id: crypto.randomUUID(),
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

  static async deleteWorkbook(tenantId: string, id: string): Promise<boolean> {
    let list = await this.getWorkbooksList(tenantId);
    const prevLen = list.length;
    list = list.filter((w) => w.id !== id);
    if (list.length === prevLen) return false;

    await this.saveWorkbooksList(tenantId, list);
    return true;
  }
}
