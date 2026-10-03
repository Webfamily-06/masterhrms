import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPlatformBaseDomain } from "@/lib/platform-domain";
import {
  Clock,
  Home,
  LogIn,
  LifeBuoy,
  CheckCircle2,
  AlertCircle,
  Calendar,
  RotateCw,
} from "lucide-react";

export const Route = createFileRoute("/maintenance")({
  head: () => ({
    meta: [
      { title: "Under Scheduled Maintenance — Master HRMS" },
      {
        name: "description",
        content:
          "Our system is currently undergoing scheduled maintenance. Services will resume shortly.",
      },
    ],
  }),
  component: UnderMaintenancePage,
});

interface MaintenanceStatusResponse {
  active: boolean;
  scheduled: boolean;
  status: "active" | "scheduled" | "completed" | "operational";
  startTime: string | null;
  endTime: string | null;
  message: string | null;
  timezone: string;
  supportEmail: string;
  retryAfterSeconds: number | null;
}

function parseValidDate(dateString: string | null): Date | null {
  if (!dateString) return null;
  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateWithTimezone(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "UTC",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date);
  } catch {
    return date.toUTCString();
  }
}

function CountdownTimer({
  targetDate,
  onComplete,
}: {
  targetDate: Date;
  onComplete: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  }>(() => calculateTimeLeft(targetDate));

  function calculateTimeLeft(target: Date) {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) {
      return { hours: 0, minutes: 0, seconds: 0, isPast: true };
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return { hours, minutes, seconds, isPast: false };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = calculateTimeLeft(targetDate);
      setTimeLeft(remaining);
      if (remaining.isPast) {
        clearInterval(timer);
        onComplete();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  if (timeLeft.isPast) {
    return (
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-mono">
        <Clock className="size-3.5 text-amber-500" />
        <span>Maintenance window concluding... updating status.</span>
      </div>
    );
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      role="timer"
      aria-live="polite"
      className="inline-flex items-center gap-2 p-2 px-3 rounded-lg border bg-muted/40 font-mono text-xs"
    >
      <Clock className="size-3.5 text-primary shrink-0" aria-hidden="true" />
      <span className="text-muted-foreground font-sans">Estimated Remaining:</span>
      <span className="font-bold text-foreground">
        {pad(timeLeft.hours)}h : {pad(timeLeft.minutes)}m : {pad(timeLeft.seconds)}s
      </span>
    </div>
  );
}

function UnderMaintenancePage() {
  const {
    data: statusData,
    isLoading,
    isError,
    refetch,
  } = useQuery<MaintenanceStatusResponse>({
    queryKey: ["platform-maintenance-status"],
    queryFn: async () => {
      return await api.get<MaintenanceStatusResponse>("/system/maintenance-status");
    },
    refetchInterval: 15000, // Poll every 15 seconds to auto-detect maintenance completion
  });

  const isActive = statusData?.active ?? false;
  const isScheduled = statusData?.scheduled ?? false;
  const status = statusData?.status || (isActive ? "active" : "operational");
  const timezone = statusData?.timezone || "Asia/Kolkata";
  const supportEmail = statusData?.supportEmail || `support@${getPlatformBaseDomain()}`;

  const startDate = parseValidDate(statusData?.startTime || null);
  const endDate = parseValidDate(statusData?.endTime || null);
  const hasFutureEnd = endDate !== null && endDate.getTime() > Date.now();

  const isCompleted = status === "completed" || (!isActive && !isScheduled);

  return (
    <MarketingLayout>
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-20">
        <div className="w-full max-w-xl mx-auto flex flex-col items-center text-center space-y-6">
          {/* Status Badge */}
          {isLoading ? (
            <div className="h-6 w-32 rounded-full bg-muted animate-pulse" />
          ) : isCompleted ? (
            <Badge
              variant="outline"
              className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 gap-1.5 px-3 py-1 text-xs font-medium"
            >
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              All Systems Operational
            </Badge>
          ) : isScheduled && !isActive ? (
            <Badge
              variant="outline"
              className="text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10 gap-1.5 px-3 py-1 text-xs font-medium"
            >
              <Calendar className="size-3.5" aria-hidden="true" />
              Maintenance Scheduled
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10 gap-1.5 px-3 py-1 text-xs font-medium"
            >
              <span className="size-1.5 rounded-full bg-amber-500 motion-safe:animate-ping" />
              Active Maintenance
            </Badge>
          )}

          {/* Clean Vector SVG Illustration */}
          <div className="w-full max-w-[260px] md:max-w-[300px] text-primary/80 transition-opacity duration-300">
            <img
              src="/assets/img/maintenance-server.svg"
              alt="Server maintenance illustration"
              className="w-full h-auto drop-shadow-xs"
              loading="eager"
            />
          </div>

          {/* Heading and Description */}
          <div className="space-y-2.5 max-w-md">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {isCompleted
                ? "Systems Operational"
                : isScheduled && !isActive
                  ? "Scheduled Platform Maintenance"
                  : "Under Scheduled Maintenance"}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {isCompleted
                ? "Platform maintenance has concluded successfully. All services and databases are running normally."
                : statusData?.message ||
                  "We are performing scheduled infrastructure upgrades to ensure high reliability and performance. Access is temporarily restricted."}
            </p>
          </div>

          {/* Timing & Schedule Info Box (Rendered ONLY when valid data exists) */}
          {!isCompleted && (startDate || endDate) && (
            <div className="w-full max-w-md rounded-xl border bg-card/60 p-4 text-xs space-y-2.5 text-left shadow-2xs">
              <div className="font-semibold text-foreground flex items-center justify-between border-b pb-2">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="size-3.5 text-primary" aria-hidden="true" />
                  Maintenance Window
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Timezone: {timezone}
                </span>
              </div>

              <div className="space-y-1.5 font-mono">
                {startDate && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Scheduled Start:</span>
                    <span className="text-foreground font-medium">
                      {formatDateWithTimezone(startDate, timezone)}
                    </span>
                  </div>
                )}
                {endDate && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Estimated Completion:</span>
                    <span className="text-foreground font-medium">
                      {formatDateWithTimezone(endDate, timezone)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Real-time Countdown Indicator (Only rendered when valid future end time is configured) */}
          {!isCompleted && hasFutureEnd && (
            <CountdownTimer
              targetDate={endDate!}
              onComplete={() => {
                refetch();
              }}
            />
          )}

          {/* Fallback note when active without configured end time */}
          {!isCompleted && !hasFutureEnd && !isLoading && (
            <p className="text-xs text-muted-foreground/80 max-w-sm">
              Our engineering team is actively performing updates. Service will be restored as soon
              as tasks conclude.
            </p>
          )}

          {/* Safe Error Fallback Notice */}
          {isError && (
            <div
              role="alert"
              className="flex items-center gap-2 p-2.5 rounded-lg border border-border/80 bg-muted/30 text-xs text-muted-foreground max-w-md"
            >
              <AlertCircle className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span>
                Unable to refresh live status. The platform remains under maintenance.
              </span>
            </div>
          )}

          {/* Permitted Navigation Actions */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            {/* Primary Action Button */}
            {isCompleted ? (
              <Button asChild size="default">
                <Link to="/hrm-dashboard">
                  <Home className="size-4 mr-2" aria-hidden="true" />
                  Go to Workspace
                </Link>
              </Button>
            ) : (
              <Button asChild size="default">
                <Link to="/">
                  <Home className="size-4 mr-2" aria-hidden="true" />
                  Return to Home
                </Link>
              </Button>
            )}

            {/* Standard Sign In Route */}
            <Button variant="outline" asChild size="default">
              <Link to="/auth">
                <LogIn className="size-4 mr-2" aria-hidden="true" />
                Sign In
              </Link>
            </Button>

            {/* Contact Support Link */}
            <Button variant="ghost" asChild size="default">
              <a href={`mailto:${supportEmail}`}>
                <LifeBuoy className="size-4 mr-2" aria-hidden="true" />
                Contact Support
              </a>
            </Button>

            {/* Manual Refresh Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              title="Refresh status"
              aria-label="Refresh status"
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCw
                className={`size-4 ${isLoading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
            </Button>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
