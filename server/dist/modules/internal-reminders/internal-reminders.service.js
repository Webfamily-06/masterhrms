"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalRemindersService = void 0;
const prisma_1 = require("../../prisma");
const audit_service_1 = require("../../services/audit.service");
const outbox_service_1 = require("../../services/outbox.service");
class InternalRemindersService {
    static getDb() {
        return prisma_1.rawPrisma || prisma_1.prisma;
    }
    /**
     * Helper to format entity metadata tag
     */
    static formatTag(entityType = "GENERAL") {
        return `reminder:${entityType.trim().toLowerCase()}`;
    }
    /**
     * Embeds entity link and reminderType metadata inside structured description
     */
    static encodeDescription(description, entityType = "GENERAL", entityId, reminderType = "MANUAL") {
        const header = `[ENTITY_LINK:type=${entityType};id=${entityId || ""};reminderType=${reminderType}]`;
        const userNotes = description ? description.trim() : "";
        return `${header}\n${userNotes}`.trim();
    }
    /**
     * Decodes entity link and reminderType metadata from structured description
     */
    static decodeDescription(rawDescription) {
        if (!rawDescription) {
            return { notes: "", entityType: "GENERAL" };
        }
        const match = rawDescription.match(/^\[ENTITY_LINK:type=([^;]+);id=([^;]*);reminderType=([^\]]+)\]\n?([\s\S]*)$/);
        if (match) {
            return {
                entityType: match[1],
                entityId: match[2] || undefined,
                reminderType: match[3],
                notes: match[4] || "",
            };
        }
        return {
            notes: rawDescription,
            entityType: "GENERAL",
        };
    }
    /**
     * Formats a WorkspaceTodo into a public InternalReminderRecord
     */
    static toReminderRecord(todo) {
        const meta = this.decodeDescription(todo.description);
        return {
            id: todo.id,
            tenantId: todo.tenantId,
            userId: todo.userId,
            title: todo.title,
            notes: meta.notes,
            entityType: meta.entityType,
            entityId: meta.entityId,
            reminderType: meta.reminderType,
            priority: todo.priority || "medium",
            dueDate: todo.dueDate,
            completed: todo.completed,
            createdAt: todo.createdAt,
            updatedAt: todo.updatedAt,
        };
    }
    /**
     * Creates a persistent contextual reminder with strict duplicate prevention.
     */
    static async createReminder(tenantId, userId, params, actorContext) {
        const db = this.getDb();
        const title = (params.title || "").trim();
        if (!title) {
            throw new Error("Reminder title is required.");
        }
        const entityType = (params.entityType || "GENERAL").toUpperCase();
        const tag = this.formatTag(entityType);
        const reminderType = params.reminderType || "MANUAL";
        const dueDate = new Date(params.dueDate);
        if (isNaN(dueDate.getTime())) {
            throw new Error("Invalid reminder due date.");
        }
        // ── DUPLICATE PREVENTION CHECK ──
        // If an incomplete reminder already exists for the same tenant, entityType, entityId, and reminderType,
        // do not create a duplicate; return the existing reminder instead.
        if (params.entityId) {
            const searchMarker = `[ENTITY_LINK:type=${entityType};id=${params.entityId};reminderType=${reminderType}]`;
            const existing = await db.workspaceTodo.findFirst({
                where: {
                    tenantId,
                    completed: false,
                    tag,
                    description: { contains: searchMarker },
                },
            });
            if (existing) {
                return {
                    reminder: this.toReminderRecord(existing),
                    duplicatePrevented: true,
                };
            }
        }
        const encodedDescription = this.encodeDescription(params.description, entityType, params.entityId, reminderType);
        const created = await db.workspaceTodo.create({
            data: {
                tenantId,
                userId,
                title,
                description: encodedDescription,
                priority: params.priority || "medium",
                tag,
                dueDate,
                completed: false,
            },
        });
        const record = this.toReminderRecord(created);
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: userId,
            action: "reminder.created",
            entityType: "Reminder",
            entityId: created.id,
            ipAddress: actorContext?.ipAddress,
            userAgent: actorContext?.userAgent,
            metadata: {
                title,
                entityType,
                entityId: params.entityId,
                reminderType,
                dueDate: dueDate.toISOString(),
            },
        });
        await outbox_service_1.OutboxService.createOutboxEvent({
            tenantId,
            eventType: "reminder.created",
            entityType: "Reminder",
            entityId: created.id,
            actorId: userId,
            payload: {
                reminderId: created.id,
                title,
                entityType,
                dueDate: dueDate.toISOString(),
            },
        });
        return { reminder: record, duplicatePrevented: false };
    }
    /**
     * Lists reminders for current tenant workspace with filtering.
     */
    static async listReminders(tenantId, userId, filters = {}) {
        const db = this.getDb();
        const where = {
            tenantId,
            tag: { startsWith: "reminder:" },
        };
        if (filters.entityType && filters.entityType !== "ALL") {
            where.tag = this.formatTag(filters.entityType);
        }
        if (filters.completed !== undefined) {
            where.completed = Boolean(filters.completed);
        }
        if (filters.priority) {
            where.priority = filters.priority;
        }
        if (filters.overdue) {
            where.completed = false;
            where.dueDate = { lt: new Date() };
        }
        if (filters.search) {
            where.OR = [
                { title: { contains: filters.search, mode: "insensitive" } },
                { description: { contains: filters.search, mode: "insensitive" } },
            ];
        }
        const todos = await db.workspaceTodo.findMany({
            where,
            orderBy: [{ completed: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
        });
        return todos.map((t) => this.toReminderRecord(t));
    }
    /**
     * Marks a reminder completed.
     */
    static async completeReminder(tenantId, reminderId, userId, actorContext) {
        const db = this.getDb();
        const existing = await db.workspaceTodo.findFirst({
            where: { id: reminderId, tenantId },
        });
        if (!existing) {
            throw new Error("Reminder not found.");
        }
        const updated = await db.workspaceTodo.update({
            where: { id: reminderId },
            data: { completed: true },
        });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: userId,
            action: "reminder.completed",
            entityType: "Reminder",
            entityId: reminderId,
            ipAddress: actorContext?.ipAddress,
            userAgent: actorContext?.userAgent,
        });
        await outbox_service_1.OutboxService.createOutboxEvent({
            tenantId,
            eventType: "reminder.completed",
            entityType: "Reminder",
            entityId: reminderId,
            actorId: userId,
            payload: { reminderId, completedAt: new Date().toISOString() },
        });
        return this.toReminderRecord(updated);
    }
    /**
     * Deletes a reminder with tenant boundary check.
     */
    static async deleteReminder(tenantId, reminderId, userId, actorContext) {
        const db = this.getDb();
        const existing = await db.workspaceTodo.findFirst({
            where: { id: reminderId, tenantId },
        });
        if (!existing) {
            return false;
        }
        await db.workspaceTodo.delete({
            where: { id: reminderId },
        });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: userId,
            action: "reminder.deleted",
            entityType: "Reminder",
            entityId: reminderId,
            ipAddress: actorContext?.ipAddress,
            userAgent: actorContext?.userAgent,
        });
        return true;
    }
    /**
     * Contextual Sync: Scans invoices with upcoming due dates and idempotently provisions reminders.
     */
    static async syncInvoiceDueReminders(tenantId, userId, leadDays = 7) {
        const db = this.getDb();
        const now = new Date();
        const thresholdDate = new Date(now.getTime() + leadDays * 24 * 60 * 60 * 1000);
        const upcomingSales = await db.sale.findMany({
            where: {
                tenantId,
                paymentStatus: { in: ["unpaid", "partial", "pending"] },
                dueDate: {
                    lte: thresholdDate,
                },
            },
        });
        let syncedCount = 0;
        let duplicatesPrevented = 0;
        for (const inv of upcomingSales) {
            if (!inv.dueDate)
                continue;
            const result = await this.createReminder(tenantId, userId, {
                title: `Invoice #${inv.invoiceNo} payment due`,
                description: `Payment of ₹${inv.total} due on ${inv.dueDate.toISOString().slice(0, 10)}.`,
                dueDate: inv.dueDate,
                priority: inv.dueDate < now ? "urgent" : "high",
                entityType: "INVOICE",
                entityId: inv.id,
                reminderType: "PAYMENT_DUE",
            });
            if (result.duplicatePrevented) {
                duplicatesPrevented++;
            }
            else {
                syncedCount++;
            }
        }
        return { syncedCount, duplicatesPrevented };
    }
}
exports.InternalRemindersService = InternalRemindersService;
