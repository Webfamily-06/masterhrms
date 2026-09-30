import React, { useState } from "react";
import { RefreshCw, LogOut, Building2, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface WorkspaceUnavailableViewProps {
  error?: Error | any;
  onRetry: () => void | Promise<any>;
  onSignOut: () => void | Promise<any>;
}

export function WorkspaceUnavailableView({
  error,
  onRetry,
  onSignOut,
}: WorkspaceUnavailableViewProps) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      // Keep subtle spinner visible momentarily for visual feedback
      setTimeout(() => setRetrying(false), 500);
    }
  };

  // Safe sanitized message without technical leakage (no file paths or stack traces)
  const safeMessage =
    error?.status === 403
      ? "You do not currently have an active workspace assignment in this organization."
      : "The system encountered a momentary interruption while connecting to your organization workspace. Please retry or sign in again.";

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col justify-between selection:bg-amber-500/20 relative overflow-hidden font-sans">
      {/* Background Animated Ambient Flare */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-amber-500/10 via-orange-500/10 to-primary/5 rounded-full blur-3xl pointer-events-none"
        style={{ animationDuration: "5s" }}
      />

      {/* Top Navbar */}
      <header className="w-full max-w-5xl mx-auto px-6 py-5 flex items-center justify-between border-b border-border/40 relative z-10">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.webp"
            alt="Master ERP"
            className="h-8 w-auto object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
            loading="lazy"
          />
          <span className="font-bold text-sm tracking-tight text-foreground">
            Master ERP <span className="text-primary font-normal">Cloud</span>
          </span>
        </div>
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs px-2.5 py-0.5">
          Workspace Status
        </Badge>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10 my-auto">
        <div className="w-full max-w-lg bg-card/90 backdrop-blur-md border border-border/70 shadow-xl rounded-2xl p-6 sm:p-8 space-y-6 text-center animate-in fade-in-50 zoom-in-95 duration-200">
          {/* Status Icon */}
          <div className="mx-auto size-16 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner">
            <Building2 className="w-8 h-8 stroke-[1.75]" />
          </div>

          {/* Heading & Explanation */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Workspace Temporarily Unavailable</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Unable to Initialize Workspace
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              {safeMessage}
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
            <Button
              onClick={handleRetry}
              disabled={retrying}
              className="w-full sm:w-auto h-10 px-6 gap-2 text-xs font-semibold shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${retrying ? "animate-spin" : ""}`} />
              {retrying ? "Reconnecting..." : "Retry Connection"}
            </Button>
            <Button
              variant="outline"
              onClick={onSignOut}
              className="w-full sm:w-auto h-10 px-5 gap-2 text-xs font-medium border-border/70 hover:bg-muted/50"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </Button>
          </div>

          {/* Safe Diagnostic Code (no stack trace or paths leaked) */}
          <div className="border-t border-border/50 pt-4 flex items-center justify-between text-[11px] text-muted-foreground/80 px-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Secure Session Active
            </span>
            <span className="font-mono text-[10px]">
              ERR: {error?.code || "WORKSPACE_SYNC_RETRY"}
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border/40 text-xs text-muted-foreground relative z-10">
        <span>&copy; {new Date().getFullYear()} Master HRMS & ERP Cloud Platform.</span>
        <span className="text-[11px]">Strict Multi-Tenant Isolation &bull; End-to-End Encrypted</span>
      </footer>
    </div>
  );
}
