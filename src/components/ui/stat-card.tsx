import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface StatCardTrend {
  value: string | number;
  isPositive?: boolean;
  label?: string;
}

export type StatCardVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "info"
  | "purple"
  | "rose";

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  title?: string;
  value: string | number | React.ReactNode;
  icon?: React.ReactNode;
  description?: string | React.ReactNode;
  trend?: StatCardTrend | React.ReactNode;
  badge?: React.ReactNode;
  isLoading?: boolean;
  variant?: StatCardVariant;
}

const variantStyles: Record<
  StatCardVariant,
  {
    iconBg: string;
    iconText: string;
    border?: string;
    bg?: string;
    valueText?: string;
  }
> = {
  default: {
    iconBg: "bg-muted text-muted-foreground",
    iconText: "text-muted-foreground",
  },
  primary: {
    iconBg: "bg-primary/10 text-primary",
    iconText: "text-primary",
  },
  success: {
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    iconText: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
    valueText: "text-emerald-600 dark:text-emerald-400",
  },
  warning: {
    iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    iconText: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
    valueText: "text-amber-600 dark:text-amber-400",
  },
  info: {
    iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    iconText: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20",
    valueText: "text-blue-600 dark:text-blue-400",
  },
  purple: {
    iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    iconText: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/20",
    valueText: "text-purple-600 dark:text-purple-400",
  },
  rose: {
    iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    iconText: "text-rose-600 dark:text-rose-400",
    border: "border-rose-500/20",
    valueText: "text-rose-600 dark:text-rose-400",
  },
};

export function StatCard({
  label,
  title,
  value,
  icon,
  description,
  trend,
  badge,
  isLoading = false,
  variant = "default",
  className,
  ...props
}: StatCardProps) {
  const vStyle = variantStyles[variant] || variantStyles.default;
  const displayTitle = title || label || "";

  return (
    <Card
      className={cn(
        "p-4 border shadow-2xs bg-card transition-all duration-200 hover:shadow-xs",
        vStyle.border,
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground truncate">
              {displayTitle}
            </span>
            {badge && <div className="inline-flex shrink-0">{badge}</div>}
          </div>

          {isLoading ? (
            <div className="py-1">
              <Skeleton className="h-7 w-24" />
            </div>
          ) : (
            <div
              className={cn(
                "text-2xl font-black font-mono tracking-tight text-foreground truncate",
                vStyle.valueText,
              )}
            >
              {value}
            </div>
          )}

          {description && !isLoading && (
            <p className="text-[11px] text-muted-foreground leading-tight truncate">
              {description}
            </p>
          )}

          {trend && !isLoading && (
            <div className="pt-0.5">
              {React.isValidElement(trend) ? (
                trend
              ) : typeof trend === "object" && "value" in trend ? (
                <div className="flex items-center gap-1 text-[11px] font-medium">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] h-4.5 px-1 font-bold",
                      trend.isPositive
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-600 border-rose-500/20",
                    )}
                  >
                    {trend.isPositive ? "+" : ""}
                    {trend.value}
                  </Badge>
                  {trend.label && (
                    <span className="text-muted-foreground">{trend.label}</span>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {icon && (
          <div
            className={cn(
              "size-10 rounded-xl grid place-items-center shrink-0 shadow-2xs",
              vStyle.iconBg,
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

export { StatsOverviewGrid } from "./stats-overview-grid";
