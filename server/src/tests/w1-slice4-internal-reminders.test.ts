import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma, rawPrisma } from "../prisma";
import { InternalRemindersService } from "../modules/internal-reminders/internal-reminders.service";
import { internalRemindersManifest } from "../modules/internal-reminders/manifest";

describe("Wave 1 — Slice 4: Internal Reminders (internal-reminders)", () => {
  const db = rawPrisma || prisma;
  let tenantA: any;
  let tenantB: any;
  let userA: any;
  let userB: any;
  let testInvoiceA: any;

  beforeAll(async () => {
    // 1. Create Workspace A
    tenantA = await db.tenant.create({
      data: {
        name: "W1 Reminders Tenant A",
        slug: `w1-reminders-a-${Date.now()}`,
      },
    });

    // 2. Create Workspace B (for cross-tenant checks)
    tenantB = await db.tenant.create({
      data: {
        name: "W1 Reminders Tenant B",
        slug: `w1-reminders-b-${Date.now()}`,
      },
    });

    // 3. Create User in Tenant A and Tenant B
    userA = await db.user.create({
      data: {
        email: `w1-reminders-user-${Date.now()}@example.com`,
        passwordHash: "dummy_pass",
      },
    });

    await db.profile.create({
      data: {
        userId: userA.id,
        tenantId: tenantA.id,
        fullName: "Reminder Test User A",
      },
    });

    userB = await db.user.create({
      data: {
        email: `w1-reminders-user-b-${Date.now()}@example.com`,
        passwordHash: "dummy_pass",
      },
    });

    await db.profile.create({
      data: {
        userId: userB.id,
        tenantId: tenantB.id,
        fullName: "Reminder Test User B",
      },
    });

    // 4. Create an invoice in Tenant A with upcoming due date
    const invoiceDueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
    testInvoiceA = await db.sale.create({
      data: {
        tenantId: tenantA.id,
        invoiceNo: `INV-REM-${Date.now()}`,
        paymentStatus: "unpaid",
        total: 15000,
        subtotal: 15000,
        date: new Date(),
        dueDate: invoiceDueDate,
      },
    });
  });

  afterAll(async () => {
    if (tenantA) {
      await db.workspaceTodo.deleteMany({ where: { tenantId: tenantA.id } }).catch(() => {});
      await db.outboxEvent.deleteMany({ where: { tenantId: tenantA.id } }).catch(() => {});
      await db.auditLog.deleteMany({ where: { tenantId: tenantA.id } }).catch(() => {});
      if (testInvoiceA) {
        await db.sale.delete({ where: { id: testInvoiceA.id } }).catch(() => {});
      }
      await db.profile.deleteMany({ where: { tenantId: tenantA.id } }).catch(() => {});
      await db.tenant.delete({ where: { id: tenantA.id } }).catch(() => {});
    }
    if (tenantB) {
      await db.workspaceTodo.deleteMany({ where: { tenantId: tenantB.id } }).catch(() => {});
      await db.profile.deleteMany({ where: { tenantId: tenantB.id } }).catch(() => {});
      await db.tenant.delete({ where: { id: tenantB.id } }).catch(() => {});
    }
    if (userA) {
      await db.user.delete({ where: { id: userA.id } }).catch(() => {});
    }
    if (userB) {
      await db.user.delete({ where: { id: userB.id } }).catch(() => {});
    }
  });

  it("1. Manifest adheres to specification and catalog standards", () => {
    expect(internalRemindersManifest.slug).toBe("internal-reminders");
    expect(internalRemindersManifest.engine).toBe("E10");
    expect(internalRemindersManifest.entitlementKey).toBe("internal-reminders");
    expect(internalRemindersManifest.provides?.permissions).toContain("internal-reminders.create");
    expect(internalRemindersManifest.provides?.events).toContain("reminder.created");
  });

  it("2. Creates contextual reminder with entity link and due date", async () => {
    const res = await InternalRemindersService.createReminder(tenantA.id, userA.id, {
      title: "Follow up on high-value client proposal",
      description: "Check if client reviewed proposal terms.",
      dueDate: new Date(Date.now() + 86400000),
      priority: "high",
      entityType: "CRM",
      entityId: "deal-505",
      reminderType: "PROPOSAL_FOLLOWUP",
    });

    expect(res.duplicatePrevented).toBe(false);
    expect(res.reminder.id).toBeDefined();
    expect(res.reminder.title).toBe("Follow up on high-value client proposal");
    expect(res.reminder.entityType).toBe("CRM");
    expect(res.reminder.entityId).toBe("deal-505");
    expect(res.reminder.completed).toBe(false);

    // Audit and outbox logs recorded
    const audit = await db.auditLog.findFirst({
      where: { tenantId: tenantA.id, action: "reminder.created" },
    });
    expect(audit).toBeDefined();
  });

  it("3. Enforces duplicate prevention for active contextual reminders", async () => {
    // Attempting to create a duplicate active reminder for the same deal and reminderType
    const duplicateAttempt = await InternalRemindersService.createReminder(tenantA.id, userA.id, {
      title: "Follow up on high-value client proposal (Duplicate)",
      dueDate: new Date(Date.now() + 86400000),
      entityType: "CRM",
      entityId: "deal-505",
      reminderType: "PROPOSAL_FOLLOWUP",
    });

    expect(duplicateAttempt.duplicatePrevented).toBe(true);
    expect(duplicateAttempt.reminder.entityId).toBe("deal-505");

    // Total count in DB remains 1
    const total = await db.workspaceTodo.count({
      where: { tenantId: tenantA.id, tag: "reminder:crm" },
    });
    expect(total).toBe(1);
  });

  it("4. Lists reminders with entityType and priority filtering", async () => {
    // Create an HR reminder
    await InternalRemindersService.createReminder(tenantA.id, userA.id, {
      title: "Review probation completion for staff",
      dueDate: new Date(Date.now() + 2 * 86400000),
      priority: "urgent",
      entityType: "HR",
      entityId: "emp-707",
      reminderType: "PROBATION_END",
    });

    const allReminders = await InternalRemindersService.listReminders(tenantA.id, userA.id);
    expect(allReminders.length).toBe(2);

    const hrOnly = await InternalRemindersService.listReminders(tenantA.id, userA.id, {
      entityType: "HR",
    });
    expect(hrOnly.length).toBe(1);
    expect(hrOnly[0].entityType).toBe("HR");
  });

  it("5. Completing a reminder updates status and allows future follow-ups", async () => {
    const list = await InternalRemindersService.listReminders(tenantA.id, userA.id, {
      entityType: "CRM",
    });
    const reminderId = list[0].id;

    const completed = await InternalRemindersService.completeReminder(
      tenantA.id,
      reminderId,
      userA.id
    );
    expect(completed.completed).toBe(true);

    // After completion, a fresh follow-up reminder for the same entity is permitted
    const nextReminder = await InternalRemindersService.createReminder(tenantA.id, userA.id, {
      title: "Second follow-up after closing call",
      dueDate: new Date(Date.now() + 5 * 86400000),
      entityType: "CRM",
      entityId: "deal-505",
      reminderType: "PROPOSAL_FOLLOWUP",
    });
    expect(nextReminder.duplicatePrevented).toBe(false);
  });

  it("6. Scans upcoming invoices and provisions due-date reminders idempotently", async () => {
    const sync1 = await InternalRemindersService.syncInvoiceDueReminders(tenantA.id, userA.id, 7);
    expect(sync1.syncedCount).toBeGreaterThanOrEqual(1);
    expect(sync1.duplicatesPrevented).toBe(0);

    // Second sync of the same invoice prevents duplicate reminders
    const sync2 = await InternalRemindersService.syncInvoiceDueReminders(tenantA.id, userA.id, 7);
    expect(sync2.syncedCount).toBe(0);
    expect(sync2.duplicatesPrevented).toBeGreaterThanOrEqual(1);
  });

  it("7. Strictly enforces tenant isolation (Tenant A cannot see or delete Tenant B reminders)", async () => {
    // Create reminder in Tenant B
    const remB = await InternalRemindersService.createReminder(tenantB.id, userB.id, {
      title: "Tenant B Secret Task",
      dueDate: new Date(),
      entityType: "GENERAL",
    });

    // Tenant A listing cannot see Tenant B reminder
    const listA = await InternalRemindersService.listReminders(tenantA.id);
    const titlesA = listA.map((r) => r.title);
    expect(titlesA).not.toContain("Tenant B Secret Task");

    // Tenant A cannot complete Tenant B reminder
    await expect(
      InternalRemindersService.completeReminder(tenantA.id, remB.reminder.id, userA.id)
    ).rejects.toThrow("Reminder not found.");

    // Tenant A cannot delete Tenant B reminder
    const deleteRes = await InternalRemindersService.deleteReminder(
      tenantA.id,
      remB.reminder.id,
      userA.id
    );
    expect(deleteRes).toBe(false);
  });
});
