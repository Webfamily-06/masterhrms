import * as React from "react";
import { Link, useRouterState } from "@/lib/router-compat";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBreadcrumbsForRoute, type BreadcrumbItem } from "@/lib/breadcrumb-registry";

export type PageHeaderBreadcrumbItem = BreadcrumbItem;

export interface PageHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  breadcrumbs?: PageHeaderBreadcrumbItem[] | React.ReactNode | false;
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
  const routerState = useRouterState();
  const currentPath = routerState?.location?.pathname || "";

  const resolvedBreadcrumbs =
    breadcrumbs === false
      ? null
      : (breadcrumbs !== undefined
          ? breadcrumbs
          : (currentPath ? getBreadcrumbsForRoute(currentPath) : null));

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
        {resolvedBreadcrumbs && (
          <nav aria-label="Breadcrumb" className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
            {Array.isArray(resolvedBreadcrumbs) ? (
              resolvedBreadcrumbs.map((item, index) => {
                const isLast = index === resolvedBreadcrumbs.length - 1;
                return (
                  <React.Fragment key={`${item.label}-${index}`}>
                    {index > 0 && (
                      <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                    )}
                    {item.href && !isLast ? (
                      <Link
                        to={item.href}
                        className="hover:text-foreground transition-colors font-medium hover:underline underline-offset-2"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span
                        className={cn(
                          isLast ? "font-semibold text-foreground" : "text-muted-foreground",
                        )}
                        aria-current={isLast ? "page" : undefined}
                      >
                        {item.label}
                      </span>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              resolvedBreadcrumbs
            )}
          </nav>
        )}

        {/* Title, leading icon & optional badge */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {icon && (
            <span className="text-primary inline-flex items-center justify-center shrink-0">
              {React.isValidElement(icon)
                ? icon
                : React.createElement(icon as React.ComponentType<{ className?: string }>, {
                    className: "size-6",
                  })}
            </span>
          )}
          <h1 className="text-2xl font-black tracking-tight text-foreground">
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
        <div className="flex w-full sm:w-auto items-center gap-2 flex-wrap sm:shrink-0 sm:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}
