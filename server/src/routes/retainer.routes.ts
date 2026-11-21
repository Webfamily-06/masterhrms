import { Router, Response } from "express";
import { RetainerService } from "../services/retainer.service";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";

export const retainerRouter = Router();

retainerRouter.use(requireAuth, resolveTenantContext as any);

/**
 * GET /api/retainers
 * List retainer agreements
 */
retainerRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { status, clientId } = req.query;

    const agreements = await RetainerService.list(tenantId, {
      status: status as any,
      clientId: clientId ? String(clientId) : undefined,
    });

    return res.json({ retainers: agreements, total: agreements.length });
  } catch (err: any) {
    console.error("[retainers:list] error:", err);
    return res.status(500).json({ error: err.message || "Failed to load retainer agreements." });
  }
});

/**
 * GET /api/retainers/:id
 * Get single retainer agreement
 */
retainerRouter.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const retainer = await RetainerService.getById(tenantId, req.params.id);

    if (!retainer) {
      return res.status(404).json({ error: "Retainer agreement not found." });
    }

    return res.json({ retainer });
  } catch (err: any) {
    console.error("[retainers:get] error:", err);
    return res.status(500).json({ error: err.message || "Failed to load retainer agreement." });
  }
});

/**
 * POST /api/retainers
 * Create a new retainer agreement
 */
retainerRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { clientId, clientName, title, totalAmount, startDate, endDate, notes } = req.body;

    if (!clientId || !clientName || !title || totalAmount === undefined || !startDate || !endDate) {
      return res.status(400).json({
        error: "Missing required fields: clientId, clientName, title, totalAmount, startDate, endDate",
      });
    }

    const retainer = await RetainerService.create(tenantId, {
      clientId,
      clientName,
      title,
      totalAmount: Number(totalAmount),
      startDate,
      endDate,
      notes,
    });

    return res.status(201).json({ retainer });
  } catch (err: any) {
    console.error("[retainers:create] error:", err);
    return res.status(500).json({ error: err.message || "Failed to create retainer agreement." });
  }
});

/**
 * POST /api/retainers/:id/drawdown
 * Drawdown funds against retainer
 */
retainerRouter.post("/:id/drawdown", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { amount, description, milestoneId, invoiceId } = req.body;

    if (!amount || Number(amount) <= 0 || !description) {
      return res.status(400).json({ error: "Valid amount and description are required for drawdown." });
    }

    const retainer = await RetainerService.drawdown(tenantId, req.params.id, {
      amount: Number(amount),
      description,
      milestoneId,
      invoiceId,
    });

    return res.json({ retainer });
  } catch (err: any) {
    console.error("[retainers:drawdown] error:", err);
    const status = err.message.includes("not found") ? 404 : 400;
    return res.status(status).json({ error: err.message || "Failed to process drawdown." });
  }
});

/**
 * POST /api/retainers/:id/deposit
 * Top-up funds into retainer
 */
retainerRouter.post("/:id/deposit", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { amount, description } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "Valid positive amount is required." });
    }

    const retainer = await RetainerService.deposit(tenantId, req.params.id, {
      amount: Number(amount),
      description: description || "Retainer Top-Up Deposit",
    });

    return res.json({ retainer });
  } catch (err: any) {
    console.error("[retainers:deposit] error:", err);
    const status = err.message.includes("not found") ? 404 : 400;
    return res.status(status).json({ error: err.message || "Failed to process deposit." });
  }
});

/**
 * POST /api/retainers/:id/close
 * Close retainer agreement
 */
retainerRouter.post("/:id/close", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const retainer = await RetainerService.close(tenantId, req.params.id);
    return res.json({ retainer });
  } catch (err: any) {
    console.error("[retainers:close] error:", err);
    const status = err.message.includes("not found") ? 404 : 500;
    return res.status(status).json({ error: err.message || "Failed to close retainer agreement." });
  }
});

/**
 * DELETE /api/retainers/:id
 * Delete retainer agreement
 */
retainerRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    await RetainerService.delete(tenantId, req.params.id);
    return res.json({ success: true, message: "Retainer agreement deleted." });
  } catch (err: any) {
    console.error("[retainers:delete] error:", err);
    const status = err.message.includes("not found") ? 404 : 500;
    return res.status(status).json({ error: err.message || "Failed to delete retainer agreement." });
  }
});
