import { useState, useCallback, useRef, useEffect } from "react";
import type { ClipboardOptions, ClipboardState } from "./types";

/**
 * Check if the modern async Clipboard API is supported
 */
export function isClipboardSupported(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.clipboard && navigator.clipboard.writeText);
}

/**
 * Fallback copy using a temporary textarea & document.execCommand for legacy or insecure contexts
 */
function legacyCopy(text: string): boolean {
  if (typeof document === "undefined") return false;
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "-9999px";
    textArea.style.left = "-9999px";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

/**
 * Copy plain text to clipboard with modern API and legacy fallback
 */
export async function copyToClipboard(
  text: string,
  options?: ClipboardOptions
): Promise<boolean> {
  try {
    if (isClipboardSupported()) {
      await navigator.clipboard.writeText(text);
      options?.onSuccess?.(text);
      return true;
    }

    const legacySuccess = legacyCopy(text);
    if (legacySuccess) {
      options?.onSuccess?.(text);
      return true;
    }

    throw new Error("Clipboard write operation failed.");
  } catch (err: any) {
    const errorObj = err instanceof Error ? err : new Error(String(err));
    options?.onError?.(errorObj);
    return false;
  }
}

/**
 * Read text from clipboard
 */
export async function readFromClipboard(): Promise<string | null> {
  if (!isClipboardSupported() || !navigator.clipboard.readText) {
    return null;
  }
  try {
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
}

/**
 * Copy JSON or structured data with pretty printing
 */
export async function copyFormattedJson(data: any): Promise<boolean> {
  const jsonStr = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return copyToClipboard(jsonStr);
}

/**
 * Reactive React Hook for 1-click clipboard actions with automated reset timer
 */
export function useClipboard(options: ClipboardOptions = {}) {
  const { resetTimeoutMs = 2000, onSuccess, onError } = options;

  const [state, setState] = useState<ClipboardState>({
    copied: false,
    text: "",
    error: null,
    isSupported: typeof window !== "undefined",
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      if (timerRef.current) clearTimeout(timerRef.current);

      try {
        const success = await copyToClipboard(text, {
          onSuccess: (txt) => {
            setState({ copied: true, text: txt, error: null, isSupported: true });
            onSuccess?.(txt);
          },
          onError: (err) => {
            setState({ copied: false, text: "", error: err.message, isSupported: isClipboardSupported() });
            onError?.(err);
          },
        });

        if (success) {
          timerRef.current = setTimeout(() => {
            setState((prev) => ({ ...prev, copied: false }));
          }, resetTimeoutMs);
        }

        return success;
      } catch (err: any) {
        setState({
          copied: false,
          text: "",
          error: err.message || "Failed to copy",
          isSupported: isClipboardSupported(),
        });
        return false;
      }
    },
    [resetTimeoutMs, onSuccess, onError]
  );

  const read = useCallback(async (): Promise<string | null> => {
    const val = await readFromClipboard();
    if (val !== null) {
      setState((prev) => ({ ...prev, text: val }));
    }
    return val;
  }, []);

  return {
    ...state,
    copy,
    read,
  };
}
