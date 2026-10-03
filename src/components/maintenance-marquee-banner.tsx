import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AlertTriangle, Wrench } from "lucide-react";

export function MaintenanceMarqueeBanner() {
  const { data: settings } = useQuery({
    queryKey: ["realtime-platform-settings-marquee"],
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/system-platform-settings");
        return page?.content || null;
      } catch {
        return null;
      }
    },
  });

  const isMaintenancePage =
    typeof window !== "undefined" && window.location.pathname.startsWith("/maintenance");
  if (isMaintenancePage) {
    return null;
  }

  if (!settings?.maintenanceScheduled && !settings?.maintenanceMode) {
    return null;
  }

  const noticeMsg =
    settings?.maintenanceNoticeMessage ||
    `SYSTEM NOTICE: Scheduled platform maintenance in progress. Please save your work to prevent data loss.`;

  const windowText =
    settings?.maintenanceStartTime && settings?.maintenanceEndTime
      ? ` (Window: ${settings.maintenanceStartTime} to ${settings.maintenanceEndTime})`
      : settings?.maintenanceEndTime
        ? ` (Estimated completion: ${settings.maintenanceEndTime})`
        : "";

  return (
    <div
      role="alert"
      className="bg-red-600 text-white font-bold text-xs py-1.5 px-4 border-b border-red-700 shadow-xs flex items-center gap-2"
    >
      <div className="flex items-center gap-1.5 shrink-0 bg-red-800/90 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-mono shadow-xs">
        <Wrench className="size-3 motion-safe:animate-spin" aria-hidden="true" /> MAINTENANCE NOTICE
      </div>

      <div className="flex-1 overflow-hidden relative whitespace-nowrap">
        <div className="inline-block motion-safe:animate-marquee pl-4 font-sans font-medium tracking-wide text-xs">
          {noticeMsg}
          {windowText}
        </div>
      </div>
    </div>
  );
}
