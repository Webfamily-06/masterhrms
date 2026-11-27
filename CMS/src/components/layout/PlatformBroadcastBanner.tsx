"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface ActiveBroadcast {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical" | "maintenance";
  dismissible: boolean;
  startsAt?: string;
  endsAt?: string | null;
}

const DISMISSED_STORAGE_KEY = "hrms_dismissed_platform_broadcasts";

function loadDismissedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DISMISSED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveDismissedIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    // Cap stored IDs to prevent unbounded localStorage growth
    window.localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(ids.slice(-100)));
  } catch {
    // Ignore storage quota or private-mode errors
  }
}

function mapSeverityToAlertConfig(severity: ActiveBroadcast["severity"]) {
  switch (severity) {
    case "critical":
      return {
        variant: "ghost-danger" as const,
        icon: <i className="ph ph-warning-octagon text-base leading-none" />,
      };
    case "warning":
      return {
        variant: "ghost-warning" as const,
        icon: <i className="ph ph-warning text-base leading-none" />,
      };
    case "maintenance":
      return {
        variant: "border-warning" as const,
        icon: <i className="ph ph-wrench text-base leading-none text-amber-600 dark:text-amber-400" />,
      };
    case "info":
    default:
      return {
        variant: "ghost-info" as const,
        icon: <i className="ph ph-info text-base leading-none" />,
      };
  }
}

export function PlatformBroadcastBanner() {
  const [mounted, setMounted] = React.useState(false);
  const [dismissedIds, setDismissedIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    setMounted(true);
    setDismissedIds(loadDismissedIds());
  }, []);

  const { data: broadcasts = [] } = useQuery<ActiveBroadcast[]>({
    queryKey: ["platform-active-broadcasts"],
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      try {
        const res = await api.get("/platform/broadcasts/active");
        const unwrapped = res?.data || res || {};
        if (Array.isArray(unwrapped)) return unwrapped;
        if (Array.isArray(unwrapped.broadcasts)) return unwrapped.broadcasts;
        return [];
      } catch {
        return [];
      }
    },
  });

  const handleDismiss = React.useCallback((id: string) => {
    setDismissedIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      saveDismissedIds(next);
      return next;
    });
  }, []);

  const visibleBroadcasts = React.useMemo(() => {
    if (!mounted) return [];
    return broadcasts.filter((b) => !b.dismissible || !dismissedIds.includes(b.id));
  }, [mounted, broadcasts, dismissedIds]);

  if (!mounted || visibleBroadcasts.length === 0) {
    return null;
  }

  return (
    <div className="px-4 lg:px-6 pt-3 space-y-2 max-w-7xl mx-auto" data-testid="platform-broadcast-banner">
      {visibleBroadcasts.map((broadcast) => {
        const cfg = mapSeverityToAlertConfig(broadcast.severity);
        return (
          <Alert
            key={broadcast.id}
            variant={cfg.variant}
            icon={cfg.icon}
            dismissible={broadcast.dismissible}
            onDismiss={broadcast.dismissible ? () => handleDismiss(broadcast.id) : undefined}
            className="py-3 px-4"
          >
            <AlertTitle className="text-xs sm:text-sm font-semibold mb-0.5">
              {broadcast.title}
            </AlertTitle>
            <AlertDescription className="text-xs opacity-90 whitespace-pre-line">
              {broadcast.message}
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
