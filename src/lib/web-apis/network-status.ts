import { useState, useEffect, useCallback } from "react";
import type { NetworkStatusState, QueuedOfflineAction } from "./types";
import { storage } from "./storage";

const OFFLINE_QUEUE_STORAGE_KEY = "hrms_offline_action_queue";

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

/**
 * Offline Mutation Queue Manager: Automatically captures mutations made when offline
 * and replays them sequentially upon network recovery.
 */
export class OfflineQueueManager {
  static getQueue<T = any>(): QueuedOfflineAction<T>[] {
    return storage.local.getItem<QueuedOfflineAction<T>[]>(OFFLINE_QUEUE_STORAGE_KEY, []) || [];
  }

  static enqueue<T = any>(action: Omit<QueuedOfflineAction<T>, "id" | "timestamp" | "attempts" | "status">): QueuedOfflineAction<T> {
    const queue = this.getQueue<T>();
    const item: QueuedOfflineAction<T> = {
      ...action,
      id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      attempts: 0,
      status: "pending",
    };
    queue.push(item);
    storage.local.setItem(OFFLINE_QUEUE_STORAGE_KEY, queue);
    window.dispatchEvent(new CustomEvent("hrms:offline-queue-changed", { detail: { count: queue.length } }));
    return item;
  }

  static dequeue(id: string): void {
    const queue = this.getQueue();
    const updated = queue.filter((i) => i.id !== id);
    storage.local.setItem(OFFLINE_QUEUE_STORAGE_KEY, updated);
    window.dispatchEvent(new CustomEvent("hrms:offline-queue-changed", { detail: { count: updated.length } }));
  }

  static clear(): void {
    storage.local.removeItem(OFFLINE_QUEUE_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("hrms:offline-queue-changed", { detail: { count: 0 } }));
  }

  static async replayQueue(
    executor?: (action: QueuedOfflineAction) => Promise<boolean>
  ): Promise<{ synced: number; failed: number }> {
    const queue = this.getQueue();
    if (queue.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;

    for (const item of [...queue]) {
      try {
        let success = false;
        if (executor) {
          success = await executor(item);
        } else {
          // Default replay via fetch
          const res = await fetch(item.endpoint, {
            method: item.method,
            headers: { "Content-Type": "application/json" },
            body: item.payload ? JSON.stringify(item.payload) : undefined,
          });
          success = res.ok;
        }

        if (success) {
          this.dequeue(item.id);
          synced++;
        } else {
          item.attempts += 1;
          failed++;
        }
      } catch {
        item.attempts += 1;
        failed++;
      }
    }

    return { synced, failed };
  }
}

/**
 * Reactive React Hook for the Offline Queue
 */
export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedOfflineAction[]>(() => OfflineQueueManager.getQueue());
  const [isReplaying, setIsReplaying] = useState(false);

  useEffect(() => {
    function handleQueueChange() {
      setQueue(OfflineQueueManager.getQueue());
    }

    window.addEventListener("hrms:offline-queue-changed", handleQueueChange);
    return () => {
      window.removeEventListener("hrms:offline-queue-changed", handleQueueChange);
    };
  }, []);

  // Automatically trigger sync when coming back online
  useEffect(() => {
    async function handleOnline() {
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

  const enqueue = useCallback((action: Omit<QueuedOfflineAction, "id" | "timestamp" | "attempts" | "status">) => {
    return OfflineQueueManager.enqueue(action);
  }, []);

  const replay = useCallback(async () => {
    setIsReplaying(true);
    const result = await OfflineQueueManager.replayQueue();
    setIsReplaying(false);
    return result;
  }, []);

  const clear = useCallback(() => {
    OfflineQueueManager.clear();
  }, []);

  return {
    queue,
    queueCount: queue.length,
    isReplaying,
    enqueue,
    replay,
    clear,
  };
}
