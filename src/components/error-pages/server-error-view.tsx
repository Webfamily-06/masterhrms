import React, { useState } from "react";
import { Home, RefreshCw, ArrowLeft, AlertTriangle, Terminal, Copy, Check } from "lucide-react";

export interface ServerErrorViewProps {
  error?: Error | any;
  reset?: () => void;
  customTitle?: string;
  customMessage?: string;
}

export function ServerErrorView({
  error,
  reset,
  customTitle = "500 - Internal Server Error",
  customMessage = "Our server encountered an unexpected error or database interruption while processing your request.",
}: ServerErrorViewProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const errorString = error
    ? (error.name || "Error") + ": " + (error.message || String(error)) + (error.stack ? "\n\nStack Trace:\n" + error.stack : "")
    : "No detailed error payload recorded.";

  function handleCopy() {
    try {
      navigator.clipboard.writeText(errorString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  function handleReload() {
    if (reset) {
      try {
        reset();
      } catch {
        window.location.reload();
      }
    } else {
      window.location.reload();
    }
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col justify-between selection:bg-destructive/20 relative overflow-hidden font-sans">
      {/* Background Animated Destructive Flare */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-destructive/15 via-red-500/10 to-amber-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />

      {/* Top Application Navbar */}
      <header className="w-full max-w-5xl mx-auto px-6 py-5 flex items-center justify-between border-b border-border/40 relative z-10">
        <a href="/" className="flex items-center gap-2.5 group">
          <img
            src="/logo.webp"
            alt="Master ERP"
            className="h-8 w-auto object-contain transition-transform group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-foreground">
              Master ERP
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
              Enterprise Resilience
            </span>
          </div>
        </a>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-destructive/10 text-destructive border border-destructive/30">
            <span className="w-2 h-2 rounded-full bg-destructive animate-ping" />
            500 SERVER ERROR
          </span>
        </div>
      </header>

      {/* Main Centered Content */}
      <main className="w-full max-w-xl mx-auto px-6 py-10 flex flex-col items-center text-center relative z-10 my-auto">
        {/* Animated Illustration Stack */}
        <div className="relative w-full max-w-xs mx-auto flex items-center justify-center mb-6">
          {/* Glowing Pulse Rings */}
          <div className="absolute inset-0 m-auto w-64 h-64 rounded-full border border-destructive/20 animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-0 m-auto w-48 h-48 rounded-full border border-destructive/30 animate-pulse pointer-events-none" />

          {/* Main 500 Maintenance Illustration */}
          <img
            src="/images/pages/misc-under-maintenance.png"
            alt="500 Server Error"
            className="w-64 sm:w-72 h-auto object-contain select-none drop-shadow-2xl animate-in zoom-in-95 duration-500 relative z-10"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />

          {/* Floating Decorative 3D Gear Element */}
          <img
            src="/images/pages/misc-under-maintenance-object.png"
            alt="Gear Element"
            className="absolute -top-3 right-2 w-14 sm:w-16 h-auto object-contain select-none pointer-events-none z-20 animate-spin"
            style={{ animationDuration: '12s' }}
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        </div>

        {/* Text Details */}
        <div className="space-y-2 mb-8 max-w-md">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            {customTitle}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {customMessage}
          </p>
        </div>

        {/* 2 Primary Buttons: Home and Reload */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-sm">
          <a
            href="/dashboard"
            className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all active:scale-95"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </a>

          <button
            type="button"
            onClick={handleReload}
            className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl font-semibold text-sm border border-border bg-card/80 hover:bg-card hover:border-destructive/50 text-foreground shadow-xs transition-all active:scale-95"
          >
            <RefreshCw className="w-4 h-4 text-destructive" />
            Reload Page
          </button>
        </div>

        {/* Technical Error Details Toggle */}
        <div className="mt-6 w-full text-left">
          <div className="rounded-xl border border-border/60 bg-card/70 overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full px-4 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors flex items-center justify-between text-xs font-semibold text-foreground"
            >
              <span className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-amber-500" />
                Technical Error Stack
              </span>
              <span className="text-[11px] text-muted-foreground">
                {showDetails ? "Hide Log" : "View Log"}
              </span>
            </button>

            {showDetails && (
              <div className="p-3 bg-zinc-950 text-zinc-200 border-t border-border/40 font-mono text-[11px] space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                  <span className="text-zinc-400">Timestamp: {new Date().toLocaleTimeString()}</span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="overflow-x-auto max-h-48 text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {errorString}
                </pre>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Clean Footer */}
      <footer className="w-full max-w-5xl mx-auto px-6 py-4 border-t border-border/40 text-center text-xs text-muted-foreground relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>© 2026 Master ERP Enterprise Systems. Error telemetry logged.</span>
        <div className="flex items-center gap-4 text-xs">
          <a href="/helpdesk" className="hover:text-foreground transition-colors">Helpdesk</a>
          <a href="/maintenance" className="hover:text-foreground transition-colors">Maintenance</a>
          <a href="/" className="hover:text-foreground transition-colors">Home</a>
        </div>
      </footer>
    </div>
  );
}
