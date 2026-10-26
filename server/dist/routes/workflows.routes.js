"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const socket_1 = require("../socket");
exports.workflowsRouter = (0, express_1.Router)();
// GET /api/workflows/rules - List all automation rules for tenant
exports.workflowsRouter.get("/rules", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const rules = await prisma_1.prisma.automationRule.findMany({
            where: { tenantId },
            orderBy: { createdAt: "desc" },
        });
        return res.json(rules.map((r) => ({
            id: r.id,
            name: r.name,
            triggerEvent: r.triggerEvent,
            condition: r.condition,
            actionType: r.actionType,
            actionDescription: r.actionDescription,
            isActive: r.isActive,
            executionCount: r.executionCount,
            lastExecutedAt: r.lastExecutedAt?.toISOString() || null,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
        })));
    }
    catch (err) {
        console.error("[GET /api/workflows/rules] error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch automation rules" });
    }
});
// POST /api/workflows/rules - Create automation rule
exports.workflowsRouter.post("/rules", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const body = req.body;
        if (!body.name?.trim()) {
            return res.status(400).json({ error: "Rule name is required." });
        }
        const created = await prisma_1.prisma.automationRule.create({
            data: {
                tenantId,
                name: body.name.trim(),
                triggerEvent: body.triggerEvent || "expense_submitted",
                condition: body.condition?.trim() || "",
                actionType: body.actionType || "escalate_to_director",
                actionDescription: body.actionDescription?.trim() || "",
                isActive: true,
                executionCount: 0,
            },
        });
        (0, socket_1.broadcastToTenant)(tenantId, "workflow:rule:created", { id: created.id, name: created.name });
        return res.status(201).json({
            id: created.id,
            name: created.name,
            triggerEvent: created.triggerEvent,
            condition: created.condition,
            actionType: created.actionType,
            actionDescription: created.actionDescription,
            isActive: created.isActive,
            executionCount: created.executionCount,
            lastExecutedAt: null,
            createdAt: created.createdAt.toISOString(),
            updatedAt: created.updatedAt.toISOString(),
        });
    }
    catch (err) {
        console.error("[POST /api/workflows/rules] error:", err);
        return res.status(500).json({ error: err.message || "Failed to create automation rule" });
    }
});
// PUT /api/workflows/rules/:id - Update rule
exports.workflowsRouter.put("/rules/:id", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { id } = req.params;
        const body = req.body;
        const existing = await prisma_1.prisma.automationRule.findFirst({ where: { id, tenantId } });
        if (!existing)
            return res.status(404).json({ error: "Rule not found." });
        const dataToUpdate = {};
        if (body.name !== undefined)
            dataToUpdate.name = body.name.trim();
        if (body.triggerEvent !== undefined)
            dataToUpdate.triggerEvent = body.triggerEvent;
        if (body.condition !== undefined)
            dataToUpdate.condition = body.condition;
        if (body.actionType !== undefined)
            dataToUpdate.actionType = body.actionType;
        if (body.actionDescription !== undefined)
            dataToUpdate.actionDescription = body.actionDescription;
        if (body.isActive !== undefined)
            dataToUpdate.isActive = Boolean(body.isActive);
        const updated = await prisma_1.prisma.automationRule.update({ where: { id }, data: dataToUpdate });
        (0, socket_1.broadcastToTenant)(tenantId, "workflow:rule:updated", { id: updated.id });
        return res.json({
            id: updated.id,
            name: updated.name,
            triggerEvent: updated.triggerEvent,
            condition: updated.condition,
            actionType: updated.actionType,
            actionDescription: updated.actionDescription,
            isActive: updated.isActive,
            executionCount: updated.executionCount,
            lastExecutedAt: updated.lastExecutedAt?.toISOString() || null,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
        });
    }
    catch (err) {
        console.error("[PUT /api/workflows/rules/:id] error:", err);
        return res.status(500).json({ error: err.message || "Failed to update rule" });
    }
});
// DELETE /api/workflows/rules/:id - Delete rule
exports.workflowsRouter.delete("/rules/:id", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { id } = req.params;
        const deleted = await prisma_1.prisma.automationRule.deleteMany({ where: { id, tenantId } });
        if (deleted.count === 0)
            return res.status(404).json({ error: "Rule not found." });
        (0, socket_1.broadcastToTenant)(tenantId, "workflow:rule:deleted", { id });
        return res.json({ success: true });
    }
    catch (err) {
        console.error("[DELETE /api/workflows/rules/:id] error:", err);
        return res.status(500).json({ error: err.message || "Failed to delete rule" });
    }
});
// GET /api/workflows/logs - List execution logs for tenant
exports.workflowsRouter.get("/logs", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const logs = await prisma_1.prisma.automationLog.findMany({
            where: { tenantId },
            orderBy: { executedAt: "desc" },
            take: 100,
        });
        return res.json(logs.map((l) => ({
            id: l.id,
            ruleId: l.ruleId,
            ruleName: l.ruleName,
            triggerEvent: l.triggerEvent,
            entityDetails: l.entityDetails,
            status: l.status,
            executedAt: l.executedAt.toISOString(),
        })));
    }
    catch (err) {
        console.error("[GET /api/workflows/logs] error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch execution logs" });
    }
});
// POST /api/workflows/rules/:id/trigger - Trigger/test a rule (creates log entry)
exports.workflowsRouter.post("/rules/:id/trigger", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { id } = req.params;
        const { entityDetails } = req.body;
        const rule = await prisma_1.prisma.automationRule.findFirst({ where: { id, tenantId } });
        if (!rule)
            return res.status(404).json({ error: "Rule not found." });
        // Create log entry and increment execution count
        const [log] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.automationLog.create({
                data: {
                    tenantId,
                    ruleId: rule.id,
                    ruleName: rule.name,
                    triggerEvent: rule.triggerEvent,
                    entityDetails: entityDetails || `Manual test trigger — ${new Date().toLocaleString()}`,
                    status: "Success",
                    executedAt: new Date(),
                },
            }),
            prisma_1.prisma.automationRule.update({
                where: { id: rule.id },
                data: {
                    executionCount: { increment: 1 },
                    lastExecutedAt: new Date(),
                },
            }),
        ]);
        (0, socket_1.broadcastToTenant)(tenantId, "workflow:rule:triggered", { ruleId: id, logId: log.id });
        return res.json({
            success: true,
            log: {
                id: log.id,
                ruleName: log.ruleName,
                triggerEvent: log.triggerEvent,
                entityDetails: log.entityDetails,
                status: log.status,
                executedAt: log.executedAt.toISOString(),
            },
        });
    }
    catch (err) {
        console.error("[POST /api/workflows/rules/:id/trigger] error:", err);
        return res.status(500).json({ error: err.message || "Failed to trigger rule" });
    }
});
