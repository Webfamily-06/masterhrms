import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBreadcrumbsForRoute, type BreadcrumbItem } from "@/lib/breadcrumb-registry";

export interface BreadcrumbNavProps extends React.HTMLAttributes<HTMLElement> {
  items?: BreadcrumbItem[];
  fallbackPath?: string;
}

export function BreadcrumbNav({ items, fallbackPath, className, ...props }: BreadcrumbNavProps) {
  const routerState = useRouterState();
  const currentPath = fallbackPath || routerState?.location?.pathname || "/";
  const breadcrumbs = items && items.length > 0 ? items : getBreadcrumbsForRoute(currentPath);

  if (!breadcrumbs || breadcrumbs.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap select-none",
        className
      )}
      {...props}
    >
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;
        return (
          <React.Fragment key={`${item.label}-${index}`}>
            {index > 0 && (
              <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" aria-hidden="true" />
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
                  isLast ? "font-semibold text-foreground" : "text-muted-foreground"
                )}
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
