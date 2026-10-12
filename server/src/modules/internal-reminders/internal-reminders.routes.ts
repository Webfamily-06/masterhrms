import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../../middleware/auth";
import { resolveTenantContext } from "../../middleware/tenant-context.middleware";
import { requireEntitlement } from "../../middleware/entitlements";
import { InternalRemindersService, ReminderQueryFilters } from "./internal-reminders.service";

export const internalRemindersRouter = Router();

// Middleware: auth -> tenant resolution -> entitlement check
internalRemindersRouter.use(
  requireAuth,
  resolveTenantContext,
  requireEntitlement("internal-reminders")
);

/**
 * GET /api/reminders
 * Lists contextual reminders for the current workspace.
 */
internalRemindersRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const userId = req.user?.userId;

    const filters: ReminderQueryFilters = {
      entityType: req.query.entityType ? String(req.query.entityType) : undefined,
      completed: req.query.completed !== undefined ? req.query.completed === "true" : undefined,
      priority: req.query.priority ? String(req.query.priority) : undefined,
      overdue: req.query.overdue !== undefined ? req.query.overdue === "true" : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
    };

    const reminders = await InternalRemindersService.listReminders(tenantId, userId, filters);
    return res.json({ success: true, reminders });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list reminders." });
  }
});

/**
 * POST /api/reminders
 * Creates a reminder with automatic duplicate prevention.
 */
internalRemindersRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const userId = req.user!.userId;
    const title = req.body?.title || req.body?.message || "Reminder";
    const description = req.body?.description || req.body?.message || "";
    const rawDueDate = req.body?.dueDate || req.body?.dueAt;
    const priority = req.body?.priority || "MEDIUM";
    const entityType = req.body?.entityType || "INVOICE";
    const entityId = req.body?.entityId || `GEN-${Date.now()}`;
    const reminderType = req.body?.reminderType || "CUSTOM";

    if (!title || !rawDueDate) {
      return res.status(400).json({ error: "Title/message and due date are required." });
    }

    const dueDate = new Date(rawDueDate);

    const result = await InternalRemindersService.createReminder(
      tenantId,
      userId,
      {
        title,
        description,
        dueDate,
        priority,
        entityType,
        entityId,
        reminderType,
      },
      {
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      }
    );

    const status = result.duplicatePrevented ? 200 : 201;
    return res.status(status).json({
      success: true,
      duplicatePrevented: result.duplicatePrevented,
      reminder: result.reminder,
      message: result.duplicatePrevented
        ? "Existing active reminder detected; duplicate creation was prevented."
        : "Reminder created successfully.",
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to create reminder." });
  }
});

/**
 * POST /api/reminders/sync/invoices & POST /api/reminders/scan-due-dates
 * Triggers idempotent scan of pending invoices and provisions due-date reminders.
 */
const handleSyncInvoices = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const userId = req.user!.userId;
    const leadDays = req.body.leadDays ? Number(req.body.leadDays) : 7;

    const result = await InternalRemindersService.syncInvoiceDueReminders(
      tenantId,
      userId,
      leadDays
    );

    return res.json({
      success: true,
      ...result,
      created: result.syncedCount,
      scanned: result.syncedCount + result.duplicatesPrevented,
      message: `Invoice sync complete: ${result.syncedCount} new reminders created, ${result.duplicatesPrevented} duplicates prevented.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to sync invoice reminders." });
  }
};

internalRemindersRouter.post("/sync/invoices", handleSyncInvoices);
internalRemindersRouter.post("/scan-due-dates", handleSyncInvoices);

/**
 * PATCH / PUT /api/reminders/:id/complete
 * Marks a reminder completed.
 */
const handleCompleteReminder = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const userId = req.user?.userId;
    const { id } = req.params;

    const reminder = await InternalRemindersService.completeReminder(tenantId, id, userId, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.json({
      success: true,
      reminder,
      message: "Reminder marked completed.",
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to complete reminder." });
  }
};

internalRemindersRouter.patch("/:id/complete", handleCompleteReminder);
internalRemindersRouter.put("/:id/complete", handleCompleteReminder);

/**
 * PATCH / PUT /api/reminders/:id/dismiss
 * Dismisses a reminder.
 */
const handleDismissReminder = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const userId = req.user?.userId;
    const { id } = req.params;

    await InternalRemindersService.deleteReminder(tenantId, id, userId, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.json({
      success: true,
      message: "Reminder dismissed.",
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to dismiss reminder." });
  }
};

internalRemindersRouter.patch("/:id/dismiss", handleDismissReminder);
internalRemindersRouter.put("/:id/dismiss", handleDismissReminder);

/**
 * DELETE /api/reminders/:id
 * Deletes a reminder.
 */
internalRemindersRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const userId = req.user?.userId;
    const { id } = req.params;

    const success = await InternalRemindersService.deleteReminder(tenantId, id, userId, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    if (!success) {
      return res.status(404).json({ error: "Reminder not found or already deleted." });
    }

    return res.json({ success: true, message: "Reminder deleted successfully." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete reminder." });
  }
});
