import { useState, useEffect, useCallback, useRef } from "react";
import type { ResilientFetchOptions, FetchState } from "./types";

/**
 * Enhanced Resilient Fetch with AbortController, Timeout, and Exponential Backoff Retries
 */
export async function resilientFetch<T = any>(
  url: string,
  options: ResilientFetchOptions = {}
): Promise<T> {
  const {
    timeoutMs = 15000,
    retries = 2,
    retryDelayMs = 1000,
    onRetry,
    signal: userSignal,
    ...fetchOptions
  } = options;

  let attempt = 0;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timerId = setTimeout(() => {
      controller.abort(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    // Chain user signal if provided
    const combinedSignal = userSignal
      ? anySignal([userSignal, controller.signal])
      : controller.signal;

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: combinedSignal,
      });

      clearTimeout(timerId);

      if (!response.ok) {
        // Retry only on server errors (5xx) or rate limits (429)
        const isServerError = response.status >= 500 && response.status < 600;
        const isRateLimit = response.status === 429;

        if ((isServerError || isRateLimit) && attempt < retries) {
          throw new Error(`Server returned HTTP ${response.status}`);
        }

        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || errorBody.message || `HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return (await response.json()) as T;
      }
      return (await response.text()) as unknown as T;
    } catch (err: any) {
      clearTimeout(timerId);

      // Do not retry if aborted explicitly by the user
      if (userSignal?.aborted) {
        throw new Error("Request was aborted by user.");
      }

      if (attempt < retries) {
        attempt++;
        const backoff = retryDelayMs * Math.pow(2, attempt - 1) + Math.random() * 200;
        onRetry?.(attempt, err instanceof Error ? err : new Error(String(err)));
        await new Promise((r) => setTimeout(r, backoff));
      } else {
        throw err instanceof Error ? err : new Error(String(err));
      }
    }
  }

  throw new Error("Max fetch retries exceeded.");
}

/**
 * Helper to combine AbortSignals
 */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}

/**
 * Reactive React Hook for Fetching Data with cancellation and retry feedback
 */
export function useFetch<T = any>(
  url: string | null,
  options: ResilientFetchOptions = {}
) {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    error: null,
    isLoading: Boolean(url),
    isRetrying: false,
    attempt: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const executeFetch = useCallback(
    async (overrideUrl?: string) => {
      const targetUrl = overrideUrl || url;
      if (!targetUrl) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        isRetrying: false,
        attempt: 0,
      }));

      try {
        const data = await resilientFetch<T>(targetUrl, {
          ...options,
          signal: controller.signal,
          onRetry: (attemptNum, err) => {
            setState((prev) => ({
              ...prev,
              isRetrying: true,
              attempt: attemptNum,
              error: err,
            }));
            options.onRetry?.(attemptNum, err);
          },
        });

        setState({
          data,
          error: null,
          isLoading: false,
          isRetrying: false,
          attempt: 0,
        });
        return data;
      } catch (err: any) {
        if (!controller.signal.aborted) {
          const errorObj = err instanceof Error ? err : new Error(String(err));
          setState({
            data: null,
            error: errorObj,
            isLoading: false,
            isRetrying: false,
            attempt: 0,
          });
        }
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url, JSON.stringify(options)]
  );

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (url) {
      executeFetch();
    }
    return () => {
      abort();
    };
  }, [url, executeFetch, abort]);

  return {
    ...state,
    refetch: executeFetch,
    abort,
  };
}
