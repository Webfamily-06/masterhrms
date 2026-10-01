import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ServerCrash,
  AlertTriangle,
  LifeBuoy,
  ShieldCheck,
} from "lucide-react";
import { useCurrentProfile } from "@/lib/session";
import { resolveDefaultRoute, extractRolesFromToken } from "@/lib/auth-navigation";
import { useTenantBranding } from "@/lib/useTenantBranding";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ServerErrorViewProps {
  error?: Error | any;
  reset?: () => void;
  customTitle?: string;
  customMessage?: string;
}

/**
 * Sanitize error message and stack trace to prevent leaking credentials,
 * API tokens, database connection strings, or internal secrets to end users.
 */
function sanitizeError(error?: Error | any): { summary: string; details: string; incidentId: string } {
  const timestamp = Date.now();
  const incidentId = `ERR-500-${timestamp.toString(36).toUpperCase()}`;

  if (!error) {
    return {
      summary: "Internal Server Error (HTTP 500)",
      details: `Incident ID: ${incidentId}\nTimestamp: ${new Date().toISOString()}\nStatus: 500 Internal Server Error\nDescription: An unexpected server-side error interrupted request processing.`,
      incidentId,
    };
  }

  let errorName = "Error";
  let errorMessage = "An unexpected server condition was encountered.";
  let errorStack = "";

  if (typeof error === "string") {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorName = error.name || "Error";
    errorMessage = error.message || String(error);
    errorStack = error.stack || "";
  } else if (typeof error === "object") {
    try {
      errorName = error.name || error.status || "Error";
      errorMessage = error.message || error.statusText || JSON.stringify(error);
      errorStack = error.stack || "";
    } catch {
      errorMessage = String(error);
    }
  }

  // Sanitize message & stack against credentials / sensitive patterns
  const sanitize = (text: string) =>
    text
      .replace(/(mysql|postgres|postgresql|mongodb(?:\+srv)?):\/\/([^:]+):([^@]+)@/gi, "$1://$2:***@")
      .replace(/Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi, "Bearer [REDACTED_TOKEN]")
      .replace(/(password|secret|apiKey|api_key|token|access_token|authorization)(["':= ]+)([^&\s"',]+)/gi, "$1$2[REDACTED]")
      .replace(/eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, "[REDACTED_JWT]");

  const cleanSummary = `${errorName}: ${sanitize(errorMessage)}`;
  const isDev = import.meta.env.DEV;

  let details = `Incident ID: ${incidentId}\nTimestamp: ${new Date().toISOString()}\nError: ${cleanSummary}`;
  if (isDev && errorStack) {
    details += `\n\nStack Trace (Dev Only):\n${sanitize(errorStack)}`;
  } else if (!isDev) {
    details += `\nEnvironment: Production\nNote: Detailed server callstack is withheld in production for security. Reference incident ID ${incidentId} in support tickets.`;
  }

  return {
    summary: cleanSummary,
    details,
    incidentId,
  };
}

export function ServerErrorView({
  error,
  reset,
  customTitle = "Oops, something went wrong",
  customMessage,
}: ServerErrorViewProps) {
  const { data: profile } = useCurrentProfile();
  const { branding } = useTenantBranding();
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Extract roles safely even when backend is offline
  const token = typeof window !== "undefined" ? localStorage.getItem("hrms_auth_token") : null;
  const tokenRoles = useMemo(() => extractRolesFromToken(token).roles, [token]);
  const activeRoles = profile?.roles?.length ? profile.roles : tokenRoles;
  const dashboardUrl = resolveDefaultRoute(activeRoles);

  const diagnostic = useMemo(() => sanitizeError(error), [error]);

  function handleCopy() {
    try {
      navigator.clipboard.writeText(diagnostic.details);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  function handleRetry() {
    if (isRetrying) return;
    setIsRetrying(true);
    try {
      if (reset) {
        reset();
        setTimeout(() => setIsRetrying(false), 1200);
      } else if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch {
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }
  }

  const lightLogo = branding?.isWhiteLabeled && branding?.logoUrl ? branding.logoUrl : "/logo.webp";
  const darkLogo =
    branding?.isWhiteLabeled && branding?.logoDark && branding.logoDark !== "/logo.webp"
      ? branding.logoDark
      : "/logo-white.webp";

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col justify-between selection:bg-rose-500/20 relative overflow-hidden font-sans">
      {/* Background Animated Ambient Gradient Orbs (Strictly clipped) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] max-w-full bg-gradient-to-tr from-rose-500/10 via-amber-500/10 to-orange-500/5 rounded-full blur-3xl"
          style={{ animation: "pulse 6s ease-in-out infinite" }}
        />
        <div className="absolute bottom-0 right-0 w-72 h-72 translate-x-12 translate-y-12 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Top Application Navbar / Header */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-5 flex items-center justify-between border-b border-border/40 relative z-10 min-w-0">
        <a href={dashboardUrl} className="flex items-center gap-2.5 sm:gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-1 min-w-0">
          {/* Light Theme Logo */}
          <div className="block dark:hidden shrink-0">
            <img
              src={lightLogo}
              alt="WebFamily Master HRMS"
              className="h-7 sm:h-9 w-auto object-contain transition-transform group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/logo.webp";
              }}
              loading="lazy"
            />
          </div>
          {/* Dark Theme Logo */}
          <div className="hidden dark:block shrink-0">
            <img
              src={darkLogo}
              alt="WebFamily Master HRMS"
              className="h-7 sm:h-9 w-auto object-contain transition-transform group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/logo-white.webp";
              }}
              loading="lazy"
            />
          </div>
          <div className="hidden sm:flex flex-col min-w-0">
            <span className="font-bold text-sm tracking-tight text-foreground leading-none truncate">
              {branding?.name || "WebFamily Master HRMS"}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">
              Enterprise Platform
            </span>
          </div>
        </a>

        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant="outline"
            className="px-2 sm:px-3 py-1 font-mono text-[10px] sm:text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1 sm:gap-1.5 shadow-xs whitespace-nowrap"
          >
            <span className="size-1.5 sm:size-2 rounded-full bg-rose-500 animate-ping" />
            <span className="inline sm:hidden">500 ERROR</span>
            <span className="hidden sm:inline">HTTP 500 &bull; SERVER ERROR</span>
          </Badge>
        </div>
      </header>

      {/* Main Content Area: Responsive 2-Column on Desktop, Stacked on Mobile */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-12 flex items-center justify-center relative z-10 min-w-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-14 items-center w-full my-auto min-w-0">
          {/* Left Column: Responsive Isometric 500 Server Error Illustration */}
          <div className="lg:col-span-6 flex justify-center items-center order-1 lg:order-1 min-w-0 w-full">
            <div className="relative max-w-[260px] sm:max-w-md lg:max-w-lg w-full flex justify-center items-center px-2">
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-rose-500/10 to-orange-500/5 rounded-full blur-2xl pointer-events-none -z-10" />
              <img
                src="/assets/img/bg/error-500.svg"
                alt="500 Internal Server Error Illustration"
                className="w-full max-h-[200px] sm:max-h-[360px] lg:max-h-[480px] object-contain drop-shadow-lg select-none transition-transform duration-300 hover:scale-[1.01]"
                loading="eager"
              />
            </div>
          </div>

          {/* Right Column: Error Context, Typography, Actions & Diagnostics */}
          <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left order-2 lg:order-2 min-w-0 w-full px-1">
            {/* Status Chip */}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold uppercase tracking-wider mb-3 sm:mb-4 border border-rose-500/20 shadow-xs">
              <ServerCrash className="size-3.5 shrink-0" />
              <span>HTTP 500 &bull; Server Error</span>
            </div>

            {/* Prominent Header */}
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground mb-3 leading-tight">
              {customTitle}
            </h1>

            {/* Explanatory Message */}
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mb-5 max-w-xl leading-relaxed">
              {customMessage ? (
                customMessage
              ) : (
                <>
                  Server Error 500. We apologise and are fixing the problem. Please try again at a later stage.
                </>
              )}
            </p>

            {/* Informational Guidance Notice */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-muted/60 border border-border/80 text-xs text-muted-foreground mb-6 max-w-xl w-full flex items-start gap-2.5 text-left shadow-xs">
              <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                Our engineering monitoring has flagged this exception. System databases and integrity remain protected. You can safely retry your operation or return to your workspace dashboard.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mb-6">
              <Button
                size="lg"
                asChild
                className="w-full sm:w-auto gap-2 font-semibold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground transition-all"
              >
                <a href={dashboardUrl}>
                  <ArrowLeft className="size-4" />
                  Back to Dashboard
                </a>
              </Button>

              <Button
                type="button"
                size="lg"
                variant="outline"
                onClick={handleRetry}
                disabled={isRetrying}
                className="w-full sm:w-auto gap-2 font-medium transition-all"
              >
                <RefreshCw className={cn("size-4", isRetrying && "animate-spin")} />
                {isRetrying ? "Retrying..." : "Retry Action"}
              </Button>
            </div>

            {/* Technical Diagnostic Disclosure */}
            <div className="w-full max-w-xl text-left border-t border-border/60 pt-4 mt-1">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                aria-expanded={showDetails}
                aria-controls="technical-diagnostic-panel"
                className="flex flex-wrap items-center justify-center lg:justify-start gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1.5 py-1 cursor-pointer mx-auto lg:mx-0"
              >
                {showDetails ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                <span>{showDetails ? "Hide technical diagnostic" : "Show technical diagnostic"}</span>
                <span className="text-[10px] text-muted-foreground/70 font-mono">({diagnostic.incidentId})</span>
              </button>

              {showDetails && (
                <div
                  id="technical-diagnostic-panel"
                  className="mt-3 p-3.5 sm:p-4 bg-slate-900 dark:bg-slate-950 text-slate-100 rounded-xl border border-slate-800 text-xs font-mono relative shadow-inner overflow-hidden w-full"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-400 gap-2">
                    <span className="flex items-center gap-1.5 font-medium truncate">
                      <ShieldCheck className="size-3.5 text-emerald-400 shrink-0" />
                      Sanitized Diagnostic Output
                    </span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] transition-colors cursor-pointer shrink-0"
                      title="Copy diagnostic information"
                    >
                      {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <pre className="text-slate-300 mb-0 text-[11px] sm:text-[11.5px] leading-relaxed whitespace-pre-wrap break-all max-h-52 overflow-y-auto pr-2">
                    {diagnostic.details}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-col sm:flex-row items-center justify-between border-t border-border/40 text-xs text-muted-foreground relative z-10 gap-3 text-center sm:text-left">
        <span className="leading-normal">
          &copy; {new Date().getFullYear()} Master ERP &bull; Webfamily Tech Solutions.{" "}
          <span className="block sm:inline">All rights reserved.</span>
        </span>
        <div className="flex items-center gap-4">
          <a
            href="/support-dashboard"
            className="hover:underline hover:text-foreground transition-colors flex items-center gap-1"
          >
            <LifeBuoy className="size-3.5" />
            Support Help Desk
          </a>
          <a
            href="/auth"
            className="hover:underline hover:text-foreground transition-colors"
          >
            Sign In
          </a>
        </div>
      </footer>
    </div>
  );
}
