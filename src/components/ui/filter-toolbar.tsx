import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface FilterToolbarSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export interface FilterToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  search?: FilterToolbarSearchProps;
  filters?: React.ReactNode;
  viewToggle?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function FilterToolbar({
  search,
  filters,
  viewToggle,
  actions,
  children,
  className,
  ...props
}: FilterToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-2xs md:flex-row md:items-center md:justify-between",
        className,
      )}
      {...props}
    >
      {/* Left side: Search & Filter selects */}
      <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center flex-wrap min-w-0">
        {search && (
          <div className="relative w-full sm:w-auto sm:min-w-[220px] lg:min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              placeholder={search.placeholder || "Search..."}
              className={cn(
                "h-8.5 text-xs pl-8.5 bg-background border-border/80 w-full",
                search.className,
              )}
            />
          </div>
        )}

        {filters && (
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {filters}
          </div>
        )}

        {children}
      </div>

      {/* Right side: View toggles & actions */}
      {(viewToggle || actions) && (
        <div className="flex items-center gap-2 flex-wrap shrink-0 md:justify-end">
          {viewToggle && (
            <div className="flex items-center">{viewToggle}</div>
          )}
          {actions && (
            <div className="flex items-center gap-2 flex-wrap">{actions}</div>
          )}
        </div>
      )}
    </div>
  );
}
