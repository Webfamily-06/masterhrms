import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, LogOut, Mail, RefreshCw, PhoneCall, HelpCircle } from "lucide-react";
import { getPlatformBaseDomain } from "@/lib/platform-domain";

export interface SuspendedAccountViewProps {
  companyName: string;
  tenantId?: string;
  planName?: string;
  suspensionDate?: string;
  suspensionReason?: string;
  supportEmail?: string;
  onSignOut: () => void;
  onRefresh?: () => void;
}

export function SuspendedAccountView({
  companyName,
  tenantId,
  planName = "Enterprise Plan",
  suspensionDate,
  suspensionReason,
  supportEmail = `support@${getPlatformBaseDomain()}`,
  onSignOut,
  onRefresh,
}: SuspendedAccountViewProps) {
  const displayDate = suspensionDate
    ? new Date(suspensionDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Active Notice";

  return (
    <div className="min-h-screen w-full bg-linear-to-b from-slate-900 via-slate-950 to-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden select-none">
      {/* Subtle background glow effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[500px] bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 size-[300px] bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <img
            src="/logo.webp"
            alt="Master HRMS"
            className="h-8 w-auto object-contain brightness-0 invert opacity-90"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/favicon.webp";
            }}
          />
          <div className="hidden sm:block h-4 w-px bg-slate-700" />
          <span className="hidden sm:inline-block text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Security Control Plane
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="text-xs bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              <RefreshCw className="size-3.5 mr-1.5" /> Check Status
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
          >
            <LogOut className="size-3.5 mr-1.5" /> Sign Out
          </Button>
        </div>
      </header>

      {/* Center Hero Content */}
      <main className="w-full max-w-2xl mx-auto my-auto py-8 z-10 text-center flex flex-col items-center">
        {/* Animated Warning Icon Container */}
        <div className="relative mb-6">
          <div className="size-20 sm:size-24 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shadow-2xl shadow-rose-900/40 animate-pulse">
            <ShieldAlert className="size-10 sm:size-12 text-rose-400 animate-bounce duration-1000" />
          </div>
          <div className="absolute -bottom-1 -right-1 size-7 rounded-full bg-slate-900 border-2 border-rose-500/40 flex items-center justify-center">
            <span className="size-2.5 rounded-full bg-rose-500 animate-ping" />
          </div>
        </div>

        {/* Heading */}
        <Badge
          variant="outline"
          className="mb-3 px-3 py-1 bg-rose-950/60 text-rose-300 border-rose-800 text-xs font-semibold tracking-wide uppercase"
        >
          Workspace Suspended
        </Badge>

        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
          Account Access Temporarily Suspended
        </h1>

        <p className="text-sm sm:text-base text-slate-300 max-w-lg mb-8 leading-relaxed">
          Access to workspace <strong className="text-white underline underline-offset-4 font-semibold">{companyName}</strong> has been restricted by platform administration. All company modules, employee self-service, and business APIs are locked.
        </p>

        {/* Suspension Summary Card */}
        <Card className="w-full bg-slate-900/80 border-slate-800 p-5 sm:p-6 text-left space-y-4 mb-8 backdrop-blur-md shadow-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Organization / Workspace</span>
              <span className="font-semibold text-slate-200 text-sm">{companyName}</span>
              {tenantId && <span className="block text-[11px] font-mono text-slate-500">{tenantId}</span>}
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Subscription Tier</span>
              <span className="font-semibold text-slate-200 text-sm">{planName}</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Suspension Notice Date</span>
              <span className="font-semibold text-slate-200 text-sm">{displayDate}</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Account Status</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <span className="size-1.5 rounded-full bg-rose-400" /> Administrative Suspension
              </span>
            </div>
          </div>

          {suspensionReason && (
            <div className="pt-3 border-t border-slate-800/80 text-xs">
              <span className="text-slate-400 block mb-1">Administrative Note / Reason:</span>
              <p className="text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800 font-mono text-[11px]">
                {suspensionReason}
              </p>
            </div>
          )}
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          <Button
            asChild
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-2.5 h-11 shadow-lg"
          >
            <a href={`mailto:${supportEmail}?subject=Reactivation%20Inquiry:%20${encodeURIComponent(companyName)}%20(${tenantId || ""})`}>
              <Mail className="size-4 mr-2" /> Contact Platform Support
            </a>
          </Button>

          <Button
            variant="outline"
            onClick={onSignOut}
            className="w-full sm:w-auto bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white px-5 py-2.5 h-11"
          >
            <LogOut className="size-4 mr-2" /> Return to Login
          </Button>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="w-full max-w-5xl mx-auto pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 z-10">
        <div className="flex items-center gap-2">
          <span>Powered by WebFamily Master SaaS Architecture</span>
        </div>

        <div className="flex items-center gap-4">
          <a
            href={`mailto:${supportEmail}`}
            className="hover:text-slate-300 flex items-center gap-1 transition-colors"
          >
            <HelpCircle className="size-3.5" /> Support: {supportEmail}
          </a>
        </div>
      </footer>
    </div>
  );
}
