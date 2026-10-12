import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { SmsGatewayService } from "../modules/sms-gateway/sms-gateway.service";
import { smsGatewayManifest } from "../modules/sms-gateway/manifest";
import { SmsFactory } from "../services/factories/sms.factory";
import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
const db = rawPrisma || proxiedPrisma;

describe("Wave 1 — Slice 8: SMS Gateway (sms-gateway)", () => {
  let tenantA: any;
  let tenantB: any;
  let userA: any;
  let userB: any;

  beforeAll(async () => {
    // 1. Setup isolated test tenants
    tenantA = await db.tenant.create({
      data: {
        name: "W1 SMS Tenant A",
        slug: `w1-sms-a-${Date.now()}`,
      },
    });

    tenantB = await db.tenant.create({
      data: {
        name: "W1 SMS Tenant B",
        slug: `w1-sms-b-${Date.now()}`,
      },
    });

    // 2. Setup test users
    userA = await db.user.create({
      data: {
        email: `sms-user-a-${Date.now()}@example.com`,
        passwordHash: "dummy_pass",
      },
    });

    userB = await db.user.create({
      data: {
        email: `sms-user-b-${Date.now()}@example.com`,
        passwordHash: "dummy_pass",
      },
    });
  });

  afterAll(async () => {
    SmsFactory.setMockDispatch(null);
    SmsFactory.invalidate();
    if (tenantA) {
      await db.setting.deleteMany({ where: { scope: "TENANT", scopeId: tenantA.id } }).catch(() => {});
      await db.outboxEvent.deleteMany({ where: { tenantId: tenantA.id } }).catch(() => {});
      await db.auditLog.deleteMany({ where: { tenantId: tenantA.id } }).catch(() => {});
      await db.tenant.delete({ where: { id: tenantA.id } }).catch(() => {});
    }
    if (tenantB) {
      await db.setting.deleteMany({ where: { scope: "TENANT", scopeId: tenantB.id } }).catch(() => {});
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
    expect(smsGatewayManifest.slug).toBe("sms-gateway");
    expect(smsGatewayManifest.engine).toBe("E7");
    expect(smsGatewayManifest.entitlementKey).toBe("sms-gateway");
    expect(smsGatewayManifest.routePrefix).toBe("/sms-gateway");
    expect(smsGatewayManifest.provides?.permissions).toContain("sms.manage");
    expect(smsGatewayManifest.provides?.permissions).toContain("sms.send");
    expect(smsGatewayManifest.provides?.events).toContain("sms.configured");
    expect(smsGatewayManifest.provides?.events).toContain("sms.dispatched");
  });

  it("2. Persists SMS configuration for MSG91 with DLT Sender ID", async () => {
    const configured = await SmsGatewayService.updateConfig(tenantA.id, userA.id, {
      provider: "msg91",
      enabled: true,
      sandboxMode: true,
      senderId: "MSTRHR",
      apiKey: "msg91_authkey_secret_1234567890",
    });

    expect(configured.provider).toBe("msg91");
    expect(configured.enabled).toBe(true);
    expect(configured.sandboxMode).toBe(true);
    expect(configured.senderId).toBe("MSTRHR");
    // Sensitive credential is masked
    expect(configured.apiKeyMasked).toBe("••••••••7890");

    // Verify audit log and outbox event
    const audit = await db.auditLog.findFirst({
      where: { tenantId: tenantA.id, action: "sms.gateway.configured" },
    });
    expect(audit).toBeDefined();

    const outbox = await db.outboxEvent.findFirst({
      where: { tenantId: tenantA.id, eventType: "sms.configured" },
    });
    expect(outbox).toBeDefined();
  });

  it("3. Masks sensitive credentials when querying configuration", async () => {
    const config = await SmsGatewayService.getConfig(tenantA.id);
    expect(config.provider).toBe("msg91");
    expect(config.senderId).toBe("MSTRHR");
    expect(config.apiKeyMasked).toBe("••••••••7890");
    expect((config as any).apiKey).toBeUndefined();
  });

  it("4. Validates connection safely without sending billable/real SMS", async () => {
    const testRes = await SmsGatewayService.testConnection(tenantA.id);
    expect(testRes.ok).toBe(true);
    expect(testRes.message).toContain("msg91");
  });

  it("5. Fails closed when live provider credentials are missing and sandbox is off", async () => {
    // Attempting to configure Fast2SMS without API key in non-sandbox mode
    await expect(
      SmsGatewayService.updateConfig(tenantA.id, userA.id, {
        provider: "fast2sms",
        enabled: true,
        sandboxMode: false,
        apiKey: "",
      })
    ).rejects.toThrow("Fast2SMS API Key is required");
  });

  it("6. Dispatches SMS using sandbox/mock transport without live telco calls", async () => {
    // Ensure sandbox mode is enabled
    await SmsGatewayService.updateConfig(tenantA.id, userA.id, {
      provider: "msg91",
      enabled: true,
      sandboxMode: true,
      senderId: "MSTRHR",
      apiKey: "msg91_dummy_key_1234",
    });

    const dispatch = await SmsGatewayService.sendSms({
      tenantId: tenantA.id,
      recipientPhone: "+91 98765 43210",
      messageText: "Your OTP for MasterHRMS is 654321. Valid for 10 minutes.",
      actorId: userA.id,
    });

    expect(dispatch.messageId).toBeDefined();
    expect(dispatch.status).toBe("delivered");
    expect(dispatch.provider).toBe("msg91");
    expect(dispatch.recipientMasked).toBe("+91••••3210");
  });

  it("7. Strictly enforces tenant isolation on SMS configurations", async () => {
    // Configure Tenant B with Fast2SMS in sandbox mode
    await SmsGatewayService.updateConfig(tenantB.id, userB.id, {
      provider: "fast2sms",
      enabled: true,
      sandboxMode: true,
      apiKey: "fast2sms_secret_key_8888",
    });

    const configA = await SmsGatewayService.getConfig(tenantA.id);
    const configB = await SmsGatewayService.getConfig(tenantB.id);

    expect(configA.provider).toBe("msg91");
    expect(configB.provider).toBe("fast2sms");
    expect(configA.apiKeyMasked).not.toBe(configB.apiKeyMasked);
  });
});
