import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma, rawPrisma } from "../prisma";
import { ActivityLogsService, redactSensitiveData } from "../modules/activity-logs/activity-logs.service";
import { activityLogsManifest } from "../modules/activity-logs/manifest";

describe("Wave 1 — Slice 3: Activity Logs (activity-logs)", () => {
  const db = rawPrisma || prisma;
  let tenantA: any;
  let tenantB: any;
  let logIdA1: string;

  beforeAll(async () => {
    tenantA = await db.tenant.create({
      data: {
        name: "W1 Logs Tenant A",
        slug: `w1-logs-a-${Date.now()}`,
      },
    });

    tenantB = await db.tenant.create({
      data: {
        name: "W1 Logs Tenant B",
        slug: `w1-logs-b-${Date.now()}`,
      },
    });

    // Seed audit logs for Tenant A
    const log1 = await db.auditLog.create({
      data: {
        tenantId: tenantA.id,
        actorId: "actor-101",
        actorEmail: "alice@tenanta.com",
        action: "employee.created",
        entityType: "Employee",
        entityId: "emp-101",
        afterJson: {
          name: "Alice Employee",
          department: "Engineering",
          passwordHash: "secret_hash_value_123",
          apiKey: "api_live_998877665544",
        },
        ipAddress: "192.168.1.50",
      },
    });
    logIdA1 = log1.id;

    await db.auditLog.create({
      data: {
        tenantId: tenantA.id,
        actorId: "actor-102",
        actorEmail: "bob@tenanta.com",
        action: "invoice.approved",
        entityType: "Invoice",
        entityId: "inv-202",
        afterJson: {
          totalAmount: 5000,
          status: "APPROVED",
          notes: "Approved by finance manager",
        },
        ipAddress: "192.168.1.51",
      },
    });

    // Seed audit log for Tenant B (to verify cross-tenant isolation)
    await db.auditLog.create({
      data: {
        tenantId: tenantB.id,
        actorId: "actor-999",
        actorEmail: "intruder@tenantb.com",
        action: "payroll.executed",
        entityType: "Payroll",
        entityId: "pay-999",
        afterJson: { amount: 1000000 },
      },
    });
  });

  afterAll(async () => {
    if (tenantA) {
      await db.auditLog.deleteMany({ where: { tenantId: tenantA.id } }).catch(() => {});
      await db.tenant.delete({ where: { id: tenantA.id } }).catch(() => {});
    }
    if (tenantB) {
      await db.auditLog.deleteMany({ where: { tenantId: tenantB.id } }).catch(() => {});
      await db.tenant.delete({ where: { id: tenantB.id } }).catch(() => {});
    }
  });

  it("1. Manifest adheres to specification and catalog standards", () => {
    expect(activityLogsManifest.slug).toBe("activity-logs");
    expect(activityLogsManifest.engine).toBe("E10");
    expect(activityLogsManifest.entitlementKey).toBe("activity-logs");
    expect(activityLogsManifest.provides?.permissions).toContain("activity-logs.view");
    expect(activityLogsManifest.provides?.permissions).toContain("activity-logs.export");
  });

  it("2. Redaction utility strips passwords, tokens, API keys, and sensitive secrets", () => {
    const raw = {
      username: "john_doe",
      password: "PlainTextPassword123!",
      passwordHash: "$2a$12$e8i...",
      apiKey: "live_key_abcdef",
      nested: {
        accessToken: "jwt.token.here",
        publicSetting: "light_theme",
        card_number: "4111222233334444",
      },
    };

    const redacted = redactSensitiveData(raw);

    expect(redacted.username).toBe("john_doe");
    expect(redacted.password).toBe("[REDACTED]");
    expect(redacted.passwordHash).toBe("[REDACTED]");
    expect(redacted.apiKey).toBe("[REDACTED]");
    expect(redacted.nested.accessToken).toBe("[REDACTED]");
    expect(redacted.nested.card_number).toBe("[REDACTED]");
    expect(redacted.nested.publicSetting).toBe("light_theme");
  });

  it("3. Lists tenant activity logs with pagination and redacted metadata", async () => {
    const res = await ActivityLogsService.listActivityLogs(tenantA.id, { page: 1, limit: 10 });

    expect(res.pagination.total).toBe(2);
    expect(res.pagination.page).toBe(1);
    expect(res.items).toHaveLength(2);

    // Verify secret was redacted in returned JSON
    const empLog = res.items.find((item: any) => item.action === "employee.created");
    expect(empLog).toBeDefined();
    expect(empLog.afterJson.name).toBe("Alice Employee");
    expect(empLog.afterJson.passwordHash).toBe("[REDACTED]");
    expect(empLog.afterJson.apiKey).toBe("[REDACTED]");
  });

  it("4. Filters activity logs by action, actorEmail, and entityType", async () => {
    const actionFilter = await ActivityLogsService.listActivityLogs(tenantA.id, {
      action: "invoice.approved",
    });
    expect(actionFilter.items).toHaveLength(1);
    expect(actionFilter.items[0].entityType).toBe("Invoice");

    const actorFilter = await ActivityLogsService.listActivityLogs(tenantA.id, {
      actorEmail: "alice@tenanta.com",
    });
    expect(actorFilter.items).toHaveLength(1);
    expect(actorFilter.items[0].actorEmail).toBe("alice@tenanta.com");
  });

  it("5. Strictly preserves tenant isolation (Tenant A cannot see Tenant B logs)", async () => {
    const logsA = await ActivityLogsService.listActivityLogs(tenantA.id);
    const emails = logsA.items.map((i: any) => i.actorEmail);
    expect(emails).not.toContain("intruder@tenantb.com");

    for (const item of logsA.items) {
      expect(item.tenantId).toBe(tenantA.id);
    }

    // Direct ID lookup on Tenant B's log from Tenant A scope returns null
    const logB = await db.auditLog.findFirst({ where: { tenantId: tenantB.id } });
    const crossTenantGet = await ActivityLogsService.getActivityLog(tenantA.id, logB!.id);
    expect(crossTenantGet).toBeNull();
  });

  it("6. Generates valid RFC 4180 CSV export with redacted details", async () => {
    const csv = await ActivityLogsService.exportActivityLogsCsv(tenantA.id);

    expect(csv).toContain("Timestamp,Action,Entity Type,Entity ID,Actor Email,Actor ID,IP Address,Details");
    expect(csv).toContain("employee.created");
    expect(csv).toContain("invoice.approved");
    expect(csv).toContain("[REDACTED]");
    expect(csv).not.toContain("secret_hash_value_123");
    expect(csv).not.toContain("intruder@tenantb.com");
  });
});
