import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { resolveTenantId } from "../lib/tenant";
import { SpreadsheetService } from "../services/spreadsheet.service";

export const spreadsheetRouter = Router();

spreadsheetRouter.use(requireAuth, resolveTenantContext);

// GET /api/spreadsheets
spreadsheetRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const workbooks = await SpreadsheetService.listWorkbooks(tenantId);
    return res.json({ success: true, workbooks });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/spreadsheets/:id
spreadsheetRouter.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const workbook = await SpreadsheetService.getWorkbook(tenantId, req.params.id);
    if (!workbook) {
      return res.status(404).json({ success: false, error: "Workbook not found" });
    }
    return res.json({ success: true, workbook });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/spreadsheets
spreadsheetRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const userId = req.user?.userId || "user_system";
    const { title, description, initialSheetName, initialCells } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: "title is required" });
    }

    const workbook = await SpreadsheetService.createWorkbook(
      tenantId,
      { title, description, initialSheetName, initialCells },
      userId
    );
    return res.status(201).json({ success: true, workbook });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/spreadsheets/:id/sheets/:sheetId/cells
spreadsheetRouter.put("/:id/sheets/:sheetId/cells", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { cells } = req.body;
    if (!cells || typeof cells !== "object") {
      return res.status(400).json({ success: false, error: "cells object mapping is required" });
    }

    const updated = await SpreadsheetService.updateCells(tenantId, req.params.id, req.params.sheetId, cells);
    return res.json({ success: true, workbook: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/spreadsheets/:id/sheets
spreadsheetRouter.post("/:id/sheets", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: "sheet name is required" });
    }

    const sheet = await SpreadsheetService.addSheet(tenantId, req.params.id, name);
    return res.status(201).json({ success: true, sheet });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/spreadsheets/:id
spreadsheetRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const deleted = await SpreadsheetService.deleteWorkbook(tenantId, req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Workbook not found" });
    }
    return res.json({ success: true, message: "Workbook deleted" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
