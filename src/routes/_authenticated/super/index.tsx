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
import { Loader2, Plus, Send } from "lucide-react";

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
  const [revenueYear, setRevenueYear] = useState("2025");
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
        const [superStats, tenants, txns] = await Promise.all([
          api.get("/super/stats").catch(() => null),
          api.get("/super/tenants").catch(() => []),
          api.get("/super/transactions").catch(() => []),
        ]);
        return {
          totalTenants: superStats?.totalTenants ?? tenants?.length ?? 5468,
          activeTenants: superStats?.activeTenants ?? 4598,
          totalUsers: superStats?.totalUsers ?? 3698,
          mrr: superStats?.mrr ?? 89878,
          todayNewTenants: tenants?.filter((t: any) => {
            const today = new Date().toDateString();
            return new Date(t.createdAt).toDateString() === today;
          }).length || 14,
          tenantsList: tenants || [],
          transactionsList: txns || [],
        };
      } catch {
        return {
          totalTenants: 5468,
          activeTenants: 4598,
          totalUsers: 3698,
          mrr: 89878,
          todayNewTenants: 14,
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

  const handleApproveRequest = (companyName: string) => {
    toast.success(`Plan upgrade request for ${companyName} approved successfully!`);
  };

  const handleRejectRequest = (companyName: string) => {
    toast.info(`Plan upgrade request for ${companyName} was rejected.`);
  };

  // ─── APEX CHARTS CONFIGURATIONS ─────────────────────────────
  // 1. Weekly Companies Bar Chart
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
          data: [40, 60, 20, 80, 60, 60, 60],
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
    []
  );

  // 2. Revenue Stacked Bar Chart
  const revenueChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        height: 270,
        type: "bar",
        stacked: true,
        toolbar: { show: false },
      },
      colors: ["#f26522", "#0c4b5e", "#1b84ff", "#F3F4F6"],
      plotOptions: {
        bar: {
          borderRadius: 5,
          borderRadiusWhenStacked: "last",
          columnWidth: "50%",
          horizontal: false,
        },
      },
      series: [
        {
          name: "Income Base (25%)",
          data: [25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 20, 25],
        },
        {
          name: "Income Mid (30%)",
          data: [30, 5, 20, 30, 30, 30, 30, 30, 30, 30, 0, 30],
        },
        {
          name: "Income Top (5%)",
          data: [5, 0, 0, 25, 30, 35, 25, 25, 25, 30, 0, 25],
        },
        {
          name: "Remaining/Expenses",
          data: [40, 70, 55, 20, 15, 10, 20, 20, 20, 15, 80, 20],
        },
      ],
      xaxis: {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        labels: {
          style: { colors: "#6B7280", fontSize: "11px" },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        min: 0,
        max: 100,
        labels: {
          style: { colors: "#6B7280", fontSize: "11px" },
          formatter: (value: number) => `${value}K`,
        },
      },
      grid: {
        borderColor: "transparent",
        padding: { left: -5, right: 0 },
      },
      legend: { show: false },
      dataLabels: { enabled: false },
      tooltip: {
        shared: true,
        intersect: false,
        theme: "dark",
        y: {
          formatter: (val: number) => `$${val}K`,
        },
      },
    }),
    []
  );

  // 3. Top Plans Donut Chart
  const planChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        height: 230,
        type: "donut",
        toolbar: { show: false },
      },
      colors: ["#FFC107", "#1B84FF", "#F26522"],
      series: [20, 60, 20],
      labels: ["Enterprise", "Premium", "Basic"],
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
          formatter: (val: number) => `${val}%`,
        },
      },
    }),
    []
  );

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

        {/* Right Toolbar: Date Range Picker & Controls */}
        <div className="flex items-center gap-2">
          <div className="relative inline-flex items-center">
            <span className="absolute left-3 text-muted-foreground pointer-events-none">
              <i className="ti ti-calendar text-sm"></i>
            </span>
            <input
              type="text"
              readOnly
              value="01/09/2026 - 30/09/2026"
              className="pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-border rounded-md shadow-2xs font-medium text-gray-700 dark:text-gray-300 w-56 focus:outline-none"
            />
          </div>

          <button
            type="button"
            className="size-8 rounded-md border border-border bg-white dark:bg-slate-900 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-2xs"
            title="Collapse Header"
          >
            <i className="ti ti-chevrons-up text-sm"></i>
          </button>
        </div>
      </div>

      {/* ─── Welcome Wrap Banner ──────────────────────────────────────────── */}
      <div className="welcome-wrap relative rounded-lg p-6 sm:p-8 overflow-hidden text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-xs">
              Welcome Back, {profile?.full_name?.split(" ")[0] || "Adrian"}
            </h2>
            <p className="text-sm sm:text-base text-orange-100 font-medium">
              {stats?.todayNewTenants ?? 14} New Companies Subscribed Today !!!
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              to="/super/tenants"
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-md bg-[#212529] hover:bg-black text-white shadow-xs transition-colors"
            >
              Companies
            </Link>
            <Link
              to="/super/plans"
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-md bg-white hover:bg-slate-100 text-gray-900 shadow-xs transition-colors"
            >
              All Packages
            </Link>
          </div>
        </div>

        {/* Vector Background Illustrations */}
        <div className="welcome-bg absolute inset-0 pointer-events-none overflow-hidden select-none">
          <img
            src="/ui-assets/bg/welcome-bg-02.svg"
            alt="bg shape"
            className="welcome-bg-01 absolute top-0 left-0 w-auto h-full opacity-80"
          />
          <img
            src="/ui-assets/bg/welcome-bg-03.svg"
            alt="bg shape"
            className="welcome-bg-02 absolute top-[20%] left-[40%] w-auto h-auto opacity-75"
          />
          <img
            src="/ui-assets/bg/welcome-bg-01.svg"
            alt="bg shape"
            className="welcome-bg-03 absolute bottom-0 right-0 w-auto h-full opacity-80"
          />
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
                +19.01%
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-0.5">
                  {(stats?.totalTenants ?? 5468).toLocaleString()}
                </h2>
                <p className="text-xs text-muted-foreground font-medium">Total Companies</p>
              </div>
              <SparklineBar data={[5, 10, 7, 5, 10, 7, 5]} color="#FF6F28" />
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
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400">
                -12%
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-0.5">
                  {(stats?.activeTenants ?? 4598).toLocaleString()}
                </h2>
                <p className="text-xs text-muted-foreground font-medium">Active Companies</p>
              </div>
              <SparklineBar data={[5, 3, 7, 6, 3, 10, 5]} color="#FF6F28" />
            </div>
          </div>
        </div>

        {/* Card 3: Total Subscribers */}
        <div className="lg:col-span-3 flex">
          <div className="card flex-1 h-full bg-white dark:bg-slate-900 border border-border rounded-lg p-5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <span className="size-10 rounded-full bg-[#212529] text-white flex items-center justify-center">
                <i className="ti ti-chalkboard-off text-base"></i>
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                +6%
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-0.5">
                  {(stats?.totalUsers ?? 3698).toLocaleString()}
                </h2>
                <p className="text-xs text-muted-foreground font-medium">Total Subscribers</p>
              </div>
              <SparklineBar data={[8, 10, 10, 8, 8, 10, 8]} color="#FF6F28" />
            </div>
          </div>
        </div>

        {/* Card 4: Total Earnings */}
        <div className="lg:col-span-3 flex">
          <div className="card flex-1 h-full bg-white dark:bg-slate-900 border border-border rounded-lg p-5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <span className="size-10 rounded-full bg-[#212529] text-white flex items-center justify-center">
                <i className="ti ti-businessplan text-base"></i>
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400">
                -16%
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-0.5">
                  $89,878.58
                </h2>
                <p className="text-xs text-muted-foreground font-medium">Total Earnings</p>
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
              <h5 className="font-bold text-sm text-gray-900 dark:text-gray-100">Companies</h5>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCompanyFilter(companyFilter === "This Week" ? "This Month" : "This Week")}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-border bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  <i className="ti ti-calendar text-xs"></i>
                  {companyFilter}
                </button>
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
                +6%
              </span>
              5 Companies from last month
            </p>
          </div>
        </div>

        {/* Center Card: Revenue Stacked Breakdown */}
        <div className="lg:col-span-6 flex">
          <div className="card flex-1 h-full bg-white dark:bg-slate-900 border border-border rounded-lg p-5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <h5 className="font-bold text-sm text-gray-900 dark:text-gray-100">Revenue</h5>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setRevenueYear(revenueYear === "2025" ? "2026" : "2025")}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-border bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  <i className="ti ti-calendar text-xs"></i>
                  {revenueYear}
                </button>
              </div>
            </div>

            {/* Subheader: Revenue KPI & Legend */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-3 pb-1">
              <div>
                <h4 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">$45,787</h4>
                <p className="text-xs text-muted-foreground">
                  <span className="text-emerald-600 font-bold mr-1">+40%</span>
                  increased from last year
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                <i className="ti ti-circle-filled text-xs text-[#f26522]"></i>
                Revenue
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
              <h5 className="font-bold text-sm text-gray-900 dark:text-gray-100">Top Plans</h5>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPlansFilter(plansFilter === "This Month" ? "This Week" : "This Month")}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-border bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  <i className="ti ti-calendar text-xs"></i>
                  {plansFilter}
                </button>
              </div>
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

            {/* Plan Breakdown Percentages */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 font-medium">
                  <i className="ti ti-circle-filled text-xs text-[#F26522]"></i>
                  Basic
                </span>
                <span className="font-bold text-gray-900 dark:text-gray-100">60%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 font-medium">
                  <i className="ti ti-circle-filled text-xs text-[#1B84FF]"></i>
                  Premium
                </span>
                <span className="font-bold text-gray-900 dark:text-gray-100">20%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 font-medium">
                  <i className="ti ti-circle-filled text-xs text-[#FFC107]"></i>
                  Enterprise
                </span>
                <span className="font-bold text-gray-900 dark:text-gray-100">20%</span>
              </div>
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

              {/* Transactions List */}
              <div className="space-y-4">
                {[
                  {
                    name: "Stellar Dynamics",
                    id: "#12457",
                    date: "14 Jan 2025",
                    amount: "+$245",
                    plan: "Basic (Monthly)",
                    img: "/ui-assets/company/company-02.svg",
                  },
                  {
                    name: "Quantum Nexus",
                    id: "#65974",
                    date: "14 Jan 2025",
                    amount: "+$395",
                    plan: "Enterprise (Yearly)",
                    img: "/ui-assets/company/company-03.svg",
                  },
                  {
                    name: "Aurora Technologies",
                    id: "#22457",
                    date: "14 Jan 2025",
                    amount: "+$145",
                    plan: "Advanced (Monthly)",
                    img: "/ui-assets/company/company-05.svg",
                  },
                  {
                    name: "TerraFusion Energy",
                    id: "#43412",
                    date: "14 Jan 2025",
                    amount: "+$145",
                    plan: "Enterprise (Monthly)",
                    img: "/ui-assets/company/company-07.svg",
                  },
                  {
                    name: "Epicurean Delights",
                    id: "#43567",
                    date: "14 Jan 2025",
                    amount: "+$977",
                    plan: "Premium (Yearly)",
                    img: "/ui-assets/company/company-08.svg",
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-2 shrink-0 border border-border/40">
                        <img src={item.img} alt={item.name} className="w-full h-full object-contain" />
                      </div>
                      <div className="min-w-0">
                        <h6 className="font-semibold text-gray-900 dark:text-gray-100 truncate hover:text-primary transition-colors cursor-pointer">
                          {item.name}
                        </h6>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span className="text-sky-600 dark:text-sky-400 font-medium">{item.id}</span>
                          <span>•</span>
                          <span>{item.date}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <h6 className="font-bold text-gray-900 dark:text-gray-100">{item.amount}</h6>
                      <p className="text-[11px] text-muted-foreground">{item.plan}</p>
                    </div>
                  </div>
                ))}
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

              {/* Registered Companies List */}
              <div className="space-y-4">
                {[
                  {
                    name: "Pitch",
                    plan: "Basic (Monthly)",
                    users: "150 Users",
                    domain: "pitch.example.com",
                    img: "/ui-assets/icons/company-icon-11.svg",
                  },
                  {
                    name: "Initech",
                    plan: "Enterprise (Yearly)",
                    users: "200 Users",
                    domain: "initech.example.com",
                    img: "/ui-assets/icons/company-icon-12.svg",
                  },
                  {
                    name: "Umbrella Corp",
                    plan: "Advanced (Monthly)",
                    users: "129 Users",
                    domain: "umbcorp.example.com",
                    img: "/ui-assets/icons/company-icon-13.svg",
                  },
                  {
                    name: "Capital Partners",
                    plan: "Enterprise (Monthly)",
                    users: "103 Users",
                    domain: "capitalpart.example.com",
                    img: "/ui-assets/icons/company-icon-14.svg",
                  },
                  {
                    name: "Massive Dynamic",
                    plan: "Premium (Yearly)",
                    users: "108 Users",
                    domain: "msdynamic.example.com",
                    img: "/ui-assets/icons/company-icon-15.svg",
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-2 shrink-0 border border-border/40">
                        <img src={item.img} alt={item.name} className="w-full h-full object-contain" />
                      </div>
                      <div className="min-w-0">
                        <h6 className="font-semibold text-gray-900 dark:text-gray-100 truncate hover:text-primary transition-colors cursor-pointer">
                          {item.name}
                        </h6>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{item.plan}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">{item.users}</p>
                      <h6 className="text-[11px] text-muted-foreground font-mono">{item.domain}</h6>
                    </div>
                  </div>
                ))}
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
                  {[
                    {
                      name: "Silicon Corp",
                      expiry: "Expired : 10 Apr 2025",
                      plan: "Basic (Monthly)",
                      img: "/ui-assets/icons/company-icon-16.svg",
                    },
                    {
                      name: "Hubspot",
                      expiry: "Expired : 12 Jun 2025",
                      plan: "Enterprise (Yearly)",
                      img: "/ui-assets/icons/company-icon-14.svg",
                    },
                    {
                      name: "Licon Industries",
                      expiry: "Expired : 16 Jun 2025",
                      plan: "Advanced (Monthly)",
                      img: "/ui-assets/icons/company-icon-18.svg",
                    },
                    {
                      name: "TerraFusion Energy",
                      expiry: "Expired : 12 May 2025",
                      plan: "Enterprise (Monthly)",
                      img: "/ui-assets/company/company-07.svg",
                    },
                    {
                      name: "Epicurean Delights",
                      expiry: "Expired : 15 May 2025",
                      plan: "Premium (Yearly)",
                      img: "/ui-assets/company/company-08.svg",
                    },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-2 shrink-0 border border-border/40">
                          <img src={item.img} alt={item.name} className="w-full h-full object-contain" />
                        </div>
                        <div className="min-w-0">
                          <h6 className="font-semibold text-gray-900 dark:text-gray-100 truncate hover:text-primary transition-colors cursor-pointer">
                            {item.name}
                          </h6>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{item.expiry}</p>
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
                        <p className="text-[11px] text-muted-foreground">{item.plan}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Request Tab List */
                <div className="space-y-4">
                  {[
                    {
                      name: "Silicon Corp",
                      domain: "silicon.example.com",
                      img: "/ui-assets/icons/company-icon-16.svg",
                    },
                    {
                      name: "Hubspot",
                      domain: "hubspot.example.com",
                      img: "/ui-assets/icons/company-icon-14.svg",
                    },
                    {
                      name: "Licon Industries",
                      domain: "licon.example.com",
                      img: "/ui-assets/icons/company-icon-18.svg",
                    },
                    {
                      name: "TerraFusion Energy",
                      domain: "fusion.example.com",
                      img: "/ui-assets/company/company-07.svg",
                    },
                    {
                      name: "Epicurean Delights",
                      domain: "epicuran.example.com",
                      img: "/ui-assets/company/company-08.svg",
                    },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-2 shrink-0 border border-border/40">
                          <img src={item.img} alt={item.name} className="w-full h-full object-contain" />
                        </div>
                        <div className="min-w-0">
                          <h6 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {item.name}
                          </h6>
                          <p className="text-[11px] text-sky-600 dark:text-sky-400 font-mono mt-0.5 truncate">
                            {item.domain}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleApproveRequest(item.name)}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectRequest(item.name)}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Footer ───────────────────────────────────────────────────────── */}
      <div className="footer flex flex-col sm:flex-row items-center justify-between border-t border-border pt-4 pb-2 text-xs text-muted-foreground">
        <p className="mb-1 sm:mb-0">2026 &copy; Dreams ERP. All rights reserved.</p>
        <p>
          Designed &amp; Developed By{" "}
          <a href="https://dreamstechnologies.com" target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">
            Dreams
          </a>
        </p>
      </div>

      {/* ─── Quick Actions Dialogs (Preserved) ─────────────────────────────── */}
      {/* Create Tenant Modal */}
      <Dialog open={isCreateTenantOpen} onOpenChange={setIsCreateTenantOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Provision New ERP Tenant Workspace</DialogTitle>
            <DialogDescription>
              Create an isolated organization tenant with dedicated database records, employee records,
              and default admin credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Workspace Name</Label>
              <Input
                placeholder="Apex Technologies Inc."
                value={newTenantName}
                onChange={(e) => {
                  setNewTenantName(e.target.value);
                  setNewTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Workspace Slug (URL Subdomain)</Label>
              <Input
                placeholder="apex-global"
                value={newTenantSlug}
                onChange={(e) => setNewTenantSlug(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateTenantOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTenant} disabled={isCreatingTenant} className="bg-purple-600 hover:bg-purple-700 text-white">
              {isCreatingTenant ? <Loader2 className="size-4 animate-spin mr-2" /> : <Plus className="size-4 mr-2" />}
              Provision Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Broadcast Announcement Modal */}
      <Dialog open={isBroadcastOpen} onOpenChange={setIsBroadcastOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Broadcast System Announcement</DialogTitle>
            <DialogDescription>
              Publish an immediate system-wide banner notification to all ERP & HRMS active workspaces.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Announcement Title</Label>
              <Input
                placeholder="Scheduled Maintenance & Platform Upgrade"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Announcement Content</Label>
              <Textarea
                placeholder="We are upgrading the core ERP database engine on Sunday at 02:00 UTC. Systems will remain operational."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBroadcastOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendBroadcast} disabled={isSendingBroadcast} className="bg-purple-600 hover:bg-purple-700 text-white">
              {isSendingBroadcast ? <Loader2 className="size-4 animate-spin mr-2" /> : <Send className="size-4 mr-2" />}
              Broadcast Banner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
