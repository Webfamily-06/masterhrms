import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useAppConfig } from "@/lib/useAppConfig";

export function MaintenanceBanner() {
  const { appConfig } = useAppConfig();
  const [dismissed, setDismissed] = useState(false);

  const isMaintenanceActive = Boolean(appConfig?.maintenance?.active);
  const message = appConfig?.maintenance?.message || "The platform is currently undergoing scheduled maintenance. Some services may be temporarily restricted.";

  if (!isMaintenanceActive || dismissed) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 left-0 right-0 z-[60] bg-red-600 text-white px-4 py-2 text-xs font-medium shadow-md flex items-center justify-between transition-transform duration-300"
    >
      <div className="flex items-center gap-2 max-w-4xl mx-auto flex-1">
        <AlertTriangle className="size-4 shrink-0 text-amber-200 animate-pulse" />
        <span>
          <strong className="font-semibold text-white">System Maintenance Active:</strong>{" "}
          <span className="text-red-100">{message}</span>
        </span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="p-1 hover:bg-red-700/50 rounded transition-colors text-red-200 hover:text-white"
        title="Dismiss notice"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
