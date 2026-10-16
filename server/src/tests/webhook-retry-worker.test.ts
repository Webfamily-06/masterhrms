import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebhookRetryWorker } from "../modules/outbound-webhooks/webhook-retry.worker";
import { OutboundWebhooksService, WebhookDeliveryLog } from "../modules/outbound-webhooks/outbound-webhooks.service";
import { rawPrisma, prisma as proxiedPrisma } from "../prisma";

const db = rawPrisma || proxiedPrisma;

describe("WH-16 — Durable Background Webhook Retry Worker Acceptance Suite", () => {
  const tenantAId = "tenant_webhook_worker_a";
  const tenantBId = "tenant_webhook_worker_b";
  const testUserId = "user_worker_tester";

  beforeEach(async () => {
    WebhookRetryWorker.stop();
    // Clean up test settings
    await db.setting.deleteMany({
      where: {
        scope: "TENANT",
        scopeId: { in: [tenantAId, tenantBId] },
      },
    }).catch(() => {});
  });

  afterEach(() => {
    WebhookRetryWorker.stop();
  });

  describe("1. Backoff Scheduling & Retry Eligibility", () => {
    it("should compute strictly increasing exponential backoff with bounded jitter", () => {
      const delays: number[] = [];
      for (let attempt = 1; attempt <= 5; attempt++) {
        const delay = WebhookRetryWorker.calculateBackoff(attempt, 2, 3600, 0.1);
        delays.push(delay);
      }

      // Base formula: 2 * 2^(attempt - 1)
      // Attempt 1: ~2000ms (+ up to 10% jitter)
      // Attempt 2: ~4000ms
      // Attempt 3: ~8000ms
      // Attempt 4: ~16000ms
      // Attempt 5: ~32000ms
      expect(delays[0]).toBeGreaterThanOrEqual(2000);
      expect(delays[0]).toBeLessThanOrEqual(2300);

      expect(delays[1]).toBeGreaterThanOrEqual(4000);
      expect(delays[1]).toBeLessThanOrEqual(4600);

      expect(delays[2]).toBeGreaterThanOrEqual(8000);
      expect(delays[2]).toBeLessThanOrEqual(9200);

      expect(delays[3]).toBeGreaterThanOrEqual(16000);
      expect(delays[4]).toBeGreaterThan(delays[3]);
    });

    it("should classify 5xx, 429, and network timeouts as retryable, but 4xx and SSRF as terminal", () => {
      // Retryable
      expect(WebhookRetryWorker.isRetryableError(500, null)).toBe(true);
      expect(WebhookRetryWorker.isRetryableError(502, null)).toBe(true);
      expect(WebhookRetryWorker.isRetryableError(503, null)).toBe(true);
      expect(WebhookRetryWorker.isRetryableError(429, null)).toBe(true);
      expect(WebhookRetryWorker.isRetryableError(null, "ETIMEDOUT")).toBe(true);
      expect(WebhookRetryWorker.isRetryableError(null, "ECONNREFUSED")).toBe(true);

      // Non-retryable / Terminal
      expect(WebhookRetryWorker.isRetryableError(400, "Bad Request")).toBe(false);
      expect(WebhookRetryWorker.isRetryableError(401, "Unauthorized")).toBe(false);
      expect(WebhookRetryWorker.isRetryableError(403, "Forbidden")).toBe(false);
      expect(WebhookRetryWorker.isRetryableError(404, "Not Found")).toBe(false);
      expect(WebhookRetryWorker.isRetryableError(422, "Unprocessable Entity")).toBe(false);
      expect(WebhookRetryWorker.isRetryableError(null, "SSRF_BLOCKED")).toBe(false);
      expect(WebhookRetryWorker.isRetryableError(null, "ENDPOINT_INACTIVE")).toBe(false);
    });
  });

  describe("2. Concurrent Processing & Atomic Claiming", () => {
    it("should prevent double processing when multiple concurrent workers sweep simultaneously", async () => {
      // 1. Create an active endpoint
      const { endpoint } = await OutboundWebhooksService.createEndpoint(tenantAId, testUserId, {
        name: "Concurrency Test Endpoint",
        url: "https://example.com/webhook/test-concurrency",
        events: ["employee.updated"],
      });

      // 2. Persist a mock delivery log in 'retrying' state due now
      const logId = `del_${Date.now()}_concurrency`;
      const deliveryLog: WebhookDeliveryLog = {
        id: logId,
        endpointId: endpoint.id,
        endpointName: endpoint.name,
        tenantId: tenantAId,
        eventKey: "employee.updated",
        method: "POST",
        url: endpoint.url,
        status: "retrying",
        statusCode: 503,
        durationMs: 120,
        attempt: 1,
        maxAttempts: 3,
        nextAttemptAt: new Date(Date.now() - 5000).toISOString(), // due in past
        claimedAt: null,
        claimedBy: null,
        errorCode: "HTTP_503",
        responseSnippet: "Service Unavailable",
        payload: { employeeId: "emp_101", name: "Alice" },
        timestamp: new Date().toISOString(),
      };

      await db.setting.create({
        data: {
          scope: "TENANT",
          scopeId: tenantAId,
          group: "webhook_delivery_logs",
          key: `delivery:${logId}`,
          valueJson: deliveryLog as any,
          valueType: "json",
          isSecret: false,
          version: 1,
        },
      });

      // 3. Mock safeDispatchHttp to return 200 OK
      const dispatchSpy = vi.spyOn(OutboundWebhooksService, "safeDispatchHttp").mockResolvedValue({
        ok: true,
        statusCode: 200,
        durationMs: 45,
        responseSnippet: '{"received":true}',
      });

      // 4. Simulate two concurrent worker sweeps
      const workerA = WebhookRetryWorker.processPendingRetries("worker_instance_alpha", 10);
      const workerB = WebhookRetryWorker.processPendingRetries("worker_instance_beta", 10);

      const [resultA, resultB] = await Promise.all([workerA, workerB]);

      // Exactly one worker claimed and succeeded
      const totalClaimed = resultA.claimed + resultB.claimed;
      const totalSucceeded = resultA.succeeded + resultB.succeeded;

      expect(totalClaimed).toBe(1);
      expect(totalSucceeded).toBe(1);
      expect(dispatchSpy).toHaveBeenCalledTimes(1);

      // Verify the persisted state is now success
      const updatedLog = await OutboundWebhooksService.getLogDetail(tenantAId, logId);
      expect(updatedLog?.status).toBe("success");
      expect(updatedLog?.attempt).toBe(2);
      expect(updatedLog?.claimedAt).toBeNull();

      dispatchSpy.mockRestore();
    });
  });

  describe("3. Tenant Boundary & Endpoint Ownership Isolation", () => {
    it("should terminate delivery if endpoint belongs to a different tenant or is deleted", async () => {
      // Create endpoint in Tenant A
      const { endpoint } = await OutboundWebhooksService.createEndpoint(tenantAId, testUserId, {
        name: "Tenant A Endpoint",
        url: "https://example.com/tenant-a/hook",
        events: ["test.event"],
      });

      // Fraudulent delivery log in Tenant B pointing to Tenant A endpoint ID
      const spoofedLogId = `del_${Date.now()}_spoofed`;
      const spoofedLog: WebhookDeliveryLog = {
        id: spoofedLogId,
        endpointId: endpoint.id,
        endpointName: "Spoofed Endpoint",
        tenantId: tenantBId, // Mismatched tenant!
        eventKey: "test.event",
        method: "POST",
        url: endpoint.url,
        status: "retrying",
        statusCode: 500,
        durationMs: 50,
        attempt: 1,
        maxAttempts: 3,
        nextAttemptAt: new Date(Date.now() - 1000).toISOString(),
        claimedAt: null,
        claimedBy: null,
        errorCode: "HTTP_500",
        payload: { secret: "leak_attempt" },
        timestamp: new Date().toISOString(),
      };

      await db.setting.create({
        data: {
          scope: "TENANT",
          scopeId: tenantBId,
          group: "webhook_delivery_logs",
          key: `delivery:${spoofedLogId}`,
          valueJson: spoofedLog as any,
          valueType: "json",
          isSecret: false,
          version: 1,
        },
      });

      const dispatchSpy = vi.spyOn(OutboundWebhooksService, "safeDispatchHttp");

      // Execute sweep
      const sweep = await WebhookRetryWorker.processPendingRetries("worker_test", 10);
      expect(sweep.dead).toBeGreaterThanOrEqual(1);

      // Verify dispatch was NEVER called because Tenant B does not own endpoint in Tenant A
      expect(dispatchSpy).not.toHaveBeenCalled();

      const deadLog = await OutboundWebhooksService.getLogDetail(tenantBId, spoofedLogId);
      expect(deadLog?.status).toBe("dead");
      expect(deadLog?.errorCode).toBe("ENDPOINT_NOT_FOUND");

      dispatchSpy.mockRestore();
    });
  });

  describe("4. SSRF Revalidation & Secret Rotation on Retry", () => {
    it("should revalidate destination safety on retry and block if destination is SSRF unsafe", async () => {
      const { endpoint } = await OutboundWebhooksService.createEndpoint(tenantAId, testUserId, {
        name: "SSRF Test Endpoint",
        url: "http://169.254.169.254/metadata", // Cloud metadata IP
        events: ["test.event"],
      }).catch(() => {
        // createEndpoint might reject it via static check, so let's mock an endpoint directly in DB
        return {
          endpoint: {
            id: "ep_ssrf_mock",
            name: "SSRF Mock",
            module: "system",
            eventKey: "test.event",
            events: ["test.event"],
            method: "POST",
            url: "http://169.254.169.254/latest/meta-data",
            secret: "whsec_mock:iv:tag",
            status: "active",
            timeoutMs: 5000,
            maxRetries: 3,
            consecutiveFailures: 0,
            createdBy: testUserId,
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as any,
        };
      });

      // Ensure endpoint exists in DB
      await db.setting.upsert({
        where: {
          scope_scopeId_key: {
            scope: "TENANT",
            scopeId: tenantAId,
            key: `endpoint:${endpoint.id}`,
          },
        },
        create: {
          scope: "TENANT",
          scopeId: tenantAId,
          group: "outbound_webhooks",
          key: `endpoint:${endpoint.id}`,
          valueJson: endpoint as any,
          valueType: "json",
          isSecret: false,
          version: 1,
        },
        update: {
          valueJson: endpoint as any,
        },
      });

      const logId = `del_${Date.now()}_ssrf_retry`;
      const retryLog: WebhookDeliveryLog = {
        id: logId,
        endpointId: endpoint.id,
        endpointName: endpoint.name,
        tenantId: tenantAId,
        eventKey: "test.event",
        method: "POST",
        url: endpoint.url,
        status: "retrying",
        attempt: 1,
        maxAttempts: 3,
        durationMs: 10,
        nextAttemptAt: new Date(Date.now() - 2000).toISOString(),
        payload: { attempt: "ssrf" },
        timestamp: new Date().toISOString(),
      };

      await db.setting.create({
        data: {
          scope: "TENANT",
          scopeId: tenantAId,
          group: "webhook_delivery_logs",
          key: `delivery:${logId}`,
          valueJson: retryLog as any,
          valueType: "json",
          isSecret: false,
          version: 1,
        },
      });

      const dispatchSpy = vi.spyOn(OutboundWebhooksService, "safeDispatchHttp");

      // Execute sweep
      const sweep = await WebhookRetryWorker.processPendingRetries("worker_test", 10);
      expect(sweep.dead).toBeGreaterThanOrEqual(1);

      // Verify dispatch was NEVER invoked for SSRF destination
      expect(dispatchSpy).not.toHaveBeenCalled();

      const deadLog = await OutboundWebhooksService.getLogDetail(tenantAId, logId);
      expect(deadLog?.status).toBe("dead");
      expect(deadLog?.errorCode).toBe("SSRF_BLOCKED");

      dispatchSpy.mockRestore();
    });

    it("should sign retry payloads with fresh timestamp and updated secret after rotation", async () => {
      const { endpoint, rawSecret } = await OutboundWebhooksService.createEndpoint(tenantAId, testUserId, {
        name: "Secret Rotation Test",
        url: "https://example.com/webhook/rotation-test",
        events: ["payroll.finalized"],
      });

      // Rotate secret
      const rotation = await OutboundWebhooksService.rotateSecret(tenantAId, endpoint.id, testUserId);
      expect(rotation.rawSecret).not.toBe(rawSecret);

      const logId = `del_${Date.now()}_rotation_test`;
      const retryLog: WebhookDeliveryLog = {
        id: logId,
        endpointId: endpoint.id,
        endpointName: endpoint.name,
        tenantId: tenantAId,
        eventKey: "payroll.finalized",
        method: "POST",
        url: endpoint.url,
        status: "retrying",
        attempt: 1,
        maxAttempts: 3,
        durationMs: 30,
        nextAttemptAt: new Date(Date.now() - 1000).toISOString(),
        payload: { payrollId: "pay_999", total: 45000 },
        timestamp: new Date().toISOString(),
      };

      await db.setting.create({
        data: {
          scope: "TENANT",
          scopeId: tenantAId,
          group: "webhook_delivery_logs",
          key: `delivery:${logId}`,
          valueJson: retryLog as any,
          valueType: "json",
          isSecret: false,
          version: 1,
        },
      });

      let capturedHeaders: Record<string, string> = {};
      let capturedBody = "";
      const dispatchSpy = vi.spyOn(OutboundWebhooksService, "safeDispatchHttp").mockImplementation(
        async (_url, opts) => {
          capturedHeaders = (opts?.headers as any) || {};
          capturedBody = (opts?.body as string) || "";
          return { ok: true, statusCode: 200, durationMs: 40 };
        }
      );

      await WebhookRetryWorker.processPendingRetries("worker_test", 10);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(capturedHeaders["X-Webhook-Signature"]).toBeDefined();
      expect(capturedHeaders["X-Webhook-Attempt"]).toBe("2");

      // Verify the signature validates with the NEW rotated secret
      const rawSig = capturedHeaders["X-Webhook-Signature"];
      const isValid = OutboundWebhooksService.verifySignature(capturedBody, rawSig, rotation.rawSecret);
      expect(isValid).toBe(true);

      dispatchSpy.mockRestore();
    });
  });

  describe("5. Terminal Failures & Restart Resilience", () => {
    it("should mark delivery as dead when attempt reaches maxAttempts", async () => {
      const { endpoint } = await OutboundWebhooksService.createEndpoint(tenantAId, testUserId, {
        name: "Terminal Failure Endpoint",
        url: "https://example.com/webhook/terminal",
        events: ["test.event"],
      });

      const logId = `del_${Date.now()}_terminal_test`;
      const retryLog: WebhookDeliveryLog = {
        id: logId,
        endpointId: endpoint.id,
        endpointName: endpoint.name,
        tenantId: tenantAId,
        eventKey: "test.event",
        method: "POST",
        url: endpoint.url,
        status: "retrying",
        attempt: 2,
        maxAttempts: 3, // next attempt (3) will be the last
        durationMs: 30,
        nextAttemptAt: new Date(Date.now() - 1000).toISOString(),
        payload: { test: true },
        timestamp: new Date().toISOString(),
      };

      await db.setting.create({
        data: {
          scope: "TENANT",
          scopeId: tenantAId,
          group: "webhook_delivery_logs",
          key: `delivery:${logId}`,
          valueJson: retryLog as any,
          valueType: "json",
          isSecret: false,
          version: 1,
        },
      });

      // Mock failure on attempt 3
      const dispatchSpy = vi.spyOn(OutboundWebhooksService, "safeDispatchHttp").mockResolvedValue({
        ok: false,
        statusCode: 504,
        durationMs: 5000,
        error: "Gateway Timeout",
      });

      const sweep = await WebhookRetryWorker.processPendingRetries("worker_test", 10);
      expect(sweep.dead).toBe(1);

      const updated = await OutboundWebhooksService.getLogDetail(tenantAId, logId);
      expect(updated?.status).toBe("dead");
      expect(updated?.attempt).toBe(3);
      expect(updated?.errorCode).toBe("HTTP_504");
      expect(updated?.nextAttemptAt).toBeNull();

      dispatchSpy.mockRestore();
    });

    it("should survive simulated worker process restart and seamlessly resume pending retries", async () => {
      const { endpoint } = await OutboundWebhooksService.createEndpoint(tenantAId, testUserId, {
        name: "Restart Resilience Endpoint",
        url: "https://example.com/webhook/restart-test",
        events: ["user.invited"],
      });

      // 1. Worker is stopped (simulating server crash/downtime)
      WebhookRetryWorker.stop();

      // 2. Insert pending delivery log that was queued before restart
      const logId = `del_${Date.now()}_restart_survivor`;
      const retryLog: WebhookDeliveryLog = {
        id: logId,
        endpointId: endpoint.id,
        endpointName: endpoint.name,
        tenantId: tenantAId,
        eventKey: "user.invited",
        method: "POST",
        url: endpoint.url,
        status: "retrying",
        attempt: 1,
        maxAttempts: 3,
        durationMs: 40,
        nextAttemptAt: new Date(Date.now() - 10000).toISOString(), // due in past
        payload: { email: "newuser@example.com" },
        timestamp: new Date().toISOString(),
      };

      await db.setting.create({
        data: {
          scope: "TENANT",
          scopeId: tenantAId,
          group: "webhook_delivery_logs",
          key: `delivery:${logId}`,
          valueJson: retryLog as any,
          valueType: "json",
          isSecret: false,
          version: 1,
        },
      });

      const dispatchSpy = vi.spyOn(OutboundWebhooksService, "safeDispatchHttp").mockResolvedValue({
        ok: true,
        statusCode: 200,
        durationMs: 50,
      });

      // 3. Simulate process restart: start worker afresh
      WebhookRetryWorker.start(2000);
      expect(WebhookRetryWorker.getStats().isRunning).toBe(true);

      // 4. Trigger sweep
      const sweep = await WebhookRetryWorker.processPendingRetries("new_worker_after_boot", 10);
      expect(sweep.succeeded).toBe(1);

      const completed = await OutboundWebhooksService.getLogDetail(tenantAId, logId);
      expect(completed?.status).toBe("success");
      expect(completed?.attempt).toBe(2);

      WebhookRetryWorker.stop();
      dispatchSpy.mockRestore();
    });
  });
});
