"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.internalRemindersRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const tenant_context_middleware_1 = require("../../middleware/tenant-context.middleware");
const entitlements_1 = require("../../middleware/entitlements");
const internal_reminders_service_1 = require("./internal-reminders.service");
exports.internalRemindersRouter = (0, express_1.Router)();
// Middleware: auth -> tenant resolution -> entitlement check
exports.internalRemindersRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, (0, entitlements_1.requireEntitlement)("internal-reminders"));
/**
 * GET /api/reminders
 * Lists contextual reminders for the current workspace.
 */
exports.internalRemindersRouter.get("/", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;
        const userId = req.user?.userId;
        const filters = {
            entityType: req.query.entityType ? String(req.query.entityType) : undefined,
            completed: req.query.completed !== undefined ? req.query.completed === "true" : undefined,
            priority: req.query.priority ? String(req.query.priority) : undefined,
            overdue: req.query.overdue !== undefined ? req.query.overdue === "true" : undefined,
            search: req.query.search ? String(req.query.search) : undefined,
        };
        const reminders = await internal_reminders_service_1.InternalRemindersService.listReminders(tenantId, userId, filters);
        return res.json({ success: true, reminders });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to list reminders." });
    }
});
/**
 * POST /api/reminders
 * Creates a reminder with automatic duplicate prevention.
 */
exports.internalRemindersRouter.post("/", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;
        const userId = req.user.userId;
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
        const result = await internal_reminders_service_1.InternalRemindersService.createReminder(tenantId, userId, {
            title,
            description,
            dueDate,
            priority,
            entityType,
            entityId,
            reminderType,
        }, {
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
        });
        const status = result.duplicatePrevented ? 200 : 201;
        return res.status(status).json({
            success: true,
            duplicatePrevented: result.duplicatePrevented,
            reminder: result.reminder,
            message: result.duplicatePrevented
                ? "Existing active reminder detected; duplicate creation was prevented."
                : "Reminder created successfully.",
        });
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to create reminder." });
    }
});
/**
 * POST /api/reminders/sync/invoices & POST /api/reminders/scan-due-dates
 * Triggers idempotent scan of pending invoices and provisions due-date reminders.
 */
const handleSyncInvoices = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;
        const userId = req.user.userId;
        const leadDays = req.body.leadDays ? Number(req.body.leadDays) : 7;
        const result = await internal_reminders_service_1.InternalRemindersService.syncInvoiceDueReminders(tenantId, userId, leadDays);
        return res.json({
            success: true,
            ...result,
            created: result.syncedCount,
            scanned: result.syncedCount + result.duplicatesPrevented,
            message: `Invoice sync complete: ${result.syncedCount} new reminders created, ${result.duplicatesPrevented} duplicates prevented.`,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to sync invoice reminders." });
    }
};
exports.internalRemindersRouter.post("/sync/invoices", handleSyncInvoices);
exports.internalRemindersRouter.post("/scan-due-dates", handleSyncInvoices);
/**
 * PATCH / PUT /api/reminders/:id/complete
 * Marks a reminder completed.
 */
const handleCompleteReminder = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;
        const userId = req.user?.userId;
        const { id } = req.params;
        const reminder = await internal_reminders_service_1.InternalRemindersService.completeReminder(tenantId, id, userId, {
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
        });
        return res.json({
            success: true,
            reminder,
            message: "Reminder marked completed.",
        });
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to complete reminder." });
    }
};
exports.internalRemindersRouter.patch("/:id/complete", handleCompleteReminder);
exports.internalRemindersRouter.put("/:id/complete", handleCompleteReminder);
/**
 * PATCH / PUT /api/reminders/:id/dismiss
 * Dismisses a reminder.
 */
const handleDismissReminder = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;
        const userId = req.user?.userId;
        const { id } = req.params;
        await internal_reminders_service_1.InternalRemindersService.deleteReminder(tenantId, id, userId, {
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
        });
        return res.json({
            success: true,
            message: "Reminder dismissed.",
        });
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to dismiss reminder." });
    }
};
exports.internalRemindersRouter.patch("/:id/dismiss", handleDismissReminder);
exports.internalRemindersRouter.put("/:id/dismiss", handleDismissReminder);
/**
 * DELETE /api/reminders/:id
 * Deletes a reminder.
 */
exports.internalRemindersRouter.delete("/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;
        const userId = req.user?.userId;
        const { id } = req.params;
        const success = await internal_reminders_service_1.InternalRemindersService.deleteReminder(tenantId, id, userId, {
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
        });
        if (!success) {
            return res.status(404).json({ error: "Reminder not found or already deleted." });
        }
        return res.json({ success: true, message: "Reminder deleted successfully." });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to delete reminder." });
    }
});
