import React, { useState, useEffect } from "react";
import { WifiOff, RefreshCw, ShoppingCart, Home, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export interface OfflineViewProps {
  onReconnected?: () => void;
}

export function OfflineView({ onReconnected }: OfflineViewProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      toast.success("Network connection restored!");
      if (onReconnected) onReconnected();
    }
    function handleOffline() {
      setIsOnline(false);
      toast.error("Internet disconnected. Running in offline mode.");
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [onReconnected]);

  async function checkConnection() {
    setIsChecking(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch("/api/health", { signal: controller.signal, cache: "no-store" });
      clearTimeout(timeoutId);
      if (res.ok) {
        setIsOnline(true);
        toast.success("Server connection verified! Reloading...");
        setTimeout(() => window.location.reload(), 600);
        return;
      }
    } catch {
      // Still offline
    } finally {
      setIsChecking(false);
    }
    toast.error("Still offline. Please check your Wi-Fi or network cable.");
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col justify-between selection:bg-amber-500/20 relative overflow-hidden font-sans">
      {/* Background Animated Gradient Orb */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-amber-500/15 via-orange-500/10 to-yellow-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"
        style={{ animationDuration: "5s" }}
      />

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
              Offline Resiliency
            </span>
          </div>
        </a>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="px-3 py-1 font-mono text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1.5"
          >
            <span className="size-2 rounded-full bg-amber-500 animate-ping" />
            NO INTERNET DETECTED
          </Badge>
        </div>
      </header>

      {/* Main Centered Content */}
      <main className="w-full max-w-xl mx-auto px-6 py-10 flex flex-col items-center text-center relative z-10 my-auto">
        {/* Animated WifiOff Icon Container */}
        <div className="relative mb-6">
          <div className="size-24 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xl shadow-amber-500/10">
            <WifiOff className="size-12 stroke-[1.75] animate-pulse" />
          </div>
          <div className="absolute -bottom-2 -right-2 size-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shadow-md">
            <AlertTriangle className="size-4" />
          </div>
        </div>

        {/* Header Text */}
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl mb-3">
          You're Currently Offline
        </h1>
        <p className="text-base text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
          It looks like you've lost your network connection. Any locally cached ERP data and offline POS registers remain accessible.
        </p>

        {/* Offline Features Pill Card */}
        <div className="mb-6 p-4 rounded-xl bg-muted/50 border border-border/80 text-xs text-left max-w-md w-full space-y-2.5 shadow-xs">
          <div className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-emerald-600" /> Offline Protected Capabilities
          </div>
          <div className="flex items-start gap-2 text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <span><strong>POS Billing:</strong> Scan barcodes, ring up sales, and print thermal receipts offline without server dependency.</span>
          </div>
          <div className="flex items-start gap-2 text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <span><strong>Local Queue:</strong> Completed sales queue into browser IndexedDB and auto-synchronize once reconnected.</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md justify-center">
          <Button
            size="lg"
            className="w-full sm:w-auto gap-2 font-semibold shadow-md bg-amber-600 hover:bg-amber-700 text-white"
            onClick={checkConnection}
            disabled={isChecking}
          >
            <RefreshCw className={`size-4 ${isChecking ? "animate-spin" : ""}`} />
            {isChecking ? "Checking Network..." : "Try Reconnecting"}
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto gap-2 font-medium"
            onClick={() => {
              window.location.href = "/pos";
            }}
          >
            <ShoppingCart className="size-4" /> Open Offline POS
          </Button>

          <Button
            variant="ghost"
            size="lg"
            className="w-full sm:w-auto gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => {
              window.location.href = "/dashboard";
            }}
          >
            <Home className="size-4" /> Dashboard
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-t border-border/40 text-xs text-muted-foreground relative z-10 gap-2">
        <span>&copy; {new Date().getFullYear()} Master ERP. Offline sync active.</span>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Offline Worker Ready</span>
        </div>
      </footer>
    </div>
  );
}
