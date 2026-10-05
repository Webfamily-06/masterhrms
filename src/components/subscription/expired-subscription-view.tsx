import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CreditCard, LogOut, Mail, RefreshCw, AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getPlatformBaseDomain } from "@/lib/platform-domain";

export interface ExpiredSubscriptionViewProps {
  companyName: string;
  tenantId?: string;
  planName?: string;
  expiryDate?: string;
  supportEmail?: string;
  renewalUrl?: string;
  onSignOut: () => void;
  onRefresh?: () => void;
  onRenew?: () => void;
}

export function ExpiredSubscriptionView({
  companyName,
  tenantId,
  planName = "Enterprise Plan",
  expiryDate,
  supportEmail = `support@${getPlatformBaseDomain()}`,
  renewalUrl = "/subscription",
  onSignOut,
  onRefresh,
  onRenew,
}: ExpiredSubscriptionViewProps) {
  const formattedExpiry = expiryDate
    ? new Date(expiryDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Recent Expiry";

  return (
    <div className="min-h-screen w-full bg-linear-to-b from-slate-900 via-slate-950 to-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden select-none">
      {/* Decorative radial gradients */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 size-[550px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 right-1/4 size-[400px] bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <img
            src="/white-logo.webp"
            alt="Master HRMS"
            className="h-8 w-auto object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/favicon.webp";
            }}
          />
          <div className="hidden sm:block h-4 w-px bg-slate-700" />
          <span className="hidden sm:inline-block text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Subscription Control
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
            className="text-xs text-slate-400 hover:text-white hover:bg-slate-800/60"
          >
            <LogOut className="size-3.5 mr-1.5" /> Sign Out
          </Button>
        </div>
      </header>

      {/* Main Lockout Hero */}
      <main className="w-full max-w-2xl mx-auto my-auto py-8 z-10 text-center flex flex-col items-center">
        {/* Animated Icon */}
        <div className="relative mb-6">
          <div className="size-20 sm:size-24 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-2xl shadow-amber-900/40">
            <Clock className="size-10 sm:size-12 text-amber-400 animate-pulse duration-1000" />
          </div>
          <div className="absolute -bottom-1 -right-1 size-7 rounded-full bg-slate-900 border-2 border-amber-500/40 flex items-center justify-center">
            <AlertTriangle className="size-3.5 text-amber-400" />
          </div>
        </div>

        {/* Heading */}
        <Badge
          variant="outline"
          className="mb-3 px-3 py-1 bg-amber-950/60 text-amber-300 border-amber-800 text-xs font-semibold tracking-wide uppercase"
        >
          Subscription Expired
        </Badge>

        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
          Your Subscription Has Expired
        </h1>

        <p className="text-sm sm:text-base text-slate-300 max-w-lg mb-8 leading-relaxed">
          The subscription plan for <strong className="text-white underline underline-offset-4 font-semibold">{companyName}</strong> expired on <strong className="text-white">{formattedExpiry}</strong>. All workspace modules and employee features are currently locked.
        </p>

        {/* Expiry Details Card */}
        <Card className="w-full bg-slate-900/80 border-slate-800 p-5 sm:p-6 text-left space-y-4 mb-8 backdrop-blur-md shadow-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Workspace / Company</span>
              <span className="font-semibold text-slate-200 text-sm">{companyName}</span>
              {tenantId && <span className="block text-[11px] font-mono text-slate-500">{tenantId}</span>}
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Expired Plan Tier</span>
              <span className="font-semibold text-slate-200 text-sm">{planName}</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Official Expiration Date</span>
              <span className="font-semibold text-rose-300 text-sm">{formattedExpiry}</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Access Status</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <span className="size-1.5 rounded-full bg-rose-400" /> Locked (Renewal Required)
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 text-xs text-slate-400 leading-relaxed">
            All company attendance, payroll records, and employee documents remain secure in our encrypted database. Workspace access will be immediately restored upon renewing your subscription.
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          {onRenew ? (
            <Button
              onClick={onRenew}
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-2.5 h-11 shadow-lg gap-2"
            >
              <CreditCard className="size-4" /> Renew Subscription Now <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button
              asChild
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-2.5 h-11 shadow-lg gap-2"
            >
              <Link to={renewalUrl}>
                <CreditCard className="size-4" /> Renew Subscription Now <ArrowRight className="size-4" />
              </Link>
            </Button>
          )}

          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white px-5 py-2.5 h-11"
          >
            <a href={`mailto:${supportEmail}?subject=Renewal%20Assistance:%20${encodeURIComponent(companyName)}%20(${tenantId || ""})`}>
              <Mail className="size-4 mr-2" /> Contact Support
            </a>
          </Button>

          <Button
            variant="ghost"
            onClick={onSignOut}
            className="w-full sm:w-auto text-slate-400 hover:text-white hover:bg-slate-800/40 px-4 py-2.5 h-11"
          >
            <LogOut className="size-4 mr-2" /> Sign Out
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 z-10">
        <div>
          <span>Enterprise Multi-Tenant SaaS Platform</span>
        </div>
        <div>
          <a href={`mailto:${supportEmail}`} className="hover:text-slate-300 transition-colors">
            Support Desk: {supportEmail}
          </a>
        </div>
      </footer>
    </div>
  );
}
