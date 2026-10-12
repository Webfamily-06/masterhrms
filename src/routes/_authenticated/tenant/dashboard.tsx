import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  HardDrive,
  CreditCard,
  Building2,
  Activity,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react";
import { useTenantBranding } from "@/lib/useTenantBranding";

export const Route = createFileRoute("/_authenticated/tenant/dashboard")({
  component: TenantDashboardPage,
  head: () => ({
    meta: [{ title: "Tenant Command Center — Master HRMS" }],
  }),
});

function TenantDashboardPage() {
  const { branding } = useTenantBranding();

  const { data: tenantMetrics } = useQuery({
    queryKey: ["tenant-dashboard-metrics"],
    queryFn: async () => {
      try {
        const res = await api.get<any>("/dashboard/tenant");
        return res;
      } catch {
        return null;
      }
    },
    refetchInterval: 30000,
  });

  const storagePct = tenantMetrics?.storageLimitGb
    ? Math.min(100, (tenantMetrics.storageUsedGb / tenantMetrics.storageLimitGb) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Building2 className="h-6 w-6 text-primary" />
            {tenantMetrics?.tenantName || branding.name || "Enterprise Workspace"} Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tenant administration, plan governance, employee quotas, and system configuration.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link to="/hr/dashboard">
            <Button variant="default" size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Sparkles className="h-4 w-4" />
              Open HR Management
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
          <Link to="/me/dashboard">
            <Button variant="outline" size="sm" className="gap-2">
              Employee View
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Subscription Plan
            </CardTitle>
            <CreditCard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">
              {tenantMetrics?.planType ? `${tenantMetrics.planType.toUpperCase()} Tier` : "Standard Tier"}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                Active
              </Badge>
              <span className="text-[11px] text-muted-foreground capitalize">
                Renews {tenantMetrics?.billingCycle || "monthly"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Workforce
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">
              {tenantMetrics?.activeUsers ?? 0} Members
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {tenantMetrics?.totalEmployees ?? 0} employees ({tenantMetrics?.maxEmployees ? `${tenantMetrics.maxEmployees} quota` : "Unlimited quota"})
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Storage Usage
            </CardTitle>
            <HardDrive className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">
              {tenantMetrics?.storageUsageFormatted ?? "0 GB / 10 GB"}
            </div>
            <div className="w-full bg-muted h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-purple-500 h-full transition-all" style={{ width: `${Math.max(1, storagePct)}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              System Health
            </CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-500 flex items-center gap-1.5">
              <CheckCircle2 className="h-5 w-5" /> 100% Operational
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {tenantMetrics?.activeAddonsCount ?? 0} active add-on modules
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Launch & Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-border/80">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Workspace Configuration Hub</CardTitle>
            <CardDescription className="text-xs">
              Manage core tenant settings, branding, white-label assets, and integrations.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              to="/tenant/company-profile"
              className="p-3.5 rounded-lg border border-border/70 hover:border-primary/50 hover:bg-muted/40 transition-all flex items-start gap-3"
            >
              <div className="p-2 rounded-md bg-primary/10 text-primary">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">Company Profile</div>
                <div className="text-[11px] text-muted-foreground">Entity legal details and address</div>
              </div>
            </Link>

            <Link
              to="/tenant/branding"
              className="p-3.5 rounded-lg border border-border/70 hover:border-primary/50 hover:bg-muted/40 transition-all flex items-start gap-3"
            >
              <div className="p-2 rounded-md bg-purple-500/10 text-purple-500">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">Branding & White-label</div>
                <div className="text-[11px] text-muted-foreground">Logos, favicons, theme color</div>
              </div>
            </Link>

            <Link
              to="/tenant/users"
              className="p-3.5 rounded-lg border border-border/70 hover:border-primary/50 hover:bg-muted/40 transition-all flex items-start gap-3"
            >
              <div className="p-2 rounded-md bg-blue-500/10 text-blue-500">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">Users & Access</div>
                <div className="text-[11px] text-muted-foreground">Manage administrative invitations</div>
              </div>
            </Link>

            <Link
              to="/tenant/subscription"
              className="p-3.5 rounded-lg border border-border/70 hover:border-primary/50 hover:bg-muted/40 transition-all flex items-start gap-3"
            >
              <div className="p-2 rounded-md bg-amber-500/10 text-amber-500">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">Subscription & Billing</div>
                <div className="text-[11px] text-muted-foreground">Invoices, tier upgrades, addons</div>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Audit Log Preview */}
        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Security Audit</CardTitle>
              <CardDescription className="text-xs">Recent security events</CardDescription>
            </div>
            <Link to="/tenant/audit-logs">
              <Button variant="ghost" size="sm" className="h-7 text-xs text-primary">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {tenantMetrics?.recentAudits && tenantMetrics.recentAudits.length > 0 ? (
              tenantMetrics.recentAudits.map((audit: any) => (
                <div key={audit.id} className="flex items-start gap-2.5 text-xs pb-2 border-b border-border/50 last:border-0 last:pb-0">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-foreground truncate">{audit.key}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {audit.changedBy || "System"} · {new Date(audit.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">
                <ShieldCheck className="h-5 w-5 mx-auto mb-1 text-muted-foreground/60" />
                No security audit events recorded yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
