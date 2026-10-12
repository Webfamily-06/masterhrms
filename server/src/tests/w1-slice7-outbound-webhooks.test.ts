import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { OutboundWebhooksService } from "../modules/outbound-webhooks/outbound-webhooks.service";
import { outboundWebhooksManifest } from "../modules/outbound-webhooks/manifest";
import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
const db = rawPrisma || proxiedPrisma;

describe("Wave 1 — Slice 7: Outbound Webhooks (outbound-webhooks)", () => {
  let tenantA: any;
  let tenantB: any;
  let userA: any;
  let userB: any;

  beforeAll(async () => {
    // 1. Setup isolated test tenants
    tenantA = await db.tenant.create({
      data: {
        name: "W1 Webhooks Tenant A",
        slug: `w1-webhooks-a-${Date.now()}`,
      },
    });

    tenantB = await db.tenant.create({
      data: {
        name: "W1 Webhooks Tenant B",
        slug: `w1-webhooks-b-${Date.now()}`,
      },
    });

    // 2. Setup test users
    userA = await db.user.create({
      data: {
        email: `webhook-user-a-${Date.now()}@example.com`,
        passwordHash: "dummy_pass",
      },
    });

    userB = await db.user.create({
      data: {
        email: `webhook-user-b-${Date.now()}@example.com`,
        passwordHash: "dummy_pass",
      },
    });
  });

  afterAll(async () => {
    OutboundWebhooksService.setMockTransport(null);
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
    expect(outboundWebhooksManifest.slug).toBe("outbound-webhooks");
    expect(outboundWebhooksManifest.engine).toBe("E6");
    expect(outboundWebhooksManifest.entitlementKey).toBe("outbound-webhooks");
    expect(outboundWebhooksManifest.routePrefix).toBe("/outbound-webhooks");
    expect(outboundWebhooksManifest.provides?.permissions).toContain("webhooks.manage");
    expect(outboundWebhooksManifest.provides?.permissions).toContain("webhooks.view");
    expect(outboundWebhooksManifest.provides?.events).toContain("webhook.endpoint.created");
    expect(outboundWebhooksManifest.provides?.events).toContain("webhook.delivered");
  });

  it("2. Blocks SSRF attempts against internal, loopback, and metadata services", () => {
    // 1. Loopback addresses
    expect(OutboundWebhooksService.validateUrlSafety("http://localhost:8080/hook").safe).toBe(false);
    expect(OutboundWebhooksService.validateUrlSafety("http://127.0.0.1:3000/webhook").safe).toBe(false);
    expect(OutboundWebhooksService.validateUrlSafety("http://[::1]:5000/endpoint").safe).toBe(false);

    // 2. Cloud metadata IP and internal domains
    expect(OutboundWebhooksService.validateUrlSafety("http://169.254.169.254/latest/meta-data").safe).toBe(false);
    expect(OutboundWebhooksService.validateUrlSafety("http://metadata.google.internal/computeMetadata/v1/").safe).toBe(false);

    // 3. Private RFC 1918 subnets
    expect(OutboundWebhooksService.validateUrlSafety("http://10.0.1.50/api").safe).toBe(false);
    expect(OutboundWebhooksService.validateUrlSafety("http://192.168.1.100/webhook").safe).toBe(false);
    expect(OutboundWebhooksService.validateUrlSafety("http://172.16.0.5:8000/hook").safe).toBe(false);
    expect(OutboundWebhooksService.validateUrlSafety("http://172.31.255.254/hook").safe).toBe(false);

    // 4. Valid external destination
    expect(OutboundWebhooksService.validateUrlSafety("https://hooks.zapier.com/hooks/catch/123/abc").safe).toBe(true);
    expect(OutboundWebhooksService.validateUrlSafety("https://api.partner.com/webhooks/listener").safe).toBe(true);
  });

  it("3. Creates endpoint, returns raw secret ONCE, and masks secret on listing", async () => {
    const res = await OutboundWebhooksService.createEndpoint(tenantA.id, userA.id, {
      url: "https://api.partner.com/v1/hrms-events",
      events: ["employee.created", "invoice.paid"],
    });

    expect(res.rawSecret).toBeDefined();
    expect(res.rawSecret.startsWith("whsec_")).toBe(true);
    expect(res.endpoint.id).toBeDefined();
    expect(res.endpoint.url).toBe("https://api.partner.com/v1/hrms-events");
    expect(res.endpoint.events).toEqual(["employee.created", "invoice.paid"]);
    expect(res.endpoint.secretMasked).toBeDefined();

    // Verify stored record in DB has encrypted secret, NOT plaintext raw secret
    const stored = await db.setting.findFirst({
      where: {
        scope: "TENANT",
        scopeId: tenantA.id,
        key: `endpoint:${res.endpoint.id}`,
      },
    });
    expect(stored).toBeDefined();
    const parsed = stored!.valueJson as any;
    expect(parsed.secret).not.toBe(res.rawSecret);
    expect(parsed.secret).toContain(":"); // iv:authTag:ciphertext format

    // Verify listing masks secret
    const endpoints = await OutboundWebhooksService.listEndpoints(tenantA.id);
    expect(endpoints.length).toBeGreaterThanOrEqual(1);
    const listed = endpoints.find((e) => e.id === res.endpoint.id);
    expect(listed).toBeDefined();
    expect(listed!.secretMasked).toBe("whsec_••••••••••••••••");
    expect((listed as any).secret).toBeUndefined();
  });

  it("4. Generates and verifies HMAC-SHA256 signatures with replay protection", () => {
    const secret = "whsec_super_secret_signing_key_12345";
    const payload = JSON.stringify({ event: "invoice.paid", amount: 5000 });
    const now = Math.floor(Date.now() / 1000);

    const signature = OutboundWebhooksService.generateSignature(payload, secret, now);
    expect(signature.startsWith(`t=${now},v1=`)).toBe(true);

    // 1. Valid signature passes
    const valid = OutboundWebhooksService.verifySignature(payload, signature, secret);
    expect(valid).toBe(true);

    // 2. Tampered payload fails
    const tamperedPayload = JSON.stringify({ event: "invoice.paid", amount: 999999 });
    const invalidPayload = OutboundWebhooksService.verifySignature(tamperedPayload, signature, secret);
    expect(invalidPayload).toBe(false);

    // 3. Replay / Stale timestamp fails (> 300s drift)
    const oldTimestamp = now - 400; // 400 seconds ago
    const staleSignature = OutboundWebhooksService.generateSignature(payload, secret, oldTimestamp);
    const staleResult = OutboundWebhooksService.verifySignature(payload, staleSignature, secret);
    expect(staleResult).toBe(false);
  });

  it("5. Dispatches webhooks with bounded retries on failure and logs outcomes", async () => {
    let callCount = 0;
    // Set mock transport that fails repeatedly with 503
    OutboundWebhooksService.setMockTransport(async () => {
      callCount += 1;
      return { statusCode: 503, ok: false, error: "Service Unavailable" };
    });

    const logs = await OutboundWebhooksService.dispatchEvent(
      tenantA.id,
      "employee.created",
      { employeeId: "emp_123" },
      { maxRetries: 3 }
    );

    expect(logs.length).toBeGreaterThanOrEqual(1);
    const log = logs[0];
    expect(log.status).toBe("failed");
    expect(log.statusCode).toBe(503);
    expect(log.attempt).toBe(3); // Bounded at exactly 3 attempts
    expect(log.maxAttempts).toBe(3);
    expect(callCount).toBe(3); // Stopped retrying, prevented unbounded storms
  });

  it("6. Records successful delivery and persists delivery log", async () => {
    // Set mock transport that succeeds on first attempt
    OutboundWebhooksService.setMockTransport(async () => {
      return { statusCode: 200, ok: true };
    });

    const logs = await OutboundWebhooksService.dispatchEvent(
      tenantA.id,
      "invoice.paid",
      { invoiceNo: "INV-9901", total: 45000 }
    );

    expect(logs.length).toBeGreaterThanOrEqual(1);
    const log = logs[0];
    expect(log.status).toBe("success");
    expect(log.statusCode).toBe(200);
    expect(log.attempt).toBe(1);

    // Verify delivery log can be queried
    const storedLogs = await OutboundWebhooksService.listDeliveryLogs(tenantA.id);
    expect(storedLogs.length).toBeGreaterThanOrEqual(1);
    expect(storedLogs.some((l) => l.event === "invoice.paid" && l.status === "success")).toBe(true);
  });

  it("7. Strictly enforces tenant isolation on endpoints and delivery logs", async () => {
    // Create endpoint in Tenant B
    const resB = await OutboundWebhooksService.createEndpoint(tenantB.id, userB.id, {
      url: "https://tenant-b-receiver.com/hooks",
      events: ["attendance.logged"],
    });

    // 1. Tenant A listEndpoints does NOT show Tenant B's endpoint
    const listA = await OutboundWebhooksService.listEndpoints(tenantA.id);
    expect(listA.some((ep) => ep.id === resB.endpoint.id)).toBe(false);

    // 2. Tenant A cannot delete Tenant B's endpoint
    await expect(
      OutboundWebhooksService.deleteEndpoint(tenantA.id, resB.endpoint.id, userA.id)
    ).rejects.toThrow("Webhook endpoint not found");

    // 3. Tenant A delivery logs do NOT leak Tenant B logs
    const logsA = await OutboundWebhooksService.listDeliveryLogs(tenantA.id);
    expect(logsA.every((l) => l.tenantId === tenantA.id)).toBe(true);
  });

  it("8. Pre-dispatch DNS resolution verifies and rejects prohibited IPs (W1-WH-01)", async () => {
    // 1. Literal private IP is rejected
    const resLiteral = await OutboundWebhooksService.validateUrlSafetyAsync("http://10.20.30.40/webhook");
    expect(resLiteral.safe).toBe(false);
    expect(resLiteral.error).toContain("SSRF");

    // 2. Loopback IP is rejected
    const resLoopback = await OutboundWebhooksService.validateUrlSafetyAsync("http://127.0.0.1:8080/hook");
    expect(resLoopback.safe).toBe(false);

    // 3. Cloud metadata is rejected
    const resMeta = await OutboundWebhooksService.validateUrlSafetyAsync("http://169.254.169.254/latest");
    expect(resMeta.safe).toBe(false);
  });

  it("9. Redirect inspection halts redirection towards prohibited internal addresses (W1-WH-02)", async () => {
    // Setup mock transport that attempts redirect to internal loopback
    OutboundWebhooksService.setMockTransport(async (url: string) => {
      if (url.includes("initial-webhook")) {
        return {
          statusCode: 302,
          ok: false,
          headers: { location: "http://127.0.0.1:9000/internal-admin" },
        };
      }
      return { statusCode: 200, ok: true };
    });

    const dispatchRes = await OutboundWebhooksService.safeDispatchHttp(
      "https://external-api.partner.com/initial-webhook",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        timeoutMs: 2000,
      }
    );

    // Redirect to loopback MUST be detected and blocked
    expect(dispatchRes.ok).toBe(false);
    expect(dispatchRes.statusCode).toBe(400);
    expect(dispatchRes.error).toContain("Blocked by dispatch-time SSRF/DNS security");
  });
});

