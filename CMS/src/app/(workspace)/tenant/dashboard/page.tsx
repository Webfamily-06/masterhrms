"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { Link } from "@/src/lib/router-compat";
import { useCurrentProfile } from "@/lib/session";
import { useWorkspaceSettings } from "@/src/context/workspace-settings-context";
import { OrganizationAnnouncementsWidget } from "@/components/dashboard/organization-announcements-widget";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function TenantDashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const { data: profile } = useCurrentProfile();
  const { formatCurrency, tenant: settingsTenant } = useWorkspaceSettings();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    data: dash,
    isLoading: isDashLoading,
    isFetching: isDashFetching,
    refetch: refetchDash,
  } = useQuery<any>({
    queryKey: ["tenant-admin-dashboard-live"],
    queryFn: async () => {
      const res = await api.get<any>("/hr/dashboard");
      return res?.data || res || {};
    },
    staleTime: 30 * 1000,
  });

  const { data: subscription } = useQuery<any>({
    queryKey: ["tenant-admin-dashboard-subscription"],
    queryFn: async () => {
      try {
        const res = await api.get<any>("/workspace/subscription");
        return res?.data || res || {};
      } catch {
        return {};
      }
    },
    staleTime: 60 * 1000,
  });

  const { data: todos = [] } = useQuery<any[]>({
    queryKey: ["tenant-admin-dashboard-todos"],
    queryFn: async () => {
      try {
        const res = await api.get<any>("/todos");
        const list = res?.data || res || [];
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    },
    staleTime: 30 * 1000,
  });

  const tenantName =
    profile?.tenant?.name || settingsTenant?.name || "Workspace";
  const firstName =
    profile?.full_name?.trim()?.split(/\s+/)[0] ||
    profile?.email?.split("@")[0] ||
    "Administrator";

  const headcount = dash?.headcount || {
    total: 0,
    active: 0,
    onLeave: 0,
    terminated: 0,
    presentToday: 0,
    byEmploymentType: { full_time: 0, part_time: 0, contract: 0, intern: 0 },
  };
  const deptDist: Array<{ name: string; count: number }> = Array.isArray(
    dash?.departmentDistribution
  )
    ? dash.departmentDistribution
    : [];
  const attendanceTrend = dash?.attendanceTrend || {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    present: [0, 0, 0, 0, 0],
    absent: [0, 0, 0, 0, 0],
  };
  const lateArrivals: any[] = Array.isArray(dash?.lateArrivalsToday)
    ? dash.lateArrivalsToday
    : [];
  const leaveSummary = dash?.leaveSummary || {
    totalRequests: 0,
    pendingCount: 0,
    approvedCount: 0,
    distribution: [],
  };
  const pendingApprovals: any[] = Array.isArray(dash?.pendingApprovals)
    ? dash.pendingApprovals
    : [];
  const recruitment = dash?.recruitment || { totalJobs: 0, openJobs: 0 };
  const payroll = dash?.payroll || {
    latestNet: 0,
    latestDeductions: 0,
    runsCount: 0,
  };
  const upcomingHolidays: any[] = Array.isArray(dash?.upcomingHolidays)
    ? dash.upcomingHolidays
    : [];

  const totalTodos = todos.length;
  const completedTodos = todos.filter((t) => Boolean(t?.completed)).length;
  const openTodos = totalTodos - completedTodos;

  const activePct =
    headcount.total > 0
      ? Math.round((headcount.active / headcount.total) * 100)
      : 0;
  const presentPct =
    headcount.active > 0
      ? Math.round((headcount.presentToday / headcount.active) * 100)
      : 0;

  const empTypes = headcount.byEmploymentType || {
    full_time: 0,
    part_time: 0,
    contract: 0,
    intern: 0,
  };

  const deptChartOptions: ApexCharts.ApexOptions = useMemo(
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
          horizontal: true,
          barHeight: "48%",
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories:
          deptDist.length > 0 ? deptDist.map((d) => d.name) : ["No Departments"],
        labels: { style: { colors: "#64748b", fontSize: "11px" } },
      },
      yaxis: {
        labels: { style: { colors: "#64748b", fontSize: "11px" } },
      },
      grid: {
        borderColor: "rgba(148, 163, 184, 0.2)",
        strokeDashArray: 4,
      },
      tooltip: {
        theme: "dark",
        y: {
          formatter: (val: number) =>
            `${val} ${val === 1 ? "employee" : "employees"}`,
        },
      },
    }),
    [deptDist]
  );

  const deptChartSeries = useMemo(
    () => [
      {
        name: "Employees",
        data: deptDist.length > 0 ? deptDist.map((d) => d.count) : [0],
      },
    ],
    [deptDist]
  );

  const attendanceChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: "bar",
        stacked: true,
        toolbar: { show: false },
        fontFamily: "inherit",
      },
      colors: ["#16a34a", "#e11d48"],
      plotOptions: {
        bar: {
          columnWidth: "46%",
          borderRadius: 5,
        },
      },
      xaxis: {
        categories: attendanceTrend.labels || [],
        labels: { style: { colors: "#64748b", fontSize: "11px" } },
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
      legend: { position: "top", fontSize: "12px" },
      tooltip: { theme: "dark" },
    }),
    [attendanceTrend.labels]
  );

  const attendanceChartSeries = useMemo(
    () => [
      { name: "Present", data: attendanceTrend.present || [] },
      { name: "Absent / Off", data: attendanceTrend.absent || [] },
    ],
    [attendanceTrend.present, attendanceTrend.absent]
  );

  const leaveDist: Array<{ name: string; count: number }> = Array.isArray(
    leaveSummary.distribution
  )
    ? leaveSummary.distribution
    : [];

  const leaveDonutOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: "donut",
        toolbar: { show: false },
        fontFamily: "inherit",
      },
      colors: ["#0d6efd", "#16a34a", "#f59e0b", "#0284c7", "#e11d48"],
      labels:
        leaveDist.length > 0
          ? leaveDist.map((d) => d.name)
          : ["No Leave Requests"],
      legend: { position: "bottom", fontSize: "12px" },
      stroke: { width: 0 },
      dataLabels: { enabled: false },
      tooltip: { theme: "dark" },
    }),
    [leaveDist]
  );

  const leaveDonutSeries = useMemo(
    () => (leaveDist.length > 0 ? leaveDist.map((d) => d.count) : [1]),
    [leaveDist]
  );

  const maxEmployeesLimit = subscription?.maxEmployees;
  const seatSummary =
    maxEmployeesLimit && Number(maxEmployeesLimit) > 0
      ? `${headcount.active} / ${maxEmployeesLimit} seats`
      : `${headcount.active} active`;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto w-full min-w-0">
      <PageHeader
        title="Admin Dashboard"
        description={`Real-time workforce, attendance, leave, and operational telemetry for ${tenantName}.`}
        icon={<i className="ph-duotone ph-squares-four text-2xl" />}
        badge={
          <Badge variant="soft" className="text-[11px]">
            <i className="ph ph-pulse mr-1" />
            {subscription?.planName || "Active Workspace"}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchDash()}
              disabled={isDashFetching}
              className="gap-1.5"
            >
              <i
                className={`ph ph-arrows-clockwise text-sm ${
                  isDashFetching ? "animate-spin" : ""
                }`}
              />
              Refresh
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to="/hr/leave/applications">
                <i className="ph ph-calendar-check text-sm" />
                Leave Queue
              </Link>
            </Button>
            <Button asChild variant="primary" size="sm" className="gap-1.5">
              <Link to="/hr/employees/new">
                <i className="ph ph-user-plus text-sm" />
                Add Employee
              </Link>
            </Button>
          </div>
        }
      />

      {/* Welcome Banner (Live User & Pending Counts) */}
      <Card className="border border-border/80 rounded-xl bg-slate-900 text-white p-5 sm:p-6 shadow-xs overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Welcome back, {firstName}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              {isDashLoading ? (
                "Syncing live workspace metrics..."
              ) : (
                <>
                  <strong className="text-white">{tenantName}</strong> has{" "}
                  <Link
                    to="/hr/leave/applications"
                    className="font-semibold text-white underline underline-offset-2"
                  >
                    {leaveSummary.pendingCount} pending leave{" "}
                    {leaveSummary.pendingCount === 1 ? "request" : "requests"}
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="/hr/todo"
                    className="font-semibold text-white underline underline-offset-2"
                  >
                    {openTodos} open {openTodos === 1 ? "task" : "tasks"}
                  </Link>
                  .
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button asChild variant="secondary" size="sm" className="gap-1.5">
              <Link to="/hr/employees">
                <i className="ph ph-users text-sm" />
                Directory ({headcount.total})
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="bg-transparent border-slate-700 text-white hover:bg-slate-800 hover:text-white gap-1.5"
            >
              <Link to="/subscription">
                <i className="ph ph-crown text-sm" />
                Plan &amp; Seats
              </Link>
            </Button>
          </div>
        </div>
      </Card>

      {/* Organization Announcements */}
      <OrganizationAnnouncementsWidget />

      {/* Row 1: 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/80 rounded-xl bg-card p-5 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="size-10 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <i className="ph-duotone ph-users-three text-lg" />
            </span>
            <Badge variant="success" className="text-[11px]">
              {activePct}% Active
            </Badge>
          </div>
          <div>
            {isDashLoading ? (
              <Skeleton className="h-7 w-16 mb-1" />
            ) : (
              <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {headcount.total}
              </div>
            )}
            <p className="text-xs font-medium text-muted-foreground">Total Workforce</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {seatSummary} · {headcount.onLeave} on leave
            </p>
          </div>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card p-5 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="size-10 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
              <i className="ph-duotone ph-clock-user text-lg" />
            </span>
            <Badge variant="soft" className="text-[11px]">
              {presentPct}% Present
            </Badge>
          </div>
          <div>
            {isDashLoading ? (
              <Skeleton className="h-7 w-16 mb-1" />
            ) : (
              <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {headcount.presentToday} / {headcount.active}
              </div>
            )}
            <p className="text-xs font-medium text-muted-foreground">Attendance Today</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {lateArrivals.length} late {lateArrivals.length === 1 ? "arrival" : "arrivals"} logged
            </p>
          </div>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card p-5 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="size-10 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center">
              <i className="ph-duotone ph-calendar-blank text-lg" />
            </span>
            <Link
              to="/hr/leave/applications"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Review
            </Link>
          </div>
          <div>
            {isDashLoading ? (
              <Skeleton className="h-7 w-16 mb-1" />
            ) : (
              <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {leaveSummary.pendingCount}
              </div>
            )}
            <p className="text-xs font-medium text-muted-foreground">Pending Leave Requests</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {leaveSummary.approvedCount} approved · {leaveSummary.totalRequests} total
            </p>
          </div>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card p-5 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="size-10 rounded-lg bg-sky-500/10 text-sky-600 border border-sky-500/20 flex items-center justify-center">
              <i className="ph-duotone ph-wallet text-lg" />
            </span>
            <Link
              to="/hr/payroll/runs"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Payroll
            </Link>
          </div>
          <div>
            {isDashLoading ? (
              <Skeleton className="h-7 w-24 mb-1" />
            ) : (
              <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {formatCurrency(payroll.latestNet || 0)}
              </div>
            )}
            <p className="text-xs font-medium text-muted-foreground">Latest Net Payroll</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {payroll.runsCount || 0} completed {payroll.runsCount === 1 ? "run" : "runs"} · {recruitment.openJobs} open roles
            </p>
          </div>
        </Card>
      </div>

      {/* Row 2: Live Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <Card className="lg:col-span-5 border border-border/80 rounded-xl bg-card p-5 shadow-xs flex flex-col min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/60">
            <h3 className="text-sm font-semibold text-foreground">Employees by Department</h3>
            <Link
              to="/hr/organization/departments"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Manage
            </Link>
          </div>
          <div className="mt-3 flex-1 min-h-[240px] w-full min-w-0 overflow-hidden">
            {isMounted && deptDist.length > 0 ? (
              <Suspense
                fallback={
                  <div className="h-[240px] flex items-center justify-center text-xs text-muted-foreground">
                    Loading chart...
                  </div>
                }
              >
                <Chart
                  options={deptChartOptions}
                  series={deptChartSeries}
                  type="bar"
                  height={240}
                  width="100%"
                />
              </Suspense>
            ) : (
              <div className="h-[240px] flex flex-col items-center justify-center text-center text-xs text-muted-foreground gap-2">
                <i className="ph-duotone ph-tree-structure text-2xl opacity-60" />
                <span>No department assignments recorded yet.</span>
              </div>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-4 border border-border/80 rounded-xl bg-card p-5 shadow-xs flex flex-col min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/60">
            <h3 className="text-sm font-semibold text-foreground">Attendance Trend (5 Days)</h3>
            <Link
              to="/hr/attendance/records"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Records
            </Link>
          </div>
          <div className="mt-3 flex-1 min-h-[240px] w-full min-w-0 overflow-hidden">
            {isMounted ? (
              <Suspense
                fallback={
                  <div className="h-[240px] flex items-center justify-center text-xs text-muted-foreground">
                    Loading chart...
                  </div>
                }
              >
                <Chart
                  options={attendanceChartOptions}
                  series={attendanceChartSeries}
                  type="bar"
                  height={240}
                  width="100%"
                />
              </Suspense>
            ) : null}
          </div>
        </Card>

        <Card className="lg:col-span-3 border border-border/80 rounded-xl bg-card p-5 shadow-xs flex flex-col min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/60">
            <h3 className="text-sm font-semibold text-foreground">Leave Breakdown</h3>
            <Badge variant="outline" className="text-[11px]">
              {leaveSummary.totalRequests}
            </Badge>
          </div>
          <div className="mt-3 flex-1 min-h-[220px] flex items-center justify-center w-full min-w-0 overflow-hidden">
            {isMounted && leaveDist.length > 0 ? (
              <Suspense
                fallback={
                  <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
                    Loading chart...
                  </div>
                }
              >
                <Chart
                  options={leaveDonutOptions}
                  series={leaveDonutSeries}
                  type="donut"
                  height={220}
                  width="100%"
                />
              </Suspense>
            ) : (
              <div className="text-center text-xs text-muted-foreground space-y-1.5 py-8">
                <i className="ph-duotone ph-calendar-blank text-2xl opacity-60 block" />
                <span>No leave requests logged yet.</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Row 3: Operational Breakdown (Workforce Mix, Pending Approvals, Tasks & Holidays) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <Card className="lg:col-span-4 border border-border/80 rounded-xl bg-card p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
            <h3 className="text-sm font-semibold text-foreground">Employment Type Mix</h3>
            <Link to="/hr/employees" className="text-xs font-semibold text-primary hover:underline">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs flex-1">
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
              <span className="text-muted-foreground block">Full Time</span>
              <span className="text-xl font-bold text-foreground tabular-nums">{empTypes.full_time || 0}</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
              <span className="text-muted-foreground block">Part Time</span>
              <span className="text-xl font-bold text-foreground tabular-nums">{empTypes.part_time || 0}</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
              <span className="text-muted-foreground block">Contract</span>
              <span className="text-xl font-bold text-foreground tabular-nums">{empTypes.contract || 0}</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
              <span className="text-muted-foreground block">Intern</span>
              <span className="text-xl font-bold text-foreground tabular-nums">{empTypes.intern || 0}</span>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-4 border border-border/80 rounded-xl bg-card p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
            <h3 className="text-sm font-semibold text-foreground">Pending Leave Approvals</h3>
            <Link
              to="/hr/leave/applications"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Open Queue
            </Link>
          </div>
          {pendingApprovals.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground">
              <i className="ph-duotone ph-check-circle text-2xl text-emerald-600/70 mb-1.5" />
              <span>All leave applications are up to date.</span>
            </div>
          ) : (
            <div className="space-y-2.5 text-xs">
              {pendingApprovals.slice(0, 5).map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 pb-2 border-b border-border/50 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{item.employeeName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {item.leaveType} · {item.days}d{" "}
                      {item.startDate ? `(${format(new Date(item.startDate), "dd MMM yyyy")})` : ""}
                    </p>
                  </div>
                  <Badge variant="warning" className="text-[10px] shrink-0">
                    Pending
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-4 border border-border/80 rounded-xl bg-card p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
            <h3 className="text-sm font-semibold text-foreground">Tasks &amp; Upcoming Holidays</h3>
            <Link
              to="/hr/organization/holidays"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Holidays
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5 mb-3 text-xs">
            <Link
              to="/hr/todo"
              className="p-2.5 rounded-lg bg-muted/40 border border-border/60 hover:border-primary/40 transition-colors"
            >
              <span className="text-muted-foreground block">Open Tasks</span>
              <span className="text-lg font-bold text-foreground tabular-nums">{openTodos}</span>
            </Link>
            <Link
              to="/hr/todo"
              className="p-2.5 rounded-lg bg-muted/40 border border-border/60 hover:border-primary/40 transition-colors"
            >
              <span className="text-muted-foreground block">Completed</span>
              <span className="text-lg font-bold text-emerald-600 tabular-nums">{completedTodos}</span>
            </Link>
          </div>
          {upcomingHolidays.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No upcoming holidays scheduled.
            </p>
          ) : (
            <div className="space-y-2 text-xs">
              {upcomingHolidays.slice(0, 4).map((h: any) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between gap-2 py-1 border-b border-border/50 last:border-0"
                >
                  <span className="font-medium text-foreground truncate">{h.name}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {h.date ? format(new Date(h.date), "dd MMM yyyy") : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
