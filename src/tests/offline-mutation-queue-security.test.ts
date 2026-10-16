class MockStorage implements Storage {
  private store: Map<string, string> = new Map();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] || null;
  }
}

const mockLocal = new MockStorage();
const mockSession = new MockStorage();

globalThis.localStorage = mockLocal;
globalThis.sessionStorage = mockSession;

const eventListeners: Record<string, Function[]> = {};

if (typeof (globalThis as any).window === "undefined") {
  (globalThis as any).window = {
    localStorage: mockLocal,
    sessionStorage: mockSession,
    addEventListener: (event: string, fn: Function) => {
      eventListeners[event] = eventListeners[event] || [];
      eventListeners[event].push(fn);
    },
    removeEventListener: (event: string, fn: Function) => {
      if (eventListeners[event]) {
        eventListeners[event] = eventListeners[event].filter((f) => f !== fn);
      }
    },
    dispatchEvent: (evt: any) => {
      const fns = eventListeners[evt.type] || [];
      fns.forEach((fn) => fn(evt));
      return true;
    },
  };
}

if (typeof (globalThis as any).CustomEvent === "undefined") {
  (globalThis as any).CustomEvent = class CustomEvent {
    type: string;
    detail: any;
    constructor(type: string, params: any = {}) {
      this.type = type;
      this.detail = params.detail;
    }
  };
}

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  OfflineQueueManager,
  isActionPermitted,
  getActiveSession,
  QUARANTINE_POLICY,
  sanitizeQuarantinePayload,
  pruneQuarantinePartition,
} from "@/lib/web-apis/network-status";
import { storage } from "@/lib/web-apis/storage";

describe("Batch 5D: Offline Mutation Queue Security and Tenant Isolation", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    mockLocal.clear();
    mockSession.clear();
    for (const key of Object.keys(eventListeners)) {
      delete eventListeners[key];
    }
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mockLocal.clear();
    mockSession.clear();
    for (const key of Object.keys(eventListeners)) {
      delete eventListeners[key];
    }
    vi.restoreAllMocks();
  });

  function setupSession(tenantId = "tenant-alpha", userId = "user-1", token = "jwt-token-alpha") {
    localStorage.setItem("hrms_auth_token", token);
    localStorage.setItem(
      "hrms_user",
      JSON.stringify({
        id: userId,
        userId,
        email: `${userId}@${tenantId}.com`,
        tenantId,
        roles: ["employee"],
      })
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Queue creation and safe persistence
  // ─────────────────────────────────────────────────────────────────────────────
  it("1. enqueues permitted actions with safe persistence, tenant partitioning, and idempotency key", () => {
    setupSession("tenant-alpha", "user-101");

    const item = OfflineQueueManager.enqueue({
      endpoint: "/api/attendance/clock-in",
      method: "POST",
      payload: { note: "Morning punch", site: "HQ" },
    });

    expect(item).toBeDefined();
    expect(item.id).toMatch(/^queue_/);
    expect(item.tenantId).toBe("tenant-alpha");
    expect(item.userId).toBe("user-101");
    expect(item.status).toBe("pending");
    expect(item.attempts).toBe(0);
    expect(item.maxAttempts).toBe(3);
    expect(typeof item.idempotencyKey).toBe("string");
    expect(item.idempotencyKey.length).toBeGreaterThan(5);

    // Verify partitioned storage
    const partitionedQueue = OfflineQueueManager.getQueue("tenant-alpha", "user-101");
    expect(partitionedQueue.length).toBe(1);
    expect(partitionedQueue[0].id).toBe(item.id);

    // Verify unpartitioned legacy queue key is NOT used
    expect(localStorage.getItem("hrms_offline_action_queue")).toBeNull();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Replay with the original valid session
  // ─────────────────────────────────────────────────────────────────────────────
  it("2. replays queued action with Bearer authorization and idempotency headers under valid session", async () => {
    setupSession("tenant-alpha", "user-101", "valid-bearer-token-123");

    const item = OfflineQueueManager.enqueue({
      endpoint: "/api/attendance/clock-in",
      method: "POST",
      payload: { note: "Site visit clock-in" },
    });

    let capturedHeaders: Record<string, string> = {};
    let capturedMethod = "";
    let capturedUrl = "";

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
      capturedUrl = url;
      capturedMethod = init.method;
      capturedHeaders = init.headers;
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, timestamp: Date.now() }),
      } as Response;
    });

    const result = await OfflineQueueManager.replayQueue();

    expect(result.synced).toBe(1);
    expect(result.failed).toBe(0);
    expect(capturedUrl).toBe("/api/attendance/clock-in");
    expect(capturedMethod).toBe("POST");
    expect(capturedHeaders["Authorization"]).toBe("Bearer valid-bearer-token-123");
    expect(capturedHeaders["X-Idempotency-Key"]).toBe(item.idempotencyKey);
    expect(capturedHeaders["X-Offline-Queued-At"]).toBe(item.timestamp.toString());

    // Successfully dequeued
    const remaining = OfflineQueueManager.getQueue("tenant-alpha", "user-101");
    expect(remaining.length).toBe(0);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Logout followed by another user logging in
  // ─────────────────────────────────────────────────────────────────────────────
  it("3. quarantines actions on logout and prevents execution when a new user logs in", async () => {
    // User 1 on Tenant 1 queues an action
    setupSession("tenant-1", "user-alice", "token-alice");
    OfflineQueueManager.enqueue({
      endpoint: "/api/attendance/clock-in",
      method: "POST",
      payload: { note: "Alice punch" },
    });
    expect(OfflineQueueManager.getQueue("tenant-1", "user-alice").length).toBe(1);

    // User 1 logs out: handleLogout triggers quarantine
    const logoutResult = OfflineQueueManager.handleLogout("tenant-1", "user-alice");
    expect(logoutResult.quarantinedCount).toBe(1);

    // Active queue for Alice is now cleared
    expect(OfflineQueueManager.getQueue("tenant-1", "user-alice").length).toBe(0);
    // Quarantined archive contains the action safely
    expect(OfflineQueueManager.getQuarantine("tenant-1", "user-alice").length).toBe(1);

    // User 2 logs in on the same browser
    setupSession("tenant-1", "user-bob", "token-bob");
    expect(OfflineQueueManager.getQueue().length).toBe(0);

    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    // Bob triggers replay
    const result = await OfflineQueueManager.replayQueue();
    expect(result.synced).toBe(0);
    expect(result.failed).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Tenant A queue followed by tenant B login
  // ─────────────────────────────────────────────────────────────────────────────
  it("4. strictly isolates Tenant A queued actions from Tenant B session", async () => {
    // User in Tenant A queues an action
    setupSession("tenant-corp-a", "user-alpha", "token-corp-a");
    OfflineQueueManager.enqueue({
      endpoint: "/api/attendance/clock-in",
      method: "POST",
      payload: { note: "Tenant A punch" },
    });

    // Session switches to Tenant B
    setupSession("tenant-corp-b", "user-beta", "token-corp-b");

    // Tenant B cannot see Tenant A's queue
    const queueB = OfflineQueueManager.getQueue();
    expect(queueB.length).toBe(0);

    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    // Replay executes nothing under Tenant B
    const replayResult = await OfflineQueueManager.replayQueue();
    expect(replayResult.synced).toBe(0);
    expect(replayResult.failed).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();

    // Tenant A's queue is still safe and uncorrupted in Tenant A's partition
    const queueA = OfflineQueueManager.getQueue("tenant-corp-a", "user-alpha");
    expect(queueA.length).toBe(1);
    expect(queueA[0].tenantId).toBe("tenant-corp-a");
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Tenant switching before network recovery
  // ─────────────────────────────────────────────────────────────────────────────
  it("5. preserves tenant partitioning when tenant is switched offline before network returns", async () => {
    setupSession("tenant-alpha", "worker-1", "token-alpha");
    OfflineQueueManager.enqueue({
      endpoint: "/api/attendance/clock-in",
      method: "POST",
      payload: { note: "Shift start" },
    });

    // Network is offline; tenant switched to tenant-beta before recovery
    setupSession("tenant-beta", "worker-2", "token-beta");

    // Network recovery fires replay
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    const replayRes = await OfflineQueueManager.replayQueue();
    expect(replayRes.synced).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();

    // Verify worker-1 action was not touched
    const queueAlpha = OfflineQueueManager.getQueue("tenant-alpha", "worker-1");
    expect(queueAlpha.length).toBe(1);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Expired or revoked session (401)
  // ─────────────────────────────────────────────────────────────────────────────
  it("6. halts replay immediately and dispatches auth error when server returns 401 Unauthorized", async () => {
    setupSession("tenant-alpha", "user-1", "expired-jwt-token");
    OfflineQueueManager.enqueue({
      endpoint: "/api/attendance/clock-in",
      method: "POST",
      payload: { note: "Test punch" },
    });

    let authErrorDispatched = false;
    const authListener = (e: any) => {
      if (e.detail?.status === 401) {
        authErrorDispatched = true;
      }
    };
    window.addEventListener("hrms:offline-queue-auth-error", authListener);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized: Token expired" }),
    } as Response);

    const result = await OfflineQueueManager.replayQueue();

    window.removeEventListener("hrms:offline-queue-auth-error", authListener);

    expect(result.synced).toBe(0);
    expect(result.failed).toBe(1);
    expect(authErrorDispatched).toBe(true);

    // Item was not dequeued
    const queue = OfflineQueueManager.getQueue("tenant-alpha", "user-1");
    expect(queue.length).toBe(1);
    expect(queue[0].errorStatus).toBe(401);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Revoked permissions (403)
  // ─────────────────────────────────────────────────────────────────────────────
  it("7. quarantines item without infinite loop when server returns 403 Forbidden (revoked permission)", async () => {
    setupSession("tenant-alpha", "user-1", "valid-token");
    OfflineQueueManager.enqueue({
      endpoint: "/api/attendance/clock-in",
      method: "POST",
      payload: { note: "Test punch" },
    });

    let authErrorDispatched = false;
    const authListener = (e: any) => {
      if (e.detail?.status === 403) authErrorDispatched = true;
    };
    window.addEventListener("hrms:offline-queue-auth-error", authListener);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: "Forbidden: You do not have permission" }),
    } as Response);

    const result = await OfflineQueueManager.replayQueue();

    window.removeEventListener("hrms:offline-queue-auth-error", authListener);

    expect(result.synced).toBe(0);
    expect(result.failed).toBe(1);
    expect(authErrorDispatched).toBe(true);

    // Item is quarantined so active queue does not block
    expect(OfflineQueueManager.getQueue("tenant-alpha", "user-1").length).toBe(0);
    const quarantine = OfflineQueueManager.getQuarantine("tenant-alpha", "user-1");
    expect(quarantine.length).toBe(1);
    expect(quarantine[0].lastError).toContain("Forbidden");
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. Server-side tenant mismatch (403 TENANT_HOST_MISMATCH)
  // ─────────────────────────────────────────────────────────────────────────────
  it("8. quarantines item on server-side TENANT_HOST_MISMATCH error", async () => {
    setupSession("tenant-alpha", "user-1", "mismatched-token");
    OfflineQueueManager.enqueue({
      endpoint: "/api/attendance/clock-in",
      method: "POST",
      payload: { note: "Cross-tenant mismatch test" },
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        error: "Tenant host mismatch: Authenticated workspace does not match the requested host workspace.",
        code: "TENANT_HOST_MISMATCH",
      }),
    } as Response);

    const result = await OfflineQueueManager.replayQueue();
    expect(result.failed).toBe(1);

    const quarantine = OfflineQueueManager.getQuarantine("tenant-alpha", "user-1");
    expect(quarantine.length).toBe(1);
    expect(quarantine[0].lastError).toContain("Tenant host mismatch");
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. Unauthorized and forbidden replay responses
  // ─────────────────────────────────────────────────────────────────────────────
  it("9. distinguishes between 401 session expiry and 403 authorization denial", async () => {
    setupSession("tenant-alpha", "user-1", "test-token");
    OfflineQueueManager.enqueue({
      endpoint: "/api/attendance/clock-in",
      method: "POST",
      payload: { note: "Auth test" },
    });

    // Case A: 401
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized" }),
    } as Response);

    let res401 = await OfflineQueueManager.replayQueue();
    expect(res401.failed).toBe(1);
    // In 401, item remains in queue so user can re-authenticate
    expect(OfflineQueueManager.getQueue().length).toBe(1);

    // Case B: 403
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: "Forbidden" }),
    } as Response);

    let res403 = await OfflineQueueManager.replayQueue();
    expect(res403.failed).toBe(1);
    // In 403, item is quarantined out of active queue
    expect(OfflineQueueManager.getQueue().length).toBe(0);
    expect(OfflineQueueManager.getQuarantine().length).toBe(1);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. Network timeout and transient retry
  // ─────────────────────────────────────────────────────────────────────────────
  it("10. tracks retry attempts on network errors and quarantines only after max attempts", async () => {
    setupSession("tenant-alpha", "user-1", "test-token");
    OfflineQueueManager.enqueue({
      endpoint: "/api/attendance/clock-in",
      method: "POST",
      payload: { note: "Transient test" },
    });

    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    // Attempt 1: Failed transiently, attempts becomes 1
    const res1 = await OfflineQueueManager.replayQueue();
    expect(res1.failed).toBe(1);
    let queue = OfflineQueueManager.getQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].attempts).toBe(1);

    // Attempt 2: Failed transiently, attempts becomes 2
    const res2 = await OfflineQueueManager.replayQueue();
    expect(res2.failed).toBe(1);
    queue = OfflineQueueManager.getQueue();
    expect(queue[0].attempts).toBe(2);

    // Attempt 3: Max attempts reached -> Quarantined
    const res3 = await OfflineQueueManager.replayQueue();
    expect(res3.failed).toBe(1);
    queue = OfflineQueueManager.getQueue();
    expect(queue.length).toBe(0);

    const quarantine = OfflineQueueManager.getQuarantine();
    expect(quarantine.length).toBe(1);
    expect(quarantine[0].attempts).toBe(3);
    expect(quarantine[0].lastError).toContain("Network connectivity failure");
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 11. Duplicate replay and idempotency
  // ─────────────────────────────────────────────────────────────────────────────
  it("11. retains stable X-Idempotency-Key across multiple replay attempts", async () => {
    setupSession("tenant-alpha", "user-1", "test-token");
    const item = OfflineQueueManager.enqueue({
      endpoint: "/api/attendance/clock-in",
      method: "POST",
      payload: { note: "Idempotent test" },
    });

    const sentKeys: string[] = [];
    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: any) => {
      sentKeys.push(init.headers["X-Idempotency-Key"]);
      return { ok: false, status: 503 } as Response;
    });

    await OfflineQueueManager.replayQueue();
    await OfflineQueueManager.replayQueue();

    expect(sentKeys.length).toBe(2);
    expect(sentKeys[0]).toBe(item.idempotencyKey);
    expect(sentKeys[1]).toBe(item.idempotencyKey);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 12. Permanent validation errors
  // ─────────────────────────────────────────────────────────────────────────────
  it("12. quarantines permanent 400/409/422 validation errors without infinite retries", async () => {
    setupSession("tenant-alpha", "user-1", "test-token");
    OfflineQueueManager.enqueue({
      endpoint: "/api/attendance/clock-in",
      method: "POST",
      payload: { note: "Duplicate punch validation test" },
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: "Attendance record already exists for this date and shift." }),
    } as Response);

    let permErrorFired = false;
    const permListener = (e: any) => {
      if (e.detail?.status === 409) permErrorFired = true;
    };
    window.addEventListener("hrms:offline-queue-permanent-error", permListener);

    const result = await OfflineQueueManager.replayQueue();
    window.removeEventListener("hrms:offline-queue-permanent-error", permListener);

    expect(result.failed).toBe(1);
    expect(permErrorFired).toBe(true);

    // Not retained in active queue
    expect(OfflineQueueManager.getQueue().length).toBe(0);
    // Preserved in quarantine for user visibility
    const quarantine = OfflineQueueManager.getQuarantine();
    expect(quarantine.length).toBe(1);
    expect(quarantine[0].lastError).toContain("Attendance record already exists");
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 13. Queue cleanup and user-visible recovery
  // ─────────────────────────────────────────────────────────────────────────────
  it("13. allows clear and quarantine inspection without data leakage", () => {
    setupSession("tenant-alpha", "user-1", "test-token");
    OfflineQueueManager.enqueue({
      endpoint: "/api/attendance/clock-in",
      method: "POST",
      payload: { note: "Item to clear" },
    });
    expect(OfflineQueueManager.getQueue().length).toBe(1);

    OfflineQueueManager.clear();
    expect(OfflineQueueManager.getQueue().length).toBe(0);

    // Simulate quarantine item
    OfflineQueueManager.quarantineAction(
      {
        id: "q-1",
        endpoint: "/api/attendance/clock-in",
        method: "POST",
        payload: {},
        timestamp: Date.now(),
        attempts: 3,
        status: "failed",
        tenantId: "tenant-alpha",
        userId: "user-1",
        idempotencyKey: "idem-1",
      },
      "Test quarantine"
    );

    expect(OfflineQueueManager.getQuarantine().length).toBe(1);
    OfflineQueueManager.clearQuarantine();
    expect(OfflineQueueManager.getQuarantine().length).toBe(0);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 14. Sensitive payload and endpoint exclusion
  // ─────────────────────────────────────────────────────────────────────────────
  it("14. strictly prohibits queuing of payroll, statutory, salary, and sensitive credential mutations", () => {
    setupSession("tenant-alpha", "user-1");

    // Blocked: Payroll run
    expect(() =>
      OfflineQueueManager.enqueue({
        endpoint: "/api/payroll/run",
        method: "POST",
        payload: { period: "2026-03" },
      })
    ).toThrow(/Financial, payroll, statutory, and security actions cannot be queued offline/);

    // Blocked: Statutory tax filings
    expect(() =>
      OfflineQueueManager.enqueue({
        endpoint: "/api/statutory/reports",
        method: "POST",
        payload: { type: "EPF" },
      })
    ).toThrow(/Financial, payroll, statutory, and security actions cannot be queued offline/);

    // Blocked: Salary disbursement
    expect(() =>
      OfflineQueueManager.enqueue({
        endpoint: "/api/salary/disburse",
        method: "POST",
        payload: { amount: 50000 },
      })
    ).toThrow(/Financial, payroll, statutory, and security actions cannot be queued offline/);

    // Blocked: Password / Auth changes
    expect(() =>
      OfflineQueueManager.enqueue({
        endpoint: "/api/auth/reset-password",
        method: "POST",
        payload: { email: "test@example.com" },
      })
    ).toThrow(/Financial, payroll, statutory, and security actions cannot be queued offline/);

    // Blocked: Leave approvals
    expect(() =>
      OfflineQueueManager.enqueue({
        endpoint: "/api/leaves/approve",
        method: "POST",
        payload: { id: "leave-123" },
      })
    ).toThrow(/Financial, payroll, statutory, and security actions cannot be queued offline/);

    // Blocked: Allowed endpoint but payload contains sensitive financial or credential field
    expect(() =>
      OfflineQueueManager.enqueue({
        endpoint: "/api/attendance/clock-in",
        method: "POST",
        payload: { note: "Punching", password: "mypassword" },
      })
    ).toThrow(/Payload contains sensitive personal, financial, or security information/);

    expect(() =>
      OfflineQueueManager.enqueue({
        endpoint: "/api/attendance/clock-in",
        method: "POST",
        payload: { note: "Punching", salary: 25000 },
      })
    ).toThrow(/Payload contains sensitive personal, financial, or security information/);

    expect(() =>
      OfflineQueueManager.enqueue({
        endpoint: "/api/attendance/clock-in",
        method: "POST",
        payload: { note: "Punching", panNumber: "ABCDE1234F" },
      })
    ).toThrow(/Payload contains sensitive personal, financial, or security information/);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 15. Unauthenticated queuing prevention & existing regressions
  // ─────────────────────────────────────────────────────────────────────────────
  it("15. prevents offline queueing when unauthenticated and supports legitimate attendance punch", () => {
    // Unauthenticated
    mockLocal.clear();
    expect(() =>
      OfflineQueueManager.enqueue({
        endpoint: "/api/attendance/clock-in",
        method: "POST",
        payload: { note: "Offline punch" },
      })
    ).toThrow(/Cannot queue offline actions without authenticated tenant and user context/);

    // Authenticated valid punch
    setupSession("tenant-production", "emp-555");
    const item = OfflineQueueManager.enqueue({
      endpoint: "/api/attendance/clock-in",
      method: "POST",
      payload: { note: "Valid punch", timestamp: 1776328800000 },
    });

    expect(item.status).toBe("pending");
    expect(item.tenantId).toBe("tenant-production");
    expect(item.userId).toBe("emp-555");
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 16. Concurrent replay protection & mutex lock
  // ─────────────────────────────────────────────────────────────────────────────
  it("16. prevents race conditions and duplicate fetch dispatches during concurrent replayQueue calls", async () => {
    setupSession("tenant-alpha", "user-1", "test-token");
    OfflineQueueManager.enqueue({
      endpoint: "/api/attendance/clock-in",
      method: "POST",
      payload: { note: "Concurrent test" },
    });

    let fetchCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      fetchCount++;
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 20));
      return { ok: true, status: 200, json: async () => ({ success: true }) } as Response;
    });

    // Launch two replayQueue calls concurrently
    const [res1, res2] = await Promise.all([
      OfflineQueueManager.replayQueue(),
      OfflineQueueManager.replayQueue(),
    ]);

    // One of them must succeed, and the other must be skipped due to concurrency lock
    expect(fetchCount).toBe(1);
    expect(res1.synced + res2.synced).toBe(1);
    const skippedReason = res1.reason || res2.reason;
    expect(skippedReason).toBe("CONCURRENT_REPLAY_IN_PROGRESS");
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 17. [F-05] Task Route Alignment & Fail-Closed Boundaries
  // ─────────────────────────────────────────────────────────────────────────────
  it("17. [F-05] strictly permits /api/projects/tasks while blocking misaligned /api/tasks and broad project operations", () => {
    setupSession("tenant-alpha", "user-1");

    // Permitted: Specific task endpoints
    expect(isActionPermitted("/api/projects/tasks", { title: "Complete audit" }).permitted).toBe(true);
    expect(isActionPermitted("/api/projects/tasks/task-999", { status: "COMPLETED" }).permitted).toBe(true);
    expect(isActionPermitted("/api/projects/proj-123/tasks", { title: "Subtask" }).permitted).toBe(true);

    // Permitted when enqueued through OfflineQueueManager
    const taskItem = OfflineQueueManager.enqueue({
      endpoint: "/api/projects/tasks",
      method: "POST",
      payload: { title: "Fix alignment", status: "TODO" },
    });
    expect(taskItem.endpoint).toBe("/api/projects/tasks");
    expect(taskItem.status).toBe("pending");

    // Strictly Blocked (Fail-Closed): Legacy /api/tasks endpoint is rejected
    expect(isActionPermitted("/api/tasks", { title: "Legacy task" }).permitted).toBe(false);
    expect(isActionPermitted("/api/tasks/task-123", { title: "Legacy task" }).permitted).toBe(false);
    expect(() =>
      OfflineQueueManager.enqueue({
        endpoint: "/api/tasks",
        method: "POST",
        payload: { title: "Old task" },
      })
    ).toThrow(/not on the permitted offline mutation allowlist/);

    // Strictly Blocked (Fail-Closed): Root projects, project details, and financial/administrative operations
    expect(isActionPermitted("/api/projects", { name: "New Project" }).permitted).toBe(false);
    expect(isActionPermitted("/api/projects/proj-123", { name: "Update" }).permitted).toBe(false);
    expect(isActionPermitted("/api/projects/proj-123/generate-invoice", {}).permitted).toBe(false);
    expect(isActionPermitted("/api/projects/proj-123/delete", {}).permitted).toBe(false);

    expect(() =>
      OfflineQueueManager.enqueue({
        endpoint: "/api/projects/proj-123/generate-invoice",
        method: "POST",
        payload: { note: "test" },
      })
    ).toThrow(/not on the permitted offline mutation allowlist/);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 18. [F-06] Quarantine Bounded Retention: Payload Sanitization
  // ─────────────────────────────────────────────────────────────────────────────
  it("18. [F-06] sanitizes large quarantined payloads exceeding 1KB while retaining actionable identifiers", () => {
    setupSession("tenant-alpha", "user-1");

    // Generate large payload (> 1KB) with both actionable metadata and bulky fields
    const largePayload = {
      id: "task-abc-123",
      title: "Actionable Task Title",
      type: "FEATURE",
      status: "IN_PROGRESS",
      priority: "HIGH",
      bulkyDebugLogs: "x".repeat(3000),
      rawStackTrace: "y".repeat(2000),
    };

    // Sanitize helper directly
    const sanitized = sanitizeQuarantinePayload<any>(largePayload);
    expect((sanitized as any)._quarantineSummary).toBe("Payload truncated to bound storage");
    expect((sanitized as any)._originalSize).toBeGreaterThan(QUARANTINE_POLICY.MAX_PAYLOAD_BYTES);
    expect(sanitized.id).toBe("task-abc-123");
    expect(sanitized.title).toBe("Actionable Task Title");
    expect(sanitized.type).toBe("FEATURE");
    expect(sanitized.status).toBe("IN_PROGRESS");
    expect(sanitized.priority).toBe("HIGH");
    expect((sanitized as any).bulkyDebugLogs).toBeUndefined();
    expect((sanitized as any).rawStackTrace).toBeUndefined();

    // Small payload is not modified
    const smallPayload = { id: "note-1", note: "short note" };
    expect(sanitizeQuarantinePayload(smallPayload)).toEqual(smallPayload);

    // Test through quarantineAction
    const item = OfflineQueueManager.enqueue({
      endpoint: "/api/notes",
      method: "POST",
      payload: largePayload,
    });
    OfflineQueueManager.quarantineAction(item, "Manual quarantine test");

    const quarantined = OfflineQueueManager.getQuarantine<any>("tenant-alpha", "user-1");
    expect(quarantined.length).toBe(1);
    expect((quarantined[0].payload as any)._quarantineSummary).toBe("Payload truncated to bound storage");
    expect((quarantined[0].payload as any).id).toBe("task-abc-123");
    expect((quarantined[0].payload as any).title).toBe("Actionable Task Title");
    expect((quarantined[0].payload as any).bulkyDebugLogs).toBeUndefined();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 19. [F-06] Quarantine Bounded Retention: TTL Expiration (14 Days)
  // ─────────────────────────────────────────────────────────────────────────────
  it("19. [F-06] evicts quarantined actions exceeding the 14-day TTL while preserving unexpired active queue items", () => {
    setupSession("tenant-alpha", "user-1");

    // Queue an active item (unexpired)
    OfflineQueueManager.enqueue({
      endpoint: "/api/notes",
      method: "POST",
      payload: { title: "Active Unexpired Note" },
    });
    expect(OfflineQueueManager.getQueue("tenant-alpha", "user-1").length).toBe(1);

    const now = Date.now();
    const fifteenDaysAgo = now - 15 * 24 * 60 * 60 * 1000;
    const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000;

    // Directly seed quarantine partition with an expired and an unexpired item
    const quarantineKey = "hrms_offline_quarantine_tenant-alpha_user-1";
    const seedItems = [
      {
        id: "expired-action-1",
        endpoint: "/api/notes",
        method: "POST",
        payload: { title: "Old expired action" },
        timestamp: fifteenDaysAgo,
        quarantinedAt: fifteenDaysAgo,
        attempts: 3,
        status: "quarantined",
        tenantId: "tenant-alpha",
        userId: "user-1",
        idempotencyKey: "idemp-old-1",
      },
      {
        id: "fresh-action-2",
        endpoint: "/api/notes",
        method: "POST",
        payload: { title: "Recent quarantined action" },
        timestamp: twoDaysAgo,
        quarantinedAt: twoDaysAgo,
        attempts: 3,
        status: "quarantined",
        tenantId: "tenant-alpha",
        userId: "user-1",
        idempotencyKey: "idemp-recent-2",
      },
    ];
    mockLocal.setItem(quarantineKey, JSON.stringify(seedItems));

    // Calling getQuarantine triggers auto-pruning according to policy
    const quarantined = OfflineQueueManager.getQuarantine("tenant-alpha", "user-1");
    expect(quarantined.length).toBe(1);
    expect(quarantined[0].id).toBe("fresh-action-2");

    // Active unexpired queue is completely intact and never modified
    const activeQueue = OfflineQueueManager.getQueue("tenant-alpha", "user-1");
    expect(activeQueue.length).toBe(1);
    expect(activeQueue[0].payload.title).toBe("Active Unexpired Note");
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 20. [F-06] Quarantine Bounded Retention: Maximum 50 Items FIFO Capping
  // ─────────────────────────────────────────────────────────────────────────────
  it("20. [F-06] bounds quarantine capacity to MAX_ITEMS (50) with FIFO eviction of oldest entries", () => {
    setupSession("tenant-alpha", "user-1");
    const quarantineKey = "hrms_offline_quarantine_tenant-alpha_user-1";

    // Create 60 quarantined items with incremental timestamps
    const baseTime = Date.now() - 100000;
    const items = [];
    for (let i = 1; i <= 60; i++) {
      items.push({
        id: `quarantine-${i}`,
        endpoint: "/api/projects/tasks",
        method: "POST",
        payload: { title: `Task ${i}` },
        timestamp: baseTime + i * 1000,
        quarantinedAt: baseTime + i * 1000,
        attempts: 3,
        status: "quarantined",
        tenantId: "tenant-alpha",
        userId: "user-1",
        idempotencyKey: `idemp-${i}`,
      });
    }
    mockLocal.setItem(quarantineKey, JSON.stringify(items));

    // Trigger pruning via pruneQuarantinePartition
    const pruned = pruneQuarantinePartition("tenant-alpha", "user-1");
    expect(pruned.length).toBe(QUARANTINE_POLICY.MAX_ITEMS); // exactly 50
    expect(pruned.length).toBe(50);

    // Oldest items (1 through 10) must have been evicted, newest 50 (11 through 60) retained
    const ids = pruned.map((i: any) => i.id);
    expect(ids).not.toContain("quarantine-1");
    expect(ids).not.toContain("quarantine-10");
    expect(ids).toContain("quarantine-11");
    expect(ids).toContain("quarantine-60");
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 21. [F-06] Strict Partition Isolation during Quarantine Retention Maintenance
  // ─────────────────────────────────────────────────────────────────────────────
  it("21. [F-06] enforces partition isolation so cleaning Tenant A quarantine never alters Tenant B", () => {
    // Tenant A partition
    setupSession("tenant-alpha", "user-1");
    const itemA = OfflineQueueManager.enqueue({
      endpoint: "/api/notes",
      method: "POST",
      payload: { title: "Tenant A action" },
    });
    OfflineQueueManager.quarantineAction(itemA, "Test A quarantine");

    // Tenant B partition
    setupSession("tenant-beta", "user-2");
    const itemB = OfflineQueueManager.enqueue({
      endpoint: "/api/notes",
      method: "POST",
      payload: { title: "Tenant B action" },
    });
    OfflineQueueManager.quarantineAction(itemB, "Test B quarantine");

    expect(OfflineQueueManager.getQuarantine("tenant-alpha", "user-1").length).toBe(1);
    expect(OfflineQueueManager.getQuarantine("tenant-beta", "user-2").length).toBe(1);

    // Prune/Clear Tenant A only
    OfflineQueueManager.clearQuarantine("tenant-alpha", "user-1");

    // Verify Tenant A is 0, Tenant B is completely unchanged
    expect(OfflineQueueManager.getQuarantine("tenant-alpha", "user-1").length).toBe(0);
    expect(OfflineQueueManager.getQuarantine("tenant-beta", "user-2").length).toBe(1);
    expect(OfflineQueueManager.getQuarantine("tenant-beta", "user-2")[0].payload.title).toBe("Tenant B action");
  });
});

