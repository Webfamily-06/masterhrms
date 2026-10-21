import { useState, useEffect, useCallback } from "react";
import type { StorageOptions, StoredItem } from "./types";

/**
 * In-memory fallback if localStorage/sessionStorage is blocked or full
 */
const memoryStore = new Map<string, string>();

function getStorageInstance(type: "local" | "session"): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    const s = type === "local" ? window.localStorage : window.sessionStorage;
    const testKey = "__storage_test__";
    s.setItem(testKey, "1");
    s.removeItem(testKey);
    return s;
  } catch {
    return null;
  }
}

/**
 * Core Web Storage Manager with typed retrieval, TTL expiration, and cross-tab reactive sync.
 */
class WebStorageManager {
  private type: "local" | "session";

  constructor(type: "local" | "session") {
    this.type = type;
  }

  private get store(): Storage | null {
    return getStorageInstance(this.type);
  }

  getItem<T>(key: string, defaultValue?: T, options?: StorageOptions<T>): T | null {
    try {
      let raw: string | null = null;
      if (this.store) {
        raw = this.store.getItem(key);
      } else {
        raw = memoryStore.get(`${this.type}:${key}`) || null;
      }

      if (raw === null) return defaultValue ?? null;

      // Check if wrapped in TTL envelope
      try {
        const parsed: StoredItem<T> = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && "value" in parsed) {
          if (parsed.expiry && Date.now() > parsed.expiry) {
            this.removeItem(key);
            return defaultValue ?? null;
          }
          return parsed.value;
        }
      } catch {
        // If not JSON or custom deserializer provided
      }

      if (options?.deserializer) {
        return options.deserializer(raw);
      }

      return JSON.parse(raw) as T;
    } catch {
      return defaultValue ?? null;
    }
  }

  setItem<T>(key: string, value: T, options?: StorageOptions<T>): boolean {
    try {
      const envelope: StoredItem<T> = {
        value,
        expiry: options?.ttlMs ? Date.now() + options.ttlMs : undefined,
      };

      const serialized = options?.serializer
        ? options.serializer(value)
        : JSON.stringify(envelope);

      if (this.store) {
        this.store.setItem(key, serialized);
      } else {
        memoryStore.set(`${this.type}:${key}`, serialized);
      }

      // Notify same-window listeners
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("hrms:storage-change", {
            detail: { key, storageArea: this.type, value },
          })
        );
      }
      return true;
    } catch (err: any) {
      options?.onError?.(err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }

  removeItem(key: string): void {
    if (this.store) {
      this.store.removeItem(key);
    } else {
      memoryStore.delete(`${this.type}:${key}`);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("hrms:storage-change", {
          detail: { key, storageArea: this.type, value: null },
        })
      );
    }
  }

  clear(): void {
    if (this.store) {
      this.store.clear();
    } else {
      for (const k of Array.from(memoryStore.keys())) {
        if (k.startsWith(`${this.type}:`)) {
          memoryStore.delete(k);
        }
      }
    }
  }

  has(key: string): boolean {
    return this.getItem(key) !== null;
  }
}

export const storage = {
  local: new WebStorageManager("local"),
  session: new WebStorageManager("session"),
};

/**
 * Reactive React Hook for LocalStorage with Cross-Tab & Same-Window Sync
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: StorageOptions<T>
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    const existing = storage.local.getItem<T>(key, initialValue, options);
    return existing ?? initialValue;
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value;
        storage.local.setItem(key, nextValue, options);
        return nextValue;
      });
    },
    [key, options]
  );

  const removeValue = useCallback(() => {
    storage.local.removeItem(key);
    setStoredValue(initialValue);
  }, [key, initialValue]);

  useEffect(() => {
    function handleStorageEvent(e: StorageEvent) {
      if (e.key === key && e.storageArea === window.localStorage) {
        try {
          const fresh = storage.local.getItem<T>(key, initialValue, options);
          setStoredValue(fresh ?? initialValue);
        } catch {
          setStoredValue(initialValue);
        }
      }
    }

    function handleLocalChange(e: Event) {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.key === key && customEvent.detail?.storageArea === "local") {
        setStoredValue(customEvent.detail.value ?? initialValue);
      }
    }

    window.addEventListener("storage", handleStorageEvent);
    window.addEventListener("hrms:storage-change", handleLocalChange);

    return () => {
      window.removeEventListener("storage", handleStorageEvent);
      window.removeEventListener("hrms:storage-change", handleLocalChange);
    };
  }, [key, initialValue, options]);

  return [storedValue, setValue, removeValue];
}

/**
 * Reactive React Hook for SessionStorage
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T,
  options?: StorageOptions<T>
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    const existing = storage.session.getItem<T>(key, initialValue, options);
    return existing ?? initialValue;
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value;
        storage.session.setItem(key, nextValue, options);
        return nextValue;
      });
    },
    [key, options]
  );

  const removeValue = useCallback(() => {
    storage.session.removeItem(key);
    setStoredValue(initialValue);
  }, [key, initialValue]);

  useEffect(() => {
    function handleLocalChange(e: Event) {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.key === key && customEvent.detail?.storageArea === "session") {
        setStoredValue(customEvent.detail.value ?? initialValue);
      }
    }

    window.addEventListener("hrms:storage-change", handleLocalChange);
    return () => {
      window.removeEventListener("hrms:storage-change", handleLocalChange);
    };
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
