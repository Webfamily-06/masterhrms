import React from "react";
import { SearchX, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface NoSearchResultsProps {
  searchTerm?: string;
  message?: string;
  onClear?: () => void;
  className?: string;
  compact?: boolean;
}

export function NoSearchResults({
  searchTerm,
  message,
  onClear,
  className,
  compact = false,
}: NoSearchResultsProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-border/80 bg-muted/15 text-muted-foreground select-none",
        compact ? "py-8 px-4" : "py-16 px-6 my-4",
        className
      )}
    >
      <div
        className={cn(
          "rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs",
          compact ? "size-12 mb-3" : "size-16 mb-4"
        )}
      >
        <SearchX className={cn(compact ? "size-6" : "size-8", "stroke-[1.75]")} />
      </div>

      <h3
        className={cn(
          "font-bold tracking-tight text-foreground",
          compact ? "text-sm mb-1" : "text-base sm:text-lg mb-1"
        )}
      >
        No matching records found
      </h3>

      <p
        className={cn(
          "text-muted-foreground max-w-sm mx-auto leading-relaxed",
          compact ? "text-xs mb-3" : "text-xs sm:text-sm mb-4"
        )}
      >
        {message || (
          searchTerm ? (
            <>
              No results found matching &ldquo;<span className="font-semibold text-foreground">{searchTerm}</span>&rdquo;. Check your spelling or try different keywords.
            </>
          ) : (
            "No records match the applied filter criteria. Try resetting filters to view all entries."
          )
        )}
      </p>

      {onClear && (
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          onClick={onClear}
          className="gap-1.5 text-xs font-semibold"
        >
          <RotateCcw className="size-3.5" /> Clear Filters & Reset
        </Button>
      )}
    </div>
  );
}
