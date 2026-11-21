"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spreadsheetRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const tenant_1 = require("../lib/tenant");
const spreadsheet_service_1 = require("../services/spreadsheet.service");
exports.spreadsheetRouter = (0, express_1.Router)();
exports.spreadsheetRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
// GET /api/spreadsheets
exports.spreadsheetRouter.get("/", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const workbooks = await spreadsheet_service_1.SpreadsheetService.listWorkbooks(tenantId);
        return res.json({ success: true, workbooks });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// GET /api/spreadsheets/:id
exports.spreadsheetRouter.get("/:id", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const workbook = await spreadsheet_service_1.SpreadsheetService.getWorkbook(tenantId, req.params.id);
        if (!workbook) {
            return res.status(404).json({ success: false, error: "Workbook not found" });
        }
        return res.json({ success: true, workbook });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/spreadsheets
exports.spreadsheetRouter.post("/", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const userId = req.user?.userId || "user_system";
        const { title, description, initialSheetName, initialCells } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ success: false, error: "title is required" });
        }
        const workbook = await spreadsheet_service_1.SpreadsheetService.createWorkbook(tenantId, { title, description, initialSheetName, initialCells }, userId);
        return res.status(201).json({ success: true, workbook });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// PUT /api/spreadsheets/:id/sheets/:sheetId/cells
exports.spreadsheetRouter.put("/:id/sheets/:sheetId/cells", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { cells } = req.body;
        if (!cells || typeof cells !== "object") {
            return res.status(400).json({ success: false, error: "cells object mapping is required" });
        }
        const updated = await spreadsheet_service_1.SpreadsheetService.updateCells(tenantId, req.params.id, req.params.sheetId, cells);
        return res.json({ success: true, workbook: updated });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/spreadsheets/:id/sheets
exports.spreadsheetRouter.post("/:id/sheets", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: "sheet name is required" });
        }
        const sheet = await spreadsheet_service_1.SpreadsheetService.addSheet(tenantId, req.params.id, name);
        return res.status(201).json({ success: true, sheet });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// DELETE /api/spreadsheets/:id
exports.spreadsheetRouter.delete("/:id", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const deleted = await spreadsheet_service_1.SpreadsheetService.deleteWorkbook(tenantId, req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: "Workbook not found" });
        }
        return res.json({ success: true, message: "Workbook deleted" });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
