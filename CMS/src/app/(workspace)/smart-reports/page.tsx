'use client';
import {  createFileRoute, Outlet, useRouterState, redirect, Link  } from "@/src/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { api, unwrapData } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { useNavigationResolver } from "@/lib/navigation-resolver";
import { AddonNotInstalled } from "@/components/addon-not-installed";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  CalendarCheck,
  Wallet,
  Clock,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Package,
  Briefcase,
  Loader2,
  RefreshCw,
  Eye,
  Lock,
  ShieldAlert,
} from "lucide-react";
import { isUserAuthorizedForReport, REPORT_ROLES } from "@/components/smart-reports/report-view";
import { cn } from "@/lib/utils";



export default function SmartReportsParentPage() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { data: profile } = useCurrentProfile();
  const tenantId = profile?.tenant_id || profile?.tenant?.id;
  const userRoles = profile?.roles || [];
  const { isEntitled, isLoading: isNavLoading } = useNavigationResolver();

  const hasEntitlement = isEntitled("smart-reports");

  const catalogueQuery = useQuery({
    queryKey: ["smart-reports-catalogue", tenantId],
    queryFn: async () => {
      const res = await api.get("/smart-reports/catalogue");
      return unwrapData(res);
    },
    enabled: hasEntitlement,
  });

  const getReportIcon = (id: string) => {
    switch (id) {
      case "attendance-summary":
        return <CalendarCheck className="h-6 w-6 text-blue-500" />;
      case "payroll-sheet":
        return <Wallet className="h-6 w-6 text-emerald-500" />;
      case "leave-report":
        return <Clock className="h-6 w-6 text-purple-500" />;
      case "sales-invoice":
        return <Receipt className="h-6 w-6 text-teal-500" />;
      case "purchase-invoice":
        return <ShoppingBag className="h-6 w-6 text-rose-500" />;
      case "deal-pipeline":
        return <TrendingUp className="h-6 w-6 text-amber-500" />;
      case "product-stock":
        return <Package className="h-6 w-6 text-indigo-500" />;
      case "project-progress":
        return <Briefcase className="h-6 w-6 text-cyan-500" />;
      default:
        return <FileText className="h-6 w-6 text-primary" />;
    }
  };

  if (!isNavLoading && !hasEntitlement) {
    return (
      <div className="flex-1 p-4 md:p-8 pt-6 max-w-[1600px] mx-auto">
        <AddonNotInstalled
          addonName="Smart Reports"
          addonSlug="smart-reports"
          category="Finance"
          description="Custom report builder with automated scheduling, drill-down financial metrics, and executive PDF summaries."
        />
      </div>
    );
  }

  // If path is a sub-route (e.g. /smart-reports/attendance-summary), delegate to Outlet
  if (pathname !== "/smart-reports" && pathname !== "/smart-reports/") {
    return <Outlet />;
  }

  // Canonical Catalogue page (/smart-reports)
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <BreadcrumbNav />
          <h1 className="text-3xl font-bold tracking-tight mt-1">Smart Reports Catalogue</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Access the 8 documented enterprise reports for workforce, financials, sales, and operations.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={catalogueQuery.isFetching}
          onClick={() => catalogueQuery.refetch()}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", catalogueQuery.isFetching && "animate-spin")} />
          Refresh Counts
        </Button>
      </div>

      {/* ─── CATALOGUE VIEW (8 Cards) ─── */}
      {catalogueQuery.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="p-5 space-y-4 rounded-xl border">
              <div className="flex justify-between items-center">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-md" />
            </Card>
          ))}
        </div>
      ) : catalogueQuery.isError ? (
        <Card className="border-rose-500/20 bg-rose-500/5">
          <CardHeader className="text-center py-10">
            <div className="size-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="size-6" />
            </div>
            <CardTitle className="text-lg font-semibold">Failed to Load Catalogue</CardTitle>
            <CardDescription className="max-w-md mx-auto mt-1 text-sm text-foreground/80">
              {(catalogueQuery.error as Error)?.message || "Could not retrieve report definitions and real-time metrics."}
            </CardDescription>
            <div className="pt-4">
              <Button size="sm" variant="outline" onClick={() => catalogueQuery.refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardHeader>
        </Card>
      ) : catalogueQuery.data?.length === 0 ? (
        <Card className="border-dashed py-12 text-center">
          <CardTitle className="text-base font-semibold">No Reports Available</CardTitle>
          <CardDescription className="max-w-md mx-auto mt-1">
            No report definitions were returned from the server for this workspace.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {catalogueQuery.data?.map((card: any) => {
            const isAuthorized = isUserAuthorizedForReport(card.id, userRoles);
            return (
              <Card
                key={card.id}
                className={cn(
                  "group hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden bg-card border rounded-xl",
                  !isAuthorized && "opacity-85 border-muted"
                )}
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-primary/10 rounded-xl group-hover:scale-105 transition-transform">
                      {getReportIcon(card.id)}
                    </div>
                    {isAuthorized ? (
                      <Badge
                        variant="secondary"
                        className="text-[11px] font-normal px-2.5 py-0.5 bg-muted/80 text-muted-foreground"
                      >
                        {card.badge || "This month"}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-medium px-2 py-0.5 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 flex items-center gap-1"
                      >
                        <Lock className="h-3 w-3" />
                        Restricted
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-base font-bold mt-4 tracking-tight">{card.title}</CardTitle>
                  <div className="text-[11px] font-medium text-muted-foreground">{card.category}</div>
                  <CardDescription className="text-xs line-clamp-2 mt-1.5 leading-relaxed">
                    {card.description}
                  </CardDescription>

                  {/* Live Data Badge from backend persisted aggregates */}
                  {card.stats && (
                    <div className="mt-3.5 px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-[11px] font-medium text-foreground/80 flex items-center justify-between">
                      <span className="truncate">{card.stats}</span>
                      <Badge variant="outline" className="text-[10px] ml-1.5 py-0 px-1.5 bg-background">
                        {card.count}
                      </Badge>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-5 pt-1 pb-4">
                  {isAuthorized ? (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full text-xs font-semibold group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all shadow-xs"
                    >
                      <Link to={card.route || `/smart-reports/${card.id}`}>
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        <span>View Report</span>
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-muted-foreground border border-dashed hover:bg-muted/50"
                      title={`Requires one of: ${REPORT_ROLES[card.id]?.join(", ")}`}
                    >
                      <Link to={card.route || `/smart-reports/${card.id}`}>
                        <Lock className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                        <span>Access Restricted</span>
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
