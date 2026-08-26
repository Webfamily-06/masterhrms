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

  if (!settings?.maintenanceScheduled && !settings?.maintenanceMode) {
    return null;
  }

  const noticeMsg =
    settings?.maintenanceNoticeMessage ||
    `SYSTEM NOTICE: Scheduled platform maintenance in progress. Please save your work to prevent data loss.`;

  return (
    <div className="bg-red-600 text-white font-bold text-xs py-1.5 px-4 border-b border-red-700 shadow-md flex items-center gap-2">
      <div className="flex items-center gap-1.5 shrink-0 bg-red-800/90 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-mono shadow-xs">
        <Wrench className="size-3 animate-spin" /> MAINTENANCE NOTICE
      </div>

      <div className="flex-1 overflow-hidden relative whitespace-nowrap">
        <div className="inline-block animate-marquee pl-4 font-sans font-bold tracking-wide text-xs">
          {noticeMsg} — (Window: {settings?.maintenanceStartTime || "Upcoming"} to{" "}
          {settings?.maintenanceEndTime || "TBD"})
        </div>
      </div>
    </div>
  );
}
