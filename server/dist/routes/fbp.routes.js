"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fbpRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const fbp_service_1 = require("../services/fbp.service");
const financial_year_1 = require("../utils/financial-year");
exports.fbpRouter = (0, express_1.Router)();
const fbpService = new fbp_service_1.FbpService(prisma_1.prisma);
// GET /api/fbp/window-status (Check corporate FBP windows and mid-year joiner grace period - PO-DEC-04)
exports.fbpRouter.get("/window-status", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const employeeId = req.user?.employeeId || req.query.employeeId;
        const status = await fbpService.checkWindowStatus(tenantId, employeeId);
        return res.json(status);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to check window status." });
    }
});
// GET /api/fbp/components (List standard flexible benefit plan components and caps)
exports.fbpRouter.get("/components", auth_1.requireAuth, async (req, res) => {
    try {
        return res.json({
            success: true,
            components: fbp_service_1.STANDARD_FBP_COMPONENTS,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to get FBP components." });
    }
});
// GET /api/fbp/pool (Get employee's allocated annual FBP pool)
exports.fbpRouter.get("/pool", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const employeeId = req.user?.employeeId || req.query.employeeId;
        if (!employeeId)
            return res.status(400).json({ error: "Employee ID is required." });
        const pool = await fbpService.getEmployeeFbpAllowancePool(tenantId, employeeId);
        return res.json({
            success: true,
            employeeId,
            allocatedFbpAnnualPool: pool,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch FBP pool." });
    }
});
// GET /api/fbp/my-declaration (Get current employee declaration for financial year)
exports.fbpRouter.get("/my-declaration", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const employeeId = req.user?.employeeId || req.query.employeeId;
        const financialYear = (0, financial_year_1.normalizeFinancialYear)(req.query.financialYear);
        if (!employeeId)
            return res.status(400).json({ error: "Employee ID is required." });
        const declaration = await fbpService.getDeclaration(tenantId, employeeId, financialYear);
        const pool = await fbpService.getEmployeeFbpAllowancePool(tenantId, employeeId);
        const windowStatus = await fbpService.checkWindowStatus(tenantId, employeeId);
        return res.json({
            success: true,
            declaration,
            allocatedFbpAnnualPool: pool,
            windowStatus,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to retrieve FBP declaration." });
    }
});
// POST /api/fbp/declarations (Save draft or submit FBP declaration)
exports.fbpRouter.post("/declarations", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const employeeId = req.user?.employeeId || req.body.employeeId;
        const { financialYear: rawFY, items = [], submitImmediately = false } = req.body;
        const financialYear = (0, financial_year_1.normalizeFinancialYear)(rawFY);
        if (!employeeId)
            return res.status(400).json({ error: "Employee ID is required." });
        const declaration = await fbpService.saveDeclaration(tenantId, employeeId, financialYear, items, submitImmediately);
        return res.status(201).json({
            success: true,
            message: submitImmediately
                ? "FBP declaration submitted successfully for HR approval!"
                : "FBP declaration draft saved successfully.",
            declaration,
        });
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to save FBP declaration." });
    }
});
// GET /api/fbp/admin/declarations (List all employee declarations for HR Admin)
exports.fbpRouter.get("/admin/declarations", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const { financialYear, status } = req.query;
        const declarations = await fbpService.listDeclarations(tenantId, financialYear ? String(financialYear) : undefined, status ? String(status) : undefined);
        return res.json({
            success: true,
            count: declarations.length,
            declarations,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to list FBP declarations." });
    }
});
// PATCH /api/fbp/admin/declarations/:id/approve (HR Admin approves declaration)
exports.fbpRouter.patch("/admin/declarations/:id/approve", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const { id } = req.params;
        const approverName = req.user?.email || "HR Admin";
        const updated = await fbpService.approveDeclaration(tenantId, id, approverName);
        return res.json({
            success: true,
            message: "FBP declaration approved.",
            declaration: updated,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to approve FBP declaration." });
    }
});
