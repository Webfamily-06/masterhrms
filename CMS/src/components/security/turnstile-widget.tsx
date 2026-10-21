import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";

export interface TurnstileWidgetRef {
  reset: () => void;
  getResponse: () => string | undefined;
}

export interface TurnstileWidgetProps {
  action?: string;
  onSuccess: (token: string) => void;
  onError?: (error?: any) => void;
  onExpire?: () => void;
  theme?: "auto" | "light" | "dark";
  size?: "normal" | "compact" | "flexible";
  className?: string;
  cdata?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        params: {
          sitekey: string;
          action?: string;
          cdata?: string;
          callback?: (token: string) => void;
          "error-callback"?: (error: any) => void;
          "expired-callback"?: () => void;
          theme?: "auto" | "light" | "dark";
          size?: "normal" | "compact" | "flexible";
          "refresh-expired"?: "auto" | "manual" | "never";
          retry?: "auto" | "never";
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string | undefined;
    };
    onTurnstileLoaded?: () => void;
  }
}

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
// Cloudflare's canonical always-passes dummy site key for testing and dev environments
const DEFAULT_TEST_SITE_KEY = "1x00000000000000000000AA";

export const TurnstileWidget = forwardRef<TurnstileWidgetRef, TurnstileWidgetProps>(
  (
    {
      action = "login",
      onSuccess,
      onError,
      onExpire,
      theme = "auto",
      size = "normal",
      className = "",
      cdata,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    const siteKey =
      (typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || process.env.VITE_TURNSTILE_SITE_KEY) : undefined) ||
      DEFAULT_TEST_SITE_KEY;

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (window.turnstile && widgetIdRef.current) {
          try {
            window.turnstile.reset(widgetIdRef.current);
          } catch (e) {
            console.warn("Turnstile reset error:", e);
          }
        }
      },
      getResponse: () => {
        if (window.turnstile && widgetIdRef.current) {
          try {
            return window.turnstile.getResponse(widgetIdRef.current);
          } catch {
            return undefined;
          }
        }
        return undefined;
      },
    }));

    useEffect(() => {
      let isMounted = true;

      // 1. Ensure Turnstile explicit script is loaded
      const loadScript = () => {
        if (window.turnstile) {
          if (isMounted) setIsLoaded(true);
          return;
        }

        const existingScript = document.querySelector(`script[src^="${SCRIPT_URL}"]`);
        if (!existingScript) {
          const script = document.createElement("script");
          script.src = SCRIPT_URL;
          script.async = true;
          script.defer = true;
          script.onload = () => {
            if (isMounted) setIsLoaded(true);
          };
          script.onerror = (e) => {
            console.error("Failed to load Cloudflare Turnstile script:", e);
            if (isMounted) {
              setHasError(true);
              onError?.(e);
            }
          };
          document.head.appendChild(script);
        } else {
          const checkInterval = setInterval(() => {
            if (window.turnstile) {
              clearInterval(checkInterval);
              if (isMounted) setIsLoaded(true);
            }
          }, 50);

          setTimeout(() => clearInterval(checkInterval), 5000);
        }
      };

      loadScript();

      return () => {
        isMounted = false;
      };
    }, [onError]);

    useEffect(() => {
      if (!isLoaded || !containerRef.current || !window.turnstile) return;

      // Clean up any existing widget before re-rendering
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          cdata,
          theme,
          size,
          callback: (token: string) => {
            setHasError(false);
            onSuccess(token);
          },
          "error-callback": (err: any) => {
            console.warn("[Turnstile Widget Error]", err);
            setHasError(true);
            onError?.(err);
          },
          "expired-callback": () => {
            onExpire?.();
          },
          "refresh-expired": "auto",
          retry: "auto",
        });

        widgetIdRef.current = id;
      } catch (err) {
        console.error("Turnstile render error:", err);
        setHasError(true);
        onError?.(err);
      }

      return () => {
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {}
          widgetIdRef.current = null;
        }
      };
    }, [isLoaded, siteKey, action, cdata, theme, size, onSuccess, onError, onExpire]);

    return (
      <div
        className={`turnstile-container min-h-[65px] flex flex-col items-center justify-center my-2 ${className}`}
        aria-label="Cloudflare Turnstile Bot Verification"
      >
        <div ref={containerRef} className="cf-turnstile-slot" />
        {!isLoaded && !hasError && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse py-3">
            <div className="size-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span>Verifying browser security...</span>
          </div>
        )}
        {hasError && (
          <div className="text-xs text-amber-600 dark:text-amber-400 py-1 text-center">
            Verification widget unreachable. Please check connection.
          </div>
        )}
      </div>
    );
  }
);

TurnstileWidget.displayName = "TurnstileWidget";
