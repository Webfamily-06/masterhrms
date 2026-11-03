/**
 * Standardized Shared Empty State Component (TASK-P3-04, GAP-UI-014)
 * 
 * Provides unified, accessible, and responsive empty state illustrations and actions
 * across all HRMS modules (Leaves, Assets, Documents, Attendance, Grievances, etc.)
 */

import React from "react";
import { FolderOpen, Plus, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: LucideIcon | React.ElementType;
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
    <Empty
      size={compact ? "sm" : "default"}
      className={cn(compact ? "py-8 px-4" : "py-16 px-6 my-4", className)}
    >
      <EmptyHeader>
        <EmptyMedia variant="soft" className={compact ? "size-12 mb-2" : "size-16 mb-3"}>
          <Icon className={cn(compact ? "size-6" : "size-8", "stroke-[1.75]")} />
        </EmptyMedia>
        <EmptyTitle className={compact ? "text-sm mb-0.5" : "text-base sm:text-lg mb-1"}>
          {title}
        </EmptyTitle>
        <EmptyDescription className={compact ? "text-xs mb-2" : "text-xs sm:text-sm mb-4"}>
          {description}
        </EmptyDescription>
      </EmptyHeader>

      {(actionLabel || secondaryActionLabel || children) && (
        <EmptyContent>
          {actionLabel && onAction && (
            <Button
              size={compact ? "sm" : "default"}
              onClick={onAction}
              className="gap-2"
            >
              <Plus className="size-4" />
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              variant="outline"
              size={compact ? "sm" : "default"}
              onClick={onSecondaryAction}
            >
              {secondaryActionLabel}
            </Button>
          )}
          {children}
        </EmptyContent>
      )}
    </Empty>
  );
}

export default EmptyState;

