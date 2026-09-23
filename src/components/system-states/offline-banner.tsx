import React, { useState, useEffect } from "react";
import { WifiOff, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    function onOnline() {
      setIsOffline(false);
      setDismissed(false);
      toast.success("Internet connection restored. Synchronizing data...");
    }
    function onOffline() {
      setIsOffline(true);
      setDismissed(false);
      toast.warning("Network connection lost. Running in offline resilient mode.");
    }

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (!isOffline || dismissed) return null;

  async function handleRetry() {
    setChecking(true);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      if (res.ok) {
        setIsOffline(false);
        toast.success("Connected to server successfully!");
        return;
      }
    } catch {
      toast.error("Still unable to reach server. Check network connection.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 px-4 py-2 text-xs font-medium shadow-md flex items-center justify-between transition-transform duration-300">
      <div className="flex items-center gap-2 max-w-4xl mx-auto flex-1">
        <WifiOff className="size-4 shrink-0 animate-pulse text-amber-900" />
        <span>
          <strong>Offline Mode Active:</strong> You are currently disconnected from the server.
          Changes are queued locally and will automatically sync when connection returns.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleRetry}
          disabled={checking}
          className="h-7 px-2.5 text-[11px] bg-amber-600 hover:bg-amber-700 text-white border-transparent gap-1"
        >
          <RefreshCw className={`size-3 ${checking ? "animate-spin" : ""}`} />
          Retry
        </Button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-amber-600/20 rounded transition-colors text-amber-900"
          title="Dismiss banner"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
