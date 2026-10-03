import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Calendar, CreditCard, X, Clock } from "lucide-react";
import { Link } from "@tanstack/react-router";

export interface SubscriptionWarningPopupProps {
  tenantId: string;
  planName?: string;
  expiresAt: string | Date;
  renewalUrl?: string;
  onRenew?: () => void;
}

const THRESHOLDS = [15, 10, 5, 3, 2, 1];

export function SubscriptionWarningPopup({
  tenantId,
  planName = "Enterprise Plan",
  expiresAt,
  renewalUrl = "/subscription",
  onRenew,
}: SubscriptionWarningPopupProps) {
  const [open, setOpen] = useState(false);
  const [thresholdDays, setThresholdDays] = useState<number | null>(null);
  const [actualDaysLeft, setActualDaysLeft] = useState<number>(0);

  useEffect(() => {
    if (!expiresAt || !tenantId) return;

    const expiryTime = new Date(expiresAt).getTime();
    const nowTime = Date.now();
    const diffMs = expiryTime - nowTime;
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    setActualDaysLeft(daysLeft);

    // If expired or more than 15 days left, no warning popup needed
    if (daysLeft <= 0 || daysLeft > 15) {
      setOpen(false);
      return;
    }

    // Determine current matching threshold
    // If daysLeft is 1 -> threshold 1
    // If daysLeft is 2 -> threshold 2
    // If daysLeft is 3 -> threshold 3
    // If daysLeft is 4 or 5 -> threshold 5
    // If daysLeft is 6..10 -> threshold 10
    // If daysLeft is 11..15 -> threshold 15
    let matchedThreshold: number = 15;
    for (const t of [1, 2, 3, 5, 10, 15]) {
      if (daysLeft <= t) {
        matchedThreshold = t;
        break;
      }
    }

    setThresholdDays(matchedThreshold);

    // Check if dismissed for this specific threshold in localStorage
    const storageKey = `hrms_dismissed_expiry_warning_${matchedThreshold}_${tenantId}`;
    const isDismissed = localStorage.getItem(storageKey);

    if (!isDismissed) {
      setOpen(true);
    }
  }, [expiresAt, tenantId]);

  function handleDismiss() {
    if (thresholdDays && tenantId) {
      const storageKey = `hrms_dismissed_expiry_warning_${thresholdDays}_${tenantId}`;
      localStorage.setItem(storageKey, "true");
    }
    setOpen(false);
  }

  if (!open || thresholdDays === null || actualDaysLeft <= 0) {
    return null;
  }

  const isUrgent = actualDaysLeft <= 3;
  const isCritical = actualDaysLeft <= 1;

  const formattedExpiry = new Date(expiresAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleDismiss()}>
      <DialogContent className="sm:max-w-md border-amber-500/30 shadow-2xl p-0 overflow-hidden">
        {/* Banner Top Strip */}
        <div
          className={`p-4 text-white flex items-center justify-between ${
            isCritical ? "bg-red-600" : isUrgent ? "bg-amber-600" : "bg-blue-600"
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="size-5 shrink-0" />
            <span className="font-bold text-sm tracking-wide">
              {isCritical ? "Final Expiry Notice" : isUrgent ? "Urgent Expiry Notice" : "Subscription Expiry Notice"}
            </span>
          </div>
          <Badge variant="secondary" className="bg-white/20 text-white font-mono text-xs border-none">
            {actualDaysLeft} {actualDaysLeft === 1 ? "day" : "days"} left
          </Badge>
        </div>

        <div className="p-6 space-y-4">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-lg font-bold">
              Subscription Expiring Soon
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Your company workspace subscription reaches its end date shortly. Renew now to maintain uninterrupted access for your team.
            </DialogDescription>
          </DialogHeader>

          {/* Details breakdown */}
          <div className="p-4 rounded-xl bg-secondary/30 border space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Current Plan:</span>
              <span className="font-semibold text-foreground">{planName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Expiry Date:</span>
              <span className="font-semibold text-foreground flex items-center gap-1">
                <Calendar className="size-3.5 text-muted-foreground" /> {formattedExpiry}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Days Remaining:</span>
              <span className={`font-bold ${isCritical ? "text-red-500" : isUrgent ? "text-amber-500" : "text-blue-500"}`}>
                {actualDaysLeft === 1 ? "Tomorrow" : `${actualDaysLeft} Days`}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Closing this reminder will not affect your subscription. You can renew at any time via the billing settings or persistent footer prompt.
          </p>
        </div>

        <DialogFooter className="p-4 bg-secondary/10 border-t flex flex-row items-center justify-end gap-2 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-xs">
            Dismiss Reminder
          </Button>

          {onRenew ? (
            <Button
              size="sm"
              onClick={() => {
                handleDismiss();
                onRenew();
              }}
              className={`text-xs gap-1.5 font-bold ${
                isCritical
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : isUrgent
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              <CreditCard className="size-3.5" /> Renew Plan
            </Button>
          ) : (
            <Button
              asChild
              size="sm"
              onClick={handleDismiss}
              className={`text-xs gap-1.5 font-bold ${
                isCritical
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : isUrgent
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              <Link to={renewalUrl}>
                <CreditCard className="size-3.5" /> Renew Plan
              </Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
