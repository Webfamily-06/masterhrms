import * as React from "react";
import { cn } from "@/lib/utils";

export interface StatsOverviewGridProps
  extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 1 | 2 | 3 | 4 | 5;
  children: React.ReactNode;
}

const columnStyles: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5",
};

export function StatsOverviewGrid({
  columns = 4,
  className,
  children,
  ...props
}: StatsOverviewGridProps) {
  const colClass = columnStyles[columns] || columnStyles[4];

  return (
    <div
      className={cn("grid gap-3 sm:gap-4", colClass, className)}
      {...props}
    >
      {children}
    </div>
  );
}
