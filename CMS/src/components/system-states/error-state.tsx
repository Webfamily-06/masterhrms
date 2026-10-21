import React, { useState } from "react";
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: Error | string | null;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
}

export function ErrorState({
  title = "Failed to load data",
  description = "An error occurred while communicating with the server. Please try refreshing.",
  error,
  onRetry,
  compact = false,
  className,
}: ErrorStateProps) {
  const [showTrace, setShowTrace] = useState(false);
  const [copied, setCopied] = useState(false);

  const errorMsg =
    typeof error === "string"
      ? error
      : error instanceof Error
      ? error.message || error.name
      : null;

  function handleCopy() {
    if (!errorMsg) return;
    navigator.clipboard.writeText(errorMsg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-2xl border border-destructive/20 bg-destructive/5 text-muted-foreground transition-all select-none",
        compact ? "py-6 px-4" : "py-12 px-6 my-4",
        className
      )}
    >
      <div
        className={cn(
          "rounded-3xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center shadow-xs",
          compact ? "size-10 mb-2.5" : "size-14 mb-3.5"
        )}
      >
        <AlertCircle className={cn(compact ? "size-5" : "size-7", "stroke-[1.75]")} />
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

      {/* Error message pill / collapsible trace */}
      {errorMsg && (
        <div className="mb-4 max-w-md w-full text-left">
          <div className="flex items-center justify-between text-[11px] font-mono p-2 rounded-lg bg-card border border-destructive/20 text-destructive">
            <span className="truncate flex-1 mr-2">{errorMsg}</span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 hover:bg-muted rounded"
                title="Copy error message"
              >
                {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3 text-muted-foreground" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {onRetry && (
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          onClick={onRetry}
          className="gap-1.5 text-xs font-semibold border-destructive/30 hover:bg-destructive/10 text-destructive"
        >
          <RefreshCw className="size-3.5" /> Try Again
        </Button>
      )}
    </div>
  );
}
