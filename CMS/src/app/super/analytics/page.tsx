'use client';

import { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  BarChart3,
  HardDrive,
  Users,
  Activity,
  ShieldCheck,
  Save,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  ArrowUpRight,
  Database,
  TrendingUp,
  ExternalLink,
  Loader2,
  Wallet,
} from "lucide-react";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type TelemetryTenantRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  usersCount: number;
  employeesCount: number;
  status: string;
};

type ConfigAuditCheck = {
  key: string;
  category: string;
  status: "PASS" | "WARN" | "FAIL";
  valueSanitized: string;
  message: string;
  remediation?: string;
};

export default function SuperAnalyticsPage() {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [lookbackDays, setLookbackDays] = useState<number>(30);
  const [measurementId, setMeasurementId] = useState("");
  const [gaEnabled, setGaEnabled] = useState(false);

  // 1. Live Platform Telemetry
  const {
    data: telemetryData,
    isLoading: isLoadingTelemetry,
    isFetching: isFetchingTelemetry,
    refetch: refetchTelemetry,
  } = useQuery<any>({
    queryKey: ["super-analytics-telemetry"],
    queryFn: async () => {
      const res = await api.get("/super/analytics/telemetry");
      return res?.data || res || {};
    },
  });

  // 2. Live Fleet Storage Forecast
  const {
    data: fleetForecast,
    isLoading: isLoadingFleet,
    isFetching: isFetchingFleet,
    refetch: refetchFleet,
  } = useQuery<any>({
    queryKey: ["super-analytics-storage-fleet", lookbackDays],
    queryFn: async () => {
      const res = await api.get(`/super/storage/analytics/fleet?lookbackDays=${lookbackDays}`);
      return res?.data || res || {};
    },
  });

  // 3. Live Fleet Storage Growth History
  const {
    data: fleetGrowth,
    isLoading: isLoadingGrowth,
    isFetching: isFetchingGrowth,
    refetch: refetchGrowth,
  } = useQuery<any>({
    queryKey: ["super-analytics-storage-growth", lookbackDays],
    queryFn: async () => {
      const res = await api.get(`/super/storage/analytics/growth?lookbackDays=${lookbackDays}`);
      return res?.data || res || {};
    },
  });

  // 4. Live Runtime Environment / Config Audit
  const {
    data: configAuditData,
    isLoading: isLoadingAudit,
    isFetching: isFetchingAudit,
    refetch: refetchConfigAudit,
  } = useQuery<any>({
    queryKey: ["super-config-audit"],
    queryFn: async () => {
      const res = await api.get("/super/config-audit");
      const unwrapped = res?.data || res || {};
      return unwrapped.audit || unwrapped;
    },
  });

  // 5. Real Saved GA4 Config (no hardcoded fake tracking ID)
  const { data: gaConfigData, isLoading: isLoadingGa } = useQuery<any>({
    queryKey: ["realtime-analytics-config"],
    queryFn: async () => {
      try {
        const res = await api.get("/cms/pages/system-analytics-config");
        const page = res?.data || res || {};
        return page?.content || null;
      } catch {
        return null;
      }
    },
  });

  useEffect(() => {
    if (gaConfigData && typeof gaConfigData === "object") {
      setMeasurementId(typeof gaConfigData.measurementId === "string" ? gaConfigData.measurementId : "");
      setGaEnabled(Boolean(gaConfigData.enabled));
    }
  }, [gaConfigData]);

  const saveGaMutation = useMutation({
    mutationFn: async (updated: { measurementId: string; enabled: boolean }) => {
      await api.put("/cms/pages/system-analytics-config", {
        title: "System Google Analytics Config",
        content: updated,
        published: true,
      });
    },
    onSuccess: () => {
      toast.success("Google Analytics configuration saved.");
      qc.invalidateQueries({ queryKey: ["realtime-analytics-config"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to save GA4 configuration."),
  });

  const isRefreshing = isFetchingTelemetry || isFetchingFleet || isFetchingGrowth || isFetchingAudit;

  const handleRefreshAll = async () => {
    await Promise.all([
      refetchTelemetry(),
      refetchFleet(),
      refetchGrowth(),
      refetchConfigAudit(),
    ]);
    toast.success("Platform telemetry, storage analytics, and config audit refreshed.");
  };

  const metrics = telemetryData?.metrics || {};

  const tenantRows: TelemetryTenantRow[] = useMemo(() => {
    const raw = telemetryData?.tenantTelemetry;
    if (!Array.isArray(raw)) return [];
    return raw.map((t: any) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      plan: t.plan || "Unassigned",
      usersCount: Number(t.usersCount ?? 0),
      employeesCount: Number(t.employeesCount ?? 0),
      status: t.status || "active",
    }));
  }, [telemetryData]);

  const filteredTenants = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return tenantRows;
    return tenantRows.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.plan.toLowerCase().includes(q),
    );
  }, [tenantRows, searchTerm]);

  // Storage Growth ApexChart Series (real historical snapshots + projections)
  const growthChart = useMemo(() => {
    const history: any[] = Array.isArray(fleetGrowth?.history) ? fleetGrowth.history : [];
    const projections: any[] = Array.isArray(fleetGrowth?.projections) ? fleetGrowth.projections : [];
    const combined = [...history, ...projections];
    if (combined.length === 0) return null;

    const toMb = (bytes: number) => Number(((Number(bytes) || 0) / (1024 * 1024)).toFixed(2));
    const categories = combined.map((pt) => pt.date);
    const actualSeries = combined.map((pt) => (pt.isProjected ? null : toMb(pt.usedBytes)));
    const projectedSeries = combined.map((pt, idx) => {
      if (pt.isProjected) return toMb(pt.usedBytes);
      if (idx === history.length - 1 && projections.length > 0) return toMb(pt.usedBytes);
      return null;
    });

    const options: any = {
      chart: {
        type: "area",
        toolbar: { show: false },
        fontFamily: "inherit",
        background: "transparent",
      },
      stroke: { curve: "smooth", width: [2.5, 2], dashArray: [0, 5] },
      colors: ["#0d6efd", "#16a34a"],
      fill: {
        type: "gradient",
        gradient: { opacityFrom: 0.25, opacityTo: 0.02 },
      },
      xaxis: {
        categories,
        labels: { style: { fontSize: "10px" } },
      },
      yaxis: {
        title: { text: "Storage (MB)", style: { fontSize: "11px" } },
        labels: { formatter: (val: number) => (val == null ? "" : `${val.toFixed(1)} MB`) },
      },
      dataLabels: { enabled: false },
      tooltip: {
        y: { formatter: (val: number) => (val == null ? "—" : `${val.toFixed(2)} MB`) },
      },
      legend: { position: "top" },
    };

    return {
      options,
      series: [
        { name: "Recorded Usage (MB)", data: actualSeries },
        { name: "Projected Usage (MB)", data: projectedSeries },
      ],
    };
  }, [fleetGrowth]);

  const auditChecks: ConfigAuditCheck[] = Array.isArray(configAuditData?.checks)
    ? configAuditData.checks
    : [];

  return (
    <div className="w-full min-w-0 space-y-5">
      <PageHeader
        title="Platform Telemetry & Usage Analytics"
        description="Live multi-tenant counts, storage capacity growth trends, runtime configuration readiness, and GA4 measurement settings."
        icon={BarChart3}
        badge={
          <Badge variant="soft">
            {metrics.activeTenants ?? 0} Active Tenants
          </Badge>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/super/tenant-usage-metrics">
                <Building2 className="size-3.5" />
                Tenant Usage Engine
                <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleRefreshAll}
              disabled={isRefreshing}
            >
              <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh Metrics
            </Button>
          </>
        }
      />

      {/* 4 Live Summary KPI Cards (Zero Fabricated Fallbacks) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Fleet Storage Used"
          value={fleetForecast?.formattedCurrentUsage || "0 B"}
          description={
            fleetForecast?.formattedQuota
              ? `${fleetForecast.utilizationPercent ?? 0}% of ${fleetForecast.formattedQuota} quota`
              : "Live object & database file usage"
          }
          icon={HardDrive}
          variant="primary"
          isLoading={isLoadingFleet}
        />
        <StatCard
          label="Workforce Enrolled"
          value={Number(metrics.totalEmployees ?? 0).toLocaleString()}
          description={`${Number(metrics.totalUsers ?? 0).toLocaleString()} platform user accounts`}
          icon={Users}
          variant="info"
          isLoading={isLoadingTelemetry}
        />
        <StatCard
          label="Active MRR"
          value={`INR ${Number(metrics.mrr ?? 0).toLocaleString()}`}
          description={`ARR: INR ${Number(metrics.arr ?? 0).toLocaleString()} | Churn: ${metrics.churnRate ?? 0}%`}
          icon={Wallet}
          variant="success"
          isLoading={isLoadingTelemetry}
        />
        <StatCard
          label="Config Audit Score"
          value={configAuditData?.score !== undefined ? `${configAuditData.score}/100` : "—"}
          description={
            configAuditData
              ? `Env: ${configAuditData.nodeEnv || "unknown"} | ${configAuditData.summary?.failures ?? 0} failures`
              : "Runtime security & env checks"
          }
          icon={ShieldCheck}
          variant={
            configAuditData?.summary?.failures > 0
              ? "rose"
              : configAuditData?.summary?.warnings > 0
              ? "warning"
              : "success"
          }
          isLoading={isLoadingAudit}
        />
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="growth" className="space-y-4">
        <TabsList className="bg-muted/60 p-1 rounded-lg border border-border/60 flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="growth" className="text-xs gap-1.5 py-1.5">
            <TrendingUp className="size-3.5" />
            Fleet Storage &amp; Growth
          </TabsTrigger>
          <TabsTrigger value="tenants" className="text-xs gap-1.5 py-1.5">
            <Building2 className="size-3.5" />
            Tenant Usage
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs gap-1.5 py-1.5">
            <ShieldCheck className="size-3.5" />
            Environment &amp; Config Audit
          </TabsTrigger>
          <TabsTrigger value="ga" className="text-xs gap-1.5 py-1.5">
            <BarChart3 className="size-3.5" />
            Google Analytics 4
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: FLEET STORAGE & GROWTH */}
        <TabsContent value="growth" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="border border-border/80 rounded-xl bg-card shadow-xs lg:col-span-2">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <TrendingUp className="size-4 text-primary" />
                    Fleet Storage Growth Trajectory
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Recorded daily storage snapshots and linear forward projection from `/super/storage/analytics/growth`.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  {[7, 30, 90].map((days) => (
                    <Button
                      key={days}
                      size="xs"
                      variant={lookbackDays === days ? "primary" : "outline"}
                      onClick={() => setLookbackDays(days)}
                    >
                      {days}d
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingGrowth ? (
                  <div className="h-64 flex items-center justify-center text-xs text-muted-foreground gap-2">
                    <Loader2 className="size-4 animate-spin text-primary" />
                    Loading storage growth snapshots...
                  </div>
                ) : !growthChart ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg p-6">
                    <Database className="size-8 text-muted-foreground/40 mb-2" />
                    <p className="font-medium text-foreground">No storage growth snapshots captured yet</p>
                    <p className="mt-1 max-w-sm">
                      Capture daily snapshots in Fleet Storage Administration to build a real historical trajectory without synthetic interpolation.
                    </p>
                    <Button asChild size="xs" variant="soft" className="mt-3">
                      <Link href="/super/files/storage">
                        Open Storage Governance
                        <ExternalLink className="size-3" />
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <Suspense
                    fallback={
                      <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
                        Rendering chart...
                      </div>
                    }
                  >
                    <Chart
                      options={growthChart.options}
                      series={growthChart.series}
                      type="area"
                      height={270}
                      width="100%"
                    />
                  </Suspense>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="size-4 text-emerald-600" />
                  Fleet Capacity Forecast
                </CardTitle>
                <CardDescription className="text-xs">
                  Computed from real storage snapshots (`/super/storage/analytics/fleet`).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-between">
                  <span className="text-muted-foreground">Forecast Status</span>
                  <Badge
                    variant={
                      fleetForecast?.forecastStatus === "EXCEEDED"
                        ? "destructive"
                        : fleetForecast?.forecastStatus === "APPROACHING_QUOTA"
                        ? "warning"
                        : fleetForecast?.forecastStatus === "INSUFFICIENT_DATA"
                        ? "secondary"
                        : "success"
                    }
                  >
                    {fleetForecast?.forecastStatus || "INSUFFICIENT_DATA"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/60">
                    <div className="text-[11px] text-muted-foreground">Daily Velocity</div>
                    <div className="font-bold text-foreground mt-0.5">
                      {fleetForecast?.formattedDailyGrowth || "0 B / day"}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/60">
                    <div className="text-[11px] text-muted-foreground">30-Day Projection</div>
                    <div className="font-bold text-foreground mt-0.5">
                      {fleetForecast?.formattedProjected30Days || "0 B"}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/60">
                    <div className="text-[11px] text-muted-foreground">Available Capacity</div>
                    <div className="font-bold text-foreground mt-0.5">
                      {fleetForecast?.formattedAvailable || "0 B"}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/60">
                    <div className="text-[11px] text-muted-foreground">Projected Runway</div>
                    <div className="font-bold text-foreground mt-0.5">
                      {fleetForecast?.projectedDaysRemaining != null
                        ? `${fleetForecast.projectedDaysRemaining} days`
                        : "Stable"}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted/30 border border-border/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Period Net Growth ({lookbackDays}d)</span>
                    <span className="font-semibold text-foreground">
                      {fleetGrowth?.summary?.formattedNetPeriodGrowth || "0 B"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Data Points / Confidence</span>
                    <span className="text-foreground">
                      {fleetForecast?.dataPoints ?? 0} pts ({fleetForecast?.confidence || "INSUFFICIENT_DATA"})
                    </span>
                  </div>
                </div>

                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/super/files/storage">
                    Manage Quotas, Watchlist &amp; Retention
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: TENANT USAGE (LINKED TO AUTHORITATIVE ENGINE, ZERO FABRICATED QUOTAS) */}
        <TabsContent value="tenants" className="space-y-4">
          <Alert variant="ghost-info" icon={<Building2 className="size-4" />}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
              <div className="text-xs">
                <strong>Authoritative Tenant Usage Metrics:</strong> For full per-tenant storage quotas, file breakdown, seat utilization, and live telemetry across all workspaces, open the dedicated Tenant Usage Metrics console.
              </div>
              <Button asChild size="xs" variant="primary" className="shrink-0">
                <Link href="/super/tenant-usage-metrics">
                  Open Tenant Usage Metrics
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </Alert>

          <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
            <CardHeader className="p-4 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold">Recent Tenants Snapshot</CardTitle>
                <CardDescription className="text-xs">
                  Real database counts for the latest workspaces ({metrics.totalTenants ?? 0} total tenants, {metrics.newTenantsLast30d ?? 0} created in last 30 days).
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter organizations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-8 text-xs"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto border-t border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Organization</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Subscribed Plan</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right">Employees</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right">Profiles / Seats</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Subscription Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingTelemetry ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-28 text-center text-xs text-muted-foreground">
                          <Loader2 className="size-4 animate-spin text-primary inline mr-2" />
                          Loading tenant telemetry...
                        </TableCell>
                      </TableRow>
                    ) : filteredTenants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-28 text-center text-xs text-muted-foreground">
                          No tenant records available.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTenants.map((item) => (
                        <TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="py-2.5">
                            <p className="text-xs font-semibold text-foreground">{item.name}</p>
                            <p className="text-[11px] text-muted-foreground">{item.slug}</p>
                          </TableCell>
                          <TableCell className="text-xs font-medium">{item.plan}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{item.employeesCount.toLocaleString()}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{item.usersCount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                item.status === "active"
                                  ? "success"
                                  : item.status === "trialing"
                                  ? "info"
                                  : "warning"
                              }
                              className="text-[10px] capitalize"
                            >
                              {item.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: REAL RUNTIME ENVIRONMENT & CONFIG AUDIT (/super/config-audit) */}
        <TabsContent value="audit" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Checks Passed"
              value={configAuditData?.summary?.passed ?? 0}
              description="Compliant runtime configurations"
              icon={CheckCircle2}
              variant="success"
              isLoading={isLoadingAudit}
            />
            <StatCard
              label="Warnings"
              value={configAuditData?.summary?.warnings ?? 0}
              description="Recommended hardening items"
              icon={AlertTriangle}
              variant="warning"
              isLoading={isLoadingAudit}
            />
            <StatCard
              label="Failures"
              value={configAuditData?.summary?.failures ?? 0}
              description="Critical production readiness blockers"
              icon={XCircle}
              variant={configAuditData?.summary?.failures > 0 ? "rose" : "default"}
              isLoading={isLoadingAudit}
            />
          </div>

          <Card className="border border-border/80 rounded-xl bg-card shadow-xs overflow-hidden">
            <CardHeader className="p-4 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold">Live Environment &amp; Security Audit</CardTitle>
                <CardDescription className="text-xs">
                  Sanitized runtime diagnostics from `/super/config-audit` (evaluated{" "}
                  {configAuditData?.timestamp ? new Date(configAuditData.timestamp).toLocaleString() : "just now"}).
                </CardDescription>
              </div>
              <Badge variant={configAuditData?.isProductionReady ? "success" : "warning"}>
                {configAuditData?.isProductionReady ? "Production Ready" : "Action Needed"}
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto border-t border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Setting Key</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Category</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Status</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Sanitized Value</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Diagnostic &amp; Remediation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingAudit ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-28 text-center text-xs text-muted-foreground">
                          <Loader2 className="size-4 animate-spin text-primary inline mr-2" />
                          Running environment configuration audit...
                        </TableCell>
                      </TableRow>
                    ) : auditChecks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-28 text-center text-xs text-muted-foreground">
                          No audit checks returned by backend.
                        </TableCell>
                      </TableRow>
                    ) : (
                      auditChecks.map((check) => (
                        <TableRow key={check.key} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="font-semibold text-xs">{check.key}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {check.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                check.status === "PASS"
                                  ? "success"
                                  : check.status === "WARN"
                                  ? "warning"
                                  : "destructive"
                              }
                              className="text-[10px]"
                            >
                              {check.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[11px] text-muted-foreground max-w-[200px] truncate">
                            {check.valueSanitized}
                          </TableCell>
                          <TableCell className="text-xs">
                            <p className="text-foreground">{check.message}</p>
                            {check.remediation && (
                              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                                Remediation: {check.remediation}
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: GOOGLE ANALYTICS 4 (LOADED FROM DB, NO HARDCODED PLACEHOLDER) */}
        <TabsContent value="ga" className="space-y-4">
          <Card className="border border-border/80 rounded-xl bg-card shadow-xs p-5 max-w-xl">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-base font-semibold">Google Analytics 4 Measurement Tag</CardTitle>
              <CardDescription className="text-xs">
                Configure a real GA4 Measurement ID to enable tracking on public landing and marketing pages. Leave blank to disable.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-4 text-xs">
              {isLoadingGa ? (
                <div className="py-6 text-muted-foreground flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  Loading saved GA4 configuration...
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">GA4 Measurement ID</Label>
                    <Input
                      value={measurementId}
                      onChange={(e) => setMeasurementId(e.target.value)}
                      placeholder="G-XXXXXXXXXX"
                      className="h-9 text-xs"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={gaEnabled}
                      onChange={(e) => setGaEnabled(e.target.checked)}
                      className="rounded border-border text-primary h-4 w-4"
                    />
                    <span className="font-medium text-foreground">Enable GA4 script injection on public pages</span>
                  </label>
                  <Button
                    variant="primary"
                    onClick={() =>
                      saveGaMutation.mutate({
                        measurementId: measurementId.trim(),
                        enabled: gaEnabled && Boolean(measurementId.trim()),
                      })
                    }
                    disabled={saveGaMutation.isPending}
                    size="sm"
                  >
                    {saveGaMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    Save Analytics Config
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
