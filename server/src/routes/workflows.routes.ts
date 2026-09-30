import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { broadcastToTenant } from "../socket";

export const workflowsRouter = Router();

// GET /api/workflows/rules - List all automation rules for tenant
workflowsRouter.get("/rules", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";

    const rules = await prisma.automationRule.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    return res.json(
      rules.map((r) => ({
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
      }))
    );
  } catch (err: any) {
    console.error("[GET /api/workflows/rules] error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch automation rules" });
  }
});

// POST /api/workflows/rules - Create automation rule
workflowsRouter.post("/rules", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const body = req.body;

    if (!body.name?.trim()) {
      return res.status(400).json({ error: "Rule name is required." });
    }

    const created = await prisma.automationRule.create({
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

    broadcastToTenant(tenantId, "workflow:rule:created", { id: created.id, name: created.name });

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
  } catch (err: any) {
    console.error("[POST /api/workflows/rules] error:", err);
    return res.status(500).json({ error: err.message || "Failed to create automation rule" });
  }
});

// PUT /api/workflows/rules/:id - Update rule
workflowsRouter.put("/rules/:id", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;
    const body = req.body;

    const existing = await prisma.automationRule.findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Rule not found." });

    const dataToUpdate: any = {};
    if (body.name !== undefined) dataToUpdate.name = body.name.trim();
    if (body.triggerEvent !== undefined) dataToUpdate.triggerEvent = body.triggerEvent;
    if (body.condition !== undefined) dataToUpdate.condition = body.condition;
    if (body.actionType !== undefined) dataToUpdate.actionType = body.actionType;
    if (body.actionDescription !== undefined) dataToUpdate.actionDescription = body.actionDescription;
    if (body.isActive !== undefined) dataToUpdate.isActive = Boolean(body.isActive);

    const updated = await prisma.automationRule.update({ where: { id }, data: dataToUpdate });

    broadcastToTenant(tenantId, "workflow:rule:updated", { id: updated.id });

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
  } catch (err: any) {
    console.error("[PUT /api/workflows/rules/:id] error:", err);
    return res.status(500).json({ error: err.message || "Failed to update rule" });
  }
});

// DELETE /api/workflows/rules/:id - Delete rule
workflowsRouter.delete("/rules/:id", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;

    const deleted = await prisma.automationRule.deleteMany({ where: { id, tenantId } });
    if (deleted.count === 0) return res.status(404).json({ error: "Rule not found." });

    broadcastToTenant(tenantId, "workflow:rule:deleted", { id });
    return res.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE /api/workflows/rules/:id] error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete rule" });
  }
});

// GET /api/workflows/logs - List execution logs for tenant
workflowsRouter.get("/logs", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";

    const logs = await prisma.automationLog.findMany({
      where: { tenantId },
      orderBy: { executedAt: "desc" },
      take: 100,
    });

    return res.json(
      logs.map((l) => ({
        id: l.id,
        ruleId: l.ruleId,
        ruleName: l.ruleName,
        triggerEvent: l.triggerEvent,
        entityDetails: l.entityDetails,
        status: l.status,
        executedAt: l.executedAt.toISOString(),
      }))
    );
  } catch (err: any) {
    console.error("[GET /api/workflows/logs] error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch execution logs" });
  }
});

// POST /api/workflows/rules/:id/trigger - Trigger/test a rule (creates log entry)
workflowsRouter.post("/rules/:id/trigger", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;
    const { entityDetails } = req.body;

    const rule = await prisma.automationRule.findFirst({ where: { id, tenantId } });
    if (!rule) return res.status(404).json({ error: "Rule not found." });

    // Create log entry and increment execution count
    const [log] = await prisma.$transaction([
      prisma.automationLog.create({
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
      prisma.automationRule.update({
        where: { id: rule.id },
        data: {
          executionCount: { increment: 1 },
          lastExecutedAt: new Date(),
        },
      }),
    ]);

    broadcastToTenant(tenantId, "workflow:rule:triggered", { ruleId: id, logId: log.id });

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
  } catch (err: any) {
    console.error("[POST /api/workflows/rules/:id/trigger] error:", err);
    return res.status(500).json({ error: err.message || "Failed to trigger rule" });
  }
});
