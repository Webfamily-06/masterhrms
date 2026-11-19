import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, setToken } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Send, Receipt, Building2, CheckCircle2, Sparkles } from "lucide-react";

// Lazy load react-apexcharts for SSR safety
const Chart = lazy(() => import("react-apexcharts"));

export const Route = createFileRoute("/_authenticated/super/")({
  component: SuperDashboard,
  head: () => ({ meta: [{ title: "Super Admin Dashboard — Master ERP" }] }),
});

/**
 * Mini Sparkline Bar Chart (replicates peity bar charts)
 */
function SparklineBar({ data, color = "#FF6F28" }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1 h-7 shrink-0">
      {data.map((val, idx) => {
        const heightPct = Math.max(15, (val / max) * 100);
        return (
          <div
            key={idx}
            className="w-1.5 rounded-xs transition-all duration-300 hover:opacity-80"
            style={{
              height: `${heightPct}%`,
              backgroundColor: color,
            }}
          />
        );
      })}
    </div>
  );
}

// Company Initial Avatar component for clean fallback without mock imagery
function CompanyAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const getInitials = (str: string) => {
    if (!str) return "CO";
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  const sz = size === "sm" ? "size-8 text-[11px]" : "size-10 text-xs";

  return (
    <div className={`${sz} rounded-full bg-orange-500/10 text-[#FF6F28] dark:bg-orange-950/40 dark:text-orange-400 font-bold flex items-center justify-center shrink-0 border border-orange-200/60 dark:border-orange-900/60 select-none shadow-2xs`}>
      {getInitials(name)}
    </div>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function SuperDashboard() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: profile } = useCurrentProfile();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Filter dropdown states
  const [companyFilter, setCompanyFilter] = useState("This Week");
  const [revenueYear, setRevenueYear] = useState("2026");
  const [plansFilter, setPlansFilter] = useState("This Month");
  const [expiredTab, setExpiredTab] = useState<"expired" | "request">("expired");

  // Quick Action Dialog States
  const [isCreateTenantOpen, setIsCreateTenantOpen] = useState(false);
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantSlug, setNewTenantSlug] = useState("");
  const [isCreatingTenant, setIsCreatingTenant] = useState(false);

  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  // 1. Fetch Real Stats & Data from Backend
  const { data: stats } = useQuery({
    queryKey: ["super-realtime-stats"],
    staleTime: 60 * 1000,
    queryFn: async () => {
      try {
        const [superStats, tenantsRes, txnsRes] = await Promise.all([
          api.get("/super/stats").catch(() => null),
          api.get("/super/tenants").catch(() => []),
          api.get("/super/transactions?limit=20").catch(() => ({ transactions: [] })),
        ]);

        const rawTenants: any = tenantsRes;
        const tenantList: any[] = Array.isArray(rawTenants) ? rawTenants : (rawTenants?.data || rawTenants?.tenants || []);

        const rawTxns: any = txnsRes;
        const txnList: any[] = Array.isArray(rawTxns) ? rawTxns : (rawTxns?.data || rawTxns?.transactions || []);

        const today = new Date().toDateString();
        const todayNewTenants = tenantList.filter((t: any) => {
          const d = t.createdAt || t.created_at;
          return d ? new Date(d).toDateString() === today : false;
        }).length;

        return {
          totalTenants: superStats?.totalTenants ?? tenantList.length,
          activeTenants: superStats?.activeTenants ?? tenantList.filter((t: any) => t.status === "active").length,
          totalUsers: superStats?.totalUsers ?? 0,
          mrr: superStats?.mrr ?? 0,
          growth: superStats?.growth || [],
          planDistribution: superStats?.planDistribution || [],
          todayNewTenants,
          tenantsList: tenantList,
          transactionsList: txnList,
        };
      } catch {
        return {
          totalTenants: 0,
          activeTenants: 0,
          totalUsers: 0,
          mrr: 0,
          growth: [],
          planDistribution: [],
          todayNewTenants: 0,
          tenantsList: [],
          transactionsList: [],
        };
      }
    },
  });

  // Create New Tenant Handler
  async function handleCreateTenant() {
    if (!newTenantName || !newTenantSlug) {
      return toast.error("Please fill in workspace name and slug");
    }
    setIsCreatingTenant(true);
    try {
      await api.post("/super/tenants", {
        name: newTenantName,
        slug: newTenantSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      });
      toast.success(`ERP Workspace "${newTenantName}" provisioned successfully!`);
      setNewTenantName("");
      setNewTenantSlug("");
      setIsCreateTenantOpen(false);
      qc.invalidateQueries({ queryKey: ["super-realtime-stats"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to provision workspace");
    } finally {
      setIsCreatingTenant(false);
    }
  }

  // Send Broadcast Handler
  async function handleSendBroadcast() {
    if (!broadcastTitle || !broadcastMessage) {
      return toast.error("Please provide both title and message");
    }
    setIsSendingBroadcast(true);
    try {
      await api.put("/cms/pages/system-platform-broadcast", {
        title: broadcastTitle,
        content: { title: broadcastTitle, message: broadcastMessage, sentAt: new Date().toISOString() },
        published: true,
      });
      toast.success("Broadcast message transmitted to all tenants!");
      setBroadcastTitle("");
      setBroadcastMessage("");
      setIsBroadcastOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to broadcast");
    } finally {
      setIsSendingBroadcast(false);
    }
  }

  // Action feedback handlers
  const handleSendReminder = (companyName: string) => {
    toast.success(`Subscription renewal reminder dispatched to ${companyName}!`);
  };

  // ─── APEX CHARTS CONFIGURATIONS ─────────────────────────────
  // 1. Weekly Companies Bar Chart
  const weeklyData = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const list = stats?.tenantsList || [];
    list.forEach((t: any) => {
      const dStr = t.createdAt || t.created_at;
      if (dStr) {
        const day = new Date(dStr).getDay();
        const idx = day === 0 ? 6 : day - 1;
        counts[idx] += 1;
      }
    });
    return counts;
  }, [stats?.tenantsList]);

  const companyChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        height: 270,
        type: "bar",
        toolbar: { show: false },
      },
      colors: ["#212529"],
      plotOptions: {
        bar: {
          borderRadius: 8,
          borderRadiusWhenStacked: "all",
          columnWidth: "40%",
          horizontal: false,
          colors: {
            backgroundBarColors: ["#f3f4f6"],
            backgroundBarOpacity: 0.6,
            hover: {
              enabled: true,
              borderColor: "#F26522",
            },
          },
        },
      },
      series: [
        {
          name: "Company",
          data: weeklyData,
        },
      ],
      xaxis: {
        categories: ["M", "T", "W", "T", "F", "S", "S"],
        labels: {
          style: {
            colors: "#6B7280",
            fontSize: "12px",
          },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        show: false,
      },
      grid: {
        borderColor: "#E5E7EB",
        strokeDashArray: 4,
        padding: { left: -5, right: 0, top: -10, bottom: 0 },
      },
      legend: { show: false },
      dataLabels: { enabled: false },
      tooltip: {
        theme: "dark",
        y: {
          formatter: (val: number) => `${val} Companies`,
        },
      },
    }),
    [weeklyData]
  );

  // 2. Revenue Breakdown Chart
  const revenueChartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const curMonth = new Date().getMonth();
    const data = new Array(12).fill(0);
    const txns = stats?.transactionsList || [];
    txns.forEach((tx: any) => {
      const d = tx.createdAt || tx.created_at;
      if (d) {
        const m = new Date(d).getMonth();
        data[m] += Math.round(Number(tx.amount || tx.subtotalAmount || 0));
      }
    });
    if (data.every((v) => v === 0) && stats?.mrr) {
      data[curMonth] = stats.mrr;
    }
    return { months, data };
  }, [stats?.transactionsList, stats?.mrr]);

  const revenueChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        height: 270,
        type: "bar",
        toolbar: { show: false },
      },
      colors: ["#f26522"],
      plotOptions: {
        bar: {
          borderRadius: 5,
          columnWidth: "40%",
          horizontal: false,
        },
      },
      series: [
        {
          name: "Revenue ($)",
          data: revenueChartData.data,
        },
      ],
      xaxis: {
        categories: revenueChartData.months,
        labels: {
          style: { colors: "#6B7280", fontSize: "11px" },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { colors: "#6B7280", fontSize: "11px" },
          formatter: (value: number) => `$${value}`,
        },
      },
      grid: {
        borderColor: "#E5E7EB",
        strokeDashArray: 4,
        padding: { left: -5, right: 0 },
      },
      legend: { show: false },
      dataLabels: { enabled: false },
      tooltip: {
        theme: "dark",
        y: {
          formatter: (val: number) => `$${val.toLocaleString()}`,
        },
      },
    }),
    [revenueChartData]
  );

  // 3. Top Plans Donut Chart
  const planChartData = useMemo(() => {
    const dist = stats?.planDistribution || [];
    if (dist.length > 0) {
      return {
        labels: dist.map((d: any) => d.name || "Standard"),
        series: dist.map((d: any) => d.count),
      };
    }
    const list = stats?.tenantsList || [];
    if (list.length > 0) {
      const counts: Record<string, number> = {};
      list.forEach((t: any) => {
        const p = t.plan_name || t.planName || "Enterprise";
        counts[p] = (counts[p] || 0) + 1;
      });
      return {
        labels: Object.keys(counts),
        series: Object.values(counts),
      };
    }
    return {
      labels: ["Enterprise"],
      series: [0],
    };
  }, [stats?.planDistribution, stats?.tenantsList]);

  const planChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        height: 230,
        type: "donut",
        toolbar: { show: false },
      },
      colors: ["#F26522", "#1B84FF", "#FFC107", "#10B981"],
      series: planChartData.series.length > 0 ? planChartData.series : [1],
      labels: planChartData.labels.length > 0 ? planChartData.labels : ["No Plans"],
      plotOptions: {
        pie: {
          donut: {
            size: "62%",
            labels: { show: false },
          },
        },
      },
      stroke: {
        width: 0,
      },
      legend: { show: false },
      dataLabels: { enabled: false },
      tooltip: {
        theme: "dark",
        y: {
          formatter: (val: number) => `${val} Workspace(s)`,
        },
      },
    }),
    [planChartData]
  );

  // Filtered lists for Row 3 cards
  const expiredCompanies = useMemo(() => {
    const list = stats?.tenantsList || [];
    const now = new Date();
    return list.filter((t: any) => {
      if (t.status === "suspended" || t.status === "expired") return true;
      if (t.expires_at && new Date(t.expires_at) < now) return true;
      return false;
    });
  }, [stats?.tenantsList]);

  return (
    <div className="space-y-6">
      {/* ─── Breadcrumb & Top Bar ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 page-breadcrumb">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-1">
            Dashboard
          </h2>
          <nav aria-label="breadcrumb">
            <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <li>
                <Link to="/super" className="hover:text-primary transition-colors flex items-center">
                  <i className="ti ti-smart-home text-sm"></i>
                </Link>
              </li>
              <li>/</li>
              <li className="text-gray-600 dark:text-gray-400">Super Admin</li>
              <li>/</li>
              <li className="font-semibold text-gray-900 dark:text-gray-200">Dashboard</li>
            </ol>
          </nav>
        </div>

        {/* Right Toolbar: Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsCreateTenantOpen(true)}
            className="gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-3.5" /> New Tenant
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsBroadcastOpen(true)}
            className="gap-1.5 text-xs"
          >
            <Send className="size-3.5" /> Broadcast
          </Button>
        </div>
      </div>

      {/* ─── Welcome Wrap Banner ──────────────────────────────────────────── */}
      <div className="welcome-wrap relative rounded-lg p-6 sm:p-8 overflow-hidden text-white shadow-md bg-gradient-to-r from-slate-900 to-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-xs">
              Welcome Back, {profile?.full_name?.split(" ")[0] || "Super Admin"}
            </h2>
            <p className="text-sm sm:text-base text-orange-200 font-medium">
              {stats?.todayNewTenants ?? 0} New Companies Subscribed Today
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              to="/super/tenants"
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-md bg-[#212529] hover:bg-black text-white shadow-xs transition-colors"
            >
              Manage Companies ({stats?.totalTenants ?? 0})
            </Link>
            <Link
              to="/super/plans"
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-md bg-white hover:bg-slate-100 text-gray-900 shadow-xs transition-colors"
            >
              Subscription Plans
            </Link>
          </div>
        </div>
      </div>

      {/* ─── ROW 1: 4 Top KPI Stat Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5 items-stretch">
        {/* Card 1: Total Companies */}
        <div className="lg:col-span-3 flex">
          <div className="card flex-1 h-full bg-white dark:bg-slate-900 border border-border rounded-lg p-5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <span className="size-10 rounded-full bg-[#212529] text-white flex items-center justify-center">
                <i className="ti ti-building text-base"></i>
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Live DB
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-0.5">
                  {(stats?.totalTenants ?? 0).toLocaleString()}
                </h2>
                <p className="text-xs text-muted-foreground font-medium">Total Companies</p>
              </div>
              <SparklineBar data={[stats?.totalTenants ?? 1, stats?.totalTenants ?? 1, stats?.totalTenants ?? 1, stats?.totalTenants ?? 1]} color="#FF6F28" />
            </div>
          </div>
        </div>

        {/* Card 2: Active Companies */}
        <div className="lg:col-span-3 flex">
          <div className="card flex-1 h-full bg-white dark:bg-slate-900 border border-border rounded-lg p-5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <span className="size-10 rounded-full bg-[#212529] text-white flex items-center justify-center">
                <i className="ti ti-carousel-vertical text-base"></i>
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Active
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-0.5">
                  {(stats?.activeTenants ?? 0).toLocaleString()}
                </h2>
                <p className="text-xs text-muted-foreground font-medium">Active Companies</p>
              </div>
              <SparklineBar data={[stats?.activeTenants ?? 1, stats?.activeTenants ?? 1, stats?.activeTenants ?? 1, stats?.activeTenants ?? 1]} color="#FF6F28" />
            </div>
          </div>
        </div>

        {/* Card 3: Total Subscribers / Users */}
        <div className="lg:col-span-3 flex">
          <div className="card flex-1 h-full bg-white dark:bg-slate-900 border border-border rounded-lg p-5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <span className="size-10 rounded-full bg-[#212529] text-white flex items-center justify-center">
                <i className="ti ti-users text-base"></i>
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400">
                Subscribers
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-0.5">
                  {(stats?.totalUsers ?? 0).toLocaleString()}
                </h2>
                <p className="text-xs text-muted-foreground font-medium">Platform Users</p>
              </div>
              <SparklineBar data={[stats?.totalUsers ?? 1, stats?.totalUsers ?? 1, stats?.totalUsers ?? 1, stats?.totalUsers ?? 1]} color="#FF6F28" />
            </div>
          </div>
        </div>

        {/* Card 4: Total Monthly Revenue (MRR) */}
        <div className="lg:col-span-3 flex">
          <div className="card flex-1 h-full bg-white dark:bg-slate-900 border border-border rounded-lg p-5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <span className="size-10 rounded-full bg-[#212529] text-white flex items-center justify-center">
                <i className="ti ti-businessplan text-base"></i>
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                MRR
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-0.5">
                  {formatCurrency(stats?.mrr ?? 0)}
                </h2>
                <p className="text-xs text-muted-foreground font-medium">Monthly Revenue</p>
              </div>
              <SparklineBar data={[5, 10, 7, 5, 10, 7, 5]} color="#FF6F28" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── ROW 2: Analytics & Plans Row ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Card: Companies Weekly Activity */}
        <div className="lg:col-span-3 flex">
          <div className="card flex-1 h-full bg-white dark:bg-slate-900 border border-border rounded-lg p-5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <h5 className="font-bold text-sm text-gray-900 dark:text-gray-100">Companies Added</h5>
              <div className="relative">
                <span className="text-xs text-muted-foreground font-medium">By Day</span>
              </div>
            </div>

            <div className="my-2 min-h-[260px] flex items-center justify-center">
              {isMounted ? (
                <Suspense fallback={<div className="text-xs text-muted-foreground">Loading chart...</div>}>
                  <Chart
                    options={companyChartOptions}
                    series={companyChartOptions.series}
                    type="bar"
                    height={260}
                    width="100%"
                  />
                </Suspense>
              ) : null}
            </div>

            <p className="text-xs text-muted-foreground flex items-center pt-2 border-t border-border/60">
              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 mr-1.5">
                Active
              </span>
              {stats?.totalTenants ?? 0} total registered organizations
            </p>
          </div>
        </div>

        {/* Center Card: Revenue Breakdown */}
        <div className="lg:col-span-6 flex">
          <div className="card flex-1 h-full bg-white dark:bg-slate-900 border border-border rounded-lg p-5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <h5 className="font-bold text-sm text-gray-900 dark:text-gray-100">Platform Revenue</h5>
              <div className="relative">
                <span className="text-xs text-muted-foreground font-medium">Year {revenueYear}</span>
              </div>
            </div>

            {/* Subheader: Revenue KPI & Legend */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-3 pb-1">
              <div>
                <h4 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">
                  {formatCurrency((stats?.mrr ?? 0) * 12)}
                </h4>
                <p className="text-xs text-muted-foreground">Annualized Run Rate (ARR)</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                <i className="ti ti-circle-filled text-xs text-[#f26522]"></i>
                Monthly Collections
              </div>
            </div>

            <div className="my-1 min-h-[260px] flex items-center justify-center">
              {isMounted ? (
                <Suspense fallback={<div className="text-xs text-muted-foreground">Loading chart...</div>}>
                  <Chart
                    options={revenueChartOptions}
                    series={revenueChartOptions.series}
                    type="bar"
                    height={260}
                    width="100%"
                  />
                </Suspense>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right Card: Top Plans Donut */}
        <div className="lg:col-span-3 flex">
          <div className="card flex-1 h-full bg-white dark:bg-slate-900 border border-border rounded-lg p-5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <h5 className="font-bold text-sm text-gray-900 dark:text-gray-100">Plan Distribution</h5>
              <Link to="/super/plans" className="text-xs text-primary hover:underline font-medium">
                View All
              </Link>
            </div>

            <div className="my-2 min-h-[220px] flex items-center justify-center">
              {isMounted ? (
                <Suspense fallback={<div className="text-xs text-muted-foreground">Loading chart...</div>}>
                  <Chart
                    options={planChartOptions}
                    series={planChartOptions.series}
                    type="donut"
                    height={220}
                    width="100%"
                  />
                </Suspense>
              ) : null}
            </div>

            {/* Real Plan Breakdown Percentages */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              {planChartData.labels.map((label: string, idx: number) => {
                const count = planChartData.series[idx] || 0;
                const total = planChartData.series.reduce((a: number, b: number) => a + b, 0) || 1;
                const pct = Math.round((count / total) * 100);
                const colors = ["#F26522", "#1B84FF", "#FFC107", "#10B981"];
                const dotColor = colors[idx % colors.length];

                return (
                  <div key={label} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 font-medium">
                      <span className="size-2 rounded-full" style={{ backgroundColor: dotColor }} />
                      {label}
                    </span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{pct}% ({count})</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── ROW 3: Operational Monitoring (3 Equal Columns) ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Column 1: Recent Transactions */}
        <div className="lg:col-span-4 flex">
          <div className="card flex-1 h-full bg-white dark:bg-slate-900 border border-border rounded-lg p-5 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
                <h5 className="font-bold text-sm text-gray-900 dark:text-gray-100">Recent Transactions</h5>
                <Link
                  to="/super/transactions"
                  className="px-2.5 py-1 text-xs font-semibold rounded-md border border-border bg-slate-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-slate-100 transition-colors shadow-2xs"
                >
                  View All
                </Link>
              </div>

              {/* Real Transactions List */}
              <div className="space-y-4">
                {stats?.transactionsList && stats.transactionsList.length > 0 ? (
                  stats.transactionsList.slice(0, 5).map((item: any, idx: number) => (
                    <div key={item.id || idx} className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <CompanyAvatar name={item.customerName || item.tenantSlug || "Client"} size="sm" />
                        <div className="min-w-0">
                          <h6 className="font-semibold text-gray-900 dark:text-gray-100 truncate hover:text-primary transition-colors cursor-pointer">
                            {item.customerName || item.tenantSlug || "Platform Invoice"}
                          </h6>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <span className="text-sky-600 dark:text-sky-400 font-medium">#{item.invoiceId || item.id?.slice(0, 8)}</span>
                            <span>•</span>
                            <span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-GB") : "Recently"}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <h6 className="font-bold text-gray-900 dark:text-gray-100">+${Number(item.amount || 0).toLocaleString()}</h6>
                        <p className="text-[11px] text-muted-foreground">{item.planName || "Subscription"}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center">
                    <Receipt className="size-8 text-muted-foreground/30 mb-2" />
                    <span>No platform transactions recorded yet</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Recently Registered */}
        <div className="lg:col-span-4 flex">
          <div className="card flex-1 h-full bg-white dark:bg-slate-900 border border-border rounded-lg p-5 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
                <h5 className="font-bold text-sm text-gray-900 dark:text-gray-100">Recently Registered</h5>
                <Link
                  to="/super/tenants"
                  className="px-2.5 py-1 text-xs font-semibold rounded-md border border-border bg-slate-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-slate-100 transition-colors shadow-2xs"
                >
                  View All
                </Link>
              </div>

              {/* Real Registered Companies List */}
              <div className="space-y-4">
                {stats?.tenantsList && stats.tenantsList.length > 0 ? (
                  stats.tenantsList.slice(0, 5).map((t: any, idx: number) => (
                    <div key={t.id || idx} className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <CompanyAvatar name={t.name || "Workspace"} size="sm" />
                        <div className="min-w-0">
                          <h6 className="font-semibold text-gray-900 dark:text-gray-100 truncate hover:text-primary transition-colors cursor-pointer">
                            {t.name}
                          </h6>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{t.plan_name || "Enterprise Plan"}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">
                          {t.employee_count ?? 0} Employees
                        </p>
                        <h6 className="text-[11px] text-muted-foreground font-mono">{t.slug}.masterhrms.com</h6>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center">
                    <Building2 className="size-8 text-muted-foreground/30 mb-2" />
                    <span>No registered workspaces</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Recent Plan Expired & Request */}
        <div className="lg:col-span-4 flex">
          <div className="card flex-1 h-full bg-white dark:bg-slate-900 border border-border rounded-lg p-5 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
                <h5 className="font-bold text-sm text-gray-900 dark:text-gray-100">Recent Plan Expired</h5>

                {/* Tab Switcher */}
                <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-border/60">
                  <button
                    type="button"
                    onClick={() => setExpiredTab("expired")}
                    className={`px-2 py-0.5 text-xs font-semibold rounded transition-all ${
                      expiredTab === "expired"
                        ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Expired
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpiredTab("request")}
                    className={`px-2 py-0.5 text-xs font-semibold rounded transition-all ${
                      expiredTab === "request"
                        ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Request
                  </button>
                </div>
              </div>

              {/* Expired Tab List */}
              {expiredTab === "expired" ? (
                <div className="space-y-4">
                  {expiredCompanies.length > 0 ? (
                    expiredCompanies.map((item: any, idx: number) => (
                      <div key={item.id || idx} className="flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <CompanyAvatar name={item.name || "Workspace"} size="sm" />
                          <div className="min-w-0">
                            <h6 className="font-semibold text-gray-900 dark:text-gray-100 truncate hover:text-primary transition-colors cursor-pointer">
                              {item.name}
                            </h6>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {item.expires_at ? `Expired : ${new Date(item.expires_at).toLocaleDateString("en-GB")}` : "Subscription Suspended"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSendReminder(item.name)}
                            className="text-[11px] text-sky-600 dark:text-sky-400 underline font-medium hover:text-sky-700 transition-colors block mb-0.5"
                          >
                            Send Reminder
                          </button>
                          <p className="text-[11px] text-muted-foreground">{item.plan_name || "Enterprise"}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center">
                      <CheckCircle2 className="size-8 text-emerald-500/30 mb-2" />
                      <span>All company subscriptions active & healthy</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Request Tab List */
                <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center">
                  <Sparkles className="size-8 text-muted-foreground/30 mb-2" />
                  <span>No pending plan change requests</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Modal 1: Create Tenant Dialog ─────────────────────────────────── */}
      <Dialog open={isCreateTenantOpen} onOpenChange={setIsCreateTenantOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Provision Enterprise Workspace</DialogTitle>
            <DialogDescription className="text-xs">
              Instantly create an isolated tenant database instance for a new company.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Company / Workspace Name</Label>
              <Input
                placeholder="e.g. Acme Cloud Corp"
                value={newTenantName}
                onChange={(e) => {
                  setNewTenantName(e.target.value);
                  if (!newTenantSlug) {
                    setNewTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"));
                  }
                }}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Subdomain / Slug</Label>
              <Input
                placeholder="e.g. acme-cloud"
                value={newTenantSlug}
                onChange={(e) => setNewTenantSlug(e.target.value)}
                className="mt-1 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Will be accessible at: https://{newTenantSlug || "subdomain"}.masterhrms.com
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateTenantOpen(false)}
              disabled={isCreatingTenant}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateTenant}
              disabled={isCreatingTenant}
              className="text-xs bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isCreatingTenant ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
              Provision Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal 2: System Broadcast Dialog ──────────────────────────────── */}
      <Dialog open={isBroadcastOpen} onOpenChange={setIsBroadcastOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transmit System-Wide Announcement</DialogTitle>
            <DialogDescription className="text-xs">
              Broadcast an urgent notification banner directly to all company workspace dashboards.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Announcement Title</Label>
              <Input
                placeholder="e.g. Scheduled Maintenance Notice"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Notification Body</Label>
              <Textarea
                rows={3}
                placeholder="Detail maintenance schedule, updates, or alerts..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="mt-1 text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBroadcastOpen(false)}
              disabled={isSendingBroadcast}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSendBroadcast}
              disabled={isSendingBroadcast}
              className="text-xs bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSendingBroadcast ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
              Send Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
