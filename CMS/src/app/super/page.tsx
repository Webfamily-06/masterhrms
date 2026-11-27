"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "@/src/lib/router-compat";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw } from "lucide-react";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface InsightsOverview {
  totals: {
    totalTenants: number;
    activeTenants: number;
    suspendedTenants: number;
    trialTenants: number;
    expiredTenants: number;
    todayNewTenants: number;
    tenantsThisMonth: number;
    tenantsLastMonth: number;
    tenantsDeltaPercent: number | null;
    totalUsers: number;
    totalEmployees: number;
    totalEarnings: number;
  };
  revenue: {
    year: number;
    currency: string;
    thisMonth: number;
    lastMonth: number;
    deltaPercent: number | null;
    yearTotal: number;
    previousYearTotal: number;
    yearDeltaPercent: number | null;
    monthlySeries: Array<{
      month: string;
      monthIndex: number;
      revenue: number;
      count: number;
    }>;
  };
  companiesRegistered: {
    range: "week" | "month" | "year";
    categories: string[];
    counts: number[];
    periodTotal: number;
    previousPeriodTotal: number;
    deltaPercent: number | null;
  };
  planDistribution: {
    range: "month" | "year";
    items: Array<{
      planId: string | null;
      name: string;
      count: number;
      percentage: number;
    }>;
    allTimeItems: Array<{
      planId: string | null;
      name: string;
      count: number;
      percentage: number;
    }>;
    totalInRange: number;
    totalAllTime: number;
  };
  recentTransactions: Array<{
    id: string;
    invoiceId: string;
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    companyLogo: string | null;
    amount: number;
    currency: string;
    status: "Paid" | "Unpaid" | "Failed";
    rawStatus: string;
    planName: string;
    billingCycle: string;
    paymentMethod: string;
    createdAt: string;
  }>;
  recentlyRegistered: Array<{
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    planName: string;
    billingCycle: string;
    usersCount: number;
    employeesCount: number;
    domain: string;
    createdAt: string;
  }>;
  recentlyExpired: Array<{
    id: string;
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    companyLogo: string | null;
    planName: string;
    billingCycle: string;
    status: string;
    expiresAt: string | null;
    adminEmail: string | null;
  }>;
  pendingRequests: Array<{
    id: string;
    ticketCode: string;
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    companyLogo: string | null;
    domain: string;
    subject: string;
    requestType: string;
    targetAddonSlug: string | null;
    priority: string;
    status: string;
    createdAt: string;
  }>;
  sparklines: {
    tenants: number[];
    revenue: number[];
  };
  measuredAt: string;
}

const PLAN_COLORS = ["#0d6efd", "#16a34a", "#f59e0b", "#7c3aed", "#0284c7", "#e11d48"];

function formatINR(amount: number, decimals = 0): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(safe);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function DeltaBadge({ delta }: { delta: number | null | undefined }) {
  if (delta === null || delta === undefined || !Number.isFinite(delta)) {
    return (
      <Badge variant="outline" className="text-[11px] font-medium text-muted-foreground">
        No prior data
      </Badge>
    );
  }
  const positive = delta >= 0;
  return (
    <Badge variant={positive ? "success" : "destructive"} className="text-[11px] font-semibold">
      {positive ? `+${delta}%` : `${delta}%`}
    </Badge>
  );
}

function SparklineBar({ data, color = "#0d6efd" }: { data: number[]; color?: string }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1 h-7 shrink-0" aria-hidden="true">
      {data.map((val, idx) => {
        const heightPct = val <= 0 ? 12 : Math.max(18, Math.round((val / max) * 100));
        return (
          <div
            key={idx}
            className="w-1.5 rounded-xs transition-all duration-300"
            style={{
              height: `${heightPct}%`,
              backgroundColor: color,
              opacity: val <= 0 ? 0.25 : 0.9,
            }}
          />
        );
      })}
    </div>
  );
}

function TenantAvatar({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  const initials = (name || "W")
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("");
  if (logoUrl) {
    return (
      <div className="size-9 rounded-lg bg-muted/60 border border-border/60 flex items-center justify-center overflow-hidden shrink-0">
        <img src={logoUrl} alt={name} className="size-full object-contain p-1" />
      </div>
    );
  }
  return (
    <div className="size-9 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-bold shrink-0">
      {initials || "W"}
    </div>
  );
}

export default function SuperDashboard() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const [isMounted, setIsMounted] = useState(false);

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(
    () => [String(currentYear), String(currentYear - 1), String(currentYear - 2)],
    [currentYear]
  );

  const [companyRange, setCompanyRange] = useState<"week" | "month" | "year">("week");
  const [revenueYear, setRevenueYear] = useState<string>(String(currentYear));
  const [plansRange, setPlansRange] = useState<"month" | "year">("month");
  const [expiredTab, setExpiredTab] = useState<"expired" | "request">("expired");
  const [remindingTenantId, setRemindingTenantId] = useState<string | null>(null);

  const [ticketActionDialog, setTicketActionDialog] = useState<{
    open: boolean;
    mode: "approve" | "reject";
    ticket: InsightsOverview["pendingRequests"][number] | null;
    note: string;
  }>({
    open: false,
    mode: "approve",
    ticket: null,
    note: "",
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    data: overview,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<InsightsOverview>({
    queryKey: ["super-insights-overview", revenueYear, companyRange, plansRange],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const res = await api.get(
        `/super/insights/overview?year=${encodeURIComponent(revenueYear)}&companyRange=${encodeURIComponent(
          companyRange
        )}&plansRange=${encodeURIComponent(plansRange)}`
      );
      return (res?.data || res || {}) as InsightsOverview;
    },
  });

  const remindMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      setRemindingTenantId(tenantId);
      const res = await api.post(`/super/insights/tenants/${encodeURIComponent(tenantId)}/remind`, {});
      return res?.data || res || {};
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || "Subscription renewal reminder email dispatched.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to send renewal reminder email.");
    },
    onSettled: () => {
      setRemindingTenantId(null);
    },
  });

  const ticketActionMutation = useMutation({
    mutationFn: async (payload: {
      ticketId: string;
      mode: "approve" | "reject";
      targetAddonSlug: string | null;
      note: string;
    }) => {
      const isApprove = payload.mode === "approve";
      const body = isApprove
        ? {
          action: payload.targetAddonSlug ? "activate_addon" : "approved",
          status: "resolved",
          adminNotes: payload.note.trim() || "Approved from Super Admin Dashboard",
          replyMessage:
            payload.note.trim() ||
            "Your upgrade/addon request has been reviewed and approved by Platform Administration.",
        }
        : {
          action: "rejected",
          status: "closed",
          adminNotes: payload.note.trim() || "Rejected from Super Admin Dashboard",
          replyMessage:
            payload.note.trim() ||
            "Your request could not be approved at this time. Please contact platform support for details.",
        };

      const res = await api.post(`/support/platform/tickets/${encodeURIComponent(payload.ticketId)}/action`, body);
      return res?.data || res || {};
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.mode === "approve"
          ? "Request approved and ticket resolved."
          : "Request rejected and ticket closed."
      );
      setTicketActionDialog({ open: false, mode: "approve", ticket: null, note: "" });
      qc.invalidateQueries({ queryKey: ["super-insights-overview"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to process ticket action.");
    },
  });

  const totals = overview?.totals;
  const revenue = overview?.revenue;
  const companiesReg = overview?.companiesRegistered;
  const planDist = overview?.planDistribution;

  const activePlanItems = useMemo(() => {
    if (!planDist) return [];
    return planDist.items && planDist.items.length > 0 ? planDist.items : [];
  }, [planDist]);

  const companyChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: "bar",
        toolbar: { show: false },
        fontFamily: "inherit",
      },
      colors: ["#0d6efd"],
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: "46%",
        },
      },
      xaxis: {
        categories: companiesReg?.categories || [],
        labels: { style: { colors: "#64748b", fontSize: "11px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: {
          style: { colors: "#64748b", fontSize: "11px" },
          formatter: (val: number) => String(Math.round(val)),
        },
      },
      grid: {
        borderColor: "rgba(148, 163, 184, 0.2)",
        strokeDashArray: 4,
      },
      dataLabels: { enabled: false },
      legend: { show: false },
      tooltip: {
        theme: "dark",
        y: {
          formatter: (val: number) => `${val} ${val === 1 ? "Workspace" : "Workspaces"}`,
        },
      },
    }),
    [companiesReg]
  );

  const companyChartSeries = useMemo(
    () => [
      {
        name: "Registered",
        data: companiesReg?.counts || [],
      },
    ],
    [companiesReg]
  );

  const revenueChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: "bar",
        toolbar: { show: false },
        fontFamily: "inherit",
      },
      colors: ["#0d6efd"],
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: "52%",
        },
      },
      xaxis: {
        categories: (revenue?.monthlySeries || []).map((m) => m.month),
        labels: { style: { colors: "#64748b", fontSize: "11px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        min: 0,
        labels: {
          style: { colors: "#64748b", fontSize: "11px" },
          formatter: (val: number) => {
            if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
            if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
            return `₹${Math.round(val)}`;
          },
        },
      },
      grid: {
        borderColor: "rgba(148, 163, 184, 0.2)",
        strokeDashArray: 4,
      },
      dataLabels: { enabled: false },
      legend: { show: false },
      tooltip: {
        theme: "dark",
        y: {
          formatter: (val: number) => formatINR(val, 2),
        },
      },
    }),
    [revenue]
  );

  const revenueChartSeries = useMemo(
    () => [
      {
        name: `Revenue (${revenueYear})`,
        data: (revenue?.monthlySeries || []).map((m) => m.revenue),
      },
    ],
    [revenue, revenueYear]
  );

  const planChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: "donut",
        toolbar: { show: false },
        fontFamily: "inherit",
      },
      colors: PLAN_COLORS,
      labels: activePlanItems.map((p) => p.name),
      plotOptions: {
        pie: {
          donut: {
            size: "64%",
            labels: {
              show: true,
              total: {
                show: true,
                label: "Plans",
                formatter: () => String(planDist?.totalInRange || 0),
              },
            },
          },
        },
      },
      stroke: { width: 0 },
      legend: { show: false },
      dataLabels: { enabled: false },
      tooltip: {
        theme: "dark",
        y: {
          formatter: (val: number) => `${val} ${val === 1 ? "tenant" : "tenants"}`,
        },
      },
    }),
    [activePlanItems, planDist]
  );

  const planChartSeries = useMemo(() => activePlanItems.map((p) => p.count), [activePlanItems]);

  const adminGreetingName =
    profile?.full_name?.trim()?.split(/\s+/)[0] ||
    profile?.email?.split("@")[0] ||
    "Administrator";

  const activeRatio =
    totals && totals.totalTenants > 0
      ? Math.round((totals.activeTenants / totals.totalTenants) * 100)
      : 0;

  return (
    <div className="w-full min-w-0 space-y-5">
      <PageHeader
        title="Super Admin Dashboard"
        description={`Welcome back, ${adminGreetingName}. Real-time platform telemetry across tenants, subscriptions, billing, and support requests.`}
        icon={<i className="ph-duotone ph-squares-four text-2xl" />}
        badge={
          <Badge variant="soft" className="text-[11px]">
            <i className="ph ph-pulse mr-1" />
            Live Telemetry
          </Badge>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to="/super/notifications">
                <i className="ph ph-megaphone text-sm" />
                Broadcast Alert
              </Link>
            </Button>
            <Button asChild variant="primary" size="sm" className="gap-1.5">
              <Link to="/super/tenants">
                <i className="ph ph-plus text-sm" />
                Create Tenant
              </Link>
            </Button>
          </>
        }
      />

      {error && (
        <Card className="p-4 border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <i className="ph ph-warning-circle text-base shrink-0" />
            <span>Failed to load live dashboard metrics. Check your network or server connection.</span>
          </div>
          <Button variant="outline" size="xs" onClick={() => refetch()}>
            Retry
          </Button>
        </Card>
      )}

      {/* ─── Welcome Summary Strip ─────────────────────────────────────────── */}
      <Card className="border border-border/80 rounded-xl bg-slate-900 text-white p-5 sm:p-6 shadow-xs overflow-hidden relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Welcome back, {adminGreetingName}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              {isLoading ? (
                "Syncing workspace registrations..."
              ) : (
                <>
                  <span className="font-semibold text-white">{totals?.todayNewTenants ?? 0}</span>{" "}
                  {(totals?.todayNewTenants ?? 0) === 1 ? "new workspace" : "new workspaces"} provisioned today
                  {" · "}
                  <span className="font-semibold text-white">{totals?.suspendedTenants ?? 0}</span> suspended
                  {" · "}
                  <span className="font-semibold text-white">{totals?.trialTenants ?? 0}</span> on trial
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button asChild variant="secondary" size="sm">
              <Link to="/super/tenants">
                <i className="ph ph-buildings text-sm" />
                Companies
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="bg-transparent border-slate-700 text-white hover:bg-slate-800 hover:text-white">
              <Link to="/super/plans">
                <i className="ph ph-package text-sm" />
                All Packages
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="bg-transparent border-slate-700 text-white hover:bg-slate-800 hover:text-white">
              <Link to="/super/referrals">
                <i className="ph ph-gift text-sm" />
                Referrals
              </Link>
            </Button>
          </div>
        </div>
      </Card>

      {/* ─── ROW 1: 4 Live KPI Stat Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Companies */}
        <Card className="border border-border/80 rounded-xl bg-card p-5 shadow-xs flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <span className="size-10 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <i className="ph ph-buildings text-lg" />
            </span>
            <DeltaBadge delta={totals?.tenantsDeltaPercent} />
          </div>
          <div className="flex items-end justify-between gap-2">
            <div>
              {isLoading ? (
                <Skeleton className="h-7 w-20 mb-1" />
              ) : (
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {(totals?.totalTenants ?? 0).toLocaleString("en-IN")}
                </div>
              )}
              <p className="text-xs text-muted-foreground font-medium">Total Companies</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {totals?.tenantsThisMonth ?? 0} this month
              </p>
            </div>
            <SparklineBar data={overview?.sparklines?.tenants || []} color="#0d6efd" />
          </div>
        </Card>

        {/* KPI 2: Active Companies */}
        <Card className="border border-border/80 rounded-xl bg-card p-5 shadow-xs flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <span className="size-10 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
              <i className="ph ph-check-circle text-lg" />
            </span>
            <Badge variant="success" className="text-[11px]">
              {activeRatio}% active
            </Badge>
          </div>
          <div className="flex items-end justify-between gap-2">
            <div>
              {isLoading ? (
                <Skeleton className="h-7 w-20 mb-1" />
              ) : (
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {(totals?.activeTenants ?? 0).toLocaleString("en-IN")}
                </div>
              )}
              <p className="text-xs text-muted-foreground font-medium">Active Companies</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {totals?.expiredTenants ?? 0} expired · {totals?.suspendedTenants ?? 0} suspended
              </p>
            </div>
          </div>
        </Card>

        {/* KPI 3: Total Platform Users & Employees */}
        <Card className="border border-border/80 rounded-xl bg-card p-5 shadow-xs flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <span className="size-10 rounded-lg bg-sky-500/10 text-sky-600 border border-sky-500/20 flex items-center justify-center">
              <i className="ph ph-users-three text-lg" />
            </span>
            <Badge variant="info" className="text-[11px]">
              {(totals?.totalEmployees ?? 0).toLocaleString("en-IN")} employees
            </Badge>
          </div>
          <div className="flex items-end justify-between gap-2">
            <div>
              {isLoading ? (
                <Skeleton className="h-7 w-20 mb-1" />
              ) : (
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {(totals?.totalUsers ?? 0).toLocaleString("en-IN")}
                </div>
              )}
              <p className="text-xs text-muted-foreground font-medium">Total Platform Users</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Across all tenant workspaces
              </p>
            </div>
          </div>
        </Card>

        {/* KPI 4: Revenue This Month (INR) */}
        <Card className="border border-border/80 rounded-xl bg-card p-5 shadow-xs flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <span className="size-10 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center">
              <i className="ph ph-currency-inr text-lg" />
            </span>
            <DeltaBadge delta={revenue?.deltaPercent} />
          </div>
          <div className="flex items-end justify-between gap-2">
            <div>
              {isLoading ? (
                <Skeleton className="h-7 w-28 mb-1" />
              ) : (
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {formatINR(revenue?.thisMonth ?? 0)}
                </div>
              )}
              <p className="text-xs text-muted-foreground font-medium">Revenue This Month</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                All-time: {formatINR(totals?.totalEarnings ?? 0)}
              </p>
            </div>
            <SparklineBar data={overview?.sparklines?.revenue || []} color="#f59e0b" />
          </div>
        </Card>
      </div>

      {/* ─── ROW 2: Live Charts (Companies, Revenue, Plan Distribution) ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Companies Registered Chart */}
        <Card className="lg:col-span-3 border border-border/80 rounded-xl bg-card p-5 shadow-xs flex flex-col justify-between min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/60">
            <h3 className="text-sm font-semibold text-foreground">Companies</h3>
            <Select
              value={companyRange}
              onValueChange={(v) => setCompanyRange(v as "week" | "month" | "year")}
            >
              <SelectTrigger className="h-7 w-[112px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="my-2 min-h-[250px] flex items-center justify-center min-w-0 overflow-hidden">
            {isLoading ? (
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            ) : isMounted && (companiesReg?.counts?.some((c) => c > 0) ?? false) ? (
              <div className="w-full min-w-0 overflow-hidden">
                <Suspense fallback={<div className="text-xs text-muted-foreground text-center">Loading chart...</div>}>
                  <Chart
                    options={companyChartOptions}
                    series={companyChartSeries}
                    type="bar"
                    height={250}
                    width="100%"
                  />
                </Suspense>
              </div>
            ) : (
              <div className="text-center py-8 px-4">
                <i className="ph ph-chart-bar text-2xl text-muted-foreground/60 mb-2 block" />
                <p className="text-xs font-medium text-muted-foreground">No registrations in this period</p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              <strong className="text-foreground">{companiesReg?.periodTotal ?? 0}</strong> new
            </span>
            <DeltaBadge delta={companiesReg?.deltaPercent} />
          </div>
        </Card>

        {/* Monthly Revenue Chart */}
        <Card className="lg:col-span-6 border border-border/80 rounded-xl bg-card p-5 shadow-xs flex flex-col justify-between min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/60">
            <h3 className="text-sm font-semibold text-foreground">Revenue</h3>
            <Select value={revenueYear} onValueChange={setRevenueYear}>
              <SelectTrigger className="h-7 w-[92px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2 pt-3 pb-1">
            <div>
              <div className="text-xl font-bold tracking-tight text-foreground">
                {formatINR(revenue?.yearTotal ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total paid revenue in {revenueYear} (vs {formatINR(revenue?.previousYearTotal ?? 0)} in{" "}
                {Number(revenueYear) - 1})
              </p>
            </div>
            <DeltaBadge delta={revenue?.yearDeltaPercent} />
          </div>

          <div className="my-1 min-h-[250px] flex items-center justify-center min-w-0 overflow-hidden">
            {isLoading ? (
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            ) : isMounted && (revenue?.yearTotal ?? 0) > 0 ? (
              <div className="w-full min-w-0 overflow-hidden">
                <Suspense fallback={<div className="text-xs text-muted-foreground text-center">Loading chart...</div>}>
                  <Chart
                    options={revenueChartOptions}
                    series={revenueChartSeries}
                    type="bar"
                    height={250}
                    width="100%"
                  />
                </Suspense>
              </div>
            ) : (
              <div className="text-center py-8 px-4">
                <i className="ph ph-currency-inr text-2xl text-muted-foreground/60 mb-2 block" />
                <p className="text-xs font-medium text-muted-foreground">
                  No paid revenue recorded for {revenueYear}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Top Plans Donut */}
        <Card className="lg:col-span-3 border border-border/80 rounded-xl bg-card p-5 shadow-xs flex flex-col justify-between min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/60">
            <h3 className="text-sm font-semibold text-foreground">Plan Distribution</h3>
            <Select value={plansRange} onValueChange={(v) => setPlansRange(v as "month" | "year")}>
              <SelectTrigger className="h-7 w-[108px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Last 30d</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="my-2 min-h-[210px] flex items-center justify-center min-w-0 overflow-hidden">
            {isLoading ? (
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            ) : isMounted && activePlanItems.length > 0 ? (
              <div className="w-full min-w-0 overflow-hidden">
                <Suspense fallback={<div className="text-xs text-muted-foreground text-center">Loading chart...</div>}>
                  <Chart
                    options={planChartOptions}
                    series={planChartSeries}
                    type="donut"
                    height={210}
                    width="100%"
                  />
                </Suspense>
              </div>
            ) : (
              <div className="text-center py-6 px-4">
                <i className="ph ph-chart-donut text-2xl text-muted-foreground/60 mb-2 block" />
                <p className="text-xs font-medium text-muted-foreground">
                  No subscription activity in selected range
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1.5 pt-3 border-t border-border/60">
            {activePlanItems.length > 0 ? (
              activePlanItems.slice(0, 4).map((item, idx) => (
                <div key={item.planId || item.name} className="flex items-center justify-between text-xs gap-2">
                  <span className="flex items-center gap-1.5 text-muted-foreground truncate">
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: PLAN_COLORS[idx % PLAN_COLORS.length] }}
                    />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="font-semibold text-foreground shrink-0">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-muted-foreground text-center">
                Total active subscriptions all-time: {planDist?.totalAllTime ?? 0}
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* ─── ROW 3: Live Operational Monitoring (3 Equal Columns) ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Column 1: Recent Transactions */}
        <Card className="lg:col-span-4 border border-border/80 rounded-xl bg-card p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
            <h3 className="text-sm font-semibold text-foreground">Recent Transactions</h3>
            <Button asChild variant="outline" size="xs">
              <Link to="/super/transactions">View All</Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <Skeleton key={n} className="h-11 w-full rounded-lg" />
              ))}
            </div>
          ) : (overview?.recentTransactions?.length ?? 0) === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
              <i className="ph ph-receipt text-2xl text-muted-foreground/60 mb-2" />
              <p className="text-xs font-medium text-muted-foreground">No transactions recorded yet</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {overview!.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <TenantAvatar name={tx.tenantName} logoUrl={tx.companyLogo} />
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{tx.tenantName}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5 truncate">
                        <span className="tabular-nums text-sky-600 dark:text-sky-400">{tx.invoiceId}</span>
                        <span>·</span>
                        <span>{formatDate(tx.createdAt)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-foreground">{formatINR(tx.amount)}</p>
                    <Badge
                      variant={
                        tx.status === "Paid"
                          ? "success"
                          : tx.status === "Failed"
                            ? "destructive"
                            : "warning"
                      }
                      className="text-[10px] px-1.5 py-0 mt-0.5"
                    >
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Column 2: Recently Registered */}
        <Card className="lg:col-span-4 border border-border/80 rounded-xl bg-card p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
            <h3 className="text-sm font-semibold text-foreground">Recently Registered</h3>
            <Button asChild variant="outline" size="xs">
              <Link to="/super/tenants">View All</Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <Skeleton key={n} className="h-11 w-full rounded-lg" />
              ))}
            </div>
          ) : (overview?.recentlyRegistered?.length ?? 0) === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
              <i className="ph ph-buildings text-2xl text-muted-foreground/60 mb-2" />
              <p className="text-xs font-medium text-muted-foreground">No workspaces registered yet</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {overview!.recentlyRegistered.map((tenant) => (
                <div key={tenant.id} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <TenantAvatar name={tenant.name} logoUrl={tenant.logoUrl} />
                    <div className="min-w-0">
                      <Link
                        to="/super/tenants"
                        className="font-semibold text-foreground hover:text-primary transition-colors truncate block"
                      >
                        {tenant.name}
                      </Link>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {tenant.planName} ({tenant.billingCycle})
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-medium text-foreground">
                      {tenant.usersCount} {tenant.usersCount === 1 ? "User" : "Users"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate max-w-[130px]">
                      {tenant.domain}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Column 3: Recently Expired & Pending Requests */}
        <Card className="lg:col-span-4 border border-border/80 rounded-xl bg-card p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/60 mb-3">
            <h3 className="text-sm font-semibold text-foreground">
              {expiredTab === "expired" ? "Expired Plans" : "Pending Requests"}
            </h3>

            <div className="flex items-center p-0.5 bg-muted rounded-md border border-border/60">
              <button
                type="button"
                onClick={() => setExpiredTab("expired")}
                className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors cursor-pointer ${expiredTab === "expired"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Expired ({overview?.recentlyExpired?.length ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setExpiredTab("request")}
                className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors cursor-pointer ${expiredTab === "request"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Requests ({overview?.pendingRequests?.length ?? 0})
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <Skeleton key={n} className="h-11 w-full rounded-lg" />
              ))}
            </div>
          ) : expiredTab === "expired" ? (
            (overview?.recentlyExpired?.length ?? 0) === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                <i className="ph ph-check-circle text-2xl text-emerald-600/70 mb-2" />
                <p className="text-xs font-medium text-muted-foreground">No expired subscriptions</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {overview!.recentlyExpired.map((item) => {
                  const isSending = remindingTenantId === item.tenantId;
                  return (
                    <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <TenantAvatar name={item.tenantName} logoUrl={item.companyLogo} />
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{item.tenantName}</p>
                          <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
                            Expired: {formatDate(item.expiresAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 space-y-0.5">
                        <Button
                          variant="ghost"
                          size="xs"
                          disabled={isSending}
                          onClick={() => remindMutation.mutate(item.tenantId)}
                          className="h-6 px-2 text-[11px] text-primary hover:text-primary"
                        >
                          {isSending ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <i className="ph ph-envelope-simple text-xs" />
                          )}
                          Send Reminder
                        </Button>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                          {item.planName}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (overview?.pendingRequests?.length ?? 0) === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
              <i className="ph ph-tray text-2xl text-muted-foreground/60 mb-2" />
              <p className="text-xs font-medium text-muted-foreground">
                No pending plan or add-on upgrade requests
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {overview!.pendingRequests.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <TenantAvatar name={ticket.tenantName} logoUrl={ticket.companyLogo} />
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{ticket.tenantName}</p>
                      <p className="text-[11px] text-muted-foreground truncate" title={ticket.subject}>
                        {ticket.subject}
                      </p>
                      <p className="text-[10px] text-sky-600 dark:text-sky-400 mt-0.5">
                        {ticket.ticketCode} · {ticket.requestType}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="soft"
                      size="xs"
                      onClick={() =>
                        setTicketActionDialog({
                          open: true,
                          mode: "approve",
                          ticket,
                          note: "",
                        })
                      }
                      className="h-7 px-2 text-[11px] text-emerald-700 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 dark:text-emerald-400"
                    >
                      Approve
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() =>
                        setTicketActionDialog({
                          open: true,
                          mode: "reject",
                          ticket,
                          note: "",
                        })
                      }
                      className="h-7 px-2 text-[11px] text-rose-600 hover:bg-rose-500/10 hover:text-rose-600 dark:text-rose-400"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ─── Ticket Approve / Reject Confirmation Dialog ───────────────────── */}
      <ConfirmationDialog
        open={ticketActionDialog.open}
        onOpenChange={(open) =>
          setTicketActionDialog((prev) => ({ ...prev, open }))
        }
        variant={ticketActionDialog.mode === "reject" ? "destructive" : "default"}
        icon={
          ticketActionDialog.mode === "approve" ? (
            <i className="ph ph-check-circle text-xl" />
          ) : (
            <i className="ph ph-x-circle text-xl" />
          )
        }
        title={
          ticketActionDialog.mode === "approve"
            ? `Approve request from ${ticketActionDialog.ticket?.tenantName || "tenant"}?`
            : `Reject request from ${ticketActionDialog.ticket?.tenantName || "tenant"}?`
        }
        description={
          ticketActionDialog.ticket
            ? `Ticket ${ticketActionDialog.ticket.ticketCode}: ${ticketActionDialog.ticket.subject}${ticketActionDialog.mode === "approve" && ticketActionDialog.ticket.targetAddonSlug
              ? ` — This will automatically activate add-on "${ticketActionDialog.ticket.targetAddonSlug}".`
              : ""
            }`
            : ""
        }
        confirmLabel={ticketActionDialog.mode === "approve" ? "Approve Request" : "Reject Request"}
        isLoading={ticketActionMutation.isPending}
        onConfirm={() => {
          if (!ticketActionDialog.ticket) return;
          ticketActionMutation.mutate({
            ticketId: ticketActionDialog.ticket.id,
            mode: ticketActionDialog.mode,
            targetAddonSlug: ticketActionDialog.ticket.targetAddonSlug,
            note: ticketActionDialog.note,
          });
        }}
      >
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            {ticketActionDialog.mode === "approve" ? "Approval Note (optional)" : "Rejection Reason (optional)"}
          </Label>
          <Textarea
            rows={2}
            value={ticketActionDialog.note}
            onChange={(e) =>
              setTicketActionDialog((prev) => ({ ...prev, note: e.target.value }))
            }
            placeholder={
              ticketActionDialog.mode === "approve"
                ? "Add a note for the workspace admin..."
                : "Explain why this request was declined..."
            }
            className="text-xs"
          />
        </div>
      </ConfirmationDialog>
    </div>
  );
}
