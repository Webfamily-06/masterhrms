import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, CreditCard, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

export interface SubscriptionFooterBarProps {
  planName?: string;
  expiresAt: string | Date;
  renewalUrl?: string;
  onRenew?: () => void;
}

export function SubscriptionFooterBar({
  planName = "Current Plan",
  expiresAt,
  renewalUrl = "/subscription",
  onRenew,
}: SubscriptionFooterBarProps) {
  if (!expiresAt) return null;

  const expiryTime = new Date(expiresAt).getTime();
  const nowTime = Date.now();
  const diffMs = expiryTime - nowTime;
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // Only show when 15 days or fewer remaining and not past expiration
  if (daysLeft <= 0 || daysLeft > 15) {
    return null;
  }

  const isCritical = daysLeft <= 1;
  const isUrgent = daysLeft <= 3;

  const messageText = (() => {
    if (daysLeft === 1) return "Your subscription expires tomorrow.";
    if (daysLeft <= 0) return "Your subscription expires today.";
    return `Your subscription expires in ${daysLeft} days.`;
  })();

  const formattedDate = new Date(expiresAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <aside
      aria-label="Subscription Expiry Notice"
      className="fixed bottom-0 left-0 right-0 z-40 px-3 py-2 sm:px-6 pointer-events-none"
    >
      <div
        className={`pointer-events-auto max-w-4xl mx-auto rounded-xl border p-2.5 sm:px-4 sm:py-2.5 shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 transition-all duration-300 ${
          isCritical
            ? "bg-red-950/90 border-red-700 text-red-100"
            : isUrgent
            ? "bg-amber-950/90 border-amber-700 text-amber-100"
            : "bg-slate-900/95 border-slate-700 text-slate-100"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
              isCritical
                ? "bg-red-500/20 text-red-400"
                : isUrgent
                ? "bg-amber-500/20 text-amber-400"
                : "bg-blue-500/20 text-blue-400"
            }`}
          >
            {isCritical ? (
              <AlertTriangle className="size-4 animate-bounce" />
            ) : (
              <Clock className="size-4" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-semibold truncate">{messageText}</span>
              <Badge
                variant="outline"
                className={`text-[10px] font-mono px-1.5 py-0 border-none ${
                  isCritical
                    ? "bg-red-500/20 text-red-300"
                    : isUrgent
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-blue-500/20 text-blue-300"
                }`}
              >
                {planName}
              </Badge>
            </div>
            <p className="text-[11px] opacity-80 truncate hidden sm:block">
              Expiry Date: <strong>{formattedDate}</strong>. Workspace access will be locked upon expiration.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          {onRenew ? (
            <Button
              size="sm"
              onClick={onRenew}
              className={`h-8 text-xs font-bold px-3.5 shadow-sm gap-1.5 w-full sm:w-auto ${
                isCritical
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : isUrgent
                  ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              }`}
            >
              <CreditCard className="size-3.5" /> Renew Plan <ArrowRight className="size-3" />
            </Button>
          ) : (
            <Button
              asChild
              size="sm"
              className={`h-8 text-xs font-bold px-3.5 shadow-sm gap-1.5 w-full sm:w-auto ${
                isCritical
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : isUrgent
                  ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              }`}
            >
              <Link to={renewalUrl}>
                <CreditCard className="size-3.5" /> Renew Plan <ArrowRight className="size-3" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
