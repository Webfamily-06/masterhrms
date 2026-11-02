import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";

export type TurnstileState = 'idle' | 'loading' | 'ready' | 'verifying' | 'verified' | 'expired' | 'error';

export interface TurnstileWidgetRef {
  reset: () => void;
  getResponse: () => string | undefined;
  getState: () => TurnstileState;
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
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [widgetState, setWidgetState] = useState<TurnstileState>('idle');

    // Stable refs for callbacks — prevents widget teardown/reinit on every parent re-render
    // (inline arrow functions in JSX are recreated on every render; if used in deps they cause flicker)
    const onSuccessRef = useRef(onSuccess);
    const onErrorRef = useRef(onError);
    const onExpireRef = useRef(onExpire);
    useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);
    useEffect(() => { onErrorRef.current = onError; }, [onError]);
    useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

    const siteKey =
      (typeof process !== 'undefined'
        ? (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
           process.env.VITE_TURNSTILE_SITE_KEY ||
           process.env.TURNSTILE_SITE_KEY)
        : undefined) ||
      DEFAULT_TEST_SITE_KEY;

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (window.turnstile && widgetIdRef.current) {
          try {
            window.turnstile.reset(widgetIdRef.current);
            setWidgetState('ready');
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
      getState: () => widgetState,
    }));

    // Phase 1: Load Cloudflare script exactly once (no callback deps)
    useEffect(() => {
      let isMounted = true;

      if (window.turnstile) {
        setScriptLoaded(true);
        return;
      }

      const existingScript = document.querySelector(`script[src^="${SCRIPT_URL}"]`);
      if (existingScript) {
        // Script already injected — poll until API is ready
        const check = setInterval(() => {
          if (window.turnstile) {
            clearInterval(check);
            if (isMounted) setScriptLoaded(true);
          }
        }, 50);
        const bail = setTimeout(() => clearInterval(check), 10000);
        return () => {
          clearInterval(check);
          clearTimeout(bail);
          isMounted = false;
        };
      }

      setWidgetState('loading');
      const script = document.createElement("script");
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (isMounted) setScriptLoaded(true);
      };
      script.onerror = (e) => {
        console.error("Failed to load Cloudflare Turnstile script:", e);
        if (isMounted) {
          setWidgetState('error');
          onErrorRef.current?.(e);
        }
      };
      document.head.appendChild(script);

      return () => {
        isMounted = false;
      };
    }, []); // Run once only — no deps

    // Phase 2: Render widget once script is ready
    // IMPORTANT: Does NOT include onSuccess/onError/onExpire in deps — uses stable refs instead
    // This prevents the widget from being torn down and re-initialized on every keystroke
    useEffect(() => {
      if (!scriptLoaded || !containerRef.current || !window.turnstile) return;
      // Prevent duplicate render if widget is already mounted
      if (widgetIdRef.current) return;

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          cdata,
          theme,
          size,
          callback: (token: string) => {
            setWidgetState('verified');
            onSuccessRef.current(token);
          },
          "error-callback": (err: any) => {
            console.warn("[Turnstile Widget Error]", err);
            setWidgetState('error');
            onErrorRef.current?.(err);
          },
          "expired-callback": () => {
            setWidgetState('expired');
            onExpireRef.current?.();
          },
          "refresh-expired": "auto",
          retry: "auto",
        });

        widgetIdRef.current = id;
        setWidgetState('ready');
      } catch (err) {
        console.error("Turnstile render error:", err);
        setWidgetState('error');
        onErrorRef.current?.(err);
      }

      return () => {
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {}
          widgetIdRef.current = null;
        }
        setWidgetState('idle');
      };
    }, [scriptLoaded, siteKey, action, cdata, theme, size]); // No callback deps — stable refs used

    return (
      <div
        className={`turnstile-container min-h-[65px] flex flex-col items-center justify-center my-2 ${className}`}
        aria-label="Cloudflare Turnstile Bot Verification"
      >
        <div ref={containerRef} className="cf-turnstile-slot" />
        {(widgetState === 'loading' || (widgetState === 'idle' && !scriptLoaded)) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse py-3">
            <div className="size-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span>Verifying browser security...</span>
          </div>
        )}
        {widgetState === 'error' && (
          <div className="text-xs text-amber-600 dark:text-amber-400 py-1 text-center">
            Verification widget unreachable. Please check connection.
          </div>
        )}
        {widgetState === 'expired' && (
          <div className="text-xs text-amber-600 dark:text-amber-400 py-1 text-center">
            Security check expired. Refreshing automatically...
          </div>
        )}
      </div>
    );
  }
);

TurnstileWidget.displayName = "TurnstileWidget";
