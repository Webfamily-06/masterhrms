import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LoadingStateProps {
  variant?: "table" | "cards" | "stats" | "spinner" | "fullscreen";
  rows?: number;
  message?: string;
  className?: string;
}

export function LoadingState({
  variant = "spinner",
  rows = 5,
  message = "Loading data...",
  className,
}: LoadingStateProps) {
  if (variant === "fullscreen") {
    return (
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-300">
        <div className="relative mb-4">
          <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
            <Loader2 className="size-8 animate-spin" />
          </div>
          <div className="absolute inset-0 size-16 rounded-2xl border-2 border-primary/30 animate-ping pointer-events-none" style={{ animationDuration: "2.5s" }} />
        </div>
        <div className="font-bold text-sm text-foreground tracking-wide mb-1">
          {message}
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          Master HRMS & ERP Enterprise Engine
        </div>
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className={cn("w-full border rounded-xl overflow-hidden bg-card/50", className)}>
        {/* Skeleton Table Header */}
        <div className="h-10 bg-muted/60 border-b flex items-center px-4 gap-4 animate-pulse">
          <div className="h-3.5 bg-muted rounded w-1/6" />
          <div className="h-3.5 bg-muted rounded w-1/4" />
          <div className="h-3.5 bg-muted rounded w-1/6" />
          <div className="h-3.5 bg-muted rounded w-1/5 ml-auto" />
        </div>

        {/* Skeleton Table Rows */}
        <div className="divide-y divide-border/60">
          {Array.from({ length: rows }).map((_, idx) => (
            <div key={idx} className="h-14 px-4 flex items-center gap-4 animate-pulse">
              <div className="size-8 rounded-full bg-muted/80 shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 bg-muted rounded w-1/3" />
                <div className="h-2.5 bg-muted/60 rounded w-1/5" />
              </div>
              <div className="h-3 bg-muted/60 rounded w-20 hidden sm:block" />
              <div className="h-6 bg-muted/70 rounded-full w-16 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl border bg-card/60 space-y-4 animate-pulse shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-xl bg-muted" />
              <div className="h-5 w-16 rounded-full bg-muted" />
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted/60 rounded w-1/2" />
            </div>
            <div className="pt-2 border-t flex justify-between">
              <div className="h-3 bg-muted/60 rounded w-20" />
              <div className="h-3 bg-muted/60 rounded w-12" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "stats") {
    return (
      <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-3", className)}>
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="p-4 rounded-xl border bg-card/50 space-y-2 animate-pulse">
            <div className="h-3 bg-muted rounded w-1/2" />
            <div className="h-6 bg-muted rounded w-3/4" />
            <div className="h-2.5 bg-muted/60 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  // Default: Spinner
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center select-none", className)}>
      <Loader2 className="size-7 animate-spin text-primary mb-2.5" />
      <span className="text-xs text-muted-foreground font-medium">{message}</span>
    </div>
  );
}
