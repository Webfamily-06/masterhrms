import { usePermissions } from "@/lib/permissions";
import { AccessDenied } from "@/components/access-denied";
import { Loader2 } from "lucide-react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { extractRolesFromToken } from "@/lib/auth-navigation";
import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const Chart = lazy(() => import("react-apexcharts"));

export const Route = createFileRoute("/_authenticated/_app/hrm-dashboard")({
  beforeLoad: () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("hrms_auth_token") : null;
    const { roles } = extractRolesFromToken(token);
    const isEmployee =
      roles.includes("employee") &&
      !roles.some((r) => ["admin", "super_admin", "tenant_admin", "hr_admin", "hr", "manager"].includes(r));
    if (isEmployee) {
      throw redirect({ to: "/me/dashboard", replace: true });
    }
    throw redirect({ to: "/hr/dashboard", replace: true });
  },
  component: DashboardPage,
});

export default function DashboardPage() {
  const { canAccessModule, loading } = usePermissions();
  const [isMounted, setIsMounted] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch HRM Metrics from database
  const { data: hrmData } = useQuery({
    queryKey: ["dashboard-hrm-realtime-data"],
    queryFn: async () => {
      try {
        const res = await api.get("/dashboard/hrm");
        return res;
      } catch (err) {
        console.error("Failed to load dashboard metrics:", err);
        return null;
      }
    },
    refetchInterval: 30000,
  });

  const { data: profile } = useCurrentProfile();
  const userName = profile?.full_name?.split(" ")[0] || "User";
  const totalEmployees = hrmData?.totalWorkforce ?? 0;
  const newThisMonth = hrmData?.newThisMonth ?? 0;
  const pendingLeaves = hrmData?.pendingLeavesCount ?? 0;
  const onLeaveToday = hrmData?.onLeaveToday ?? 0;
  const attendanceRate = hrmData?.attendanceRate ?? 0;
  const presentCount = hrmData?.attendanceSummary?.present ?? 0;
  const lateCount = hrmData?.attendanceSummary?.late ?? 0;
  const absentCount = hrmData?.attendanceSummary?.absent ?? 0;

  const handleExport = (format: "pdf" | "excel") => {
    try {
      const csvContent = [
        ["Metric", "Value"],
        ["Total Workforce", totalEmployees],
        ["New Employees This Month", newThisMonth],
        ["On Leave Today", onLeaveToday],
        ["Attendance Rate", `${attendanceRate}%`],
        ["Present Today", presentCount],
        ["Late Today", lateCount],
        ["Absent Today", absentCount],
        ["Pending Leaves", pendingLeaves],
        ["Monthly Payroll", hrmData?.totalPayroll ? `$${(hrmData.totalPayroll / 1000).toFixed(0)}K` : "$0"],
      ]
        .map((e) => e.join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `HRM_Dashboard_Report_${new Date().toISOString().split("T")[0]}.${format === "excel" ? "csv" : "txt"}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`HRM Report exported as ${format.toUpperCase()}`);
    } catch {
      toast.error("Failed to export report");
    }
  };

  const deptData = useMemo(() => {
    if (!hrmData?.departments || hrmData.departments.length === 0) {
      return { labels: ["No Departments"], series: [0] };
    }
    return {
      labels: hrmData.departments.map((d: any) => d.name),
      series: hrmData.departments.map((d: any) => d.count),
    };
  }, [hrmData?.departments]);

  // 1. Employee Distribution Donut Chart
  const employeeDistributionChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: "donut",
        height: 150,
        width: 150,
      },
      grid: {
        padding: { top: 0, right: 0, bottom: -10, left: 0 },
      },
      series: deptData.series.some((s: number) => s > 0) ? deptData.series : [0],
      labels: deptData.labels,
      colors: ["#2563EB", "#F97316", "#10B981", "#EC4899", "#1E293B", "#8B5CF6", "#14B8A6"],
      stroke: { width: 0 },
      legend: { show: false },
      plotOptions: {
        pie: {
          donut: {
            size: "72%",
            labels: {
              show: true,
              name: { show: true, fontSize: "10px", color: "#94A3B8", offsetY: 18 },
              value: { show: true, fontSize: "16px", fontWeight: 700, color: "#1E293B", offsetY: -10 },
              total: {
                show: true,
                showAlways: true,
                label: "Employees",
                fontSize: "10px",
                fontWeight: 400,
                color: "#94A3B8",
                formatter: () => String(totalEmployees),
              },
            },
          },
        },
      },
      dataLabels: { enabled: false },
      tooltip: { enabled: false },
    }),
    [deptData, totalEmployees]
  );

  // 2. Weekly Attendance Trend Bar Chart
  const weeklyAttendanceChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: "bar",
        height: 110,
        toolbar: { show: false },
        sparkline: { enabled: false },
      },
      series: [{ name: "Present", data: hrmData?.weeklyTrend?.series || [0, 0, 0, 0, 0, 0, 0] }],
      xaxis: {
        categories: hrmData?.weeklyTrend?.categories || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        labels: { style: { colors: "#94A3B8", fontSize: "10px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { show: false },
      grid: { show: false, padding: { left: 0, right: 0, top: -20, bottom: 0 } },
      plotOptions: {
        bar: { columnWidth: "50%", borderRadius: 3, distributed: true },
      },
      colors: ["#2563EB", "#2563EB", "#2563EB", "#F97316", "#2563EB", "#2563EB", "#2563EB"],
      legend: { show: false },
      dataLabels: { enabled: false },
      tooltip: { y: { formatter: (v) => v + " present" } },
    }),
    [hrmData?.weeklyTrend]
  );

  // 3. 6-Month Payroll Trend Area Chart
  const payrollTrendChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: "area",
        height: 80,
        toolbar: { show: false },
        sparkline: { enabled: false },
        background: "transparent",
      },
      series: [{ name: "Payroll", data: hrmData?.payrollTrend?.series || [] }],
      xaxis: {
        categories: hrmData?.payrollTrend?.categories || [],
        labels: { style: { colors: "#94A3B8", fontSize: "10px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { show: false },
      grid: { show: false, padding: { left: 10, right: 18, top: -10, bottom: 0 } },
      stroke: { curve: "smooth", width: 2 },
      colors: ["#10B981"],
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.5,
          opacityTo: 0,
          stops: [0, 100],
        },
      },
      dataLabels: { enabled: false },
      tooltip: {
        theme: "dark",
        y: { formatter: (v) => "$" + v + "K" },
      },
      markers: { size: 0 },
    }),
    [hrmData?.payrollTrend]
  );

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canAccessModule("hrm") && !canAccessModule("dashboard")) {
    return <AccessDenied moduleName="HRM Dashboard" />;
  }

  return (
    <div className="p-0">
      {/* ── Greeting & Actions (matching ui/index.html line 1268) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 lg:mb-6">
        <div>
          <h1 className="text-gray-900 dark:text-gray-100 text-xl max-lg:text-lg font-bold mb-1">
            Good morning, {userName}
          </h1>
          <p className="text-sm text-default mb-0">
            You have {pendingLeaves} leave requests and 2 urgent alerts pending.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export Dropdown */}
          <div className="relative inline-flex">
            <button
              type="button"
              onClick={() => setExportOpen((o) => !o)}
              className="cursor-pointer btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 inline-flex items-center gap-2 hover:bg-primary hover:border-primary hover:text-white transition-colors"
            >
              <i className="ph-duotone ph-download-simple font-normal"></i> Export{" "}
              <i className="ph-bold ph-caret-down text-xs"></i>
            </button>

            {exportOpen && (
              <div className="absolute right-0 top-full mt-2 min-w-44 bg-white dark:bg-slate-900 border border-border-color shadow-lg rounded-md p-2 space-y-1 z-30">
                <button
                  type="button"
                  onClick={() => {
                    handleExport("pdf");
                    setExportOpen(false);
                  }}
                  className="w-full text-left flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-800 cursor-pointer"
                >
                  Export as PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleExport("excel");
                    setExportOpen(false);
                  }}
                  className="w-full text-left flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-800 cursor-pointer"
                >
                  Export as Excel (CSV)
                </button>
              </div>
            )}
          </div>

          <Link
            to="/hr/employees"
            className="btn-sm bg-dark text-white border border-dark flex items-center gap-2 hover:bg-primary-hover hover:border-primary-hover cursor-pointer transition-colors"
          >
            <i className="ph-duotone ph-plus-circle"></i> Add Employee
          </Link>
        </div>
      </div>

      {/* ── Top Row: Total Workforce, KPIs, Employee Distribution, Run Payroll, Attendance Summary ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-4">
        {/* Left Col (4 cols): Total Workforce + 4 KPI Cards */}
        <div className="flex flex-col gap-4 xl:col-span-4">
          {/* Total Workforce */}
          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-base font-bold text-title mb-0">Total Workforce</p>
              <div className="size-10 shrink-0 bg-indigo-600 rounded-md flex items-center justify-center">
                <i className="ph-duotone ph-users text-white text-2xl"></i>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl max-lg:text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">
                {totalEmployees.toLocaleString()}
              </h2>
              <span className="inline-flex items-center text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                <i className="ph-bold ph-arrow-up-right text-[10px] me-1"></i> {newThisMonth} new this month
              </span>
            </div>
            <p className="text-[13px] text-default mb-0">Active employees across 7 departments</p>
          </div>

          {/* KPI 2x2 Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* On Leave Today */}
            <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 bg-primary rounded-md flex items-center justify-center">
                  <i className="ph-duotone ph-calendar-blank text-xl text-white"></i>
                </div>
                <span className="inline-flex items-center text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                  <i className="ph-bold ph-arrow-up-right me-1"></i>3.64%
                </span>
              </div>
              <p className="text-xs text-default mb-1">On Leave Today</p>
              <h3 className="text-2xl max-lg:text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">
                {onLeaveToday}
              </h3>
            </div>

            {/* Attendance Rate */}
            <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 bg-amber-500 rounded-md flex items-center justify-center">
                  <i className="ph-duotone ph-user-check text-xl text-white"></i>
                </div>
                <span className="inline-flex items-center text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                  <i className="ph-bold ph-arrow-up-right me-1"></i>3.64%
                </span>
              </div>
              <p className="text-xs text-default mb-1">Attendance Rate</p>
              <h3 className="text-2xl max-lg:text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">
                {attendanceRate}%
              </h3>
            </div>

            {/* Open Positions */}
            <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 bg-purple-600 rounded-md flex items-center justify-center">
                  <i className="ph-duotone ph-user-plus text-xl text-white"></i>
                </div>
                <span className="inline-flex items-center text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                  <i className="ph-bold ph-arrow-up-right me-1"></i>3.64%
                </span>
              </div>
              <p className="text-xs text-default mb-1">Open Positions</p>
              <h3 className="text-2xl max-lg:text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">
                {hrmData?.openPositions ?? 0}
              </h3>
            </div>

            {/* Monthly Payroll */}
            <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 bg-rose-500 rounded-md flex items-center justify-center">
                  <i className="ph-duotone ph-currency-circle-dollar text-xl text-white"></i>
                </div>
                <span className="inline-flex items-center text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                  <i className="ph-bold ph-arrow-up-right me-1"></i>Live
                </span>
              </div>
              <p className="text-xs text-default mb-1">Monthly Payroll</p>
              <h3 className="text-2xl max-lg:text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">
                {hrmData?.totalPayroll ? `$${(hrmData.totalPayroll / 1000).toFixed(0)}K` : "$0"}
              </h3>
            </div>
          </div>
        </div>

        {/* Middle Col (4 cols): Employee Distribution + Run Payroll CTA */}
        <div className="flex flex-col gap-4 xl:col-span-4">
          {/* Employee Distribution */}
          <div className="bg-white dark:bg-slate-900 p-4 border border-border-color rounded-md flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Employee Distribution</h3>
              <span className="inline-flex items-center text-[11px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                Workforce
              </span>
            </div>
            <div>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="shrink-0 flex items-center justify-center">
                  {isMounted && (
                    <Suspense fallback={<div className="size-[150px] flex items-center justify-center text-xs">Loading chart...</div>}>
                      <Chart
                        options={employeeDistributionChartOptions}
                        series={employeeDistributionChartOptions.series}
                        type="donut"
                        height={150}
                        width={150}
                      />
                    </Suspense>
                  )}
                </div>
                <div className="flex-1 space-y-1.5 w-full">
                  {hrmData?.departments && hrmData.departments.length > 0 ? (
                    hrmData.departments.slice(0, 5).map((dept: any, idx: number) => {
                      const colors = ["bg-blue-600", "bg-amber-500", "bg-emerald-500", "bg-pink-500", "bg-purple-600"];
                      return (
                        <div key={dept.id || idx} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={cn("size-2 rounded-full", colors[idx % colors.length])}></span>
                            <span className="text-xs text-default truncate max-w-[90px]">{dept.name}</span>
                          </div>
                          <p className="text-xs font-semibold text-title mb-0">{dept.count || 0}</p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-muted-foreground py-2 text-center">No department distributions</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border-color">
                <div className="text-center bg-light dark:bg-slate-800/50 border border-border-color rounded-md p-2">
                  <h3 className="text-base font-bold text-title mb-0.5">{hrmData?.activeEmployees ?? totalEmployees}</h3>
                  <p className="text-xs text-default mb-0">Active</p>
                </div>
                <div className="text-center bg-light dark:bg-slate-800/50 border border-border-color rounded-md p-2">
                  <h3 className="text-base font-bold text-title mb-0.5">0</h3>
                  <p className="text-xs text-default mb-0">Probation</p>
                </div>
                <div className="text-center bg-light dark:bg-slate-800/50 border border-border-color rounded-md p-2">
                  <h3 className="text-base font-bold text-title mb-0.5">0</h3>
                  <p className="text-xs text-default mb-0">Notice</p>
                </div>
              </div>
            </div>
          </div>

          {/* Run Payroll CTA (matching ui/index.html line 1447) */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-md p-4 flex items-center justify-between gap-3 text-white">
            <div>
              <p className="text-lg max-lg:text-[17px] font-bold text-white mb-0.5">Run Payroll</p>
              <p className="text-xs text-blue-100 mb-0">Process Monthly Pay</p>
            </div>
            <Link
              to="/hr/payroll/runs"
              className="btn-sm bg-white border border-border-color text-slate-900 hover:bg-slate-100 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 font-semibold rounded-md px-3 py-2 shadow-xs transition-colors"
            >
              <i className="ph-duotone ph-currency-circle-dollar text-base"></i> Run Payroll
            </Link>
          </div>
        </div>

        {/* Right Col (4 cols): Attendance Summary */}
        <div className="bg-white dark:bg-slate-900 p-4 pb-0 border border-border-color rounded-md xl:col-span-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Attendance Summary</h3>
              <Link
                to="/hr/attendance"
                className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-title hover:bg-primary hover:border-primary hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors text-xs px-2.5 py-1 rounded"
              >
                View Logs <i className="ph-bold ph-caret-right text-[10px]"></i>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              <div className="border border-border-color bg-light dark:bg-slate-800/40 rounded-md p-3">
                <p className="text-xs text-default mb-1">Present</p>
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">{presentCount}</h4>
                <p className="text-[11px] text-default mb-0">{attendanceRate}% of workforce</p>
              </div>
              <div className="border border-border-color bg-light dark:bg-slate-800/40 rounded-md p-3">
                <p className="text-xs text-default mb-1">Late</p>
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">{lateCount}</h4>
                <p className="text-[11px] text-default mb-0">After 9:30 AM</p>
              </div>
              <div className="border border-border-color bg-light dark:bg-slate-800/40 rounded-md p-3">
                <p className="text-xs text-default mb-1">Absent</p>
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">{absentCount}</h4>
                <p className="text-[11px] text-default mb-0">Unplanned absence</p>
              </div>
              <div className="border border-border-color bg-light dark:bg-slate-800/40 rounded-md p-3">
                <p className="text-xs text-default mb-1">Remote</p>
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">
                  {hrmData?.attendanceSummary?.remote ?? 0}
                </h4>
                <p className="text-[11px] text-default mb-0">WFH approved</p>
              </div>
            </div>
            <p className="text-sm font-bold text-title mb-1">Weekly Attendance Trend</p>
          </div>
          <div className="w-full">
            {isMounted && (
              <Suspense fallback={<div className="h-[110px] flex items-center justify-center text-xs">Loading chart...</div>}>
                <Chart
                  options={weeklyAttendanceChartOptions}
                  series={weeklyAttendanceChartOptions.series}
                  type="bar"
                  height={110}
                />
              </Suspense>
            )}
          </div>
        </div>
      </div>

      {/* ── Middle Row: Monthly Payroll Card & Recruitment Pipeline (matching ui/index.html line 1498) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        {/* Monthly Payroll Banner + Trend */}
        <div className="relative overflow-hidden rounded-md border border-border-color bg-white dark:bg-slate-900">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
              <div>
                <p className="text-blue-100 text-xs mb-1">Monthly Payroll</p>
                <h3 className="font-bold text-white text-2xl mb-1">
                  {hrmData?.totalPayroll ? `$${(hrmData.totalPayroll / 1000).toFixed(0)}K` : "$0"}
                </h3>
                <p className="text-[13px] text-blue-100 mb-0">{totalEmployees} active employees</p>
              </div>
              <Link
                to="/hr/payroll/runs"
                className="btn-sm bg-white border border-border-color text-slate-900 hover:bg-slate-100 flex items-center justify-center gap-1.5 cursor-pointer font-semibold rounded-md px-3 py-1.5 shadow-xs transition-colors text-xs"
              >
                <i className="ph-duotone ph-download-simple"></i> Download Payslip
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-blue-100 text-xs mb-1">Avg Salary</p>
                <h4 className="text-2xl max-lg:text-xl text-white font-bold mb-0">
                  {hrmData?.avgSalary ? `$${hrmData.avgSalary.toLocaleString()}` : "$0"}
                </h4>
              </div>
              <div>
                <p className="text-blue-100 text-xs mb-1">Last Month</p>
                <h4 className="text-2xl max-lg:text-xl text-white font-bold mb-0">
                  {hrmData?.lastMonthPayroll ? `$${(hrmData.lastMonthPayroll / 1000).toFixed(0)}K` : "$0"}
                </h4>
              </div>
              <div>
                <p className="text-blue-100 text-xs mb-1">MOM Growth</p>
                <h4 className="text-2xl max-lg:text-xl text-white font-bold mb-0">
                  {hrmData?.momGrowth ?? 0}%
                </h4>
              </div>
            </div>
          </div>
          <div className="p-4 pb-0">
            <p className="text-lg max-lg:text-[17px] text-gray-900 dark:text-gray-100 font-bold mb-0">
              6-Month Payroll Trend
            </p>
            {isMounted && (
              <Suspense fallback={<div className="h-[80px] flex items-center justify-center text-xs">Loading chart...</div>}>
                <Chart
                  options={payrollTrendChartOptions}
                  series={payrollTrendChartOptions.series}
                  type="area"
                  height={80}
                />
              </Suspense>
            )}
          </div>
        </div>

        {/* Recruitment Pipeline */}
        <div className="bg-white dark:bg-slate-900 p-4 border border-border-color rounded-md">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Recruitment Pipeline</h3>
            <Link
              to="/hr/recruitment/job-postings"
              className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-title hover:bg-primary hover:border-primary hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors text-xs px-2.5 py-1 rounded"
            >
              <i className="ph-bold ph-plus text-xs"></i> Post New Job
            </Link>
          </div>
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
              <div className="border border-border-color rounded-md p-3 bg-light dark:bg-slate-800/40">
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-10 bg-white dark:bg-slate-800 border border-border-color rounded-md flex items-center justify-center">
                    <i className="ph-duotone ph-clipboard-text text-2xl text-amber-500"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-title mb-0">
                      {hrmData?.recruitment?.newApplicants ?? 0}
                    </h3>
                    <p className="text-xs text-default mb-0">New Applicants</p>
                  </div>
                </div>
                <div className="h-1 bg-amber-500 rounded-full"></div>
              </div>
              <div className="border border-border-color rounded-md p-3 bg-light dark:bg-slate-800/40">
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-10 bg-white dark:bg-slate-800 border border-border-color rounded-md flex items-center justify-center">
                    <i className="ph-duotone ph-users text-2xl text-purple-600"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-title mb-0">
                      {hrmData?.recruitment?.screening ?? 0}
                    </h3>
                    <p className="text-xs text-default mb-0">Screening</p>
                  </div>
                </div>
                <div className="h-1 bg-purple-600 rounded-full"></div>
              </div>
              <div className="border border-border-color rounded-md p-3 bg-light dark:bg-slate-800/40">
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-10 bg-white dark:bg-slate-800 border border-border-color rounded-md flex items-center justify-center">
                    <i className="ph-duotone ph-video-camera text-2xl text-blue-500"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-title mb-0">
                      {hrmData?.recruitment?.interviews ?? 0}
                    </h3>
                    <p className="text-xs text-default mb-0">Interviews</p>
                  </div>
                </div>
                <div className="h-1 bg-blue-500 rounded-full"></div>
              </div>
            </div>

            <p className="text-sm font-semibold text-title mb-2">Recent Candidates</p>
            <div className="flex flex-col space-y-2">
              {hrmData?.recruitment?.recentCandidates && hrmData.recruitment.recentCandidates.length > 0 ? (
                hrmData.recruitment.recentCandidates.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 border border-border-color bg-light dark:bg-slate-800/40 rounded-md p-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={c.avatarUrl || "/ui-assets/avatar-03.jpg"} className="size-9 rounded-full border border-border-color shrink-0 object-cover" alt={c.name} />
                      <div className="min-w-0">
                        <p className="font-medium text-title text-xs truncate mb-0">{c.name}</p>
                        <p className="text-[11px] text-default truncate mb-0">{c.position}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md shrink-0 capitalize">
                      {c.stage}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground py-6 text-center">
                  No recent applicants in pipeline
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Performance Tracking & Recent Openings Table ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Performance Tracking (5 cols) */}
        <div className="bg-white dark:bg-slate-900 p-4 border border-border-color rounded-md xl:col-span-5">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Performance Tracking</h3>
            <Link
              to="/hr/performance/reviews"
              className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-title hover:bg-primary hover:border-primary hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors text-xs px-2.5 py-1 rounded"
            >
              Full Report <i className="ph-bold ph-caret-right text-[10px]"></i>
            </Link>
          </div>
          <div>
            <div className="space-y-3 mb-5">
              {hrmData?.leaderboard && hrmData.leaderboard.length > 0 ? (
                hrmData.leaderboard.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 border border-border-color rounded-md p-3 bg-light/50 dark:bg-slate-800/30">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <img src={item.avatarUrl || "/ui-assets/avatar-04.jpg"} className="size-9 rounded-full border border-border-color shrink-0 object-cover" alt={item.name} />
                        <span className="absolute bottom-0 right-0 bg-amber-500 text-white text-[10px] font-bold rounded-full size-4 flex items-center justify-center">
                          {item.rank}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-title text-xs truncate mb-0">{item.name}</p>
                        <p className="text-[11px] text-default truncate mb-0">{item.position}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900 dark:text-gray-100 text-xs mb-0">{item.score}</p>
                      <p className="text-[11px] text-emerald-600 inline-flex items-center mb-0">
                        <i className="ph-bold ph-arrow-up-right me-0.5"></i>{item.growth}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground py-6 text-center">
                  No employee performance scores tracked yet
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <div className="h-1.5 bg-light dark:bg-slate-800 rounded-full overflow-hidden mb-1.5">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, attendanceRate)}%` }}></div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <p className="text-default mb-0">Attendance Compliance</p>
                  <p className="font-bold text-gray-900 dark:text-gray-100 mb-0">{attendanceRate}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Openings / Roles Table (7 cols) */}
        <div className="bg-white dark:bg-slate-900 p-4 pb-1.5 border border-border-color rounded-md xl:col-span-7">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Recent Openings</h3>
            <Link
              to="/hr/recruitment/job-postings"
              className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-title hover:bg-primary hover:border-primary hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors text-xs px-2.5 py-1 rounded"
            >
              All Openings <i className="ph-bold ph-caret-right text-[10px]"></i>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-default border-b border-border-color">
                  <th className="text-left py-2 px-2 text-[13px] font-semibold text-gray-900 dark:text-gray-100">Job Title</th>
                  <th className="text-left py-2 px-2 text-[13px] font-semibold text-gray-900 dark:text-gray-100">Category</th>
                  <th className="text-left py-2 px-2 text-[13px] font-semibold text-gray-900 dark:text-gray-100">Location</th>
                  <th className="text-left py-2 px-2 text-[13px] font-semibold text-gray-900 dark:text-gray-100">Openings</th>
                  <th className="text-left py-2 px-2 text-[13px] font-semibold text-gray-900 dark:text-gray-100">Status</th>
                </tr>
              </thead>
              <tbody>
                {hrmData?.jobOpenings && hrmData.jobOpenings.length > 0 ? (
                  hrmData.jobOpenings.map((job: any) => (
                    <tr key={job.id} className="border-b border-border-color last:border-0 hover:bg-light/40 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-2">
                        <div className="inline-flex items-center gap-2">
                          <div className="size-9 rounded-md bg-light dark:bg-slate-800 border border-border-color flex items-center justify-center text-primary">
                            <i className="ph-duotone ph-briefcase text-lg"></i>
                          </div>
                          <p className="text-xs font-semibold text-title mb-0">{job.title}</p>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-xs text-default">{job.category}</td>
                      <td className="py-3 px-2 text-xs text-default">{job.location || "Office"}</td>
                      <td className="py-3 px-2 text-xs text-default font-mono">{String(job.openings).padStart(2, "0")}</td>
                      <td className="py-3 px-2">
                        <span className="inline-flex items-center text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-medium">
                          <i className="ph-bold ph-check-circle text-[10px] me-1"></i>{job.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                      No active job openings published.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
