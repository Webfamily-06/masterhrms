import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wrench, ShieldAlert, Clock, Mail, ArrowLeft, LifeBuoy } from "lucide-react";

export const Route = createFileRoute("/maintenance")({
  component: UnderMaintenancePage,
});

function UnderMaintenancePage() {
  const { data: settings } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      return data?.content as any;
    },
  });

  const appName = settings?.appName || "Master HRMS";
  const logoUrl = settings?.logoLightUrl;
  const noticeMsg = settings?.maintenanceNoticeMessage || "System maintenance is currently in progress. We are performing scheduled database and server upgrades to improve performance.";
  const startTime = settings?.maintenanceStartTime || "Today at 02:00 AM UTC";
  const endTime = settings?.maintenanceEndTime || "Today at 04:00 AM UTC";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6">
      {/* Top Header */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={appName} className="h-9 max-w-[140px] object-contain" />
          ) : (
            <div className="size-9 rounded-xl bg-red-600 text-white font-extrabold grid place-items-center text-sm shadow-md">
              M
            </div>
          )}
          <span className="font-bold text-sm tracking-wide text-slate-200">{appName}</span>
        </div>
        <Badge variant="outline" className="text-red-400 border-red-500/40 bg-red-500/10 gap-1.5 px-3 py-1 font-mono text-xs">
          <span className="size-2 rounded-full bg-red-500 animate-ping" /> System Under Maintenance
        </Badge>
      </header>

      {/* Main Content Hero */}
      <main className="max-w-2xl mx-auto w-full text-center space-y-6 py-12">
        <div className="size-20 mx-auto rounded-3xl bg-red-600/10 border border-red-500/30 text-red-500 grid place-items-center shadow-xl">
          <Wrench className="size-10 animate-bounce" />
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Under Scheduled Maintenance
          </h1>
          <p className="text-slate-400 text-base max-w-lg mx-auto leading-relaxed">
            {noticeMsg}
          </p>
        </div>

        {/* Schedule Timing Box */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 max-w-md mx-auto space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
            <span className="flex items-center gap-1.5 font-bold text-slate-300">
              <Clock className="size-3.5 text-amber-400" /> Scheduled Window:
            </span>
            <span className="text-emerald-400 font-semibold">Active Now</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Start Time:</span>
            <span className="font-bold">{startTime}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Estimated End:</span>
            <span className="font-bold">{endTime}</span>
          </div>
        </div>

        <div className="pt-4 flex flex-wrap gap-3 justify-center">
          <Button variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800 gap-2" asChild>
            <Link to="/super-login">
              <ShieldAlert className="size-4 text-amber-400" /> Super Admin Portal Login
            </Link>
          </Button>

          <Button variant="secondary" className="gap-2" asChild>
            <a href={`mailto:${settings?.supportEmail || "support@masterhrms.com"}`}>
              <LifeBuoy className="size-4" /> Contact Support
            </a>
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 border-t border-slate-900 pt-6">
        © 2026 {appName} Inc. All rights reserved. Maintenance operations in progress.
      </footer>
    </div>
  );
}
