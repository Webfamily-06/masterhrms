import { useState, useEffect, useCallback } from "react";
import type { NetworkStatusState, QueuedOfflineAction } from "./types";
import { storage } from "./storage";

const STORAGE_KEY_PREFIX = "hrms_offline_queue";
const QUARANTINE_KEY_PREFIX = "hrms_offline_quarantine";
const LEGACY_QUEUE_KEY = "hrms_offline_action_queue";

// Allowlist of endpoints permitted for offline buffering
const ALLOWED_OFFLINE_ENDPOINTS: RegExp[] = [
  /^\/api\/attendance\/(clock-in|clock-out|punch)/i,
  /^\/api\/notes(\/.*)?$/i,
  /^\/api\/projects\/tasks(\/[a-zA-Z0-9_-]+)?$/i,
  /^\/api\/projects\/[a-zA-Z0-9_-]+\/tasks$/i,
  /^\/api\/feedback(\/.*)?$/i,
  /^\/api\/telemetry(\/.*)?$/i,
];

// Sensitive, financial, statutory, payroll, or administrative patterns strictly blocked from offline storage
const DISALLOWED_SENSITIVE_PATTERNS: RegExp[] = [
  /payroll/i,
  /payslip/i,
  /statutory/i,
  /tax/i,
  /salary|salaries/i,
  /disbursement/i,
  /banking/i,
  /payments?|checkout/i,
  /billing|subscription/i,
  /auth|login|register|password|token|2fa|mfa/i,
  /users|roles|permissions/i,
  /settings|security|audit-log/i,
  /leaves\/(approve|reject)/i,
];

const SENSITIVE_PAYLOAD_KEYS = [
  "password",
  "token",
  "secret",
  "creditcard",
  "cvv",
  "bankaccount",
  "accountnumber",
  "pan",
  "pannumber",
  "aadhaar",
  "aadhaarnumber",
  "ssn",
  "salary",
  "amount",
  "bonus",
];

function containsSensitiveData(obj: any): boolean {
  if (!obj || typeof obj !== "object") return false;
  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_PAYLOAD_KEYS.some((sensitive) => lowerKey.includes(sensitive))) {
      return true;
    }
    if (typeof obj[key] === "object" && containsSensitiveData(obj[key])) {
      return true;
    }
  }
  return false;
}

export function isActionPermitted(endpoint: string, payload?: any): { permitted: boolean; reason?: string } {
  // 1. Check disallowed sensitive patterns
  for (const pattern of DISALLOWED_SENSITIVE_PATTERNS) {
    if (pattern.test(endpoint)) {
      return {
        permitted: false,
        reason: `Endpoint '${endpoint}' is restricted. Financial, payroll, statutory, and security actions cannot be queued offline.`,
      };
    }
  }

  // 2. Check sensitive keys in payload
  if (payload && containsSensitiveData(payload)) {
    return {
      permitted: false,
      reason: `Payload contains sensitive personal, financial, or security information that cannot be stored in browser offline storage.`,
    };
  }

  // 3. Match against permitted allowlist
  const isAllowed = ALLOWED_OFFLINE_ENDPOINTS.some((pattern) => pattern.test(endpoint));
  if (!isAllowed) {
    return {
      permitted: false,
      reason: `Endpoint '${endpoint}' is not on the permitted offline mutation allowlist.`,
    };
  }

  return { permitted: true };
}

export function getActiveSession(): { tenantId: string; userId: string; token: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const token =
      localStorage.getItem("hrms_auth_token") ||
      localStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      "";
    const rawUser = localStorage.getItem("hrms_user");
    if (!token || !rawUser) return null;
    const user = JSON.parse(rawUser);
    const tenantId = user.tenantId;
    const userId = user.userId || user.id;
    if (!tenantId || !userId) return null;
    return { tenantId: String(tenantId), userId: String(userId), token };
  } catch {
    return null;
  }
}

function getPartitionKey(tenantId: string, userId: string): string {
  return `${STORAGE_KEY_PREFIX}_${tenantId}_${userId}`;
}

function getQuarantineKey(tenantId: string, userId: string): string {
  return `${QUARANTINE_KEY_PREFIX}_${tenantId}_${userId}`;
}

// Clean unpartitioned legacy queue on module load
function purgeLegacyQueue(): void {
  if (typeof window !== "undefined") {
    try {
      if (storage.local.getItem(LEGACY_QUEUE_KEY)) {
        storage.local.removeItem(LEGACY_QUEUE_KEY);
      }
    } catch {}
  }
}
purgeLegacyQueue();

function getInitialNetworkState(): NetworkStatusState {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      isOnline: true,
      connectionType: "unknown",
      effectiveType: "unknown",
      downlink: null,
      rtt: null,
      since: new Date(),
    };
  }

  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

  return {
    isOnline: navigator.onLine,
    connectionType: conn?.type || "unknown",
    effectiveType: conn?.effectiveType || "4g",
    downlink: conn?.downlink ?? null,
    rtt: conn?.rtt ?? null,
    since: new Date(),
  };
}

/**
 * Reactive React Hook for Network Online / Offline Detection and Connection Telemetry
 */
export function useNetworkStatus(): NetworkStatusState {
  const [networkState, setNetworkState] = useState<NetworkStatusState>(getInitialNetworkState);

  useEffect(() => {
    function updateState() {
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      setNetworkState({
        isOnline: navigator.onLine,
        connectionType: conn?.type || "unknown",
        effectiveType: conn?.effectiveType || "4g",
        downlink: conn?.downlink ?? null,
        rtt: conn?.rtt ?? null,
        since: new Date(),
      });
    }

    window.addEventListener("online", updateState);
    window.addEventListener("offline", updateState);

    const conn = (navigator as any).connection;
    if (conn && conn.addEventListener) {
      conn.addEventListener("change", updateState);
    }

    return () => {
      window.removeEventListener("online", updateState);
      window.removeEventListener("offline", updateState);
      if (conn && conn.removeEventListener) {
        conn.removeEventListener("change", updateState);
      }
    };
  }, []);

  return networkState;
}

// Bounded retention policy for quarantined items
export const QUARANTINE_POLICY = {
  MAX_ITEMS: 50, // Maximum quarantined actions retained per user partition
  TTL_MS: 14 * 24 * 60 * 60 * 1000, // 14 days maximum retention
  MAX_PAYLOAD_BYTES: 1024, // 1 KB payload truncation ceiling
};

/**
 * Sanitizes quarantined payloads:
 * - Truncates excessively large payload bodies (> 1KB) to protect storage quotas.
 * - Retains actionable identifiers (title, name, type, id) while replacing bulky/sensitive blobs.
 */
export function sanitizeQuarantinePayload<T>(payload: T): T {
  if (!payload || typeof payload !== "object") return payload;
  try {
    const serialized = JSON.stringify(payload);
    if (serialized.length > QUARANTINE_POLICY.MAX_PAYLOAD_BYTES) {
      const summary: Record<string, any> = {
        _quarantineSummary: "Payload truncated to bound storage",
        _originalSize: serialized.length,
      };
      for (const key of ["id", "title", "name", "type", "tag", "status", "priority", "taskId"]) {
        if ((payload as any)[key] !== undefined) {
          summary[key] = (payload as any)[key];
        }
      }
      return summary as T;
    }
  } catch {}
  return payload;
}

/**
 * Prunes quarantined actions within a specific tenant/user partition:
 * 1. Evicts expired actions exceeding the TTL (14 days).
 * 2. Enforces maximum item boundary (FIFO: keeps the newest MAX_ITEMS items).
 * 3. Never modifies active pending queue actions or another tenant's partition.
 */
export function pruneQuarantinePartition<T = any>(
  tenantId: string,
  userId: string,
  customPolicy?: { maxItems?: number; ttlMs?: number }
): QueuedOfflineAction<T>[] {
  const key = getQuarantineKey(tenantId, userId);
  const rawList = storage.local.getItem<QueuedOfflineAction<T>[]>(key, []) || [];
  if (rawList.length === 0) return [];

  const maxItems = customPolicy?.maxItems ?? QUARANTINE_POLICY.MAX_ITEMS;
  const ttlMs = customPolicy?.ttlMs ?? QUARANTINE_POLICY.TTL_MS;
  const now = Date.now();

  // 1. Evict expired items
  let validItems = rawList.filter((item) => {
    const itemTime = item.quarantinedAt || item.timestamp;
    return now - itemTime <= ttlMs;
  });

  // 2. Enforce max item cap (FIFO eviction of oldest records if over capacity)
  if (validItems.length > maxItems) {
    validItems.sort((a, b) => (b.quarantinedAt || b.timestamp) - (a.quarantinedAt || a.timestamp));
    validItems = validItems.slice(0, maxItems).reverse();
  }

  // Update storage if changed
  if (validItems.length !== rawList.length) {
    storage.local.setItem(key, validItems);
  }

  return validItems;
}

/**
 * Offline Mutation Queue Manager
 * Strict Tenant Isolation, Session Context Validation, Allowlist Gating, and Idempotency Enforcement.
 */
export class OfflineQueueManager {
  private static isReplaying = false;

  static getQueue<T = any>(tenantId?: string, userId?: string): QueuedOfflineAction<T>[] {
    const session = getActiveSession();
    const effectiveTenant = tenantId || session?.tenantId;
    const effectiveUser = userId || session?.userId;
    if (!effectiveTenant || !effectiveUser) return [];

    const key = getPartitionKey(effectiveTenant, effectiveUser);
    return storage.local.getItem<QueuedOfflineAction<T>[]>(key, []) || [];
  }

  static getQuarantine<T = any>(tenantId?: string, userId?: string): QueuedOfflineAction<T>[] {
    const session = getActiveSession();
    const effectiveTenant = tenantId || session?.tenantId;
    const effectiveUser = userId || session?.userId;
    if (!effectiveTenant || !effectiveUser) return [];

    return pruneQuarantinePartition<T>(effectiveTenant, effectiveUser);
  }

  static pruneQuarantine(tenantId?: string, userId?: string, options?: { maxItems?: number; ttlMs?: number }): number {
    const session = getActiveSession();
    const effectiveTenant = tenantId || session?.tenantId;
    const effectiveUser = userId || session?.userId;
    if (!effectiveTenant || !effectiveUser) return 0;

    const remaining = pruneQuarantinePartition(effectiveTenant, effectiveUser, options);
    return remaining.length;
  }

  static enqueue<T = any>(
    action: Omit<QueuedOfflineAction<T>, "id" | "timestamp" | "attempts" | "status" | "tenantId" | "userId" | "idempotencyKey"> &
      Partial<Pick<QueuedOfflineAction<T>, "tenantId" | "userId" | "idempotencyKey">>
  ): QueuedOfflineAction<T> {
    const session = getActiveSession();
    const effectiveTenant = action.tenantId || session?.tenantId;
    const effectiveUser = action.userId || session?.userId;

    if (!effectiveTenant || !effectiveUser) {
      throw new Error("Cannot queue offline actions without authenticated tenant and user context.");
    }

    // Enforce allowlist and sensitive payload exclusion
    const check = isActionPermitted(action.endpoint, action.payload);
    if (!check.permitted) {
      throw new Error(check.reason || "Action is not permitted for offline queuing.");
    }

    const queue = this.getQueue<T>(effectiveTenant, effectiveUser);
    const idempotencyKey =
      action.idempotencyKey ||
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

    const item: QueuedOfflineAction<T> = {
      endpoint: action.endpoint,
      method: action.method,
      payload: action.payload as T,
      id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts: 3,
      status: "pending",
      tenantId: effectiveTenant,
      userId: effectiveUser,
      idempotencyKey,
    };

    queue.push(item);
    const key = getPartitionKey(effectiveTenant, effectiveUser);
    storage.local.setItem(key, queue);
    window.dispatchEvent(new CustomEvent("hrms:offline-queue-changed", { detail: { count: queue.length, tenantId: effectiveTenant, userId: effectiveUser } }));
    return item;
  }

  static dequeue(id: string, tenantId?: string, userId?: string): void {
    const session = getActiveSession();
    const effectiveTenant = tenantId || session?.tenantId;
    const effectiveUser = userId || session?.userId;
    if (!effectiveTenant || !effectiveUser) return;

    const queue = this.getQueue(effectiveTenant, effectiveUser);
    const updated = queue.filter((i) => i.id !== id);
    const key = getPartitionKey(effectiveTenant, effectiveUser);
    storage.local.setItem(key, updated);
    window.dispatchEvent(new CustomEvent("hrms:offline-queue-changed", { detail: { count: updated.length, tenantId: effectiveTenant, userId: effectiveUser } }));
  }

  static clear(tenantId?: string, userId?: string): void {
    const session = getActiveSession();
    const effectiveTenant = tenantId || session?.tenantId;
    const effectiveUser = userId || session?.userId;
    if (!effectiveTenant || !effectiveUser) return;

    const key = getPartitionKey(effectiveTenant, effectiveUser);
    storage.local.removeItem(key);
    window.dispatchEvent(new CustomEvent("hrms:offline-queue-changed", { detail: { count: 0, tenantId: effectiveTenant, userId: effectiveUser } }));
  }

  static clearQuarantine(tenantId?: string, userId?: string): void {
    const session = getActiveSession();
    const effectiveTenant = tenantId || session?.tenantId;
    const effectiveUser = userId || session?.userId;
    if (!effectiveTenant || !effectiveUser) return;

    const key = getQuarantineKey(effectiveTenant, effectiveUser);
    storage.local.removeItem(key);
    window.dispatchEvent(new CustomEvent("hrms:offline-quarantine-changed", { detail: { count: 0, tenantId: effectiveTenant, userId: effectiveUser } }));
  }

  static quarantineAction(item: QueuedOfflineAction, reason: string): void {
    const key = getQuarantineKey(item.tenantId, item.userId);
    const quarantine = pruneQuarantinePartition(item.tenantId, item.userId);
    const quarantinedItem: QueuedOfflineAction = {
      ...item,
      payload: sanitizeQuarantinePayload(item.payload),
      status: "quarantined",
      lastError: reason,
      quarantinedAt: Date.now(),
    };
    quarantine.push(quarantinedItem);

    // Enforce max boundary immediately (FIFO eviction if over limit)
    const boundedQuarantine =
      quarantine.length > QUARANTINE_POLICY.MAX_ITEMS
        ? quarantine.slice(quarantine.length - QUARANTINE_POLICY.MAX_ITEMS)
        : quarantine;

    storage.local.setItem(key, boundedQuarantine);
    this.dequeue(item.id, item.tenantId, item.userId);
    window.dispatchEvent(
      new CustomEvent("hrms:offline-quarantine-changed", {
        detail: { count: boundedQuarantine.length, item: quarantinedItem, reason },
      })
    );
  }

  /**
   * Deterministic Logout / Session Change Handler
   * Quarantines pending actions of the terminating session and resets the active queue.
   */
  static handleLogout(tenantId?: string, userId?: string): { quarantinedCount: number } {
    const session = getActiveSession();
    const effectiveTenant = tenantId || session?.tenantId;
    const effectiveUser = userId || session?.userId;

    if (!effectiveTenant || !effectiveUser) {
      return { quarantinedCount: 0 };
    }

    const queue = this.getQueue(effectiveTenant, effectiveUser);
    if (queue.length === 0) {
      return { quarantinedCount: 0 };
    }

    const quarantineKey = getQuarantineKey(effectiveTenant, effectiveUser);
    const existingQuarantine = pruneQuarantinePartition(effectiveTenant, effectiveUser);
    const quarantinedItems: QueuedOfflineAction[] = queue.map((item) => ({
      ...item,
      payload: sanitizeQuarantinePayload(item.payload),
      status: "quarantined",
      lastError: "Session terminated (logout). Quarantined to prevent cross-session replay.",
      quarantinedAt: Date.now(),
    }));

    const merged = [...existingQuarantine, ...quarantinedItems];
    const boundedMerged =
      merged.length > QUARANTINE_POLICY.MAX_ITEMS
        ? merged.slice(merged.length - QUARANTINE_POLICY.MAX_ITEMS)
        : merged;

    storage.local.setItem(quarantineKey, boundedMerged);
    this.clear(effectiveTenant, effectiveUser);

    window.dispatchEvent(
      new CustomEvent("hrms:offline-queue-session-invalidated", {
        detail: {
          tenantId: effectiveTenant,
          userId: effectiveUser,
          quarantinedCount: queue.length,
          reason: "LOGOUT",
        },
      })
    );

    return { quarantinedCount: queue.length };
  }

  static handleSessionChange(): void {
    window.dispatchEvent(new CustomEvent("hrms:offline-queue-changed", { detail: { count: this.getQueue().length } }));
  }

  /**
   * Replays queued mutations with mandatory server-side authentication, tenant-context verification,
   * idempotency key attachment, and non-blocking failure quarantining.
   */
  static async replayQueue(
    executor?: (action: QueuedOfflineAction) => Promise<boolean>
  ): Promise<{ synced: number; failed: number; skipped?: number; reason?: string }> {
    if (this.isReplaying) {
      return { synced: 0, failed: 0, skipped: 0, reason: "CONCURRENT_REPLAY_IN_PROGRESS" };
    }
    this.isReplaying = true;

    try {
      const session = getActiveSession();
      if (!session || !session.token || !session.tenantId || !session.userId) {
        return { synced: 0, failed: 0, skipped: 0, reason: "UNAUTHENTICATED" };
      }

      const queue = this.getQueue(session.tenantId, session.userId);
      if (queue.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;

    for (const item of [...queue]) {
      // Invariant 3: Tenant and User cross-contamination check
      if (item.tenantId !== session.tenantId || item.userId !== session.userId) {
        this.quarantineAction(
          item,
          `Tenant/User context mismatch: Queued under ${item.tenantId}/${item.userId}, but active session is ${session.tenantId}/${session.userId}.`
        );
        failed++;
        continue;
      }

      try {
        let success = false;
        if (executor) {
          success = await executor(item);
          if (success) {
            this.dequeue(item.id, session.tenantId, session.userId);
            synced++;
          } else {
            item.attempts += 1;
            if (item.attempts >= (item.maxAttempts || 3)) {
              this.quarantineAction(item, `Exceeded maximum retry attempts (${item.attempts}).`);
            } else {
              const queueKey = getPartitionKey(session.tenantId, session.userId);
              const currentQueue = this.getQueue(session.tenantId, session.userId);
              const idx = currentQueue.findIndex((i) => i.id === item.id);
              if (idx !== -1) {
                currentQueue[idx].attempts = item.attempts;
                storage.local.setItem(queueKey, currentQueue);
              }
            }
            failed++;
          }
        } else {
          // Replay via fetch with mandatory Authorization and Idempotency headers
          const res = await fetch(item.endpoint, {
            method: item.method,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.token}`,
              "X-Idempotency-Key": item.idempotencyKey,
              "X-Offline-Queued-At": item.timestamp.toString(),
              "X-Offline-Attempt": (item.attempts + 1).toString(),
            },
            body: item.payload ? JSON.stringify(item.payload) : undefined,
          });

          if (res.ok) {
            this.dequeue(item.id, session.tenantId, session.userId);
            synced++;
          } else if (res.status === 401) {
            // Invariant 5: Expired or revoked session -> Halt replay immediately
            item.status = "failed";
            item.errorStatus = 401;
            item.lastError = "Unauthorized: Session expired, revoked, or invalid.";
            const queueKey = getPartitionKey(session.tenantId, session.userId);
            const currentQueue = this.getQueue(session.tenantId, session.userId);
            const idx = currentQueue.findIndex((i) => i.id === item.id);
            if (idx !== -1) {
              currentQueue[idx].status = "failed";
              currentQueue[idx].errorStatus = 401;
              currentQueue[idx].lastError = item.lastError;
              storage.local.setItem(queueKey, currentQueue);
            }
            window.dispatchEvent(
              new CustomEvent("hrms:offline-queue-auth-error", {
                detail: { status: 401, error: item.lastError, item },
              })
            );
            failed++;
            break; // Stop replaying subsequent items until re-authenticated
          } else if (res.status === 403) {
            // Invariant 5 & 8: Forbidden / Tenant Mismatch / Permission Revoked -> Quarantine item
            const errorBody = await res.json().catch(() => ({}));
            const reason = errorBody.error || errorBody.message || "Forbidden: Insufficient permissions or workspace mismatch.";
            this.quarantineAction(item, reason);
            window.dispatchEvent(
              new CustomEvent("hrms:offline-queue-auth-error", {
                detail: { status: 403, error: reason, item },
              })
            );
            failed++;
          } else if (res.status >= 400 && res.status < 500) {
            // Invariant 6: Permanent validation or business logic error -> Quarantine, do not retry
            const errorBody = await res.json().catch(() => ({}));
            const reason = errorBody.error || errorBody.message || `Client validation error (${res.status}).`;
            this.quarantineAction(item, reason);
            window.dispatchEvent(
              new CustomEvent("hrms:offline-queue-permanent-error", {
                detail: { status: res.status, error: reason, item },
              })
            );
            failed++;
          } else {
            // 5xx Server Error: Transient failure -> increment attempts
            item.attempts += 1;
            if (item.attempts >= (item.maxAttempts || 3)) {
              this.quarantineAction(item, `Server error (${res.status}) after ${item.attempts} attempts.`);
            } else {
              const queueKey = getPartitionKey(session.tenantId, session.userId);
              const currentQueue = this.getQueue(session.tenantId, session.userId);
              const idx = currentQueue.findIndex((i) => i.id === item.id);
              if (idx !== -1) {
                currentQueue[idx].attempts = item.attempts;
                storage.local.setItem(queueKey, currentQueue);
              }
            }
            failed++;
          }
        }
      } catch (err: any) {
        // Network timeout / connection error during replay
        item.attempts += 1;
        if (item.attempts >= (item.maxAttempts || 3)) {
          this.quarantineAction(item, `Network connectivity failure after ${item.attempts} attempts: ${err?.message || "Unknown error"}`);
        } else {
          const queueKey = getPartitionKey(session.tenantId, session.userId);
          const currentQueue = this.getQueue(session.tenantId, session.userId);
          const idx = currentQueue.findIndex((i) => i.id === item.id);
          if (idx !== -1) {
            currentQueue[idx].attempts = item.attempts;
            storage.local.setItem(queueKey, currentQueue);
          }
        }
        failed++;
      }
    }

      window.dispatchEvent(new CustomEvent("hrms:offline-queue-changed", { detail: { count: this.getQueue(session.tenantId, session.userId).length } }));
      return { synced, failed };
    } finally {
      this.isReplaying = false;
    }
  }
}

// Global browser event listeners for session lifecycle
if (typeof window !== "undefined") {
  window.addEventListener("hrms:auth-logout", (e: any) => {
    OfflineQueueManager.handleLogout(e.detail?.tenantId, e.detail?.userId);
  });
  window.addEventListener("auth-token-changed", () => {
    OfflineQueueManager.handleSessionChange();
  });
}

/**
 * Reactive React Hook for the Offline Queue
 */
export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedOfflineAction[]>(() => OfflineQueueManager.getQueue());
  const [quarantined, setQuarantined] = useState<QueuedOfflineAction[]>(() => OfflineQueueManager.getQuarantine());
  const [isReplaying, setIsReplaying] = useState(false);

  useEffect(() => {
    function handleQueueChange() {
      setQueue(OfflineQueueManager.getQueue());
      setQuarantined(OfflineQueueManager.getQuarantine());
    }

    window.addEventListener("hrms:offline-queue-changed", handleQueueChange);
    window.addEventListener("hrms:offline-quarantine-changed", handleQueueChange);
    window.addEventListener("hrms:offline-queue-session-invalidated", handleQueueChange);
    window.addEventListener("auth-token-changed", handleQueueChange);

    return () => {
      window.removeEventListener("hrms:offline-queue-changed", handleQueueChange);
      window.removeEventListener("hrms:offline-quarantine-changed", handleQueueChange);
      window.removeEventListener("hrms:offline-queue-session-invalidated", handleQueueChange);
      window.removeEventListener("auth-token-changed", handleQueueChange);
    };
  }, []);

  // Automatically trigger sync when coming back online
  useEffect(() => {
    async function handleOnline() {
      const activeSession = getActiveSession();
      if (!activeSession) return;
      if (OfflineQueueManager.getQueue().length > 0) {
        setIsReplaying(true);
        await OfflineQueueManager.replayQueue();
        setIsReplaying(false);
      }
    }

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const enqueue = useCallback(
    (
      action: Omit<QueuedOfflineAction, "id" | "timestamp" | "attempts" | "status" | "tenantId" | "userId" | "idempotencyKey"> &
        Partial<Pick<QueuedOfflineAction, "tenantId" | "userId" | "idempotencyKey">>
    ) => {
      return OfflineQueueManager.enqueue(action);
    },
    []
  );

  const replay = useCallback(async () => {
    setIsReplaying(true);
    const result = await OfflineQueueManager.replayQueue();
    setIsReplaying(false);
    return result;
  }, []);

  const clear = useCallback(() => {
    OfflineQueueManager.clear();
  }, []);

  const clearQuarantine = useCallback(() => {
    OfflineQueueManager.clearQuarantine();
  }, []);

  return {
    queue,
    queueCount: queue.length,
    quarantined,
    quarantinedCount: quarantined.length,
    isReplaying,
    enqueue,
    replay,
    clear,
    clearQuarantine,
  };
}

