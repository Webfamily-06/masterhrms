import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Response, NextFunction } from "express";
import { IdempotencyService } from "../services/idempotency.service.js";
import { enforceIdempotency } from "../middleware/idempotency.middleware.js";
import { checkAccountLockout, recordFailedLogin, clearFailedLogins, resetAllAccountLockoutsForTest } from "../lib/login-protection.js";

function makeMockRes() {
  const headers: Record<string, string> = {};
  const res: any = {
    statusCode: 200,
    body: null,
    headers,
    setHeader(k: string, v: string) {
      headers[k.toLowerCase()] = String(v);
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
    send(payload: any) {
      this.body = payload;
      return this;
    },
  };
  return res as Response & { statusCode: number; body: any; headers: Record<string, string> };
}

describe("Partial-Failure Flows: Idempotency Conflict, Failure Unlock & Replay", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks concurrent in-flight duplicate X-Idempotency-Key with HTTP 409 CONCURRENT_REQUEST_IN_PROGRESS", async () => {
    const key = `pf-concurrent-${Date.now()}`;
    const tenantId = "tenant-pf-test";
    const payload = { action: "punch_in", timestamp: "2026-11-28T09:00:00Z" };

    // 1st request acquires in-progress lock
    const first = await IdempotencyService.checkAndLock(tenantId, key, payload);
    expect(first.action).toBe("EXECUTE");

    // 2nd concurrent request with exact same key is rejected with 409
    const req2: any = { headers: { "x-idempotency-key": key }, body: payload, user: { tenantId } };
    const res2 = makeMockRes();
    const next2 = vi.fn() as unknown as NextFunction;
    await enforceIdempotency(req2, res2, next2);

    expect(next2).not.toHaveBeenCalled();
    expect(res2.statusCode).toBe(409);
    expect(res2.body?.code).toBe("CONCURRENT_REQUEST_IN_PROGRESS");

    // Cleanup lock
    IdempotencyService.unlock(tenantId, key);
  });

  it("unlocks idempotency key when downstream handler fails (HTTP 500/400) so retry succeeds cleanly", async () => {
    const key = `pf-unlock-${Date.now()}`;
    const tenantId = "tenant-pf-test";
    const payload = { amount: 500 };

    const req1: any = { headers: { "x-idempotency-key": key }, body: payload, user: { tenantId } };
    const res1 = makeMockRes();
    let passedToHandler = false;
    await enforceIdempotency(req1, res1, () => {
      passedToHandler = true;
      // Simulate downstream partial failure returning HTTP 400
      res1.status(400).json({ error: "Downstream validation failure" });
    });
    expect(passedToHandler).toBe(true);
    expect(res1.statusCode).toBe(400);

    // Immediate retry with same key MUST NOT be stuck in 409 CONCURRENT_REQUEST_IN_PROGRESS
    const retryCheck = await IdempotencyService.checkAndLock(tenantId, key, payload);
    expect(retryCheck.action).toBe("EXECUTE");
    IdempotencyService.unlock(tenantId, key);
  });

  it("detects deterministic payload mismatch via SHA-256 hash regardless of key order", () => {
    const h1 = IdempotencyService.computePayloadHash({ b: 2, a: 1 });
    const h2 = IdempotencyService.computePayloadHash({ a: 1, b: 2 });
    const h3 = IdempotencyService.computePayloadHash({ a: 1, b: 999 });
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
  });
});

describe("Partial-Failure Flows: Progressive Lockout & Recovery Lifecycle", () => {
  beforeEach(() => {
    resetAllAccountLockoutsForTest();
  });

  it("progresses cleanly through 4 failures -> Tier 1 lock (60s) -> clear recovery", () => {
    const email = "partial-flow@company.test";
    for (let i = 1; i <= 4; i++) {
      const r = recordFailedLogin(email);
      expect(r.locked).toBe(false);
      expect(r.failures).toBe(i);
    }
    const lock1 = recordFailedLogin(email);
    expect(lock1.locked).toBe(true);
    expect(lock1.lockoutTier).toBe(1);
    expect(lock1.retryAfterSeconds).toBeGreaterThanOrEqual(55);
    expect(lock1.retryAfterSeconds).toBeLessThanOrEqual(60);

    // Confirm checkAccountLockout reflects active lock
    expect(checkAccountLockout(email).locked).toBe(true);

    // Recovery after successful login resets failures & tier
    clearFailedLogins(email);
    const after = checkAccountLockout(email);
    expect(after.locked).toBe(false);
    expect(after.failures).toBe(0);
  });
});
