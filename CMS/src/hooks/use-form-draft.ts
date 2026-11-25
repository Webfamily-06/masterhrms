"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface StoredDraft<T> {
  updatedAt: number;
  data: T;
}

export interface UseFormDraftOptions<T> {
  /** Keys to omit before persisting to localStorage (e.g. ["password"]) */
  excludeKeys?: (keyof T | string)[];
  /** Debounce delay in ms (default: 250ms) */
  debounceMs?: number;
  /** Disable persistence conditionally */
  enabled?: boolean;
}

/**
 * Reusable React hook that auto-saves form state to localStorage and restores it
 * across browser refreshes (including custom Select dropdowns, multi-step state, and arrays).
 */
export function useFormDraft<T extends Record<string, any>>(
  storageKey: string,
  initialValue: T,
  options?: UseFormDraftOptions<T>
) {
  const { excludeKeys = [], debounceMs = 250, enabled = true } = options || {};
  const fullKey = `hrms_form_draft_hook_v1::${storageKey}`;

  const [state, setState] = useState<T>(initialValue);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const hydratedRef = useRef(false);
  const initialRef = useRef(initialValue);

  // Restore saved draft once on client mount (avoids SSR hydration mismatch)
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(fullKey);
      if (raw) {
        const parsed: StoredDraft<Partial<T>> = JSON.parse(raw);
        if (parsed?.updatedAt && Date.now() - parsed.updatedAt < DRAFT_TTL_MS && parsed.data) {
          setState((prev) => ({ ...prev, ...parsed.data }));
          setHasRestoredDraft(true);
          setLastSavedAt(parsed.updatedAt);
        } else {
          window.localStorage.removeItem(fullKey);
        }
      }
    } catch {
      // Ignore storage errors
    } finally {
      hydratedRef.current = true;
    }
  }, [fullKey, enabled]);

  // Persist changes (debounced) after initial hydration
  useEffect(() => {
    if (!enabled || !hydratedRef.current || typeof window === "undefined") return;

    const timer = window.setTimeout(() => {
      try {
        const sanitized: Record<string, any> = { ...state };
        for (const k of excludeKeys) {
          delete sanitized[String(k)];
        }
        const now = Date.now();
        const payload: StoredDraft<Record<string, any>> = {
          updatedAt: now,
          data: sanitized,
        };
        window.localStorage.setItem(fullKey, JSON.stringify(payload));
        setLastSavedAt(now);
      } catch {
        // Ignore quota / privacy mode errors
      }
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [state, fullKey, debounceMs, enabled]);

  const clearDraft = useCallback(
    (resetToInitial = false) => {
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem(fullKey);
        } catch {
          // Ignore
        }
      }
      setHasRestoredDraft(false);
      setLastSavedAt(null);
      if (resetToInitial) {
        setState(initialRef.current);
      }
    },
    [fullKey]
  );

  return {
    state,
    setState,
    hasRestoredDraft,
    lastSavedAt,
    clearDraft,
  };
}
