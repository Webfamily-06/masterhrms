import React, { useState } from "react";
import { CheckCircle2, Copy, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface SuccessStateProps {
  title?: string;
  description?: string;
  referenceId?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  compact?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function SuccessState({
  title = "Operation Completed Successfully",
  description = "Your action has been processed and saved into the database.",
  referenceId,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  compact = false,
  className,
  children,
}: SuccessStateProps) {
  const [copied, setCopied] = useState(false);

  function handleCopyReference() {
    if (!referenceId) return;
    navigator.clipboard.writeText(referenceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-muted-foreground transition-all select-none",
        compact ? "py-6 px-4" : "py-12 px-6 my-4",
        className
      )}
    >
      {/* Green Check Capsule */}
      <div
        className={cn(
          "rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs transition-transform hover:scale-105",
          compact ? "size-10 mb-2.5" : "size-14 mb-3.5"
        )}
      >
        <CheckCircle2 className={cn(compact ? "size-5" : "size-7", "stroke-[2]")} />
      </div>

      <h3
        className={cn(
          "font-bold tracking-tight text-foreground",
          compact ? "text-xs mb-1" : "text-sm sm:text-base mb-1"
        )}
      >
        {title}
      </h3>

      <p
        className={cn(
          "text-muted-foreground max-w-sm mx-auto leading-relaxed",
          compact ? "text-[11px] mb-3" : "text-xs mb-4"
        )}
      >
        {description}
      </p>

      {/* Reference Number Pill */}
      {referenceId && (
        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-emerald-500/30 text-xs font-mono">
          <span className="text-muted-foreground font-sans">Reference:</span>
          <span className="font-bold text-foreground">{referenceId}</span>
          <button
            type="button"
            onClick={handleCopyReference}
            className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
            title="Copy reference number"
          >
            {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
          </button>
        </div>
      )}

      {/* Action CTA */}
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
          {actionLabel && onAction && (
            <Button
              size={compact ? "sm" : "default"}
              onClick={onAction}
              className="gap-1.5 font-bold shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {actionLabel} <ArrowRight className="size-3.5" />
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
