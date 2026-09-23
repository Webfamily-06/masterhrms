import React from "react";
import { FolderOpen, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ElementType;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
  compact?: boolean;
  children?: React.ReactNode;
}

export function EmptyState({
  icon: Icon = FolderOpen,
  title = "No records found",
  description = "Get started by adding your first record to this module.",
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
  compact = false,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-border/80 bg-muted/20 text-muted-foreground transition-all select-none",
        compact ? "py-8 px-4" : "py-16 px-6 my-4",
        className
      )}
    >
      {/* Icon Capsule */}
      <div
        className={cn(
          "rounded-3xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-xs transition-transform hover:scale-105",
          compact ? "size-12 mb-3" : "size-16 mb-4"
        )}
      >
        <Icon className={cn(compact ? "size-6" : "size-8", "stroke-[1.75]")} />
      </div>

      {/* Headings */}
      <h3
        className={cn(
          "font-bold tracking-tight text-foreground",
          compact ? "text-sm mb-1" : "text-base sm:text-lg mb-1.5"
        )}
      >
        {title}
      </h3>
      <p
        className={cn(
          "text-muted-foreground max-w-sm mx-auto leading-relaxed",
          compact ? "text-xs mb-3" : "text-xs sm:text-sm mb-5"
        )}
      >
        {description}
      </p>

      {/* Action Buttons */}
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {actionLabel && onAction && (
            <Button
              size={compact ? "sm" : "default"}
              onClick={onAction}
              className="gap-1.5 font-bold shadow-xs bg-primary text-white"
            >
              <Plus className="size-4" /> {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              size={compact ? "sm" : "default"}
              variant="outline"
              onClick={onSecondaryAction}
              className="gap-1.5 font-medium"
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
