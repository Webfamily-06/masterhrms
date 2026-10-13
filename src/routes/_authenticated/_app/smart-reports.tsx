import { createFileRoute, Outlet, useRouterState, redirect, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { useNavigationResolver } from "@/lib/navigation-resolver";
import { AddonNotInstalled } from "@/components/addon-not-installed";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ArrowRight,
  Eye,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/smart-reports")({
  validateSearch: (search: Record<string, unknown>) => ({
    report: search.report as string | undefined,
  }),
  beforeLoad: ({ search }) => {
    const validReports = [
      "attendance-summary",
      "payroll-sheet",
      "leave-report",
      "sales-invoice",
      "purchase-invoice",
      "deal-pipeline",
      "product-stock",
      "project-progress",
    ];
    // Backward compatibility for legacy query-string report parameter
    if (search.report && validReports.includes(search.report)) {
      throw redirect({ to: `/smart-reports/${search.report}` as any });
    }
  },
  component: SmartReportsParentPage,
  head: () => ({ meta: [{ title: "Smart Reports Catalogue — Master ERP" }] }),
});

export default function SmartReportsParentPage() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { data: profile } = useCurrentProfile();
  const tenantId = profile?.tenant_id || profile?.tenant?.id;
  const { isEntitled, isLoading: isNavLoading } = useNavigationResolver();

  const hasEntitlement = isEntitled("smart-reports");

  const catalogueQuery = useQuery({
    queryKey: ["smart-reports-catalogue", tenantId],
    queryFn: async () => {
      const res = await api.get("/smart-reports/catalogue");
      return res?.data;
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
        <Button variant="outline" size="sm" onClick={() => catalogueQuery.refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Counts
        </Button>
      </div>

      {/* ─── CATALOGUE VIEW (8 Cards) ─── */}
      {catalogueQuery.isLoading ? (
        <div className="h-96 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Loading report catalogue metrics...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {catalogueQuery.data?.map((card: any) => (
            <Card
              key={card.id}
              className="group hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden bg-card border rounded-xl"
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-primary/10 rounded-xl group-hover:scale-105 transition-transform">
                    {getReportIcon(card.id)}
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-[11px] font-normal px-2.5 py-0.5 bg-muted/80 text-muted-foreground"
                  >
                    {card.badge || "This month"}
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold mt-4 tracking-tight">{card.title}</CardTitle>
                <div className="text-[11px] font-medium text-muted-foreground">{card.category}</div>
                <CardDescription className="text-xs line-clamp-2 mt-1.5 leading-relaxed">
                  {card.description}
                </CardDescription>

                {/* Live Data Badge from image8.png */}
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
