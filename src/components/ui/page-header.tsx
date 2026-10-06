import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageHeaderBreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  breadcrumbs?: PageHeaderBreadcrumbItem[] | React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  icon,
  badge,
  breadcrumbs,
  actions,
  className,
  children,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      {...props}
    >
      <div className="space-y-1 min-w-0">
        {/* Breadcrumb section */}
        {breadcrumbs && (
          <nav aria-label="Breadcrumb" className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
            {Array.isArray(breadcrumbs) ? (
              breadcrumbs.map((item, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={`${item.label}-${index}`}>
                    {index > 0 && (
                      <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                    )}
                    {item.href && !isLast ? (
                      <Link
                        to={item.href}
                        className="hover:text-foreground transition-colors font-medium"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span
                        className={cn(
                          isLast ? "font-semibold text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {item.label}
                      </span>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              breadcrumbs
            )}
          </nav>
        )}

        {/* Title, icon & optional badge */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {icon && (
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              {icon}
            </div>
          )}
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            {title}
          </h1>
          {badge && <div className="inline-flex items-center">{badge}</div>}
        </div>

        {/* Optional description */}
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
            {description}
          </p>
        )}

        {children}
      </div>

      {/* Action button group */}
      {actions && (
        <div className="flex items-center gap-2 flex-wrap sm:shrink-0 sm:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}
