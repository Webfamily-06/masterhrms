"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retainerRouter = void 0;
const express_1 = require("express");
const retainer_service_1 = require("../services/retainer.service");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
exports.retainerRouter = (0, express_1.Router)();
exports.retainerRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
/**
 * GET /api/retainers
 * List retainer agreements
 */
exports.retainerRouter.get("/", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { status, clientId } = req.query;
        const agreements = await retainer_service_1.RetainerService.list(tenantId, {
            status: status,
            clientId: clientId ? String(clientId) : undefined,
        });
        return res.json({ retainers: agreements, total: agreements.length });
    }
    catch (err) {
        console.error("[retainers:list] error:", err);
        return res.status(500).json({ error: err.message || "Failed to load retainer agreements." });
    }
});
/**
 * GET /api/retainers/:id
 * Get single retainer agreement
 */
exports.retainerRouter.get("/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const retainer = await retainer_service_1.RetainerService.getById(tenantId, req.params.id);
        if (!retainer) {
            return res.status(404).json({ error: "Retainer agreement not found." });
        }
        return res.json({ retainer });
    }
    catch (err) {
        console.error("[retainers:get] error:", err);
        return res.status(500).json({ error: err.message || "Failed to load retainer agreement." });
    }
});
/**
 * POST /api/retainers
 * Create a new retainer agreement
 */
exports.retainerRouter.post("/", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { clientId, clientName, title, totalAmount, startDate, endDate, notes } = req.body;
        if (!clientId || !clientName || !title || totalAmount === undefined || !startDate || !endDate) {
            return res.status(400).json({
                error: "Missing required fields: clientId, clientName, title, totalAmount, startDate, endDate",
            });
        }
        const retainer = await retainer_service_1.RetainerService.create(tenantId, {
            clientId,
            clientName,
            title,
            totalAmount: Number(totalAmount),
            startDate,
            endDate,
            notes,
        });
        return res.status(201).json({ retainer });
    }
    catch (err) {
        console.error("[retainers:create] error:", err);
        return res.status(500).json({ error: err.message || "Failed to create retainer agreement." });
    }
});
/**
 * POST /api/retainers/:id/drawdown
 * Drawdown funds against retainer
 */
exports.retainerRouter.post("/:id/drawdown", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { amount, description, milestoneId, invoiceId } = req.body;
        if (!amount || Number(amount) <= 0 || !description) {
            return res.status(400).json({ error: "Valid amount and description are required for drawdown." });
        }
        const retainer = await retainer_service_1.RetainerService.drawdown(tenantId, req.params.id, {
            amount: Number(amount),
            description,
            milestoneId,
            invoiceId,
        });
        return res.json({ retainer });
    }
    catch (err) {
        console.error("[retainers:drawdown] error:", err);
        const status = err.message.includes("not found") ? 404 : 400;
        return res.status(status).json({ error: err.message || "Failed to process drawdown." });
    }
});
/**
 * POST /api/retainers/:id/deposit
 * Top-up funds into retainer
 */
exports.retainerRouter.post("/:id/deposit", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { amount, description } = req.body;
        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({ error: "Valid positive amount is required." });
        }
        const retainer = await retainer_service_1.RetainerService.deposit(tenantId, req.params.id, {
            amount: Number(amount),
            description: description || "Retainer Top-Up Deposit",
        });
        return res.json({ retainer });
    }
    catch (err) {
        console.error("[retainers:deposit] error:", err);
        const status = err.message.includes("not found") ? 404 : 400;
        return res.status(status).json({ error: err.message || "Failed to process deposit." });
    }
});
/**
 * POST /api/retainers/:id/close
 * Close retainer agreement
 */
exports.retainerRouter.post("/:id/close", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const retainer = await retainer_service_1.RetainerService.close(tenantId, req.params.id);
        return res.json({ retainer });
    }
    catch (err) {
        console.error("[retainers:close] error:", err);
        const status = err.message.includes("not found") ? 404 : 500;
        return res.status(status).json({ error: err.message || "Failed to close retainer agreement." });
    }
});
/**
 * DELETE /api/retainers/:id
 * Delete retainer agreement
 */
exports.retainerRouter.delete("/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        await retainer_service_1.RetainerService.delete(tenantId, req.params.id);
        return res.json({ success: true, message: "Retainer agreement deleted." });
    }
    catch (err) {
        console.error("[retainers:delete] error:", err);
        const status = err.message.includes("not found") ? 404 : 500;
        return res.status(status).json({ error: err.message || "Failed to delete retainer agreement." });
    }
});
